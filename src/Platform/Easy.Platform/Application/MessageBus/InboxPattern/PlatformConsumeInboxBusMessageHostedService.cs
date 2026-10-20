#pragma warning disable IDE0055

#region

using System.Collections.ObjectModel;
using System.Diagnostics;
using Easy.Platform.Application.MessageBus.Consumers;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.HostingBackgroundServices;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Timing;
using Easy.Platform.Common.Utils;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.MessageBus.InboxPattern;

/// <summary>
/// A hosted service that periodically scans the Inbox collection in the database for new messages and consumes them.
/// This service implements the consumer side of the Inbox Pattern, ensuring that messages are processed reliably and only once.
/// </summary>
public class PlatformConsumeInboxBusMessageHostedService : PlatformIntervalHostingBackgroundService
{
    private readonly SemaphoreSlim legacyMaxIntervalProcessTriggeredLock;
    private readonly SemaphoreSlim legacyProcessMessageParallelLimitLock;
    private readonly IPlatformMessageBusStoreRegistry messageBusStoreRegistry;
    private readonly AsyncLocal<InboxProcessingState> currentProcessingState = new();
    private readonly PlatformInboxConfig legacyInboxConfig;
    private readonly PlatformMessageBusStoreRuntimeStateCache<InboxProcessingState> processingStates;
    private DateTime? firstTimeProcessDate;
    private bool isFirstTimeProcess = true;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformConsumeInboxBusMessageHostedService" /> class.
    /// </summary>
    /// <param name="serviceProvider">The service provider for the current scope.</param>
    /// <param name="loggerFactory">A factory for creating loggers.</param>
    /// <param name="applicationSettingContext">The application setting context.</param>
    /// <param name="messageBusScanner">The message bus scanner used for discovering consumers.</param>
    /// <param name="inboxConfig">The configuration for the inbox pattern.</param>
    /// <param name="messageBusConfig">The configuration for the message bus.</param>
    public PlatformConsumeInboxBusMessageHostedService(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory,
        IPlatformApplicationSettingContext applicationSettingContext,
        IPlatformMessageBusScanner messageBusScanner,
        PlatformInboxConfig inboxConfig,
        PlatformMessageBusConfig messageBusConfig,
        IPlatformMessageBusStoreRegistry messageBusStoreRegistry = null) : base(serviceProvider, loggerFactory)
    {
        ApplicationSettingContext = applicationSettingContext;
        legacyInboxConfig = inboxConfig;
        MessageBusConfig = messageBusConfig;
        this.messageBusStoreRegistry = messageBusStoreRegistry;
        processingStates = new PlatformMessageBusStoreRuntimeStateCache<InboxProcessingState>(BuildProcessingStates);
        // Create a dictionary of available consumers, keyed by their consumer name.
        AvailableConsumerByNameToTypeDic = messageBusScanner
            .ScanAllDefinedConsumerTypes()
            .ToDictionary(PlatformInboxBusMessage.GetConsumerByValue);

        legacyProcessMessageParallelLimitLock = new SemaphoreSlim(legacyInboxConfig.MaxParallelProcessingMessagesCount, legacyInboxConfig.MaxParallelProcessingMessagesCount);
        legacyMaxIntervalProcessTriggeredLock = new SemaphoreSlim(legacyInboxConfig.MaxParallelProcessingMessagesCount, legacyInboxConfig.MaxParallelProcessingMessagesCount);
    }

    /// <summary>
    /// Gets a value indicating whether to log information about the interval processing.
    /// </summary>
    public override bool LogIntervalProcessInformation => InboxConfig.LogIntervalProcessInformation;

    /// <summary>
    /// Gets the application setting context.
    /// </summary>
    protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }

    /// <summary>
    /// Gets the configuration for the inbox pattern.
    /// </summary>
    protected PlatformInboxConfig InboxConfig => currentProcessingState.Value?.Config ?? legacyInboxConfig;

    /// <summary>
    /// Gets the configuration for the message bus.
    /// </summary>
    protected PlatformMessageBusConfig MessageBusConfig { get; }

    /// <summary>
    /// Gets a dictionary of available consumers, keyed by their consumer name.
    /// </summary>
    protected Dictionary<string, Type> AvailableConsumerByNameToTypeDic { get; }

    private SemaphoreSlim CurrentProcessMessageParallelLimitLock =>
        currentProcessingState.Value?.ProcessMessageParallelLimitLock ?? legacyProcessMessageParallelLimitLock;

    private SemaphoreSlim CurrentMaxIntervalProcessTriggeredLock =>
        currentProcessingState.Value?.MaxIntervalProcessTriggeredLock ?? legacyMaxIntervalProcessTriggeredLock;

    private bool IsFirstTimeProcess
    {
        get => currentProcessingState.Value?.IsFirstTimeProcess ?? isFirstTimeProcess;
        set
        {
            if (currentProcessingState.Value != null)
                currentProcessingState.Value.IsFirstTimeProcess = value;
            else
                isFirstTimeProcess = value;
        }
    }

    private DateTime? FirstTimeProcessDate
    {
        get => currentProcessingState.Value?.FirstTimeProcessDate ?? firstTimeProcessDate;
        set
        {
            if (currentProcessingState.Value != null)
                currentProcessingState.Value.FirstTimeProcessDate = value;
            else
                firstTimeProcessDate = value;
        }
    }

    private Func<IServiceProvider, IPlatformInboxBusMessageRepository> CurrentInboxRepositoryFactory =>
        currentProcessingState.Value?.Descriptor.InboxRepositoryFactory;

    private string ProcessingStoreKey => currentProcessingState.Value?.Descriptor.StoreKey.Value ?? "Legacy";

    private string ProcessingApplicationLane =>
        currentProcessingState.Value?.Lane.ApplicationName ?? ApplicationSettingContext.ApplicationName;

    private string ProcessingApplicationName => ProcessingApplicationLane;

    private string ProcessingPersistenceOwnerType =>
        currentProcessingState.Value?.Descriptor.PersistenceOwnerType?.FullName
        ?? ApplicationSettingContext.ApplicationAssembly?.FullName
        ?? "Legacy";

    private string ProcessingPersistenceContextType =>
        currentProcessingState.Value?.Descriptor.PersistenceContextType?.FullName ?? "Legacy";

    /// <summary>
    /// Determines the interval at which the background processing should be triggered.
    /// </summary>
    /// <returns>A <see cref="TimeSpan" /> representing the interval.</returns>
    protected override TimeSpan ProcessTriggerIntervalTime()
    {
        if (HasRegistryComposition)
        {
            var configuredStates = GetProcessingStates();
            if (configuredStates.Count > 0)
                return configuredStates.Min(state => state.Config.CheckToProcessTriggerIntervalTimeSeconds).Seconds();
        }

        return legacyInboxConfig.CheckToProcessTriggerIntervalTimeSeconds.Seconds();
    }

    protected override TimeSpan FallbackProcessTriggerIntervalTime()
    {
        return legacyInboxConfig.CheckToProcessTriggerIntervalTimeSeconds.Seconds();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            legacyProcessMessageParallelLimitLock.Dispose();
            legacyMaxIntervalProcessTriggeredLock.Dispose();

            if (processingStates.BuiltStates != null)
            {
                foreach (var processingState in processingStates.BuiltStates)
                    processingState.Dispose();
            }
        }

        base.Dispose(disposing);
    }

    /// <summary>
    /// Performs the interval processing logic, consuming inbox messages from the database.
    /// </summary>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    protected override async Task IntervalProcessAsync(CancellationToken cancellationToken)
    {
        // Wait for all required modules to be initialized before processing messages.
        await IPlatformModule.WaitForAllModulesInitializedAsync(ServiceProvider, typeof(IPlatformPersistenceModule), cancellationToken, Logger, $"process {GetType().Name}");

        if (HasRegistryComposition)
        {
            foreach (var processingState in GetProcessingStates())
            {
                // Queue one action per lane so a slow or failed lane does not consume another lane's
                // semaphore budget or first-pass recovery window.
                QueueBackgroundWork(
                    processingToken => ProcessInboxMessagesForStateAsync(processingState, processingToken),
                    cancellationToken: cancellationToken);
            }

            return;
        }

        // If the legacy inbox repository is not registered, skip processing.
        if (!HasInboxEventBusMessageRepositoryRegistered()) return;

        // Queue action in background so another interval can inspect available messages while a slow message is processing.
        QueueBackgroundWork(
            processingToken => ProcessInboxMessagesForStateAsync(null, processingToken),
            cancellationToken: cancellationToken);
    }

    private async Task ProcessInboxMessagesForStateAsync(InboxProcessingState processingState, CancellationToken cancellationToken)
    {
        var previousProcessingState = currentProcessingState.Value;
        currentProcessingState.Value = processingState;

        try
        {
            // Only gate on the interval-collision lock. Do NOT gate on the consumer permit pool:
            // stale-Processing recovery must still run when all consumer permits are held.
            var maxIntervalProcessTriggeredLock = CurrentMaxIntervalProcessTriggeredLock;
            if (maxIntervalProcessTriggeredLock.CurrentCount == 0)
                return;

            await maxIntervalProcessTriggeredLock.WaitAsync(cancellationToken);
            try
            {
                await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                    () => ConsumeInboxEventBusMessages(cancellationToken),
                    retryAttempt => InboxConfig.ProcessConsumeMessageRetryDelaySeconds.Seconds(),
                    retryCount: InboxConfig.ProcessConsumeMessageRetryCount,
                    onRetry: (ex, timeSpan, currentRetry, ctx) =>
                    {
                        if (currentRetry >= InboxConfig.MinimumRetryConsumeInboxMessageTimesToLogError)
                        {
                            Logger.LogError(
                                "Retry ConsumeInboxEventBusMessages {CurrentRetry} time(s) failed: {Error}. " +
                                "[StoreKey:{StoreKey}]. [ApplicationLane:{ApplicationLane}]. " +
                                "[PersistenceOwnerType:{PersistenceOwnerType}]. [PersistenceContextType:{PersistenceContextType}]",
                                currentRetry,
                                ex.Message,
                                ProcessingStoreKey,
                                ProcessingApplicationLane,
                                ProcessingPersistenceOwnerType,
                                ProcessingPersistenceContextType);
                        }
                    },
                    cancellationToken: cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                Logger.LogError(
                    ex.BeautifyStackTrace(),
                    "ConsumeInboxEventBusMessages failed: {Error}. " +
                    "[StoreKey:{StoreKey}]. [ApplicationLane:{ApplicationLane}]. " +
                    "[PersistenceOwnerType:{PersistenceOwnerType}]. [PersistenceContextType:{PersistenceContextType}]",
                    ex.Message,
                    ProcessingStoreKey,
                    ProcessingApplicationLane,
                    ProcessingPersistenceOwnerType,
                    ProcessingPersistenceContextType);
            }
            finally
            {
                maxIntervalProcessTriggeredLock.TryRelease();
            }
        }
        finally
        {
            currentProcessingState.Value = previousProcessingState;
        }
    }

    /// <summary>
    /// Consumes inbox messages from the database, processing them in batches.
    /// </summary>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    protected virtual async Task ConsumeInboxEventBusMessages(CancellationToken cancellationToken)
    {
        if (IsFirstTimeProcess) FirstTimeProcessDate = Clock.UtcNow;

        await ExecuteWithInboxRepositoryAsync(inboxBusMessageRepository =>
        {
            // Use a pager to process messages in batches.
            return Util.Pager.ExecuteScrollingPagingAsync(
                async () =>
                {
                    // NOTE: previously gated here with `if (processMessageParallelLimitLock.CurrentCount == 0) return [];`
                    // which caused head-of-line blocking — when all permits were held by hung consumers, the recovery
                    // candidate query never ran, even though stale-Processing rows existed. Throttling is preserved
                    // by the per-message permit wait in HandleInboxMessageAsync, which now uses a soft timeout
                    // (PermitAcquisitionTimeoutSeconds) to allow temporary overshoot under hang scenarios.

                    // Retrieve a page of message IDs that are eligible for processing.
                    var pagedCanHandleMessageGroupedByConsumerIdPrefixes = await inboxBusMessageRepository.GetAllAsync(
                            queryBuilder: query =>
                                PlatformInboxBusMessage.CanHandleMessagesQueryBuilder(
                                        query,
                                        limit: InboxConfig.GetCanHandleMessageGroupedByConsumerIdPrefixesPageSize,
                                        ProcessingApplicationName,
                                        retryFailedMessageImmediately: IsFirstTimeProcess,
                                        FirstTimeProcessDate)
                                    .Select(p => p.Id),
                            cancellationToken: cancellationToken)
                        .Then(messageIds => messageIds.GroupBy(PlatformInboxBusMessage.GetIdPrefix).ToList());

                    // Process each message prefix in parallel.
                    await pagedCanHandleMessageGroupedByConsumerIdPrefixes.ParallelAsync(
                        async messageGroupedByConsumerIdPrefixGroup =>
                        {
                            var hasSubQueuePrefix = PlatformInboxBusMessage
                                .GetSubQueuePrefix(messageGroupedByConsumerIdPrefixGroup.Key + PlatformInboxBusMessage.BuildIdPrefixSeparator)
                                .IsNotNullOrEmpty();
                            // (I)
                            // If there's no sub-queue prefix (hasSubQueuePrefix == false), process messages in parallel. => customPageSize is null (get many messages)
                            // Otherwise, process messages sequentially. (hasSubQueuePrefix == true) => customPageSize is one to allow process once at a time
                            var popToHandleInboxEventBusMessagesPageSize = hasSubQueuePrefix || CurrentProcessMessageParallelLimitLock.CurrentCount == 0
                                ? 1
                                : CurrentProcessMessageParallelLimitLock.CurrentCount;

                            for (var i = 0; i <= messageGroupedByConsumerIdPrefixGroup.Count() / popToHandleInboxEventBusMessagesPageSize; i++)
                            {
                                // Retrieve a batch of messages to handle for the current prefix.
                                var toHandleMessages = await PopToHandleInboxEventBusMessages(
                                    messageGroupedByConsumerIdPrefixGroup.Key,
                                    customPageSize: popToHandleInboxEventBusMessagesPageSize, // (I)
                                    cancellationToken);
                                if (toHandleMessages.IsEmpty()) break;

                                using (var startIntervalPingProcessingCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken))
                                {
                                    var pingTask = Task.CompletedTask;
                                    try
                                    {
                                        pingTask = StartIntervalPingProcessing(
                                            toHandleMessages,
                                            startIntervalPingProcessingCts.Token,
                                            CurrentInboxRepositoryFactory);

                                        await toHandleMessages.ParallelAsync(
                                            async p => await HandleInboxMessageAsync(p, cancellationToken),
                                            InboxConfig.MaxParallelProcessingMessagesCount);
                                    }
                                    finally
                                    {
                                        // Cancel ping processing after handling all messages in the batch
                                        try
                                        {
                                            await startIntervalPingProcessingCts.CancelAsync();
                                        }
                                        catch (Exception ex)
                                        {
                                            Logger.LogWarning(
                                                ex,
                                                "Error cancelling ping processing for inbox messages batch. " +
                                                "[StoreKey:{StoreKey}]. [ApplicationLane:{ApplicationLane}]. " +
                                                "[PersistenceOwnerType:{PersistenceOwnerType}]. [PersistenceContextType:{PersistenceContextType}]",
                                                ProcessingStoreKey,
                                                ProcessingApplicationLane,
                                                ProcessingPersistenceOwnerType,
                                                ProcessingPersistenceContextType);
                                        }

                                        try { await pingTask; }
                                        catch (OperationCanceledException) when (startIntervalPingProcessingCts.IsCancellationRequested)
                                        {
                                            // The batch owns its ping loop, including cancellation before its first tick.
                                        }
                                    }
                                }
                            }
                        },
                        maxConcurrent: InboxConfig.MaxParallelProcessingMessagesCount);

                    IsFirstTimeProcess = false;

                    await Task.Delay(InboxConfig.CheckToProcessTriggerIntervalTimeSeconds.Seconds(), cancellationToken);

                    return pagedCanHandleMessageGroupedByConsumerIdPrefixes;
                },
                maxExecutionCount: InboxConfig.GetCanHandleMessageGroupedByConsumerIdPrefixesPageSize,
                cancellationToken: cancellationToken);
        });
    }

    private Task StartIntervalPingProcessing(
        List<PlatformInboxBusMessage> toHandleMessages,
        CancellationToken token,
        Func<IServiceProvider, IPlatformInboxBusMessageRepository> repositoryFactory = null)
    {
        return PlatformInboxMessageBusConsumerHelper.StartIntervalPingProcessingAsync(
            toHandleMessages,
            () => Logger,
            ServiceProvider,
            token,
            repositoryFactory ?? CurrentInboxRepositoryFactory);
    }

    protected async Task HandleInboxMessageAsync(PlatformInboxBusMessage toHandleInboxMessage, CancellationToken cancellationToken = default)
    {
        var processMessageParallelLimitLock = CurrentProcessMessageParallelLimitLock;

        // Permit lifecycle invariants:
        // - permitAcquired starts false; flips to true ONLY when WaitAsync returns true (acquired).
        // - WaitAsync(timeout, ct) contract:
        //     returns true   => permit acquired
        //     returns false  => timeout, NO permit
        //     throws OCE     => cancellation, NO permit (per SemaphoreSlim contract, no permit leaks on cancel)
        // - finally guards release with `if (permitAcquired)` — never over-releases on timeout/cancel paths.
        //
        // Soft-cap throttling rationale: if all permits held by hung consumers, proceed WITHOUT a permit
        // (overshoot) to prevent head-of-line blocking. Fix B's CancelAfter inside InvokeConsumerAsync still
        // caps individual consumer runtime; outer ParallelAsync calls still bound batch concurrency.
        var permitAcquired = false;
        try
        {
            permitAcquired = await processMessageParallelLimitLock.WaitAsync(
                InboxConfig.PermitAcquisitionTimeoutSeconds.Seconds(),
                cancellationToken);

            if (!permitAcquired)
            {
                Logger.LogWarning(
                    "[InboxConsume] Permit acquisition timed out after {TimeoutSeconds}s — proceeding without permit (overshoot). " +
                    "InboxId={InboxId}, ConsumerBy={ConsumerBy}, ForApplicationName={ForApplicationName}. " +
                    "Sustained warnings under normal load indicate MaxParallelProcessingMessagesCount is undersized. " +
                    "[StoreKey:{StoreKey}]. [ApplicationLane:{ApplicationLane}]. " +
                    "[PersistenceOwnerType:{PersistenceOwnerType}]. [PersistenceContextType:{PersistenceContextType}]",
                    InboxConfig.PermitAcquisitionTimeoutSeconds,
                    toHandleInboxMessage.Id,
                    toHandleInboxMessage.ConsumerBy,
                    toHandleInboxMessage.ForApplicationName,
                    ProcessingStoreKey,
                    ProcessingApplicationLane,
                    ProcessingPersistenceOwnerType,
                    ProcessingPersistenceContextType);
            }

            using (var scope = ServiceProvider.CreateTrackedScope()) await InvokeConsumerAsync(scope, toHandleInboxMessage, cancellationToken);
        }
        catch (Exception)
        {
            // Revert covers BOTH cancellation-during-wait AND consumer failure. Uses CancellationToken.None
            // so revert still runs even when caller's token is already cancelled (host shutdown).
            await ExecuteWithInboxRepositoryAsync(inboxBusMessageRepository =>
            {
                return PlatformInboxMessageBusConsumerHelper.RevertExistingInboxToNewMessageAsync(
                    toHandleInboxMessage,
                    inboxBusMessageRepository,
                    () => CreateLogger(LoggerFactory),
                    CancellationToken.None);
            });
        }
        finally
        {
            // Release ONLY if acquired. Guard prevents over-release on timeout/cancel paths where the
            // semaphore never granted us a slot.
            if (permitAcquired) processMessageParallelLimitLock.TryRelease();
        }
    }

    /// <summary>
    /// Checks if there are any inbox messages that can be handled.
    /// </summary>
    /// <param name="messageGroupedByConsumerIdPrefix">The prefix of the consumer ID to filter messages by.</param>
    /// <param name="inboxBusMessageRepository">The repository for accessing inbox messages.</param>
    /// <returns>True if there are messages to handle; otherwise, false.</returns>
    protected async Task<bool> AnyCanHandleInboxBusMessages(
        string messageGroupedByConsumerIdPrefix,
        IPlatformInboxBusMessageRepository inboxBusMessageRepository)
    {
        // Retrieve a single message that can be handled, filtered by consumer ID prefix.
        var toHandleMessages = await inboxBusMessageRepository.GetAllAsync(
            queryBuilder: query => CanHandleMessagesByConsumerIdPrefixQueryBuilder(query, messageGroupedByConsumerIdPrefix, limit: 1));

        if (toHandleMessages.IsEmpty())
            return false;

        var toHandleMessage = toHandleMessages.First();

        var hasPreviousNotProcessedMessage =
            PlatformInboxBusMessage.GetSubQueuePrefix(toHandleMessage.Id).IsNotNullOrEmpty() &&
            await inboxBusMessageRepository.AnyAsync(
                PlatformInboxBusMessage.CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(toHandleMessage));

        return !hasPreviousNotProcessedMessage;
    }

    /// <summary>
    /// Invokes the appropriate consumer for a given inbox message.
    /// </summary>
    /// <param name="scope">The service scope for resolving dependencies.</param>
    /// <param name="toHandleInboxMessage">The inbox message to handle.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    protected virtual async Task InvokeConsumerAsync(
        IServiceScope scope,
        PlatformInboxBusMessage toHandleInboxMessage,
        CancellationToken cancellationToken)
    {
        // Resolve the consumer type based on the inbox message.
        var consumerType = ResolveConsumerType(toHandleInboxMessage);

        if (consumerType != null)
        {
            // Resolve the consumer instance and configure it for inbox message handling.
            var consumer = scope.ServiceProvider.GetService(consumerType)
                .As<IPlatformApplicationMessageBusConsumer>()
                .With(p => p.HandleExistingInboxMessage = toHandleInboxMessage)
                .With(p => p.NeedToCheckAnySameConsumerOtherPreviousNotProcessedInboxMessage = false)
                .With(p => p.NeedStartIntervalPingInboxMessageProcessing = false)
                .With(p => p.NoNeedCheckHandleWhen = true);

            if (currentProcessingState.Value != null)
                consumer.ConfigureMessageBusStoreRoute(
                    currentProcessingState.Value.Descriptor.StoreKey,
                    currentProcessingState.Value.Lane.ApplicationName);

            // Determine the message type expected by the consumer.
            var consumerMessageType = PlatformMessageBusConsumer.GetConsumerMessageType(consumer.GetType());

            // Deserialize the inbox message into the appropriate message type.
            var busMessage = Util.TaskRunner.CatchExceptionContinueThrow(
                () => PlatformJsonSerializer.Deserialize(
                    toHandleInboxMessage.JsonMessage,
                    consumerMessageType),
                ex => Logger.LogError(
                    ex.BeautifyStackTrace(),
                    "RabbitMQ parsing message to {ConsumerMessageType}. [[Error:{Error}]];[[Id: {MessageId}]];" +
                    "[[MessageJson: {JsonMessage}]]. [StoreKey:{StoreKey}]. [ApplicationLane:{ApplicationLane}]. " +
                    "[PersistenceOwnerType:{PersistenceOwnerType}]. [PersistenceContextType:{PersistenceContextType}]",
                    consumerMessageType.Name,
                    ex.Message,
                    toHandleInboxMessage.Id,
                    toHandleInboxMessage.JsonMessage,
                    ProcessingStoreKey,
                    ProcessingApplicationLane,
                    ProcessingPersistenceOwnerType,
                    ProcessingPersistenceContextType));

            if (busMessage != null)
            {
                try
                {
                    // Check if the consumer should handle the message based on its HandleWhen logic.
                    if (await consumer.HandleWhen(busMessage, toHandleInboxMessage.RoutingKey))
                        // Invoke the consumer's HandleAsync method with a hard wall-clock ceiling (default 7 days,
                        // configurable via InboxConfig.MaxProcessingDurationSeconds).
                        //
                        // INTENT: This is a FALLBACK for the deadlock-with-alive-ping pathological case ONLY.
                        // A consumer that is genuinely still progressing — even if it runs for hours or days —
                        // will keep refreshing LastProcessingPingDate via the background ping task and will NOT
                        // be killed by this ceiling for the full 7 days. Long-running ≠ stuck.
                        //
                        // If you have a consumer that legitimately runs >7 days, RAISE MaxProcessingDurationSeconds
                        // per-service rather than lowering this default. Falsely killing a still-progressing consumer
                        // causes duplicate-execution risk (see DUPLICATION RISK below).
                        //
                        // On timeout, OperationCanceledException is converted to TimeoutException → message marked Failed
                        // → normal Failed-retry pathway picks it up with backoff (instead of staying stuck in Processing).
                        //
                        // DUPLICATION RISK (accepted): .WaitAsync(token) cancels the await wrapper only — the underlying
                        // consumer.HandleAsync task keeps running on the thread pool until it completes naturally. The
                        // Failed-retry path (or the ping-stale branch in CanHandleMessagesQueryBuilder once the orphan's
                        // background ping task stops) can therefore re-pop the same row and invoke a SECOND consumer
                        // instance in parallel with the orphan.
                        // This is accepted because permanent stuck-Processing is worse than rare parallel re-execution.
                        // Consumers MUST be idempotent — see IPlatformMessageBusConsumer.HandleAsync XML docs.
                    {
                        using (var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken))
                        {
                            timeoutCts.CancelAfter(InboxConfig.MaxProcessingDurationSeconds.Seconds());
                            var consumerTask = PlatformMessageBusConsumer.InvokeConsumerAsync(
                                consumer,
                                busMessage,
                                toHandleInboxMessage.RoutingKey,
                                MessageBusConfig,
                                Logger);
                            try
                            {
                                await consumerTask.WaitAsync(timeoutCts.Token);
                            }
                            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                            {
                                // Shutdown must retain the invocation's scope until the consumer really exits.
                                // The hosted stop still bounds this drain by the host's own deadline.
                                await consumerTask;
                                throw;
                            }
                            catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
                            {
                                throw new TimeoutException(
                                    $"Inbox consumer {consumer.GetType().FullName} exceeded MaxProcessingDurationSeconds={InboxConfig.MaxProcessingDurationSeconds}s for InboxId={toHandleInboxMessage.Id}.");
                            }
                        }
                    }
                    else
                        // If the consumer doesn't handle the message, delete the inbox message.
                    {
                        await ResolveInboxRepository(scope.ServiceProvider)
                            .DeleteImmediatelyAsync(toHandleInboxMessage.Id, cancellationToken: cancellationToken);
                    }
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    // If an error occurs during consumer invocation, update the inbox message as failed.
                    await PlatformInboxMessageBusConsumerHelper.UpdateExistingInboxFailedMessageAsync(
                        ServiceProvider,
                        toHandleInboxMessage,
                        toHandleInboxMessage.JsonMessage.JsonDeserialize<object>(),
                        consumer.GetType(),
                        ex,
                        PlatformInboxBusMessage.DefaultRetryProcessFailedMessageInSecondsUnit,
                        () => Logger,
                         consumerHasErrorAndShouldNeverRetry: consumer.HasErrorAndShouldNeverRetry,
                         cancellationToken: cancellationToken,
                         inboxBusMessageRepositoryFactory: CurrentInboxRepositoryFactory);
                }
            }
        }
        else
        {
            // If the consumer type cannot be resolved, update the inbox message as ignored, never retry.
            await PlatformInboxMessageBusConsumerHelper.UpdateExistingInboxFailedMessageAsync(
                ServiceProvider,
                toHandleInboxMessage,
                toHandleInboxMessage.JsonMessage.JsonDeserialize<object>(),
                null,
                new Exception($"Error resolve consumer type {toHandleInboxMessage.ConsumerBy}. InboxId:{toHandleInboxMessage.Id}"),
                PlatformInboxBusMessage.DefaultRetryProcessFailedMessageInSecondsUnit,
                () => Logger,
                 consumerHasErrorAndShouldNeverRetry: true,
                 cancellationToken: cancellationToken,
                 inboxBusMessageRepositoryFactory: CurrentInboxRepositoryFactory);
        }
    }

    /// <summary>
    /// Retrieves a batch of inbox messages to handle, marking them as "Processing" to prevent concurrent processing by other instances.
    /// </summary>
    /// <param name="messageGroupedByConsumerIdPrefix">The prefix of the consumer ID to filter messages by.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A list of inbox messages to handle.</returns>
    protected async Task<List<PlatformInboxBusMessage>> PopToHandleInboxEventBusMessages(
        string messageGroupedByConsumerIdPrefix,
        int? customPageSize,
        CancellationToken cancellationToken)
    {
        try
        {
            return await ExecuteWithInboxRepositoryAsync<List<PlatformInboxBusMessage>>(inboxEventBusMessageRepo =>
            {
                return inboxEventBusMessageRepo.UowManager()
                    .ExecuteUowTask(async () =>
                    {
                        // Retrieve a batch of messages to handle.
                        var toHandleMessages = await inboxEventBusMessageRepo.GetAllAsync(
                            queryBuilder: query => CanHandleMessagesByConsumerIdPrefixQueryBuilder(
                                query,
                                messageGroupedByConsumerIdPrefix,
                                 limit: customPageSize ?? CurrentProcessMessageParallelLimitLock.CurrentCount),
                            cancellationToken);

                        // If there are no messages or another instance is already processing messages with the same prefix, return an empty list.
                        if (toHandleMessages.IsEmpty())
                            return [];

                        var toHandleMessage = toHandleMessages.First();

                        var hasPreviousNotProcessedMessage =
                            PlatformInboxBusMessage.GetSubQueuePrefix(toHandleMessage.Id).IsNotNullOrEmpty() &&
                            await inboxEventBusMessageRepo.AnyAsync(
                                PlatformInboxBusMessage.CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(toHandleMessage),
                                cancellationToken);

                        if (hasPreviousNotProcessedMessage)
                            return [];

                        // Mark the retrieved messages as "Processing" and update their last consume date.
                        toHandleMessages.ForEach(p =>
                        {
                            p.ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Processing;
                            p.LastProcessingPingDate = DateTime.UtcNow;
                            p.LastConsumeDate = Clock.UtcNow;
                        });

                        // Update the messages in the database.
                        await inboxEventBusMessageRepo.UpdateManyAsync(
                            toHandleMessages,
                            dismissSendEvent: true,
                            checkDiff: false,
                            eventCustomConfig: null,
                            cancellationToken);

                        return toHandleMessages;
                    });
            });
        }
        catch (PlatformDomainRowVersionConflictException conflictDomainException)
        {
            // If a row version conflict occurs, it means another consumer instance is already processing some messages.
            // This is expected in a multi-instance environment, so retry retrieving messages.
            Logger.LogDebug(
                conflictDomainException,
                "Some other consumer instance has been handling some inbox messages (support multi service instance running concurrently), " +
                "which lead to row version conflict. This is as expected. " +
                "[StoreKey:{StoreKey}]. [ApplicationLane:{ApplicationLane}]. " +
                "[PersistenceOwnerType:{PersistenceOwnerType}]. [PersistenceContextType:{PersistenceContextType}]",
                ProcessingStoreKey,
                ProcessingApplicationLane,
                ProcessingPersistenceOwnerType,
                ProcessingPersistenceContextType);

            return await PopToHandleInboxEventBusMessages(messageGroupedByConsumerIdPrefix, customPageSize, cancellationToken);
        }
    }

    /// <summary>
    /// Builds a query for retrieving inbox messages that can be handled, filtered by consumer ID prefix.
    /// </summary>
    /// <param name="query">The base query.</param>
    /// <param name="messageGroupedByConsumerIdPrefix">The prefix of the consumer ID to filter messages by.</param>
    /// <returns>The modified query.</returns>
    protected IQueryable<PlatformInboxBusMessage> CanHandleMessagesByConsumerIdPrefixQueryBuilder(
        IQueryable<PlatformInboxBusMessage> query,
        string messageGroupedByConsumerIdPrefix,
        int limit)
    {
        return query
            // Filter by consumer ID prefix, if provided.
            .WhereIf(messageGroupedByConsumerIdPrefix.IsNotNullOrEmpty(), p => p.Id.StartsWith(messageGroupedByConsumerIdPrefix))
            // Filter by messages that can be handled based on their status and application name.
            .Pipe(query => PlatformInboxBusMessage.CanHandleMessagesQueryBuilder(
                query,
                limit,
                ProcessingApplicationName,
                retryFailedMessageImmediately: IsFirstTimeProcess,
                FirstTimeProcessDate));
    }

    /// <summary>
    /// Checks if the inbox message repository is registered in the service provider.
    /// </summary>
    /// <returns>True if the repository is registered; otherwise, false.</returns>
    protected bool HasInboxEventBusMessageRepositoryRegistered()
    {
        if (HasRegistryComposition)
            return GetProcessingStates().Count > 0;

        return ServiceProvider.ExecuteScoped(scope => scope.ServiceProvider.GetService<IPlatformInboxBusMessageRepository>() != null);
    }

    private bool HasRegistryComposition => messageBusStoreRegistry?.HasRuntimeStoreComposition == true;

    private IReadOnlyList<InboxProcessingState> GetProcessingStates()
    {
        return HasRegistryComposition ? processingStates.Get() : [];
    }

    // One state per application lane: each lane consumes only its own rows with its own configuration.
    private ReadOnlyCollection<InboxProcessingState> BuildProcessingStates()
    {
        return PlatformMessageBusStoreRuntimeDescriptors
            .Resolve(messageBusStoreRegistry, descriptor => descriptor.IsInboxEnabled)
            .SelectMany(descriptor => PlatformMessageBusStoreRuntimeDescriptors
                .GetOrderedLanes(descriptor)
                .Select(lane => new InboxProcessingState(
                    descriptor,
                    lane,
                    descriptor.ResolveInboxConfig(ServiceProvider, lane.ApplicationModuleType))))
            .ToList()
            .AsReadOnly();
    }

    private IPlatformInboxBusMessageRepository ResolveInboxRepository(IServiceProvider serviceProvider)
    {
        var repositoryFactory = CurrentInboxRepositoryFactory;
        return repositoryFactory == null
            ? serviceProvider.GetRequiredService<IPlatformInboxBusMessageRepository>()
            : repositoryFactory(serviceProvider);
    }

    private async Task ExecuteWithInboxRepositoryAsync(Func<IPlatformInboxBusMessageRepository, Task> action)
    {
        var repositoryFactory = CurrentInboxRepositoryFactory;

        if (repositoryFactory == null)
        {
            await ServiceProvider.ExecuteInjectScopedAsync(action);
            return;
        }

        Func<IServiceProvider, Task> scopedAction = scopedServiceProvider => action(repositoryFactory(scopedServiceProvider));
        await ServiceProvider.ExecuteInjectScopedAsync(
            scopedAction);
    }

    private async Task<TResult> ExecuteWithInboxRepositoryAsync<TResult>(
        Func<IPlatformInboxBusMessageRepository, Task<TResult>> action)
    {
        var repositoryFactory = CurrentInboxRepositoryFactory;

        if (repositoryFactory == null)
            return await ServiceProvider.ExecuteInjectScopedAsync<TResult>(action);

        Func<IServiceProvider, Task<TResult>> scopedAction = scopedServiceProvider => action(repositoryFactory(scopedServiceProvider));
        return await ServiceProvider.ExecuteInjectScopedAsync<TResult>(
            scopedAction);
    }

    private sealed class InboxProcessingState : IDisposable
    {
        public InboxProcessingState(
            PlatformMessageBusStoreDescriptor descriptor,
            PlatformMessageBusApplicationLaneRegistration lane,
            PlatformInboxConfig config)
        {
            Descriptor = descriptor;
            Lane = lane;
            Config = config;
            ProcessMessageParallelLimitLock = new SemaphoreSlim(config.MaxParallelProcessingMessagesCount, config.MaxParallelProcessingMessagesCount);
            MaxIntervalProcessTriggeredLock = new SemaphoreSlim(config.MaxParallelProcessingMessagesCount, config.MaxParallelProcessingMessagesCount);
        }

        public PlatformMessageBusStoreDescriptor Descriptor { get; }
        public PlatformMessageBusApplicationLaneRegistration Lane { get; }
        public PlatformInboxConfig Config { get; }
        public SemaphoreSlim ProcessMessageParallelLimitLock { get; }
        public SemaphoreSlim MaxIntervalProcessTriggeredLock { get; }
        public bool IsFirstTimeProcess { get; set; } = true;
        public DateTime? FirstTimeProcessDate { get; set; }

        public void Dispose()
        {
            ProcessMessageParallelLimitLock.Dispose();
            MaxIntervalProcessTriggeredLock.Dispose();
        }
    }

    /// <summary>
    /// Resolves the consumer type for a given inbox message.
    /// </summary>
    /// <param name="toHandleInboxMessage">The inbox message to resolve the consumer type for.</param>
    /// <returns>The consumer type, or null if it cannot be resolved.</returns>
    protected Type ResolveConsumerType(PlatformInboxBusMessage toHandleInboxMessage)
    {
        return AvailableConsumerByNameToTypeDic.GetValueOrDefault(toHandleInboxMessage.ConsumerBy, null);
    }
}
