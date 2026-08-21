using System.Globalization;
using Easy.Platform.Common.JsonSerialization.Converters.Helpers;
using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.JsonSerialization;

/// <summary>
/// Guards the day-first read contract on the THIRD consumer of
/// <see cref="Util.DateTimeParser.DefaultSupportDateOnlyFormats" /> — the one no other test covered.
/// </summary>
/// <remarks>
/// <para>Business intent guarded: a date-only string means the SAME calendar day no matter which reader resolves it.
/// The system has three readers of that format array — <c>Util.DateTimeParser</c>, <c>PlatformObjectJsonConverter</c>,
/// and <see cref="PlatformStringToDateTimeConverterHelper" /> — and a disagreement between any two silently stores a
/// transposed date.</para>
/// <para>This third reader is reached from a much wider surface than the other two:
/// <c>PlatformStringToDateTimeConverterHelper</c> backs <c>PlatformDateTimeJsonConverter</c> /
/// <c>PlatformDateOnlyJsonConverter</c> (registered by default in <c>PlatformJsonSerializer</c>) AND
/// <c>PlatformDateTimeModelBinderProvider</c> / <c>PlatformDateOnlyModelBinderProvider</c> (inserted at index 0 —
/// highest precedence — by <c>MvcBuilderExtensions</c>). So it resolves EVERY HTTP query-string date and every JSON
/// date field in every service.</para>
/// <para>It inherits the format list through a <c>static readonly</c> ALIAS
/// (<c>SupportDateOnlyFormats = Util.DateTimeParser.DefaultSupportDateOnlyFormats</c>), which is exactly why a review
/// of the changed files alone could not see that widening the array changes API date semantics platform-wide. These
/// tests make that coupling visible and enforced: break the day-first contract on any reader and one of them fails.</para>
/// </remarks>
public sealed class PlatformStringToDateTimeConverterHelperCultureTests : PlatformUnitTestBase
{
    /// <summary>
    /// The ambiguous shapes — both components are 12 or lower, so day-first and month-first BOTH parse and produce
    /// different days. These are the only inputs where a wrong contract is silent rather than a parse failure.
    /// </summary>
    /// <remarks>
    /// Expected values are stated as literal calendar days, NOT computed from the production format array — a test
    /// that derives its expectation from the code under test cannot detect that code being wrong.
    /// </remarks>
    [Theory]
    [InlineData("01/06/2026", 2026, 6, 1)]
    [InlineData("1/6/2026", 2026, 6, 1)]
    [InlineData("12/5/2026", 2026, 5, 12)]
    [InlineData("3/12/2026", 2026, 12, 3)]
    [InlineData("25/06/2026", 2026, 6, 25)]
    [InlineData("01-06-2026", 2026, 6, 1)]
    [InlineData("1-6-2026", 2026, 6, 1)]
    public void TryReadDateOnly_AmbiguousDate_ResolvesDayFirst(string dateText, int year, int month, int day)
    {
        PlatformStringToDateTimeConverterHelper.TryReadDateOnly(dateText)
            .Should()
            .Be(
                new DateOnly(year, month, day),
                "date-only strings are read DAY-first platform-wide — this helper resolves every HTTP query-string " +
                "and JSON date, so a month-first reading here silently transposes dates across every service");
    }

    /// <summary>
    /// The whole point of the day-first contract: the SAME text must mean the SAME day on every host. A container's
    /// locale is deployment configuration, never a business input.
    /// </summary>
    /// <remarks>
    /// Cultures span month-first (en-US, ja-JP), day-first (en-GB, vi-VN, de-DE), and — deliberately —
    /// non-Gregorian calendars (fa-IR Persian, th-TH Buddhist, ar-SA Umm al-Qura), where an unpinned provider
    /// resolves against the ambient CALENDAR and yields an instant centuries away rather than merely a transposed one.
    /// </remarks>
    [Theory]
    [InlineData("en-US")]
    [InlineData("en-GB")]
    [InlineData("vi-VN")]
    [InlineData("de-DE")]
    [InlineData("ja-JP")]
    [InlineData("fa-IR")]
    [InlineData("th-TH")]
    [InlineData("ar-SA")]
    public void TryReadDateOnly_ResolvesSameDay_OnEveryHostCulture(string cultureName)
    {
        RunWithCulture(
            cultureName,
            () => PlatformStringToDateTimeConverterHelper.TryReadDateOnly("01/06/2026")
                .Should()
                .Be(
                    new DateOnly(2026, 6, 1),
                    $"the deserialized day must come from the payload, not from the host locale (culture: {cultureName})"));
    }

    /// <summary>
    /// Cross-reader agreement — the invariant the original defect broke.
    /// </summary>
    /// <remarks>
    /// <c>Util.DateTimeParser.Parse</c> and this helper read the SAME persisted field through different transports
    /// (direct parse vs deserialization / model binding). When they disagree, the stored value depends on which
    /// shape the data happened to arrive in. Asserting them against each other — rather than each against a literal —
    /// is what makes a future divergence fail, whichever side drifts.
    /// </remarks>
    [Theory]
    [InlineData("01/06/2026")]
    [InlineData("1/6/2026")]
    [InlineData("12/5/2026")]
    [InlineData("25/06/2026")]
    [InlineData("2026-06-01")]
    public void TryReadDateOnly_AgreesWith_DateTimeParser_OnTheSameText(string dateText)
    {
        var viaHelper = PlatformStringToDateTimeConverterHelper.TryReadDateOnly(dateText);
        var viaParser = Util.DateTimeParser.Parse(dateText);

        viaParser.Should().NotBeNull("the parser must resolve a text the helper also accepts");
        viaHelper.Should()
            .Be(
                DateOnly.FromDateTime(viaParser!.Value),
                "the two readers of the same stored date field must never disagree — a divergence means the value " +
                "depends on whether it arrived as a parsed string or as a deserialized payload");
    }

    /// <summary>
    /// ISO-8601 is unambiguous and must stay untouched by the day-first contract.
    /// </summary>
    /// <remarks>
    /// ISO forms are matched FIRST in the format array precisely so a full timestamp can never be reinterpreted.
    /// Without this test, reordering the array to fix a day-first case could silently break ISO reading.
    /// </remarks>
    [Theory]
    [InlineData("2026-06-01", 2026, 6, 1)]
    [InlineData("2026/06/01", 2026, 6, 1)]
    [InlineData("2026-12-25", 2026, 12, 25)]
    public void TryReadDateOnly_IsoDate_IsNeverReinterpreted(string isoText, int year, int month, int day)
    {
        PlatformStringToDateTimeConverterHelper.TryReadDateOnly(isoText)
            .Should()
            .Be(new DateOnly(year, month, day), "ISO-8601 is unambiguous and must be immune to the day-first pass");
    }

    /// <summary>
    /// <c>TryRead</c> (the DateTime sibling backing the DateTime binder/converter) must honor the same contract —
    /// the two entry points share <c>SupportDateOnlyFormats</c>, so a divergence between them is the same class of bug.
    /// </summary>
    [Theory]
    [InlineData("01/06/2026", 2026, 6, 1)]
    [InlineData("12/5/2026", 2026, 5, 12)]
    public void TryRead_AmbiguousDate_ResolvesDayFirst(string dateText, int year, int month, int day)
    {
        var result = PlatformStringToDateTimeConverterHelper.TryRead(dateText);

        result.Should().NotBeNull();
        result!.Value.Date.Should()
            .Be(
                new DateTime(year, month, day, 0, 0, 0, DateTimeKind.Utc).Date,
                "TryRead and TryReadDateOnly share the same format array and must agree on the calendar day");
    }

    /// <summary>
    /// Runs <paramref name="assertion" /> under <paramref name="cultureName" />, restoring the ambient culture even
    /// when the assertion fails.
    /// </summary>
    /// <remarks>
    /// xUnit runs collections in parallel and <see cref="CultureInfo.CurrentCulture" /> is per-thread, so the restore
    /// MUST be in a finally — a leaked culture would corrupt unrelated tests on the same thread rather than fail here.
    /// </remarks>
    private static void RunWithCulture(string cultureName, Action assertion)
    {
        var originalCulture = CultureInfo.CurrentCulture;

        try
        {
            CultureInfo.CurrentCulture = new CultureInfo(cultureName);
            assertion();
        }
        finally
        {
            CultureInfo.CurrentCulture = originalCulture;
        }
    }
}
