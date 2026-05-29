#pragma warning disable IDE0055

#region

using System.Diagnostics;
using Easy.Platform.Application.MessageBus.Consumers;
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
    private readonly SemaphoreSlim maxIntervalProcessTriggeredLock;
    private readonly SemaphoreSlim processMessageParallelLimitLock;
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
        PlatformMessageBusConfig messageBusConfig) : base(serviceProvider, loggerFactory)
    {
        ApplicationSettingContext = applicationSettingContext;
        InboxConfig = inboxConfig;
        MessageBusConfig = messageBusConfig;
        // Create a dictionary of available consumers, keyed by their consumer name.
        AvailableConsumerByNameToTypeDic = messageBusScanner
            .ScanAllDefinedConsumerTypes()
            .ToDictionary(PlatformInboxBusMessage.GetConsumerByValue);

        processMessageParallelLimitLock = new SemaphoreSlim(InboxConfig.MaxParallelProcessingMessagesCount, InboxConfig.MaxParallelProcessingMessagesCount);
        maxIntervalProcessTriggeredLock = new SemaphoreSlim(InboxConfig.MaxParallelProcessingMessagesCount, InboxConfig.MaxParallelProcessingMessagesCount);
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
    protected PlatformInboxConfig InboxConfig { get; }

    /// <summary>
    /// Gets the configuration for the message bus.
    /// </summary>
    protected PlatformMessageBusConfig MessageBusConfig { get; }

    /// <summary>
    /// Gets a dictionary of available consumers, keyed by their consumer name.
    /// </summary>
    protected Dictionary<string, Type> AvailableConsumerByNameToTypeDic { get; }

    /// <summary>
    /// Determines the interval at which the background processing should be triggered.
    /// </summary>
    /// <returns>A <see cref="TimeSpan" /> representing the interval.</returns>
    protected override TimeSpan ProcessTriggerIntervalTime()
    {
        return InboxConfig.CheckToProcessTriggerIntervalTimeSeconds.Seconds();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) processMessageParallelLimitLock.Dispose();

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
        await IPlatformModule.WaitForAllModulesInitializedAsync(ServiceProvider, typeof(IPlatformPersistenceModule), Logger, $"process {GetType().Name}");

        // If the inbox message repository is not registered or processing is already in progress, skip processing.
        if (!HasInboxEventBusMessageRepositoryRegistered()) return;

        // Queue action in background so that other interval could try get new available messages to process when there is some slow message is processing cause new message could not be checked
        Util.TaskRunner.QueueActionInBackground(
            async () =>
            {
                // Only gate on the interval-collision lock. Do NOT gate on processMessageParallelLimitLock here:
                // stale-Processing recovery (via the ping-stale branch in CanHandleMessagesQueryBuilder) must still
                // be able to re-pop stuck rows even when all consumer permits are temporarily held. The per-message
                // handler (HandleInboxMessageAsync) already waits on the permit, so throttling is preserved.
                if (maxIntervalProcessTriggeredLock.CurrentCount == 0)
                    return;

                try
                {
                    await maxIntervalProcessTriggeredLock.WaitAsync(cancellationToken);

                    // Retry consuming inbox messages in case of transient errors, such as database connection issues.
                    await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                        () => ConsumeInboxEventBusMessages(cancellationToken),
                        retryAttempt => InboxConfig.ProcessConsumeMessageRetryDelaySeconds.Seconds(),
                        retryCount: InboxConfig.ProcessConsumeMessageRetryCount,
                        onRetry: (ex, timeSpan, currentRetry, ctx) =>
                        {
                            // Log an error if the retry count exceeds a certain threshold.
                            if (currentRetry >= InboxConfig.MinimumRetryConsumeInboxMessageTimesToLogError)
                            {
                                Logger.LogError(
                                    "Retry ConsumeInboxEventBusMessages {CurrentRetry} time(s) failed: {Error}. [ApplicationName:{ApplicationName}]. [ApplicationAssembly:{ApplicationAssembly}]",
                                    currentRetry,
                                    ex.Message,
                                    ApplicationSettingContext.ApplicationName,
                                    ApplicationSettingContext.ApplicationAssembly.FullName);
                            }
                        },
                        cancellationToken: cancellationToken);
                }
                catch (Exception ex)
                {
                    Logger.LogError(
                        ex.BeautifyStackTrace(),
                        "ConsumeInboxEventBusMessages failed: {Error}. [ApplicationName:{ApplicationName}]. [ApplicationAssembly:{ApplicationAssembly}]",
                        ex.Message,
                        ApplicationSettingContext.ApplicationName,
                        ApplicationSettingContext.ApplicationAssembly.FullName);
                }
                finally
                {
                    maxIntervalProcessTriggeredLock.TryRelease();
                }
            },
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Consumes inbox messages from the database, processing them in batches.
    /// </summary>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    protected virtual async Task ConsumeInboxEventBusMessages(CancellationToken cancellationToken)
    {
        if (isFirstTimeProcess) firstTimeProcessDate = Clock.UtcNow;

        await ServiceProvider.ExecuteInjectScopedAsync(async (IPlatformInboxBusMessageRepository inboxBusMessageRepository) =>
        {
            // Use a pager to process messages in batches.
            await Util.Pager.ExecuteScrollingPagingAsync(
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
                                        ApplicationSettingContext.ApplicationName,
                                        retryFailedMessageImmediately: isFirstTimeProcess,
                                        firstTimeProcessDate)
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
                            var popToHandleInboxEventBusMessagesPageSize = hasSubQueuePrefix || processMessageParallelLimitLock.CurrentCount == 0
                                ? 1
                                : processMessageParallelLimitLock.CurrentCount;

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
                                    try
                                    {
                                        StartIntervalPingProcessing(
                                            toHandleMessages,
                                            startIntervalPingProcessingCts.Token);

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
                                            Logger.LogWarning(ex, "Error cancelling ping processing for inbox messages batch");
                                        }
                                    }
                                }
                            }
                        },
                        maxConcurrent: InboxConfig.MaxParallelProcessingMessagesCount);

                    isFirstTimeProcess = false;

                    await Task.Delay(ProcessTriggerIntervalTime(), cancellationToken);

                    return pagedCanHandleMessageGroupedByConsumerIdPrefixes;
                },
                maxExecutionCount: InboxConfig.GetCanHandleMessageGroupedByConsumerIdPrefixesPageSize,
                cancellationToken: cancellationToken);
        });
    }

    private void StartIntervalPingProcessing(List<PlatformInboxBusMessage> toHandleMessages, CancellationToken token)
    {
        PlatformInboxMessageBusConsumerHelper.StartIntervalPingProcessing(toHandleMessages, () => Logger, ServiceProvider, token);
    }

    protected async Task HandleInboxMessageAsync(PlatformInboxBusMessage toHandleInboxMessage, CancellationToken cancellationToken = default)
    {
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
                    "Sustained warnings under normal load indicate MaxParallelProcessingMessagesCount is undersized.",
                    InboxConfig.PermitAcquisitionTimeoutSeconds,
                    toHandleInboxMessage.Id,
                    toHandleInboxMessage.ConsumerBy,
                    toHandleInboxMessage.ForApplicationName);
            }

            using (var scope = ServiceProvider.CreateTrackedScope()) await InvokeConsumerAsync(scope, toHandleInboxMessage, cancellationToken);
        }
        catch (Exception)
        {
            // Revert covers BOTH cancellation-during-wait AND consumer failure. Uses CancellationToken.None
            // so revert still runs even when caller's token is already cancelled (host shutdown).
            await ServiceProvider.ExecuteInjectScopedAsync(async (IPlatformInboxBusMessageRepository inboxBusMessageRepository) =>
            {
                await PlatformInboxMessageBusConsumerHelper.RevertExistingInboxToNewMessageAsync(
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

            // Determine the message type expected by the consumer.
            var consumerMessageType = PlatformMessageBusConsumer.GetConsumerMessageType(consumer.GetType());

            // Deserialize the inbox message into the appropriate message type.
            var busMessage = Util.TaskRunner.CatchExceptionContinueThrow(
                () => PlatformJsonSerializer.Deserialize(
                    toHandleInboxMessage.JsonMessage,
                    consumerMessageType),
                ex => Logger.LogError(
                    ex.BeautifyStackTrace(),
                    "RabbitMQ parsing message to {ConsumerMessageType}. [[Error:{Error}]];[[Id: {MessageId}]];[[MessageJson: {JsonMessage}]];",
                    consumerMessageType.Name,
                    ex.Message,
                    toHandleInboxMessage.Id,
                    toHandleInboxMessage.JsonMessage));

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
                            try
                            {
                                await PlatformMessageBusConsumer.InvokeConsumerAsync(
                                        consumer,
                                        busMessage,
                                        toHandleInboxMessage.RoutingKey,
                                        MessageBusConfig,
                                        Logger)
                                    .WaitAsync(timeoutCts.Token);
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
                        await scope.ServiceProvider.GetRequiredService<IPlatformInboxBusMessageRepository>()
                            .DeleteImmediatelyAsync(toHandleInboxMessage.Id, cancellationToken: cancellationToken);
                    }
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
                        cancellationToken: cancellationToken);
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
                cancellationToken: cancellationToken);
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
            return await ServiceProvider.ExecuteInjectScopedAsync<List<PlatformInboxBusMessage>>(async (IPlatformInboxBusMessageRepository inboxEventBusMessageRepo) =>
            {
                return await inboxEventBusMessageRepo.UowManager()
                    .ExecuteUowTask(async () =>
                    {
                        // Retrieve a batch of messages to handle.
                        var toHandleMessages = await inboxEventBusMessageRepo.GetAllAsync(
                            queryBuilder: query => CanHandleMessagesByConsumerIdPrefixQueryBuilder(
                                query,
                                messageGroupedByConsumerIdPrefix,
                                limit: customPageSize ?? processMessageParallelLimitLock.CurrentCount),
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
                "Some other consumer instance has been handling some inbox messages (support multi service instance running concurrently), which lead to row version conflict. This is as expected.");

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
                ApplicationSettingContext.ApplicationName,
                retryFailedMessageImmediately: isFirstTimeProcess,
                firstTimeProcessDate));
    }

    /// <summary>
    /// Checks if the inbox message repository is registered in the service provider.
    /// </summary>
    /// <returns>True if the repository is registered; otherwise, false.</returns>
    protected bool HasInboxEventBusMessageRepositoryRegistered()
    {
        return ServiceProvider.ExecuteScoped(scope => scope.ServiceProvider.GetService<IPlatformInboxBusMessageRepository>() != null);
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
