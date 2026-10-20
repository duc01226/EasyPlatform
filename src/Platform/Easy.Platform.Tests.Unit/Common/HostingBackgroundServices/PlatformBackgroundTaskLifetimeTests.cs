using Easy.Platform.Common.HostingBackgroundServices;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace Easy.Platform.Tests.Unit.Common.HostingBackgroundServices;

/// <summary>Technical contract: stopping closes admission and drains every operation before dependencies are released.</summary>
public sealed class PlatformBackgroundTaskLifetimeTests
{
    [Theory]
    [InlineData(1)]
    [InlineData(8)]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-001")]
    public async Task StopAsync_WaitsForEveryAdmittedOperation(int operationCount)
    {
        using var lifetime = new PlatformBackgroundTaskLifetime();
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var cancelled = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var registration = lifetime.Token.Register(() => cancelled.TrySetResult());
        var tasks = Enumerable.Range(0, operationCount).Select(_ => lifetime.RunAsync(async _ => await release.Task)).ToArray();

        var stop = lifetime.StopAsync();
        try
        {
            await cancelled.Task.WaitAsync(TimeSpan.FromSeconds(5));
            stop.IsCompleted.Should().BeFalse("cancellation is a signal, not proof that active work finished");
        }
        finally
        {
            release.TrySetResult();
            await Task.WhenAll(tasks.Append(stop)).WaitAsync(TimeSpan.FromSeconds(5));
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-015")]
    public async Task QueuedWork_WithoutAnExternalToken_ObservesOwnedStopOrDisposal(bool dispose)
    {
        using var lifetime = new PlatformBackgroundTaskLifetime();
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var exited = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        lifetime.QueueBackgroundWork(async token =>
        {
            entered.TrySetResult();
            try { await Task.Delay(Timeout.InfiniteTimeSpan, token); }
            finally { exited.TrySetResult(); }
        }, () => NullLogger.Instance);
        await entered.Task.WaitAsync(TimeSpan.FromSeconds(5));

        if (dispose) lifetime.Dispose();
        else await lifetime.StopAsync().WaitAsync(TimeSpan.FromSeconds(5));

        await exited.Task.WaitAsync(TimeSpan.FromSeconds(5));
        lifetime.Token.IsCancellationRequested.Should().BeTrue();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-002")]
    public async Task RunAsync_AfterStop_DoesNotInvokeNewWork()
    {
        using var lifetime = new PlatformBackgroundTaskLifetime();
        await lifetime.StopAsync();
        var wasInvoked = false;

        await lifetime.RunAsync(_ =>
        {
            wasInvoked = true;
            return Task.CompletedTask;
        });

        wasInvoked.Should().BeFalse("dependencies may already be disposed after stop returns");
        await lifetime.StopAsync();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-003")]
    public async Task RunAsync_WhenWorkFails_PreservesTheFailureAndReleasesItsAdmission()
    {
        using var lifetime = new PlatformBackgroundTaskLifetime();
        var failure = new InvalidOperationException("operation failed");
        var action = () => lifetime.RunAsync(_ => Task.FromException(failure));

        (await action.Should().ThrowAsync<InvalidOperationException>()).Which.Should().BeSameAs(failure);
        await lifetime.StopAsync().WaitAsync(TimeSpan.FromSeconds(5));
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-004")]
    public async Task StopAsync_WhenDeadlineExpires_DoesNotPretendTheOperationCompleted()
    {
        using var lifetime = new PlatformBackgroundTaskLifetime();
        using var deadline = new CancellationTokenSource();
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var operation = lifetime.RunAsync(async _ => await release.Task);
        var stop = lifetime.StopAsync(deadline.Token);

        try
        {
            await deadline.CancelAsync();
            var observeStop = () => stop;
            await observeStop.Should().ThrowAsync<OperationCanceledException>();
            operation.IsCompleted.Should().BeFalse();
        }
        finally
        {
            release.TrySetResult();
            await operation;
            await lifetime.StopAsync().WaitAsync(TimeSpan.FromSeconds(5));
        }
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-022")]
    public async Task StopAsync_WithoutActiveWork_WaitsForAnInFlightCancellationCallback()
    {
        using var lifetime = new PlatformBackgroundTaskLifetime();
        using var release = new ManualResetEventSlim(false);
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var finished = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var registration = lifetime.Token.Register(() =>
        {
            entered.TrySetResult();
            try { release.Wait(); }
            finally { finished.TrySetResult(); }
        });

        var stop = lifetime.StopAsync();
        try
        {
            await entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
            var prematureStop = () => stop.WaitAsync(TimeSpan.FromSeconds(5));
            await prematureStop.Should().ThrowAsync<TimeoutException>(
                "cancellation callbacks can still own dependencies even when no operation is active");
            finished.Task.IsCompleted.Should().BeFalse("the callback is held until the finally block releases it");
        }
        finally
        {
            release.Set();
            await Task.WhenAll(stop, finished.Task).WaitAsync(TimeSpan.FromSeconds(5));
        }
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-LIFETIME-023")]
    public async Task StopAsync_WhenACancellationCallbackFails_PreservesItsCause()
    {
        using var lifetime = new PlatformBackgroundTaskLifetime();
        var failure = new InvalidOperationException("cancellation callback failed");
        using var registration = lifetime.Token.Register(() => throw failure);
        var observeStop = () => lifetime.StopAsync().WaitAsync(TimeSpan.FromSeconds(5));

        var observed = await observeStop.Should().ThrowAsync<Exception>();
        observed.Which.GetBaseException().Should().BeSameAs(failure,
            "successful stop and unrelated timeouts must not hide a cancellation callback failure");
    }
}
