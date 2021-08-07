using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.MongoDB.Migration;
using MongoDB.Driver;

namespace AngularDotnetPlatform.Platform.MongoDB
{
    public interface IPlatformMongoDbContext<TDbContext>
        where TDbContext : IPlatformMongoDbContext<TDbContext>
    {
        IMongoCollection<PlatformDataMigrationHistory> DataMigrationHistoryCollection { get; }
        string DataMigrationHistoryCollectionName { get; }

        Task EnsureIndexesAsync(bool recreate = false);
        string GenerateId();
        void Initialize();
        void Migrate();
        string GetCollectionName<TEntity>();
        IMongoCollection<TEntity> GetCollection<TEntity>();
        Task<List<T>> ToListAsync<T>(IQueryable<T> query);
        Task<T> FirstOrDefaultAsync<T>(IQueryable<T> query);
        IQueryable<T> GetQueryable<T>(string dataSourceName);
        void RunCommand(string command);
        List<PlatformMongoMigrationExecution<TDbContext>> MigrationExecutions();
    }
}
