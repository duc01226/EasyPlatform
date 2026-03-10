using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Utils;

/// <summary>
/// Unit tests for <see cref="Util.HashsetBuilder"/>.
/// </summary>
public sealed class UtilHashsetBuilderTests : PlatformUnitTestBase
{
    [Fact]
    public void New_WithValues_ReturnsHashSet()
    {
        var result = Util.HashsetBuilder.New(1, 2, 3);

        result.Should().BeOfType<HashSet<int>>();
        result.Should().BeEquivalentTo([1, 2, 3]);
    }

    [Fact]
    public void New_WithDuplicates_DeduplicatesValues()
    {
        var result = Util.HashsetBuilder.New("a", "b", "a", "c", "b");

        result.Should().HaveCount(3);
        result.Should().BeEquivalentTo(["a", "b", "c"]);
    }

    [Fact]
    public void New_WithNoValues_ReturnsEmptyHashSet()
    {
        var result = Util.HashsetBuilder.New<int>();

        result.Should().BeEmpty();
    }

    [Fact]
    public void New_WithSingleValue_ReturnsSingleElementHashSet()
    {
        var result = Util.HashsetBuilder.New(42);

        result.Should().ContainSingle().Which.Should().Be(42);
    }
}
