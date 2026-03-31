<!-- Last scanned: 2026-03-15 -->

# Integration Test Reference

> Subcutaneous CQRS integration tests through real DI (no HTTP), against live infrastructure (MongoDB, RabbitMQ, Redis, PostgreSQL).

## Quick Summary

**Goal:** Write subcutaneous CQRS integration tests that execute commands/queries through real DI against live Docker infrastructure -- no HTTP layer, no in-memory fakes.

**Setup Steps:**

1. Start Docker infrastructure: `src/start-dev-platform-example-app.infrastructure.cmd`
2. Create fixture extending `PlatformServiceIntegrationTestFixture<TApiModule>`
3. Create `[CollectionDefinition]` with `ICollectionFixture<YourFixture>`
4. Create service-specific base class extending `PlatformServiceIntegrationTestWithAssertions<TApiModule>` (override `ResolveRepository` + `BeforeExecuteAnyAsync`)
5. Create test classes with `[Collection(Name)]` + `[Trait("Category", "...")]`

**Key APIs:**

| API                                           | Purpose                                            |
| --------------------------------------------- | -------------------------------------------------- |
| `ExecuteCommandAsync<TResult>(command)`       | Send CQRS command through pipeline                 |
| `ExecuteQueryAsync<TResult>(query)`           | Send CQRS query through pipeline                   |
| `AssertEntityExistsAsync<T>(id)`              | Poll DB until entity exists (eventual consistency) |
| `AssertEntityMatchesAsync<T>(id, assertions)` | Poll DB until entity matches assertions            |
| `AssertEntityDeletedAsync<T>(id)`             | Poll DB until entity removed                       |
| `IntegrationTestHelper.UniqueName(base)`      | Generate unique test data name                     |
| `ExecuteWithServicesAsync(func)`              | Direct DI access for custom logic                  |

**Framework:** xUnit 2.9.3 + FluentAssertions 7.0.0 + Easy.Platform.AutomationTest
**Pattern:** Register real service module DI -> initialize platform modules -> execute commands/queries through CQRS pipeline
**Infrastructure:** Tests run against local Docker Compose services (same ports as development)

---

## Test Architecture

```
Easy.Platform.AutomationTest (framework)
  PlatformServiceIntegrationTestFixture<T>    -- xUnit ICollectionFixture, DI lifecycle
  PlatformServiceIntegrationTestBase<T>       -- CQRS execution (commands, queries, background jobs)
  PlatformServiceIntegrationTestWithAssertions<T>  -- adds DB assertion helpers
  PlatformIntegrationTestHelper               -- unique data, eventual-consistency polling
  PlatformAssertDatabaseState                 -- static DB assertion utilities
  PlatformCrossServiceFixture                 -- multi-service composition
  PlatformIntegrationTestDataSeeder           -- abstract seed data pattern

PlatformExampleApp.IntegrationTests (reference implementation)
  TextSnippetIntegrationTestFixture           -- fixture for TextSnippet service
  TextSnippetIntegrationTestBase              -- service-specific base with repository + context
  TextSnippetTestUserContext                  -- strongly-typed user context
  TextSnippetTestUserContextFactory           -- factory for admin/user/viewer contexts
```

**Key design decisions:**

- **No HTTP layer** -- tests bypass ASP.NET Core pipeline, calling CQRS directly via `IPlatformCqrs`
- **Real infrastructure** -- MongoDB, RabbitMQ, Redis run in Docker; no in-memory fakes
- **Static service provider** -- each closed generic `PlatformServiceIntegrationTestBase<TModule>` gets its own static `IServiceProvider`, shared via xUnit `[Collection]`
- **Eventual consistency** -- all DB assertions use `WaitUntilAsync` polling (default 5s timeout, 100ms interval) to handle async event handlers and message bus side effects

## Test Base Classes

| Class                                             | Purpose                                                                                                      | When to Use                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `PlatformServiceIntegrationTestFixture<T>`        | xUnit collection fixture; builds config, registers DI, initializes modules, seeds data                       | One per service; referenced by `[CollectionDefinition]` |
| `PlatformServiceIntegrationTestBase<T>`           | Provides `ExecuteCommandAsync`, `ExecuteQueryAsync`, `ExecuteWithServicesAsync`, `ExecuteBackgroundJobAsync` | Base for service-specific test base class               |
| `PlatformServiceIntegrationTestWithAssertions<T>` | Extends above with `AssertEntityExistsAsync`, `AssertEntityMatchesAsync`, `AssertEntityDeletedAsync`         | Preferred base -- use unless you need no DB assertions  |
| `PlatformCrossServiceFixture`                     | Composes multiple `PlatformServiceIntegrationTestFixture<T>` for cross-service tests                         | Multi-service integration scenarios                     |
| `PlatformIntegrationTestDataSeeder`               | Abstract seeder with `SeedAsync(IServiceProvider)`                                                           | Idempotent reference data seeding                       |

### Class Hierarchy (for a new service)

```
PlatformServiceIntegrationTestBase<TModule>
  -> PlatformServiceIntegrationTestWithAssertions<TModule>
       -> YourServiceIntegrationTestBase  (override ResolveRepository + BeforeExecuteAnyAsync)
            -> YourActualTestClass        ([Collection], [Fact] methods)
```

**Source:** `src/Platform/Easy.Platform.AutomationTest/IntegrationTests/PlatformServiceIntegrationTestBase.cs:128-504`

## Fixtures & Factories

### Fixture Setup (PlatformServiceIntegrationTestFixture)

The fixture constructor calls `SetupIntegrationTest` which:

1. Builds `IConfiguration` from `appsettings.json` + environment overrides
2. Creates `ServiceCollection` and registers `TServiceModule` (full DI tree)
3. Configures `IWebHostEnvironment` via `PlatformTestWebHostEnvironment`
4. Builds `IServiceProvider`

`InitializeAsync()` then:

1. Resolves `TServiceModule` from DI and calls `module.InitializeAsync()` (mirrors production startup)
2. Calls `SeedDataAsync()` for reference data

**Source:** `src/Platform/Easy.Platform.AutomationTest/IntegrationTests/PlatformServiceIntegrationTestFixture.cs:18-131`

### Example: TextSnippet Fixture

```csharp
// src/Backend/PlatformExampleApp.IntegrationTests/TextSnippetIntegrationTestFixture.cs:14-20
public class TextSnippetIntegrationTestFixture : PlatformServiceIntegrationTestFixture<TextSnippetApiAspNetCoreModule>
{
    public override string FallbackAspCoreEnvironmentValue() => "Development";
}

[CollectionDefinition(Name)]
public class TextSnippetIntegrationTestCollection : ICollectionFixture<TextSnippetIntegrationTestFixture>
{
    public const string Name = "TextSnippet Integration Tests";
}
```

### Example: Service-Specific Base Class

```csharp
// src/Backend/PlatformExampleApp.IntegrationTests/TextSnippetIntegrationTestBase.cs:34-105
public abstract class TextSnippetIntegrationTestBase
    : PlatformServiceIntegrationTestWithAssertions<TextSnippetApiAspNetCoreModule>
{
    protected override IPlatformRepository<TEntity, string> ResolveRepository<TEntity>(IServiceProvider sp)
        => sp.GetRequiredService<ITextSnippetRootRepository<TEntity>>();

    protected override Task BeforeExecuteAnyAsync(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        object? userContext = null,
        CancellationToken cancellationToken = default)
    {
        var testContext = userContext switch
        {
            null => TextSnippetTestUserContextFactory.CreateAdminUser(),
            TextSnippetTestUserContext tc => tc,
            _ => throw new ArgumentException(...)
        };

        var requestContext = requestContextAccessor.Current;
        requestContext
            .SetUserId(testContext.UserId ?? "integration-test-user-001")
            .SetEmail(testContext.Email ?? "inttest@example.com")
            .SetUserRoles(testContext.Roles);

        return Task.CompletedTask;
    }
}
```

### User Context Factory Pattern

```csharp
// src/Backend/PlatformExampleApp.IntegrationTests/TextSnippetTestUserContextFactory.cs:31-93
public static class TextSnippetTestUserContextFactory
{
    public static TextSnippetTestUserContext CreateAdminUser(string? userId = null) => new()
    {
        UserId = userId ?? "integration-test-user-001",
        Roles = ["Admin", "User"],
        Organizations = ["test-org-001"],
    };

    public static TextSnippetTestUserContext CreateUser(string? userId = null) => new()
    {
        UserId = userId ?? "integration-test-user-001",
        Roles = ["User"],
    };

    public static TextSnippetTestUserContext CreateViewerUser(string? userId = null) => new()
    {
        UserId = userId ?? "viewer-user-001",
        Roles = ["Viewer"],
    };
}
```

## Test Helpers

### PlatformIntegrationTestHelper

Utility class for unique data generation and eventual-consistency polling.

**Source:** `src/Platform/Easy.Platform.AutomationTest/IntegrationTests/PlatformIntegrationTestHelper.cs:7-112`

| Method                       | Signature                                              | Description                                                        |
| ---------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| `UniqueName`                 | `string UniqueName(string baseName)`                   | Returns `"{baseName}_{8-char-guid}"`                               |
| `UniqueId`                   | `string UniqueId()`                                    | Returns 12-character unique ID                                     |
| `UniqueEmail`                | `string UniqueEmail(string prefix = "test")`           | Returns `"{prefix}_{8-char-guid}@test.local"`                      |
| `WaitUntilAsync` (bool)      | `Task WaitUntilAsync(Func<Task<bool>> condition, ...)` | Polls condition until true or timeout (default 5s, 100ms interval) |
| `WaitUntilAsync` (assertion) | `Task WaitUntilAsync(Func<Task> assertion, ...)`       | Polls assertion until no exception or timeout                      |

**Global alias** defined in `GlobalUsings.cs`:

```csharp
// src/Backend/PlatformExampleApp.IntegrationTests/GlobalUsings.cs:16
global using IntegrationTestHelper = Easy.Platform.AutomationTest.IntegrationTests.PlatformIntegrationTestHelper;
```

### Execution Methods (PlatformServiceIntegrationTestBase)

| Method                                                                                   | Returns     | Description                                                              |
| ---------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| `ExecuteCommandAsync<TResult>(command, userContext?)`                                    | `TResult`   | Send CQRS command with scoped DI + request context                       |
| `ExecuteQueryAsync<TResult>(query, userContext?)`                                        | `TResult`   | Send CQRS query with scoped DI + request context                         |
| `ExecuteWithServicesAsync<TResult>(Func<IServiceProvider, Task<TResult>>, userContext?)` | `TResult`   | Direct DI access for custom test logic                                   |
| `ExecuteWithServicesAsync(Func<IServiceProvider, Task>, userContext?)`                   | void        | Same, void variant                                                       |
| `GetServiceAsync<T>(userContext?)`                                                       | `T`         | Resolve singleton/transient service (WARNING: scope disposes after call) |
| `ExecuteBackgroundJobAsync<TJob>(userContext?)`                                          | void        | Execute background job inline through real scheduler                     |
| `ExecuteBackgroundJobWithParamAsync<TJob>(jobParam, userContext?)`                       | void        | Execute parameterized background job inline                              |
| `AssertValidationFailsAsync(action, expectedMsg?)`                                       | `Exception` | Assert command throws `IPlatformValidationException`                     |

### DB Assertion Methods (PlatformServiceIntegrationTestWithAssertions)

| Method                                                        | Description                                      |
| ------------------------------------------------------------- | ------------------------------------------------ |
| `AssertEntityExistsAsync<TEntity>(id, timeout?)`              | Polls DB until entity with ID exists             |
| `AssertEntityMatchesAsync<TEntity>(id, assertions, timeout?)` | Polls DB until entity exists AND assertions pass |
| `AssertEntityDeletedAsync<TEntity>(id, timeout?)`             | Polls DB until entity with ID no longer exists   |

All use `WaitUntilAsync` internally with fresh DI scopes per poll to avoid stale reads. Default timeout: 5 seconds.

## Configuration

### Test Project Config Files

| File                           | Purpose                                                 |
| ------------------------------ | ------------------------------------------------------- |
| `appsettings.json`             | Base config: connection strings, logging, feature flags |
| `appsettings.Development.json` | Environment-specific overrides                          |

**Source:** `src/Backend/PlatformExampleApp.IntegrationTests/appsettings.json`

### Infrastructure Connection Strings

```json
{
    "UseDbType": "MongoDb",
    "ConnectionStrings": {
        "DefaultConnection": "Data Source=localhost,14330;Initial Catalog=TextSnippedDb;User ID=sa;Password=123456Abc;Encrypt=False;",
        "PostgreSqlConnection": "Host=localhost;Port=54320;Username=postgres;Password=postgres;Database=TextSnippedDb"
    },
    "MongoDB": {
        "ConnectionString": "mongodb://root:rootPassXXX@localhost:27017?authSource=admin",
        "Database": "TextSnippetApi_IntegrationTest"
    },
    "RabbitMqOptions": { "HostNames": "localhost", "UserName": "guest", "Password": "guest" },
    "RedisCacheOptions": { "Connection": "localhost:6379,ConnectTimeout=60000,AsyncTimeout=60000,abortConnect=false" }
}
```

**Note:** Integration tests use a separate database name (`TextSnippetApi_IntegrationTest`) to avoid polluting development data.

### Required Infrastructure

| Service    | Port            | Required For                            |
| ---------- | --------------- | --------------------------------------- |
| MongoDB    | 127.0.0.1:27017 | Default persistence (UseDbType=MongoDb) |
| RabbitMQ   | 127.0.0.1:5672  | Message bus producer/outbox tests       |
| Redis      | 127.0.0.1:6379  | Caching layer                           |
| PostgreSQL | 127.0.0.1:54320 | Alternative persistence                 |
| SQL Server | 127.0.0.1:14330 | Alternative persistence                 |

Start infrastructure: `src/start-dev-platform-example-app.infrastructure.cmd`

### Startup Class (No-Op)

```csharp
// src/Backend/PlatformExampleApp.IntegrationTests/Startup.cs:15-20
public class Startup
{
    public void ConfigureHost(IHostBuilder hostBuilder) { }
    public void ConfigureServices(IServiceCollection services) { }
}
```

Required by `Xunit.DependencyInjection` (transitive dependency). All DI is handled by the `PlatformServiceIntegrationTestFixture` pattern instead.

## Service-Specific Setup

### TextSnippet Service (Reference Implementation)

**Test project:** `src/Backend/PlatformExampleApp.IntegrationTests/`
**Test count:** 13 test files (excluding obj/), 13+ test methods
**Collection name:** `"TextSnippet Integration Tests"`

| Directory         | Tests                                                              | Category Trait |
| ----------------- | ------------------------------------------------------------------ | -------------- |
| `TextSnippets/`   | SaveSnippetTextCommand (3 tests), SearchSnippetTextQuery (2 tests) | Command, Query |
| `Categories/`     | SaveSnippetCategoryCommand (3 tests)                               | Command        |
| `BackgroundJobs/` | SimpleRecurringJob (2), BatchScrollingJob (2), PagedJob (2)        | BackgroundJob  |
| `MessageBus/`     | MessageBus producer tests (3 tests)                                | MessageBus     |

**Project references:**

- `PlatformExampleApp.TextSnippet.Api` -- for `TextSnippetApiAspNetCoreModule`
- `PlatformExampleApp.TextSnippet.Application` -- for commands, queries, DTOs
- `PlatformExampleApp.TextSnippet.Domain` -- for entities, repositories
- `Easy.Platform.AutomationTest` -- for test base classes

### Adding a New Service

To add integration tests for a new service, create these files:

1. **Fixture** -- extends `PlatformServiceIntegrationTestFixture<YourApiModule>`
2. **Collection** -- `[CollectionDefinition]` with `ICollectionFixture<YourFixture>`
3. **Base class** -- extends `PlatformServiceIntegrationTestWithAssertions<YourApiModule>`, overrides `ResolveRepository` + `BeforeExecuteAnyAsync`
4. **User context** -- strongly-typed context class + factory
5. **Test classes** -- `[Collection(Name)]` + `[Trait("Category", "...")]` + extends your base

## Test Data Patterns

### Unique Data Generation

Always use `IntegrationTestHelper.UniqueName()` / `UniqueId()` / `UniqueEmail()` for test data to avoid collisions across test runs (data accumulates in the database).

```csharp
var snippetText = IntegrationTestHelper.UniqueName("Snippet");    // "Snippet_a1b2c3d4"
var entityId = Ulid.NewUlid().ToString();                          // ULID for explicit IDs
var email = IntegrationTestHelper.UniqueEmail("test");             // "test_a1b2c3d4@test.local"
```

### Direct Repository Access for Seeding

Use `ExecuteWithServicesAsync` to access repositories directly for test data setup:

```csharp
// src/Backend/PlatformExampleApp.IntegrationTests/BackgroundJobs/BatchScrollingJobIntegrationTests.cs:62-67
await ExecuteWithServicesAsync(async sp =>
{
    var repo = sp.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
    await repo.CreateOrUpdateAsync(TextSnippetEntity.Create(entityId, snippetText, ""));
});
```

### Seed Data Strategy

- **Fixture-level seeding** -- override `SeedDataAsync()` in your fixture for reference data needed by all tests
- **Test-level seeding** -- use `ExecuteWithServicesAsync` or `ExecuteCommandAsync` in Arrange phase
- **Idempotent pattern** -- use FirstOrDefault + create-if-missing for fixture seeds (data accumulates)
- **No cleanup** -- tests use unique data to avoid interference; no teardown/cleanup between tests

## Running Tests

### Commands

```bash
# Run all integration tests
dotnet test src/Backend/PlatformExampleApp.IntegrationTests/

# Run specific category
dotnet test src/Backend/PlatformExampleApp.IntegrationTests/ --filter "Category=Command"
dotnet test src/Backend/PlatformExampleApp.IntegrationTests/ --filter "Category=BackgroundJob"
dotnet test src/Backend/PlatformExampleApp.IntegrationTests/ --filter "Category=MessageBus"

# Run specific test class
dotnet test src/Backend/PlatformExampleApp.IntegrationTests/ --filter "FullyQualifiedName~SaveSnippetTextCommand"
```

### Prerequisites

1. Start Docker infrastructure: `src/start-dev-platform-example-app.infrastructure.cmd`
2. Wait for all services to be healthy (MongoDB, RabbitMQ, Redis)
3. Tests auto-initialize platform modules (mimics production `InitPlatformAspNetCoreModule`)

### xUnit Collection Behavior

All test classes in the same `[Collection]` share a single fixture instance and run **sequentially** (xUnit default for collection members). Tests in different collections run in parallel.

---

## New Test Quickstart

Minimal steps to add a new integration test for TextSnippet:

```csharp
// 1. Create test class in appropriate subdirectory
namespace PlatformExampleApp.IntegrationTests.YourFeature;

[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "Command")]  // or "Query", "BackgroundJob", "MessageBus"
public class YourCommandIntegrationTests : TextSnippetIntegrationTestBase
{
    [Fact]
    public async Task YourCommand_WhenValidData_ShouldSucceed()
    {
        // Arrange
        var name = IntegrationTestHelper.UniqueName("TestItem");
        var command = new YourCommand { Name = name };

        // Act
        var result = await ExecuteCommandAsync(command);

        // Assert -- result
        result.Should().NotBeNull();

        // Assert -- DB state (polls with eventual-consistency handling)
        await AssertEntityMatchesAsync<YourEntity>(result.Id, entity =>
        {
            entity.Name.Should().Be(name);
        });
    }

    [Fact]
    public async Task YourCommand_WhenInvalid_ShouldFailValidation()
    {
        var command = new YourCommand { Name = "" };
        await Assert.ThrowsAsync<PlatformValidationException>(
            () => ExecuteCommandAsync(command));
    }
}
```

## Background Job Testing Patterns

### Simple Recurring Job

```csharp
// Use ExecuteBackgroundJobAsync<TJob>() -- no parameters needed
await ExecuteBackgroundJobAsync<TestRecurringBackgroundJobExecutor>();
```

### Batch Scrolling Job (CRITICAL)

**Must** use `ExecuteBackgroundJobWithParamAsync` with explicit `BatchKey`. Without it, the master job schedules into Hangfire which never runs in tests.

```csharp
// src/Backend/PlatformExampleApp.IntegrationTests/BackgroundJobs/BatchScrollingJobIntegrationTests.cs:70-75
var batchParam = new PlatformBatchScrollingJobParam<string, DemoBatchScrollingParam>
{
    BatchKey = "T",
    Param = new DemoBatchScrollingParam { ProcessingMode = BatchProcessingMode.UpdateFullText },
};
await ExecuteBackgroundJobWithParamAsync<DemoBatchScrollingBackgroundJobExecutor>(batchParam);
```

### Paged Job (CRITICAL)

**Must** use `ExecuteBackgroundJobWithParamAsync` with explicit `Skip`/`Take`. Without them, master-job mode schedules child jobs into Hangfire.

```csharp
// src/Backend/PlatformExampleApp.IntegrationTests/BackgroundJobs/PagedJobIntegrationTests.cs:67-73
var pagedParam = new PlatformApplicationPagedBackgroundJobParam<DemoPagedParam>
{
    Skip = 0,
    Take = 200,
    Param = new DemoPagedParam { ProcessingMode = PagedProcessingMode.OptimizeData },
};
await ExecuteBackgroundJobWithParamAsync<DemoPagedBackgroundJobExecutor>(pagedParam);
```

## Message Bus Testing Patterns

In single-service tests, only the **producer side** can be verified:

| Pattern         | Method                                                                                | What It Tests                                   |
| --------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Command-based   | `ExecuteCommandAsync(busCommand)`                                                     | Command handler -> bus producer -> outbox write |
| Direct producer | `ExecuteWithServicesAsync` + `IPlatformApplicationBusMessageProducer.SendAsync()`     | DI wiring + outbox infrastructure               |
| Auto-producer   | Execute command that has a `PlatformCqrsCommandEventBusMessageProducer<T>` registered | CQRS pipeline fires producer                    |

Consumer-side testing requires cross-service setup via `PlatformCrossServiceFixture`.

**Source:** `src/Backend/PlatformExampleApp.IntegrationTests/MessageBus/MessageBusIntegrationTests.cs:48-129`

## Cross-Service Testing

Use `PlatformCrossServiceFixture` to compose multiple service fixtures:

```csharp
// Pattern from PlatformCrossServiceFixture docs
public class MyCrossServiceFixture : PlatformCrossServiceFixture
{
    protected override IReadOnlyList<Type> GetFixtureTypes()
        => [typeof(AccountsFixture), typeof(GrowthFixture)];

    public IServiceProvider AccountsServiceProvider
        => GetFixture<AccountsFixture>().ServiceProvider;
}

[CollectionDefinition("Cross-Service")]
public class CrossServiceCollection : ICollectionFixture<MyCrossServiceFixture> { }
```

Fixtures initialize sequentially in declared order. Place foundational services first.

**Source:** `src/Platform/Easy.Platform.AutomationTest/IntegrationTests/PlatformCrossServiceFixture.cs:42-136`

---

## Closing Reminders

- **MUST** use `[Collection(Name)]` attribute on every test class -- without it, xUnit creates a separate fixture instance and DI breaks
- **MUST** use `IntegrationTestHelper.UniqueName()` / `UniqueId()` for all test data -- data accumulates across runs, hardcoded values cause collisions
- **MUST** use `AssertEntityMatchesAsync` (not direct DB reads) for post-command assertions -- eventual consistency requires polling with `WaitUntilAsync`
- **MUST** provide explicit `BatchKey` or `Skip`/`Take` when testing batch/paged background jobs -- without them, master-job mode schedules into Hangfire which never executes in tests
- **MUST** override `ResolveRepository` and `BeforeExecuteAnyAsync` in your service-specific base class -- these wire up the correct repository interface and user context
