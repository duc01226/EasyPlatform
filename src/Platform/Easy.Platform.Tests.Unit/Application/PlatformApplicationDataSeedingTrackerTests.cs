using Easy.Platform.Application;
using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Application;

public sealed class PlatformApplicationDataSeedingTrackerTests : PlatformUnitTestBase
{
    [Fact]
    public async Task WaitForCompletionAsync_WaitsForEveryRegisteredSeedOperation()
    {
        var tracker = new PlatformApplicationDataSeedingTracker();
        var first = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var second = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        tracker.Track(first.Task);
        tracker.Track(second.Task);

        var completion = tracker.WaitForCompletionAsync();
        first.SetResult();
        completion.IsCompleted.Should().BeFalse("another registered seeder is still running");
        second.SetResult();

        await completion.WaitAsync(TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task WaitForCompletionAsync_ReportsSeedFailure()
    {
        var tracker = new PlatformApplicationDataSeedingTracker();
        var failure = new InvalidOperationException("seed failed");
        tracker.Track(Task.FromException(failure));

        var act = () => tracker.WaitForCompletionAsync();

        (await act.Should().ThrowAsync<InvalidOperationException>()).Which.Should().BeSameAs(failure);
    }

    [Fact]
    public async Task WaitForCompletionAsync_CancelledWaitDoesNotCancelSeedWork()
    {
        var tracker = new PlatformApplicationDataSeedingTracker();
        var seed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        tracker.Track(seed.Task);
        using var cancellation = new CancellationTokenSource();
        await cancellation.CancelAsync();

        var act = () => tracker.WaitForCompletionAsync(cancellation.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();
        seed.Task.IsCompleted.Should().BeFalse();
        seed.SetResult();
        await tracker.WaitForCompletionAsync();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task BackgroundSeedTask_PropagatesFailuresOnlyWhenRequested(bool propagateExceptions)
    {
        var failure = new InvalidOperationException("seed failed");
        var task = Util.TaskRunner.QueueActionInBackgroundTask(
            () => Task.FromException(failure),
            retryCount: 0,
            propagateExceptions: propagateExceptions);
        var act = () => task.WaitAsync(TimeSpan.FromSeconds(5));

        if (propagateExceptions)
            (await act.Should().ThrowAsync<InvalidOperationException>()).Which.Should().BeSameAs(failure);
        else
            await act.Should().NotThrowAsync();
    }
}
