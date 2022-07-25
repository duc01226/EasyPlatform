using System.Reflection;
using Easy.Platform.Infrastructures.MessageBus;

namespace Easy.Platform.Application.MessageBus;

public class PlatformApplicationPseudoMessageBusManager : IPlatformMessageBusManager
{
    public List<Type> AllDefinedMessageBusConsumerTypes()
    {
        return new List<Type>();
    }

    public List<PlatformMessageBusConsumerAttribute> AllDefinedMessageBusConsumerAttributes()
    {
        return new List<PlatformMessageBusConsumerAttribute>();
    }

    public List<PlatformBusMessageRoutingKey> AllDefaultFreeFormatMessageRoutingKeyForDefinedConsumers()
    {
        return new List<PlatformBusMessageRoutingKey>();
    }

    public List<string> AllDefinedMessageBusConsumerBindingRoutingKeys()
    {
        return new List<string>();
    }

    public List<Assembly> GetScanAssemblies()
    {
        return new List<Assembly>();
    }
}
