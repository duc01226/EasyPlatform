using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Utils;

/// <summary>
/// Unit tests for <see cref="Util.PathBuilder"/>.
/// </summary>
public sealed class UtilPathBuilderTests : PlatformUnitTestBase
{
    [Fact]
    public void ConcatRelativePath_MultipleParts_ConcatenatesWithSlash()
    {
        var result = Util.PathBuilder.ConcatRelativePath("api", "v1", "users");

        result.Should().Be("api/v1/users");
    }

    [Fact]
    public void ConcatRelativePath_PartsWithTrailingAndLeadingSlashes_TrimsCorrectly()
    {
        var result = Util.PathBuilder.ConcatRelativePath("api/", "/v1/", "/users");

        result.Should().Be("api/v1/users");
    }

    [Fact]
    public void ConcatRelativePath_SinglePart_ReturnsItself()
    {
        var result = Util.PathBuilder.ConcatRelativePath("onlypart");

        result.Should().Be("onlypart");
    }

    [Fact]
    public void ConcatRelativePath_EmptyMiddlePart_ConcatenatesWithSlash()
    {
        var result = Util.PathBuilder.ConcatRelativePath("start", "", "end");

        result.Should().Be("start/end");
    }
}
