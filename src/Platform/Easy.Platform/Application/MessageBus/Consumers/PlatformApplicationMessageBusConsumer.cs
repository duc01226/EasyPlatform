using System;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.Consumers
{
    public interface IPlatformApplicationMessageBusConsumer<TMessagePayload> : IPlatformApplicationBusFreeFormatMessageConsumer<PlatformBusMessage<TMessagePayload>>
        where TMessagePayload : class, new()
    {
    }

    public abstract class PlatformApplicationMessageBusConsumer<TMessagePayload> : PlatformApplicationBusFreeFormatMessageConsumer<PlatformBusMessage<TMessagePayload>>, IPlatformApplicationMessageBusConsumer<TMessagePayload>
        where TMessagePayload : class, new()
    {
        protected PlatformApplicationMessageBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }
    }
}
