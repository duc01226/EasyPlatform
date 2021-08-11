using System;
using System.Linq;
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
        public PlatformEventBusConsumerAttribute(
            string messageGroup,
            string producerContext,
            string messageType,
            string messageActionPattern = MatchAllPatternValue)
        {
            ProducerContext = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(producerContext);
            MessageGroup = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(messageGroup);
            MessageType = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(messageType);
            MessageActionPattern = PlatformEventBusMessageRoutingKey.AutoFixKeyPart(messageActionPattern) ?? MatchAllPatternValue;

            EnsureValid();
        }

        public PlatformEventBusConsumerAttribute(string combinedKeyPattern)
        {
            var combinedPatternParts = combinedKeyPattern.Split(".").ToList();

            ProducerContext = combinedPatternParts.ElementAtOrDefault(0);
            MessageGroup = combinedPatternParts.ElementAtOrDefault(1);
            MessageType = combinedPatternParts.ElementAtOrDefault(2);
            MessageActionPattern = combinedPatternParts.ElementAtOrDefault(3) ?? MatchAllPatternValue;

            EnsureValid();
        }

        public string MessageGroup { get; }
        public string ProducerContext { get; }
        public string MessageType { get; }
        public string MessageActionPattern { get; }

        public bool IsMatchMessageRoutingKey(PlatformEventBusMessageRoutingKey messageRoutingKey)
        {
            var patternRoutingKey = ToRoutingKey();
            return patternRoutingKey.Match(messageRoutingKey);
        }

        public PlatformEventBusMessageRoutingKey ToRoutingKey()
        {
            var patternRoutingKey = PlatformEventBusMessageRoutingKey.New(
                messageGroup: MessageGroup,
                producerContext: ProducerContext,
                messageType: MessageType,
                messageAction: MessageActionPattern);
            return patternRoutingKey;
        }

        private void EnsureValid()
        {
            var validationResult = PlatformEventBusMessageRoutingKey.Validator().Validate(ToRoutingKey());
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);
        }
    }
}
