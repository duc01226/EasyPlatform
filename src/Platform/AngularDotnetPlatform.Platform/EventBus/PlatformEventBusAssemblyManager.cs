using System.Collections.Generic;
using System.Reflection;

namespace AngularDotnetPlatform.Platform.EventBus
{
    public interface IPlatformEventBusAssemblyManager
    {
        List<Assembly> EventBusScanAssemblies { get; init; }
    }

    public class PlatformEventBusAssemblyManager : IPlatformEventBusAssemblyManager
    {
        public List<Assembly> EventBusScanAssemblies { get; init; }
    }
}
