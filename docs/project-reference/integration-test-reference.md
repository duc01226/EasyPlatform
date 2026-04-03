<!-- Last scanned: 2026-04-03 -->

# Integration Test Reference

**CRITICAL: Subcutaneous CQRS tests through real DI (no HTTP), against live infrastructure. MUST extend `TextSnippetIntegrationTestBase` (or service-specific equivalent). MUST use `[Collection]` attribute. MUST use `IntegrationTestHelper.UniqueName()` for test data.**

## Test Architecture

| Aspect      | Value                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------- |
| Framework   | xUnit 2.9.3 + FluentAssertions 7.0.0 + Xunit.DependencyInjection 9.7.0                   |
| Approach    | Subcutaneous — real CQRS pipeline, real DI, real database, NO HTTP                       |
| Module init | Mirrors production: `module.InitializeAsync()` in fixture `InitializeAsync()`            |
| Isolation   | xUnit `[Collection]` ensures sequential execution per service fixture                    |
| Config      | `appsettings.json` in test project — separate DB name (`TextSnippetApi_IntegrationTest`) |

**Infrastructure MUST be running:**

| Service    | Endpoint                             | Required                    |
| ---------- | ------------------------------------ | --------------------------- |
| MongoDB    | `localhost:27017` (root/rootPassXXX) | Yes (default)               |
| RabbitMQ   | `localhost:5672` (guest/guest)       | Yes                         |
| Redis      | `localhost:6379`                     | Yes                         |
| PostgreSQL | `localhost:54320`                    | Only for PostgreSQL variant |
| SQL Server | `localhost:14330`                    | Only for SQL Server variant |

Start infrastructure: `src/start-dev-platform-example-app.infrastructure.cmd`

## Test Base Classes

| Class                                             | Location                                                                                               | Purpose                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `PlatformServiceIntegrationTestBase<T>`           | `src/Platform/Easy.Platform.AutomationTest/IntegrationTests/PlatformServiceIntegrationTestBase.cs:128` | Framework base — ExecuteCommandAsync, ExecuteQueryAsync, ExecuteWithServicesAsync |
| `PlatformServiceIntegrationTestWithAssertions<T>` | Same file `:429`                                                                                       | Adds AssertEntityExistsAsync, AssertEntityMatchesAsync, AssertEntityDeletedAsync  |
| `PlatformServiceIntegrationTestFixture<T>`        | `src/Platform/Easy.Platform.AutomationTest/IntegrationTests/PlatformServiceIntegrationTestFixture.cs`  | xUnit collection fixture — DI lifecycle, module init, data seeding                |
| `PlatformCrossServiceFixture`                     | `src/Platform/Easy.Platform.AutomationTest/IntegrationTests/PlatformCrossServiceFixture.cs`            | Composes multiple service fixtures for cross-service tests                        |
| `TextSnippetIntegrationTestBase`                  | `src/Backend/PlatformExampleApp.IntegrationTests/TextSnippetIntegrationTestBase.cs`                    | Service-specific base — repo resolution + request context setup                   |

### Inheritance Chain (extend this in your tests)

```
PlatformServiceIntegrationTestBase<TModule>          ← ExecuteCommandAsync, ExecuteQueryAsync
  └─ PlatformServiceIntegrationTestWithAssertions<TModule>  ← AssertEntityExistsAsync, etc.
       └─ TextSnippetIntegrationTestBase              ← ResolveRepository, BeforeExecuteAnyAsync
            └─ YourTestClass                          ← [Collection], [Trait], [Fact]
```

### Key Execution Methods

```csharp
// Execute CQRS command (src/Platform/.../PlatformServiceIntegrationTestBase.cs:233)
var result = await ExecuteCommandAsync(command, userContext: null);

// Execute CQRS query (same file :255)
var result = await ExecuteQueryAsync(query, userContext: null);

// Direct DI service access (same file :272)
await ExecuteWithServicesAsync(async sp => {
    var repo = sp.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
    await repo.CreateOrUpdateAsync(entity);
});

// Simple background job (same file :328)
await ExecuteBackgroundJobAsync<TestRecurringBackgroundJobExecutor>();

// Parameterized background job (same file :346)
await ExecuteBackgroundJobWithParamAsync<DemoBatchScrollingBackgroundJobExecutor>(batchParam);

// Validation failure assertion (same file :370)
await AssertValidationFailsAsync(() => ExecuteCommandAsync(invalidCommand), "expected message");
```

### Virtual Extension Points

MUST override in service-specific base class, NEVER in individual test classes:

| Method                       | Purpose                                       | Default                            |
| ---------------------------- | --------------------------------------------- | ---------------------------------- |
| `BeforeExecuteAnyAsync`      | Populate request context before ANY operation | No-op                              |
| `BeforeExecuteCommandAsync`  | Context setup for commands only               | Delegates to BeforeExecuteAnyAsync |
| `BeforeExecuteQueryAsync`    | Context setup for queries only                | Delegates to BeforeExecuteAnyAsync |
| `ResolveRepository<TEntity>` | Return service-specific repository interface  | Abstract (MUST override)           |

## Fixtures & Factories

### Fixture Setup Pattern

```csharp
// 1. Fixture class (src/Backend/.../TextSnippetIntegrationTestFixture.cs:14)
public class TextSnippetIntegrationTestFixture
    : PlatformServiceIntegrationTestFixture<TextSnippetApiAspNetCoreModule>
{
    public override string FallbackAspCoreEnvironmentValue() => "Development";
}

// 2. Collection definition (same file :27)
[CollectionDefinition(Name)]
public class TextSnippetIntegrationTestCollection
    : ICollectionFixture<TextSnippetIntegrationTestFixture>
{
    public const string Name = "TextSnippet Integration Tests";
}
```

### User Context Factory

```csharp
// src/Backend/.../TextSnippetTestUserContextFactory.cs:46
var admin = TextSnippetTestUserContextFactory.CreateAdminUser();   // Admin + User roles
var user  = TextSnippetTestUserContextFactory.CreateUser();        // User role only
var viewer = TextSnippetTestUserContextFactory.CreateViewerUser(); // Viewer role (read-only)

// Pass to any Execute method:
var result = await ExecuteCommandAsync(command, userContext: admin);
// null userContext = default admin context
```

### Cross-Service Fixture

```csharp
// src/Platform/.../PlatformCrossServiceFixture.cs:42
public class MyCrossServiceFixture : PlatformCrossServiceFixture
{
    protected override IReadOnlyList<Type> GetFixtureTypes()
        => [typeof(AccountsFixture), typeof(GrowthFixture)];
    public IServiceProvider AccountsProvider => GetFixture<AccountsFixture>().ServiceProvider;
}
```

## Test Helpers

### Unique Data Generation (`PlatformIntegrationTestHelper`)

MUST use for ALL test data to prevent collision between test runs:

```csharp
// src/Platform/.../PlatformIntegrationTestHelper.cs
IntegrationTestHelper.UniqueName("Snippet")   // "Snippet_a1b2c3d4"
IntegrationTestHelper.UniqueId()              // "a1b2c3d4e5f6"
IntegrationTestHelper.UniqueEmail("test")     // "test_a1b2c3d4@test.local"
```

### Database State Assertions

ALL assertions use `WaitUntilAsync` polling (default 5s timeout, 100ms interval) for eventual consistency. Fresh DI scope per poll iteration prevents stale reads.

```csharp
// Entity exists (src/Platform/.../PlatformServiceIntegrationTestBase.cs:445)
await AssertEntityExistsAsync<TextSnippetEntity>(id);

// Entity matches assertions (same file :466)
await AssertEntityMatchesAsync<TextSnippetEntity>(id, entity => {
    entity.SnippetText.Should().Be(expected);
});

// Entity deleted (same file :488)
await AssertEntityDeletedAsync<TextSnippetEntity>(id);
```

### Eventual Consistency Polling

```csharp
// src/Platform/.../PlatformIntegrationTestHelper.cs:45
await PlatformIntegrationTestHelper.WaitUntilAsync(
    async () => { /* assertion that throws on failure */ },
    timeout: TimeSpan.FromSeconds(10),
    pollingInterval: TimeSpan.FromMilliseconds(200));
```

## Service-Specific Setup

### TextSnippet Service

**Base class:** `TextSnippetIntegrationTestBase` at `src/Backend/PlatformExampleApp.IntegrationTests/TextSnippetIntegrationTestBase.cs`

**Repository resolution:**

```csharp
protected override IPlatformRepository<TEntity, string> ResolveRepository<TEntity>(IServiceProvider sp)
    => sp.GetRequiredService<ITextSnippetRootRepository<TEntity>>();
```

**Request context setup** (`BeforeExecuteAnyAsync`):

- Maps `TextSnippetTestUserContext` to platform `RequestContext`
- Sets UserId, Email, UserRoles via platform extension methods
- Sets custom Organizations via `TextSnippetApplicationCustomRequestContextKeys`
- Default (null userContext) = admin context via `TextSnippetTestUserContextFactory.CreateAdminUser()`

### Adding a New Service's Integration Tests

1. Create fixture extending `PlatformServiceIntegrationTestFixture<YourApiModule>`
2. Create `[CollectionDefinition]` with `ICollectionFixture<YourFixture>`
3. Create base class extending `PlatformServiceIntegrationTestWithAssertions<YourApiModule>`
4. Override `ResolveRepository<TEntity>()` with your service's repository interface
5. Override `BeforeExecuteAnyAsync()` to populate request context
6. Create user context class + factory for test user roles

## Test Data Patterns

- MUST use `IntegrationTestHelper.UniqueName()` for all string fields that might collide
- Use `Ulid.NewUlid().ToString()` for explicit entity IDs when needed for assertions
- Seed data in fixture's `SeedDataAsync()` with idempotent FirstOrDefault + create-if-missing
- Test data accumulates across runs (no automatic cleanup)

## Running Tests

```bash
# Run all integration tests
dotnet test src/Backend/PlatformExampleApp.IntegrationTests/

# Filter by trait
dotnet test --filter "Category=Command"
dotnet test --filter "Category=Query"
dotnet test --filter "Category=BackgroundJob"
dotnet test --filter "Category=MessageBus"

# Run specific test class
dotnet test --filter "FullyQualifiedName~SaveSnippetTextCommandIntegrationTests"
```

## New Test Quickstart

```csharp
// src/Backend/PlatformExampleApp.IntegrationTests/YourFeature/YourCommandIntegrationTests.cs
[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "Command")]
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

        // Assert — result
        result.Should().NotBeNull();

        // Assert — DB state (eventual consistency polled)
        await AssertEntityMatchesAsync<YourEntity>(result.Id, entity => {
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

### Background Job Test Patterns

```csharp
// Simple recurring job — use ExecuteBackgroundJobAsync (no param)
await ExecuteBackgroundJobAsync<TestRecurringBackgroundJobExecutor>();

// Batch scrolling job — MUST pass BatchKey (master mode silently does nothing in tests)
var batchParam = new PlatformBatchScrollingJobParam<string, DemoBatchScrollingParam>
{
    BatchKey = "T",
    Param = new DemoBatchScrollingParam { ProcessingMode = BatchProcessingMode.UpdateFullText },
};
await ExecuteBackgroundJobWithParamAsync<DemoBatchScrollingBackgroundJobExecutor>(batchParam);

// Paged job — MUST pass Skip/Take (master mode silently does nothing in tests)
var pagedParam = new PlatformApplicationPagedBackgroundJobParam<DemoPagedParam>
{
    Skip = 0, Take = 200,
    Param = new DemoPagedParam { ProcessingMode = PagedProcessingMode.OptimizeData },
};
await ExecuteBackgroundJobWithParamAsync<DemoPagedBackgroundJobExecutor>(pagedParam);
```

**CRITICAL: Subcutaneous CQRS tests through real DI. MUST extend service-specific test base. MUST use `[Collection]` attribute. MUST use `IntegrationTestHelper.UniqueName()`. Batch/Paged jobs MUST pass explicit params (master mode silently does nothing in tests).**
