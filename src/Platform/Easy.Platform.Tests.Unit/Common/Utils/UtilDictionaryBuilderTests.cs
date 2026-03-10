using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Utils;

/// <summary>
/// Unit tests for <see cref="Util.DictionaryBuilder"/>.
/// </summary>
public sealed class UtilDictionaryBuilderTests : PlatformUnitTestBase
{
    [Fact]
    public void New_WithTuples_ReturnsDictionary()
    {
        var result = Util.DictionaryBuilder.New(("key1", 10), ("key2", 20));

        result.Should().HaveCount(2);
        result["key1"].Should().Be(10);
        result["key2"].Should().Be(20);
    }

    [Fact]
    public void New_WithNoTuples_ReturnsEmptyDictionary()
    {
        var result = Util.DictionaryBuilder.New<string, int>();

        result.Should().BeEmpty();
    }

    [Fact]
    public void New_WithSingleTuple_ReturnsSingleEntryDictionary()
    {
        var result = Util.DictionaryBuilder.New(("only", "value"));

        result.Should().ContainSingle();
        result["only"].Should().Be("value");
    }

    [Fact]
    public void New_WithDuplicateKeys_ThrowsArgumentException()
    {
        var act = () => Util.DictionaryBuilder.New(("dup", 1), ("dup", 2));

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void New_ReturnsDictionaryType()
    {
        var result = Util.DictionaryBuilder.New(("a", 1));

        result.Should().BeOfType<Dictionary<string, int>>();
    }
}
