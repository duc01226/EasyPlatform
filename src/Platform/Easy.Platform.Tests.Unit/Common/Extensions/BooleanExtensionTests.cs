using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="BooleanExtension"/>.
/// </summary>
public class BooleanExtensionTests : PlatformUnitTestBase
{
    // ── TryParseBooleanOrDefault ──

    [Theory]
    [InlineData("true", true)]
    [InlineData("True", true)]
    [InlineData("TRUE", true)]
    [InlineData("false", false)]
    [InlineData("False", false)]
    [InlineData("FALSE", false)]
    public void TryParseBooleanOrDefault_ValidBoolString_ReturnsExpected(string input, bool expected)
    {
        input.TryParseBooleanOrDefault().Should().Be(expected);
    }

    [Fact]
    public void TryParseBooleanOrDefault_NullString_ReturnsFalse()
    {
        ((string?)null).TryParseBooleanOrDefault().Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("yes")]
    [InlineData("1")]
    [InlineData("invalid")]
    public void TryParseBooleanOrDefault_InvalidString_ReturnsFalse(string input)
    {
        input.TryParseBooleanOrDefault().Should().BeFalse();
    }
}
