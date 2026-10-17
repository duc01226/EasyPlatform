#region

using System.Runtime.CompilerServices;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.Application.MessageBus.Store;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.MessageBus.Producers;

/// <summary>
/// Provides methods for producing and sending messages to the message bus in platform applications.
/// This interface defines methods for sending messages with various options, such as tracking IDs, message groups,
/// message actions, and support for the Outbox Pattern.
/// </summary>
public interface IPlatformApplicationBusMessageProducer
{
    /// <summary>
    /// Sends a message to the bus with a specific payload and routing key.
    /// The routing key is constructed based on the message type, application name, and optional message action.
    /// If <paramref name="forceUseDefaultRoutingKey" /> is true or the message does not implement <see cref="IPlatformSelfRoutingKeyBusMessage" />,
    /// the default routing key is used (<see cref="PlatformBusMessageRoutingKey.BuildDefaultRoutingKey" />).
    /// </summary>
    /// <typeparam name="TMessage">The type of the message.</typeparam>
    /// <typeparam name="TMessagePayload">The type of the message payload.</typeparam>
    /// <param name="trackId">A unique identifier for tracking the message.</param>
    /// <param name="messagePayload">The payload of the message.</param>
    /// <param name="messageGroup">The group of the message.</param>
    /// <param name="messageAction">An optional action associated with the message.</param>
    /// <param name="autoSaveOutboxMessage">Whether to automatically save the message to the outbox if supported.</param>
    /// <param name="forceUseDefaultRoutingKey">Whether to force the use of the default routing key.</param>
    /// <param name="sendInNewTransactionScope">sendInNewTransactionScope</param>
    /// <param name="cancellationToken">A cancellation token.</param>
    /// <returns>A task representing the asynchronous operation, returning the sent message.</returns>
    public Task<TMessage> SendAsync<TMessage, TMessagePayload>(
        string trackId,
        TMessagePayload messagePayload,
        string messageGroup = null,
        string messageAction = null,
        bool autoSaveOutboxMessage = true,
        bool forceUseDefaultRoutingKey = false,
        bool sendInNewTransactionScope = false,
        CancellationToken cancellationToken = default)
        where TMessage : class, IPlatformWithPayloadBusMessage<TMessagePayload>, IPlatformSelfRoutingKeyBusMessage, IPlatformTrackableBusMessage, new()
        where TMessagePayload : class, new();

    /// <summary>
    /// Sends a message to the bus.
    /// If <paramref name="forceUseDefaultRoutingKey" /> is true or the message does not implement <see cref="IPlatformSelfRoutingKeyBusMessage" />,
    /// the default routing key is used (<see cref="PlatformBusMessageRoutingKey.BuildDefaultRoutingKey" />).
    /// </summary>
    /// <typeparam name="TMessage">The type of the message.</typeparam>
    /// <param name="message">The message to send.</param>
    /// <param name="autoSaveOutboxMessage">Whether to automatically save the message to the outbox if supported.</param>
    /// <param name="forceUseDefaultRoutingKey">Whether to force the use of the default routing key.</param>
    /// <param name="sourceOutboxUowId">The ID of the unit of work that originated the outbox message.</param>
    /// <param name="sendInNewTransactionScope">sendInNewTransactionScope</param>
    /// <param name="cancellationToken">A cancellation token.</param>
    /// <returns>A task representing the asynchronous operation, returning the sent message.</returns>
    public Task<TMessage> SendAsync<TMessage>(
        TMessage message,
        bool autoSaveOutboxMessage = true,
        bool forceUseDefaultRoutingKey = false,
        string sourceOutboxUowId = null,
        bool sendInNewTransactionScope = false,
        CancellationToken cancellationToken = default)
        where TMessage : class, new();

    /// <summary>
    /// Checks if outbox message support is available.
    /// </summary>
    /// <returns>True if outbox message support is available; otherwise, false.</returns>
    public bool HasOutboxMessageSupport();
}

/// <summary>
/// Additive capability for callers that must select an explicit message-bus store and application lane.
/// The legacy producer interface intentionally remains unchanged so existing decorators and test doubles stay valid.
/// </summary>
public interface IPlatformKeyedApplicationBusMessageProducer
{
    /// <summary>
    /// Sends a message through the selected logical store and application lane.
    /// </summary>
    Task<TMessage> SendAsync<TMessage>(
        PlatformMessageBusStoreKey storeKey,
        TMessage message,
        string applicationName = null,
        bool autoSaveOutboxMessage = true,
        bool forceUseDefaultRoutingKey = false,
        string sourceOutboxUowId = null,
        bool sendInNewTransactionScope = false,
        CancellationToken cancellationToken = default)
        where TMessage : class, new();

    /// <summary>
    /// Builds and sends a payload message through the selected logical store and application lane.
    /// </summary>
    Task<TMessage> SendAsync<TMessage, TMessagePayload>(
        PlatformMessageBusStoreKey storeKey,
        string trackId,
        TMessagePayload messagePayload,
        string applicationName = null,
        string messageGroup = null,
        string messageAction = null,
        bool autoSaveOutboxMessage = true,
        bool forceUseDefaultRoutingKey = false,
        bool sendInNewTransactionScope = false,
        CancellationToken cancellationToken = default)
        where TMessage : class, IPlatformWithPayloadBusMessage<TMessagePayload>, IPlatformSelfRoutingKeyBusMessage, IPlatformTrackableBusMessage, new()
        where TMessagePayload : class, new();

    /// <summary>
    /// Checks outbox support for the selected logical store and application lane.
    /// </summary>
    bool HasOutboxMessageSupport(PlatformMessageBusStoreKey storeKey, string applicationName = null);
}

/// <summary>
/// A concrete implementation of <see cref="IPlatformApplicationBusMessageProducer" /> for producing and sending messages in platform applications.
/// This class provides methods for building messages, sending them to the bus, and managing outbox messages.
/// </summary>
public class PlatformApplicationBusMessageProducer : IPlatformApplicationBusMessageProducer, IPlatformKeyedApplicationBusMessageProducer
{
    private readonly Lazy<ILogger<PlatformApplicationBusMessageProducer>> loggerLazy;
    private readonly IPlatformMessageBusStoreRegistry messageBusStoreRegistry;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformApplicationBusMessageProducer" /> class.
    /// </summary>
    /// <param name="serviceProvider">The service provider for the current scope.</param>
    /// <param name="loggerFactory">A factory for creating loggers.</param>
    /// <param name="applicationSettingContext">The application setting context.</param>
    /// <param name="requestContextAccessor">The request context accessor.</param>
    /// <param name="outboxConfig">The configuration for the outbox pattern.</param>
    /// <param name="unitOfWorkManager">The unit of work manager.</param>
    public PlatformApplicationBusMessageProducer(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory,
        IPlatformApplicationSettingContext applicationSettingContext,
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        PlatformOutboxConfig outboxConfig,
        IPlatformUnitOfWorkManager unitOfWorkManager)
    {
        ServiceProvider = serviceProvider;
        loggerLazy = new Lazy<ILogger<PlatformApplicationBusMessageProducer>>(() => loggerFactory.CreateLogger<PlatformApplicationBusMessageProducer>());
        MessageBusProducer = serviceProvider.GetService<IPlatformMessageBusProducer>() ?? new PlatformPseudoMessageBusProducer();
        ApplicationSettingContext = applicationSettingContext;
        RequestContextAccessor = requestContextAccessor;
        OutboxConfig = outboxConfig;
        UnitOfWorkManager = unitOfWorkManager;
        messageBusStoreRegistry = serviceProvider.GetService<IPlatformMessageBusStoreRegistry>();
    }

    /// <summary>
    /// Gets the service provider for the current scope.
    /// </summary>
    protected IServiceProvider ServiceProvider { get; }

    /// <summary>
    /// Gets the logger for this class.
    /// </summary>
    protected ILogger<PlatformApplicationBusMessageProducer> Logger => loggerLazy.Value;

    /// <summary>
    /// Gets the message bus producer.
    /// </summary>
    protected IPlatformMessageBusProducer MessageBusProducer { get; }

    /// <summary>
    /// Gets the application setting context.
    /// </summary>
    protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }

    /// <summary>
    /// Gets the request context accessor.
    /// </summary>
    protected IPlatformApplicationRequestContextAccessor RequestContextAccessor { get; }

    /// <summary>
    /// Gets the configuration for the outbox pattern.
    /// </summary>
    protected PlatformOutboxConfig OutboxConfig { get; }

    /// <summary>
    /// Gets the unit of work manager.
    /// </summary>
    protected IPlatformUnitOfWorkManager UnitOfWorkManager { get; }

    /// <inheritdoc />
    public async Task<TMessage> SendAsync<TMessage, TMessagePayload>(
        string trackId,
        TMessagePayload messagePayload,
        string messageGroup = null,
        string messageAction = null,
        bool autoSaveOutboxMessage = true,
        bool forceUseDefaultRoutingKey = false,
        bool sendInNewTransactionScope = false,
        CancellationToken cancellationToken = default)
        where TMessage : class, IPlatformWithPayloadBusMessage<TMessagePayload>, IPlatformSelfRoutingKeyBusMessage, IPlatformTrackableBusMessage, new()
        where TMessagePayload : class, new()
    {
        // A composed host routes the unqualified overload through the Default store key (same lane, repository, and
        // configuration the keyed overload selects), so the routed send logic exists exactly once.
        if (HasRuntimeStoreComposition)
        {
            return await SendAsync<TMessage, TMessagePayload>(
                PlatformMessageBusStoreKey.Default,
                trackId,
                messagePayload,
                applicationName: null,
                messageGroup,
                messageAction,
                autoSaveOutboxMessage,
                forceUseDefaultRoutingKey,
                sendInNewTransactionScope,
                cancellationToken);
        }

        // Build the message with the provided payload and routing key information.
        var message = BuildPlatformBusMessage<TMessage, TMessagePayload>(
            trackId,
            messagePayload,
            messageGroup,
            messageAction);

        // Send the message to the bus, using the appropriate routing key and outbox options.
        return await SendMessageAsync(
            message,
            forceUseDefaultRoutingKey
                ? PlatformBusMessageRoutingKey.BuildDefaultRoutingKey(message.GetType(), ApplicationSettingContext.ApplicationName)
                : message.RoutingKey(),
            autoSaveOutboxMessage,
            UnitOfWorkManager.TryGetCurrentActiveUow()?.Id,
            sendInNewTransactionScope,
            cancellationToken);
    }

    /// <inheritdoc />
    public async Task<TMessage> SendAsync<TMessage>(
        PlatformMessageBusStoreKey storeKey,
        TMessage message,
        string applicationName = null,
        bool autoSaveOutboxMessage = true,
        bool forceUseDefaultRoutingKey = false,
        string sourceOutboxUowId = null,
        bool sendInNewTransactionScope = false,
        CancellationToken cancellationToken = default)
        where TMessage : class, new()
    {
        if (message == null) return null;

        if (!HasRuntimeStoreComposition)
        {
            return await SendAsync(
                message,
                autoSaveOutboxMessage,
                forceUseDefaultRoutingKey,
                sourceOutboxUowId,
                sendInNewTransactionScope,
                cancellationToken);
        }

        var route = ResolveRoute(storeKey, applicationName);

        return await SendRoutedMessageAsync(
            message,
            route,
            BuildRoutingKey(message, forceUseDefaultRoutingKey, route.ApplicationName),
            autoSaveOutboxMessage,
            sourceOutboxUowId,
            sendInNewTransactionScope,
            cancellationToken);
    }

    /// <inheritdoc />
    public async Task<TMessage> SendAsync<TMessage, TMessagePayload>(
        PlatformMessageBusStoreKey storeKey,
        string trackId,
        TMessagePayload messagePayload,
        string applicationName = null,
        string messageGroup = null,
        string messageAction = null,
        bool autoSaveOutboxMessage = true,
        bool forceUseDefaultRoutingKey = false,
        bool sendInNewTransactionScope = false,
        CancellationToken cancellationToken = default)
        where TMessage : class, IPlatformWithPayloadBusMessage<TMessagePayload>, IPlatformSelfRoutingKeyBusMessage, IPlatformTrackableBusMessage, new()
        where TMessagePayload : class, new()
    {
        if (!HasRuntimeStoreComposition)
        {
            return await SendAsync<TMessage, TMessagePayload>(
                trackId,
                messagePayload,
                messageGroup,
                messageAction,
                autoSaveOutboxMessage,
                forceUseDefaultRoutingKey,
                sendInNewTransactionScope,
                cancellationToken);
        }

        var route = ResolveRoute(storeKey, applicationName);
        var message = BuildPlatformBusMessage<TMessage, TMessagePayload>(
            trackId,
            messagePayload,
            messageGroup,
            messageAction,
            route.ApplicationName);

        return await SendRoutedMessageAsync(
            message,
            route,
            forceUseDefaultRoutingKey
                ? PlatformBusMessageRoutingKey.BuildDefaultRoutingKey(message.GetType(), route.ApplicationName)
                : message.RoutingKey(),
            autoSaveOutboxMessage,
            sourceOutboxUowId: null,
            sendInNewTransactionScope,
            cancellationToken);
    }

    /// <inheritdoc />
    public async Task<TMessage> SendAsync<TMessage>(
        TMessage message,
        bool autoSaveOutboxMessage = true,
        bool forceUseDefaultRoutingKey = false,
        string sourceOutboxUowId = null,
        bool sendInNewTransactionScope = false,
        CancellationToken cancellationToken = default) where TMessage : class, new()
    {
        if (message == null) return null;

        if (HasRuntimeStoreComposition)
        {
            return await SendAsync(
                PlatformMessageBusStoreKey.Default,
                message,
                applicationName: null,
                autoSaveOutboxMessage,
                forceUseDefaultRoutingKey,
                sourceOutboxUowId,
                sendInNewTransactionScope,
                cancellationToken);
        }

        // Send the message to the bus, using the appropriate routing key and outbox options.
        return await SendMessageAsync(
            message,
            routingKey: BuildRoutingKey(message, forceUseDefaultRoutingKey, ApplicationSettingContext.ApplicationName),
            autoSaveOutboxMessage,
            sourceOutboxUowId ?? UnitOfWorkManager.TryGetCurrentActiveUow()?.Id,
            sendInNewTransactionScope,
            cancellationToken);
    }

    /// <inheritdoc />
    public bool HasOutboxMessageSupport()
    {
        if (HasRuntimeStoreComposition)
            return HasOutboxMessageSupport(PlatformMessageBusStoreKey.Default);

        return ServiceProvider.ExecuteScoped(scope => scope.ServiceProvider.GetService<IPlatformOutboxBusMessageRepository>() != null);
    }

    /// <inheritdoc />
    public bool HasOutboxMessageSupport(PlatformMessageBusStoreKey storeKey, string applicationName = null)
    {
        if (!HasRuntimeStoreComposition)
            return HasOutboxMessageSupport();

        return ResolveRoute(storeKey, applicationName).Descriptor.IsOutboxEnabled;
    }

    /// <summary>
    /// Builds a platform event bus message identity object, containing information about the user and request context.
    /// </summary>
    /// <returns>A <see cref="PlatformBusMessageIdentity" /> object.</returns>
    protected PlatformBusMessageIdentity BuildPlatformEventBusMessageIdentity()
    {
        return new PlatformBusMessageIdentity
        {
            UserId = RequestContextAccessor.Current.UserId(),
            RequestId = RequestContextAccessor.Current.RequestId(),
            UserName = RequestContextAccessor.Current.UserName()
        };
    }

    /// <summary>
    /// Sends a message to the bus, handling outbox message persistence if enabled.
    /// </summary>
    /// <typeparam name="TMessage">The type of the message.</typeparam>
    /// <param name="message">The message to send.</param>
    /// <param name="routingKey">The routing key for the message.</param>
    /// <param name="autoSaveOutboxMessage">Whether to automatically save the message to the outbox if supported.</param>
    /// <param name="sourceOutboxUowId">The ID of the unit of work that originated the outbox message.</param>
    /// <param name="sendInNewTransactionScope"></param>
    /// <param name="cancellationToken">A cancellation token.</param>
    /// <returns>A task representing the asynchronous operation, returning the sent message.</returns>
    protected virtual async Task<TMessage> SendMessageAsync<TMessage>(
        TMessage message,
        string routingKey,
        bool autoSaveOutboxMessage,
        string sourceOutboxUowId,
        bool sendInNewTransactionScope,
        CancellationToken cancellationToken,
        string applicationName = null,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory = null,
        PlatformOutboxConfig selectedOutboxConfig = null,
        bool? selectedHasOutboxMessageSupport = null)
        where TMessage : class, new()
    {
        var effectiveApplicationName = applicationName ?? ApplicationSettingContext.ApplicationName;
        var effectiveOutboxConfig = selectedOutboxConfig ?? OutboxConfig;
        var hasOutboxMessageSupport = selectedHasOutboxMessageSupport
            ?? (outboxBusMessageRepositoryFactory != null || HasOutboxMessageSupport());

        // If the message is trackable, set its tracking information.
        if (message is IPlatformTrackableBusMessage trackableBusMessage)
        {
            trackableBusMessage.TrackingId ??= Ulid.NewUlid().ToString();
            trackableBusMessage.ProduceFrom = outboxBusMessageRepositoryFactory != null
                ? effectiveApplicationName
                : trackableBusMessage.ProduceFrom ?? effectiveApplicationName;
            trackableBusMessage.CreatedUtcDate ??= DateTime.UtcNow;
            if (trackableBusMessage.RequestContext == null || trackableBusMessage.RequestContext.IsEmpty())
                trackableBusMessage.RequestContext = RequestContextAccessor.Current.GetAllKeyValues();
        }

        return sendInNewTransactionScope
            ? await ServiceProvider.GetRequiredService<IPlatformRootServiceProvider>()
                .ExecuteInjectScopedAsync<TMessage>(async (IServiceProvider serviceProvider, IPlatformMessageBusProducer messageBusProducer) =>
                {
                    return await SendMessageAsync(
                        serviceProvider,
                        effectiveOutboxConfig,
                        messageBusProducer,
                        message,
                        routingKey,
                        autoSaveOutboxMessage,
                        hasOutboxMessageSupport,
                        sourceOutboxUowId,
                        cancellationToken,
                        outboxBusMessageRepositoryFactory,
                        selectedOutboxConfig);
                })
            : await SendMessageAsync(
                ServiceProvider,
                effectiveOutboxConfig,
                MessageBusProducer,
                message,
                routingKey,
                autoSaveOutboxMessage,
                hasOutboxMessageSupport,
                sourceOutboxUowId,
                cancellationToken,
                outboxBusMessageRepositoryFactory,
                selectedOutboxConfig);
    }

    private static async Task<TMessage> SendMessageAsync<TMessage>(
        IServiceProvider serviceProvider,
        PlatformOutboxConfig outboxConfig,
        IPlatformMessageBusProducer messageBusProducer,
        TMessage message,
        string routingKey,
        bool autoSaveOutboxMessage,
        bool hasOutboxMessageSupport,
        string sourceOutboxUowId,
        CancellationToken cancellationToken,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory = null,
        PlatformOutboxConfig selectedOutboxConfig = null) where TMessage : class, new()
    {
        // If outbox message support is enabled and auto-saving is requested, save the message to the outbox.
        if (autoSaveOutboxMessage && hasOutboxMessageSupport)
        {
            var outboxEventBusProducerHelper = serviceProvider.GetRequiredService<PlatformOutboxMessageBusProducerHelper>();

            await outboxEventBusProducerHelper.HandleSendingOutboxMessageAsync(
                message,
                routingKey,
                outboxConfig.RetryProcessFailedMessageInSecondsUnit,
                subQueueMessageIdPrefix: message.As<IPlatformSubMessageQueuePrefixSupport>()?.SubQueuePrefix(),
                needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage: true,
                autoDeleteProcessedMessage: outboxConfig.AutoDeleteProcessedMessage,
                handleExistingOutboxMessage: null,
                sourceOutboxUowId: sourceOutboxUowId,
                cancellationToken,
                outboxBusMessageRepositoryFactory: outboxBusMessageRepositoryFactory,
                selectedOutboxConfig: selectedOutboxConfig);

            return message;
        }

        // If outbox message support is not enabled or auto-saving is not requested, send the message directly to the bus.
        return await messageBusProducer.SendAsync(message, routingKey, cancellationToken);
    }

    /// <summary>
    /// Builds a platform bus message with a specific payload and routing key information.
    /// </summary>
    /// <typeparam name="TMessage">The type of the message.</typeparam>
    /// <typeparam name="TMessagePayload">The type of the message payload.</typeparam>
    /// <param name="trackId">A unique identifier for tracking the message.</param>
    /// <param name="messagePayload">The payload of the message.</param>
    /// <param name="messageGroup">The group of the message.</param>
    /// <param name="messageAction">An optional action associated with the message.</param>
    /// <returns>The built message.</returns>
    protected TMessage BuildPlatformBusMessage<TMessage, TMessagePayload>(string trackId, TMessagePayload messagePayload, string messageGroup, string messageAction, string producerContext = null)
        where TMessage : class, IPlatformWithPayloadBusMessage<TMessagePayload>, IPlatformSelfRoutingKeyBusMessage, IPlatformTrackableBusMessage, new()
        where TMessagePayload : class, new()
    {
        return PlatformBusMessage<TMessagePayload>.New<TMessage>(
            trackId,
            payload: messagePayload,
            identity: BuildPlatformEventBusMessageIdentity(),
            producerContext: producerContext ?? ApplicationSettingContext.ApplicationName,
            messageGroup: messageGroup,
            messageAction: messageAction,
            requestContext: RequestContextAccessor.Current.GetAllKeyValues());
    }

    private Task<TMessage> SendRoutedMessageAsync<TMessage>(
        TMessage message,
        MessageBusRoute route,
        string routingKey,
        bool autoSaveOutboxMessage,
        string sourceOutboxUowId,
        bool sendInNewTransactionScope,
        CancellationToken cancellationToken)
        where TMessage : class, new()
    {
        var isOutboxEnabled = route.Descriptor.IsOutboxEnabled;

        return SendMessageAsync(
            message,
            routingKey,
            autoSaveOutboxMessage,
            sourceOutboxUowId ?? ResolveCurrentOutboxUowId(route),
            sendInNewTransactionScope,
            cancellationToken,
            route.ApplicationName,
            isOutboxEnabled ? route.Descriptor.OutboxRepositoryFactory : null,
            isOutboxEnabled ? ResolveLaneOutboxConfig(route) : null,
            isOutboxEnabled);
    }

    private static string BuildRoutingKey<TMessage>(TMessage message, bool forceUseDefaultRoutingKey, string applicationName)
        where TMessage : class, new()
    {
        var selfRoutingKeyMessage = message.As<IPlatformSelfRoutingKeyBusMessage>();

        return forceUseDefaultRoutingKey || selfRoutingKeyMessage == null
            ? PlatformBusMessageRoutingKey.BuildDefaultRoutingKey(message.GetType(), applicationName)
            : selfRoutingKeyMessage.RoutingKey();
    }

    private MessageBusRoute ResolveRoute(PlatformMessageBusStoreKey storeKey, string applicationName)
    {
        if (messageBusStoreRegistry == null)
            throw new InvalidOperationException("Keyed message-bus routing requires the platform message-bus store registry.");

        var descriptor = messageBusStoreRegistry.Get(storeKey);
        var lane = applicationName.IsNullOrEmpty()
            ? descriptor.GetSingleApplicationLane()
            : descriptor.GetApplicationLane(applicationName);

        return new MessageBusRoute(descriptor, lane);
    }

    /// <summary>
    /// Lane outbox configuration providers are singleton-scoped (the unqualified <see cref="PlatformOutboxConfig" />
    /// is registered as a singleton from the same provider), so one resolution per lane registration is reused
    /// instead of invoking the provider on every send.
    /// </summary>
    private PlatformOutboxConfig ResolveLaneOutboxConfig(MessageBusRoute route)
    {
        if (LaneOutboxConfigCache.TryGetValue(route.Lane, out var cachedOutboxConfig))
            return cachedOutboxConfig;

        return LaneOutboxConfigCache.GetValue(
            route.Lane,
            _ => route.Descriptor.ResolveOutboxConfig(ServiceProvider, route.Lane.ApplicationModuleType));
    }

    /// <summary>
    /// A host without a composed runtime store keeps the legacy unqualified repository path, so a declared store key
    /// is meaningless there and must not make sending fail.
    /// </summary>
    private bool HasRuntimeStoreComposition => messageBusStoreRegistry?.HasRuntimeStoreComposition == true;

    private string ResolveCurrentOutboxUowId(MessageBusRoute route)
    {
        return route.Descriptor.IsOutboxEnabled
            ? route.Descriptor.ResolveOutboxRepository(ServiceProvider).UowManager().TryGetCurrentActiveUow()?.Id
            : null;
    }

    private static readonly ConditionalWeakTable<PlatformMessageBusApplicationLaneRegistration, PlatformOutboxConfig> LaneOutboxConfigCache = [];

    private sealed record MessageBusRoute(PlatformMessageBusStoreDescriptor Descriptor, PlatformMessageBusApplicationLaneRegistration Lane)
    {
        public string ApplicationName => Lane.ApplicationName;
    }

    /// <summary>
    /// A pseudo message bus producer that does not actually send messages to the bus.
    /// This is used when no real message bus producer is configured.
    /// </summary>
    public class PlatformPseudoMessageBusProducer : IPlatformMessageBusProducer
    {
        /// <inheritdoc />
        public async Task<TMessage> SendAsync<TMessage>(
            TMessage message,
            string routingKey,
            CancellationToken cancellationToken = default) where TMessage : class, new()
        {
            return message;
        }
    }
}
