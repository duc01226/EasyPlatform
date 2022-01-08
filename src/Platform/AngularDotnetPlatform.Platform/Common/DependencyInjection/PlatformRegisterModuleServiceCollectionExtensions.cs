using System;
using System.Linq;
using AngularDotnetPlatform.Platform.Common.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.Common.DependencyInjection
{
    public static class PlatformRegisterModuleServiceCollectionExtensions
    {
        public static IServiceCollection RegisterModule<TModule>(
            this IServiceCollection services,
            IConfiguration configuration,
            PlatformModule dependedOnMeModule = null) where TModule : PlatformModule
        {
            return RegisterModule(services, typeof(TModule), configuration, dependedOnMeModule);
        }

        public static IServiceCollection RegisterModule(
            this IServiceCollection services,
            Type moduleType,
            IConfiguration configuration,
            PlatformModule dependedOnMeModule = null)
        {
            if (!moduleType.IsAssignableTo(typeof(PlatformModule)))
            {
                throw new ArgumentException("ModuleType parameter is invalid. It must be inherit from PlatformModule");
            }

            RegisterModuleInstance(services, moduleType, dependedOnMeModule);

            var serviceProvider = services.BuildServiceProvider();

            var newModule = (PlatformModule)serviceProvider.GetService(moduleType);
            newModule.RegisterServices(services);

            serviceProvider
                .GetServices<PlatformModule>()
                .Where(p => !p.GetType().IsAssignableTo(moduleType))
                .ToList()
                .ForEach(otherRegisteredModule => otherRegisteredModule.OnNewPlatformModuleRegistered(services, newModule));

            return services;
        }

        private static void RegisterModuleInstance(
            IServiceCollection services,
            Type moduleType,
            PlatformModule dependedOnMeModule)
        {
            services.Register(
                moduleType,
                provider =>
                {
                    var moduleMaxParamsConstructorInfo =
                        moduleType.GetConstructors().OrderByDescending(p => p.GetParameters().Length).First();
                    var moduleConstructorParams = moduleMaxParamsConstructorInfo.GetParameters()
                        .Select(p => provider.GetService(p.ParameterType))
                        .ToArray();

                    var moduleInstance = (PlatformModule)Activator.CreateInstance(
                        moduleType,
                        args: moduleConstructorParams);

                    if (dependedOnMeModule != null)
                        moduleInstance!.AddDependedOnMeModule(dependedOnMeModule);

                    return moduleInstance;
                },
                ServiceLifeTime.Singleton,
                replaceIfExist: false);

            services.Register(
                typeof(PlatformModule),
                p => p.GetService(moduleType),
                ServiceLifeTime.Singleton,
                replaceIfExist: false);
        }
    }
}
