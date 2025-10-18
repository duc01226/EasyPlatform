#region

using System.Collections.Concurrent;
using System.Reflection;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Utils;
using Easy.Platform.Common.Validations.Extensions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Common.Extensions;

public static class DependencyInjectionExtension
{
    private static readonly Dictionary<string, Func<IServiceProvider, object>> RegisteredHostedServiceImplementTypeToImplementFactoryDict = [];
    private static readonly ConcurrentDictionary<string, object> RegisterHostedServiceLockDict = new();

    // Tracks the original descriptor for each service type
    private static readonly ConcurrentDictionary<Type, ServiceDescriptor> OriginalBeforeDecoratedDescriptors = new();

    public static string[] DefaultIgnoreRegisterLibraryInterfacesNameSpacePrefixes { get; set; } = ["System", "Microsoft"];

    /// <summary>
    /// Registers all types from a specified assembly that are assignable to a given type.
    /// </summary>
    /// <param name="services">The IServiceCollection to add the services to.</param>
    /// <param name="conventionalType">The type to which the types to be registered must be assignable.</param>
    /// <param name="assembly">The assembly to scan for types to register.</param>
    /// <param name="lifeTime">The lifetime of the services that are registered.</param>
    /// <param name="replaceIfExist">A flag indicating whether to replace existing registrations.</param>
    /// <param name="replaceStrategy">The strategy to use when checking if a service is already registered.</param>
    /// <param name="skipIfExist">A flag indicating whether to skip registration if the service already exists.</param>
    /// <param name="skipIfExistStrategy">The strategy to use when checking if a service should be skipped.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterAllFromType(
        this IServiceCollection services,
        Type conventionalType,
        Assembly assembly,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth,
        bool skipIfExist = false,
        CheckRegisteredStrategy skipIfExistStrategy = CheckRegisteredStrategy.ByBoth)
    {
        assembly.GetTypes()
            .Where(implementationType => implementationType.IsClass &&
                                         !implementationType.IsAbstract &&
                                         (implementationType.IsAssignableTo(conventionalType) ||
                                          (conventionalType!.IsGenericType &&
                                           implementationType.IsGenericType &&
                                           implementationType.IsAssignableToGenericType(conventionalType))))
            .ToList()
            .ForEach(implementationType =>
            {
                services.Register(
                    implementationType,
                    lifeTime,
                    replaceIfExist,
                    replaceStrategy: replaceStrategy,
                    skipIfExist: skipIfExist,
                    skipIfExistStrategy: skipIfExistStrategy);

                services.RegisterInterfacesForImplementation(
                    implementationType,
                    lifeTime,
                    replaceIfExist,
                    replaceStrategy,
                    skipIfExist: skipIfExist,
                    skipIfExistStrategy: skipIfExistStrategy);
            });

        return services;
    }

    /// <summary>
    /// Registers all concrete types in an assembly that are assignable to a given conventional type.
    /// </summary>
    /// <param name="services">The IServiceCollection to add the services to.</param>
    /// <param name="conventionalType">The type to which the concrete types should be assignable.</param>
    /// <param name="assembly">The assembly to search for types.</param>
    /// <param name="lifeTime">The lifetime of the services. Default is Transient.</param>
    /// <param name="replaceIfExist">Indicates whether to replace the service if it already exists. Default is true.</param>
    /// <param name="replaceStrategy">The strategy to use when checking if a service should be replaced. Default is ByBoth.</param>
    /// <param name="skipIfExist">Indicates whether to skip the service if it already exists. Default is false.</param>
    /// <param name="skipIfExistStrategy">The strategy to use when checking if a service should be skipped. Default is ByBoth.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterAllSelfImplementationFromType(
        this IServiceCollection services,
        Type conventionalType,
        Assembly assembly,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth,
        bool skipIfExist = false,
        CheckRegisteredStrategy skipIfExistStrategy = CheckRegisteredStrategy.ByBoth)
    {
        assembly.GetTypes()
            .Where(implementationType => implementationType.IsClass &&
                                         !implementationType.IsAbstract &&
                                         (implementationType.IsAssignableTo(conventionalType) ||
                                          (conventionalType!.IsGenericType &&
                                           implementationType.IsGenericType &&
                                           implementationType.IsAssignableToGenericType(conventionalType))))
            .ToList()
            .ForEach(implementationType =>
            {
                services.Register(
                    implementationType,
                    lifeTime,
                    replaceIfExist,
                    replaceStrategy: replaceStrategy,
                    skipIfExist: skipIfExist,
                    skipIfExistStrategy: skipIfExistStrategy);
            });

        return services;
    }

    /// <inheritdoc cref="RegisterAllSelfImplementationFromType(IServiceCollection,Type,Assembly,ServiceLifeTime,bool,CheckRegisteredStrategy,bool,CheckRegisteredStrategy)" />
    public static IServiceCollection RegisterAllSelfImplementationFromType(
        this IServiceCollection services,
        Type conventionalType,
        List<Assembly> assemblies,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth,
        bool skipIfExist = false,
        CheckRegisteredStrategy skipIfExistStrategy = CheckRegisteredStrategy.ByBoth)
    {
        assemblies.ForEach(assembly => RegisterAllSelfImplementationFromType(
            services,
            conventionalType,
            assembly,
            lifeTime,
            replaceIfExist,
            replaceStrategy,
            skipIfExist,
            skipIfExistStrategy));

        return services;
    }

    /// <summary>
    /// Registers all concrete types in the specified assembly that are assignable to the type parameter TConventional.
    /// </summary>
    /// <typeparam name="TConventional">The type that the concrete types should be assignable to.</typeparam>
    /// <param name="services">The IServiceCollection to add the services to.</param>
    /// <param name="assembly">The assembly to search for types to add.</param>
    /// <param name="lifeTime">The lifetime of the services being registered.</param>
    /// <param name="replaceIfExist">Whether to replace the service if it already exists.</param>
    /// <param name="replaceStrategy">The strategy to use when replacing existing services.</param>
    /// <param name="skipIfExist">Whether to skip the service if it already exists.</param>
    /// <param name="skipIfExistStrategy">The strategy to use when skipping existing services.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterAllFromType<TConventional>(
        this IServiceCollection services,
        Assembly assembly,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth,
        bool skipIfExist = false,
        CheckRegisteredStrategy skipIfExistStrategy = CheckRegisteredStrategy.ByBoth)
    {
        return RegisterAllFromType(
            services,
            typeof(TConventional),
            assembly,
            lifeTime,
            replaceIfExist,
            replaceStrategy,
            skipIfExist: skipIfExist,
            skipIfExistStrategy: skipIfExistStrategy);
    }

    /// <inheritdoc cref="RegisterAllFromType" />
    public static IServiceCollection RegisterAllFromType<TConventional>(
        this IServiceCollection services,
        List<Assembly> assemblies,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth,
        bool skipIfExist = false,
        CheckRegisteredStrategy skipIfExistStrategy = CheckRegisteredStrategy.ByBoth)
    {
        assemblies.ForEach(assembly => RegisterAllFromType(
            services,
            typeof(TConventional),
            assembly,
            lifeTime,
            replaceIfExist,
            replaceStrategy,
            skipIfExist: skipIfExist,
            skipIfExistStrategy: skipIfExistStrategy));

        return services;
    }

    /// <summary>
    /// Registers all concrete types in the specified assembly that are assignable to the given conventional type as themselves.
    /// </summary>
    /// <param name="services">The IServiceCollection to add the services to.</param>
    /// <param name="assembly">The assembly to scan for matching types.</param>
    /// <param name="lifeTime">The lifetime of the services. Default is Transient.</param>
    /// <param name="replaceIfExist">Whether to replace the service if it already exists. Default is true.</param>
    /// <param name="replaceStrategy">The strategy to use when checking if a service should be replaced. Default is ByBoth.</param>
    /// <param name="skipIfExist">Whether to skip the service if it already exists. Default is false.</param>
    /// <param name="skipIfExistStrategy">The strategy to use when checking if a service should be skipped. Default is ByBoth.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterAllSelfImplementationFromType<TConventional>(
        this IServiceCollection services,
        Assembly assembly,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth,
        bool skipIfExist = false,
        CheckRegisteredStrategy skipIfExistStrategy = CheckRegisteredStrategy.ByBoth)
    {
        return RegisterAllSelfImplementationFromType(
            services,
            typeof(TConventional),
            assembly,
            lifeTime,
            replaceIfExist,
            replaceStrategy,
            skipIfExist: skipIfExist,
            skipIfExistStrategy: skipIfExistStrategy);
    }

    /// <inheritdoc cref="RegisterAllSelfImplementationFromType" />
    public static IServiceCollection RegisterAllSelfImplementationFromType<TConventional>(
        this IServiceCollection services,
        List<Assembly> assemblies,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth,
        bool skipIfExist = false,
        CheckRegisteredStrategy skipIfExistStrategy = CheckRegisteredStrategy.ByBoth)
    {
        assemblies.ForEach(assembly =>
        {
            RegisterAllSelfImplementationFromType(
                services,
                typeof(TConventional),
                assembly,
                lifeTime,
                replaceIfExist,
                replaceStrategy,
                skipIfExist: skipIfExist,
                skipIfExistStrategy: skipIfExistStrategy);
        });

        return services;
    }

    /// <summary>
    /// Registers the specified implementation type as itself and for all of its implemented interfaces.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection" /> to add the service to.</param>
    /// <param name="implementationType">The type of the implementation to register.</param>
    /// <param name="lifeTime">The <see cref="ServiceLifeTime" /> of the service.</param>
    /// <param name="replaceIfExist">If set to true, existing registrations for the same service type will be replaced.</param>
    /// <param name="replaceStrategy">The strategy to use when replacing existing registrations.</param>
    /// <param name="skipIfExist">If set to true, the registration will be skipped if there is an existing registration for the same service type.</param>
    /// <param name="skipIfExistStrategy">The strategy to use when skipping existing registrations.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterAllForImplementation(
        this IServiceCollection services,
        Type implementationType,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth,
        bool skipIfExist = false,
        CheckRegisteredStrategy skipIfExistStrategy = CheckRegisteredStrategy.ByBoth)
    {
        services.Register(implementationType, implementationType, lifeTime, replaceIfExist, replaceStrategy);

        services.RegisterInterfacesForImplementation(
            implementationType,
            lifeTime,
            replaceIfExist,
            replaceStrategy,
            skipIfExist: skipIfExist,
            skipIfExistStrategy: skipIfExistStrategy);

        return services;
    }

    /// <summary>
    /// Registers a type and its implemented interfaces in the service collection.
    /// </summary>
    /// <param name="services">The IServiceCollection to add the service to.</param>
    /// <param name="implementationType">The type of the service to register.</param>
    /// <param name="implementationFactory">The factory that creates the service.</param>
    /// <param name="lifeTime">The lifetime of the service.</param>
    /// <param name="replaceIfExist">Indicates whether to replace the service if it already exists.</param>
    /// <param name="replaceStrategy">The strategy to use when replacing the service.</param>
    /// <returns>The IServiceCollection so that additional calls can be chained.</returns>
    public static IServiceCollection RegisterAllForImplementation(
        this IServiceCollection services,
        Type implementationType,
        Func<IServiceProvider, object> implementationFactory,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth)
    {
        services.Register(implementationType, implementationType, lifeTime, replaceIfExist, replaceStrategy);

        services.RegisterInterfacesForImplementation(
            implementationType,
            implementationFactory,
            lifeTime,
            replaceIfExist,
            replaceStrategy);

        return services;
    }

    /// <summary>
    /// Registers all services that implement the specified type in the <see cref="IServiceCollection" />.
    /// </summary>
    /// <typeparam name="TImplementation">The type of the implementation to register.</typeparam>
    /// <param name="services">The <see cref="IServiceCollection" /> to add the service to.</param>
    /// <param name="lifeTime">The <see cref="ServiceLifeTime" /> to use when registering the service.</param>
    /// <param name="replaceIfExist">A boolean value indicating whether to replace the service if it already exists.</param>
    /// <param name="replaceStrategy">The strategy to use when checking if a service is registered.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterAllForImplementation<TImplementation>(
        this IServiceCollection services,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth)
    {
        return RegisterAllForImplementation(
            services,
            typeof(TImplementation),
            lifeTime,
            replaceIfExist,
            replaceStrategy);
    }

    /// <summary>
    /// Registers an instance of type TImplementation and all its implemented interfaces in the service collection.
    /// </summary>
    /// <typeparam name="TImplementation">The type of the implementation to register.</typeparam>
    /// <param name="services">The IServiceCollection to add the service to.</param>
    /// <param name="implementationFactory">A factory that creates instances of the service type.</param>
    /// <param name="lifeTime">The lifetime of the service in the collection.</param>
    /// <param name="replaceIfExist">A boolean value to determine if existing registrations should be replaced.</param>
    /// <returns>The IServiceCollection so that additional calls can be chained.</returns>
    public static IServiceCollection RegisterAllForImplementation<TImplementation>(
        this IServiceCollection services,
        Func<IServiceProvider, TImplementation> implementationFactory,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
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

    /// <summary>
    /// Registers a service of the specified type with an implementation type in the <see cref="IServiceCollection" />.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection" /> to add the service to.</param>
    /// <param name="serviceType">The type of the service to register.</param>
    /// <param name="implementationType">The implementation type of the service.</param>
    /// <param name="lifeTime">The lifetime of the service. Default is <see cref="ServiceLifeTime.Transient" />.</param>
    /// <param name="replaceIfExist">Indicates whether to replace the service if it already exists. Default is true.</param>
    /// <param name="replaceStrategy">The strategy to use when replacing an existing service. Default is <see cref="CheckRegisteredStrategy.ByBoth" />.</param>
    /// <param name="skipIfExist">Indicates whether to skip registration if the service already exists. Default is false.</param>
    /// <param name="skipIfExistStrategy">The strategy to use when skipping an existing service. Default is <see cref="CheckRegisteredStrategy.ByBoth" />.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection Register(
        this IServiceCollection services,
        Type serviceType,
        Type implementationType,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth,
        bool skipIfExist = false,
        CheckRegisteredStrategy skipIfExistStrategy = CheckRegisteredStrategy.ByBoth)
    {
        if (skipIfExist)
        {
            if (skipIfExistStrategy == CheckRegisteredStrategy.ByBoth &&
                services.Any(p => p.ServiceType == serviceType && p.ImplementationType == implementationType)) return services;
            if (skipIfExistStrategy == CheckRegisteredStrategy.ByService &&
                services.Any(p => p.ServiceType == serviceType)) return services;
            if (skipIfExistStrategy == CheckRegisteredStrategy.ByImplementation &&
                services.Any(p => p.ImplementationType == implementationType)) return services;
        }

        switch (lifeTime)
        {
            case ServiceLifeTime.Scoped:
                if (replaceIfExist)
                    services.ReplaceScoped(serviceType, implementationType, replaceStrategy);
                else
                    services.AddScoped(serviceType, implementationType);
                break;
            case ServiceLifeTime.Singleton:
                if (replaceIfExist)
                    services.ReplaceSingleton(serviceType, implementationType, replaceStrategy);
                else
                    services.AddSingleton(serviceType, implementationType);
                break;

            default:
                if (replaceIfExist)
                    services.ReplaceTransient(serviceType, implementationType, replaceStrategy);
                else
                    services.AddTransient(serviceType, implementationType);
                break;
        }

        return services;
    }

    /// <summary>
    /// Registers a service of type TService with an implementation of type TImplementation in the provided IServiceCollection.
    /// </summary>
    /// <typeparam name="TService">The type of the service to register.</typeparam>
    /// <typeparam name="TImplementation">The type of the implementation to use for the service.</typeparam>
    /// <param name="services">The IServiceCollection to add the service to.</param>
    /// <param name="lifeTime">The lifetime of the service. Default is Transient.</param>
    /// <param name="replaceIfExist">If set to true, replaces the existing service registration if it exists. Default is true.</param>
    /// <param name="replaceStrategy">The strategy to use when checking if a service registration should be replaced. Default is ByBoth.</param>
    /// <param name="supportLazyInject">If true, also register Lazy{TService}</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection Register<TService, TImplementation>(
        this IServiceCollection services,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth,
        bool supportLazyInject = false)
    {
        if (supportLazyInject)
            services.Register(typeof(Lazy<TService>), sp => new Lazy<TService>(sp.GetService<TService>), lifeTime, replaceIfExist, replaceStrategy);

        return Register(
            services,
            typeof(TService),
            typeof(TImplementation),
            lifeTime,
            replaceIfExist,
            replaceStrategy);
    }

    /// <summary>
    /// Registers a service of type TService with an implementation of type TImplementation in the specified IServiceCollection if the service does not already exist.
    /// </summary>
    /// <typeparam name="TService">The type of the service to add.</typeparam>
    /// <typeparam name="TImplementation">The type of the implementation to use.</typeparam>
    /// <param name="services">The IServiceCollection to add the service to.</param>
    /// <param name="lifeTime">The lifetime of the service.</param>
    /// <param name="checkExistingStrategy">The strategy to use when checking if the service already exists.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterIfNotExist<TService, TImplementation>(
        this IServiceCollection services,
        ServiceLifeTime lifeTime,
        CheckRegisteredStrategy checkExistingStrategy)
    {
        return RegisterIfNotExist(
            services,
            typeof(TService),
            typeof(TImplementation),
            lifeTime,
            checkExistingStrategy);
    }

    /// <summary>
    /// Registers the specified service type and implementation type in the service collection if they do not already exist.
    /// </summary>
    /// <param name="services">The IServiceCollection to add the service to.</param>
    /// <param name="serviceType">The type of the service to register.</param>
    /// <param name="implementationType">The type of the implementation to use.</param>
    /// <param name="lifeTime">The lifetime of the service.</param>
    /// <param name="checkExistingStrategy">The strategy to use when checking if the service already exists.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterIfNotExist(
        this IServiceCollection services,
        Type serviceType,
        Type implementationType,
        ServiceLifeTime lifeTime,
        CheckRegisteredStrategy checkExistingStrategy)
    {
        if (checkExistingStrategy == CheckRegisteredStrategy.ByBoth &&
            services.Any(p => p.ServiceType == serviceType && p.ImplementationType == implementationType)) return services;
        if (checkExistingStrategy == CheckRegisteredStrategy.ByService &&
            services.Any(p => p.ServiceType == serviceType)) return services;
        if (checkExistingStrategy == CheckRegisteredStrategy.ByImplementation &&
            services.Any(p => p.ImplementationType == implementationType)) return services;

        return Register(
            services,
            serviceType,
            implementationType,
            lifeTime);
    }

    /// <summary>
    /// Registers the specified service and implementation in the IServiceCollection if the service does not already exist.
    /// </summary>
    /// <typeparam name="TService">The type of the service to add.</typeparam>
    /// <typeparam name="TImplementation">The type of the implementation to use.</typeparam>
    /// <param name="services">The IServiceCollection to add the service to.</param>
    /// <param name="lifeTime">The lifetime of the service. Default is Transient.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterIfServiceNotExist<TService, TImplementation>(
        this IServiceCollection services,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient)
    {
        return RegisterIfServiceNotExist(
            services,
            typeof(TService),
            typeof(TImplementation),
            lifeTime);
    }

    /// <summary>
    /// Registers the specified service type and implementation type in the service collection if the service does not already exist.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection" /> to add the service to.</param>
    /// <param name="serviceType">The type of the service to register.</param>
    /// <param name="implementationType">The implementation type of the service to register.</param>
    /// <param name="lifeTime">The <see cref="ServiceLifeTime" /> of the service (default is <see cref="ServiceLifeTime.Transient" />).</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterIfServiceNotExist(
        this IServiceCollection services,
        Type serviceType,
        Type implementationType,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient)
    {
        if (services.Any(p => p.ServiceType == serviceType)) return services;

        return Register(
            services,
            serviceType,
            implementationType,
            lifeTime);
    }

    /// <summary>
    /// Registers a service in the IServiceCollection if it does not already exist.
    /// </summary>
    /// <typeparam name="TImplementation">The type of the implementation to use.</typeparam>
    /// <param name="services">The IServiceCollection to add the service to.</param>
    /// <param name="serviceType">The type of the service to register.</param>
    /// <param name="implementationProvider">A factory that creates the service.</param>
    /// <param name="lifeTime">The lifetime of the service in the IServiceCollection.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterIfServiceNotExist<TImplementation>(
        this IServiceCollection services,
        Type serviceType,
        Func<IServiceProvider, TImplementation> implementationProvider,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient)
    {
        if (services.Any(p => p.ServiceType == serviceType)) return services;

        return Register(
            services,
            serviceType,
            implementationProvider,
            lifeTime);
    }

    /// <summary>
    /// Registers a service of the specified type in the <see cref="IServiceCollection" />.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection" /> to add the service to.</param>
    /// <param name="implementationType">The type of the service to register.</param>
    /// <param name="lifeTime">The <see cref="ServiceLifeTime" /> of the service (default is Transient).</param>
    /// <param name="replaceIfExist">A boolean value indicating whether to replace the service if it already exists (default is true).</param>
    /// <param name="replaceStrategy">The strategy to use when replacing a service (default is ByBoth).</param>
    /// <param name="skipIfExist">A boolean value indicating whether to skip the registration if the service already exists (default is false).</param>
    /// <param name="skipIfExistStrategy">The strategy to use when skipping a service (default is ByBoth).</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection Register(
        this IServiceCollection services,
        Type implementationType,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth,
        bool skipIfExist = false,
        CheckRegisteredStrategy skipIfExistStrategy = CheckRegisteredStrategy.ByBoth)
    {
        return Register(
            services,
            implementationType,
            implementationType,
            lifeTime,
            replaceIfExist,
            replaceStrategy,
            skipIfExist: skipIfExist,
            skipIfExistStrategy: skipIfExistStrategy);
    }

    /// <summary>
    /// Registers a service of type TService with the specified lifetime in the provided service collection.
    /// </summary>
    /// <typeparam name="TService">The type of the service to register.</typeparam>
    /// <param name="services">The IServiceCollection to add the service to.</param>
    /// <param name="lifeTime">The lifetime of the service. Default is Transient.</param>
    /// <param name="replaceIfExist">A flag indicating whether to replace the service if it already exists. Default is true.</param>
    /// <param name="replaceStrategy">The strategy to use when checking if a service is already registered. Default is ByBoth.</param>
    /// <param name="supportLazyInject">If true, also register Lazy{TService}</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection Register<TService>(
        this IServiceCollection services,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth,
        bool supportLazyInject = false)
    {
        if (supportLazyInject)
            services.Register(typeof(Lazy<TService>), sp => new Lazy<TService>(sp.GetService<TService>), lifeTime, replaceIfExist, replaceStrategy);

        return Register(
            services,
            typeof(TService),
            lifeTime,
            replaceIfExist,
            replaceStrategy);
    }

    /// <summary>
    /// Registers a service of type TService with a specified implementation function, lifetime, and replacement strategy.
    /// </summary>
    /// <typeparam name="TService">The type of the service to register.</typeparam>
    /// <param name="services">The IServiceCollection to add the service to.</param>
    /// <param name="implementationFunc">A function that creates the instance of the service.</param>
    /// <param name="lifeTime">The lifetime of the service (Transient, Scoped, Singleton).</param>
    /// <param name="replaceIfExist">A flag indicating whether to replace the service if it already exists in the IServiceCollection.</param>
    /// <param name="replaceStrategy">The strategy to use when checking if a service is already registered (ByService, ByImplementation, ByBoth).</param>
    /// <param name="supportLazyInject">If true, also register Lazy{TService}</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection Register<TService>(
        this IServiceCollection services,
        Func<IServiceProvider, TService> implementationFunc,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth,
        bool supportLazyInject = false)
    {
        if (supportLazyInject)
            services.Register(typeof(Lazy<TService>), sp => new Lazy<TService>(() => implementationFunc(sp)), lifeTime, replaceIfExist, replaceStrategy);

        return Register(
            services,
            typeof(TService),
            implementationFunc,
            lifeTime,
            replaceIfExist,
            replaceStrategy);
    }

    /// <summary>
    /// Registers a specific instance of type TService in the IServiceCollection.
    /// </summary>
    /// <typeparam name="TService">The type of the service to register.</typeparam>
    /// <param name="services">The IServiceCollection to add the service to.</param>
    /// <param name="instance">The specific instance to register.</param>
    /// <param name="replaceIfExist">Optional parameter. If set to true, the existing registration for the service will be replaced if it exists. Default is true.</param>
    /// <param name="replaceStrategy">Optional parameter. Determines the strategy to use when replacing existing registrations. Default is CheckRegisteredStrategy.ByBoth.</param>
    /// <param name="supportLazyInject">If true, also register Lazy{TService}</param>
    /// <returns>The IServiceCollection so that additional calls can be chained.</returns>
    public static IServiceCollection RegisterInstance<TService>(
        this IServiceCollection services,
        TService instance,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth,
        bool supportLazyInject = false)
    {
        if (supportLazyInject)
            services.Register(typeof(Lazy<TService>), sp => new Lazy<TService>(() => instance), ServiceLifeTime.Singleton, replaceIfExist, replaceStrategy);

        return Register(
            services,
            typeof(TService),
            _ => instance,
            ServiceLifeTime.Singleton,
            replaceIfExist,
            replaceStrategy);
    }

    /// <summary>
    /// Registers a service of the specified type in the <see cref="IServiceCollection" />.
    /// </summary>
    /// <typeparam name="TImplementation">The type of the implementation to use.</typeparam>
    /// <param name="services">The <see cref="IServiceCollection" /> to add the service to.</param>
    /// <param name="serviceType">The type of the service to register.</param>
    /// <param name="implementationFactory">A factory that creates instances of the service type.</param>
    /// <param name="lifeTime">The <see cref="ServiceLifeTime" /> of the service (Transient, Scoped, or Singleton).</param>
    /// <param name="replaceIfExist">A boolean value indicating whether to replace the service if it already exists.</param>
    /// <param name="replaceStrategy">The strategy to use when replacing the service (<see cref="CheckRegisteredStrategy" />).</param>
    /// <returns>The <see cref="IServiceCollection" /> so that additional calls can be chained.</returns>
    public static IServiceCollection Register<TImplementation>(
        this IServiceCollection services,
        Type serviceType,
        Func<IServiceProvider, TImplementation> implementationFactory,
        ServiceLifeTime lifeTime = ServiceLifeTime.Transient,
        bool replaceIfExist = true,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth)
    {
        switch (lifeTime)
        {
            case ServiceLifeTime.Scoped:
                if (replaceIfExist)
                    services.ReplaceScoped(serviceType, implementationFactory, replaceStrategy);
                else
                    services.AddScoped(serviceType, p => implementationFactory(p));
                break;
            case ServiceLifeTime.Singleton:
                if (replaceIfExist)
                    services.ReplaceSingleton(serviceType, implementationFactory, replaceStrategy);
                else
                    services.AddSingleton(serviceType, p => implementationFactory(p));
                break;
            default:
                if (replaceIfExist)
                    services.ReplaceTransient(serviceType, implementationFactory, replaceStrategy);
                else
                    services.AddTransient(serviceType, p => implementationFactory(p));
                break;
        }

        return services;
    }

    /// <summary>
    /// Registers a hosted service in the provided service collection.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection" /> to add the service to.</param>
    /// <param name="hostedServiceType">The type of the hosted service to register.</param>
    /// <param name="replaceForHostedServiceType">Optional. If provided, the existing registration of this type will be replaced.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterHostedService(
        this IServiceCollection services,
        Type hostedServiceType,
        Type replaceForHostedServiceType = null)
    {
        services.Register(hostedServiceType, ServiceLifeTime.Singleton, replaceIfExist: true, replaceStrategy: CheckRegisteredStrategy.ByBoth);

        RegisterForIHostedService(services, hostedServiceType, replaceForHostedServiceType);

        return services;
    }

    /// <summary>
    /// Registers a hosted service in the provided service collection.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection" /> to add the service to.</param>
    /// <param name="hostedServiceFactory">The hostedServiceFactory of the hosted service to register.</param>
    /// <param name="replaceForHostedServiceType">Optional. If provided, the existing registration of this type will be replaced.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterHostedService<THostedService>(
        this IServiceCollection services,
        Func<IServiceProvider, THostedService> hostedServiceFactory,
        Type replaceForHostedServiceType = null)
    {
        services.Register(hostedServiceFactory, ServiceLifeTime.Singleton, replaceIfExist: true, replaceStrategy: CheckRegisteredStrategy.ByBoth);

        RegisterForIHostedService(services, typeof(THostedService), replaceForHostedServiceType);

        return services;
    }

    private static void RegisterForIHostedService(IServiceCollection services, Type hostedServiceType, Type replaceForHostedServiceType)
    {
        RegisterHostedServiceLockDict.TryAdd(hostedServiceType.FullName!, new object());

        lock (RegisterHostedServiceLockDict[hostedServiceType.FullName!])
        {
            if (!RegisteredHostedServiceImplementTypeToImplementFactoryDict.ContainsKey(hostedServiceType.FullName!))
            {
                RegisteredHostedServiceImplementTypeToImplementFactoryDict.Add(hostedServiceType.FullName!, sp => sp.GetRequiredService(hostedServiceType));

                services
                    .Register(
                        typeof(IHostedService),
                        RegisteredHostedServiceImplementTypeToImplementFactoryDict[hostedServiceType.FullName!],
                        ServiceLifeTime.Singleton,
                        replaceIfExist: true,
                        replaceStrategy: CheckRegisteredStrategy.ByBoth);
            }
        }

        if (replaceForHostedServiceType != null)
        {
            services.RemoveWhere(p => p.ImplementationType == replaceForHostedServiceType ||
                                      p.ImplementationInstance?.GetType() == replaceForHostedServiceType ||
                                      p.ImplementationFactory == RegisteredHostedServiceImplementTypeToImplementFactoryDict[hostedServiceType.FullName!]);

            services.Register(
                replaceForHostedServiceType,
                RegisteredHostedServiceImplementTypeToImplementFactoryDict[hostedServiceType.FullName!],
                ServiceLifeTime.Singleton,
                replaceIfExist: true,
                replaceStrategy: CheckRegisteredStrategy.ByBoth);
        }
    }

    /// <summary>
    /// Registers a hosted service of the specified type in the service collection.
    /// </summary>
    /// <typeparam name="THostedService">The type of the hosted service to register. This type must implement <see cref="IHostedService" />.</typeparam>
    /// <param name="services">The <see cref="IServiceCollection" /> to add the service to.</param>
    /// <param name="replaceForHostedServiceType">Optional. The type of the existing hosted service to replace. If this parameter is null, a new service of type <typeparamref name="THostedService" /> is added to the service collection.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterHostedService<THostedService>(
        this IServiceCollection services,
        Type replaceForHostedServiceType = null) where THostedService : class, IHostedService
    {
        return RegisterHostedService(services, typeof(THostedService), replaceForHostedServiceType);
    }

    /// <summary>
    /// Registers all types in the specified assembly that implement the IHostedService interface and match the convention of the specified type.
    /// </summary>
    /// <typeparam name="TConventionHostedService">The type that provides the convention to match. This type should implement IHostedService.</typeparam>
    /// <param name="services">The IServiceCollection to add the services to.</param>
    /// <param name="assembly">The assembly to scan for types that match the convention.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterHostedServicesFromType<TConventionHostedService>(
        this IServiceCollection services,
        Assembly assembly) where TConventionHostedService : class, IHostedService
    {
        return RegisterHostedServicesFromType(services, assembly, typeof(TConventionHostedService));
    }

    /// <summary>
    /// Registers all types in the specified assembly that implement the IHostedService interface and match the convention of the specified type.
    /// </summary>
    /// <param name="services">The IServiceCollection to add the services to.</param>
    /// <param name="assembly">The assembly to scan for types that match the convention.</param>
    /// <param name="conventionalType">The type that provides the convention to match. This type should implement IHostedService.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RegisterHostedServicesFromType(
        this IServiceCollection services,
        Assembly assembly,
        Type conventionalType)
    {
        assembly.GetTypes()
            .Where(implementationType => implementationType.IsClass &&
                                         !implementationType.IsAbstract &&
                                         !implementationType.IsGenericType &&
                                         implementationType.IsAssignableTo(typeof(IHostedService)) &&
                                         implementationType.IsAssignableTo(conventionalType))
            .ForEach(implementHostedServiceType =>
            {
                RegisterHostedService(services, implementHostedServiceType);
            });

        return services;
    }

    /// <summary>
    /// Replaces a transient service in the specified IServiceCollection.
    /// </summary>
    /// <param name="services">The IServiceCollection to replace the service in.</param>
    /// <param name="serviceType">The type of the service to replace.</param>
    /// <param name="implementationType">The type of the implementation to use instead.</param>
    /// <param name="replaceStrategy">The strategy to use when checking if the service is already registered.</param>
    /// <returns>The IServiceCollection for chaining.</returns>
    public static IServiceCollection ReplaceTransient(
        this IServiceCollection services,
        Type serviceType,
        Type implementationType,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth)
    {
        RemoveIfExist(
            services,
            serviceType,
            implementationType,
            replaceStrategy);

        return services.AddTransient(serviceType, implementationType);
    }

    /// <summary>
    /// Replaces the scoped service in the <see cref="IServiceCollection" /> with the specified service type and implementation type.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection" /> to add the service to.</param>
    /// <param name="serviceType">The type of the service to replace.</param>
    /// <param name="implementationType">The type of the implementation to use.</param>
    /// <param name="replaceStrategy">The strategy to use when checking if a service is registered.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection ReplaceScoped(
        this IServiceCollection services,
        Type serviceType,
        Type implementationType,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth)
    {
        RemoveIfExist(
            services,
            serviceType,
            implementationType,
            replaceStrategy);

        return services.AddScoped(serviceType, implementationType);
    }

    /// <summary>
    /// Replaces the singleton service of the specified type in the <see cref="IServiceCollection" />.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection" /> to add the service to.</param>
    /// <param name="serviceType">The type of the service to replace.</param>
    /// <param name="implementationType">The type of the implementation to use.</param>
    /// <param name="replaceStrategy">The strategy to use when checking if the service is already registered.</param>
    /// <returns>The <see cref="IServiceCollection" /> so that additional calls can be chained.</returns>
    public static IServiceCollection ReplaceSingleton(
        this IServiceCollection services,
        Type serviceType,
        Type implementationType,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth)
    {
        RemoveIfExist(
            services,
            serviceType,
            implementationType,
            replaceStrategy);

        return services.AddSingleton(serviceType, implementationType);
    }

    /// <inheritdoc cref="ReplaceTransient" />
    public static IServiceCollection ReplaceTransient<TImplementation>(
        this IServiceCollection services,
        Type serviceType,
        Func<IServiceProvider, TImplementation> implementationFactory,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth)
    {
        RemoveIfExist(
            services,
            serviceType,
            typeof(TImplementation),
            replaceStrategy);

        return services.AddTransient(serviceType, p => implementationFactory(p));
    }

    /// <inheritdoc cref="ReplaceScoped" />
    public static IServiceCollection ReplaceScoped<TImplementation>(
        this IServiceCollection services,
        Type serviceType,
        Func<IServiceProvider, TImplementation> implementationFactory,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth)
    {
        RemoveIfExist(
            services,
            serviceType,
            typeof(TImplementation),
            replaceStrategy);

        return services.AddScoped(serviceType, p => implementationFactory(p));
    }

    /// <inheritdoc cref="ReplaceSingleton" />
    public static IServiceCollection ReplaceSingleton<TImplementation>(
        this IServiceCollection services,
        Type serviceType,
        Func<IServiceProvider, TImplementation> implementationFactory,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth)
    {
        RemoveIfExist(
            services,
            serviceType,
            typeof(TImplementation),
            replaceStrategy);

        return services.AddSingleton(serviceType, p => implementationFactory(p));
    }

    /// <inheritdoc cref="ReplaceTransient" />
    public static IServiceCollection ReplaceTransient<TService, TImplementation>(
        this IServiceCollection services,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth)
        where TService : class
        where TImplementation : class, TService
    {
        return services.ReplaceTransient(typeof(TService), typeof(TImplementation), replaceStrategy);
    }

    /// <inheritdoc cref="ReplaceScoped" />
    public static IServiceCollection ReplaceScoped<TService, TImplementation>(
        this IServiceCollection services,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth)
        where TService : class
        where TImplementation : class, TService
    {
        return services.ReplaceScoped(typeof(TService), typeof(TImplementation), replaceStrategy);
    }

    /// <inheritdoc cref="ReplaceSingleton" />
    public static IServiceCollection ReplaceSingleton<TService, TImplementation>(
        this IServiceCollection services,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth)
        where TService : class
        where TImplementation : class, TService
    {
        return services.ReplaceSingleton(typeof(TService), typeof(TImplementation), replaceStrategy);
    }

    /// <summary>
    /// Removes the service from the <see cref="IServiceCollection" /> if it exists and matches the provided predicate.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection" /> to remove the service from.</param>
    /// <param name="predicate">A function to test each service for a condition.</param>
    /// <returns>The same service collection so that multiple calls can be chained.</returns>
    public static IServiceCollection RemoveIfExist(
        this IServiceCollection services,
        Func<ServiceDescriptor, bool> predicate)
    {
        var existedServiceRegister = services.FirstOrDefault(predicate);

        if (existedServiceRegister != null) services.Remove(existedServiceRegister);

        return services;
    }

    /// <summary>
    /// Removes the specified service from the <see cref="IServiceCollection" /> if it exists.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection" /> to remove the service from.</param>
    /// <param name="serviceType">The type of the service to remove.</param>
    /// <param name="implementationType">The type of the implementation to remove.</param>
    /// <param name="replaceStrategy">The strategy to use when checking if the service exists. Default is <see cref="CheckRegisteredStrategy.ByBoth" />.</param>
    /// <returns>The <see cref="IServiceCollection" /> after the service has been removed if it existed.</returns>
    public static IServiceCollection RemoveIfExist(
        IServiceCollection services,
        Type serviceType,
        Type implementationType,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth)
    {
        return replaceStrategy switch
        {
            CheckRegisteredStrategy.ByService => RemoveIfExist(services, p => p.ServiceType == serviceType),
            CheckRegisteredStrategy.ByImplementation => RemoveIfExist(
                services,
                p => p.ImplementationType == implementationType),
            CheckRegisteredStrategy.ByBoth => RemoveIfExist(
                services,
                p => p.ServiceType == serviceType && p.ImplementationType == implementationType),
            _ => throw new ArgumentOutOfRangeException(nameof(replaceStrategy), replaceStrategy, null)
        };
    }

    // Repeat the same pattern for the other RemoveIfExist method
    /// <summary>
    /// Registers all interfaces for the specified implementation type in the IServiceCollection.
    /// </summary>
    /// <param name="services">The IServiceCollection to add the services to.</param>
    /// <param name="implementationType">The type of the implementation to register interfaces for.</param>
    /// <param name="lifeTime">The lifetime of the services.</param>
    /// <param name="replaceIfExist">Whether to replace the service if it already exists.</param>
    /// <param name="replaceStrategy">The strategy to use when checking if the service is already registered.</param>
    /// <param name="skipIfExist">Whether to skip the service if it already exists.</param>
    /// <param name="skipIfExistStrategy">The strategy to use when checking if the service should be skipped.</param>
    public static void RegisterInterfacesForImplementation(
        this IServiceCollection services,
        Type implementationType,
        ServiceLifeTime lifeTime,
        bool replaceIfExist,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth,
        bool skipIfExist = false,
        CheckRegisteredStrategy skipIfExistStrategy = CheckRegisteredStrategy.ByBoth)
    {
        if (!implementationType.IsGenericType)
        {
            implementationType
                .GetInterfaces()
                .Where(implementationTypeInterface => !implementationTypeInterface.IsGenericType ||
                                                      !implementationTypeInterface.ContainsGenericParameters)
                .Where(DefaultIgnoreRegisterLibraryInterfacesForImplementationExpr())
                .ForEach(implementationTypeInterface => services.Register(
                    implementationTypeInterface.FixMissingFullNameGenericType(),
                    implementationType,
                    lifeTime,
                    replaceIfExist,
                    replaceStrategy,
                    skipIfExist: skipIfExist,
                    skipIfExistStrategy: skipIfExistStrategy));
        }

        else
        {
            implementationType
                .GetInterfaces()
                .Where(implementationType.MatchGenericArguments)
                .Where(DefaultIgnoreRegisterLibraryInterfacesForImplementationExpr())
                .ForEach(implementationTypeInterface => services.Register(
                    implementationTypeInterface.FixMissingFullNameGenericType(),
                    implementationType,
                    lifeTime,
                    replaceIfExist,
                    replaceStrategy,
                    skipIfExist: skipIfExist,
                    skipIfExistStrategy: skipIfExistStrategy));
        }
    }

    public static Func<Type, bool> DefaultIgnoreRegisterLibraryInterfacesForImplementationExpr()
    {
        return implementationTypeInterface =>
            DefaultIgnoreRegisterLibraryInterfacesNameSpacePrefixes.NotExist(prefix => implementationTypeInterface.FullName?.StartsWith(prefix) == true);
    }

    /// <summary>
    /// Registers the interfaces for the specified implementation in the provided services collection.
    /// </summary>
    /// <typeparam name="TImplementation">The type of the implementation to register.</typeparam>
    /// <param name="services">The <see cref="IServiceCollection" /> to add the service to.</param>
    /// <param name="implementationFactory">The factory that creates the service.</param>
    /// <param name="lifeTime">The <see cref="ServiceLifeTime" /> of the service.</param>
    /// <param name="replaceIfExist">A boolean value indicating whether to replace the service if it already exists.</param>
    /// <param name="replaceStrategy">The strategy to use when replacing the service.</param>
    /// <param name="supportLazyInject">Support inject Lazy{ServiceType}</param>
    public static void RegisterInterfacesForImplementation<TImplementation>(
        this IServiceCollection services,
        Func<IServiceProvider, TImplementation> implementationFactory,
        ServiceLifeTime lifeTime,
        bool replaceIfExist,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth)
    {
        RegisterInterfacesForImplementation(
            services,
            typeof(TImplementation),
            provider => implementationFactory(provider),
            lifeTime,
            replaceIfExist,
            replaceStrategy);
    }

    /// <summary>
    /// Registers the interfaces for the specified implementation type.
    /// </summary>
    /// <param name="services">The IServiceCollection to add the service to.</param>
    /// <param name="implementationType">The type of the implementation to register.</param>
    /// <param name="implementationFactory">The factory that creates the service.</param>
    /// <param name="lifeTime">The lifetime of the service.</param>
    /// <param name="replaceIfExist">A flag indicating whether to replace the service if it already exists.</param>
    /// <param name="replaceStrategy">The strategy to use when replacing the service.</param>
    public static void RegisterInterfacesForImplementation(
        this IServiceCollection services,
        Type implementationType,
        Func<IServiceProvider, object> implementationFactory,
        ServiceLifeTime lifeTime,
        bool replaceIfExist,
        CheckRegisteredStrategy replaceStrategy = CheckRegisteredStrategy.ByBoth)
    {
        if (implementationType.IsGenericType)
        {
            implementationType
                .GetInterfaces()
                .Where(implementationType.MatchGenericArguments)
                .Where(DefaultIgnoreRegisterLibraryInterfacesForImplementationExpr())
                .ForEach(implementationTypeInterface => services.Register(
                    implementationTypeInterface.FixMissingFullNameGenericType(),
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
                .Where(DefaultIgnoreRegisterLibraryInterfacesForImplementationExpr())
                .ForEach(implementationTypeInterface => services.Register(
                    implementationTypeInterface.FixMissingFullNameGenericType(),
                    implementationFactory,
                    lifeTime,
                    replaceIfExist,
                    replaceStrategy));
        }
    }

    /// <summary>
    /// manuallyParams to override using based on param index position. <br />
    /// Example: method = (T1 param1, T2 param2); serviceProvider.ResolveMethodParameters(method, null, customParam2Value) equal to method(serviceProvider.GetService[T1](),customParam2Value)
    /// </summary>
    public static object[] ResolveMethodParameters(this IServiceProvider serviceProvider, Delegate method, object[] manuallyParams)
    {
        var parameters = method.Method.GetParameters()
            .Select((parameterInfo, index) =>
            {
                // If params at the current index is given and not null/default value, use the manually given param
                if (manuallyParams.Any() &&
                    manuallyParams.Length > index &&
                    manuallyParams[index] != null &&
                    manuallyParams[index] != parameterInfo.ParameterType.GetDefaultValue())
                    return manuallyParams[index];

                return parameterInfo.ParameterType.IsClass || parameterInfo.ParameterType.IsInterface
                    ? serviceProvider.GetService(parameterInfo.ParameterType)
                    : parameterInfo.ParameterType.GetDefaultValue();
            })
            .ToArray();
        return parameters;
    }

    public static object[] ResolveMethodParameters(this IServiceScope scope, Delegate method, object[] manuallyParams)
    {
        return scope.ServiceProvider.ResolveMethodParameters(method, manuallyParams);
    }

    /// <summary>
    /// Execute method with params injection. <br />
    /// If method = (T1 param1, T2 param2) then it equivalent to method(serviceProvider.GetService[T1](),serviceProvider.GetService[T2]>()) <br />
    /// manuallyParams to override using based on param index and it's not null. <br />
    /// Example: serviceProvider.ExecuteInject(method, null, customParam2Value) equal to method(serviceProvider.GetService[T1](),customParam2Value)
    /// </summary>
    public static void ExecuteInject(this IServiceProvider serviceProvider, Delegate method, params object[] manuallyParams)
    {
        var parameters = serviceProvider.ResolveMethodParameters(method, manuallyParams);

        method.DynamicInvoke(parameters);
    }

    /// <inheritdoc cref="ExecuteInject(IServiceProvider,Delegate,object[])" />
    public static TResult ExecuteInject<TResult>(this IServiceProvider serviceProvider, Delegate method, params object[] manuallyParams)
    {
        var parameters = serviceProvider.ResolveMethodParameters(method, manuallyParams);

        var result = method.DynamicInvoke(parameters).Cast<TResult>();

        return result;
    }

    /// <inheritdoc cref="ExecuteInject(IServiceProvider,Delegate,object[])" />
    public static async Task ExecuteInjectAsync(this IServiceProvider serviceProvider, Delegate method, params object[] manuallyParams)
    {
        var parameters = serviceProvider.ResolveMethodParameters(method, manuallyParams);

        var result = method.DynamicInvoke(parameters);

        if (result.As<Task>() != null) await result.As<Task>();
    }

    /// <inheritdoc cref="ExecuteInject(IServiceProvider,Delegate,object[])" />
    public static async Task<TResult> ExecuteInjectAsync<TResult>(this IServiceProvider serviceProvider, Delegate method, params object[] manuallyParams)
    {
        var parameters = serviceProvider.ResolveMethodParameters(method, manuallyParams);

        var result = method.DynamicInvoke(parameters);

        if (result.As<Task<TResult>>() != null) return await result.As<Task<TResult>>();

        return result.Cast<TResult>();
    }

    /// <inheritdoc cref="ExecuteInject(IServiceProvider,Delegate,object[])" />
    public static void ExecuteInject(this IServiceScope scope, Delegate method, params object[] manuallyParams)
    {
        var parameters = scope.ResolveMethodParameters(method, manuallyParams);

        var result = method.DynamicInvoke(parameters);

        result?.As<Task>()?.Wait();
    }

    /// <inheritdoc cref="ExecuteInject(IServiceProvider,Delegate,object[])" />
    public static TResult ExecuteInject<TResult>(this IServiceScope scope, Delegate method, params object[] manuallyParams)
    {
        var parameters = scope.ResolveMethodParameters(method, manuallyParams);

        var result = method.DynamicInvoke(parameters).Cast<TResult>();

        return result;
    }

    /// <inheritdoc cref="ExecuteInject(IServiceProvider,Delegate,object[])" />
    public static async Task ExecuteInjectAsync(this IServiceScope scope, Delegate method, params object[] manuallyParams)
    {
        var parameters = scope.ResolveMethodParameters(method, manuallyParams);

        var result = method.DynamicInvoke(parameters);

        if (result?.As<Task>() != null) await result.As<Task>();
    }

    /// <inheritdoc cref="ExecuteInject(IServiceProvider,Delegate,object[])" />
    public static async Task<TResult> ExecuteInjectAsync<TResult>(this IServiceScope scope, Delegate method, params object[] manuallyParams)
    {
        method.Method
            .Validate(
                must: methodInfo => methodInfo.GetParameters().Length >= manuallyParams.Length &&
                                    manuallyParams.All((manuallyParam, index) =>
                                        manuallyParam?.GetType() == null || manuallyParam.GetType() == methodInfo.GetParameters()[index].ParameterType),
                errorMsg: "Delegate method parameters signature must start with all parameters correspond to manuallyParams")
            .EnsureValid();

        var parameters = scope.ResolveMethodParameters(method, manuallyParams);

        var result = method.DynamicInvoke(parameters);

        if (result?.As<Task<TResult>>() != null)
        {
            // Declare param result before return to ensure scope is not disposed before task finish execution
            var resultOfTask = await result.As<Task<TResult>>();

            return resultOfTask;
        }

        return result.Cast<TResult>();
    }

    /// <summary>
    /// Run method in new scope. Equivalent to: using(var scope = serviceProvider.CreateTrackedScope()) { method(scope); }
    /// </summary>
    public static void ExecuteScoped(this IServiceProvider serviceProvider, Action<IServiceScope> method)
    {
        using (var scope = serviceProvider.CreateTrackedScope()) method(scope);
    }

    /// <summary>
    /// Run method in new scope in background. Equivalent to: using(var scope = serviceProvider.CreateTrackedScope()) { method(scope); }
    /// </summary>
    public static void ExecuteScopedInBackground(
        this IServiceProvider serviceProvider,
        Action<IServiceScope> method,
        int? retryCount = null,
        Func<int, TimeSpan> retryDelayProvider = null,
        Func<ILogger>? loggerFactory = null)
    {
        var scope = serviceProvider.GetRequiredService<IPlatformRootServiceProvider>().CreateTrackedScope();

        Util.TaskRunner.QueueActionInBackground(
            () =>
            {
                using (scope) method(scope);
            },
            retryCount,
            retryDelayProvider,
            loggerFactory);
    }

    /// <inheritdoc cref="ExecuteScoped" />
    public static TResult ExecuteScoped<TResult>(this IServiceProvider serviceProvider, Func<IServiceScope, TResult> method)
    {
        using (var scope = serviceProvider.CreateTrackedScope())
        {
            var result = method(scope);

            result?.As<Task>()?.Wait();

            return result;
        }
    }

    /// <inheritdoc cref="ExecuteScoped" />
    public static async Task ExecuteScopedAsync(this IServiceProvider serviceProvider, Func<IServiceScope, Task> method)
    {
        var scope = serviceProvider.CreateTrackedScope();

        await Task.Run(async () =>
        {
            using (scope) await method(scope);
        });
    }

    /// <inheritdoc cref="ExecuteScopedInBackground" />
    public static void ExecuteScopedInBackgroundAsync(
        this IServiceProvider serviceProvider,
        Func<IServiceScope, Task> method,
        int? retryCount = null,
        Func<int, TimeSpan>? retryDelayProvider = null,
        Func<ILogger>? loggerFactory = null,
        bool queueLimitLock = false)
    {
        var scope = serviceProvider.GetRequiredService<IPlatformRootServiceProvider>().CreateTrackedScope();

        Util.TaskRunner.QueueActionInBackground(
            async () =>
            {
                using (scope) await method(scope);
            },
            retryCount,
            retryDelayProvider,
            loggerFactory,
            queueLimitLock: queueLimitLock);
    }

    /// <inheritdoc cref="ExecuteScoped" />
    public static async Task<TResult> ExecuteScopedAsync<TResult>(this IServiceProvider serviceProvider, Func<IServiceScope, Task<TResult>> method)
    {
        return await Task.Run(async () =>
        {
            using (var scope = serviceProvider.CreateTrackedScope())
            {
                // get out var result. do not return directly to prevent scope being disposed before function is executed
                var result = await method(scope);

                return result;
            }
        });
    }

    /// <summary>
    /// Execute method with params injection in a new scope. <br />
    /// If method = (T1 param1, T2 param2) then it equivalent to using(var scope = serviceProvider.CreateTrackedScope()) => method(scope.ServiceProvider.GetService[T1](), scope.ServiceProvider.GetService[T2]>())
    /// manuallyParams to override using based on param index and it's not null. <br />
    /// Example: serviceProvider.ExecuteInject(method, null, customParam2Value) equal to method(serviceProvider.GetService[T1](),customParam2Value)
    /// </summary>
    public static void ExecuteInjectScoped(this IServiceProvider serviceProvider, Delegate method, params object[] manuallyParams)
    {
        serviceProvider.ExecuteScoped(scope => scope.ExecuteInject(method, manuallyParams));
    }

    /// <inheritdoc cref="ExecuteInjectScoped" />
    public static TResult ExecuteInjectScoped<TResult>(this IServiceProvider serviceProvider, Delegate method, params object[] manuallyParams)
    {
        return serviceProvider.ExecuteScoped(scope => scope.ExecuteInject<TResult>(method, manuallyParams));
    }

    /// <inheritdoc cref="ExecuteInjectScoped" />
    public static Task ExecuteInjectScopedAsync(this IServiceProvider serviceProvider, Delegate method, params object[] manuallyParams)
    {
        return serviceProvider.ExecuteScopedAsync(scope => scope.ExecuteInjectAsync(method, manuallyParams));
    }

    /// <inheritdoc cref="ExecuteInjectScopedInBackground" />
    public static void ExecuteInjectScopedInBackgroundAsync(
        this IServiceProvider serviceProvider,
        Delegate method,
        int? retryCount = null,
        Func<int, TimeSpan> retryDelayProvider = null,
        Func<ILogger> loggerFactory = null,
        object[] manuallyParams = null,
        bool queueLimitLock = false)
    {
        manuallyParams ??= [];

        serviceProvider.ExecuteScopedInBackgroundAsync(
            scope => scope.ExecuteInjectAsync(method, manuallyParams),
            retryCount,
            retryDelayProvider,
            loggerFactory,
            queueLimitLock: queueLimitLock);
    }

    /// <inheritdoc cref="ExecuteInjectScopedInBackground" />
    public static void ExecuteInjectScopedInBackground(
        this IServiceProvider serviceProvider,
        Delegate method,
        int? retryCount = null,
        Func<int, TimeSpan> retryDelayProvider = null,
        Func<ILogger> loggerFactory = null,
        object[] manuallyParams = null)
    {
        manuallyParams ??= [];

        serviceProvider.ExecuteScopedInBackground(
            scope => scope.ExecuteInject(method, manuallyParams),
            retryCount,
            retryDelayProvider,
            loggerFactory);
    }

    /// <inheritdoc cref="ExecuteInjectScoped" />
    public static async Task<TResult> ExecuteInjectScopedAsync<TResult>(this IServiceProvider serviceProvider, Delegate method, params object[] manuallyParams)
    {
        // Declare result ensure scope not disposed before async task finished
        var result = await serviceProvider.ExecuteScopedAsync(scope => scope.ExecuteInjectAsync<TResult>(method, manuallyParams));

        return result;
    }

    public static bool CheckHasRegisteredScopedService<TService>(this IServiceProvider serviceProvider)
    {
        return CheckHasRegisteredScopedService(serviceProvider, typeof(TService));
    }

    public static bool CheckHasRegisteredScopedService(this IServiceProvider serviceProvider, Type serviceType)
    {
        using (var scope = serviceProvider.CreateTrackedScope())
        {
            // get out var result. do not return directly to prevent scope being disposed before function is executed
            var result = scope.ServiceProvider.GetService(serviceType) != null;

            return result;
        }
    }

    /// <inheritdoc cref="ExecuteInjectScopedPagingAsync(IServiceProvider,long,int,TimeSpan?,Delegate,object[])" />
    public static async Task ExecuteInjectScopedPagingAsync(
        this IServiceProvider serviceProvider,
        long maxItemCount,
        int pageSize,
        Delegate method,
        params object[] manuallyParams)
    {
        await ExecuteInjectScopedPagingAsync(serviceProvider, maxItemCount, pageSize, null, method, manuallyParams);
    }

    /// <summary>
    /// Attempts to resolve a required service of type <typeparamref name="T"/> from the specified
    /// <see cref="IServiceProvider"/>, returning <c>null</c> if there is exception
    /// </summary>
    /// <typeparam name="T">The type of service to resolve.</typeparam>
    /// <param name="provider">The service provider to resolve from.</param>
    /// <returns>
    /// An instance of <typeparamref name="T"/>, or <c>null</c> if the provider is disposed.
    /// </returns>
    public static T? TryResolveRequiredService<T>(this IServiceProvider provider)
    {
        try
        {
            return (T)provider.GetRequiredService(typeof(T));
        }
        catch (Exception)
        {
            return (T)(object)null;
        }
    }

    /// <summary>
    /// Checks if the specified <see cref="IServiceProvider"/> is a scoped service provider.
    /// </summary>
    /// <param name="provider"></param>
    /// <returns></returns>
    public static bool IsScopedServiceProvider(this IServiceProvider provider)
    {
        return provider.GetRequiredService<IPlatformRootServiceProvider>().IsScopedServiceProvider(provider);
    }

    /// <summary>
    /// Support ExecuteInjectScopedAsync paged. <br />
    /// Method to be executed, the First two parameter MUST BE (int skipCount, int pageSize). <br />
    /// Then the "manuallyParams" for the method. And the last will be the object you want to be dependency injected
    /// </summary>
    /// <param name="maxItemCount">Max items count</param>
    /// <param name="serviceProvider">serviceProvider</param>
    /// <param name="pageSize">Page size to execute.</param>
    /// <param name="pageDelayTime">Delay time between pages</param>
    /// <param name="method">method to be executed. First two parameter MUST BE (int skipCount, int pageSize)</param>
    /// <param name="manuallyParams"></param>
    /// <returns>Task.</returns>
    public static async Task ExecuteInjectScopedPagingAsync(
        this IServiceProvider serviceProvider,
        long maxItemCount,
        int pageSize,
        TimeSpan? pageDelayTime,
        Delegate method,
        params object[] manuallyParams)
    {
        method.Method
            .Validate(
                must: p => p.GetParameters().Length >= 2 && p.GetParameters().Take(2).All(info => info.ParameterType == typeof(int)),
                "Method parameters must start with (int skipCount, int pageSize)")
            .EnsureValid();

        await Util.Pager.ExecutePagingAsync(
            async (skipCount, pageSize) =>
            {
                await serviceProvider.ExecuteInjectScopedAsync(
                    method,
                    manuallyParams: new object[] { skipCount, pageSize }.Concat(manuallyParams).ToArray());
            },
            maxItemCount: maxItemCount,
            pageSize: pageSize,
            pageDelayTime: pageDelayTime);
    }

    /// <summary>
    /// Support ExecuteInjectScopedAsync scrolling paging. <br />
    /// Then the "manuallyParams" for the method. And the last will be the object you want to be dependency injected
    /// </summary>
    public static Task ExecuteInjectScopedScrollingPagingAsync<TItem>(
        this IServiceProvider serviceProvider,
        int maxExecutionCount,
        Delegate method,
        params object[] manuallyParams)
    {
        return Util.Pager.ExecuteScrollingPagingAsync(
            () => serviceProvider.ExecuteInjectScopedAsync<List<TItem>>(method, manuallyParams),
            maxExecutionCount);
    }

    /// <summary>
    /// Support ExecuteInjectScopedAsync scrolling paging. <br />
    /// Then the "manuallyParams" for the method. And the last will be the object you want to be dependency injected
    /// </summary>
    public static Task ExecuteInjectScopedScrollingPagingAsync<TItem>(
        this IServiceProvider serviceProvider,
        int maxExecutionCount,
        TimeSpan? pageDelayTime,
        Delegate method,
        params object[] manuallyParams)
    {
        return Util.Pager.ExecuteScrollingPagingAsync(
            () => serviceProvider.ExecuteInjectScopedAsync<List<TItem>>(method, manuallyParams),
            maxExecutionCount,
            pageDelayTime);
    }

    /// <summary>
    /// Decorates an existing service registration of type <typeparamref name="TService"/> by replacing or stacking
    /// with a decoration factory that wraps the original instance.
    /// </summary>
    /// <typeparam name="TService">The service type to decorate.</typeparam>
    /// <typeparam name="TDecorated">Concrete decorated type.</typeparam>
    /// <param name="services">The service collection to modify.</param>
    /// <param name="decorator">A factory that receives the original <typeparamref name="TService"/> and the current
    /// <see cref="IServiceProvider"/>, and returns the decorated instance.</param>
    /// <param name="replace">
    /// If <c>true</c>, replaces the top-most decorator (or original if first) instead of stacking another layer.
    /// Default is <c>false</c> (stacks decorators).</param>
    /// <returns>The same <paramref name="services"/> for chaining.</returns>
    /// <exception cref="InvalidOperationException">
    /// Thrown if <typeparamref name="TService"/> was not already registered in <paramref name="services"/>.
    /// </exception>
    public static IServiceCollection Decorate<TService, TDecorated>(
        this IServiceCollection services,
        Func<TService, IServiceProvider, TDecorated> decorator,
        bool replace = false)
        where TService : class
        where TDecorated : TService
    {
        var serviceType = typeof(TService);
        // Find the last registration index for TService
        var lastIndex = services
            .Select((d, i) => (Descriptor: d, Index: i))
            .Where(x => x.Descriptor.ServiceType == serviceType)
            .Select(x => x.Index)
            .LastOrDefault(-1);

        if (lastIndex == -1)
        {
            throw new InvalidOperationException(
                $"Service type '{serviceType.FullName}' is not registered and cannot be decorated.");
        }

        // Capture original descriptor if first time
        if (!OriginalBeforeDecoratedDescriptors.ContainsKey(serviceType))
            OriginalBeforeDecoratedDescriptors[serviceType] = services[lastIndex];

        // Determine base descriptor: original or last decorator
        var baseDescriptor = replace
            ? OriginalBeforeDecoratedDescriptors[serviceType]
            : services[lastIndex];

        // Remove the descriptor we intend to replace (original or previous decorator)
        services.RemoveAt(lastIndex);

        // Build factory to resolve base and apply decorator
        object Factory(IServiceProvider sp)
        {
            // Resolve the original/base instance
            TService original;
            if (baseDescriptor.ImplementationFactory != null)
                original = (TService)baseDescriptor.ImplementationFactory(sp)!;
            else if (baseDescriptor.ImplementationInstance != null)
                original = (TService)baseDescriptor.ImplementationInstance;
            else
                original = (TService)ActivatorUtilities.CreateInstance(sp, baseDescriptor.ImplementationType!);

            // Apply decorator
            return decorator(original, sp)!;
        }

        // Re-register decorated descriptor with same lifetime
        var decoratedDescriptor = new ServiceDescriptor(
            serviceType,
            sp => Factory(sp),
            baseDescriptor.Lifetime);

        services.Insert(lastIndex, decoratedDescriptor);
        return services;
    }

    /// <summary>
    /// Gets the parent <see cref="IServiceProvider"/> of the current provider
    /// if it is part of a tracked nested scope stack.
    /// </summary>
    /// <param name="sp">The current <see cref="IServiceProvider"/> instance.</param>
    /// <returns>
    /// The immediate parent <see cref="IServiceProvider"/> if present; otherwise, <c>null</c>.
    /// </returns>
    public static IServiceProvider? ParentScope(this IServiceProvider sp)
    {
        if (ScopedProviderTracker.ChildToParentScopeDictCurrentThread.Value == null) return null;

        return ScopedProviderTracker.CurrentThreadChildToParentScopeDict.GetValueOrDefault(sp, defaultValue: null);
    }

    /// <summary>
    /// Creates a new <see cref="IServiceScope"/>, pushes its <see cref="IServiceProvider"/>
    /// onto the internal AsyncLocal stack, and returns a tracked scope whose Dispose
    /// will pop the stack.
    /// </summary>
    /// <param name="serviceProvider">The current <see cref="IServiceProvider"/> used to resolve the scope factory.</param>
    /// <returns>A new <see cref="IServiceScope"/> that will track its provider until disposed.</returns>
    public static IServiceScope CreateTrackedScope(this IServiceProvider serviceProvider)
    {
        var scope = serviceProvider.GetRequiredService<IServiceScopeFactory>().CreateScope();

        return new TrackedServiceScope(scope, serviceProvider);
    }

    private static class ScopedProviderTracker
    {
        internal static readonly AsyncLocal<ConcurrentDictionary<IServiceProvider, IServiceProvider>> ChildToParentScopeDictCurrentThread = new();

        internal static ConcurrentDictionary<IServiceProvider, IServiceProvider> CurrentThreadChildToParentScopeDict =>
            ChildToParentScopeDictCurrentThread.Value ??= new ConcurrentDictionary<IServiceProvider, IServiceProvider>();

        internal static void Set(IServiceProvider child, IServiceProvider parent)
        {
            CurrentThreadChildToParentScopeDict.Upsert(child, parent);
        }

        internal static void Remove(IServiceProvider sp)
        {
            if (ChildToParentScopeDictCurrentThread.Value == null) return;

            ChildToParentScopeDictCurrentThread.Value.TryRemove(sp, out _);
        }
    }

    /// <summary>
    /// Wraps a real IServiceScope so that Dispose() pops our tracker.
    /// </summary>
    public sealed class TrackedServiceScope : IServiceScope
    {
        private readonly IServiceScope childScope;

        public TrackedServiceScope(IServiceScope childScope, IServiceProvider parentServiceProvider)
        {
            this.childScope = childScope;
            ScopedProviderTracker.Set(childScope.ServiceProvider, parentServiceProvider);
        }

        public IServiceProvider ServiceProvider => childScope.ServiceProvider;

        public void Dispose()
        {
            ScopedProviderTracker.Remove(childScope.ServiceProvider);
            childScope.Dispose();
        }
    }

    public enum CheckRegisteredStrategy
    {
        ByService,
        ByImplementation,
        ByBoth
    }
}
