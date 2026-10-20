#region

using System.Diagnostics;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.Common.Validations.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.MessageBus.Consumers;

/// <summary>
/// Represents a message bus consumer for platform applications with enhanced capabilities for reliable message processing.
/// This interface extends the base <see cref="IPlatformMessageBusConsumer"/> interface with additional properties and methods
/// specifically designed for handling inbox messages, transactional processing, and error recovery scenarios.
///
/// <para><strong>Core Capabilities:</strong></para>
/// <para>• <strong>Inbox Pattern Support:</strong> Provides properties for managing inbox message processing and deduplication</para>
/// <para>• <strong>Transactional Processing:</strong> Integrates with unit of work patterns for consistent data processing</para>
/// <para>• <strong>Error Recovery:</strong> Includes error handling and retry configuration for resilient message processing</para>
/// <para>• <strong>Sequential Processing:</strong> Supports ordered message processing with dependency checking</para>
/// <para>• <strong>Lifecycle Management:</strong> Provides hooks for managing consumer instance lifecycle and state</para>
///
/// <para><strong>Inbox Pattern Integration:</strong></para>
/// <para>The interface supports the inbox pattern for exactly-once message processing:</para>
/// <para>• Messages are stored in an inbox before processing to prevent duplicates</para>
/// <para>• Processing status is tracked to enable retry and recovery</para>
/// <para>• Automatic cleanup of processed messages based on configuration</para>
/// <para>• Sequential processing ensures message ordering when required</para>
///
/// <para><strong>Usage in Platform Architecture:</strong></para>
/// <para>This interface is implemented by all application-level message consumers in the platform:</para>
/// <para>• Entity event consumers for handling domain events</para>
/// <para>• Command event consumers for processing command events</para>
/// <para>• Domain event consumers for cross-service communication</para>
/// <para>• Free-format message consumers for custom business logic</para>
/// </summary>
public interface IPlatformApplicationMessageBusConsumer : IPlatformMessageBusConsumer
{
    /// <summary>
    /// Gets or sets the inbox message being processed when handling existing inbox messages.
    /// This property is set by the inbox processing infrastructure when a consumer is invoked
    /// to process a message that was previously stored in the inbox for reliability.
    ///
    /// <para><strong>Inbox Processing Context:</strong></para>
    /// <para>When this property is set:</para>
    /// <para>• The consumer is processing a message from the inbox rather than directly from the message bus</para>
    /// <para>• The message has already been stored for reliability and deduplication</para>
    /// <para>• Processing status will be tracked and updated in the inbox</para>
    /// <para>• Error handling follows inbox-specific retry and recovery policies</para>
    ///
    /// <para><strong>Integration with Processing Pipeline:</strong></para>
    /// <para>The inbox message provides context for:</para>
    /// <para>• Tracking processing attempts and retry counts</para>
    /// <para>• Managing message expiration and cleanup policies</para>
    /// <para>• Correlating with original message routing and metadata</para>
    /// <para>• Supporting debugging and operational monitoring</para>
    /// </summary>
    public PlatformInboxBusMessage HandleExistingInboxMessage { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether processed inbox messages should be automatically deleted immediately
    /// after successful processing. This setting controls the cleanup behavior for inbox messages and affects
    /// storage utilization and debugging capabilities.
    ///
    /// <para><strong>Cleanup Behavior:</strong></para>
    /// <para>• <strong>True:</strong> Messages are deleted immediately after successful processing (default behavior)</para>
    /// <para>• <strong>False:</strong> Messages are retained for the configured retention period</para>
    ///
    /// <para><strong>Considerations:</strong></para>
    /// <para>• <strong>Storage Efficiency:</strong> Immediate deletion reduces storage usage</para>
    /// <para>• <strong>Debugging Support:</strong> Retained messages support operational troubleshooting</para>
    /// <para>• <strong>Audit Requirements:</strong> Some scenarios may require message retention for compliance</para>
    /// <para>• <strong>Performance Impact:</strong> Immediate deletion reduces database load</para>
    ///
    /// <para><strong>Recommended Usage:</strong></para>
    /// <para>• Set to false for critical business events that require audit trails</para>
    /// <para>• Set to true for high-volume events where storage efficiency is important</para>
    /// <para>• Consider retention policies and operational requirements when configuring</para>
    /// </summary>
    public bool AutoDeleteProcessedInboxEventMessageImmediately { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the consumer should check for other unprocessed inbox messages
    /// from the same consumer type before processing the current message. This setting enables sequential
    /// processing and ordered message handling when message ordering is critical.
    ///
    /// <para><strong>Sequential Processing Logic:</strong></para>
    /// <para>When enabled (default: true):</para>
    /// <para>• Consumer checks for earlier unprocessed messages before handling current message</para>
    /// <para>• If earlier messages exist, current message processing is deferred</para>
    /// <para>• Ensures FIFO (First-In-First-Out) processing order for the same consumer type</para>
    /// <para>• Prevents out-of-order processing that could cause data inconsistencies</para>
    ///
    /// <para><strong>Use Cases:</strong></para>
    /// <para>• <strong>Entity Updates:</strong> Ensuring entity state changes are applied in correct order</para>
    /// <para>• <strong>Financial Transactions:</strong> Maintaining transaction sequence integrity</para>
    /// <para>• <strong>Workflow Steps:</strong> Preserving workflow execution order</para>
    /// <para>• <strong>Status Transitions:</strong> Ensuring valid state machine transitions</para>
    ///
    /// <para><strong>Performance Considerations:</strong></para>
    /// <para>• May reduce processing throughput for consumers that require ordering</para>
    /// <para>• Can be disabled for consumers where message order is not critical</para>
    /// <para>• Should be balanced against scalability and performance requirements</para>
    /// </summary>
    public bool NeedToCheckAnySameConsumerOtherPreviousNotProcessedInboxMessage { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether to initiate periodic pinging of inbox message processing.
    /// </summary>
    public bool NeedStartIntervalPingInboxMessageProcessing { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the current consumer instance is executing logic specifically
    /// for processing an inbox message. This flag provides context to distinguish between direct message
    /// processing and inbox-mediated processing for proper error handling and logging.
    ///
    /// <para><strong>Processing Context Differentiation:</strong></para>
    /// <para>• <strong>True:</strong> Consumer is processing a message from the inbox pattern</para>
    /// <para>• <strong>False:</strong> Consumer is processing a direct message from the message bus</para>
    ///
    /// <para><strong>Impact on Behavior:</strong></para>
    /// <para>This flag affects:</para>
    /// <para>• Error logging and reporting strategies</para>
    /// <para>• Retry and recovery mechanisms</para>
    /// <para>• Transaction and unit of work management</para>
    /// <para>• Monitoring and observability data</para>
    /// <para><strong>Infrastructure Usage:</strong></para>
    /// <para>This property is typically set by the platform infrastructure and should not be
    /// manually modified by consumer implementations unless in specialized scenarios.</para>
    /// </summary>
    public bool IsHandlingLogicForInboxMessage { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the consumer has encountered an error that should never be retried.
    /// This flag is used to mark messages that have failed due to permanent errors such as invalid data,
    /// programming errors, or business rule violations that cannot be resolved through retry attempts.
    ///
    /// <para><strong>Error Classification:</strong></para>
    /// <para>When set to true, the flag indicates permanent failures including:</para>
    /// <para>• <strong>Data Validation Errors:</strong> Invalid message format, missing required fields, constraint violations</para>
    /// <para>• <strong>Business Logic Violations:</strong> Rule violations that cannot be corrected automatically</para>
    /// <para>• <strong>Programming Errors:</strong> Implementation bugs, serialization failures, type mismatches</para>
    /// <para>• <strong>Authorization Failures:</strong> Permanent access denied scenarios</para>
    ///
    /// <para><strong>Impact on Processing:</strong></para>
    /// <para>When this flag is set:</para>
    /// <para>• The message will not be retried by the platform infrastructure</para>
    /// <para>• The inbox message status will be marked as 'Ignored' instead of 'Failed'</para>
    /// <para>• Error logging will indicate a permanent failure condition</para>
    /// <para>• Dead letter queue processing may be triggered for manual intervention</para>
    ///
    /// <para><strong>Usage Guidelines:</strong></para>
    /// <para>Set this flag when:</para>
    /// <para>• The error condition is deterministic and will not change with retry</para>
    /// <para>• Manual intervention or code changes are required to resolve the issue</para>
    /// <para>• Continuing retry attempts would waste system resources</para>
    /// <para>• The message represents corrupted or malformed data</para>
    ///
    /// <para><strong>Integration with Error Handling:</strong></para>
    /// <para>This property is automatically evaluated by:</para>
    /// <para>• <see cref="PlatformInboxMessageBusConsumerHelper"/> for inbox pattern processing</para>
    /// <para>• <see cref="PlatformConsumeInboxBusMessageHostedService"/> for background processing</para>
    /// <para>• Message retry logic to determine retry eligibility</para>
    /// <para>• Error reporting and monitoring systems for operational insights</para>
    /// </summary>
    public bool HasErrorAndShouldNeverRetry { get; set; }

    /// <summary>
    /// Selects the logical message-bus route for an infrastructure-created consumer instance.
    /// Composite inbox workers use this hook when one consumer type, such as the built-in CQRS event
    /// wrapper, processes messages from more than one application lane.
    /// </summary>
    /// <param name="storeKey">The explicitly selected logical store key.</param>
    /// <param name="applicationName">The selected application-lane identity.</param>
    public void ConfigureMessageBusStoreRoute(PlatformMessageBusStoreKey storeKey, string applicationName = null);
}

/// <summary>
/// Represents a message bus consumer for platform applications that handles messages of a specific type.
/// This interface extends the <see cref="IPlatformMessageBusConsumer{TMessage}" /> and <see cref="IPlatformApplicationMessageBusConsumer" /> interfaces.
/// </summary>
/// <typeparam name="TMessage">The type of the message being consumed.</typeparam>
public interface IPlatformApplicationMessageBusConsumer<in TMessage> : IPlatformMessageBusConsumer<TMessage>, IPlatformApplicationMessageBusConsumer
    where TMessage : class, new()
{
    public Task HandleMessageDirectly(TMessage message, string routingKey, int? retryCount = null);
}

/// <summary>
/// An abstract base class for platform application message bus consumers that handle messages of a specific type.
/// This class provides common functionality for handling inbox messages and managing units of work.
/// </summary>
/// <typeparam name="TMessage">The type of the message being consumed.</typeparam>
public abstract class PlatformApplicationMessageBusConsumer<TMessage> : PlatformMessageBusConsumer<TMessage>, IPlatformApplicationMessageBusConsumer<TMessage>
    where TMessage : class, new()
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformApplicationMessageBusConsumer{TMessage}" /> class.
    /// </summary>
    /// <param name="loggerFactory">A factory for creating loggers.</param>
    /// <param name="uowManager">The unit of work manager.</param>
    /// <param name="serviceProvider">The service provider for the current scope.</param>
    /// <param name="rootServiceProvider">The root service provider.</param>
    protected PlatformApplicationMessageBusConsumer(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager uowManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider
    )
        : base(loggerFactory)
    {
        UnitOfWorkManager = uowManager;
        ServiceProvider = serviceProvider;
        RootServiceProvider = rootServiceProvider;
        RequestContextAccessor = ServiceProvider.GetRequiredService<IPlatformApplicationRequestContextAccessor>();
        ApplicationSettingContext = rootServiceProvider.GetRequiredService<IPlatformApplicationSettingContext>();
    }

    public override bool LogErrorOnException => HandleExistingInboxMessage == null && !IsHandlingLogicForInboxMessage;

    // All lane-derived state lives in one immutable snapshot so a route reset is a single assignment and a partially
    // resolved route can never be observed.
    private ResolvedMessageBusRoute resolvedMessageBusRoute;
    private PlatformMessageBusStoreKey? configuredMessageBusStoreKey;
    private string configuredMessageBusApplicationName;

    protected IPlatformInboxBusMessageRepository InboxBusMessageRepo => EnsureMessageBusLaneResolved().InboxBusMessageRepo;

    protected PlatformInboxConfig InboxConfig => EnsureMessageBusLaneResolved().InboxConfig;

    protected IPlatformRootServiceProvider RootServiceProvider { get; }
    protected IServiceProvider ServiceProvider { get; }
    protected IPlatformUnitOfWorkManager UnitOfWorkManager { get; }

    /// <summary>
    /// Gets the logical message-bus store selected by this consumer.
    /// </summary>
    protected virtual PlatformMessageBusStoreKey MessageBusStoreKey => PlatformMessageBusStoreKey.Default;

    /// <summary>
    /// Gets the optional application-lane identity selected by this consumer. A null value requires one lane in
    /// the selected descriptor and therefore rejects ambiguous strict multi-module composition.
    /// </summary>
    protected virtual string MessageBusApplicationName => null;

    /// <summary>
    /// Configures a route selected by infrastructure outside the consumer's static type.
    /// </summary>
    /// <param name="storeKey">The logical message-bus store key.</param>
    /// <param name="applicationName">The application-lane identity.</param>
    public void ConfigureMessageBusStoreRoute(PlatformMessageBusStoreKey storeKey, string applicationName = null)
    {
        if (storeKey.IsEmpty)
            throw new ArgumentException("A message-bus consumer route requires a non-empty store key.", nameof(storeKey));

        configuredMessageBusStoreKey = storeKey;
        configuredMessageBusApplicationName = applicationName;
        resolvedMessageBusRoute = null;
    }

    /// <summary>
    /// Gets the resolved application identity used for inbox filtering and pipeline diagnostics.
    /// </summary>
    protected string ResolvedMessageBusApplicationName
    {
        get => EnsureMessageBusLaneResolved().ApplicationLane?.ApplicationName ?? ApplicationSettingContext.ApplicationName;
    }

    /// <summary>
    /// Gets a value indicating whether to automatically open a unit of work when handling a message.
    /// </summary>
    public virtual bool AutoOpenUow => true;

    /// <summary>
    /// Gets the request context accessor.
    /// </summary>
    protected IPlatformApplicationRequestContextAccessor RequestContextAccessor { get; }

    /// <summary>
    /// Gets the application setting context.
    /// </summary>
    protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }

    /// <summary>
    /// Gets a value indicating whether to allow the use of inbox messages. Default is True. Set to False to consume messages directly without using the inbox.
    /// </summary>
    public virtual bool AllowUseInboxMessage => true;

    /// <summary>
    /// Allows unordered messages to try handling before they are persisted. Override with false when handling
    /// can outlive the transport delivery budget; combine with background inbox handling to release the delivery.
    /// </summary>
    public virtual bool AllowTryConsumeMessageImmediatelyBeforeCreateInboxMessage => true;

    public bool AllowHandleNewInboxMessageInBackground { get; set; } = false;

    /// <inheritdoc />
    public bool NeedToCheckAnySameConsumerOtherPreviousNotProcessedInboxMessage { get; set; } = true;

    /// <inheritdoc />
    public bool NeedStartIntervalPingInboxMessageProcessing { get; set; } = true;

    /// <inheritdoc />
    public PlatformInboxBusMessage HandleExistingInboxMessage { get; set; }

    /// <inheritdoc />
    public bool AutoDeleteProcessedInboxEventMessageImmediately { get; set; } = false;

    /// <inheritdoc />
    public bool IsHandlingLogicForInboxMessage { get; set; }

    public bool HasErrorAndShouldNeverRetry { get; set; }

    /// <summary>
    /// Set in <see cref="BeforeExecuteHandleLogicAsync" /> when a circular pipeline is detected, so
    /// <see cref="ExecuteHandleLogicAsync" /> skips handling and the message completes as success.
    /// Race-free: consumers are registered Transient (one instance per message). Reset to false on every
    /// non-inbox path so a reused instance can never carry a stale skip decision.
    /// </summary>
    private bool skipHandleLogicDueToCircularPipeLine;

    /// <summary>
    /// Executes the message handling logic, either using the inbox pattern or directly.
    /// </summary>
    /// <param name="message">The message being consumed.</param>
    /// <param name="routingKey">The routing key of the message.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public override async Task ExecuteHandleLogicAsync(TMessage message, string routingKey)
    {
        EnsureMessageBusLaneResolved();

        // Circular pipeline detected in BeforeExecuteHandleLogicAsync: skip-and-succeed (no handling, no exception).
        if (skipHandleLogicDueToCircularPipeLine)
            return;

        // If the inbox pattern is enabled and allowed, handle the message using the inbox pattern.
        // Otherwise, handle the message directly.
        if (CanHandleExecutingInboxConsumer())
            await HandleExecutingInboxConsumerAsync(message, routingKey);
        else
            await HandleMessageDirectly(message, routingKey);
    }

    public async Task HandleMessageDirectly(TMessage message, string routingKey, int? retryCount = null)
    {
        EnsureMessageBusLaneResolved();

        if (ApplicationSettingContext.IsDebugInformationMode)
            Logger.LogInformation("{Type} {Method} STARTED", GetType().FullName, nameof(HandleMessageDirectly));

        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                try
                {
                    // If auto-opening a unit of work is enabled, handle the message within a unit of work.
                    if (AutoOpenUow)
                        await UnitOfWorkManager.ExecuteUowTask(() => HandleLogicAsync(message, routingKey));
                    else
                    {
                        await HandleLogicAsync(message, routingKey);

                        await UnitOfWorkManager.TryCurrentActiveUowSaveChangesAsync();
                    }
                }
                finally
                {
                    // If garbage collection is enabled, perform garbage collection.
                    ApplicationSettingContext.ProcessAutoGarbageCollect();
                }
            },
            retryCount: retryCount ?? RetryOnFailedTimes,
            sleepDurationProvider: retryAttempt => Math.Min(retryAttempt + RetryOnFailedDelaySeconds, MaxRetryOnFailedDelaySeconds).Seconds(),
            onRetry: (e, delayTime, retryAttempt, context) =>
            {
                // Log only after 75% of retry budget consumed. See Util.TaskRunner.LogErrorRetryThreshold.
                if (retryAttempt > Util.TaskRunner.LogErrorRetryThreshold(retryCount ?? RetryOnFailedTimes))
                    IPlatformMessageBusConsumer.LogError(Logger, GetType(), message, e.BeautifyStackTrace(), "Retry");
            },
            ignoreExceptionTypes: [typeof(IPlatformValidationException)]
        );

        if (ApplicationSettingContext.IsDebugInformationMode)
            Logger.LogInformation("{Type} {Method} FINISHED", GetType().FullName, nameof(HandleMessageDirectly));
    }

    protected override bool ShouldExecuteHandleLogicInRetry()
    {
        return !CanHandleExecutingInboxConsumer();
    }

    private bool CanHandleExecutingInboxConsumer()
    {
        return SupportAllowInboxConsumer() && !IsHandlingLogicForInboxMessage;
    }

    private bool SupportAllowInboxConsumer()
    {
        return InboxBusMessageRepo != null && AllowUseInboxMessage;
    }

    public override async Task BeforeHandleAsync(TMessage message, string routingKey)
    {
        if (message is IPlatformTrackableBusMessage trackableBusMessage)
            RequestContextAccessor.Current.SetValues(trackableBusMessage.RequestContext);
    }

    public override async Task BeforeExecuteHandleLogicAsync(TMessage message, string routingKey)
    {
        if (!IsHandlingLogicForInboxMessage && HandleExistingInboxMessage == null)
        {
            skipHandleLogicDueToCircularPipeLine = false;
            ProcessConsumerPipeLineInRequestContext(message, routingKey);
        }
        else
            skipHandleLogicDueToCircularPipeLine = ShouldSkipDueToCircularPipeLine(message, routingKey);
    }

    private void ProcessConsumerPipeLineInRequestContext(TMessage message, string routingKey)
    {
        if (message is not IPlatformTrackableBusMessage trackableBusMessage)
            return;

        var requestContextConsumerPipeLine =
            trackableBusMessage.RequestContext.GetRequestContextValue<List<string>>(PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey) ?? [];
        var pipelineRoutingKey = GetPipelineRoutingKey(routingKey, message);

        requestContextConsumerPipeLine.Add(pipelineRoutingKey);

        message
            .As<IPlatformTrackableBusMessage>()
            .RequestContext.Upsert(PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey, requestContextConsumerPipeLine);
        RequestContextAccessor.Current.Upsert(PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey, requestContextConsumerPipeLine);
    }

    /// <summary>
    /// Detects whether handling this message has entered a circular pipeline. On detection it logs one Error
    /// (full pipeline trace + routing key) and returns <c>true</c> so the caller skips handling and the message
    /// completes as success — instead of throwing and marking the bus/inbox message failed (and futilely retried).
    /// Returns <c>false</c> for non-trackable messages (no pipeline to inspect).
    /// </summary>
    private bool ShouldSkipDueToCircularPipeLine(TMessage message, string routingKey)
    {
        if (message is not IPlatformTrackableBusMessage trackableBusMessage)
            return false;

        var requestContextConsumerPipeLine =
            trackableBusMessage.RequestContext.GetRequestContextValue<List<string>>(PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey) ?? [];
        var pipelineRoutingKey = GetPipelineRoutingKey(routingKey, message);

        return requestContextConsumerPipeLine.ShouldSkipDueToCircularPipeLine(
            pipelineRoutingKey,
            ApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount,
            Logger,
            "consumer handle logic");
    }

    protected virtual string GetPipelineRoutingKey(string routingKey, TMessage message)
    {
        return PlatformApplicationCommonRequestContextKeys.BuildConsumerOrEventHandlerPipeLineItem(
            ResolvedMessageBusApplicationName,
            message.GetType(),
            GetType());
    }

    private async Task HandleExecutingInboxConsumerAsync(TMessage message, string routingKey)
    {
        var storeDescriptor = EnsureMessageBusLaneResolved().StoreDescriptor;

        await PlatformInboxMessageBusConsumerHelper.HandleExecutingInboxConsumerAsync(
            rootServiceProvider: RootServiceProvider,
            currentScopeServiceProvider: ServiceProvider,
            consumerType: GetType(),
            inboxBusMessageRepository: InboxBusMessageRepo,
            inboxConfig: InboxConfig,
            applicationSettingContext: ApplicationSettingContext,
            message: message,
            forApplicationName: ResolvedMessageBusApplicationName,
            routingKey: routingKey,
            loggerFactory: CreateLogger,
            retryProcessFailedMessageInSecondsUnit: InboxConfig.RetryProcessFailedMessageInSecondsUnit,
            handleExistingInboxMessage: HandleExistingInboxMessage,
            currentScopeConsumerInstance: this,
            handleInUow: null,
            subQueueMessageIdPrefix: message.As<IPlatformSubMessageQueuePrefixSupport>()?.SubQueuePrefix(),
            autoDeleteProcessedMessageImmediately: AutoDeleteProcessedInboxEventMessageImmediately,
            needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage: NeedToCheckAnySameConsumerOtherPreviousNotProcessedInboxMessage,
            allowHandleNewInboxMessageInBackground: AllowHandleNewInboxMessageInBackground,
            allowTryConsumeMessageImmediatelyBeforeCreateInboxMessage: AllowTryConsumeMessageImmediatelyBeforeCreateInboxMessage,
            inboxBusMessageRepositoryFactory: storeDescriptor?.IsInboxEnabled == true ? storeDescriptor.InboxRepositoryFactory : null
        );
    }

    private PlatformMessageBusStoreKey EffectiveMessageBusStoreKey => configuredMessageBusStoreKey ?? MessageBusStoreKey;

    private string EffectiveMessageBusApplicationName => configuredMessageBusStoreKey.HasValue
        ? configuredMessageBusApplicationName
        : MessageBusApplicationName;

    private ResolvedMessageBusRoute EnsureMessageBusLaneResolved()
    {
        if (resolvedMessageBusRoute != null)
            return resolvedMessageBusRoute;

        var registry = RootServiceProvider.GetService<IPlatformMessageBusStoreRegistry>();
        // Without a composed runtime store the host has one unqualified inbox repository, so any declared key
        // (Default or module-specific) resolves to the legacy path exactly as before store routing existed.
        if (registry?.HasRuntimeStoreComposition != true)
        {
            resolvedMessageBusRoute = new ResolvedMessageBusRoute(
                StoreDescriptor: null,
                ApplicationLane: null,
                InboxBusMessageRepo: ServiceProvider.GetService<IPlatformInboxBusMessageRepository>(),
                InboxConfig: ServiceProvider.GetRequiredService<PlatformInboxConfig>());
            return resolvedMessageBusRoute;
        }

        var effectiveMessageBusApplicationName = EffectiveMessageBusApplicationName;
        var storeDescriptor = registry.Get(EffectiveMessageBusStoreKey);
        var applicationLane = effectiveMessageBusApplicationName.IsNullOrEmpty()
            ? storeDescriptor.GetSingleApplicationLane()
            : storeDescriptor.GetApplicationLane(effectiveMessageBusApplicationName);

        var inboxConfig = storeDescriptor.ResolveInboxConfig(ServiceProvider, applicationLane.ApplicationModuleType);
        var inboxBusMessageRepo = storeDescriptor.IsInboxEnabled ? storeDescriptor.ResolveInboxRepository(ServiceProvider) : null;

        resolvedMessageBusRoute = new ResolvedMessageBusRoute(storeDescriptor, applicationLane, inboxBusMessageRepo, inboxConfig);
        return resolvedMessageBusRoute;
    }

    private sealed record ResolvedMessageBusRoute(
        PlatformMessageBusStoreDescriptor StoreDescriptor,
        PlatformMessageBusApplicationLaneRegistration ApplicationLane,
        IPlatformInboxBusMessageRepository InboxBusMessageRepo,
        PlatformInboxConfig InboxConfig);
}
