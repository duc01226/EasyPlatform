using System.Linq.Expressions;

namespace Easy.Platform.Application.Persistence.BulkUpdate;

public enum PlatformBulkUpdateConcurrencyMode
{
    PreserveExistingSemantics = 0,
    BypassOptimisticConcurrencyAndStampToken = 1
}

public interface IPlatformBulkUpdateBuilder<TEntity>
{
    IPlatformBulkUpdateBuilder<TEntity> Set<TProperty>(
        Expression<Func<TEntity, TProperty>> property,
        TProperty value);

    IPlatformBulkUpdateBuilder<TEntity> Inc<TProperty>(
        Expression<Func<TEntity, TProperty>> property,
        TProperty value);

    IPlatformBulkUpdateBuilder<TEntity> Mul<TProperty>(
        Expression<Func<TEntity, TProperty>> property,
        TProperty value);
}
