#region

using System.Diagnostics;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Common.Cqrs.Events;

public interface IPlatformCqrsEventHandler
{
    public static readonly ActivitySource ActivitySource = new($"{nameof(IPlatformCqrsEventHandler)}");

    public bool ForceCurrentInstanceHandleInCurrentThreadAndScope { get; set; }

    public bool IsHandlingInNewScope { get; set; }

    public int RetryOnFailedTimes { get; set; }

    public bool ThrowExceptionOnHandleFailed { get; set; }

    /// <summary>
    /// Handles the event.
    /// </summary>
    /// <param name="event">The event to handle.</param>
    /// <param name="cancellationToken">A cancellation token that can be used to cancel the work.</param>
    Task Handle(object @event, CancellationToken cancellationToken);

    public Task<bool> HandleWhen(object @event);
}

public interface IPlatformCqrsEventHandler<in TEvent> : INotificationHandler<TEvent>, IPlatformCqrsEventHandler
    where TEvent : IPlatformCqrsEvent
{
    public Task<bool> HandleWhen(TEvent @event);

    Task ExecuteHandleAsync(TEvent @event, CancellationToken cancellationToken);
}

public abstract class PlatformCqrsEventHandler<TEvent> : IPlatformCqrsEventHandler<TEvent>
    where TEvent : IPlatformCqrsEvent
{
    protected readonly ILoggerFactory LoggerFactory;
    protected readonly IPlatformRootServiceProvider RootServiceProvider;
    protected readonly IServiceProvider ServiceProvider;

    private bool? cachedCheckHandleWhen;

    protected PlatformCqrsEventHandler(ILoggerFactory loggerFactory, IPlatformRootServiceProvider rootServiceProvider, IServiceProvider serviceProvider)
    {
        LoggerFactory = loggerFactory;
        RootServiceProvider = rootServiceProvider;
        ServiceProvider = serviceProvider;
        IsDistributedTracingEnabled = rootServiceProvider.GetService<PlatformModule.DistributedTracingConfig>()?.Enabled == true;
    }

    protected bool IsDistributedTracingEnabled { get; set; }

    public virtual double RetryOnFailedDelaySeconds { get; set; } = Util.TaskRunner.DefaultResilientDelaySeconds;

    public virtual double MaxRetryOnFailedDelaySeconds { get; set; } = 60;

    /// <summary>
    /// The MustWaitHandlerExecutionFinishedImmediately method is part of the IPlatformCqrsEvent interface and its implementation is in the PlatformCqrsEvent class. This method is used to determine whether the execution of a specific event handler should be waited for to finish immediately or not.
    /// <br />
    /// In the context of the Command Query Responsibility Segregation (CQRS) pattern, this method provides a way to control the execution flow of event handlers. By default, event handlers are executed in the background and the command returns immediately without waiting for the handlers to finish. However, there might be cases where it's necessary to wait for a handler to finish its execution before proceeding, and this is where MustWaitHandlerExecutionFinishedImmediately comes into play.
    /// <br />
    /// The method takes a Type parameter, which represents the event handler type, and returns a boolean. If the method returns true, it means that the execution of the event handler of the provided type should be waited for to finish immediately.
    /// <br />
    /// In the DoHandle method of the PlatformCqrsEventHandler class, this method is used to decide whether to queue the event handler execution in the background or execute it immediately. If MustWaitHandlerExecutionFinishedImmediately returns true for the event handler type, the handler is executed immediately using the same current active uow if existing active uow; otherwise, it's queued to run in the background.
    /// </summary>
    protected virtual bool MustWaitHandlerExecutionFinishedImmediately => false;

    public bool NoNeedCloneNewEventInstanceForTheHandler { get; set; }

    /// <summary>
    /// (IServiceProvider newScopeServiceProvider, TEvent @event ,PlatformCqrsEventHandler[TEvent] handlerNewInstance)
    /// </summary>
    protected virtual Func<IServiceProvider, TEvent, PlatformCqrsEventHandler<TEvent>, Task>? ExecuteHandleInBackgroundNewScopeBeforeExecuteFn => null;

    public virtual int RetryOnFailedTimes { get; set; } = Util.TaskRunner.DefaultResilientRetryCount;

    public bool ForceCurrentInstanceHandleInCurrentThreadAndScope { get; set; }

    public bool IsHandlingInNewScope { get; set; }

    public virtual bool ThrowExceptionOnHandleFailed { get; set; }

    public abstract Task Handle(object @event, CancellationToken cancellationToken);

    public virtual Task Handle(TEvent notification, CancellationToken cancellationToken)
    {
        return DoHandle(notification, cancellationToken);
    }

    public virtual async Task ExecuteHandleAsync(TEvent @event, CancellationToken cancellationToken)
    {
        if (!await CheckHandleWhen(@event)) return;

        await ExecuteHandleWithTracingAsync(@event, () => HandleAsync(@event, cancellationToken));
    }

    public abstract Task<bool> HandleWhen(object @event);

    public abstract Task<bool> HandleWhen(TEvent @event);

    protected virtual async Task DoHandle(TEvent @event, CancellationToken cancellationToken)
    {
        try
        {
            var thisHandlerInstanceEvent = DoHandle_BuildHandlerInstanceEvent(@event);

            DoHandle_AddEventStackTrace(thisHandlerInstanceEvent);

            // Use ServiceCollection.BuildServiceProvider() to create new Root ServiceProvider
            // so that it wont be disposed when run in background thread, this handler ServiceProvider will be disposed
            if (AllowHandleInBackgroundThread(thisHandlerInstanceEvent) &&
                NotNeedWaitHandlerExecutionFinishedImmediately(thisHandlerInstanceEvent) &&
                !ForceCurrentInstanceHandleInCurrentThreadAndScope)
                ExecuteHandleInBackgroundNewScopeAsync(thisHandlerInstanceEvent, cancellationToken);
            else
            {
                await BeforeExecuteHandleAsync(this, thisHandlerInstanceEvent);

                try
                {
                    // Retry RetryOnFailedTimes to help resilient PlatformCqrsEventHandler. Sometime parallel, create/update concurrency could lead to error
                    await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                        () => ExecuteHandleAsync(thisHandlerInstanceEvent, CancellationToken.None),
                        retryCount: RetryOnFailedTimes,
                        sleepDurationProvider: retryAttempt => Math.Min(retryAttempt + RetryOnFailedDelaySeconds, MaxRetryOnFailedDelaySeconds).Seconds(),
                        onRetry: (e, delayTime, retryAttempt, context) =>
                        {
                            if (retryAttempt > Util.TaskRunner.DefaultResilientRetryCount)
                                LogError(thisHandlerInstanceEvent, e.BeautifyStackTrace(), LoggerFactory, "Retry");
                        },
                        cancellationToken: cancellationToken);
                }
                catch (Exception e)
                {
                    if (ThrowExceptionOnHandleFailed) throw;
                    LogError(thisHandlerInstanceEvent, e.BeautifyStackTrace(), LoggerFactory);
                }
            }
        }
        catch (Exception e)
        {
            if (ThrowExceptionOnHandleFailed) throw;
            LogError(@event, e.BeautifyStackTrace(), LoggerFactory);
        }
    }

    protected void DoHandle_AddEventStackTrace(TEvent thisHandlerInstanceEvent)
    {
        if (RootServiceProvider.GetService<PlatformModule.DistributedTracingConfig>()?.DistributedTracingStackTraceEnabled() == true &&
            thisHandlerInstanceEvent.StackTrace == null)
            thisHandlerInstanceEvent.StackTrace = PlatformEnvironment.StackTrace();
    }

    protected TEvent DoHandle_BuildHandlerInstanceEvent(TEvent @event)
    {
        return NoNeedCloneNewEventInstanceForTheHandler ||
               RootServiceProvider.ImplementationAssignableToServiceTypeRegisteredCount(typeof(IPlatformCqrsEventHandler<TEvent>)) == 1
            ? @event
            : @event.DeepClone()
                .PipeAction(_ =>
                {
                    NoNeedCloneNewEventInstanceForTheHandler = true;
                });
    }

    protected bool NotNeedWaitHandlerExecutionFinishedImmediately(TEvent @event)
    {
        return !NeedWaitHandlerExecutionFinishedImmediately(@event);
    }

    protected virtual bool NeedWaitHandlerExecutionFinishedImmediately(TEvent @event)
    {
        return @event.MustWaitHandlerExecutionFinishedImmediately(GetType()) || MustWaitHandlerExecutionFinishedImmediately;
    }

    /// <summary>
    /// Default is True. If true, the event handler will run in separate thread scope with new instance
    /// and if exception, it won't affect the main flow
    /// </summary>
    protected virtual bool AllowHandleInBackgroundThread(TEvent @event)
    {
        return true;
    }

    protected void ExecuteHandleInBackgroundNewScopeAsync(
        TEvent @event,
        CancellationToken cancellationToken = default)
    {
        RootServiceProvider.ExecuteInjectScopedInBackgroundAsync(
            async (IServiceProvider sp) =>
            {
                try
                {
                    var thisHandlerNewInstance = sp.GetRequiredService(GetType())
                        .As<PlatformCqrsEventHandler<TEvent>>()
                        .With(newInstance => CopyPropertiesToNewInstanceBeforeExecution(this, newInstance));

                    if (ExecuteHandleInBackgroundNewScopeBeforeExecuteFn != null)
                        await ExecuteHandleInBackgroundNewScopeBeforeExecuteFn(sp, @event, thisHandlerNewInstance);

                    await thisHandlerNewInstance
                        .With(p => p.ForceCurrentInstanceHandleInCurrentThreadAndScope = true)
                        .With(p => p.IsHandlingInNewScope = true)
                        .Handle(@event, cancellationToken);
                }
                catch (Exception e)
                {
                    LogError(@event, e, LoggerFactory);
                }
            },
            loggerFactory: () => CreateLogger(LoggerFactory));
    }

    protected virtual Task BeforeExecuteHandleAsync(
        PlatformCqrsEventHandler<TEvent> handlerNewInstance,
        TEvent @event)
    {
        return Task.CompletedTask;
    }

    protected virtual void CopyPropertiesToNewInstanceBeforeExecution(
        PlatformCqrsEventHandler<TEvent> previousInstance,
        PlatformCqrsEventHandler<TEvent> newInstance)
    {
        newInstance.ForceCurrentInstanceHandleInCurrentThreadAndScope = previousInstance.ForceCurrentInstanceHandleInCurrentThreadAndScope;
        newInstance.IsHandlingInNewScope = previousInstance.IsHandlingInNewScope;
        newInstance.RetryOnFailedTimes = previousInstance.RetryOnFailedTimes;
        newInstance.ThrowExceptionOnHandleFailed = previousInstance.ThrowExceptionOnHandleFailed;
        newInstance.NoNeedCloneNewEventInstanceForTheHandler = previousInstance.NoNeedCloneNewEventInstanceForTheHandler;
    }

    protected async Task ExecuteHandleWithTracingAsync(TEvent @event, Func<Task> handleAsync)
    {
        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformCqrsEventHandler.ActivitySource.StartActivity($"EventHandler.{nameof(ExecuteHandleWithTracingAsync)}"))
            {
                activity?.AddTag("Type", GetType().FullName);
                activity?.AddTag("EventType", typeof(TEvent).FullName);
                activity?.AddTag("Event", @event.ToFormattedJson());

                await handleAsync();
            }
        }
        else await handleAsync();
    }

    protected async Task<bool> CheckHandleWhen(TEvent @event)
    {
        return cachedCheckHandleWhen ??= await HandleWhen(@event);
    }

    public virtual void LogError(TEvent notification, Exception exception, ILoggerFactory loggerFactory, string prefix = "")
    {
        CreateLogger(loggerFactory)
            .LogError(
                exception.BeautifyStackTrace(),
                "[PlatformCqrsEventHandler] {Prefix} Handle event failed. [[Message:{Message}]] [[EventType:{EventType}]]; [[HandlerType:{HandlerType}]]. [[EventContent:{@EventContent}]].",
                prefix,
                exception.Message,
                notification.GetType().Name,
                GetType().Name,
                notification);
    }

    protected abstract Task HandleAsync(TEvent @event, CancellationToken cancellationToken);

    public ILogger CreateLogger(ILoggerFactory loggerFactory)
    {
        return loggerFactory.CreateLogger(typeof(PlatformCqrsEventHandler<>).GetNameOrGenericTypeName() + $"-{GetType().Name}");
    }
}
