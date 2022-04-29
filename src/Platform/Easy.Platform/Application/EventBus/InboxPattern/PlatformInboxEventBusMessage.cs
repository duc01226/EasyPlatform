using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Infrastructures.EventBus;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Timing;
using Easy.Platform.Common.Validators;

namespace Easy.Platform.Application.EventBus.InboxPattern
{
    public class PlatformInboxEventBusMessage : RootEntity<PlatformInboxEventBusMessage, string>
    {
        public const int IdMaxLength = 200;
        public const int MessageTypeFullNameMaxLength = 1000;
        public const int RoutingKeyMaxLength = 500;

        public string JsonMessage { get; set; }

        public string MessageTypeFullName { get; set; }

        public string RoutingKey { get; set; }

        public string ConsumerBy { get; set; }

        public ConsumeStatuses ConsumeStatus { get; set; }

        public DateTime CreatedDate { get; set; }

        public DateTime LastConsumeDate { get; set; }

        public string LastConsumeError { get; set; }

        public static PlatformInboxEventBusMessage Create(
            IPlatformEventBusMessage message,
            string consumerBy,
            ConsumeStatuses consumeStatus,
            string lastConsumeError = null)
        {
            EnsureMessageValidForInbox(message);

            var nowDate = Clock.UtcNow;

            var result = new PlatformInboxEventBusMessage()
            {
                Id = BuildId(message, consumerBy).TakeTop(IdMaxLength),
                JsonMessage = JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value),
                MessageTypeFullName = message.GetType().FullName.TakeTop(MessageTypeFullNameMaxLength),
                RoutingKey = message.RoutingKey().ToString().TakeTop(RoutingKeyMaxLength),
                LastConsumeDate = nowDate,
                CreatedDate = nowDate,
                ConsumerBy = consumerBy,
                ConsumeStatus = consumeStatus,
                LastConsumeError = lastConsumeError
            };

            return result;
        }

        public static PlatformInboxEventBusMessage Create<TMessage>(TMessage customMessage, string routingKey, string consumerBy)
            where TMessage : class, IPlatformEventBusTrackableMessage, new()
        {
            var result = new PlatformInboxEventBusMessage()
            {
                Id = BuildId(customMessage, consumerBy),
                JsonMessage = JsonSerializer.Serialize(customMessage, PlatformJsonSerializer.CurrentOptions.Value),
                MessageTypeFullName = customMessage.GetType().FullName,
                RoutingKey = routingKey,
                LastConsumeDate = Clock.UtcNow,
                ConsumerBy = consumerBy
            };

            return result;
        }

        public static string BuildId(IPlatformEventBusTrackableMessage message, string consumerBy)
        {
            return $"{message.TrackingId ?? Guid.NewGuid().ToString()}_{consumerBy}";
        }

        private static void EnsureMessageValidForInbox(IPlatformEventBusMessage message)
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
