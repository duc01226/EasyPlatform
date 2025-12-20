using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Infrastructures.Abstract;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Infrastructures;

/// <summary>
/// Base module class for platform infrastructure components such as caching, message bus, file storage, etc.
/// This class serves as a foundation for registering and initializing infrastructure-related services.
/// </summary>
public abstract class PlatformInfrastructureModule : PlatformModule
{
    /// <summary>
    /// Default initialization priority for infrastructure modules.
    /// Infrastructure modules are initialized after domain modules with a higher priority value.
    /// </summary>
    public new const int DefaultInitializationPriority = PlatformModule.DefaultInitializationPriority + (InitializationPriorityTierGap * 3);

    /// <summary>
    /// Default initialization priority for infrastructure modules that depend on persistence modules.
    /// This ensures that dependent modules are initialized after persistence modules are ready.
    /// </summary>
    public const int DefaultDependentOnPersistenceInitInitializationPriority =
        PlatformModule.DefaultInitializationPriority + (InitializationPriorityTierGap * 1);

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformInfrastructureModule"/> class.
    /// </summary>
    /// <param name="serviceProvider">The service provider for dependency resolution.</param>
    /// <param name="configuration">The configuration settings for the module.</param>
    public PlatformInfrastructureModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    /// <summary>
    /// Gets the execution priority for initializing this module.
    /// This determines the order in which modules are initialized.
    /// </summary>
    public override int InitializationPriority => DefaultInitializationPriority;

    /// <summary>
    /// Registers infrastructure services with the dependency injection container.
    /// This method scans assemblies for types implementing <see cref="IPlatformInfrastructureService"/>
    /// and registers them automatically.
    /// </summary>
    /// <param name="serviceCollection">The service collection to register services with.</param>
    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        serviceCollection.RegisterAllFromType<IPlatformInfrastructureService>(GetAssembliesForServiceScanning());
    }

    /// <summary>
    /// Registers helper services with the dependency injection container.
    /// This method scans both the current assembly and service assemblies for types implementing <see cref="IPlatformHelper"/>
    /// and registers them automatically.
    /// </summary>
    /// <param name="serviceCollection">The service collection to register helper services with.</param>
    protected override void RegisterHelpers(IServiceCollection serviceCollection)
    {
        serviceCollection.RegisterAllFromType<IPlatformHelper>(typeof(PlatformInfrastructureModule).Assembly);
        serviceCollection.RegisterAllFromType<IPlatformHelper>(GetAssembliesForServiceScanning());
    }
}
