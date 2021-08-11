using AngularDotnetPlatform.Platform.EventBus;

namespace AngularDotnetPlatform.Platform.RabbitMQ
{
    /// <summary>
    /// Used to build the rabbitMQ exchange name rule
    /// </summary>
    public class PlatformRabbitMqExchangeProvider
    {
        public string GetName(PlatformEventBusMessageRoutingKey routingKey)
        {
            return routingKey.MessageGroup;
        }
    }
}
