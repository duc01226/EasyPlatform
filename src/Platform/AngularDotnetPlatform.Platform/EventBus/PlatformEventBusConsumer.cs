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

    public abstract class PlatformEventBusConsumer : IPlatformEventBusConsumer
    {
        /// <summary>
        /// Get <see cref="PlatformEventBusMessage{TPayload}"/> concrete message type from a <see cref="IPlatformEventBusConsumer"/> consumer
        /// <br/>
        /// Get a generic type: PlatformEventBusMessage{TMessage} where TMessage = TMessagePayload
        /// of IPlatformEventBusConsumer{TMessagePayload}
        /// </summary>
        public static Type GetConsumerMessageType(IPlatformEventBusConsumer consumer)
        {
            var genericConsumerType = consumer
                .GetType()
                .GetInterfaces()
                .FirstOrDefault(x =>
                    x.IsGenericType &&
                    x.GetGenericTypeDefinition() == typeof(IPlatformEventBusConsumer<>));

            // To ensure that the consumer implements the correct interface IOpalMessageConsumer<>.
            // The IOpalMessageConsumer (non-generic version) is used for Interface Marker only.
            if (genericConsumerType == null)
            {
                throw new Exception("Incorrect implementation of IPlatformMessageConsumer<>");
            }

            // Get generic type IPlatformMessageConsumer<TMessage> -> TMessage
            var messageConsumerPayloadType = genericConsumerType.GetGenericArguments()[0];
            // Get type of generic PlatformEventBusMessage<>
            var messageType = typeof(PlatformEventBusMessage<>);

            // Make a generic type: PlatformEventBusMessage<TMessage>
            var messageForConsumerPayloadType =
                messageType.MakeGenericType(messageConsumerPayloadType);

            return messageForConsumerPayloadType;
        }

        public static async Task InvokeConsumer(IPlatformEventBusConsumer consumer, IPlatformEventBusMessage eventBusMessage)
        {
            // Get HandleAsync method.
            var methodInfo = consumer.GetType()
                .GetMethod(nameof(IPlatformEventBusConsumer<object>.HandleAsync));
            if (methodInfo == null)
            {
                throw new Exception(
                    $"Can not find execution method from {typeof(IPlatformEventBusConsumer<>).FullName}");
            }

            try
            {
                // Invoke the method.
                var invokeResult = methodInfo.Invoke(consumer, new[] { eventBusMessage });
                if (invokeResult is Task invokeTask)
                    await invokeTask;
            }
            catch (Exception e)
            {
                throw new PlatformInvokeConsumerException(e, consumer.GetType().FullName, eventBusMessage);
            }
        }

        public bool CanProcess(PlatformEventBusMessageRoutingKey routingKey)
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
    }

    public abstract class PlatformEventBusConsumer<TMessagePayload> : PlatformEventBusConsumer, IPlatformEventBusConsumer<TMessagePayload>
        where TMessagePayload : class, new()
    {
        protected readonly ILogger Logger;

        public PlatformEventBusConsumer(ILoggerFactory loggerFactory)
        {
            Logger = loggerFactory.CreateLogger(GetType());
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
