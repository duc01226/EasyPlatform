using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using Easy.Platform.Infrastructures.EventBus;

namespace Easy.Platform.Application.EventBus
{
    public class PlatformApplicationPseudoEventBusManager : IPlatformEventBusManager
    {
        public List<Type> AllDefinedEventBusConsumerTypes()
        {
            return new List<Type>();
        }

        public List<PlatformEventBusConsumerAttribute> AllDefinedEventBusConsumerAttributes()
        {
            return new List<PlatformEventBusConsumerAttribute>();
        }

        public List<PlatformEventBusMessageRoutingKey> AllDefaultFreeFormatMessageRoutingKeyForDefinedConsumers()
        {
            return new List<PlatformEventBusMessageRoutingKey>();
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
