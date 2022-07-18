using Easy.Platform.Domain.Entities;
using Easy.Platform.Persistence.DataMigration;

namespace Easy.Platform.Application.Persistence
{
    public interface IPlatformDbContext : IDisposable
    {
        IQueryable<PlatformDataMigrationHistory> ApplicationDataMigrationHistoryQuery { get; }
        Task SaveChangesAsync();
        IQueryable<TEntity> GetQuery<TEntity>() where TEntity : class, IEntity;
        void RunCommand(string command);
        Task MigrateApplicationDataAsync(IServiceProvider serviceProvider);
        void Initialize(IServiceProvider serviceProvider, bool isDevEnvironment);
        Task<List<T>> GetAllAsync<T>(IQueryable<T> query, CancellationToken cancellationToken = default);
        Task<T> FirstOrDefaultAsync<T>(IQueryable<T> query, CancellationToken cancellationToken = default);
    }
}
