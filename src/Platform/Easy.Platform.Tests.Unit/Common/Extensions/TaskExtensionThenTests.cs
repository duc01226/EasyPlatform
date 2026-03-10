using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="TaskExtension"/> — Then, ThenAction, Recover, BoxedInTask, UnboxAsync.
/// </summary>
public class TaskExtensionThenTests : PlatformUnitTestBase
{
    [Fact]
    public async Task Then_TaskOfT_TransformsResult()
    {
        var result = await Task.FromResult(5).Then(x => x * 2);
        result.Should().Be(10);
    }

    [Fact]
    public async Task Then_TaskOfT_ToTask_ChainsExecution()
    {
        var sideEffect = 0;
        await Task.FromResult(7).Then(async x =>
        {
            await Task.CompletedTask;
            sideEffect = x + 3;
        });
        sideEffect.Should().Be(10);
    }

    [Fact]
    public async Task Then_Task_ReturnsNewValue()
    {
        var result = await Task.CompletedTask.Then(() => 42);
        result.Should().Be(42);
    }

    [Fact]
    public async Task Then_TaskOfT_ToTaskOfTR_ChainsAsync()
    {
        var result = await Task.FromResult(3)
            .Then(x => Task.FromResult(x.ToString()));
        result.Should().Be("3");
    }

    [Fact]
    public async Task ThenAction_Task_ExecutesSideEffect()
    {
        var executed = false;
        await Task.CompletedTask.ThenAction(() => executed = true);
        executed.Should().BeTrue();
    }

    [Fact]
    public async Task ThenAction_TaskOfT_ExecutesSideEffectAndReturnsOriginal()
    {
        var captured = 0;
        var result = await Task.FromResult(99).ThenAction(x => captured = x);
        result.Should().Be(99);
        captured.Should().Be(99);
    }

    [Fact]
    public async Task ThenActionAsync_TaskOfT_ExecutesAsyncSideEffect()
    {
        var captured = 0;
        var result = await Task.FromResult(55)
            .ThenActionAsync(async x =>
            {
                await Task.CompletedTask;
                captured = x;
            });
        result.Should().Be(55);
        captured.Should().Be(55);
    }

    [Fact]
    public async Task Then_FaultedTask_CallsFaultedBranch()
    {
        var faultedTask = Task.FromException<int>(new InvalidOperationException("boom"));
        var result = await faultedTask.Then(
            faulted: ex => -1,
            completed: val => val);
        result.Should().Be(-1);
    }

    [Fact]
    public async Task Then_CompletedTask_CallsCompletedBranch()
    {
        var result = await Task.FromResult(10).Then(
            faulted: _ => -1,
            completed: val => val + 5);
        result.Should().Be(15);
    }

    [Fact]
    public async Task Recover_FaultedTask_ReturnsFallback()
    {
        var faultedTask = Task.FromException<int>(new InvalidOperationException("fail"));
        var result = await faultedTask.Recover(_ => 0);
        result.Should().Be(0);
    }

    [Fact]
    public async Task Recover_CompletedTask_ReturnsOriginal()
    {
        var result = await Task.FromResult(42).Recover(_ => 0);
        result.Should().Be(42);
    }

    [Fact]
    public async Task BoxedInTask_WrapsValueInTask()
    {
        var result = await 123.BoxedInTask();
        result.Should().Be(123);
    }

    [Fact]
    public async Task UnboxAsync_CorrectType_Unboxes()
    {
        var source = Task.FromResult<object?>(42);
        var result = await source.UnboxAsync<int>();
        result.Should().Be(42);
    }

    [Fact]
    public async Task UnboxAsync_WrongType_ReturnsDefault()
    {
        var source = Task.FromResult<object?>("not an int");
        var result = await source.UnboxAsync<int>();
        result.Should().Be(0);
    }

    [Fact]
    public async Task Then_ValueTupleTasks_ChainsWithDestructuring()
    {
        var tupleTask = Task.FromResult((10, "hello"));
        var result = await tupleTask.Then((a, b) => Task.FromResult($"{a}-{b}"));
        result.Should().Be("10-hello");
    }

    [Fact]
    public async Task ThenActionAsync_Task_ExecutesAsyncAction()
    {
        var executed = false;
        await Task.CompletedTask.ThenActionAsync(async () =>
        {
            await Task.CompletedTask;
            executed = true;
        });
        executed.Should().BeTrue();
    }

    [Fact]
    public async Task Then_ThreeTupleTask_ChainsWithDestructuring()
    {
        var tupleTask = Task.FromResult((1, 2, 3));
        var result = await tupleTask.Then((a, b, c) => Task.FromResult(a + b + c));
        result.Should().Be(6);
    }
}
