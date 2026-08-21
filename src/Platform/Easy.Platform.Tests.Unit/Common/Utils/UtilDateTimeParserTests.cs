using System.Globalization;
using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Utils;

/// <summary>
/// Unit tests for <see cref="Util.DateTimeParser"/>.
/// </summary>
public sealed class UtilDateTimeParserTests : PlatformUnitTestBase
{
    // ── ParseDateTimeOffset ──

    [Fact]
    public void ParseDateTimeOffset_ValidIsoString_ReturnsParsedValue()
    {
        var result = Util.DateTimeParser.ParseDateTimeOffset("2023-06-15T10:30:00+00:00");

        result.Should().NotBeNull();
        result!.Value.Year.Should().Be(2023);
        result.Value.Month.Should().Be(6);
        result.Value.Day.Should().Be(15);
    }

    [Fact]
    public void ParseDateTimeOffset_InvalidString_ReturnsNull()
    {
        var result = Util.DateTimeParser.ParseDateTimeOffset("not-a-date");

        result.Should().BeNull();
    }

    [Fact]
    public void ParseDateTimeOffset_NullOrEmpty_ReturnsNull()
    {
        Util.DateTimeParser.ParseDateTimeOffset(null!).Should().BeNull();
        Util.DateTimeParser.ParseDateTimeOffset("").Should().BeNull();
    }

    // ── Parse ──

    [Fact]
    public void Parse_ValidDateString_ReturnsParsedDateTime()
    {
        var result = Util.DateTimeParser.Parse("2023-06-15");

        result.Should().NotBeNull();
        result!.Value.Year.Should().Be(2023);
        result.Value.Month.Should().Be(6);
        result.Value.Day.Should().Be(15);
    }

    [Fact]
    public void Parse_EmptyString_ReturnsNull()
    {
        var result = Util.DateTimeParser.Parse("");

        result.Should().BeNull();
    }

    [Fact]
    public void Parse_NullString_ReturnsNull()
    {
        var result = Util.DateTimeParser.Parse(null!);

        result.Should().BeNull();
    }

    [Fact]
    public void Parse_InvalidString_ReturnsNull()
    {
        var result = Util.DateTimeParser.Parse("completely-invalid");

        result.Should().BeNull();
    }

    [Fact]
    public void Parse_CustomSupportedFormat_ReturnsParsedValue()
    {
        // dd/MM/yyyy is in DefaultSupportDateOnlyFormats
        var result = Util.DateTimeParser.Parse("15/06/2023");

        result.Should().NotBeNull();
        result!.Value.Day.Should().Be(15);
        result.Value.Month.Should().Be(6);
    }

    /// <summary>
    /// Guards the day/month transposition defect: an AMBIGUOUS day-first date (both components &lt;= 12)
    /// must resolve day-first per <see cref="Util.DateTimeParser.DefaultSupportDateOnlyFormats" />, which
    /// declares "dd/MM/yyyy". The pre-existing "15/06/2023" case only passes because day 15 makes
    /// <c>DateTime.TryParse</c> FAIL and fall through to the exact-format list — it therefore does NOT
    /// protect the ambiguous case, where a month-first ambient culture silently wins and returns Jan 6.
    /// Business intent guarded: the date a user enters is the date the system stores.
    /// </summary>
    [Theory]
    [InlineData("en-US")]
    [InlineData("en-GB")]
    [InlineData("vi-VN")]
    [InlineData("de-DE")]
    public void Parse_AmbiguousDayFirstDate_ResolvesDayFirst_RegardlessOfAmbientCulture(string cultureName)
    {
        WithCulture(cultureName, () =>
        {
            var result = Util.DateTimeParser.Parse("01/06/2026");

            result.Should().NotBeNull();
            result!.Value.Day.Should().Be(1, "01/06/2026 is 1 June in the declared dd/MM/yyyy contract");
            result.Value.Month.Should().Be(6, "the month must not be taken from the day component");
            result.Value.Year.Should().Be(2026);
        });
    }

    /// <summary>
    /// Regression guard for the fix itself: reordering so the exact day-first format list is tried FIRST
    /// must NOT break full ISO-8601 timestamps. DefaultSupportDateOnlyFormats is date-only, so an ISO
    /// timestamp has to keep resolving through the general parse branch.
    /// </summary>
    [Theory]
    [InlineData("2026-06-01T00:00:00.000Z")]
    [InlineData("2026-06-01T00:00:00.0000000Z")]
    [InlineData("2026-06-01T13:45:30+07:00")]
    [InlineData("2026-06-01")]
    public void Parse_IsoFormats_StillResolveCorrectly(string isoValue)
    {
        WithCulture("en-US", () =>
        {
            var result = Util.DateTimeParser.Parse(isoValue);

            result.Should().NotBeNull($"'{isoValue}' is a valid ISO-8601 value");
            result!.Value.ToUniversalTime().Year.Should().Be(2026);
            result.Value.ToUniversalTime().Month.Should().Be(6);
            result.Value.ToUniversalTime().Day.Should().Be(1);
        });
    }

    /// <summary>
    /// An unambiguous day-first date (day &gt; 12) must stay correct in every culture. This is the
    /// counter-case proving the fix resolves day-first by contract rather than by parse failure.
    /// </summary>
    [Theory]
    [InlineData("en-US")]
    [InlineData("en-GB")]
    public void Parse_UnambiguousDayFirstDate_ResolvesDayFirst(string cultureName)
    {
        WithCulture(cultureName, () =>
        {
            var result = Util.DateTimeParser.Parse("25/06/2026");

            result.Should().NotBeNull();
            result!.Value.Day.Should().Be(25);
            result.Value.Month.Should().Be(6);
        });
    }

    /// <summary>
    /// ParseDateTimeOffset had the same culture-dependence defect as <see cref="Util.DateTimeParser.Parse" />: it
    /// called TryParse with no IFormatProvider, so an ambiguous day-first value resolved month-first on en-US and
    /// ja-JP. Note that pinning to InvariantCulture alone would NOT fix it — Invariant is itself month-first — so
    /// the declared day-first format list has to be consulted first. Business intent guarded: a day-first date
    /// means the same thing on every host.
    /// </summary>
    [Theory]
    [InlineData("en-US")]
    [InlineData("en-GB")]
    [InlineData("ja-JP")]
    [InlineData("de-DE")]
    public void ParseDateTimeOffset_AmbiguousDayFirstDate_ResolvesDayFirst_RegardlessOfAmbientCulture(string cultureName)
    {
        WithCulture(cultureName, () =>
        {
            var result = Util.DateTimeParser.ParseDateTimeOffset("01/06/2026");

            result.Should().NotBeNull();
            result!.Value.Day.Should().Be(1, "01/06/2026 is 1 June in the declared dd/MM/yyyy contract");
            result.Value.Month.Should().Be(6, "the month must not be taken from the day component");
            result.Value.Year.Should().Be(2026);
        });
    }

    /// <summary>
    /// Regression guard: full ISO-8601 values must keep resolving through the general-parse branch, including the
    /// offset, after the exact-format list was moved in front of it.
    /// </summary>
    [Theory]
    [InlineData("2026-06-01T00:00:00.000Z")]
    [InlineData("2026-06-01T13:45:30+07:00")]
    public void ParseDateTimeOffset_IsoFormats_StillResolveCorrectly(string isoValue)
    {
        WithCulture("en-US", () =>
        {
            var result = Util.DateTimeParser.ParseDateTimeOffset(isoValue);

            result.Should().NotBeNull($"'{isoValue}' is a valid ISO-8601 value");
            result!.Value.UtcDateTime.Year.Should().Be(2026);
            result.Value.UtcDateTime.Month.Should().Be(6);
            result.Value.UtcDateTime.Day.Should().Be(1);
        });
    }

    /// <summary>
    /// Pins the CALENDAR contract of <see cref="Util.DateTimeParser.ToPredefinedDateTimeFormat" />: an explicit
    /// format list means a fixed Gregorian calendar, so the parsed INSTANT must be identical on every host. The
    /// method previously passed <c>provider: null</c>, which resolved against the ambient culture's calendar — on
    /// fa-IR / th-TH that produced a DateTime whose real ticks were centuries off, and on ar-SA it failed outright.
    /// <para>
    /// Asserted against a constructed DateTime rather than <c>.Year</c>: the Year/Month/Day properties are rendered
    /// through the ambient calendar, so reading them under fa-IR reports 2647 for the very instant that IS Gregorian
    /// 2026-06-01. Comparing instants is what makes this test culture-independent.
    /// </para>
    /// </summary>
    [Theory]
    [InlineData("en-US")]
    [InlineData("fa-IR")]
    [InlineData("th-TH")]
    [InlineData("ar-SA")]
    public void ToPredefinedDateTimeFormat_ResolvesSameInstant_OnEveryHostCulture(string cultureName)
    {
        WithCulture(cultureName, () =>
        {
            var result = Util.DateTimeParser.ToPredefinedDateTimeFormat("2026-06-01");

            result.Should().NotBeNull($"'2026-06-01' matches the declared yyyy-MM-dd format under {cultureName}");
            result!.Value.Date.Should().Be(
                new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc).Date,
                "an explicit yyyy-MM-dd contract means the Gregorian instant 2026-06-01 on every host, "
                + "regardless of the ambient culture's calendar");
        });
    }

    /// <summary>
    /// The same calendar contract for the day-first branch, which is the format the transposition defect involved.
    /// </summary>
    [Theory]
    [InlineData("en-US")]
    [InlineData("fa-IR")]
    [InlineData("th-TH")]
    public void Parse_AmbiguousDayFirstDate_ResolvesSameInstant_OnNonGregorianHosts(string cultureName)
    {
        WithCulture(cultureName, () =>
        {
            var result = Util.DateTimeParser.Parse("01/06/2026");

            result.Should().NotBeNull();
            result!.Value.Date.Should().Be(
                new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc).Date,
                "01/06/2026 is the Gregorian instant 1 June 2026 under the declared dd/MM/yyyy contract");
        });
    }

    private static void WithCulture(string cultureName, Action assert)
    {
        var originalCulture = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo(cultureName);
            assert();
        }
        finally
        {
            CultureInfo.CurrentCulture = originalCulture;
        }
    }

    // ── ToPredefinedDateTimeFormat ──

    [Fact]
    public void ToPredefinedDateTimeFormat_ValidDefaultFormat_ReturnsParsedValue()
    {
        var result = Util.DateTimeParser.ToPredefinedDateTimeFormat("2023/06/15");

        result.Should().NotBeNull();
        result!.Value.Year.Should().Be(2023);
        result.Value.Month.Should().Be(6);
    }

    [Fact]
    public void ToPredefinedDateTimeFormat_InvalidFormat_ReturnsNull()
    {
        var result = Util.DateTimeParser.ToPredefinedDateTimeFormat("June 15, 2023");

        result.Should().BeNull();
    }
}
