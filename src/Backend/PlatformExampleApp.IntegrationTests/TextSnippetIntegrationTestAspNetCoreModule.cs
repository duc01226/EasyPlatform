using Microsoft.Extensions.Configuration;
using PlatformExampleApp.TextSnippet.Api;

namespace PlatformExampleApp.IntegrationTests;

/// <summary>
/// Test-specific module that disables automatic data seeding during initialization.
/// Prevents slow/hanging seed operations in integration test context.
/// </summary>
public class TextSnippetIntegrationTestAspNetCoreModule : TextSnippetApiAspNetCoreModule
{
    public TextSnippetIntegrationTestAspNetCoreModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    protected override bool EnableAutomaticDataSeedingOnInit => false;
}
