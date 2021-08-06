using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Caching;

namespace PlatformExampleApp.TextSnippet.Application.Caching
{
    public class TextSnippetApplicationCacheKey : PlatformCacheKey
    {
        public const string ContextName = "TextSnippet.Api";

        public TextSnippetApplicationCacheKey(string requestKey) : base(requestKey)
        {
        }

        public TextSnippetApplicationCacheKey(object[] requestKeyParts) : base(requestKeyParts)
        {
        }

        public TextSnippetApplicationCacheKey(string collection, string requestKey) : base(ContextName, collection, requestKey)
        {
        }

        public TextSnippetApplicationCacheKey(string collection, params object[] requestKeyParts) : base(ContextName, collection, requestKeyParts)
        {
        }

        public override string Context => ContextName;
    }
}
