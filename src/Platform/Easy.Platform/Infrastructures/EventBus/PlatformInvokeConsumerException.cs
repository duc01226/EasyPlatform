using System;

namespace Easy.Platform.Infrastructures.EventBus
{
    public class PlatformInvokeConsumerException : Exception
    {
        public PlatformInvokeConsumerException(
            Exception e,
            string consumerName,
            object eventBusMessage) : base($"Invoke Consumer {consumerName} Failed.", e)
        {
            ConsumerName = consumerName;
            EventBusMessage = eventBusMessage;
        }

        public string ConsumerName { get; }

        public object EventBusMessage { get; set; }
    }
}
