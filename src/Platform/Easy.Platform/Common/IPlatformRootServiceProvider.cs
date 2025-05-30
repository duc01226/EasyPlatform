#region

using System.Collections.Concurrent;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.DependencyInjection;

#endregion

namespace Easy.Platform.Common;

/// <summary>
/// The service provider scope is Singleton, which is global and not scoped, never be disposed unless the application is stopped
/// </summary>
public interface IPlatformRootServiceProvider : IServiceProvider
{
    /// <summary>
    /// Check serviceType is registered in services collection
    /// </summary>
    public bool IsServiceTypeRegistered(Type serviceType);

    /// <summary>
    /// Count of all implementation types is assignable to assignableToServiceType registered
    /// </summary>
    public int ImplementationAssignableToServiceTypeRegisteredCount(Type assignableToServiceType);

    /// <summary>
    /// Get type by type name in registered platform module assemblies
    /// </summary>
    public Type GetRegisteredPlatformModuleAssembliesType(string typeName);

    public bool IsScopedServiceProvider(IServiceProvider serviceProvider);

    /// <summary>
    /// Get a new scoped service provider from root provider that never be disposed until application is stopped
    /// </summary>
    public IServiceProvider GetScopedRootServiceProvider();
}

public class PlatformRootServiceProvider : IPlatformRootServiceProvider
{
    private readonly ConcurrentDictionary<Type, int> assignableToServiceTypeRegisteredCountDict = new();
    private readonly ConcurrentDictionary<string, Type> registeredPlatformModuleAssembliesTypeByNameCachedDict = new();
    private readonly Lazy<HashSet<Type>> registeredServiceTypesLazy;
    private readonly IServiceScope rootScopedServiceScope;
    private readonly IServiceProvider rootServiceProvider;
    private readonly IServiceCollection services;

    public PlatformRootServiceProvider(IServiceProvider serviceProvider, IServiceCollection services)
    {
        rootServiceProvider = serviceProvider;
        this.services = services;
        registeredServiceTypesLazy = new Lazy<HashSet<Type>>(() => services.Select(p => p.ServiceType).ToHashSet());
        rootScopedServiceScope = rootServiceProvider.CreateScope();
    }

    public object GetService(Type serviceType)
    {
        return rootServiceProvider?.GetService(serviceType);
    }

    public bool IsServiceTypeRegistered(Type serviceType)
    {
        return registeredServiceTypesLazy.Value.Contains(serviceType);
    }

    public int ImplementationAssignableToServiceTypeRegisteredCount(Type assignableToServiceType)
    {
        return assignableToServiceTypeRegisteredCountDict.GetOrAdd(
            assignableToServiceType,
            assignableToServiceType => InternalCheckImplementationAssignableToServiceTypeRegisteredCount(assignableToServiceType));
    }

    public Type GetRegisteredPlatformModuleAssembliesType(string typeName)
    {
        return registeredPlatformModuleAssembliesTypeByNameCachedDict.GetOrAdd(
            typeName,
            typeName => InternalGetRegisteredPlatformModuleAssembliesType(typeName));
    }

    public bool IsScopedServiceProvider(IServiceProvider serviceProvider)
    {
        return !ReferenceEquals(serviceProvider, rootServiceProvider);
    }

    public IServiceProvider GetScopedRootServiceProvider()
    {
        return rootScopedServiceScope.ServiceProvider;
    }

    private Type InternalGetRegisteredPlatformModuleAssembliesType(string typeName)
    {
        var scanAssemblies = rootServiceProvider.GetServices<PlatformModule>()
            .SelectMany(p => p.GetAssembliesForServiceScanning())
            .ConcatSingle(typeof(PlatformModule).Assembly)
            .ToList();

        var scannedResultType = scanAssemblies
            .Select(p => p.GetType(typeName))
            .FirstOrDefault(p => p != null)
            .Pipe(scannedResultType => scannedResultType ?? Type.GetType(typeName, throwOnError: false));
        return scannedResultType;
    }

    private int InternalCheckImplementationAssignableToServiceTypeRegisteredCount(Type assignableToServiceType)
    {
        return services.Count(sd =>
        {
            var typeToCheck = sd.ImplementationType ?? sd.ImplementationFactory?.Method.ReturnType;

            return typeToCheck?.IsClass == true &&
                   (typeToCheck?.IsAssignableTo(assignableToServiceType) == true ||
                    typeToCheck?.IsAssignableToGenericType(assignableToServiceType) == true);
        });
    }
}
