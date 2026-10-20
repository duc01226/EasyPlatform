#region

using System.Diagnostics;
using Easy.Platform.Common;
using Easy.Platform.Common.BackgroundLock;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Timing;
using Easy.Platform.Common.Utils;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.MessageBus.OutboxPattern;

/// <summary>
/// Provides helper methods for implementing the Outbox Pattern with message bus producers.
/// The Outbox Pattern ensures reliable message delivery by storing messages in a database before sending them to the message bus.
/// </summary>
public class PlatformOutboxMessageBusProducerHelper : IPlatformHelper
{
    // Logical background-lock pool for outbox send work. Keeping outbox dispatch in its own
    // bulkhead prevents a message-send burst from consuming capacity reserved for inbox, cache,
    // or generic background tasks.
    private const string BgPoolName = "OutboxDispatch";

    /// <summary>
    /// The default number of retry attempts for resilient operations, equivalent to approximately one day with a 1-second delay between retries.
    /// </summary>
    public const int DefaultResilientRetiredCount = 43200;

    /// <summary>
    /// The default delay in seconds between retry attempts for resilient operations.
    /// </summary>
    public const int DefaultResilientRetiredDelaySeconds = 1;

    public const int DefaultMaxResilientRetiredDelaySeconds = 60;

    private readonly IPlatformMessageBusProducer messageBusProducer;
    private readonly PlatformOutboxConfig outboxConfig;
    private readonly IPlatformRootServiceProvider rootServiceProvider;
    private readonly IServiceProvider serviceProvider;
    // Cached because helpers are hot-path objects and the registry already owns pool lifetime.
    private readonly IPlatformBackgroundActionPermitPool bgPool;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformOutboxMessageBusProducerHelper" /> class.
    /// </summary>
    /// <param name="outboxConfig">The configuration for the outbox pattern.</param>
    /// <param name="messageBusProducer">The message bus producer used for sending messages.</param>
    /// <param name="serviceProvider">The service provider for the current scope.</param>
    /// <param name="rootServiceProvider">The root service provider.</param>
    /// <param name="bgRegistry">Background action permit pool registry — pool resolved once and cached.</param>
    public PlatformOutboxMessageBusProducerHelper(
        PlatformOutboxConfig outboxConfig,
        IPlatformMessageBusProducer messageBusProducer,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformBackgroundActionPermitPoolRegistry bgRegistry)
    {
        this.outboxConfig = outboxConfig;
        this.messageBusProducer = messageBusProducer;
        this.serviceProvider = serviceProvider;
        this.rootServiceProvider = rootServiceProvider;
        bgPool = bgRegistry.Get(BgPoolName);
    }

    /// <summary>
    /// Handles the sending of an outbox message, ensuring reliable delivery.
    /// This method checks for existing outbox messages and handles them accordingly, or creates a new outbox message and attempts to send it.
    /// </summary>
    /// <typeparam name="TMessage">The type of the message being sent.</typeparam>
    /// <param name="message">The message to send.</param>
    /// <param name="routingKey">The routing key for the message.</param>
    /// <param name="retryProcessFailedMessageInSecondsUnit">The time unit in seconds for retrying failed message sending.</param>
    /// <param name="subQueueMessageIdPrefix">A prefix for the message ID, used for sub-queueing.</param>
    /// <param name="needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage">Indicates whether to check for other unprocessed messages with the same sub-queue message ID prefix.</param>
    /// <param name="autoDeleteProcessedMessage">AutoDeleteProcessedMessage</param>
    /// <param name="handleExistingOutboxMessage">An existing outbox message to handle, if applicable.</param>
    /// <param name="sourceOutboxUowId">The ID of the unit of work that originated the outbox message.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public async Task HandleSendingOutboxMessageAsync<TMessage>(
        TMessage message,
        string routingKey,
        double retryProcessFailedMessageInSecondsUnit,
        string subQueueMessageIdPrefix,
        bool needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
        bool autoDeleteProcessedMessage,
        PlatformOutboxBusMessage handleExistingOutboxMessage = null,
        string sourceOutboxUowId = null,
        CancellationToken cancellationToken = default,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory = null,
        PlatformOutboxConfig selectedOutboxConfig = null) where TMessage : class, new()
    {
        var effectiveOutboxConfig = selectedOutboxConfig ?? outboxConfig;

        // Keyed callers provide a resolver from the store descriptor. This branch deliberately never asks DI
        // for the unqualified repository, including when a new transaction scope is created.
        if (outboxBusMessageRepositoryFactory != null)
        {
            if (selectedOutboxConfig == null)
                throw new InvalidOperationException("Keyed outbox routing requires the selected application-lane configuration.");

            if (effectiveOutboxConfig.StandaloneScopeForOutbox)
            {
                await ExecuteWithOutboxRepositoryAsync(
                    serviceProvider,
                    outboxBusMessageRepositoryFactory,
                    (scopedServiceProvider, repository) => SendOutboxMessageAsync(
                        message,
                        routingKey,
                        retryProcessFailedMessageInSecondsUnit,
                        handleExistingOutboxMessage,
                        null,
                        subQueueMessageIdPrefix,
                        needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
                        autoDeleteProcessedMessage,
                        cancellationToken,
                        CreateLogger(),
                        repository,
                        scopedServiceProvider.GetRequiredService<IPlatformMessageBusProducer>(),
                        repository.UowManager(),
                        outboxBusMessageRepositoryFactory));
            }
            else
            {
                var repository = outboxBusMessageRepositoryFactory(serviceProvider);

                await SendOutboxMessageAsync(
                    message,
                    routingKey,
                    retryProcessFailedMessageInSecondsUnit,
                    handleExistingOutboxMessage,
                    sourceOutboxUowId,
                    subQueueMessageIdPrefix,
                    needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
                    autoDeleteProcessedMessage,
                    cancellationToken,
                    CreateLogger(),
                    repository,
                    messageBusProducer,
                    repository.UowManager(),
                    outboxBusMessageRepositoryFactory);
            }

            return;
        }

        // If an outbox message repository is configured, use the outbox pattern for reliable message sending.
        if (serviceProvider.GetService<IPlatformOutboxBusMessageRepository>() != null)
        {
            // If standalone scope for outbox is enabled, execute the sending logic in a new scope.
            if (effectiveOutboxConfig.StandaloneScopeForOutbox)
            {
                await serviceProvider.ExecuteInjectScopedAsync((
                    IPlatformOutboxBusMessageRepository outboxBusMessageRepository,
                    IPlatformMessageBusProducer messageBusProducer,
                    IPlatformUnitOfWorkManager unitOfWorkManager) => SendOutboxMessageAsync(
                    message,
                    routingKey,
                    retryProcessFailedMessageInSecondsUnit,
                    handleExistingOutboxMessage,
                    null,
                    subQueueMessageIdPrefix,
                    needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
                    autoDeleteProcessedMessage,
                    cancellationToken,
                    CreateLogger(),
                    outboxBusMessageRepository,
                    messageBusProducer,
                    unitOfWorkManager));
            }
            // Otherwise, execute the sending logic in the current scope.
            else
            {
                await serviceProvider.ExecuteInjectAsync((
                    IPlatformOutboxBusMessageRepository outboxBusMessageRepository,
                    IPlatformMessageBusProducer messageBusProducer,
                    IPlatformUnitOfWorkManager unitOfWorkManager) => SendOutboxMessageAsync(
                    message,
                    routingKey,
                    retryProcessFailedMessageInSecondsUnit,
                    handleExistingOutboxMessage,
                    sourceOutboxUowId,
                    subQueueMessageIdPrefix,
                    needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
                    autoDeleteProcessedMessage,
                    cancellationToken,
                    CreateLogger(),
                    outboxBusMessageRepository,
                    messageBusProducer,
                    unitOfWorkManager));
            }
        }
        // If no outbox message repository is configured, send the message directly to the message bus.
        else
            await messageBusProducer.SendAsync(message, routingKey, cancellationToken);
    }

    /// <summary>
    /// Sends an outbox message, either an existing one or a new one.
    /// </summary>
    /// <typeparam name="TMessage">The type of the message being sent.</typeparam>
    /// <param name="message">The message to send.</param>
    /// <param name="routingKey">The routing key for the message.</param>
    /// <param name="retryProcessFailedMessageInSecondsUnit">The time unit in seconds for retrying failed message sending.</param>
    /// <param name="handleExistingOutboxMessage">An existing outbox message to handle, if applicable.</param>
    /// <param name="sourceOutboxUowId">The ID of the unit of work that originated the outbox message.</param>
    /// <param name="subQueueMessageIdPrefix">A prefix for the message ID, used for sub-queueing.</param>
    /// <param name="needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage">Indicates whether to check for other unprocessed messages with the same sub-queue message ID prefix.</param>
    /// <param name="autoDeleteProcessedMessage">AutoDeleteProcessedMessage</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <param name="logger">The logger to use for logging.</param>
    /// <param name="outboxBusMessageRepository">The repository for accessing outbox messages.</param>
    /// <param name="messageBusProducer">The message bus producer used for sending messages.</param>
    /// <param name="unitOfWorkManager">The unit of work manager.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public async Task SendOutboxMessageAsync<TMessage>(
        TMessage message,
        string routingKey,
        double retryProcessFailedMessageInSecondsUnit,
        PlatformOutboxBusMessage handleExistingOutboxMessage,
        string sourceOutboxUowId,
        string subQueueMessageIdPrefix,
        bool needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
        bool autoDeleteProcessedMessage,
        CancellationToken cancellationToken,
        ILogger logger,
        IPlatformOutboxBusMessageRepository outboxBusMessageRepository,
        IPlatformMessageBusProducer messageBusProducer,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory = null) where TMessage : class, new()
    {
        // If there's an existing outbox message that's not processed or ignored, send it.
        if (handleExistingOutboxMessage != null &&
            handleExistingOutboxMessage.SendStatus != PlatformOutboxBusMessage.SendStatuses.Processed &&
            handleExistingOutboxMessage.SendStatus != PlatformOutboxBusMessage.SendStatuses.Ignored)
        {
            await SendExistingOutboxMessageAsync(
                handleExistingOutboxMessage,
                message,
                routingKey,
                retryProcessFailedMessageInSecondsUnit,
                needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
                autoDeleteProcessedMessage,
                cancellationToken,
                logger,
                messageBusProducer,
                outboxBusMessageRepository,
                outboxBusMessageRepositoryFactory);
        }
        // If there's no existing outbox message, create a new one and attempt to send it.
        else if (handleExistingOutboxMessage == null)
        {
            await SaveAndTrySendNewOutboxMessageAsync(
                message,
                routingKey,
                retryProcessFailedMessageInSecondsUnit,
                sourceOutboxUowId,
                subQueueMessageIdPrefix,
                needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
                autoDeleteProcessedMessage,
                cancellationToken,
                logger,
                unitOfWorkManager,
                outboxBusMessageRepository,
                outboxBusMessageRepositoryFactory);
        }
    }

    /// <summary>
    /// Sends an existing outbox message.
    /// </summary>
    /// <typeparam name="TMessage">The type of the message being sent.</typeparam>
    /// <param name="existingOutboxMessage">The existing outbox message to send.</param>
    /// <param name="message">The message to send.</param>
    /// <param name="routingKey">The routing key for the message.</param>
    /// <param name="retryProcessFailedMessageInSecondsUnit">The time unit in seconds for retrying failed message sending.</param>
    /// <param name="needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage">Indicates whether to check for other unprocessed messages with the same sub-queue message ID prefix.</param>
    /// <param name="autoDeleteProcessedMessage">AutoDeleteProcessedMessage</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <param name="logger">The logger to use for logging.</param>
    /// <param name="messageBusProducer">The message bus producer used for sending messages.</param>
    /// <param name="outboxBusMessageRepository">The repository for accessing outbox messages.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public async Task SendExistingOutboxMessageAsync<TMessage>(
        PlatformOutboxBusMessage existingOutboxMessage,
        TMessage message,
        string routingKey,
        double retryProcessFailedMessageInSecondsUnit,
        bool needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
        bool autoDeleteProcessedMessage,
        CancellationToken cancellationToken,
        ILogger logger,
        IPlatformMessageBusProducer messageBusProducer,
        IPlatformOutboxBusMessageRepository outboxBusMessageRepository,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory = null)
        where TMessage : class, new()
    {
        using (var startIntervalPingProcessingCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken))
        {
            var pingTask = Task.CompletedTask;
            try
            {
                // If sub-queueing is enabled and there are other unprocessed messages with the same prefix, revert the existing message to "New".
                if (needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage &&
                    PlatformOutboxBusMessage.GetSubQueuePrefix(existingOutboxMessage.Id).IsNotNullOrEmpty() &&
                    await outboxBusMessageRepository.AnyAsync(
                        PlatformOutboxBusMessage.CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(existingOutboxMessage),
                        cancellationToken))
                    await RevertExistingOutboxToNewMessageAsync(existingOutboxMessage, outboxBusMessageRepository, cancellationToken);
                else
                {
                    pingTask = StartIntervalPingProcessingAsync(
                        [existingOutboxMessage],
                        rootServiceProvider,
                        () => logger,
                        startIntervalPingProcessingCts.Token,
                        outboxBusMessageRepositoryFactory);

                    // Retry sending the message multiple times in case of transient errors.
                    await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                        () => messageBusProducer.SendAsync(message, routingKey, cancellationToken),
                        retryCount: DefaultResilientRetiredCount,
                        cancellationToken: cancellationToken,
                        sleepDurationProvider: retryAttempt =>
                            Math.Min(retryAttempt + DefaultResilientRetiredDelaySeconds, DefaultMaxResilientRetiredDelaySeconds).Seconds(),
                        onRetry: (ex, delayTime, retryCount, context) =>
                        {
                            if (retryCount > Util.TaskRunner.LogErrorRetryThreshold(DefaultResilientRetiredCount))
                            {
                                logger.LogError(
                                    "[{Type}] Retry: [[ExceptionDiagnostics:{ExceptionDiagnostics}]]. [[Type:{MessageTypeFullName}]]; [[MessageDiagnostics:{MessageDiagnostics}]].",
                                    GetType().Name,
                                    PlatformMessageBusDiagnosticFormatter.FormatException(ex),
                                    existingOutboxMessage.MessageTypeFullName,
                                    PlatformMessageBusDiagnosticFormatter.FormatPersistedMessage(existingOutboxMessage.MessageTypeFullName));
                            }
                        });

                    await startIntervalPingProcessingCts.CancelAsync();

                    // If auto-deletion is enabled, delete the processed message.
                    if (autoDeleteProcessedMessage)
                    {
                        await DeleteExistingOutboxProcessedMessageAsync(
                            serviceProvider,
                            existingOutboxMessage,
                            cancellationToken,
                            outboxBusMessageRepositoryFactory);
                    }
                    else
                    {
                        // Update the outbox message as processed after successful sending.
                        await UpdateExistingOutboxMessageProcessedAsync(
                            rootServiceProvider,
                            existingOutboxMessage,
                            cancellationToken,
                            outboxBusMessageRepositoryFactory);
                    }
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                logger.LogError(
                    "SendExistingOutboxMessageAsync failed. [[ExceptionDiagnostics:{ExceptionDiagnostics}]]",
                    PlatformMessageBusDiagnosticFormatter.FormatException(exception));

                // Update the outbox message as failed if sending fails.
                await UpdateExistingOutboxMessageFailedAsync(
                    existingOutboxMessage,
                    exception,
                    retryProcessFailedMessageInSecondsUnit,
                    cancellationToken,
                    logger,
                    outboxBusMessageRepositoryFactory);

                try
                {
                    await startIntervalPingProcessingCts.CancelAsync();
                }
                catch (Exception e)
                {
                    logger.LogError(
                        "Cancel StartIntervalPingProcessing failed. [[ExceptionDiagnostics:{ExceptionDiagnostics}]]",
                        PlatformMessageBusDiagnosticFormatter.FormatException(e));
                }
            }
            finally
            {
                await startIntervalPingProcessingCts.CancelAsync();
                try { await pingTask; }
                catch (OperationCanceledException) when (startIntervalPingProcessingCts.IsCancellationRequested)
                {
                    // A loop cancelled before its scheduled start still belongs to this operation.
                }
            }
        }
    }

    public Task DeleteExistingOutboxProcessedMessageAsync(
        IServiceProvider serviceProvider,
        PlatformOutboxBusMessage existingOutboxMessage,
        CancellationToken cancellationToken = default,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory = null)
    {
        return DeleteExistingOutboxProcessedMessageAsync(
            serviceProvider, existingOutboxMessage, cancellationToken, outboxBusMessageRepositoryFactory, DefaultResilientRetiredCount);
    }

    // Keep the operation's retry budget separate from terminal cancellation/error handling.
    internal async Task DeleteExistingOutboxProcessedMessageAsync(
        IServiceProvider serviceProvider,
        PlatformOutboxBusMessage existingOutboxMessage,
        CancellationToken cancellationToken,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory,
        int maxRetryCount)
    {
        try
        {
            await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                () => ExecuteWithOutboxRepositoryAsync(
                    serviceProvider,
                    outboxBusMessageRepositoryFactory,
                    (_, outboxBusMessageRepo) => outboxBusMessageRepo.DeleteManyAsync(
                        predicate: p => p.Id == existingOutboxMessage.Id,
                        dismissSendEvent: true,
                        eventCustomConfig: null,
                        cancellationToken)),
                retryCount: maxRetryCount,
                cancellationToken: cancellationToken,
                sleepDurationProvider: retryAttempt => Math.Min(retryAttempt + DefaultResilientRetiredDelaySeconds, DefaultMaxResilientRetiredDelaySeconds).Seconds(),
                onRetry: (ex, delayTime, retryCount, context) =>
                {
                    if (retryCount > Util.TaskRunner.LogErrorRetryThreshold(DefaultResilientRetiredCount))
                    {
                        CreateLogger()
                            .LogError(
                                "[{Type}] Retry: [[ExceptionDiagnostics:{ExceptionDiagnostics}]]. [[Type:{MessageTypeFullName}]]; [[MessageDiagnostics:{MessageDiagnostics}]].",
                                GetType().Name,
                                PlatformMessageBusDiagnosticFormatter.FormatException(ex),
                                existingOutboxMessage.MessageTypeFullName,
                                PlatformMessageBusDiagnosticFormatter.FormatPersistedMessage(existingOutboxMessage.MessageTypeFullName));
                    }
                });
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // The sending operation owns shutdown cancellation; it is not a deletion failure.
            throw;
        }
        catch (Exception e)
        {
            CreateLogger().LogError(
                "Try DeleteExistingOutboxProcessedMessageAsync failed. [[ExceptionDiagnostics:{ExceptionDiagnostics}]]",
                PlatformMessageBusDiagnosticFormatter.FormatException(e));
        }
    }

    /// <summary>
    /// Starts interval ping processing for outbox messages to prevent timeout during message processing.
    /// This method runs in the background and periodically updates the LastProcessingPingDate of outbox messages.
    /// </summary>
    /// <param name="existingOutboxMessages">The outbox messages to ping.</param>
    /// <param name="rootServiceProvider">The root service provider for accessing scoped services.</param>
    /// <param name="loggerFactory">A factory for creating loggers.</param>
    /// <param name="cancellationToken">A token to cancel the ping processing.</param>
    public static void StartIntervalPingProcessing(
        List<PlatformOutboxBusMessage> existingOutboxMessages,
        IPlatformRootServiceProvider rootServiceProvider,
        Func<ILogger> loggerFactory,
        CancellationToken cancellationToken,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory = null)
    {
        _ = StartIntervalPingProcessingAsync(existingOutboxMessages, rootServiceProvider, loggerFactory, cancellationToken, outboxBusMessageRepositoryFactory);
    }

    /// <summary>Starts a ping loop whose owner can await completion after cancellation.</summary>
    public static Task StartIntervalPingProcessingAsync(
        List<PlatformOutboxBusMessage> existingOutboxMessages,
        IPlatformRootServiceProvider rootServiceProvider,
        Func<ILogger> loggerFactory,
        CancellationToken cancellationToken,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory = null)
    {
        // Interval loops intentionally do not take a permit pool: a permit would be held for the
        // lifetime of the loop instead of around one bounded unit of work.
        return Util.TaskRunner.QueueActionInBackgroundTask(
            async () =>
            {
                try
                {
                    while (!cancellationToken.IsCancellationRequested)
                    {
                        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                            async () =>
                            {
                                try
                                {
                                    if (!cancellationToken.IsCancellationRequested)
                                    {
                                        async Task UpdatePingAsync(IPlatformOutboxBusMessageRepository outboxBusMessageRepository)
                                        {
                                            using (var uow = outboxBusMessageRepository.UowManager().Begin())
                                            {
                                                var existingOutboxMessagesDict = existingOutboxMessages.ToDictionary(p => p.Id);

                                                var toUpdateExistingOutboxMessages = await outboxBusMessageRepository.GetAllAsync(
                                                    p => existingOutboxMessagesDict.Keys.Contains(p.Id),
                                                    cancellationToken);

                                                if (toUpdateExistingOutboxMessages.Any())
                                                {
                                                    var pingDate = Clock.UtcNow;

                                                    toUpdateExistingOutboxMessages.ForEach(toUpdateExistingOutboxMessage =>
                                                    {
                                                        toUpdateExistingOutboxMessage.LastProcessingPingDate = pingDate;
                                                        existingOutboxMessagesDict[toUpdateExistingOutboxMessage.Id].LastProcessingPingDate = pingDate;
                                                    });

                                                    await outboxBusMessageRepository.UpdateManyAsync(
                                                        toUpdateExistingOutboxMessages,
                                                        dismissSendEvent: true,
                                                        checkDiff: false,
                                                        eventCustomConfig: null,
                                                        cancellationToken);
                                                }

                                                if (!cancellationToken.IsCancellationRequested) await uow.CompleteAsync(cancellationToken);
                                            }
                                        }

                                        if (outboxBusMessageRepositoryFactory == null)
                                        {
                                            await rootServiceProvider.ExecuteInjectScopedAsync(async (IPlatformOutboxBusMessageRepository outboxBusMessageRepository) =>
                                                await UpdatePingAsync(outboxBusMessageRepository));
                                        }
                                        else
                                        {
                                            await rootServiceProvider.ExecuteInjectScopedAsync(async (IServiceProvider scopedServiceProvider) =>
                                                await UpdatePingAsync(outboxBusMessageRepositoryFactory(scopedServiceProvider)));
                                        }
                                    }

                                    await Task.Delay(PlatformOutboxBusMessage.CheckProcessingPingIntervalSeconds.Seconds(), cancellationToken);
                                }
                                catch (TaskCanceledException)
                                {
                                    // Empty and skip taskCanceledException
                                }
                            },
                            cancellationToken: cancellationToken,
                            retryCount: DefaultResilientRetiredCount,
                            sleepDurationProvider: retryAttempt =>
                                Math.Min(retryAttempt + DefaultResilientRetiredDelaySeconds, DefaultMaxResilientRetiredDelaySeconds).Seconds(),
                            onRetry: (ex, delayTime, retryCount, context) =>
                            {
                                if (retryCount > Util.TaskRunner.LogErrorRetryThreshold(DefaultResilientRetiredCount))
                                {
                                    foreach (var outboxMessage in existingOutboxMessages)
                                    {
                                        loggerFactory()
                                            .LogError(
                                                "[{Type}] Retry: [[ExceptionDiagnostics:{ExceptionDiagnostics}]]. [[Type:{MessageTypeFullName}]]; [[MessageDiagnostics:{MessageDiagnostics}]].",
                                                nameof(PlatformOutboxMessageBusProducerHelper),
                                                PlatformMessageBusDiagnosticFormatter.FormatException(ex),
                                                outboxMessage.MessageTypeFullName,
                                                PlatformMessageBusDiagnosticFormatter.FormatPersistedMessage(outboxMessage.MessageTypeFullName));
                                    }
                                }
                            });
                    }
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    // Cancellation ends this owned loop; other failures remain visible to the background executor.
                }
            },
            loggerFactory: loggerFactory,
            delayTimeSeconds: PlatformOutboxBusMessage.CheckProcessingPingIntervalSeconds,
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Reverts an existing outbox message to the "New" state.
    /// </summary>
    /// <param name="existingOutboxMessage">The existing outbox message to revert.</param>
    /// <param name="outboxBusMessageRepository">The repository for accessing outbox messages.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public async Task RevertExistingOutboxToNewMessageAsync(
        PlatformOutboxBusMessage existingOutboxMessage,
        IPlatformOutboxBusMessageRepository outboxBusMessageRepository,
        CancellationToken cancellationToken)
    {
        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                var toUpdateMessage = await outboxBusMessageRepository.GetByIdAsync(existingOutboxMessage.Id, cancellationToken);

                await outboxBusMessageRepository.UpdateImmediatelyAsync(
                    toUpdateMessage
                        .With(p => p.SendStatus = PlatformOutboxBusMessage.SendStatuses.New),
                    cancellationToken: cancellationToken);
            },
            retryCount: DefaultResilientRetiredCount,
            cancellationToken: cancellationToken,
            sleepDurationProvider: retryAttempt => Math.Min(retryAttempt + DefaultResilientRetiredDelaySeconds, DefaultMaxResilientRetiredDelaySeconds).Seconds(),
            onRetry: (ex, delayTime, retryCount, context) =>
            {
                if (retryCount > Util.TaskRunner.LogErrorRetryThreshold(DefaultResilientRetiredCount))
                {
                    CreateLogger()
                        .LogError(
                            "[{Type}] Retry: [[ExceptionDiagnostics:{ExceptionDiagnostics}]]. [[Type:{MessageTypeFullName}]]; [[MessageDiagnostics:{MessageDiagnostics}]].",
                            GetType().Name,
                            PlatformMessageBusDiagnosticFormatter.FormatException(ex),
                            existingOutboxMessage.MessageTypeFullName,
                            PlatformMessageBusDiagnosticFormatter.FormatPersistedMessage(existingOutboxMessage.MessageTypeFullName));
                }
            });
    }

    /// <summary>
    /// Sends an existing outbox message in a new scope.
    /// </summary>
    /// <typeparam name="TMessage">The type of the message being sent.</typeparam>
    /// <param name="existingOutboxMessage">The existing outbox message to send.</param>
    /// <param name="message">The message to send.</param>
    /// <param name="routingKey">The routing key for the message.</param>
    /// <param name="retryProcessFailedMessageInSecondsUnit">The time unit in seconds for retrying failed message sending.</param>
    /// <param name="needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage">Indicates whether to check for other unprocessed messages with the same sub-queue message ID prefix.</param>
    /// <param name="autoDeleteProcessedMessage">AutoDeleteProcessedMessage</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <param name="logger">The logger to use for logging.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public async Task SendExistingOutboxMessageInNewScopeAsync<TMessage>(
        PlatformOutboxBusMessage existingOutboxMessage,
        TMessage message,
        string routingKey,
        double retryProcessFailedMessageInSecondsUnit,
        bool needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
        bool autoDeleteProcessedMessage,
        CancellationToken cancellationToken,
        ILogger logger,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory = null)
        where TMessage : class, new()
    {
        try
        {
            await ExecuteWithOutboxRepositoryAsync(
                rootServiceProvider,
                outboxBusMessageRepositoryFactory,
                (scopedServiceProvider, repository) => SendExistingOutboxMessageAsync(
                    existingOutboxMessage,
                    message,
                    routingKey,
                    retryProcessFailedMessageInSecondsUnit,
                    needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
                    autoDeleteProcessedMessage,
                    cancellationToken,
                    logger,
                    scopedServiceProvider.GetRequiredService<IPlatformMessageBusProducer>(),
                    repository,
                    outboxBusMessageRepositoryFactory));
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // This independent attempt has stopped; the persisted outbox retains its normal recovery path.
            // Expected cancellation must not enter failed-send recovery after a successful transport send.
        }
        catch (Exception exception)
        {
            logger.LogError(
                "SendExistingOutboxMessageInNewScopeAsync failed. [[ExceptionDiagnostics:{ExceptionDiagnostics}]]",
                PlatformMessageBusDiagnosticFormatter.FormatException(exception));

            // Update the outbox message as failed if sending fails.
            await UpdateExistingOutboxMessageFailedAsync(
                existingOutboxMessage,
                exception,
                retryProcessFailedMessageInSecondsUnit,
                cancellationToken,
                logger,
                outboxBusMessageRepositoryFactory);
        }
    }

    /// <summary>
    /// Updates an existing outbox message as processed.
    /// </summary>
    /// <param name="serviceProvider">The root service provider.</param>
    /// <param name="existingOutboxMessage">The existing outbox message to update.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public async Task UpdateExistingOutboxMessageProcessedAsync(
        IPlatformRootServiceProvider serviceProvider,
        PlatformOutboxBusMessage existingOutboxMessage,
        CancellationToken cancellationToken,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory = null)
    {
        var toUpdateOutboxMessage = existingOutboxMessage;

        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                if (toUpdateOutboxMessage.SendStatus == PlatformOutboxBusMessage.SendStatuses.Processed) return;

                await ExecuteWithOutboxRepositoryAsync(
                    serviceProvider,
                    outboxBusMessageRepositoryFactory,
                    async (_, outboxBusMessageRepository) =>
                        await outboxBusMessageRepository
                            .UowManager()
                            .ExecuteUowTask(async () =>
                            {
                                outboxBusMessageRepository.UowManager()
                                    .CurrentActiveUow()
                                    .SetCachedExistingOriginalEntity<PlatformOutboxBusMessage, string>(toUpdateOutboxMessage, true);

                                try
                                {
                                    toUpdateOutboxMessage.LastSendDate = DateTime.UtcNow;
                                    toUpdateOutboxMessage.LastProcessingPingDate = DateTime.UtcNow;
                                    toUpdateOutboxMessage.SendStatus = PlatformOutboxBusMessage.SendStatuses.Processed;

                                    await outboxBusMessageRepository.SetAsync(toUpdateOutboxMessage, cancellationToken);
                                }
                                catch (PlatformDomainRowVersionConflictException)
                                {
                                    // If a concurrency conflict occurs, retrieve the latest version of the message and retry.
                                    toUpdateOutboxMessage = await ExecuteWithOutboxRepositoryAsync<PlatformOutboxBusMessage>(
                                        serviceProvider,
                                        outboxBusMessageRepositoryFactory,
                                        (_, retryRepository) => retryRepository.GetByIdAsync(toUpdateOutboxMessage.Id, cancellationToken));
                                    throw;
                                }
                            }));
            },
            retryCount: DefaultResilientRetiredCount,
            cancellationToken: cancellationToken,
            sleepDurationProvider: retryAttempt => Math.Min(retryAttempt + DefaultResilientRetiredDelaySeconds, DefaultMaxResilientRetiredDelaySeconds).Seconds(),
            onRetry: (ex, delayTime, retryCount, context) =>
            {
                if (retryCount > Util.TaskRunner.LogErrorRetryThreshold(DefaultResilientRetiredCount))
                {
                    CreateLogger()
                        .LogError(
                            "[{Type}] Retry: [[ExceptionDiagnostics:{ExceptionDiagnostics}]]. [[Type:{MessageTypeFullName}]]; [[MessageDiagnostics:{MessageDiagnostics}]].",
                            GetType().Name,
                            PlatformMessageBusDiagnosticFormatter.FormatException(ex),
                            existingOutboxMessage.MessageTypeFullName,
                            PlatformMessageBusDiagnosticFormatter.FormatPersistedMessage(existingOutboxMessage.MessageTypeFullName));
                }
            });
    }

    /// <summary>
    /// Updates an existing outbox message as failed.
    /// </summary>
    /// <param name="existingOutboxMessage">The existing outbox message to update.</param>
    /// <param name="exception">The exception that caused the failure.</param>
    /// <param name="retryProcessFailedMessageInSecondsUnit">The time unit in seconds for retrying failed message sending.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <param name="logger">The logger to use for logging.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public async Task UpdateExistingOutboxMessageFailedAsync(
        PlatformOutboxBusMessage existingOutboxMessage,
        Exception exception,
        double retryProcessFailedMessageInSecondsUnit,
        CancellationToken cancellationToken,
        ILogger logger,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory = null)
    {
        try
        {
            logger.LogError(
                "UpdateExistingOutboxMessageFailedAsync. [[ExceptionDiagnostics:{ExceptionDiagnostics}]]. [[Type:{MessageTypeFullName}]]; [[OutboxMessageId:{OutboxMessageId}]]; [[MessageDiagnostics:{MessageDiagnostics}]].",
                PlatformMessageBusDiagnosticFormatter.FormatException(exception),
                existingOutboxMessage.MessageTypeFullName,
                existingOutboxMessage.Id,
                PlatformMessageBusDiagnosticFormatter.FormatPersistedMessage(existingOutboxMessage.MessageTypeFullName));

            await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                () => ExecuteWithOutboxRepositoryAsync(
                    rootServiceProvider,
                    outboxBusMessageRepositoryFactory,
                    async (_, outboxBusMessageRepository) =>
                    {
                        // Retrieve the latest version of the outbox message to prevent concurrency issues.
                        var latestCurrentExistingOutboxMessage = await outboxBusMessageRepository.FirstOrDefaultAsync(
                            p => p.Id == existingOutboxMessage.Id && p.SendStatus == PlatformOutboxBusMessage.SendStatuses.Processing,
                            cancellationToken);

                        if (latestCurrentExistingOutboxMessage != null)
                        {
                            await UpdateExistingOutboxMessageFailedAsync(
                                latestCurrentExistingOutboxMessage,
                                exception,
                                retryProcessFailedMessageInSecondsUnit,
                                cancellationToken,
                                outboxBusMessageRepository);
                        }
                    }),
                retryCount: DefaultResilientRetiredCount,
                cancellationToken: cancellationToken,
                sleepDurationProvider: retryAttempt => Math.Min(retryAttempt + DefaultResilientRetiredDelaySeconds, DefaultMaxResilientRetiredDelaySeconds).Seconds(),
                onRetry: (ex, delayTime, retryCount, context) =>
                {
                    if (retryCount > Util.TaskRunner.LogErrorRetryThreshold(DefaultResilientRetiredCount))
                    {
                        CreateLogger()
                            .LogError(
                                "[{Type}] Retry: [[ExceptionDiagnostics:{ExceptionDiagnostics}]]. [[Type:{MessageTypeFullName}]]; [[MessageDiagnostics:{MessageDiagnostics}]].",
                                GetType().Name,
                                PlatformMessageBusDiagnosticFormatter.FormatException(ex),
                                existingOutboxMessage.MessageTypeFullName,
                                PlatformMessageBusDiagnosticFormatter.FormatPersistedMessage(existingOutboxMessage.MessageTypeFullName));
                    }
                });
        }
        catch (Exception ex)
        {
            logger.LogError(
                "UpdateExistingOutboxMessageFailedAsync. [[ExceptionDiagnostics:{ExceptionDiagnostics}]]. [[Type:{MessageTypeFullName}]]; [[OutboxMessageId:{OutboxMessageId}]]; [[MessageDiagnostics:{MessageDiagnostics}]].",
                PlatformMessageBusDiagnosticFormatter.FormatException(ex),
                existingOutboxMessage.MessageTypeFullName,
                existingOutboxMessage.Id,
                PlatformMessageBusDiagnosticFormatter.FormatPersistedMessage(existingOutboxMessage.MessageTypeFullName));
        }
    }

    /// <summary>
    /// Updates an existing outbox message with failure details.
    /// </summary>
    /// <param name="existingOutboxMessage">The existing outbox message to update.</param>
    /// <param name="exception">The send failure; its type, message and stack trace are persisted — see the remarks.</param>
    /// <param name="retryProcessFailedMessageInSecondsUnit">The time unit in seconds for retrying failed message sending.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <param name="outboxBusMessageRepository">The repository for accessing outbox messages.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    /// <remarks>
    /// <para>
    /// <b><c>LastSendError</c> is a debuggable exception diagnostic, but never a message dump.</b> It carries the
    /// exception type, message, demystified stack trace and inner TYPE chain. It does NOT carry the bus message
    /// body, inner exception messages, or <see cref="Exception.Data" />.
    /// </para>
    /// <para>
    /// This column briefly stored the exception TYPE alone, on the reasoning that it is a long-lived database row
    /// readable by anyone with database access. That was reversed, because the reasoning did not survive one
    /// observation: <b>this send path catches the exception and never rethrows it</b>, so this column is the ONLY
    /// record that the failure happened — and <see cref="PlatformOutboxBusMessage.JsonMessage" /> already persists
    /// the entire message body in the SAME ROW, with the same retention and the same readers. Stripping the adjacent
    /// error column was therefore never a net confidentiality gain; it only made stuck messages undiagnosable.
    /// </para>
    /// <para>
    /// What genuinely still holds is the boundary between the EXCEPTION and the PAYLOAD: the message body is not
    /// re-serialized into this column. The accepted disclosure — exception messages are not credential-scrubbed —
    /// is documented as a decision on <c>PlatformDiagnosticJsonSerializer.SerializeException</c>.
    /// </para>
    /// <para>
    /// <b>Visibility:</b> <c>internal</c> rather than <c>private</c> so the unit tests can assert what actually lands
    /// in the persisted column, which no log-capturing test can observe.
    /// </para>
    /// </remarks>
    internal static async Task UpdateExistingOutboxMessageFailedAsync(
        PlatformOutboxBusMessage existingOutboxMessage,
        Exception exception,
        double retryProcessFailedMessageInSecondsUnit,
        CancellationToken cancellationToken,
        IPlatformOutboxBusMessageRepository outboxBusMessageRepository)
    {
        existingOutboxMessage.SendStatus = PlatformOutboxBusMessage.SendStatuses.Failed;
        existingOutboxMessage.LastSendDate = DateTime.UtcNow;
        existingOutboxMessage.LastProcessingPingDate = DateTime.UtcNow;
        existingOutboxMessage.LastSendError = PlatformMessageBusDiagnosticFormatter.FormatException(exception);
        existingOutboxMessage.RetriedProcessCount = (existingOutboxMessage.RetriedProcessCount ?? 0) + 1;
        existingOutboxMessage.NextRetryProcessAfter = PlatformOutboxBusMessage.CalculateNextRetryProcessAfter(
            existingOutboxMessage.RetriedProcessCount,
            retryProcessFailedMessageInSecondsUnit);

        await outboxBusMessageRepository.SetAsync(existingOutboxMessage, cancellationToken);
    }

    /// <summary>
    /// Saves a new outbox message and attempts to send it.
    /// </summary>
    /// <typeparam name="TMessage">The type of the message being sent.</typeparam>
    /// <param name="message">The message to send.</param>
    /// <param name="routingKey">The routing key for the message.</param>
    /// <param name="retryProcessFailedMessageInSecondsUnit">The time unit in seconds for retrying failed message sending.</param>
    /// <param name="sourceOutboxUowId">The ID of the unit of work that originated the outbox message.</param>
    /// <param name="subQueueMessageIdPrefix">A prefix for the message ID, used for sub-queueing.</param>
    /// <param name="needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage">Indicates whether to check for other unprocessed messages with the same sub-queue message ID prefix.</param>
    /// <param name="autoDeleteProcessedMessage">AutoDeleteProcessedMessage</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <param name="logger">The logger to use for logging.</param>
    /// <param name="unitOfWorkManager">The unit of work manager.</param>
    /// <param name="outboxBusMessageRepository">The repository for accessing outbox messages.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    protected async Task SaveAndTrySendNewOutboxMessageAsync<TMessage>(
        TMessage message,
        string routingKey,
        double retryProcessFailedMessageInSecondsUnit,
        string sourceOutboxUowId,
        string subQueueMessageIdPrefix,
        bool needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
        bool autoDeleteProcessedMessage,
        CancellationToken cancellationToken,
        ILogger logger,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IPlatformOutboxBusMessageRepository outboxBusMessageRepository,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory = null)
        where TMessage : class, new()
    {
        // Get the sourceOutboxUow active unit of work, if applicable.
        var sourceOutboxUowActiveUow = sourceOutboxUowId != null
            ? unitOfWorkManager.TryGetCurrentOrCreatedActiveUow(sourceOutboxUowId)
            : null;

        // Keyed (store-routed) send whose source UoW is not visible to the SELECTED store's UoW manager: either the source
        // UoW already completed, or it belongs to a different store. In the cross-store case the message is sent before
        // the source transaction commits, so transactional-outbox atomicity is lost. The legacy single-store path keeps
        // its existing behavior; routed sends surface the condition instead of degrading silently.
        if (outboxBusMessageRepositoryFactory != null && sourceOutboxUowId != null && sourceOutboxUowActiveUow == null)
        {
            logger.LogWarning(
                "[PlatformOutboxMessageBusProducerHelper] Source unit of work {SourceOutboxUowId} is not active in the selected message-bus store for {MessageType}. "
                + "If it belongs to a different store, the message is sent without waiting for that transaction to commit (no transactional-outbox atomicity). "
                + "Route the producer to the store that owns the source aggregate.",
                sourceOutboxUowId,
                typeof(TMessage).FullName);
        }

        // If there's no active unit of work or the unit of work is a pseudo transaction, send the message immediately in a background thread.
        var canSendMessageDirectlyWithoutWaitUowTransaction = sourceOutboxUowActiveUow == null || sourceOutboxUowActiveUow.IsPseudoTransactionUow();

        // Try to send directly first without using outbox for faster performance if no uow or fake uow. If failed => use inbox to support retry later
        if (canSendMessageDirectlyWithoutWaitUowTransaction)
        {
            try
            {
                await messageBusProducer.SendAsync(message, routingKey, cancellationToken);
            }
            catch (Exception)
            {
                await DoCreateNewInboxAndSendMessage();
            }
        }
        else
            await DoCreateNewInboxAndSendMessage();


        async Task DoCreateNewInboxAndSendMessage()
        {
            // Get or create the outbox message to process.
            var toProcessOutboxMessage = await GetOrCreateToProcessOutboxMessage(
                message,
                routingKey,
                subQueueMessageIdPrefix,
                cancellationToken,
                outboxBusMessageRepository,
                // Persistence failures in an active source scope must escape so its owner can retry a fresh
                // operation. The long recovery policy belongs to independent scopes, not a damaged business UoW.
                persistenceRetryCount: sourceOutboxUowActiveUow == null ? DefaultResilientRetiredCount : 0);

            if (toProcessOutboxMessage != null)
            {
                // If there's no active unit of work or the unit of work is a pseudo transaction, send the message immediately in a background thread.
                if (canSendMessageDirectlyWithoutWaitUowTransaction)
                {
                    // If there's an active unit of work, save changes to ensure the outbox message is persisted.
                    await outboxBusMessageRepository.UowManager().TryCurrentActiveUowSaveChangesAsync();

                    // Direct background send still uses OutboxDispatch so immediate sends and
                    // post-commit sends share the same outbox-specific fan-out limit.
                    Util.TaskRunner.QueueActionInBackground(
                        () => SendExistingOutboxMessageInNewScopeAsync(
                            toProcessOutboxMessage,
                            message,
                            routingKey,
                            retryProcessFailedMessageInSecondsUnit,
                            needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
                            autoDeleteProcessedMessage,
                            cancellationToken,
                            logger,
                            outboxBusMessageRepositoryFactory),
                        bgPool,
                        loggerFactory: CreateLogger,
                        cancellationToken: cancellationToken,
                        logFullStackTraceBeforeBackgroundTask: false);
                }
                else
                {
                    // If there's an active unit of work, add an action to send the message after the unit of work completes.
                    sourceOutboxUowActiveUow!.OnSaveChangesCompletedActions.Add(async () =>
                    {
                        // Try to process sending the outbox message immediately after the unit of work completes.
                        // Execute the send on a separate background task after commit, using the
                        // same OutboxDispatch pool as direct sends.
                        Util.TaskRunner.QueueActionInBackground(
                            () => SendExistingOutboxMessageInNewScopeAsync(
                                toProcessOutboxMessage,
                                message,
                                routingKey,
                                retryProcessFailedMessageInSecondsUnit,
                                needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
                                autoDeleteProcessedMessage,
                                cancellationToken,
                                logger,
                                outboxBusMessageRepositoryFactory),
                            bgPool,
                            cancellationToken: cancellationToken);
                    });
                }
            }
        }
    }

    /// <summary>
    /// Retrieves or creates an outbox message to be processed.
    /// </summary>
    /// <typeparam name="TMessage">The type of the message being sent.</typeparam>
    /// <param name="message">The message to send.</param>
    /// <param name="routingKey">The routing key for the message.</param>
    /// <param name="subQueueMessageIdPrefix">A prefix for the message ID, used for sub-queueing.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <param name="outboxBusMessageRepository">The repository for accessing outbox messages.</param>
    /// <param name="persistenceRetryCount">Retry budget for the owning persistence scope.</param>
    private async Task<PlatformOutboxBusMessage?> GetOrCreateToProcessOutboxMessage<TMessage>(
        TMessage message,
        string routingKey,
        string subQueueMessageIdPrefix,
        CancellationToken cancellationToken,
        IPlatformOutboxBusMessageRepository outboxBusMessageRepository,
        int persistenceRetryCount) where TMessage : class, new()
    {
        return await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                var messageTrackId = message.As<IPlatformTrackableBusMessage>()?.TrackingId;

                // Check if an outbox message with the same tracking ID and sub-queue message ID prefix already exists.
                var existedOutboxMessage = messageTrackId != null
                    ? await outboxBusMessageRepository.FirstOrDefaultAsync(
                        p => p.Id == PlatformOutboxBusMessage.BuildId(message.GetType(), messageTrackId, subQueueMessageIdPrefix),
                        cancellationToken)
                    : null;

                // Check if there are any other unprocessed messages with the same sub-queue message ID prefix.
                var isAnySameMessageTypeAndIdPrefixOtherNotProcessedMessage =
                    subQueueMessageIdPrefix.IsNotNullOrEmpty() &&
                    await outboxBusMessageRepository.AnyAsync(
                        PlatformOutboxBusMessage.CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(
                            message.GetType(),
                            messageTrackId,
                            existedOutboxMessage?.CreatedDate ?? Clock.UtcNow,
                            subQueueMessageIdPrefix),
                        cancellationToken);

                // If no existing message is found, create a new one.
                var newOutboxMessage = existedOutboxMessage == null
                    ? await outboxBusMessageRepository.CreateAsync(
                        PlatformOutboxBusMessage.Create(
                            message,
                            messageTrackId,
                            routingKey,
                            isAnySameMessageTypeAndIdPrefixOtherNotProcessedMessage
                                ? PlatformOutboxBusMessage.SendStatuses.New
                                : PlatformOutboxBusMessage.SendStatuses.Processing,
                            subQueueMessageIdPrefix,
                            null),
                        dismissSendEvent: true,
                        eventCustomConfig: null,
                        cancellationToken)
                    : null;

                // Determine the message to process based on whether there are other unprocessed messages with the same prefix.
                // existed message exist and can't be handling right now
                // Then should not process message => return null
                var toProcessOutboxMessage = isAnySameMessageTypeAndIdPrefixOtherNotProcessedMessage ||
                                             existedOutboxMessage?.Is(PlatformOutboxBusMessage.CanHandleMessagesExpr()) == false
                    ? null
                    : existedOutboxMessage ?? newOutboxMessage;

                return toProcessOutboxMessage;
            },
            retryCount: persistenceRetryCount,
            cancellationToken: cancellationToken,
            sleepDurationProvider: retryAttempt => Math.Min(retryAttempt + DefaultResilientRetiredDelaySeconds, DefaultMaxResilientRetiredDelaySeconds).Seconds(),
            onRetry: (ex, delayTime, retryCount, context) =>
            {
                if (retryCount > Util.TaskRunner.LogErrorRetryThreshold(persistenceRetryCount))
                {
                    CreateLogger()
                        .LogError(
                            "[{Type}] Retry: [[ExceptionDiagnostics:{ExceptionDiagnostics}]]. [[Type:{MessageTypeFullName}]]; [[MessageDiagnostics:{MessageDiagnostics}]].",
                            GetType().Name,
                            PlatformMessageBusDiagnosticFormatter.FormatException(ex),
                            message.GetType().GetNameOrGenericTypeName(),
                            PlatformMessageBusDiagnosticFormatter.FormatRuntimeMessage(message));
                }
            });
    }

    /// <summary>
    /// Executes an outbox operation with either the legacy unqualified repository or the
    /// repository selected by an application-lane descriptor.
    /// </summary>
    private static async Task ExecuteWithOutboxRepositoryAsync(
        IServiceProvider serviceProvider,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository, Task> action)
    {
        if (outboxBusMessageRepositoryFactory == null)
        {
            await serviceProvider.ExecuteInjectScopedAsync(
                async (IServiceProvider scopedServiceProvider, IPlatformOutboxBusMessageRepository repository) =>
                    await action(scopedServiceProvider, repository));

            return;
        }

        await serviceProvider.ExecuteInjectScopedAsync(
            async (IServiceProvider scopedServiceProvider) =>
                await action(scopedServiceProvider, outboxBusMessageRepositoryFactory(scopedServiceProvider)));
    }

    /// <summary>
    /// Executes an outbox operation with either the legacy unqualified repository or the
    /// repository selected by an application-lane descriptor and returns its result.
    /// </summary>
    private static async Task<TResult> ExecuteWithOutboxRepositoryAsync<TResult>(
        IServiceProvider serviceProvider,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository> outboxBusMessageRepositoryFactory,
        Func<IServiceProvider, IPlatformOutboxBusMessageRepository, Task<TResult>> action)
    {
        if (outboxBusMessageRepositoryFactory == null)
        {
            return await serviceProvider.ExecuteInjectScopedAsync<TResult>(
                async (IServiceProvider scopedServiceProvider, IPlatformOutboxBusMessageRepository repository) =>
                    await action(scopedServiceProvider, repository));
        }

        return await serviceProvider.ExecuteInjectScopedAsync<TResult>(
            async (IServiceProvider scopedServiceProvider) =>
                await action(scopedServiceProvider, outboxBusMessageRepositoryFactory(scopedServiceProvider)));
    }

    /// <summary>
    /// Creates a logger for this helper class.
    /// </summary>
    /// <returns>A logger instance.</returns>
    protected ILogger CreateLogger()
    {
        return rootServiceProvider.GetRequiredService<ILoggerFactory>()
            .CreateLogger(typeof(PlatformOutboxMessageBusProducerHelper).GetNameOrGenericTypeName() + $"-{GetType().Name}");
    }
}
