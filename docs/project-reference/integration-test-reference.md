<!-- Last scanned: 2026-06-12 -->
<!-- Last verified: 2026-08-21 (docs-update, impact-scoped) -->

# Integration Test Reference

**CRITICAL: Two test styles — (1) DEFAULT subcutaneous CQRS through real DI (no HTTP), and (2) HTTP-level via `WebApplicationFactory<Program>` (for Autofac-DI services or full-pipeline assertions). Subcutaneous tests MUST extend `TextSnippetIntegrationTestBase` (or service-specific equivalent). ALL tests MUST use a `[Collection]` attribute and `IntegrationTestHelper.UniqueName()` for test data.**

**Purpose:** Let any AI/dev write a correct, isolated, repeatable integration test on the first try — pick the right base class + style, assert real DB state via polling (not smoke), and keep tests collision-free across runs. — why: integration tests run against live infra with no DB reset; wrong base class, missing `[Collection]`, or non-unique data silently corrupts other tests.

## Contents

- [Test Architecture](#test-architecture)
- [Test Base Classes](#test-base-classes)
- [Fixtures & Factories](#fixtures--factories)
- [WebApplicationFactory Testing (HTTP-level)](#webapplicationfactory-testing-http-level)
- [Test Helpers](#test-helpers)
- [Service-Specific Setup](#service-specific-setup)
- [Test Data Patterns](#test-data-patterns)
- [Running Tests](#running-tests)
- [New Test Quickstart](#new-test-quickstart)

## Test Architecture

| Aspect      | Value                                                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework   | xUnit 2.9.3 + FluentAssertions 7.0.0 + Microsoft.AspNetCore.Mvc.Testing 9.0.4 (`Xunit.DependencyInjection` 9.7.0 transitive via Easy.Platform.AutomationTest)                    |
| Approach    | Subcutaneous — real CQRS pipeline, real DI, real database, NO HTTP (default). HTTP-level path available via `WebApplicationFactory<Program>` (see WebApplicationFactory Testing) |
| Module init | Mirrors production: `module.InitializeAsync()` in fixture `InitializeAsync()`                                                                                                    |
| Isolation   | xUnit `[Collection]` — sequential within each collection; distinct collection fixtures may run concurrently, using unique test data                     |
| Config      | `appsettings.json` in test project — default Mongo database `TextSnippetApi`; specialized host fixtures override with unique database names                                                                                         |

**Infrastructure MUST be running:**

| Service    | Endpoint          | Required                                                             |
| ---------- | ----------------- | -------------------------------------------------------------------- |
| MongoDB    | `localhost:27017` | Yes (default; local Compose credentials configured in test settings) |
| RabbitMQ   | `localhost:5672`  | Yes (local Compose credentials configured in test settings)          |
| Redis      | `localhost:6379`  | Yes                                                                  |
| PostgreSQL | `localhost:54320` | Only for PostgreSQL variant                                          |
| SQL Server | `localhost:14330` | Only for SQL Server variant                                          |

Start infrastructure: `src/start-dev-platform-example-app.infrastructure.cmd`

Before any test run, verify the intended Compose project identity—not only port connectivity—with the configured readiness check (`docs/project-config.json:370-378`):

```bash
docker ps --filter "label=com.docker.compose.project=easyplatform-example" --format "{{.Names}} => {{.Status}}"
```

Empty output means the required stack is not started. The suite hosts the API in-process through `WebApplicationFactory<Program>` with host-port binding disabled (`src/PlatformExampleApp/PlatformExampleApp.IntegrationTests/WebAppFactory/TextSnippetWebApplicationFactory.cs:40-55`); `text-snippet-api` is not an integration-test prerequisite and a separately running API can conflict.

Verification gate: run the integration suite twice consecutively with no database reset; both runs must pass. Test data accumulates, so use unique data rather than resetting shared databases.

## Test Base Classes

| Class                                             | Location                                                                                               | Purpose                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `PlatformServiceIntegrationTestBase<T>`           | `src/Platform/Easy.Platform.AutomationTest/IntegrationTests/PlatformServiceIntegrationTestBase.cs:128` | Framework base — ExecuteCommandAsync, ExecuteQueryAsync, ExecuteWithServicesAsync |
| `PlatformServiceIntegrationTestWithAssertions<T>` | Same file `:429`                                                                                       | Adds AssertEntityExistsAsync, AssertEntityMatchesAsync, AssertEntityDeletedAsync  |
| `PlatformServiceIntegrationTestFixture<T>`        | `src/Platform/Easy.Platform.AutomationTest/IntegrationTests/PlatformServiceIntegrationTestFixture.cs`  | xUnit collection fixture — DI lifecycle, module init, data seeding                |
| `PlatformCrossServiceFixture`                     | `src/Platform/Easy.Platform.AutomationTest/IntegrationTests/PlatformCrossServiceFixture.cs`            | Composes multiple service fixtures for cross-service tests                        |
| `TextSnippetIntegrationTestBase`                  | `src/PlatformExampleApp/PlatformExampleApp.IntegrationTests/TextSnippetIntegrationTestBase.cs`                    | Service-specific base — repo resolution + request context setup                   |

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

// Parameterized background job (same file :347)
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
// 1. Fixture class (src/PlatformExampleApp/.../TextSnippetIntegrationTestFixture.cs:13)
public class TextSnippetIntegrationTestFixture
    : PlatformServiceIntegrationTestFixture<TextSnippetIntegrationTestAspNetCoreModule>
{
    public override string FallbackAspCoreEnvironmentValue() => "Development";
}

// 2. Collection definition (same file :25)
[CollectionDefinition(Name)]
public class TextSnippetIntegrationTestCollection
    : ICollectionFixture<TextSnippetIntegrationTestFixture>
{
    public const string Name = "TextSnippet Integration Tests";
}
```

The fixture uses `TextSnippetIntegrationTestAspNetCoreModule` (`TextSnippetIntegrationTestAspNetCoreModule.cs:10`), a test subclass of `TextSnippetApiAspNetCoreModule` that overrides `EnableAutomaticDataSeedingOnInit => false` (`:15`) so fixture init does not run the slow production data-seeding pass. Paged-job tests use `BackgroundJobs/PagedJobIntegrationTestFixture.cs`: a distinct module type keeps its static DI provider separate, and unique Mongo database names isolate the global page from accumulated shared-suite rows. The generic `TextSnippetIntegrationTestBase<TServiceModule>` shares repository and request-context setup with the default base. Before executing an explicit page, assert that its target records belong to that page; a unique row ID alone does not prove page membership. The collection serializes its host graph, and teardown does not reset shared data.

A no-op `Startup` class (`Startup.cs:15`) satisfies the `Xunit.DependencyInjection` `[assembly: StartupType]` requirement without registering services — tests use the `ICollectionFixture` pattern instead.

### User Context Factory

```csharp
// src/PlatformExampleApp/.../TextSnippetTestUserContextFactory.cs:46
var admin = TextSnippetTestUserContextFactory.CreateAdminUser();   // Admin + User roles
var user  = TextSnippetTestUserContextFactory.CreateUser();        // User role only
var viewer = TextSnippetTestUserContextFactory.CreateViewerUser(); // Viewer role (read-only)

// Pass to any Execute method:
var result = await ExecuteCommandAsync(command, userContext: admin);
// null userContext = default admin context
```

### Cross-Service Fixture

`PlatformCrossServiceFixture` (`src/Platform/.../PlatformCrossServiceFixture.cs:42`) composes multiple service fixtures. A subclass overrides `GetFixtureTypes()` (`:69`); the ctor instantiates each via `Activator.CreateInstance` after an `IsPlatformServiceFixture` check (`:47,:122`). `InitializeAsync()` (`:96`) inits fixtures sequentially in declared order; `Dispose` (`:110`) disposes in reverse. **Isolation:** `PlatformServiceIntegrationTestBase<TModule>.ServiceProvider` is `static` keyed on the closed generic type, so distinct module subtypes = distinct DI containers.

Concrete POC (`src/PlatformExampleApp/.../CrossService/`): two marker modules `TextSnippetCrossServiceProducerModule` / `TextSnippetCrossServiceConsumerModule` (`TextSnippetCrossServiceModules.cs:17,:27`) — both extend `TextSnippetIntegrationTestAspNetCoreModule` (two containers, same physical DB in the POC).

```csharp
// src/PlatformExampleApp/.../CrossService/TextSnippetCrossServiceFixtures.cs:50
public class TextSnippetCrossServiceFixture : PlatformCrossServiceFixture
{
    protected override IReadOnlyList<Type> GetFixtureTypes()
        => [typeof(TextSnippetCrossServiceProducerFixture), typeof(TextSnippetCrossServiceConsumerFixture)];
    public IServiceProvider ProducerServiceProvider => /* :58 */ ...;
    public IServiceProvider ConsumerServiceProvider => /* :64 */ ...;
}

// Test (TextSnippetCrossServiceIntegrationTests.cs:59, [Trait("Category","CrossService")])
// Producer writes via its own scope; consumer polls its DB:
await IntegrationTestHelper.WaitUntilAsync(/* assert consumer-side state */,
    timeout: TimeSpan.FromSeconds(10), pollingInterval: TimeSpan.FromMilliseconds(500));
// Isolation invariant (TC-EXAMPLE-030, :113): ProducerSP.Should().NotBeSameAs(ConsumerSP)
```

## WebApplicationFactory Testing (HTTP-level)

Use this path when a service registers Autofac-DI services (incompatible with the Microsoft-DI-only subcutaneous fixture) OR when you must assert the full HTTP pipeline (routing, serialization, middleware, exception→status mapping). Files: `src/PlatformExampleApp/.../WebAppFactory/`.

```csharp
// TextSnippetWebApplicationFactory.cs:40 — boots the REAL Program.cs over in-memory TestServer
internal sealed class TextSnippetWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, configBuilder) =>  // :46 — WAF forces Postgres
            configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["UseDbType"] = "Postgres",
            }));
        builder.UseUrls();                              // :54 — no port binding (in-memory)
    }
}

// Test (TextSnippetWebAppFactoryIntegrationTests.cs:36, [Trait("Category","WebAppFactory")])
var client = fixture.CreateClient();                    // AllowAutoRedirect=false (:65)
var response = await client.PostAsync("/api/...", content);
response.StatusCode.Should().Be(HttpStatusCode.OK);
// API uses PascalCase JSON (useCamelCaseNaming:false) — set JsonSerializerOptions.PropertyNamingPolicy=null (:41-46)
```

WAF runs the production module so auto data-seeding stays enabled (accepted as lightweight). It uses its own collection `TextSnippetWebAppFactoryCollection` (`:103`). Contrast: the subcutaneous fixture bypasses HTTP and runs in-process CQRS with seeding disabled.

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

ALL assertions use `WaitUntilAsync` polling (default 120s timeout, 100ms interval) for eventual consistency (`src/Platform/Easy.Platform.AutomationTest/IntegrationTests/PlatformIntegrationTestHelper.cs:21,47-67`). Fresh DI scope per poll iteration prevents stale reads.

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

**Base class:** `TextSnippetIntegrationTestBase` at `src/PlatformExampleApp/PlatformExampleApp.IntegrationTests/TextSnippetIntegrationTestBase.cs`

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
- Test data accumulates across runs (no automatic cleanup) — uniqueness-by-guid avoids cross-run collision
- DEFAULT: create test data via the application command path (`ExecuteCommandAsync(new SaveSnippetTextCommand{...})`) — exercises the real use case; DTOs own mapping
- EXCEPTION — direct repository create/update as setup is allowed ONLY when the application command cannot produce the required setup state, and the test docstring MUST cite the specific constraint. Observed valid cases: background/paged jobs need pre-existing rows with controlled IDs + empty `FullText` matching the job filter (`BatchScrollingJobIntegrationTests.cs:63`); `TextSnippetEntityDto` has no `CreatedByUserId` so permission tests seed it directly (`UserContextIntegrationTests.cs:106`); `MapToUpdateExistingEntity` skips `CategoryId` so a CategoryId-changed event needs a direct repo update (`SnippetEntityEventHandlerIntegrationTests.cs:118`). These are idempotent real-repository seeds, NOT business-rule bypasses — never use direct setup to create states the use case forbids.

### Validation-Failure Assertions

PREFER the platform helper `AssertValidationFailsAsync(action, expectedMessageSubstring?)` (`PlatformServiceIntegrationTestBase.cs:370`) — it catches any `IPlatformValidationException` (command-level OR domain-level). The narrower `Assert.ThrowsAsync<PlatformValidationException>` (legacy sites `SaveSnippetTextCommandIntegrationTests.cs:69`, `SaveSnippetCategoryCommandIntegrationTests.cs:64`) can false-negative when validation is enforced at the domain layer — migrate to the helper.

### Entity Event Handler Tests

Assert side-effects on the RELATED entity, not just the source command (`SnippetEntityEventHandlerIntegrationTests.cs`, `[Trait("Category","EventHandler")]`): e.g. updating a snippet's CategoryId should touch the Category's `LastUpdatedDate` (`relatedEntity.LastUpdatedDate.Should().BeAfter(before)`). Handlers run synchronously in tests (`EnableInboxEventBusMessage=false`), so no polling is needed for the same-process side-effect — but cross-process effects still use `WaitUntilAsync`.

## Running Tests

```bash
# Run all integration tests
dotnet test src/PlatformExampleApp/PlatformExampleApp.IntegrationTests/

# Filter by trait — Category values: Authorization, BackgroundJob, Command,
# CrossService, EventHandler, MessageBus, Query, WebAppFactory
# (enumerate current set: grep -rhoE '\[Trait\("Category", *"[^"]+"\)\]' --include='*.cs' .)
dotnet test --filter "Category=Command"
dotnet test --filter "Category=Query"
dotnet test --filter "Category=BackgroundJob"
dotnet test --filter "Category=MessageBus"
dotnet test --filter "Category=Authorization"
dotnet test --filter "Category=EventHandler"
dotnet test --filter "Category=CrossService"
dotnet test --filter "Category=WebAppFactory"

# Run specific test class
dotnet test --filter "FullyQualifiedName~SaveSnippetTextCommandIntegrationTests"

# Trace a spec to its test: each test method carries [Trait("TestSpec","TC-EXAMPLE-NNN")]
dotnet test --filter "TestSpec=TC-EXAMPLE-026"
```

## New Test Quickstart

```csharp
// src/PlatformExampleApp/PlatformExampleApp.IntegrationTests/YourFeature/YourCommandIntegrationTests.cs
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
        // PREFER the platform helper — catches command- OR domain-level validation
        await AssertValidationFailsAsync(
            () => ExecuteCommandAsync(command), "expected message substring");
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

// Paged job — use the isolated paged fixture and assert target-page membership first.
// MUST pass Skip/Take (master mode silently does nothing in tests)
var pagedParam = new PlatformApplicationPagedBackgroundJobParam<DemoPagedParam>
{
    Skip = 0, Take = 200,
    Param = new DemoPagedParam { ProcessingMode = PagedProcessingMode.OptimizeData },
};
await ExecuteBackgroundJobWithParamAsync<DemoPagedBackgroundJobExecutor>(pagedParam);
```

**CRITICAL: DEFAULT path = subcutaneous CQRS through real DI (no HTTP); HTTP-level path = `WebApplicationFactory<Program>` for Autofac-DI services or full-pipeline assertions. MUST extend service-specific test base (subcutaneous). MUST use a `[Collection]` attribute. MUST use `IntegrationTestHelper.UniqueName()`. PREFER `AssertValidationFailsAsync` over raw `Assert.ThrowsAsync<PlatformValidationException>`. Batch/Paged jobs MUST pass explicit params (master mode silently does nothing in tests). Paged tests must isolate their data and prove requested-page membership. Direct repo setup is a documented EXCEPTION — only when the command path cannot produce the state, with a docstring citing the constraint.**
