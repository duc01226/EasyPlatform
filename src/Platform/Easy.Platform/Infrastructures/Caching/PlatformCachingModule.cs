using System.Reflection;
using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Infrastructures.Caching.BuiltInCacheRepositories;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Easy.Platform.Infrastructures.Caching;

/// <summary>
/// Represents a module for caching in the platform infrastructure.
/// </summary>
/// <remarks>
/// This class is part of the Easy.Platform.Infrastructures.Caching namespace and extends the PlatformInfrastructureModule class.
/// It provides methods for registering and configuring caching services in the platform.
/// </remarks>
public class PlatformCachingModule : PlatformInfrastructureModule
{
    public PlatformCachingModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    /// <summary>
    /// Handles the event when a new module is registered in the platform.
    /// </summary>
    /// <param name="serviceCollection">The service collection where the new module is registered.</param>
    /// <param name="newOtherRegisterModule">The new module that has been registered.</param>
    /// <remarks>
    /// If the new module is not of type PlatformInfrastructureModule, this method will register cache items by scanning the assembly of the new module.
    /// </remarks>
    public override void OnNewOtherModuleRegistered(IServiceCollection serviceCollection, PlatformModule newOtherRegisterModule)
    {
        if (newOtherRegisterModule is not PlatformInfrastructureModule)
            RegisterCacheItemsByScanAssemblies(serviceCollection, newOtherRegisterModule.GetAssembliesForServiceScanning().ToArray());
    }

    /// <summary>
    /// Provides a distributed cache repository for the platform.
    /// This method should be implemented by derived classes to provide a specific distributed cache implementation.
    /// </summary>
    /// <param name="serviceProvider">The service provider to resolve dependencies.</param>
    /// <param name="configuration">The configuration to setup the distributed cache repository.</param>
    /// <returns>An implementation of IPlatformDistributedCacheRepository, or null if distributed caching is not supported.</returns>
    /// <returns>An instance of IPlatformDistributedCacheRepository, or null if no distributed cache is registered.</returns>
    /// <remarks>
    /// Override this method in a derived class to provide a custom implementation of IPlatformDistributedCacheRepository.
    /// The default implementation returns null, indicating that no distributed cache is registered.
    /// </remarks>
    protected virtual IPlatformDistributedCacheRepository DistributedCacheRepositoryProvider(
        IServiceProvider serviceProvider,
        IConfiguration configuration
    )
    {
        return null;
    }

    /// <summary>
    /// Registers the services and configurations related to the platform caching module.
    /// </summary>
    /// <param name="serviceCollection">The service collection to add the services to.</param>
    /// <remarks>
    /// This method registers the platform cache repository provider, platform cache settings,
    /// default platform cache entry options, and cache items by scanning assemblies.
    /// It also registers the built-in default memory cache and distributed cache if available.
    /// Lastly, it registers a background service for automatically clearing deprecated global request cached keys.
    /// </remarks>
    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        serviceCollection.Register(
            provider => new MemoryDistributedCache(
                new OptionsWrapper<MemoryDistributedCacheOptions>(new MemoryDistributedCacheOptions()),
                provider.GetService<ILoggerFactory>()
            ),
            ServiceLifeTime.Singleton
        );
        serviceCollection.Register<IDistributedCache>(provider => provider.GetService<MemoryDistributedCache>(), ServiceLifeTime.Singleton);

#pragma warning disable EXTEXP0018
        serviceCollection.AddHybridCache(options =>
        {
            var platformSettings = new PlatformCacheSettings().With(settings =>
                ConfigCacheSettings(serviceCollection.BuildServiceProvider(), settings)
            );

            options.DefaultEntryOptions = new HybridCacheEntryOptions()
            {
                Expiration = platformSettings.DefaultCacheEntryOptions.AbsoluteExpirationRelativeToNow(),
            };
        });
#pragma warning restore EXTEXP0018
        serviceCollection.Register<IPlatformCacheRepositoryProvider, PlatformCacheRepositoryProvider>(ServiceLifeTime.Singleton);
        serviceCollection.Register(
            typeof(PlatformCacheSettings),
            sp => new PlatformCacheSettings().With(settings => ConfigCacheSettings(sp, settings))
        );
        RegisterDefaultPlatformCacheEntryOptions(serviceCollection);

        RegisterCacheItemsByScanAssemblies(
            serviceCollection,
            assemblies: GetAssembliesForServiceScanning()
                .Concat(
                    serviceCollection
                        .BuildServiceProvider()
                        .GetServices<PlatformModule>()
                        .Where(p => p is not PlatformInfrastructureModule)
                        .SelectMany(p => p.GetAssembliesForServiceScanning())
                )
                .Distinct()
                .ToArray()
        );

        // Register built-in default Memory cache and Hybrid cache
        serviceCollection.Register(typeof(IPlatformCacheRepository), typeof(PlatformMemoryCacheRepository), ServiceLifeTime.Singleton);
        serviceCollection.RegisterAllForImplementation(typeof(PlatformCollectionMemoryCacheRepository<>));

        // Register built-in default Hybrid cache
        serviceCollection.Register(typeof(IPlatformCacheRepository), typeof(PlatformHybridCacheRepository), ServiceLifeTime.Singleton);
        serviceCollection.RegisterAllForImplementation(typeof(PlatformCollectionHybridCacheRepository<>));

        // Register Distributed Cache
        var tempCheckHasDistributedCacheInstance = DistributedCacheRepositoryProvider(serviceCollection.BuildServiceProvider(), Configuration);
        if (tempCheckHasDistributedCacheInstance != null)
        {
            tempCheckHasDistributedCacheInstance.Dispose();

            serviceCollection.Register(
                typeof(IPlatformCacheRepository),
                provider => DistributedCacheRepositoryProvider(provider, Configuration),
                ServiceLifeTime.Singleton
            );

            serviceCollection.RegisterAllForImplementation(typeof(PlatformCollectionDistributedCacheRepository<>));
        }

        serviceCollection.RegisterHostedService<PlatformAutoClearDeprecatedGlobalRequestCachedKeysBackgroundService>();
    }

    /// <summary>
    /// Configures cache settings for the platform.
    /// This method is called during registration to set up the cache settings with appropriate values.
    /// Derived classes should override this to provide custom configuration.
    /// </summary>
    /// <param name="sp">The service provider to resolve dependencies.</param>
    /// <param name="cacheSettings">The cache settings to configure.</param>
    protected virtual void ConfigCacheSettings(IServiceProvider sp, PlatformCacheSettings cacheSettings) { }

    /// <summary>
    /// Registers the default cache entry options with the dependency injection container.
    /// This ensures that the default cache entry options from PlatformCacheSettings are used
    /// when no specific options are provided.
    /// </summary>
    /// <param name="serviceCollection">The service collection to register with.</param>
    protected static void RegisterDefaultPlatformCacheEntryOptions(IServiceCollection serviceCollection)
    {
        serviceCollection.Register(
            sp => sp.GetRequiredService<PlatformCacheSettings>().DefaultCacheEntryOptions,
            ServiceLifeTime.Transient,
            replaceIfExist: true,
            DependencyInjectionExtension.CheckRegisteredStrategy.ByService
        );
    }

    /// <summary>
    /// Registers cache-related components by scanning the specified assemblies.
    /// This method finds and registers all implementations of IPlatformContextCacheKeyProvider
    /// and PlatformConfigurationCacheEntryOptions in the provided assemblies.
    /// </summary>
    /// <param name="serviceCollection">The service collection to register with.</param>
    /// <param name="assemblies">The assemblies to scan for cache-related components.</param>
    protected static void RegisterCacheItemsByScanAssemblies(IServiceCollection serviceCollection, params Assembly[] assemblies)
    {
        assemblies.ForEach(cacheItemsScanAssembly =>
        {
            serviceCollection.RegisterAllFromType<IPlatformContextCacheKeyProvider>(cacheItemsScanAssembly);
            serviceCollection.RegisterAllFromType<PlatformConfigurationCacheEntryOptions>(cacheItemsScanAssembly);
        });
    }
}
