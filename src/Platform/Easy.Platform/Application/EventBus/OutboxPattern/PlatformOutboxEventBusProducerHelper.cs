using System;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.Helpers;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.OutboxPattern
{
    public class PlatformOutboxEventBusProducerHelper : IPlatformApplicationHelper
    {
        private readonly PlatformOutboxConfig outboxConfig;
        private readonly ILogger<PlatformOutboxEventBusProducerHelper> logger;
        private readonly IUnitOfWorkManager unitOfWorkManager;
        private readonly IPlatformOutboxEventBusMessageRepository outboxEventBusMessageRepository;
        private readonly IPlatformEventBusProducer eventBusProducer;

        public PlatformOutboxEventBusProducerHelper(
            PlatformOutboxConfig outboxConfig,
            ILogger<PlatformOutboxEventBusProducerHelper> logger,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformOutboxEventBusMessageRepository outboxEventBusMessageRepository,
            IPlatformEventBusProducer eventBusProducer)
        {
            this.outboxConfig = outboxConfig;
            this.logger = logger;
            this.unitOfWorkManager = unitOfWorkManager;
            this.outboxEventBusMessageRepository = outboxEventBusMessageRepository;
            this.eventBusProducer = eventBusProducer;
        }

        /// <summary>
        /// Help HandleSendingOutboxMessageAsync
        /// </summary>
        /// <typeparam name="TMessage">Message Type</typeparam>
        /// <param name="rootScopeServiceProvider">The rootScope, which will not be disposed if the saving message failed/or completed.
        /// This is important to be used to handle after uow completed to SendExistingOutboxMessageInNewScopeAsync OR Failed cases, save failed outbox message.
        /// This to fix the object disposed scope in service provider errors.</param>
        /// <param name="message"></param>
        /// <param name="routingKey"></param>
        /// <param name="isProcessingExistingOutboxMessage"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        public async Task HandleSendingOutboxMessageAsync<TMessage>(
            IServiceProvider rootScopeServiceProvider,
            TMessage message,
            string routingKey,
            bool isProcessingExistingOutboxMessage,
            CancellationToken cancellationToken) where TMessage : IPlatformEventBusTrackableMessage
        {
            if (message.TrackingId != null)
            {
                var needToStartNewUow = outboxConfig.ForceAlwaysSendOutboxInNewUow || !unitOfWorkManager.HasCurrentActive();

                var currentUow = needToStartNewUow
                    ? unitOfWorkManager.Begin()
                    : unitOfWorkManager.Current();

                if (isProcessingExistingOutboxMessage)
                {
                    var existingOutboxMessage = await outboxEventBusMessageRepository.GetByIdAsync(
                        PlatformOutboxEventBusMessage.BuildId(message), cancellationToken);

                    if (existingOutboxMessage.SendStatus is
                        PlatformOutboxEventBusMessage.SendStatuses.New or
                        PlatformOutboxEventBusMessage.SendStatuses.Failed or
                        PlatformOutboxEventBusMessage.SendStatuses.Processing)
                    {
                        await SendExistingOutboxMessageAsync(rootScopeServiceProvider, message, routingKey, cancellationToken);
                    }
                }
                else
                {
                    await SaveAndTrySendNewOutboxMessageAsync(
                        rootScopeServiceProvider,
                        currentUow: currentUow,
                        message,
                        routingKey,
                        autoCompleteUow: needToStartNewUow,
                        cancellationToken);
                }
            }
            else
            {
                await eventBusProducer.SendTrackableMessageAsync(message, routingKey, cancellationToken);
            }
        }

        protected async Task SaveAndTrySendNewOutboxMessageAsync<TMessage>(
            IServiceProvider rootScopeServiceProvider,
            IUnitOfWork currentUow,
            TMessage message,
            string routingKey,
            bool autoCompleteUow,
            CancellationToken cancellationToken)
            where TMessage : IPlatformEventBusTrackableMessage
        {
            var newProcessingOutboxMessage = PlatformOutboxEventBusMessage.Create(
                message,
                routingKey,
                PlatformOutboxEventBusMessage.SendStatuses.Processing);

            await outboxEventBusMessageRepository.CreateAsync(
                newProcessingOutboxMessage,
                dismissSendEvent: true,
                cancellationToken);

            // Do not need to wait for uow completed if the uow for db do not handle actually transaction.
            // Can execute it immediately without waiting for uow to complete
            if (currentUow.IsNoTransactionUow())
            {
                await SendExistingOutboxMessageAsync(
                    rootScopeServiceProvider,
                    message,
                    routingKey,
                    cancellationToken);
            }
            else
            {
                currentUow.OnCompleted += async (sender, args) =>
                {
                    // Try to process newProcessingOutboxMessage first time after saved
                    await SendExistingOutboxMessageInNewScopeAsync(
                        rootScopeServiceProvider,
                        message,
                        routingKey,
                        cancellationToken);
                };
            }

            if (autoCompleteUow)
                await currentUow.CompleteAsync(cancellationToken);
        }

        public async Task SendExistingOutboxMessageInNewScopeAsync<TMessage>(
            IServiceProvider rootScopeServiceProvider,
            TMessage message,
            string routingKey,
            CancellationToken cancellationToken) where TMessage : IPlatformEventBusTrackableMessage
        {
            using (var newScope = rootScopeServiceProvider.CreateScope())
            {
                var outboxEventBusProducerHelper = newScope.ServiceProvider.GetService<PlatformOutboxEventBusProducerHelper>();

                await outboxEventBusProducerHelper!.SendExistingOutboxMessageInNewUowAsync(
                    rootScopeServiceProvider,
                    message,
                    routingKey,
                    cancellationToken);
            }
        }

        public async Task SendExistingOutboxMessageAsync<TMessage>(
            IServiceProvider rootScopeServiceProvider,
            TMessage message,
            string routingKey,
            CancellationToken cancellationToken)
            where TMessage : IPlatformEventBusTrackableMessage
        {
            try
            {
                await eventBusProducer.SendTrackableMessageAsync(message, routingKey, cancellationToken);

                await UpdateExistingOutboxMessageProcessedAsync(PlatformOutboxEventBusMessage.BuildId(message), cancellationToken);
            }
            catch (Exception exception)
            {
                await UpdateExistingOutboxMessageFailedInNewScopeAsync(
                    rootScopeServiceProvider,
                    PlatformOutboxEventBusMessage.BuildId(message),
                    exception,
                    cancellationToken);
            }
        }

        public async Task SendExistingOutboxMessageInNewUowAsync<TMessage>(
            IServiceProvider rootScopeServiceProvider,
            TMessage message,
            string routingKey,
            CancellationToken cancellationToken)
            where TMessage : IPlatformEventBusTrackableMessage
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                await SendExistingOutboxMessageAsync(rootScopeServiceProvider, message, routingKey, cancellationToken);

                await uow.CompleteAsync(cancellationToken);
            }
        }

        public async Task UpdateExistingOutboxMessageProcessedAsync(
            string messageId,
            CancellationToken cancellationToken)
        {
            var existingOutboxMessage = await outboxEventBusMessageRepository.GetByIdAsync(
                messageId,
                cancellationToken);

            existingOutboxMessage.LastSendDate = DateTime.UtcNow;
            existingOutboxMessage.SendStatus = PlatformOutboxEventBusMessage.SendStatuses.Processed;

            await outboxEventBusMessageRepository.UpdateAsync(existingOutboxMessage, cancellationToken: cancellationToken);
        }

        public async Task UpdateExistingOutboxMessageFailedInNewScopeAsync(
            IServiceProvider rootScopeServiceProvider,
            string messageId,
            Exception exception,
            CancellationToken cancellationToken)
        {
            using (var newScope = rootScopeServiceProvider.CreateScope())
            {
                var newScopeOutboxEventBusProducerHelper = newScope.ServiceProvider.GetService<PlatformOutboxEventBusProducerHelper>();

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
            var existingOutboxMessage = await outboxEventBusMessageRepository.GetByIdAsync(
                messageId,
                cancellationToken);

            existingOutboxMessage.SendStatus = PlatformOutboxEventBusMessage.SendStatuses.Failed;
            existingOutboxMessage.LastSendDate = DateTime.UtcNow;
            existingOutboxMessage.LastSendError = PlatformJsonSerializer.Serialize(
                new {exception.Message, exception.StackTrace});

            await outboxEventBusMessageRepository.UpdateAsync(existingOutboxMessage, cancellationToken: cancellationToken);

            logger.LogError(
                exception,
                $"Error Send message [RoutingKey:{existingOutboxMessage.RoutingKey}], [Type:{existingOutboxMessage.MessageTypeFullName}].{Environment.NewLine}" +
                $"Message Info: ${existingOutboxMessage.JsonMessage}.{Environment.NewLine}");
        }
    }
}
