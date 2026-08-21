using System.Linq.Expressions;
using Easy.Platform.Application;
using Easy.Platform.Application.BackgroundJob;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Infrastructures.BackgroundJob;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Easy.Platform.Tests.Unit.Infrastructures.BackgroundJob;

/// <summary>
/// Guards <see cref="PlatformApplicationBackgroundJobScheduler" /> (the application-layer facade over whichever
/// infrastructure scheduler is registered) and
/// <see cref="PlatformApplicationBackgroundJobSchedulerCarryRequestContextService" /> (which copies the caller's
/// request context onto the scheduled job).
/// <para>
/// <b>Invariants guarded:</b>
/// (1) the facade RESOLVES the infrastructure scheduler LAZILY — constructing it must not require the infrastructure
/// scheduler to exist yet, which is what lets the application module register before the infrastructure module;
/// (2) every facade call DELEGATES with the caller's arguments unchanged and returns the inner result — a facade that
/// quietly dropped an argument would schedule the wrong job or the wrong schedule;
/// (3) the carry service copies the request context ACROSS the scheduling boundary in both directions, which is how a
/// background job inherits the originating user/tenant identity.
/// </para>
/// </summary>
public sealed class PlatformApplicationBackgroundJobSchedulerTests : IDisposable
{
    private readonly Mock<IPlatformBackgroundJobScheduler> innerScheduler = new();
    private readonly ServiceProvider serviceProvider;

    public PlatformApplicationBackgroundJobSchedulerTests()
    {
        var services = new ServiceCollection();
        services.AddSingleton(innerScheduler.Object);
        serviceProvider = services.BuildServiceProvider();
    }

    public void Dispose()
    {
        serviceProvider.Dispose();
    }

    // TC-PLATJOB-036: constructing the facade must NOT resolve the infrastructure scheduler yet.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-036")]
    public void Ctor_DoesNotResolveTheInfrastructureSchedulerUntilItIsActuallyUsed()
    {
        var resolveCount = 0;
        var services = new ServiceCollection();
        services.AddSingleton(_ =>
        {
            resolveCount++;
            return innerScheduler.Object;
        });
        using var lazyServiceProvider = services.BuildServiceProvider();

        var facade = new PlatformApplicationBackgroundJobScheduler(lazyServiceProvider);

        resolveCount.Should().Be(0, "resolution is deferred behind a Lazy so module registration order stays free");

        facade.BuildAutoRecurringJobIdByType(typeof(SchedulerTestJob));

        resolveCount.Should().Be(1, "the first actual use resolves it exactly once");

        facade.BuildAutoRecurringJobIdByType(typeof(SchedulerTestJob));

        resolveCount.Should().Be(1, "the Lazy must cache — re-resolving per call would defeat the point");
    }

    // TC-PLATJOB-037: type+param scheduling delegates the exact type, param and enqueue time, and returns the inner id.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-037")]
    public async Task Schedule_WithTypeAndParam_DelegatesEveryArgumentUnchangedAndReturnsTheInnerJobId()
    {
        var param = new SchedulerTestParam { Payload = "TC-PLATJOB-037" };
        var enqueueAt = new DateTimeOffset(2026, 08, 19, 10, 30, 00, TimeSpan.Zero);
        innerScheduler
            .Setup(inner => inner.Schedule(typeof(SchedulerTestJob), param, enqueueAt))
            .ReturnsAsync("inner-job-id-037");

        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);

        var jobId = await facade.Schedule(typeof(SchedulerTestJob), param, enqueueAt);

        jobId.Should().Be("inner-job-id-037", "the caller needs the real job id back to be able to cancel or track the job");
        innerScheduler.Verify(inner => inner.Schedule(typeof(SchedulerTestJob), param, enqueueAt), Times.Once);
    }

    // TC-PLATJOB-037: the recurring-job upsert delegates the cron factory and timezone unchanged.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-037")]
    public async Task UpsertRecurringJob_DelegatesTheCronFactoryAndTimeZoneUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        var cronFactory = () => "0 4 * * *";
        var timeZone = TimeZoneInfo.Utc;

        await facade.UpsertRecurringJob(typeof(SchedulerTestJob), cronFactory, timeZone);

        innerScheduler.Verify(
            inner => inner.UpsertRecurringJob(typeof(SchedulerTestJob), cronFactory, timeZone),
            Times.Once,
            "substituting or re-wrapping the cron factory would silently change WHEN the job runs");
    }

    // TC-PLATJOB-038: each lifecycle operation is its own test — split from one bundled test (recorded finding L2) so a
    // single broken delegation fails with a precise name instead of hiding behind, or being masked by, its 4 siblings.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-038")]
    public async Task RemoveJobIfExist_PassesThroughToTheInfrastructureScheduler()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);

        await facade.RemoveJobIfExist("job-038");

        innerScheduler.Verify(inner => inner.RemoveJobIfExist("job-038"), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-038")]
    public async Task RemoveRecurringJobIfExist_PassesThroughToTheInfrastructureScheduler()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);

        await facade.RemoveRecurringJobIfExist("recurring-038");

        innerScheduler.Verify(inner => inner.RemoveRecurringJobIfExist("recurring-038"), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-038")]
    public async Task RemoveAllRecurringJobs_PassesThroughToTheInfrastructureScheduler()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);

        await facade.RemoveAllRecurringJobs();

        innerScheduler.Verify(inner => inner.RemoveAllRecurringJobs(), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-038")]
    public async Task TriggerRecurringJob_PassesThroughToTheInfrastructureScheduler()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);

        await facade.TriggerRecurringJob<SchedulerTestJob>();

        innerScheduler.Verify(inner => inner.TriggerRecurringJob<SchedulerTestJob>(), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-038")]
    public async Task AllExistingRecurringJobIds_ReturnsTheInnerSchedulersResultUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        innerScheduler.Setup(inner => inner.AllExistingRecurringJobIds()).ReturnsAsync(["_Auto_.SchedulerTestJob"]);

        var existingIds = await facade.AllExistingRecurringJobIds();

        existingIds.Should().BeEquivalentTo(["_Auto_.SchedulerTestJob"]);
    }

    // TC-PLATJOB-038: the delayed-schedule overload passes a null delay through rather than substituting a default.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-038")]
    public async Task Schedule_WithExpressionAndDelay_PassesTheDelayThroughIncludingNull()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        innerScheduler.Setup(inner => inner.Schedule(It.IsAny<Expression<Action>>(), It.IsAny<TimeSpan?>())).ReturnsAsync("inner-job-id-038");

        var withDelay = await facade.Schedule(() => DoNothing(), TimeSpan.FromMinutes(5));
        var withoutDelay = await facade.Schedule(() => DoNothing());

        withDelay.Should().Be("inner-job-id-038");
        withoutDelay.Should().Be("inner-job-id-038");
        innerScheduler.Verify(inner => inner.Schedule(It.IsAny<Expression<Action>>(), TimeSpan.FromMinutes(5)), Times.Once);
        innerScheduler.Verify(
            inner => inner.Schedule(It.IsAny<Expression<Action>>(), null),
            Times.Once,
            "the null delay must reach the infrastructure scheduler, which owns the meaning of \"no delay\"");
    }

    // TC-PLATJOB-039: the carry service exposes the CURRENT request context values to be captured at schedule time.
    //
    // Mutation-survivor fix: production's CurrentRequestContext() calls GetAllKeyValues() specifically
    // (PlatformApplicationBackgroundJobSchedulerCarryRequestContextService.cs:23), which excludes deliberately-ignored
    // keys — GetAllIncludeIgnoredKeyValues() does not. TestRequestContext previously implemented both methods
    // identically, so swapping production to the wrong one left this test green. Marking "IgnoredKey039" ignored and
    // asserting it is excluded makes that swap a real, catchable regression.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-039")]
    public void CarryRequestContextService_CurrentRequestContext_ReturnsTheLiveRequestContextValues()
    {
        var accessor = new TestRequestContextAccessor();
        var context = (TestRequestContext)accessor.Current;
        context.SetValue("user-039", PlatformApplicationCommonRequestContextKeys.UserIdContextKey);
        context.SetValue("request-039", PlatformApplicationCommonRequestContextKeys.RequestIdContextKey);
        context.SetValue("secret-039", "IgnoredKey039");
        context.IgnoredKeys.Add("IgnoredKey039");

        var carryService = new PlatformApplicationBackgroundJobSchedulerCarryRequestContextService(accessor, new TestApplicationSettingContext());

        var captured = carryService.CurrentRequestContext();

        captured.Should().ContainKey(PlatformApplicationCommonRequestContextKeys.UserIdContextKey)
            .WhoseValue.Should().Be("user-039", "the scheduled job must inherit the originating user's identity");
        captured.Should().ContainKey(PlatformApplicationCommonRequestContextKeys.RequestIdContextKey)
            .WhoseValue.Should().Be("request-039");
        captured.Should().NotContainKey(
            "IgnoredKey039",
            "CurrentRequestContext() must call GetAllKeyValues(), not GetAllIncludeIgnoredKeyValues() — otherwise a "
            + "deliberately-ignored key leaks across the scheduling boundary into the background job");
    }

    // TC-PLATJOB-039: TestRequestContextAccessor.FirstAccessCurrentInitiated (BackgroundJobTestHarness.cs) turns true
    // the first time Current is read, mirroring the lazy-initialization contract documented on
    // IPlatformApplicationRequestContextAccessor.FirstAccessCurrentInitiated. Recorded LOW finding: this field was
    // being SET but no test ever asserted it, so a regression that stopped flipping it would go unnoticed.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-039")]
    public void CarryRequestContextService_CurrentRequestContext_TracksFirstAccessInitiation()
    {
        var accessor = new TestRequestContextAccessor();

        accessor.FirstAccessCurrentInitiated.Should().BeFalse("Current has not been read yet");

        var carryService = new PlatformApplicationBackgroundJobSchedulerCarryRequestContextService(accessor, new TestApplicationSettingContext());
        carryService.CurrentRequestContext();

        accessor.FirstAccessCurrentInitiated.Should().BeTrue("CurrentRequestContext() reads accessor.Current, which must flip the flag on first access");
    }

    // TC-PLATJOB-039: the carry service restores captured values onto the job's own request context.
    //
    // Scope note (was previously overclaimed as "restoring carried values must MERGE, not wipe"): this test drives
    // TestRequestContext.SetValues (this file's own fake — BackgroundJobTestHarness.cs), which happens to merge. It
    // does NOT drive production's PlatformDefaultApplicationRequestContext.SetValues(values, onlySelf:false)
    // (PlatformDefaultApplicationRequestContext.cs:76-89), which for onlySelf:false does not touch its own dictionary
    // at all — it delegates to CreatedByRequestContextAccessor.SetValues(values) instead, a materially different code
    // path this file does not construct (PlatformDefaultApplicationRequestContext needs IServiceProvider,
    // IPlatformApplicationSettingContext and PlatformApplicationLazyLoadRequestContextAccessorRegisters — a
    // request-context concern, not a background-job one). What this test DOES verify, correctly: the carry service
    // delegates SetCurrentRequestContextValues to accessor.Current.SetValues(dict) unchanged, and does not clear the
    // context itself before calling it.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-039")]
    public void CarryRequestContextService_SetCurrentRequestContextValues_RestoresTheCapturedValuesOntoTheJobContext()
    {
        var accessor = new TestRequestContextAccessor();
        accessor.Current.SetValue("pre-existing", "PreExistingKey");

        var carryService = new PlatformApplicationBackgroundJobSchedulerCarryRequestContextService(accessor, new TestApplicationSettingContext());
        using var scopeServiceProvider = new ServiceCollection().BuildServiceProvider();
        using var scope = scopeServiceProvider.CreateScope();

        carryService.SetCurrentRequestContextValues(
            scope,
            new Dictionary<string, object?>(StringComparer.Ordinal)
            {
                [PlatformApplicationCommonRequestContextKeys.UserIdContextKey] = "user-039-restored"
            });

        accessor.Current.GetValue<string>(PlatformApplicationCommonRequestContextKeys.UserIdContextKey)
            .Should().Be("user-039-restored", "without this restore a background job runs anonymously and every tenant filter loses its input");
        accessor.Current.GetValue<string>("PreExistingKey")
            .Should().Be("pre-existing", "the carry service must not clear the context itself before delegating to accessor.Current.SetValues");
    }

    // TC-PLATJOB-039: the application scheduler interface is the infrastructure one, so any job can take either.
    //
    // Honesty note: all three assertions below are compile-time-guaranteed by the type declarations — this test
    // catches no RUNTIME defect and needs editing the moment a declaration legitimately changes. Kept as an explicit,
    // discoverable trip-wire for the hierarchy rather than for its own sake.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-039")]
    public void ApplicationSchedulerContract_IsTheInfrastructureSchedulerContract()
    {
        typeof(IPlatformApplicationBackgroundJobScheduler).Should().BeAssignableTo<IPlatformBackgroundJobScheduler>();
        typeof(PlatformApplicationBackgroundJobScheduler).Should().BeAssignableTo<IPlatformApplicationBackgroundJobScheduler>();
        typeof(PlatformApplicationBackgroundJobSchedulerCarryRequestContextService)
            .Should().BeAssignableTo<IPlatformBackgroundJobSchedulerCarryRequestContextService>();
    }

    private static void DoNothing() { }

    #region Facade delegation coverage (TC-PLATJOB-085)

    // TC-PLATJOB-085: recorded finding M6 — the class's own stated invariant (2), "every facade call DELEGATES with
    // the caller's arguments unchanged", was unmet for ~18 of ~28 public members: only the overload actually used by
    // it went unproven, so a copy-paste mistake picking the WRONG sibling overload (there are 7 Schedule and 6
    // UpsertRecurringJob overloads alone) would ship unnoticed. Each test below drives exactly one previously-uncovered
    // overload and verifies the inner scheduler receives the same arguments, proving that specific overload's wiring.

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task Schedule_WithAsyncExpressionAndDelay_DelegatesUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        innerScheduler.Setup(inner => inner.Schedule(It.IsAny<Expression<Func<Task>>>(), TimeSpan.FromMinutes(3))).ReturnsAsync("inner-085-a");

        var jobId = await facade.Schedule(() => DoNothingAsync(), TimeSpan.FromMinutes(3));

        jobId.Should().Be("inner-085-a");
        innerScheduler.Verify(inner => inner.Schedule(It.IsAny<Expression<Func<Task>>>(), TimeSpan.FromMinutes(3)), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task Schedule_WithGenericJobExecutorAndEnqueueAt_DelegatesUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        var enqueueAt = new DateTimeOffset(2026, 08, 19, 12, 00, 00, TimeSpan.Zero);
        innerScheduler.Setup(inner => inner.Schedule<SchedulerTestJob>(enqueueAt)).ReturnsAsync("inner-085-b");

        var jobId = await facade.Schedule<SchedulerTestJob>(enqueueAt);

        jobId.Should().Be("inner-085-b");
        innerScheduler.Verify(inner => inner.Schedule<SchedulerTestJob>(enqueueAt), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task Schedule_WithGenericJobExecutorAndParamAndEnqueueAt_DelegatesUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        var param = new SchedulerTestParam { Payload = "085-c" };
        var enqueueAt = new DateTimeOffset(2026, 08, 19, 12, 05, 00, TimeSpan.Zero);
        innerScheduler
            .Setup(inner => inner.Schedule<SchedulerTestParamJob, SchedulerTestParam>(enqueueAt, param))
            .ReturnsAsync("inner-085-c");

        var jobId = await facade.Schedule<SchedulerTestParamJob, SchedulerTestParam>(enqueueAt, param);

        jobId.Should().Be("inner-085-c");
        innerScheduler.Verify(inner => inner.Schedule<SchedulerTestParamJob, SchedulerTestParam>(enqueueAt, param), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task Schedule_WithActionExpressionAndEnqueueAt_DelegatesUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        var enqueueAt = new DateTimeOffset(2026, 08, 19, 12, 10, 00, TimeSpan.Zero);
        innerScheduler.Setup(inner => inner.Schedule(It.IsAny<Expression<Action>>(), enqueueAt)).ReturnsAsync("inner-085-d");

        var jobId = await facade.Schedule(() => DoNothing(), enqueueAt);

        jobId.Should().Be("inner-085-d");
        innerScheduler.Verify(inner => inner.Schedule(It.IsAny<Expression<Action>>(), enqueueAt), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task Schedule_WithGenericJobExecutorAndDelay_DelegatesUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        innerScheduler.Setup(inner => inner.Schedule<SchedulerTestJob>(TimeSpan.FromMinutes(7))).ReturnsAsync("inner-085-e");

        var jobId = await facade.Schedule<SchedulerTestJob>(TimeSpan.FromMinutes(7));

        jobId.Should().Be("inner-085-e");
        innerScheduler.Verify(inner => inner.Schedule<SchedulerTestJob>(TimeSpan.FromMinutes(7)), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task Schedule_WithGenericJobExecutorAndParamAndDelay_DelegatesUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        var param = new SchedulerTestParam { Payload = "085-f" };
        innerScheduler
            .Setup(inner => inner.Schedule<SchedulerTestParamJob, SchedulerTestParam>(param, TimeSpan.FromMinutes(9)))
            .ReturnsAsync("inner-085-f");

        var jobId = await facade.Schedule<SchedulerTestParamJob, SchedulerTestParam>(param, TimeSpan.FromMinutes(9));

        jobId.Should().Be("inner-085-f");
        innerScheduler.Verify(inner => inner.Schedule<SchedulerTestParamJob, SchedulerTestParam>(param, TimeSpan.FromMinutes(9)), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task UpsertRecurringJob_WithGenericJobExecutorAndParam_DelegatesUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        var param = new SchedulerTestParam { Payload = "085-g" };
        var cronFactory = () => "0 5 * * *";
        var timeZone = TimeZoneInfo.Utc;

        await facade.UpsertRecurringJob<SchedulerTestParamJob, SchedulerTestParam>(param, cronFactory, timeZone);

        innerScheduler.Verify(
            inner => inner.UpsertRecurringJob<SchedulerTestParamJob, SchedulerTestParam>(param, cronFactory, timeZone),
            Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task UpsertRecurringJob_WithJobExecutorType_DelegatesUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        var cronFactory = () => "0 6 * * *";
        var timeZone = TimeZoneInfo.Utc;

        await facade.UpsertRecurringJob(typeof(SchedulerTestJob), cronFactory, timeZone);

        innerScheduler.Verify(inner => inner.UpsertRecurringJob(typeof(SchedulerTestJob), cronFactory, timeZone), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task UpsertRecurringJob_WithJobExecutorTypeAndParam_DelegatesUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        var param = new SchedulerTestParam { Payload = "085-i" };
        var cronFactory = () => "0 7 * * *";
        var timeZone = TimeZoneInfo.Utc;

        await facade.UpsertRecurringJob(typeof(SchedulerTestParamJob), param, cronFactory, timeZone);

        innerScheduler.Verify(
            inner => inner.UpsertRecurringJob(typeof(SchedulerTestParamJob), param, cronFactory, timeZone),
            Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task UpsertRecurringJob_WithRecurringJobIdAndType_DelegatesUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        var cronFactory = () => "0 8 * * *";
        var timeZone = TimeZoneInfo.Utc;

        await facade.UpsertRecurringJob("recurring-085-j", typeof(SchedulerTestJob), cronFactory, timeZone);

        innerScheduler.Verify(
            inner => inner.UpsertRecurringJob("recurring-085-j", typeof(SchedulerTestJob), cronFactory, timeZone),
            Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task UpsertRecurringJob_WithRecurringJobIdTypeAndParam_DelegatesUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        var param = new SchedulerTestParam { Payload = "085-k" };
        var cronFactory = () => "0 9 * * *";
        var timeZone = TimeZoneInfo.Utc;

        await facade.UpsertRecurringJob("recurring-085-k", typeof(SchedulerTestParamJob), param, cronFactory, timeZone);

        innerScheduler.Verify(
            inner => inner.UpsertRecurringJob("recurring-085-k", typeof(SchedulerTestParamJob), param, cronFactory, timeZone),
            Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public void BuildAutoRecurringJobIdByType_Generic_DelegatesUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        innerScheduler.Setup(inner => inner.BuildAutoRecurringJobIdByType<SchedulerTestJob>()).Returns("built-085-l");

        var jobId = facade.BuildAutoRecurringJobIdByType<SchedulerTestJob>();

        jobId.Should().Be("built-085-l");
        innerScheduler.Verify(inner => inner.BuildAutoRecurringJobIdByType<SchedulerTestJob>(), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task ReplaceAllRecurringBackgroundJobs_DelegatesTheSameListUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        var newAllRecurringJobs = new List<IPlatformBackgroundJobExecutor> { new SchedulerTestJob() };

        await facade.ReplaceAllRecurringBackgroundJobs(newAllRecurringJobs);

        innerScheduler.Verify(inner => inner.ReplaceAllRecurringBackgroundJobs(newAllRecurringJobs), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task ExecuteBackgroundJob_GenericNoArgs_DelegatesUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);

        await facade.ExecuteBackgroundJob<SchedulerTestJob>();

        innerScheduler.Verify(inner => inner.ExecuteBackgroundJob<SchedulerTestJob>(), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task ExecuteBackgroundJobWithParam_DelegatesTheSameParamUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        var param = new SchedulerTestParam { Payload = "085-n" };

        await facade.ExecuteBackgroundJobWithParam<SchedulerTestJob>(param);

        innerScheduler.Verify(inner => inner.ExecuteBackgroundJobWithParam<SchedulerTestJob>(param), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task ExecuteBackgroundJob_WithJobExecutorInstance_DelegatesTheSameInstanceUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        var jobInstance = new SchedulerTestJob();

        await facade.ExecuteBackgroundJob(jobInstance);

        innerScheduler.Verify(inner => inner.ExecuteBackgroundJob(jobInstance), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task ExecuteBackgroundJob_WithJobExecutorInstanceAndParam_DelegatesBothUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);
        var jobInstance = new SchedulerTestParamJob();
        var param = new SchedulerTestParam { Payload = "085-p" };

        await facade.ExecuteBackgroundJob(jobInstance, param);

        innerScheduler.Verify(inner => inner.ExecuteBackgroundJob(jobInstance, param), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-085")]
    public async Task ExecuteBackgroundJobByType_DelegatesTheJsonPayloadsUnchanged()
    {
        var facade = new PlatformApplicationBackgroundJobScheduler(serviceProvider);

        await facade.ExecuteBackgroundJobByType(typeof(SchedulerTestJob), "{\"payload\":\"085-q\"}", "{\"userId\":\"085-q\"}");

        innerScheduler.Verify(
            inner => inner.ExecuteBackgroundJobByType(typeof(SchedulerTestJob), "{\"payload\":\"085-q\"}", "{\"userId\":\"085-q\"}"),
            Times.Once);
    }

    #endregion

    private static Task DoNothingAsync() { return Task.CompletedTask; }

    #region Test doubles

    internal sealed class SchedulerTestParam
    {
        public string Payload { get; init; } = string.Empty;
    }

    private sealed class SchedulerTestJob : IPlatformBackgroundJobExecutor
    {
        public void Execute() { }

        public TimeSpan? SlowProcessWarningTime() { return null; }
    }

    private sealed class SchedulerTestParamJob : IPlatformBackgroundJobExecutor<SchedulerTestParam>
    {
        public void Execute() { }

        public void Execute(SchedulerTestParam param) { }

        public TimeSpan? SlowProcessWarningTime() { return null; }
    }

    #endregion
}
