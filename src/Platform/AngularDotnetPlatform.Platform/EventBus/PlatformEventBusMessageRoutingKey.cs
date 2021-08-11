using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text.RegularExpressions;
using AngularDotnetPlatform.Platform.Validators;
using FluentValidation;

namespace AngularDotnetPlatform.Platform.EventBus
{
    public class PlatformEventBusMessageRoutingKey : IEqualityComparer<PlatformEventBusMessageRoutingKey>
    {
        /// <summary>
        /// MatchAllPatternValue = "*"
        /// </summary>
        public const string MatchAllSingleGroupLevelChar = "*";
        public const string CombinedStringKeySeparator = ".";
        public const string AutoFixKeyPartReplacer = "-";

        private string messageGroup;
        private string producerContext;
        private string messageType;
        private string messageAction;

        public static string BuildCombinedStringKey(string messageGroup, string producerContext, string messageType, string messageAction)
        {
            return $"{messageGroup}{CombinedStringKeySeparator}{producerContext}{CombinedStringKeySeparator}{messageType}{(string.IsNullOrEmpty(messageAction) ? "" : $"{CombinedStringKeySeparator}{messageAction}")}";
        }

        public static string BuildQueueName(string messageGroup, string producerContext, string messageType)
        {
            return $"{messageGroup}.{producerContext}.{messageType}";
        }

        public static PlatformEventBusMessageRoutingKey New(string messageGroup, string producerContext, string messageType, string messageAction = null)
        {
            return new PlatformEventBusMessageRoutingKey()
            {
                ProducerContext = producerContext,
                MessageGroup = messageGroup,
                MessageType = messageType,
                MessageAction = messageAction
            };
        }

        public static PlatformEventBusMessageRoutingKey New(string combinedKey)
        {
            var combinedPatternParts = combinedKey.Split(CombinedStringKeySeparator).ToList();

            return New(
                messageGroup: combinedPatternParts.ElementAtOrDefault(0),
                producerContext: combinedPatternParts.ElementAtOrDefault(1),
                messageType: combinedPatternParts.ElementAtOrDefault(2),
                messageAction: combinedPatternParts.ElementAtOrDefault(3));
        }

        public static bool MatchPattern(string pattern, string value)
        {
            if (pattern == MatchAllSingleGroupLevelChar || pattern == value)
                return true;
            if (pattern.Length > 1 && pattern.StartsWith(MatchAllSingleGroupLevelChar))
                return value.StartsWith(pattern.Substring(1));
            if (pattern.Length > 1 && pattern.EndsWith(MatchAllSingleGroupLevelChar))
                return value.EndsWith(pattern.Substring(0, pattern.Length - 1));
            if (pattern.Length > 2 &&
                pattern.StartsWith(MatchAllSingleGroupLevelChar) &&
                pattern.EndsWith(MatchAllSingleGroupLevelChar))
            {
                return value.Contains(pattern.Substring(1, pattern.Length - 1));
            }

            return false;
        }

        public static PlatformSingleValidator<PlatformEventBusMessageRoutingKey, string> KeyPartValidator(
            Expression<Func<PlatformEventBusMessageRoutingKey, string>> keyPartSelector)
        {
            return new PlatformSingleValidator<PlatformEventBusMessageRoutingKey, string>(
                keyPartSelector,
                p => p.NotNull()
                    .NotEmpty()
                    .Matches(new Regex($"^[^\\{CombinedStringKeySeparator}]+$")).WithMessage($"Key part can not contain key separator {CombinedStringKeySeparator}"));
        }

        public static PlatformValidator<PlatformEventBusMessageRoutingKey> Validator()
        {
            return PlatformValidator<PlatformEventBusMessageRoutingKey>.Create(
                KeyPartValidator(p => p.MessageGroup),
                KeyPartValidator(p => p.ProducerContext),
                KeyPartValidator(p => p.MessageType),
                KeyPartValidator(p => p.MessageAction));
        }

        /// <summary>
        /// First group level of message <see cref="CombinedStringKey"/>.
        /// Used to determine the exactly message type suffix group. Usually equivalent to message Class name suffix.
        /// Example: CommandEvent, EntityEvent, AuditLog, etc...
        /// </summary>
        public string MessageGroup
        {
            get => messageGroup;
            set => messageGroup = AutoFixKeyPart(value);
        }

        /// <summary>
        /// Second group level of message <see cref="CombinedStringKey"/>.
        /// Used to determine which application micro service publish this message
        /// </summary>
        public string ProducerContext
        {
            get => producerContext;
            set => producerContext = AutoFixKeyPart(value);
        }

        /// <summary>
        /// Third group level of message <see cref="CombinedStringKey"/>.
        /// Used to determine the exactly message type. Usually equivalent to message Class name.
        /// Example: RegisterNewUserCommandEvent, UserEntityEvent
        /// </summary>
        public string MessageType
        {
            get => messageType;
            set => messageType = AutoFixKeyPart(value);
        }

        /// <summary>
        /// Final group level of message <see cref="CombinedStringKey"/>.
        /// This is Optional. Used to determine specific action on the <see cref="MessageType"/>
        /// Example: Created,Updated,Deleted, etc..
        /// </summary>
        public string MessageAction
        {
            get => messageAction;
            set => messageAction = AutoFixKeyPart(value);
        }

        /// <summary>
        /// Combined of "MessageGroup.ProducerContext.MessageType.MessageAction"
        /// </summary>
        public string CombinedStringKey =>
            BuildCombinedStringKey(MessageGroup, ProducerContext, MessageType, MessageAction);

        public string QueueName(string fallbackProducerContext)
        {
            return BuildQueueName(MessageGroup, ProducerContext ?? fallbackProducerContext, MessageType);
        }

        public bool Equals(PlatformEventBusMessageRoutingKey x, PlatformEventBusMessageRoutingKey y)
        {
            if (ReferenceEquals(x, y))
                return true;
            if (x is null)
                return false;
            if (y is null)
                return false;
            if (x.GetType() != y.GetType())
                return false;
            return x.CombinedStringKey == y.CombinedStringKey;
        }

        public int GetHashCode(PlatformEventBusMessageRoutingKey obj)
        {
            return HashCode.Combine(obj.CombinedStringKey);
        }

        public bool Match(PlatformEventBusMessageRoutingKey routingKey)
        {
            return MatchPattern(ProducerContext, routingKey.ProducerContext) &&
                   MatchPattern(MessageGroup, routingKey.MessageGroup) &&
                   MatchPattern(MessageType, routingKey.MessageType) &&
                   MatchPattern(MessageAction, routingKey.MessageAction);
        }

        public static string AutoFixKeyPart(string keyPart)
        {
            return keyPart?.Replace(CombinedStringKeySeparator, AutoFixKeyPartReplacer);
        }
    }
}
