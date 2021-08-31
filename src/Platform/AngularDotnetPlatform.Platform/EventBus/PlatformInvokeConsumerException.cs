using System;

namespace AngularDotnetPlatform.Platform.EventBus
{
    public class PlatformInvokeConsumerException : Exception
    {
        public PlatformInvokeConsumerException(
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
