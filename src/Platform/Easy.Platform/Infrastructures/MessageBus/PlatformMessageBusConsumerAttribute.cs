using Easy.Platform.Common.Validators;

namespace Easy.Platform.Infrastructures.MessageBus
{
    /// <summary>
    /// Define message routing key for <inheritdoc cref="IPlatformMessageBusBaseConsumer"/>.
    /// If not defined, consumer will bind to default free format message routing key from <inheritdoc cref="PlatformBuildDefaultFreeFormatMessageRoutingKeyHelper"/>
    /// </summary>
    [AttributeUsage(AttributeTargets.Class, AllowMultiple = true)]
    public class PlatformMessageBusConsumerAttribute : Attribute
    {
        /// <summary>
        /// MatchAllPatternValue = "*"
        /// </summary>
        public const string MatchAllPatternValue = "*";

        /// <summary>
        /// Initializes a new instance of the <see cref="PlatformMessageBusConsumerAttribute"/> class.
        /// Pattern value support <see cref="MatchAllPatternValue"/> to match startWith (*XXX), endWith (XXX*) and contains (*XXX*)
        /// </summary>
        /// <param name="messageGroup"><see cref="PlatformBusMessageRoutingKey.MessageGroup"/></param>
        /// <param name="producerContext"><see cref="PlatformBusMessageRoutingKey.ProducerContext"/></param>
        /// <param name="messageType"><see cref="PlatformBusMessageRoutingKey.MessageType"/></param>
        /// <param name="messageAction"><see cref="PlatformBusMessageRoutingKey.MessageAction"/></param>
        public PlatformMessageBusConsumerAttribute(
            string messageGroup,
            string producerContext,
            string messageType,
            string messageAction = MatchAllPatternValue)
        {
            MessageGroup = PlatformBusMessageRoutingKey.AutoFixKeyPart(messageGroup);
            ProducerContext = PlatformBusMessageRoutingKey.AutoFixKeyPart(producerContext);
            MessageType = PlatformBusMessageRoutingKey.AutoFixKeyPart(messageType);
            MessageAction = PlatformBusMessageRoutingKey.AutoFixKeyPart(messageAction) ?? MatchAllPatternValue;

            EnsureValid();
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="PlatformMessageBusConsumerAttribute"/> class.
        /// Input combined ket pattern. Example: "AA.BB.CC", "AA.*.CC.*", ...
        /// </summary>
        /// <param name="combinedKeyPattern">Combined key pattern string represent for {messageGroup}.{producerContext}.{messageType}.{messageAction}</param>
        public PlatformMessageBusConsumerAttribute(string combinedKeyPattern)
        {
            var combinedPatternParts = combinedKeyPattern.Split(".").ToList();

            MessageGroup = combinedPatternParts.ElementAtOrDefault(0);
            ProducerContext = combinedPatternParts.ElementAtOrDefault(1) ?? MatchAllPatternValue;
            MessageType = combinedPatternParts.ElementAtOrDefault(2) ?? MatchAllPatternValue;
            MessageAction = combinedPatternParts.ElementAtOrDefault(3) ?? MatchAllPatternValue;

            EnsureValid();
        }

        public PlatformMessageBusConsumerAttribute(string messageGroup, string customRoutingKey)
        {
            MessageGroup = messageGroup;
            CustomRoutingKey = customRoutingKey;

            EnsureValid();
        }

        public static bool CanMessageBusConsumerProcess(Type eventBusConsumerType, string routingKey)
        {
            var consumerAttributes = eventBusConsumerType
                .GetCustomAttributes(typeof(PlatformMessageBusConsumerAttribute), true)
                .Select(p => (PlatformMessageBusConsumerAttribute)p)
                .ToList();

            return consumerAttributes.Any(p => p.IsMatchMessageRoutingKey(routingKey));
        }

        /// <summary>
        /// <see cref="PlatformBusMessageRoutingKey.MessageGroup"/>
        /// </summary>
        public string MessageGroup { get; }

        /// <summary>
        /// <see cref="PlatformBusMessageRoutingKey.ProducerContext"/>
        /// </summary>
        public string ProducerContext { get; }

        /// <summary>
        /// <see cref="PlatformBusMessageRoutingKey.MessageType"/>
        /// </summary>
        public string MessageType { get; }

        /// <summary>
        /// <see cref="PlatformBusMessageRoutingKey.MessageAction"/>
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
                return PlatformBusMessageRoutingKey.IsMatchRoutingKeyPattern(
                           routingKeyPattern: CustomRoutingKey,
                           messageRoutingKey) ||
                       PlatformBusMessageRoutingKey.IsMatchRoutingKeyPattern(
                           routingKeyPattern: PlatformBusMessageRoutingKey.BuildCombinedStringKey(
                               MessageGroup,
                               CustomRoutingKey),
                           messageRoutingKey);
            }
            else
            {
                return ToPlatformRoutingKey().Match(messageRoutingKey);
            }
        }

        public PlatformBusMessageRoutingKey ToPlatformRoutingKey()
        {
            var patternRoutingKey = PlatformBusMessageRoutingKey.New(
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
                return PlatformBusMessageRoutingKey.BuildCombinedStringKey(MessageGroup, CustomRoutingKey);
            }
            else
            {
                return PlatformBusMessageRoutingKey.BuildCombinedStringKey(MessageGroup, ProducerContext, MessageType);
            }
        }

        private void EnsureValid(Func<PlatformValidationResult, Exception> exceptionProvider = null)
        {
            if (!string.IsNullOrEmpty(CustomRoutingKey))
            {
                PlatformBusMessageRoutingKey
                    .New(
                        MessageGroup,
                        PlatformBusMessageRoutingKey.MatchAllSingleGroupLevelChar,
                        CustomRoutingKey)
                    .EnsureValid(true, exceptionProvider);
            }
            else
            {
                ToPlatformRoutingKey().EnsureValid(true, exceptionProvider);
            }
        }
    }
}
