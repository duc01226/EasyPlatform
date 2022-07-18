using Easy.Platform.Common.Timing;

namespace Easy.Platform.Infrastructures.MessageBus
{
    public interface IPlatformBusMessage : IPlatformBusFreeFormatMessage
    {
        public PlatformBusMessageIdentity Identity { get; set; }

        public string MessageGroup { get; set; }

        public string ProducerContext { get; set; }

        public string MessageType { get; set; }

        public string MessageAction { get; set; }

        public PlatformBusMessageRoutingKey RoutingKey();
    }

    public interface IPlatformBusMessage<TPayload> : IPlatformBusMessage where TPayload : class, new()
    {
        public TPayload Payload { get; set; }
    }

    public class PlatformBusMessage<TPayload> : IPlatformBusMessage<TPayload> where TPayload : class, new()
    {
        private string messageGroup;
        private string producerContext;
        private string messageType;
        private string messageAction;

        public PlatformBusMessage()
        {
        }

        public string TrackingId { get; set; }
        public TPayload Payload { get; set; }
        public PlatformBusMessageIdentity Identity { get; set; }
        public DateTime CreatedUtcDate { get; set; } = Clock.UtcNow;

        public virtual string MessageGroup
        {
            get => messageGroup;
            set => messageGroup = PlatformBusMessageRoutingKey.AutoFixKeyPart(value);
        }

        public string ProducerContext
        {
            get => producerContext;
            set => producerContext = PlatformBusMessageRoutingKey.AutoFixKeyPart(value);
        }

        public virtual string MessageType
        {
            get => messageType;
            set => messageType = PlatformBusMessageRoutingKey.AutoFixKeyPart(value);
        }

        public string MessageAction
        {
            get => messageAction;
            set => messageAction = PlatformBusMessageRoutingKey.AutoFixKeyPart(value);
        }

        public static TEventBusMessage New<TEventBusMessage>(
            string trackId,
            TPayload payload,
            PlatformBusMessageIdentity identity,
            string producerContext,
            string messageAction = null)
            where TEventBusMessage : IPlatformBusMessage<TPayload>, new()
        {
            var message = Activator.CreateInstance<TEventBusMessage>();
            message.TrackingId = trackId;
            message.Payload = payload;
            message.Identity = identity ?? throw new ArgumentNullException(nameof(identity));
            message.ProducerContext = producerContext;
            if (messageAction != null)
                message.MessageAction = messageAction;
            return message;
        }

        public static PlatformBusMessage<TPayload> New(
            string trackId,
            TPayload payload,
            PlatformBusMessageIdentity identity,
            PlatformBusMessageRoutingKey routingKey)
        {
            var message = Activator.CreateInstance<PlatformBusMessage<TPayload>>();
            message.TrackingId = trackId ?? throw new ArgumentNullException(nameof(trackId));
            message.Payload = payload;
            message.Identity = identity ?? throw new ArgumentNullException(nameof(identity));
            message.MessageGroup = routingKey.MessageGroup;
            message.ProducerContext = routingKey.ProducerContext;
            message.MessageType = routingKey.MessageType;
            message.MessageAction = routingKey.MessageAction;

            return message;
        }

        public PlatformBusMessageRoutingKey RoutingKey()
        {
            return new PlatformBusMessageRoutingKey()
            {
                MessageGroup = MessageGroup,
                ProducerContext = ProducerContext,
                MessageType = MessageType,
                MessageAction = MessageAction,
            };
        }
    }

    public class PlatformBusMessageIdentity
    {
        /// <summary>
        /// Indicate which user id generate the message
        /// </summary>
        public string UserId { get; set; }

        /// <summary>
        /// Indicate which request id generate the message
        /// </summary>
        public string RequestId { get; set; }

        /// <summary>
        /// Indicate which user name generate the message
        /// </summary>
        public string UserName { get; set; }
    }
}
