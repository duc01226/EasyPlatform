using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Caching;

namespace PlatformExampleApp.TextSnippet.Application.Caching
{
    public class TextSnippetCollectionCacheKeyProvider : PlatformCollectionCacheKeyProvider<TextSnippetCollectionCacheKeyProvider>
    {
        public static readonly TextSnippetCollectionCacheKeyProvider DefaultInstance = new TextSnippetCollectionCacheKeyProvider();

        public override string Context => TextSnippetApplicationCacheKey.ContextName;
        public override string Collection => "TextSnippet";

        public static new PlatformCacheKey CreateKey(string requestKey = DefaultRequestKey)
        {
            return Activator.CreateInstance<TextSnippetCollectionCacheKeyProvider>().GetKey(requestKey);
        }

        public static new PlatformCacheKey CreateKey(object[] requestKeyParts = null)
        {
            return Activator.CreateInstance<TextSnippetCollectionCacheKeyProvider>().GetKey(requestKeyParts);
        }

        public Func<PlatformCacheKey, bool> MatchKeyPredicate()
        {
            return p => p.Collection == Collection && p.Context == Context;
        }
    }
}
