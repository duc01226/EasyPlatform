using AngularDotnetPlatform.Platform.Caching;
using Microsoft.Extensions.Configuration;

namespace PlatformExampleApp.TextSnippet.Application.Caching
{
    public class TextSnippetConfigurationCollectionCacheEntryOptions : PlatformConfigurationCacheEntryOptions
    {
        public TextSnippetConfigurationCollectionCacheEntryOptions(IConfiguration configuration) : base(configuration)
        {
        }

        public override double? ExpirationInSeconds =>
            Configuration.GetSection("Caching:TextSnippetCollectionExpirationInSeconds").Get<int>();

        public override double? SlidingExpirationInSeconds { get; set; }
    }
}
