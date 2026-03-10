using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Utils;

/// <summary>
/// Unit tests for <see cref="Util.ListBuilder"/>.
/// </summary>
public sealed class UtilListBuilderTests : PlatformUnitTestBase
{
    [Fact]
    public void New_WithValues_ReturnsList()
    {
        var result = Util.ListBuilder.New(1, 2, 3);

        result.Should().BeOfType<List<int>>();
        result.Should().Equal([1, 2, 3]);
    }

    [Fact]
    public void New_WithNoValues_ReturnsEmptyList()
    {
        var result = Util.ListBuilder.New<string>();

        result.Should().BeEmpty();
    }

    [Fact]
    public void New_WithSingleValue_ReturnsSingleElementList()
    {
        var result = Util.ListBuilder.New("hello");

        result.Should().ContainSingle().Which.Should().Be("hello");
    }

    [Fact]
    public void NewKeyValue_WithTuples_ReturnsKeyValuePairList()
    {
        var result = Util.ListBuilder.New<string, int>(("a", 1), ("b", 2));

        result.Should().HaveCount(2);
        result[0].Key.Should().Be("a");
        result[0].Value.Should().Be(1);
        result[1].Key.Should().Be("b");
        result[1].Value.Should().Be(2);
    }

    [Fact]
    public void NewKeyValue_WithNoTuples_ReturnsEmptyList()
    {
        var result = Util.ListBuilder.New<string, int>();

        result.Should().BeEmpty();
    }
}
