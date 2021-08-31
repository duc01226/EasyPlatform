using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Consumers
{
    /// <inheritdoc cref="IPlatformInboxEventBusConsumer{TMessagePayload}"/>
    public abstract class PlatformInboxCqrsEntityEventBusConsumer<TEntity, TPrimaryKey>
        : PlatformInboxEventBusConsumer<TEntity>, IPlatformCqrsEntityEventBusConsumer<TEntity, TPrimaryKey>
        where TEntity : RootEntity<TEntity, TPrimaryKey>, new()
    {
        protected PlatformInboxCqrsEntityEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo) : base(loggerFactory, uowManager, inboxEventBusMessageRepo)
        {
        }
    }
}
