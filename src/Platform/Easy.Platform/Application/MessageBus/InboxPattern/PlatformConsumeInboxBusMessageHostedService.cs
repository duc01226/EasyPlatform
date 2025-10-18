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
                if (processMessageParallelLimitLock.CurrentCount == 0 || maxIntervalProcessTriggeredLock.CurrentCount == 0)
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
            cancellationToken: cancellationToken,
            queueLimitLock: false);
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
                    if (processMessageParallelLimitLock.CurrentCount == 0)
                        return [];

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
        try
        {
            await processMessageParallelLimitLock.WaitAsync(cancellationToken);

            using (var scope = ServiceProvider.CreateTrackedScope()) await InvokeConsumerAsync(scope, toHandleInboxMessage, cancellationToken);
        }
        catch (Exception)
        {
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
            processMessageParallelLimitLock.TryRelease();
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

        // Check if there are any messages and if there are no other unprocessed messages with the same sub-queue message ID prefix.
        var result = toHandleMessages.Any() &&
                     !await inboxBusMessageRepository.AnyAsync(
                         PlatformInboxBusMessage.CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(toHandleMessages.First()));

        return result;
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
                        // Invoke the consumer's HandleAsync method.
                    {
                        await PlatformMessageBusConsumer.InvokeConsumerAsync(
                            consumer,
                            busMessage,
                            toHandleInboxMessage.RoutingKey,
                            MessageBusConfig,
                            Logger);
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
                        if (toHandleMessages.IsEmpty() ||
                            await inboxEventBusMessageRepo.AnyAsync(
                                PlatformInboxBusMessage.CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(toHandleMessages.First()),
                                cancellationToken)) return [];

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
