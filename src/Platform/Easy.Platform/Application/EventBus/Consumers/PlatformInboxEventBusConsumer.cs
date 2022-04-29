using System;
using System.Text.Json;
using System.Threading.Tasks;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.Repositories;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.Consumers
{
    /// <summary>
    /// Inbox consumer support inbox pattern to prevent duplicated consumer message many times
    /// when event bus requeue message.
    /// This will stored consumed message into db. If message existed, it won't process the consumer.
    /// </summary>
    public interface IPlatformInboxEventBusConsumer<TMessagePayload> : IPlatformUowEventBusConsumer<TMessagePayload>
        where TMessagePayload : class, new()
    {
    }

    public abstract class PlatformInboxEventBusConsumer<TMessagePayload> : PlatformUowEventBusConsumer<TMessagePayload>, IPlatformInboxEventBusConsumer<TMessagePayload>
        where TMessagePayload : class, new()
    {
        private readonly IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo;

        protected PlatformInboxEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo) : base(loggerFactory, uowManager)
        {
            this.inboxEventBusMessageRepo = inboxEventBusMessageRepo;
        }

        protected override async Task ExecuteInternalHandleAsync(
            PlatformEventBusMessage<TMessagePayload> message,
            string routingKey)
        {
            if (message.TrackingId != null)
            {
                var existingInboxMessage = await inboxEventBusMessageRepo.FirstOrDefaultAsync(p =>
                    p.Id == PlatformInboxEventBusMessage.BuildId(message, GetType().Name));

                if (existingInboxMessage == null ||
                    (existingInboxMessage.ConsumeStatus != PlatformInboxEventBusMessage.ConsumeStatuses.Processed &&
                     existingInboxMessage.ConsumeStatus != PlatformInboxEventBusMessage.ConsumeStatuses.Processing))
                {
                    try
                    {
                        await InternalHandleAsync(message, routingKey);

                        if (existingInboxMessage == null)
                        {
                            await inboxEventBusMessageRepo.CreateAsync(PlatformInboxEventBusMessage.Create(
                                message,
                                GetType().Name,
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
                        if (existingInboxMessage == null)
                        {
                            await inboxEventBusMessageRepo.CreateAsync(PlatformInboxEventBusMessage.Create(
                                message,
                                GetType().Name,
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

                        throw;
                    }
                }
            }
            else
            {
                await InternalHandleAsync(message, routingKey);
            }
        }
    }
}
