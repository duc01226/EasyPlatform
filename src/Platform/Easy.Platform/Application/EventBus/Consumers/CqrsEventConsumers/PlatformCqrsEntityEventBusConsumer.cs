using System;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.Consumers.CqrsEventConsumers
{
    public interface IPlatformCqrsEntityEventBusConsumer<TEntity> : IPlatformApplicationEventBusConsumer<PlatformCqrsEntityEvent<TEntity>>
        where TEntity : class, IEntity, new()
    {
    }

    public abstract class PlatformCqrsEntityEventBusConsumer<TEntity>
        : PlatformApplicationEventBusConsumer<PlatformCqrsEntityEvent<TEntity>>, IPlatformCqrsEntityEventBusConsumer<TEntity>
        where TEntity : class, IEntity, new()
    {
        protected PlatformCqrsEntityEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }
    }
}
