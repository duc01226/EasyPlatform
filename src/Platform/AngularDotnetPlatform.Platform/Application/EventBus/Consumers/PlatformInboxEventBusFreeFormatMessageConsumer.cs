using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.EventBus.InboxPattern;
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
    public interface IPlatformInboxEventBusFreeFormatMessageConsumer<TMessage> : IPlatformUowEventBusFreeFormatMessageConsumer<TMessage>
        where TMessage : class, IPlatformEventBusFreeFormatMessage, new()
    {
    }

    public abstract class PlatformInboxEventBusFreeFormatMessageConsumer<TMessage> : PlatformUowEventBusFreeFormatMessageConsumer<TMessage>, IPlatformInboxEventBusFreeFormatMessageConsumer<TMessage>
        where TMessage : class, IPlatformEventBusFreeFormatMessage, new()
    {
        private readonly IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo;

        protected PlatformInboxEventBusFreeFormatMessageConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo) : base(loggerFactory, uowManager)
        {
            this.inboxEventBusMessageRepo = inboxEventBusMessageRepo;
        }

        protected override async Task ExecuteInternalHandleAsync(TMessage message, string routingKey)
        {
            if (await inboxEventBusMessageRepo.AnyAsync(p =>
                p.Id == PlatformInboxEventBusMessage.BuildId(message, GetType().Name)))
            {
                return;
            }

            await InternalHandleAsync(message, routingKey);
            await inboxEventBusMessageRepo.CreateOrUpdateAsync(PlatformInboxEventBusMessage.Create(message, routingKey, GetType().Name));
        }
    }
}
