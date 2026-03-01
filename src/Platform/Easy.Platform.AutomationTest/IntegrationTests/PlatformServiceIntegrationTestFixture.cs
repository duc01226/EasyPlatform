#region

using Easy.Platform.Common;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using Xunit;

#endregion

namespace Easy.Platform.AutomationTest.IntegrationTests;

/// <summary>
/// xUnit collection fixture for microservice integration tests.
/// Manages the lifecycle of service provider setup and teardown across test classes.
/// </summary>
/// <typeparam name="TServiceModule">The ASP.NET Core module type for the microservice</typeparam>
public abstract class PlatformServiceIntegrationTestFixture<TServiceModule> : IAsyncLifetime, IDisposable
    where TServiceModule : PlatformModule
{
    private bool disposed;

    public PlatformServiceIntegrationTestFixture()
    {
        Configuration = BuildConfiguration();
        Log.Logger = new LoggerConfiguration().WriteTo.Console().CreateLogger();

        PlatformServiceIntegrationTestBase<TServiceModule>.SetupIntegrationTest(
            Configuration,
            GetType().Assembly,
            FallbackAspCoreEnvironmentValue(),
            additionalServices => ConfigureAdditionalServices(additionalServices));
    }

    public IConfiguration Configuration { get; }

    /// <summary>
    /// The DI service provider for this service module.
    /// Delegates to the static provider on PlatformServiceIntegrationTestBase.
    /// </summary>
    public IServiceProvider ServiceProvider
        => PlatformServiceIntegrationTestBase<TServiceModule>.ServiceProvider;

    /// <summary>
    /// Builds the IConfiguration for this fixture. Override in derived classes
    /// to load service-specific config files (e.g., for cross-service test projects
    /// where multiple fixtures coexist in the same process).
    /// Default: loads appsettings.json + appsettings.{Environment}.json from working directory.
    ///
    /// WARNING: Called from base constructor. Override implementations MUST NOT
    /// access derived-class instance fields (they are uninitialized at this point).
    /// Only use static methods, parameters, and local variables.
    /// Safe: ConfigurationBuilder, Directory.GetCurrentDirectory(), string literals.
    /// Unsafe: any 'this.field' or 'this.Property' from the derived class.
    /// </summary>
    protected virtual IConfiguration BuildConfiguration()
    {
        return PlatformConfigurationBuilder.GetConfigurationBuilder().Build();
    }

    /// <summary>
    /// xUnit IAsyncLifetime: called after constructor, before any test in the collection executes.
    /// Initializes platform modules (RabbitMQ, persistence, caching, etc.) then seeds data.
    ///
    /// Module initialization mirrors production startup (Program.cs → InitPlatformAspNetCoreModule):
    ///   scope.ServiceProvider.GetRequiredService&lt;TModule&gt;().InitializeAsync()
    /// This cascades to all dependent modules via InitializeDependentModulesAsync().
    ///
    /// Without this, infrastructure modules are registered but not started. For example,
    /// PlatformRabbitMqMessageBusProducer.PublishMessageToQueue() waits up to 60s for
    /// InitializerService.IsStarted (PlatformRabbitMqMessageBusProducer.cs:156-160),
    /// then falls back to outbox DB instead of sending directly to RabbitMQ.
    /// </summary>
    public virtual async Task InitializeAsync()
    {
        var serviceProvider = PlatformServiceIntegrationTestBase<TServiceModule>.ServiceProvider;

        // Initialize all platform modules (same as production's InitPlatformAspNetCoreModule).
        // currentApp: null because integration tests have no ASP.NET Core pipeline.
        using (var scope = serviceProvider.CreateScope())
        {
            var module = scope.ServiceProvider.GetRequiredService<TServiceModule>();
            await module.InitializeAsync();
        }

        await SeedDataAsync(serviceProvider);
    }

    /// <summary>
    /// Override to seed foundational reference data after DI initialization.
    /// Called once per collection before any test executes. Use idempotent patterns
    /// (FirstOrDefault + create-if-missing) since data accumulates across test runs.
    /// </summary>
    protected virtual Task SeedDataAsync(IServiceProvider serviceProvider)
        => Task.CompletedTask;

    /// <summary>
    /// xUnit IAsyncLifetime: called after all tests in the collection complete.
    /// </summary>
    public virtual Task DisposeAsync() => Task.CompletedTask;

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    public abstract string FallbackAspCoreEnvironmentValue();

    protected virtual void Dispose(bool disposing)
    {
        if (!disposed)
        {
            if (disposing)
            {
                PlatformServiceIntegrationTestBase<TServiceModule>.TeardownIntegrationTest();
                Log.CloseAndFlush();
            }

            disposed = true;
        }
    }

    /// <summary>
    /// Configure additional services. Override to add test-specific services.
    /// </summary>
    protected virtual void ConfigureAdditionalServices(IServiceCollection services)
    {
        // Override in derived classes to add test-specific services
    }
}
