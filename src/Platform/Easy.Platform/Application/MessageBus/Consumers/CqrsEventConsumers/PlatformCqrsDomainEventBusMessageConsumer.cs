using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.Consumers.CqrsEventConsumers
{
    public interface
        IPlatformCqrsDomainEventBusMessageConsumer<TMessagePayload> : IPlatformApplicationMessageBusConsumer<
            TMessagePayload>
        where TMessagePayload : PlatformCqrsDomainEvent, new()
    {
    }

    public abstract class PlatformCqrsDomainEventBusMessageConsumer<TMessagePayload> :
        PlatformApplicationMessageBusConsumer<TMessagePayload>,
        IPlatformCqrsDomainEventBusMessageConsumer<TMessagePayload>
        where TMessagePayload : PlatformCqrsDomainEvent, new()
    {
        protected PlatformCqrsDomainEventBusMessageConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }
    }
}
