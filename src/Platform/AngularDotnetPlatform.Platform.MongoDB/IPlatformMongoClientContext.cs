using MongoDB.Driver;

namespace AngularDotnetPlatform.Platform.EfCore
{
    public interface IPlatformMongoClientContext
    {
        public MongoClient MongoClient { get; }
    }
}
