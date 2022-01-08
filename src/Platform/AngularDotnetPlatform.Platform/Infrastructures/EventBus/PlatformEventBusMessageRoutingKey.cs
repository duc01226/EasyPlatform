using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text.RegularExpressions;
using AngularDotnetPlatform.Platform.Common.Validators;
using AngularDotnetPlatform.Platform.Common.Validators.Exceptions;
using FluentValidation;

namespace AngularDotnetPlatform.Platform.Infrastructures.EventBus
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

        public static implicit operator string(PlatformEventBusMessageRoutingKey routingKey)
        {
            return routingKey.CombinedStringKey;
        }

        public static implicit operator PlatformEventBusMessageRoutingKey(string routingKeyStr)
        {
            return New(routingKeyStr);
        }

        public static string BuildCombinedStringKey(string messageGroup, string producerContext, string messageType, string messageAction = null)
        {
            return $"{messageGroup}.{producerContext}.{messageType}" +
                   $"{(string.IsNullOrEmpty(messageAction) ? "" : $"{CombinedStringKeySeparator}{messageAction}")}";
        }

        public static string BuildCombinedStringKey(string messageGroup, string customRoutingKey)
        {
            return $"{messageGroup}.{customRoutingKey}";
        }

        public override string ToString()
        {
            return CombinedStringKey;
        }

        public static PlatformEventBusMessageRoutingKey New(
            string messageGroup,
            string producerContext,
            string messageType,
            string messageAction = null)
        {
            return new PlatformEventBusMessageRoutingKey()
            {
                ProducerContext = producerContext,
                MessageGroup = messageGroup,
                MessageType = messageType,
                MessageAction = messageAction
            };
        }

        public static PlatformEventBusMessageRoutingKey NewEnsureValid(
            string messageGroup,
            string producerContext,
            string messageType,
            string messageAction = null,
            bool validateForMatchingPattern = false,
            Func<PlatformValidationResult, Exception> exceptionProvider = null)
        {
            var result = New(messageGroup, producerContext, messageType, messageAction);

            result.EnsureValid(validateForMatchingPattern, exceptionProvider);

            return result;
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
            Expression<Func<PlatformEventBusMessageRoutingKey, string>> keyPartSelector,
            bool allowMatchingAllPattern = false,
            bool allowNull = false)
        {
            return new PlatformSingleValidator<PlatformEventBusMessageRoutingKey, string>(
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
                    {
                        ruleBuilderOptions.When(key => keyPartSelector.Compile()(key) != null);
                    }
                });
        }

        public static PlatformValidator<PlatformEventBusMessageRoutingKey> Validator(bool forMatchingPattern = false)
        {
            return PlatformValidator<PlatformEventBusMessageRoutingKey>.Create(
                KeyPartValidator(p => p.MessageGroup),
                KeyPartValidator(p => p.ProducerContext, forMatchingPattern),
                KeyPartValidator(p => p.MessageType, forMatchingPattern),
                KeyPartValidator(p => p.MessageAction, forMatchingPattern, allowNull: true));
        }

        public static string AutoFixKeyPart(string keyPart)
        {
            return keyPart?.Replace(CombinedStringKeySeparator, AutoFixKeyPartReplacer);
        }

        public static bool IsMatchRoutingKeyPattern(string routingKeyPattern, string routingKey)
        {
            var routingKeyPatternParts = routingKeyPattern.Split(CombinedStringKeySeparator);
            var routingKeyParts = routingKey.Split(CombinedStringKeySeparator).ToList();

            for (var i = 0; i < routingKeyPatternParts.Length; i++)
            {
                if (routingKeyParts.ElementAtOrDefault(i) == null ||
                    !MatchPattern(routingKeyPatternParts[i], routingKeyParts.ElementAtOrDefault(i)))
                {
                    return false;
                }
            }

            return true;
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
            return MatchPattern(MessageGroup, routingKey.MessageGroup) &&
                   MatchPattern(ProducerContext, routingKey.ProducerContext) &&
                   MatchPattern(MessageType, routingKey.MessageType) &&
                   MatchPattern(MessageAction, routingKey.MessageAction);
        }

        public void EnsureValid(bool forMatchingPattern = false, Func<PlatformValidationResult, Exception> exceptionProvider = null)
        {
            var validationResult = Validator(forMatchingPattern).Validate(this);
            validationResult.EnsureValid(p => exceptionProvider != null ? exceptionProvider(p) : new PlatformValidationException(validationResult));
        }

        public bool IsValid(bool forMatchingPattern = false)
        {
            return Validator(forMatchingPattern).Validate(this);
        }
    }
}
