using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.Consumers
{
    public interface IPlatformCqrsEntityEventBusConsumer<TEntity> : IPlatformUowEventBusConsumer<PlatformCqrsEntityEvent<TEntity>>
        where TEntity : class, IEntity, new()
    {
    }

    public abstract class PlatformCqrsEntityEventBusConsumer<TEntity>
        : PlatformUowEventBusConsumer<PlatformCqrsEntityEvent<TEntity>>, IPlatformCqrsEntityEventBusConsumer<TEntity>
        where TEntity : class, IEntity, new()
    {
        protected PlatformCqrsEntityEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager) : base(loggerFactory, uowManager)
        {
        }
    }
}
