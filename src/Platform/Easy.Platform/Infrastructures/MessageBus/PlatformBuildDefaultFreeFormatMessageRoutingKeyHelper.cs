using Easy.Platform.Common.Extensions;

namespace Easy.Platform.Infrastructures.MessageBus;

public static class PlatformBuildDefaultFreeFormatMessageRoutingKeyHelper
{
    public const string FreeFormatMessageGroup = "FreeFormatMessage";

    public static PlatformBusMessageRoutingKey Build<TMessage>() where TMessage : class, new()
    {
        return Build(typeof(TMessage));
    }

    public static PlatformBusMessageRoutingKey Build(Type messageType)
    {
        return new PlatformBusMessageRoutingKey
        {
            MessageGroup = FreeFormatMessageGroup,
            ProducerContext = PlatformBusMessageRoutingKey.MatchAllSingleGroupLevelChar,
            MessageType = messageType.GetGenericTypeName()
        };
    }

    public static PlatformBusMessageRoutingKey BuildForConsumer(Type consumerType)
    {
        var messageType = consumerType.GetGenericArguments()[0];

        return BuildForGenericPlatformEventBusMessage(messageType);
    }

    public static PlatformBusMessageRoutingKey BuildForGenericPlatformEventBusMessage(Type messageType)
    {
        var matchedPlatformGenericMessageType = messageType.FindMatchedGenericType(typeof(IPlatformBusMessage<>));

        if (messageType.IsGenericType && matchedPlatformGenericMessageType != null)
            return Build(matchedPlatformGenericMessageType.GetGenericArguments()[0]);
        return Build(messageType);
    }
}
