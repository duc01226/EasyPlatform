using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.Consumers
{
    public abstract class PlatformInboxCqrsEntityEventBusConsumer<TEntity>
        : PlatformInboxEventBusConsumer<PlatformCqrsEntityEvent<TEntity>>, IPlatformCqrsEntityEventBusConsumer<TEntity>
        where TEntity : class, IEntity, new()
    {
        protected PlatformInboxCqrsEntityEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo) : base(loggerFactory, uowManager, inboxEventBusMessageRepo)
        {
        }
    }
}
