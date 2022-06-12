using System;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Timing;
using Easy.Platform.Common.Validators;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Infrastructures.MessageBus;

namespace Easy.Platform.Application.MessageBus.OutboxPattern
{
    public class PlatformOutboxBusMessage : RootEntity<PlatformOutboxBusMessage, string>, IRowVersionEntity
    {
        public const int IdMaxLength = 200;
        public const int RoutingKeyMaxLength = 500;
        public const int MessageTypeFullNameMaxLength = 1000;

        public string JsonMessage { get; set; }

        public string MessageTypeFullName { get; set; }

        public string RoutingKey { get; set; }

        public SendStatuses SendStatus { get; set; }

        public DateTime CreatedDate { get; set; }

        public DateTime LastSendDate { get; set; }

        public string LastSendError { get; set; }

        public Guid? ConcurrencyUpdateToken { get; set; }

        public static PlatformOutboxBusMessage Create<TMessage>(
            TMessage message,
            string routingKey,
            SendStatuses sendStatus,
            string lastSendError = null) where TMessage : IPlatformBusTrackableMessage
        {
            EnsureMessageValidForOutbox(message);

            var nowDate = Clock.UtcNow;

            var result = new PlatformOutboxBusMessage()
            {
                Id = BuildId(message).TakeTop(IdMaxLength),
                JsonMessage = PlatformJsonSerializer.Serialize(message),
                MessageTypeFullName = GetMessageTypeFullName(message.GetType()),
                RoutingKey = routingKey.TakeTop(RoutingKeyMaxLength),
                LastSendDate = nowDate,
                CreatedDate = nowDate,
                SendStatus = sendStatus,
                LastSendError = lastSendError
            };

            return result;
        }

        public static string GetMessageTypeFullName(Type messageType)
        {
            return messageType.AssemblyQualifiedName.TakeTop(MessageTypeFullNameMaxLength);
        }

        public static string BuildId(IPlatformBusTrackableMessage message)
        {
            return $"{message.TrackingId ?? Guid.NewGuid().ToString()}";
        }

        private static void EnsureMessageValidForOutbox(IPlatformBusTrackableMessage message)
        {
            PlatformValidationResult
                .ValidIf(!string.IsNullOrEmpty(message.TrackingId), "Message TrackingId must be not null and empty")
                .EnsureValid(p => new ArgumentException(p.ErrorsMsg(), nameof(message)));
        }

        public enum SendStatuses
        {
            New,
            Processing,
            Processed,
            Failed
        }
    }
}
