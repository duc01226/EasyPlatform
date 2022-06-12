using System;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.Helpers;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
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
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        public async Task HandleSendingOutboxMessageAsync<TMessage>(
            TMessage message,
            string routingKey,
            bool isProcessingExistingOutboxMessage,
            CancellationToken cancellationToken) where TMessage : IPlatformBusTrackableMessage
        {
            if (message.TrackingId != null)
            {
                var needToStartNewUow = outboxConfig.ForceAlwaysSendOutboxInNewUow || !unitOfWorkManager.HasCurrentActive();

                var currentUow = needToStartNewUow
                    ? unitOfWorkManager.Begin()
                    : unitOfWorkManager.Current();

                if (isProcessingExistingOutboxMessage)
                {
                    var existingOutboxMessage = await outboxBusMessageRepository.GetByIdAsync(
                        PlatformOutboxBusMessage.BuildId(message), cancellationToken);

                    if (existingOutboxMessage.SendStatus is
                        PlatformOutboxBusMessage.SendStatuses.New or
                        PlatformOutboxBusMessage.SendStatuses.Failed or
                        PlatformOutboxBusMessage.SendStatuses.Processing)
                    {
                        await SendExistingOutboxMessageAsync(message, routingKey, cancellationToken);
                    }
                }
                else
                {
                    await SaveAndTrySendNewOutboxMessageAsync(
                        currentUow: currentUow,
                        message,
                        routingKey,
                        autoCompleteUow: needToStartNewUow,
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

            // Do not need to wait for uow completed if the uow for db do not handle actually transaction.
            // Can execute it immediately without waiting for uow to complete
            if (currentUow.IsNoTransactionUow())
            {
                await SendExistingOutboxMessageAsync(
                    message,
                    routingKey,
                    cancellationToken);
            }
            else
            {
                // Never use async lambda on event handler, because it's equivalent to async void, which fire async task and forget
                // this will lead to a lot of potential bug and issues.
                currentUow.OnCompleted += (sender, args) =>
                {
                    // Try to process newProcessingOutboxMessage first time after saved
                    SendExistingOutboxMessageInNewScopeAsync(
                        message,
                        routingKey,
                        cancellationToken).Wait(cancellationToken);
                };
            }

            if (autoCompleteUow)
                await currentUow.CompleteAsync(cancellationToken);
        }

        public async Task SendExistingOutboxMessageAsync<TMessage>(
            TMessage message,
            string routingKey,
            CancellationToken cancellationToken)
            where TMessage : IPlatformBusTrackableMessage
        {
            try
            {
                await messageBusProducer.SendTrackableMessageAsync(message, routingKey, cancellationToken);

                await UpdateExistingOutboxMessageProcessedAsync(PlatformOutboxBusMessage.BuildId(message), cancellationToken);
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "UpdateExistingOutboxMessageFailedInNewScopeAsync has been triggered");

                await UpdateExistingOutboxMessageFailedInNewScopeAsync(
                    PlatformOutboxBusMessage.BuildId(message),
                    exception,
                    cancellationToken);
            }
        }

        public async Task SendExistingOutboxMessageInNewScopeAsync<TMessage>(
            TMessage message,
            string routingKey,
            CancellationToken cancellationToken) where TMessage : IPlatformBusTrackableMessage
        {
            using (var newScope = serviceProvider.CreateScope())
            {
                var outboxEventBusProducerHelper = newScope.ServiceProvider.GetService<PlatformOutboxMessageBusProducerHelper>();

                await outboxEventBusProducerHelper!.SendExistingOutboxMessageInNewUowAsync(
                    message,
                    routingKey,
                    cancellationToken);
            }
        }

        public async Task SendExistingOutboxMessageInNewUowAsync<TMessage>(
            TMessage message,
            string routingKey,
            CancellationToken cancellationToken)
            where TMessage : IPlatformBusTrackableMessage
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                await SendExistingOutboxMessageAsync(message, routingKey, cancellationToken);

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
            CancellationToken cancellationToken)
        {
            using (var newScope = serviceProvider.CreateScope())
            {
                var newScopeOutboxEventBusProducerHelper = newScope.ServiceProvider.GetService<PlatformOutboxMessageBusProducerHelper>();

                await newScopeOutboxEventBusProducerHelper!.UpdateExistingOutboxMessageFailedInNewUowAsync(
                    messageId,
                    exception,
                    cancellationToken);
            }
        }

        public async Task UpdateExistingOutboxMessageFailedInNewUowAsync(
            string messageId,
            Exception exception,
            CancellationToken cancellationToken)
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                await UpdateExistingOutboxMessageFailedAsync(messageId, exception, cancellationToken);

                await uow.CompleteAsync(cancellationToken);
            }
        }

        public async Task UpdateExistingOutboxMessageFailedAsync(
            string messageId,
            Exception exception,
            CancellationToken cancellationToken)
        {
            var existingOutboxMessage = await outboxBusMessageRepository.GetByIdAsync(
                messageId,
                cancellationToken);

            existingOutboxMessage.SendStatus = PlatformOutboxBusMessage.SendStatuses.Failed;
            existingOutboxMessage.LastSendDate = DateTime.UtcNow;
            existingOutboxMessage.LastSendError = PlatformJsonSerializer.Serialize(
                new { exception.Message, exception.StackTrace });

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
