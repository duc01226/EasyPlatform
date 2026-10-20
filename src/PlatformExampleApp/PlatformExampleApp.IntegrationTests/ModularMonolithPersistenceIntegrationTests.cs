using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Easy.Platform.MongoDB;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using PlatformExampleApp.TaskManagement.Application;
using PlatformExampleApp.TaskManagement.Application.Dtos;
using PlatformExampleApp.TaskManagement.Application.UseCaseCommands;
using PlatformExampleApp.TaskManagement.Domain.Entities;
using PlatformExampleApp.TaskManagement.Domain.Repositories;
using PlatformExampleApp.TaskManagement.Persistence.Mongo;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Persistence.Mongo;
using PlatformExampleApp.IntegrationTests.WebAppFactory;

namespace PlatformExampleApp.IntegrationTests;

/// <summary>
/// Isolated-persistence proof. It uses a separate serialized fixture so the scenario never starts two full
/// RabbitMQ-backed composite hosts in the same process; the assertion remains about module-owned business data.
/// </summary>
[Collection(ModularMonolithIsolatedIntegrationTestCollection.Name)]
[Trait("Category", "ModularMonolith")]
public sealed class ModularMonolithPersistenceIntegrationTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = null,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly ModularMonolithIsolatedIntegrationTestFixture fixture;

    public ModularMonolithPersistenceIntegrationTests(ModularMonolithIsolatedIntegrationTestFixture fixture)
    {
        this.fixture = fixture;
    }

    /// <summary>
    /// TC-PERSIST-201: isolated module-owned contexts use distinct databases and an entity written to one database
    /// is not visible through the other module's physical database.
    /// </summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-PERSIST-201")]
    public async Task IsolatedPersistence_SeparatesModuleDatabasesAndBusinessState()
    {
        var factory = fixture.Factory;
        factory.MongoDatabaseName.Should().NotBe(factory.TaskManagementDatabaseName);

        string textSnippetDatabaseName;
        string taskManagementDatabaseName;
        string taskManagementCollectionName;

        using (var inspectionScope = factory.Services.CreateScope())
        {
            var textSnippetDbContext = inspectionScope.ServiceProvider.GetRequiredService<TextSnippetDbContext>();
            var taskManagementDbContext = inspectionScope.ServiceProvider.GetRequiredService<TaskManagementDbContext>();

            textSnippetDatabaseName = textSnippetDbContext.Database.DatabaseNamespace.DatabaseName;
            taskManagementDatabaseName = taskManagementDbContext.Database.DatabaseNamespace.DatabaseName;
            taskManagementCollectionName = taskManagementDbContext.GetCollectionName<TaskBoardItemEntity>();

            textSnippetDatabaseName.Should().Be(factory.MongoDatabaseName);
            taskManagementDatabaseName.Should().Be(factory.TaskManagementDatabaseName);
        }

        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var snippet = await SaveTextSnippetAsync(client, IntegrationTestHelper.UniqueName("IsolatedSnippet"));
        var task = await SaveTaskAsync(client, IntegrationTestHelper.UniqueName("IsolatedTask"));

        await IntegrationTestHelper.WaitUntilAsync(
            async () =>
            {
                using var assertionScope = factory.Services.CreateScope();
                var snippetRepository = assertionScope.ServiceProvider
                    .GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
                var taskRepository = assertionScope.ServiceProvider
                    .GetRequiredService<ITaskManagementRootRepository<TaskBoardItemEntity>>();

                return await snippetRepository.FirstOrDefaultAsync(item => item.Id == snippet.SavedData.Id) is not null &&
                       await taskRepository.FirstOrDefaultAsync(item => item.Id == task.SavedItem.Id) is not null;
            },
            timeoutMessage: "Isolated module-owned business state was not visible in its owning databases.");

        // Read the TaskManagement business collection from TextSnippet's physical database. This is intentionally a
        // provider-level negative check in the test only; production code still crosses module boundaries via ports/events.
        using var databaseScope = factory.Services.CreateScope();
        var textSnippetMongoClient = databaseScope.ServiceProvider
            .GetRequiredService<IPlatformMongoClient<TextSnippetDbContext>>()
            .MongoClient;
        var taskCollectionInTextSnippetDatabase = textSnippetMongoClient
            .GetDatabase(textSnippetDatabaseName)
            .GetCollection<TaskBoardItemEntity>(taskManagementCollectionName);

        (await taskCollectionInTextSnippetDatabase
                .Find(item => item.Id == task.SavedItem.Id)
                .FirstOrDefaultAsync())
            .Should()
            .BeNull("an isolated TaskManagement entity must not be visible in TextSnippet's database");
    }

    private static async Task<SaveSnippetTextCommandResult> SaveTextSnippetAsync(
        HttpClient client,
        string snippetText)
    {
        var response = await client.PostAsJsonAsync(
            "/api/TextSnippet/save",
            new SaveSnippetTextCommand
            {
                Data = new TextSnippetEntityDto
                {
                    SnippetText = snippetText,
                    FullText = $"Full text for {snippetText}"
                }
            },
            JsonOptions);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<SaveSnippetTextCommandResult>(JsonOptions);
        result.Should().NotBeNull();
        result!.SavedData.Should().NotBeNull();
        return result;
    }

    private static async Task<SaveTaskBoardItemCommandResult> SaveTaskAsync(HttpClient client, string title)
    {
        var response = await client.PostAsJsonAsync(
            "/api/task-board",
            new SaveTaskBoardItemCommand
            {
                Item = new TaskBoardItemDto
                {
                    Title = title,
                    Status = TaskBoardItemStatus.Open
                }
            },
            JsonOptions);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<SaveTaskBoardItemCommandResult>(JsonOptions);
        result.Should().NotBeNull();
        result!.SavedItem.Should().NotBeNull();
        return result;
    }
}

/// <summary>
/// Owns one isolated composite host for the persistence scenario. Keeping this fixture separate from the shared-mode
/// collection prevents two transport worker graphs from competing for the same external queues in one test process.
/// </summary>
public sealed class ModularMonolithIsolatedIntegrationTestFixture : IAsyncLifetime, IDisposable
{
    public string RunId { get; } = IntegrationTestHelper.UniqueId();

    public ModularMonolithWebApplicationFactory Factory { get; private set; } = null!;

    public Task InitializeAsync()
    {
        Factory = new ModularMonolithWebApplicationFactory(
            RunId,
            $"BravoSuite_Modular_{RunId}_TextSnippet",
            $"BravoSuite_Modular_{RunId}_TaskManagement",
            TaskManagementPersistenceMode.Isolated);

        _ = Factory.Services;
        return Task.CompletedTask;
    }

    public Task DisposeAsync()
    {
        Dispose();
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        Factory?.Dispose();
        Factory = null!;
    }
}

[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class ModularMonolithIsolatedIntegrationTestCollection
    : ICollectionFixture<ModularMonolithIsolatedIntegrationTestFixture>
{
    public const string Name = "PlatformExampleApp Modular Monolith Isolated Persistence Tests";
}
