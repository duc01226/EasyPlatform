using System.Reflection;
using System.Runtime.CompilerServices;
using Easy.Platform.Application.BackgroundJob;
using Easy.Platform.HangfireBackgroundJob;
using Easy.Platform.HangfireBackgroundJob.BackgroundJobs;
using Easy.Platform.Infrastructures.BackgroundJob;
using FluentAssertions;
using Hangfire;
using Hangfire.Common;
using Hangfire.States;
using Hangfire.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Easy.Platform.Tests.Unit.HangfireBackgroundJob;

/// <summary>
/// Guards the Hangfire provider classes that surround job execution: the processing-service lifecycle, the context
/// factory, the DI job activator, the auto-delete state filter, and the shipped state-history trim job.
/// <para>
/// <b>Invariants guarded:</b>
/// (1) starting the processing service twice must not spawn a second job server — two servers over one storage double
/// every job execution;
/// (2) disposing twice must be safe, because the hosted service disposes it on shutdown and the DI container disposes
/// it again;
/// (3) the activator resolves jobs from DI so their dependencies are injected, and falls back to Activator only when
/// the type is unregistered — returning null would surface inside Hangfire as an opaque failure;
/// (4) the auto-delete filter sets an expiry ONLY on success, so a failed job's diagnostics survive.
/// </para>
/// </summary>
public class PlatformHangfireBackgroundJobProviderTests
{
    // TC-PLATJOB-050: the processing service reports not-started until Start is called.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-050")]
    public void ProcessingService_BeforeStart_ReportsNotStarted()
    {
        using var service = CreateProcessingService(out var context);

        service.Started().Should().BeFalse("nothing must be consuming from the job storage before the host starts it");
        context.Verify(ctx => ctx.CreateBackgroundJobServer(It.IsAny<BackgroundJobServerOptions>()), Times.Never);
    }

    // TC-PLATJOB-051: Start creates the job server exactly once, even when called repeatedly.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-051")]
    public async Task ProcessingService_StartCalledTwice_CreatesTheJobServerOnlyOnce()
    {
        // Deliberately NOT disposed: the sentinel server below was never constructed, so disposing the service would
        // dispose it and fault. The finalizer path (Dispose(false)) never touches the server, so nothing real leaks.
        // Dispose semantics are covered by TC-PLATJOB-053 instead.
        var service = CreateProcessingService(out var context, ServerSentinel());

        await service.Start();
        await service.Start();

        service.Started().Should().BeTrue();
        context.Verify(
            ctx => ctx.CreateBackgroundJobServer(It.IsAny<BackgroundJobServerOptions>()),
            Times.Once,
            "a second job server over the same storage would execute every enqueued job twice");
    }

    // TC-PLATJOB-052: Stop before Start is a no-op rather than a failure.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-052")]
    public async Task ProcessingService_StopBeforeStart_IsANoOp()
    {
        using var service = CreateProcessingService(out var context);

        await service.Stop();

        service.Started().Should().BeFalse();
        context.Verify(ctx => ctx.CreateBackgroundJobServer(It.IsAny<BackgroundJobServerOptions>()), Times.Never);
    }

    // TC-PLATJOB-053: disposing twice is safe — both the hosted service and the DI container dispose it.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-053")]
    public void ProcessingService_DisposedTwice_IsGuardedAndDoesNotThrow()
    {
        var service = CreateProcessingService(out _);

        var act = () =>
        {
            service.Dispose();
            service.Dispose();
        };

        act.Should().NotThrow("the hosted service disposes it on shutdown and the container disposes it again");

        // The guard flag is pinned as well, because "does not throw" alone would also pass if the second Dispose simply
        // re-ran the whole body. The flag is what makes the second call a genuine no-op, and it is what stops an
        // already-disposed job server being disposed a second time in a real host.
        var disposedField = typeof(PlatformHangfireBackgroundJobProcessingService)
            .GetField("disposed", BindingFlags.Instance | BindingFlags.NonPublic);

        disposedField.Should().NotBeNull("the double-dispose guard is a private flag; renaming it must break this test loudly");
        disposedField!.GetValue(service).Should().Be(true);
    }

    // TC-PLATJOB-054: the shutdown grace period is a fixed 5 minutes.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-054")]
    public void ProcessingService_ShutdownGracePeriod_IsFiveMinutes()
    {
        PlatformHangfireBackgroundJobProcessingService.WaitForShutdownTimeoutInSeconds.Should().Be(
            5 * 60,
            "in-flight jobs get this long to finish before the server is torn down; shortening it abandons running work");
    }

    // TC-PLATJOB-055: the context exposes exactly the collaborators it was constructed with.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-055")]
    public void BackgroundJobContext_ExposesTheStorageFilterProviderAndActivatorItWasBuiltWith()
    {
        var storage = new Mock<JobStorage>().Object;
        var filterProvider = new Mock<IJobFilterProvider>().Object;
        var activator = new Mock<JobActivator>().Object;
        var mongoOptions = new PlatformHangfireUseMongoStorageOptions();

        var context = new PlatformHangfireBackgroundJobContext(storage, filterProvider, activator, mongoOptions);

        context.Storage.Should().BeSameAs(storage);
        context.FilterProvider.Should().BeSameAs(filterProvider);
        context.JobActivator.Should().BeSameAs(
            activator,
            "the activator is what injects each job's dependencies — substituting it would break every job's constructor");
        context.MongoStorageOptions.Should().BeSameAs(mongoOptions);
    }

    // TC-PLATJOB-055: the Mongo options are optional — a non-Mongo deployment leaves them null.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-055")]
    public void BackgroundJobContext_WithoutMongoOptions_LeavesThemNull()
    {
        var context = new PlatformHangfireBackgroundJobContext(
            new Mock<JobStorage>().Object,
            new Mock<IJobFilterProvider>().Object,
            new Mock<JobActivator>().Object);

        context.MongoStorageOptions.Should().BeNull(
            "SQL Server and Postgres deployments have no Mongo options, and the state-history trim job keys off exactly this null");
        typeof(PlatformHangfireBackgroundJobContext).IsSealed.Should().BeTrue("the context is not an extension point");
        typeof(PlatformHangfireBackgroundJobContext).Should().BeAssignableTo<IPlatformHangfireBackgroundJobContext>();
    }

    // TC-PLATJOB-056: the activator resolves a REGISTERED job from DI so its dependencies are injected.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-056")]
    public void HangfireActivator_ForARegisteredJobType_ReturnsTheDiResolvedInstance()
    {
        var registeredJob = new ActivatorTestJob();
        var services = new ServiceCollection();
        services.AddSingleton(registeredJob);
        using var serviceProvider = services.BuildServiceProvider();

        var activator = new PlatformHangfireActivator(serviceProvider);

        activator.ActivateJob(typeof(ActivatorTestJob)).Should().BeSameAs(
            registeredJob,
            "resolving from DI is what gives the job its repositories, loggers and settings");
    }

    // TC-PLATJOB-057: an UNREGISTERED job type falls back to Activator.CreateInstance rather than returning null.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-057")]
    public void HangfireActivator_ForAnUnregisteredJobType_FallsBackToActivatorInsteadOfReturningNull()
    {
        using var serviceProvider = new ServiceCollection().BuildServiceProvider();

        var activator = new PlatformHangfireActivator(serviceProvider);

        var activated = activator.ActivateJob(typeof(ActivatorTestJob));

        activated.Should().NotBeNull("returning null here would surface inside Hangfire as an opaque failure, not a missing-registration error");
        activated.Should().BeOfType<ActivatorTestJob>();
    }

    // TC-PLATJOB-058: the activator scope resolves from its own scope and disposes it, so scoped services do not leak.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-058")]
    public void HangfireActivatorScope_ResolvesFromItsOwnScopeAndDisposesIt()
    {
        var services = new ServiceCollection();
        services.AddScoped<DisposableScopedService>();
        using var serviceProvider = services.BuildServiceProvider();
        var scope = serviceProvider.CreateScope();

        var activatorScope = new PlatformHangfireJobActivatorScope(scope);

        var resolved = (DisposableScopedService)activatorScope.Resolve(typeof(DisposableScopedService));
        resolved.IsDisposed.Should().BeFalse();

        activatorScope.DisposeScope();

        resolved.IsDisposed.Should().BeTrue("a per-job scope that is never disposed leaks its scoped services for every executed job");
    }

    // TC-PLATJOB-058: a null scope is rejected at construction rather than at first resolve.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-058")]
    public void HangfireActivatorScope_WithANullScope_ThrowsAtConstruction()
    {
        var act = () => new PlatformHangfireJobActivatorScope(null!);

        act.Should().Throw<ArgumentNullException>("failing at construction points at the wiring; failing at Resolve would point at the job");
    }

    // TC-PLATJOB-058: BeginScope — the entry point Hangfire actually calls per job — wraps a TRACKED scope from the
    // SAME service provider the activator was constructed with, not an ad hoc one. Recorded LOW finding: every test
    // above constructs PlatformHangfireJobActivatorScope directly; PlatformHangfireActivator.BeginScope
    // (PlatformHangfireActivator.cs:28-31) itself had no direct coverage.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-058")]
    public void HangfireActivator_BeginScope_ResolvesFromATrackedScopeOfItsOwnServiceProvider()
    {
        var services = new ServiceCollection();
        services.AddScoped<DisposableScopedService>();
        using var serviceProvider = services.BuildServiceProvider();
        var activator = new PlatformHangfireActivator(serviceProvider);
        var activatorContext = new JobActivatorContext(
            new Mock<IStorageConnection>().Object,
            new global::Hangfire.BackgroundJob("job-058", Job.FromExpression(() => HangfireProviderTestJobMethods.NoOp()), DateTime.UtcNow),
            new Mock<IJobCancellationToken>().Object);

        var scope = activator.BeginScope(activatorContext);
        var resolved = (DisposableScopedService)scope.Resolve(typeof(DisposableScopedService));

        resolved.Should().NotBeNull("the scope must resolve against a real, working service provider, not a placeholder");

        scope.DisposeScope();

        resolved.IsDisposed.Should().BeTrue("BeginScope must hand back a TRACKED scope so DisposeScope actually tears it down");
    }

    // TC-PLATJOB-059: the auto-delete filter sets an expiry on SUCCESS only.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-059")]
    public void AutoDeleteJobAfterSuccessAttribute_OnSucceededState_SetsTheConfiguredExpiry()
    {
        var attribute = new PlatformHangfireAutoDeleteJobAfterSuccessAttribute(120);
        var context = CreateApplyStateContext("Succeeded");

        attribute.OnStateApplied(context, new Mock<IWriteOnlyTransaction>().Object);

        context.JobExpirationTimeout.Should().Be(TimeSpan.FromSeconds(120), "the constructor argument is expressed in seconds");
    }

    // TC-PLATJOB-059: a FAILED or otherwise non-succeeded job keeps its default retention so diagnostics survive.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATJOB-059")]
    [InlineData("Failed")]
    [InlineData("Deleted")]
    [InlineData("Processing")]
    [InlineData("Enqueued")]
    [InlineData("succeeded")]
    public void AutoDeleteJobAfterSuccessAttribute_OnAnyNonSucceededState_LeavesTheExpiryUntouched(string stateName)
    {
        var attribute = new PlatformHangfireAutoDeleteJobAfterSuccessAttribute(120);
        var context = CreateApplyStateContext(stateName);
        var originalExpiry = context.JobExpirationTimeout;

        attribute.OnStateApplied(context, new Mock<IWriteOnlyTransaction>().Object);

        // "succeeded" is included deliberately: the comparison is case-sensitive against Hangfire's own SucceededState
        // name, so a lower-cased state must NOT be treated as success.
        context.JobExpirationTimeout.Should().Be(
            originalExpiry,
            "shrinking a failed job's retention would delete the evidence needed to diagnose why it failed");
    }

    // TC-PLATJOB-059: unapplying a state must never change the expiry.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-059")]
    public void AutoDeleteJobAfterSuccessAttribute_OnStateUnapplied_LeavesTheExpiryUntouched()
    {
        var attribute = new PlatformHangfireAutoDeleteJobAfterSuccessAttribute(120);
        var context = CreateApplyStateContext("Succeeded");
        var originalExpiry = context.JobExpirationTimeout;

        attribute.OnStateUnapplied(context, new Mock<IWriteOnlyTransaction>().Object);

        context.JobExpirationTimeout.Should().Be(
            originalExpiry,
            "a state being rolled back must not carry the expiry that only applying success is allowed to set");
    }

    // TC-PLATJOB-059: the filter is a real Hangfire job filter, not just a bare attribute.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-059")]
    public void AutoDeleteJobAfterSuccessAttribute_IsAJobFilterHangfireWillActuallyInvoke()
    {
        typeof(PlatformHangfireAutoDeleteJobAfterSuccessAttribute).Should().BeDerivedFrom<JobFilterAttribute>();
        typeof(PlatformHangfireAutoDeleteJobAfterSuccessAttribute).Should().BeAssignableTo<IApplyStateFilter>(
            "without this interface Hangfire never calls OnStateApplied and the job simply never expires");
    }

    // TC-PLATJOB-059: the shipped state-history trim job's schedule and retention contract.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-059")]
    public void TrimHangfireStateHistoryBackgroundJob_DeclaresItsDailyScheduleAndRetentionContract()
    {
        var recurringJob = PlatformRecurringJobAttribute.GetRecurringJobAttributeInfo(typeof(PlatformTrimHangfireStateHistoryBackgroundJob));

        recurringJob.Should().NotBeNull("without a recurring-job attribute this maintenance job would never be registered");
        recurringJob!.CronExpression.Should().Be("0 4 * * *", "the trim runs daily off-peak; running it hourly would add write load for no benefit");
        recurringJob.ExecuteOnStartUp.Should().BeFalse("a maintenance sweep on every app boot would hammer storage during rolling deployments");

        PlatformTrimHangfireStateHistoryBackgroundJob.MaxStateHistoryEntries.Should().Be(
            20,
            "this cap is what keeps a Hangfire job document under MongoDB's 16MB BSON limit while retaining enough history to debug");

        typeof(PlatformTrimHangfireStateHistoryBackgroundJob).Should().BeDerivedFrom<PlatformApplicationBackgroundJobExecutor>();
        typeof(PlatformTrimHangfireStateHistoryBackgroundJob).Should().BeAssignableTo<IPlatformBackgroundJobExecutor>(
            "it must be discoverable by the module's job scan to ever be scheduled");
    }

    // TC-PLATJOB-059: the trim job opts OUT of the automatic unit of work.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-059")]
    public void TrimHangfireStateHistoryBackgroundJob_OptsOutOfTheAutomaticUnitOfWork()
    {
        var autoOpenUow = typeof(PlatformTrimHangfireStateHistoryBackgroundJob)
            .GetProperty(nameof(PlatformApplicationBackgroundJobExecutor.AutoOpenUow))!;

        autoOpenUow.DeclaringType.Should().Be(
            typeof(PlatformTrimHangfireStateHistoryBackgroundJob),
            "it must override the default rather than inherit it — this job talks to MongoDB directly, not through repositories, "
            + "so an opened unit of work would be a transaction that never sees a single write");
    }

    private static ApplyStateContext CreateApplyStateContext(string stateName)
    {
        var state = new Mock<IState>();
        state.SetupGet(newState => newState.Name).Returns(stateName);

        var storage = new Mock<JobStorage>().Object;
        var connection = new Mock<IStorageConnection>().Object;
        var transaction = new Mock<IWriteOnlyTransaction>().Object;
        var backgroundJob = new global::Hangfire.BackgroundJob("job-059", Job.FromExpression(() => HangfireProviderTestJobMethods.NoOp()), DateTime.UtcNow);

        return new ApplyStateContext(storage, connection, transaction, backgroundJob, state.Object, oldStateName: null);
    }

    /// <summary>
    /// A non-null stand-in for the job server. It is never started, never disposed and never invoked — the processing
    /// service only stores it and null-checks it, while every real constructor of BackgroundJobServer immediately begins
    /// polling real storage, which a unit test must not do.
    /// </summary>
    private static BackgroundJobServer ServerSentinel()
    {
        return (BackgroundJobServer)RuntimeHelpers.GetUninitializedObject(typeof(BackgroundJobServer));
    }

    private static PlatformHangfireBackgroundJobProcessingService CreateProcessingService(
        out Mock<IPlatformHangfireBackgroundJobContext> context,
        BackgroundJobServer? createdServer = null)
    {
        context = new Mock<IPlatformHangfireBackgroundJobContext>();
        context
            .Setup(ctx => ctx.CreateBackgroundJobServer(It.IsAny<BackgroundJobServerOptions>()))
            .Returns(createdServer!);

        return new PlatformHangfireBackgroundJobProcessingService(context.Object, new BackgroundJobServerOptions(), NullLoggerFactory.Instance);
    }

    #region Test doubles

    public sealed class ActivatorTestJob : IPlatformBackgroundJobExecutor
    {
        public void Execute()
        {
        }

        public TimeSpan? SlowProcessWarningTime()
        {
            return null;
        }
    }

    private sealed class DisposableScopedService : IDisposable
    {
        public bool IsDisposed { get; private set; }

        public void Dispose()
        {
            IsDisposed = true;
        }
    }

    #endregion
}

/// <summary>
/// Hosts the job method the ApplyStateContext fixture points at. It lives outside the test class because Hangfire's
/// Job.FromExpression only accepts a public method on a public type, and a public method on a test class is itself a
/// test-discovery error.
/// </summary>
public static class HangfireProviderTestJobMethods
{
    public static void NoOp()
    {
    }
}
