using NoCeiling.Duc.Interview.Test.Platform.MongoDB;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace NoCeiling.Duc.Interview.Test.Platform.EfCore
{
    public class PlatformMongoClientContext : IPlatformMongoClientContext
    {
        public PlatformMongoClientContext(IOptions<PlatformMongoOptions> options)
        {
            MongoClient = new MongoClient(options.Value.ConnectionString);
        }

        public MongoClient MongoClient { get; }
    }
}
