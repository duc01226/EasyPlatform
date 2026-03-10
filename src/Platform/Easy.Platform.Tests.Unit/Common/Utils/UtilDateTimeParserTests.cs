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
