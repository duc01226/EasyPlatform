using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="DateTimeExtension"/>.
/// </summary>
public class DateTimeExtensionTests : PlatformUnitTestBase
{
    // ── FirstDateOfMonth ──

    [Fact]
    public void FirstDateOfMonth_ReturnsFirstDay()
    {
        var date = new DateTime(2024, 3, 15, 10, 30, 0, DateTimeKind.Utc);

        var result = date.FirstDateOfMonth();

        result.Should().Be(new DateTime(2024, 3, 1, 0, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public void FirstDateOfMonth_PreservesKind()
    {
        var date = new DateTime(2024, 6, 20, 0, 0, 0, DateTimeKind.Local);

        var result = date.FirstDateOfMonth();

        result.Kind.Should().Be(DateTimeKind.Local);
    }

    // ── LastDateOfMonth ──

    [Fact]
    public void LastDateOfMonth_ReturnsLastMoment()
    {
        var date = new DateTime(2024, 1, 15, 0, 0, 0, DateTimeKind.Utc);

        var result = date.LastDateOfMonth();

        result.Year.Should().Be(2024);
        result.Month.Should().Be(1);
        result.Day.Should().Be(31);
        result.Hour.Should().Be(23);
        result.Minute.Should().Be(59);
        result.Second.Should().Be(59);
    }

    [Fact]
    public void LastDateOfMonth_February_LeapYear()
    {
        var date = new DateTime(2024, 2, 1, 0, 0, 0, DateTimeKind.Utc);

        var result = date.LastDateOfMonth();

        result.Day.Should().Be(29);
    }

    [Fact]
    public void LastDateOfMonth_February_NonLeapYear()
    {
        var date = new DateTime(2023, 2, 1, 0, 0, 0, DateTimeKind.Utc);

        var result = date.LastDateOfMonth();

        result.Day.Should().Be(28);
    }

    // ── MiddleDateOfMonth ──

    [Fact]
    public void MiddleDateOfMonth_Returns15th()
    {
        var date = new DateTime(2024, 7, 22, 10, 30, 0, DateTimeKind.Utc);

        var result = date.MiddleDateOfMonth();

        result.Should().Be(new DateTime(2024, 7, 15, 0, 0, 0, DateTimeKind.Utc));
    }

    // ── StartOfDate ──

    [Fact]
    public void StartOfDate_ReturnsMidnight()
    {
        var date = new DateTime(2024, 5, 10, 14, 30, 45);

        var result = date.StartOfDate();

        result.Should().Be(new DateTime(2024, 5, 10));
        result.Hour.Should().Be(0);
        result.Minute.Should().Be(0);
        result.Second.Should().Be(0);
    }

    // ── EndOfDate ──

    [Fact]
    public void EndOfDate_ReturnsEndOfDay()
    {
        var date = new DateTime(2024, 5, 10, 14, 30, 45);

        var result = date.EndOfDate();

        result.Year.Should().Be(2024);
        result.Month.Should().Be(5);
        result.Day.Should().Be(10);
        result.Hour.Should().Be(23);
        result.Minute.Should().Be(59);
        result.Second.Should().Be(59);
    }

    [Fact]
    public void EndOfDate_IsAfterStartOfDate()
    {
        var date = new DateTime(2024, 5, 10, 14, 30, 45);

        var start = date.StartOfDate();
        var end = date.EndOfDate();

        end.Should().BeAfter(start);
        (end - start).TotalHours.Should().BeApproximately(24, 0.01);
    }

    // ── EndDateOfYear ──

    [Fact]
    public void EndDateOfYear_ReturnsDecember31()
    {
        var date = new DateTime(2024, 6, 15);

        var result = date.EndDateOfYear();

        result.Month.Should().Be(12);
        result.Day.Should().Be(31);
        result.Year.Should().Be(2024);
    }

    [Fact]
    public void EndDateOfYear_LeapYear_ReturnsDecember31()
    {
        var date = new DateTime(2024, 1, 1);

        var result = date.EndDateOfYear();

        result.Should().Be(new DateTime(2024, 12, 31));
    }

    // ── CalculateTotalMonths ──

    [Fact]
    public void CalculateTotalMonths_OneYearApart_ReturnsApprox12()
    {
        var start = new DateTime(2024, 1, 1);
        var end = new DateTime(2025, 1, 1);

        var result = start.CalculateTotalMonths(end);

        result.Should().BeApproximately(12.0, 0.2);
    }

    [Fact]
    public void CalculateTotalMonths_SameDate_ReturnsZero()
    {
        var date = new DateTime(2024, 6, 15);

        var result = date.CalculateTotalMonths(date);

        result.Should().Be(0);
    }

    [Fact]
    public void CalculateTotalMonths_StartAfterEnd_Throws()
    {
        var start = new DateTime(2025, 1, 1);
        var end = new DateTime(2024, 1, 1);

        var act = () => start.CalculateTotalMonths(end);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void CalculateTotalMonths_SixMonthsApart_ReturnsApprox6()
    {
        var start = new DateTime(2024, 1, 1);
        var end = new DateTime(2024, 7, 1);

        var result = start.CalculateTotalMonths(end);

        result.Should().BeApproximately(6.0, 0.2);
    }

    // ── SpecifyKind ──

    [Fact]
    public void SpecifyKind_ChangesKind()
    {
        var date = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Unspecified);

        var result = date.SpecifyKind(DateTimeKind.Utc);

        result.Kind.Should().Be(DateTimeKind.Utc);
        result.Ticks.Should().Be(date.Ticks);
    }

    [Fact]
    public void SpecifyKind_Nullable_Null_ReturnsNull()
    {
        DateTime? date = null;

        var result = date.SpecifyKind(DateTimeKind.Utc);

        result.Should().BeNull();
    }

    // ── IsEndOfMonth ──

    [Fact]
    public void IsEndOfMonth_LastDay_ReturnsTrue()
    {
        var date = new DateTime(2024, 1, 31);

        date.IsEndOfMonth().Should().BeTrue();
    }

    [Fact]
    public void IsEndOfMonth_NotLastDay_ReturnsFalse()
    {
        var date = new DateTime(2024, 1, 15);

        date.IsEndOfMonth().Should().BeFalse();
    }

    // ── SubtractYears / SubtractMonths / SubtractDays ──

    [Fact]
    public void SubtractYears_SubtractsCorrectly()
    {
        var date = new DateTime(2024, 6, 15);

        date.SubtractYears(2).Should().Be(new DateTime(2022, 6, 15));
    }

    [Fact]
    public void SubtractMonths_SubtractsCorrectly()
    {
        var date = new DateTime(2024, 6, 15);

        date.SubtractMonths(3).Should().Be(new DateTime(2024, 3, 15));
    }

    [Fact]
    public void SubtractDays_SubtractsCorrectly()
    {
        var date = new DateTime(2024, 6, 15);

        date.SubtractDays(10).Should().Be(new DateTime(2024, 6, 5));
    }

    // ── RangeTo ──

    [Fact]
    public void RangeTo_ReturnsDateRange()
    {
        var start = new DateTime(2024, 1, 1);
        var end = new DateTime(2024, 1, 3);

        var result = start.RangeTo(end);

        result.Should().HaveCount(3);
        result[0].Should().Be(new DateTime(2024, 1, 1));
        result[1].Should().Be(new DateTime(2024, 1, 2));
        result[2].Should().Be(new DateTime(2024, 1, 3));
    }

    [Fact]
    public void RangeTo_EndBeforeStart_ReturnsEmpty()
    {
        var start = new DateTime(2024, 1, 3);
        var end = new DateTime(2024, 1, 1);

        var result = start.RangeTo(end);

        result.Should().BeEmpty();
    }
}
