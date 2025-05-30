#region

using System.Diagnostics;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Common.HostingBackgroundServices;

/// <summary>
/// Represents an abstract base class for hosting background services that operate at regular intervals.
/// </summary>
/// <remarks>
/// This class provides a framework for services that need to perform an action at regular intervals. It includes functionality for managing the interval,
/// handling exceptions, and controlling the service's lifecycle. Derived classes must implement the IntervalProcessAsync method, which is called at each interval.
/// </remarks>
/// <seealso cref="PlatformHostingBackgroundService" />
public abstract class PlatformIntervalHostingBackgroundService : PlatformHostingBackgroundService
{
    /// <summary>
    /// Default time interval for triggering the IntervalProcessAsync method (in milliseconds).
    /// </summary>
    public const int DefaultProcessTriggerIntervalTimeMilliseconds = 60000;

    /// <summary>
    /// Activity source for tracing purposes.
    /// </summary>
    public static readonly ActivitySource ActivitySource = new($"{nameof(PlatformHostingBackgroundService)}");

    /// <summary>
    /// SemaphoreSlim to control the interval process execution.
    /// </summary>
    protected readonly SemaphoreSlim IntervalProcessLock = new(1, 1);

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformIntervalHostingBackgroundService" /> class.
    /// </summary>
    /// <param name="serviceProvider">The service provider for resolving dependencies.</param>
    /// <param name="loggerFactory">The logger factory for creating the logger instance.</param>
    public PlatformIntervalHostingBackgroundService(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory) : base(serviceProvider, loggerFactory)
    {
    }

    protected bool IsFirstTimeTriggered { get; set; } = true;

    /// <summary>
    /// Gets a value indicating whether to log interval process information.
    /// </summary>
    public virtual bool LogIntervalProcessInformation => true;

    /// <summary>
    /// Gets a value indicating whether tracing is activated for interval process execution.
    /// </summary>
    public virtual bool ActivateTracing => true;

    /// <summary>
    /// Starts the interval process execution loop.
    /// </summary>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    protected override async Task StartProcess(CancellationToken cancellationToken)
    {
        while (!ProcessStopped && !StoppingCts.IsCancellationRequested)
        {
            try
            {
                if (IsFirstTimeTriggered && FirstTimeTriggeredDelayTime() != null)
                    await Task.Delay(FirstTimeTriggeredDelayTime()!.Value, cancellationToken);

                await TriggerIntervalProcessAsync(cancellationToken);
            }
            catch (Exception e)
            {
                Logger.LogError(e.BeautifyStackTrace(), "IntervalProcessHostedService {TargetName} FAILED. Error: {Error}", GetType().Name, e.Message);
            }
            finally
            {
                if (IsFirstTimeTriggered) IsFirstTimeTriggered = false;
            }

            await Task.Delay(ProcessTriggerIntervalTime(), cancellationToken);
        }
    }

    protected virtual TimeSpan? FirstTimeTriggeredDelayTime()
    {
        return null;
    }

    /// <summary>
    /// Triggers the interval process asynchronously.
    /// </summary>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public virtual async Task TriggerIntervalProcessAsync(CancellationToken cancellationToken)
    {
        if (IntervalProcessLock.CurrentCount == 0) return;

        if (ActivateTracing)
        {
            using (var activity = ActivitySource.StartActivity($"{nameof(PlatformIntervalHostingBackgroundService)}.{nameof(TriggerIntervalProcessAsync)}"))
            {
                activity?.AddTag("Type", GetType().FullName);

                await DoTriggerIntervalProcessAsync(cancellationToken);
            }
        }
        else await DoTriggerIntervalProcessAsync(cancellationToken);
    }

    /// <summary>
    /// Executes the interval process after acquiring the interval process lock.
    /// </summary>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    private async Task DoTriggerIntervalProcessAsync(CancellationToken cancellationToken)
    {
        try
        {
            await IntervalProcessLock.WaitAsync(cancellationToken);

            if (LogIntervalProcessInformation)
                Logger.LogInformation("IntervalProcessHostedService {TargetName} STARTED", GetType().Name);

            // Task.Run to ensure run in new thread, event if IntervalProcessAsync is actually sync not async
            await Task.Run(() => IntervalProcessAsync(cancellationToken), cancellationToken);

            if (LogIntervalProcessInformation)
                Logger.LogInformation("IntervalProcessHostedService {TargetName} FINISHED", GetType().Name);
        }
        catch (Exception e)
        {
            Logger.LogError(e.BeautifyStackTrace(), "IntervalProcessHostedService {TargetName} FAILED. Error: {Error}", GetType().Name, e.Message);
        }
        finally
        {
            IntervalProcessLock.TryRelease();
        }
    }

    /// <summary>
    /// Executes the interval process, which must be implemented by derived classes.
    /// </summary>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    protected abstract Task IntervalProcessAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Configures the period of the timer to trigger the <see cref="IntervalProcessAsync" /> method.
    /// Default is one minute (<see cref="TimeSpan.FromMinutes" />(1)).
    /// </summary>
    /// <returns>The configuration as <see cref="TimeSpan" /> type.</returns>
    protected virtual TimeSpan ProcessTriggerIntervalTime()
    {
        return DefaultProcessTriggerIntervalTimeMilliseconds.Milliseconds();
    }

    protected override void DisposeManagedResource()
    {
        base.DisposeManagedResource();

        IntervalProcessLock.Dispose();
    }
}
