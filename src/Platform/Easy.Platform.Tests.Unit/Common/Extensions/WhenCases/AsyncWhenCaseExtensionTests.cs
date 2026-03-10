using Easy.Platform.Common.Extensions.WhenCases;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions.WhenCases;

/// <summary>
/// Unit tests for <see cref="AsyncWhenCaseExtension"/>.
/// </summary>
public class AsyncWhenCaseExtensionTests : PlatformUnitTestBase
{
    // ── Test hierarchy for WhenIs ──

    private class Vehicle
    {
        public string Type { get; init; } = string.Empty;
    }

    private sealed class Car : Vehicle;
    private sealed class Truck : Vehicle;

    // ── When async chain ──

    [Fact]
    public async Task When_AsyncChain_AppendsCase()
    {
        var result = await Task.FromResult(
                WhenCase<int, string>.WhenValue(5, 1, _ => "one"))
            .When(s => s == 5, s => $"five:{s}")
            .Execute();

        result.Should().Be("five:5");
    }

    [Fact]
    public async Task When_AsyncChainFuncBool_AppendsCase()
    {
        var taskCase = Task.FromResult(
            new WhenCase<int, string>(10)
                .When(s => s == 1, _ => "one"));

        static string AlwaysResult(int _) => "always";
        var result = await AsyncWhenCaseExtension
            .When(taskCase, () => true, AlwaysResult)
            .Execute();

        result.Should().Be("always");
    }

    [Fact]
    public async Task When_AsyncChainWithAsyncThen_ReturnsResult()
    {
        var result = await Task.FromResult(
                new WhenCase<int, string>(7))
            .When(s => s == 7, s => Task.FromResult($"async:{s}"))
            .Execute();

        result.Should().Be("async:7");
    }

    // ── WhenIs async chain ──

    [Fact]
    public async Task WhenIs_AsyncChain_MatchingType_ReturnsResult()
    {
        var source = (Vehicle)new Car { Type = "sedan" };

        var result = await Task.FromResult(
                new WhenCase<Vehicle, string>(source))
            .WhenIs<Vehicle, string, Car>(c => c.Type)
            .Execute();

        result.Should().Be("sedan");
    }

    [Fact]
    public async Task WhenIs_AsyncChain_NonMatchingType_ReturnsDefault()
    {
        var source = (Vehicle)new Truck { Type = "pickup" };

        var result = await Task.FromResult(
                new WhenCase<Vehicle, string>(source))
            .WhenIs<Vehicle, string, Car>(c => c.Type)
            .Execute();

        result.Should().BeNull();
    }

    // ── WhenValue async chain ──

    [Fact]
    public async Task WhenValue_AsyncChain_MatchingCase_ReturnsResult()
    {
        var result = await Task.FromResult(
                new WhenCase<string, int>("B"))
            .WhenValue("A", _ => 1)
            .WhenValue("B", _ => 2)
            .Execute();

        result.Should().Be(2);
    }

    [Fact]
    public async Task WhenValue_AsyncChain_NoMatch_ReturnsDefault()
    {
        var result = await Task.FromResult(
                new WhenCase<string, int>("Z"))
            .WhenValue("A", _ => 1)
            .Execute();

        result.Should().Be(0);
    }

    // ── Else async chain ──

    [Fact]
    public async Task Else_AsyncChain_NoMatch_ReturnsFallback()
    {
        var result = await Task.FromResult(
                new WhenCase<int, string>(99))
            .When(s => s == 1, _ => "one")
            .Else(s => $"fallback:{s}")
            .Execute();

        result.Should().Be("fallback:99");
    }

    [Fact]
    public async Task Else_AsyncChain_HasMatch_ReturnsMatchedResult()
    {
        var result = await Task.FromResult(
                WhenCase<int, string>.WhenValue(1, 1, _ => "one"))
            .Else(_ => "fallback")
            .Execute();

        result.Should().Be("one");
    }

    [Fact]
    public async Task Else_AsyncChain_WithAsyncThen_ReturnsFallback()
    {
        var result = await Task.FromResult(
                new WhenCase<int, string>(50))
            .When(s => s == 1, _ => "one")
            .Else(s => Task.FromResult($"async-fallback:{s}"))
            .Execute();

        result.Should().Be("async-fallback:50");
    }

    // ── Execute async chain ──

    [Fact]
    public async Task Execute_AsyncChain_FullPipeline_ReturnsResult()
    {
        var result = await Task.FromResult(
                new WhenCase<string, int>("C"))
            .WhenValue("A", _ => 1)
            .WhenValue("B", _ => 2)
            .WhenValue("C", _ => 3)
            .Else(_ => -1)
            .Execute();

        result.Should().Be(3);
    }

    // ── WhenCase<TSource> (action-based) async chain ──

    [Fact]
    public async Task When_ActionBased_AsyncChain_ExecutesSideEffect()
    {
        var captured = string.Empty;

        var whenCase = await Task.FromResult(new WhenCase<string>("hello"))
            .When(s => s == "hello", s => { captured = $"got:{s}"; });
        await whenCase.ExecuteAsync();

        captured.Should().Be("got:hello");
    }

    [Fact]
    public async Task WhenValue_ActionBased_AsyncChain_ExecutesSideEffect()
    {
        var captured = string.Empty;

        var whenCase = await Task.FromResult(new WhenCase<string>("test"))
            .WhenValue("test", s => { captured = s; });
        await whenCase.ExecuteAsync();

        captured.Should().Be("test");
    }

    // ── WhenIs action-based async chain ──

    [Fact]
    public async Task WhenIs_ActionBased_AsyncChain_ExecutesSideEffect()
    {
        var captured = string.Empty;
        var source = (Vehicle)new Car { Type = "coupe" };

        var whenCase = await Task.FromResult(new WhenCase<Vehicle>(source))
            .WhenIs<Vehicle, Car>(c => { captured = c.Type; });
        await whenCase.ExecuteAsync();

        captured.Should().Be("coupe");
    }
}
