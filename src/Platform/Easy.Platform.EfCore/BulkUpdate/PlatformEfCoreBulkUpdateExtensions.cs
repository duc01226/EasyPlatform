using System.Linq.Expressions;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Application.Persistence.BulkUpdate;
using Easy.Platform.Domain.Entities;
using Microsoft.EntityFrameworkCore.Query;

namespace Easy.Platform.EfCore.BulkUpdate;

public static class PlatformEfCoreBulkUpdateExtensions
{
    public static Task<int> UpdateManyNativeAsync<TDbContext, TEntity, TPrimaryKey>(
        this PlatformEfCoreDbContext<TDbContext> dbContext,
        Expression<Func<TEntity, bool>> predicate,
        Expression<Func<SetPropertyCalls<TEntity>, SetPropertyCalls<TEntity>>> setPropertyCalls,
        bool dismissSendEvent = false,
        PlatformBulkUpdateConcurrencyMode concurrencyMode = PlatformBulkUpdateConcurrencyMode.PreserveExistingSemantics,
        CancellationToken cancellationToken = default)
        where TDbContext : PlatformEfCoreDbContext<TDbContext>, IPlatformDbContext<TDbContext>
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        dbContext.EnsureProviderNativeDirectUpdateSupported<TEntity, TPrimaryKey>(dismissSendEvent, concurrencyMode);

        return dbContext.ExecuteProviderNativeDirectUpdateManyAsync<TEntity, TPrimaryKey>(
            predicate,
            setPropertyCalls,
            concurrencyMode,
            cancellationToken);
    }
}
