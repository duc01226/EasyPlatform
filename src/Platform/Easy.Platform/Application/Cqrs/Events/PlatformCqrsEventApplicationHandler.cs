using Easy.Platform.Application.Cqrs.Events.InboxSupport;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.MessageBus.Producers;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

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

    public bool IsCurrentInstanceCalledFromInboxBusMessageConsumer { get; set; }

    /// <summary>
    /// Determines whether the event can be handled using Inbox Consumer.
    /// </summary>
    /// <param name="hasInboxMessageSupport">Indicates whether the event has Inbox Message Support.</param>
    /// <param name="event">The event to check.</param>
    bool CanExecuteHandlingEventUsingInboxConsumer(bool hasInboxMessageSupport, object @event);
}

public interface IPlatformCqrsEventApplicationHandler<in TEvent> : IPlatformCqrsEventApplicationHandler, IPlatformCqrsEventHandler<TEvent>
    where TEvent : PlatformCqrsEvent, new()
{
    bool CanExecuteHandlingEventUsingInboxConsumer(bool hasInboxMessageSupport, TEvent @event);
}

public abstract class PlatformCqrsEventApplicationHandler<TEvent> : PlatformCqrsEventHandler<TEvent>, IPlatformCqrsEventApplicationHandler<TEvent>
    where TEvent : PlatformCqrsEvent, new()
{
    protected readonly IServiceProvider ServiceProvider;
    protected readonly IPlatformUnitOfWorkManager UnitOfWorkManager;

    private readonly Lazy<bool> isInjectingApplicationBusMessageProducerLazy;
    private readonly Lazy<bool> isInjectingRequestContextAccessorLazy;
    private readonly IPlatformApplicationRequestContextAccessor requestContextAccessor;

    public PlatformCqrsEventApplicationHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider) : base(loggerFactory, rootServiceProvider)
    {
        UnitOfWorkManager = unitOfWorkManager;
        ServiceProvider = serviceProvider;
        isInjectingRequestContextAccessorLazy = new Lazy<bool>(() => GetType().IsUsingGivenTypeViaConstructor<IPlatformApplicationRequestContextAccessor>());
        isInjectingApplicationBusMessageProducerLazy = new Lazy<bool>(() => GetType().IsUsingGivenTypeViaConstructor<IPlatformApplicationBusMessageProducer>());
        requestContextAccessor = ServiceProvider.GetRequiredService<IPlatformApplicationRequestContextAccessor>();
        ApplicationSettingContext = ServiceProvider.GetRequiredService<IPlatformApplicationSettingContext>();
        Logger = new Lazy<ILogger>(() => CreateLogger(LoggerFactory));
    }

    protected virtual bool AllowUsingRequestContextAccessor => false;

    protected virtual bool AutoOpenUow => true;

    protected virtual bool MustWaitHandlerExecutionFinishedImmediately => false;

    protected Lazy<ILogger> Logger { get; }

    protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }

    public bool IsInjectingRequestContextAccessor => isInjectingRequestContextAccessorLazy.Value;

    public bool IsInjectingApplicationBusMessageProducer => isInjectingApplicationBusMessageProducerLazy.Value;

    public virtual bool AutoDeleteProcessedInboxEventMessage => false;

    /// <summary>
    /// Default false. If true, the event handler will handle immediately using the same current active uow if existing active uow
    /// </summary>
    public virtual bool ForceInSameEventTriggerUow => false;

    public int RetryEventInboxBusMessageConsumerOnFailedDelaySeconds { get; set; } = 15;

    /// <summary>
    /// RetryEventInboxBusMessageConsumerMaxCount. Default is 40320, equivalent to default of
    /// RetryEventInboxBusMessageConsumerOnFailedDelaySeconds * 40320 = 1 week total seconds
    /// </summary>
    public int RetryEventInboxBusMessageConsumerMaxCount { get; set; } = 40320;

    /// <summary>
    /// Gets or sets a value indicating whether the current instance of the event handler is called from the Inbox Bus Message Consumer.
    /// </summary>
    /// <value>
    /// <c>true</c> if this instance is called from the Inbox Bus Message Consumer; otherwise, <c>false</c>.
    /// </value>
    public bool IsCurrentInstanceCalledFromInboxBusMessageConsumer { get; set; }

    /// <summary>
    /// Default return False. When True, Support for store cqrs event handler as inbox if inbox bus message is enabled in persistence module
    /// </summary>
    public virtual bool EnableInboxEventBusMessage => true;

    public override bool ThrowExceptionOnHandleFailed { get => IsCurrentInstanceCalledFromInboxBusMessageConsumer; set { } }

    public override Task ExecuteHandleAsync(object @event, CancellationToken cancellationToken)
    {
        return ExecuteHandleWithTracingAsync(@event.As<TEvent>(), () => DoExecuteHandleAsync(@event.As<TEvent>(), cancellationToken));
    }

    public override Task Handle(object @event, CancellationToken cancellationToken)
    {
        return DoHandle(@event.As<TEvent>(), cancellationToken, () => !IsInjectingRequestContextAccessor);
    }

    public override bool HandleWhen(object @event)
    {
        return HandleWhen(@event.As<TEvent>());
    }

    public bool CanExecuteHandlingEventUsingInboxConsumer(bool hasInboxMessageSupport, object @event)
    {
        return CanExecuteHandlingEventUsingInboxConsumer(hasInboxMessageSupport, @event.As<TEvent>());
    }

    public override async Task Handle(TEvent notification, CancellationToken cancellationToken)
    {
        if (IsInjectingRequestContextAccessor && !AllowUsingRequestContextAccessor)
            Logger.Value
                .LogError(
                    "{EventHandlerType} is injecting and using {IPlatformApplicationRequestContextAccessor}, which will make the event handler could not run in background thread. " +
                    "The event sender must wait the handler to be finished. Should use the {RequestContext} info in the event instead.",
                    GetType().Name,
                    nameof(IPlatformApplicationRequestContextAccessor),
                    nameof(PlatformCqrsEvent.RequestContext));

        await DoHandle(notification, cancellationToken, () => !IsInjectingRequestContextAccessor);
    }

    public override Task ExecuteHandleAsync(TEvent @event, CancellationToken cancellationToken)
    {
        return ExecuteHandleWithTracingAsync(@event, () => DoExecuteHandleAsync(@event, cancellationToken));
    }

    /// <summary>
    /// Determines whether the event can be handled using the Inbox Consumer.
    /// </summary>
    /// <param name="hasInboxMessageSupport">Indicates whether the Inbox Message Support is enabled.</param>
    /// <param name="event">The event to be handled.</param>
    /// <returns>
    /// Returns true if the Inbox Feature is enabled, the handler is not using the IPlatformApplicationRequestContextAccessor,
    /// and the event does not require immediate execution. Otherwise, it returns false.
    /// </returns>
    /// <remarks>
    /// Event handlers using IPlatformApplicationRequestContextAccessor cannot use the inbox because the user request context is not available when processing inbox messages.
    /// </remarks>
    public virtual bool CanExecuteHandlingEventUsingInboxConsumer(bool hasInboxMessageSupport, TEvent @event)
    {
        // EventHandler using IPlatformApplicationRequestContextAccessor cannot use inbox because user request context is not available when process inbox message
        var usingApplicationRequestContextAccessor = IsInjectingRequestContextAccessor;
        var hasEnabledInboxFeature = EnableInboxEventBusMessage && hasInboxMessageSupport;

        if (usingApplicationRequestContextAccessor && hasEnabledInboxFeature)
            Logger.Value
                .LogWarning(
                    "[WARNING] Auto handing event directly, not support using InboxEvent in [EventHandlerType:{EventHandlerType}]. " +
                    "EventHandler using IPlatformApplicationRequestContextAccessor cannot use inbox because user request context is not available when process inbox message. " +
                    "Should refactor removing using IPlatformApplicationRequestContextAccessor to support inbox.",
                    GetType().FullName);

        return hasEnabledInboxFeature && !usingApplicationRequestContextAccessor && !@event.MustWaitHandlerExecutionFinishedImmediately(GetType());
    }

    /// <summary>
    /// Determines whether the event handling for the specified event can be executed in a background thread.
    /// </summary>
    /// <param name="event">The event to be handled.</param>
    /// <returns>
    /// Returns <c>true</c> if the event handling can be executed in a background thread; otherwise, <c>false</c>.
    /// This method returns <c>false</c> if any of the following conditions are met:
    /// - The current active Unit of Work (UoW) for the event is not null.
    /// - The event can be handled using an Inbox Consumer.
    /// - The event requires immediate execution of its handlers.
    /// - The Application Bus Message Producer is being injected and Outbox Message Support is enabled.
    /// - The User Context Accessor is being injected.
    /// - The event handling is forced to be executed in the same UoW as the event trigger.
    /// </returns>
    /// <remarks>
    /// This method is used to decide whether the event handling can be offloaded to a background thread for better performance and non-blocking operation.
    /// </remarks>
    protected override bool AllowHandleInBackgroundThread(TEvent @event)
    {
        return TryGetCurrentOrCreatedActiveUow(@event) == null &&
               !CanExecuteHandlingEventUsingInboxConsumer(HasInboxMessageSupport(), @event) &&
               !@event.MustWaitHandlerExecutionFinishedImmediately(GetType()) &&
               !(IsInjectingApplicationBusMessageProducer && HasOutboxMessageSupport()) &&
               !IsInjectingRequestContextAccessor &&
               !ForceInSameEventTriggerUow;
    }

    protected bool HasOutboxMessageSupport()
    {
        return RootServiceProvider.CheckHasRegisteredScopedService<IPlatformOutboxBusMessageRepository>();
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

        var applicationHandlerPreviousInstance = previousInstance.As<PlatformCqrsEventApplicationHandler<TEvent>>();
        var applicationHandlerNewInstance = newInstance.As<PlatformCqrsEventApplicationHandler<TEvent>>();

        applicationHandlerNewInstance.IsCurrentInstanceCalledFromInboxBusMessageConsumer =
            applicationHandlerPreviousInstance.IsCurrentInstanceCalledFromInboxBusMessageConsumer;
    }

    /// <summary>
    /// Handles the specified event asynchronously.
    /// </summary>
    /// <param name="@event">The event to handle.</param>
    /// <param name="cancellationToken">A cancellation token that can be used to cancel the work.</param>
    /// <param name="couldRunInBackgroundThread">A boolean value indicating whether the handling could run in a background thread.</param>
    /// <returns>A task that represents the asynchronous operation.</returns>
    /// <remarks>
    /// If the RequestContext of the event is null or empty, it sets the RequestContext values from the RequestContextAccessor.
    /// If the event passes the HandleWhen condition, it tries to get the current active source unit of work of the event.
    /// If the conditions are met, it adds the DoExecuteInstanceInNewScope action to the OnSaveChangesCompletedActions of the unit of work.
    /// Otherwise, it calls the base DoHandle method.
    /// </remarks>
    protected override async Task DoHandle(TEvent @event, CancellationToken cancellationToken, Func<bool> couldRunInBackgroundThread)
    {
        if (@event.RequestContext == null || @event.RequestContext.IsEmpty())
            @event.SetRequestContextValues(requestContextAccessor.Current.GetAllKeyValues(ApplicationSettingContext.GetIgnoreRequestContextKeys()));

        if (!HandleWhen(@event)) return;

        if (RootServiceProvider.GetService<PlatformModule.DistributedTracingConfig>()?.DistributedTracingStackTraceEnabled() == true &&
            @event.StackTrace == null)
            @event.StackTrace = PlatformEnvironment.StackTrace();

        var eventSourceUow = TryGetCurrentOrCreatedActiveUow(@event);

        if (!ForceInSameEventTriggerUow &&
            eventSourceUow != null &&
            !eventSourceUow.IsPseudoTransactionUow() &&
            !CanExecuteHandlingEventUsingInboxConsumer(RootServiceProvider.IsServiceTypeRegistered(typeof(IPlatformInboxBusMessageRepository)), @event) &&
            !@event.MustWaitHandlerExecutionFinishedImmediately(GetType()) &&
            !MustWaitHandlerExecutionFinishedImmediately)
            eventSourceUow.OnSaveChangesCompletedActions.Add(
                async () =>
                {
                    await ExecuteHandleInNewScopeAsync(@event, cancellationToken);
                });
        else
            await base.DoHandle(@event, cancellationToken, () => !IsInjectingRequestContextAccessor);
    }

    /// <summary>
    /// Executes the event handling asynchronously.
    /// </summary>
    /// <param name="event">The event of type TEvent to be handled.</param>
    /// <param name="cancellationToken">A cancellation token that can be used to cancel the work.</param>
    /// <remarks>
    /// This method checks if the event can be handled in a background thread and if so, sets the user context values.
    /// It also checks if the event can be handled using an inbox consumer and if not currently called from an inbox bus message consumer,
    /// and if the event does not require immediate execution, it processes the event accordingly.
    /// If the event cannot be handled using an inbox consumer, it checks if a unit of work should be automatically opened and handles the event accordingly.
    /// </remarks>
    /// <returns>A Task representing the asynchronous operation.</returns>
    protected virtual async Task DoExecuteHandleAsync(TEvent @event, CancellationToken cancellationToken)
    {
        try
        {
            if (AllowHandleInBackgroundThread(@event) && @event.RequestContext?.Any() == true)
                requestContextAccessor.Current.SetValues(@event.RequestContext);


            if (CanExecuteHandlingEventUsingInboxConsumer(
                    hasInboxMessageSupport: HasInboxMessageSupport(),
                    @event) &&
                !IsCurrentInstanceCalledFromInboxBusMessageConsumer &&
                !IsInjectingRequestContextAccessor &&
                !@event.MustWaitHandlerExecutionFinishedImmediately(GetType()))
            {
                var eventSourceUow = TryGetCurrentOrCreatedActiveUow(@event);
                var currentBusMessageIdentity = BuildCurrentBusMessageIdentity(@event.RequestContext);

                if (@event is IPlatformUowEvent && eventSourceUow != null && !eventSourceUow.IsPseudoTransactionUow())
                    await HandleExecutingInboxConsumerAsync(
                        @event,
                        ServiceProvider,
                        ServiceProvider.GetRequiredService<PlatformInboxConfig>(),
                        ServiceProvider.GetRequiredService<IPlatformInboxBusMessageRepository>(),
                        ServiceProvider.GetRequiredService<IPlatformApplicationSettingContext>(),
                        currentBusMessageIdentity,
                        eventSourceUow,
                        cancellationToken);
                else
                    await RootServiceProvider.ExecuteInjectScopedAsync(
                        async (
                            IServiceProvider serviceProvider,
                            PlatformInboxConfig inboxConfig,
                            IPlatformInboxBusMessageRepository inboxMessageRepository,
                            IPlatformApplicationSettingContext applicationSettingContext) =>
                        {
                            await HandleExecutingInboxConsumerAsync(
                                @event,
                                serviceProvider,
                                inboxConfig,
                                inboxMessageRepository,
                                applicationSettingContext,
                                currentBusMessageIdentity,
                                null,
                                cancellationToken);
                        });
            }
            else
            {
                await RunHandleAsync(@event, cancellationToken);
            }
        }
        finally
        {
            if (ApplicationSettingContext.AutoGarbageCollectPerProcessRequestOrBusMessage)
                Util.GarbageCollector.Collect(ApplicationSettingContext.AutoGarbageCollectPerProcessRequestOrBusMessageThrottleTimeSeconds);
        }
    }

    protected async Task RunHandleAsync(TEvent @event, CancellationToken cancellationToken)
    {
        if (AutoOpenUow)
        {
            // If handler already executed in background or from inbox consumer, not need to open new scope for open uow
            // If not then create new scope to open new uow so that multiple events handlers from an event do not get conflicted
            // uow in the same scope if not open new scope
            if (AllowHandleInBackgroundThread(@event) ||
                CanExecuteHandlingEventUsingInboxConsumer(HasInboxMessageSupport(), @event))
                using (var uow = UnitOfWorkManager.Begin())
                {
                    await HandleAsync(@event, cancellationToken);
                    await uow.CompleteAsync(cancellationToken);
                }
            else
                using (var newScope = RootServiceProvider.CreateScope())
                {
                    using (var uow = newScope.ServiceProvider.GetRequiredService<IPlatformUnitOfWorkManager>().Begin())
                    {
                        await newScope.ServiceProvider.GetRequiredService(GetType())
                            .As<PlatformCqrsEventApplicationHandler<TEvent>>()
                            .With(newInstance => CopyPropertiesToNewInstanceBeforeExecution(this, newInstance))
                            .HandleAsync(@event, cancellationToken);

                        await uow.CompleteAsync(cancellationToken);
                    }
                }
        }
        else
        {
            await HandleAsync(@event, cancellationToken);
        }
    }

    protected bool HasInboxMessageSupport()
    {
        return RootServiceProvider.CheckHasRegisteredScopedService<IPlatformInboxBusMessageRepository>();
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
        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () => await PlatformInboxMessageBusConsumerHelper.HandleExecutingInboxConsumerAsync(
                rootServiceProvider: RootServiceProvider,
                serviceProvider: serviceProvider,
                consumerType: typeof(PlatformCqrsEventInboxBusMessageConsumer),
                inboxBusMessageRepository: inboxMessageRepository,
                inboxConfig: inboxConfig,
                message: CqrsEventInboxBusMessage(@event, eventHandlerType: GetType(), applicationSettingContext, currentBusMessageIdentity),
                forApplicationName: ApplicationSettingContext.ApplicationName,
                routingKey: PlatformBusMessageRoutingKey.BuildDefaultRoutingKey(typeof(TEvent), applicationSettingContext.ApplicationName),
                loggerFactory: CreateGlobalLogger,
                retryProcessFailedMessageInSecondsUnit: PlatformInboxBusMessage.DefaultRetryProcessFailedMessageInSecondsUnit,
                allowProcessInBackgroundThread: AllowHandleInBackgroundThread(@event),
                handleExistingInboxMessage: null,
                handleExistingInboxMessageConsumerInstance: null,
                handleInUow: eventSourceUow,
                autoDeleteProcessedMessageImmediately: AutoDeleteProcessedInboxEventMessage &&
                                                       RootServiceProvider.GetService<PlatformModule.DistributedTracingConfig>()?.Enabled != true,
                extendedMessageIdPrefix:
                $"{GetType().GetNameOrGenericTypeName()}-{@event.As<IPlatformSubMessageQueuePrefixSupport>()?.SubQueuePrefix() ?? @event.Id}",
                cancellationToken: cancellationToken),
            retryCount: RetryEventInboxBusMessageConsumerMaxCount,
            sleepDurationProvider: retryAttempt => RetryEventInboxBusMessageConsumerOnFailedDelaySeconds.Seconds(),
            cancellationToken: cancellationToken,
            onRetry: (exception, retryTime, retryAttempt, context) => Logger.Value.LogError(
                exception,
                "Execute inbox consumer for EventType:{EventType}; EventContent:{EventContent}.",
                @event.GetType().FullName,
                @event.ToFormattedJson()));
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

    protected IPlatformUnitOfWork TryGetCurrentOrCreatedActiveUow(TEvent notification)
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
