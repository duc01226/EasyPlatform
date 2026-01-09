using Easy.Platform.Common;

namespace Easy.Platform.Domain.Repositories;

/// <summary>
/// Factory for creating repository resolvers with optional type awareness.
/// Enables navigation property loading to resolve application-specific repository interfaces.
/// Extends IPlatformHelper for automatic DI registration.
/// </summary>
public interface IPlatformRepositoryResolverFactory : IPlatformHelper
{
    /// <summary>
    /// Creates a default resolver that resolves platform base interfaces.
    /// </summary>
    IPlatformRepositoryResolver Create();

    /// <summary>
    /// Creates a resolver that prefers the specified repository interface type.
    /// Falls back to platform interfaces if specific type not found in DI.
    /// </summary>
    /// <param name="repositoryInterfaceTypeDefinition">
    /// Open generic type definition (e.g., typeof(IGrowthRootRepository&lt;&gt;))
    /// </param>
    IPlatformRepositoryResolver Create(Type repositoryInterfaceTypeDefinition);
}
