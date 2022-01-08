using System;
using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.Repositories;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Consumers
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

        protected override async Task ExecuteInternalHandleAsync(PlatformEventBusMessage<TMessagePayload> message)
        {
            if (await inboxEventBusMessageRepo.AnyAsync(p =>
                message.TrackingId != null &&
                p.Id == PlatformInboxEventBusMessage.BuildId(message, GetType().Name)))
            {
                return;
            }

            await InternalHandleAsync(message);
            await inboxEventBusMessageRepo.CreateOrUpdateAsync(PlatformInboxEventBusMessage.Create(message, GetType().Name));
        }
    }
}
