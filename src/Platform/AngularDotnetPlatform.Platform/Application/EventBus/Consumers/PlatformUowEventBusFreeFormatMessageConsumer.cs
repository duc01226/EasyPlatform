using System;
using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.EventBus;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Consumers
{
    public interface IPlatformUowEventBusFreeFormatMessageConsumer<TMessage> : IPlatformEventBusFreeFormatMessageConsumer<TMessage>
        where TMessage : class, new()
    {
    }

    public abstract class PlatformUowEventBusFreeFormatMessageConsumer<TMessage> : PlatformEventBusFreeFormatMessageConsumer<TMessage>, IPlatformUowEventBusFreeFormatMessageConsumer<TMessage>
        where TMessage : class, new()
    {
        protected readonly IUnitOfWorkManager UowManager;

        protected PlatformUowEventBusFreeFormatMessageConsumer(ILoggerFactory loggerFactory, IUnitOfWorkManager uowManager) : base(loggerFactory)
        {
            UowManager = uowManager;
        }

        public override async Task HandleAsync(TMessage message, string routingKey)
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
                Logger.LogError(e, $"[{GetType().Name}] There is an error when handle message {routingKey}." +
                                   $"Message Info: ${JsonSerializer.Serialize(message)}");
                throw;
            }
        }

        protected virtual async Task ExecuteInternalHandleAsync(TMessage message, string routingKey)
        {
            await InternalHandleAsync(message, routingKey);
        }
    }
}
