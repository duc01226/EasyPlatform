using Easy.Platform.Application.BackgroundJob;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Tests.Unit.TestInfrastructure;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Easy.Platform.Tests.Unit.Infrastructures.BackgroundJob;

/// <summary>
/// Guards the application-layer wrapper <see cref="PlatformApplicationBackgroundJobExecutor{TParam}" />, which is what
/// every business background job actually derives from.
/// <para>
/// <b>Invariants guarded:</b>
/// (1) <c>AutoOpenUow</c> decides whether the job body runs inside a unit of work — getting this wrong either loses
/// every write the job makes or commits half of them;
/// (2) the job stamps its identity into the request context and appends itself to the consumer/event-handler pipeline,
/// which is the ONLY data the circular-pipeline guard has to work with;
/// (3) once that pipeline shows the job re-entering itself past the configured threshold the body is SKIPPED and the
/// run still completes successfully — a job that instead threw would be retried forever, amplifying the loop.
/// </para>
/// </summary>
public sealed class PlatformApplicationBackgroundJobExecutorTests : IDisposable
{
    private readonly RecordingLoggerFactory loggerFactory = new();
    private readonly TestRequestContextAccessor requestContextAccessor = new();
    private readonly Mock<IPlatformApplicationBackgroundJobScheduler> scheduler = new();
    private readonly TestApplicationSettingContext settingContext = new();
    private readonly Mock<IPlatformUnitOfWorkManager> unitOfWorkManager = new();

    private readonly ServiceProvider serviceProvider;

    public PlatformApplicationBackgroundJobExecutorTests()
    {
        serviceProvider = BackgroundJobTestHarness.BuildServiceProvider(settingContext, requestContextAccessor);

        // ExecuteUowTask is a default-interface method, so a loose mock would return a null Task. Wiring it to actually
        // invoke the supplied delegate is what lets the test observe the job body running INSIDE the unit of work.
        unitOfWorkManager
            .Setup(manager => manager.ExecuteUowTask(It.IsAny<Func<Task>>(), It.IsAny<bool>()))
            .Returns<Func<Task>, bool>((taskFn, _) => taskFn());
        unitOfWorkManager
            .Setup(manager => manager.TryCurrentActiveUowSaveChangesAsync())
            .Returns(Task.CompletedTask);
    }

    private string ExpectedPipelineRoutingKey => $"{settingContext.ApplicationName}---{nameof(ApplicationTestJob)}";

    public void Dispose()
    {
        serviceProvider.Dispose();
    }

    // TC-PLATJOB-020: AutoOpenUow defaults to true and the job body runs INSIDE UnitOfWorkManager.ExecuteUowTask.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-020")]
    public void Execute_WithDefaultAutoOpenUow_RunsProcessAsyncInsideAUnitOfWork()
    {
        // MUST read the base class's OWN default, not ApplicationTestJob's override (`AutoOpenUowValue`, itself
        // initialized to `= true`). PlainApplicationTestJob overrides nothing, so this reads
        // PlatformApplicationBackgroundJobExecutor.cs:43 directly. Mutation proof: flipping that production line to
        // `=> false` left this assertion green before this fix, because the override shadowed it entirely.
        new PlainApplicationTestJob(unitOfWorkManager.Object, loggerFactory, serviceProvider, scheduler.Object)
            .AutoOpenUow.Should().BeTrue("application jobs open their own unit of work by default");

        var job = CreateJob();

        job.Execute(new ApplicationJobParam { Payload = "TC-PLATJOB-020" });

        job.ProcessAsyncCallCount.Should().Be(1);
        unitOfWorkManager.Verify(manager => manager.ExecuteUowTask(It.IsAny<Func<Task>>(), It.IsAny<bool>()), Times.Once);
        unitOfWorkManager.Verify(manager => manager.TryCurrentActiveUowSaveChangesAsync(), Times.Never);
    }

    // TC-PLATJOB-021: opting out of AutoOpenUow runs the body outside a UoW but still flushes any ambient active UoW.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-021")]
    public void Execute_WithAutoOpenUowDisabled_RunsProcessAsyncOutsideAUowThenFlushesTheAmbientOne()
    {
        var job = CreateJob();
        job.AutoOpenUowValue = false;

        job.Execute(new ApplicationJobParam());

        job.ProcessAsyncCallCount.Should().Be(1);
        unitOfWorkManager.Verify(manager => manager.ExecuteUowTask(It.IsAny<Func<Task>>(), It.IsAny<bool>()), Times.Never);
        unitOfWorkManager.Verify(
            manager => manager.TryCurrentActiveUowSaveChangesAsync(),
            Times.Once,
            "without an auto-opened UoW the job must still commit whatever the ambient active UoW accumulated, or its writes are lost");
    }

    // TC-PLATJOB-022: the job stamps its identity into the request context and appends itself to the pipeline.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-022")]
    public void Execute_StampsTheJobIdentityIntoRequestContextAndAppendsItselfToThePipeline()
    {
        var job = CreateJob();

        job.Execute(new ApplicationJobParam());

        var context = requestContextAccessor.Current;

        context.GetValue<string>(PlatformApplicationBackgroundJobExecutor<ApplicationJobParam>.BackgroundJobNameRequestContextKey)
            .Should().Be(ExpectedPipelineRoutingKey, "downstream logs, events and bus messages identify the originating job by this exact value");

        context.ConsumerOrEventHandlerPipeLine()
            .Should().ContainSingle().Which.Should().Be(
                ExpectedPipelineRoutingKey,
                "the circular-pipeline guard has nothing but this pipeline to detect a job re-entering itself");
    }

    // TC-PLATJOB-023: a non-null param is published to the request context; a null param leaves the key absent.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-023")]
    public void Execute_PublishesANonNullParamToRequestContextButLeavesTheKeyAbsentForNull()
    {
        var withParamJob = CreateJob();
        var param = new ApplicationJobParam { Payload = "TC-PLATJOB-023" };

        withParamJob.Execute(param);

        requestContextAccessor.Current
            .GetValue<ApplicationJobParam>(PlatformApplicationBackgroundJobExecutor<ApplicationJobParam>.BackgroundJobParamRequestContextKey)
            .Should().BeSameAs(param);

        // Fresh accessor so the previous run's stamp cannot mask the null case.
        var nullParamAccessor = new TestRequestContextAccessor();
        using var nullParamServiceProvider = BackgroundJobTestHarness.BuildServiceProvider(settingContext, nullParamAccessor);
        var nullParamJob = new ApplicationTestJob(unitOfWorkManager.Object, loggerFactory, nullParamServiceProvider, scheduler.Object);

        nullParamJob.Execute();

        nullParamJob.ProcessAsyncCallCount.Should().Be(1, "a parameterless run must still execute");
        nullParamAccessor.Current
            .ContainsKey(PlatformApplicationBackgroundJobExecutor<ApplicationJobParam>.BackgroundJobParamRequestContextKey)
            .Should().BeFalse("a null param must not be published as a null context entry");
    }

    // TC-PLATJOB-024: LogDebugInformation is delegated to the application's IsDebugInformationMode setting.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATJOB-024")]
    [InlineData(true)]
    [InlineData(false)]
    public void LogDebugInformation_MirrorsTheApplicationIsDebugInformationModeSetting(bool isDebugInformationMode)
    {
        settingContext.IsDebugInformationMode = isDebugInformationMode;

        CreateJob().LogDebugInformation().Should().Be(
            isDebugInformationMode,
            "the application job overrides the base class default so verbosity is a deployment setting, not a per-job constant");
    }

    // TC-PLATJOB-025: a pipeline showing self re-entry past the threshold SKIPS the body, logs an Error, and succeeds.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-025")]
    public void Execute_WhenTheRequestContextPipelineShowsCircularReEntry_SkipsTheBodyLogsErrorAndStillSucceeds()
    {
        settingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount = 2;

        // Seed the pipeline as if this job had already been re-entered twice via events/commands. The executor appends
        // itself once more, so the guard sees Count == 4 (>= maxCircularCount * 2) with 2 prior self-entries — exactly
        // the trip condition (PlatformApplicationCommonRequestContextKeys.cs:133-139).
        requestContextAccessor.Current.SetConsumerOrEventHandlerPipeLine(
            [ExpectedPipelineRoutingKey, ExpectedPipelineRoutingKey, "SomeOtherApp---SomeOtherHandler"]);

        var job = CreateJob();

        job.Execute(new ApplicationJobParam());

        job.ProcessAsyncCallCount.Should().Be(0, "the job body must be SKIPPED once a circular pipeline is detected");
        unitOfWorkManager.Verify(
            manager => manager.ExecuteUowTask(It.IsAny<Func<Task>>(), It.IsAny<bool>()),
            Times.Never,
            "a skipped job must not even open a unit of work");

        loggerFactory.Logger.Entries.Should().Contain(
            entry => entry.Level == LogLevel.Error && entry.Formatted.Contains("[CircularPipeLineSkipped]", StringComparison.Ordinal),
            "the skip must be visible in logs — silently doing nothing would be indistinguishable from a healthy run");
    }

    // TC-PLATJOB-025: a healthy (non-circular) pipeline must NOT trip the guard.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-025")]
    public void Execute_WhenThePipelineIsBelowTheCircularThreshold_RunsTheBodyNormally()
    {
        settingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount = 2;

        // One prior self-entry plus this run's own append is below the threshold — the far side of the same boundary.
        requestContextAccessor.Current.SetConsumerOrEventHandlerPipeLine([ExpectedPipelineRoutingKey]);

        var job = CreateJob();

        job.Execute(new ApplicationJobParam());

        job.ProcessAsyncCallCount.Should().Be(1, "a job legitimately re-entered once must still run");
        loggerFactory.Logger.Entries.Should().NotContain(
            entry => entry.Formatted.Contains("[CircularPipeLineSkipped]", StringComparison.Ordinal));
    }

    // TC-PLATJOB-026: the non-generic application executor is the object?-parameterised one.
    //
    // Honesty note: both assertions below are compile-time-guaranteed by the class declaration
    // (`PlatformApplicationBackgroundJobExecutor : PlatformApplicationBackgroundJobExecutor<object?>`) — this test
    // catches no RUNTIME defect and needs editing the moment that declaration legitimately changes. Kept as an
    // explicit, discoverable trip-wire for that hierarchy: a reviewer changing the base type sees a named, documented
    // test fail rather than silently losing the "the marker-typed convenience class IS the generic one" contract.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-026")]
    public void NonGenericApplicationExecutor_IsTheNullableObjectParameterisedExecutor()
    {
        typeof(PlatformApplicationBackgroundJobExecutor)
            .Should().BeDerivedFrom<PlatformApplicationBackgroundJobExecutor<object?>>();

        typeof(PlatformApplicationBackgroundJobExecutor)
            .Should().BeAssignableTo<IPlatformApplicationBackgroundJobExecutor>(
                "every application job must be discoverable through the application-executor marker interface");
    }

    private ApplicationTestJob CreateJob()
    {
        return new ApplicationTestJob(unitOfWorkManager.Object, loggerFactory, serviceProvider, scheduler.Object);
    }

    #region Test doubles

    internal sealed class ApplicationJobParam
    {
        public string Payload { get; init; } = string.Empty;
    }

    private sealed class ApplicationTestJob : PlatformApplicationBackgroundJobExecutor<ApplicationJobParam>
    {
        public ApplicationTestJob(
            IPlatformUnitOfWorkManager unitOfWorkManager,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler)
            : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
        {
        }

        public bool AutoOpenUowValue { get; set; } = true;

        public List<ApplicationJobParam?> ReceivedParams { get; } = [];

        public int ProcessAsyncCallCount => ReceivedParams.Count;

        public override bool AutoOpenUow => AutoOpenUowValue;

        public override Task ProcessAsync(ApplicationJobParam param)
        {
            ReceivedParams.Add(param);
            return Task.CompletedTask;
        }
    }

    /// <summary>
    /// Overrides NOTHING — used ONLY to read
    /// <see cref="PlatformApplicationBackgroundJobExecutor{TParam}.AutoOpenUow" />'s own default, unshadowed by
    /// <see cref="ApplicationTestJob" />'s settable override.
    /// </summary>
    private sealed class PlainApplicationTestJob : PlatformApplicationBackgroundJobExecutor<ApplicationJobParam>
    {
        public PlainApplicationTestJob(
            IPlatformUnitOfWorkManager unitOfWorkManager,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler)
            : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
        {
        }

        public override Task ProcessAsync(ApplicationJobParam param)
        {
            return Task.CompletedTask;
        }
    }

    #endregion
}
