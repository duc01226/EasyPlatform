using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.DependencyInjection
{
    public static class ConventionalServiceCollectionExtensions
    {
        /// <summary>
        /// Register all concrete types in a module that is assignable to TConventional as itself and it's implemented interfaces
        /// </summary>
        public static IServiceCollection RegisterAllFromType<TConventional>(
            this IServiceCollection services,
            PlatformModule platformModule,
            ServiceLifeTime lifeTime)
        {
            services.Scan(scan =>
            {
                var lifetimeSelector = scan
                    .FromAssemblies(platformModule.Assembly)
                    .AddClasses(@class => @class.AssignableTo<TConventional>())
                    .AsSelf()
                    .AsImplementedInterfaces();
                switch (lifeTime)
                {
                    case ServiceLifeTime.Transient:
                        lifetimeSelector.WithTransientLifetime();
                        break;
                    case ServiceLifeTime.Scoped:
                        lifetimeSelector.WithScopedLifetime();
                        break;
                    case ServiceLifeTime.Singleton:
                        lifetimeSelector.WithSingletonLifetime();
                        break;
                    default:
                        lifetimeSelector.WithTransientLifetime();
                        break;
                }
            });
            return services;
        }

        public static IServiceCollection RegisterModule<TModule>(this IServiceCollection services, IConfiguration configuration) where TModule : PlatformModule
        {
            return RegisterModule(services, configuration, typeof(TModule));
        }

        public static IServiceCollection RegisterModule(this IServiceCollection services, IConfiguration configuration, Type moduleType)
        {
            var registeredModule = services.BuildServiceProvider().GetService(moduleType);
            if (registeredModule == null)
            {
                services.AddSingleton(moduleType);
                registeredModule = services.BuildServiceProvider().GetService(moduleType);
            }

            if (registeredModule is PlatformModule typedRegisteredModule)
            {
                typedRegisteredModule!.Register(services, configuration);
            }
            else
            {
                throw new ArgumentException("ModuleType parameter is invalid. It must be inherit from PlatformModule");
            }

            return services;
        }
    }
}
