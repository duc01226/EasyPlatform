using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Utils;

/// <summary>
/// Unit tests for <see cref="Util.EnumBuilder"/>.
/// </summary>
public sealed class UtilEnumBuilderTests : PlatformUnitTestBase
{
    private enum TestColor
    {
        Red,
        Green,
        Blue,
    }

    [Fact]
    public void Parse_ValidString_ReturnsEnumValue()
    {
        var result = Util.EnumBuilder.Parse<TestColor>("Green");

        result.Should().Be(TestColor.Green);
    }

    [Fact]
    public void Parse_InvalidString_ThrowsArgumentException()
    {
        var act = () => Util.EnumBuilder.Parse<TestColor>("Purple");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Parse_CaseMismatch_ThrowsArgumentException()
    {
        var act = () => Util.EnumBuilder.Parse<TestColor>("red");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Parse_AllValues_ParsesCorrectly()
    {
        Util.EnumBuilder.Parse<TestColor>("Red").Should().Be(TestColor.Red);
        Util.EnumBuilder.Parse<TestColor>("Green").Should().Be(TestColor.Green);
        Util.EnumBuilder.Parse<TestColor>("Blue").Should().Be(TestColor.Blue);
    }
}
