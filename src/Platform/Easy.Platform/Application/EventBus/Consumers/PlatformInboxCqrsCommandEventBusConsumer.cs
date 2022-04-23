using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.Consumers
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
