#pragma warning disable IDE0055

#region

using System.Diagnostics;
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

namespace Easy.Platform.Application.MessageBus.OutboxPattern;

/// <summary>
/// A hosted service that periodically scans the Outbox collection in the database for new messages and sends them to the message bus.
/// This service implements the producer side of the Outbox Pattern, ensuring reliable message delivery even in case of application failures.
/// </summary>
public class PlatformSendOutboxBusMessageHostedService : PlatformIntervalHostingBackgroundService
{
    private readonly SemaphoreSlim maxIntervalProcessTriggeredLock;
    private readonly SemaphoreSlim processMessageParallelLimitLock;
    private DateTime? firstTimeProcessDate;
    private bool isFirstTimeProcess = true;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformSendOutboxBusMessageHostedService" /> class.
    /// </summary>
    /// <param name="serviceProvider">The service provider for the current scope.</param>
    /// <param name="loggerFactory">A factory for creating loggers.</param>
    /// <param name="applicationSettingContext">The application setting context.</param>
    /// <param name="outboxConfig">The configuration for the outbox pattern.</param>
    /// <param name="rootServiceProvider">The root service provider.</param>
    public PlatformSendOutboxBusMessageHostedService(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory,
        IPlatformApplicationSettingContext applicationSettingContext,
        PlatformOutboxConfig outboxConfig,
        IPlatformRootServiceProvider rootServiceProvider
    )
        : base(serviceProvider, loggerFactory)
    {
        ApplicationSettingContext = applicationSettingContext;
        OutboxConfig = outboxConfig;
        RootServiceProvider = rootServiceProvider;

        processMessageParallelLimitLock = new SemaphoreSlim(OutboxConfig.MaxParallelProcessingMessagesCount, OutboxConfig.MaxParallelProcessingMessagesCount);
        maxIntervalProcessTriggeredLock = new SemaphoreSlim(OutboxConfig.MaxParallelProcessingMessagesCount, OutboxConfig.MaxParallelProcessingMessagesCount);
    }

    /// <summary>
    /// Gets a value indicating whether to log information about the interval processing.
    /// </summary>
    public override bool LogIntervalProcessInformation => OutboxConfig.LogIntervalProcessInformation;

    /// <summary>
    /// Gets the application setting context.
    /// </summary>
    protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }

    /// <summary>
    /// Gets the configuration for the outbox pattern.
    /// </summary>
    protected PlatformOutboxConfig OutboxConfig { get; }

    /// <summary>
    /// Gets the root service provider.
    /// </summary>
    protected IPlatformRootServiceProvider RootServiceProvider { get; }

    /// <summary>
    /// Determines the interval at which the background processing should be triggered.
    /// </summary>
    /// <returns>A <see cref="TimeSpan" /> representing the interval.</returns>
    protected override TimeSpan ProcessTriggerIntervalTime()
    {
        return OutboxConfig.CheckToProcessTriggerIntervalTimeSeconds.Seconds();
    }

    /// <summary>
    /// Performs the interval processing logic, sending outbox messages from the database to the message bus.
    /// </summary>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    protected override async Task IntervalProcessAsync(CancellationToken cancellationToken)
    {
        // Wait for all required modules to be initialized before processing messages.
        await IPlatformModule.WaitForAllModulesInitializedAsync(ServiceProvider, typeof(IPlatformPersistenceModule), Logger, $"process {GetType().Name}");

        // If the outbox message repository is not registered or processing is already in progress, skip processing.
        if (!HasOutboxEventBusMessageRepositoryRegistered())
            return;

        Util.TaskRunner.QueueActionInBackground(
            async () =>
            {
                if (processMessageParallelLimitLock.CurrentCount == 0 || maxIntervalProcessTriggeredLock.CurrentCount == 0)
                    return;

                try
                {
                    await maxIntervalProcessTriggeredLock.WaitAsync(cancellationToken);

                    // Retry sending outbox messages in case of transient errors, such as database connection issues.
                    await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                        () => SendOutboxEventBusMessages(cancellationToken),
                        retryAttempt => OutboxConfig.ProcessSendMessageRetryDelaySeconds.Seconds(),
                        retryCount: OutboxConfig.ProcessSendMessageRetryCount,
                        onRetry: (ex, timeSpan, currentRetry, ctx) =>
                        {
                            // Log an error if the retry count exceeds a certain threshold.
                            if (currentRetry >= OutboxConfig.MinimumRetrySendOutboxMessageTimesToLogError)
                            {
                                Logger.LogError(
                                    "Retry SendOutboxEventBusMessages {CurrentRetry} time(s) failed: {Error}. [ApplicationName:{ApplicationName}]. [ApplicationAssembly:{ApplicationAssembly}]",
                                    currentRetry,
                                    ex.Message,
                                    ApplicationSettingContext.ApplicationName,
                                    ApplicationSettingContext.ApplicationAssembly.FullName
                                );
                            }
                        },
                        cancellationToken: cancellationToken
                    );
                }
                catch (Exception ex)
                {
                    Logger.LogError(
                        ex.BeautifyStackTrace(),
                        "SendOutboxEventBusMessages failed. [[Error:{Error}]]. [ApplicationName:{ApplicationName}]. [ApplicationAssembly:{ApplicationAssembly}]",
                        ex.Message,
                        ApplicationSettingContext.ApplicationName,
                        ApplicationSettingContext.ApplicationAssembly.FullName
                    );
                }
                finally
                {
                    maxIntervalProcessTriggeredLock.TryRelease();
                }
            },
            cancellationToken: cancellationToken
        );
    }

    /// <summary>
    /// Sends outbox messages from the database to the message bus, processing them in batches.
    /// </summary>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    protected virtual async Task SendOutboxEventBusMessages(CancellationToken cancellationToken)
    {
        if (isFirstTimeProcess) firstTimeProcessDate = Clock.UtcNow;

        await ServiceProvider.ExecuteInjectScopedAsync(async (IPlatformOutboxBusMessageRepository outboxBusMessageRepository) =>
        {
            // Use a pager to process messages in batches.
            await Util.Pager.ExecuteScrollingPagingAsync(
                async () =>
                {
                    if (processMessageParallelLimitLock.CurrentCount == 0)
                        return [];

                    // Retrieve a page of message IDs that are eligible for processing.
                    var pagedCanHandleMessageGroupedByTypeIdPrefixes = await outboxBusMessageRepository.GetAllAsync(
                            queryBuilder: query =>
                                PlatformOutboxBusMessage
                                    .CanHandleMessagesQueryBuilder(
                                        query,
                                        OutboxConfig.GetCanHandleMessageGroupedByTypeIdPrefixesPageSize,
                                        retryFailedMessageImmediately: isFirstTimeProcess,
                                        firstTimeProcessDate: firstTimeProcessDate)
                                    .Select(p => p.Id),
                            cancellationToken: cancellationToken)
                        .Then(messageIds => messageIds.GroupBy(PlatformOutboxBusMessage.GetIdPrefix).ToList());

                    // Process each message prefix in parallel.
                    await pagedCanHandleMessageGroupedByTypeIdPrefixes.ParallelAsync(
                        async messageGroupedByConsumerIdPrefixGroup =>
                        {
                            var hasSubQueuePrefix = PlatformOutboxBusMessage
                                .GetSubQueuePrefix(messageGroupedByConsumerIdPrefixGroup.Key + PlatformOutboxBusMessage.BuildIdPrefixSeparator)
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
                                var toHandleMessages = await PopToHandleOutboxEventBusMessages(
                                    messageGroupedByConsumerIdPrefixGroup.Key,
                                    customPageSize: popToHandleInboxEventBusMessagesPageSize, // (I)
                                    cancellationToken
                                );
                                if (toHandleMessages.IsEmpty()) break;

                                using (var startIntervalPingProcessingCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken))
                                {
                                    PlatformOutboxMessageBusProducerHelper.StartIntervalPingProcessing(
                                        toHandleMessages,
                                        RootServiceProvider,
                                        () => Logger,
                                        startIntervalPingProcessingCts.Token);

                                    try
                                    {
                                        await toHandleMessages.ParallelAsync(HandleOutboxMessageAsync, OutboxConfig.MaxParallelProcessingMessagesCount);
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
                                            Logger.LogWarning(ex, "Error cancelling ping processing for outbox messages batch");
                                        }
                                    }
                                }
                            }
                        },
                        OutboxConfig.MaxParallelProcessingMessagesCount
                    );

                    isFirstTimeProcess = false;

                    return pagedCanHandleMessageGroupedByTypeIdPrefixes;
                },
                maxExecutionCount: OutboxConfig.GetCanHandleMessageGroupedByTypeIdPrefixesPageSize,
                cancellationToken: cancellationToken
            );
        });

        // Local function to handle a single outbox message.
        async Task HandleOutboxMessageAsync(PlatformOutboxBusMessage toHandleOutboxMessage)
        {
            try
            {
                await processMessageParallelLimitLock.WaitAsync(cancellationToken);

                using (var scope = ServiceProvider.CreateTrackedScope()) await SendMessageToBusAsync(scope, toHandleOutboxMessage, cancellationToken);
            }
            finally
            {
                processMessageParallelLimitLock.TryRelease();
            }
        }
    }

    /// <summary>
    /// Checks if there are any outbox messages that can be handled.
    /// </summary>
    /// <param name="messageGroupedByTypeIdPrefix">The prefix of the message type ID to filter messages by.</param>
    /// <param name="outboxBusMessageRepository">The repository for accessing outbox messages.</param>
    /// <returns>True if there are messages to handle; otherwise, false.</returns>
    protected async Task<bool> AnyCanHandleOutboxBusMessages(string messageGroupedByTypeIdPrefix, IPlatformOutboxBusMessageRepository outboxBusMessageRepository)
    {
        // Retrieve a single message that can be handled, filtered by message type ID prefix.
        var toHandleMessages = await outboxBusMessageRepository.GetAllAsync(
            queryBuilder: query =>
                CanHandleMessagesByProducerIdPrefixQueryBuilder(query, messageGroupedByTypeIdPrefix).Take(1)
        );

        // Check if there are any messages and if there are no other unprocessed messages with the same sub-queue message ID prefix.
        var result =
            toHandleMessages.Any()
            && !await outboxBusMessageRepository.AnyAsync(
                PlatformOutboxBusMessage.CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(toHandleMessages.First())
            );

        return result;
    }

    /// <summary>
    /// Builds a query for retrieving outbox messages that can be handled, filtered by message type ID prefix.
    /// </summary>
    /// <param name="query">The base query.</param>
    /// <param name="messageGroupedByTypeIdPrefix">The prefix of the message type ID to filter messages by.</param>
    /// <returns>The modified query.</returns>
    private IQueryable<PlatformOutboxBusMessage> CanHandleMessagesByProducerIdPrefixQueryBuilder(
        IQueryable<PlatformOutboxBusMessage> query,
        string messageGroupedByTypeIdPrefix
    )
    {
        return PlatformOutboxBusMessage.CanHandleMessagesQueryBuilder(
            query,
            int.MaxValue, // No specific limit for this method
            messageGroupedByTypeIdPrefix,
            retryFailedMessageImmediately: isFirstTimeProcess,
            firstTimeProcessDate: firstTimeProcessDate
        );
    }

    /// <summary>
    /// Sends a message to the message bus.
    /// </summary>
    /// <param name="scope">The service scope for resolving dependencies.</param>
    /// <param name="toHandleOutboxMessage">The outbox message to send.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    protected virtual async Task SendMessageToBusAsync(IServiceScope scope, PlatformOutboxBusMessage toHandleOutboxMessage, CancellationToken cancellationToken)
    {
        await scope.ExecuteInjectAsync(async (PlatformOutboxMessageBusProducerHelper outboxEventBusProducerHelper) =>
        {
            // Resolve the message type from the assembly.
            var messageType = RootServiceProvider.GetRegisteredPlatformModuleAssembliesType(toHandleOutboxMessage.MessageTypeFullName);

            if (messageType != null)
            {
                // Deserialize the outbox message into the appropriate message type.
                var message = PlatformJsonSerializer.Deserialize(toHandleOutboxMessage.JsonMessage, messageType);

                // Send the message to the message bus using the outbox message producer helper.
                await outboxEventBusProducerHelper!.HandleSendingOutboxMessageAsync(
                    message,
                    toHandleOutboxMessage.RoutingKey,
                    OutboxConfig.RetryProcessFailedMessageInSecondsUnit,
                    subQueueMessageIdPrefix: toHandleOutboxMessage.As<IPlatformSubMessageQueuePrefixSupport>()?.SubQueuePrefix(),
                    needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage: false,
                    autoDeleteProcessedMessage: OutboxConfig.AutoDeleteProcessedMessage,
                    handleExistingOutboxMessage: toHandleOutboxMessage,
                    sourceOutboxUowId: null,
                    cancellationToken
                );
            }
            else
            {
                // If the message type cannot be resolved, update the outbox message as failed.
                await outboxEventBusProducerHelper.UpdateExistingOutboxMessageFailedAsync(
                    toHandleOutboxMessage,
                    new Exception(
                        $"[{GetType().Name}] Error resolve outbox message type "
                        + $"[TypeName:{toHandleOutboxMessage.MessageTypeFullName}]. OutboxId:{toHandleOutboxMessage.Id}"
                    ),
                    OutboxConfig.RetryProcessFailedMessageInSecondsUnit,
                    cancellationToken,
                    Logger
                );
            }
        });
    }

    /// <summary>
    /// Retrieves a batch of outbox messages to handle, marking them as "Processing" to prevent concurrent processing by other instances.
    /// </summary>
    /// <param name="messageGroupedByTypeIdPrefix">The prefix of the message type ID to filter messages by.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A list of outbox messages to handle.</returns>
    protected async Task<List<PlatformOutboxBusMessage>> PopToHandleOutboxEventBusMessages(
        string messageGroupedByTypeIdPrefix,
        int? customPageSize,
        CancellationToken cancellationToken
    )
    {
        try
        {
            return await ServiceProvider.ExecuteInjectScopedAsync<List<PlatformOutboxBusMessage>>((IPlatformOutboxBusMessageRepository outboxEventBusMessageRepo) =>
                outboxEventBusMessageRepo
                    .UowManager()
                    .ExecuteUowTask(async () =>
                    {
                        // Check if there are any messages to handle for the given prefix.
                        if (!await AnyCanHandleOutboxBusMessages(messageGroupedByTypeIdPrefix, outboxEventBusMessageRepo))
                            return [];

                        // Retrieve a batch of messages to handle.
                        var toHandleMessages = await outboxEventBusMessageRepo.GetAllAsync(
                            queryBuilder: query =>
                                CanHandleMessagesByTypeIdPrefixQueryBuilder(query, messageGroupedByTypeIdPrefix)
                                    .Take(customPageSize ?? OutboxConfig.MaxParallelProcessingMessagesCount),
                            cancellationToken
                        );

                        // If there are no messages or another instance is already processing messages with the same prefix, return an empty list.
                        if (
                            toHandleMessages.IsEmpty()
                            || await outboxEventBusMessageRepo.AnyAsync(
                                PlatformOutboxBusMessage.CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(toHandleMessages.First()),
                                cancellationToken
                            )
                        )
                            return [];

                        // Mark the retrieved messages as "Processing" and update their last send date.
                        toHandleMessages.ForEach(p =>
                        {
                            p.SendStatus = PlatformOutboxBusMessage.SendStatuses.Processing;
                            p.LastSendDate = DateTime.UtcNow;
                            p.LastProcessingPingDate = DateTime.UtcNow;
                        });

                        // Update the messages in the database.
                        await outboxEventBusMessageRepo.UpdateManyAsync(
                            toHandleMessages,
                            dismissSendEvent: true,
                            checkDiff: false,
                            eventCustomConfig: null,
                            cancellationToken);

                        return toHandleMessages;
                    })
            );
        }
        catch (PlatformDomainRowVersionConflictException conflictDomainException)
        {
            // If a row version conflict occurs, it means another producer instance is already processing some messages.
            // This is expected in a multi-instance environment, so retry retrieving messages.
            Logger.LogDebug(
                conflictDomainException,
                "Some other producer instance has been handling some outbox messages, which lead to row version conflict (support multi service instance running concurrently). This is as expected."
            );

            return await PopToHandleOutboxEventBusMessages(messageGroupedByTypeIdPrefix, customPageSize, cancellationToken);
        }
    }

    /// <summary>
    /// Builds a query for retrieving outbox messages that can be handled, filtered by message type ID prefix.
    /// </summary>
    /// <param name="query">The base query.</param>
    /// <param name="messageGroupedByTypeIdPrefix">The prefix of the message type ID to filter messages by.</param>
    /// <returns>The modified query.</returns>
    protected IQueryable<PlatformOutboxBusMessage> CanHandleMessagesByTypeIdPrefixQueryBuilder(
        IQueryable<PlatformOutboxBusMessage> query,
        string messageGroupedByTypeIdPrefix
    )
    {
        return PlatformOutboxBusMessage.CanHandleMessagesQueryBuilder(
            query,
            int.MaxValue, // No specific limit for this method
            messageGroupedByTypeIdPrefix,
            retryFailedMessageImmediately: isFirstTimeProcess,
            firstTimeProcessDate: firstTimeProcessDate
        );
    }

    /// <summary>
    /// Checks if the outbox message repository is registered in the service provider.
    /// </summary>
    /// <returns>True if the repository is registered; otherwise, false.</returns>
    protected bool HasOutboxEventBusMessageRepositoryRegistered()
    {
        return ServiceProvider.ExecuteScoped(scope => scope.ServiceProvider.GetService<IPlatformOutboxBusMessageRepository>() != null);
    }
}
