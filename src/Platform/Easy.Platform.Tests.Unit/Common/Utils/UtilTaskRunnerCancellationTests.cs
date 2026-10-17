using Easy.Platform.Common.Utils;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Utils;

/// <summary>Technical polling contract: cancellation owns the poll, not merely the task awaiting it.</summary>
public class UtilTaskRunnerCancellationTests
{
    [Fact]
    [Trait("TechnicalSpec", "TC-WAIT-001")]
    public async Task PreCanceledWait_DoesNotEvaluateCallerCondition()
    {
        using var cancellation = new CancellationTokenSource();
        await cancellation.CancelAsync();
        var calls = 0;
        var action = () => Util.TaskRunner.WaitUntilAsync(() => ++calls > 0, cancellation.Token);

        var failure = await action.Should().ThrowAsync<OperationCanceledException>();

        failure.Which.CancellationToken.Should().Be(cancellation.Token);
        calls.Should().Be(0);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-WAIT-002")]
    public async Task CancelWhilePolling_InterruptsDelayAndStopsFurtherConditionCalls()
    {
        using var cancellation = new CancellationTokenSource();
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var calls = 0;
        var wait = Util.TaskRunner.WaitUntilAsync(() =>
        {
            Interlocked.Increment(ref calls);
            entered.TrySetResult();
            return false;
        }, cancellation.Token, maxWaitSeconds: 60, waitIntervalSeconds: 30);
        await entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await cancellation.CancelAsync();

        var action = () => wait.WaitAsync(TimeSpan.FromSeconds(5));
        var failure = await action.Should().ThrowAsync<OperationCanceledException>();

        failure.Which.CancellationToken.Should().Be(cancellation.Token);
        calls.Should().Be(1);
        wait.IsCompleted.Should().BeTrue("the underlying poll must finish, leaving no abandoned timer loop");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-WAIT-003")]
    public async Task OldAndCancelableOverloads_PreserveSuccessAndTimeoutSemantics()
    {
        await Util.TaskRunner.WaitUntilAsync(() => true, maxWaitSeconds: 0);
        await Util.TaskRunner.WaitUntilAsync(() => true, CancellationToken.None, maxWaitSeconds: 0);
        var oldWait = () => Util.TaskRunner.WaitUntilAsync(() => false, maxWaitSeconds: 0, waitForMsg: "original condition");
        var cancelableWait = () => Util.TaskRunner.WaitUntilAsync(() => false, CancellationToken.None, maxWaitSeconds: 0, waitForMsg: "original condition");

        (await oldWait.Should().ThrowAsync<TimeoutException>()).Which.Message.Should().Contain("original condition");
        (await cancelableWait.Should().ThrowAsync<TimeoutException>()).Which.Message.Should().Contain("original condition");
    }
}
