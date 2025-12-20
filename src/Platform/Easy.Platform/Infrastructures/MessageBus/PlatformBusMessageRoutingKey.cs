using System.Linq.Expressions;
using System.Text.RegularExpressions;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Validations;
using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.Common.Validations.Validators;
using FluentValidation;

namespace Easy.Platform.Infrastructures.MessageBus;

/// <summary>
/// Represents a structured routing key for messages in the platform message bus.
/// Routing keys determine how messages are routed to consumers and follow a hierarchical structure
/// with dot-separated components for different routing levels.
/// </summary>
public class PlatformBusMessageRoutingKey : IEqualityComparer<PlatformBusMessageRoutingKey>
{
    /// <summary>
    /// Special character that matches any single group level in a routing pattern.
    /// Used in routing patterns to subscribe to all messages at a specific level in the hierarchy.
    /// </summary>
    public const string MatchAllSingleGroupLevelChar = "*";

    /// <summary>
    /// Default value for the message group when not explicitly specified.
    /// </summary>
    public const string DefaultMessageGroup = "DefaultMessageGroup";

    /// <summary>
    /// Default value for the producer context when not explicitly specified.
    /// </summary>
    public const string UnknownProducerContext = "UnknownProducerContext";

    /// <summary>
    /// Character used to separate parts in the combined string routing key.
    /// </summary>
    public const string CombinedStringKeySeparator = ".";

    /// <summary>
    /// Character that automatically replaces the separator in key parts to ensure valid routing keys.
    /// </summary>
    public const string CombinedStringKeySeparatorAutoFixReplacer = "-";

    private string messageAction;
    private string messageGroup;
    private string messageType;
    private string producerContext;

    /// <summary>
    /// First group level of message <see cref="CombinedStringKey" />.
    /// Used to determine the exactly message type suffix group. Usually equivalent to message Class name suffix.
    /// Example: CommandEvent, EntityEvent, AuditLog, etc...
    /// </summary>
    public string MessageGroup
    {
        get => messageGroup ?? DefaultMessageGroup;
        set => messageGroup = AutoFixKeyPart(value);
    }

    /// <summary>
    /// Second group level of message <see cref="CombinedStringKey" />.
    /// Used to determine which application micro service publish this message
    /// </summary>
    public string ProducerContext
    {
        get => producerContext ?? UnknownProducerContext;
        set => producerContext = AutoFixKeyPart(value);
    }

    /// <summary>
    /// Third group level of message <see cref="CombinedStringKey" />.
    /// Used to determine the exactly message type. Usually equivalent to message Class name.
    /// Example: RegisterNewUserCommandEvent, UserEntityEvent
    /// </summary>
    public string MessageType
    {
        get => messageType;
        set => messageType = AutoFixKeyPart(value);
    }

    /// <summary>
    /// Final group level of message <see cref="CombinedStringKey" />.
    /// This is Optional. Used to determine specific action on the <see cref="MessageType" />
    /// Example: Created,Updated,Deleted, etc..
    /// </summary>
    public string MessageAction
    {
        get => messageAction;
        set => messageAction = AutoFixKeyPart(value);
    }

    /// <summary>
    /// Combined routing key in the format "MessageGroup.ProducerContext.MessageType.MessageAction"
    /// This is the final string representation used for actual message routing in the message bus.
    /// </summary>
    public string CombinedStringKey => BuildCombinedStringKey(MessageGroup, ProducerContext, MessageType, MessageAction);

    /// <summary>
    /// Determines whether two routing keys are equal by comparing their CombinedStringKey values.
    /// </summary>
    /// <param name="x">First routing key to compare.</param>
    /// <param name="y">Second routing key to compare.</param>
    /// <returns>True if the routing keys have identical CombinedStringKey values.</returns>
    public bool Equals(PlatformBusMessageRoutingKey x, PlatformBusMessageRoutingKey y)
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

    /// <summary>
    /// Gets a hash code for the routing key based on its CombinedStringKey value.
    /// </summary>
    /// <param name="obj">The routing key to get a hash code for.</param>
    /// <returns>A hash code derived from the CombinedStringKey.</returns>
    public int GetHashCode(PlatformBusMessageRoutingKey obj)
    {
        return HashCode.Combine(obj.CombinedStringKey);
    }

    /// <summary>
    /// Builds a default routing key for a given message type.
    /// The routing key is constructed based on message type properties and metadata.
    /// </summary>
    /// <param name="messageType">The type of the message to build a routing key for.</param>
    /// <param name="producerContext">The producer context, defaults to the match-all character.</param>
    /// <returns>A PlatformBusMessageRoutingKey with default values for the given message type.</returns>
    public static PlatformBusMessageRoutingKey BuildDefaultRoutingKey(Type messageType, string producerContext = MatchAllSingleGroupLevelChar)
    {
        var messagePayloadTypeName = messageType
            .FindMatchedGenericType(typeof(IPlatformWithPayloadBusMessage<>))
            ?.GetGenericArguments()[0]
            .GetNameOrGenericTypeName();

        return new PlatformBusMessageRoutingKey
        {
            MessageGroup = DefaultMessageGroup,
            ProducerContext = producerContext,
            MessageType =
                messageType.IsGenericType && messagePayloadTypeName != null ? messagePayloadTypeName : messageType.GetNameOrGenericTypeName()
        };
    }

    public static implicit operator string(PlatformBusMessageRoutingKey routingKey)
    {
        return routingKey?.CombinedStringKey;
    }

    public static implicit operator PlatformBusMessageRoutingKey(string routingKeyStr)
    {
        return New(routingKeyStr);
    }

    public static string BuildCombinedStringKey(string messageGroup, string producerContext, string messageType, string messageAction = null)
    {
        return $"{messageGroup}.{producerContext}.{messageType}"
               + $"{(string.IsNullOrEmpty(messageAction) ? "" : $"{CombinedStringKeySeparator}{messageAction}")}";
    }

    public static string BuildCombinedStringKey(string messageGroup, string customRoutingKey)
    {
        return $"{messageGroup}.{customRoutingKey}";
    }

    public override string ToString()
    {
        return CombinedStringKey;
    }

    public static PlatformBusMessageRoutingKey New(string messageGroup, string producerContext, string messageType, string messageAction = null)
    {
        return new PlatformBusMessageRoutingKey
        {
            ProducerContext = producerContext,
            MessageGroup = messageGroup,
            MessageType = messageType,
            MessageAction = messageAction
        };
    }

    public static PlatformBusMessageRoutingKey New(string combinedKey)
    {
        var combinedPatternParts = combinedKey.Split(CombinedStringKeySeparator).ToList();

        return New(
            messageGroup: combinedPatternParts.ElementAtOrDefault(0),
            producerContext: combinedPatternParts.ElementAtOrDefault(1),
            messageType: combinedPatternParts.ElementAtOrDefault(2),
            messageAction: combinedPatternParts.ElementAtOrDefault(3)
        );
    }

    public static bool MatchPattern(string pattern, string value)
    {
        if (pattern == MatchAllSingleGroupLevelChar || pattern == value)
            return true;
        if (pattern.Length > 1 && pattern.StartsWith(MatchAllSingleGroupLevelChar))
            return value.StartsWith(pattern.Substring(1));
        if (pattern.Length > 1 && pattern.EndsWith(MatchAllSingleGroupLevelChar))
            return value.EndsWith(pattern.Substring(0, pattern.Length - 1));
        if (pattern.Length > 2 && pattern.StartsWith(MatchAllSingleGroupLevelChar) && pattern.EndsWith(MatchAllSingleGroupLevelChar))
            return value.Contains(pattern.Substring(1));

        return false;
    }

    public static PlatformSingleValidator<PlatformBusMessageRoutingKey, string> KeyPartValidator(
        Expression<Func<PlatformBusMessageRoutingKey, string>> keyPartSelector,
        bool allowMatchingAllPattern = false,
        bool allowNull = false
    )
    {
        return new PlatformSingleValidator<PlatformBusMessageRoutingKey, string>(
            keyPartSelector,
            ruleBuilder =>
            {
                var ruleBuilderOptions = ruleBuilder
                    .NotNull()
                    .NotEmpty()
                    .Matches(new Regex($"^[^\\{CombinedStringKeySeparator}]+$"))
                    .WithMessage($"This key part can not contain key separator {CombinedStringKeySeparator}");
                if (!allowMatchingAllPattern)
                {
                    ruleBuilderOptions = ruleBuilder
                        .Matches(new Regex($"^[^\\{MatchAllSingleGroupLevelChar}]+$"))
                        .WithMessage($"This key part can not contain matching all pattern {MatchAllSingleGroupLevelChar}");
                }

                if (allowNull)
                    ruleBuilderOptions.When(key => keyPartSelector.Compile()(key) != null);
            }
        );
    }

    public static PlatformValidator<PlatformBusMessageRoutingKey> Validator(bool forMatchingPattern = false)
    {
        return PlatformValidator<PlatformBusMessageRoutingKey>.Create(
            KeyPartValidator(p => p.MessageGroup),
            KeyPartValidator(p => p.ProducerContext, forMatchingPattern),
            KeyPartValidator(p => p.MessageType, forMatchingPattern),
            KeyPartValidator(p => p.MessageAction, forMatchingPattern, allowNull: true)
        );
    }

    public static string AutoFixKeyPart(string keyPart)
    {
        return keyPart?.Replace(CombinedStringKeySeparator, CombinedStringKeySeparatorAutoFixReplacer);
    }

    public static bool IsMatchRoutingKeyPattern(string routingKeyPattern, string routingKey)
    {
        var routingKeyPatternParts = routingKeyPattern.Split(CombinedStringKeySeparator);
        var routingKeyParts = routingKey.Split(CombinedStringKeySeparator).ToList();

        for (var i = 0; i < routingKeyPatternParts.Length; i++)
        {
            if (routingKeyParts.ElementAtOrDefault(i) == null || !MatchPattern(routingKeyPatternParts[i], routingKeyParts.ElementAtOrDefault(i)))
                return false;
        }

        return true;
    }

    public bool Match(PlatformBusMessageRoutingKey routingKey)
    {
        if (ToString() == routingKey)
            return true;

        return MatchPattern(MessageGroup, routingKey.MessageGroup)
               && MatchPattern(ProducerContext, routingKey.ProducerContext)
               && MatchPattern(MessageType, routingKey.MessageType)
               && MatchPattern(MessageAction, routingKey.MessageAction);
    }

    public void EnsureValid(bool forMatchingPattern = false, Func<PlatformValidationResult, Exception> exceptionProvider = null)
    {
        var validationResult = Validator(forMatchingPattern).Validate(this);
        validationResult.EnsureValid(p => exceptionProvider != null ? exceptionProvider(p) : new PlatformValidationException(validationResult));
    }

    public PlatformValidationResult<PlatformBusMessageRoutingKey> Validate(bool forMatchingPattern = false)
    {
        return Validator(forMatchingPattern).Validate(this);
    }
}
