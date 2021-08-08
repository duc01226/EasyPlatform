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
        public override string Context => TextSnippetApplicationConstants.ApplicationName;
        public override string Collection => "TextSnippet";
    }
}
