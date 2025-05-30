#region

using System.Diagnostics;
using Easy.Platform.Application.Cqrs.Events.InboxSupport;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Common.Validations.Extensions;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.Cqrs.Events;

/// <summary>
/// Defines the contract for a Platform CQRS Event Application Handler.
/// </summary>
/// <remarks>
/// This interface extends the IPlatformCqrsEventHandler and provides additional properties and methods
/// for handling CQRS events in the application context.
/// </remarks>
public interface IPlatformCqrsEventApplicationHandler : IPlatformCqrsEventHandler
{
    /// <summary>
    /// Gets a value indicating whether to enable Inbox Event Bus Message.
    /// </summary>
    public bool EnableInboxEventBusMessage { get; }

    public bool IsCalledFromInboxBusMessageConsumer { get; set; }

    /// <summary>
    /// Determines whether the event can be handled using Inbox Consumer.
    /// </summary>
    /// <param name="event">The event to check.</param>
    public bool CanExecuteHandlingEventUsingInboxConsumer(object @event);
}

public interface IPlatformCqrsEventApplicationHandler<in TEvent> : IPlatformCqrsEventApplicationHandler, IPlatformCqrsEventHandler<TEvent>
    where TEvent : PlatformCqrsEvent, new()
{
    public bool CanExecuteHandlingEventUsingInboxConsumer(TEvent @event);
}

public abstract class PlatformCqrsEventApplicationHandler<TEvent> : PlatformCqrsEventHandler<TEvent>, IPlatformCqrsEventApplicationHandler<TEvent>
    where TEvent : PlatformCqrsEvent, new()
{
    protected readonly IPlatformApplicationRequestContextAccessor RequestContextAccessor;
    protected readonly IPlatformUnitOfWorkManager UnitOfWorkManager;

    private double retryOnFailedDelaySeconds = Util.TaskRunner.DefaultResilientDelaySeconds;
    private int? retryOnFailedTimes;
    private bool? throwExceptionOnHandleFailed;

    public PlatformCqrsEventApplicationHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider) : base(loggerFactory, rootServiceProvider, serviceProvider)
    {
        UnitOfWorkManager = unitOfWorkManager;
        RequestContextAccessor = ServiceProvider.GetRequiredService<IPlatformApplicationRequestContextAccessor>();
        ApplicationSettingContext = ServiceProvider.GetRequiredService<IPlatformApplicationSettingContext>();
        Logger = new Lazy<ILogger>(() => CreateLogger(LoggerFactory));
    }

    public override double RetryOnFailedDelaySeconds
    {
        get => !HasInboxMessageSupport() && !MustWaitHandlerExecutionFinishedImmediately ? retryOnFailedDelaySeconds * 10 : retryOnFailedDelaySeconds;
        set => retryOnFailedDelaySeconds = value;
    }

    protected override Func<IServiceProvider, TEvent, PlatformCqrsEventHandler<TEvent>, Task> ExecuteHandleInBackgroundNewScopeBeforeExecuteFn =>
        async (newScopeServiceProvider, @event, handlerNewInstance) =>
        {
            try
            {
                if (handlerNewInstance is PlatformCqrsEventApplicationHandler<TEvent> applicationHandlerNewInstance)
                    applicationHandlerNewInstance.RequestContext.SetValues(@event.RequestContext);
            }
            catch (Exception e)
            {
                Logger.Value.LogError(
                    e,
                    "[WARNING-AS_ERROR] ExecuteHandleInBackgroundNewScopeBeforeExecuteFn failed. EventHandler:{EventHandler} Event:{Event}",
                    GetType().GetFullNameOrGenericTypeFullName(),
                    @event.ToJson());
            }
        };

    protected virtual bool AutoOpenUow => true;

    protected Lazy<ILogger> Logger { get; }

    protected IPlatformApplicationRequestContext RequestContext => RequestContextAccessor.Current;

    protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }

    public virtual bool AutoDeleteProcessedInboxEventMessage => false;

    public int RetryEventInboxBusMessageConsumerOnFailedDelaySeconds { get; set; } = 1;

    public int RetryEventInboxBusMessageConsumerOnFailedDelayMaxSeconds { get; set; } = 60;

    public int RetryEventInboxBusMessageConsumerMaxCount { get; set; } = int.MaxValue;

    public override int RetryOnFailedTimes
    {
        get => retryOnFailedTimes ??
               (!HasInboxMessageSupport() && !MustWaitHandlerExecutionFinishedImmediately ? int.MaxValue : Util.TaskRunner.DefaultResilientRetryCount);
        set => retryOnFailedTimes = value;
    }

    /// <summary>
    /// Gets or sets a value indicating whether the current instance of the event handler is called from the Inbox Bus Message Consumer.
    /// </summary>
    /// <value>
    /// <c>true</c> if this instance is called from the Inbox Bus Message Consumer; otherwise, <c>false</c>.
    /// </value>
    public bool IsCalledFromInboxBusMessageConsumer { get; set; }

    /// <summary>
    /// Default return False. When True, Support for store cqrs event handler as inbox if inbox bus message is enabled in persistence module
    /// </summary>
    public virtual bool EnableInboxEventBusMessage => true;

    public override bool ThrowExceptionOnHandleFailed
    {
        get => throwExceptionOnHandleFailed ?? IsCalledFromInboxBusMessageConsumer;
        set => throwExceptionOnHandleFailed = value;
    }

    public override Task Handle(object @event, CancellationToken cancellationToken)
    {
        return DoHandle(@event.As<TEvent>(), cancellationToken);
    }

    public override async Task<bool> HandleWhen(object @event)
    {
        return await HandleWhen(@event.As<TEvent>());
    }

    public bool CanExecuteHandlingEventUsingInboxConsumer(object @event)
    {
        return CanExecuteHandlingEventUsingInboxConsumer(@event.As<TEvent>());
    }

    public override async Task Handle(TEvent notification, CancellationToken cancellationToken)
    {
        await DoHandle(notification, cancellationToken);
    }

    public override async Task ExecuteHandleAsync(TEvent @event, CancellationToken cancellationToken)
    {
        await ExecuteHandleWithTracingAsync(
            @event,
            async () =>
            {
                try
                {
                    if (@event.RequestContext.Count < RequestContextAccessor.Current.Count)
                        @event.RequestContext.UpsertMany(RequestContextAccessor.Current.GetAllKeyValues());

                    if (!await CheckHandleWhen(@event)) return;

                    if (CanExecuteHandlingEventUsingInboxConsumer(@event) &&
                        NotNeedWaitHandlerExecutionFinishedImmediately(@event))
                    {
                        // Execute using inbox
                        var eventSourceUow = TryGetCurrentOrCreatedActiveUow(@event);
                        var currentBusMessageIdentity = BuildCurrentBusMessageIdentity(@event.RequestContext);

                        if (@event is IPlatformUowEvent && eventSourceUow != null && !eventSourceUow.IsPseudoTransactionUow())
                        {
                            await HandleExecutingInboxConsumerAsync(
                                @event,
                                ServiceProvider,
                                ServiceProvider.GetRequiredService<PlatformInboxConfig>(),
                                ServiceProvider.GetRequiredService<IPlatformInboxBusMessageRepository>(),
                                ServiceProvider.GetRequiredService<IPlatformApplicationSettingContext>(),
                                currentBusMessageIdentity,
                                eventSourceUow,
                                cancellationToken);
                        }
                        else
                        {
                            await ServiceProvider.ExecuteInjectScopedAsync((
                                    IServiceProvider serviceProvider,
                                    PlatformInboxConfig inboxConfig,
                                    IPlatformInboxBusMessageRepository inboxMessageRepository,
                                    IPlatformApplicationSettingContext applicationSettingContext) =>
                                HandleExecutingInboxConsumerAsync(
                                    @event,
                                    serviceProvider,
                                    inboxConfig,
                                    inboxMessageRepository,
                                    applicationSettingContext,
                                    currentBusMessageIdentity,
                                    null,
                                    cancellationToken));
                        }
                    }
                    else
                    {
                        if (ApplicationSettingContext.IsDebugInformationMode)
                            Logger.Value.LogInformation("{Type} {Method} STARTED", GetType().FullName, nameof(ExecuteHandleAsync));

                        EnsureNoCircularPipeLine(@event);

                        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync<PlatformDomainRowVersionConflictException>(
                            () =>
                            {
                                if (AutoOpenUow)
                                {
                                    // If not ForceCurrentInstanceHandleInCurrentThreadAndScope, then create new scope to open new uow so that multiple events handlers from an event do not get conflicted
                                    // uow in the same scope if not open new scope
                                    if (ForceCurrentInstanceHandleInCurrentThreadAndScope)
                                        return UnitOfWorkManager.ExecuteUowTask(() => HandleAsync(@event, cancellationToken));
                                    else
                                    {
                                        return ServiceProvider.ExecuteInjectScopedAsync((
                                                IPlatformUnitOfWorkManager unitOfWorkManager,
                                                IServiceProvider serviceProvider) =>
                                            unitOfWorkManager.ExecuteUowTask(() => serviceProvider.GetRequiredService(GetType())
                                                .As<PlatformCqrsEventApplicationHandler<TEvent>>()
                                                .With(newInstance => CopyPropertiesToNewInstanceBeforeExecution(this, newInstance))
                                                .HandleAsync(@event, cancellationToken)));
                                    }
                                }
                                else
                                    return HandleAsync(@event, cancellationToken);
                            },
                            retryCount: RetryOnFailedTimes,
                            sleepDurationProvider: retryAttempt => Math.Min(retryAttempt + RetryOnFailedDelaySeconds, MaxRetryOnFailedDelaySeconds).Seconds(),
                            onRetry: (e, delayTime, retryAttempt, context) =>
                            {
                                if (retryAttempt > Util.TaskRunner.DefaultResilientRetryCount)
                                    LogError(@event, e.BeautifyStackTrace(), LoggerFactory, "Retry");
                            },
                            cancellationToken: cancellationToken);

                        if (ApplicationSettingContext.IsDebugInformationMode)
                            Logger.Value.LogInformation("{Type} {Method} FINISHED", GetType().FullName, nameof(ExecuteHandleAsync));
                    }
                }
                finally
                {
                    ApplicationSettingContext.ProcessAutoGarbageCollect();
                }
            });
    }

    /// <summary>
    /// Determines whether the event can be handled using the Inbox Consumer.
    /// </summary>
    /// <param name="event">The event to be handled.</param>
    /// <returns>
    /// Returns true if the Inbox Feature is enabled, the handler is not using the IPlatformApplicationRequestContextAccessor,
    /// and the event does not require immediate execution. Otherwise, it returns false.
    /// </returns>
    /// <remarks>
    /// Event handlers using IPlatformApplicationRequestContextAccessor cannot use the inbox because the user request context is not available when processing inbox messages.
    /// </remarks>
    public virtual bool CanExecuteHandlingEventUsingInboxConsumer(TEvent @event)
    {
        return HasInboxMessageSupport() && (NotNeedWaitHandlerExecutionFinishedImmediately(@event) || IsCalledFromInboxBusMessageConsumer);
    }

    /// <summary>
    /// Determines whether the event handling for the specified event can be executed in a background thread.
    /// </summary>
    /// <param name="event">The event to be handled.</param>
    /// <returns>
    /// Returns <c>true</c> if the event handling can be executed in a background thread; otherwise, <c>false</c>.
    /// This method returns <c>false</c> if any of the following conditions are met:
    /// - The current active Unit of Work (UoW) for the event is not null.
    /// - The event requires immediate execution of its handlers.
    /// - The event handling is forced to be executed in the same UoW as the event trigger.
    /// </returns>
    /// <remarks>
    /// This method is used to decide whether the event handling can be offloaded to a background thread for better performance and non-blocking operation.
    /// </remarks>
    protected override bool AllowHandleInBackgroundThread(TEvent @event)
    {
        return TryGetCurrentOrCreatedActiveUow(@event).Pipe(p => p == null || p.IsPseudoTransactionUow()) &&
               NotNeedWaitHandlerExecutionFinishedImmediately(@event);
    }

    /// <summary>
    /// Copies properties from the previous instance of the event handler to the new instance before execution.
    /// </summary>
    /// <param name="previousInstance">The previous instance of the event handler.</param>
    /// <param name="newInstance">The new instance of the event handler.</param>
    /// <remarks>
    /// This method is used to ensure that the new instance of the event handler has the same state as the previous instance before execution.
    /// Specifically, it copies the value of the `IsCurrentInstanceCalledFromInboxBusMessageConsumer` property from the previous instance to the new instance.
    /// </remarks>
    protected override void CopyPropertiesToNewInstanceBeforeExecution(
        PlatformCqrsEventHandler<TEvent> previousInstance,
        PlatformCqrsEventHandler<TEvent> newInstance)
    {
        base.CopyPropertiesToNewInstanceBeforeExecution(previousInstance, newInstance);

        var prevHandlerInstance = previousInstance.As<PlatformCqrsEventApplicationHandler<TEvent>>();
        var newHandlerInstance = newInstance.As<PlatformCqrsEventApplicationHandler<TEvent>>();

        newHandlerInstance.IsCalledFromInboxBusMessageConsumer = prevHandlerInstance.IsCalledFromInboxBusMessageConsumer;
    }

    /// <summary>
    /// Handles the specified event asynchronously.
    /// </summary>
    /// <param name="event">The event to handle.</param>
    /// <param name="cancellationToken">A cancellation token that can be used to cancel the work.</param>
    /// <param name="couldRunInBackgroundThread">A boolean value indicating whether the handling could run in a background thread.</param>
    /// <returns>A task that represents the asynchronous operation.</returns>
    /// <remarks>
    /// If the RequestContext of the event is null or empty, it sets the RequestContext values from the RequestContextAccessor.
    /// If the event passes the HandleWhen condition, it tries to get the current active source unit of work of the event.
    /// If the conditions are met, it adds the DoExecuteInstanceInNewScope action to the OnSaveChangesCompletedActions of the unit of work.
    /// Otherwise, it calls the base DoHandle method.
    /// </remarks>
    protected override async Task DoHandle(TEvent @event, CancellationToken cancellationToken)
    {
        try
        {
            var eventSourceUow = TryGetCurrentOrCreatedActiveUow(@event);

            if (eventSourceUow?.IsPseudoTransactionUow() == false &&
                NotNeedWaitHandlerExecutionFinishedImmediately(@event))
            {
                var thisHandlerInstanceEvent = DoHandle_BuildHandlerInstanceEvent(@event);

                DoHandle_AddEventStackTrace(thisHandlerInstanceEvent);

                eventSourceUow.OnSaveChangesCompletedActions.Add(async () =>
                {
                    // Execute task in background separated thread task
                    ExecuteHandleInBackgroundNewScopeAsync(thisHandlerInstanceEvent, cancellationToken);
                });
            }
            else
                await base.DoHandle(@event, cancellationToken);
        }
        catch (Exception e)
        {
            if (ThrowExceptionOnHandleFailed) throw;
            LogError(@event, e.BeautifyStackTrace(), LoggerFactory);
        }
    }

    protected override bool NeedWaitHandlerExecutionFinishedImmediately(TEvent @event)
    {
        return base.NeedWaitHandlerExecutionFinishedImmediately(@event) || IsCalledFromInboxBusMessageConsumer;
    }

    protected override async Task BeforeExecuteHandleAsync(PlatformCqrsEventHandler<TEvent> handlerNewInstance, TEvent @event)
    {
        if (!IsCalledFromInboxBusMessageConsumer)
            ProcessEventHandlerPipeLineInRequestContext(@event);
    }

    private void ProcessEventHandlerPipeLineInRequestContext(TEvent @event)
    {
        var requestContextEventHandlerPipeLine =
            @event.RequestContext.GetRequestContextValue<List<string>>(PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey) ?? [];
        var pipelineRoutingKey = GetPipelineRoutingKey(@event);

        requestContextEventHandlerPipeLine.Add(pipelineRoutingKey);

        @event.RequestContext.Upsert(PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey, requestContextEventHandlerPipeLine);
        if (IsHandlingInNewScope)
            RequestContext.Upsert(PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey, requestContextEventHandlerPipeLine, onlySelf: true);
    }

    private void EnsureNoCircularPipeLine(TEvent @event)
    {
        var requestContextEventHandlerPipeLine =
            @event.RequestContext.GetRequestContextValue<List<string>>(PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey) ?? [];
        var pipelineRoutingKey = GetPipelineRoutingKey(@event);

        // Prevent: A => [B, B => C, B => C => D] => A.
        if (requestContextEventHandlerPipeLine.Count >= ApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount * 2)
        {
            // p => p.Take(p.Count - 1).Count(p => p == pipelineRoutingKey) >= ApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount => circular ApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount times => could be forever
            requestContextEventHandlerPipeLine
                .ValidateNot(
                    mustNot: p => p.Take(p.Count - 1).Count(p => p == pipelineRoutingKey) >=
                                  ApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount,
                    $"The current [RequestContextEventHandlerPipeLine:{requestContextEventHandlerPipeLine.ToJson()}] lead to {pipelineRoutingKey} has circular call error.")
                .EnsureValid();
        }
    }

    protected virtual string GetPipelineRoutingKey(TEvent @event)
    {
        return $"{ApplicationSettingContext.ApplicationName}---{@event.GetType().GetNameOrGenericTypeName()}::{GetType().GetNameOrGenericTypeName()}";
    }

    protected bool HasInboxMessageSupport()
    {
        return RootServiceProvider.CheckHasRegisteredScopedService<IPlatformInboxBusMessageRepository>() && EnableInboxEventBusMessage;
    }

    protected async Task HandleExecutingInboxConsumerAsync(
        TEvent @event,
        IServiceProvider serviceProvider,
        PlatformInboxConfig inboxConfig,
        IPlatformInboxBusMessageRepository inboxMessageRepository,
        IPlatformApplicationSettingContext applicationSettingContext,
        PlatformBusMessageIdentity currentBusMessageIdentity,
        IPlatformUnitOfWork eventSourceUow,
        CancellationToken cancellationToken)
    {
        var eventSubQueuePrefix = @event.As<IPlatformSubMessageQueuePrefixSupport>()?.SubQueuePrefix();

        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            () => PlatformInboxMessageBusConsumerHelper.HandleExecutingInboxConsumerAsync(
                rootServiceProvider: RootServiceProvider,
                currentScopeServiceProvider: serviceProvider,
                consumerType: typeof(PlatformCqrsEventInboxBusMessageConsumer),
                inboxBusMessageRepository: inboxMessageRepository,
                inboxConfig: inboxConfig,
                applicationSettingContext: applicationSettingContext,
                message: CqrsEventInboxBusMessage(@event, eventHandlerType: GetType(), applicationSettingContext, currentBusMessageIdentity),
                forApplicationName: ApplicationSettingContext.ApplicationName,
                routingKey: PlatformBusMessageRoutingKey.BuildDefaultRoutingKey(@event.GetType(), applicationSettingContext.ApplicationName),
                loggerFactory: CreateGlobalLogger,
                retryProcessFailedMessageInSecondsUnit: PlatformInboxBusMessage.DefaultRetryProcessFailedMessageInSecondsUnit,
                handleExistingInboxMessage: null,
                currentScopeConsumerInstance: null,
                handleInUow: eventSourceUow,
                autoDeleteProcessedMessageImmediately: AutoDeleteProcessedInboxEventMessage &&
                                                       RootServiceProvider.GetService<PlatformModule.DistributedTracingConfig>()?.Enabled != true,
                subQueueMessageIdPrefix:
                $"{GetType().GetNameOrGenericTypeName()}-{eventSubQueuePrefix.Pipe(p => p.IsNullOrEmpty() ? $"NoSubQueueRandomId-{Ulid.NewUlid()}" : p)}",
                needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage: eventSubQueuePrefix.IsNotNullOrEmpty(),
                allowHandleNewInboxMessageInBackground: true,
                allowTryConsumeMessageImmediatelyBeforeCreateInboxMessage: false,
                cancellationToken: cancellationToken),
            retryCount: RetryEventInboxBusMessageConsumerMaxCount,
            sleepDurationProvider: retryAttempt => Math.Min(
                    RetryEventInboxBusMessageConsumerOnFailedDelaySeconds + retryAttempt,
                    RetryEventInboxBusMessageConsumerOnFailedDelayMaxSeconds)
                .Seconds(),
            cancellationToken: cancellationToken,
            onRetry: (exception, retryTime, retryAttempt, context) => Logger.Value.LogError(
                exception.BeautifyStackTrace(),
                "Execute inbox consumer for EventType:{EventType}; Event:{@Event}.",
                @event.GetType().FullName,
                @event));
    }

    protected virtual PlatformBusMessage<PlatformCqrsEventBusMessagePayload> CqrsEventInboxBusMessage(
        TEvent @event,
        Type eventHandlerType,
        IPlatformApplicationSettingContext applicationSettingContext,
        PlatformBusMessageIdentity currentBusMessageIdentity)
    {
        return PlatformBusMessage<PlatformCqrsEventBusMessagePayload>.New<PlatformBusMessage<PlatformCqrsEventBusMessagePayload>>(
            trackId: @event.Id,
            payload: PlatformCqrsEventBusMessagePayload.New(@event, eventHandlerType.FullName),
            identity: currentBusMessageIdentity,
            producerContext: applicationSettingContext.ApplicationName,
            messageGroup: nameof(PlatformCqrsEvent),
            messageAction: @event.EventAction,
            requestContext: @event.RequestContext);
    }

    protected IPlatformUnitOfWork? TryGetCurrentOrCreatedActiveUow(TEvent notification)
    {
        if (notification.As<IPlatformUowEvent>() == null) return null;

        return UnitOfWorkManager.TryGetCurrentOrCreatedActiveUow(notification.As<IPlatformUowEvent>().SourceUowId);
    }

    public virtual PlatformBusMessageIdentity BuildCurrentBusMessageIdentity(IDictionary<string, object> eventRequestContext)
    {
        return new PlatformBusMessageIdentity
        {
            UserId = eventRequestContext.UserId(),
            RequestId = eventRequestContext.RequestId(),
            UserName = eventRequestContext.UserName()
        };
    }

    public ILogger CreateGlobalLogger()
    {
        return CreateLogger(RootServiceProvider.GetRequiredService<ILoggerFactory>());
    }
}
