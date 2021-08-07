using System;
using System.Linq;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.DependencyInjection
{
    public static class PlatformModuleServiceCollectionExtensions
    {
        public static IServiceCollection RegisterModule<TModule>(this IServiceCollection services, IConfiguration configuration) where TModule : PlatformModule
        {
            return RegisterModule(services, configuration, typeof(TModule));
        }

        public static IServiceCollection RegisterModule(this IServiceCollection services, IConfiguration configuration, Type moduleType)
        {
            if (!services.Any(p => p.ServiceType == moduleType))
            {
                services.AddSingleton(moduleType);

                var registeredModule = services.BuildServiceProvider().GetService(moduleType);
                if (registeredModule is PlatformModule registeredPlatformModule)
                {
                    registeredPlatformModule.Register(services);
                }
                else
                {
                    throw new ArgumentException("ModuleType parameter is invalid. It must be inherit from PlatformModule");
                }
            }

            return services;
        }
    }
}
