using System.Linq.Expressions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Repositories;

namespace Easy.Platform.Domain.Extensions;

/// <summary>
/// Extension methods for fluent navigation property loading.
/// </summary>
public static class PlatformNavigationExtensions
{
    /// <summary>
    /// Loads a navigation property for a list of entities (batch, single DB call).
    /// </summary>
    /// <typeparam name="TEntity">Source entity type</typeparam>
    /// <typeparam name="TNav">Navigation entity type</typeparam>
    /// <param name="entities">Entities to load navigation for</param>
    /// <param name="selector">Navigation property selector</param>
    /// <param name="resolver">Repository resolver</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Same list for fluent chaining</returns>
    public static async Task<List<TEntity>> LoadNavigationAsync<TEntity, TNav>(
        this List<TEntity> entities,
        Expression<Func<TEntity, TNav?>> selector,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct = default)
        where TEntity : class, IRootEntity<string>
        where TNav : class, IRootEntity<string>, new()
    {
        return await PlatformNavigationLoader.LoadAsync<TEntity, TNav, string>(
            entities,
            selector,
            resolver,
            ct);
    }

    /// <summary>
    /// Loads a navigation property for a list of entities from a Task (fluent chaining).
    /// </summary>
    /// <typeparam name="TEntity">Source entity type</typeparam>
    /// <typeparam name="TNav">Navigation entity type</typeparam>
    /// <param name="task">Task returning entities</param>
    /// <param name="selector">Navigation property selector</param>
    /// <param name="resolver">Repository resolver</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Entities with navigation loaded</returns>
    public static async Task<List<TEntity>> LoadNavigationAsync<TEntity, TNav>(
        this Task<List<TEntity>> task,
        Expression<Func<TEntity, TNav?>> selector,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct = default)
        where TEntity : class, IRootEntity<string>
        where TNav : class, IRootEntity<string>, new()
    {
        var entities = await task;
        return await entities.LoadNavigationAsync(selector, resolver, ct);
    }

    /// <summary>
    /// Loads a navigation property for a list of entities with custom key type.
    /// </summary>
    /// <typeparam name="TEntity">Source entity type</typeparam>
    /// <typeparam name="TNav">Navigation entity type</typeparam>
    /// <typeparam name="TKey">Key type</typeparam>
    /// <param name="entities">Entities to load navigation for</param>
    /// <param name="selector">Navigation property selector</param>
    /// <param name="resolver">Repository resolver</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Same list for fluent chaining</returns>
    public static async Task<List<TEntity>> LoadNavigationAsync<TEntity, TNav, TKey>(
        this List<TEntity> entities,
        Expression<Func<TEntity, TNav?>> selector,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct = default)
        where TEntity : class, IEntity<TKey>
        where TNav : class, IRootEntity<TKey>, new()
    {
        return await PlatformNavigationLoader.LoadAsync<TEntity, TNav, TKey>(
            entities,
            selector,
            resolver,
            ct);
    }

    /// <summary>
    /// Loads a collection navigation property for a single entity.
    /// </summary>
    /// <typeparam name="TEntity">Source entity type</typeparam>
    /// <typeparam name="TNav">Navigation entity type</typeparam>
    /// <param name="entity">Entity to load navigation for</param>
    /// <param name="selector">Navigation property selector (List)</param>
    /// <param name="resolver">Repository resolver</param>
    /// <param name="ct">Cancellation token</param>
    public static async Task LoadCollectionNavigationAsync<TEntity, TNav>(
        this TEntity entity,
        Expression<Func<TEntity, List<TNav>?>> selector,
        IPlatformRepositoryResolver resolver,
        CancellationToken ct = default)
        where TEntity : class, IRootEntity<string>
        where TNav : class, IRootEntity<string>, new()
    {
        await PlatformNavigationLoader.LoadCollectionAsync<TEntity, TNav, string>(
            entity,
            selector,
            resolver,
            null,
            ct);
    }
}
