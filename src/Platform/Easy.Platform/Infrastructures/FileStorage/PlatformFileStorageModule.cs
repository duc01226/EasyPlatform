using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Infrastructures.FileStorage;

/// <summary>
/// Base module for file storage infrastructure integration.
/// This abstract class serves as the foundation for implementing different
/// file storage providers (such as local file system, Azure Blob, AWS S3, etc.).
/// </summary>
public abstract class PlatformFileStorageModule : PlatformInfrastructureModule
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformFileStorageModule"/> class.
    /// </summary>
    /// <param name="serviceProvider">The service provider for dependency resolution.</param>
    /// <param name="configuration">The configuration settings for the module.</param>
    public PlatformFileStorageModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    /// <summary>
    /// Registers the file storage services with the dependency injection container.
    /// This method registers the file storage options provider as a singleton service.
    /// </summary>
    /// <param name="serviceCollection">The service collection to register services with.</param>
    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        serviceCollection.Register(FileStorageOptionsProvider, ServiceLifeTime.Singleton);
    }

    /// <summary>
    /// Abstract method that must be implemented by derived classes to provide file storage configuration options.
    /// This method is called by the dependency injection container to create the options instance.
    /// </summary>
    /// <param name="serviceProvider">The service provider to resolve any dependencies needed for creating the options.</param>
    /// <returns>A configured instance of PlatformFileStorageOptions for the specific storage implementation.</returns>
    protected abstract PlatformFileStorageOptions FileStorageOptionsProvider(IServiceProvider serviceProvider);
}
