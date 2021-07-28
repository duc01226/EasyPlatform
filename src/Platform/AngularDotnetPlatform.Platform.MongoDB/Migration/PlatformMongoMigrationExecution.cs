using System;

namespace AngularDotnetPlatform.Platform.MongoDB.Migration
{
    public abstract class PlatformMongoMigrationExecution<TDbContext>
        where TDbContext : IPlatformMongoDbContext<TDbContext>
    {
        public abstract string Name { get; }
        public abstract void Execute(TDbContext dbContext);
    }
}
