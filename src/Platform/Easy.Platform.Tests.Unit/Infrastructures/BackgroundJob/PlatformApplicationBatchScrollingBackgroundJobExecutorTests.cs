using System.Linq.Expressions;
using Easy.Platform.Application.BackgroundJob;
using Easy.Platform.Common.Utils;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Tests.Unit.TestInfrastructure;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Easy.Platform.Tests.Unit.Infrastructures.BackgroundJob;

/// <summary>
/// Guards <see cref="PlatformApplicationBatchScrollingBackgroundJobExecutor{TEntity,TBatchKey,TParam}" /> — the
/// two-level fan-out job (split into batches, then scroll within each batch).
/// <para>
/// <b>Invariants guarded:</b>
/// (1) the master/batch branch decision — a param carrying a BatchKey processes THAT batch, anything else discovers
/// batch keys and schedules one job per key. Reversing it either processes nothing or re-fans-out forever;
/// (2) batch-key discovery is exhaustive AND terminates — every distinct key gets exactly one scheduled job, and the
/// paging loop stops instead of re-scheduling the same keys;
/// (3) a batch that raises must run the error hook AND rethrow, so one batch's failure is visible and retried rather
/// than silently swallowed while the other batches report success;
/// (4) the forward-progress guard — a batch page whose entity-id set repeats the immediately preceding page's must
/// throw instead of silently reprocessing, but ONLY when entity identity is resolvable (<see cref="IEntity" />) and the
/// job has not opted out; for any other entity shape the guard must fail OPEN rather than false-positive on a healthy
/// job, and a job that LEGITIMATELY leaves rows matching its query builder must be able to turn the guard off (and be
/// guarded by default until it does).
/// </para>
/// </summary>
public sealed class PlatformApplicationBatchScrollingBackgroundJobExecutorTests : IDisposable
{
    private readonly RecordingLoggerFactory loggerFactory = new();
    private readonly Mock<IPlatformApplicationBackgroundJobScheduler> scheduler = new();
    private readonly TestApplicationSettingContext settingContext = new();
    private readonly Mock<IPlatformUnitOfWorkManager> unitOfWorkManager = new();

    private readonly ServiceProvider serviceProvider;

    public PlatformApplicationBatchScrollingBackgroundJobExecutorTests()
    {
        unitOfWorkManager
            .Setup(manager => manager.ExecuteUowTask(It.IsAny<Func<Task>>(), It.IsAny<bool>()))
            .Returns<Func<Task>, bool>((taskFn, _) => taskFn());
        unitOfWorkManager.Setup(manager => manager.TryCurrentActiveUowSaveChangesAsync()).Returns(Task.CompletedTask);

        // Drive the REAL scrolling loop (Util.Pager.ExecuteScrollingPagingAsync) over the executor's own page delegate,
        // bypassing only the DI-scope/unit-of-work plumbing a unit test cannot host. Faking the loop itself would make
        // the termination assertions test the fake instead of the executor.
        unitOfWorkManager
            .Setup(manager => manager.ExecuteInjectScopedScrollingPagingAsync<TestEntity>(It.IsAny<Delegate>(), It.IsAny<int>(), It.IsAny<object[]>()))
            .Returns<Delegate, int, object[]>((method, maxExecutionCount, _) =>
                Util.Pager.ExecuteScrollingPagingAsync(
                    () => (Task<List<TestEntity>>)method.DynamicInvoke(serviceProvider)!,
                    maxExecutionCount));

        // Same real-loop wiring as above, for the IEntity-implementing double the forward-progress guard tests use —
        // ExecuteInjectScopedScrollingPagingAsync is generic in TItem, so TestEntity's setup does not cover this type.
        unitOfWorkManager
            .Setup(manager => manager.ExecuteInjectScopedScrollingPagingAsync<IdentifiableTestEntity>(It.IsAny<Delegate>(), It.IsAny<int>(), It.IsAny<object[]>()))
            .Returns<Delegate, int, object[]>((method, maxExecutionCount, _) =>
                Util.Pager.ExecuteScrollingPagingAsync(
                    () => (Task<List<IdentifiableTestEntity>>)method.DynamicInvoke(serviceProvider)!,
                    maxExecutionCount));

        serviceProvider = BackgroundJobTestHarness.BuildServiceProvider(
            settingContext,
            configure: services =>
            {
                services.AddSingleton(unitOfWorkManager.Object);
                services.AddSingleton(scheduler.Object);
            });
    }

    public void Dispose()
    {
        serviceProvider.Dispose();
    }

    // TC-PLATJOB-030: batch-scrolling jobs manage their own scopes, so they must NOT auto-open an outer unit of work.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-030")]
    public void AutoOpenUow_IsDisabled_BecauseEachBatchOpensItsOwnScopedUnitOfWork()
    {
        CreateJob().AutoOpenUow.Should().BeFalse(
            "the master run only schedules and each batch opens its own scoped UoW — an outer UoW would hold a "
            + "transaction open across the whole fan-out");
    }

    // TC-PLATJOB-031: the master run discovers every distinct batch key and schedules exactly one job per key.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-031")]
    public void ProcessAsync_AsMasterRun_SchedulesExactlyOneJobPerDistinctBatchKeyAndProcessesNothingItself()
    {
        var scheduledParams = CaptureScheduledBatchParams();
        var job = CreateJob();
        job.Entities.AddRange(
        [
            new TestEntity("company-a", "e1"),
            new TestEntity("company-a", "e2"),
            new TestEntity("company-b", "e3"),
            new TestEntity("company-c", "e4")
        ]);

        job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam>());

        job.ProcessedBatches.Should().BeEmpty("the master run must only fan out — processing here would double-process every entity");

        scheduledParams.Select(scheduled => scheduled.BatchKey).Should().BeEquivalentTo(
            ["company-a", "company-b", "company-c"],
            "every distinct batch key must get exactly one job — a missed key silently skips that tenant's data");
        scheduledParams.Should().HaveCount(3, "duplicate keys must be collapsed, not scheduled twice");
    }

    // TC-PLATJOB-031: the empty-source boundary — no batch keys means no scheduled jobs, and the loop still terminates.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-031")]
    public void ProcessAsync_AsMasterRunOverAnEmptySource_SchedulesNothingAndTerminates()
    {
        var scheduledParams = CaptureScheduledBatchParams();
        var job = CreateJob();

        job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam>());

        scheduledParams.Should().BeEmpty("with nothing to process there is nothing to schedule");
        job.ProcessedBatches.Should().BeEmpty();
    }

    // TC-PLATJOB-031: Execute() with NO parameter at all — the shape a parameterless recurring master job actually
    // takes in production — must take the master branch exactly like an explicit param with a null BatchKey.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-031")]
    public void ProcessAsync_WithNoParameterAtAll_StillTakesTheMasterBranch()
    {
        // PlatformBackgroundJobExecutor.Execute() forwards a missing argument as Execute(null)
        // (Infrastructures/BackgroundJob/PlatformBackgroundJobExecutor.cs:136-139), and ProcessAsync branches on
        // `param != null && param.BatchKey is not null` (...Executor.cs:129) then reads `param?.Param` (:137). Every
        // OTHER test in this file passes a non-null PlatformBatchScrollingJobParam, so only this test exercises a
        // null param end to end. Mutation proof: dropping the `param != null &&` half of that guard throws
        // NullReferenceException on every parameterless recurring master run in production, and every other test in
        // this file stays green because none of them call the parameterless overload.
        var scheduledParams = CaptureScheduledBatchParams();
        var job = CreateJob();
        job.Entities.AddRange(
        [
            new TestEntity("company-a", "e1"),
            new TestEntity("company-b", "e2")
        ]);

        var act = () => job.Execute();

        act.Should().NotThrow("a null param is the master run's own parameterless shape, not an error condition");
        job.ProcessedBatches.Should().BeEmpty("a null param must still take the master branch, never the single-batch branch");
        scheduledParams.Select(scheduled => scheduled.BatchKey).Should().BeEquivalentTo(["company-a", "company-b"]);
    }

    // TC-PLATJOB-032: batch-key discovery pages through more keys than one page holds, without repeating a key.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-032")]
    public void ProcessAsync_AsMasterRunWithMoreKeysThanOnePage_PagesThroughThemAllExactlyOnce()
    {
        var scheduledParams = CaptureScheduledBatchParams();
        var job = CreateJob();
        job.ConfiguredBatchKeyPageSize = 2;
        job.Entities.AddRange(Enumerable.Range(1, 5).Select(index => new TestEntity($"company-{index:D2}", $"e{index}")));

        job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam>());

        var scheduledKeys = scheduledParams.Select(scheduled => scheduled.BatchKey).ToList();

        scheduledKeys.Should().HaveCount(5, "paging must cover every key — an off-by-one here silently drops a whole tenant");
        scheduledKeys.Should().OnlyHaveUniqueItems("re-scheduling a key would double-process that tenant's records");
        scheduledKeys.Should().BeEquivalentTo(job.Entities.Select(entity => entity.BatchKey).Distinct());
    }

    // TC-PLATJOB-033: a param carrying a BatchKey processes THAT batch's entities and schedules nothing further.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-033")]
    public void ProcessAsync_WithABatchKey_ProcessesOnlyThatBatchAndSchedulesNoFurtherJobs()
    {
        var scheduledParams = CaptureScheduledBatchParams();
        var job = CreateJob();
        job.Entities.AddRange(
        [
            new TestEntity("company-a", "a1"),
            new TestEntity("company-b", "b1"),
            new TestEntity("company-a", "a2")
        ]);
        var innerParam = new BatchTestParam { Payload = "TC-PLATJOB-033" };

        job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam> { BatchKey = "company-a", Param = innerParam });

        job.ProcessedBatches.Should().NotBeEmpty("a batch run must actually process its batch");
        job.ProcessedBatches.Should().OnlyContain(processed => processed.BatchKey == "company-a", "a batch run must never touch another batch's data");
        job.ProcessedBatches.Should().OnlyContain(processed => processed.Param == innerParam, "the caller's parameter must reach the business logic unchanged");
        job.ProcessedBatches.SelectMany(processed => processed.EntityIds).Should().BeEquivalentTo(["a1", "a2"]);

        scheduledParams.Should().BeEmpty("a batch run must not fan out again — that is what turns the job into an infinite scheduling loop");
    }

    // TC-PLATJOB-033: a batch key that matches nothing must not invoke the business logic with an empty page.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-033")]
    public void ProcessAsync_WithABatchKeyMatchingNoEntities_NeverInvokesTheBusinessLogic()
    {
        var job = CreateJob();
        job.Entities.Add(new TestEntity("company-a", "a1"));

        job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam> { BatchKey = "company-unknown" });

        job.ProcessedBatches.Should().BeEmpty(
            "ProcessEntitiesAsync is guarded by an entities.Count > 0 check — invoking business logic with an empty page "
            + "would make every derived job defend against it separately");
    }

    // TC-PLATJOB-034: a failing batch runs the error hook AND rethrows, so the failure is visible and retried.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-034")]
    public void ProcessAsync_WhenABatchThrows_InvokesTheErrorHookWithThatBatchKeyAndRethrows()
    {
        var job = CreateJob();
        job.Entities.Add(new TestEntity("company-a", "a1"));
        var failure = new InvalidOperationException("TC-PLATJOB-034 deliberate batch failure");
        job.ThrowOnProcessEntities = failure;

        var act = () => job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam> { BatchKey = "company-a" });

        act.Should().Throw<InvalidOperationException>().Which.Should().BeSameAs(
            failure,
            "swallowing a batch failure would report success for records that were never processed");

        job.HandledBatchErrors.Should().ContainSingle();
        job.HandledBatchErrors[0].BatchKey.Should().Be("company-a", "the error hook must know WHICH batch failed to be actionable");
        job.HandledBatchErrors[0].Error.Should().BeSameAs(failure);
    }

    // TC-PLATJOB-034: documents real, if surprising, production behavior for the edge case where the error hook
    // ITSELF throws — nothing in this file exercised that path before.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-034")]
    public void ProcessAsync_WhenTheErrorHookItselfThrows_TheHooksExceptionReplacesTheOriginalBatchException()
    {
        // `catch (Exception ex) { await HandleBatchErrorAsync(...); throw; }` (...Executor.cs:224-227) rethrows
        // whatever is on the stack at that point — an exception raised BY HandleBatchErrorAsync itself preempts the
        // bare `throw;` and becomes what the caller sees. The ORIGINAL batch failure is silently lost. Recorded so a
        // future engineer debugging "wrong exception surfaced" does not assume this is a bug in the executor; the fix
        // (if ever wanted) belongs in HandleBatchErrorAsync overrides never letting their own logic fail, not here.
        var job = CreateJob();
        job.Entities.Add(new TestEntity("company-a", "a1"));
        var originalFailure = new InvalidOperationException("TC-PLATJOB-034 original batch failure");
        var hookFailure = new InvalidCastException("TC-PLATJOB-034 error hook itself failed");
        job.ThrowOnProcessEntities = originalFailure;
        job.ThrowOnHandleBatchError = hookFailure;

        var act = () => job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam> { BatchKey = "company-a" });

        act.Should().Throw<InvalidCastException>().Which.Should().BeSameAs(
            hookFailure,
            "the hook's own exception replaces the original — the original batch failure becomes unattributable, "
            + "which is why HandleBatchErrorAsync overrides must never let their own logic fail");
    }

    // TC-PLATJOB-090: a batch spanning MORE than one page is processed to completion, not truncated at the first page.
    // Id note: these two cases were first allocated TC-PLATJOB-036, which PlatformApplicationBackgroundJobSchedulerTests
    // already owns (it holds 036-039 for the scheduler facade's lazy-resolution contract). One id tagging two unrelated
    // behaviours breaks the TechnicalSpec join key that the TC <-> test map is built from, so they moved to 090 — the
    // first id free across the WHOLE Easy.Platform.Tests.Unit project for this prefix (089 was the previous maximum).
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-090")]
    public void ProcessAsync_WithABatchSpanningMultiplePages_ProcessesEveryEntityNotJustTheFirstPage()
    {
        // REGRESSION GUARD for a silent-data-loss defect. maxExecutionCount was computed as
        // entityCount / BatchKeyPageSize — the BATCH-KEY page size (default 1000) — while the page query pages by
        // BatchPageSize (default 100). Two different units. For any batch smaller than BatchKeyPageSize that yielded
        // ZERO, and Util.Pager.ExecuteScrollingPagingAsync runs the body once and then loops only
        // `while (totalExecutionCount <= maxExecutionCount && ...)` (Util.Pager.cs:109-118) — so exactly one page ran
        // and the rest of the batch was dropped while the job still reported success.
        // Sizing chosen so this FAILS against the old divisor: 25 entities at a 10-row page needs 3 executions.
        // Pre-fix maxExecutionCount = 25/1000 = 0 → 1 execution → 10 of 25 processed.
        // Post-fix maxExecutionCount = 25/10 = 2 → 1+2 = 3 executions → all 25.
        var job = CreateJob();
        job.ConfiguredBatchPageSize = 10;
        job.Entities.AddRange(Enumerable.Range(1, 25).Select(index => new TestEntity("company-a", $"e{index:D2}")));

        job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam> { BatchKey = "company-a", Param = new BatchTestParam { Payload = "TC-PLATJOB-090" } });

        job.ProcessedBatches.SelectMany(processed => processed.EntityIds)
            .Should()
            .HaveCount(
                25,
                "every entity in the batch must be processed — stopping after the first page drops ~60% of this batch "
                + "while the job still reports success, which is why it went unnoticed");

        job.Entities.Should().OnlyContain(entity => entity.Processed, "an unprocessed leftover IS the silent data loss this guards against");

        // Pins the PAGE SHAPE, not just the final total: removing .Take(BatchPageSize) from the page query would still
        // let both assertions above pass (one page of all 25, then an empty page), silently proving nothing about
        // batching. 25 entities at page size 10 must take exactly 3 pages of 10/10/5.
        job.ProcessedBatches.Should().HaveCount(3, "25 entities at a 10-row page must arrive as 3 pages, not fewer bigger ones");
        job.ProcessedBatches.Select(processed => processed.EntityIds.Count).Should().Equal([10, 10, 5]);
    }

    // TC-PLATJOB-090: the entity PAGE QUERY is sized by BatchPageSize, not by BatchKeyPageSize.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-090")]
    public void ProcessAsync_PagesEntitiesByBatchPageSize_NotByBatchKeyPageSize()
    {
        // What this proves, precisely — because an earlier version of this comment overclaimed and that is itself a
        // recorded finding: setting BatchKeyPageSize (2) BELOW BatchPageSize (10) makes a wrong-divisor budget
        // (25/2=12) MORE permissive than the correct one (25/10=2), so it does NOT discriminate the divisor mutation
        // covered by ProcessAsync_WithABatchSpanningMultiplePages_ProcessesEveryEntityNotJustTheFirstPage above — for
        // that mutation this test's kill-set is a strict SUBSET of that test's. What this DOES kill is a mutation to
        // the entity page QUERY itself: changing `.Take(BatchPageSize)` (Executor.cs:194) to `.Take(BatchKeyPageSize)`
        // would take 2 rows/page here — 3 executions × 2 = 6 of 25 processed — and fail the completion assertion
        // below, while the test above (BatchKeyPageSize=1000) would take all 25 in one page and stay green.
        var job = CreateJob();
        job.ConfiguredBatchPageSize = 10;
        job.ConfiguredBatchKeyPageSize = 2;
        job.Entities.AddRange(Enumerable.Range(1, 25).Select(index => new TestEntity("company-a", $"e{index:D2}")));

        job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam> { BatchKey = "company-a", Param = new BatchTestParam() });

        job.Entities.Should().OnlyContain(
            entity => entity.Processed,
            "the entity page query must be sized by BatchPageSize regardless of how batch KEYS are paged — the two "
            + "sizes are independent knobs and mixing them up was the original defect");
    }

    // TC-PLATJOB-035: the two-generic convenience class derives from the three-generic one parameterised with object.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-035")]
    public void TwoGenericConvenienceExecutor_IsTheThreeGenericExecutorParameterisedWithObject()
    {
        // Naming/scope note: nullable-reference annotations (`object?` vs `object`) are compile-time metadata, not
        // part of the RUNTIME type — typeof(X<...,object?>) IS typeof(X<...,object>) — so this can only prove the
        // DERIVATION, never the `?`. The source does declare `object?` (Executor.cs:728-732); this test does not
        // verify that half of the declaration, by construction of the CLR type system, not by omission here.
        typeof(PlatformApplicationBatchScrollingBackgroundJobExecutor<TestEntity, string>)
            .Should().BeDerivedFrom<PlatformApplicationBatchScrollingBackgroundJobExecutor<TestEntity, string, object?>>();

        typeof(PlatformApplicationBatchScrollingBackgroundJobExecutor<TestEntity, string, BatchTestParam>)
            .Should().BeDerivedFrom<PlatformApplicationBackgroundJobExecutor<PlatformBatchScrollingJobParam<string, BatchTestParam>>>(
                "the batch-scrolling executor wraps the caller's param in a batch envelope");
    }

    // LOW finding fix: pin the ACTUAL production defaults, decoupled from the ConfiguredBatchKeyPageSize /
    // ConfiguredBatchPageSize duplication every other test in this file relies on. If the base class's defaults ever
    // drift from 1000/100, every other test here would keep silently exercising the OLD value via the double's own
    // re-declared constants while still appearing to cover "the default" — this is the only test that reads the base
    // class's virtual property directly, unshadowed by an override.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-080")]
    public void BatchKeyPageSizeAndBatchPageSize_DefaultToTheDocumentedProductionValues()
    {
        var job = new DefaultsProbeTestJob(unitOfWorkManager.Object, loggerFactory, serviceProvider, scheduler.Object);

        job.ExposedBatchKeyPageSize.Should().Be(1000, "documented at ...Executor.cs:96-97 and :510-522 — a drift here silently stales every test that re-declares this constant");
        job.ExposedBatchPageSize.Should().Be(100, "documented at ...Executor.cs:96-98 and :529-541 — a drift here silently stales every test that re-declares this constant");
    }

    #region Forward-progress guard (TC-PLATJOB-081..084, 088..089)
    //
    // Guards the forward-progress check reached from ProcessSingleBatchAsync (CheckPageForwardProgress): a page whose entity
    // identity set repeats the immediately preceding page's throws instead of silently reprocessing. Identity comes
    // from ResolvePageEntityIds (...Executor.cs:287-303), which requires TEntity to actually implement IEntity; it
    // returns null — disabling the check — for any other entity shape. TestEntity/BatchScrollingTestJob above is
    // deliberately NOT an IEntity, so none of the tests above ever exercise this guard's THROW path; that is exactly
    // why IdentifiableTestEntity/IdEntityBatchScrollingTestJob exist.

    // TC-PLATJOB-081: a batch whose page does not drain (the same entities are re-selected) must throw — the guard's
    // whole reason to exist.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-081")]
    public void ForwardProgressGuard_WhenAPageRepeatsThePreviousPagesEntities_Throws()
    {
        // MarkEntitiesProcessed=false means EntitiesQueryBuilder's `!entity.Processed` filter never excludes anyone,
        // so every execution re-selects the SAME first 10 (stable order, no Skip — Executor.cs:194,199-200). 15
        // entities at page size 10 gives a budget of 15/10=1, so the pager runs a second execution
        // (Util.Pager.cs:109-118) — that second execution's page id-set equals the first's and must throw before any
        // reprocessing happens.
        var job = CreateIdEntityJob();
        job.ConfiguredBatchPageSize = 10;
        job.MarkEntitiesProcessed = false;
        job.Entities.AddRange(Enumerable.Range(1, 15).Select(index => new IdentifiableTestEntity("company-a", $"e{index:D2}")));

        var act = () => job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam> { BatchKey = "company-a", Param = new BatchTestParam() });

        act.Should().Throw<InvalidOperationException>().Which.Message.Should().Contain(
            "cannot drain",
            "the thrown error must name the actual failure mode so an on-call engineer is not left guessing");
        job.ProcessedBatches.Should().HaveCount(1, "the SECOND execution must throw before calling ProcessEntitiesAsync again — reprocessing is exactly what this guard exists to prevent");
    }

    // TC-PLATJOB-082: a batch that legitimately drains across multiple pages must NOT throw — no false positive on a
    // healthy job.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-082")]
    public void ForwardProgressGuard_WhenABatchLegitimatelyDrainsAcrossMultiplePages_DoesNotThrow()
    {
        // Same shape as TC-PLATJOB-090 above, but with the IEntity-implementing double so the guard is ACTIVE for
        // this run (unlike TestEntity, where it is structurally impossible for it to engage). Each page's entities
        // ARE marked processed (default MarkEntitiesProcessed=true), so consecutive pages' id sets are always
        // disjoint — the guard must stay silent throughout.
        var job = CreateIdEntityJob();
        job.ConfiguredBatchPageSize = 10;
        job.Entities.AddRange(Enumerable.Range(1, 25).Select(index => new IdentifiableTestEntity("company-a", $"e{index:D2}")));

        var act = () => job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam> { BatchKey = "company-a", Param = new BatchTestParam() });

        act.Should().NotThrow("a batch that genuinely drains must never trip the forward-progress guard");
        job.Entities.Should().OnlyContain(entity => entity.Processed);
        job.ProcessedBatches.Should().HaveCount(3, "25 entities at a 10-row page must still take exactly 3 pages under the active guard");
    }

    // TC-PLATJOB-083: a single-page batch never throws — previousPageEntityIds is assigned only AFTER the check, so
    // there is no "previous page" to compare against on the very first one.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-083")]
    public void ForwardProgressGuard_ForASinglePageBatch_NeverThrowsEvenWhenTheBatchWouldNotHaveDrained()
    {
        // MarkEntitiesProcessed=false, so this batch WOULD fail to drain on any second page — but the default
        // BatchPageSize(100)/small entity count keeps the budget at 0, so only ONE execution ever runs and the guard
        // never has a "previous page" to compare the first one against.
        var job = CreateIdEntityJob();
        job.MarkEntitiesProcessed = false;
        job.Entities.AddRange(
        [
            new IdentifiableTestEntity("company-a", "a1"),
            new IdentifiableTestEntity("company-a", "a2"),
            new IdentifiableTestEntity("company-a", "a3")
        ]);

        var act = () => job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam> { BatchKey = "company-a", Param = new BatchTestParam() });

        act.Should().NotThrow("a single-page batch has nothing to compare against — the guard must not fire on the very first page");
        job.ProcessedBatches.Should().HaveCount(1);
    }

    // TC-PLATJOB-084a: an empty page never trips the guard — the check lives entirely inside `if (entities.Count > 0)`.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-084")]
    public void ForwardProgressGuard_ForAnEmptyPage_NeverThrows()
    {
        var job = CreateIdEntityJob();
        job.Entities.Add(new IdentifiableTestEntity("company-a", "a1"));

        var act = () => job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam> { BatchKey = "company-unknown", Param = new BatchTestParam() });

        act.Should().NotThrow("a batch key matching nothing must fetch a zero-count page and skip the guard entirely, never compare an empty set to null");
        job.ProcessedBatches.Should().BeEmpty();
    }

    // TC-PLATJOB-084b: fail-open — when identity is NOT resolvable (TEntity is not an IEntity, or GetId() is null),
    // the guard stays OFF rather than false-positiving on a healthy job, and it logs the INACTIVE warning once.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-084")]
    public void ForwardProgressGuard_WhenEntityIdentityIsUnresolvable_StaysInactiveAndLogsOnce()
    {
        // Uses the ORIGINAL non-IEntity TestEntity/BatchScrollingTestJob double on purpose: this is the shape every
        // OTHER test in this file already uses, so it doubles as proof that none of them were silently protected by
        // the guard. MarkEntitiesProcessed=false builds a batch that genuinely never drains; if the guard were
        // mistakenly active for this entity shape it would throw on the second execution exactly like
        // ForwardProgressGuard_WhenAPageRepeatsThePreviousPagesEntities_Throws above. It must not — ResolvePageEntityIds
        // returns null for a non-IEntity page (Executor.cs:293), so the guard's own null-check disables it.
        var job = CreateJob();
        job.ConfiguredBatchPageSize = 10;
        job.MarkEntitiesProcessed = false;
        job.Entities.AddRange(Enumerable.Range(1, 15).Select(index => new TestEntity("company-a", $"e{index:D2}")));

        var act = () => job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam> { BatchKey = "company-a", Param = new BatchTestParam() });

        act.Should().NotThrow("identity being unresolvable must fail OPEN — a false positive here would halt a healthy production job");
        job.ProcessedBatches.Should().HaveCount(2, "with the guard inactive, the SAME 10 rows are reprocessed on the second execution — this IS the risk fail-open accepts, not a bonus");

        loggerFactory.Logger.Entries.Should().ContainSingle(
            entry => entry.Level == LogLevel.Warning && entry.Formatted.Contains("forward-progress guard is INACTIVE"),
            "a guard that cannot run must say so exactly once per batch — a silent no-op guard is indistinguishable from one that ran and passed");
    }

    // TC-PLATJOB-088: the guard is ON by default, so a job that says nothing about it still gets repeat detection.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-088")]
    public void EnableForwardProgressGuard_DefaultsToOn_SoARepeatedPageStillThrows()
    {
        // Two halves with DIFFERENT jobs, and neither alone is enough. The probe double deliberately does not override
        // the property, so it is the only place the BASE class's own default is read unshadowed — the executable double
        // below re-declares it (defaulting to true) and therefore cannot prove what the base declares. The run is the
        // guard-ON control for TC-PLATJOB-089 below, which is byte-for-byte identical except the flag; without a
        // same-setup ON case, 089's NotThrow could pass for reasons unrelated to the flag.
        new DefaultsProbeTestJob(unitOfWorkManager.Object, loggerFactory, serviceProvider, scheduler.Object)
            .ExposedEnableForwardProgressGuard.Should().BeTrue(
                "opting IN to the guard must be the default — a job that never considered the drain contract is exactly "
                + "the one that needs a repeated page reported instead of silently reprocessed");

        var job = CreateIdEntityJob();
        job.ConfiguredBatchPageSize = 10;
        job.MarkEntitiesProcessed = false;
        job.Entities.AddRange(Enumerable.Range(1, 15).Select(index => new IdentifiableTestEntity("company-a", $"e{index:D2}")));

        var act = () => job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam> { BatchKey = "company-a", Param = new BatchTestParam() });

        act.Should().Throw<InvalidOperationException>().Which.Message.Should().Contain(
            "cannot drain",
            "with the guard left at its default the non-draining second page must still be reported");
    }

    // TC-PLATJOB-089: a subclass that legitimately leaves rows in the match set turns the guard OFF and is processed
    // normally — the opt-out seam must actually disable the throw, not merely exist.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-089")]
    public void EnableForwardProgressGuard_WhenASubclassTurnsItOff_ARepeatedPageIsProcessedInsteadOfThrowing()
    {
        // IDENTICAL setup to TC-PLATJOB-088 above except the flag, so the flag is the only possible discriminator.
        // This is the production shape the seam exists for: a scanner with swallow-and-continue error handling, a
        // filtered subtype, or an unstamped branch legitimately re-selects the same rows, and the guard's premise
        // ("a repeated page IS a defect") does not hold for it — throwing there converts a succeeding recurring job
        // into a permanent retry loop.
        var job = CreateIdEntityJob();
        job.ConfiguredBatchPageSize = 10;
        job.MarkEntitiesProcessed = false;
        job.ConfiguredEnableForwardProgressGuard = false;
        job.Entities.AddRange(Enumerable.Range(1, 15).Select(index => new IdentifiableTestEntity("company-a", $"e{index:D2}")));

        var act = () => job.Execute(new PlatformBatchScrollingJobParam<string, BatchTestParam> { BatchKey = "company-a", Param = new BatchTestParam() });

        act.Should().NotThrow("a job that legitimately leaves rows matching must not be halted by a guard whose premise does not apply to it");
        job.ProcessedBatches.Should().HaveCount(
            2,
            "turning the guard off restores the pre-guard behavior — the SAME 10 rows are re-selected and reprocessed "
            + "on the second execution. That is the cost the opt-out accepts, not a bonus, and pinning it here stops a "
            + "future change from quietly turning the opt-out into a skip-the-page instead");
    }

    #endregion

    private List<PlatformBatchScrollingJobParam<string, BatchTestParam>> CaptureScheduledBatchParams()
    {
        var captured = new List<PlatformBatchScrollingJobParam<string, BatchTestParam>>();

        scheduler
            .Setup(sched => sched.Schedule(It.IsAny<Type>(), It.IsAny<PlatformBatchScrollingJobParam<string, BatchTestParam>>(), It.IsAny<DateTimeOffset>()))
            .Callback<Type, PlatformBatchScrollingJobParam<string, BatchTestParam>, DateTimeOffset>((_, scheduledParam, _) =>
            {
                lock (captured)
                    captured.Add(scheduledParam);
            })
            .ReturnsAsync("scheduled-job-id");

        return captured;
    }

    private BatchScrollingTestJob CreateJob()
    {
        return new BatchScrollingTestJob(unitOfWorkManager.Object, loggerFactory, serviceProvider, scheduler.Object);
    }

    private IdEntityBatchScrollingTestJob CreateIdEntityJob()
    {
        return new IdEntityBatchScrollingTestJob(unitOfWorkManager.Object, loggerFactory, serviceProvider, scheduler.Object);
    }

    #region Test doubles

    internal sealed record TestEntity(string BatchKey, string Id)
    {
        public bool Processed { get; set; }
    }

    /// <summary>
    /// <see cref="IEntity" />-implementing sibling of <see cref="TestEntity" />, used ONLY by the forward-progress
    /// guard tests (TC-PLATJOB-080..084). <see cref="TestEntity" /> deliberately stays a plain, non-<see cref="IEntity" />
    /// record for every other test in this file: <c>ResolvePageEntityIds</c>
    /// (<c>PlatformApplicationBatchScrollingBackgroundJobExecutor.cs:287-303</c>) requires <see cref="IEntity" /> to
    /// resolve a page's identity set at all, so a double that IS one is required to exercise the guard's THROW path,
    /// and a double that is NOT one is required to exercise its fail-open path — see
    /// <see cref="PlatformApplicationBatchScrollingBackgroundJobExecutorTests.ForwardProgressGuard_WhenEntityIdentityIsUnresolvable_StaysInactiveAndLogsOnce" />.
    /// </summary>
    internal sealed class IdentifiableTestEntity : IEntity
    {
        public IdentifiableTestEntity(string batchKey, string id)
        {
            BatchKey = batchKey;
            Id = id;
        }

        public string BatchKey { get; }

        public string Id { get; }

        public bool Processed { get; set; }

        public object GetId()
        {
            return Id;
        }
    }

    internal sealed class BatchTestParam
    {
        public string Payload { get; init; } = string.Empty;
    }

    internal sealed record ProcessedBatch(string BatchKey, BatchTestParam? Param, List<string> EntityIds);

    internal sealed record HandledBatchError(string BatchKey, Exception Error);

    /// <summary>
    /// In-memory batch-scrolling job. Scrolling semantics are honoured: a processed entity is marked and thereafter
    /// excluded by the query builder, exactly as a real "pending work" filter would stop matching once the work is done.
    /// </summary>
    private sealed class BatchScrollingTestJob : PlatformApplicationBatchScrollingBackgroundJobExecutor<TestEntity, string, BatchTestParam>
    {
        public BatchScrollingTestJob(
            IPlatformUnitOfWorkManager unitOfWorkManager,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler)
            : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
        {
        }

        public List<TestEntity> Entities { get; } = [];

        public List<ProcessedBatch> ProcessedBatches { get; } = [];

        public List<HandledBatchError> HandledBatchErrors { get; } = [];

        public Exception? ThrowOnProcessEntities { get; set; }

        public Exception? ThrowOnHandleBatchError { get; set; }

        public int ConfiguredBatchKeyPageSize { get; set; } = 1000;

        public int ConfiguredBatchPageSize { get; set; } = 100;

        /// <summary>
        /// When false, a processed page's entities are never marked done, so the SAME rows match the query again.
        /// Default true (unchanged behavior for every pre-existing test) — only the fail-open guard test flips it, to
        /// build a batch that genuinely never drains against the NON-<see cref="IEntity" /> double.
        /// </summary>
        public bool MarkEntitiesProcessed { get; set; } = true;

        protected override int BatchKeyPageSize => ConfiguredBatchKeyPageSize;

        protected override int BatchPageSize => ConfiguredBatchPageSize;

        protected override IQueryable<TestEntity> EntitiesQueryBuilder(IQueryable<TestEntity> query, BatchTestParam? param, string? batchKey = default)
        {
            var pending = query.Where(entity => !entity.Processed);

            return batchKey == null ? pending : pending.Where(entity => entity.BatchKey == batchKey);
        }

        protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(IQueryable<TestEntity> query, BatchTestParam? param, string? batchKey = null)
        {
            return EntitiesQueryBuilder(query, param, batchKey).Select(entity => entity.BatchKey).Distinct();
        }

        protected override Task ProcessEntitiesAsync(List<TestEntity> entities, string batchKey, BatchTestParam param, IServiceProvider serviceProvider)
        {
            if (ThrowOnProcessEntities != null)
                throw ThrowOnProcessEntities;

            lock (ProcessedBatches)
                ProcessedBatches.Add(new ProcessedBatch(batchKey, param, entities.Select(entity => entity.Id).ToList()));

            if (MarkEntitiesProcessed)
                foreach (var entity in entities)
                    entity.Processed = true;

            return Task.CompletedTask;
        }

        protected override Task<List<TSelector>> GetAllEntitiesAsync<TSelector>(
            IServiceProvider serviceProvider,
            Func<IQueryable<TestEntity>, IQueryable<TSelector>> queryBuilder,
            CancellationToken cancellationToken = default,
            params Expression<Func<TestEntity, object?>>[] loadRelatedEntities)
        {
            List<TestEntity> snapshot;
            lock (Entities)
                snapshot = [.. Entities];

            return Task.FromResult(queryBuilder(snapshot.AsQueryable()).ToList());
        }

        protected override Task<int> CountEntitiesAsync<TQueryItemResult>(
            IServiceProvider serviceProvider,
            Func<IQueryable<TestEntity>, IQueryable<TQueryItemResult>> queryBuilder,
            CancellationToken cancellationToken = default)
        {
            List<TestEntity> snapshot;
            lock (Entities)
                snapshot = [.. Entities];

            return Task.FromResult(queryBuilder(snapshot.AsQueryable()).Count());
        }

        protected override Task HandleBatchErrorAsync(string batchKey, BatchTestParam? param, Exception exception)
        {
            lock (HandledBatchErrors)
                HandledBatchErrors.Add(new HandledBatchError(batchKey, exception));

            if (ThrowOnHandleBatchError != null)
                throw ThrowOnHandleBatchError;

            return Task.CompletedTask;
        }
    }

    /// <summary>
    /// <see cref="IEntity" />-backed sibling of <see cref="BatchScrollingTestJob" />, used ONLY by the
    /// forward-progress guard tests (TC-PLATJOB-080..084). Marking is toggleable via
    /// <see cref="MarkEntitiesProcessed" /> (default <c>true</c>, i.e. drains normally) so ONE double can build both a
    /// legitimately-draining batch and a never-draining one, exactly as a real "pending work" filter that never
    /// clears would behave.
    /// </summary>
    private sealed class IdEntityBatchScrollingTestJob : PlatformApplicationBatchScrollingBackgroundJobExecutor<IdentifiableTestEntity, string, BatchTestParam>
    {
        public IdEntityBatchScrollingTestJob(
            IPlatformUnitOfWorkManager unitOfWorkManager,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler)
            : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
        {
        }

        public List<IdentifiableTestEntity> Entities { get; } = [];

        public List<ProcessedBatch> ProcessedBatches { get; } = [];

        public int ConfiguredBatchPageSize { get; set; } = 100;

        /// <summary>When false, a processed page's entities are never marked done, so the SAME rows match the query again.</summary>
        public bool MarkEntitiesProcessed { get; set; } = true;

        /// <summary>
        /// Stands in for a subclass that legitimately leaves rows matching its query builder and therefore opts out of
        /// the forward-progress guard. Default <c>true</c> so every pre-existing guard test keeps its meaning.
        /// </summary>
        public bool ConfiguredEnableForwardProgressGuard { get; set; } = true;

        protected override int BatchPageSize => ConfiguredBatchPageSize;

        protected override bool EnableForwardProgressGuard => ConfiguredEnableForwardProgressGuard;

        protected override IQueryable<IdentifiableTestEntity> EntitiesQueryBuilder(IQueryable<IdentifiableTestEntity> query, BatchTestParam? param, string? batchKey = default)
        {
            var pending = query.Where(entity => !entity.Processed);

            return batchKey == null ? pending : pending.Where(entity => entity.BatchKey == batchKey);
        }

        protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(IQueryable<IdentifiableTestEntity> query, BatchTestParam? param, string? batchKey = null)
        {
            return EntitiesQueryBuilder(query, param, batchKey).Select(entity => entity.BatchKey).Distinct();
        }

        protected override Task ProcessEntitiesAsync(List<IdentifiableTestEntity> entities, string batchKey, BatchTestParam param, IServiceProvider serviceProvider)
        {
            lock (ProcessedBatches)
                ProcessedBatches.Add(new ProcessedBatch(batchKey, param, entities.Select(entity => entity.Id).ToList()));

            if (MarkEntitiesProcessed)
                foreach (var entity in entities)
                    entity.Processed = true;

            return Task.CompletedTask;
        }

        protected override Task<List<TSelector>> GetAllEntitiesAsync<TSelector>(
            IServiceProvider serviceProvider,
            Func<IQueryable<IdentifiableTestEntity>, IQueryable<TSelector>> queryBuilder,
            CancellationToken cancellationToken = default,
            params Expression<Func<IdentifiableTestEntity, object?>>[] loadRelatedEntities)
        {
            List<IdentifiableTestEntity> snapshot;
            lock (Entities)
                snapshot = [.. Entities];

            return Task.FromResult(queryBuilder(snapshot.AsQueryable()).ToList());
        }

        protected override Task<int> CountEntitiesAsync<TQueryItemResult>(
            IServiceProvider serviceProvider,
            Func<IQueryable<IdentifiableTestEntity>, IQueryable<TQueryItemResult>> queryBuilder,
            CancellationToken cancellationToken = default)
        {
            List<IdentifiableTestEntity> snapshot;
            lock (Entities)
                snapshot = [.. Entities];

            return Task.FromResult(queryBuilder(snapshot.AsQueryable()).Count());
        }
    }

    /// <summary>
    /// Deliberately does NOT override <c>BatchKeyPageSize</c>/<c>BatchPageSize</c>/<c>EnableForwardProgressGuard</c>, so
    /// the <c>Exposed*</c> properties read the base class's OWN defaults directly. Used only by
    /// <see cref="PlatformApplicationBatchScrollingBackgroundJobExecutorTests.BatchKeyPageSizeAndBatchPageSize_DefaultToTheDocumentedProductionValues" />
    /// and <see cref="PlatformApplicationBatchScrollingBackgroundJobExecutorTests.EnableForwardProgressGuard_DefaultsToOn_SoARepeatedPageStillThrows" />
    /// to catch drift that every other test's re-declared <c>Configured*PageSize</c> constants would otherwise mask;
    /// never executed, so every abstract method throws.
    /// </summary>
    private sealed class DefaultsProbeTestJob : PlatformApplicationBatchScrollingBackgroundJobExecutor<TestEntity, string, BatchTestParam>
    {
        public DefaultsProbeTestJob(
            IPlatformUnitOfWorkManager unitOfWorkManager,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler)
            : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
        {
        }

        public int ExposedBatchKeyPageSize => BatchKeyPageSize;

        public int ExposedBatchPageSize => BatchPageSize;

        public bool ExposedEnableForwardProgressGuard => EnableForwardProgressGuard;

        protected override IQueryable<TestEntity> EntitiesQueryBuilder(IQueryable<TestEntity> query, BatchTestParam? param, string? batchKey = default)
        {
            throw new NotSupportedException("DefaultsProbeTestJob only reads the page-size properties; it never executes.");
        }

        protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(IQueryable<TestEntity> query, BatchTestParam? param, string? batchKey = null)
        {
            throw new NotSupportedException("DefaultsProbeTestJob only reads the page-size properties; it never executes.");
        }

        protected override Task ProcessEntitiesAsync(List<TestEntity> entities, string batchKey, BatchTestParam param, IServiceProvider serviceProvider)
        {
            throw new NotSupportedException("DefaultsProbeTestJob only reads the page-size properties; it never executes.");
        }

        protected override Task<List<TSelector>> GetAllEntitiesAsync<TSelector>(
            IServiceProvider serviceProvider,
            Func<IQueryable<TestEntity>, IQueryable<TSelector>> queryBuilder,
            CancellationToken cancellationToken = default,
            params Expression<Func<TestEntity, object?>>[] loadRelatedEntities)
        {
            throw new NotSupportedException("DefaultsProbeTestJob only reads the page-size properties; it never executes.");
        }

        protected override Task<int> CountEntitiesAsync<TQueryItemResult>(
            IServiceProvider serviceProvider,
            Func<IQueryable<TestEntity>, IQueryable<TQueryItemResult>> queryBuilder,
            CancellationToken cancellationToken = default)
        {
            throw new NotSupportedException("DefaultsProbeTestJob only reads the page-size properties; it never executes.");
        }
    }

    #endregion
}
