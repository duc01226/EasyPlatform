using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Reflection;
using Easy.Platform.Common.Exceptions.Extensions;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Repositories;

namespace Easy.Platform.Domain.Entities;

/// <summary>
/// Static utility for loading navigation properties on entities.
/// Supports both single entity and batch loading with optimization.
/// </summary>
public static class PlatformNavigationLoader
{
    private static readonly ConcurrentDictionary<(Type, string), NavigationMetadata> MetadataCache = new();

    /// <summary>
    /// Loads a single navigation property on an entity.
    /// </summary>
    /// <typeparam name="TEntity">Source entity type</typeparam>
    /// <typeparam name="TNav">Navigation entity type</typeparam>
    /// <typeparam name="TKey">Key type</typeparam>
    /// <param name="entity">Entity to load navigation for</param>
    /// <param name="selector">Navigation property selector</param>
    /// <param name="resolver">Repository resolver</param>
    /// <param name="ctx">Optional load context for depth tracking</param>
    /// <param name="ct">Cancellation token</param>
    public static async Task LoadAsync<TEntity, TNav, TKey>(
        TEntity entity,
        Expression<Func<TEntity, TNav?>> selector,
        IPlatformRepositoryResolver resolver,
        PlatformNavigationLoadContext? ctx = null,
        CancellationToken ct = default)
        where TEntity : class, IEntity<TKey>
        where TNav : class, IEntity<TKey>, new()
    {
        resolver.EnsureFound();

        ctx ??= new PlatformNavigationLoadContext();
        var meta = GetMetadata<TEntity>(selector);

        if (!ctx.ShouldLoad(entity, meta.MaxDepth)) return;

        var fkValue = (TKey?)meta.ForeignKeyProperty.GetValue(entity);
        if (fkValue is null || EqualityComparer<TKey>.Default.Equals(fkValue, default!))
        {
            meta.NavigationProperty.SetValue(entity, null);
            return;
        }

        var repo = resolver.Resolve<TNav, TKey>();
        var related = await repo.GetByIdAsync(fkValue, ct);

        meta.NavigationProperty.SetValue(entity, related); // Always overwrite
    }

    /// <summary>
    /// Batch loads a single navigation property for multiple entities (single DB call).
    /// </summary>
    /// <typeparam name="TEntity">Source entity type</typeparam>
    /// <typeparam name="TNav">Navigation entity type</typeparam>
    /// <typeparam name="TKey">Key type</typeparam>
    /// <param name="entities">Entities to load navigation for</param>
    /// <param name="selector">Navigation property selector</param>
    /// <param name="resolver">Repository resolver</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Same list for fluent chaining</returns>
    public static async Task<List<TEntity>> LoadAsync<TEntity, TNav, TKey>(
        List<TEntity> entities,
        Expression<Func<TEntity, TNav?>> selector,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct = default)
        where TEntity : class, IEntity<TKey>
        where TNav : class, IEntity<TKey>, new()
    {
        resolver.EnsureFound();

        if (entities.IsNullOrEmpty()) return entities;

        var meta = GetMetadata<TEntity>(selector);
        var fkValues = entities
            .Select(e => (TKey?)meta.ForeignKeyProperty.GetValue(e))
            .Where(fk => fk is not null && !EqualityComparer<TKey>.Default.Equals(fk, default!))
            .Distinct()
            .ToList()!;

        if (fkValues.IsNullOrEmpty())
        {
            foreach (var e in entities) meta.NavigationProperty.SetValue(e, null);
            return entities;
        }

        var repo = resolver.Resolve<TNav, TKey>();
        var related = await repo.GetByIdsAsync(fkValues!, ct);

        var dict = related.ToDictionary(e => e.Id);

        foreach (var entity in entities)
        {
            var fk = (TKey?)meta.ForeignKeyProperty.GetValue(entity);
            var nav = fk is not null ? dict.GetValueOrDefault(fk) : null;
            meta.NavigationProperty.SetValue(entity, nav); // Always overwrite
        }

        return entities;
    }

    /// <summary>
    /// Loads a collection navigation property on an entity.
    /// </summary>
    /// <typeparam name="TEntity">Source entity type</typeparam>
    /// <typeparam name="TNav">Navigation entity type</typeparam>
    /// <typeparam name="TKey">Key type</typeparam>
    /// <param name="entity">Entity to load navigation for</param>
    /// <param name="selector">Navigation property selector (List)</param>
    /// <param name="resolver">Repository resolver</param>
    /// <param name="ctx">Optional load context for depth tracking</param>
    /// <param name="ct">Cancellation token</param>
    public static async Task LoadCollectionAsync<TEntity, TNav, TKey>(
        TEntity entity,
        Expression<Func<TEntity, List<TNav>?>> selector,
        IPlatformRepositoryResolver resolver,
        PlatformNavigationLoadContext? ctx = null,
        CancellationToken ct = default)
        where TEntity : class, IEntity<TKey>
        where TNav : class, IEntity<TKey>, new()
    {
        resolver.EnsureFound();

        ctx ??= new PlatformNavigationLoadContext();
        var meta = GetMetadataForCollection<TEntity>(selector);

        if (!ctx.ShouldLoad(entity, meta.MaxDepth)) return;

        var fkValues = meta.ForeignKeyProperty.GetValue(entity) is IEnumerable<TKey> enumValues ? enumValues.ToList() : [];

        if (!fkValues.Any())
        {
            meta.NavigationProperty.SetValue(entity, new List<TNav>());
            return;
        }

        // Preserve original FK order: fetch → dict → reorder by FK list
        var orderedResult = await resolver.Resolve<TNav, TKey>()
            .GetByIdsAsync(fkValues, ct)
            .Then(items => items.ToDictionary(e => e.Id))
            .Then(dict => fkValues.Where(dict.ContainsKey).Select(id => dict[id]).ToList());

        meta.NavigationProperty.SetValue(entity, orderedResult);
    }

    private static NavigationMetadata GetMetadata<TEntity>(LambdaExpression selector)
    {
        // Handle both MemberExpression and UnaryExpression (for null-forgiving operator like `e => e.Nav!`)
        var body = selector.Body;
        if (body is UnaryExpression unary)
            body = unary.Operand;

        var prop = ((MemberExpression)body).Member as PropertyInfo
                   ?? throw new ArgumentException("Selector must be a property expression");

        var key = (typeof(TEntity), prop.Name);
        return MetadataCache.GetOrAdd(
            key,
            _ =>
            {
                var attr = prop.GetCustomAttribute<PlatformNavigationPropertyAttribute>()
                           ?? throw new InvalidOperationException(
                               $"Property {prop.Name} must have [PlatformNavigationProperty] attribute");

                var fkProp = typeof(TEntity).GetProperty(attr.ForeignKeyProperty)
                             ?? throw new InvalidOperationException(
                                 $"Foreign key property '{attr.ForeignKeyProperty}' not found on {typeof(TEntity).Name}");

                return new NavigationMetadata(prop, fkProp, attr.Cardinality, attr.MaxDepth);
            });
    }

    private static NavigationMetadata GetMetadataForCollection<TEntity>(LambdaExpression selector)
    {
        // Handle both MemberExpression and UnaryExpression (for null-forgiving operator like `e => e.Nav!`)
        var body = selector.Body;
        if (body is UnaryExpression unary)
            body = unary.Operand;

        var prop = ((MemberExpression)body).Member as PropertyInfo
                   ?? throw new ArgumentException("Selector must be a property expression");

        var key = (typeof(TEntity), prop.Name);
        return MetadataCache.GetOrAdd(
            key,
            _ =>
            {
                var attr = prop.GetCustomAttribute<PlatformNavigationPropertyAttribute>()
                           ?? throw new InvalidOperationException(
                               $"Property {prop.Name} must have [PlatformNavigationProperty] attribute");

                if (attr.Cardinality != PlatformNavigationCardinality.Collection)
                {
                    throw new InvalidOperationException(
                        $"Property {prop.Name} must have Cardinality = Collection for collection loading");
                }

                var fkProp = typeof(TEntity).GetProperty(attr.ForeignKeyProperty)
                             ?? throw new InvalidOperationException(
                                 $"Foreign key property '{attr.ForeignKeyProperty}' not found on {typeof(TEntity).Name}");

                return new NavigationMetadata(prop, fkProp, attr.Cardinality, attr.MaxDepth);
            });
    }

    private sealed record NavigationMetadata(
        PropertyInfo NavigationProperty,
        PropertyInfo ForeignKeyProperty,
        PlatformNavigationCardinality Cardinality,
        int MaxDepth);
}
