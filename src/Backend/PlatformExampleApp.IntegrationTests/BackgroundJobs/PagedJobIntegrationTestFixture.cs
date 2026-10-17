using Easy.Platform.AutomationTest.IntegrationTests;
using Microsoft.Extensions.Configuration;

namespace PlatformExampleApp.IntegrationTests.BackgroundJobs;

/// <summary>
/// Owns a separate module and database so an explicit page cannot select accumulated rows from other suites.
/// Database names remain additive; teardown never resets shared infrastructure.
/// </summary>
public sealed class PagedJobIntegrationTestFixture
    : PlatformServiceIntegrationTestFixture<PagedJobIntegrationTestModule>
{
    public override string FallbackAspCoreEnvironmentValue() => "Development";

    protected override IConfiguration BuildConfiguration()
    {
        // Called by the base constructor: use locals rather than derived instance fields.
        var databaseName = $"BravoSuite_Paged_{IntegrationTestHelper.UniqueId()}";
        return new ConfigurationBuilder()
            .AddConfiguration(base.BuildConfiguration())
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["MongoDB:Database"] = databaseName,
                ["MongoDB:MultiDbDemoDbDatabase"] = $"{databaseName}_MultiDbDemo"
            })
            .Build();
    }
}

public sealed class PagedJobIntegrationTestModule(IServiceProvider serviceProvider, IConfiguration configuration)
    : TextSnippetIntegrationTestAspNetCoreModule(serviceProvider, configuration)
{
}

[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class PagedJobIntegrationTestCollection : ICollectionFixture<PagedJobIntegrationTestFixture>
{
    public const string Name = "TextSnippet Paged Job Integration Tests";
}
