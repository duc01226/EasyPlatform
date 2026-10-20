using Easy.Platform.Common.Utils;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Common.HostingBackgroundServices;

/// <summary>
/// Owns admission and cancellation of asynchronous work so shutdown can drain it before dependencies are disposed.
/// Completed operations are counted down immediately rather than retained for the lifetime of the process.
/// </summary>
public sealed class PlatformBackgroundTaskLifetime : IDisposable
{
    private readonly Lock gate = new();
    private readonly CancellationTokenSource stoppingCts = new();
    private readonly TaskCompletionSource drained = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private Task cancellationTask;
    private int activeOperations;
    private bool isStopping;
    private bool isDisposed;

    public PlatformBackgroundTaskLifetime()
    {
        Token = stoppingCts.Token;
    }

    public CancellationToken Token { get; }

    /// <summary>
    /// Runs admitted work and returns its actual outcome. Work arriving after shutdown is not started.
    /// The caller remains responsible for observing or logging failures.
    /// </summary>
    public Task RunAsync(Func<CancellationToken, Task> action)
    {
        ArgumentNullException.ThrowIfNull(action);

        lock (gate)
        {
            if (isStopping) return Task.CompletedTask;
            activeOperations++;
        }

        return ExecuteAsync(action);
    }

    /// <summary>Queues admitted work with both operation and lifetime cancellation, observing unexpected failures.</summary>
    public void QueueBackgroundWork(Func<CancellationToken, Task> action, Func<ILogger> loggerFactory, CancellationToken cancellationToken = default)
    {
        _ = RunAsync(async stoppingToken =>
        {
            using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, stoppingToken);
            await Util.TaskRunner.QueueActionInBackgroundTask(
                async () =>
                {
                    try { await action(linked.Token); }
                    catch (OperationCanceledException) when (linked.IsCancellationRequested)
                    {
                        // Both stop and operation cancellation are expected; other failures are logged by the executor.
                    }
                },
                loggerFactory: loggerFactory,
                cancellationToken: linked.Token);
        });
    }

    /// <summary>Closes admission and signals cancellation without waiting for the caller's own operation.</summary>
    public void Cancel()
    {
        lock (gate)
        {
            isStopping = true;
            if (!isDisposed) cancellationTask ??= stoppingCts.CancelAsync();
        }
    }

    /// <summary>Waits for cancellation callbacks and all admitted work, within the host's shutdown deadline.</summary>
    public async Task StopAsync(CancellationToken cancellationToken = default)
    {
        Task completion;
        lock (gate)
        {
            Cancel();
            completion = Task.WhenAll(
                cancellationTask ?? Task.CompletedTask,
                activeOperations == 0 ? Task.CompletedTask : drained.Task);
        }

        await completion.WaitAsync(cancellationToken);
    }

    public void Dispose()
    {
        Task completion;
        lock (gate)
        {
            if (isDisposed) return;
            Cancel();
            isDisposed = true;
            completion = Task.WhenAll(cancellationTask, activeOperations == 0 ? Task.CompletedTask : drained.Task);
        }

        // Early disposal still signals work, but the token source stays alive until that work and
        // its cancellation callbacks finish. StopAsync remains the owner of observed callback faults.
        _ = completion.ContinueWith(
            _ => stoppingCts.Dispose(), CancellationToken.None, TaskContinuationOptions.ExecuteSynchronously, TaskScheduler.Default);
    }

    private async Task ExecuteAsync(Func<CancellationToken, Task> action)
    {
        try
        {
            Token.ThrowIfCancellationRequested();
            await action(Token);
        }
        finally
        {
            lock (gate)
            {
                activeOperations--;
                if (isStopping && activeOperations == 0)
                {
                    drained.TrySetResult();
                }
            }
        }
    }
}
