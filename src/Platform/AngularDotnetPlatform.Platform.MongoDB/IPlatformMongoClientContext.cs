using MongoDB.Driver;

namespace AngularDotnetPlatform.Platform.MongoDB
{
    public interface IPlatformMongoClientContext
    {
        public MongoClient MongoClient { get; }
    }

    public interface IPlatformMongoClientContext<TDbContext> : IPlatformMongoClientContext
        where TDbContext : class, IPlatformMongoDbContext<TDbContext>
    {
    }
}
