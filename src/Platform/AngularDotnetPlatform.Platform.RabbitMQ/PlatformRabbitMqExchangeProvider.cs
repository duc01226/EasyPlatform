using System;
using AngularDotnetPlatform.Platform.EventBus;
using AngularDotnetPlatform.Platform.Validators;

namespace AngularDotnetPlatform.Platform.RabbitMQ
{
    /// <summary>
    /// Used to build the rabbitMQ exchange name rule
    /// </summary>
    public interface IPlatformRabbitMqExchangeProvider
    {
        string GetName(PlatformEventBusMessageRoutingKey routingKey);
    }

    public class PlatformRabbitMqExchangeProvider : IPlatformRabbitMqExchangeProvider
    {
        public string GetName(PlatformEventBusMessageRoutingKey routingKey)
        {
            EnsureValidForGetExchangeName(routingKey);

            return routingKey.MessageGroup;
        }

        private void EnsureValidForGetExchangeName(PlatformEventBusMessageRoutingKey routingKey)
        {
            PlatformValidationResult
                .ValidIf(
                    !string.IsNullOrEmpty(routingKey.MessageGroup),
                    $"[{nameof(PlatformRabbitMqExchangeProvider)}] RoutingKey MessageGroup must be not null and empty")
                .EnsureValid(p => new ArgumentException(p.ErrorsMsg()));
        }
    }
}
