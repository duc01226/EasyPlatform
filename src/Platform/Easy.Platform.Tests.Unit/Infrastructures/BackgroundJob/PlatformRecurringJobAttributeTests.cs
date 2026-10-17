using Easy.Platform.Common.Utils;
using Easy.Platform.Infrastructures.BackgroundJob;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Infrastructures.BackgroundJob;

/// <summary>
/// Guards <see cref="PlatformRecurringJobAttribute" /> — the declarative contract that decides WHEN every recurring
/// platform background job runs, and in WHICH timezone.
/// <para>
/// <b>Invariants guarded:</b>
/// (1) an unparseable timezone id silently NULLs <see cref="PlatformRecurringJobAttribute.TimeZoneOffset" />, wiping the
/// machine-local default — a typo in a job's timezone id therefore changes the schedule's timezone resolution
/// (<c>PlatformHangfireBackgroundJobScheduler.cs:280-287</c> falls back to <see cref="TimeZoneInfo.Local" /> — the
/// HOST MACHINE's local zone, not UTC — when the offset is null), which is a silent, business-visible drift of every
/// run time;
/// (2) attribute lookup is <c>inherit: true</c> + <c>LastOrDefault()</c>, so a derived job's own attribute must WIN over
/// the one it inherits — reversing that ordering would silently re-schedule every overriding job onto its base's cron.
/// </para>
/// </summary>
public class PlatformRecurringJobAttributeTests
{
    private const string EveryMinuteCron = "* * * * *";
    private const string DailyMidnightCron = "0 0 * * *";
    private const string BaseCron = "0 1 * * *";
    private const string DerivedCron = "0 2 * * *";
    private const string InterfaceCron = "0 3 * * *";

    // TC-PLATJOB-010: cron-only ctor keeps the cron verbatim, defaults ExecuteOnStartUp false and TimeZoneOffset to the machine-local offset.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-010")]
    public void Ctor_WithCronOnly_KeepsCronAndDefaultsStartUpFalseAndLocalTimeZoneOffset()
    {
        var attribute = new PlatformRecurringJobAttribute(EveryMinuteCron);

        attribute.CronExpression.Should().Be(EveryMinuteCron);
        attribute.ExecuteOnStartUp.Should().BeFalse("ExecuteOnStartUp is opt-in — a job must never run on every app boot unless it asks to");

        // Machine-independent: compare against the same source the property initializer reads.
        attribute.TimeZoneOffset.Should().Be(
            TimeZoneInfo.Local.BaseUtcOffset.TotalHours,
            "with no timezone specified the attribute must fall back to the host's local offset");
    }

    // TC-PLATJOB-011: executeOnStartUp is opt-in and is carried through by every ctor overload.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATJOB-011")]
    [InlineData(true)]
    [InlineData(false)]
    public void Ctor_ExecuteOnStartUpFlag_IsCarriedThroughEveryOverload(bool executeOnStartUp)
    {
        new PlatformRecurringJobAttribute(EveryMinuteCron, executeOnStartUp).ExecuteOnStartUp.Should().Be(executeOnStartUp);
        new PlatformRecurringJobAttribute(EveryMinuteCron, 7d, executeOnStartUp).ExecuteOnStartUp.Should().Be(executeOnStartUp);
        new PlatformRecurringJobAttribute(EveryMinuteCron, "UTC", executeOnStartUp).ExecuteOnStartUp.Should().Be(executeOnStartUp);
    }

    // TC-PLATJOB-012: the explicit numeric-offset ctor overwrites the local default with exactly the supplied offset.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATJOB-012")]
    [InlineData(7d)]
    [InlineData(0d)]
    [InlineData(-5.5d)]
    public void Ctor_WithExplicitTimeZoneOffset_OverwritesTheLocalDefault(double timeZoneOffset)
    {
        var attribute = new PlatformRecurringJobAttribute(DailyMidnightCron, timeZoneOffset);

        attribute.TimeZoneOffset.Should().Be(timeZoneOffset);
        attribute.CronExpression.Should().Be(DailyMidnightCron);
    }

    // TC-PLATJOB-013: a RESOLVABLE timezone id sets the offset from that zone's BaseUtcOffset, not from the local default.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-013")]
    public void Ctor_WithResolvableTimeZoneId_SetsOffsetFromThatZoneBaseUtcOffset()
    {
        // "UTC" resolves on every platform (Windows id and IANA id alike), so the expectation stays machine-independent.
        var resolvedUtc = Util.TimeZoneParser.TryGetTimeZoneById("UTC");
        resolvedUtc.Should().NotBeNull("the test's premise is that this id resolves on the running host");

        var attribute = new PlatformRecurringJobAttribute(DailyMidnightCron, "UTC");

        attribute.TimeZoneOffset.Should().Be(resolvedUtc!.BaseUtcOffset.TotalHours);
        attribute.TimeZoneOffset.Should().Be(0d, "UTC's base offset is zero by definition");
    }

    // TC-PLATJOB-014: an UNRESOLVABLE timezone id silently NULLs the offset, overwriting the machine-local default. Regression pin.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATJOB-014")]
    [InlineData("Not/A_Real_TimeZone_Id_PlatJob014")]
    [InlineData("")]
    [InlineData(null)]
    public void Ctor_WithUnresolvableTimeZoneId_SilentlyNullsTheOffsetInsteadOfKeepingTheLocalDefault(string? unresolvableTimeZoneId)
    {
        // Util.TimeZoneParser.TryGetTimeZoneById returns null for null/unknown ids
        // (Easy.Platform/Common/Utils/Util.TimeZoneParser.cs:30, :38-41), and the ctor assigns that null-propagated
        // result UNCONDITIONALLY (PlatformRecurringJobAttribute.cs:61) — so the property initializer's local-offset
        // default is destroyed rather than preserved.
        Util.TimeZoneParser.TryGetTimeZoneById(unresolvableTimeZoneId!).Should().BeNull("premise: this id cannot be resolved");

        var attribute = new PlatformRecurringJobAttribute(DailyMidnightCron, unresolvableTimeZoneId!);

        attribute.TimeZoneOffset.Should().BeNull(
            // Corrected root cause: a null offset does NOT resolve against UTC downstream — every UpsertRecurringJob
            // overload applies `timeZone ?? TimeZoneInfo.Local` (PlatformHangfireBackgroundJobScheduler.cs:111-203),
            // so it resolves against the HOST MACHINE's local timezone instead. The assertion below (offset is null)
            // is unaffected either way; only the rationale's root cause was wrong.
            "an unresolvable timezone id does NOT fall back to the local default — it nulls the offset, which downstream "
            + "(PlatformHangfireBackgroundJobScheduler.cs:280-287) resolves the schedule against the HOST MACHINE's "
            + "local timezone instead, not UTC");
        attribute.CronExpression.Should().Be(DailyMidnightCron, "a bad timezone id must not corrupt the cron expression");
    }

    // TC-PLATJOB-015: TimeZoneOffset stays settable after construction (used by config-driven overrides).
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-015")]
    public void TimeZoneOffset_IsMutableAfterConstruction()
    {
        var attribute = new PlatformRecurringJobAttribute(EveryMinuteCron) { TimeZoneOffset = 9.5d };

        attribute.TimeZoneOffset.Should().Be(9.5d);

        attribute.TimeZoneOffset = null;
        attribute.TimeZoneOffset.Should().BeNull();
    }

    // TC-PLATJOB-016: a type carrying no attribute yields null rather than throwing.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-016")]
    public void GetRecurringJobAttributeInfo_ForTypeWithoutAttribute_ReturnsNullInsteadOfThrowing()
    {
        PlatformRecurringJobAttribute.GetRecurringJobAttributeInfo(typeof(NoAttributeJob)).Should().BeNull();
        PlatformRecurringJobAttribute.GetRecurringJobAttributeInfo<NoAttributeJob>().Should().BeNull();
    }

    // TC-PLATJOB-017: a type carrying exactly one attribute yields that attribute's cron.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-017")]
    public void GetRecurringJobAttributeInfo_ForTypeWithOwnAttribute_ReturnsThatAttribute()
    {
        var found = PlatformRecurringJobAttribute.GetRecurringJobAttributeInfo(typeof(BaseAttributedJob));

        found.Should().NotBeNull();
        found!.CronExpression.Should().Be(BaseCron);
    }

    // TC-PLATJOB-018: a derived type with NO attribute of its own inherits the base's attribute (inherit: true).
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-018")]
    public void GetRecurringJobAttributeInfo_ForDerivedTypeWithoutOwnAttribute_InheritsTheBaseAttribute()
    {
        var found = PlatformRecurringJobAttribute.GetRecurringJobAttributeInfo(typeof(InheritsBaseAttributeJob));

        found.Should().NotBeNull("lookup passes inherit: true, so a derived job without its own schedule keeps the base's");
        found!.CronExpression.Should().Be(BaseCron);
    }

    // TC-PLATJOB-019: when BOTH an inherited and an own attribute exist, LastOrDefault picks the DERIVED type's own one.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-019")]
    public void GetRecurringJobAttributeInfo_WhenDerivedTypeOverridesInheritedAttribute_TheDerivedOneWins()
    {
        // WHY this stays safe today: PlatformRecurringJobAttribute declares AttributeUsage WITHOUT AllowMultiple
        // (PlatformRecurringJobAttribute.cs:21), so GetCustomAttributes(inherit: true) COLLAPSES the inherited
        // declaration and yields only the most-derived one — which is why LastOrDefault()
        // (PlatformRecurringJobAttribute.cs:96-102) resolves to the derived job's own cron.
        //
        // The pin below is deliberate: if AllowMultiple were ever turned on, the runtime would start returning BOTH
        // attributes and the LastOrDefault() ordering would suddenly become load-bearing for WHICH schedule every
        // overriding job runs on. This test must break loudly at that moment rather than silently re-schedule jobs.
        var attributeUsage = typeof(PlatformRecurringJobAttribute)
            .GetCustomAttributes(typeof(AttributeUsageAttribute), true)
            .Cast<AttributeUsageAttribute>()
            .Single();

        attributeUsage.AllowMultiple.Should().BeFalse(
            "the single-attribute collapse is what makes the derived declaration win; enabling AllowMultiple would make "
            + "the LastOrDefault() selection decide the schedule and this expectation must be re-derived");

        var allAttributes = typeof(OverridesBaseAttributeJob)
            .GetCustomAttributes(typeof(PlatformRecurringJobAttribute), true)
            .Cast<PlatformRecurringJobAttribute>()
            .ToList();

        allAttributes.Should().ContainSingle("with AllowMultiple off the runtime returns only the most-derived declaration");

        var found = PlatformRecurringJobAttribute.GetRecurringJobAttributeInfo(typeof(OverridesBaseAttributeJob));

        found.Should().NotBeNull();
        found!.CronExpression.Should().Be(
            DerivedCron,
            "a job that declares its own schedule must run on THAT schedule, never on the one it inherits");
        found.CronExpression.Should().NotBe(BaseCron);
    }

    // TC-PLATJOB-019: the attribute is declarable on an interface too, and is discovered through it.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-019")]
    public void GetRecurringJobAttributeInfo_ForInterfaceDeclaredAttribute_IsDiscoverableOnTheInterfaceType()
    {
        // AttributeUsage allows Class | Interface (PlatformRecurringJobAttribute.cs:21).
        var found = PlatformRecurringJobAttribute.GetRecurringJobAttributeInfo(typeof(IAttributedJobContract));

        found.Should().NotBeNull();
        found!.CronExpression.Should().Be(InterfaceCron);
    }

    #region Test job types — schedule declarations only; never executed by these tests.

    private sealed class NoAttributeJob : IPlatformBackgroundJobExecutor
    {
        public void Execute() { }

        public TimeSpan? SlowProcessWarningTime() { return null; }
    }

    [PlatformRecurringJob(BaseCron)]
    private class BaseAttributedJob : IPlatformBackgroundJobExecutor
    {
        public void Execute() { }

        public TimeSpan? SlowProcessWarningTime() { return null; }
    }

    private sealed class InheritsBaseAttributeJob : BaseAttributedJob;

    [PlatformRecurringJob(DerivedCron)]
    private sealed class OverridesBaseAttributeJob : BaseAttributedJob;

    [PlatformRecurringJob(InterfaceCron)]
    private interface IAttributedJobContract : IPlatformBackgroundJobExecutor;

    #endregion
}
