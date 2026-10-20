using Easy.Platform.Common;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace PlatformExampleApp.Tests.Unit.TestInfrastructure;

/// <summary>
/// Base for example-app module tests. Owns a FRESH <see cref="IServiceCollection" /> per test so no two tests observe
/// each other's registrations, and honors the teardown contract documented on
/// <see cref="PlatformModule.CleanupRegistrationTracking" />.
/// </summary>
/// <remarks>
/// A trimmed copy of the framework test project's module test base: the example-app tests must not reference the
/// framework test project, and they need only the host/module helpers, not the framework's module test doubles.
/// <para>
/// The cleanup is required: <c>PlatformModule</c> tracks executed per-assembly registrations in a process-wide static
/// dictionary keyed by <see cref="IServiceCollection" />. Skipping it leaks the collection for the test process and lets
/// one test's "already registered this assembly" bookkeeping suppress a later test's registration.
/// </para>
/// </remarks>
public abstract class ExampleAppModuleTestBase : IDisposable
{
    private readonly List<IServiceCollection> trackedServiceCollections = [];
    private readonly List<ServiceProvider> trackedServiceProviders = [];
    private bool disposed;

    /// <summary>
    /// Builds an isolated host surface: a fresh service collection with logging and an in-memory configuration.
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
    /// Creates a module instance wired to a (tracked, disposed) service provider built from <paramref name="services" />.
    /// A real provider is used because the module constructor resolves the logger factory eagerly.
    /// </summary>
    protected TModule CreateModule<TModule>(IServiceCollection services, IConfiguration configuration)
        where TModule : PlatformModule
    {
        var serviceProvider = services.BuildServiceProvider();
        trackedServiceProviders.Add(serviceProvider);

        return (TModule)Activator.CreateInstance(typeof(TModule), serviceProvider, configuration)!;
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
            trackedServiceProviders.ForEach(provider => provider.Dispose());
        }

        disposed = true;
    }
}
