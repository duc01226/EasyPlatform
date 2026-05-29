using System.Linq.Expressions;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Entities;

namespace Easy.Platform.Application.Persistence;

public static class PlatformBulkUpsertMatchingHelper
{
    public static bool ShouldMatchExistingEntitiesByPredicate<TEntity, TPrimaryKey>(
        IReadOnlyCollection<TEntity> entities,
        Func<TEntity, Expression<Func<TEntity, bool>>>? customCheckExistingPredicateBuilder
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return customCheckExistingPredicateBuilder != null || GetUniqueCompositeIdExpression(entities.FirstOrDefault()) != null;
    }

    public static Expression<Func<TEntity, bool>> BuildExistingEntitiesPredicate<TEntity, TPrimaryKey>(
        IReadOnlyCollection<TEntity> entities,
        Func<TEntity, Expression<Func<TEntity, bool>>>? customCheckExistingPredicateBuilder
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        if (!ShouldMatchExistingEntitiesByPredicate<TEntity, TPrimaryKey>(entities, customCheckExistingPredicateBuilder))
        {
            var entityIds = entities.Select(p => p.Id);
            return p => entityIds.Contains(p.Id);
        }

        return entities
            .Select(entity => BuildExistingEntityMatchExpression(entity, customCheckExistingPredicateBuilder))
            .Aggregate((currentExpr, nextExpr) => currentExpr.Or(nextExpr));
    }

    public static List<(TEntity ToUpsertEntity, TEntity? MatchedExistingEntity)> MatchToExistingEntities<TEntity, TPrimaryKey>(
        IReadOnlyCollection<TEntity> toUpsertEntities,
        IReadOnlyList<TEntity> existingEntities,
        Func<TEntity, Expression<Func<TEntity, bool>>>? customCheckExistingPredicateBuilder
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        if (customCheckExistingPredicateBuilder == null && CanMatchByUniqueCompositeId<TEntity, TPrimaryKey>(toUpsertEntities))
            return MatchByUniqueCompositeId<TEntity, TPrimaryKey>(toUpsertEntities, existingEntities);

        var compiledMatchPredicates = toUpsertEntities
            .Select(toUpsertEntity => new
            {
                ToUpsertEntity = toUpsertEntity,
                MatchPredicate = BuildExistingEntityMatchExpression(toUpsertEntity, customCheckExistingPredicateBuilder).Compile()
            })
            .ToList();

        return compiledMatchPredicates
            .Select(p => (p.ToUpsertEntity, MatchedExistingEntity: existingEntities.FirstOrDefault(p.MatchPredicate)))
            .ToList();
    }

    private static List<(TEntity ToUpsertEntity, TEntity? MatchedExistingEntity)> MatchByUniqueCompositeId<TEntity, TPrimaryKey>(
        IReadOnlyCollection<TEntity> toUpsertEntities,
        IReadOnlyList<TEntity> existingEntities
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        var existingEntitiesByUniqueCompositeId = existingEntities
            .Select(existingEntity => new
            {
                ExistingEntity = existingEntity,
                UniqueCompositeId = existingEntity.As<IUniqueCompositeIdSupport>()?.UniqueCompositeId()
            })
            .Where(p => p.UniqueCompositeId != null)
            .GroupBy(p => p.UniqueCompositeId!)
            .ToDictionary(p => p.Key, p => p.First().ExistingEntity);

        return toUpsertEntities
            .Select(toUpsertEntity =>
            {
                var uniqueCompositeId = toUpsertEntity.As<IUniqueCompositeIdSupport>()?.UniqueCompositeId();
                var matchedExistingEntity =
                    uniqueCompositeId != null && existingEntitiesByUniqueCompositeId.TryGetValue(uniqueCompositeId, out var existingEntity)
                        ? existingEntity
                        : null;

                return (toUpsertEntity, MatchedExistingEntity: matchedExistingEntity);
            })
            .ToList();
    }

    private static bool CanMatchByUniqueCompositeId<TEntity, TPrimaryKey>(IReadOnlyCollection<TEntity> toUpsertEntities)
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return toUpsertEntities.All(toUpsertEntity =>
        {
            var uniqueCompositeIdSupport = toUpsertEntity.As<IUniqueCompositeIdSupport<TEntity>>();

            return uniqueCompositeIdSupport?.FindByUniqueCompositeIdExpr() != null && uniqueCompositeIdSupport.UniqueCompositeId() != null;
        });
    }

    private static Expression<Func<TEntity, bool>> BuildExistingEntityMatchExpression<TEntity>(
        TEntity entity,
        Func<TEntity, Expression<Func<TEntity, bool>>>? customCheckExistingPredicateBuilder
    )
        where TEntity : IEntity
    {
        return customCheckExistingPredicateBuilder?.Invoke(entity) ?? GetUniqueCompositeIdExpression(entity)!;
    }

    private static Expression<Func<TEntity, bool>>? GetUniqueCompositeIdExpression<TEntity>(TEntity? entity)
        where TEntity : IEntity
    {
        return entity?.As<IUniqueCompositeIdSupport<TEntity>>()?.FindByUniqueCompositeIdExpr();
    }
}
