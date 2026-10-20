#pragma warning disable IDE0055

#region

using System.Collections.ObjectModel;
using System.Diagnostics;
using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.HostingBackgroundServices;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Timing;
using Easy.Platform.Common.Utils;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Application.MessageBus.Store;
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
    private readonly IPlatformMessageBusStoreRegistry messageBusStoreRegistry;
    private readonly AsyncLocal<OutboxProcessingState> currentProcessingState = new();
    private readonly PlatformOutboxConfig legacyOutboxConfig;
    private readonly PlatformMessageBusStoreRuntimeStateCache<OutboxProcessingState> processingStates;
    private DateTime? firstTimeProcessDate;
    private bool isFirstTimeProcess = true;

    public PlatformSendOutboxBusMessageHostedService(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory,
        IPlatformApplicationSettingContext applicationSettingContext,
        PlatformOutboxConfig outboxConfig,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformMessageBusStoreRegistry messageBusStoreRegistry = null
    )
        : base(serviceProvider, loggerFactory)
    {
        ApplicationSettingContext = applicationSettingContext;
        legacyOutboxConfig = outboxConfig;
        RootServiceProvider = rootServiceProvider;
        this.messageBusStoreRegistry = messageBusStoreRegistry;
        processingStates = new PlatformMessageBusStoreRuntimeStateCache<OutboxProcessingState>(BuildProcessingStates);

        processMessageParallelLimitLock = new SemaphoreSlim(legacyOutboxConfig.MaxParallelProcessingMessagesCount, legacyOutboxConfig.MaxParallelProcessingMessagesCount);
        maxIntervalProcessTriggeredLock = new SemaphoreSlim(legacyOutboxConfig.MaxParallelProcessingMessagesCount, legacyOutboxConfig.MaxParallelProcessingMessagesCount);
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
    protected PlatformOutboxConfig OutboxConfig => currentProcessingState.Value?.Config ?? legacyOutboxConfig;

    /// <summary>
    /// Gets the root service provider.
    /// </summary>
    protected IPlatformRootServiceProvider RootServiceProvider { get; }

    private SemaphoreSlim CurrentProcessMessageParallelLimitLock =>
        currentProcessingState.Value?.ProcessMessageParallelLimitLock ?? processMessageParallelLimitLock;

    private SemaphoreSlim CurrentMaxIntervalProcessTriggeredLock =>
        currentProcessingState.Value?.MaxIntervalProcessTriggeredLock ?? maxIntervalProcessTriggeredLock;

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

    private Func<IServiceProvider, IPlatformOutboxBusMessageRepository> CurrentOutboxRepositoryFactory =>
        currentProcessingState.Value?.Descriptor.OutboxRepositoryFactory;

    private string ProcessingStoreKey => currentProcessingState.Value?.Descriptor.StoreKey.Value ?? "Legacy";

    private string ProcessingApplicationLane =>
        currentProcessingState.Value?.ApplicationLane ?? ApplicationSettingContext.ApplicationName;

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

        return legacyOutboxConfig.CheckToProcessTriggerIntervalTimeSeconds.Seconds();
    }

    protected override TimeSpan FallbackProcessTriggerIntervalTime()
    {
        return legacyOutboxConfig.CheckToProcessTriggerIntervalTimeSeconds.Seconds();
    }

    /// <summary>
    /// Performs the interval processing logic, sending outbox messages from the database to the message bus.
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
                QueueBackgroundWork(
                    processingToken => ProcessOutboxMessagesForStateAsync(processingState, processingToken),
                    cancellationToken: cancellationToken);
            }

            return;
        }

        // If the legacy outbox repository is not registered, skip processing.
        if (!HasOutboxEventBusMessageRepositoryRegistered())
            return;

        QueueBackgroundWork(
            processingToken => ProcessOutboxMessagesForStateAsync(null, processingToken),
            cancellationToken: cancellationToken);
    }

    private async Task ProcessOutboxMessagesForStateAsync(OutboxProcessingState processingState, CancellationToken cancellationToken)
    {
        var previousProcessingState = currentProcessingState.Value;
        currentProcessingState.Value = processingState;

        try
        {
            if (CurrentProcessMessageParallelLimitLock.CurrentCount == 0 || CurrentMaxIntervalProcessTriggeredLock.CurrentCount == 0)
                return;

            await CurrentMaxIntervalProcessTriggeredLock.WaitAsync(cancellationToken);
            try
            {
                // Retry sending outbox messages in case of transient errors, such as database connection issues.
                await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                    () => SendOutboxEventBusMessages(cancellationToken),
                    retryAttempt => OutboxConfig.ProcessSendMessageRetryDelaySeconds.Seconds(),
                    retryCount: OutboxConfig.ProcessSendMessageRetryCount,
                    onRetry: (ex, timeSpan, currentRetry, ctx) =>
                    {
                        if (currentRetry >= OutboxConfig.MinimumRetrySendOutboxMessageTimesToLogError)
                        {
                            Logger.LogError(
                                "Retry SendOutboxEventBusMessages {CurrentRetry} time(s) failed: {Error}. " +
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
                    "SendOutboxEventBusMessages failed. [[Error:{Error}]]. " +
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
                CurrentMaxIntervalProcessTriggeredLock.TryRelease();
            }
        }
        finally
        {
            currentProcessingState.Value = previousProcessingState;
        }
    }

    /// <summary>
    /// Sends outbox messages from the database to the message bus, processing them in batches.
    /// </summary>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    protected virtual async Task SendOutboxEventBusMessages(CancellationToken cancellationToken)
    {
        if (IsFirstTimeProcess) FirstTimeProcessDate = Clock.UtcNow;

        await ExecuteWithOutboxRepositoryAsync(outboxBusMessageRepository =>
        {
            // Use a pager to process messages in batches.
            return Util.Pager.ExecuteScrollingPagingAsync(
                async () =>
                {
                    if (CurrentProcessMessageParallelLimitLock.CurrentCount == 0)
                        return [];

                    // Retrieve a page of message IDs that are eligible for processing.
                    var pagedCanHandleMessageGroupedByTypeIdPrefixes = await outboxBusMessageRepository.GetAllAsync(
                            queryBuilder: query =>
                                PlatformOutboxBusMessage
                                    .CanHandleMessagesQueryBuilder(
                                        query,
                                        OutboxConfig.GetCanHandleMessageGroupedByTypeIdPrefixesPageSize,
                                        retryFailedMessageImmediately: IsFirstTimeProcess,
                                        firstTimeProcessDate: FirstTimeProcessDate)
                                    .Select(p => p.Id),
                            cancellationToken: cancellationToken)
                        .Then(messageIds => messageIds.GroupBy(PlatformOutboxBusMessage.GetIdPrefix).ToList());

                    var claimedMessageCount = 0;

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
                            var popToHandleInboxEventBusMessagesPageSize = hasSubQueuePrefix || CurrentProcessMessageParallelLimitLock.CurrentCount == 0
                                ? 1
                                : CurrentProcessMessageParallelLimitLock.CurrentCount;

                            for (var i = 0; i <= messageGroupedByConsumerIdPrefixGroup.Count() / popToHandleInboxEventBusMessagesPageSize; i++)
                            {
                                // Retrieve a batch of messages to handle for the current prefix.
                                var toHandleMessages = await PopToHandleOutboxEventBusMessages(
                                    messageGroupedByConsumerIdPrefixGroup.Key,
                                    customPageSize: popToHandleInboxEventBusMessagesPageSize, // (I)
                                    cancellationToken
                                );
                                if (toHandleMessages.IsEmpty()) break;

                                Interlocked.Add(ref claimedMessageCount, toHandleMessages.Count);

                                using (var startIntervalPingProcessingCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken))
                                {
                                    var pingTask = PlatformOutboxMessageBusProducerHelper.StartIntervalPingProcessingAsync(
                                        toHandleMessages,
                                        RootServiceProvider,
                                        () => Logger,
                                        startIntervalPingProcessingCts.Token,
                                        CurrentOutboxRepositoryFactory);

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
                                            Logger.LogWarning(
                                                ex,
                                                "Error cancelling ping processing for outbox messages batch. " +
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
                        OutboxConfig.MaxParallelProcessingMessagesCount
                    );

                    IsFirstTimeProcess = false;

                    // Eligible followers can remain blocked by an earlier subqueue message. Yield to the next
                    // timed trigger if no group claimed work; selected groups alone do not prove drain progress.
                    return claimedMessageCount > 0 ? pagedCanHandleMessageGroupedByTypeIdPrefixes : [];
                },
                maxExecutionCount: OutboxConfig.GetCanHandleMessageGroupedByTypeIdPrefixesPageSize,
                cancellationToken: cancellationToken
            );
        });

        // Local function to handle a single outbox message.
        async Task HandleOutboxMessageAsync(PlatformOutboxBusMessage toHandleOutboxMessage)
        {
            await CurrentProcessMessageParallelLimitLock.WaitAsync(cancellationToken);
            try
            {
                using (var scope = ServiceProvider.CreateTrackedScope()) await SendMessageToBusAsync(scope, toHandleOutboxMessage, cancellationToken);
            }
            finally
            {
                CurrentProcessMessageParallelLimitLock.TryRelease();
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

        if (toHandleMessages.IsEmpty())
            return false;

        var toHandleMessage = toHandleMessages.First();

        var hasPreviousNotProcessedMessage =
            PlatformOutboxBusMessage.GetSubQueuePrefix(toHandleMessage.Id).IsNotNullOrEmpty()
            && await outboxBusMessageRepository.AnyAsync(
                PlatformOutboxBusMessage.CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(toHandleMessage)
            );

        return !hasPreviousNotProcessedMessage;
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
            retryFailedMessageImmediately: IsFirstTimeProcess,
            firstTimeProcessDate: FirstTimeProcessDate
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
                    cancellationToken,
                    outboxBusMessageRepositoryFactory: CurrentOutboxRepositoryFactory,
                    selectedOutboxConfig: OutboxConfig
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
                    Logger,
                    CurrentOutboxRepositoryFactory
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
            return await ExecuteWithOutboxRepositoryAsync<List<PlatformOutboxBusMessage>>(outboxEventBusMessageRepo =>
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
                        if (toHandleMessages.IsEmpty())
                            return [];

                        var toHandleMessage = toHandleMessages.First();

                        var hasPreviousNotProcessedMessage =
                            PlatformOutboxBusMessage.GetSubQueuePrefix(toHandleMessage.Id).IsNotNullOrEmpty()
                            && await outboxEventBusMessageRepo.AnyAsync(
                                PlatformOutboxBusMessage.CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(toHandleMessage),
                                cancellationToken
                            );

                        if (hasPreviousNotProcessedMessage)
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
                "Some other producer instance has been handling some outbox messages, which lead to row version conflict " +
                "(support multi service instance running concurrently). This is as expected. " +
                "[StoreKey:{StoreKey}]. [ApplicationLane:{ApplicationLane}]. " +
                "[PersistenceOwnerType:{PersistenceOwnerType}]. [PersistenceContextType:{PersistenceContextType}]",
                ProcessingStoreKey,
                ProcessingApplicationLane,
                ProcessingPersistenceOwnerType,
                ProcessingPersistenceContextType
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
            retryFailedMessageImmediately: IsFirstTimeProcess,
            firstTimeProcessDate: FirstTimeProcessDate
        );
    }

    /// <summary>
    /// Checks if the outbox message repository is registered in the service provider.
    /// </summary>
    /// <returns>True if the repository is registered; otherwise, false.</returns>
    protected bool HasOutboxEventBusMessageRepositoryRegistered()
    {
        if (HasRegistryComposition)
            return GetProcessingStates().Count > 0;

        return ServiceProvider.ExecuteScoped(scope => scope.ServiceProvider.GetService<IPlatformOutboxBusMessageRepository>() != null);
    }

    private bool HasRegistryComposition => messageBusStoreRegistry?.HasRuntimeStoreComposition == true;

    private IReadOnlyList<OutboxProcessingState> GetProcessingStates()
    {
        return HasRegistryComposition ? processingStates.Get() : [];
    }

    // One state per store: outbox rows carry no lane identity, so a store shared by several lanes is sent once.
    private ReadOnlyCollection<OutboxProcessingState> BuildProcessingStates()
    {
        return PlatformMessageBusStoreRuntimeDescriptors
            .Resolve(messageBusStoreRegistry, descriptor => descriptor.IsOutboxEnabled)
            .Select(descriptor => new OutboxProcessingState(
                descriptor,
                PlatformMessageBusStoreRuntimeDescriptors.ResolveSharedStoreConfig(
                    descriptor,
                    lane => descriptor.ResolveOutboxConfig(ServiceProvider, lane.ApplicationModuleType),
                    SendSettingsUsed,
                    Logger,
                    GetType().Name)))
            .ToList()
            .AsReadOnly();
    }

    private static object SendSettingsUsed(PlatformOutboxConfig config)
    {
        return (
            config.MaxParallelProcessingMessagesCount,
            config.CheckToProcessTriggerIntervalTimeSeconds,
            config.GetCanHandleMessageGroupedByTypeIdPrefixesPageSize,
            config.ProcessSendMessageRetryCount,
            config.ProcessSendMessageRetryDelaySeconds,
            config.MinimumRetrySendOutboxMessageTimesToLogError,
            config.RetryProcessFailedMessageInSecondsUnit,
            config.AutoDeleteProcessedMessage);
    }

    private async Task ExecuteWithOutboxRepositoryAsync(Func<IPlatformOutboxBusMessageRepository, Task> action)
    {
        var repositoryFactory = CurrentOutboxRepositoryFactory;

        if (repositoryFactory == null)
        {
            await ServiceProvider.ExecuteInjectScopedAsync(action);
            return;
        }

        Func<IServiceProvider, Task> scopedAction = scopedServiceProvider =>
            action(repositoryFactory(scopedServiceProvider));
        await ServiceProvider.ExecuteInjectScopedAsync(
            scopedAction);
    }

    private async Task<TResult> ExecuteWithOutboxRepositoryAsync<TResult>(
        Func<IPlatformOutboxBusMessageRepository, Task<TResult>> action)
    {
        var repositoryFactory = CurrentOutboxRepositoryFactory;

        if (repositoryFactory == null)
            return await ServiceProvider.ExecuteInjectScopedAsync<TResult>(action);

        Func<IServiceProvider, Task<TResult>> scopedAction = scopedServiceProvider =>
            action(repositoryFactory(scopedServiceProvider));
        return await ServiceProvider.ExecuteInjectScopedAsync<TResult>(
            scopedAction);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            processMessageParallelLimitLock.Dispose();
            maxIntervalProcessTriggeredLock.Dispose();

            if (processingStates.BuiltStates != null)
            {
                foreach (var processingState in processingStates.BuiltStates)
                    processingState.Dispose();
            }
        }

        base.Dispose(disposing);
    }

    private sealed class OutboxProcessingState : IDisposable
    {
        public OutboxProcessingState(PlatformMessageBusStoreDescriptor descriptor, PlatformOutboxConfig config)
        {
            Descriptor = descriptor;
            Config = config;
            ProcessMessageParallelLimitLock = new SemaphoreSlim(config.MaxParallelProcessingMessagesCount, config.MaxParallelProcessingMessagesCount);
            MaxIntervalProcessTriggeredLock = new SemaphoreSlim(config.MaxParallelProcessingMessagesCount, config.MaxParallelProcessingMessagesCount);
        }

        public PlatformMessageBusStoreDescriptor Descriptor { get; }
        public PlatformOutboxConfig Config { get; }
        public SemaphoreSlim ProcessMessageParallelLimitLock { get; }
        public SemaphoreSlim MaxIntervalProcessTriggeredLock { get; }
        public bool IsFirstTimeProcess { get; set; } = true;
        public DateTime? FirstTimeProcessDate { get; set; }

        public string ApplicationLane => string.Join(",", Descriptor.ApplicationLanes.Select(lane => lane.ApplicationName));

        public void Dispose()
        {
            ProcessMessageParallelLimitLock.Dispose();
            MaxIntervalProcessTriggeredLock.Dispose();
        }
    }
}
