using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Domain;

/// <summary>
/// Represents a module for the domain layer of the platform.
/// </summary>
public abstract class PlatformDomainModule : PlatformModule
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformDomainModule"/> class.
    /// </summary>
    /// <param name="serviceProvider">The service provider.</param>
    /// <param name="configuration">The configuration.</param>
    protected PlatformDomainModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    /// <summary>
    /// Registers the domain services in the service collection.
    /// </summary>
    /// <param name="serviceCollection">The service collection.</param>
    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);
        serviceCollection.RegisterAllFromType<IPlatformDomainService>(GetAssembliesForServiceScanning());
    }
}
