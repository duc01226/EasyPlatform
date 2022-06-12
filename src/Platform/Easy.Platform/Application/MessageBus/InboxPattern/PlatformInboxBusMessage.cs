using System;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Timing;
using Easy.Platform.Common.Validators;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Infrastructures.MessageBus;

namespace Easy.Platform.Application.MessageBus.InboxPattern
{
    public class PlatformInboxBusMessage : RootEntity<PlatformInboxBusMessage, string>, IRowVersionEntity
    {
        public const int IdMaxLength = 200;
        public const int MessageTypeFullNameMaxLength = 1000;
        public const int RoutingKeyMaxLength = 500;

        public string JsonMessage { get; set; }

        public string MessageTypeFullName { get; set; }

        public string RoutingKey { get; set; }

        /// <summary>
        /// Consumer Type FullName
        /// </summary>
        public string ConsumerBy { get; set; }

        public ConsumeStatuses ConsumeStatus { get; set; }

        public DateTime CreatedDate { get; set; }

        public DateTime LastConsumeDate { get; set; }

        public string LastConsumeError { get; set; }

        public Guid? ConcurrencyUpdateToken { get; set; }

        public static PlatformInboxBusMessage Create<TMessage>(
            TMessage message,
            string routingKey,
            string consumerBy,
            ConsumeStatuses consumeStatus,
            string lastConsumeError = null) where TMessage : class, IPlatformBusTrackableMessage
        {
            EnsureMessageValidForInbox(message);

            var nowDate = Clock.UtcNow;

            var result = new PlatformInboxBusMessage()
            {
                Id = BuildId(message, consumerBy).TakeTop(IdMaxLength),
                JsonMessage = PlatformJsonSerializer.Serialize(message),
                MessageTypeFullName = message.GetType().FullName.TakeTop(MessageTypeFullNameMaxLength),
                RoutingKey = routingKey.TakeTop(RoutingKeyMaxLength),
                LastConsumeDate = nowDate,
                CreatedDate = nowDate,
                ConsumerBy = consumerBy,
                ConsumeStatus = consumeStatus,
                LastConsumeError = lastConsumeError
            };

            return result;
        }

        public static string BuildId(IPlatformBusTrackableMessage message, string consumerBy)
        {
            return $"{message.TrackingId ?? Guid.NewGuid().ToString()}_{consumerBy}";
        }

        private static void EnsureMessageValidForInbox(IPlatformBusTrackableMessage message)
        {
            PlatformValidationResult
                .ValidIf(!string.IsNullOrEmpty(message.TrackingId), "Message TrackingId must be not null and empty")
                .EnsureValid(p => new ArgumentException(p.ErrorsMsg(), nameof(message)));
        }

        public enum ConsumeStatuses
        {
            New,
            Processing,
            Processed,
            Failed
        }
    }
}
