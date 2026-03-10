using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="TaskExtension"/> — conditional, tuples, thread lock.
/// </summary>
public class TaskExtensionConditionalTests : PlatformUnitTestBase
{
    [Fact]
    public async Task ThenActionIf_True_ExecutesAction()
    {
        var captured = 0;
        var result = await Task.FromResult(5).ThenActionIf(true, x => captured = x);
        result.Should().Be(5);
        captured.Should().Be(5);
    }

    [Fact]
    public async Task ThenActionIf_False_SkipsAction()
    {
        var captured = 0;
        var result = await Task.FromResult(5).ThenActionIf(false, x => captured = x);
        result.Should().Be(5);
        captured.Should().Be(0);
    }

    [Fact]
    public async Task ThenActionIf_FuncTrue_ExecutesAction()
    {
        var captured = 0;
        var result = await Task.FromResult(10)
            .ThenActionIf(x => x > 5, x => captured = x);
        result.Should().Be(10);
        captured.Should().Be(10);
    }

    [Fact]
    public async Task ThenActionIf_FuncFalse_SkipsAction()
    {
        var captured = 0;
        var result = await Task.FromResult(2)
            .ThenActionIf(x => x > 5, x => captured = x);
        result.Should().Be(2);
        captured.Should().Be(0);
    }

    [Fact]
    public async Task ThenActionIfAsync_True_ExecutesAsync()
    {
        var captured = 0;
        var result = await Task.FromResult(7)
            .ThenActionIfAsync(true, async x =>
            {
                await Task.CompletedTask;
                captured = x;
            });
        result.Should().Be(7);
        captured.Should().Be(7);
    }

    [Fact]
    public async Task ThenActionIfAsync_False_SkipsAsync()
    {
        var captured = 0;
        var result = await Task.FromResult(7)
            .ThenActionIfAsync(false, async x =>
            {
                await Task.CompletedTask;
                captured = x;
            });
        result.Should().Be(7);
        captured.Should().Be(0);
    }

    [Fact]
    public async Task ThenIf_True_AppliesTransform()
    {
        var result = await Task.FromResult(10)
            .ThenIf(x => x > 5, x => Task.FromResult(x * 2));
        result.Should().Be(20);
    }

    [Fact]
    public async Task ThenIf_False_ReturnsOriginal()
    {
        var result = await Task.FromResult(3)
            .ThenIf(x => x > 5, x => Task.FromResult(x * 2));
        result.Should().Be(3);
    }

    [Fact]
    public async Task ThenIfOrDefault_True_AppliesTransform()
    {
        var result = await Task.FromResult(10)
            .ThenIfOrDefault(x => x > 5, x => Task.FromResult(x * 2));
        result.Should().Be(20);
    }

    [Fact]
    public async Task ThenIfOrDefault_False_ReturnsDefault()
    {
        var result = await Task.FromResult(3)
            .ThenIfOrDefault(x => x > 5, x => Task.FromResult(x * 2));
        result.Should().Be(0);
    }

    [Fact]
    public async Task ThenGetWith_CombinesResultsIntoTuple()
    {
        var result = await Task.FromResult(5).ThenGetWith(x => x * 3);
        result.Item1.Should().Be(5);
        result.Item2.Should().Be(15);
    }

    [Fact]
    public async Task ThenGetWith_AsyncOverload_CombinesResultsIntoTuple()
    {
        var result = await Task.FromResult(4)
            .ThenGetWith(x => Task.FromResult(x.ToString()));
        result.Item1.Should().Be(4);
        result.Item2.Should().Be("4");
    }

    [Fact]
    public async Task ThenGetAll_GathersMultipleResults()
    {
        var result = await Task.CompletedTask.ThenGetAll(
            () => 1,
            () => "two");
        result.Item1.Should().Be(1);
        result.Item2.Should().Be("two");
    }

    [Fact]
    public async Task ThenGetAllAsync_GathersAsyncResults()
    {
        var result = await Task.CompletedTask.ThenGetAllAsync(
            () => Task.FromResult(10),
            () => Task.FromResult("hello"));
        result.Item1.Should().Be(10);
        result.Item2.Should().Be("hello");
    }

    [Fact]
    public async Task GetAwaiter_TwoTasks_AwaitsBoth()
    {
        var (a, b) = await (Task.FromResult(1), Task.FromResult(2));
        a.Should().Be(1);
        b.Should().Be(2);
    }

    [Fact]
    public async Task WhenAll_ListOfTasks_AwaitsAll()
    {
        var tasks = new List<Task<int>>
        {
            Task.FromResult(1),
            Task.FromResult(2),
            Task.FromResult(3)
        };
        var result = await tasks.WhenAll();
        result.Should().BeEquivalentTo([1, 2, 3]);
    }

    [Fact]
    public void ExecuteUseThreadLock_ReturnsResult()
    {
        var lockObj = new object();
        var result = 5.ExecuteUseThreadLock(lockObj, x => x * 3);
        result.Should().Be(15);
    }

    [Fact]
    public void ExecuteUseThreadLock_Action_Executes()
    {
        var lockObj = new object();
        var captured = 0;
        10.ExecuteUseThreadLock(lockObj, x => captured = x);
        captured.Should().Be(10);
    }
}
