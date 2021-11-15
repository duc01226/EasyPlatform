using AngularDotnetPlatform.Platform.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Consumers
{
    /// <inheritdoc cref="IPlatformInboxEventBusConsumer{TMessagePayload}"/>
    public abstract class PlatformInboxCqrsCommandEventBusConsumer<TCommand> : PlatformInboxEventBusConsumer<TCommand>, IPlatformCqrsCommandEventBusConsumer<TCommand>
        where TCommand : class, IPlatformCqrsCommand, new()
    {
        protected PlatformInboxCqrsCommandEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo) : base(loggerFactory, uowManager, inboxEventBusMessageRepo)
        {
        }
    }
}
