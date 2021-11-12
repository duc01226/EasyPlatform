using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.EventBus;
using AngularDotnetPlatform.Platform.JsonSerialization;
using AngularDotnetPlatform.Platform.Timing;
using AngularDotnetPlatform.Platform.Validators;

namespace AngularDotnetPlatform.Platform.Application.EventBus
{
    public class PlatformInboxEventBusMessage : RootEntity<PlatformInboxEventBusMessage, string>
    {
        public const int IdMaxLength = 200;
        public const int MessageTypeFullNameMaxLength = 1000;
        public const int RoutingKeyMaxLength = 500;

        public string JsonMessage { get; set; }

        public string MessageTypeFullName { get; set; }

        public string RoutingKey { get; set; }

        public DateTime ConsumerDate { get; set; }

        public string ConsumerBy { get; set; }

        public static PlatformInboxEventBusMessage Create(IPlatformEventBusMessage message, string consumerBy)
        {
            EnsureMessageValidForInbox(message);

            return new PlatformInboxEventBusMessage()
            {
                Id = BuildId(message, consumerBy),
                JsonMessage = JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value),
                MessageTypeFullName = message.GetType().FullName,
                RoutingKey = message.RoutingKey(),
                ConsumerDate = Clock.UtcNow,
                ConsumerBy = consumerBy
            };
        }

        public static string BuildId(IPlatformEventBusMessage message, string consumerBy)
        {
            return $"{message.TrackingId}_{consumerBy}".Substring(0, message.TrackingId.Length <= IdMaxLength ? message.TrackingId.Length : IdMaxLength);
        }

        private static void EnsureMessageValidForInbox(IPlatformEventBusMessage message)
        {
            PlatformValidationResult
                .ValidIf(!string.IsNullOrEmpty(message.TrackingId), "Message TrackingId must be not null and empty")
                .EnsureValid(p => new ArgumentException(p.ErrorsMsg(), nameof(message)));
        }
    }
}
