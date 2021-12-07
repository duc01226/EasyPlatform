using System;

namespace AngularDotnetPlatform.Platform.Persistence
{
    public class PlatformDataMigrationHistory
    {
        private DateTime? createdDate;

        public PlatformDataMigrationHistory()
        {
        }

        public PlatformDataMigrationHistory(string name)
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

    /// <summary>
    /// This class is used to run APPLICATION DATA migration, when you need to migrate your data in your whole micro services application.
    /// Each class will be initiated and executed via Execute method.
    /// The order of execution of all migration classes will be order ascending by Order then by Name;
    /// </summary>
    public abstract class PlatformMigrationExecution<TDbContext>
        where TDbContext : IPlatformDbContext
    {
        public abstract string Name { get; }
        public virtual int Order => 0;
        public abstract void Execute(TDbContext dbContext);

        /// <summary>
        /// Get order value string. This will be used to order migrations for execution.
        /// <br/>
        /// Example: "00001_MigrationName"
        /// </summary>
        public string GetOrderByValue()
        {
            return $"{Order:D5}_{Name}";
        }
    }
}
