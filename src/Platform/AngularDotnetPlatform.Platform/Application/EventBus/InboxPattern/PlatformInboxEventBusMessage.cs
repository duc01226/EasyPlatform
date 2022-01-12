using System;
using System.Text.Json;
using AngularDotnetPlatform.Platform.Common.Extensions;
using AngularDotnetPlatform.Platform.Common.JsonSerialization;
using AngularDotnetPlatform.Platform.Common.Timing;
using AngularDotnetPlatform.Platform.Common.Validators;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;

namespace AngularDotnetPlatform.Platform.Application.EventBus.InboxPattern
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

            var result = new PlatformInboxEventBusMessage()
            {
                Id = BuildId(message, consumerBy).TakeTop(IdMaxLength),
                JsonMessage = JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value),
                MessageTypeFullName = message.GetType().FullName.TakeTop(MessageTypeFullNameMaxLength),
                RoutingKey = message.RoutingKey().ToString().TakeTop(RoutingKeyMaxLength),
                ConsumerDate = Clock.UtcNow,
                ConsumerBy = consumerBy
            };

            return result;
        }

        public static PlatformInboxEventBusMessage Create<TMessage>(TMessage customMessage, string routingKey, string consumerBy)
            where TMessage : class, new()
        {
            var result = new PlatformInboxEventBusMessage()
            {
                Id = BuildId(customMessage, consumerBy),
                JsonMessage = JsonSerializer.Serialize(customMessage, PlatformJsonSerializer.CurrentOptions.Value),
                MessageTypeFullName = customMessage.GetType().FullName,
                RoutingKey = routingKey,
                ConsumerDate = Clock.UtcNow,
                ConsumerBy = consumerBy
            };

            return result;
        }

        public static string BuildId(IPlatformEventBusMessage message, string consumerBy)
        {
            return $"{message.TrackingId}_{consumerBy}";
        }

        public static string BuildId(object customMessage, string consumerBy)
        {
            return $"{customMessage.GetHashCode()}_{consumerBy}";
        }

        private static void EnsureMessageValidForInbox(IPlatformEventBusMessage message)
        {
            PlatformValidationResult
                .ValidIf(!string.IsNullOrEmpty(message.TrackingId), "Message TrackingId must be not null and empty")
                .EnsureValid(p => new ArgumentException(p.ErrorsMsg(), nameof(message)));
        }
    }
}
