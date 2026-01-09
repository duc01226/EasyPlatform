using System.Collections;
using System.Collections.Concurrent;
using System.Linq.Expressions;
using System.Reflection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Repositories;

namespace Easy.Platform.MongoDB.Extensions;

/// <summary>
/// Extension methods for loading navigation properties in MongoDB repositories.
/// Bridges the gap between loadRelatedEntities expressions and PlatformNavigationLoader.
/// MongoDB doesn't support .Include() like EF Core, so we load navigations post-query.
/// Supports deep/nested navigation expressions like e => e.Parent1.Parent2.
/// </summary>
public static class PlatformMongoDbNavigationLoadingExtensions
{
    #region Reflection Cache

    /// <summary>
    /// Cache for resolved MethodInfo to avoid repeated reflection lookups.
    /// Key: (MethodName, DistinguishingKey) → Value: MethodInfo
    /// </summary>
    private static readonly ConcurrentDictionary<(string Name, string Key), MethodInfo> MethodCache = new();

    /// <summary>
    /// Cache for IPlatformRepositoryResolver.Resolve method.
    /// </summary>
    private static MethodInfo? resolveMethodCache;

    /// <summary>
    /// Gets cached LoadAsync method for single entity loading.
    /// </summary>
    private static MethodInfo GetSingleEntityLoadMethod()
    {
        return MethodCache.GetOrAdd(
            ("LoadAsync", "SingleEntity"),
            _ => typeof(PlatformNavigationLoader)
                .GetMethods()
                .First(m => m.Name == nameof(PlatformNavigationLoader.LoadAsync) &&
                            m.GetParameters().Length == 5 &&
                            m.GetParameters()[0].ParameterType.IsGenericType == false));
    }

    /// <summary>
    /// Gets cached LoadAsync method for batch entity loading.
    /// </summary>
    private static MethodInfo GetBatchEntityLoadMethod()
    {
        return MethodCache.GetOrAdd(
            ("LoadAsync", "BatchEntity"),
            _ => typeof(PlatformNavigationLoader)
                .GetMethods()
                .First(m => m.Name == nameof(PlatformNavigationLoader.LoadAsync) &&
                            m.GetParameters().Length == 4 &&
                            m.GetParameters()[0].ParameterType.IsGenericType &&
                            m.GetParameters()[0].ParameterType.GetGenericTypeDefinition() == typeof(List<>)));
    }

    /// <summary>
    /// Gets cached LoadCollectionAsync method.
    /// </summary>
    private static MethodInfo GetCollectionLoadMethod()
    {
        return MethodCache.GetOrAdd(
            ("LoadCollectionAsync", "Collection"),
            _ => typeof(PlatformNavigationLoader)
                .GetMethod(nameof(PlatformNavigationLoader.LoadCollectionAsync))!);
    }

    /// <summary>
    /// Gets cached IPlatformRepositoryResolver.Resolve method with 2 generic parameters.
    /// </summary>
    private static MethodInfo GetResolveMethod()
    {
        return resolveMethodCache ??= typeof(IPlatformRepositoryResolver)
            .GetMethods()
            .First(m => m.Name == nameof(IPlatformRepositoryResolver.Resolve) &&
                        m.GetGenericArguments().Length == 2);
    }

    /// <summary>
    /// Cache for Id property lookups by type.
    /// </summary>
    private static readonly ConcurrentDictionary<Type, PropertyInfo?> IdPropertyCache = new();

    /// <summary>
    /// Cache for GetByIdAsync method lookups by repository type.
    /// </summary>
    private static readonly ConcurrentDictionary<Type, MethodInfo?> GetByIdMethodCache = new();

    /// <summary>
    /// Cache for GetByIdsAsync method lookups by repository type.
    /// </summary>
    private static readonly ConcurrentDictionary<Type, MethodInfo?> GetByIdsMethodCache = new();

    /// <summary>
    /// Gets cached Id property for a type.
    /// </summary>
    private static PropertyInfo? GetIdProperty(Type type)
    {
        return IdPropertyCache.GetOrAdd(type, t => t.GetProperty("Id"));
    }

    /// <summary>
    /// Gets cached GetByIdAsync method for a repository type.
    /// </summary>
    private static MethodInfo? GetCachedGetByIdMethod(Type repoType, object id)
    {
        return GetByIdMethodCache.GetOrAdd(repoType, t =>
            t.GetMethods()
                .FirstOrDefault(m =>
                    m.Name == "GetByIdAsync" &&
                    m.GetParameters().Length >= 2 &&
                    m.GetParameters()[0].ParameterType.IsInstanceOfType(id)));
    }

    /// <summary>
    /// Gets cached GetByIdsAsync method for a repository type.
    /// </summary>
    private static MethodInfo? GetCachedGetByIdsMethod(Type repoType)
    {
        return GetByIdsMethodCache.GetOrAdd(repoType, t =>
            t.GetMethods()
                .FirstOrDefault(m =>
                    m.Name == "GetByIdsAsync" &&
                    m.GetParameters().Length >= 2 &&
                    m.GetParameters()[0].ParameterType.IsGenericType));
    }

    #endregion

    #region Public API

    /// <summary>
    /// Loads specified navigation properties for a single entity after MongoDB query.
    /// Supports deep navigation like e => e.Parent1.Parent2.
    /// </summary>
    /// <typeparam name="TEntity">Entity type</typeparam>
    /// <typeparam name="TPrimaryKey">Primary key type</typeparam>
    /// <param name="entity">Entity to load navigations for</param>
    /// <param name="loadRelatedEntities">Navigation property selectors (supports nested)</param>
    /// <param name="resolver">Repository resolver for loading related entities</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Entity with loaded navigation properties</returns>
    public static async Task<TEntity?> LoadNavigationsAsync<TEntity, TPrimaryKey>(
        this TEntity? entity,
        Expression<Func<TEntity, object?>>[] loadRelatedEntities,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct = default)
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        if (entity == null || loadRelatedEntities.IsNullOrEmpty())
            return entity;

        await loadRelatedEntities.ParallelAsync(expr => LoadNavigationExpressionAsync<TEntity, TPrimaryKey>(entity, expr, resolver, ct));

        return entity;
    }

    /// <summary>
    /// Batch loads specified navigation properties for multiple entities.
    /// Uses aggregated batch loading at each level to prevent N+1 queries.
    /// Supports deep navigation like e => e.Parent1.Parent2.
    /// </summary>
    public static async Task<List<TEntity>> LoadNavigationsAsync<TEntity, TPrimaryKey>(
        this List<TEntity> entities,
        Expression<Func<TEntity, object?>>[] loadRelatedEntities,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct = default)
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        if (entities.IsNullOrEmpty() || loadRelatedEntities.IsNullOrEmpty())
            return entities;

        await loadRelatedEntities.ParallelAsync(expr => LoadNavigationExpressionBatchAsync<TEntity, TPrimaryKey>(entities, expr, resolver, ct));

        return entities;
    }

    #endregion

    #region Navigation Step Model

    /// <summary>
    /// Represents one step in a navigation chain.
    /// For e => e.Dept.Company: [(Dept, TEntity), (Company, Dept)]
    /// </summary>
    private sealed record NavigationStep(
        PropertyInfo Property,
        Type OwnerType,
        Type PropertyType,
        PlatformNavigationPropertyAttribute? Attribute)
    {
        public bool IsCollection => Attribute?.Cardinality == PlatformNavigationCardinality.Collection;
        public Type ElementType => IsCollection ? GetElementTypeOrSelf(PropertyType) : PropertyType;

        /// <summary>
        /// Gets element type for collections, or the type itself for non-collections.
        /// </summary>
        private static Type GetElementTypeOrSelf(Type type)
        {
            if (type.IsGenericType)
            {
                var genericDef = type.GetGenericTypeDefinition();
                if (genericDef == typeof(List<>) || genericDef == typeof(IList<>) ||
                    genericDef == typeof(ICollection<>) || genericDef == typeof(IEnumerable<>))
                {
                    return type.GetGenericArguments()[0];
                }
            }

            return type;
        }
    }

    #endregion

    #region Expression Chain Parser (Phase 1)

    /// <summary>
    /// Extracts navigation chain from nested member expressions.
    /// For: e => e.Parent1.Parent2.Parent3
    /// Returns: [(Parent1, TEntity), (Parent2, Parent1Type), (Parent3, Parent2Type)]
    /// </summary>
    private static List<NavigationStep> ExtractNavigationChain(LambdaExpression expression)
    {
        var chain = new List<NavigationStep>();
        var body = expression.Body;

        // Handle Convert expressions (boxing to object)
        if (body is UnaryExpression unary && unary.NodeType == ExpressionType.Convert)
            body = unary.Operand;

        // Walk the expression tree from leaf to root
        while (body is MemberExpression member && member.Member is PropertyInfo prop)
        {
            var ownerType = member.Expression?.Type ?? prop.DeclaringType!;
            var attr = prop.GetCustomAttribute<PlatformNavigationPropertyAttribute>();

            // Insert at beginning to maintain root→leaf order
            chain.Insert(0, new NavigationStep(prop, ownerType, prop.PropertyType, attr));

            body = member.Expression;
        }

        return chain;
    }

    #endregion

    #region Single Entity Loading (Phase 2)

    /// <summary>
    /// Loads a navigation expression on a single entity.
    /// Handles both single-level and deep navigation chains.
    /// </summary>
    private static async Task LoadNavigationExpressionAsync<TEntity, TPrimaryKey>(
        TEntity entity,
        Expression<Func<TEntity, object?>> navExpr,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct)
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        var chain = ExtractNavigationChain(navExpr);
        if (chain.IsNullOrEmpty()) return;

        // Single level: use optimized typed path
        if (chain.Count == 1)
        {
            var step = chain[0];
            if (step.Attribute == null) return;

            if (step.IsCollection)
                await LoadCollectionNavigationTypedAsync<TEntity, TPrimaryKey>(entity, step, resolver, ct);
            else
                await LoadSingleNavigationTypedAsync<TEntity, TPrimaryKey>(entity, step, resolver, ct);

            return;
        }

        // Multi-level: recursive chain loading
        await LoadNavigationChainAsync(entity, chain, resolver, ct);
    }

    /// <summary>
    /// Loads navigation chain on a single entity, level by level.
    /// Short-circuits if any intermediate value is null.
    /// </summary>
    private static async Task LoadNavigationChainAsync(
        object entity,
        List<NavigationStep> chain,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct)
    {
        var current = entity;

        foreach (var step in chain)
        {
            if (current == null) break;
            if (step.Attribute == null) break;

            // Handle case where current is a collection (from previous step)
            if (current is IEnumerable enumerable && current is not string && !step.OwnerType.IsInstanceOfType(current))
            {
                // Load navigation on each element of the collection
                var elements = enumerable.Cast<object>().Where(e => e != null).ToList();
                await elements.ParallelAsync(element => LoadSingleNavigationOnObjectAsync(element, step, resolver, ct));

                // Collect loaded values for next level
                current = CollectNavigationValuesFromCollection(elements, step);
                continue;
            }

            // Load this level on current object
            await LoadSingleNavigationOnObjectAsync(current, step, resolver, ct);

            // Move to loaded value for next iteration
            current = step.Property.GetValue(current);
        }
    }

    /// <summary>
    /// Loads a single navigation property on an object using reflection.
    /// </summary>
    private static async Task LoadSingleNavigationOnObjectAsync(
        object entity,
        NavigationStep step,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct)
    {
        var fkProp = step.OwnerType.GetProperty(step.Attribute!.ForeignKeyProperty);
        if (fkProp == null) return;

        var fkValue = fkProp.GetValue(entity);

        if (step.IsCollection)
            await LoadCollectionNavigationReflectionAsync(entity, step, fkValue, resolver, ct);
        else
            await LoadSingleNavigationReflectionAsync(entity, step, fkValue, resolver, ct);
    }

    /// <summary>
    /// Loads single navigation using repository resolver via reflection.
    /// </summary>
    private static async Task LoadSingleNavigationReflectionAsync(
        object entity,
        NavigationStep step,
        object? fkValue,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct)
    {
        if (fkValue == null)
        {
            step.Property.SetValue(entity, null);
            return;
        }

        var navEntityType = step.ElementType;
        var fkType = Nullable.GetUnderlyingType(fkValue.GetType()) ?? fkValue.GetType();

        // Resolve repository
        var repo = ResolveRepository(resolver, navEntityType, fkType);
        if (repo == null) return;

        // Call GetByIdAsync
        var loaded = await InvokeGetByIdAsync(repo, fkValue, ct);
        step.Property.SetValue(entity, loaded);
    }

    /// <summary>
    /// Loads collection navigation using repository resolver via reflection.
    /// </summary>
    private static async Task LoadCollectionNavigationReflectionAsync(
        object entity,
        NavigationStep step,
        object? fkValue,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct)
    {
        var navEntityType = step.ElementType;

        if (fkValue is not IEnumerable fkValues)
        {
            SetEmptyCollection(entity, step, navEntityType);
            return;
        }

        var fkList = fkValues.Cast<object>().Where(x => x != null).Distinct().ToList();
        if (fkList.Count == 0)
        {
            SetEmptyCollection(entity, step, navEntityType);
            return;
        }

        var fkType = fkList[0].GetType();
        var repo = ResolveRepository(resolver, navEntityType, fkType);
        if (repo == null) return;

        var loaded = await InvokeGetByIdsAsync(repo, fkList, fkType, ct);
        step.Property.SetValue(entity, loaded);
    }

    /// <summary>
    /// Collects loaded navigation values from collection elements for next level.
    /// </summary>
    private static List<object> CollectNavigationValuesFromCollection(IEnumerable<object> elements, NavigationStep step)
    {
        var values = new List<object>();

        foreach (var element in elements)
        {
            var nav = step.Property.GetValue(element);
            if (nav == null) continue;

            if (step.IsCollection && nav is IEnumerable navCollection)
            {
                foreach (var item in navCollection.Cast<object>())
                    if (item != null) values.Add(item);
            }
            else
            {
                values.Add(nav);
            }
        }

        return values.Distinct().ToList();
    }

    #endregion

    #region Batch Entity Loading (Phase 3)

    /// <summary>
    /// Loads a navigation expression on multiple entities with aggregated batch loading.
    /// </summary>
    private static async Task LoadNavigationExpressionBatchAsync<TEntity, TPrimaryKey>(
        List<TEntity> entities,
        Expression<Func<TEntity, object?>> navExpr,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct)
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        var chain = ExtractNavigationChain(navExpr);
        if (chain.IsNullOrEmpty()) return;

        // Single level: use optimized typed batch path
        if (chain.Count == 1)
        {
            var step = chain[0];
            if (step.Attribute == null) return;

            if (step.IsCollection)
                await entities.ParallelAsync(entity => LoadCollectionNavigationTypedAsync<TEntity, TPrimaryKey>(entity, step, resolver, ct));
            else
                await LoadSingleNavigationBatchTypedAsync<TEntity, TPrimaryKey>(entities, step, resolver, ct);

            return;
        }

        // Multi-level: aggregated batch chain loading
        await LoadNavigationChainBatchAsync(entities.Cast<object>().ToList(), typeof(TEntity), chain, resolver, ct);
    }

    /// <summary>
    /// Loads navigation chain for multiple entities with aggregated batch loading at each level.
    /// Prevents N+1 problem at all depths.
    /// </summary>
    private static async Task LoadNavigationChainBatchAsync(
        List<object> entities,
        Type entityType,
        List<NavigationStep> chain,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct)
    {
        if (chain.IsNullOrEmpty() || entities.Count == 0) return;

        var currentLevelEntities = entities;
        var currentEntityType = entityType;

        foreach (var step in chain)
        {
            if (currentLevelEntities.Count == 0) break;
            if (step.Attribute == null) break;

            // Batch load this level's navigation
            await BatchLoadNavigationOnEntitiesAsync(
                currentLevelEntities,
                currentEntityType,
                step,
                resolver,
                ct);

            // Collect loaded navigation values for next level
            (currentLevelEntities, currentEntityType) = CollectLoadedNavigationsForNextLevel(
                currentLevelEntities,
                step);
        }
    }

    /// <summary>
    /// Batch loads a navigation property on all entities at current level.
    /// </summary>
    private static async Task BatchLoadNavigationOnEntitiesAsync(
        List<object> entities,
        Type entityType,
        NavigationStep step,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct)
    {
        var fkProp = entityType.GetProperty(step.Attribute!.ForeignKeyProperty);
        if (fkProp == null) return;

        var navEntityType = step.ElementType;

        if (step.IsCollection)
        {
            // Collection navigation: load per-entity (each has its own FK list)
            await entities.ParallelAsync(async entity =>
            {
                var fkValue = fkProp.GetValue(entity);
                await LoadCollectionNavigationReflectionAsync(entity, step, fkValue, resolver, ct);
            });

            return;
        }

        // Single navigation: batch load all at once
        // Use HashSet for O(1) duplicate check instead of O(n) List.Contains
        var fkSet = new HashSet<object>();
        var fkValues = new List<object>(entities.Count);
        foreach (var entity in entities)
        {
            var fk = fkProp.GetValue(entity);
            if (fk != null && fkSet.Add(fk))
                fkValues.Add(fk);
        }

        if (fkValues.Count == 0)
        {
            foreach (var entity in entities)
                step.Property.SetValue(entity, null);
            return;
        }

        var fkType = Nullable.GetUnderlyingType(fkProp.PropertyType) ?? fkProp.PropertyType;
        var repo = ResolveRepository(resolver, navEntityType, fkType);
        if (repo == null) return;

        // Batch load all related entities
        var loadedList = await InvokeGetByIdsAsync(repo, fkValues, fkType, ct);
        if (loadedList == null) return;

        // Build FK → entity dictionary
        var idProp = GetIdProperty(navEntityType);
        var dict = new Dictionary<object, object>();
        foreach (var loaded in (IEnumerable)loadedList)
        {
            var id = idProp?.GetValue(loaded);
            if (id != null) dict[id] = loaded;
        }

        // Set navigation values on each entity
        foreach (var entity in entities)
        {
            var fk = fkProp.GetValue(entity);
            var nav = fk != null && dict.TryGetValue(fk, out var v) ? v : null;
            step.Property.SetValue(entity, nav);
        }
    }

    /// <summary>
    /// Collects loaded navigation values to use as entities for next level.
    /// </summary>
    private static (List<object> Entities, Type EntityType) CollectLoadedNavigationsForNextLevel(
        List<object> currentEntities,
        NavigationStep step)
    {
        var nextEntities = new List<object>();
        var navType = step.ElementType;

        foreach (var entity in currentEntities)
        {
            var nav = step.Property.GetValue(entity);
            if (nav == null) continue;

            if (step.IsCollection && nav is IEnumerable collection)
            {
                foreach (var item in collection.Cast<object>())
                    if (item != null) nextEntities.Add(item);
            }
            else
            {
                nextEntities.Add(nav);
            }
        }

        // Remove duplicates by Id
        var idProp = GetIdProperty(navType);
        if (idProp != null)
        {
            nextEntities = nextEntities
                .GroupBy(e => idProp.GetValue(e))
                .Select(g => g.First())
                .ToList();
        }

        return (nextEntities, navType);
    }

    #endregion

    #region Typed Loading Helpers (Optimized Single-Level)

    /// <summary>
    /// Loads single navigation using typed PlatformNavigationLoader.
    /// </summary>
    private static async Task LoadSingleNavigationTypedAsync<TEntity, TPrimaryKey>(
        TEntity entity,
        NavigationStep step,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct)
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        var genericMethod = GetSingleEntityLoadMethod()
            .MakeGenericMethod(typeof(TEntity), step.ElementType, typeof(TPrimaryKey));

        var param = Expression.Parameter(typeof(TEntity), "e");
        var propAccess = Expression.Property(param, step.Property);
        var converted = Expression.Convert(propAccess, step.ElementType);
        var lambda = Expression.Lambda(converted, param);

        await (Task)genericMethod.Invoke(null, [entity, lambda, resolver, null, ct])!;
    }

    /// <summary>
    /// Batch loads single navigation using typed PlatformNavigationLoader.
    /// </summary>
    private static async Task LoadSingleNavigationBatchTypedAsync<TEntity, TPrimaryKey>(
        List<TEntity> entities,
        NavigationStep step,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct)
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        var genericMethod = GetBatchEntityLoadMethod()
            .MakeGenericMethod(typeof(TEntity), step.ElementType, typeof(TPrimaryKey));

        var param = Expression.Parameter(typeof(TEntity), "e");
        var propAccess = Expression.Property(param, step.Property);
        var converted = Expression.Convert(propAccess, step.ElementType);
        var lambda = Expression.Lambda(converted, param);

        await (Task)genericMethod.Invoke(null, [entities, lambda, resolver, ct])!;
    }

    /// <summary>
    /// Loads collection navigation using typed PlatformNavigationLoader.
    /// </summary>
    private static async Task LoadCollectionNavigationTypedAsync<TEntity, TPrimaryKey>(
        TEntity entity,
        NavigationStep step,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct)
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        var genericMethod = GetCollectionLoadMethod()
            .MakeGenericMethod(typeof(TEntity), step.ElementType, typeof(TPrimaryKey));

        var param = Expression.Parameter(typeof(TEntity), "e");
        var propAccess = Expression.Property(param, step.Property);
        var listType = typeof(List<>).MakeGenericType(step.ElementType);
        var converted = Expression.Convert(propAccess, listType);
        var lambda = Expression.Lambda(converted, param);

        await (Task)genericMethod.Invoke(null, [entity, lambda, resolver, null, ct])!;
    }

    #endregion

    #region Reflection Helpers

    /// <summary>
    /// Resolves repository for given entity and key types.
    /// </summary>
    private static object? ResolveRepository(IPlatformRepositoryResolver resolver, Type entityType, Type keyType)
    {
        var resolveMethod = GetResolveMethod().MakeGenericMethod(entityType, keyType);
        return resolveMethod.Invoke(resolver, null);
    }

    /// <summary>
    /// Invokes GetByIdAsync on repository via reflection.
    /// </summary>
    private static async Task<object?> InvokeGetByIdAsync(object repo, object id, CancellationToken ct)
    {
        var getByIdMethod = GetCachedGetByIdMethod(repo.GetType(), id);
        if (getByIdMethod == null) return null;

        var parameters = getByIdMethod.GetParameters();
        var args = new object?[parameters.Length];
        args[0] = id;

        for (var i = 1; i < parameters.Length; i++)
        {
            if (parameters[i].ParameterType == typeof(CancellationToken))
                args[i] = ct;
            else if (parameters[i].HasDefaultValue)
                args[i] = parameters[i].DefaultValue;
            else
                args[i] = null;
        }

        var task = (Task)getByIdMethod.Invoke(repo, args)!;
        await task;

        var resultProp = task.GetType().GetProperty("Result");
        return resultProp?.GetValue(task);
    }

    /// <summary>
    /// Invokes GetByIdsAsync on repository via reflection.
    /// </summary>
    private static async Task<object?> InvokeGetByIdsAsync(object repo, List<object> ids, Type keyType, CancellationToken ct)
    {
        var listType = typeof(List<>).MakeGenericType(keyType);
        var typedList = (IList)Activator.CreateInstance(listType)!;
        foreach (var id in ids) typedList.Add(id);

        var getByIdsMethod = GetCachedGetByIdsMethod(repo.GetType());
        if (getByIdsMethod == null) return null;

        var parameters = getByIdsMethod.GetParameters();
        var args = new object?[parameters.Length];
        args[0] = typedList;

        for (var i = 1; i < parameters.Length; i++)
        {
            if (parameters[i].ParameterType == typeof(CancellationToken))
                args[i] = ct;
            else if (parameters[i].HasDefaultValue)
                args[i] = parameters[i].DefaultValue;
            else
                args[i] = null;
        }

        var task = (Task)getByIdsMethod.Invoke(repo, args)!;
        await task;

        var resultProp = task.GetType().GetProperty("Result");
        return resultProp?.GetValue(task);
    }

    /// <summary>
    /// Sets an empty collection on the navigation property.
    /// </summary>
    private static void SetEmptyCollection(object entity, NavigationStep step, Type elementType)
    {
        var listType = typeof(List<>).MakeGenericType(elementType);
        var emptyList = Activator.CreateInstance(listType);
        step.Property.SetValue(entity, emptyList);
    }

    #endregion
}
