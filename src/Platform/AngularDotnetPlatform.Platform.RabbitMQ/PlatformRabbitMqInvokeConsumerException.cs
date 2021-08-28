using System;
using AngularDotnetPlatform.Platform.EventBus;

namespace AngularDotnetPlatform.Platform.RabbitMQ
{
    internal class PlatformRabbitMqInvokeConsumerException : Exception
    {
        public PlatformRabbitMqInvokeConsumerException(
            Exception e,
            string consumerName,
            IPlatformEventBusMessage eventBusMessage) : base($"Invoke Consumer {consumerName} Failed.", e)
        {
            ConsumerName = consumerName;
            EventBusMessage = eventBusMessage;
        }

        public string ConsumerName { get; }

        public IPlatformEventBusMessage EventBusMessage { get; set; }
    }
}
