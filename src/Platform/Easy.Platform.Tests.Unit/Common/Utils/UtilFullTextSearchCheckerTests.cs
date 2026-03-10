using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Utils;

/// <summary>
/// Unit tests for <see cref="Util.FullTextSearchChecker"/>.
/// </summary>
public sealed class UtilFullTextSearchCheckerTests : PlatformUnitTestBase
{
    // ── IsFullTextSearchMatch ──

    [Fact]
    public void IsFullTextSearchMatch_ExactSubstring_ReturnsTrue()
    {
        var result = Util.FullTextSearchChecker.IsFullTextSearchMatch("hello world", "hello");

        result.Should().BeTrue();
    }

    [Fact]
    public void IsFullTextSearchMatch_NoMatch_ReturnsFalse()
    {
        var result = Util.FullTextSearchChecker.IsFullTextSearchMatch("hello world", "xyz");

        result.Should().BeFalse();
    }

    [Fact]
    public void IsFullTextSearchMatch_CaseInsensitive_ReturnsTrue()
    {
        var result = Util.FullTextSearchChecker.IsFullTextSearchMatch("Hello World", "hello");

        result.Should().BeTrue();
    }

    [Fact]
    public void IsFullTextSearchMatch_NullTarget_ReturnsFalse()
    {
        var result = Util.FullTextSearchChecker.IsFullTextSearchMatch(null!, "search");

        result.Should().BeFalse();
    }

    [Fact]
    public void IsFullTextSearchMatch_PartialWordMatch_ReturnsTrue()
    {
        var result = Util.FullTextSearchChecker.IsFullTextSearchMatch(
            "The platform is great", "plat");

        result.Should().BeTrue();
    }

    [Fact]
    public void IsFullTextSearchMatch_ExactMatchAllWords_AllPresent_ReturnsTrue()
    {
        var result = Util.FullTextSearchChecker.IsFullTextSearchMatch(
            "The quick brown fox", "quick fox", exactMatchAllWords: true);

        result.Should().BeTrue();
    }

    [Fact]
    public void IsFullTextSearchMatch_ExactMatchAllWords_OneMissing_ReturnsFalse()
    {
        var result = Util.FullTextSearchChecker.IsFullTextSearchMatch(
            "The quick brown fox", "quick zebra", exactMatchAllWords: true);

        result.Should().BeFalse();
    }

    [Fact]
    public void IsFullTextSearchMatch_DefaultMode_AnyWordMatches_ReturnsTrue()
    {
        var result = Util.FullTextSearchChecker.IsFullTextSearchMatch(
            "The quick brown fox", "quick zebra", exactMatchAllWords: false);

        result.Should().BeTrue();
    }

    [Fact]
    public void IsFullTextSearchMatch_WithDiacritics_MatchesNormalized()
    {
        var result = Util.FullTextSearchChecker.IsFullTextSearchMatch("cafe", "cafe");

        result.Should().BeTrue();
    }

    // ── RemoveDiacritics ──

    [Fact]
    public void RemoveDiacritics_WithAccents_RemovesThem()
    {
        var result = Util.FullTextSearchChecker.RemoveDiacritics("\u00e9\u00e8\u00ea\u00eb");

        result.Should().Be("eeee");
    }

    [Fact]
    public void RemoveDiacritics_NullInput_ReturnsNull()
    {
        var result = Util.FullTextSearchChecker.RemoveDiacritics(null!);

        result.Should().BeNull();
    }

    // ── GetMatchWordRegexPattern ──

    [Fact]
    public void GetMatchWordRegexPattern_ReturnsWordBoundaryPattern()
    {
        var result = Util.FullTextSearchChecker.GetMatchWordRegexPattern("test");

        result.Should().Contain("\\btest\\b");
    }
}
