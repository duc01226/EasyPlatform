namespace AngularDotnetPlatform.Platform.MongoDB.Migration
{
    /// <summary>
    /// This class is used to run migration for mongodb. Each class will be initiated and executed via Execute method.
    /// The order of execution of all migration classes will be order ascending by Order then by Name; 
    /// </summary>
    public abstract class PlatformMongoMigrationExecution<TDbContext>
        where TDbContext : IPlatformMongoDbContext<TDbContext>
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
