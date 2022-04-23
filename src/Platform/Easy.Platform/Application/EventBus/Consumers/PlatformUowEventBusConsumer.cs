using System;
using System.Text.Json;
using System.Threading.Tasks;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.Consumers
{
    public interface IPlatformUowEventBusConsumer<TMessagePayload> : IPlatformEventBusConsumer<TMessagePayload>
        where TMessagePayload : class, new()
    {
    }

    public abstract class PlatformUowEventBusConsumer<TMessagePayload> : PlatformEventBusConsumer<TMessagePayload>, IPlatformUowEventBusConsumer<TMessagePayload>
        where TMessagePayload : class, new()
    {
        protected readonly IUnitOfWorkManager UowManager;

        protected PlatformUowEventBusConsumer(ILoggerFactory loggerFactory, IUnitOfWorkManager uowManager) : base(loggerFactory)
        {
            UowManager = uowManager;
        }

        public override async Task HandleAsync(PlatformEventBusMessage<TMessagePayload> message, string routingKey)
        {
            try
            {
                using (var uow = UowManager.Begin())
                {
                    await ExecuteInternalHandleAsync(message, routingKey);
                    await uow.CompleteAsync();
                }
            }
            catch (Exception e)
            {
                Logger.LogError(e, $"[{GetType().Name}] There is an error when handle message {message.RoutingKey().CombinedStringKey}." +
                                   $"Message Info: ${JsonSerializer.Serialize(message)}");
                throw;
            }
        }

        protected virtual async Task ExecuteInternalHandleAsync(
            PlatformEventBusMessage<TMessagePayload> message,
            string routingKey)
        {
            await InternalHandleAsync(message, routingKey);
        }
    }
}
