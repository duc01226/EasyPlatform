using Easy.Platform.Common;
using Easy.Platform.Infrastructures.BackgroundJob;
using Easy.Platform.Tests.Unit.TestInfrastructure;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Easy.Platform.Tests.Unit.Infrastructures.BackgroundJob;

/// <summary>
/// Guards the execution contract of <see cref="PlatformBackgroundJobExecutor{TParam}" /> — the single funnel EVERY
/// platform background job runs through.
/// <para>
/// <b>Invariants guarded:</b>
/// (1) the parameter the scheduler supplied reaches <c>ProcessAsync</c> unchanged, and the parameterless entry point
/// still runs the job (with a null param) rather than silently doing nothing;
/// (2) a failing job LOGS at Error <b>and RETHROWS</b> — swallowing it would make the scheduler record a permanent
/// success for work that never happened, so no retry would ever fire;
/// (3) the slow-process warning fires on and only on crossing the configured threshold — the operational signal that a
/// recurring job has started overrunning its window.
/// </para>
/// </summary>
public sealed class PlatformBackgroundJobExecutorTests : IDisposable
{
    private readonly RecordingLoggerFactory loggerFactory = new();
    private readonly Mock<IPlatformBackgroundJobScheduler> scheduler = new();
    private readonly ServiceProvider serviceProvider = BackgroundJobTestHarness.BuildServiceProvider();

    public void Dispose()
    {
        serviceProvider.Dispose();
    }

    // TC-PLATJOB-001: Execute(param) hands the EXACT param instance to ProcessAsync exactly once.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-001")]
    public void Execute_WithParam_PassesTheSameParamInstanceToProcessAsyncExactlyOnce()
    {
        var job = CreateJob();
        var param = new TestJobParam { Payload = "TC-PLATJOB-001-payload" };

        job.Execute(param);

        job.ProcessAsyncCallCount.Should().Be(1);
        job.ReceivedParams.Should().ContainSingle().Which.Should().BeSameAs(param, "the executor must not clone, re-serialize or substitute the scheduled param");
    }

    // TC-PLATJOB-002: the parameterless Execute() still RUNS the job, delegating with a null param.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-002")]
    public void Execute_WithoutParam_StillRunsTheJobAndDelegatesWithNullParam()
    {
        var job = CreateJob();

        job.Execute();

        job.ProcessAsyncCallCount.Should().Be(1, "Execute() delegates to Execute(null) — a parameterless recurring job must still run");
        job.ReceivedParams.Should().ContainSingle().Which.Should().BeNull();
    }

    // TC-PLATJOB-003: with no slow-warning configured the job runs on the non-profiled path and never emits a Warning.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-003")]
    public void Execute_WhenSlowProcessWarningTimeIsNull_RunsWithoutProfilingAndNeverWarns()
    {
        var job = CreateJob();
        job.ConfiguredSlowProcessWarningTime = null;

        job.Execute(new TestJobParam());

        job.ProcessAsyncCallCount.Should().Be(1);
        loggerFactory.Logger.Entries.Should().NotContain(entry => entry.Level == LogLevel.Warning);
        loggerFactory.Logger.Entries.Should().Contain(entry => entry.Level == LogLevel.Information && entry.Formatted.Contains("STARTED", StringComparison.Ordinal));
        loggerFactory.Logger.Entries.Should().Contain(entry => entry.Level == LogLevel.Information && entry.Formatted.Contains("FINISHED", StringComparison.Ordinal));
    }

    // TC-PLATJOB-004: crossing the slow-process threshold emits a Warning naming the threshold.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-004")]
    public void Execute_WhenProcessingExceedsSlowProcessWarningTime_LogsAWarningNamingTheThreshold()
    {
        var job = CreateJob();
        // 1ms threshold vs a ~50ms body: the comparison is elapsedMilliseconds >= threshold
        // (PlatformBackgroundJobExecutor.cs:94), so this side of the boundary is deterministic without asserting a
        // wall-clock value.
        // A recorded review finding suggested shrinking ProcessDelay to TimeSpan.FromTicks(1) to avoid the real sleep
        // (reasoning: async/await scheduling overhead alone would exceed 1ms). MEASURED, NOT IMPLEMENTED: on this
        // machine a 1-tick delay makes the run flake (elapsed < 1ms, the warning never fires) — scheduling overhead is
        // not a reliable >= 1ms floor. Kept at 50ms; determinism outranks shaving milliseconds off one test.
        job.ConfiguredSlowProcessWarningTime = TimeSpan.FromMilliseconds(1);
        job.ProcessDelay = TimeSpan.FromMilliseconds(50);

        job.Execute(new TestJobParam());

        job.ProcessAsyncCallCount.Should().Be(1, "the warning path must still RUN the job, not merely report on it");

        var warning = loggerFactory.Logger.Entries.Should().ContainSingle(entry => entry.Level == LogLevel.Warning).Subject;
        warning.Formatted.Should().Contain("FINISHED");
        warning.Formatted.Should().Contain(typeof(SlowAwareTestJob).FullName!, "the warning must identify WHICH job overran");
        warning.Formatted.Should().Contain("ElapsedMilliseconds");
    }

    // TC-PLATJOB-005: a job finishing well inside its threshold must NOT be reported as slow.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-005")]
    public void Execute_WhenProcessingStaysUnderSlowProcessWarningTime_LogsFinishedButNoWarning()
    {
        var job = CreateJob();
        // One hour vs an empty body — the far side of the boundary, equally deterministic.
        job.ConfiguredSlowProcessWarningTime = TimeSpan.FromHours(1);

        job.Execute(new TestJobParam());

        job.ProcessAsyncCallCount.Should().Be(1);
        loggerFactory.Logger.Entries.Should().NotContain(
            entry => entry.Level == LogLevel.Warning,
            "a job well inside its window must not raise the operational slow-job signal");
        loggerFactory.Logger.Entries.Should().Contain(entry => entry.Level == LogLevel.Information && entry.Formatted.Contains("FINISHED", StringComparison.Ordinal));
    }

    // TC-PLATJOB-006: a failing job logs at Error WITH the exception and RETHROWS so the scheduler can fail/retry it.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-006")]
    public void Execute_WhenProcessAsyncThrows_LogsErrorAndRethrowsInsteadOfSwallowing()
    {
        var job = CreateJob();
        var failure = new InvalidOperationException("TC-PLATJOB-006 deliberate job failure");
        job.ThrowOnProcess = failure;

        var act = () => job.Execute(new TestJobParam { Payload = "TC-PLATJOB-006-payload" });

        // Rethrow is what makes a failed job visible to the scheduler; swallowing it would record a false success
        // and permanently suppress the retry (PlatformBackgroundJobExecutor.cs:132).
        act.Should().Throw<InvalidOperationException>().Which.Should().BeSameAs(failure);

        var error = loggerFactory.Logger.Entries.Should().ContainSingle(entry => entry.Level == LogLevel.Error).Subject;
        error.Formatted.Should().Contain(nameof(SlowAwareTestJob), "the error must identify WHICH job failed");
        error.Formatted.Should().Contain(nameof(TestJobParam), "the error must record the param TYPE for diagnosis");
    }

    // TC-PLATJOB-006: the failure path also tolerates a null param (parameterless recurring jobs) without a second failure.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-006")]
    public void Execute_WhenProcessAsyncThrowsForNullParam_StillLogsErrorAndRethrows()
    {
        var job = CreateJob();
        job.ThrowOnProcess = new InvalidOperationException("TC-PLATJOB-006 null-param failure");

        var act = () => job.Execute();

        act.Should().Throw<InvalidOperationException>();
        loggerFactory.Logger.Entries.Should().ContainSingle(entry => entry.Level == LogLevel.Error)
            .Which.Formatted.Should().Contain(
                "ParamType:null",
                // Tightened from a bare Contain("null") — a broad substring match on the whole rendered message
                // could pass on an unrelated occurrence of the word. This pins the EXACT field
                // (`param?.GetType().Name ?? "null"` at PlatformBackgroundJobExecutor.cs:129) that must render "null".
                "a null param must be reported as ParamType:null, not crash the error logger");
    }

    // TC-PLATJOB-007: LogDebugInformation() defaults to TRUE; opting out silences the informational lifecycle logs.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-007")]
    public void LogDebugInformation_DefaultsToTrueAndWhenOptedOutSuppressesLifecycleInformationLogs()
    {
        // MUST read the base class's OWN default, not SlowAwareTestJob's override (`return !SuppressDebugInformation`,
        // itself defaulting to true only because SuppressDebugInformation defaults to false). PlainTestJob below
        // overrides nothing, so this reads PlatformBackgroundJobExecutor.cs:141-144 directly. Mutation proof: flipping
        // that production line to `return false;` left this assertion green before this fix, because the override
        // shadowed it entirely.
        var plainJob = new PlainTestJob(loggerFactory, serviceProvider, scheduler.Object);
        plainJob.LogDebugInformation().Should().BeTrue("the base class opts INTO lifecycle logging by default");

        var quietJob = CreateJob();
        quietJob.SuppressDebugInformation = true;
        quietJob.LogDebugInformation().Should().BeFalse();

        quietJob.Execute(new TestJobParam());

        quietJob.ProcessAsyncCallCount.Should().Be(1, "suppressing logs must not suppress the work");
        loggerFactory.Logger.Entries.Should().BeEmpty("with debug information off and no slow threshold, a successful run must be silent");
    }

    // TC-PLATJOB-008: the non-generic executor IS a PlatformBackgroundJobExecutor<object> and the object param flows through.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-008")]
    public void NonGenericExecutor_IsObjectParameterisedAndFlowsTheObjectParamThrough()
    {
        typeof(PlatformBackgroundJobExecutor).Should().BeDerivedFrom<PlatformBackgroundJobExecutor<object>>();

        var rootServiceProvider = serviceProvider.GetRequiredService<IPlatformRootServiceProvider>();
        var job = new NonGenericTestJob(loggerFactory, rootServiceProvider, scheduler.Object);
        var param = new object();

        job.Execute(param);
        job.Execute();

        job.ReceivedParams.Should().HaveCount(2);
        job.ReceivedParams[0].Should().BeSameAs(param);
        job.ReceivedParams[1].Should().BeNull("the parameterless overload delegates with null");
    }

    // TC-PLATJOB-009: the injected scheduler is exposed to derived jobs so a job can schedule follow-up work.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-009")]
    public void BackgroundJobScheduler_ExposesTheInjectedSchedulerInstance()
    {
        var job = CreateJob();

        job.BackgroundJobScheduler.Should().BeSameAs(scheduler.Object);
    }

    private SlowAwareTestJob CreateJob()
    {
        return new SlowAwareTestJob(loggerFactory, serviceProvider, scheduler.Object);
    }

    #region Test doubles

    internal sealed class TestJobParam
    {
        public string Payload { get; init; } = string.Empty;
    }

    /// <summary>Concrete job whose timing, failure and logging behavior each test configures.</summary>
    private sealed class SlowAwareTestJob : PlatformBackgroundJobExecutor<TestJobParam>
    {
        public SlowAwareTestJob(ILoggerFactory loggerFactory, IServiceProvider serviceProvider, IPlatformBackgroundJobScheduler backgroundJobScheduler)
            : base(loggerFactory, serviceProvider, backgroundJobScheduler)
        {
        }

        public TimeSpan? ConfiguredSlowProcessWarningTime { get; set; }

        public TimeSpan ProcessDelay { get; set; } = TimeSpan.Zero;

        public Exception? ThrowOnProcess { get; set; }

        public bool SuppressDebugInformation { get; set; }

        public List<TestJobParam?> ReceivedParams { get; } = [];

        public int ProcessAsyncCallCount => ReceivedParams.Count;

        public override TimeSpan? SlowProcessWarningTime()
        {
            return ConfiguredSlowProcessWarningTime;
        }

        public override bool LogDebugInformation()
        {
            return !SuppressDebugInformation;
        }

        public override async Task ProcessAsync(TestJobParam param)
        {
            ReceivedParams.Add(param);

            if (ProcessDelay > TimeSpan.Zero)
                await Task.Delay(ProcessDelay);

            if (ThrowOnProcess != null)
                throw ThrowOnProcess;
        }
    }

    /// <summary>
    /// Overrides NOTHING — used ONLY to read <see cref="PlatformBackgroundJobExecutor{TParam}.LogDebugInformation" />'s
    /// own default, unshadowed by <see cref="SlowAwareTestJob" />'s override.
    /// </summary>
    private sealed class PlainTestJob : PlatformBackgroundJobExecutor<TestJobParam>
    {
        public PlainTestJob(ILoggerFactory loggerFactory, IServiceProvider serviceProvider, IPlatformBackgroundJobScheduler backgroundJobScheduler)
            : base(loggerFactory, serviceProvider, backgroundJobScheduler)
        {
        }

        public override Task ProcessAsync(TestJobParam param)
        {
            return Task.CompletedTask;
        }
    }

    private sealed class NonGenericTestJob : PlatformBackgroundJobExecutor
    {
        public NonGenericTestJob(ILoggerFactory loggerFactory, IPlatformRootServiceProvider rootServiceProvider, IPlatformBackgroundJobScheduler backgroundJobScheduler)
            : base(loggerFactory, rootServiceProvider, backgroundJobScheduler)
        {
        }

        public List<object?> ReceivedParams { get; } = [];

        public override Task ProcessAsync(object param)
        {
            ReceivedParams.Add(param);
            return Task.CompletedTask;
        }
    }

    #endregion
}
