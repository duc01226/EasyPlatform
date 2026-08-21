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
    /// Registers a module exactly once: one descriptor, and one resolvable INSTANCE, per module type — no matter how
    /// many times it is registered. (It does not promise the whole descriptor set is byte-identical across repeat
    /// calls: <see cref="PlatformModule.RegisterServices" /> still re-runs, and what its tracing/helper registrations
    /// do is their own contract.)
    /// <para>
    /// Two independent defects produced duplicate module instances, and it is worth keeping them apart because the
    /// obvious one was not the harmful one:
    /// </para>
    /// <para>
    /// 1. <b>Repeat registration.</b> Only the first registration below was guarded (<c>skipIfExist: true</c>), so a
    /// repeat call appended descriptors. A diamond dependency (two modules depending on a third) reaches this on an
    /// ordinary startup. The early-out on the module type now makes the whole method idempotent, which demotes
    /// that flag to belt-and-braces: the early-out returns on exactly the descriptor the guarded call would have
    /// created, so on any path that still REACHES it there is nothing to skip. It stays because removing it is a
    /// behavior risk (<c>Register</c>'s duplicate detection need not match on <c>ServiceType</c> alone) for no payoff.
    /// </para>
    /// <para>
    /// 2. <b>The duplicate that a SINGLE registration already created</b> — the one that actually mattered.
    /// <c>RegisterAllForImplementation</c> re-registers the implementation TYPE for its own service type, as a plain
    /// type registration that ignores the factory it is handed and offers no <c>skipIfExist</c>. That duplicated the
    /// self-registration made just above, so even one <c>RegisterModule</c> call left TWO type-registered descriptors.
    /// Each constructs its OWN instance, so <c>GetServices&lt;TModule&gt;()</c> yielded two distinct modules, only one
    /// of which ever received <c>RegisterServices</c> or <c>Init</c>. Singular resolution happened to be safe (both
    /// <c>GetRequiredService&lt;TModule&gt;()</c> and the <see cref="PlatformModule" /> factory take the LAST
    /// descriptor, so they agreed), which is precisely why this hid: nothing failed until something enumerated.
    /// Calling <c>RegisterInterfacesForImplementation</c> instead registers the interfaces and nothing else.
    /// </para>
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
