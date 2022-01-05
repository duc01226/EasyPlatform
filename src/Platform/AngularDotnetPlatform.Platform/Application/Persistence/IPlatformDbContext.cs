using System;
using System.Linq;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Persistence.DataMigration;

namespace AngularDotnetPlatform.Platform.Application.Persistence
{
    public interface IPlatformDbContext : IDisposable
    {
        IQueryable<PlatformDataMigrationHistory> ApplicationDataMigrationHistoryQuery { get; }
        Task SaveChangesAsync();
        IQueryable<TEntity> GetQuery<TEntity>() where TEntity : class, IEntity;
        void RunCommand(string command);
        Task MigrateApplicationDataAsync(IServiceProvider serviceProvider);
        void Initialize(IServiceProvider serviceProvider);
    }
}
