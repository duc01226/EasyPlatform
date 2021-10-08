using AngularDotnetPlatform.Platform.Application.Caching;
using AngularDotnetPlatform.Platform.Application.Context;

namespace PlatformExampleApp.TextSnippet.Application.Caching
{
    public class TextSnippetApplicationCollectionCacheKeyProvider :
        PlatformApplicationCollectionCacheKeyProvider<TextSnippetApplicationCollectionCacheKeyProvider>
    {
        public TextSnippetApplicationCollectionCacheKeyProvider(IPlatformApplicationSettingContext applicationSettingContext) : base(applicationSettingContext)
        {
        }

        public override string Collection => TextSnippetApplicationConstants.CacheKeyCollectionNames.TextSnippet;
    }
}
