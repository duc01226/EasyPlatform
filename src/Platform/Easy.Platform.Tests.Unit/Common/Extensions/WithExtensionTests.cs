using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="WithExtension"/>.
/// </summary>
public class WithExtensionTests : PlatformUnitTestBase
{
    // ── With (Action) ──

    [Fact]
    public void With_Action_AppliesActionsAndReturnsTarget()
    {
        var target = new TestObject();

        var result = target.With(
            x => x.Name = "hello",
            x => x.Value = 42);

        result.Should().BeSameAs(target);
        result.Name.Should().Be("hello");
        result.Value.Should().Be(42);
    }

    [Fact]
    public void With_Action_MultipleActions_AllApplied()
    {
        var target = new TestObject();

        var result = target.With(
            x => x.Name = "a",
            x => x.Name += "b",
            x => x.Name += "c");

        result.Name.Should().Be("abc");
    }

    // ── With (Func<T, T>) ──

    [Fact]
    public void With_FuncReturningTarget_AppliesAndReturnsTarget()
    {
        var target = new TestObject();

        var result = target.With(
            x => { x.Name = "test"; return x; });

        result.Should().BeSameAs(target);
        result.Name.Should().Be("test");
    }

    // ── With (async Func<T, Task>) ──

    [Fact]
    public async Task With_AsyncFunc_AppliesAndReturnsTarget()
    {
        var target = new TestObject();

        var result = await target.With(
            async x =>
            {
                await Task.CompletedTask;
                x.Name = "async-hello";
            });

        result.Should().BeSameAs(target);
        result.Name.Should().Be("async-hello");
    }

    // ── WithIf (bool, Action) ──

    [Fact]
    public void WithIf_BoolTrue_AppliesActions()
    {
        var target = new TestObject();

        var result = target.WithIf(true, x => x.Name = "applied");

        result.Name.Should().Be("applied");
        result.Should().BeSameAs(target);
    }

    [Fact]
    public void WithIf_BoolFalse_SkipsActions()
    {
        var target = new TestObject { Name = "original" };

        var result = target.WithIf(false, x => x.Name = "changed");

        result.Name.Should().Be("original");
        result.Should().BeSameAs(target);
    }

    // ── WithIf (Func<T, bool>, Action) ──

    [Fact]
    public void WithIf_FuncConditionTrue_AppliesActions()
    {
        var target = new TestObject { Value = 10 };

        var result = target.WithIf(x => x.Value > 5, x => x.Name = "big");

        result.Name.Should().Be("big");
    }

    [Fact]
    public void WithIf_FuncConditionFalse_SkipsActions()
    {
        var target = new TestObject { Value = 2, Name = "original" };

        var result = target.WithIf(x => x.Value > 5, x => x.Name = "big");

        result.Name.Should().Be("original");
    }

    // ── WithIf (async, bool, Func<T, Task<T>>) ──

    [Fact]
    public async Task WithIf_AsyncBoolTrue_AppliesActions()
    {
        var target = new TestObject();

        var result = await target.WithIf(
            true,
            async x =>
            {
                await Task.CompletedTask;
                x.Name = "async-applied";
                return x;
            });

        result.Name.Should().Be("async-applied");
    }

    [Fact]
    public async Task WithIf_AsyncBoolFalse_SkipsActions()
    {
        var target = new TestObject { Name = "original" };

        var result = await target.WithIf(
            false,
            async x =>
            {
                await Task.CompletedTask;
                x.Name = "changed";
                return x;
            });

        result.Name.Should().Be("original");
    }

    // ── With (Task<T>, Action) ──

    [Fact]
    public async Task With_TaskTarget_AppliesActions()
    {
        var target = Task.FromResult(new TestObject());

        var result = await target.With(x => x.Name = "from-task");

        result.Name.Should().Be("from-task");
    }

    // ── WithIf (Task<T>, bool, Action) ──

    [Fact]
    public async Task WithIf_TaskTarget_BoolTrue_AppliesActions()
    {
        var target = Task.FromResult(new TestObject());

        var result = await target.WithIf(true, x => x.Name = "task-applied");

        result.Name.Should().Be("task-applied");
    }

    [Fact]
    public async Task WithIf_TaskTarget_BoolFalse_SkipsActions()
    {
        var target = Task.FromResult(new TestObject { Name = "original" });

        var result = await target.WithIf(false, x => x.Name = "changed");

        result.Name.Should().Be("original");
    }

    // ── Test helper ──

    private sealed class TestObject
    {
        public string Name { get; set; } = string.Empty;
        public int Value { get; set; }
    }
}
