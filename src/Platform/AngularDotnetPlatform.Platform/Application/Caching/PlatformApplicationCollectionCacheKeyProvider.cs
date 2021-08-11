using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.Caching;

namespace AngularDotnetPlatform.Platform.Application.Caching
{
    public class PlatformApplicationCollectionCacheKeyProvider<TFixedImplementationProvider> :
        PlatformCollectionCacheKeyProvider<TFixedImplementationProvider>
        where TFixedImplementationProvider : PlatformCollectionCacheKeyProvider<TFixedImplementationProvider>
    {
        private readonly IPlatformApplicationSettingContext applicationSettingContext;

        public PlatformApplicationCollectionCacheKeyProvider(IPlatformApplicationSettingContext applicationSettingContext)
        {
            this.applicationSettingContext = applicationSettingContext;
        }

        public override string Context => applicationSettingContext.ApplicationName;
    }
}
