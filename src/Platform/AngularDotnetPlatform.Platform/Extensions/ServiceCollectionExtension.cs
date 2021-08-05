using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AngularDotnetPlatform.Platform.Extensions
{
    public static class ServiceCollectionExtension
    {
        /// <summary>
        /// Register all concrete types in a module that is assignable to TConventional as itself and it's implemented interfaces
        /// </summary>
        public static IServiceCollection RegisterAllFromType<TConventional>(
            this IServiceCollection services,
            ServiceLifeTime lifeTime,
            Assembly assembly)
        {
            services.Scan(scan =>
            {
                var lifetimeSelector = scan
                    .FromAssemblies(assembly)
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

        /// <summary>
        /// Register TImplementation as itself and it's implemented interfaces
        /// </summary>
        public static IServiceCollection RegisterAllFromImplementation<TImplementation>(
            this IServiceCollection services,
            Func<IServiceProvider, TImplementation> implementationInstanceObjectFunc,
            ServiceLifeTime lifeTime,
            bool replaceIfExist = false)
        {
            services.Register(typeof(TImplementation), provider => implementationInstanceObjectFunc(provider), lifeTime, replaceIfExist);

            foreach (var implementedInterfaceType in typeof(TImplementation).GetInterfaces())
            {
                services.Register(implementedInterfaceType, provider => implementationInstanceObjectFunc(provider), lifeTime, replaceIfExist);
            }

            return services;
        }

        /// <summary>
        /// Register TImplementation as itself and it's implemented interfaces
        /// </summary>
        public static IServiceCollection RegisterAllFromImplementation<TImplementation>(
            this IServiceCollection services,
            ServiceLifeTime lifeTime,
            bool replaceIfExist = false)
        {
            services.Register(typeof(TImplementation), typeof(TImplementation), lifeTime, replaceIfExist);

            foreach (var implementedInterfaceType in typeof(TImplementation).GetInterfaces())
            {
                services.Register(implementedInterfaceType, typeof(TImplementation), lifeTime, replaceIfExist);
            }

            return services;
        }

        public static IServiceCollection Register(this IServiceCollection services, Type serviceType, Type implementationType, ServiceLifeTime lifeTime, bool replaceIfExist = false)
        {
            switch (lifeTime)
            {
                case ServiceLifeTime.Scoped:
                    if (replaceIfExist)
                        services.ReplaceScoped(serviceType, implementationType);
                    else
                        services.AddScoped(serviceType, implementationType);
                    break;
                case ServiceLifeTime.Singleton:
                    if (replaceIfExist)
                        services.ReplaceSingleton(serviceType, implementationType);
                    else
                        services.AddSingleton(serviceType, implementationType);
                    break;
                default:
                    if (replaceIfExist)
                        services.ReplaceTransient(serviceType, implementationType);
                    else
                        services.AddTransient(serviceType, implementationType);
                    break;
            }

            return services;
        }

        public static IServiceCollection Register(this IServiceCollection services, Type serviceType, Func<IServiceProvider, object> implementationFunc, ServiceLifeTime lifeTime, bool replaceIfExist = false)
        {
            switch (lifeTime)
            {
                case ServiceLifeTime.Scoped:
                    services.AddScoped(serviceType, implementationFunc);
                    break;
                case ServiceLifeTime.Singleton:
                    services.AddSingleton(serviceType, implementationFunc);
                    break;
                default:
                    services.AddTransient(serviceType, implementationFunc);
                    break;
            }

            return services;
        }

        public static IServiceCollection ReplaceTransient(this IServiceCollection services, Type serviceType, Type implementationType)
        {
            RemoveIfExist(services, serviceType);

            return services.AddTransient(serviceType, implementationType);
        }

        public static IServiceCollection ReplaceScoped(this IServiceCollection services, Type serviceType, Type implementationType)
        {
            RemoveIfExist(services, serviceType);

            return services.AddScoped(serviceType, implementationType);
        }

        public static IServiceCollection ReplaceSingleton(this IServiceCollection services, Type serviceType, Type implementationType)
        {
            RemoveIfExist(services, serviceType);

            return services.AddSingleton(serviceType, implementationType);
        }

        public static IServiceCollection ReplaceTransient<TService, TImplementation>(this IServiceCollection services)
            where TService : class
            where TImplementation : class, TService
        {
            return services.ReplaceTransient(typeof(TService), typeof(TImplementation));
        }

        public static IServiceCollection ReplaceScoped<TService, TImplementation>(this IServiceCollection services)
            where TService : class
            where TImplementation : class, TService
        {
            return services.ReplaceScoped(typeof(TService), typeof(TImplementation));
        }

        public static IServiceCollection ReplaceSingleton<TService, TImplementation>(this IServiceCollection services)
            where TService : class
            where TImplementation : class, TService
        {
            return services.ReplaceSingleton(typeof(TService), typeof(TImplementation));
        }

        public static void RemoveIfExist(this IServiceCollection services, Type serviceType)
        {
            var existedServiceRegister = services.FirstOrDefault(p => p.ServiceType == serviceType);
            if (existedServiceRegister != null)
                services.Remove(existedServiceRegister);
        }
    }
}
