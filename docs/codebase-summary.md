# BravoSUITE Codebase Summary

> Comprehensive overview of the BravoSUITE microservices architecture and key components

**Generated**: 2025-01-10
**Last Updated**: 2025-01-10

---

## Quick Reference

### Technology Stack

| Layer              | Technologies                                       |
| ------------------ | -------------------------------------------------- |
| **Backend**        | .NET 9, ASP.NET Core, Entity Framework Core        |
| **Frontend (v1)**  | Angular 18, MVC Views, jQuery                      |
| **Frontend (v2)**  | Angular 19, RxJS, NgRx-inspired patterns           |
| **Architecture**   | Microservices, CQRS, Event-Driven, DDD            |
| **Messaging**      | RabbitMQ, Message Bus patterns                     |
| **Databases**      | SQL Server, PostgreSQL, MongoDB, Redis             |
| **Cloud**          | Azure (Storage, App Service), Cloudflare Workers   |

### Project Structure

```
D:\GitSources\BravoSuite
├── src/
│   ├── Services/                    # Microservices
│   │   ├── bravoTALENTS/            # Talent Management
│   │   ├── bravoGROWTH/             # Performance & Goals
│   │   ├── bravoSURVEYS/            # Survey Management (LearningPlatform)
│   │   └── ... (other services)
│   │
│   ├── WebV2/                       # Modern Angular 19 apps
│   │   ├── apps/                    # Feature apps
│   │   │   ├── growth-for-company/
│   │   │   ├── employee-app/
│   │   │   └── ... (other apps)
│   │   │
│   │   └── libs/                    # Shared libraries
│   │       ├── platform-core/       # Framework core
│   │       ├── bravo-common/        # Shared UI components
│   │       └── bravo-domain/        # API services
│   │
│   ├── Web/                         # Legacy Angular apps
│   │   ├── bravoSURVEYSClient/      # Survey designer (Angular 18)
│   │   └── ... (legacy apps)
│   │
│   └── Platform/                    # Framework libraries
│       └── Easy.Platform/           # Core platform
│
├── docs/                            # Documentation
│   ├── business-features/           # Feature documentation
│   │   ├── bravoTALENTS/
│   │   ├── bravoGROWTH/
│   │   ├── bravoSURVEYS/
│   │   └── ... (module docs)
│   │
│   └── design-system/               # UI design tokens
│
├── BravoSUITE.sln                   # Solution file (.NET)
├── CLAUDE.md                        # AI agent instructions
└── README.md                        # Project overview
```

---

## Key Microservices

### bravoSURVEYS Service (LearningPlatform)

**Purpose**: Survey design, management, and execution

**Location**: `src/Services/bravoSURVEYS/`

**Projects**:
- `LearningPlatform.Domain/` - Domain entities and business logic
- `LearningPlatform.Application/` - Application services and DTOs
- `LearningPlatform.Surveys/` - ASP.NET Core API
- `LearningPlatform.Data/` - Data access layer

**Key Entities**:
- `Survey` - Main survey aggregate
- `PageDefinition` - Survey pages
- `QuestionDefinition` - 28+ question types
- `Respondent` - Survey respondents
- `SurveySettings` - Survey configuration
- `SkipCommand` - Conditional logic

**Key Services**:
- `SurveyAppService` - Survey execution
- `PageDefinitionAppService` - Page management
- `QuestionDefinitionAppService` - Question management
- `PagePreviewAppService` - Preview rendering
- `LookAndFeelAppService` - Theme/layout

**Controllers**:
- `SurveyController` - Survey execution (legacy MVC)
- RESTful APIs for design operations

### bravoTALENTS Service

**Purpose**: Employee management, recruitment, onboarding

**Location**: `src/Services/bravoTALENTS/`

**Key Features**:
- Employee data management
- Recruitment pipeline
- Job board integration
- Onboarding workflows

### bravoGROWTH Service

**Purpose**: Goal management, performance reviews, check-ins

**Location**: `src/Services/bravoGROWTH/`

**Key Features**:
- OKR and SMART goal management
- Performance reviews
- Check-in tracking
- Goal dashboards and analytics

---

## Architecture Patterns

### Clean Architecture Layers

```
Presentation Layer (Controllers, ViewModels)
         ↓
Application Layer (Services, Commands, Queries)
         ↓
Domain Layer (Entities, Value Objects, Services)
         ↓
Infrastructure Layer (Repositories, DbContexts)
```

### CQRS Pattern

**Commands**: State-changing operations
- `SaveGoalCommand`
- `CreateRespondentsForSurveyCommand`
- Handled by `PlatformCqrsCommandApplicationHandler<TCommand, TResult>`

**Queries**: Read-only operations
- `GetGoalListQuery`
- `GetUsersForSurveyAccessRightQuery`
- Handled by `PlatformCqrsQueryApplicationHandler<TQuery, TResult>`

### Entity-Driven Design

**Base Classes**:
- `RootEntity<TEntity, TKey>` - Aggregate root
- `RootAuditedEntity<TEntity, TKey, TUser>` - Audited root
- `ISoftDeleteEntity<T>` - Soft delete support

**Key Patterns**:
- Static expressions for querying
- Navigation property loading via repositories
- Field change tracking with domain events

### Service Layer Architecture

```
AppService (High-level operations)
    ↓
Domain Service (Business logic)
    ↓
Repository (Data access)
```

**Example**: `PageDefinitionAppService.CreatePage()` → `InsertPageService` → `INodeRepository`

### Event-Driven Architecture

**Entity Events**:
- `OnCreated`, `OnUpdated`, `OnDeleted`
- Handled by `PlatformCqrsEntityEventApplicationHandler<TEntity>`
- Examples: Email notifications on survey publish, respondent completion

**Message Bus Events**:
- Cross-service communication
- Consumers: `PlatformApplicationMessageBusConsumer<TMessage>`
- Examples: Respondent sync to Insights, distribution triggers

---

## Frontend Architecture

### WebV2 (Angular 19) - Modern Stack

**Location**: `src/WebV2/`

**Structure**:
```
libs/
├── platform-core/          # Framework core
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/ # Base components (PlatformComponent, etc.)
│   │   │   ├── directives/ # Platform directives
│   │   │   └── services/   # Core services
│   │   └── index.ts
│   └── package.json
│
├── bravo-common/           # Shared UI components
│   ├── bravo-select/       # Custom select component
│   ├── bravo-data-table/   # Data table component
│   └── ... (other components)
│
└── bravo-domain/           # Business domain
    ├── src/
    │   ├── {module}/
    │   │   ├── api-services/
    │   │   │   └── *-api.service.ts
    │   │   ├── domain-models/
    │   │   │   └── *.model.ts
    │   │   ├── stores/      # State management
    │   │   └── types/
    │   │
    │   ├── growth/         # Growth app domain
    │   ├── talents/        # Talents app domain
    │   └── surveys/        # Surveys domain
    │
    └── public-api.ts

apps/
├── growth-for-company/     # HR manager app
│   ├── src/
│   │   ├── app/
│   │   │   ├── goal-management/
│   │   │   ├── employee-dashboard/
│   │   │   └── ... (features)
│   │   │
│   │   ├── styles/
│   │   └── main.ts
│   │
│   └── project.json
│
├── employee-app/           # Employee self-service
└── ... (other apps)
```

**Platform Components**:
- `PlatformComponent` - Base with state management
- `PlatformVmComponent<T>` - ViewModel support
- `PlatformVmStoreComponent<TVM, TStore>` - Store-based
- `PlatformFormComponent<T>` - Form handling
- `PlatformApiService` - HTTP client base

**State Management Patterns**:
- Custom signals with `WritableSignal<T>`
- Effects with `effectSimple()`, `effect()`
- Selectors via `select()`
- Store extends `PlatformVmStore<TViewModel>`

**Styling**:
- MUI v7 with Angular integration
- SCSS with BEM naming
- Design tokens in `design-system/`

### Web (Legacy Angular 18)

**Location**: `src/Web/`

**Key Apps**:
- `bravoSURVEYSClient/` - Survey designer and respondent portal
- `bravoTALENTSClient/` - Talent management portal

**Architecture**:
- Traditional component-based
- RxJS Observables for state
- HTTP calls via services
- MVC-style template rendering

---

## Core Framework (Easy.Platform)

**Location**: `src/Platform/Easy.Platform/`

### Base Classes

**PlatformCqrsCommand<TResult>**:
```csharp
public abstract class PlatformCqrsCommand<TResult> : IPlatformCqrsRequest
{
    public abstract PlatformValidationResult<IPlatformCqrsRequest> Validate();
}
```

**PlatformCqrsCommandApplicationHandler<TCommand, TResult>**:
```csharp
public abstract class PlatformCqrsCommandApplicationHandler<TCommand, TResult>
    where TCommand : PlatformCqrsCommand<TResult>
{
    protected abstract Task<TResult> HandleAsync(TCommand req, CancellationToken ct);
}
```

**PlatformCqrsQuery<TResult>**:
```csharp
public abstract class PlatformCqrsQuery<TResult> : IPlatformCqrsRequest
{
    public abstract PlatformValidationResult<IPlatformCqrsRequest> Validate();
}
```

### Validation Pattern

```csharp
// Fluent validation API
return base.Validate()
    .And(_ => Name.IsNotNullOrEmpty(), "Name required")
    .AndAsync(r => repo.AnyAsync(e => e.Id == r.Id), "Not found")
    .Of<IPlatformCqrsRequest>();
```

### Repository Pattern

```csharp
// Service-specific repositories
IGrowthRootRepository<Employee>
ICandidatePlatformRootRepository<Employee>
ISurveysPlatformRootRepository<Survey>

// Methods
GetByIdAsync(id, ct, loadRelatedEntities: e => e.Department)
GetAllAsync(expr, ct)
CreateAsync(entity, ct)
UpdateAsync(entity, ct)
DeleteAsync(id, ct)
```

### Navigation Property Loading

```csharp
// Via repository
var employee = await repo.GetByIdAsync(id, ct,
    loadRelatedEntities: e => e.Department!.ParentDepartment!);

// Reverse navigation
var parent = await repo.GetByIdAsync(id, ct,
    loadRelatedEntities: p => p.ChildDepartments!.Where(c => c.IsActive));

// Manual loading
await employee.LoadNavigationAsync(e => e.Department, ct);
```

---

## Data Access Patterns

### Entity Framework Core

**DbContext per Microservice**:
- `GrowthDbContext` - bravoGROWTH data
- `CandidateDbContext` - bravoTALENTS candidate data
- `ResponsesContext` - bravoSURVEYS respondent responses
- `SurveyDesignDbContext` - bravoSURVEYS survey structure

**Configuration**:
```csharp
protected override void OnModelCreating(ModelBuilder mb)
{
    mb.ApplyConfigurationsFromAssembly(typeof(DbContext).Assembly);
}
```

### Migrations

**EF Core Migrations**:
```bash
dotnet ef migrations add MigrationName --project [ProjectName]
dotnet ef database update --project [ProjectName]
```

**Custom Data Migrations**:
```csharp
public class MigrateData : PlatformDataMigrationExecutor<DbContext>
{
    public override async Task Execute(DbContext dbContext)
    {
        // Custom migration logic
    }
}
```

### MongoDB Support

**Repository Pattern**:
```csharp
public interface IRepository<TEntity, TKey> : IQueryable<TEntity>
{
    Task CreateAsync(TEntity entity);
    Task UpdateAsync(TEntity entity);
    Task DeleteAsync(TKey id);
}
```

---

## Testing Architecture

### Test Projects

```
[ProjectName].Tests/
├── Unit/
│   ├── Domain/         # Entity and service tests
│   ├── Application/    # CQRS command/query tests
│   └── Infrastructure/ # Repository tests
│
└── Integration/        # Database and service integration tests
```

### Test Patterns

**Fixture-Based Tests**:
- DatabaseFixture for test databases
- ServiceFixture for DI container setup

**CQRS Testing**:
```csharp
// Command test
var cmd = new SaveGoalCommand { /* ... */ };
var result = await handler.Handle(cmd, CancellationToken.None);
Assert.NotNull(result.Goal);

// Query test
var query = new GetGoalListQuery { /* ... */ };
var result = await handler.Handle(query, CancellationToken.None);
Assert.NotEmpty(result.Goals);
```

---

## Common Workflows

### Adding a New Feature

1. **Domain Layer**: Define entity, value objects, services
2. **Application Layer**: Create Command/Query + Handler, DTOs
3. **Infrastructure**: Add repository methods, DbContext mappings
4. **Presentation**: Add controller endpoint
5. **Frontend**: Create UI component, API service
6. **Tests**: Add unit and integration tests

### Adding API Endpoint

```csharp
[HttpPost("save")]
public async Task<IActionResult> Save([FromBody] SaveGoalCommand cmd)
{
    var result = await Cqrs.SendAsync(cmd);
    return Ok(result);
}
```

### Adding Database Migration

```bash
dotnet ef migrations add AddGoalNotes --project bravoGROWTH.Service
dotnet ef database update --project bravoGROWTH.Service
```

### Adding Frontend Component

```typescript
@Component({
  selector: 'app-goal-list',
  template: `...`,
  providers: [GoalStore]
})
export class GoalListComponent extends AppBaseVmStoreComponent<GoalListVm, GoalStore> {
  constructor(store: GoalStore) { super(store); }
  ngOnInit() { this.store.loadGoals(); }
}
```

---

## Development Environment Setup

### Prerequisites

- .NET 9 SDK
- Node.js (v18+)
- SQL Server or PostgreSQL
- Docker (for local services)

### Build & Run

**Backend**:
```bash
dotnet build BravoSUITE.sln
dotnet run --project src/Services/bravoGROWTH/bravoGROWTH.Service
```

**Frontend (WebV2)**:
```bash
npm install
npm run dev-start:growth          # Port 4206
npm run dev-start:employee        # Port 4205
```

**Frontend (Legacy Web)**:
```bash
cd src/Web/bravoTALENTSClient
ng serve --open
```

### Local Services

**Via Docker Compose**:
```bash
docker-compose up -d

# Services
# SQL Server:  localhost:14330
# MongoDB:     localhost:27017
# PostgreSQL:  localhost:54320
# Redis:       localhost:6379
# RabbitMQ:    localhost:15672
```

---

## Key Files Reference

### Configuration

| File                          | Purpose                    |
| ----------------------------- | -------------------------- |
| `appsettings.json`            | Service configuration      |
| `.env` / `.env.local`          | Local environment vars     |
| `tsconfig.json` / `tsconfig.app.json` | TypeScript config |
| `angular.json`                | Angular workspace config   |
| `project.json` (Nx)           | Nx project config          |

### Constants & Configuration

| Location                      | Purpose                    |
| ----------------------------- | -------------------------- |
| `*Constants.cs`               | Service-specific constants |
| `ErrorMessage.cs`             | Validation error messages  |
| `UserRoleConstants.cs`        | Role definitions           |
| `environment.ts`              | Frontend config            |

### Database Models

| Location                      | Purpose                    |
| ----------------------------- | -------------------------- |
| `Domain/*Entity.cs`           | Entity definitions         |
| `Domain/SurveyDesign/*`       | Survey domain model        |
| `Domain/Goals/*`              | Goal domain model          |

---

## Common Issues & Solutions

### DbContext Disposal Bug

**Issue**: "Cannot access a disposed context instance"

**Solution**: Use `rootServiceProvider.ExecuteInjectScopedAsync()` for independent scope

**Example**:
```csharp
[HttpPut]
public async Task<ActionResult> UpsertAnswers(string surveyId)
{
    return await rootServiceProvider.ExecuteInjectScopedAsync<ActionResult>(
        async (SurveyAppService svc) => {
            await svc.UpsertAnswers(...);
            return Ok();
        });
}
```

### Missing Navigation Properties

**Issue**: Related entities null in loaded object

**Solution**: Use `loadRelatedEntities` parameter in repo

```csharp
// Wrong
var emp = await repo.GetByIdAsync(empId, ct);
// emp.Department is null!

// Correct
var emp = await repo.GetByIdAsync(empId, ct,
    loadRelatedEntities: e => e.Department!);
```

### Validation Not Working

**Issue**: Invalid data accepted

**Solution**: Use PlatformValidationResult fluent API

```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Required");
}
```

---

## Performance Considerations

### Paging & Batch Processing

**For Large Collections**:
```csharp
await repo.ExecuteInjectScopedPagingAsync(
    maxItemCount: 10000,
    pageSize: 100,
    method: ProcessItems);
```

### Query Optimization

**Projection**:
```csharp
await repo.FirstOrDefaultAsync(
    q => q.Where(e => e.Id == id).Select(e => new { e.Id, e.Name }),
    ct);
```

**Eager Loading**:
```csharp
var items = await repo.GetAllAsync(
    q => q.Where(...).Include(e => e.Department),
    ct);
```

### Caching

**API Service Caching** (Frontend):
```typescript
this.http.get<Data>('/api/data', {
    enableCache: true
});
```

---

## Documentation Standards

### Feature Documentation

**Location**: `docs/business-features/{Module}/detailed-features/README.{Feature}Feature.md`

**Sections** (15 mandatory):
1. Overview
2. Business Requirements
3. Design Reference
4. Architecture
5. Domain Model
6. Core Workflows
7. API Reference
8. Frontend Components
9. Backend Controllers
10. Cross-Service Integration
11. Permission System
12. Test Specifications
13. Troubleshooting
14. Related Documentation
15. Version History

**Test Case Format**: `TC-{MODULE}-{NNN}: {Description}`

**Evidence Format**: `file.cs:line` or `file.cs:startLine-endLine`

---

## Contributing Guidelines

### Code Standards

**C#**:
- PascalCase for classes, methods
- camelCase for variables
- XML comments for public APIs
- Fluent API patterns preferred

**TypeScript**:
- camelCase for variables, methods
- PascalCase for classes, components
- Type definitions required
- Reactive patterns (RxJS) preferred

### Commit Message Format

```
[Type] Brief description

Optional longer explanation
```

**Types**: `[Feature]`, `[Fix]`, `[Refactor]`, `[Test]`, `[Docs]`, `[DevTools]`

### PR Review Checklist

- [ ] Code follows style guidelines
- [ ] New/updated documentation included
- [ ] Tests added/updated
- [ ] No breaking changes (or documented)
- [ ] Backward compatibility maintained

---

## Version History

| Version | Date       | Changes                                              |
| ------- | ---------- | ---------------------------------------------------- |
| 1.0.0   | 2025-01-10 | Initial comprehensive codebase summary               |
| 1.0.0   | 2025-01-10 | Project structure, architecture patterns, key files   |
| 1.0.0   | 2025-01-10 | Technology stack and development setup               |
| 1.0.0   | 2025-01-10 | Common workflows and troubleshooting guide            |

---

**Last Updated**: 2025-01-10
**Location**: `docs/codebase-summary.md`
**Maintained By**: BravoSUITE Development Team
