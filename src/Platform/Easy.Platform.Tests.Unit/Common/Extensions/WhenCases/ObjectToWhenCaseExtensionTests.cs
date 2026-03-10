using Easy.Platform.Common.Extensions.WhenCases;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions.WhenCases;

/// <summary>
/// Unit tests for <see cref="ObjectToWhenCaseExtension"/>.
/// </summary>
public class ObjectToWhenCaseExtensionTests : PlatformUnitTestBase
{
    // ── Test hierarchy for WhenIs ──

    private class Shape
    {
        public string Kind { get; init; } = string.Empty;
    }

    private sealed class Circle : Shape;
    private sealed class Square : Shape;

    // ── When with predicate ──

    [Fact]
    public void When_PredicateTrue_CreatesMatchingWhenCase()
    {
        var result = 10
            .When<int, string>(s => s > 5, s => $"big:{s}")
            .Execute();

        result.Should().Be("big:10");
    }

    [Fact]
    public void When_PredicateFalse_ReturnsDefault()
    {
        var result = 2
            .When<int, string>(s => s > 5, s => $"big:{s}")
            .Execute();

        result.Should().BeNull();
    }

    // ── When with Func<bool> predicate ──

    [Fact]
    public void When_FuncBoolTrue_CreatesMatchingWhenCase()
    {
        var flag = true;
        var result = "hello"
            .When<string, int>(() => flag, _ => 42)
            .Execute();

        result.Should().Be(42);
    }

    // ── WhenValue via extension ──

    [Fact]
    public void WhenValue_MatchingValue_ReturnsResult()
    {
        var result = "apple"
            .WhenValue<string, string>("apple", s => $"fruit:{s}")
            .Execute();

        result.Should().Be("fruit:apple");
    }

    [Fact]
    public void WhenValue_NonMatchingValue_ReturnsDefault()
    {
        var result = "banana"
            .WhenValue<string, string>("apple", s => $"fruit:{s}")
            .Execute();

        result.Should().BeNull();
    }

    // ── WhenIs type dispatch via extension ──

    [Fact]
    public void WhenIs_MatchingType_ReturnsResult()
    {
        var shape = (Shape)new Circle { Kind = "round" };

        var result = shape
            .WhenIs<Shape, Circle, string>(c => c.Kind)
            .Execute();

        result.Should().Be("round");
    }

    [Fact]
    public void WhenIs_NonMatchingType_ReturnsDefault()
    {
        var shape = (Shape)new Square { Kind = "angular" };

        var result = shape
            .WhenIs<Shape, Circle, string>(c => c.Kind)
            .Execute();

        result.Should().BeNull();
    }

    // ── Fluent chaining ──

    [Fact]
    public void WhenValue_FluentChaining_ReturnsFirstMatch()
    {
        var result = "B"
            .WhenValue<string, int>("A", _ => 1)
            .WhenValue("B", _ => 2)
            .WhenValue("C", _ => 3)
            .Execute();

        result.Should().Be(2);
    }

    [Fact]
    public void When_FluentChaining_MultiplePredicates()
    {
        var result = 15
            .When<int, string>(s => s < 10, _ => "small")
            .When(s => s >= 10, _ => "large")
            .Execute();

        result.Should().Be("large");
    }

    // ── Else via extension chain ──

    [Fact]
    public void Else_AfterNoMatch_ReturnsFallback()
    {
        var result = "Z"
            .WhenValue<string, int>("A", _ => 1)
            .WhenValue("B", _ => 2)
            .Else(_ => -1)
            .Execute();

        result.Should().Be(-1);
    }

    // ── Execute via extension returns result ──

    [Fact]
    public void Execute_ViaExtensionChain_ReturnsCorrectValue()
    {
        var result = 100
            .When<int, string>(s => s == 100, _ => "century")
            .Execute();

        result.Should().Be("century");
    }

    // ── WhenCase<TSource> (action-based, no TTarget) ──

    [Fact]
    public void When_ActionOverload_ExecutesSideEffect()
    {
        var captured = string.Empty;

        5.When(s => s == 5, s => { captured = $"got:{s}"; })
            .Execute();

        captured.Should().Be("got:5");
    }

    // ── WhenValue with async then ──

    [Fact]
    public async Task WhenValue_AsyncThen_ReturnsResult()
    {
        var result = await "test"
            .WhenValue<string, string>("test", s => Task.FromResult($"async:{s}"))
            .ExecuteAsync();

        result.Should().Be("async:test");
    }

    // ── WhenIs action-based (WhenCase<TSource>) ──

    [Fact]
    public void WhenIs_ActionOverload_ExecutesSideEffect()
    {
        var captured = string.Empty;
        var shape = (Shape)new Circle { Kind = "disc" };

        shape.WhenIs<Shape, Circle>(c => { captured = c.Kind; })
            .Execute();

        captured.Should().Be("disc");
    }
}
