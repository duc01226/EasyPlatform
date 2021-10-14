using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace AngularDotnetPlatform.Platform.MongoDB
{
    public class PlatformMongoClientContext : IPlatformMongoClientContext
    {
        public PlatformMongoClientContext(IOptions<PlatformMongoOptions> options)
        {
            MongoClient = new MongoClient(options.Value.ConnectionString);
        }

        public MongoClient MongoClient { get; set; }
    }

    public class PlatformMongoClientContext<TDbContext> : PlatformMongoClientContext,
        IPlatformMongoClientContext<TDbContext> where TDbContext : class, IPlatformMongoDbContext<TDbContext>
    {
        public PlatformMongoClientContext(IOptions<PlatformMongoOptions<TDbContext>> options) : base(options)
        {
        }
    }
}
