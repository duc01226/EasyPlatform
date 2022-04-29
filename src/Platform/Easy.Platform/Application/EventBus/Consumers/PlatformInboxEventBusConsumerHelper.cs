using System;
using System.Threading.Tasks;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;

namespace Easy.Platform.Application.EventBus.Consumers
{
    public static class PlatformInboxEventBusConsumerHelper
    {
        public static async Task ExecuteInternalHandleAsync<TMessage>(
            IPlatformEventBusBaseConsumer<TMessage> consumer,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo,
            Func<TMessage, string, Task> internalHandleAsync,
            TMessage message,
            string routingKey) where TMessage : class, IPlatformEventBusTrackableMessage, new()
        {
            if (message.TrackingId != null)
            {
                var existingInboxMessage = await inboxEventBusMessageRepo.FirstOrDefaultAsync(p =>
                    p.Id == PlatformInboxEventBusMessage.BuildId(message, consumer.GetType().Name));

                if (existingInboxMessage == null ||
                    (existingInboxMessage.ConsumeStatus != PlatformInboxEventBusMessage.ConsumeStatuses.Processed &&
                     existingInboxMessage.ConsumeStatus != PlatformInboxEventBusMessage.ConsumeStatuses.Processing))
                {
                    try
                    {
                        await internalHandleAsync(message, routingKey);

                        if (existingInboxMessage == null)
                        {
                            await inboxEventBusMessageRepo.CreateAsync(PlatformInboxEventBusMessage.Create(
                                message,
                                routingKey,
                                consumer.GetType().Name,
                                PlatformInboxEventBusMessage.ConsumeStatuses.Processed));
                        }
                        else
                        {
                            existingInboxMessage.LastConsumeDate = DateTime.UtcNow;
                            existingInboxMessage.ConsumeStatus = PlatformInboxEventBusMessage.ConsumeStatuses.Processed;

                            await inboxEventBusMessageRepo.UpdateAsync(existingInboxMessage);
                        }
                    }
                    catch (Exception e)
                    {
                        using (unitOfWorkManager.Begin())
                        {
                            if (existingInboxMessage == null)
                            {
                                await inboxEventBusMessageRepo.CreateAsync(PlatformInboxEventBusMessage.Create(
                                    message,
                                    routingKey,
                                    consumer.GetType().Name,
                                    PlatformInboxEventBusMessage.ConsumeStatuses.Failed,
                                    lastConsumeError: PlatformJsonSerializer.Serialize(e)));
                            }
                            else
                            {
                                existingInboxMessage.ConsumeStatus = PlatformInboxEventBusMessage.ConsumeStatuses.Failed;
                                existingInboxMessage.LastConsumeDate = DateTime.UtcNow;
                                existingInboxMessage.LastConsumeError = PlatformJsonSerializer.Serialize(e);

                                await inboxEventBusMessageRepo.UpdateAsync(existingInboxMessage);
                            }
                        }

                        throw;
                    }
                }
            }
            else
            {
                await internalHandleAsync(message, routingKey);
            }
        }
    }
}
