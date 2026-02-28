# Integration Test Reference

> **Companion doc for generic skills.** Contains project-specific test base classes, fixtures, module abbreviations, and test user context factories. Generic skills reference this file via "MUST READ `integration-test-reference.md`".

## BravoSUITE Test Architecture (3-Layer Stack)

```
Platform (Easy.Platform.AutomationTest)     ← Generic, reusable across any project
  ├─ PlatformServiceIntegrationTestFixture<TModule>   xUnit fixture: DI bootstrap + module init + seeding
  ├─ PlatformServiceIntegrationTestBase<TModule>      Test base: Execute*, BeforeExecute*, static SP
  ├─ PlatformServiceIntegrationTestWithAssertions<T>  Adds AssertEntity* helpers
  ├─ PlatformCrossServiceFixture                      Composes N service fixtures
  ├─ PlatformIntegrationTestHelper                    Static: UniqueName, UniqueId, UniqueEmail
  ├─ PlatformAssertDatabaseState                      Static: EntityExistsAsync, EntityMatchesAsync
  └─ PlatformIntegrationTestDataSeeder                Abstract: idempotent SeedAsync contract

Shared (Bravo.Shared.IntegrationTest)       ← BravoSUITE-specific, shared across services
  ├─ BravoTestUserContext                             POCO: Roles, OrgUnitRoles, CompanyId, UserId
  ├─ BravoTestUserContextFactory                      Static: CreateEmployee, CreateAdminUser, CreateHrManager
  └─ PopulateTestUserContextIntoRequestContextExtensions

Service (e.g., Growth.IntegrationTests)     ← Domain-specific test project
  ├─ GrowthIntegrationTestFixture                     Boots GrowthApiAspNetCoreModule, seeds data
  ├─ GrowthServiceIntegrationTestBase                 ResolveRepository → IGrowthRootRepository<T>
  └─ GrowthIntegrationTestDataSeeder                  Seeds FormTemplate, RequestTypes, KudosCompanySetting
```

## Growth POC Test Structure (Reference Implementation)

```
src/Services/bravoGROWTH/Growth.IntegrationTests/
├── GrowthIntegrationTestFixture.cs
├── GrowthIntegrationTestCollection.cs
├── GrowthServiceIntegrationTestBase.cs
├── GrowthIntegrationTestDataSeeder.cs
├── GlobalUsings.cs
├── Startup.cs
├── appsettings.json
├── appsettings.Development.json
└── Tests/
    ├── Goals/
    │   └── GoalCommandIntegrationTests.cs
    ├── Kudos/
    │   └── KudosCommandIntegrationTests.cs
    ├── CheckIns/
    │   └── CheckInCommandIntegrationTests.cs
    └── BackgroundJobs/
        └── BackgroundJobIntegrationTests.cs
```

## Service-Specific Test Setup Patterns

### Single-Service Test

```csharp
// 1. Fixture
public class GrowthIntegrationTestFixture
    : PlatformServiceIntegrationTestFixture<GrowthApiAspNetCoreModule>
{
    public override string FallbackAspCoreEnvironmentValue() => "Development";
    protected override Task SeedDataAsync(IServiceProvider sp)
        => new GrowthIntegrationTestDataSeeder().SeedAsync(sp);
}

// 2. Collection
[CollectionDefinition(Name)]
public class GrowthIntegrationTestCollection : ICollectionFixture<GrowthIntegrationTestFixture>
{ public const string Name = "Growth Integration Tests"; }

// 3. Test base with service-specific repo
public class GrowthServiceIntegrationTestBase
    : PlatformServiceIntegrationTestWithAssertions<GrowthApiAspNetCoreModule>
{
    protected override IPlatformRepository<TEntity, string> ResolveRepository<TEntity>(IServiceProvider sp)
        => sp.GetRequiredService<IGrowthRootRepository<TEntity>>();
}

// 4. Test class
[Collection(GrowthIntegrationTestCollection.Name)]
public class GoalCommandIntegrationTests : GrowthServiceIntegrationTestBase
{
    [Fact]
    public async Task SaveGoal_WhenValid_ShouldCreate()
    {
        var result = await ExecuteCommandAsync(new SaveGoalCommand { ... },
            BravoTestUserContextFactory.CreateEmployee());
        await AssertEntityMatchesAsync<Goal>(result.Id, g => g.Title.Should().Be(expected));
    }
}
```

## Test User Context Factory

```csharp
// Available factory methods
BravoTestUserContextFactory.CreateEmployee()        // Standard employee
BravoTestUserContextFactory.CreateAdminUser()        // Admin role
BravoTestUserContextFactory.CreateHrManager()        // HR manager
BravoTestUserContextFactory.CreateCompanyAdmin()     // Company admin
```

## Module Abbreviation Registry

| 2-Letter | 3-Letter | Feature | Service |
|---|---|---|---|
| GM | GOL | Goals | bravoGROWTH |
| CI | CHK | CheckIns | bravoGROWTH |
| PR | REV | PerformanceReviews | bravoGROWTH |
| TM | — | TimeManagement | bravoGROWTH |
| FT | — | FormTemplates | bravoGROWTH |
| KD | KUD | Kudos | bravoGROWTH |
| BG | — | BackgroundJobs | bravoGROWTH |

## Test appsettings.json Template

Key configuration for integration tests (copy from Growth POC and adjust):

```json
{
  "ConnectionStrings": {
    "Default": "mongodb://root:rootPassXXX@127.0.0.1:27017/{ServiceDb}?authSource=admin"
  },
  "RabbitMQ": {
    "Host": "127.0.0.1",
    "Port": 5672,
    "Username": "guest",
    "Password": "guest"
  },
  "Redis": {
    "ConnectionString": "127.0.0.1:6379"
  },
  "SeedAutomationTestingData": true
}
```

## New Service Bootstrap Checklist

1. Create `{Service}.IntegrationTests` project referencing `.Service` + `Easy.Platform.AutomationTest` + `Bravo.Shared.IntegrationTest`
2. Create `{Service}IntegrationTestFixture : PlatformServiceIntegrationTestFixture<{Service}ApiAspNetCoreModule>`
3. Create `{Service}ServiceIntegrationTestBase : PlatformServiceIntegrationTestWithAssertions<{Service}ApiAspNetCoreModule>` with `ResolveRepository` returning service-specific repo
4. Create `{Service}IntegrationTestDataSeeder : PlatformIntegrationTestDataSeeder`
5. Add `appsettings.json` + `appsettings.Development.json`
6. Add `GlobalUsings.cs` and `Startup.cs`

> Full code templates: `.claude/skills/integration-test/references/integration-test-patterns.md`
