using System.Linq;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.Entities;

namespace AngularDotnetPlatform.Platform.Persistence
{
    public interface IPlatformDbContext
    {
        IQueryable<PlatformDataMigrationHistory> DataMigrationHistoryQuery { get; }
        Task SaveChanges();
        IQueryable<TEntity> GetQuery<TEntity>() where TEntity : IEntity;
        Task RunCommand(string command);
    }
}
