# Easy.Platform — Workspace-Specific Guidelines

> **.NET 9 Framework + Angular Frontend** | Platform Framework & Example Application
> See `common.copilot-instructions.md` for generic rules, workflows, and quality standards.

---

**Sections:** [TL;DR](#tldr) | [Backend Patterns](#backend-patterns) | [Frontend Patterns](#frontend-patterns) | [Decision Trees](#decision-trees) | [File Locations](#key-file-locations) | [Dev Commands](#development-commands) | [Integration Testing](#integration-testing) | [Local Startup](#local-system-startup) | [Custom Analyzers](#custom-analyzer-rules)

---

## TL;DR

**Project:** Easy.Platform is a .NET 9 framework for building microservices with CQRS, event-driven architecture, and multi-database support. It includes PlatformExampleApp (TextSnippet) as a reference implementation. Backend: .NET 9 + Easy.Platform + CQRS + MongoDB/PostgreSQL/SQL Server. Frontend: Angular + Nx. Messaging: RabbitMQ.

**Decision Quick-Ref:**

| Task               | → Pattern                                                      |
| ------------------ | -------------------------------------------------------------- |
| New API endpoint   | `PlatformBaseController` + CQRS Command                        |
| Business logic     | Command Handler (Application layer)                            |
| Data access        | `IPlatformRootRepository<TEntity>` + extensions                |
| Cross-service sync | Entity Event Consumer (message bus)                            |
| Scheduled task     | `PlatformApplicationBackgroundJob`                             |
| Migration          | `PlatformDataMigrationExecutor` / EF migrations                |
| Simple component   | Extend `AppBaseComponent`                                      |
| Complex state      | `AppBaseVmStoreComponent` + `PlatformVmStore`                  |
| Forms              | `AppBaseFormComponent` with validation                         |
| API calls          | Service extending `PlatformApiService`                         |
| Repository         | `IPlatformRootRepository<TEntity>`                             |
| Complex queries    | `RepositoryExtensions` with static expressions                 |
| Integration test   | Extend `PlatformServiceIntegrationTestWithAssertions<TModule>` |

---

## Backend Patterns

### Clean Architecture Layers

| Layer              | Contains                                                                       |
| ------------------ | ------------------------------------------------------------------------------ |
| **Domain**         | Entity, Repository, ValueObject, DomainService, Exceptions, Helpers, Constants |
| **Application**    | ApplicationService, DTOs, CQRS Commands/Queries, BackgroundJobs, MessageBus    |
| **Infrastructure** | External service implementations, data access, file storage, messaging         |
| **Presentation**   | Controllers, API endpoints, middleware, authentication                         |

### Repositories

```csharp
// Use IPlatformRootRepository<TEntity> or service-specific interfaces
// Extend with extensions, not custom interfaces
public static class EmployeeRepositoryExtensions
{
    public static async Task<Employee> GetByEmailAsync(
        this IPlatformRootRepository<Employee> repo, string email, CancellationToken ct)
        => await repo.FirstOrDefaultAsync(Employee.ByEmailExpr(email), ct).EnsureFound();
}
```

**Repository Operations:**

```csharp
await repository.CreateOrUpdateAsync(entity, cancellationToken: ct);
await repository.DeleteByIdAsync(id, ct);  // NOT fetch-then-delete
await repository.GetAllAsync(expr, ct);    // NOT GetAsync()
```

### Parallel Execution (CRITICAL)

Independent async operations MUST use `Util.TaskRunner.WhenAll()`:

```csharp
var (entity1, entity2) = await Util.TaskRunner.WhenAll(
    repo1.GetByIdAsync(id1, ct),
    repo2.GetByIdAsync(id2, ct)
);
```

### Async Collection Processing

```csharp
await items.ParallelAsync(
    item => ProcessAsync(item),
    maxDegreeOfParallelism: 5
);
```

### Fluent Validation

```csharp
return this
    .Validate(f => f.Group != null, "Group required")
    .And(f => IsCompatibleWithGroup(f), "Incompatible relationship type");

// Async fluent validation
return await validation
    .AndAsync(r => repo.GetByIdsAsync(r.Ids, ct).ThenValidateFoundAllAsync(r.Ids, ids => $"Not found: {ids}"))
    .AndNotAsync(r => repo.AnyAsync(e => e.IsExternal && r.Ids.Contains(e.Id), ct), "External not allowed");
```

### Domain Responsibility (CRITICAL)

Validation and business logic belongs in **Entity**, not Handler:

```csharp
// CORRECT: Validation in entity
public CompanyClassFieldTemplate UpsertFields(List<Field> fields)
{
    foreach (var field in fields)
        EnsureCanUpsertField(field).EnsureValid();
    this.Fields.UpsertBy(f => f.Code, fields);
    return this;
}
```

### DTO Mapping Responsibility

```csharp
// DTO owns mapping
public sealed class AuthConfigDto : PlatformDto<AuthConfigValue>
{
    public string ClientId { get; set; } = "";
    public override AuthConfigValue MapToObject() => new() { ClientId = ClientId };
}

// Handler uses MapToObject()
var config = req.AuthConfiguration.MapToObject()
    .With(p => p.ClientSecret = encryptionService.Encrypt(p.ClientSecret));
```

### CQRS Command Pattern

```csharp
// Command + Result + Handler in ONE file under UseCaseCommands/{Feature}/
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public EntityDto Entity { get; set; } = null!;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate().And(_ => Entity != null, "Entity required");
}

public sealed class SaveEntityCommandResult : PlatformCqrsCommandResult
{
    public EntityDto Entity { get; set; } = null!;
}

internal sealed class SaveEntityCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    protected override async Task<PlatformValidationResult<SaveEntityCommand>> ValidateRequestAsync(
        SaveEntityCommand req, CancellationToken ct)
        => await base.ValidateRequestAsync(req, ct)
            .AndAsync(_ => repo.AnyAsync(Entity.ByIdExpr(req.Entity.Id), ct).Then(exists => !exists), "Already exists");

    protected override async Task<SaveEntityCommandResult> HandleAsync(SaveEntityCommand req, CancellationToken ct)
    {
        var entity = req.Entity.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId());
        await repository.CreateAsync(entity, ct);
        return new() { Entity = new EntityDto(entity) };
    }
}
```

### CQRS Query Pattern

```csharp
public sealed class GetEntitiesQuery : PlatformCqrsPagedQuery<GetEntitiesQueryResult>
{
    public string? SearchText { get; set; }
    public string? Status { get; set; }
}

internal sealed class GetEntitiesQueryHandler :
    PlatformCqrsQueryApplicationHandler<GetEntitiesQuery, GetEntitiesQueryResult>
{
    protected override IQueryable<Entity> GetQueryBuilder(GetEntitiesQuery req, IQueryable<Entity> queryBuilder)
        => queryBuilder
            .WhereIf(!string.IsNullOrEmpty(req.SearchText),
                Entity.SearchByTextExpr(req.SearchText!))
            .WhereIf(!string.IsNullOrEmpty(req.Status),
                Entity.ByStatusExpr(req.Status!));
}
```

### Side Effects in Entity Event Handlers

```csharp
// CORRECT: Side effects in event handler (UseCaseEvents/)
internal sealed class SendNotificationOnCreateEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
        => @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created
            && !IsSeedingTestingData();

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<Entity> @event, CancellationToken ct)
        => await notificationService.SendAsync(@event.EntityData);
}
```

### Cross-Service Communication

```csharp
// Use message bus (NEVER direct DB access)
await messageBus.PublishAsync(new RequestDataMessage());

// Entity Event Bus Producer (auto-publishes on entity changes)
public class EmployeeEntityEventBusMessageProducer :
    PlatformCqrsEntityEventBusMessageProducer<EmployeeEventBusMessage, Employee, string> { }

// Message Bus Consumer
public class EmployeeEventBusMessageConsumer :
    PlatformApplicationMessageBusConsumer<EmployeeEventBusMessage>
{
    protected override async Task HandleAsync(EmployeeEventBusMessage message, CancellationToken ct)
    {
        await TryWaitUntilAsync(() => companyRepo.AnyAsync(Company.ByIdExpr(message.CompanyId), ct));
        // Process message...
    }
}
```

### Navigation Property Loading

```csharp
public class Employee : RootEntity<Employee, string>
{
    public string DepartmentId { get; set; }

    [PlatformNavigationProperty(nameof(DepartmentId))]
    public Department? Department { get; set; }

    [PlatformNavigationProperty(nameof(Id), true)]  // Reverse navigation
    public List<LeaveRequest>? LeaveRequests { get; set; }
}

await repository.GetAllAsync(q => q
    .Where(Employee.IsActiveExpr(companyId))
    .Include(e => e.Department)
    .Include(e => e.LeaveRequests), ct);
```

### Entity Patterns

```csharp
public class Employee : RootEntity<Employee, string>
{
    // Static expressions for queries (enables index usage)
    public static Expression<Func<Employee, bool>> IsActiveExpr(string companyId)
        => e => e.CompanyId == companyId && e.Status == Status.Active && !e.IsDeleted;

    public static Expression<Func<Employee, bool>> ByEmailExpr(string email)
        => e => e.Email == email;

    // Search columns for full-text search
    public static string[] SearchColumns() => [nameof(FullName), nameof(Email), nameof(EmployeeCode)];

    // Field update tracking
    [TrackFieldUpdatedDomainEvent]
    public string Status { get; set; }

    // Business logic in entity
    public Employee Activate()
    {
        EnsureCanActivate().EnsureValid();
        Status = EmployeeStatus.Active;
        return this;
    }

    public PlatformValidationResult EnsureCanActivate()
        => PlatformValidationResult.Valid()
            .And(_ => Status != EmployeeStatus.Active, "Already active");
}
```

### Background Jobs

```csharp
[PlatformRecurringJob("0 */6 * * *")]  // Every 6 hours
public class SyncEmployeesJob : PlatformApplicationPagedBackgroundJobExecutor<Employee>
{
    protected override IQueryable<Employee> GetPagedQuery(int skip, int take)
        => repository.GetQuery().Where(Employee.NeedsSyncExpr()).Skip(skip).Take(take);

    protected override async Task ProcessPageAsync(List<Employee> page, CancellationToken ct)
    {
        await page.ParallelAsync(e => SyncEmployeeAsync(e, ct));
    }
}
```

### Data Migration Patterns

```csharp
// MongoDB migration (simple, NO DI — use dbContext directly)
public class MigrateData : PlatformMongoMigrationExecutor<SurveyPlatformMongoDbContext>
{
    public override string Name => "20240115_MigrateFieldName";
    public override DateTime? OnlyForDbInitBeforeDate => new DateTime(2024, 01, 15);
    public override async Task Execute(SurveyPlatformMongoDbContext dbContext)
    {
        await dbContext.GetCollection<Survey>()
            .UpdateManyAsync(
                Builders<Survey>.Filter.Exists("OldFieldName"),
                Builders<Survey>.Update.Rename("OldFieldName", "NewFieldName"));
    }
}

// DI-aware migration (EF Core services or cross-DB)
public class MigrateData : PlatformDataMigrationExecutor<AccountsDbContext>
{
    public override string Name => "20240201_SeedAdminUser";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new DateTime(2024, 02, 01);
    public override async Task Execute(IServiceProvider sp, AccountsDbContext dbContext)
    {
        var repo = sp.GetRequiredService<IPlatformRootRepository<User>>();
        // Migration logic with full DI access
    }
}
```

### Fluent Helpers

```csharp
// .With() — inline mutation returning same object
var entity = new Employee().With(e => { e.Name = "John"; e.Status = Status.Active; });

// .Then() — execute side effect, return original
var result = await repo.CreateAsync(entity, ct)
    .Then(e => logger.LogInformation("Created {Id}", e.Id));

// .EnsureFound() — throw if null
var employee = await repo.FirstOrDefaultAsync(expr, ct).EnsureFound("Employee not found");

// .EnsureValid() — throw if validation fails
entity.Validate().EnsureValid();

// .ParallelAsync() — parallel collection processing
await items.ParallelAsync(x => ProcessAsync(x), maxDegreeOfParallelism: 5);
```

### Request Context

```csharp
RequestContext.UserId();              // Current user ID
RequestContext.CurrentCompanyId();    // Current company ID
RequestContext.HasRole(PlatformRoles.Admin); // Role check
```

### List Extensions

```csharp
items.UpsertBy(x => x.Id, newItems);       // Add or replace by key
items.DistinctBy(x => x.Email);             // Distinct by property
items.WhereIf(condition, x => x.IsActive);   // Conditional filter
items.SelectList(x => new Dto(x));           // Select to list
items.ToDictionaryList(x => x.Category);     // Group to dictionary
items.ParallelAsync(x => ProcessAsync(x));   // Parallel processing
```

### Entity Index Configuration

```csharp
// Entity Expression
public static Expression<Func<Employee, bool>> IsActiveExpr()
    => e => e.CompanyId == companyId && e.Status == Status.Active && !e.IsDeleted;

// Required MongoDB Index
public async Task EnsureEmployeeIndexesAsync()
{
    await EmployeeCollection.Indexes.CreateManyAsync([
        new CreateIndexModel<Employee>(
            Builders<Employee>.IndexKeys
                .Ascending(p => p.CompanyId)
                .Ascending(p => p.Status)
                .Ascending(p => p.IsDeleted))
    ]);
}

// Required EF Core Index
builder.HasIndex(e => new { e.CompanyId, e.Status, e.IsDeleted })
    .HasDatabaseName("IX_Employee_CompanyId_Status_IsDeleted");
```

### Authorization

```csharp
// Controller level
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost]
public async Task<IActionResult> Save([FromBody] SaveCommand cmd) => Ok(await Cqrs.SendAsync(cmd));

// Handler level validation
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
    => await v
        .AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin only")
        .AndAsync(_ => repo.AnyAsync(e => e.CompanyId == RequestContext.CurrentCompanyId()), "Same company");

// Entity level filter
public static Expression<Func<Employee, bool>> UserCanAccessExpr(string userId, string companyId)
    => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);
```

### Anti-Patterns (C#)

```csharp
// [MUST NOT] throw new ValidationException()   → Use PlatformValidationResult fluent API
// [MUST NOT] new HttpClient()                   → Use IHttpClientFactory or platform service
// [MUST NOT] Task.Run() in web handlers         → Use proper async patterns
// [MUST NOT] Direct cross-service DB access     → Use message bus
// [MUST NOT] Side effects in command handlers   → Use Entity Event Handlers
// [MUST NOT] DTO mapping in handlers            → DTOs own mapping
// [MUST NOT] await in foreach                   → Use items.ParallelAsync()
```

---

## Frontend Patterns

### Component Base Classes (CRITICAL)

```
AppBaseComponent                     // + Auth, roles, company context
├── AppBaseVmComponent              // + ViewModel + auth context
├── AppBaseFormComponent            // + Forms + auth + validation
└── AppBaseVmStoreComponent         // + Store + auth + loading/error
```

Source: `src/Frontend/libs/platform-core/src/lib/components/abstracts/`

| Scenario       | Base Class                                |
| -------------- | ----------------------------------------- |
| Simple display | `AppBaseComponent`                        |
| Complex state  | `AppBaseVmStoreComponent<TState, TStore>` |
| Forms          | `AppBaseFormComponent<TViewModel>`        |

### Forbidden Patterns (CRITICAL)

| Forbidden Pattern                 | Why                  | Correct Alternative     |
| --------------------------------- | -------------------- | ----------------------- |
| `ngOnChanges`                     | Error-prone, complex | `@Watch` decorator      |
| `implements OnInit, OnDestroy`    | Use base class       | Extend platform base    |
| Manual `destroy$ = new Subject()` | Memory leaks         | `this.untilDestroyed()` |
| `takeUntil(this.destroy$)`        | Redundant            | `this.untilDestroyed()` |
| Direct `HttpClient`               | Missing interceptors | `PlatformApiService`    |
| Manual signals for state          | Inconsistent         | `PlatformVmStore`       |

### Subscription Cleanup (CRITICAL)

```typescript
// CORRECT: Platform cleanup
this.formControl.valueChanges
    .pipe(this.untilDestroyed())
    .subscribe(value => { ... });
```

### API Services

```typescript
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
    protected get apiUrl() {
        return environment.apiUrl + '/api/Employee';
    }

    getEmployees(query?: Query): Observable<Employee[]> {
        return this.get<Employee[]>('', query);
    }
    saveEmployee(cmd: SaveCommand): Observable<Result> {
        return this.post<Result>('', cmd);
    }
    searchEmployees(criteria: Search): Observable<Employee[]> {
        return this.post('/search', criteria, { enableCache: true });
    }
}
```

### State Management

```typescript
@Injectable()
export class EmployeeStore extends PlatformVmStore<EmployeeVm> {
    loadEmployees = this.effectSimple(() => this.api.getEmployees().pipe(this.tapResponse(data => this.updateState({ employees: data }))));
    readonly employees$ = this.select(state => state.employees);
}
```

### Store with Caching

```typescript
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
    protected get enableCaching() { return true; }
    protected cachedStateKeyName = () => 'MyStore';
    protected vmConstructor = (data?: Partial<MyVm>) => new MyVm(data);
    protected beforeInitVm = () => this.loadInitialData();

    loadData = this.effectSimple(() =>
        this.api.getData().pipe(
            this.observerLoadingErrorState('load'),
            this.tapResponse(data => this.updateState({ data }))
        )
    );
}
```

### BEM Classes (CRITICAL)

ALL HTML elements MUST have BEM classes:

```html
<!-- CORRECT: All elements have BEM classes -->
<div class="user-list">
    <div class="user-list__header">
        <h1 class="user-list__title">Users</h1>
    </div>
    <div class="user-list__content">
        @for (user of vm.users; track user.id) {
        <div class="user-list__item">
            <span class="user-list__item-name">{{ user.name }}</span>
        </div>
        }
    </div>
</div>
```

**BEM Naming:**

- Block: `user-list`
- Element: `user-list__header`, `user-list__item`
- Modifier: Separate class with `--` prefix: `user-list__btn --primary --large`

### Watch Decorator & RxJS

```typescript
export class MyComponent {
    @Watch('onChanged') public pagedResult?: PagedResult<Item>;
    @WatchWhenValuesDiff('search') public searchTerm: string = '';

    private onChanged(value: PagedResult<Item>, change: SimpleChange<PagedResult<Item>>) {
        if (!change.isFirstTimeSet) this.updateUI();
    }
}

this.search$.pipe(skipDuplicates(500), applyIf(this.isEnabled$, debounceTime(300)), distinctUntilObjectValuesChanged(), this.untilDestroyed()).subscribe();
```

### Form Validators

```typescript
new FormControl(
    '',
    [
        Validators.required,
        noWhitespaceValidator,
        startEndValidator(
            'invalidRange',
            ctrl => ctrl.parent?.get('start')?.value,
            ctrl => ctrl.value
        )
    ],
    [ifAsyncValidator(ctrl => ctrl.valid, emailUniqueValidator)]
);

// ifValidator — conditional validation using formControls()
teamsTenantId: new FormControl('', [
    ifValidator(
        () => this.formControls('teamsIsActive').value === true,
        () => Validators.required
    )
]);
```

### Platform Component API Reference

```typescript
// PlatformComponent — Foundation
export abstract class PlatformComponent {
    public status$: WritableSignal<ComponentStateStatus>;
    public observerLoadingErrorState<T>(requestKey?: string): OperatorFunction<T, T>;
    public isLoading$(requestKey?: string): Signal<boolean | null>;
    public untilDestroyed<T>(): MonoTypeOperatorFunction<T>;
    protected tapResponse<T>(nextFn?, errorFn?, completeFn?): OperatorFunction<T, T>;
    public effectSimple<T, R>(...): ReturnType;
}

// PlatformFormComponent — Reactive Forms
export abstract class PlatformFormComponent<TViewModel> {
    public get form(): FormGroup<PlatformFormGroupControls<TViewModel>>;
    public formControls(key: keyof TViewModel): FormControl;
    public validateForm(): boolean;
    public get mode(): PlatformFormMode;  // 'create'|'update'|'view'
    protected abstract initialFormConfig: () => PlatformFormConfig<TViewModel>;
}
```

### Platform Utilities

```typescript
import {
    date_addDays, date_format, date_timeDiff,
    list_groupBy, list_distinctBy, list_sortBy,
    string_isEmpty, string_truncate,
    dictionary_map, dictionary_filter,
    immutableUpdate, deepClone, removeNullProps,
    guid_generate, task_delay, task_debounce
} from '@libs/platform-core';

trackByItem = this.ngForTrackByItemProp<User>('id');
```

### Frontend Authorization

```typescript
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    get canEdit() {
        return this.hasRole(PlatformRoles.Admin, PlatformRoles.Manager) && this.isOwnCompany();
    }
}

// Template guards
@if (hasRole(PlatformRoles.Admin)) {
    <button (click)="delete()">Delete</button>
}

// Route guard
canActivate(): Observable<boolean> {
    return this.authService.hasRole$(PlatformRoles.Admin);
}
```

### Component Template Pattern

```typescript
@Component({
    selector: 'app-{entity}-list',
    template: `
        <app-loading-and-error-indicator [target]="this">
            @if (vm(); as vm) {
                @for (item of vm.items; track item.id) {
                    <div class="{entity}-list__item">{{ item.name }}</div>
                }
            }
        </app-loading-and-error-indicator>
    `,
    providers: [{Entity}Store]
})
export class {Entity}Component extends AppBaseVmStoreComponent<{Entity}State, {Entity}Store> {
    ngOnInit() { this.store.load{Entity}s(); }
}
```

### Frontend Component Hierarchy

```
Platform lib
    ↓
PlatformComponent → PlatformVmComponent → PlatformFormComponent
    ↓
App base (per-app)
    ↓
AppBaseComponent → AppBaseVmComponent → AppBaseFormComponent
    ↓
Feature components
```

---

## Decision Trees

### Repository Pattern

```
Simple CRUD? → IPlatformQueryableRootRepository<TEntity, TKey>
Complex queries? → RepositoryExtensions with static expressions
Cross-service? → Message bus (NEVER direct DB)
```

### Validation Pattern

```
Simple property? → Command.Validate()
Async (DB check)? → Handler.ValidateRequestAsync()
Business rule? → Entity.ValidateForXXX()
Cross-field? → PlatformValidators.dateRange()
```

### Event Pattern

```
Same service + Entity changed? → EntityEventApplicationHandler
Same service + Command completed? → CommandEventApplicationHandler
Cross-service + Data sync? → EntityEventBusMessageProducer/Consumer
Cross-service + Background? → PlatformApplicationBackgroundJob
```

### Frontend Component

```
Simple UI? → AppBaseComponent
Complex state? → AppBaseVmStoreComponent + PlatformVmStore
Forms? → AppBaseFormComponent with validation
API calls? → PlatformApiService
```

---

## Microservices Architecture

| Rule                   | Description                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| Service Independence   | Each service is a distinct subdomain                                 |
| No Direct Dependencies | Services CANNOT reference each other's domain/application layers     |
| Message Bus Only       | Cross-service communication MUST use message bus                     |
| Shared Components      | Only Easy.Platform and shared libs can be referenced across services |
| Data Duplication       | Each service maintains own data; sync via message bus events         |

---

## Custom Analyzer Rules

| Rule ID                                         | Description                                     |
| ----------------------------------------------- | ----------------------------------------------- |
| `EASY_PLATFORM_ANALYZERS_STEP001`               | Missing blank line between dependent statements |
| `EASY_PLATFORM_ANALYZERS_STEP002`               | Unexpected blank line within a step             |
| `EASY_PLATFORM_ANALYZERS_STEP003`               | Step must consume all previous outputs          |
| `EASY_PLATFORM_ANALYZERS_PERF001`               | Avoid O(n) LINQ inside loops                    |
| `EASY_PLATFORM_ANALYZERS_PERF002`               | Avoid 'await' inside loops                      |
| `EASY_PLATFORM_ANALYZERS_DISALLOW_USING_STATIC` | Disallow 'using static' directive               |

---

## Key File Locations

```
src/Platform/Easy.Platform/      # Framework core
src/Platform/Easy.Platform.AspNetCore/  # ASP.NET Core integration
src/Platform/Easy.Platform.MongoDB/     # MongoDB persistence
src/Platform/Easy.Platform.EfCore/      # EF Core persistence
src/Platform/Easy.Platform.RabbitMQ/    # Message bus
src/Platform/Easy.Platform.RedisCache/  # Caching
src/Platform/Easy.Platform.AutomationTest/  # Test framework
src/Backend/                     # PlatformExampleApp backend
src/Frontend/                    # Angular frontend (Nx workspace)
src/Frontend/apps/playground-text-snippet/  # Example frontend app
src/Frontend/libs/platform-core/ # Frontend framework core
docs/                            # Project documentation
docs/code-review-rules.md        # Code review rules (detailed)
docs/backend-patterns-reference.md  # Backend patterns (comprehensive)
docs/frontend-patterns-reference.md # Frontend patterns (comprehensive)
```

## Development Commands

```bash
# Backend
dotnet build Easy.Platform.sln
dotnet run --project src/Backend/PlatformExampleApp.TextSnippet.Api

# Frontend
cd src/Frontend && npm install
cd src/Frontend && npm start

# Docker (Example App)
# See start-dev-platform-example-app*.cmd scripts in src/
```

## Integration Testing

Subcutaneous CQRS tests through real DI (no HTTP), against live infrastructure. Reference: `src/Backend/PlatformExampleApp.Tests.Integration/`.

**Key APIs:** `ExecuteCommandAsync`, `ExecuteQueryAsync`, `AssertEntityExistsAsync<T>`, `AssertEntityMatchesAsync<T>`, `AssertEntityDeletedAsync<T>`, `IntegrationTestHelper.UniqueName()`, `TestUserContextFactory.Create*()`

**Setup:** Extend `PlatformServiceIntegrationTestWithAssertions<TModule>` with `ResolveRepository<TEntity>` override, `[Collection]` attribute.

## Local System Startup

Start order: **Infrastructure → Backend API → Frontend**. Docker compose files in `src/`.

### Infrastructure Ports

| Service       | Port                               | Credentials         |
| ------------- | ---------------------------------- | ------------------- |
| MongoDB       | 127.0.0.1:27017                    | root / rootPassXXX  |
| Elasticsearch | 127.0.0.1:9200                     | (no auth)           |
| RabbitMQ      | 127.0.0.1:5672 (AMQP), :15672 (UI) | guest / guest       |
| Redis         | 127.0.0.1:6379                     | —                   |
| PostgreSQL    | 127.0.0.1:54320                    | postgres / postgres |
| SQL Server    | 127.0.0.1:14330 (optional)         | sa / 123456Abc      |

### Quick Start

| Goal                     | Command                                                 |
| ------------------------ | ------------------------------------------------------- |
| **Full system (Docker)** | `src/start-dev-platform-example-app.cmd`                |
| **MongoDB variant**      | `src/start-dev-platform-example-app-mongodb.cmd`        |
| **PostgreSQL variant**   | `src/start-dev-platform-example-app-postgres.cmd`       |
| **SQL Server variant**   | `src/start-dev-platform-example-app-usesql.cmd`         |
| **No rebuild**           | `src/start-dev-platform-example-app-NO-REBUILD.cmd`     |
| **Reset all data**       | `src/start-dev-platform-example-app-RESET-DATA.cmd`     |
| **Infra only**           | `src/start-dev-platform-example-app.infrastructure.cmd` |
