using System.Reflection;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Utils;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Common.Extensions
{
    public static class ServiceCollectionExtension
    {
        public enum ReplaceServiceStrategy
        {
            ByService,
            ByImplementation,
            ByBoth
        }

        /// <summary>
        /// Register all concrete types in a module that is assignable to TConventional as itself and it's implemented interfaces
        /// </summary>
        public static IServiceCollection RegisterAllFromType(
            this IServiceCollection services,
            Type conventionalType,
            ServiceLifeTime lifeTime,
            Assembly assembly,
            bool replaceIfExist = true,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            assembly.GetTypes()
                .Where(p => p.IsClass && !p.IsAbstract && p.IsAssignableTo(conventionalType))
                .ToList()
                .ForEach(
                    implementationType =>
                    {
                        services.RegisterSelf(implementationType, lifeTime, replaceIfExist);

                        services.RegisterInterfacesForImplementation(
                            implementationType,
                            lifeTime,
                            replaceIfExist,
                            replaceStrategy);
                    });

            return services;
        }

        /// <summary>
        /// Register all implementation of implemented interfaces in a module that is assignable to TConventional
        /// </summary>
        public static IServiceCollection RegisterAllServicesFromType(
            this IServiceCollection services,
            Type conventionalType,
            ServiceLifeTime lifeTime,
            Assembly assembly,
            bool replaceIfExist = true,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            assembly.GetTypes()
                .Where(p => p.IsClass && !p.IsAbstract && p.IsAssignableTo(conventionalType))
                .ToList()
                .ForEach(
                    implementationType =>
                    {
                        services.RegisterInterfacesForImplementation(
                            implementationType,
                            lifeTime,
                            replaceIfExist,
                            replaceStrategy);
                    });

            return services;
        }

        /// <summary>
        /// Register all implementation of implemented interfaces in a module that is assignable to TConventional
        /// </summary>
        public static IServiceCollection RegisterAllServicesFromType<TConventional>(
            this IServiceCollection services,
            ServiceLifeTime lifeTime,
            Assembly assembly,
            bool replaceIfExist = true,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            return RegisterAllServicesFromType(
                services,
                typeof(TConventional),
                lifeTime,
                assembly,
                replaceIfExist,
                replaceStrategy);
        }

        /// <summary>
        /// Register all concrete types in a module that is assignable to TConventional as itself and it's implemented interfaces
        /// </summary>
        public static IServiceCollection RegisterAllFromType<TConventional>(
            this IServiceCollection services,
            ServiceLifeTime lifeTime,
            Assembly assembly,
            bool replaceIfExist = true,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            return RegisterAllFromType(
                services,
                typeof(TConventional),
                lifeTime,
                assembly,
                replaceIfExist,
                replaceStrategy);
        }

        /// <summary>
        /// Register TImplementation as itself and it's implemented interfaces
        /// </summary>
        public static IServiceCollection RegisterAllForImplementation(
            this IServiceCollection services,
            Type implementationType,
            ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
            bool replaceIfExist = true,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            services.RegisterIfNotExist(implementationType, implementationType, lifeTime);

            services.RegisterInterfacesForImplementation(
                implementationType,
                lifeTime,
                replaceIfExist,
                replaceStrategy);

            return services;
        }

        /// <summary>
        /// Register TImplementation as itself and it's implemented interfaces
        /// </summary>
        public static IServiceCollection RegisterAllForImplementation(
            this IServiceCollection services,
            Type implementationType,
            Func<IServiceProvider, object> implementationFactory,
            ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
            bool replaceIfExist = true,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            services.RegisterIfNotExist(implementationType, implementationType, lifeTime);

            services.RegisterInterfacesForImplementation(
                implementationType,
                implementationFactory,
                lifeTime,
                replaceIfExist,
                replaceStrategy);

            return services;
        }

        /// <summary>
        /// <inheritdoc cref="RegisterAllForImplementation(Microsoft.Extensions.DependencyInjection.IServiceCollection,System.Type,Easy.Platform.Common.DependencyInjection.ServiceLifeTime,bool,Easy.Platform.Common.Extensions.ServiceCollectionExtension.ReplaceServiceStrategy)"/>
        /// </summary>
        public static IServiceCollection RegisterAllForImplementation<TImplementation>(
            this IServiceCollection services,
            ServiceLifeTime lifeTime,
            bool replaceIfExist = true,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            return RegisterAllForImplementation(
                services,
                typeof(TImplementation),
                lifeTime,
                replaceIfExist,
                replaceStrategy);
        }

        /// <summary>
        /// Register TImplementation instance from implementationFactory as itself and it's implemented interfaces
        /// </summary>
        public static IServiceCollection RegisterAllForImplementation<TImplementation>(
            this IServiceCollection services,
            Func<IServiceProvider, TImplementation> implementationFactory,
            ServiceLifeTime lifeTime,
            bool replaceIfExist = true)
        {
            services.Register(
                typeof(TImplementation),
                implementationFactory,
                lifeTime,
                replaceIfExist);

            services.RegisterInterfacesForImplementation(implementationFactory, lifeTime, replaceIfExist);

            return services;
        }

        public static IServiceCollection Register(
            this IServiceCollection services,
            Type serviceType,
            Type implementationType,
            ServiceLifeTime lifeTime,
            bool replaceIfExist = true,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            switch (lifeTime)
            {
                case ServiceLifeTime.Scoped:
                    if (replaceIfExist)
                        services.ReplaceScoped(serviceType, implementationType, replaceStrategy);
                    else
                        services.RegisterIfNotExist(serviceType, implementationType, lifeTime);
                    break;
                case ServiceLifeTime.Singleton:
                    if (replaceIfExist)
                        services.ReplaceSingleton(serviceType, implementationType, replaceStrategy);
                    else
                        services.RegisterIfNotExist(serviceType, implementationType, lifeTime);
                    break;

                case ServiceLifeTime.Transient:
                default:
                    if (replaceIfExist)
                        services.ReplaceTransient(serviceType, implementationType, replaceStrategy);
                    else
                        services.RegisterIfNotExist(serviceType, implementationType, lifeTime);
                    break;
            }

            return services;
        }

        public static IServiceCollection Register<TService, TImplementation>(
            this IServiceCollection services,
            ServiceLifeTime lifeTime,
            bool replaceIfExist = true,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            return Register(
                services,
                typeof(TService),
                typeof(TImplementation),
                lifeTime,
                replaceIfExist,
                replaceStrategy);
        }

        public static IServiceCollection RegisterIfNotExist<TService, TImplementation>(
            this IServiceCollection services,
            ServiceLifeTime lifeTime)
        {
            return RegisterIfNotExist(
                services,
                typeof(TService),
                typeof(TImplementation),
                lifeTime);
        }

        public static IServiceCollection RegisterIfNotExist(
            this IServiceCollection services,
            Type serviceType,
            Type implementationType,
            ServiceLifeTime lifeTime)
        {
            if (services.Any(p => p.ServiceType == serviceType && p.ImplementationType == implementationType))
                return services;
            return Register(
                services,
                serviceType,
                implementationType,
                lifeTime);
        }

        public static IServiceCollection RegisterIfServiceNotExist<TService, TImplementation>(
            this IServiceCollection services,
            ServiceLifeTime lifeTime,
            bool replaceIfExist = true,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            return RegisterIfServiceNotExist(
                services,
                typeof(TService),
                typeof(TImplementation),
                lifeTime,
                replaceIfExist,
                replaceStrategy);
        }

        public static IServiceCollection RegisterIfServiceNotExist(
            this IServiceCollection services,
            Type serviceType,
            Type implementationType,
            ServiceLifeTime lifeTime,
            bool replaceIfExist = true,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            if (services.Any(p => p.ServiceType == serviceType))
                return services;
            return Register(
                services,
                serviceType,
                implementationType,
                lifeTime,
                replaceIfExist,
                replaceStrategy);
        }

        public static IServiceCollection RegisterSelf(
            this IServiceCollection services,
            Type implementationType,
            ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
            bool replaceIfExist = true,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            return Register(
                services,
                implementationType,
                implementationType,
                lifeTime,
                replaceIfExist,
                replaceStrategy);
        }

        public static IServiceCollection Register<TImplementation>(
            this IServiceCollection services,
            Type serviceType,
            Func<IServiceProvider, TImplementation> implementationFunc,
            ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
            bool replaceIfExist = true,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            switch (lifeTime)
            {
                case ServiceLifeTime.Scoped:
                    if (replaceIfExist)
                        services.ReplaceScoped(serviceType, implementationFunc, replaceStrategy);
                    else
                        services.AddScoped(serviceType, p => implementationFunc(p));
                    break;
                case ServiceLifeTime.Singleton:
                    if (replaceIfExist)
                        services.ReplaceSingleton(serviceType, implementationFunc, replaceStrategy);
                    else
                        services.AddSingleton(serviceType, p => implementationFunc(p));
                    break;
                case ServiceLifeTime.Transient:
                default:
                    if (replaceIfExist)
                        services.ReplaceTransient(serviceType, implementationFunc, replaceStrategy);
                    else
                        services.AddTransient(serviceType, p => implementationFunc(p));
                    break;
            }

            return services;
        }

        public static IServiceCollection ReplaceTransient(
            this IServiceCollection services,
            Type serviceType,
            Type implementationType,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            RemoveIfExist(
                services,
                serviceType,
                implementationType,
                replaceStrategy);

            return services.AddTransient(serviceType, implementationType);
        }

        public static IServiceCollection ReplaceScoped(
            this IServiceCollection services,
            Type serviceType,
            Type implementationType,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            RemoveIfExist(
                services,
                serviceType,
                implementationType,
                replaceStrategy);

            return services.AddScoped(serviceType, implementationType);
        }

        public static IServiceCollection ReplaceSingleton(
            this IServiceCollection services,
            Type serviceType,
            Type implementationType,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            RemoveIfExist(
                services,
                serviceType,
                implementationType,
                replaceStrategy);

            return services.AddSingleton(serviceType, implementationType);
        }

        public static IServiceCollection ReplaceTransient<TImplementation>(
            this IServiceCollection services,
            Type serviceType,
            Func<IServiceProvider, TImplementation> implementationFactory,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            RemoveIfExist(
                services,
                serviceType,
                typeof(TImplementation),
                replaceStrategy);

            return services.AddTransient(serviceType, p => implementationFactory(p));
        }

        public static IServiceCollection ReplaceScoped<TImplementation>(
            this IServiceCollection services,
            Type serviceType,
            Func<IServiceProvider, TImplementation> implementationFactory,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            RemoveIfExist(
                services,
                serviceType,
                typeof(TImplementation),
                replaceStrategy);

            return services.AddScoped(serviceType, p => implementationFactory(p));
        }

        public static IServiceCollection ReplaceSingleton<TImplementation>(
            this IServiceCollection services,
            Type serviceType,
            Func<IServiceProvider, TImplementation> implementationFactory,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            RemoveIfExist(
                services,
                serviceType,
                typeof(TImplementation),
                replaceStrategy);

            return services.AddSingleton(serviceType, p => implementationFactory(p));
        }

        public static IServiceCollection ReplaceTransient<TService, TImplementation>(
            this IServiceCollection services,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
            where TService : class
            where TImplementation : class, TService
        {
            return services.ReplaceTransient(typeof(TService), typeof(TImplementation), replaceStrategy);
        }

        public static IServiceCollection ReplaceScoped<TService, TImplementation>(
            this IServiceCollection services,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
            where TService : class
            where TImplementation : class, TService
        {
            return services.ReplaceScoped(typeof(TService), typeof(TImplementation), replaceStrategy);
        }

        public static IServiceCollection ReplaceSingleton<TService, TImplementation>(
            this IServiceCollection services,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
            where TService : class
            where TImplementation : class, TService
        {
            return services.ReplaceSingleton(typeof(TService), typeof(TImplementation), replaceStrategy);
        }

        public static IServiceCollection RemoveIfExist(
            this IServiceCollection services,
            Func<ServiceDescriptor, bool> predicate)
        {
            var existedServiceRegister = services.FirstOrDefault(predicate);
            if (existedServiceRegister != null)
                services.Remove(existedServiceRegister);

            return services;
        }

        public static IServiceCollection RemoveIfExist(
            IServiceCollection services,
            Type serviceType,
            Type implementationType,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            return replaceStrategy switch
            {
                ReplaceServiceStrategy.ByService => RemoveIfExist(services, p => p.ServiceType == serviceType),
                ReplaceServiceStrategy.ByImplementation => RemoveIfExist(
                    services,
                    p => p.ImplementationType == implementationType),
                ReplaceServiceStrategy.ByBoth => RemoveIfExist(
                    services,
                    p => p.ServiceType == serviceType && p.ImplementationType == implementationType),
                _ => throw new ArgumentOutOfRangeException(nameof(replaceStrategy), replaceStrategy, null)
            };
        }

        public static void RegisterInterfacesForImplementation(
            this IServiceCollection services,
            Type implementationType,
            ServiceLifeTime lifeTime,
            bool replaceIfExist,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            if (implementationType.IsGenericType)
            {
                implementationType
                    .GetInterfaces()
                    .Where(p => p.IsGenericType && Util.Types.MatchGenericArguments(p, implementationType))
                    .ToList()
                    .ForEach(
                        implementationTypeInterface => services.Register(
                            Util.Types.FixTypeReference(implementationTypeInterface),
                            implementationType,
                            lifeTime,
                            replaceIfExist,
                            replaceStrategy));
            }
            else
            {
                implementationType
                    .GetInterfaces()
                    .Where(p => !p.IsGenericType)
                    .ToList()
                    .ForEach(
                        implementationTypeInterface => services.Register(
                            Util.Types.FixTypeReference(implementationTypeInterface),
                            implementationType,
                            lifeTime,
                            replaceIfExist,
                            replaceStrategy));
            }
        }

        public static void RegisterInterfacesForImplementation<TImplementation>(
            this IServiceCollection services,
            Func<IServiceProvider, TImplementation> implementationFactory,
            ServiceLifeTime lifeTime,
            bool replaceIfExist,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            var implementationType = typeof(TImplementation);
            RegisterInterfacesForImplementation(
                services,
                implementationType,
                provider => implementationFactory(provider),
                lifeTime,
                replaceIfExist,
                replaceStrategy);
        }

        public static void RegisterInterfacesForImplementation(
            this IServiceCollection services,
            Type implementationType,
            Func<IServiceProvider, object> implementationFactory,
            ServiceLifeTime lifeTime,
            bool replaceIfExist,
            ReplaceServiceStrategy replaceStrategy = ReplaceServiceStrategy.ByBoth)
        {
            if (implementationType.IsGenericType)
            {
                implementationType
                    .GetInterfaces()
                    .Where(p => p.IsGenericType && Util.Types.MatchGenericArguments(p, implementationType))
                    .ToList()
                    .ForEach(
                        implementationTypeInterface => services.Register(
                            Util.Types.FixTypeReference(implementationTypeInterface),
                            implementationFactory,
                            lifeTime,
                            replaceIfExist,
                            replaceStrategy));
            }
            else
            {
                implementationType
                    .GetInterfaces()
                    .Where(p => !p.IsGenericType)
                    .ToList()
                    .ForEach(
                        implementationTypeInterface => services.Register(
                            Util.Types.FixTypeReference(implementationTypeInterface),
                            implementationFactory,
                            lifeTime,
                            replaceIfExist,
                            replaceStrategy));
            }
        }
    }
}
