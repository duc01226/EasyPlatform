using System;

namespace AngularDotnetPlatform.Platform.EventBus
{
    public class PlatformEventBusException<TMessage> : Exception
        where TMessage : IPlatformEventBusMessage
    {
        public PlatformEventBusException(TMessage eventBusMessage, Exception rootException) : base(rootException.Message, rootException)
        {
            EventBusMessage = eventBusMessage;
        }

        public TMessage EventBusMessage { get; }
    }
}
