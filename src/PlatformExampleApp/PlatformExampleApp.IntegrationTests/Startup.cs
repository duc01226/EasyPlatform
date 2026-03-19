#region

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

#endregion

namespace PlatformExampleApp.IntegrationTests;

/// <summary>
/// No-op Startup required by Xunit.DependencyInjection (transitive from Easy.Platform.AutomationTest).
/// Integration tests use the ICollectionFixture/PlatformServiceIntegrationTestFixture pattern instead.
/// This class satisfies the [assembly: StartupType] requirement without registering any services.
/// </summary>
public class Startup
{
    public void ConfigureHost(IHostBuilder hostBuilder) { }

    public void ConfigureServices(IServiceCollection services) { }
}
