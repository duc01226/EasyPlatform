using System;

namespace Easy.Platform.MongoDB.Migration
{
    public class PlatformMongoMigrationHistory
    {
        private DateTime? createdDate;

        public PlatformMongoMigrationHistory()
        {
        }

        public PlatformMongoMigrationHistory(string name)
        {
            Name = name;
        }

        public string Name { get; set; }
        public DateTime CreatedDate
        {
            get
            {
                return createdDate ?? new DateTime();
            }
            set
            {
                createdDate = value;
            }
        }
    }
}
