using System;

namespace NoCeiling.Duc.Interview.Test.Platform.MongoDB.Migration
{
    public class PlatformMongoMigrationExecution<TDbContext>
        where TDbContext : IPlatformMongoDbContext<TDbContext>
    {
        public PlatformMongoMigrationExecution(string name, Action<TDbContext> execute)
        {
            Name = name;
            Execute = execute;
        }

        public string Name { get; }
        public Action<TDbContext> Execute { get; }
    }
}
