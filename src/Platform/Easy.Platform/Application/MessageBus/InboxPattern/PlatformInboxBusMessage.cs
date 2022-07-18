using System.Linq.Expressions;
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
        public const double DefaultRetryProcessFailedMessageInSecondsUnit = 60;

        public static Expression<Func<PlatformInboxBusMessage, bool>> ToHandleInboxEventBusMessagesExpr(
            double messageProcessingMaximumTimeInSeconds)
        {
            return p => p.ConsumeStatus == ConsumeStatuses.New ||
                        (p.ConsumeStatus == ConsumeStatuses.Failed &&
                         (p.NextRetryProcessAfter == null || p.NextRetryProcessAfter <= DateTime.UtcNow)) ||
                        (p.ConsumeStatus == ConsumeStatuses.Processing &&
                         p.LastConsumeDate <= Clock.UtcNow.AddSeconds(-messageProcessingMaximumTimeInSeconds));
        }

        public static string BuildId(IPlatformBusTrackableMessage message, string consumerBy)
        {
            return $"{message.TrackingId ?? Guid.NewGuid().ToString()}_{consumerBy}";
        }

        public static DateTime CalculateNextRetryProcessAfter(
            int? retriedProcessCount,
            double retryProcessFailedMessageInSecondsUnit = DefaultRetryProcessFailedMessageInSecondsUnit)
        {
            return DateTime.UtcNow.AddSeconds(
                retryProcessFailedMessageInSecondsUnit * Math.Pow(2, retriedProcessCount ?? 0));
        }

        private static void EnsureMessageValidForInbox(IPlatformBusTrackableMessage message)
        {
            PlatformValidationResult
                .ValidIf(!string.IsNullOrEmpty(message.TrackingId), "Message TrackingId must be not null and empty")
                .EnsureValid(p => new ArgumentException(p.ErrorsMsg(), nameof(message)));
        }

        public string JsonMessage { get; set; }

        public string MessageTypeFullName { get; set; }

        public string RoutingKey { get; set; }

        /// <summary>
        /// Consumer Type FullName
        /// </summary>
        public string ConsumerBy { get; set; }

        public ConsumeStatuses ConsumeStatus { get; set; }

        public int? RetriedProcessCount { get; set; }

        public DateTime CreatedDate { get; set; }

        public DateTime LastConsumeDate { get; set; }

        public DateTime? NextRetryProcessAfter { get; set; }

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
                LastConsumeError = lastConsumeError,
                RetriedProcessCount = lastConsumeError != null ? 1 : 0
            };

            return result;
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
