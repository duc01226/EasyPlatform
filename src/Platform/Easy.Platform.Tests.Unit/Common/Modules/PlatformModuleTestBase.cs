using Easy.Platform.Common;
using Easy.Platform.Tests.Unit.Base;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Tests.Unit.Common.Modules;

/// <summary>
/// Base for platform-module tests. Owns a FRESH <see cref="IServiceCollection" /> per test so that no
/// two tests can observe each other's registrations, and honors the teardown contract documented on
/// <see cref="PlatformModule.CleanupRegistrationTracking" />.
/// <para>
/// That cleanup is not optional hygiene: <c>PlatformModule</c> tracks executed per-assembly
/// registrations in a PROCESS-WIDE static dictionary keyed by <see cref="IServiceCollection" />.
/// Skipping the removal both leaks the collection for the lifetime of the test process AND lets one
/// test's "already registered this assembly" bookkeeping suppress a later test's registration.
/// </para>
/// </summary>
public abstract class PlatformModuleTestBase : PlatformUnitTestBase, IDisposable
{
    private readonly List<IServiceCollection> trackedServiceCollections = [];
    private readonly List<ServiceProvider> trackedServiceProviders = [];
    private bool disposed;

    /// <summary>
    /// Builds an isolated host surface: a fresh service collection with logging and an empty
    /// in-memory configuration. Every call returns a brand-new collection, so tests never share
    /// mutable registration state.
    /// </summary>
    protected (IServiceCollection Services, IConfiguration Configuration) NewHost(
        Dictionary<string, string?>? configurationValues = null)
    {
        var services = new ServiceCollection();
        services.AddLogging();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configurationValues ?? [])
            .Build();

        services.AddSingleton<IConfiguration>(configuration);

        trackedServiceCollections.Add(services);

        return (services, configuration);
    }

    /// <summary>
    /// Creates a module instance wired to a service provider built from <paramref name="services" />.
    /// A real provider (not a mock) is used because the module constructor resolves
    /// <see cref="Microsoft.Extensions.Logging.ILoggerFactory" /> eagerly to build its logger.
    /// </summary>
    protected TModule CreateModule<TModule>(IServiceCollection services, IConfiguration configuration)
        where TModule : PlatformModule
    {
        return (TModule)CreateModule(typeof(TModule), services, configuration);
    }

    /// <summary>
    /// Non-generic overload for reflection-driven tests that only hold a <see cref="Type" />.
    /// <para>
    /// The <see cref="ServiceProvider" /> built here is tracked and disposed alongside this test's other
    /// tracked collections, so tests that construct modules through this helper do not each need their own
    /// disposal bookkeeping for the throwaway provider.
    /// </para>
    /// </summary>
    protected PlatformModule CreateModule(Type moduleType, IServiceCollection services, IConfiguration configuration)
    {
        var serviceProvider = services.BuildServiceProvider();
        trackedServiceProviders.Add(serviceProvider);

        return (PlatformModule)Activator.CreateInstance(moduleType, serviceProvider, configuration)!;
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (disposed) return;

        if (disposing)
        {
            trackedServiceCollections.ForEach(PlatformModule.CleanupRegistrationTracking);
            trackedServiceCollections.ForEach(ObservingTestPlatformModule.ClearObservationsFor);
            trackedServiceCollections.ForEach(ModuleInitializationOrderRecorder.ClearFor);
            trackedServiceProviders.ForEach(provider => provider.Dispose());
        }

        disposed = true;
    }
}
