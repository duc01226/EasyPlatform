using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="EnsureExtension"/>.
/// </summary>
public class EnsureExtensionTests : PlatformUnitTestBase
{
    // -- EnsureNotNull --

    [Fact]
    public void EnsureNotNull_NonNull_ReturnsValue()
    {
        var value = "hello";

        var result = value.EnsureNotNull(() => new InvalidOperationException("was null"));

        result.Should().Be("hello");
    }

    [Fact]
    public void EnsureNotNull_Null_ThrowsCustomException()
    {
        var act = () => ((string)null!).EnsureNotNull(() => new InvalidOperationException("was null"));

        act.Should().Throw<InvalidOperationException>().WithMessage("was null");
    }

    // -- Ensure (with Func<Exception>) --

    [Fact]
    public void Ensure_ConditionMet_ReturnsValue()
    {
        var value = 42;

        var result = value.Ensure(v => v > 0, () => new ArgumentException("must be positive"));

        result.Should().Be(42);
    }

    [Fact]
    public void Ensure_ConditionFailed_ThrowsCustomException()
    {
        var value = -1;

        var act = () => value.Ensure(v => v > 0, () => new ArgumentException("must be positive"));

        act.Should().Throw<ArgumentException>().WithMessage("must be positive");
    }

    // -- Ensure (with string errorMsg) --

    [Fact]
    public void Ensure_WithStringMsg_ConditionFailed_ThrowsWithMessage()
    {
        var value = "";

        var act = () => value.Ensure(v => !string.IsNullOrEmpty(v), "value cannot be empty");

        act.Should().Throw<Exception>().WithMessage("value cannot be empty");
    }

    // -- Chaining --

    [Fact]
    public void Ensure_ChainedCalls_AllPass_ReturnsFinalValue()
    {
        var value = 10;

        var result = value
            .Ensure(v => v > 0, "must be positive")
            .Ensure(v => v <= 100, "must be at most 100")
            .Ensure(v => v % 2 == 0, "must be even");

        result.Should().Be(10);
    }
}
