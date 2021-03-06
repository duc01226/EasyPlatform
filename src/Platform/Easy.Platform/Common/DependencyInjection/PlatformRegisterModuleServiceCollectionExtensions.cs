using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Common.DependencyInjection;

public static class PlatformRegisterModuleServiceCollectionExtensions
{
    public static IServiceCollection RegisterModule<TModule>(
        this IServiceCollection services) where TModule : PlatformModule
    {
        return RegisterModule(services, typeof(TModule));
    }

    public static IServiceCollection RegisterModule(
        this IServiceCollection services,
        Type moduleType)
    {
        if (!moduleType.IsAssignableTo(typeof(PlatformModule)))
            throw new ArgumentException("ModuleType parameter is invalid. It must be inherit from PlatformModule");

        RegisterModuleInstance(services, moduleType);

        var serviceProvider = services.BuildServiceProvider();

        var newModule = (PlatformModule)serviceProvider.GetService(moduleType);
        newModule.RegisterServices(services);

        serviceProvider
            .GetServices<PlatformModule>()
            .Where(p => !p.GetType().IsAssignableTo(moduleType))
            .ToList()
            .ForEach(
                otherRegisteredModule => otherRegisteredModule.OnNewPlatformModuleRegistered(services, newModule));

        return services;
    }

    private static void RegisterModuleInstance(
        IServiceCollection services,
        Type moduleType)
    {
        services.Register(
            moduleType,
            moduleType,
            ServiceLifeTime.Singleton,
            replaceIfExist: false);

        services.Register(
            typeof(PlatformModule),
            p => p.GetService(moduleType),
            ServiceLifeTime.Singleton,
            replaceIfExist: false);
    }
}
