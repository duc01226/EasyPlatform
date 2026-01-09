namespace Easy.Platform.Domain.Repositories;

/// <summary>
/// Default factory implementation for creating repository resolvers.
/// Creates type-aware resolvers that can resolve application-specific repository interfaces.
/// </summary>
public class PlatformRepositoryResolverFactory : IPlatformRepositoryResolverFactory
{
    private readonly IServiceProvider serviceProvider;

    public PlatformRepositoryResolverFactory(IServiceProvider serviceProvider)
    {
        this.serviceProvider = serviceProvider;
    }

    /// <inheritdoc />
    public IPlatformRepositoryResolver Create()
    {
        return new PlatformRepositoryResolver(serviceProvider);
    }

    /// <inheritdoc />
    public IPlatformRepositoryResolver Create(Type repositoryInterfaceTypeDefinition)
    {
        return new PlatformRepositoryResolver(serviceProvider, repositoryInterfaceTypeDefinition);
    }
}
