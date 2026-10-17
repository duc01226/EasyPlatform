using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using PlatformExampleApp.ModularMonolith.Api;
using PlatformExampleApp.TaskManagement.Application;
using PlatformExampleApp.TaskManagement.Persistence.Mongo;

namespace PlatformExampleApp.IntegrationTests.WebAppFactory;

/// <summary>
/// Boots the real composite ASP.NET host against a unique local Mongo database namespace.
/// The test project's local Docker configuration supplies the connection endpoint; this factory only overrides
/// database names and module-owned settings so repeated runs never reuse business data.
/// </summary>
public sealed class ModularMonolithWebApplicationFactory : WebApplicationFactory<ModularMonolithApiAspNetCoreModule>
{
    public ModularMonolithWebApplicationFactory(
        string runId,
        string mongoDatabaseName,
        string taskManagementDatabaseName,
        TaskManagementPersistenceMode taskManagementPersistenceMode)
    {
        RunId = runId;
        MongoDatabaseName = mongoDatabaseName;
        TaskManagementDatabaseName = taskManagementDatabaseName;
        TaskManagementPersistenceMode = taskManagementPersistenceMode;
    }

    public string RunId { get; }

    public string MongoDatabaseName { get; }

    public string MultiDbDemoDatabaseName => $"BravoSuite_{RunId}_TextSnippetMultiDbDemo";

    public string TaskManagementDatabaseName { get; }

    public TaskManagementPersistenceMode TaskManagementPersistenceMode { get; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration((_, configurationBuilder) =>
            configurationBuilder.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    // The connection string is read from the existing local integration-test configuration so
                    // credentials remain configuration-owned and are not copied into test source code.
                    ["MongoDB:ConnectionString"] = ResolveLocalMongoConnectionString(),
                    ["MongoDB:Database"] = MongoDatabaseName,
                    ["MongoDB:MultiDbDemoDbDatabase"] = MultiDbDemoDatabaseName,
                    [TaskManagementMongoPersistenceModule.TASK_MANAGEMENT_MONGO_CONNECTION_STRING_CONFIGURATION_KEY] = ResolveLocalMongoConnectionString(),
                    [TaskManagementMongoPersistenceModule.TASK_MANAGEMENT_MONGO_DATABASE_CONFIGURATION_KEY] = TaskManagementDatabaseName,
                    [TaskManagementApplicationSettings.PERSISTENCE_MODE_CONFIGURATION_KEY] = TaskManagementPersistenceMode.ToString(),
                    [TaskManagementApplicationSettings.MESSAGING_ENABLED_CONFIGURATION_KEY] = bool.TrueString,
                    [TaskManagementApplicationSettings.MESSAGING_INBOX_ENABLED_CONFIGURATION_KEY] = bool.TrueString,
                    [TaskManagementApplicationSettings.MESSAGING_OUTBOX_ENABLED_CONFIGURATION_KEY] = bool.TrueString,
                    [ModularMonolithApiAspNetCoreModule.MODULAR_MONOLITH_AUTOMATIC_DATA_SEEDING_ON_INIT_CONFIGURATION_KEY] = bool.FalseString
                }));

        // Prevent Kestrel port binding; the test server handles requests in memory.
        builder.UseUrls();
    }

    private static string ResolveLocalMongoConnectionString()
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
            .Build();

        return configuration["MongoDB:ConnectionString"]
               ?? throw new InvalidOperationException(
                   "The integration-test appsettings.json must provide MongoDB:ConnectionString for the local host.");
    }
}

/// <summary>
/// Shares one started composite host for the runtime tests and serializes the suite with other host-level tests.
/// Database names are unique per fixture instance; no destructive cleanup is required between test runs.
/// </summary>
public sealed class ModularMonolithIntegrationTestFixture : IAsyncLifetime, IDisposable
{
    private ModularMonolithWebApplicationFactory? sharedFactory;

    public string RunId { get; } = IntegrationTestHelper.UniqueId();

    public ModularMonolithWebApplicationFactory SharedFactory =>
        sharedFactory ?? throw new InvalidOperationException("The modular-monolith fixture has not been initialized.");

    public HttpClient CreateSharedClient()
    {
        return SharedFactory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }

    public Task InitializeAsync()
    {
        sharedFactory = new ModularMonolithWebApplicationFactory(
            RunId,
            $"BravoSuite_Modular_{RunId}_Shared",
            $"BravoSuite_Modular_{RunId}_Shared",
            TaskManagementPersistenceMode.Shared);

        // Force host startup before any test method runs, including module initialization, migrations, seeders,
        // controller discovery, and the keyed worker registrations.
        _ = sharedFactory.Services;

        return Task.CompletedTask;
    }

    public Task DisposeAsync()
    {
        Dispose();
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        sharedFactory?.Dispose();
        sharedFactory = null;
    }
}

[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class ModularMonolithIntegrationTestCollection : ICollectionFixture<ModularMonolithIntegrationTestFixture>
{
    public const string Name = "PlatformExampleApp Modular Monolith Tests";
}
