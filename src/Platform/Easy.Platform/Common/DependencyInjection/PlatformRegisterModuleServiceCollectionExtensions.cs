#region

using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.DependencyInjection;

#endregion

namespace Easy.Platform.Common.DependencyInjection;

public static class PlatformRegisterModuleServiceCollectionExtensions
{
    /// <summary>
    /// Registers a platform module of type 'TModule' into the services collection.
    /// </summary>
    public static IServiceCollection RegisterModule<TModule>(
        this IServiceCollection services,
        bool isChildModule = false) where TModule : PlatformModule
    {
        return RegisterModule(services, typeof(TModule), isChildModule);
    }

    /// <summary>
    /// Registers a platform module of type of 'moduleType' param into the services collection.
    /// </summary>
    public static IServiceCollection RegisterModule(
        this IServiceCollection services,
        Type moduleType,
        bool isChildModule = false)
    {
        if (!moduleType.IsAssignableTo(typeof(PlatformModule)))
            throw new ArgumentException("ModuleType parameter is invalid. It must be inherit from PlatformModule");

        // A dependency diamond can reach the same module type through more than one parent. Once its concrete
        // descriptor exists, the module's registration work has already been performed for this service collection;
        // repeating RegisterServices would duplicate lanes, handlers, hosted services, and other side effects.
        if (services.Any(descriptor => descriptor.ServiceType == moduleType)) return services;

        services.Register(
            typeof(IServiceCollection),
            _ => services,
            ServiceLifeTime.Singleton,
            replaceIfExist: true,
            DependencyInjectionExtension.CheckRegisteredStrategy.ByService);

        RegisterModuleInstance(services, moduleType);

        var serviceProvider = services.BuildServiceProvider();

        var newRegisterModule = serviceProvider.GetRequiredService(moduleType).As<PlatformModule>().With(module => module.IsChildModule = isChildModule);

        newRegisterModule.RegisterServices(services);

        serviceProvider
            .GetServices<PlatformModule>()
            .Where(p => !p.GetType().IsAssignableTo(moduleType))
            .ToList()
            .ForEach(otherRegisteredModule => otherRegisteredModule.OnNewOtherModuleRegistered(services, newRegisterModule));

        return services;
    }

    /// <summary>
    /// Registers a module exactly once: one descriptor, one resolvable instance, and one registration side-effect pass
    /// per module type and service collection. A repeated call is a no-op, including calls reached through a
    /// dependency diamond. This prevents duplicate lanes, handlers, hosted services, and other registrations while
    /// preserving the first call's root/child ownership flag.
    /// </summary>
    private static void RegisterModuleInstance(
        IServiceCollection services,
        Type moduleType)
    {
        if (services.Any(descriptor => descriptor.ServiceType == moduleType)) return;

        services.Register(
            moduleType,
            moduleType,
            ServiceLifeTime.Singleton,
            replaceIfExist: false,
            skipIfExist: true);

        services.Register(
            typeof(PlatformModule),
            sp => sp.GetService(moduleType),
            ServiceLifeTime.Singleton,
            replaceIfExist: false);

        // Interfaces ONLY. RegisterAllForImplementation would additionally re-register (moduleType, moduleType) —
        // and it does so as a TYPE registration that ignores the factory above, with no skipIfExist option — which
        // duplicated the self-registration already made above. See the remarks on this method for why that mattered.
        services.RegisterInterfacesForImplementation(
            implementationType: moduleType,
            implementationFactory: sp => sp.GetService(moduleType),
            ServiceLifeTime.Singleton,
            replaceIfExist: false);
    }
}
