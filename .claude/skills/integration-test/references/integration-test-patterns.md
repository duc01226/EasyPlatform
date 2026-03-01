# Integration Test Patterns

Canonical patterns for subcutaneous integration tests using the project framework. All use real DI — no mocks.

## Project Pattern Discovery

Before implementation, search your codebase for project-specific patterns:
- Search for: `IntegrationTest`, `TestFixture`, `TestUserContext`, `IntegrationTestBase`
- Look for: existing test projects, test collection definitions, service-specific test base classes

> **MANDATORY IMPORTANT MUST** Plan ToDo Task to READ `integration-test-reference.md` for project-specific patterns and code examples.
> If file not found, continue with search-based discovery above.

> **IMPORTANT:** These patterns use generic `{Service}` placeholders. When generating for a specific service, replace all placeholders with the target service's equivalents. Always read an existing test in the same service first.

> **Prerequisite:** Full backend system must be running before tests execute. Tests use real DB, RabbitMQ, and depend on running API services for cross-service data sync. See `docs/getting-started.md` for local setup instructions.

> **TC annotation:** Each test method requires `// TC-{MOD}-XXX: description` comment + `[Trait("TestSpec", "TC-{MOD}-XXX")]` placed **before** `[Fact]`. Replace `GM` with the module abbreviation from the Module Registry in SKILL.md.

## Pattern 1: Create Command (Save/Upsert)

```csharp
#region
using FluentAssertions;
using {Framework}.Common.Validations.Exceptions; // project validation exceptions namespace
// Add service-specific usings: DTOs, Commands, Entities (copy from existing tests in same service)
#endregion

namespace {Service}.IntegrationTests.{Domain};

[Collection({Service}IntegrationTestCollection.Name)]
[Trait("Category", "Command")]
public class {CommandName}IntegrationTests : {Service}ServiceIntegrationTestBase
{
    // TC-GM-001: Create valid goal — happy path
    [Trait("TestSpec", "TC-GM-001")]
    [Fact]
    public async Task {CommandName}_WhenValidData_ShouldCreateSuccessfully()
    {
        // Arrange
        var userContext = TestUserContextFactory.CreateEmployee();
        var title = IntegrationTestHelper.UniqueName("My Goal");

        var command = new SaveGoalCommand
        {
            Data = new GoalDto
            {
                Title = title,
                Description = "Test description",
                DueTime = DateTime.UtcNow.AddDays(30),
                StartDate = DateTime.UtcNow,
                // ... fill ALL required DTO fields (read command's ValidateRequestAsync to know which)
            },
        };

        // Act
        var result = await ExecuteCommandAsync(command, userContext);

        // Assert — result properties
        result.Should().NotBeNull();
        result.SaveGoal.Title.Should().Be(title);

        // Assert — DB state (WaitUntil-polled, eventual consistency)
        await AssertEntityMatchesAsync<Goal>(result.SaveGoal.Id, goal =>
        {
            goal.Title.Should().Be(title);
        });
    }

    // TC-GM-002: Create goal with empty title — validation failure
    [Trait("TestSpec", "TC-GM-002")]
    [Fact]
    public async Task {CommandName}_WhenInvalidData_ShouldFailValidation()
    {
        // Arrange — deliberately violate a validation rule
        var command = new SaveGoalCommand
        {
            Data = new GoalDto { Title = "" /* invalid */ },
        };

        // Act & Assert
        await Assert.ThrowsAsync<{ValidationException}>(  // see docs/integration-test-reference.md
            () => ExecuteCommandAsync(command));
    }
}
```

**Key points:**
- `IntegrationTestHelper.UniqueName()` for all string fields — prevents collisions across runs
- `TestUserContextFactory.Create*()` for role-based context
- `AssertEntityMatchesAsync<T>` for DB verification (has built-in 5s WaitUntil polling)
- `Assert.ThrowsAsync<ValidationException>` for negative cases (search for: project validation exception class and its namespace)
- Read the command's `ValidateRequestAsync` to know which fields are required and what validation rules to test

## Pattern 2: Update Command (Create then Update)

```csharp
// TC-GM-003: Update existing goal — preserve ID and update fields
[Trait("TestSpec", "TC-GM-003")]
[Fact]
public async Task SaveGoal_WhenUpdatingExisting_ShouldPreserveIdAndUpdateFields()
{
    // Arrange — Create first
    var originalTitle = IntegrationTestHelper.UniqueName("Original");
    var createResult = await ExecuteCommandAsync(new SaveGoalCommand
    {
        Data = new GoalDto
        {
            Title = originalTitle,
            // ... required fields
        },
    });

    var goalId = createResult.SaveGoal.Id;
    var updatedTitle = IntegrationTestHelper.UniqueName("Updated");

    // Act — Update with same ID
    var updateResult = await ExecuteCommandAsync(new SaveGoalCommand
    {
        Data = new GoalDto
        {
            Id = goalId,
            Title = updatedTitle,
            // ... required fields
        },
    });

    // Assert
    updateResult.SaveGoal.Id.Should().Be(goalId);
    updateResult.SaveGoal.Title.Should().Be(updatedTitle);

    await AssertEntityMatchesAsync<Goal>(goalId, goal =>
    {
        goal.Title.Should().Be(updatedTitle);
    });
}
```

## Pattern 3: Delete Command

```csharp
[Collection({Service}IntegrationTestCollection.Name)]
[Trait("Category", "Command")]
public class DeleteGoalCommandIntegrationTests : {Service}ServiceIntegrationTestBase
{
    // TC-GM-004: Delete existing goal — removes from database
    [Trait("TestSpec", "TC-GM-004")]
    [Fact]
    public async Task DeleteGoal_WhenExists_ShouldDeleteFromDatabase()
    {
        // Arrange — Create entity first
        var createResult = await ExecuteCommandAsync(new SaveGoalCommand
        {
            Data = new GoalDto
            {
                Title = IntegrationTestHelper.UniqueName("Goal to delete"),
                // ... required fields
            },
        });
        var goalId = createResult.SaveGoal.Id;

        // Act
        await ExecuteCommandAsync(new DeleteGoalCommand { Ids = [goalId] });

        // Assert — entity removed from DB
        await AssertEntityDeletedAsync<Goal>(goalId);
    }
}
```

## Pattern 4: Query

```csharp
[Collection({Service}IntegrationTestCollection.Name)]
[Trait("Category", "Query")]
public class GetGoalListQueryIntegrationTests : {Service}ServiceIntegrationTestBase
{
    // TC-GM-005: Query goals with filter — returns paged results
    [Trait("TestSpec", "TC-GM-005")]
    [Fact]
    public async Task GetGoalList_WhenFiltering_ShouldReturnPagedResults()
    {
        // Arrange
        var query = new GetGoalListQuery
        {
            ViewType = GoalViewType.MyGoals,
            Statuses = [GoalStatuses.NotStarted],
            SkipCount = 0,
            MaxResultCount = 10,
        };

        // Act
        var result = await ExecuteQueryAsync(query);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().NotBeNull();
        result.TotalCount.Should().BeGreaterThanOrEqualTo(0);
        result.PageSize.Should().Be(10);
    }

    // TC-GM-006: Create then query — new goal appears in results
    [Trait("TestSpec", "TC-GM-006")]
    [Fact]
    public async Task GetGoalList_WhenCreateThenQuery_ShouldIncludeNewGoal()
    {
        // Arrange — Create entity with unique searchable field
        var title = IntegrationTestHelper.UniqueName("Queryable Goal");
        await ExecuteCommandAsync(new SaveGoalCommand
        {
            Data = new GoalDto
            {
                Title = title,
                DueTime = DateTime.UtcNow.AddDays(30),
                StartDate = DateTime.UtcNow,
                GoalType = GoalTypes.Smart,
                Status = GoalStatuses.NotStarted,
                VisibilityType = GoalVisibilityTypes.Public,
                TargetType = TargetTypes.Individual,
                OwnerEmployeeIds = [],
                TargetEmployeeIds = [],
            },
        });

        // Act — Query with search text matching the unique title
        var result = await ExecuteQueryAsync(new GetGoalListQuery
        {
            ViewType = GoalViewType.MyGoals,
            SearchText = title,
            SkipCount = 0,
            MaxResultCount = 10,
        });

        // Assert — newly created entity appears in results
        result.Items.Should().Contain(g => g.Title == title);
    }
}
```

## Pattern 5: Cross-Service Test

Cross-service tests verify message bus flows between two independently booted service modules. Uses `{CrossServiceFixtureBase}` to compose fixtures (see docs/integration-test-reference.md).

```csharp
#region
using {SourceService}.Commands.UserCommands.Create;
using {Project}.Shared.Application.DataSeeders.Constants;
using {Framework}.AutomationTest.IntegrationTests; // project test infrastructure namespace
using FluentAssertions;
using {Service}.Domain.Entities;
using {Service}.Domain.Repositories;
using Microsoft.Extensions.DependencyInjection;
#endregion

namespace {Project}.CrossService.IntegrationTests.{SourceService}To{TargetService};

[Collection(CrossServiceIntegrationTestCollection.Name)]
public class UserSyncCrossServiceTests : CrossServiceTestBase
{
    public UserSyncCrossServiceTests(CrossServiceFixture fixture) : base(fixture) { }

    [Fact]
    public async Task CreateUser_InSourceService_ShouldSyncUserToTargetService()
    {
        // Arrange
        var email = IntegrationTestHelper.UniqueEmail("sync-test");

        // Act: Execute handler on source service ServiceProvider
        var result = await ExecuteOnSourceServiceAsync(async sp =>
        {
            var handler = sp.GetRequiredService<CreateUserCommandHandler>();
            return await handler.ExecuteAsync(new CreateUserCommand
            {
                EmailAddress = email,
                Username = email,
                FirstName = "CrossService",
                LastName = "SyncTest",
                Password = "TestPass123!",
                IsActive = true,
                IsSendConfirmationEmail = false,
                OrganizationalUnitIds = [SeedData.RootOrganization.Id],
                Roles = ["Employee"]
            });
        });

        // Assert: Target service DB eventually has synced User (message bus → consumer)
        await AssertTargetServiceEventuallyAsync(async sp =>
        {
            var userRepo = sp.GetRequiredService<I{Service}RootRepository<User>>();
            var growthUser = await userRepo.FirstOrDefaultAsync(u => u.Id == result.User.Id);
            growthUser.Should().NotBeNull();
            growthUser!.Email.Should().Be(email);
        });
    }
}
```

**Key points:**
- `CrossServiceTestBase` provides `ExecuteOnSourceServiceAsync` (scoped DI on source service SP) and `AssertTargetServiceEventuallyAsync` (WaitUntil polling on target service DB)
- Test verifies the full async flow: source service command → entity event → RabbitMQ → target service consumer → target service DB
- Default eventual-consistency timeout: 30s (cross-service has higher latency than single-service)
- `CrossServiceFixture` extends `{CrossServiceFixtureBase}` — boots both services in-process (see docs/integration-test-reference.md)

## Pattern 6: Fixture Setup

Each service needs a Fixture + Collection pair. The fixture boots the service module, seeds data, and exposes `ServiceProvider`.

### Single-Service Fixture

```csharp
using {Framework}.AutomationTest.IntegrationTests; // project test infrastructure namespace
using {Service}.Service;

namespace {Service}.IntegrationTests;

public class {Service}IntegrationTestFixture
    : {ServiceTestFixtureBase}<{Service}ApiAspNetCoreModule>  // see docs/integration-test-reference.md
{
    private readonly {Service}IntegrationTestDataSeeder dataSeeder = new();

    protected override async Task SeedDataAsync(IServiceProvider serviceProvider)
    {
        await dataSeeder.SeedAsync(serviceProvider);
    }

    public override string FallbackAspCoreEnvironmentValue() => "Development";
}

[CollectionDefinition(Name)]
public class {Service}IntegrationTestCollection
    : ICollectionFixture<{Service}IntegrationTestFixture>
{
    public const string Name = "{Service} Integration Tests";
}
```

### Cross-Service Fixture

```csharp
using {Framework}.AutomationTest.IntegrationTests; // project test infrastructure namespace

namespace {Project}.CrossService.IntegrationTests;

public class CrossServiceFixture : {CrossServiceFixtureBase}  // see docs/integration-test-reference.md
{
    // Order matters: foundational services first (auth service seeds users)
    protected override IReadOnlyList<Type> GetFixtureTypes()
        => [typeof(CrossService{SourceService}Fixture), typeof(CrossService{Service}Fixture)];

    public IServiceProvider {SourceService}ServiceProvider
        => GetFixture<CrossService{SourceService}Fixture>().ServiceProvider;

    public IServiceProvider {Service}ServiceProvider
        => GetFixture<CrossService{Service}Fixture>().ServiceProvider;
}

// Each service gets its own fixture with explicit config override
public class CrossService{Service}Fixture : {Service}IntegrationTestFixture
{
    protected override IConfiguration BuildConfiguration()
    {
        return new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.{Service}.json", optional: false)
            .AddEnvironmentVariables()
            .Build();
    }
}
```

**Key points:**
- `{ServiceTestFixtureBase}<T>` handles: DI setup, module initialization (same as production `InitializeAsync()`), data seeding, teardown
- Cross-service fixtures override `BuildConfiguration()` to load service-specific config files — prevents collision when multiple modules boot in same process
- `GetFixtureTypes()` order = initialization order. Place the auth/identity service before dependent services.
- `{CrossServiceFixtureBase}` validates all types extend `{ServiceTestFixtureBase}<T>` at construction time

## Pattern 7: Data Seeder

Two-level seeding pattern: Layer 1 (production) runs during `module.InitializeAsync()`, Layer 2 (test-specific) runs in `SeedDataAsync()`.

### Service-Specific Test Data Seeder (Layer 2)

```csharp
using {Framework}.AutomationTest.IntegrationTests; // project test infrastructure namespace
using {Service}.Domain.Entities;
using {Service}.Domain.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace {Service}.IntegrationTests;

public class {Service}IntegrationTestDataSeeder : {IntegrationTestDataSeederBase}  // see docs/integration-test-reference.md
{
    public const string TestFormTemplateCode = "INTTEST-PR-TEMPLATE";

    public override async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var sp = scope.ServiceProvider;

        await SeedFormTemplateAsync(sp);
        // ... add more seed methods as needed
    }

    /// <summary>
    /// Idempotent: FirstOrDefault + create-if-missing. No teardown needed.
    /// </summary>
    private static async Task SeedFormTemplateAsync(IServiceProvider sp)
    {
        var repo = sp.GetRequiredService<I{Service}RootRepository<FormTemplate>>();

        var existing = await repo.FirstOrDefaultAsync(t => t.Code == TestFormTemplateCode);
        if (existing != null) return;

        await repo.CreateAsync(new FormTemplate
        {
            Id = Ulid.NewUlid().ToString(),
            Name = "IntTest Template",
            Code = TestFormTemplateCode,
            Status = FormTemplateStatus.Published,
            CompanyId = SeedData.RootOrganization.Id,
        });
    }
}
```

**Key points:**
- **Layer 1 — `{ApplicationDataSeeder}`**: Production-like data (admin user, orgs, departments). Runs during `module.InitializeAsync()` → registered in service module. Test project inherits this automatically.
- **Layer 2 — `{IntegrationTestDataSeederBase}`**: Test-specific reference data (templates, request types, settings). Runs in `SeedDataAsync()` after module init.
- **Idempotent pattern**: `FirstOrDefault(match) → if null, Create`. No teardown — data accumulates across runs.
- Expose constants (`TestFormTemplateCode`) so tests reference seeded data deterministically.
- Use `SeedData.RootOrganization.Id` for CompanyId — shared constant from `{Project}.Shared.Application`. Search your codebase for the actual seed data class name.

## Service Base Class Template

Each service needs a TestBase that wires up request context and repository resolution.

```csharp
using {Project}.Shared.IntegrationTest;
using {Framework}.Application.RequestContext; // project request context namespace
using {Framework}.AutomationTest.IntegrationTests; // project test infrastructure namespace
using {Service}.Domain.Repositories;
using {Service}.Service;
using Microsoft.Extensions.DependencyInjection;

namespace {Service}.IntegrationTests;

public abstract class {Service}ServiceIntegrationTestBase
    : {ServiceTestWithAssertionsBase}<{Service}ApiAspNetCoreModule>  // see docs/integration-test-reference.md
{
    /// <summary>
    /// Wire up service-specific repository for AssertEntity* methods.
    /// </summary>
    protected override {Framework}.Domain.Repositories.IRepository<TEntity, string> // project repository interface
        ResolveRepository<TEntity>(IServiceProvider sp)
        => sp.GetRequiredService<I{Service}RootRepository<TEntity>>();

    /// <summary>
    /// Populate request context from TestUserContext (roles, company, departments).
    /// null context → admin fallback.
    /// </summary>
    protected override async Task BeforeExecuteAnyAsync(
        IApplicationRequestContextAccessor requestContextAccessor, // project request context accessor
        object? userContext = null,
        CancellationToken cancellationToken = default)
    {
        var testContext = userContext switch
        {
            null => null,
            TestUserContext tc => tc,
            _ => throw new ArgumentException(
                $"Expected TestUserContext but got {userContext.GetType().Name}.")
        };
        await requestContextAccessor.Current.PopulateFromTestUserContext(testContext, Configuration);
    }
}
```

**Key points:**
- Extends `{ServiceTestWithAssertionsBase}` to get `AssertEntityMatchesAsync`, `AssertEntityDeletedAsync` etc.
- `ResolveRepository<TEntity>` returns the service-specific repository interface
- `BeforeExecuteAnyAsync` is called before every `ExecuteCommandAsync`, `ExecuteQueryAsync`, `ExecuteWithServicesAsync`
- Add domain-specific helpers (e.g., `CreateCheckInAsync`, `GetRequestTypeAsync`) as `protected` methods on this base class

## New Service Bootstrap Checklist

Step-by-step to add integration tests to a new service:

### 1. Create Test Project

```
src/Services/{ServiceName}/{ServiceName}.IntegrationTests/
├── {ServiceName}.IntegrationTests.csproj
├── appsettings.json
├── appsettings.Development.json
├── GlobalUsings.cs
├── {ServiceName}IntegrationTestFixture.cs
├── {ServiceName}ServiceIntegrationTestBase.cs
├── IntegrationTestDataSeeder.cs      # if service needs test-specific seed data
└── {Domain}/
    └── {CommandName}IntegrationTests.cs
```

### 2. Project File (.csproj)

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="..." />
    <PackageReference Include="xunit" Version="..." />
    <PackageReference Include="xunit.runner.visualstudio" Version="..." />
    <PackageReference Include="FluentAssertions" Version="..." />
  </ItemGroup>
  <ItemGroup>
    <!-- Service's API project (registers all DI) -->
    <ProjectReference Include="..\{ServiceName}.Service\{ServiceName}.Service.csproj" />
    <!-- Project test infrastructure -->
    <ProjectReference Include="..\..\{Framework}\{Framework}.AutomationTest\{Framework}.AutomationTest.csproj" />
    <!-- Project shared test utilities -->
    <ProjectReference Include="..\_SharedCommon\{Project}.Shared.IntegrationTest\{Project}.Shared.IntegrationTest.csproj" />
  </ItemGroup>
  <ItemGroup>
    <Content Include="appsettings*.json" CopyToOutputDirectory="PreserveNewest" />
  </ItemGroup>
</Project>
```

### 3. GlobalUsings.cs

```csharp
global using Xunit;
// Alias platform helper for cleaner test code
global using IntegrationTestHelper = {Framework}.AutomationTest.IntegrationTests.IntegrationTestHelper; // project test helper alias
```

### 4. appsettings.json

Copy from the service's `appsettings.Development.json` and adjust:
- Connection strings pointing to local infrastructure (MongoDB, PostgreSQL, RabbitMQ)
- Same ports as service's local dev config
- Ensure database names don't conflict with production

### 5. Create Fixture, TestBase, DataSeeder

Use Pattern 6 (Fixture), Service Base Class Template, and Pattern 7 (Data Seeder) above.

### 6. Write First Test

Use Pattern 1 (Create Command) as starting point. Run with `dotnet test`.

### 7. Add to Solution

```bash
dotnet sln {SolutionName}.sln add src/Services/{ServiceName}/{ServiceName}.IntegrationTests/{ServiceName}.IntegrationTests.csproj
```

## Common Helpers Available

### Single-Service Helpers (from project integration test base class)

| Method                                       | Purpose                                                |
| -------------------------------------------- | ------------------------------------------------------ |
| `ExecuteCommandAsync(command, userContext?)` | Execute CQRS command with scoped DI + request context  |
| `ExecuteQueryAsync(query, userContext?)`     | Execute CQRS query with scoped DI + request context    |
| `ExecuteWithServicesAsync(sp => ...)`        | Direct DI access (repo, services) with request context |
| `GetServiceAsync<T>(userContext?)`           | Resolve a service from DI (Singleton/Transient only)   |
| `AssertValidationFailsAsync(action, msg?)`   | Assert command throws `{ValidationException}`   |

### Database Assertion Helpers (from `{ServiceTestWithAssertionsBase}<T>`)

| Method                                        | Purpose                                             |
| --------------------------------------------- | --------------------------------------------------- |
| `AssertEntityExistsAsync<T>(id)`              | Verify entity in DB (WaitUntil polling, 5s default) |
| `AssertEntityMatchesAsync<T>(id, assertions)` | Verify entity fields match (WaitUntil polling)      |
| `AssertEntityDeletedAsync<T>(id)`             | Verify entity removed from DB (WaitUntil polling)   |

### Cross-Service Helpers (from `CrossServiceTestBase`)

| Method                                          | Purpose                                                |
| ----------------------------------------------- | ------------------------------------------------------ |
| `ExecuteOnSourceServiceAsync(sp => ...)`        | Scoped execution on source service ServiceProvider     |
| `AssertTargetServiceEventuallyAsync(sp => ...)` | WaitUntil assertion on target service DB (30s timeout) |
| `Fixture.{SourceService}ServiceProvider`        | Direct access to source service DI container           |
| `Fixture.{Service}ServiceProvider`              | Direct access to target service DI container           |

### Utility Helpers (from project integration test helper)

| Method                                              | Purpose                                            |
| --------------------------------------------------- | -------------------------------------------------- |
| `IntegrationTestHelper.UniqueName("prefix")`        | `"prefix_{8-char-guid}"` for unique entity names   |
| `IntegrationTestHelper.UniqueId()`                  | 12-char unique ID                                  |
| `IntegrationTestHelper.UniqueEmail("prefix")`       | `"prefix_{8-char-guid}@test.local"`                |
| `IntegrationTestHelper.WaitUntilAsync(condition)`   | Poll condition with timeout (eventual consistency) |

### User Context Helpers (from `TestUserContextFactory`)

| Method                                             | Purpose                         |
| -------------------------------------------------- | ------------------------------- |
| `TestUserContextFactory.CreateEmployee()`          | Employee role context           |
| `TestUserContextFactory.CreateAdminUser()`         | Admin role context              |
| `TestUserContextFactory.CreateHrManager()`         | HR Manager role context         |
| `TestUserContextFactory.CreateCompanyContext(id?)` | Admin context scoped to company |
