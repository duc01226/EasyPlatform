using AngularDotnetPlatform.Platform.Caching;
using Microsoft.Extensions.Configuration;

namespace PlatformExampleApp.TextSnippet.Application.Caching
{
    public class TextSnippetCollectionCacheKeyOptions : PlatformCacheEntryOptions
    {
        private readonly IConfiguration configuration;

        public TextSnippetCollectionCacheKeyOptions(IConfiguration configuration)
        {
            this.configuration = configuration;
        }

        public override int? ExpirationInSeconds =>
            configuration.GetSection("Caching:TextSnippetCollectionExpirationInSeconds").Get<int>();
    }
}
