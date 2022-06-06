using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Infrastructures.EventBus;

namespace Easy.Platform.Infrastructures.EventBus
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
                MessageType = messageType.GetGenericTypeName()
            };
        }

        public static PlatformEventBusMessageRoutingKey BuildForConsumer(Type consumerType)
        {
            var messageType = consumerType.GetGenericArguments()[0];

            return BuildForGenericPlatformEventBusMessage(messageType);
        }

        public static PlatformEventBusMessageRoutingKey BuildForGenericPlatformEventBusMessage(Type messageType)
        {
            var matchedPlatformGenericMessageType = Util.Types.FindMatchedGenericType(
                givenType: messageType,
                matchedToGenericTypeDefinition: typeof(IPlatformEventBusMessage<>).GetGenericTypeDefinition());

            if (messageType.IsGenericType && matchedPlatformGenericMessageType != null)
            {
                return Build(matchedPlatformGenericMessageType.GetGenericArguments()[0]);
            }
            else
            {
                return Build(messageType);
            }
        }
    }
}
