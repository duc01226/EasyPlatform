using System.Globalization;
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
        AssertCompactDecimal(value, expected);
    }

    [Theory]
    [InlineData(3.50, "3.5")]
    [InlineData(1.10, "1.1")]
    [InlineData(2.00100, "2")]
    public void ToCompactDecimalString_TrailingZeros_TrimsTrailingZeros(double value, string expected)
    {
        AssertCompactDecimal(value, expected);
    }

    [Theory]
    [InlineData(3.14, "3.14")]
    [InlineData(0.75, "0.75")]
    [InlineData(99.99, "99.99")]
    public void ToCompactDecimalString_NormalDecimal_ReturnsTrimmedString(double value, string expected)
    {
        AssertCompactDecimal(value, expected);
    }

    [Fact]
    public void ToCompactDecimalString_ManyDecimalPlaces_TruncatesToTwoPlaces()
    {
        AssertCompactDecimal(1.23456, "1.23");
    }

    [Fact]
    public void ToCompactDecimalString_NegativeValue_FormatsCorrectly()
    {
        AssertCompactDecimal(-5.5, "-5.5");
    }

    [Theory]
    [InlineData("en-US", "3.5")]
    [InlineData("fr-FR", "3,5")]
    [InlineData("vi-VN", "3,5")]
    public void ToCompactDecimalString_UsesCurrentCultureWithoutTrailingZeros(string cultureName, string expected)
    {
        AssertCompactDecimal(3.50, expected, cultureName);
    }

    private static void AssertCompactDecimal(double value, string expected, string cultureName = "en-US")
    {
        var originalCulture = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo(cultureName);
            value.ToCompactDecimalString().Should().Be(expected);
        }
        finally
        {
            CultureInfo.CurrentCulture = originalCulture;
        }
    }
}
