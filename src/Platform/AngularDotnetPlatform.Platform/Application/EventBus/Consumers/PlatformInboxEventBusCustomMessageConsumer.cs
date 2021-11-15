using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Consumers
{
    /// <summary>
    /// Inbox consumer support inbox pattern to prevent duplicated consumer message many times
    /// when event bus requeue message.
    /// This will stored consumed message into db. If message existed, it won't process the consumer.
    /// </summary>
    public interface IPlatformInboxEventBusCustomMessageConsumer<TMessage> : IPlatformUowEventBusCustomMessageConsumer<TMessage>
        where TMessage : class, new()
    {
    }

    public abstract class PlatformInboxEventBusCustomMessageConsumer<TMessage> : PlatformUowEventBusCustomMessageConsumer<TMessage>, IPlatformInboxEventBusCustomMessageConsumer<TMessage>
        where TMessage : class, new()
    {
        private readonly IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo;

        protected PlatformInboxEventBusCustomMessageConsumer(
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
            await inboxEventBusMessageRepo.CreateOrUpdate(PlatformInboxEventBusMessage.Create(message, routingKey, GetType().Name));
        }
    }
}
