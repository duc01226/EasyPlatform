using System;
using AngularDotnetPlatform.Platform.Common.Validators;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;

namespace AngularDotnetPlatform.Platform.RabbitMQ
{
    /// <summary>
    /// Used to build the rabbitMQ exchange name rule
    /// </summary>
    public interface IPlatformRabbitMqExchangeProvider
    {
        string GetExchangeName(string routingKey);
    }

    public class PlatformRabbitMqExchangeProvider : IPlatformRabbitMqExchangeProvider
    {
        public string GetExchangeName(string routingKey)
        {
            var messageGroup = PlatformEventBusMessageRoutingKey.New(routingKey).MessageGroup;

            PlatformValidationResult
                .ValidIf(
                    !string.IsNullOrEmpty(messageGroup),
                    $"[{nameof(PlatformRabbitMqExchangeProvider)}] RoutingKey MessageGroup must be not null and empty. RoutingKey must be in format [YourMessageGroup].xxx")
                .EnsureValid(p => new ArgumentException(p.ErrorsMsg()));

            return messageGroup;
        }
    }
}
