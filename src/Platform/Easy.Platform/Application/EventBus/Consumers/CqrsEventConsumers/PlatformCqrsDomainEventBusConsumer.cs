using System;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.Consumers.CqrsEventConsumers
{
    public interface IPlatformCqrsDomainEventBusConsumer<TMessagePayload> : IPlatformApplicationEventBusConsumer<TMessagePayload>
        where TMessagePayload : PlatformCqrsDomainEvent, new()
    {
    }

    public abstract class PlatformCqrsDomainEventBusConsumer<TMessagePayload> : PlatformApplicationEventBusConsumer<TMessagePayload>, IPlatformCqrsDomainEventBusConsumer<TMessagePayload>
        where TMessagePayload : PlatformCqrsDomainEvent, new()
    {
        protected PlatformCqrsDomainEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }
    }
}
