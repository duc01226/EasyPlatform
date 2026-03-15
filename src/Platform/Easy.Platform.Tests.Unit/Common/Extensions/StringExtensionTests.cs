using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="StringExtension"/>.
/// </summary>
public class StringExtensionTests : PlatformUnitTestBase
{
    // ── TakeTop ──

    [Theory]
    [InlineData("Hello World", 5, "Hello")]
    [InlineData("Hi", 5, "Hi")]
    [InlineData("Exact", 5, "Exact")]
    public void TakeTop_ReturnsCorrectSubstring(string input, int maxLen, string expected)
    {
        input.TakeTop(maxLen).Should().Be(expected);
    }

    // ── IsNotNullOrEmpty / IsNullOrEmpty ──

    [Theory]
    [InlineData("hello", true)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void IsNotNullOrEmpty_ReturnsExpected(string? input, bool expected)
    {
        input.IsNotNullOrEmpty().Should().Be(expected);
    }

    [Theory]
    [InlineData("hello", false)]
    [InlineData("", true)]
    [InlineData(null, true)]
    public void IsNullOrEmpty_ReturnsExpected(string? input, bool expected)
    {
        input.IsNullOrEmpty().Should().Be(expected);
    }

    // ── IsNotNullOrWhiteSpace / IsNullOrWhiteSpace ──

    [Theory]
    [InlineData("hello", true)]
    [InlineData(" ", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void IsNotNullOrWhiteSpace_ReturnsExpected(string? input, bool expected)
    {
        input.IsNotNullOrWhiteSpace().Should().Be(expected);
    }

    // ── RemoveSpecialCharactersUri ──

    [Fact]
    public void RemoveSpecialCharactersUri_RemovesSpecialChars()
    {
        "hello@world!".RemoveSpecialCharactersUri().Should().Be("helloworld");
    }

    [Fact]
    public void RemoveSpecialCharactersUri_WithReplace_SubstitutesChars()
    {
        "hello@world".RemoveSpecialCharactersUri("-").Should().Be("hello-world");
    }

    [Fact]
    public void RemoveSpecialCharactersUri_KeepsAllowedChars()
    {
        "path/to/file.txt".RemoveSpecialCharactersUri().Should().Be("path/to/file.txt");
    }

    // ── ParseToEnum ──

    [Fact]
    public void ParseToEnum_ValidValue_ReturnsEnum()
    {
        "Monday".ParseToEnum<DayOfWeek>().Should().Be(DayOfWeek.Monday);
    }

    [Fact]
    public void ParseToEnum_InvalidValue_Throws()
    {
        var act = () => "Invalid".ParseToEnum<DayOfWeek>();

        act.Should().Throw<ArgumentException>();
    }

    // ── TryParseToEnum ──

    [Fact]
    public void TryParseToEnum_ValidValue_ReturnsValid()
    {
        var result = "Monday".TryParseToEnum<DayOfWeek>();

        result.IsValid.Should().BeTrue();
        result.Value.Should().Be(DayOfWeek.Monday);
    }

    [Fact]
    public void TryParseToEnum_InvalidValue_ReturnsInvalid()
    {
        var result = "Invalid".TryParseToEnum<DayOfWeek>();

        result.IsValid.Should().BeFalse();
    }

    // ── Duplicate ──

    [Theory]
    [InlineData("ab", 2, "ababab")]
    [InlineData("x", 0, "x")]
    public void Duplicate_RepeatsString(string input, int times, string expected)
    {
        input.Duplicate(times).Should().Be(expected);
    }

    // ── SliceFromRight ──

    [Fact]
    public void SliceFromRight_ReturnsCorrectSubstring()
    {
        "Hello World".SliceFromRight(6).Should().Be("Hello");
    }

    // ── ToBase64String ──

    [Fact]
    public void ToBase64String_EncodesCorrectly()
    {
        "Hello".ToBase64String().Should().Be(Convert.ToBase64String("Hello"u8.ToArray()));
    }

    [Fact]
    public void ToBase64String_NullInput_ReturnsNull()
    {
        ((string?)null).ToBase64String().Should().BeNull();
    }

    // ── EnsureNotNullOrEmpty ──

    [Fact]
    public void EnsureNotNullOrEmpty_WithValue_ReturnsValue()
    {
        "hello".EnsureNotNullOrEmpty(() => new Exception("fail")).Should().Be("hello");
    }

    [Fact]
    public void EnsureNotNullOrEmpty_WithEmpty_Throws()
    {
        var act = () => "".EnsureNotNullOrEmpty(() => new InvalidOperationException("empty"));

        act.Should().Throw<InvalidOperationException>().WithMessage("empty");
    }

    // ── TakeUntilNextChar ──

    [Fact]
    public void TakeUntilNextChar_ReturnsSubstringBeforeChar()
    {
        "hello.world".TakeUntilNextChar('.').Should().Be("hello");
    }

    // ── IsNullOrEmptyId ──

    [Theory]
    [InlineData(null, true)]
    [InlineData("", true)]
    public void IsNullOrEmptyId_NullOrEmpty_ReturnsTrue(string? input, bool expected)
    {
        input.IsNullOrEmptyId().Should().Be(expected);
    }

    [Fact]
    public void IsNullOrEmptyId_EmptyGuid_ReturnsTrue()
    {
        Guid.Empty.ToString().IsNullOrEmptyId().Should().BeTrue();
    }

    [Fact]
    public void IsNullOrEmptyId_ValidId_ReturnsFalse()
    {
        Guid.NewGuid().ToString().IsNullOrEmptyId().Should().BeFalse();
    }
}
