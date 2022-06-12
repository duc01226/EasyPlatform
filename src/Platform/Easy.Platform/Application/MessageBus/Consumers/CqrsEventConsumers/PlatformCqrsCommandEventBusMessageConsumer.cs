using System;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.Consumers.CqrsEventConsumers
{
    public interface IPlatformCqrsCommandEventBusMessageConsumer<TCommand> : IPlatformApplicationMessageBusConsumer<TCommand>
        where TCommand : class, IPlatformCqrsCommand, new()
    {
    }

    public abstract class PlatformCqrsCommandEventBusMessageConsumer<TCommand> : PlatformApplicationMessageBusConsumer<TCommand>, IPlatformCqrsCommandEventBusMessageConsumer<TCommand>
        where TCommand : class, IPlatformCqrsCommand, new()
    {
        protected PlatformCqrsCommandEventBusMessageConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }
    }
}
