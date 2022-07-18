using Easy.Platform.Application.Helpers;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.Persistence.Domain;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.OutboxPattern
{
    public class PlatformOutboxMessageBusProducerHelper : IPlatformApplicationHelper
    {
        private readonly PlatformOutboxConfig outboxConfig;
        private readonly ILogger<PlatformOutboxMessageBusProducerHelper> logger;
        private readonly IUnitOfWorkManager unitOfWorkManager;
        private readonly IPlatformOutboxBusMessageRepository outboxBusMessageRepository;
        private readonly IPlatformMessageBusProducer messageBusProducer;
        private readonly IServiceProvider serviceProvider;

        public PlatformOutboxMessageBusProducerHelper(
            PlatformOutboxConfig outboxConfig,
            ILogger<PlatformOutboxMessageBusProducerHelper> logger,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformOutboxBusMessageRepository outboxBusMessageRepository,
            IPlatformMessageBusProducer messageBusProducer,
            IServiceProvider serviceProvider)
        {
            this.outboxConfig = outboxConfig;
            this.logger = logger;
            this.unitOfWorkManager = unitOfWorkManager;
            this.outboxBusMessageRepository = outboxBusMessageRepository;
            this.messageBusProducer = messageBusProducer;
            this.serviceProvider = serviceProvider;
        }

        /// <summary>
        /// Help HandleSendingOutboxMessageAsync
        /// </summary>
        /// <typeparam name="TMessage">Message Type</typeparam>
        /// <param name="message"></param>
        /// <param name="routingKey"></param>
        /// <param name="isProcessingExistingOutboxMessage"></param>
        /// <param name="retryProcessFailedMessageInSecondsUnit"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        public async Task HandleSendingOutboxMessageAsync<TMessage>(
            TMessage message,
            string routingKey,
            bool isProcessingExistingOutboxMessage,
            double retryProcessFailedMessageInSecondsUnit,
            CancellationToken cancellationToken) where TMessage : IPlatformBusTrackableMessage
        {
            if (message.TrackingId != null)
            {
                var needToStartNewUow =
                    outboxConfig.ForceAlwaysSendOutboxInNewUow || !unitOfWorkManager.HasCurrentActive();

                var currentUow = needToStartNewUow
                    ? unitOfWorkManager.Begin()
                    : unitOfWorkManager.Current();

                if (isProcessingExistingOutboxMessage)
                {
                    var existingOutboxMessage = await outboxBusMessageRepository.GetByIdAsync(
                        PlatformOutboxBusMessage.BuildId(message),
                        cancellationToken);

                    if (existingOutboxMessage.SendStatus is
                        PlatformOutboxBusMessage.SendStatuses.New
                        or PlatformOutboxBusMessage.SendStatuses.Failed
                        or PlatformOutboxBusMessage.SendStatuses.Processing)
                    {
                        await SendExistingOutboxMessageAsync(
                            message,
                            routingKey,
                            retryProcessFailedMessageInSecondsUnit,
                            cancellationToken);
                    }
                }
                else
                {
                    await SaveAndTrySendNewOutboxMessageAsync(
                        currentUow: currentUow,
                        message,
                        routingKey,
                        autoCompleteUow: needToStartNewUow,
                        retryProcessFailedMessageInSecondsUnit,
                        cancellationToken);
                }
            }
            else
            {
                await messageBusProducer.SendTrackableMessageAsync(message, routingKey, cancellationToken);
            }
        }

        protected async Task SaveAndTrySendNewOutboxMessageAsync<TMessage>(
            IUnitOfWork currentUow,
            TMessage message,
            string routingKey,
            bool autoCompleteUow,
            double retryProcessFailedMessageInSecondsUnit,
            CancellationToken cancellationToken)
            where TMessage : IPlatformBusTrackableMessage
        {
            var newProcessingOutboxMessage = PlatformOutboxBusMessage.Create(
                message,
                routingKey,
                PlatformOutboxBusMessage.SendStatuses.Processing);

            await outboxBusMessageRepository.CreateAsync(
                newProcessingOutboxMessage,
                dismissSendEvent: true,
                cancellationToken);

            // WHY: Do not need to wait for uow completed if the uow for db do not handle actually transaction.
            // Can execute it immediately without waiting for uow to complete
            if (currentUow.IsNoTransactionUow() ||
                (currentUow is IPlatformAggregatedPersistenceUnitOfWork currentAggregatedPersistenceUow &&
                 currentAggregatedPersistenceUow.IsNoTransactionUow(outboxBusMessageRepository.CurrentUow())))
            {
                await SendExistingOutboxMessageAsync(
                    message,
                    routingKey,
                    retryProcessFailedMessageInSecondsUnit,
                    cancellationToken);
            }
            else
            {
                // Do not use async, just call.Wait()
                // WHY: Never use async lambda on event handler, because it's equivalent to async void, which fire async task and forget
                // this will lead to a lot of potential bug and issues.
                currentUow.OnCompleted += (sender, args) =>
                {
                    // Try to process sending newProcessingOutboxMessage first time immediately after task completed
                    // WHY: we can wait for the background process handle the message but try to do it
                    // immediately if possible is better instead of waiting for the background process
                    SendExistingOutboxMessageInNewScopeAsync(
                            message,
                            routingKey,
                            retryProcessFailedMessageInSecondsUnit,
                            cancellationToken)
                        .Wait(cancellationToken);
                };
            }

            if (autoCompleteUow)
                await currentUow.CompleteAsync(cancellationToken);
        }

        public async Task SendExistingOutboxMessageAsync<TMessage>(
            TMessage message,
            string routingKey,
            double retryProcessFailedMessageInSecondsUnit,
            CancellationToken cancellationToken)
            where TMessage : IPlatformBusTrackableMessage
        {
            try
            {
                await messageBusProducer.SendTrackableMessageAsync(message, routingKey, cancellationToken);

                await UpdateExistingOutboxMessageProcessedAsync(
                    PlatformOutboxBusMessage.BuildId(message),
                    cancellationToken);
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "UpdateExistingOutboxMessageFailedInNewScopeAsync has been triggered");

                await UpdateExistingOutboxMessageFailedInNewScopeAsync(
                    PlatformOutboxBusMessage.BuildId(message),
                    exception,
                    retryProcessFailedMessageInSecondsUnit,
                    cancellationToken);
            }
        }

        public async Task SendExistingOutboxMessageInNewScopeAsync<TMessage>(
            TMessage message,
            string routingKey,
            double retryProcessFailedMessageInSecondsUnit,
            CancellationToken cancellationToken) where TMessage : IPlatformBusTrackableMessage
        {
            using (var newScope = serviceProvider.CreateScope())
            {
                var outboxEventBusProducerHelper =
                    newScope.ServiceProvider.GetService<PlatformOutboxMessageBusProducerHelper>();

                await outboxEventBusProducerHelper!.SendExistingOutboxMessageInNewUowAsync(
                    message,
                    routingKey,
                    retryProcessFailedMessageInSecondsUnit,
                    cancellationToken);
            }
        }

        public async Task SendExistingOutboxMessageInNewUowAsync<TMessage>(
            TMessage message,
            string routingKey,
            double retryProcessFailedMessageInSecondsUnit,
            CancellationToken cancellationToken)
            where TMessage : IPlatformBusTrackableMessage
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                await SendExistingOutboxMessageAsync(
                    message,
                    routingKey,
                    retryProcessFailedMessageInSecondsUnit,
                    cancellationToken);

                await uow.CompleteAsync(cancellationToken);
            }
        }

        public async Task UpdateExistingOutboxMessageProcessedAsync(
            string messageId,
            CancellationToken cancellationToken)
        {
            var existingOutboxMessage = await outboxBusMessageRepository.GetByIdAsync(
                messageId,
                cancellationToken);

            existingOutboxMessage.LastSendDate = DateTime.UtcNow;
            existingOutboxMessage.SendStatus = PlatformOutboxBusMessage.SendStatuses.Processed;

            await outboxBusMessageRepository.UpdateAsync(existingOutboxMessage, cancellationToken: cancellationToken);
        }

        public async Task UpdateExistingOutboxMessageFailedInNewScopeAsync(
            string messageId,
            Exception exception,
            double retryProcessFailedMessageInSecondsUnit,
            CancellationToken cancellationToken)
        {
            using (var newScope = serviceProvider.CreateScope())
            {
                var newScopeOutboxEventBusProducerHelper =
                    newScope.ServiceProvider.GetService<PlatformOutboxMessageBusProducerHelper>();

                await newScopeOutboxEventBusProducerHelper!.UpdateExistingOutboxMessageFailedInNewUowAsync(
                    messageId,
                    exception,
                    retryProcessFailedMessageInSecondsUnit,
                    cancellationToken);
            }
        }

        public async Task UpdateExistingOutboxMessageFailedInNewUowAsync(
            string messageId,
            Exception exception,
            double retryProcessFailedMessageInSecondsUnit,
            CancellationToken cancellationToken)
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                await UpdateExistingOutboxMessageFailedAsync(
                    messageId,
                    exception,
                    retryProcessFailedMessageInSecondsUnit,
                    cancellationToken);

                await uow.CompleteAsync(cancellationToken);
            }
        }

        public async Task UpdateExistingOutboxMessageFailedAsync(
            string messageId,
            Exception exception,
            double retryProcessFailedMessageInSecondsUnit,
            CancellationToken cancellationToken)
        {
            var existingOutboxMessage = await outboxBusMessageRepository.GetByIdAsync(
                messageId,
                cancellationToken);

            existingOutboxMessage.SendStatus = PlatformOutboxBusMessage.SendStatuses.Failed;
            existingOutboxMessage.LastSendDate = DateTime.UtcNow;
            existingOutboxMessage.LastSendError = PlatformJsonSerializer.Serialize(
                new
                {
                    exception.Message,
                    exception.StackTrace
                });
            existingOutboxMessage.RetriedProcessCount = (existingOutboxMessage.RetriedProcessCount ?? 0) + 1;
            existingOutboxMessage.NextRetryProcessAfter = PlatformOutboxBusMessage.CalculateNextRetryProcessAfter(
                retriedProcessCount: existingOutboxMessage.RetriedProcessCount,
                retryProcessFailedMessageInSecondsUnit);

            await outboxBusMessageRepository.UpdateAsync(existingOutboxMessage, cancellationToken: cancellationToken);

            LogSendOutboxMessageFailed(exception, existingOutboxMessage);
        }

        protected void LogSendOutboxMessageFailed(Exception exception, PlatformOutboxBusMessage existingOutboxMessage)
        {
            logger.LogError(
                exception,
                $"Error Send message [RoutingKey:{existingOutboxMessage.RoutingKey}], [Type:{existingOutboxMessage.MessageTypeFullName}].{Environment.NewLine}" +
                $"Message Info: ${existingOutboxMessage.JsonMessage}.{Environment.NewLine}");
        }
    }
}
