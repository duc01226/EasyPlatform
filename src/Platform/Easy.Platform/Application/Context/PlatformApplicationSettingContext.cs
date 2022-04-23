using System.Reflection;

namespace Easy.Platform.Application.Context
{
    public interface IPlatformApplicationSettingContext
    {
        public string ApplicationName { get; }

        public Assembly ApplicationAssembly { get; init; }
    }

    public class PlatformApplicationSettingContext : IPlatformApplicationSettingContext
    {
        public PlatformApplicationSettingContext()
        {
            ApplicationName = GetType().Assembly.GetName().Name;
            ApplicationAssembly = GetType().Assembly;
        }

        public string ApplicationName { get; init; }

        public Assembly ApplicationAssembly { get; init; }
    }
}
