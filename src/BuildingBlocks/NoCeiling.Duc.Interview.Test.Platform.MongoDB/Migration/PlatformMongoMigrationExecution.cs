using System;

namespace NoCeiling.Duc.Interview.Test.Platform.MongoDB.Migration
{
    public abstract class PlatformMongoMigrationExecution<TDbContext>
        where TDbContext : IPlatformMongoDbContext<TDbContext>
    {
        public abstract string Name { get; }
        public abstract void Execute(TDbContext dbContext);
    }
}
