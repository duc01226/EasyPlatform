using System;
using System.Collections.Generic;
using System.Reflection;
using Easy.Platform.Infrastructures.MessageBus;

namespace Easy.Platform.Application.MessageBus
{
    public class PlatformApplicationPseudoMessageBusManager : IPlatformMessageBusManager
    {
        public List<Type> AllDefinedEventBusConsumerTypes()
        {
            return new List<Type>();
        }

        public List<PlatformMessageBusConsumerAttribute> AllDefinedEventBusConsumerAttributes()
        {
            return new List<PlatformMessageBusConsumerAttribute>();
        }

        public List<PlatformBusMessageRoutingKey> AllDefaultFreeFormatMessageRoutingKeyForDefinedConsumers()
        {
            return new List<PlatformBusMessageRoutingKey>();
        }

        public List<string> AllDefinedEventBusConsumerBindingRoutingKeys()
        {
            return new List<string>();
        }

        public List<Assembly> GetScanAssemblies()
        {
            return new List<Assembly>();
        }
    }
}
