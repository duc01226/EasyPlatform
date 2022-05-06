using System;
using System.Text.Json;
using System.Threading.Tasks;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.InboxPattern
{
    public static class PlatformInboxEventBusConsumerHelper
    {
        /// <summary>
        /// Inbox consumer support inbox pattern to prevent duplicated consumer message many times
        /// when event bus requeue message.
        /// This will stored consumed message into db. If message existed, it won't process the consumer.
        /// </summary>
        public static async Task HandleExecutingInboxConsumerInternalHandleAsync<TMessage>(
            IPlatformEventBusBaseConsumer<TMessage> consumer,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo,
            Func<TMessage, string, Task> internalHandleAsync,
            TMessage message,
            string routingKey,
            bool isProcessingExistingInboxMessage,
            ILogger logger) where TMessage : class, IPlatformEventBusTrackableMessage, new()
        {
            if (message.TrackingId != null)
            {
                var existingInboxMessage = await inboxEventBusMessageRepo.FirstOrDefaultAsync(p =>
                    p.Id == PlatformInboxEventBusMessage.BuildId(message, GetConsumerByValue(consumer)));

                if (existingInboxMessage == null ||
                    existingInboxMessage.ConsumeStatus == PlatformInboxEventBusMessage.ConsumeStatuses.New ||
                    existingInboxMessage.ConsumeStatus == PlatformInboxEventBusMessage.ConsumeStatuses.Failed ||
                    (isProcessingExistingInboxMessage && existingInboxMessage.ConsumeStatus == PlatformInboxEventBusMessage.ConsumeStatuses.Processing))
                {
                    try
                    {
                        await internalHandleAsync(message, routingKey);

                        await UpsertProcessedInboxMessage(consumer, unitOfWorkManager, inboxEventBusMessageRepo, message, routingKey);
                    }
                    catch (Exception e)
                    {
                        await UpsertFailedInboxMessage(consumer, unitOfWorkManager, inboxEventBusMessageRepo, message, routingKey, e);

                        logger.LogError(e, $"Error Consume inbox message [RoutingKey:{routingKey}], [Type:{message.GetType().GetGenericTypeName()}].{Environment.NewLine}" +
                                           $"Message Info: ${PlatformJsonSerializer.Serialize(message)}.{Environment.NewLine}");
                    }
                }
            }
            else
            {
                await internalHandleAsync(message, routingKey);
            }
        }

        public static string GetConsumerByValue<TMessage>(IPlatformEventBusBaseConsumer<TMessage> consumer) where TMessage : class, IPlatformEventBusTrackableMessage, new()
        {
            return GetConsumerByValue(consumer.GetType());
        }

        public static string GetConsumerByValue(Type consumerType)
        {
            return consumerType.FullName;
        }

        private static async Task UpsertProcessedInboxMessage<TMessage>(
            IPlatformEventBusBaseConsumer<TMessage> consumer,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo,
            TMessage message,
            string routingKey) where TMessage : class, IPlatformEventBusTrackableMessage, new()
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                var existingInboxMessage = await inboxEventBusMessageRepo.FirstOrDefaultAsync(p =>
                    p.Id == PlatformInboxEventBusMessage.BuildId(message, GetConsumerByValue(consumer)));

                if (existingInboxMessage == null)
                {
                    await inboxEventBusMessageRepo.CreateAsync(PlatformInboxEventBusMessage.Create(
                        message,
                        routingKey,
                        GetConsumerByValue(consumer),
                        PlatformInboxEventBusMessage.ConsumeStatuses.Processed));
                }
                else
                {
                    existingInboxMessage.LastConsumeDate = DateTime.UtcNow;
                    existingInboxMessage.ConsumeStatus = PlatformInboxEventBusMessage.ConsumeStatuses.Processed;

                    await inboxEventBusMessageRepo.UpdateAsync(existingInboxMessage);
                }

                await uow.CompleteAsync();
            }
        }

        private static async Task UpsertFailedInboxMessage<TMessage>(
            IPlatformEventBusBaseConsumer<TMessage> consumer,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo,
            TMessage message,
            string routingKey,
            Exception exception) where TMessage : class, IPlatformEventBusTrackableMessage, new()
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                var existingInboxMessage = await inboxEventBusMessageRepo.FirstOrDefaultAsync(p =>
                    p.Id == PlatformInboxEventBusMessage.BuildId(message, GetConsumerByValue(consumer)));
                var consumeError = PlatformJsonSerializer.Serialize(new { exception.Message, exception.StackTrace });

                if (existingInboxMessage == null)
                {
                    await inboxEventBusMessageRepo.CreateAsync(PlatformInboxEventBusMessage.Create(
                        message,
                        routingKey,
                        GetConsumerByValue(consumer),
                        PlatformInboxEventBusMessage.ConsumeStatuses.Failed,
                        lastConsumeError: consumeError));
                }
                else
                {
                    existingInboxMessage.ConsumeStatus = PlatformInboxEventBusMessage.ConsumeStatuses.Failed;
                    existingInboxMessage.LastConsumeDate = DateTime.UtcNow;
                    existingInboxMessage.LastConsumeError = consumeError;

                    await inboxEventBusMessageRepo.UpdateAsync(existingInboxMessage);
                }

                await uow.CompleteAsync();
            }
        }
    }
}
