using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.Events;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Consumers
{
    public interface IPlatformCqrsEntityEventBusConsumer<TEntity> : IPlatformUowEventBusConsumer<PlatformCqrsEntityEvent<TEntity>>
        where TEntity : class, IEntity, new()
    {
    }

    public interface IPlatformCqrsEntityEventBusConsumer<TEntity, TBusinessActionPayload> : IPlatformUowEventBusConsumer<PlatformCqrsEntityEvent<TEntity, TBusinessActionPayload>>
        where TEntity : class, IEntity, new()
        where TBusinessActionPayload : class, new()
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

    public abstract class PlatformCqrsEntityEventBusConsumer<TEntity, TBusinessActionPayload>
        : PlatformUowEventBusConsumer<PlatformCqrsEntityEvent<TEntity, TBusinessActionPayload>>, IPlatformCqrsEntityEventBusConsumer<TEntity, TBusinessActionPayload>
        where TEntity : class, IEntity, new()
        where TBusinessActionPayload : class, new()
    {
        protected PlatformCqrsEntityEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager) : base(loggerFactory, uowManager)
        {
        }
    }
}
