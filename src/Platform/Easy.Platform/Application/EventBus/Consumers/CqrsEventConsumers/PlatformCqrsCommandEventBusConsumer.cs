using System;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.Consumers.CqrsEventConsumers
{
    public interface IPlatformCqrsCommandEventBusConsumer<TCommand> : IPlatformApplicationEventBusConsumer<TCommand>
        where TCommand : class, IPlatformCqrsCommand, new()
    {
    }

    public abstract class PlatformCqrsCommandEventBusConsumer<TCommand> : PlatformApplicationEventBusConsumer<TCommand>, IPlatformCqrsCommandEventBusConsumer<TCommand>
        where TCommand : class, IPlatformCqrsCommand, new()
    {
        protected PlatformCqrsCommandEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }
    }
}
