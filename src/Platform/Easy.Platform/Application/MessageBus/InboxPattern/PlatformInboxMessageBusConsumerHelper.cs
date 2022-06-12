using System;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.InboxPattern
{
    public static class PlatformInboxMessageBusConsumerHelper
    {
        /// <summary>
        /// Inbox consumer support inbox pattern to prevent duplicated consumer message many times
        /// when event bus requeue message.
        /// This will stored consumed message into db. If message existed, it won't process the consumer.
        /// </summary>
        public static async Task HandleExecutingInboxConsumerInternalHandleAsync<TMessage>(
            IPlatformMessageBusBaseConsumer<TMessage> consumer,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformInboxBusMessageRepository inboxBusMessageRepo,
            Func<TMessage, string, Task> internalHandleAsync,
            TMessage message,
            string routingKey,
            bool isProcessingExistingInboxMessage,
            ILogger logger,
            CancellationToken cancellationToken = default) where TMessage : class, IPlatformBusTrackableMessage, new()
        {
            if (message.TrackingId != null)
            {
                var existingInboxMessage = await inboxBusMessageRepo.FirstOrDefaultAsync(
                    p => p.Id == PlatformInboxBusMessage.BuildId(message, GetConsumerByValue(consumer)),
                    cancellationToken);

                if (existingInboxMessage == null ||
                    existingInboxMessage.ConsumeStatus == PlatformInboxBusMessage.ConsumeStatuses.New ||
                    existingInboxMessage.ConsumeStatus == PlatformInboxBusMessage.ConsumeStatuses.Failed ||
                    (isProcessingExistingInboxMessage && existingInboxMessage.ConsumeStatus == PlatformInboxBusMessage.ConsumeStatuses.Processing))
                {
                    try
                    {
                        await internalHandleAsync(message, routingKey);

                        await UpsertProcessedInboxMessageAsync(
                            consumer, unitOfWorkManager, inboxBusMessageRepo, message, routingKey, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        await UpsertFailedInboxMessageAsync(
                            consumer, unitOfWorkManager, inboxBusMessageRepo, message, routingKey, ex, cancellationToken);

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

        public static string GetConsumerByValue<TMessage>(IPlatformMessageBusBaseConsumer<TMessage> consumer)
            where TMessage : class, IPlatformBusTrackableMessage, new()
        {
            return GetConsumerByValue(consumer.GetType());
        }

        public static string GetConsumerByValue(Type consumerType)
        {
            return consumerType.FullName;
        }

        public static async Task UpsertProcessedInboxMessageAsync<TMessage>(
            IPlatformMessageBusBaseConsumer<TMessage> consumer,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformInboxBusMessageRepository inboxBusMessageRepo,
            TMessage message,
            string routingKey,
            CancellationToken cancellationToken = default) where TMessage : class, IPlatformBusTrackableMessage, new()
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                var existingInboxMessage = await inboxBusMessageRepo.FirstOrDefaultAsync(
                    p => p.Id == PlatformInboxBusMessage.BuildId(message, GetConsumerByValue(consumer)),
                    cancellationToken);

                if (existingInboxMessage == null)
                {
                    await inboxBusMessageRepo.CreateAsync(
                        PlatformInboxBusMessage.Create(
                            message,
                            routingKey,
                            GetConsumerByValue(consumer),
                            PlatformInboxBusMessage.ConsumeStatuses.Processed),
                        cancellationToken: cancellationToken);
                }
                else
                {
                    existingInboxMessage.LastConsumeDate = DateTime.UtcNow;
                    existingInboxMessage.ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Processed;

                    await inboxBusMessageRepo.UpdateAsync(existingInboxMessage, cancellationToken: cancellationToken);
                }

                await uow.CompleteAsync(cancellationToken);
            }
        }

        public static async Task UpsertFailedInboxMessageAsync<TMessage>(
            IPlatformMessageBusBaseConsumer<TMessage> consumer,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformInboxBusMessageRepository inboxBusMessageRepo,
            TMessage message,
            string routingKey,
            Exception exception,
            CancellationToken cancellationToken = default) where TMessage : class, IPlatformBusTrackableMessage, new()
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                var existingInboxMessage = await inboxBusMessageRepo.FirstOrDefaultAsync(
                    p => p.Id == PlatformInboxBusMessage.BuildId(message, GetConsumerByValue(consumer)),
                    cancellationToken);
                var consumeError = PlatformJsonSerializer.Serialize(new { exception.Message, exception.StackTrace });

                if (existingInboxMessage == null)
                {
                    await inboxBusMessageRepo.CreateAsync(
                        PlatformInboxBusMessage.Create(
                            message,
                            routingKey,
                            GetConsumerByValue(consumer),
                            PlatformInboxBusMessage.ConsumeStatuses.Failed,
                            lastConsumeError: consumeError),
                        cancellationToken: cancellationToken);
                }
                else
                {
                    existingInboxMessage.ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Failed;
                    existingInboxMessage.LastConsumeDate = DateTime.UtcNow;
                    existingInboxMessage.LastConsumeError = consumeError;

                    await inboxBusMessageRepo.UpdateAsync(existingInboxMessage, cancellationToken: cancellationToken);
                }

                await uow.CompleteAsync(cancellationToken);
            }
        }

        public static async Task UpdateFailedInboxMessageAsync(
            string id,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformInboxBusMessageRepository inboxBusMessageRepo,
            Exception exception,
            CancellationToken cancellationToken = default)
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                var existingInboxMessage = await inboxBusMessageRepo.GetByIdAsync(id, cancellationToken);
                var consumeError = PlatformJsonSerializer.Serialize(new { exception.Message, exception.StackTrace });

                existingInboxMessage.ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Failed;
                existingInboxMessage.LastConsumeDate = DateTime.UtcNow;
                existingInboxMessage.LastConsumeError = consumeError;

                await inboxBusMessageRepo.UpdateAsync(existingInboxMessage, cancellationToken: cancellationToken);

                await uow.CompleteAsync(cancellationToken);
            }
        }
    }
}
