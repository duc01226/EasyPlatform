#region

using System.Diagnostics;
using Easy.Platform.Application.Cqrs.Events.InboxSupport;
using Easy.Platform.Application.MessageBus.Consumers;
using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Logging;
using Easy.Platform.Common.Timing;
using Easy.Platform.Common.Utils;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.MessageBus.InboxPattern;

/// <summary>
/// Provides helper methods for implementing the Inbox Pattern with message bus consumers.
/// The Inbox Pattern helps prevent duplicate message processing by storing consumed messages in a database.
/// </summary>
public static class PlatformInboxMessageBusConsumerHelper
{
    /// <summary>
    /// The default number of retry attempts for resilient operations, equivalent to approximately one day with a 1-second delay between retries.
    /// </summary>
    public const int DefaultResilientRetiredCount = 43200;

    /// <summary>
    /// The default delay in seconds between retry attempts for resilient operations.
    /// </summary>
    public const int DefaultResilientRetiredDelaySeconds = 1;

    public const int DefaultMaxResilientRetiredDelaySeconds = 60;

    /// <summary>
    /// Handles the execution of an inbox consumer, ensuring that messages are processed only once.
    /// This method checks for existing inbox messages and handles them accordingly, or creates a new inbox message and attempts to consume it.
    /// </summary>
    /// <typeparam name="TMessage">The type of the message being consumed.</typeparam>
    /// <param name="rootServiceProvider">The root service provider.</param>
    /// <param name="currentScopeServiceProvider">The service provider for the current scope.</param>
    /// <param name="consumerType">The type of the consumer handling the message.</param>
    /// <param name="inboxBusMessageRepository">The repository for accessing inbox messages.</param>
    /// <param name="inboxConfig">The configuration for the inbox pattern.</param>
    /// <param name="applicationSettingContext">applicationSettingContext</param>
    /// <param name="message">The message being consumed.</param>
    /// <param name="forApplicationName">The name of the application the message is intended for.</param>
    /// <param name="routingKey">The routing key of the message.</param>
    /// <param name="loggerFactory">A factory for creating loggers.</param>
    /// <param name="retryProcessFailedMessageInSecondsUnit">The time unit in seconds for retrying failed message processing.</param>
    /// <param name="handleExistingInboxMessage">An existing inbox message to handle, if applicable.</param>
    /// <param name="currentScopeConsumerInstance">The consumer instance to use for handling an existing inbox message.</param>
    /// <param name="handleInUow">The unit of work to use for handling the message.</param>
    /// <param name="subQueueMessageIdPrefix">A prefix for the message ID, used for sub-queueing.</param>
    /// <param name="autoDeleteProcessedMessageImmediately">Indicates whether processed messages should be deleted immediately.</param>
    /// <param name="needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage">Indicates whether to check for other unprocessed messages with the same sub-queue message ID prefix.</param>
    /// <param name="allowHandleNewInboxMessageInBackground">allowHandleNewInboxMessageInBackground</param>
    /// <param name="allowTryConsumeMessageImmediatelyBeforeCreateInboxMessage"></param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public static async Task HandleExecutingInboxConsumerAsync<TMessage>(
        IPlatformRootServiceProvider rootServiceProvider,
        IServiceProvider currentScopeServiceProvider,
        Type consumerType,
        IPlatformInboxBusMessageRepository inboxBusMessageRepository,
        PlatformInboxConfig inboxConfig,
        IPlatformApplicationSettingContext applicationSettingContext,
        TMessage message,
        string forApplicationName,
        string routingKey,
        Func<ILogger> loggerFactory,
        double retryProcessFailedMessageInSecondsUnit,
        PlatformInboxBusMessage handleExistingInboxMessage,
        IPlatformApplicationMessageBusConsumer<TMessage> currentScopeConsumerInstance,
        IPlatformUnitOfWork handleInUow,
        string subQueueMessageIdPrefix,
        bool autoDeleteProcessedMessageImmediately = false,
        bool needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage = true,
        bool allowHandleNewInboxMessageInBackground = true,
        bool allowTryConsumeMessageImmediatelyBeforeCreateInboxMessage = true,
        CancellationToken cancellationToken = default) where TMessage : class, new()
    {
        // If there's an existing inbox message that's not processed or ignored, handle it directly.
        if (handleExistingInboxMessage != null &&
            handleExistingInboxMessage.ConsumeStatus != PlatformInboxBusMessage.ConsumeStatuses.Processed &&
            handleExistingInboxMessage.ConsumeStatus != PlatformInboxBusMessage.ConsumeStatuses.Ignored)
        {
            await HandleConsumerLogicDirectlyForExistingInboxMessage(
                handleExistingInboxMessage,
                currentScopeConsumerInstance,
                currentScopeServiceProvider,
                inboxBusMessageRepository,
                message,
                routingKey,
                loggerFactory,
                retryProcessFailedMessageInSecondsUnit,
                autoDeleteProcessedMessageImmediately,
                needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
                cancellationToken);
        }
        // If there's no existing inbox message, create a new one and attempt to consume it.
        else if (handleExistingInboxMessage == null)
        {
            await SaveAndTryConsumeNewInboxMessageAsync(
                rootServiceProvider,
                currentScopeServiceProvider,
                consumerType,
                currentScopeConsumerInstance,
                inboxBusMessageRepository,
                applicationSettingContext,
                message,
                forApplicationName,
                routingKey,
                loggerFactory,
                handleInUow,
                autoDeleteProcessedMessageImmediately,
                needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
                subQueueMessageIdPrefix,
                retryProcessFailedMessageInSecondsUnit,
                allowTryConsumeMessageImmediatelyBeforeCreateInboxMessage,
                allowHandleNewInboxMessageInBackground,
                cancellationToken);
        }
    }

    /// <summary>
    /// Saves a new inbox message and attempts to consume it.
    /// </summary>
    /// <typeparam name="TMessage">The type of the message being consumed.</typeparam>
    /// <param name="rootServiceProvider">The root service provider.</param>
    /// <param name="currentScopeServiceProvider"></param>
    /// <param name="consumerType">The type of the consumer handling the message.</param>
    /// <param name="currentScopeConsumerInstance">currentScopeConsumerInstance</param>
    /// <param name="inboxBusMessageRepository">The repository for accessing inbox messages.</param>
    /// <param name="applicationSettingContext">applicationSettingContext</param>
    /// <param name="message">The message being consumed.</param>
    /// <param name="forApplicationName">The name of the application the message is intended for.</param>
    /// <param name="routingKey">The routing key of the message.</param>
    /// <param name="loggerFactory">A factory for creating loggers.</param>
    /// <param name="handleInUow">The unit of work to use for handling the message.</param>
    /// <param name="autoDeleteProcessedMessage">Indicates whether processed messages should be deleted immediately.</param>
    /// <param name="needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage">Indicates whether to check for other unprocessed messages with the same sub-queue message ID prefix.</param>
    /// <param name="subQueueMessageIdPrefix">A prefix for the message ID, used for sub-queueing.</param>
    /// <param name="retryProcessFailedMessageInSecondsUnit">The time unit in seconds for retrying failed message processing.</param>
    /// <param name="allowTryConsumeMessageImmediatelyBeforeCreateInboxMessage">Allow TryConsumeMessageImmediatelyBeforeCreateInboxMessage</param>
    /// <param name="allowHandleNewInboxMessageInBackground">allowHandleNewInboxMessageInBackground</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    private static async Task SaveAndTryConsumeNewInboxMessageAsync<TMessage>(
        IPlatformRootServiceProvider rootServiceProvider,
        IServiceProvider currentScopeServiceProvider,
        Type consumerType,
        IPlatformApplicationMessageBusConsumer<TMessage> currentScopeConsumerInstance,
        IPlatformInboxBusMessageRepository inboxBusMessageRepository,
        IPlatformApplicationSettingContext applicationSettingContext,
        TMessage message,
        string forApplicationName,
        string routingKey,
        Func<ILogger> loggerFactory,
        IPlatformUnitOfWork handleInUow,
        bool autoDeleteProcessedMessage,
        bool needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
        string subQueueMessageIdPrefix,
        double retryProcessFailedMessageInSecondsUnit,
        bool allowTryConsumeMessageImmediatelyBeforeCreateInboxMessage,
        bool allowHandleNewInboxMessageInBackground,
        CancellationToken cancellationToken) where TMessage : class, new()
    {
        // if message can handle parallel without check in order sub queue then can try to execute immediately
        if (message.As<IPlatformSubMessageQueuePrefixSupport>()?.SubQueuePrefix().IsNullOrEmpty() == true &&
            allowTryConsumeMessageImmediatelyBeforeCreateInboxMessage)
        {
            try
            {
                // Try to execute directly to improve performance. Then if failed execute use inbox to support retry failed message later.
                await currentScopeConsumerInstance.HandleMessageDirectly(message, routingKey, retryCount: Util.TaskRunner.DefaultResilientRetryCount);
            }
            catch (Exception)
            {
                await DoProcessInboxForSaveAndTryConsumeNewInboxMessageAsync(
                    rootServiceProvider,
                    currentScopeServiceProvider,
                    consumerType,
                    currentScopeConsumerInstance,
                    inboxBusMessageRepository,
                    applicationSettingContext,
                    message,
                    forApplicationName,
                    routingKey,
                    loggerFactory,
                    handleInUow,
                    autoDeleteProcessedMessage,
                    needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
                    subQueueMessageIdPrefix,
                    retryProcessFailedMessageInSecondsUnit,
                    allowHandleNewInboxMessageInBackground,
                    cancellationToken);
            }
            finally
            {
                applicationSettingContext.ProcessAutoGarbageCollect();
            }
        }
        else
        {
            await DoProcessInboxForSaveAndTryConsumeNewInboxMessageAsync(
                rootServiceProvider,
                currentScopeServiceProvider,
                consumerType,
                currentScopeConsumerInstance,
                inboxBusMessageRepository,
                applicationSettingContext,
                message,
                forApplicationName,
                routingKey,
                loggerFactory,
                handleInUow,
                autoDeleteProcessedMessage,
                needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
                subQueueMessageIdPrefix,
                retryProcessFailedMessageInSecondsUnit,
                allowHandleNewInboxMessageInBackground,
                cancellationToken);
        }
    }

    private static async Task DoProcessInboxForSaveAndTryConsumeNewInboxMessageAsync<TMessage>(
        IPlatformRootServiceProvider rootServiceProvider,
        IServiceProvider currentScopeServiceProvider,
        Type consumerType,
        IPlatformApplicationMessageBusConsumer<TMessage> currentScopeConsumerInstance,
        IPlatformInboxBusMessageRepository inboxBusMessageRepository,
        IPlatformApplicationSettingContext applicationSettingContext,
        TMessage message,
        string forApplicationName,
        string routingKey,
        Func<ILogger> loggerFactory,
        IPlatformUnitOfWork? handleInUow,
        bool autoDeleteProcessedMessage,
        bool needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
        string subQueueMessageIdPrefix,
        double retryProcessFailedMessageInSecondsUnit,
        bool allowHandleNewInboxMessageInBackground,
        CancellationToken cancellationToken) where TMessage : class, new()
    {
        try
        {
            // Get or create the inbox message to process.
            var (toProcessInboxMessage, _) =
                await GetOrCreateToProcessInboxMessage(
                    consumerType,
                    inboxBusMessageRepository,
                    message,
                    forApplicationName,
                    routingKey,
                    subQueueMessageIdPrefix,
                    needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
                    applicationSettingContext,
                    loggerFactory,
                    cancellationToken);

            if (toProcessInboxMessage != null)
            {
                // If a unit of work is provided and it's not a pseudo transaction, execute the consumer within the unit of work.
                if (handleInUow != null && !handleInUow.IsPseudoTransactionUow())
                {
                    handleInUow.OnSaveChangesCompletedActions.Add(async () =>
                    {
                        // Execute task in background separated thread task
                        Util.TaskRunner.QueueActionInBackground(
                            () => ExecuteConsumerForNewInboxMessage(
                                rootServiceProvider,
                                currentScopeServiceProvider: null,
                                applicationSettingContext,
                                consumerType,
                                currentScopeConsumerInstance: null,
                                message,
                                toProcessInboxMessage,
                                routingKey,
                                autoDeleteProcessedMessage,
                                retryProcessFailedMessageInSecondsUnit,
                                loggerFactory,
                                cancellationToken),
                            cancellationToken: cancellationToken);
                    });
                }
                else
                {
                    // If there's an active unit of work, save changes to ensure the inbox message is persisted.
                    await inboxBusMessageRepository.UowManager().TryCurrentActiveUowSaveChangesAsync();

                    if (allowHandleNewInboxMessageInBackground)
                    {
                        Util.TaskRunner.QueueActionInBackground(
                            () => ExecuteConsumerForNewInboxMessage(
                                rootServiceProvider,
                                currentScopeServiceProvider: null,
                                applicationSettingContext,
                                consumerType,
                                currentScopeConsumerInstance: null,
                                message,
                                toProcessInboxMessage,
                                routingKey,
                                autoDeleteProcessedMessage,
                                retryProcessFailedMessageInSecondsUnit,
                                loggerFactory,
                                cancellationToken),
                            loggerFactory: loggerFactory,
                            cancellationToken: CancellationToken.None);
                    }
                    else
                    {
                        await ExecuteConsumerForNewInboxMessage(
                            rootServiceProvider,
                            currentScopeServiceProvider,
                            applicationSettingContext,
                            consumerType,
                            currentScopeConsumerInstance,
                            message,
                            toProcessInboxMessage,
                            routingKey,
                            autoDeleteProcessedMessage,
                            retryProcessFailedMessageInSecondsUnit,
                            loggerFactory,
                            cancellationToken);
                    }
                }
            }
        }
        finally
        {
            applicationSettingContext.ProcessAutoGarbageCollect();
        }
    }

    /// <summary>
    /// Retrieves or creates an inbox message to be processed. Return (toProcessInboxMessage, existedInboxMessage)
    /// </summary>
    /// <typeparam name="TMessage">The type of the message being consumed.</typeparam>
    /// <param name="consumerType">The type of the consumer handling the message.</param>
    /// <param name="inboxBusMessageRepository">The repository for accessing inbox messages.</param>
    /// <param name="message">The message being consumed.</param>
    /// <param name="forApplicationName">The name of the application the message is intended for.</param>
    /// <param name="routingKey">The routing key of the message.</param>
    /// <param name="subQueueMessageIdPrefix">A prefix for the message ID, used for sub-queueing.</param>
    /// <param name="needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage">Indicates whether to check for other unprocessed messages with the same sub-queue message ID prefix.</param>
    /// <param name="applicationSettingContext">applicationSettingContext</param>
    /// <param name="loggerFactory"></param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    private static async Task<(PlatformInboxBusMessage, PlatformInboxBusMessage)> GetOrCreateToProcessInboxMessage<TMessage>(
        Type consumerType,
        IPlatformInboxBusMessageRepository inboxBusMessageRepository,
        TMessage message,
        string forApplicationName,
        string routingKey,
        string subQueueMessageIdPrefix,
        bool needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
        IPlatformApplicationSettingContext applicationSettingContext,
        Func<ILogger> loggerFactory,
        CancellationToken cancellationToken) where TMessage : class, new()
    {
        return await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                var trackId = message.As<IPlatformTrackableBusMessage>()?.TrackingId;

                // Check if an inbox message with the same tracking ID and sub-queue message ID prefix already exists.
                var existedInboxMessage = trackId != null
                    ? await inboxBusMessageRepository.FirstOrDefaultAsync(
                        p => p.Id == PlatformInboxBusMessage.BuildId(consumerType, trackId, subQueueMessageIdPrefix),
                        cancellationToken)
                    : null;

                // Check if there are any other unprocessed messages with the same sub-queue message ID prefix.
                var isAnySameConsumerMessageIdPrefixOtherNotProcessedMessage =
                    subQueueMessageIdPrefix.IsNotNullOrEmpty() &&
                    needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage &&
                    await inboxBusMessageRepository.AnyAsync(
                        PlatformInboxBusMessage.CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(
                            consumerType,
                            trackId,
                            existedInboxMessage?.CreatedDate ?? Clock.UtcNow,
                            subQueueMessageIdPrefix),
                        cancellationToken);

                // If no existing message is found, create a new one.
                var newInboxMessage = existedInboxMessage == null
                    ? await CreateNewInboxMessageAsync(
                        inboxBusMessageRepository,
                        consumerType,
                        message,
                        routingKey,
                        isAnySameConsumerMessageIdPrefixOtherNotProcessedMessage
                            ? PlatformInboxBusMessage.ConsumeStatuses.New
                            : PlatformInboxBusMessage.ConsumeStatuses.Processing,
                        forApplicationName,
                        subQueueMessageIdPrefix,
                        cancellationToken)
                    : null;

                // Determine the message to process based on whether there are other unprocessed messages with the same prefix OR
                // existed message exist and can't be handling right now
                // Then should not process message => return null
                var toProcessInboxMessage =
                    isAnySameConsumerMessageIdPrefixOtherNotProcessedMessage ||
                    existedInboxMessage?.Is(PlatformInboxBusMessage.CanHandleMessagesExpr(applicationSettingContext.ApplicationName)) == false
                        ? null
                        : existedInboxMessage ?? newInboxMessage;

                return (toProcessInboxMessage, existedInboxMessage);
            },
            retryCount: DefaultResilientRetiredCount,
            cancellationToken: cancellationToken,
            sleepDurationProvider: retryAttempt =>
                Math.Min(retryAttempt + DefaultResilientRetiredDelaySeconds, DefaultMaxResilientRetiredDelaySeconds).Seconds(),
            onRetry: (ex, delayTime, retryCount, context) =>
            {
                if (retryCount > Util.TaskRunner.DefaultResilientRetryCount)
                {
                    loggerFactory()
                        .LogError(
                            ex.BeautifyStackTrace(),
                            "[{Type}]: [[Error:{Error}]]. [[Type:{MessageTypeFullName}]]; [[InboxJsonMessage (Top {DefaultRecommendedMaxLogsLength} characters): {InboxJsonMessage}]].",
                            nameof(PlatformInboxMessageBusConsumerHelper),
                            ex.Message,
                            message.GetType().GetNameOrGenericTypeName(),
                            PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength,
                            message.ToJson().TakeTop(PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength));
                }
            });
    }

    /// <summary>
    /// Executes the consumer logic for a new inbox message.
    /// </summary>
    /// <typeparam name="TMessage">The type of the message being consumed.</typeparam>
    /// <param name="rootServiceProvider">The root service provider.</param>
    /// <param name="consumerType">The type of the consumer handling the message.</param>
    /// <param name="currentScopeConsumerInstance">currentScopeConsumerInstance</param>
    /// <param name="message">The message being consumed.</param>
    /// <param name="newInboxMessage">The new inbox message to process.</param>
    /// <param name="routingKey">The routing key of the message.</param>
    /// <param name="autoDeleteProcessedMessage">Indicates whether processed messages should be deleted immediately.</param>
    /// <param name="retryProcessFailedMessageInSecondsUnit">The time unit in seconds for retrying failed message processing.</param>
    /// <param name="loggerFactory">A factory for creating loggers.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public static async Task ExecuteConsumerForNewInboxMessage<TMessage>(
        IPlatformRootServiceProvider rootServiceProvider,
        IServiceProvider currentScopeServiceProvider,
        IPlatformApplicationSettingContext applicationSettingContext,
        Type consumerType,
        IPlatformApplicationMessageBusConsumer<TMessage>? currentScopeConsumerInstance,
        TMessage message,
        PlatformInboxBusMessage newInboxMessage,
        string routingKey,
        bool autoDeleteProcessedMessage,
        double retryProcessFailedMessageInSecondsUnit,
        Func<ILogger> loggerFactory,
        CancellationToken cancellationToken) where TMessage : class, new()
    {
        if (currentScopeConsumerInstance == null)
        {
            await rootServiceProvider.ExecuteInjectScopedAsync(async (IServiceProvider serviceProvider) =>
            {
                // Resolve new scope consumer instance
                var consumer = serviceProvider.GetService(consumerType).Cast<IPlatformApplicationMessageBusConsumer<TMessage>>();

                await ExecuteConsumeHandleAsync(consumer, serviceProvider);
            });
        }
        else
            await ExecuteConsumeHandleAsync(currentScopeConsumerInstance, currentScopeServiceProvider);

        async Task ExecuteConsumeHandleAsync(IPlatformApplicationMessageBusConsumer<TMessage> consumer, IServiceProvider serviceProvider)
        {
            try
            {
                // Configure it for inbox message handling.
                consumer = consumer
                    .With(p => p.HandleExistingInboxMessage = newInboxMessage)
                    .With(p => p.NeedToCheckAnySameConsumerOtherPreviousNotProcessedInboxMessage = false)
                    .With(p => p.AutoDeleteProcessedInboxEventMessageImmediately = autoDeleteProcessedMessage);

                try
                {
                    await consumer.HandleAsync(message, routingKey);
                }
                catch (Exception ex)
                {
                    // If an error occurs during consumer execution, update the inbox message as failed.
                    await UpdateExistingInboxFailedMessageAsync(
                        serviceProvider,
                        newInboxMessage,
                        message,
                        consumerType,
                        ex,
                        retryProcessFailedMessageInSecondsUnit,
                        loggerFactory,
                        consumerHasErrorAndShouldNeverRetry: consumer.HasErrorAndShouldNeverRetry,
                        cancellationToken: cancellationToken);
                }
            }
            catch (Exception ex)
            {
                // If an error occurs during consumer resolve, update the inbox message as ignored, never retry.
                await UpdateExistingInboxFailedMessageAsync(
                    serviceProvider,
                    newInboxMessage,
                    message,
                    consumerType,
                    ex,
                    retryProcessFailedMessageInSecondsUnit,
                    loggerFactory,
                    consumerHasErrorAndShouldNeverRetry: true,
                    cancellationToken: cancellationToken);
            }
            finally
            {
                applicationSettingContext.ProcessAutoGarbageCollect();
            }
        }
    }

    /// <summary>
    /// Handles the consumer logic directly for an existing inbox message.
    /// </summary>
    /// <typeparam name="TMessage">The type of the message being consumed.</typeparam>
    /// <param name="existingInboxMessage">The existing inbox message to handle.</param>
    /// <param name="consumer">The consumer instance to use for handling the message.</param>
    /// <param name="serviceProvider">The service provider for the current scope.</param>
    /// <param name="inboxBusMessageRepository">The repository for accessing inbox messages.</param>
    /// <param name="message">The message being consumed.</param>
    /// <param name="routingKey">The routing key of the message.</param>
    /// <param name="loggerFactory">A factory for creating loggers.</param>
    /// <param name="retryProcessFailedMessageInSecondsUnit">The time unit in seconds for retrying failed message processing.</param>
    /// <param name="autoDeleteProcessedMessage">Indicates whether processed messages should be deleted immediately.</param>
    /// <param name="needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage">Indicates whether to check for other unprocessed messages with the same sub-queue message ID prefix.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public static async Task HandleConsumerLogicDirectlyForExistingInboxMessage<TMessage>(
        PlatformInboxBusMessage existingInboxMessage,
        IPlatformApplicationMessageBusConsumer<TMessage> consumer,
        IServiceProvider serviceProvider,
        IPlatformInboxBusMessageRepository inboxBusMessageRepository,
        TMessage message,
        string routingKey,
        Func<ILogger> loggerFactory,
        double retryProcessFailedMessageInSecondsUnit,
        bool autoDeleteProcessedMessage,
        bool needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage,
        CancellationToken cancellationToken) where TMessage : class, new()
    {
        using (var startIntervalPingProcessingCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken))
        {
            try
            {
                // If sub-queueing is enabled and there are other unprocessed messages with the same prefix, revert the existing message to "New".
                if (needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage &&
                    PlatformInboxBusMessage.GetSubQueuePrefix(existingInboxMessage.Id).IsNotNullOrEmpty() &&
                    await inboxBusMessageRepository.AnyAsync(
                        PlatformInboxBusMessage.CheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessageExpr(existingInboxMessage),
                        cancellationToken))
                    await RevertExistingInboxToNewMessageAsync(existingInboxMessage, inboxBusMessageRepository, loggerFactory, cancellationToken);
                else
                {
                    if (consumer.NeedStartIntervalPingInboxMessageProcessing)
                    {
                        StartIntervalPingProcessing(
                            [existingInboxMessage],
                            loggerFactory,
                            serviceProvider,
                            startIntervalPingProcessingCts.Token);
                    }

                    // Execute the consumer's HandleAsync method with a timeout.
                    await consumer
                        .With(uow => uow.IsHandlingLogicForInboxMessage = true)
                        .With(b => b.AutoDeleteProcessedInboxEventMessageImmediately = autoDeleteProcessedMessage)
                        .HandleAsync(message, routingKey);

                    await startIntervalPingProcessingCts.CancelAsync();

                    try
                    {
                        // If auto-deletion is enabled, delete the processed message.
                        if (autoDeleteProcessedMessage)
                        {
                            await DeleteExistingInboxProcessedMessageAsync(
                                serviceProvider,
                                existingInboxMessage,
                                loggerFactory,
                                cancellationToken);
                        }
                        else
                        {
                            // Update the inbox message as processed.
                            await UpdateExistingInboxProcessedMessageAsync(
                                serviceProvider.GetRequiredService<IPlatformRootServiceProvider>(),
                                existingInboxMessage,
                                loggerFactory,
                                cancellationToken);
                        }
                    }
                    catch (Exception)
                    {
                        // If an error occurs during updating the processed message, retry updating by ID.
                        await UpdateExistingInboxProcessedMessageAsync(
                            serviceProvider,
                            existingInboxMessage.Id,
                            loggerFactory,
                            cancellationToken);
                    }
                }
            }
            catch (Exception ex)
            {
                // If an error occurs during consumer execution, update the inbox message as failed.
                await UpdateExistingInboxFailedMessageAsync(
                    serviceProvider,
                    existingInboxMessage,
                    message,
                    consumer.GetType(),
                    ex,
                    retryProcessFailedMessageInSecondsUnit,
                    loggerFactory,
                    consumer.HasErrorAndShouldNeverRetry,
                    cancellationToken);

                try
                {
                    await startIntervalPingProcessingCts.CancelAsync();
                }
                catch (Exception e)
                {
                    loggerFactory().LogError(e.BeautifyStackTrace(), "Cancel StartIntervalPingProcessing failed");
                }
            }
        }
    }

    public static void StartIntervalPingProcessing(
        List<PlatformInboxBusMessage> existingInboxMessages,
        Func<ILogger> loggerFactory,
        IServiceProvider serviceProvider,
        CancellationToken cancellationToken)
    {
        // Use root provider to prevent disposed service provider error when run in background
        var rootServiceProvider = serviceProvider.GetRequiredService<IPlatformRootServiceProvider>();

        Util.TaskRunner.QueueActionInBackground(
            async () =>
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
                                    await rootServiceProvider.ExecuteInjectScopedAsync(async (IPlatformInboxBusMessageRepository inboxBusMessageRepository) =>
                                    {
                                        using (var uow = inboxBusMessageRepository.UowManager().Begin())
                                        {
                                            var existingInboxMessagesDict = existingInboxMessages.ToDictionary(p => p.Id);

                                            var toUpdateExistingInboxMessages = await inboxBusMessageRepository.GetAllAsync(
                                                p => existingInboxMessagesDict.Keys.Contains(p.Id),
                                                cancellationToken);

                                            await toUpdateExistingInboxMessages.ParallelAsync(async toUpdateExistingInboxMessage =>
                                            {
                                                await inboxBusMessageRepository.SetAsync(
                                                    toUpdateExistingInboxMessage.With(p => p.LastProcessingPingDate = Clock.UtcNow),
                                                    cancellationToken: cancellationToken);

                                                existingInboxMessagesDict[toUpdateExistingInboxMessage.Id].LastProcessingPingDate =
                                                    toUpdateExistingInboxMessage.LastProcessingPingDate;
                                            });

                                            if (!cancellationToken.IsCancellationRequested) await uow.CompleteAsync(cancellationToken);
                                        }
                                    });
                                }

                                await Task.Delay(PlatformInboxBusMessage.CheckProcessingPingIntervalSeconds.Seconds(), cancellationToken);
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
                        onRetry: (ex, delayRetryTime, retryAttempt, context) =>
                        {
                            if (retryAttempt > Util.TaskRunner.DefaultResilientRetryCount)
                                loggerFactory().LogError(ex.BeautifyStackTrace(), "Update PlatformInboxBusMessage LastProcessingPingTime failed");
                        });
                }
            },
            loggerFactory: loggerFactory,
            delayTimeSeconds: PlatformInboxBusMessage.CheckProcessingPingIntervalSeconds,
            cancellationToken: cancellationToken,
            logFullStackTraceBeforeBackgroundTask: false,
            queueLimitLock: false);
    }

    /// <summary>
    /// Reverts an existing inbox message to the "New" state.
    /// </summary>
    /// <param name="existingInboxMessage">The existing inbox message to revert.</param>
    /// <param name="inboxBusMessageRepository">The repository for accessing inbox messages.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public static Task RevertExistingInboxToNewMessageAsync(
        PlatformInboxBusMessage existingInboxMessage,
        IPlatformInboxBusMessageRepository inboxBusMessageRepository,
        Func<ILogger> loggerFactory,
        CancellationToken cancellationToken)
    {
        return Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                var toUpdateMessage = await inboxBusMessageRepository.GetByIdAsync(existingInboxMessage.Id, cancellationToken);

                await inboxBusMessageRepository.UpdateImmediatelyAsync(
                    toUpdateMessage
                        .With(p => p.ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.New),
                    cancellationToken: cancellationToken);
            },
            retryCount: DefaultResilientRetiredCount,
            cancellationToken: cancellationToken,
            sleepDurationProvider: retryAttempt =>
                Math.Min(retryAttempt + DefaultResilientRetiredDelaySeconds, DefaultMaxResilientRetiredDelaySeconds).Seconds(),
            onRetry: (ex, delayTime, retryCount, context) =>
            {
                if (retryCount > Util.TaskRunner.DefaultResilientRetryCount)
                {
                    loggerFactory()
                        .LogError(
                            ex.BeautifyStackTrace(),
                            "[{Type}]: [[Error:{Error}]]. [[Type:{MessageTypeFullName}]]; [[InboxJsonMessage (Top {DefaultRecommendedMaxLogsLength} characters): {InboxJsonMessage}]].",
                            nameof(PlatformInboxMessageBusConsumerHelper),
                            ex.Message,
                            existingInboxMessage.MessageTypeFullName,
                            PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength,
                            existingInboxMessage.JsonMessage.TakeTop(PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength));
                }
            });
    }

    /// <summary>
    /// Creates a new inbox message in the database.
    /// </summary>
    /// <typeparam name="TMessage">The type of the message being consumed.</typeparam>
    /// <param name="inboxBusMessageRepository">The repository for accessing inbox messages.</param>
    /// <param name="consumerType">The type of the consumer handling the message.</param>
    /// <param name="message">The message being consumed.</param>
    /// <param name="routingKey">The routing key of the message.</param>
    /// <param name="consumeStatus">The initial consume status of the inbox message.</param>
    /// <param name="forApplicationName">The name of the application the message is intended for.</param>
    /// <param name="subQueueMessageIdPrefix">A prefix for the message ID, used for sub-queueing.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public static async Task<PlatformInboxBusMessage> CreateNewInboxMessageAsync<TMessage>(
        IPlatformInboxBusMessageRepository inboxBusMessageRepository,
        Type consumerType,
        TMessage message,
        string routingKey,
        PlatformInboxBusMessage.ConsumeStatuses consumeStatus,
        string forApplicationName,
        string subQueueMessageIdPrefix,
        CancellationToken cancellationToken = default) where TMessage : class, new()
    {
        var newInboxMessage = PlatformInboxBusMessage.Create(
            message,
            message.As<IPlatformTrackableBusMessage>()?.TrackingId,
            message.As<IPlatformTrackableBusMessage>()?.ProduceFrom,
            routingKey,
            consumerType,
            consumeStatus,
            forApplicationName,
            subQueueMessageIdPrefix);

        var result = await inboxBusMessageRepository.CreateImmediatelyAsync(
            newInboxMessage,
            dismissSendEvent: true,
            eventCustomConfig: null,
            cancellationToken);

        return result;
    }

    /// <summary>
    /// Updates an existing inbox message as processed.
    /// </summary>
    /// <param name="serviceProvider">The service provider for the current scope.</param>
    /// <param name="existingInboxMessageId">The ID of the existing inbox message to update.</param>
    /// <param name="loggerFactory">A factory for creating loggers.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public static async Task UpdateExistingInboxProcessedMessageAsync(
        IServiceProvider serviceProvider,
        string existingInboxMessageId,
        Func<ILogger> loggerFactory,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                async () =>
                    await serviceProvider.ExecuteInjectScopedAsync(async (IPlatformInboxBusMessageRepository inboxBusMessageRepo) =>
                    {
                        var existingInboxMessage = await inboxBusMessageRepo.FirstOrDefaultAsync(
                            predicate: p => p.Id == existingInboxMessageId,
                            cancellationToken: cancellationToken);

                        if (existingInboxMessage != null)
                        {
                            await UpdateExistingInboxProcessedMessageAsync(
                                serviceProvider.GetRequiredService<IPlatformRootServiceProvider>(),
                                existingInboxMessage,
                                loggerFactory,
                                cancellationToken);
                        }
                    }),
                retryAttempt => DefaultResilientRetiredDelaySeconds.Seconds(),
                retryCount: DefaultResilientRetiredCount,
                onRetry: (ex, retryTime, retryAttempt, context) =>
                    LogErrorOfUpdateExistingInboxProcessedMessage(existingInboxMessageId, loggerFactory, ex),
                cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            LogErrorOfUpdateExistingInboxProcessedMessage(existingInboxMessageId, loggerFactory, ex);
        }
    }

    /// <summary>
    /// Logs an error that occurred while updating an existing inbox message as processed.
    /// </summary>
    /// <param name="existingInboxMessageId">The ID of the existing inbox message.</param>
    /// <param name="loggerFactory">A factory for creating loggers.</param>
    /// <param name="ex">The exception that occurred.</param>
    private static void LogErrorOfUpdateExistingInboxProcessedMessage(string existingInboxMessageId, Func<ILogger> loggerFactory, Exception ex)
    {
        loggerFactory()
            .LogError(
                ex.BeautifyStackTrace(),
                "UpdateExistingInboxProcessedMessageAsync failed. [[Error:{Error}]], [ExistingInboxMessageId:{ExistingInboxMessageId}].",
                ex.Message,
                existingInboxMessageId);
    }

    /// <summary>
    /// Updates an existing inbox message as processed.
    /// </summary>
    /// <param name="serviceProvider">The root service provider.</param>
    /// <param name="existingInboxMessage">The existing inbox message to update.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public static Task UpdateExistingInboxProcessedMessageAsync(
        IPlatformRootServiceProvider serviceProvider,
        PlatformInboxBusMessage existingInboxMessage,
        Func<ILogger> loggerFactory,
        CancellationToken cancellationToken = default)
    {
        var toUpdateInboxMessage = existingInboxMessage;

        return Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                if (toUpdateInboxMessage.ConsumeStatus == PlatformInboxBusMessage.ConsumeStatuses.Processed) return;

                await serviceProvider.ExecuteInjectScopedAsync((IPlatformInboxBusMessageRepository inboxBusMessageRepo) => inboxBusMessageRepo.UowManager()
                    .ExecuteUowTask(async () =>
                    {
                        inboxBusMessageRepo.UowManager()
                            .CurrentActiveUow()
                            .SetCachedExistingOriginalEntity<PlatformInboxBusMessage, string>(toUpdateInboxMessage, true);

                        try
                        {
                            toUpdateInboxMessage.LastConsumeDate = Clock.UtcNow;
                            toUpdateInboxMessage.LastProcessingPingDate = Clock.UtcNow;
                            toUpdateInboxMessage.ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Processed;

                            await inboxBusMessageRepo.SetAsync(toUpdateInboxMessage, cancellationToken);
                        }
                        catch (PlatformDomainRowVersionConflictException)
                        {
                            // If a concurrency conflict occurs, retrieve the latest version of the message and retry.
                            toUpdateInboxMessage =
                                await serviceProvider.ExecuteInjectScopedAsync<PlatformInboxBusMessage>((IPlatformInboxBusMessageRepository inboxBusMessageRepo) =>
                                    inboxBusMessageRepo.GetByIdAsync(toUpdateInboxMessage.Id, cancellationToken));
                            throw;
                        }
                    }));
            },
            retryCount: DefaultResilientRetiredCount,
            cancellationToken: cancellationToken,
            sleepDurationProvider: retryAttempt =>
                Math.Min(retryAttempt + DefaultResilientRetiredDelaySeconds, DefaultMaxResilientRetiredDelaySeconds).Seconds(),
            onRetry: (ex, delayTime, retryCount, context) =>
            {
                if (retryCount > Util.TaskRunner.DefaultResilientRetryCount)
                {
                    loggerFactory()
                        .LogError(
                            ex.BeautifyStackTrace(),
                            "[{Type}]: [[Error:{Error}]]. [[Type:{MessageTypeFullName}]]; [[InboxJsonMessage (Top {DefaultRecommendedMaxLogsLength} characters): {InboxJsonMessage}]].",
                            nameof(PlatformInboxMessageBusConsumerHelper),
                            ex.Message,
                            existingInboxMessage.MessageTypeFullName,
                            PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength,
                            existingInboxMessage.JsonMessage.TakeTop(PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength));
                }
            });
    }

    /// <summary>
    /// Deletes an existing inbox message that has been processed.
    /// </summary>
    /// <param name="serviceProvider">The service provider for the current scope.</param>
    /// <param name="existingInboxMessage">The existing inbox message to delete.</param>
    /// <param name="loggerFactory">A factory for creating loggers.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public static async Task DeleteExistingInboxProcessedMessageAsync(
        IServiceProvider serviceProvider,
        PlatformInboxBusMessage existingInboxMessage,
        Func<ILogger> loggerFactory,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                () => serviceProvider.ExecuteInjectScopedAsync((IPlatformInboxBusMessageRepository inboxBusMessageRepo) => inboxBusMessageRepo.DeleteManyAsync(
                    predicate: p => p.Id == existingInboxMessage.Id,
                    dismissSendEvent: true,
                    eventCustomConfig: null,
                    cancellationToken)),
                retryCount: DefaultResilientRetiredCount,
                cancellationToken: cancellationToken,
                sleepDurationProvider: retryAttempt =>
                    Math.Min(retryAttempt + DefaultResilientRetiredDelaySeconds, DefaultMaxResilientRetiredDelaySeconds).Seconds(),
                onRetry: (ex, delayTime, retryCount, context) =>
                {
                    if (retryCount > Util.TaskRunner.DefaultResilientRetryCount)
                    {
                        loggerFactory()
                            .LogError(
                                ex.BeautifyStackTrace(),
                                "[{Type}]: [[Error:{Error}]]. [[Type:{MessageTypeFullName}]]; [[InboxJsonMessage (Top {DefaultRecommendedMaxLogsLength} characters): {InboxJsonMessage}]].",
                                nameof(PlatformInboxMessageBusConsumerHelper),
                                ex.Message,
                                existingInboxMessage.MessageTypeFullName,
                                PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength,
                                existingInboxMessage.JsonMessage.TakeTop(PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength));
                    }
                });
        }
        catch (Exception e)
        {
            loggerFactory().LogError(e.BeautifyStackTrace(), "Try DeleteExistingInboxProcessedMessageAsync failed");
        }
    }

    /// <summary>
    /// Updates an existing inbox message as failed.
    /// </summary>
    /// <typeparam name="TMessage">The type of the message being consumed.</typeparam>
    /// <param name="serviceProvider">The service provider for the current scope.</param>
    /// <param name="existingInboxMessage">The existing inbox message to update.</param>
    /// <param name="message">The message being consumed.</param>
    /// <param name="consumerType">The type of the consumer handling the message.</param>
    /// <param name="exception">The exception that caused the failure.</param>
    /// <param name="retryProcessFailedMessageInSecondsUnit">The time unit in seconds for retrying failed message processing.</param>
    /// <param name="loggerFactory">A factory for creating loggers.</param>
    /// <param name="consumerHasErrorAndShouldNeverRetry">consumerHasErrorAndShouldNeverRetry</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public static async Task UpdateExistingInboxFailedMessageAsync<TMessage>(
        IServiceProvider serviceProvider,
        PlatformInboxBusMessage existingInboxMessage,
        TMessage message,
        Type consumerType,
        Exception exception,
        double retryProcessFailedMessageInSecondsUnit,
        Func<ILogger> loggerFactory,
        bool consumerHasErrorAndShouldNeverRetry,
        CancellationToken cancellationToken = default) where TMessage : class, new()
    {
        try
        {
            var cqrsEventJsonMessage =
                PlatformJsonSerializer.TryDeserializeOrDefault<PlatformBusMessage<PlatformCqrsEventBusMessagePayload>>(existingInboxMessage.JsonMessage);

            if (cqrsEventJsonMessage?.Payload == null)
            {
                loggerFactory()
                    .LogError(
                        exception.BeautifyStackTrace(),
                        "UpdateExistingInboxFailedMessageAsync. [[Error:{Error}]]; [[MessageType: {MessageType}]]; [[ConsumerType: {ConsumerType}]]; [[InboxJsonMessage (Top {DefaultRecommendedMaxLogsLength} characters): {InboxJsonMessage}]];",
                        exception.Message,
                        message.GetType().GetNameOrGenericTypeName(),
                        consumerType?.GetNameOrGenericTypeName() ?? "n/a",
                        PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength,
                        existingInboxMessage.JsonMessage.TakeTop(PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength));
            }
            else
            {
                loggerFactory()
                    .LogError(
                        exception.BeautifyStackTrace(),
                        "UpdateExistingInboxFailedMessageAsync. [[Error:{Error}]]; [[MessageType: {MessageType}]]; [[ConsumerType: {ConsumerType}]]; [[EventHandlerTypeFullName: {EventHandlerTypeFullName}]]; [[InboxJsonMessagePayload: {@InboxJsonMessagePayload}]];",
                        exception.Message,
                        message.GetType().GetNameOrGenericTypeName(),
                        consumerType?.GetNameOrGenericTypeName() ?? "n/a",
                        cqrsEventJsonMessage.Payload.EventHandlerTypeFullName,
                        cqrsEventJsonMessage.Payload);
            }

            await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                () => serviceProvider.ExecuteInjectScopedAsync(async (IPlatformInboxBusMessageRepository inboxBusMessageRepo) =>
                {
                    // Retrieve the latest version of the inbox message to prevent concurrency issues.
                    var latestCurrentExistingInboxMessage =
                        await inboxBusMessageRepo.FirstOrDefaultAsync(
                            p => p.Id == existingInboxMessage.Id &&
                                 p.ConsumeStatus == PlatformInboxBusMessage.ConsumeStatuses.Processing,
                            cancellationToken);

                    if (latestCurrentExistingInboxMessage != null)
                    {
                        await UpdateExistingInboxFailedMessageAsync(
                            exception,
                            retryProcessFailedMessageInSecondsUnit,
                            consumerHasErrorAndShouldNeverRetry,
                            cancellationToken,
                            latestCurrentExistingInboxMessage,
                            inboxBusMessageRepo);
                    }
                }),
                retryCount: DefaultResilientRetiredCount,
                cancellationToken: cancellationToken,
                sleepDurationProvider: retryAttempt =>
                    Math.Min(retryAttempt + DefaultResilientRetiredDelaySeconds, DefaultMaxResilientRetiredDelaySeconds).Seconds(),
                onRetry: (ex, delayTime, retryCount, context) =>
                {
                    if (retryCount > Util.TaskRunner.DefaultResilientRetryCount)
                    {
                        loggerFactory()
                            .LogError(
                                ex.BeautifyStackTrace(),
                                "[{Type}]: [[Error:{Error}]]. [[Type:{MessageTypeFullName}]]; [[InboxJsonMessage (Top {DefaultRecommendedMaxLogsLength} characters): {InboxJsonMessage}]].",
                                nameof(PlatformInboxMessageBusConsumerHelper),
                                ex.Message,
                                existingInboxMessage.MessageTypeFullName,
                                PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength,
                                existingInboxMessage.JsonMessage.TakeTop(PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength));
                    }
                });
        }
        catch (Exception ex)
        {
            loggerFactory()
                .LogError(
                    ex.BeautifyStackTrace(),
                    "UpdateExistingInboxFailedMessageAsync. [[Error:{Error}]]; [[MessageType: {MessageType}]]; [[ConsumerType: {ConsumerType}]]; [[InboxJsonMessage (Top {DefaultRecommendedMaxLogsLength} characters): {InboxJsonMessage}]];",
                    ex.Message,
                    message.GetType().GetNameOrGenericTypeName(),
                    consumerType?.GetNameOrGenericTypeName() ?? "n/a",
                    PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength,
                    existingInboxMessage.JsonMessage.TakeTop(PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength));
        }
    }

    private static async Task UpdateExistingInboxFailedMessageAsync(
        Exception exception,
        double retryProcessFailedMessageInSecondsUnit,
        bool consumerHasErrorAndShouldNeverRetry,
        CancellationToken cancellationToken,
        PlatformInboxBusMessage existingInboxMessage,
        IPlatformInboxBusMessageRepository inboxBusMessageRepo)
    {
        existingInboxMessage.ConsumeStatus =
            consumerHasErrorAndShouldNeverRetry ? PlatformInboxBusMessage.ConsumeStatuses.Ignored : PlatformInboxBusMessage.ConsumeStatuses.Failed;
        existingInboxMessage.LastConsumeDate = Clock.UtcNow;
        existingInboxMessage.LastProcessingPingDate = Clock.UtcNow;
        existingInboxMessage.LastConsumeError = exception.BeautifyStackTrace().Serialize();
        existingInboxMessage.RetriedProcessCount = (existingInboxMessage.RetriedProcessCount ?? 0) + 1;
        existingInboxMessage.NextRetryProcessAfter = PlatformInboxBusMessage.CalculateNextRetryProcessAfter(
            existingInboxMessage.RetriedProcessCount,
            retryProcessFailedMessageInSecondsUnit);

        await inboxBusMessageRepo.SetAsync(existingInboxMessage, cancellationToken);
    }
}
