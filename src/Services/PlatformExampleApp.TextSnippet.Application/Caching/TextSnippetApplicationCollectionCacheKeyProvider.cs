using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application;
using AngularDotnetPlatform.Platform.Application.Caching;
using AngularDotnetPlatform.Platform.Caching;

namespace PlatformExampleApp.TextSnippet.Application.Caching
{
    public class TextSnippetApplicationCollectionCacheKeyProvider :
        PlatformApplicationCollectionCacheKeyProvider<TextSnippetApplicationCollectionCacheKeyProvider>
    {
        public TextSnippetApplicationCollectionCacheKeyProvider(IPlatformApplicationSettingContext applicationSettingContext) : base(applicationSettingContext)
        {
        }

        public override string Context => TextSnippetApplicationConstants.ApplicationName;
        public override string Collection => TextSnippetApplicationConstants.CacheKeyCollectionNames.TextSnippet;
    }
}
