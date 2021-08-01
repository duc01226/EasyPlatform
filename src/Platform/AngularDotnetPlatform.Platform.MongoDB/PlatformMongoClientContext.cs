using AngularDotnetPlatform.Platform.MongoDB;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace AngularDotnetPlatform.Platform.EfCore
{
    public class PlatformMongoClientContext : IPlatformMongoClientContext
    {
        public PlatformMongoClientContext(IOptions<PlatformMongoOptions> options)
        {
            MongoClient = new MongoClient(options.Value.ConnectionString);
        }

        public MongoClient MongoClient { get; set; }
    }
}
