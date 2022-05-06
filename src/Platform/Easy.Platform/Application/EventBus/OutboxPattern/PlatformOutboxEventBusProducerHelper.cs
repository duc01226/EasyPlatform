using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.OutboxPattern
{
    public static class PlatformOutboxEventBusProducerHelper
    {
        public static async Task HandleSendingOutboxMessageAsync<TMessage>(
            IServiceProvider serviceProvider,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformOutboxEventBusMessageRepository outboxEventBusMessageRepo,
            IPlatformEventBusProducer eventBusProducer,
            TMessage message,
            string routingKey,
            bool isProcessingExistingOutboxMessage,
            ILogger logger,
            CancellationToken cancellationToken) where TMessage : IPlatformEventBusTrackableMessage
        {
            if (message.TrackingId != null)
            {
                var needToStartNewUow = unitOfWorkManager.Current() == null;

                if (needToStartNewUow)
                    unitOfWorkManager.Begin(suppressCurrentUow: false);

                if (isProcessingExistingOutboxMessage)
                {
                    var existingOutboxMessage = await outboxEventBusMessageRepo.GetByIdAsync(
                        PlatformOutboxEventBusMessage.BuildId(message), cancellationToken);

                    if (existingOutboxMessage.SendStatus is
                        PlatformOutboxEventBusMessage.SendStatuses.New or
                        PlatformOutboxEventBusMessage.SendStatuses.Failed or
                        PlatformOutboxEventBusMessage.SendStatuses.Processing)
                    {
                        await SendExistingOutboxMessageAsync(
                            serviceProvider, outboxEventBusMessageRepo, eventBusProducer, message, routingKey, logger, cancellationToken);
                    }
                }
                else
                {
                    await SaveAndTrySendNewOutboxMessageAsync(
                        serviceProvider,
                        uow: unitOfWorkManager.Current(),
                        outboxEventBusMessageRepo,
                        eventBusProducer,
                        message,
                        routingKey,
                        logger,
                        autoCompleteUow: needToStartNewUow,
                        cancellationToken);
                }
            }
            else
            {
                await eventBusProducer.SendTrackableMessageAsync(message, routingKey, cancellationToken);
            }
        }

        private static async Task SaveAndTrySendNewOutboxMessageAsync<TMessage>(
            IServiceProvider serviceProvider,
            IUnitOfWork uow,
            IPlatformOutboxEventBusMessageRepository outboxEventBusMessageRepo,
            IPlatformEventBusProducer eventBusProducer,
            TMessage message,
            string routingKey,
            ILogger logger,
            bool autoCompleteUow,
            CancellationToken cancellationToken)
            where TMessage : IPlatformEventBusTrackableMessage
        {
            var newProcessingOutboxMessage = PlatformOutboxEventBusMessage.Create(
                message,
                routingKey,
                PlatformOutboxEventBusMessage.SendStatuses.Processing);

            await outboxEventBusMessageRepo.CreateAsync(
                newProcessingOutboxMessage,
                cancellationToken: cancellationToken);

            uow.OnCompleted += async (sender, args) =>
            {
                // Try to process newProcessingOutboxMessage first time after saved
                await SendExistingOutboxMessageInNewScopeAsync(serviceProvider, eventBusProducer, message, routingKey, logger, cancellationToken);
            };

            if (autoCompleteUow)
                await uow.CompleteAsync(cancellationToken);
        }

        private static async Task SendExistingOutboxMessageInNewScopeAsync<TMessage>(
            IServiceProvider serviceProvider,
            IPlatformEventBusProducer eventBusProducer,
            TMessage message,
            string routingKey,
            ILogger logger,
            CancellationToken cancellationToken) where TMessage : IPlatformEventBusTrackableMessage
        {
            using (var newScope = serviceProvider.CreateScope())
            {
                var outboxEventBusMessageRepo = newScope.ServiceProvider.GetService<IPlatformOutboxEventBusMessageRepository>();
                var unitOfWorkManager = newScope.ServiceProvider.GetService<IUnitOfWorkManager>();

                using (var newUowForTrySendMessageToBus = unitOfWorkManager!.Begin())
                {
                    await SendExistingOutboxMessageAsync(
                        serviceProvider,
                        outboxEventBusMessageRepo,
                        eventBusProducer,
                        message,
                        routingKey,
                        logger,
                        cancellationToken);

                    await newUowForTrySendMessageToBus.CompleteAsync(cancellationToken);
                }
            }
        }

        private static async Task SendExistingOutboxMessageAsync<TMessage>(
            IServiceProvider serviceProvider,
            IPlatformOutboxEventBusMessageRepository outboxEventBusMessageRepo,
            IPlatformEventBusProducer eventBusProducer,
            TMessage message,
            string routingKey,
            ILogger logger,
            CancellationToken cancellationToken)
            where TMessage : IPlatformEventBusTrackableMessage
        {
            try
            {
                await eventBusProducer.SendTrackableMessageAsync(message, routingKey, cancellationToken);

                await UpdateExistingOutboxMessageProcessed(outboxEventBusMessageRepo, message);
            }
            catch (Exception exception)
            {
                await UpdateExistingOutboxMessageFailed(serviceProvider, message, exception, cancellationToken);

                logger.LogError(
                    exception,
                    $"Error Send message [RoutingKey:{routingKey}], [Type:{message.GetType().GetGenericTypeName()}].{Environment.NewLine}" +
                    $"Message Info: ${PlatformJsonSerializer.Serialize(message)}.{Environment.NewLine}");
            }
        }

        private static async Task UpdateExistingOutboxMessageProcessed<TMessage>(
            IPlatformOutboxEventBusMessageRepository outboxEventBusMessageRepo,
            TMessage message) where TMessage : IPlatformEventBusTrackableMessage
        {
            var existingOutboxMessage = await outboxEventBusMessageRepo.GetByIdAsync(PlatformOutboxEventBusMessage.BuildId(message));

            existingOutboxMessage.LastSendDate = DateTime.UtcNow;
            existingOutboxMessage.SendStatus = PlatformOutboxEventBusMessage.SendStatuses.Processed;

            await outboxEventBusMessageRepo.UpdateAsync(existingOutboxMessage);
        }

        private static async Task UpdateExistingOutboxMessageFailed<TMessage>(
            IServiceProvider serviceProvider,
            TMessage message,
            Exception exception,
            CancellationToken cancellationToken) where TMessage : IPlatformEventBusTrackableMessage
        {
            using (var newScope = serviceProvider.CreateScope())
            {
                var outboxEventBusMessageRepo = newScope.ServiceProvider.GetService<IPlatformOutboxEventBusMessageRepository>();
                var unitOfWorkManager = newScope.ServiceProvider.GetService<IUnitOfWorkManager>();

                using (var newUowForTrySendMessageToBus = unitOfWorkManager!.Begin())
                {
                    var existingOutboxMessage = await outboxEventBusMessageRepo!.GetByIdAsync(
                        PlatformOutboxEventBusMessage.BuildId(message),
                        cancellationToken);

                    existingOutboxMessage.SendStatus = PlatformOutboxEventBusMessage.SendStatuses.Failed;
                    existingOutboxMessage.LastSendDate = DateTime.UtcNow;
                    existingOutboxMessage.LastSendError = PlatformJsonSerializer.Serialize(new { exception.Message, exception.StackTrace });

                    await outboxEventBusMessageRepo.UpdateAsync(existingOutboxMessage, cancellationToken: cancellationToken);

                    await newUowForTrySendMessageToBus.CompleteAsync(cancellationToken);
                }
            }
        }
    }
}
