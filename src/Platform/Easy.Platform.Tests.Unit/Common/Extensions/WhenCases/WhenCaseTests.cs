using Easy.Platform.Common.Extensions.WhenCases;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions.WhenCases;

/// <summary>
/// Unit tests for <see cref="WhenCase{TSource, TTarget}"/> core behaviors.
/// </summary>
public class WhenCaseTests : PlatformUnitTestBase
{
    // ── Test hierarchy for WhenIs ──

    private class Animal
    {
        public string Name { get; init; } = string.Empty;
    }

    private sealed class Dog : Animal;
    private sealed class Cat : Animal;

    // ── WhenValue ──

    [Fact]
    public void WhenValue_MatchingCase_ReturnsMappedResult()
    {
        var whenCase = WhenCase<int, string>.WhenValue(1, 1, s => $"matched:{s}");

        var result = whenCase.Execute();

        result.Should().Be("matched:1");
    }

    [Fact]
    public void WhenValue_NonMatchingCase_ReturnsDefault()
    {
        var whenCase = WhenCase<int, string>.WhenValue(1, 2, s => $"matched:{s}");

        var result = whenCase.Execute();

        result.Should().BeNull();
    }

    // ── When with predicate ──

    [Fact]
    public void When_PredicateTrue_ReturnsResult()
    {
        var whenCase = new WhenCase<int, string>(10, s => s > 5, s => $"big:{s}");

        var result = whenCase.Execute();

        result.Should().Be("big:10");
    }

    [Fact]
    public void When_PredicateFalse_ReturnsDefault()
    {
        var whenCase = new WhenCase<int, string>(3, s => s > 5, s => $"big:{s}");

        var result = whenCase.Execute();

        result.Should().BeNull();
    }

    // ── WhenIs type matching ──

    [Fact]
    public void WhenIs_MatchingType_ReturnsResult()
    {
        var source = (Animal)new Dog { Name = "Rex" };
        var whenCase = WhenCase<Animal, string>.WhenIs<Dog>(source, dog => dog.Name);

        var result = whenCase.Execute();

        result.Should().Be("Rex");
    }

    [Fact]
    public void WhenIs_NonMatchingType_ReturnsDefault()
    {
        var source = (Animal)new Cat { Name = "Whiskers" };
        var whenCase = WhenCase<Animal, string>.WhenIs<Dog>(source, dog => dog.Name);

        var result = whenCase.Execute();

        result.Should().BeNull();
    }

    // ── Else ──

    [Fact]
    public void Else_NoMatchExists_ReturnsElseResult()
    {
        var whenCase = WhenCase<int, string>
            .WhenValue(99, 1, _ => "one")
            .Else(_ => "fallback");

        var result = whenCase.Execute();

        result.Should().Be("fallback");
    }

    [Fact]
    public void Else_MatchExists_ReturnsMatchedResult()
    {
        var whenCase = WhenCase<int, string>
            .WhenValue(1, 1, _ => "one")
            .Else(_ => "fallback");

        var result = whenCase.Execute();

        result.Should().Be("one");
    }

    // ── Execute ──

    [Fact]
    public void Execute_ReturnsFirstMatchedResult()
    {
        var whenCase = WhenCase<string, int>
            .WhenValue("hello", "hello", _ => 42);

        var result = whenCase.Execute();

        result.Should().Be(42);
    }

    // ── HasMatchedCase ──

    [Fact]
    public void HasMatchedCase_WhenMatched_ReturnsTrue()
    {
        var whenCase = WhenCase<int, string>.WhenValue(5, 5, _ => "five");

        var result = whenCase.HasMatchedCase();

        result.Should().BeTrue();
    }

    [Fact]
    public void HasMatchedCase_WhenNotMatched_ReturnsFalse()
    {
        var whenCase = WhenCase<int, string>.WhenValue(5, 10, _ => "ten");

        var result = whenCase.HasMatchedCase();

        result.Should().BeFalse();
    }

    // ── Multiple When - first match wins ──

    [Fact]
    public void When_MultipleCases_FirstMatchWins()
    {
        var whenCase = WhenCase<int, string>
            .WhenValue(5, 5, _ => "first")
            .WhenValue(5, _ => "second")
            .Else(_ => "else");

        var result = whenCase.Execute();

        result.Should().Be("first");
    }

    // ── ExecuteAsync ──

    [Fact]
    public async Task ExecuteAsync_WithAsyncThen_ReturnsResult()
    {
        var whenCase = WhenCase<int, string>
            .WhenValue(7, 7, s => Task.FromResult($"async:{s}"));

        var result = await whenCase.ExecuteAsync();

        result.Should().Be("async:7");
    }

    // ── Implicit operator ──

    [Fact]
    public void ImplicitOperator_ConvertsToTarget()
    {
        var whenCase = WhenCase<int, string>.WhenValue(3, 3, _ => "three");

        string result = whenCase;

        result.Should().Be("three");
    }

    // ── Else throws on duplicate ──

    [Fact]
    public void Else_CalledTwice_ThrowsException()
    {
        var whenCase = WhenCase<int, string>
            .WhenValue(1, 1, _ => "one")
            .Else(_ => "fallback");

        var act = () => whenCase.Else(_ => "second fallback");

        act.Should().Throw<Exception>().WithMessage("*Else case has been added*");
    }

    // ── When with bool case ──

    [Fact]
    public void When_BoolCaseTrue_ReturnsResult()
    {
        var source = 42;
        var whenCase = new WhenCase<int, string>(source)
            .When(true, s => $"always:{s}");

        var result = whenCase.Execute();

        result.Should().Be("always:42");
    }

    // ── WhenValue with null source ──

    [Fact]
    public void WhenValue_NullSourceMatchesNullCase_ReturnsResult()
    {
        var whenCase = WhenCase<string?, string>
            .WhenValue(null, null, _ => "both-null");

        var result = whenCase.Execute();

        result.Should().Be("both-null");
    }
}
