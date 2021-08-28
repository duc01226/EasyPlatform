using System;
using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.EventBus;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Consumers
{
    public interface IPlatformUowEventBusConsumer<TMessagePayload> : IPlatformEventBusConsumer<TMessagePayload>
        where TMessagePayload : class, new()
    {
    }

    public abstract class PlatformUowEventBusConsumer<TMessagePayload> : PlatformEventBusConsumer<TMessagePayload>, IPlatformUowEventBusConsumer<TMessagePayload>
        where TMessagePayload : class, new()
    {
        private readonly IUnitOfWorkManager uowManager;

        protected PlatformUowEventBusConsumer(ILoggerFactory loggerFactory, IUnitOfWorkManager uowManager) : base(loggerFactory)
        {
            this.uowManager = uowManager;
        }

        public override async Task HandleAsync(PlatformEventBusMessage<TMessagePayload> message)
        {
            try
            {
                using (var uow = uowManager.Begin())
                {
                    await InternalHandleAsync(message);
                }
            }
            catch (Exception e)
            {
                Logger.LogError(e, $"[PlatformUnitOfWorkMessageConsumer] There is an error when handle message {message.RoutingKey().CombinedStringKey}." +
                                   $"Message Info: ${JsonSerializer.Serialize(message)}");
                throw;
            }
        }
    }
}
