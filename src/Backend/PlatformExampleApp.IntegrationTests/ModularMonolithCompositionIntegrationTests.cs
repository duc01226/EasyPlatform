using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.Producers;
using Easy.Platform.Application.MessageBus.Store;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TaskManagement.Application;
using PlatformExampleApp.TaskManagement.Application.Dtos;
using PlatformExampleApp.TaskManagement.Application.UseCaseCommands;
using PlatformExampleApp.TaskManagement.Application.UseCaseQueries;
using PlatformExampleApp.TaskManagement.Contracts.Messages;
using PlatformExampleApp.TaskManagement.Domain.Entities;
using PlatformExampleApp.TaskManagement.Domain.Repositories;
using PlatformExampleApp.TaskManagement.Persistence.Mongo;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.MessageBus.FreeFormatMessages;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Persistence.Mongo;

namespace PlatformExampleApp.IntegrationTests;

/// <summary>
/// Runtime proof for the modular-monolith composition contract. These tests intentionally use the real HTTP host,
/// Mongo contexts, CQRS handlers, outbox/inbox infrastructure, and keyed message-bus producer. Assertions target
/// module-owned business state and composition metadata; broker bookkeeping is never treated as the outcome.
/// </summary>
[Collection(WebAppFactory.ModularMonolithIntegrationTestCollection.Name)]
[Trait("Category", "ModularMonolith")]
public sealed class ModularMonolithCompositionIntegrationTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = null,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly WebAppFactory.ModularMonolithIntegrationTestFixture fixture;

    public ModularMonolithCompositionIntegrationTests(
        WebAppFactory.ModularMonolithIntegrationTestFixture fixture)
    {
        this.fixture = fixture;
    }

    /// <summary>
    /// TC-MOD-201: one TestServer exposes both application modules through their distinct controller assemblies, and
    /// each module's save lands in its own persisted business state.
    /// </summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-MOD-201")]
    public async Task CompositeHost_ExposesTextSnippetAndTaskManagementRoutes()
    {
        using var client = fixture.CreateSharedClient();
        var services = fixture.SharedFactory.Services;
        var snippetText = IntegrationTestHelper.UniqueName("ModularSnippet");
        var taskTitle = IntegrationTestHelper.UniqueName("ModularTask");

        var snippetResult = await SaveTextSnippetAsync(client, snippetText);
        var taskResult = await SaveTaskAsync(client, taskTitle);

        snippetResult.SavedData.Id.Should().NotBeNullOrWhiteSpace();
        taskResult.SavedItem.Id.Should().NotBeNullOrWhiteSpace();
        taskResult.SavedItem.Title.Should().Be(taskTitle);

        await WaitForDatabaseAssertionAsync(
            services,
            async serviceProvider =>
            {
                var snippetRepository = serviceProvider.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
                var savedSnippet = await snippetRepository.FirstOrDefaultAsync(snippet => snippet.Id == snippetResult.SavedData.Id);

                savedSnippet.Should().NotBeNull();
                savedSnippet!.SnippetText.Should().Be(snippetText);
                savedSnippet.FullText.Should().Be($"Full text for {snippetText}");
            },
            "TextSnippet save did not persist the submitted snippet fields through the composite host.");

        var boardItem = await ReadTaskBoardItemAsync(client, taskResult.SavedItem.Id, item => item.Title == taskTitle);

        boardItem.Title.Should().Be(taskTitle);
        boardItem.Status.Should().Be(TaskBoardItemStatus.Open);
    }

    /// <summary>
    /// TC-MOD-202: the TextSnippet keyed lane is routable through the composite host's keyed producer, while a key no
    /// module bound is rejected instead of silently falling back to another module's store.
    /// </summary>
    /// <remarks>
    /// Every TextSnippet consumer on the keyed lane (entity-event, command-event, free-format and transfer demos) only
    /// logs, and the two request/ask demo consumers throw NotImplementedException. No TextSnippet consumer produces a
    /// business outcome that could be asserted after delivery, and asserting inbox rows would test shared broker
    /// bookkeeping rather than the module. The best available observable outcomes are the TextSnippet state persisted
    /// through the composed context (TC-MOD-201) and the keyed route resolution asserted here.
    /// </remarks>
    [Fact]
    [Trait("TechnicalSpec", "TC-MOD-202")]
    public async Task CompositeHost_TextSnippetKeyedLane_RoutesOnlyThroughItsBoundStore()
    {
        var services = fixture.SharedFactory.Services;
        var trackingId = IntegrationTestHelper.UniqueId();

        using var scope = services.CreateScope();
        var producer = scope.ServiceProvider.GetRequiredService<IPlatformKeyedApplicationBusMessageProducer>();

        var sentMessage = await producer.SendAsync(
            new PlatformMessageBusStoreKey("TextSnippet"),
            new DemoSendFreeFormatEventBusMessage
            {
                TrackingId = trackingId,
                CreatedUtcDate = DateTime.UtcNow,
                ProduceFrom = nameof(ModularMonolithCompositionIntegrationTests),
                RequestContext = new Dictionary<string, object>(),
                Property1 = IntegrationTestHelper.UniqueName("KeyedLane"),
                Property2 = 202
            },
            autoSaveOutboxMessage: false);

        sentMessage.TrackingId.Should().Be(trackingId);

        var unboundKeySend = () => producer.SendAsync(
            new PlatformMessageBusStoreKey(IntegrationTestHelper.UniqueName("UnboundStore")),
            new DemoSendFreeFormatEventBusMessage { TrackingId = IntegrationTestHelper.UniqueId() },
            autoSaveOutboxMessage: false);

        await unboundKeySend.Should().ThrowAsync<Exception>().WithMessage("*No message-bus store is bound*");
    }

    /// <summary>
    /// TC-EVT-202: a status change through the real HTTP command path updates the aggregate status, rotates its
    /// concurrency token, and converges the projection (status and token) on the aggregate. A stale token is rejected.
    /// </summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-EVT-202")]
    public async Task TaskStatusChange_RotatesTokenAndConvergesProjection()
    {
        using var client = fixture.CreateSharedClient();
        var services = fixture.SharedFactory.Services;
        var title = IntegrationTestHelper.UniqueName("StatusTask");

        var created = await SaveTaskAsync(client, title);
        var taskId = created.SavedItem.Id;
        var createdToken = created.SavedItem.ConcurrencyUpdateToken;

        createdToken.Should().NotBeNullOrWhiteSpace();

        // The list read model carries the token a client needs for the update (no separate aggregate read).
        var listedItem = await ReadTaskBoardItemAsync(client, taskId, item => item.ConcurrencyUpdateToken == createdToken);

        var updateResponse = await PostTaskAsync(
            client,
            new TaskBoardItemDto
            {
                Id = taskId,
                Title = title,
                Status = TaskBoardItemStatus.InProgress,
                ConcurrencyUpdateToken = listedItem.ConcurrencyUpdateToken
            });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        string? rotatedToken = null;

        await WaitForDatabaseAssertionAsync(
            services,
            async serviceProvider =>
            {
                var taskRepository = serviceProvider.GetRequiredService<ITaskManagementRootRepository<TaskBoardItemEntity>>();
                var projectionRepository =
                    serviceProvider.GetRequiredService<ITaskManagementRepository<TaskBoardItemProjectionEntity>>();

                var task = await taskRepository.FirstOrDefaultAsync(item => item.Id == taskId);
                var projections = await projectionRepository.GetAllAsync(projection => projection.TaskId == taskId);

                task.Should().NotBeNull();
                task!.Status.Should().Be(TaskBoardItemStatus.InProgress);
                task.ConcurrencyUpdateToken.Should().NotBeNullOrWhiteSpace().And.NotBe(createdToken);

                projections.Should().ContainSingle();
                projections[0].Status.Should().Be(TaskBoardItemStatus.InProgress);
                projections[0].Title.Should().Be(title);
                projections[0].TaskConcurrencyUpdateToken.Should().Be(task.ConcurrencyUpdateToken);
                projections[0].ConcurrencyUpdateToken.Should().NotBeNullOrWhiteSpace();

                rotatedToken = task.ConcurrencyUpdateToken;
            },
            "Task status change did not converge on the aggregate and its projection.");

        var staleResponse = await PostTaskAsync(
            client,
            new TaskBoardItemDto
            {
                Id = taskId,
                Title = title,
                Status = TaskBoardItemStatus.Completed,
                ConcurrencyUpdateToken = createdToken
            });

        staleResponse.IsSuccessStatusCode.Should().BeFalse("an update carrying the pre-change token must be rejected");

        await WaitForDatabaseAssertionAsync(
            services,
            async serviceProvider =>
            {
                var taskRepository = serviceProvider.GetRequiredService<ITaskManagementRootRepository<TaskBoardItemEntity>>();
                var task = await taskRepository.FirstOrDefaultAsync(item => item.Id == taskId);

                task.Should().NotBeNull();
                task!.Status.Should().Be(TaskBoardItemStatus.InProgress);
                task.ConcurrencyUpdateToken.Should().Be(rotatedToken);
            },
            "A stale-token update changed the aggregate.");
    }

    /// <summary>
    /// TC-LIFE-201: module-owned initialization is repeat-safe and the production seeder converges on stable IDs.
    /// </summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-LIFE-201")]
    public async Task TaskManagementModule_RepeatedInitializationAndSeeding_ConvergesBusinessState()
    {
        var services = fixture.SharedFactory.Services;
        var applicationModule = services.GetRequiredService<TaskManagementApplicationModule>();

        // InitializeAsync is intentionally called twice after the composite root has initialized the dependency.
        // The platform lifecycle gate must make both calls safe and side-effect-free after the first execution.
        await applicationModule.InitializeAsync();
        await applicationModule.InitializeAsync();

        // Re-run the module's public production seeding pipeline twice. The test does not call InternalSeedData or
        // write repositories directly; it verifies the module-owned CreateIfNotExist path through its real seeder.
        using (var firstScope = services.CreateScope())
            await applicationModule.SeedData(firstScope);
        using (var secondScope = services.CreateScope())
            await applicationModule.SeedData(secondScope);

        var seedIds = new[]
        {
            "taskmanagement-demo-001",
            "taskmanagement-demo-002",
            "taskmanagement-demo-003"
        };

        await WaitForDatabaseAssertionAsync(
            services,
            async serviceProvider =>
            {
                var repository = serviceProvider.GetRequiredService<ITaskManagementRootRepository<TaskBoardItemEntity>>();
                var seededItems = await repository.GetAllAsync(item => seedIds.Contains(item.Id));

                seededItems.Should().HaveCount(3);
                seededItems.Select(item => item.Id).Should().BeEquivalentTo(seedIds);
                seededItems.Should().OnlyContain(item => !string.IsNullOrWhiteSpace(item.Title));
            },
            "TaskManagement seed state did not converge after repeated lifecycle calls.");
    }

    /// <summary>
    /// TC-EVT-201: a keyed transport replay is delivered through the TaskManagement lane and converges on one
    /// projection per task. The assertion is the final projection state, not inbox/outbox status.
    /// </summary>
    /// <remarks>
    /// The first delivery is awaited until its projection exists. The replay then carries a different tracking id and a
    /// changed title for the same task, so a wrongly applied replay (a second row or an overwrite) is visible. The
    /// transport consumer only materializes a missing row, so a correct replay has no positive outcome of its own: a
    /// sentinel task sent after the replay on the same lane bounds the observation window, and the target projection is
    /// then re-checked for its original creation state.
    /// </remarks>
    [Fact]
    [Trait("TechnicalSpec", "TC-EVT-201")]
    public async Task KeyedTaskManagementReplay_ConvergesOnOneBusinessProjection()
    {
        var services = fixture.SharedFactory.Services;
        var taskId = IntegrationTestHelper.UniqueId();
        var sourceEventId = IntegrationTestHelper.UniqueId();
        var title = IntegrationTestHelper.UniqueName("ReplayTask");
        var sentinelTaskId = IntegrationTestHelper.UniqueId();
        var sentinelTitle = IntegrationTestHelper.UniqueName("ReplaySentinel");
        var storeKey = TaskManagementApplicationModule.MessageBusStoreKeyInstance;

        using (var scope = services.CreateScope())
        {
            var producer = scope.ServiceProvider.GetRequiredService<IPlatformKeyedApplicationBusMessageProducer>();

            await producer.SendAsync(storeKey, CreateTaskCreatedMessage(taskId, sourceEventId, title), autoSaveOutboxMessage: false);
        }

        await WaitForProjectionAsync(services, taskId, title, sourceEventId, "The first TaskManagement delivery was not projected.");

        using (var scope = services.CreateScope())
        {
            var producer = scope.ServiceProvider.GetRequiredService<IPlatformKeyedApplicationBusMessageProducer>();

            await producer.SendAsync(
                storeKey,
                CreateTaskCreatedMessage(taskId, IntegrationTestHelper.UniqueId(), IntegrationTestHelper.UniqueName("ReplayChangedTitle")),
                autoSaveOutboxMessage: false);
            await producer.SendAsync(
                storeKey,
                CreateTaskCreatedMessage(sentinelTaskId, IntegrationTestHelper.UniqueId(), sentinelTitle),
                autoSaveOutboxMessage: false);
        }

        await WaitForDatabaseAssertionAsync(
            services,
            async serviceProvider =>
            {
                var projectionRepository =
                    serviceProvider.GetRequiredService<ITaskManagementRepository<TaskBoardItemProjectionEntity>>();
                var sentinelProjections = await projectionRepository.GetAllAsync(projection => projection.TaskId == sentinelTaskId);

                sentinelProjections.Should().ContainSingle();
                sentinelProjections[0].Title.Should().Be(sentinelTitle);
            },
            "The sentinel delivery sent after the replay was not projected.");

        await WaitForProjectionAsync(services, taskId, title, sourceEventId, "TaskManagement replay changed or duplicated the projection.");
    }

    /// <summary>
    /// TC-WORKER-201: the runtime registry exposes two independently keyed lanes with distinct typed persistence
    /// contracts while the host uses one shared transport provider.
    /// </summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-WORKER-201")]
    public void CompositeHost_RegistersIndependentKeyedWorkerLanes()
    {
        var registry = fixture.SharedFactory.Services.GetRequiredService<IPlatformMessageBusStoreRegistry>();

        registry.IsStrictCompositionValidationEnabled.Should().BeTrue();
        registry.Descriptors.Should().HaveCount(2);

        var textSnippetDescriptor = registry.Get(new PlatformMessageBusStoreKey("TextSnippet"));
        var taskManagementDescriptor = registry.Get(
            TaskManagementApplicationModule.MessageBusStoreKeyInstance);

        textSnippetDescriptor.ApplicationLanes.Should().ContainSingle();
        taskManagementDescriptor.ApplicationLanes.Should().ContainSingle();
        textSnippetDescriptor.IsInboxEnabled.Should().BeTrue();
        textSnippetDescriptor.IsOutboxEnabled.Should().BeTrue();
        taskManagementDescriptor.IsInboxEnabled.Should().BeTrue();
        taskManagementDescriptor.IsOutboxEnabled.Should().BeTrue();
        textSnippetDescriptor.PersistenceContextType.Should().Be(typeof(TextSnippetDbContext));
        taskManagementDescriptor.PersistenceContextType.Should().Be(typeof(TaskManagementDbContext));
        textSnippetDescriptor.PersistenceContextType.Should().NotBe(taskManagementDescriptor.PersistenceContextType);
        registry.Bindings.Should().Contain(binding => binding.PersistenceModuleType == typeof(TextSnippetMongoPersistenceModule));
        registry.Bindings.Should().Contain(binding => binding.PersistenceModuleType == typeof(TaskManagementMongoPersistenceModule));
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
        var response = await PostTaskAsync(
            client,
            new TaskBoardItemDto
            {
                Title = title,
                Status = TaskBoardItemStatus.Open
            });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<SaveTaskBoardItemCommandResult>(JsonOptions);
        result.Should().NotBeNull();
        result!.SavedItem.Should().NotBeNull();
        return result;
    }

    private static Task<HttpResponseMessage> PostTaskAsync(HttpClient client, TaskBoardItemDto item)
    {
        return client.PostAsJsonAsync("/api/task-board", new SaveTaskBoardItemCommand { Item = item }, JsonOptions);
    }

    /// <summary>
    /// Pages through the task board (ordered by task id) until the expected task is listed in the expected state.
    /// </summary>
    private static async Task<TaskBoardItemDto> ReadTaskBoardItemAsync(
        HttpClient client,
        string expectedTaskId,
        Func<TaskBoardItemDto, bool> expectedState)
    {
        TaskBoardItemDto? boardItem = null;

        await IntegrationTestHelper.WaitUntilAsync(
            async () =>
            {
                boardItem = await FindTaskBoardItemAsync(client, expectedTaskId);
                boardItem.Should().NotBeNull();
                expectedState(boardItem!).Should().BeTrue();
            },
            timeoutMessage: $"Task-board projection for '{expectedTaskId}' was not available over HTTP in the expected state.");

        return boardItem!;
    }

    private static async Task<TaskBoardItemDto?> FindTaskBoardItemAsync(HttpClient client, string taskId)
    {
        const int pageSize = GetTaskBoardItemsQuery.MaxPageSize;

        for (var skipCount = 0; ; skipCount += pageSize)
        {
            var response = await client.GetAsync($"/api/task-board?SkipCount={skipCount}&MaxResultCount={pageSize}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var page = await response.Content.ReadFromJsonAsync<GetTaskBoardItemsQueryResult>(JsonOptions);
            page.Should().NotBeNull();

            var match = page!.Items.FirstOrDefault(item => item.Id == taskId);
            if (match != null || page.Items.Count < pageSize || skipCount + pageSize >= page.TotalCount)
                return match;
        }
    }

    private static Task WaitForProjectionAsync(
        IServiceProvider services,
        string taskId,
        string expectedTitle,
        string expectedSourceEventId,
        string timeoutMessage)
    {
        return WaitForDatabaseAssertionAsync(
            services,
            async serviceProvider =>
            {
                var projectionRepository =
                    serviceProvider.GetRequiredService<ITaskManagementRepository<TaskBoardItemProjectionEntity>>();
                var projections = await projectionRepository.GetAllAsync(projection => projection.TaskId == taskId);

                projections.Should().ContainSingle();
                projections[0].SourceEventId.Should().Be(expectedSourceEventId);
                projections[0].Title.Should().Be(expectedTitle);
                projections[0].Status.Should().Be(TaskBoardItemStatus.Open);
                projections[0].Id.Should().Be(TaskBoardItemProjectionEntity.CreateDeterministicId(taskId));
            },
            timeoutMessage);
    }

    private static TaskBoardItemCreatedIntegrationEvent CreateTaskCreatedMessage(
        string taskId,
        string sourceEventId,
        string title)
    {
        return new TaskBoardItemCreatedIntegrationEvent
        {
            TrackingId = sourceEventId,
            CreatedUtcDate = DateTime.UtcNow,
            ProduceFrom = nameof(ModularMonolithCompositionIntegrationTests),
            RequestContext = new Dictionary<string, object>(),
            TaskId = taskId,
            Title = title,
            Status = TaskBoardItemStatus.Open.ToString()
        };
    }

    private static Task WaitForDatabaseAssertionAsync(
        IServiceProvider services,
        Func<IServiceProvider, Task> assertion,
        string timeoutMessage)
    {
        return IntegrationTestHelper.WaitUntilAsync(
            async () =>
            {
                using var scope = services.CreateScope();
                await assertion(scope.ServiceProvider);
            },
            timeoutMessage: timeoutMessage);
    }
}
