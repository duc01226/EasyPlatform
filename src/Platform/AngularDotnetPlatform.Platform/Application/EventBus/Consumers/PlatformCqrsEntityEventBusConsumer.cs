using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Consumers
{
    public interface IPlatformCqrsEntityEventBusConsumer<TEntity, TPrimaryKey> : IPlatformUowEventBusConsumer<TEntity>
        where TEntity : RootEntity<TEntity, TPrimaryKey>, new()
    {
    }

    public abstract class PlatformCqrsEntityEventBusConsumer<TEntity, TPrimaryKey>
        : PlatformUowEventBusConsumer<TEntity>, IPlatformCqrsEntityEventBusConsumer<TEntity, TPrimaryKey>
        where TEntity : RootEntity<TEntity, TPrimaryKey>, new()
    {
        protected PlatformCqrsEntityEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager) : base(loggerFactory, uowManager)
        {
        }
    }
}
