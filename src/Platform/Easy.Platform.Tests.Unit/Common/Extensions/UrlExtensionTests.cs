using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="UrlExtension"/>.
/// </summary>
public class UrlExtensionTests : PlatformUnitTestBase
{
    [Fact]
    public void ToUri_ValidUrl_ReturnsUri()
    {
        var uri = "https://example.com/path".ToUri();

        uri.Should().NotBeNull();
        uri.Host.Should().Be("example.com");
    }

    [Fact]
    public void ToUri_WithQueryParams_AppendsParams()
    {
        var uri = "https://example.com".ToUri(("key", "val"));

        uri.Query.Should().Contain("key=val");
    }

    [Fact]
    public void WithUrlQueryParams_Uri_AppendsNewParam()
    {
        var uri = new Uri("https://example.com?a=1");

        var result = uri.WithUrlQueryParams(("b", "2"));

        result.Query.Should().Contain("a=1");
        result.Query.Should().Contain("b=2");
    }

    [Fact]
    public void WithUrlQueryParams_Uri_EmptyParams_ReturnsSameUri()
    {
        var uri = new Uri("https://example.com?a=1");

        var result = uri.WithUrlQueryParams();

        result.Should().Be(uri);
    }

    [Fact]
    public void WithUrlQueryParams_String_AddsParamsToRelativeUrl()
    {
        var result = "/api/data".WithUrlQueryParams(("page", "2"));

        result.Should().Be("/api/data?page=2");
    }

    [Fact]
    public void WithUrlQueryParams_String_ExistingQuery_MergesParams()
    {
        var result = "/api/data?page=1".WithUrlQueryParams(("sort", "asc"));

        result.Should().Contain("page=1");
        result.Should().Contain("sort=asc");
    }

    [Fact]
    public void UpsertQueryParams_String_NewParam_Adds()
    {
        var result = "a=1".UpsertQueryParams(("b", "2"));

        result.Should().Contain("a=1");
        result.Should().Contain("b=2");
    }

    [Fact]
    public void UpsertQueryParams_String_ExistingParam_Replaces()
    {
        var result = "a=1".UpsertQueryParams(("a", "99"));

        result.Should().Contain("a=99");
        result.Should().NotContain("a=1");
    }

    [Fact]
    public void TryParseUri_ValidUrl_ReturnsUri()
    {
        var result = "https://example.com".TryParseUri();

        result.Should().NotBeNull();
        result!.Host.Should().Be("example.com");
    }

    [Fact]
    public void TryParseUri_InvalidUrl_ReturnsNull()
    {
        "not a url %%%".TryParseUri().Should().BeNull();
    }

    [Fact]
    public void Origin_StandardPort_ReturnsSchemeAndHost()
    {
        var uri = new Uri("https://example.com:443/path?q=1");

        uri.Origin().Should().Be("https://example.com");
    }

    [Fact]
    public void Origin_CustomPort_IncludesPort()
    {
        var uri = new Uri("https://example.com:8080/path");

        uri.Origin().Should().Be("https://example.com:8080");
    }

    [Fact]
    public void ConcatRelativePath_CombinesPaths()
    {
        var uri = new Uri("https://example.com/api/");

        var result = uri.ConcatRelativePath("/v2/items");

        result.AbsolutePath.Should().Be("/api/v2/items");
    }

    [Fact]
    public void QueryParams_ExtractsDictionary()
    {
        var uri = new Uri("https://example.com?a=1&b=2");
        var result = uri.QueryParams();

        result.Should().ContainKey("a").WhoseValue.Should().Be("1");
        result.Should().ContainKey("b").WhoseValue.Should().Be("2");
    }

    [Fact]
    public void QueryParams_NoQuery_ReturnsEmpty()
    {
        new Uri("https://example.com").QueryParams().Should().BeEmpty();
    }

    [Fact]
    public void ToQueryString_BuildsQueryString()
    {
        var dict = new Dictionary<string, string> { ["a"] = "1", ["b"] = "2" };
        var result = dict.ToQueryString();

        result.Should().StartWith("?");
        result.Should().Contain("a%3D1");
        result.Should().Contain("b%3D2");
    }

    [Fact]
    public void Path_ReturnsPathOnly()
    {
        var uri = new Uri("https://example.com/api/items?q=1");

        uri.Path().Should().Be("/api/items");
    }

    [Theory]
    [InlineData("https://example.com", true)]
    [InlineData("http://example.com", true)]
    [InlineData("/api/items", false)]
    [InlineData(null, false)]
    public void IsAbsoluteHttpUrl_ReturnsExpected(string? url, bool expected)
    {
        url.IsAbsoluteHttpUrl().Should().Be(expected);
    }

    [Theory]
    [InlineData("www.example.com", true)]
    [InlineData("example.com", false)]
    [InlineData(null, false)]
    public void IsWwwPrefixed_ReturnsExpected(string? url, bool expected)
    {
        url.IsWwwPrefixed().Should().Be(expected);
    }

    [Theory]
    [InlineData("https://example.com", true)]
    [InlineData("www.example.com", true)]
    [InlineData("just-text", false)]
    public void IsAbsoluteHttpOrWwwUrl_ReturnsExpected(string? url, bool expected)
    {
        url.IsAbsoluteHttpOrWwwUrl().Should().Be(expected);
    }

    [Fact]
    public void IsNotAbsoluteHttpOrWwwUrl_PlainText_ReturnsTrue()
    {
        "just-text".IsNotAbsoluteHttpOrWwwUrl().Should().BeTrue();
    }
}
