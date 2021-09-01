using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Utils;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.EventBus
{
    public interface IPlatformEventBusConsumer
    {
        bool CanProcess(PlatformEventBusMessageRoutingKey routingKey);

        /// <summary>
        /// Config the time in milliseconds to log warning if the process consumer time is over ProcessWarningTimeMilliseconds.
        /// </summary>
        long? ProcessWarningTimeMilliseconds();
    }

    public interface IPlatformEventBusConsumer<TMessagePayload> : IPlatformEventBusConsumer
        where TMessagePayload : class, new()
    {
        Task HandleAsync(PlatformEventBusMessage<TMessagePayload> message);
    }

    public abstract class PlatformEventBusConsumer : IPlatformEventBusConsumer
    {
        public const long DefaultProcessWarningTimeMilliseconds = 5000;

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

        public static async Task InvokeConsumer(
            IPlatformEventBusConsumer consumer,
            IPlatformEventBusMessage eventBusMessage,
            bool logConsumerProcessTime,
            long logConsumerProcessWarningTimeMilliseconds = DefaultProcessWarningTimeMilliseconds,
            ILogger logger = null)
        {
            if (logConsumerProcessTime)
            {
                if (logger == null)
                    throw new ArgumentNullException(nameof(logger));

                await Util.Tasks.ProfilingAsync(
                    asyncTask: () => DoInvokeConsumer(consumer, eventBusMessage),
                    afterExecution: elapsedMilliseconds =>
                    {
                        var message =
                            $"[ConsumerProcessTime] Elapsed {elapsedMilliseconds} in milliseconds processing for consumer {consumer.GetType().FullName} message with routing key: {eventBusMessage.RoutingKey()}. Message id {eventBusMessage.TrackingId}.";
                        if (elapsedMilliseconds < logConsumerProcessWarningTimeMilliseconds || elapsedMilliseconds < consumer.ProcessWarningTimeMilliseconds())
                        {
                            logger.LogInformation(message);
                        }
                        else
                        {
                            logger.LogWarning(message);
                        }
                    });
            }
            else
            {
                await DoInvokeConsumer(consumer, eventBusMessage);
            }
        }

        public bool CanProcess(PlatformEventBusMessageRoutingKey routingKey)
        {
            return PlatformEventBusConsumerAttribute.CanEventBusConsumerProcess(GetType(), routingKey);
        }

        public virtual long? ProcessWarningTimeMilliseconds()
        {
            return DefaultProcessWarningTimeMilliseconds;
        }

        private static async Task DoInvokeConsumer(IPlatformEventBusConsumer consumer, IPlatformEventBusMessage eventBusMessage)
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
