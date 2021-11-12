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
        /// <param name="additionalCustomRoutingKeys"><see cref="AdditionalCustomRoutingKeys"/></param>
        public PlatformEventBusConsumerAttribute(
            string messageGroup,
            string producerContext,
            string messageType,
            string messageAction = MatchAllPatternValue,
            string[] additionalCustomRoutingKeys = null)
        {
            MessageGroup = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(messageGroup);
            ProducerContext = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(producerContext);
            MessageType = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(messageType);
            MessageAction = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(messageAction) ?? MatchAllPatternValue;
            AdditionalCustomRoutingKeys = additionalCustomRoutingKeys ?? Array.Empty<string>();

            EnsureValid();
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="PlatformEventBusConsumerAttribute"/> class.
        /// Input combined ket pattern. Example: "AA.BB.CC", "AA.*.CC.*", ...
        /// </summary>
        /// <param name="combinedKeyPattern">Combined key pattern string represent for {messageGroup}.{producerContext}.{messageType}.{messageAction}</param>
        /// <param name="additionalCustomRoutingKeys"><see cref="AdditionalCustomRoutingKeys"/></param>
        public PlatformEventBusConsumerAttribute(string combinedKeyPattern, string[] additionalCustomRoutingKeys)
        {
            var combinedPatternParts = combinedKeyPattern.Split(".").ToList();

            MessageGroup = combinedPatternParts.ElementAtOrDefault(0);
            ProducerContext = combinedPatternParts.ElementAtOrDefault(1) ?? MatchAllPatternValue;
            MessageType = combinedPatternParts.ElementAtOrDefault(2) ?? MatchAllPatternValue;
            MessageAction = combinedPatternParts.ElementAtOrDefault(3) ?? MatchAllPatternValue;
            AdditionalCustomRoutingKeys = additionalCustomRoutingKeys ?? Array.Empty<string>();

            EnsureValid();
        }

        public static bool CanEventBusConsumerProcess(Type eventBusConsumerType, string routingKey)
        {
            var consumerAttributes = eventBusConsumerType
                .GetCustomAttributes(typeof(PlatformEventBusConsumerAttribute), true)
                .Select(p => (PlatformEventBusConsumerAttribute)p)
                .ToList();

            if (consumerAttributes.Count == 0)
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
        /// Addtional custom free text routing keys list for this consumer to consume messages
        /// </summary>
        public string[] AdditionalCustomRoutingKeys { get; set; } = Array.Empty<string>();

        public bool IsMatchMessageRoutingKey(string messageRoutingKey)
        {
            var patternRoutingKey = ToRoutingKey();
            return patternRoutingKey.Match(messageRoutingKey) || AdditionalCustomRoutingKeys.Contains(messageRoutingKey);
        }

        public PlatformEventBusMessageRoutingKey ToRoutingKey()
        {
            var patternRoutingKey = PlatformEventBusMessageRoutingKey.New(
                messageGroup: MessageGroup,
                producerContext: ProducerContext,
                messageType: MessageType,
                messageAction: MessageAction);
            return patternRoutingKey;
        }

        private void EnsureValid()
        {
            var validationResult = PlatformEventBusMessageRoutingKey.Validator(true).Validate(ToRoutingKey());
            validationResult.EnsureValid(p => new PlatformApplicationValidationException(validationResult));
        }
    }
}
