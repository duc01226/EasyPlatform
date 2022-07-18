using System.Text.Json;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Utils;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Infrastructures.MessageBus
{
    public interface IPlatformMessageBusBaseConsumer
    {
        /// <summary>
        /// Config the time in milliseconds to log warning if the process consumer time is over ProcessWarningTimeMilliseconds.
        /// </summary>
        long? SlowProcessWarningTimeMilliseconds();

        JsonSerializerOptions CustomJsonSerializerOptions();
    }

    public interface IPlatformMessageBusBaseConsumer<in TMessage> : IPlatformMessageBusBaseConsumer
        where TMessage : class, new()
    {
        Task HandleAsync(TMessage message, string routingKey);
    }

    public interface
        IPlatformMessageBusConsumer<TMessagePayload> : IPlatformMessageBusBaseConsumer<
            PlatformBusMessage<TMessagePayload>>
        where TMessagePayload : class, new()
    {
    }

    public interface
        IPlatformMessageBusFreeFormatMessageConsumer<in TMessage> : IPlatformMessageBusBaseConsumer<TMessage>
        where TMessage : class, IPlatformBusFreeFormatMessage, new()
    {
    }

    public abstract class PlatformMessageBusBaseConsumer : IPlatformMessageBusBaseConsumer
    {
        public const long DefaultProcessWarningTimeMilliseconds = 5000;

        /// <summary>
        /// Get <see cref="PlatformBusMessage{TPayload}"/> concrete message type from a <see cref="IPlatformMessageBusBaseConsumer"/> consumer
        /// <br/>
        /// Get a generic type: PlatformEventBusMessage{TMessage} where TMessage = TMessagePayload
        /// of IPlatformEventBusConsumer{TMessagePayload}
        /// </summary>
        public static Type GetConsumerMessageType(IPlatformMessageBusBaseConsumer consumer)
        {
            var genericConsumerType = consumer
                .GetType()
                .GetInterfaces()
                .FirstOrDefault(
                    x =>
                        x.IsGenericType &&
                        (x.GetGenericTypeDefinition() == typeof(IPlatformMessageBusConsumer<>) ||
                         x.GetGenericTypeDefinition() == typeof(IPlatformMessageBusFreeFormatMessageConsumer<>)));

            // WHY: To ensure that the consumer implements the correct interface IPlatformEventBusConsumer<> OR IPlatformEventBusCustomMessageConsumer<>.
            // The IPlatformEventBusConsumer (non-generic version) is used for Interface Marker only.
            if (genericConsumerType == null)
            {
                throw new Exception(
                    "Incorrect implementation of IPlatformMessageConsumer<> or IPlatformEventBusCustomMessageConsumer<>");
            }

            if (genericConsumerType.GetGenericTypeDefinition() == typeof(IPlatformMessageBusConsumer<>))
            {
                // Get generic type IPlatformMessageConsumer<TMessagePayload> -> TMessage
                var consumerMessagePayloadType = genericConsumerType.GetGenericArguments()[0];
                var messageType = typeof(PlatformBusMessage<>);

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
            IPlatformMessageBusBaseConsumer consumer,
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
                    asyncTask: () => DoInvokeConsumer(
                        consumer,
                        eventBusMessage,
                        routingKey,
                        cancellationToken),
                    afterExecution: elapsedMilliseconds =>
                    {
                        var platformEventBusTrackableMessage = eventBusMessage as IPlatformBusTrackableMessage;
                        var logMessage =
                            $"[ElapsedMilliseconds:{elapsedMilliseconds}]. [Consumer:{consumer.GetType().FullName}]. [RoutingKey:{routingKey}]. [TrackingId:{platformEventBusTrackableMessage?.TrackingId ?? "n/a"}].";

                        var toCheckSlowProcessWarningTimeMilliseconds = consumer.SlowProcessWarningTimeMilliseconds() ??
                                                                        slowProcessWarningTimeMilliseconds;
                        if (elapsedMilliseconds >= toCheckSlowProcessWarningTimeMilliseconds)
                        {
                            logger.LogError(
                                $"[SlowConsumerProcessTime]. [SlowProcessWarningTimeMilliseconds:{toCheckSlowProcessWarningTimeMilliseconds}]. {logMessage}. [MessageContent:{PlatformJsonSerializer.Serialize(eventBusMessage)}]");
                        }
                        else
                        {
                            logger.LogInformationIfEnabled($"[ConsumerProcessTime] {logMessage}");
                        }
                    });
            }
            else
            {
                await DoInvokeConsumer(
                    consumer,
                    eventBusMessage,
                    routingKey,
                    cancellationToken);
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

        private static async Task DoInvokeConsumer(
            IPlatformMessageBusBaseConsumer consumer,
            object eventBusMessage,
            string routingKey,
            CancellationToken cancellationToken = default)
        {
            var handleMethodName = nameof(IPlatformMessageBusBaseConsumer<object>.HandleAsync);

            var methodInfo = consumer.GetType().GetMethod(handleMethodName);
            if (methodInfo == null)
            {
                throw new Exception(
                    $"Can not find execution handle method {handleMethodName} from {consumer.GetType().FullName}");
            }

            try
            {
                var invokeResult = methodInfo.Invoke(
                    consumer,
                    new[]
                    {
                        eventBusMessage,
                        routingKey
                    });
                if (invokeResult is Task invokeTask)
                    await invokeTask;
            }
            catch (Exception e)
            {
                throw new PlatformInvokeConsumerException(e, consumer.GetType().FullName, eventBusMessage);
            }
        }
    }

    public abstract class PlatformMessageBusBaseConsumer<TMessage> : PlatformMessageBusBaseConsumer,
        IPlatformMessageBusBaseConsumer<TMessage>
        where TMessage : class, new()
    {
        protected readonly ILogger Logger;

        public PlatformMessageBusBaseConsumer(ILoggerFactory loggerFactory)
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
                Logger.LogError(
                    e,
                    $"Error Consume message [RoutingKey:{routingKey}], [Type:{message.GetType().GetGenericTypeName()}].{Environment.NewLine}" +
                    $"Message Info: ${PlatformJsonSerializer.Serialize(message)}.{Environment.NewLine}");
                throw;
            }
        }

        protected abstract Task InternalHandleAsync(TMessage message, string routingKey);
    }

    public abstract class PlatformMessageBusFreeFormatMessageConsumer<TMessage> :
        PlatformMessageBusBaseConsumer<TMessage>,
        IPlatformMessageBusFreeFormatMessageConsumer<TMessage>
        where TMessage : class, IPlatformBusFreeFormatMessage, new()
    {
        protected PlatformMessageBusFreeFormatMessageConsumer(ILoggerFactory loggerFactory) : base(loggerFactory)
        {
        }
    }
}
