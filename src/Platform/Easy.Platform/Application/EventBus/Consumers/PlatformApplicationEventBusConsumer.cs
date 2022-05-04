using System;
using System.Text.Json;
using System.Threading.Tasks;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Domain.Repositories;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.Consumers
{
    public interface IPlatformApplicationEventBusConsumer<TMessagePayload> : IPlatformApplicationEventBusFreeFormatMessageConsumer<PlatformEventBusMessage<TMessagePayload>>
        where TMessagePayload : class, new()
    {
    }

    public abstract class PlatformApplicationEventBusConsumer<TMessagePayload> : PlatformApplicationEventBusFreeFormatMessageConsumer<PlatformEventBusMessage<TMessagePayload>>, IPlatformApplicationEventBusConsumer<TMessagePayload>
        where TMessagePayload : class, new()
    {
        protected PlatformApplicationEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }
    }
}
