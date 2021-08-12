using AngularDotnetPlatform.Platform.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Consumers
{
    public interface IPlatformCqrsCommandEventBusConsumer<TCommand, TCommandResult> : IPlatformUowEventBusConsumer<TCommand>
        where TCommand : PlatformCqrsCommand<TCommandResult>, new()
        where TCommandResult : PlatformCqrsCommandResult, new()
    {
    }

    public abstract class PlatformCqrsCommandEventBusConsumer<TCommand, TCommandResult> : PlatformUowEventBusConsumer<TCommand>, IPlatformCqrsCommandEventBusConsumer<TCommand, TCommandResult>
        where TCommand : PlatformCqrsCommand<TCommandResult>, new()
        where TCommandResult : PlatformCqrsCommandResult, new()
    {
        protected PlatformCqrsCommandEventBusConsumer(ILoggerFactory loggerFactory, IUnitOfWorkManager uowManager) : base(loggerFactory, uowManager)
        {
        }
    }
}
