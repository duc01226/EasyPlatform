using System.Linq.Expressions;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Application.Persistence.BulkUpdate;
using Easy.Platform.Domain.Entities;
using MongoDB.Driver;

namespace Easy.Platform.MongoDB.BulkUpdate;

public static class PlatformMongoBulkUpdateExtensions
{
    public static Task<int> UpdateManyNativeAsync<TDbContext, TEntity, TPrimaryKey>(
        this PlatformMongoDbContext<TDbContext> dbContext,
        Expression<Func<TEntity, bool>> predicate,
        UpdateDefinition<TEntity> updateDefinition,
        bool dismissSendEvent = false,
        PlatformBulkUpdateConcurrencyMode concurrencyMode = PlatformBulkUpdateConcurrencyMode.PreserveExistingSemantics,
        CancellationToken cancellationToken = default)
        where TDbContext : PlatformMongoDbContext<TDbContext>, IPlatformDbContext<TDbContext>
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        dbContext.EnsureProviderNativeDirectUpdateSupported<TEntity, TPrimaryKey>(dismissSendEvent, concurrencyMode);

        return dbContext.ExecuteProviderNativeDirectUpdateManyAsync<TEntity, TPrimaryKey>(
            predicate,
            updateDefinition,
            concurrencyMode,
            cancellationToken);
    }
}
