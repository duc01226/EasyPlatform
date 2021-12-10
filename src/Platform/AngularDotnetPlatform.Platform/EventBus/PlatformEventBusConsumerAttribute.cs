using System;
using System.Linq;
using AngularDotnetPlatform.Platform.Application.Exceptions;
using FluentValidation;

namespace AngularDotnetPlatform.Platform.EventBus
{
    [AttributeUsage(AttributeTargets.Class, AllowMultiple = true)]
    public class PlatformEventBusConsumerAttribute : Attribute
    {
        /// <summary>
        /// MatchAllPatternValue = "*"
        /// </summary>
        public const string MatchAllPatternValue = "*";

        /// <summary>
        /// Initializes a new instance of the <see cref="PlatformEventBusConsumerAttribute"/> class.
        /// Pattern value support <see cref="MatchAllPatternValue"/> to match startWith (*XXX), endWith (XXX*) and contains (*XXX*)
        /// </summary>
        /// <param name="messageGroup"><see cref="PlatformEventBusMessageRoutingKey.MessageGroup"/></param>
        /// <param name="producerContext"><see cref="PlatformEventBusMessageRoutingKey.ProducerContext"/></param>
        /// <param name="messageType"><see cref="PlatformEventBusMessageRoutingKey.MessageType"/></param>
        /// <param name="messageAction"><see cref="PlatformEventBusMessageRoutingKey.MessageAction"/></param>
        public PlatformEventBusConsumerAttribute(
            string messageGroup,
            string producerContext,
            string messageType,
            string messageAction = MatchAllPatternValue)
        {
            MessageGroup = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(messageGroup);
            ProducerContext = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(producerContext);
            MessageType = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(messageType);
            MessageAction = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(messageAction) ?? MatchAllPatternValue;

            EnsureValid();
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="PlatformEventBusConsumerAttribute"/> class.
        /// Input combined ket pattern. Example: "AA.BB.CC", "AA.*.CC.*", ...
        /// </summary>
        /// <param name="combinedKeyPattern">Combined key pattern string represent for {messageGroup}.{producerContext}.{messageType}.{messageAction}</param>
        public PlatformEventBusConsumerAttribute(string combinedKeyPattern)
        {
            var combinedPatternParts = combinedKeyPattern.Split(".").ToList();

            MessageGroup = combinedPatternParts.ElementAtOrDefault(0);
            ProducerContext = combinedPatternParts.ElementAtOrDefault(1) ?? MatchAllPatternValue;
            MessageType = combinedPatternParts.ElementAtOrDefault(2) ?? MatchAllPatternValue;
            MessageAction = combinedPatternParts.ElementAtOrDefault(3) ?? MatchAllPatternValue;

            EnsureValid();
        }

        public PlatformEventBusConsumerAttribute(string messageGroup, string customRoutingKey)
        {
            MessageGroup = messageGroup;
            CustomRoutingKey = customRoutingKey;

            EnsureValid();
        }

        public static bool CanEventBusConsumerProcess(Type eventBusConsumerType, string routingKey, bool forceAtLeastOneAttributes = true)
        {
            var consumerAttributes = eventBusConsumerType
                .GetCustomAttributes(typeof(PlatformEventBusConsumerAttribute), true)
                .Select(p => (PlatformEventBusConsumerAttribute)p)
                .ToList();

            if (forceAtLeastOneAttributes && consumerAttributes.Count == 0)
            {
                throw new Exception(
                    $"[Developer Error]. At least one PlatformMessageConsumerAttribute must be applied for {eventBusConsumerType.FullName}");
            }

            return consumerAttributes.Any(p => p.IsMatchMessageRoutingKey(routingKey));
        }

        /// <summary>
        /// <see cref="PlatformEventBusMessageRoutingKey.MessageGroup"/>
        /// </summary>
        public string MessageGroup { get; }

        /// <summary>
        /// <see cref="PlatformEventBusMessageRoutingKey.ProducerContext"/>
        /// </summary>
        public string ProducerContext { get; }

        /// <summary>
        /// <see cref="PlatformEventBusMessageRoutingKey.MessageType"/>
        /// </summary>
        public string MessageType { get; }

        /// <summary>
        /// <see cref="PlatformEventBusMessageRoutingKey.MessageAction"/>
        /// </summary>
        public string MessageAction { get; }

        /// <summary>
        /// Custom free text routing key for this consumer to consume messages
        /// </summary>
        public string CustomRoutingKey { get; set; }

        public bool IsMatchMessageRoutingKey(string messageRoutingKey)
        {
            if (!string.IsNullOrEmpty(CustomRoutingKey))
            {
                return PlatformEventBusMessageRoutingKey.IsMatchRoutingKeyPattern(routingKeyPattern: CustomRoutingKey, messageRoutingKey) ||
                       PlatformEventBusMessageRoutingKey.IsMatchRoutingKeyPattern(
                           routingKeyPattern: PlatformEventBusMessageRoutingKey.BuildCombinedStringKey(MessageGroup, CustomRoutingKey),
                           messageRoutingKey);
            }
            else
            {
                return ToPlatformRoutingKey().Match(messageRoutingKey);
            }
        }

        public PlatformEventBusMessageRoutingKey ToPlatformRoutingKey()
        {
            var patternRoutingKey = PlatformEventBusMessageRoutingKey.New(
                messageGroup: MessageGroup,
                producerContext: ProducerContext,
                messageType: MessageType,
                messageAction: MessageAction);
            return patternRoutingKey;
        }

        public string GetConsumerBindingRoutingKey()
        {
            if (!string.IsNullOrEmpty(CustomRoutingKey))
            {
                return PlatformEventBusMessageRoutingKey.BuildCombinedStringKey(MessageGroup, CustomRoutingKey);
            }
            else
            {
                return PlatformEventBusMessageRoutingKey.BuildCombinedStringKey(MessageGroup, ProducerContext, MessageType);
            }
        }

        private void EnsureValid()
        {
            if (!string.IsNullOrEmpty(CustomRoutingKey))
            {
                PlatformEventBusMessageRoutingKey
                    .New(
                        MessageGroup,
                        PlatformEventBusMessageRoutingKey.MatchAllSingleGroupLevelChar,
                        CustomRoutingKey)
                    .EnsureValid(true);
            }
            else
            {
                ToPlatformRoutingKey().EnsureValid(true);
            }
        }
    }
}
