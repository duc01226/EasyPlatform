using System;

namespace Easy.Platform.Infrastructures.EventBus
{
    public class PlatformEventBusException<TMessage> : Exception
    {
        public PlatformEventBusException(TMessage eventBusMessage, Exception rootException) : base(rootException.Message, rootException)
        {
            EventBusMessage = eventBusMessage;
        }

        public TMessage EventBusMessage { get; }
    }
}
