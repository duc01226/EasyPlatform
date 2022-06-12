using System;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.Consumers.CqrsEventConsumers
{
    public interface IPlatformCqrsEntityEventBusMessageConsumer<TEntity> : IPlatformApplicationMessageBusConsumer<PlatformCqrsEntityEvent<TEntity>>
        where TEntity : class, IEntity, new()
    {
    }

    public abstract class PlatformCqrsEntityEventBusMessageConsumer<TEntity>
        : PlatformApplicationMessageBusConsumer<PlatformCqrsEntityEvent<TEntity>>, IPlatformCqrsEntityEventBusMessageConsumer<TEntity>
        where TEntity : class, IEntity, new()
    {
        protected PlatformCqrsEntityEventBusMessageConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }
    }
}
