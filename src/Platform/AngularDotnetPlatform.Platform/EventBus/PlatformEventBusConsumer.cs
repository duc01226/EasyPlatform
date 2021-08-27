using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.EventBus
{
    public interface IPlatformEventBusConsumer
    {
        bool CanProcess(PlatformEventBusMessageRoutingKey routingKey);
    }

    public interface IPlatformEventBusConsumer<TMessagePayload> : IPlatformEventBusConsumer
        where TMessagePayload : class, new()
    {
        Task HandleAsync(PlatformEventBusMessage<TMessagePayload> message);
    }

    public abstract class PlatformEventBusConsumer<TMessagePayload> : IPlatformEventBusConsumer<TMessagePayload>
        where TMessagePayload : class, new()
    {
        protected readonly ILogger Logger;

        public PlatformEventBusConsumer(ILoggerFactory loggerFactory)
        {
            Logger = loggerFactory.CreateLogger(GetType());
        }

        public virtual bool CanProcess(PlatformEventBusMessageRoutingKey routingKey)
        {
            var consumerAttributes = GetType()
                .GetCustomAttributes(typeof(PlatformEventBusConsumerAttribute), true)
                .Select(p => (PlatformEventBusConsumerAttribute)p)
                .ToList();

            if (consumerAttributes.Count == 0)
            {
                throw new Exception(
                    $"[Developer Error]. At least one PlatformMessageConsumerAttribute must be applied for {GetType().FullName}");
            }

            return consumerAttributes.Any(p => p.IsMatchMessageRoutingKey(routingKey));
        }

        public virtual async Task HandleAsync(PlatformEventBusMessage<TMessagePayload> message)
        {
            try
            {
                await InternalHandleAsync(message);
            }
            catch (Exception e)
            {
                Logger.LogError(e, $"[MessageConsumerError] There is an error when handle message {message.RoutingKey().CombinedStringKey}." +
                                   $"Message Info: ${JsonSerializer.Serialize(message)}");
                throw;
            }
        }

        protected abstract Task InternalHandleAsync(PlatformEventBusMessage<TMessagePayload> message);
    }
}
