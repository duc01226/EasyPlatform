using System;
using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;
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
        protected readonly IUnitOfWorkManager UowManager;

        protected PlatformUowEventBusConsumer(ILoggerFactory loggerFactory, IUnitOfWorkManager uowManager) : base(loggerFactory)
        {
            UowManager = uowManager;
        }

        public override async Task HandleAsync(PlatformEventBusMessage<TMessagePayload> message)
        {
            try
            {
                using (var uow = UowManager.Begin())
                {
                    await ExecuteInternalHandleAsync(message);
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

        protected virtual async Task ExecuteInternalHandleAsync(PlatformEventBusMessage<TMessagePayload> message)
        {
            await InternalHandleAsync(message);
        }
    }
}
