using System.ComponentModel;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="EnumExtension"/>.
/// </summary>
public class EnumExtensionTests : PlatformUnitTestBase
{
    private enum Color
    {
        Red,
        Green,
        Blue
    }

    private enum Shade
    {
        Red,
        Green,
        Blue
    }

    private enum StatusWithDescription
    {
        [Description("Currently active")]
        Active,

        [Description("Has been deactivated")]
        Inactive,

        NoDescription
    }

    // -- Parse --

    [Fact]
    public void Parse_MatchingName_ReturnsTargetEnum()
    {
        var color = Color.Green;

        var shade = color.Parse<Shade>();

        shade.Should().Be(Shade.Green);
    }

    [Fact]
    public void Parse_AllValues_MapsCorrectly()
    {
        Color.Red.Parse<Shade>().Should().Be(Shade.Red);
        Color.Blue.Parse<Shade>().Should().Be(Shade.Blue);
    }

    [Fact]
    public void Parse_NoMatchingName_ThrowsArgumentException()
    {
        var act = () => StatusWithDescription.Active.Parse<Color>();

        act.Should().Throw<ArgumentException>();
    }

    // -- GetDescription --

    [Fact]
    public void GetDescription_WithDescriptionAttribute_ReturnsDescription()
    {
        var result = StatusWithDescription.Active.GetDescription();

        result.Should().Be("Currently active");
    }

    [Fact]
    public void GetDescription_WithoutDescriptionAttribute_ReturnsName()
    {
        var result = StatusWithDescription.NoDescription.GetDescription();

        result.Should().Be("NoDescription");
    }

    [Fact]
    public void GetDescription_DifferentValues_ReturnCorrectDescriptions()
    {
        var result = StatusWithDescription.Inactive.GetDescription();

        result.Should().Be("Has been deactivated");
    }
}
