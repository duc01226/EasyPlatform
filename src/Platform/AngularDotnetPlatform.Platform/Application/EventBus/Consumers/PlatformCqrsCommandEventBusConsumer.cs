using AngularDotnetPlatform.Platform.Common.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Consumers
{
    public interface IPlatformCqrsCommandEventBusConsumer<TCommand> : IPlatformUowEventBusConsumer<TCommand>
        where TCommand : class, IPlatformCqrsCommand, new()
    {
    }

    public abstract class PlatformCqrsCommandEventBusConsumer<TCommand> : PlatformUowEventBusConsumer<TCommand>, IPlatformCqrsCommandEventBusConsumer<TCommand>
        where TCommand : class, IPlatformCqrsCommand, new()
    {
        protected PlatformCqrsCommandEventBusConsumer(ILoggerFactory loggerFactory, IUnitOfWorkManager uowManager) : base(loggerFactory, uowManager)
        {
        }
    }
}
