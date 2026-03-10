using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="ActionExtension"/>.
/// </summary>
public class ActionExtensionTests : PlatformUnitTestBase
{
    // -- ToFunc (Action) --

    [Fact]
    public void ToFunc_Action_InvokesAndReturnsNull()
    {
        var invoked = false;
        Action action = () => invoked = true;

        var func = action.ToFunc();
        var result = func();

        invoked.Should().BeTrue();
        result.Should().BeNull();
    }

    // -- ToFunc<T> (Action<T>) --

    [Fact]
    public void ToFunc_ActionT_InvokesWithArgAndReturnsNull()
    {
        var captured = 0;
        Action<int> action = x => captured = x;

        var func = action.ToFunc();
        var result = func(42);

        captured.Should().Be(42);
        result.Should().BeNull();
    }

    // -- ToFunc<T1, T2> (Action<T1, T2>) --

    [Fact]
    public void ToFunc_ActionT1T2_InvokesWithArgsAndReturnsNull()
    {
        var sum = 0;
        Action<int, int> action = (a, b) => sum = a + b;

        var func = action.ToFunc();
        var result = func(3, 7);

        sum.Should().Be(10);
        result.Should().BeNull();
    }

    // -- ToAsyncFunc (Func<Task>) --

    [Fact]
    public async Task ToAsyncFunc_FuncTask_InvokesAndReturnsObject()
    {
        var invoked = false;
        Func<Task> action = () => { invoked = true; return Task.CompletedTask; };

        var func = action.ToAsyncFunc();
        var result = await func();

        invoked.Should().BeTrue();
        result.Should().NotBeNull();
    }

    // -- ToAsyncFunc<T> (Func<T, Task>) --

    [Fact]
    public async Task ToAsyncFunc_FuncTTask_InvokesWithArgAndReturnsObject()
    {
        var captured = 0;
        Func<int, Task> action = x => { captured = x; return Task.CompletedTask; };

        var func = action.ToAsyncFunc();
        var result = await func(99);

        captured.Should().Be(99);
        result.Should().NotBeNull();
    }

    // -- ToAsyncFunc<T1, T2> (Func<T1, T2, Task>) --

    [Fact]
    public async Task ToAsyncFunc_FuncT1T2Task_InvokesWithArgsAndReturnsObject()
    {
        var sum = 0;
        Func<int, int, Task> action = (a, b) => { sum = a + b; return Task.CompletedTask; };

        var func = action.ToAsyncFunc();
        var result = await func(5, 15);

        sum.Should().Be(20);
        result.Should().NotBeNull();
    }
}
