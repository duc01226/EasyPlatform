using Easy.Platform.HangfireBackgroundJob;
using Easy.Platform.Infrastructures.BackgroundJob;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Easy.Platform.Tests.Unit.HangfireBackgroundJob;

/// <summary>
/// Guards the pure, storage-free contracts of <see cref="PlatformHangfireBackgroundJobScheduler" /> — the identity and
/// schedule-resolution rules every recurring job registration goes through.
/// <para>
/// <b>Invariants guarded:</b>
/// (1) the recurring job id is derived DETERMINISTICALLY from the job type — Hangfire upserts by that id, so a change
/// in the derivation orphans every previously-registered recurring job and silently registers duplicates alongside;
/// (2) the id is capped at the storage's key length, and the cap must truncate rather than throw;
/// (3) schedule resolution prefers an explicitly supplied cron over the type's attribute, and refuses to register a
/// recurring job that has NEITHER — registering one with no schedule would create a job that never runs;
/// (4) a type that is not a job executor is rejected before it ever reaches storage.
/// </para>
/// </summary>
public class PlatformHangfireBackgroundJobSchedulerTests
{
    // TC-PLATJOB-040: the recurring job id is the fixed prefix plus the job type's simple name, capped at the key length.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-040")]
    public void BuildAutoRecurringJobIdByType_IsThePrefixedTypeName()
    {
        PlatformHangfireBackgroundJobScheduler.AutoRecurringJobIdByTypeSuffix.Should().Be("_Auto_");
        PlatformHangfireBackgroundJobScheduler.DefaultMaxLengthJobId.Should().Be(200);

        var scheduler = CreateScheduler();

        scheduler.BuildAutoRecurringJobIdByType(typeof(HangfireSchedulerTestJob))
            .Should().Be(
                $"_Auto_.{nameof(HangfireSchedulerTestJob)}",
                "Hangfire upserts recurring jobs BY this id — changing the derivation orphans every already-registered job");
    }

    // TC-PLATJOB-041: the generic and Type-based overloads derive the identical id.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-041")]
    public void BuildAutoRecurringJobIdByType_GenericAndTypeOverloadsAgree()
    {
        var scheduler = CreateScheduler();

        scheduler.BuildAutoRecurringJobIdByType<HangfireSchedulerTestJob>()
            .Should().Be(scheduler.BuildAutoRecurringJobIdByType(typeof(HangfireSchedulerTestJob)));
    }

    // TC-PLATJOB-042: an over-long id is TRUNCATED to the storage key limit, not rejected.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-042")]
    public void BuildAutoRecurringJobIdByType_ForAVeryLongTypeName_TruncatesToTheStorageKeyLimit()
    {
        var scheduler = CreateScheduler();

        var jobId = scheduler.BuildAutoRecurringJobIdByType(typeof(AVeryDeliberatelyLongNamedBackgroundJobExecutorTypeUsedOnlyToProveTheRecurringJobIdIsTruncatedRatherThanRejectedWhenItExceedsTheConfiguredMaximumStorageKeyLengthOfTwoHundredCharactersAndSoForcesTheTruncationBranchToActuallyRunInsteadOfBeingSilentlySkipped));

        jobId.Length.Should().BeLessThanOrEqualTo(
            PlatformHangfireBackgroundJobScheduler.DefaultMaxLengthJobId,
            "an id longer than the storage key limit would be rejected by the storage at registration time");
        jobId.Should().StartWith("_Auto_.", "truncation must keep the prefix — it is how auto-registered jobs are recognised");
    }

    // TC-PLATJOB-043: a non-executor type is rejected before it can reach storage.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-043")]
    public void EnsureJobExecutorTypeValid_ForANonExecutorType_Throws()
    {
        var act = () => PlatformHangfireBackgroundJobScheduler.EnsureJobExecutorTypeValid(typeof(NotAJobExecutor));

        act.Should().Throw<Exception>().WithMessage("*must be assignable to IPlatformBackgroundJobExecutor*");
    }

    // TC-PLATJOB-043: a genuine executor type is accepted.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-043")]
    public void EnsureJobExecutorTypeValid_ForAJobExecutorType_DoesNotThrow()
    {
        var act = () => PlatformHangfireBackgroundJobScheduler.EnsureJobExecutorTypeValid(typeof(HangfireSchedulerTestJob));

        act.Should().NotThrow();
    }

    // TC-PLATJOB-044: id derivation itself rejects a non-executor type — the guard is not bypassable via the id path.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-044")]
    public void BuildAutoRecurringJobIdByType_ForANonExecutorType_Throws()
    {
        var scheduler = CreateScheduler();

        var act = () => scheduler.BuildAutoRecurringJobIdByType(typeof(NotAJobExecutor));

        act.Should().Throw<Exception>().WithMessage("*must be assignable to IPlatformBackgroundJobExecutor*");
    }

    // TC-PLATJOB-045: schedule resolution falls back to the type's PlatformRecurringJobAttribute cron.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-045")]
    public void EnsureValidToUpsertRecurringJob_WithNoExplicitCron_UsesTheTypeAttributeCron()
    {
        PlatformHangfireBackgroundJobScheduler.EnsureValidToUpsertRecurringJob(typeof(HangfireSchedulerTestJob), null)
            .Should().Be("0 4 * * *", "a job that declares its own schedule must be registered on exactly that schedule");
    }

    // TC-PLATJOB-046: an explicitly supplied cron WINS over the type's attribute.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-046")]
    public void EnsureValidToUpsertRecurringJob_WithAnExplicitCron_OverridesTheTypeAttribute()
    {
        PlatformHangfireBackgroundJobScheduler.EnsureValidToUpsertRecurringJob(typeof(HangfireSchedulerTestJob), () => "*/5 * * * *")
            .Should().Be(
                "*/5 * * * *",
                "the explicit cron is how a deployment overrides a job's compiled-in schedule — the attribute must not win");
    }

    // TC-PLATJOB-047: a job with NEITHER an attribute nor an explicit cron is refused rather than silently registered.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-047")]
    public void EnsureValidToUpsertRecurringJob_WithNeitherAttributeNorExplicitCron_Throws()
    {
        var act = () => PlatformHangfireBackgroundJobScheduler.EnsureValidToUpsertRecurringJob(typeof(UnscheduledHangfireTestJob), null);

        act.Should().Throw<Exception>().WithMessage(
            "*cron expression*",
            "registering a recurring job with no schedule would create an entry that never fires — a silent no-op is worse than a startup failure");
    }

    // TC-PLATJOB-047: a cron factory returning null falls back to the attribute rather than tripping the guard.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-047")]
    public void EnsureValidToUpsertRecurringJob_WhenTheCronFactoryReturnsNull_FallsBackToTheTypeAttribute()
    {
        PlatformHangfireBackgroundJobScheduler.EnsureValidToUpsertRecurringJob(typeof(HangfireSchedulerTestJob), () => null!)
            .Should().Be("0 4 * * *", "a config-driven cron factory that yields nothing must degrade to the compiled-in schedule");
    }

    // TC-PLATJOB-048: the type-validity guard runs BEFORE schedule resolution, so a bad type fails on the type, not the cron.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-048")]
    public void EnsureValidToUpsertRecurringJob_ForANonExecutorType_FailsOnTheTypeGuardNotTheCronGuard()
    {
        var act = () => PlatformHangfireBackgroundJobScheduler.EnsureValidToUpsertRecurringJob(typeof(NotAJobExecutor), () => "0 4 * * *");

        act.Should().Throw<Exception>().WithMessage(
            "*must be assignable to IPlatformBackgroundJobExecutor*",
            "supplying a valid cron must not let an invalid type through");
    }

    // TC-PLATJOB-049: the Hangfire scheduler implements the platform scheduler contract.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-049")]
    public void PlatformHangfireBackgroundJobScheduler_ImplementsThePlatformSchedulerContract()
    {
        typeof(PlatformHangfireBackgroundJobScheduler).Should().BeAssignableTo<IPlatformBackgroundJobScheduler>();
    }

    /// <summary>
    /// Builds the scheduler through its real constructor over a stub Hangfire context. The members these tests exercise
    /// never touch storage, but going through the real constructor keeps the resolution path honest.
    /// </summary>
    private static PlatformHangfireBackgroundJobScheduler CreateScheduler()
    {
        var services = new ServiceCollection();
        services.AddSingleton(new Mock<IPlatformHangfireBackgroundJobContext>().Object);

        return new PlatformHangfireBackgroundJobScheduler(services.BuildServiceProvider());
    }

    #region Test doubles

    [PlatformRecurringJob("0 4 * * *")]
    private sealed class HangfireSchedulerTestJob : IPlatformBackgroundJobExecutor
    {
        public void Execute() { }

        public TimeSpan? SlowProcessWarningTime() { return null; }
    }

    private sealed class UnscheduledHangfireTestJob : IPlatformBackgroundJobExecutor
    {
        public void Execute() { }

        public TimeSpan? SlowProcessWarningTime() { return null; }
    }

    private sealed class NotAJobExecutor;

    private sealed class AVeryDeliberatelyLongNamedBackgroundJobExecutorTypeUsedOnlyToProveTheRecurringJobIdIsTruncatedRatherThanRejectedWhenItExceedsTheConfiguredMaximumStorageKeyLengthOfTwoHundredCharactersAndSoForcesTheTruncationBranchToActuallyRunInsteadOfBeingSilentlySkipped : IPlatformBackgroundJobExecutor
    {
        public void Execute() { }

        public TimeSpan? SlowProcessWarningTime() { return null; }
    }

    #endregion
}
