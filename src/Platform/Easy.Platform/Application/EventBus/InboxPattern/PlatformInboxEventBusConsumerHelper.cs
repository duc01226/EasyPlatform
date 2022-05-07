using System;
using System.Text.Json;
using System.Threading;
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
            ILogger logger,
            CancellationToken cancellationToken = default) where TMessage : class, IPlatformEventBusTrackableMessage, new()
        {
            if (message.TrackingId != null)
            {
                var existingInboxMessage = await inboxEventBusMessageRepo.FirstOrDefaultAsync(
                    p => p.Id == PlatformInboxEventBusMessage.BuildId(message, GetConsumerByValue(consumer)),
                    cancellationToken);

                if (existingInboxMessage == null ||
                    existingInboxMessage.ConsumeStatus == PlatformInboxEventBusMessage.ConsumeStatuses.New ||
                    existingInboxMessage.ConsumeStatus == PlatformInboxEventBusMessage.ConsumeStatuses.Failed ||
                    (isProcessingExistingInboxMessage && existingInboxMessage.ConsumeStatus == PlatformInboxEventBusMessage.ConsumeStatuses.Processing))
                {
                    try
                    {
                        await internalHandleAsync(message, routingKey);

                        await UpsertProcessedInboxMessageAsync(
                            consumer, unitOfWorkManager, inboxEventBusMessageRepo, message, routingKey, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        await UpsertFailedInboxMessageAsync(
                            consumer, unitOfWorkManager, inboxEventBusMessageRepo, message, routingKey, ex, cancellationToken);

                        logger.LogError(ex, $"Error Consume inbox message [RoutingKey:{routingKey}], [Type:{message.GetType().GetGenericTypeName()}].{Environment.NewLine}" +
                                           $"Message Info: ${PlatformJsonSerializer.Serialize(message)}.{Environment.NewLine}");
                    }
                }
            }
            else
            {
                await internalHandleAsync(message, routingKey);
            }
        }

        public static string GetConsumerByValue<TMessage>(IPlatformEventBusBaseConsumer<TMessage> consumer)
            where TMessage : class, IPlatformEventBusTrackableMessage, new()
        {
            return GetConsumerByValue(consumer.GetType());
        }

        public static string GetConsumerByValue(Type consumerType)
        {
            return consumerType.FullName;
        }

        public static async Task UpsertProcessedInboxMessageAsync<TMessage>(
            IPlatformEventBusBaseConsumer<TMessage> consumer,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo,
            TMessage message,
            string routingKey,
            CancellationToken cancellationToken = default) where TMessage : class, IPlatformEventBusTrackableMessage, new()
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                var existingInboxMessage = await inboxEventBusMessageRepo.FirstOrDefaultAsync(
                    p => p.Id == PlatformInboxEventBusMessage.BuildId(message, GetConsumerByValue(consumer)),
                    cancellationToken);

                if (existingInboxMessage == null)
                {
                    await inboxEventBusMessageRepo.CreateAsync(
                        PlatformInboxEventBusMessage.Create(
                            message,
                            routingKey,
                            GetConsumerByValue(consumer),
                            PlatformInboxEventBusMessage.ConsumeStatuses.Processed),
                        cancellationToken: cancellationToken);
                }
                else
                {
                    existingInboxMessage.LastConsumeDate = DateTime.UtcNow;
                    existingInboxMessage.ConsumeStatus = PlatformInboxEventBusMessage.ConsumeStatuses.Processed;

                    await inboxEventBusMessageRepo.UpdateAsync(existingInboxMessage, cancellationToken: cancellationToken);
                }

                await uow.CompleteAsync(cancellationToken);
            }
        }

        public static async Task UpsertFailedInboxMessageAsync<TMessage>(
            IPlatformEventBusBaseConsumer<TMessage> consumer,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo,
            TMessage message,
            string routingKey,
            Exception exception,
            CancellationToken cancellationToken = default) where TMessage : class, IPlatformEventBusTrackableMessage, new()
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                var existingInboxMessage = await inboxEventBusMessageRepo.FirstOrDefaultAsync(
                    p => p.Id == PlatformInboxEventBusMessage.BuildId(message, GetConsumerByValue(consumer)),
                    cancellationToken);
                var consumeError = PlatformJsonSerializer.Serialize(new { exception.Message, exception.StackTrace });

                if (existingInboxMessage == null)
                {
                    await inboxEventBusMessageRepo.CreateAsync(
                        PlatformInboxEventBusMessage.Create(
                            message,
                            routingKey,
                            GetConsumerByValue(consumer),
                            PlatformInboxEventBusMessage.ConsumeStatuses.Failed,
                            lastConsumeError: consumeError),
                        cancellationToken: cancellationToken);
                }
                else
                {
                    existingInboxMessage.ConsumeStatus = PlatformInboxEventBusMessage.ConsumeStatuses.Failed;
                    existingInboxMessage.LastConsumeDate = DateTime.UtcNow;
                    existingInboxMessage.LastConsumeError = consumeError;

                    await inboxEventBusMessageRepo.UpdateAsync(existingInboxMessage, cancellationToken: cancellationToken);
                }

                await uow.CompleteAsync(cancellationToken);
            }
        }

        public static async Task UpdateFailedInboxMessageAsync(
            string id,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo,
            Exception exception,
            CancellationToken cancellationToken = default)
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                var existingInboxMessage = await inboxEventBusMessageRepo.GetByIdAsync(id, cancellationToken);
                var consumeError = PlatformJsonSerializer.Serialize(new { exception.Message, exception.StackTrace });

                existingInboxMessage.ConsumeStatus = PlatformInboxEventBusMessage.ConsumeStatuses.Failed;
                existingInboxMessage.LastConsumeDate = DateTime.UtcNow;
                existingInboxMessage.LastConsumeError = consumeError;

                await inboxEventBusMessageRepo.UpdateAsync(existingInboxMessage, cancellationToken: cancellationToken);

                await uow.CompleteAsync(cancellationToken);
            }
        }
    }
}
