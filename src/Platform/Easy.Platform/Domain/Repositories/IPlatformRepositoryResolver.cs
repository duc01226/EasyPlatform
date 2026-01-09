using Easy.Platform.Common;
using Easy.Platform.Domain.Entities;

namespace Easy.Platform.Domain.Repositories;

/// <summary>
/// Resolves repositories by entity type for navigation property loading.
/// Extends IPlatformHelper for automatic DI registration.
/// </summary>
public interface IPlatformRepositoryResolver : IPlatformHelper
{
    /// <summary>
    /// Resolves a queryable repository for the specified entity type with string key.
    /// </summary>
    IPlatformQueryableRepository<TEntity, string> Resolve<TEntity>()
        where TEntity : class, IEntity<string>, new();

    /// <summary>
    /// Resolves a queryable repository for the specified entity type with custom key type.
    /// </summary>
    IPlatformQueryableRepository<TEntity, TKey> Resolve<TEntity, TKey>()
        where TEntity : class, IEntity<TKey>, new();

    /// <summary>
    /// Checks if a repository can be resolved for the specified entity type.
    /// </summary>
    bool CanResolve<TEntity>() where TEntity : class, IEntity<string>, new();
}
