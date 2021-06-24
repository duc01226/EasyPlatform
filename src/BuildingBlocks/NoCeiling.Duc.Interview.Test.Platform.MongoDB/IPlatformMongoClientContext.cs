using MongoDB.Driver;

namespace NoCeiling.Duc.Interview.Test.Platform.EfCore
{
    public interface IPlatformMongoClientContext
    {
        public MongoClient MongoClient { get; }
    }
}
