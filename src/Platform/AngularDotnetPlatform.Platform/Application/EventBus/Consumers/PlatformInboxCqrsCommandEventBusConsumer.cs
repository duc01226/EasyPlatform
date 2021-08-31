using AngularDotnetPlatform.Platform.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Consumers
{
    /// <inheritdoc cref="IPlatformInboxEventBusConsumer{TMessagePayload}"/>
    public abstract class PlatformInboxCqrsCommandEventBusConsumer<TCommand, TCommandResult> : PlatformInboxEventBusConsumer<TCommand>, IPlatformCqrsCommandEventBusConsumer<TCommand, TCommandResult>
        where TCommand : PlatformCqrsCommand<TCommandResult>, new()
        where TCommandResult : PlatformCqrsCommandResult, new()
    {
        protected PlatformInboxCqrsCommandEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo) : base(loggerFactory, uowManager, inboxEventBusMessageRepo)
        {
        }
    }
}
