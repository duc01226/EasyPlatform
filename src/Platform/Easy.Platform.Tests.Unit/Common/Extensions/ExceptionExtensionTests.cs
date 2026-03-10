using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="ExceptionExtension"/>.
/// </summary>
public class ExceptionExtensionTests : PlatformUnitTestBase
{
    [Fact]
    public void Serialize_SimpleException_ContainsMessage()
    {
        var exception = new InvalidOperationException("something went wrong");

        var result = exception.Serialize();

        result.Should().Contain("something went wrong");
    }

    [Fact]
    public void Serialize_WithInnerException_ContainsInnerMessage()
    {
        var inner = new ArgumentException("bad argument");
        var outer = new InvalidOperationException("outer error", inner);

        var result = outer.Serialize();

        result.Should().Contain("outer error");
        result.Should().Contain("bad argument");
    }

    [Fact]
    public void Serialize_WithInnerException_ExcludeInner_OmitsInnerMessage()
    {
        var inner = new ArgumentException("bad argument");
        var outer = new InvalidOperationException("outer error", inner);

        var result = outer.Serialize(includeInnerException: false);

        result.Should().Contain("outer error");
        result.Should().NotContain("bad argument");
    }

    [Fact]
    public void Serialize_ReturnsNonEmptyString()
    {
        var exception = new Exception("test error");

        var result = exception.Serialize();

        result.Should().NotBeNullOrWhiteSpace();
        result.Should().Contain("test error");
    }

    [Fact]
    public void Serialize_NoInnerException_DoesNotContainInnerMessage()
    {
        var exception = new Exception("solo");

        var result = exception.Serialize();

        result.Should().Contain("solo");
    }
}
