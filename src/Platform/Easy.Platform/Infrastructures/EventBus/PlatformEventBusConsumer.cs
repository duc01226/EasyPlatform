using System;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Utils;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Infrastructures.EventBus
{
    public interface IPlatformEventBusBaseConsumer
    {
        /// <summary>
        /// Config the time in milliseconds to log warning if the process consumer time is over ProcessWarningTimeMilliseconds.
        /// </summary>
        long? SlowProcessWarningTimeMilliseconds();

        JsonSerializerOptions CustomJsonSerializerOptions();
    }

    public interface IPlatformEventBusBaseConsumer<TMessage> : IPlatformEventBusBaseConsumer
        where TMessage : class, new()
    {
        Task HandleAsync(TMessage message, string routingKey);
    }

    public interface IPlatformEventBusConsumer<TMessagePayload> : IPlatformEventBusBaseConsumer<PlatformEventBusMessage<TMessagePayload>>
        where TMessagePayload : class, new()
    {
    }

    public interface IPlatformEventBusFreeFormatMessageConsumer<TMessage> : IPlatformEventBusBaseConsumer<TMessage>
        where TMessage : class, IPlatformEventBusFreeFormatMessage, new()
    {
    }

    public abstract class PlatformEventBusBaseConsumer : IPlatformEventBusBaseConsumer
    {
        public const long DefaultProcessWarningTimeMilliseconds = 5000;

        /// <summary>
        /// Get <see cref="PlatformEventBusMessage{TPayload}"/> concrete message type from a <see cref="IPlatformEventBusBaseConsumer"/> consumer
        /// <br/>
        /// Get a generic type: PlatformEventBusMessage{TMessage} where TMessage = TMessagePayload
        /// of IPlatformEventBusConsumer{TMessagePayload}
        /// </summary>
        public static Type GetConsumerMessageType(IPlatformEventBusBaseConsumer consumer)
        {
            var genericConsumerType = consumer
                .GetType()
                .GetInterfaces()
                .FirstOrDefault(x =>
                    x.IsGenericType &&
                    (x.GetGenericTypeDefinition() == typeof(IPlatformEventBusConsumer<>) ||
                     x.GetGenericTypeDefinition() == typeof(IPlatformEventBusFreeFormatMessageConsumer<>)));

            // To ensure that the consumer implements the correct interface IPlatformEventBusConsumer<> OR IPlatformEventBusCustomMessageConsumer<>.
            // The IPlatformEventBusConsumer (non-generic version) is used for Interface Marker only.
            if (genericConsumerType == null)
            {
                throw new Exception("Incorrect implementation of IPlatformMessageConsumer<> or IPlatformEventBusCustomMessageConsumer<>");
            }

            if (genericConsumerType.GetGenericTypeDefinition() == typeof(IPlatformEventBusConsumer<>))
            {
                // Get generic type IPlatformMessageConsumer<TMessagePayload> -> TMessage
                var consumerMessagePayloadType = genericConsumerType.GetGenericArguments()[0];
                // Get type of generic PlatformEventBusMessage<>
                var messageType = typeof(PlatformEventBusMessage<>);

                // Make a generic type: PlatformEventBusMessage<TMessage>
                var messageForConsumerPayloadType =
                    messageType.MakeGenericType(consumerMessagePayloadType);

                return messageForConsumerPayloadType;
            }
            else
            {
                return genericConsumerType.GetGenericArguments()[0];
            }
        }

        public static async Task InvokeConsumerAsync(
            IPlatformEventBusBaseConsumer consumer,
            object eventBusMessage,
            string routingKey,
            bool isLogConsumerProcessTime,
            double slowProcessWarningTimeMilliseconds = DefaultProcessWarningTimeMilliseconds,
            ILogger logger = null,
            CancellationToken cancellationToken = default)
        {
            if (isLogConsumerProcessTime)
            {
                if (logger == null)
                    throw new ArgumentNullException(nameof(logger));

                await Util.Tasks.ProfilingAsync(
                    asyncTask: () => DoInvokeConsumer(consumer, eventBusMessage, routingKey, cancellationToken),
                    afterExecution: elapsedMilliseconds =>
                    {
                        var platformEventBusTrackableMessage = eventBusMessage as IPlatformEventBusTrackableMessage;
                        var logMessage =
                            $"[ElapsedMilliseconds:{elapsedMilliseconds}]. [Consumer:{consumer.GetType().FullName}]. [RoutingKey:{routingKey}]. [TrackingId:{platformEventBusTrackableMessage?.TrackingId ?? "n/a"}].";

                        var toCheckSlowProcessWarningTimeMilliseconds = consumer.SlowProcessWarningTimeMilliseconds() ??
                                                                        slowProcessWarningTimeMilliseconds;
                        if (elapsedMilliseconds >= toCheckSlowProcessWarningTimeMilliseconds)
                        {
                            logger.LogError($"[SlowConsumerProcessTime]. [SlowProcessWarningTimeMilliseconds:{toCheckSlowProcessWarningTimeMilliseconds}]. {logMessage}. [MessageContent:{PlatformJsonSerializer.Serialize(eventBusMessage)}]");
                        }
                        else
                        {
                            logger.LogInformationIfEnabled($"[ConsumerProcessTime] {logMessage}");
                        }
                    });
            }
            else
            {
                await DoInvokeConsumer(consumer, eventBusMessage, routingKey, cancellationToken);
            }
        }

        public virtual long? SlowProcessWarningTimeMilliseconds()
        {
            return DefaultProcessWarningTimeMilliseconds;
        }

        public virtual JsonSerializerOptions CustomJsonSerializerOptions()
        {
            return null;
        }

        private static async Task DoInvokeConsumer(IPlatformEventBusBaseConsumer consumer, object eventBusMessage, string routingKey, CancellationToken cancellationToken = default)
        {
            var handleMethodName = nameof(IPlatformEventBusBaseConsumer<object>.HandleAsync);

            var methodInfo = consumer.GetType().GetMethod(handleMethodName);
            if (methodInfo == null)
            {
                throw new Exception(
                    $"Can not find execution handle method {handleMethodName} from {consumer.GetType().FullName}");
            }

            try
            {
                // Invoke the method.
                var invokeResult = methodInfo.Invoke(consumer, new[] { eventBusMessage, routingKey });
                if (invokeResult is Task invokeTask)
                    await invokeTask;
            }
            catch (Exception e)
            {
                throw new PlatformInvokeConsumerException(e, consumer.GetType().FullName, eventBusMessage);
            }
        }
    }

    public abstract class PlatformEventBusBaseConsumer<TMessage> : PlatformEventBusBaseConsumer, IPlatformEventBusBaseConsumer<TMessage>
        where TMessage : class, new()
    {
        protected readonly ILogger Logger;

        public PlatformEventBusBaseConsumer(ILoggerFactory loggerFactory)
        {
            Logger = loggerFactory.CreateLogger(GetType());
        }

        public virtual async Task HandleAsync(TMessage message, string routingKey)
        {
            try
            {
                await InternalHandleAsync(message, routingKey);
            }
            catch (Exception e)
            {
                Logger.LogError(e, $"Error Consume message [RoutingKey:{routingKey}], [Type:{message.GetType().GetGenericTypeName()}].{Environment.NewLine}" +
                                   $"Message Info: ${PlatformJsonSerializer.Serialize(message)}.{Environment.NewLine}");
                throw;
            }
        }

        protected abstract Task InternalHandleAsync(TMessage message, string routingKey);
    }

    public abstract class PlatformEventBusFreeFormatMessageConsumer<TMessage> : PlatformEventBusBaseConsumer<TMessage>, IPlatformEventBusFreeFormatMessageConsumer<TMessage>
        where TMessage : class, IPlatformEventBusFreeFormatMessage, new()
    {
        protected PlatformEventBusFreeFormatMessageConsumer(ILoggerFactory loggerFactory) : base(loggerFactory)
        {
        }
    }

    public abstract class PlatformEventBusConsumer<TMessagePayload> : PlatformEventBusFreeFormatMessageConsumer<PlatformEventBusMessage<TMessagePayload>>, IPlatformEventBusConsumer<TMessagePayload>
        where TMessagePayload : class, new()
    {
        protected PlatformEventBusConsumer(ILoggerFactory loggerFactory) : base(loggerFactory)
        {
        }
    }
}
