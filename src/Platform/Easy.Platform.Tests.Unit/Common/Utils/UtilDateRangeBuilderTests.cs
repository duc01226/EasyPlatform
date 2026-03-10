using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Utils;

/// <summary>
/// Unit tests for <see cref="Util.DateRangeBuilder"/>.
/// </summary>
public sealed class UtilDateRangeBuilderTests : PlatformUnitTestBase
{
    // ── BuildDateRange ──

    [Fact]
    public void BuildDateRange_FullWeek_ReturnsSevenDays()
    {
        var start = new DateTime(2023, 11, 20); // Monday
        var end = new DateTime(2023, 11, 26);   // Sunday

        var result = Util.DateRangeBuilder.BuildDateRange(start, end);

        result.Should().HaveCount(7);
        result[0].Date.Should().Be(new DateTime(2023, 11, 20));
        result[6].Date.Should().Be(new DateTime(2023, 11, 26));
    }

    [Fact]
    public void BuildDateRange_SameDay_ReturnsSingleDay()
    {
        var date = new DateTime(2023, 6, 15);

        var result = Util.DateRangeBuilder.BuildDateRange(date, date);

        result.Should().ContainSingle().Which.Date.Should().Be(date.Date);
    }

    [Fact]
    public void BuildDateRange_StartAfterEnd_ReturnsEmpty()
    {
        var start = new DateTime(2023, 12, 10);
        var end = new DateTime(2023, 12, 5);

        var result = Util.DateRangeBuilder.BuildDateRange(start, end);

        result.Should().BeEmpty();
    }

    [Fact]
    public void BuildDateRange_IgnoreWeekends_ExcludesSaturdayAndSunday()
    {
        var start = new DateTime(2023, 11, 20); // Monday
        var end = new DateTime(2023, 11, 26);   // Sunday
        var weekends = new HashSet<DayOfWeek> { DayOfWeek.Saturday, DayOfWeek.Sunday };

        var result = Util.DateRangeBuilder.BuildDateRange(start, end, weekends);

        result.Should().HaveCount(5);
        result.Should().OnlyContain(d => d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday);
    }

    // ── BuildDateRangeDateOnly ──

    [Fact]
    public void BuildDateRangeDateOnly_ReturnsDateOnlyList()
    {
        var start = new DateTime(2023, 3, 1);
        var end = new DateTime(2023, 3, 3);

        var result = Util.DateRangeBuilder.BuildDateRangeDateOnly(start, end);

        result.Should().HaveCount(3);
        result[0].Should().Be(new DateOnly(2023, 3, 1));
        result[2].Should().Be(new DateOnly(2023, 3, 3));
    }

    [Fact]
    public void BuildDateRangeDateOnly_StartAfterEnd_ReturnsEmpty()
    {
        var start = new DateTime(2023, 5, 10);
        var end = new DateTime(2023, 5, 5);

        var result = Util.DateRangeBuilder.BuildDateRangeDateOnly(start, end);

        result.Should().BeEmpty();
    }

    // ── BuildWeeksAndDays ──

    [Fact]
    public void BuildWeeksAndDays_SpanningThreeWeeks_ReturnsThreeGroups()
    {
        var start = new DateTime(2023, 11, 24); // Friday
        var end = new DateTime(2023, 12, 6);    // Wednesday

        var result = Util.DateRangeBuilder.BuildWeeksAndDays(start, end);

        result.Should().HaveCount(3);
        result[0].First().Date.Should().Be(new DateTime(2023, 11, 24));
    }

    [Fact]
    public void BuildWeeksAndDays_SingleWeek_ReturnsSingleGroup()
    {
        var start = new DateTime(2023, 11, 27); // Monday
        var end = new DateTime(2023, 12, 1);    // Friday

        var result = Util.DateRangeBuilder.BuildWeeksAndDays(start, end);

        result.Should().HaveCount(1);
        result[0].Should().HaveCount(5);
    }

    [Fact]
    public void BuildWeeksAndDays_MondayFirst_FirstDayIsCorrect()
    {
        var start = new DateTime(2023, 11, 27); // Monday
        var end = new DateTime(2023, 12, 3);    // Sunday

        var result = Util.DateRangeBuilder.BuildWeeksAndDays(start, end, isMondayFirstDayOfWeek: true);

        result.Should().HaveCount(1);
        result[0].First().DayOfWeek.Should().Be(DayOfWeek.Monday);
        result[0].Last().DayOfWeek.Should().Be(DayOfWeek.Sunday);
    }

    // ── BuildWeeksAndDaysDateOnly ──

    [Fact]
    public void BuildWeeksAndDaysDateOnly_ReturnsDateOnlyGroups()
    {
        var start = new DateTime(2023, 11, 27); // Monday
        var end = new DateTime(2023, 12, 3);    // Sunday

        var result = Util.DateRangeBuilder.BuildWeeksAndDaysDateOnly(start, end);

        result.Should().HaveCount(1);
        result[0].First().Should().Be(new DateOnly(2023, 11, 27));
        result[0].Last().Should().Be(new DateOnly(2023, 12, 3));
    }

    [Fact]
    public void BuildWeeksAndDaysDateOnly_SpanningTwoWeeks_ReturnsTwoGroups()
    {
        var start = new DateTime(2023, 11, 30); // Thursday
        var end = new DateTime(2023, 12, 6);    // Wednesday

        var result = Util.DateRangeBuilder.BuildWeeksAndDaysDateOnly(start, end);

        result.Should().HaveCount(2);
    }
}
