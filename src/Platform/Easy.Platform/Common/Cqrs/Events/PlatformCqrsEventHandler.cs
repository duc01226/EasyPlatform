using System.Diagnostics;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Common.Cqrs.Events;

public interface IPlatformCqrsEventHandler
{
    public static readonly ActivitySource ActivitySource = new($"{nameof(IPlatformCqrsEventHandler)}");

    public bool ForceCurrentInstanceHandleInCurrentThread { get; set; }
}

public interface IPlatformCqrsEventHandler<in TEvent> : INotificationHandler<TEvent>, IPlatformCqrsEventHandler
    where TEvent : IPlatformCqrsEvent, new()
{
}

public abstract class PlatformCqrsEventHandler<TEvent> : IPlatformCqrsEventHandler<TEvent>
    where TEvent : IPlatformCqrsEvent, new()
{
    protected readonly ILoggerFactory LoggerFactory;
    protected readonly IPlatformRootServiceProvider RootServiceProvider;

    protected PlatformCqrsEventHandler(ILoggerFactory loggerFactory, IPlatformRootServiceProvider rootServiceProvider)
    {
        LoggerFactory = loggerFactory;
        RootServiceProvider = rootServiceProvider;
        IsDistributedTracingEnabled = rootServiceProvider.GetService<PlatformModule.DistributedTracingConfig>()?.Enabled == true;
    }

    protected bool IsDistributedTracingEnabled { get; }

    public virtual int RetryOnFailedTimes => 5;

    public virtual double RetryOnFailedDelaySeconds => 0.5;

    public bool ForceCurrentInstanceHandleInCurrentThread { get; set; }

    public virtual Task Handle(TEvent notification, CancellationToken cancellationToken)
    {
        return DoHandle(notification, cancellationToken, true);
    }

    protected virtual async Task DoHandle(TEvent @event, CancellationToken cancellationToken, bool couldRunInBackgroundThread)
    {
        if (!HandleWhen(@event)) return;

        // Use ServiceCollection.BuildServiceProvider() to create new Root ServiceProvider
        // so the it wont be disposed when run in background thread, this handler ServiceProvider will be disposed
        if (AllowHandleInBackgroundThread(@event) &&
            !ForceCurrentInstanceHandleInCurrentThread &&
            !@event.MustWaitHandlerExecutionFinishedImmediately(GetType()) &&
            couldRunInBackgroundThread)
            Util.TaskRunner.QueueActionInBackground(
                async () => await DoExecuteInstanceInNewScope(@event),
                () => LoggerFactory.CreateLogger(typeof(PlatformCqrsEventHandler<>)),
                cancellationToken: default);
        else
            await ExecuteRetryHandleAsync(this, @event);
    }

    /// <summary>
    /// Default is True. If true, the event handler will run in separate thread scope with new instance
    /// and if exception, it won't affect the main flow
    /// </summary>
    protected virtual bool AllowHandleInBackgroundThread(TEvent @event)
    {
        return true;
    }

    protected async Task DoExecuteInstanceInNewScope(
        TEvent notification)
    {
        await RootServiceProvider.ExecuteInjectScopedAsync(
            async (IServiceProvider sp) =>
            {
                var thisHandlerNewInstance = sp.GetRequiredService(GetType())
                    .As<PlatformCqrsEventHandler<TEvent>>()
                    .With(newInstance => CopyPropertiesToNewInstanceBeforeExecution(this, newInstance));

                await ExecuteRetryHandleAsync(thisHandlerNewInstance, notification);
            });
    }

    protected async Task ExecuteRetryHandleAsync(
        PlatformCqrsEventHandler<TEvent> handlerNewInstance,
        TEvent notification)
    {
        try
        {
            // Retry RetryOnFailedTimes to help resilient PlatformCqrsEventHandler. Sometime parallel, create/update concurrency could lead to error
            if (RetryOnFailedTimes > 0)
                await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                    async () => await handlerNewInstance.ExecuteHandleAsync(notification, default),
                    retryCount: RetryOnFailedTimes,
                    sleepDurationProvider: retryAttempt => RetryOnFailedDelaySeconds.Seconds());
            else
                await handlerNewInstance.ExecuteHandleAsync(notification, default);
        }
        catch (Exception e)
        {
            handlerNewInstance.LogError(notification, e, LoggerFactory);
        }
    }

    protected virtual void CopyPropertiesToNewInstanceBeforeExecution(
        PlatformCqrsEventHandler<TEvent> previousInstance,
        PlatformCqrsEventHandler<TEvent> newInstance)
    {
        newInstance.ForceCurrentInstanceHandleInCurrentThread = previousInstance.ForceCurrentInstanceHandleInCurrentThread;
    }

    public virtual async Task ExecuteHandleAsync(TEvent @event, CancellationToken cancellationToken)
    {
        await ExecuteHandleWithTracingAsync(@event, () => HandleAsync(@event, cancellationToken));
    }

    protected async Task ExecuteHandleWithTracingAsync(TEvent @event, Func<Task> handleAsync)
    {
        if (IsDistributedTracingEnabled)
            using (var activity = IPlatformCqrsEventHandler.ActivitySource.StartActivity($"EventHandler.{nameof(ExecuteHandleAsync)}"))
            {
                activity?.AddTag("Type", GetType().FullName);
                activity?.AddTag("EventType", typeof(TEvent).FullName);
                activity?.AddTag("Event", @event.ToJson());

                await handleAsync();
            }
        else await handleAsync();
    }

    public virtual void LogError(TEvent notification, Exception exception, ILoggerFactory loggerFactory)
    {
        CreateLogger(loggerFactory)
            .LogError(
                exception,
                "[PlatformCqrsEventHandler] Handle event failed. [[Message:{Message}]] [[EventType:{EventType}]]; [[HandlerType:{HandlerType}]]. [[EventContent:{EventContent}]].",
                exception.Message,
                notification.GetType().Name,
                GetType().Name,
                notification.ToJson());
    }

    /// <summary>
    /// Default return True. Override this to define the condition to handle the event
    /// </summary>
    protected virtual bool HandleWhen(TEvent @event)
    {
        return true;
    }

    protected abstract Task HandleAsync(TEvent @event, CancellationToken cancellationToken);

    public static ILogger CreateLogger(ILoggerFactory loggerFactory)
    {
        return loggerFactory.CreateLogger(typeof(PlatformCqrsEventHandler<>));
    }
}
