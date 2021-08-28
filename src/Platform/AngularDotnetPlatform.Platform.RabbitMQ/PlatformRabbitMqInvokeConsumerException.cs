using System;

namespace AngularDotnetPlatform.Platform.RabbitMQ
{
    internal class PlatformRabbitMqInvokeConsumerException : Exception
    {
        public PlatformRabbitMqInvokeConsumerException(Exception e, string consumerName) : base($"Invoke Consumer {consumerName} Failed.", e)
        {
            ConsumerName = consumerName;
        }

        public string ConsumerName { get; }
    }
}
