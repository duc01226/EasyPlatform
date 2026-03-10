using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="NumberExtension"/>.
/// </summary>
public class NumberExtensionTests : PlatformUnitTestBase
{
    // ── ToCompactDecimalString ──

    [Theory]
    [InlineData(5.0, "5")]
    [InlineData(10.0, "10")]
    [InlineData(0.0, "0")]
    public void ToCompactDecimalString_WholeNumber_ReturnsIntegerString(double value, string expected)
    {
        value.ToCompactDecimalString().Should().Be(expected);
    }

    [Theory]
    [InlineData(3.50, "3.5")]
    [InlineData(1.10, "1.1")]
    [InlineData(2.00100, "2")]
    public void ToCompactDecimalString_TrailingZeros_TrimsTrailingZeros(double value, string expected)
    {
        value.ToCompactDecimalString().Should().Be(expected);
    }

    [Theory]
    [InlineData(3.14, "3.14")]
    [InlineData(0.75, "0.75")]
    [InlineData(99.99, "99.99")]
    public void ToCompactDecimalString_NormalDecimal_ReturnsTrimmedString(double value, string expected)
    {
        value.ToCompactDecimalString().Should().Be(expected);
    }

    [Fact]
    public void ToCompactDecimalString_ManyDecimalPlaces_TruncatesToTwoPlaces()
    {
        var result = 1.23456.ToCompactDecimalString();

        result.Should().Be("1.23");
    }

    [Fact]
    public void ToCompactDecimalString_NegativeValue_FormatsCorrectly()
    {
        var result = (-5.5).ToCompactDecimalString();

        result.Should().Be("-5.5");
    }
}
