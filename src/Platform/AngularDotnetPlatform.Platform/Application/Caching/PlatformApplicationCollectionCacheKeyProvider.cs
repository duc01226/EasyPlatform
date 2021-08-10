using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
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
