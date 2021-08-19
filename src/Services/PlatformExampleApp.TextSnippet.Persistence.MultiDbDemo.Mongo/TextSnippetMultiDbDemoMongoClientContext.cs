using AngularDotnetPlatform.Platform.EfCore;
using Microsoft.Extensions.Options;

namespace PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo
{
    public class TextSnippetMultiDbDemoMongoClientContext : PlatformMongoClientContext
    {
        public TextSnippetMultiDbDemoMongoClientContext(IOptions<TextSnippetMultiDbDemoMongoOptions> options) : base(options)
        {
        }
    }
}
