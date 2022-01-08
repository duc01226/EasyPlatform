using System;
using AngularDotnetPlatform.Platform.Common.Timing;

namespace AngularDotnetPlatform.Platform.Infrastructures.EventBus
{
    public interface IPlatformEventBusMessage
    {
        public string TrackingId { get; set; }

        public PlatformEventBusMessageIdentity Identity { get; set; }

        public DateTime CreatedUtcDate { get; set; }

        public string MessageGroup { get; set; }

        public string ProducerContext { get; set; }

        public string MessageType { get; set; }

        public string MessageAction { get; set; }

        public PlatformEventBusMessageRoutingKey RoutingKey();
    }

    public interface IPlatformEventBusMessage<TPayload> : IPlatformEventBusMessage where TPayload : class, new()
    {
        public TPayload Payload { get; set; }
    }

    public class PlatformEventBusMessage<TPayload> : IPlatformEventBusMessage<TPayload> where TPayload : class, new()
    {
        private string messageGroup;
        private string producerContext;
        private string messageType;
        private string messageAction;

        public PlatformEventBusMessage()
        {
        }

        public string TrackingId { get; set; }
        public TPayload Payload { get; set; }
        public PlatformEventBusMessageIdentity Identity { get; set; }
        public DateTime CreatedUtcDate { get; set; } = Clock.UtcNow;

        public virtual string MessageGroup
        {
            get => messageGroup;
            set => messageGroup = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(value);
        }

        public string ProducerContext
        {
            get => producerContext;
            set => producerContext = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(value);
        }

        public virtual string MessageType
        {
            get => messageType;
            set => messageType = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(value);
        }

        public string MessageAction
        {
            get => messageAction;
            set => messageAction = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(value);
        }

        public static TEventBusMessage New<TEventBusMessage>(
            string trackId,
            TPayload payload,
            PlatformEventBusMessageIdentity identity,
            string producerContext,
            string messageAction = null)
            where TEventBusMessage : IPlatformEventBusMessage<TPayload>, new()
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

        public static PlatformEventBusMessage<TPayload> New(
            string trackId,
            TPayload payload,
            PlatformEventBusMessageIdentity identity,
            PlatformEventBusMessageRoutingKey routingKey)
        {
            var message = Activator.CreateInstance<PlatformEventBusMessage<TPayload>>();
            message.TrackingId = trackId ?? throw new ArgumentNullException(nameof(trackId));
            message.Payload = payload;
            message.Identity = identity ?? throw new ArgumentNullException(nameof(identity));
            message.MessageGroup = routingKey.MessageGroup;
            message.ProducerContext = routingKey.ProducerContext;
            message.MessageType = routingKey.MessageType;
            message.MessageAction = routingKey.MessageAction;

            return message;
        }

        public PlatformEventBusMessageRoutingKey RoutingKey()
        {
            return new PlatformEventBusMessageRoutingKey()
            {
                MessageGroup = MessageGroup,
                ProducerContext = ProducerContext,
                MessageType = MessageType,
                MessageAction = MessageAction,
            };
        }
    }

    public class PlatformEventBusMessageIdentity
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
