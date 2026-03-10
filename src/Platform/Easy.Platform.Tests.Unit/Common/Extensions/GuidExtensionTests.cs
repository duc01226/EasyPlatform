using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="GuidExtension"/>.
/// </summary>
public class GuidExtensionTests : PlatformUnitTestBase
{
    // ── ToGuid ──

    [Fact]
    public void ToGuid_ValidGuidString_ReturnsGuid()
    {
        var guidString = "d2719b1e-1c4b-4c8a-9f3e-5a8b7c6d0e1f";

        var result = guidString.ToGuid();

        result.Should().NotBeNull();
        result.Should().Be(Guid.Parse(guidString));
    }

    [Fact]
    public void ToGuid_InvalidString_ReturnsNull()
    {
        var result = "not-a-guid".ToGuid();

        result.Should().BeNull();
    }

    [Fact]
    public void ToGuid_EmptyString_ReturnsNull()
    {
        var result = "".ToGuid();

        result.Should().BeNull();
    }

    [Fact]
    public void ToGuid_EmptyGuidString_ReturnsEmptyGuid()
    {
        var result = Guid.Empty.ToString().ToGuid();

        result.Should().Be(Guid.Empty);
    }

    [Fact]
    public void ToGuid_GuidWithoutDashes_ReturnsGuid()
    {
        var guid = Guid.NewGuid();
        var noDashString = guid.ToString("N");

        var result = noDashString.ToGuid();

        result.Should().Be(guid);
    }
}
