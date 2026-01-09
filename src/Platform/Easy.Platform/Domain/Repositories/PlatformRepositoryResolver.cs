using Easy.Platform.Domain.Entities;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Domain.Repositories;

/// <summary>
/// Default implementation of IPlatformRepositoryResolver using IServiceProvider.
/// Supports optional type-aware resolution for application-specific repository interfaces.
/// Auto-registered via IPlatformHelper pattern.
/// </summary>
public class PlatformRepositoryResolver : IPlatformRepositoryResolver
{
    private readonly IServiceProvider serviceProvider;
    private readonly Type? repositoryInterfaceTypeDefinition;

    public PlatformRepositoryResolver(IServiceProvider serviceProvider)
        : this(serviceProvider, null)
    {
    }

    /// <summary>
    /// Creates a type-aware resolver that prefers the specified repository interface.
    /// </summary>
    /// <param name="serviceProvider">DI service provider</param>
    /// <param name="repositoryInterfaceTypeDefinition">
    /// Open generic type definition (e.g., typeof(IGrowthRootRepository&lt;&gt;)).
    /// When resolving, will try this interface first before falling back to platform interface.
    /// </param>
    public PlatformRepositoryResolver(IServiceProvider serviceProvider, Type? repositoryInterfaceTypeDefinition)
    {
        this.serviceProvider = serviceProvider;
        this.repositoryInterfaceTypeDefinition = repositoryInterfaceTypeDefinition;
    }

    /// <inheritdoc />
    public IPlatformQueryableRepository<TEntity, string> Resolve<TEntity>()
        where TEntity : class, IEntity<string>, new()
        => Resolve<TEntity, string>();

    /// <inheritdoc />
    public IPlatformQueryableRepository<TEntity, TKey> Resolve<TEntity, TKey>()
        where TEntity : class, IEntity<TKey>, new()
    {
        // Try application-specific interface first
        if (repositoryInterfaceTypeDefinition != null)
        {
            var repo = TryResolveFromTypeDefinition<TEntity, TKey>();
            if (repo != null) return repo;
        }

        // Fall back to platform interface
        return serviceProvider.GetService<IPlatformQueryableRepository<TEntity, TKey>>()
               ?? throw new InvalidOperationException(
                   $"Repository for {typeof(TEntity).Name} not registered. " +
                   $"Ensure IPlatformQueryableRepository<{typeof(TEntity).Name}, {typeof(TKey).Name}> is registered in DI.");
    }

    /// <inheritdoc />
    public bool CanResolve<TEntity>() where TEntity : class, IEntity<string>, new()
    {
        // Check app-specific interface first
        if (repositoryInterfaceTypeDefinition != null)
        {
            var repo = TryResolveFromTypeDefinition<TEntity, string>();
            if (repo != null) return true;
        }

        return serviceProvider.GetService<IPlatformQueryableRepository<TEntity, string>>() != null;
    }

    /// <summary>
    /// Attempts to resolve repository using the configured interface type definition.
    /// Handles different generic parameter counts (1-param app interface vs 2-param platform interface).
    /// </summary>
    private IPlatformQueryableRepository<TEntity, TKey>? TryResolveFromTypeDefinition<TEntity, TKey>()
        where TEntity : class, IEntity<TKey>, new()
    {
        if (repositoryInterfaceTypeDefinition == null) return null;

        try
        {
            // Build closed generic type based on parameter count
            var genericParams = repositoryInterfaceTypeDefinition.GetGenericArguments();
            Type closedType;

            if (genericParams.Length == 1)
            {
                // Single param interface (e.g., IGrowthRootRepository<TEntity>)
                // TKey is fixed in the interface definition
                closedType = repositoryInterfaceTypeDefinition.MakeGenericType(typeof(TEntity));
            }
            else if (genericParams.Length == 2)
            {
                // Two param interface (e.g., ICustomRepository<TEntity, TKey>)
                closedType = repositoryInterfaceTypeDefinition.MakeGenericType(typeof(TEntity), typeof(TKey));
            }
            else
            {
                return null; // Unsupported parameter count
            }

            var service = serviceProvider.GetService(closedType);
            return service as IPlatformQueryableRepository<TEntity, TKey>;
        }
        catch
        {
            // Failed to build type or resolve - fall back to platform interface
            return null;
        }
    }
}
