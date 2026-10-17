using System.Globalization;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.JsonSerialization;

/// <summary>
/// Guards the day/month transposition defect at the DESERIALIZATION boundary.
/// </summary>
/// <remarks>
/// <para>Business intent guarded: the date a caller sends is the date the system stores. A payload must deserialize
/// to the SAME value on every host, regardless of that host's locale.</para>
/// <para><c>PlatformObjectJsonConverter</c> handles every <c>object</c>-typed JSON property platform-wide. Its
/// <c>DateOnly.TryParse</c>/<c>TimeOnly.TryParse</c> calls previously omitted an <c>IFormatProvider</c>, so they bound
/// to the ambient <see cref="CultureInfo.CurrentCulture" /> — making the deserialized value a function of the
/// container locale rather than of the payload. These tests assert determinism across cultures.</para>
/// </remarks>
public sealed class PlatformObjectJsonConverterCultureTests : PlatformUnitTestBase
{
    /// <summary>
    /// Deserialization target. <c>Value</c> is <c>object</c> on purpose — that is the shape
    /// (<c>CustomFieldValue.Value</c>) whose converter behavior is under test. It is assigned by the deserializer.
    /// </summary>
    private sealed class ObjectValueHolder
    {
        public object Value { get; set; } = null!;
    }

    /// <summary>
    /// Documents the ACTUAL contract for a top-level <c>object</c> property: <c>PlatformObjectJsonConverter.Read</c>
    /// maps <c>JsonTokenType.String</c> straight to <c>reader.GetString()</c>, so a JSON string stays a
    /// <see cref="string" /> — it is NOT coerced to a date here. Date coercion happens later, in the consuming
    /// service's own domain code.
    /// </summary>
    /// <remarks>
    /// This test pins that boundary deliberately. The type-sniffing path (<c>TryGetStringValue</c>, which DOES try
    /// <c>DateOnly.TryParse</c>) is reached only for NESTED array/object members and from the MongoDB dynamic-object
    /// serializer — never for a top-level string property. Asserting the real contract here prevents a future change
    /// from silently starting to coerce top-level strings to dates, which is exactly the kind of implicit,
    /// culture-sensitive conversion this whole fix removes.
    /// </remarks>
    [Theory]
    [InlineData("en-US")]
    [InlineData("en-GB")]
    [InlineData("vi-VN")]
    [InlineData("de-DE")]
    public void Deserialize_TopLevelStringValue_StaysString_InEveryCulture(string cultureName)
    {
        WithCulture(cultureName, () =>
        {
            var result = PlatformJsonSerializer.Deserialize<ObjectValueHolder>("""{"Value":"2026-06-01T00:00:00.000Z"}""");

            result.Value.Should().BeOfType<string>(
                "a top-level object-typed JSON string is not coerced at the serialization boundary");
            result.Value.Should().Be(
                "2026-06-01T00:00:00.000Z",
                $"the payload must survive verbatim under {cultureName}, with no locale-dependent reinterpretation");
        });
    }

    /// <summary>
    /// The nested-member path DOES sniff types (<c>TryGetStringValue</c>), and that is where the missing
    /// <c>IFormatProvider</c> made the result depend on the host locale. An ISO timestamp must resolve to the same
    /// instant in every culture.
    /// </summary>
    [Theory]
    [InlineData("en-US")]
    [InlineData("en-GB")]
    [InlineData("vi-VN")]
    [InlineData("de-DE")]
    public void Deserialize_NestedIsoTimestamp_YieldsSameDate_InEveryCulture(string cultureName)
    {
        WithCulture(cultureName, () =>
        {
            var result = PlatformJsonSerializer.Deserialize<ObjectValueHolder>("""{"Value":{"Inner":"2026-06-01T00:00:00.000Z"}}""");

            var dictionary = result.Value.Should().BeAssignableTo<IDictionary<string, object>>().Subject;
            var date = ToDate(dictionary["Inner"]);

            date.Should().NotBeNull($"a nested ISO timestamp must resolve to a date under {cultureName}");
            date!.Value.Year.Should().Be(2026);
            date.Value.Month.Should().Be(6);
            date.Value.Day.Should().Be(1);
        });
    }

    /// <summary>
    /// The core guarantee, in TWO parts: an AMBIGUOUS date string (both components &lt;= 12) must deserialize to the
    /// same value in every culture, AND that value must be the DAY-FIRST reading. Before the fix this returned
    /// Jan 6 under en-US and Jun 1 under en-GB from one identical payload — the silent transposition.
    /// <para>
    /// Consistency alone is NOT sufficient and asserting only consistency is what let a defect survive here: this
    /// deserializer and <see cref="Util.DateTimeParser.Parse" /> are two readers of the SAME stored field, so a
    /// month-first reading here would be perfectly consistent across hosts while still disagreeing with the parser
    /// — storing 6 January or 1 June for one payload depending purely on which transport shape it arrived in.
    /// The declared day-first contract must therefore be pinned by VALUE, not merely by agreement.
    /// </para>
    /// </summary>
    [Fact]
    public void Deserialize_AmbiguousDateString_YieldsIdenticalValue_AcrossAllCultures()
    {
        const string payload = """{"Value":{"Inner":"01/06/2026"}}""";
        var results = new List<(string Culture, string Rendered)>();

        foreach (var cultureName in new[] { "en-US", "en-GB", "vi-VN", "de-DE", "ja-JP" })
        {
            WithCulture(cultureName, () =>
            {
                var result = PlatformJsonSerializer.Deserialize<ObjectValueHolder>(payload);
                var inner = ((IDictionary<string, object>)result.Value)["Inner"];
                var date = ToDate(inner);
                results.Add((cultureName, date?.ToString("yyyy-MM-dd") ?? $"raw:{inner}"));
            });
        }

        results.Select(r => r.Rendered).Distinct().Should().HaveCount(
            1,
            "one identical payload must deserialize to one identical value on every host; got " +
            string.Join(", ", results.Select(r => $"{r.Culture}={r.Rendered}")));

        // Pin the VALUE, not just the agreement: 01/06/2026 is 1 June under the declared dd/MM/yyyy contract.
        // Without this assertion a month-first reading would satisfy the consistency check above while silently
        // disagreeing with Util.DateTimeParser.Parse about the very same stored field.
        results.Select(r => r.Rendered).Distinct().Single().Should().Be(
            "2026-06-01",
            "the deserializer must resolve the declared day-first contract to the same day the parser does");
    }

    /// <summary>
    /// An unambiguous day-first date (day &gt; 12) must also be culture-independent. Before the fix this parsed to a
    /// date under a day-first culture but fell through and stayed a raw string under en-US — the same payload
    /// producing two different STORED TYPES depending on the host.
    /// </summary>
    [Fact]
    public void Deserialize_DayGreaterThanTwelve_YieldsIdenticalValue_AcrossAllCultures()
    {
        const string payload = """{"Value":{"Inner":"25/06/2026"}}""";
        var rendered = new List<string>();

        foreach (var cultureName in new[] { "en-US", "en-GB", "vi-VN" })
        {
            WithCulture(cultureName, () =>
            {
                var result = PlatformJsonSerializer.Deserialize<ObjectValueHolder>(payload);
                var inner = ((IDictionary<string, object>)result.Value)["Inner"];
                var date = ToDate(inner);
                rendered.Add(date?.ToString("yyyy-MM-dd") ?? $"raw:{inner}");
            });
        }

        rendered.Distinct().Should().HaveCount(
            1,
            "the same payload must not deserialize to different types/values per host; got " + string.Join(", ", rendered));
    }

    /// <summary>
    /// CROSS-FILE AGREEMENT. The deserializer and <see cref="Util.DateTimeParser.Parse" /> both read the SAME stored
    /// field, so they must resolve one text to one date. They shipped disagreeing: the parser applied the declared
    /// day-first list while the deserializer used a bare InvariantCulture (month-first) read, so "01/06/2026" became
    /// 1 June through one path and 6 January through the other. Because the shared custom-field converter dispatches
    /// BY TYPE, which path a value takes depends only on the transport shape it arrived in — so one payload could be
    /// stored as two different dates. No single-file test could catch that; only comparing the two readers can.
    /// </summary>
    [Theory]
    [InlineData("01/06/2026")]
    [InlineData("1/6/2026")]
    [InlineData("25/06/2026")]
    [InlineData("2026-06-01")]
    public void Deserializer_And_DateTimeParser_ResolveTheSameText_ToTheSameDate(string dateText)
    {
        foreach (var cultureName in new[] { "en-US", "en-GB", "ja-JP" })
        {
            WithCulture(cultureName, () =>
            {
                var deserialized = PlatformJsonSerializer.Deserialize<ObjectValueHolder>(BuildPayload(dateText));
                var viaConverter = ToDate(((IDictionary<string, object>)deserialized.Value)["Inner"]);
                var viaParser = Util.DateTimeParser.Parse(dateText);

                viaParser.Should().NotBeNull($"'{dateText}' must be parseable under {cultureName}");
                viaConverter.Should().NotBeNull(
                    $"'{dateText}' must deserialize to a date, not stay raw text, under {cultureName}");
                viaConverter!.Value.Date.Should().Be(
                    viaParser!.Value.Date,
                    $"the deserializer and the parser read the same stored field, so '{dateText}' must mean one "
                    + $"date under {cultureName} — not one date per transport shape");
            });
        }
    }

    /// <summary>
    /// Single-digit day-first regression. "1/6/2026" has no zero padding, so it matches no "dd/MM" format. When the
    /// declared list omitted a single-digit variant this value missed the exact pass entirely and fell to the
    /// InvariantCulture general parse — which is MONTH-first — so the culture fix INVERTED its own goal for this
    /// shape: 1 June on a day-first host before, 6 January after. The shape is live; the employee CSV importer
    /// declares "d/M/yyyy" among its accepted formats.
    /// </summary>
    [Theory]
    [InlineData("1/6/2026")]
    [InlineData("01/6/2026")]
    [InlineData("1/06/2026")]
    public void Deserialize_SingleDigitDayFirstDate_ResolvesDayFirst(string dateText)
    {
        foreach (var cultureName in new[] { "en-US", "en-GB", "de-DE" })
        {
            WithCulture(cultureName, () =>
            {
                var result = PlatformJsonSerializer.Deserialize<ObjectValueHolder>(BuildPayload(dateText));
                var date = ToDate(((IDictionary<string, object>)result.Value)["Inner"]);

                date.Should().NotBeNull($"'{dateText}' is a declared day-first format");
                date!.Value.Day.Should().Be(1, $"'{dateText}' is 1 June, so the day must not come from the month");
                date.Value.Month.Should().Be(6);
                date.Value.Year.Should().Be(2026);
            });
        }
    }

    /// <summary>
    /// Builds a NESTED object payload — the type-sniffing path. A top-level string is returned verbatim and would
    /// never exercise the date coercion under test.
    /// </summary>
    private static string BuildPayload(string dateText)
    {
        return "{\"Value\":{\"Inner\":\"" + dateText + "\"}}";
    }

    /// <summary>
    /// Mirrors the production coercion convention: the WALL-CLOCK date is kept for a
    /// <see cref="DateTimeOffset" />, never <c>.UtcDateTime</c>.
    /// </summary>
    /// <remarks>
    /// An offset-less JSON date such as "2026-06-01" is captured by <c>TryGetDateTimeOffset</c> and stamped with the
    /// HOST's offset — an offset the payload never specified. Taking <c>.UtcDateTime</c> then moves the calendar day
    /// backwards on any positive-offset host (+07:00 renders 2026-06-01 as 2026-05-31), which would make this helper
    /// report a transposition the production code does not commit — a test asserting its own bug rather than the
    /// system's behavior.
    /// </remarks>
    private static DateTime? ToDate(object value)
    {
        return value switch
        {
            DateTime dateTime => dateTime,
            DateTimeOffset dateTimeOffset => DateTime.SpecifyKind(dateTimeOffset.DateTime, DateTimeKind.Utc),
            DateOnly dateOnly => dateOnly.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            _ => null
        };
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
}
