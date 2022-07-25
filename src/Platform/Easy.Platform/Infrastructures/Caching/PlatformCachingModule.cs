using System.Reflection;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Infrastructures.Caching.BuiltInCacheRepositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Infrastructures.Caching;

public class PlatformCachingModule : PlatformInfrastructureModule
{
    public PlatformCachingModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(
        serviceProvider,
        configuration)
    {
    }

    public override void OnNewPlatformModuleRegistered(
        IServiceCollection serviceCollection,
        PlatformModule newModule)
    {
        if (!newModule.GetType().IsAssignableTo(typeof(PlatformInfrastructureModule)))
            RegisterCacheItemsByScanAssemblies(
                serviceCollection,
                assemblies: new List<Assembly>
                {
                    newModule.Assembly
                });
    }

    /// <summary>
    /// Override this function provider to register IPlatformDistributedCache. Default return null;
    /// </summary>
    protected virtual IPlatformDistributedCacheRepository DistributedCacheRepositoryProvider(
        IServiceProvider serviceProvider,
        IConfiguration configuration)
    {
        return null;
    }

    /// <summary>
    /// Override this function provider to register IPlatformMemoryCacheRepository. Default return PlatformMemoryCacheRepository;
    /// </summary>
    protected virtual IPlatformMemoryCacheRepository MemoryCacheRepositoryProvider(
        IServiceProvider serviceProvider,
        IConfiguration configuration)
    {
        return new PlatformMemoryCacheRepository(serviceProvider.GetService<ILoggerFactory>(), serviceProvider);
    }

    /// <summary>
    /// Override this method to config default PlatformCacheEntryOptions when save cache
    /// </summary>
    protected virtual PlatformCacheEntryOptions DefaultPlatformCacheEntryOptions(IServiceProvider serviceProvider)
    {
        return null;
    }

    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        serviceCollection.Register<IPlatformCacheRepositoryProvider, PlatformCacheRepositoryProvider>(
            ServiceLifeTime.Transient);
        RegisterDefaultPlatformCacheEntryOptions(serviceCollection);

        RegisterCacheItemsByScanAssemblies(
            serviceCollection,
            assemblies: new List<Assembly>
                {
                    Assembly
                }
                .Concat(
                    ServiceProvider.GetServices<PlatformModule>()
                        .Where(p => !p.GetType().IsAssignableTo(typeof(PlatformInfrastructureModule)))
                        .Select(p => p.GetType().Assembly))
                .Distinct()
                .ToList());

        // Register built-in default memory cache
        serviceCollection.RegisterAllForImplementation(
            provider => MemoryCacheRepositoryProvider(provider, Configuration),
            ServiceLifeTime.Singleton);
        serviceCollection.RegisterAllForImplementation(typeof(PlatformCollectionMemoryCacheRepository<>));

        if (DistributedCacheRepositoryProvider(ServiceProvider, Configuration) != null)
        {
            serviceCollection.RegisterAllForImplementation(
                provider => DistributedCacheRepositoryProvider(provider, Configuration),
                ServiceLifeTime.Singleton);

            serviceCollection.RegisterAllForImplementation(typeof(PlatformCollectionDistributedCacheRepository<>));
        }
    }

    protected void RegisterDefaultPlatformCacheEntryOptions(IServiceCollection serviceCollection)
    {
        if (DefaultPlatformCacheEntryOptions(ServiceProvider) != null)
            serviceCollection.Register(
                typeof(PlatformCacheEntryOptions),
                DefaultPlatformCacheEntryOptions,
                ServiceLifeTime.Transient,
                replaceIfExist: true,
                ServiceCollectionExtension.ReplaceServiceStrategy.ByService);
        else if (!serviceCollection.Any(p => p.ServiceType == typeof(PlatformCacheEntryOptions)))
            serviceCollection.Register(
                typeof(PlatformCacheEntryOptions),
                typeof(PlatformCacheEntryOptions),
                ServiceLifeTime.Transient);
    }

    protected void RegisterCacheItemsByScanAssemblies(
        IServiceCollection serviceCollection,
        List<Assembly> assemblies)
    {
        assemblies.ForEach(
            cacheItemsScanAssembly =>
            {
                serviceCollection.RegisterAllFromType<IPlatformContextCacheKeyProvider>(
                    ServiceLifeTime.Transient,
                    cacheItemsScanAssembly);
                serviceCollection.RegisterAllFromType<PlatformConfigurationCacheEntryOptions>(
                    ServiceLifeTime.Transient,
                    cacheItemsScanAssembly);
            });
    }
}
