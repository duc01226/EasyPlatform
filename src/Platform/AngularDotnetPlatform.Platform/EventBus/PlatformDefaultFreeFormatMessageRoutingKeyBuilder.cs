using System;

namespace AngularDotnetPlatform.Platform.EventBus
{
    public static class PlatformDefaultFreeFormatMessageRoutingKeyBuilder
    {
        public const string FreeFormatMessageGroup = "FreeFormatMessage";

        public static PlatformEventBusMessageRoutingKey Build<TMessage>() where TMessage : class, new()
        {
            return Build(typeof(TMessage));
        }

        public static PlatformEventBusMessageRoutingKey Build(Type messageType)
        {
            return new PlatformEventBusMessageRoutingKey()
            {
                MessageGroup = FreeFormatMessageGroup,
                ProducerContext = PlatformEventBusMessageRoutingKey.MatchAllSingleGroupLevelChar,
                MessageType = messageType.Name
            };
        }
    }
}
