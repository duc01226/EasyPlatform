namespace NoCeiling.Duc.Interview.Test.Platform.MongoDB.Migration
{
    public class PlatformDataMigrationHistory
    {
        public PlatformDataMigrationHistory()
        {
        }

        public PlatformDataMigrationHistory(string name)
        {
            Name = name;
        }

        public string Name { get; set; }
    }
}
