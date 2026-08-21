using System.Reflection;
using Easy.Platform.HangfireBackgroundJob;
using Easy.Platform.HangfireBackgroundJob.BackgroundJobs;
using Easy.Platform.Infrastructures.BackgroundJob;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Easy.Platform.Tests.Unit.Infrastructures.BackgroundJob;

/// <summary>
/// Type-level contract tests: they DISCOVER every background-job executor shipped by the platform assemblies and assert
/// the invariants that hold for all of them, so a job added later is covered automatically instead of shipping unguarded.
/// <para>
/// <b>Invariants guarded:</b>
/// (1) every executor is constructible the way the job activator constructs it — a job with no usable constructor fails
/// only at execution time, inside Hangfire, as an opaque activation error;
/// (2) each executor's derived recurring-job id fits the storage key limit and stays unique — Hangfire upserts BY that
/// id, so two jobs deriving the same id means one silently overwrites the other's schedule and never runs again;
/// (3) every declared recurring schedule is a structurally valid cron with a sane timezone offset — an invalid one
/// throws during module startup, taking the whole service down.
/// </para>
/// </summary>
public class PlatformBackgroundJobExecutorTypeContractTests
{
    /// <summary>
    /// Each assembly is anchored by a type it owns, so renaming or moving that type breaks the BUILD rather than
    /// silently reducing this discovery to zero types and turning every theory below into a vacuous pass.
    /// </summary>
    private static readonly Assembly[] PlatformAssembliesUnderContract =
    [
        typeof(IPlatformBackgroundJobExecutor).Assembly,
        typeof(PlatformHangfireBackgroundJobScheduler).Assembly
    ];

    public static TheoryData<Type> ConcreteExecutorTypes()
    {
        var data = new TheoryData<Type>();

        foreach (var executorType in DiscoverConcreteExecutorTypes()) data.Add(executorType);

        return data;
    }

    public static TheoryData<Type> RecurringExecutorTypes()
    {
        var data = new TheoryData<Type>();

        foreach (var executorType in DiscoverConcreteExecutorTypes()
            .Where(type => PlatformRecurringJobAttribute.GetRecurringJobAttributeInfo(type) != null))
            data.Add(executorType);

        return data;
    }

    // TC-PLATJOB-075: the discovery itself is sound — the anchored assemblies are the real ones and the scan is not empty.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-075")]
    public void Discovery_ScansTheRealPlatformAssembliesAndFindsTheShippedJobs()
    {
        PlatformAssembliesUnderContract.Select(assembly => assembly.GetName().Name)
            .Should().BeEquivalentTo(["Easy.Platform", "Easy.Platform.HangfireBackgroundJob"]);

        var discovered = DiscoverConcreteExecutorTypes();

        discovered.Should().NotBeEmpty("an empty scan would make every theory below pass without testing anything");
        discovered.Should().Contain(
            typeof(PlatformTrimHangfireStateHistoryBackgroundJob),
            "this is the one concrete job the platform itself ships — if the scan stops finding it, the scan is broken, not the platform");
    }

    // TC-PLATJOB-076: every shipped executor exposes a public constructor DI can resolve.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATJOB-076")]
    [MemberData(nameof(ConcreteExecutorTypes))]
    public void EveryConcreteExecutor_ExposesAConstructorTheJobActivatorCanUse(Type executorType)
    {
        // Scope note, corrected: this pins ONLY the PRIMARY activation path — PlatformHangfireActivator.cs:25
        // (`serviceProvider.GetService(jobType) ?? Activator.CreateInstance(jobType)`) resolves via DI FIRST, and DI
        // can satisfy any public constructor shape, not just a parameterless one. It does NOT pin the FALLBACK half:
        // `Activator.CreateInstance(Type)` (the single-Type overload) specifically requires a public PARAMETERLESS
        // constructor. That fallback is unverified here — PlatformTrimHangfireStateHistoryBackgroundJob
        // (Easy.Platform.HangfireBackgroundJob/BackgroundJobs/PlatformTrimHangfireStateHistoryBackgroundJob.cs:39-45)
        // has ONLY a 4-parameter DI constructor, so if its DI registration (PlatformBackgroundJobModule.cs:65,
        // RegisterAllFromType<IPlatformBackgroundJobExecutor>) were ever dropped for a consuming service, the
        // fallback would throw an opaque Hangfire activation error instead of this theory catching it beforehand.
        // Tightening this assertion to require a parameterless constructor would fail against that real shipped job
        // today — asserting the fallback path is safe is a genuinely separate, currently-unguarded invariant, not a
        // one-line strengthening of this one.
        var publicConstructors = executorType.GetConstructors(BindingFlags.Instance | BindingFlags.Public);

        publicConstructors.Should().NotBeEmpty(
            "DI resolves the job first and needs at least one public constructor to satisfy — a job without one is unconstructible "
            + "by any path and fails only at execution time as an opaque Hangfire activation error");
    }

    // TC-PLATJOB-077: every shipped executor's recurring-job id fits the storage key limit and keeps the auto prefix.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATJOB-077")]
    [MemberData(nameof(ConcreteExecutorTypes))]
    public void EveryConcreteExecutor_DerivesAStorableRecurringJobId(Type executorType)
    {
        var jobId = CreateScheduler().BuildAutoRecurringJobIdByType(executorType);

        jobId.Should().StartWith(
            PlatformHangfireBackgroundJobScheduler.AutoRecurringJobIdByTypeSuffix,
            "the prefix is how the module recognises which recurring jobs it owns and may clean up");
        jobId.Length.Should().BeLessThanOrEqualTo(PlatformHangfireBackgroundJobScheduler.DefaultMaxLengthJobId);
    }

    // TC-PLATJOB-078: no two shipped executors derive the same recurring-job id.
    //
    // Honesty note (was previously overclaimed): DiscoverConcreteExecutorTypes() currently finds exactly ONE
    // concrete, non-generic IPlatformBackgroundJobExecutor across both anchored assemblies
    // (PlatformTrimHangfireStateHistoryBackgroundJob). GroupBy(...).Where(group => group.Count() > 1) over a
    // single-element sequence can never produce a group, so this assertion is UNFALSIFIABLE today — it will pass
    // regardless of whether the id-collision logic it documents is correct. It is kept because it is the only place
    // that invariant is stated at all, and it becomes a genuine, discriminating regression guard automatically the
    // moment a second concrete executor ships in either assembly — no edit to this test is needed for that to happen.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-078")]
    public void ConcreteExecutors_DeriveUniqueRecurringJobIds()
    {
        var scheduler = CreateScheduler();

        var idsByJobId = DiscoverConcreteExecutorTypes()
            .GroupBy(executorType => scheduler.BuildAutoRecurringJobIdByType(executorType), StringComparer.Ordinal)
            .Where(group => group.Count() > 1)
            .ToDictionary(group => group.Key, group => group.Select(type => type.FullName).ToList(), StringComparer.Ordinal);

        idsByJobId.Should().BeEmpty(
            "the id is derived from the SIMPLE type name and then truncated, so two jobs with the same class name in different "
            + "namespaces collide — Hangfire upserts by id, so one silently overwrites the other's schedule and never runs again");
    }

    // TC-PLATJOB-079: every declared recurring schedule is a structurally valid cron with a sane timezone offset.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATJOB-079")]
    [MemberData(nameof(RecurringExecutorTypes))]
    public void EveryRecurringExecutor_DeclaresAStructurallyValidScheduleAndTimeZone(Type executorType)
    {
        var recurringJob = PlatformRecurringJobAttribute.GetRecurringJobAttributeInfo(executorType)!;

        recurringJob.CronExpression.Should().NotBeNullOrWhiteSpace(
            "a blank cron is rejected when the recurring job is registered, which fails module startup for the whole service");

        var cronFields = recurringJob.CronExpression.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        cronFields.Length.Should().BeOneOf(
            [5, 6],
            "Hangfire accepts only 5-field (minute precision) or 6-field (second precision) cron expressions; anything else "
            + "throws at registration time rather than being ignored");

        // A null offset is legitimate — it means the job did not pin a timezone. Only a DECLARED offset is constrained.
        recurringJob.TimeZoneOffset?.Should().BeInRange(
            -14,
            14,
            "no real UTC offset falls outside this range, and an offset that cannot be turned into a TimeZoneInfo fails registration");
    }

    private static List<Type> DiscoverConcreteExecutorTypes()
    {
        return PlatformAssembliesUnderContract
            .SelectMany(assembly => assembly.GetTypes())
            .Where(type => type.IsClass
                && !type.IsAbstract
                && !type.ContainsGenericParameters
                && typeof(IPlatformBackgroundJobExecutor).IsAssignableFrom(type))
            .OrderBy(type => type.FullName, StringComparer.Ordinal)
            .ToList();
    }

    private static PlatformHangfireBackgroundJobScheduler CreateScheduler()
    {
        var services = new ServiceCollection();
        services.AddSingleton(new Mock<IPlatformHangfireBackgroundJobContext>().Object);

        return new PlatformHangfireBackgroundJobScheduler(services.BuildServiceProvider());
    }
}
