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
                var autoCompleteUowWhenSaveOutboxMessage = unitOfWorkManager.Current() == null;

                unitOfWorkManager.Begin(suppressCurrentUow: false);

                if (isProcessingExistingOutboxMessage)
                {
                    var existingOutboxMessage = await outboxEventBusMessageRepo.FirstOrDefaultAsync(
                        p => p.Id == PlatformOutboxEventBusMessage.BuildId(message),
                        cancellationToken);

                    if (existingOutboxMessage == null ||
                        existingOutboxMessage.SendStatus == PlatformOutboxEventBusMessage.SendStatuses.New ||
                        existingOutboxMessage.SendStatus == PlatformOutboxEventBusMessage.SendStatuses.Failed ||
                        existingOutboxMessage.SendStatus == PlatformOutboxEventBusMessage.SendStatuses.Processing)
                    {
                        await SaveOutboxMessageAndTrySendAfterCompletedAsync(
                            serviceProvider,
                            unitOfWorkManager,
                            outboxEventBusMessageRepo,
                            eventBusProducer,
                            message,
                            routingKey,
                            logger,
                            existingOutboxMessage,
                            autoCompleteUowWhenSaveOutboxMessage,
                            cancellationToken);
                    }
                }
                else
                {
                    await SaveOutboxMessageAndTrySendAfterCompletedAsync(
                        serviceProvider,
                        unitOfWorkManager,
                        outboxEventBusMessageRepo,
                        eventBusProducer,
                        message,
                        routingKey,
                        logger,
                        existingOutboxMessage: null,
                        autoCompleteUowWhenSaveOutboxMessage,
                        cancellationToken);
                }
            }
            else
            {
                await eventBusProducer.SendTrackableMessageAsync(message, routingKey, cancellationToken);
            }
        }

        private static async Task SaveOutboxMessageAndTrySendAfterCompletedAsync<TMessage>(
            IServiceProvider serviceProvider,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformOutboxEventBusMessageRepository outboxEventBusMessageRepo,
            IPlatformEventBusProducer eventBusProducer,
            TMessage message,
            string routingKey,
            ILogger logger,
            PlatformOutboxEventBusMessage existingOutboxMessage,
            bool autoCompleteUow,
            CancellationToken cancellationToken)
            where TMessage : IPlatformEventBusTrackableMessage
        {
            if (existingOutboxMessage != null)
            {
                await SendOutboxMessageAsync(outboxEventBusMessageRepo, eventBusProducer, message, routingKey, logger, cancellationToken);
            }
            else
            {
                var uow = unitOfWorkManager.Begin(suppressCurrentUow: false);

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
                    await SendOutboxMessageInNewScopeAsync(serviceProvider, eventBusProducer, message, routingKey, logger, cancellationToken);
                };

                if (autoCompleteUow)
                    await uow.CompleteAsync(cancellationToken);
            }
        }

        private static async Task SendOutboxMessageInNewScopeAsync<TMessage>(
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
                    await SendOutboxMessageAsync(
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

        private static async Task SendOutboxMessageAsync<TMessage>(
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
                await UpdateExistingOutboxMessageFailed(outboxEventBusMessageRepo, message, exception);

                logger.LogError(
                    exception,
                    $"Error Send message [RoutingKey:{routingKey}], [Type:{message.GetType().GetGenericTypeName()}].{Environment.NewLine}" +
                    $"Message Info: ${JsonSerializer.Serialize(message)}.{Environment.NewLine}");
            }
        }

        private static async Task UpdateExistingOutboxMessageProcessed<TMessage>(
            IPlatformOutboxEventBusMessageRepository outboxEventBusMessageRepo,
            TMessage message) where TMessage : IPlatformEventBusTrackableMessage
        {
            var existingOutboxMessage = await outboxEventBusMessageRepo.FirstOrDefaultAsync(p =>
                p.Id == PlatformOutboxEventBusMessage.BuildId(message));

            existingOutboxMessage.LastSendDate = DateTime.UtcNow;
            existingOutboxMessage.SendStatus = PlatformOutboxEventBusMessage.SendStatuses.Processed;

            await outboxEventBusMessageRepo.UpdateAsync(existingOutboxMessage);
        }

        private static async Task UpdateExistingOutboxMessageFailed<TMessage>(
            IPlatformOutboxEventBusMessageRepository outboxEventBusMessageRepo,
            TMessage message,
            Exception exception) where TMessage : IPlatformEventBusTrackableMessage
        {
            var existingOutboxMessage = await outboxEventBusMessageRepo.FirstOrDefaultAsync(p =>
                p.Id == PlatformOutboxEventBusMessage.BuildId(message));

            existingOutboxMessage.SendStatus = PlatformOutboxEventBusMessage.SendStatuses.Failed;
            existingOutboxMessage.LastSendDate = DateTime.UtcNow;
            existingOutboxMessage.LastSendError = PlatformJsonSerializer.Serialize(new { exception.Message, exception.StackTrace });

            await outboxEventBusMessageRepo.UpdateAsync(existingOutboxMessage);
        }
    }
}
