using System.Reflection;

namespace AngularDotnetPlatform.Platform.Domain
{
    public interface IPlatformDomainAssemblyProvider
    {
        public Assembly Assembly { get; set; }
    }

    public class PlatformDomainAssemblyProvider : IPlatformDomainAssemblyProvider
    {
        public PlatformDomainAssemblyProvider(Assembly assembly)
        {
            Assembly = assembly;
        }

        public Assembly Assembly { get; set; }
    }
}
