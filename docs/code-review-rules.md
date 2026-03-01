# Code Review Rules

> **Comprehensive code review rules, conventions, and best practices for Easy.Platform development.**
> Auto-injected when code review skills are activated.

---

## Table of Contents

1. [Critical Rules (MUST-FOLLOW)](#critical-rules-must-follow)
2. [Backend Rules (C#)](#backend-rules-c)
3. [Frontend Rules (TypeScript/Angular)](#frontend-rules-typescriptangular)
4. [Architecture Rules](#architecture-rules)
5. [Clean Code Principles](#clean-code-principles)
6. [Performance Rules](#performance-rules)
7. [Security Rules](#security-rules)
8. [Anti-Patterns Catalog](#anti-patterns-catalog)
9. [Decision Trees](#decision-trees)
10. [Quick Reference Checklists](#quick-reference-checklists)
11. [Related Documents](#related-documents)

---

## Critical Rules (MUST-FOLLOW)

### Core Principles

- **YAGNI** - You Aren't Gonna Need It: Don't implement features until needed
- **KISS** - Keep It Simple, Stupid: Simplest solution that works
- **DRY** - Don't Repeat Yourself: Extract shared logic, no duplication

### The 90% Rule (Class Responsibility)

**Logic belongs in the LOWEST appropriate layer:**

```
Entity/Model (Lowest)  →  Service  →  Component/Handler (Highest)
```

| Layer            | Contains                                                                  |
| ---------------- | ------------------------------------------------------------------------- |
| **Entity/Model** | Business logic, validation, display helpers, static factory methods, dropdown options, constants |
| **Service**      | API calls, command factories, data transformation                         |
| **Component/Handler** | UI events ONLY - delegates all logic to lower layers                 |

```typescript
// [MUST NOT] Logic in component
readonly providerTypes = [{ value: 1, label: 'ITViec' }, ...];

// ✅ CORRECT: Logic in entity/model
export class JobProvider {
  static readonly dropdownOptions = [{ value: 1, label: 'ITViec' }, ...];
  static getDisplayLabel(value: number): string {
    return this.dropdownOptions.find(x => x.value === value)?.label ?? '';
  }
}
```

### Mandatory Type Annotations

All functions MUST have explicit parameter and return types:

```typescript
// [MUST NOT]
function getUser(id) { ... }

// ✅ CORRECT
function getUser(id: string): Promise<User> { ... }
```

---

## Backend Rules (C#)

### Parallel Execution (CRITICAL)

Independent async operations MUST use `Util.TaskRunner.WhenAll()`:

```csharp
// [MUST NOT] Sequential awaits (slow)
var entity1 = await repo1.GetByIdAsync(id1, ct);
var entity2 = await repo2.GetByIdAsync(id2, ct);

// ✅ CORRECT: Parallel execution
var (entity1, entity2) = await Util.TaskRunner.WhenAll(
    repo1.GetByIdAsync(id1, ct),
    repo2.GetByIdAsync(id2, ct)
);
```

**Flag:** Any consecutive `await` statements where operations don't depend on each other.

### Domain Responsibility (CRITICAL)

Validation and business logic belongs in **Entity**, not Handler:

```csharp
// [MUST NOT] Validation in handler
// In SaveCustomFieldCommandHandler
private PlatformValidationResult ValidateAndSetRelationshipType(Field field, Template template) { ... }

// ✅ CORRECT: Validation in entity
// In CompanyClassFieldTemplate entity
public CompanyClassFieldTemplate UpsertFields(List<Field> fields)
{
    foreach (var field in fields)
        EnsureCanUpsertField(field).EnsureValid();
    this.Fields.UpsertBy(f => f.Code, fields);
    return this;
}
```

**Flag:** Duplicated validation logic across related handlers → move to entity.

### Repository Pattern Priority

Always use microservice-specific repositories:

```csharp
// [MUST NOT] Generic repository
IPlatformRootRepository<Employee>

// ✅ CORRECT: Service-specific repositories
// Use service-specific repository interfaces defined per microservice
// e.g. IServiceARootRepository<Employee>, IServiceBRootRepository<Survey>
```

**Repository Operations:**

```csharp
// ✅ Use explicit parameter names
await repository.CreateOrUpdateAsync(entity, cancellationToken: ct);
await repository.DeleteByIdAsync(id, ct);  // NOT fetch-then-delete
await repository.GetAllAsync(expr, ct);    // NOT GetAsync()

// ✅ Extend with extensions, not custom interfaces
public static class EmployeeRepositoryExtensions
{
    public static async Task<Employee> GetByEmailAsync(
        this IGrowthRootRepository<Employee> repo, string email, CancellationToken ct)
        => await repo.FirstOrDefaultAsync(Employee.ByEmailExpr(email), ct).EnsureFound();
}
```

### Fluent Validation Style

Use fluent `.Validate().And()` pattern, not `if-return`:

```csharp
// [MUST NOT] if-return style
if (field.Group == null)
    return PlatformValidationResult.Valid<object>(null);

// ✅ CORRECT: Fluent style
return this
    .Validate(f => f.Group != null, "Group required")
    .And(f => IsCompatibleWithGroup(f), "Incompatible relationship type");

// ✅ CORRECT: Async fluent validation
return await validation
    .AndAsync(r => repo.GetByIdsAsync(r.Ids, ct).ThenValidateFoundAllAsync(r.Ids, ids => $"Not found: {ids}"))
    .AndNotAsync(r => repo.AnyAsync(e => e.IsExternal && r.Ids.Contains(e.Id), ct), "External not allowed");
```

### DTO Mapping Responsibility

DTOs own their mapping logic:

```csharp
// [MUST NOT] Mapping in handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    var config = new AuthConfigurationValue
    {
        ClientId = req.Dto.ClientId,  // Manual mapping!
        ClientSecret = req.Dto.ClientSecret
    };
}

// ✅ CORRECT: DTO owns mapping
public sealed class AuthConfigDto : PlatformDto<AuthConfigValue>
{
    public string ClientId { get; set; } = "";
    public override AuthConfigValue MapToObject() => new() { ClientId = ClientId };
}

// Handler uses MapToObject()
var config = req.AuthConfiguration.MapToObject()
    .With(p => p.ClientSecret = encryptionService.Encrypt(p.ClientSecret));
```

### Side Effects in Entity Event Handlers

Side effects (notifications, emails, external APIs) MUST go in Entity Event Handlers:

```csharp
// [MUST NOT] Side effects in command handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    await repository.CreateAsync(entity, ct);
    await notificationService.SendAsync(entity);  // BREAKS event-driven architecture!
}

// ✅ CORRECT: Side effects in event handler (UseCaseEvents/)
internal sealed class SendNotificationOnCreateEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
        => @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<Entity> @event, CancellationToken ct)
        => await notificationService.SendAsync(@event.EntityData);
}
```

### Command Patterns

```csharp
// Command + Result + Handler in ONE file under UseCaseCommands/{Feature}/
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public EntityDto Entity { get; set; } = null!;  // DTO in command, not flat properties

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
    protected override async Task<SaveEntityCommandResult> HandleAsync(SaveEntityCommand req, CancellationToken ct)
    {
        // Mapping via DTO methods, not manual mapping
        var entity = req.Entity.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId());
        await repository.CreateAsync(entity, ct);
        return new() { Entity = new EntityDto(entity) };
    }
}
```

### Cross-Service Communication

```csharp
// [MUST NOT] Direct database access across services
var otherServiceData = await otherDbContext.Entities.ToListAsync();

// ✅ CORRECT: Use message bus
await messageBus.PublishAsync(new RequestDataMessage());

// Entity Event Bus Producer (auto-publishes on entity changes)
public class EmployeeEntityEventBusMessageProducer :
    PlatformCqrsEntityEventBusMessageProducer<EmployeeEventBusMessage, Employee, string> { }
```

### Naming Conventions

| Element       | Convention       | Example                                             |
| ------------- | ---------------- | --------------------------------------------------- |
| Commands      | `[Verb][Entity]Command` | `SaveLeaveRequestCommand`, `ApproveOrderCommand` |
| Queries       | `Get[Entity][Query]` | `GetActiveUsersQuery`, `GetOrdersByStatusQuery`  |
| Handlers      | `[CommandName]Handler` | `SaveLeaveRequestCommandHandler`                |
| Validation    | `Validate[Context]Valid` | `ValidateLeaveRequestValid()`                 |
| Ensure        | `Ensure[Context]Valid` | `EnsureCanApprove()` (returns object or throws)  |
| Booleans      | `Is/Has/Can/Should` | `IsActive`, `HasPermission`, `CanEdit`          |
| Collections   | Plural           | `users`, `orders`, `items`                          |

---

## Frontend Rules (TypeScript/Angular)

### Component Base Classes (CRITICAL)

Components MUST extend platform base classes:

| Scenario        | Base Class                              |
| --------------- | --------------------------------------- |
| Simple display  | `AppBaseComponent`                      |
| Complex state   | `AppBaseVmStoreComponent<TState, TStore>` |
| Forms           | `AppBaseFormComponent<TViewModel>`      |

```typescript
// [MUST NOT] Raw component with implements
export class MyComponent implements OnInit, OnDestroy { }

// ✅ CORRECT: Extends platform base
export class MyComponent extends AppBaseFormComponent<MyFormVm> { }
```

### Forbidden Patterns (CRITICAL)

| Forbidden Pattern | Why | Correct Alternative |
| ----------------- | --- | ------------------- |
| `ngOnChanges` | Error-prone, complex | `@Watch` decorator |
| `implements OnInit, OnDestroy` | Use base class | Extend platform base |
| Manual `destroy$ = new Subject()` | Memory leaks | `this.untilDestroyed()` |
| `takeUntil(this.destroy$)` | Redundant | `this.untilDestroyed()` |

```typescript
// [MUST NOT] ngOnChanges
export class MyComponent implements OnChanges {
    ngOnChanges(changes: SimpleChanges): void { ... }
}

// ✅ CORRECT: @Watch decorator
export class MyComponent extends AppBaseVmStoreComponent<State, Store> {
    @Watch('onFieldChanged') fieldTemplate: FieldTemplate;
    private onFieldChanged(value: FieldTemplate): void { ... }
}
```

### Subscription Cleanup (CRITICAL)

ALL subscriptions MUST use `.pipe(this.untilDestroyed())`:

```typescript
// [MUST NOT] No cleanup
this.formControl.valueChanges.subscribe(value => { ... });

// [MUST NOT] Manual destroy subject
private destroy$ = new Subject<void>();
ngOnInit() {
    this.data$.pipe(takeUntil(this.destroy$)).subscribe(...);
}
ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

// ✅ CORRECT: Platform cleanup
this.formControl.valueChanges
    .pipe(this.untilDestroyed())
    .subscribe(value => { ... });
```

### API Services

Services MUST extend `PlatformApiService`:

```typescript
// [MUST NOT] Direct HttpClient
constructor(private http: HttpClient) {}

// ✅ CORRECT: Platform service
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
    protected get apiUrl() { return environment.apiUrl + '/api/Employee'; }

    getEmployees(query?: Query): Observable<Employee[]> {
        return this.get<Employee[]>('', query);
    }
}
```

### State Management

```typescript
// [MUST NOT] Manual signals for state
employees = signal([]);
loading = signal(false);
error = signal<string | null>(null);

// ✅ CORRECT: Platform store pattern
@Injectable()
export class EmployeeStore extends PlatformVmStore<EmployeeVm> {
    loadEmployees = this.effectSimple(() =>
        this.api.getEmployees().pipe(
            this.tapResponse(data => this.updateState({ employees: data }))
        )
    );
    readonly employees$ = this.select(state => state.employees);
}
```

### BEM Classes (CRITICAL)

ALL HTML elements MUST have BEM classes:

```html
<!-- [MUST NOT] Elements without classes -->
<div class="user-list">
    <div><h1>Users</h1></div>
    <div>
        @for (user of vm.users; track user.id) {
        <div><span>{{ user.name }}</span></div>
        }
    </div>
</div>

<!-- ✅ CORRECT: All elements have BEM classes -->
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

### TypeScript Style

- **Always use semicolons** in TypeScript
- **Explicit type annotations** on all functions
- **Specific names**: `employeeRecords` not `data`
- **Boolean prefixes**: `is/has/can/should` (`isActive`, `hasPermission`)

---

## Architecture Rules

### Microservices Architecture

| Rule | Description |
| ---- | ----------- |
| Service Independence | Each service is a distinct subdomain |
| No Direct Dependencies | Services CANNOT reference each other's domain/application layers |
| Message Bus Only | Cross-service communication MUST use message bus patterns |
| Shared Components | Only Easy.Platform and shared libs can be referenced across services |
| Data Duplication | Each service maintains own data; sync via message bus events |
| Domain Boundaries | Each service owns its domain concepts and business logic |

### Backend Layer Structure

| Layer | Contains |
| ----- | -------- |
| **Domain** | Entity, Repository, ValueObject, DomainService, Exceptions, Helpers, Constants |
| **Application** | ApplicationService, DTOs, CQRS Commands/Queries, BackgroundJobs, MessageBus |
| **Infrastructure** | External service implementations, data access, file storage, messaging |
| **Presentation** | Controllers, API endpoints, middleware, authentication |

### Frontend Component Hierarchy

```
Platform lib (apps-shared-components)
    ↓
PlatformComponent → PlatformVmComponent → PlatformFormComponent
    ↓
App base (per-app)
    ↓
AppBaseComponent → AppBaseVmComponent → AppBaseFormComponent
    ↓
Feature components
```

### Component Reuse vs New Component

| Scenario | Action |
| -------- | ------ |
| Can enhance existing with generic, optional inputs without leaking foreign domain logic | Reuse existing |
| Can compose thin wrapper around existing store/components | Create wrapper |
| Existing cannot fulfill requirement even with generic enhancements | Create new |
| New behavior would complicate existing with unrelated concerns | Create new |

---

## Clean Code Principles

### Method Design

- **Single Responsibility**: One method = one purpose
- **Pure functions**: Avoid side effects when possible
- **Early returns**: Reduce nesting with guard clauses
- **Consistent abstraction level**: Don't mix high-level and low-level operations

### Code Flow (Step-by-Step Pattern)

```csharp
// ✅ Clear step-by-step flow with spacing
public async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    // Step 1: Validate input
    req.Validate().EnsureValid();

    // Step 2: Load dependencies (parallel)
    var (entity, company) = await Util.TaskRunner.WhenAll(
        repository.GetByIdAsync(req.Id, ct),
        companyRepo.GetByIdAsync(req.CompanyId, ct)
    );

    // Step 3: Apply business logic
    entity.UpdateFrom(req).EnsureValid();

    // Step 4: Persist changes
    await repository.UpdateAsync(entity, ct);

    // Step 5: Return result
    return new Result { Entity = new EntityDto(entity) };
}
```

### No Magic Numbers/Strings

```csharp
// [MUST NOT] Magic numbers
if (status == 1) { ... }
var maxRetries = 3;

// ✅ CORRECT: Named constants
public static class EntityStatus
{
    public const int Active = 1;
    public const int Inactive = 2;
}

private const int MaxRetryCount = 3;
if (status == EntityStatus.Active) { ... }
```

### Naming Guidelines

| Type | Convention | Example |
| ---- | ---------- | ------- |
| Classes/Interfaces | PascalCase | `UserService`, `IRepository` |
| Methods (C#) | PascalCase | `GetUserById()` |
| Methods (TS) | camelCase | `getUserById()` |
| Variables/Fields | camelCase | `userName`, `isActive` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Booleans | is/has/can/should | `isVisible`, `hasPermission` |

---

## Performance Rules

### Backend Performance

```csharp
// [MUST NOT] O(n) LINQ inside loops
foreach (var item in items)
{
    var match = allMatches.FirstOrDefault(m => m.Id == item.Id);  // O(n) each iteration
}

// ✅ CORRECT: Dictionary lookup
var matchDict = allMatches.ToDictionary(m => m.Id);
foreach (var item in items)
{
    var match = matchDict.GetValueOrDefault(item.Id);  // O(1)
}

// [MUST NOT] Await inside loops
foreach (var id in ids)
{
    var item = await repo.GetByIdAsync(id, ct);  // N+1 queries
}

// ✅ CORRECT: Batch load
var items = await repo.GetByIdsAsync(ids, ct);

// [MUST NOT] Load all then select
var items = await repo.GetAllAsync(x => true, ct);
var ids = items.Select(x => x.Id).ToList();

// ✅ CORRECT: Project in query
var ids = await repo.FirstOrDefaultAsync(q => q.Where(expr).Select(e => e.Id), ct);

// ✅ Always paginate collections
var items = await repo.GetAllAsync(q => q.Where(expr).PageBy(skip, take), ct);
```

### Frontend Performance

```typescript
// ✅ Use trackBy for ngFor
trackByItem = this.ngForTrackByItemProp<User>('id');

// ✅ Use effectSimple for auto loading state
loadData = this.effectSimple(() =>
    this.api.getData().pipe(this.tapResponse(data => this.updateState({ data }))));

// ✅ Use platform caching
return this.post('/search', criteria, { enableCache: true });
```

### Entity Index Configuration (CRITICAL)

Database queries using entity expressions MUST have corresponding indexes configured at the persistence layer.

#### MongoDB Index Rules

- [ ] **Expression → Index Mapping:** All static expressions used in `repository.GetAllAsync(expr)` or `FirstOrDefaultAsync(expr)` have matching indexes in `Ensure{Entity}IndexesAsync()` methods
- [ ] **Compound Index Order:** Index fields match expression filter order (leftmost prefix rule)
- [ ] **Text Search:** Full-text queries have text indexes on target fields
- [ ] **Unique Constraints:** Unique business rules use `CreateIndexOptions { Unique = true }`

**Example:**

```csharp
// Entity Expression
public static Expression<Func<Employee, bool>> IsActiveExpr()
    => e => e.CompanyId == companyId && e.Status == Status.Active && !e.IsDeleted;

// Required Index in DbContext
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
```

#### EF Core Index Rules

- [ ] **Filter Columns:** Entities with frequent WHERE clause filters have indexes
- [ ] **Composite Selectivity:** Multi-column indexes ordered by selectivity (most selective first)
- [ ] **Foreign Keys:** Navigation properties have indexes (auto-created by EF migrations)
- [ ] **Migration Validation:** New queries in handler code trigger index check in migrations

**Example:**

```csharp
// Entity configuration
builder.HasIndex(e => new { e.CompanyId, e.Status, e.IsDeleted })
    .HasDatabaseName("IX_Employee_CompanyId_Status_IsDeleted");
```

#### Code Review Validation Protocol

When reviewing code with entity expressions, validate index coverage:

1. **Identify expression fields:** `Employee.IsActiveExpr()` uses `CompanyId`, `Status`, `IsDeleted`
2. **Check DbContext/Migrations:** Search for `CreateIndexModel` or `HasIndex` with those fields
3. **Verify field order:** Index should cover expression fields in query order
4. **Flag if missing:** "CRITICAL: Expression `Employee.IsActiveExpr()` requires compound index on `CompanyId+Status+IsDeleted`"

#### Performance Impact Examples

| Scenario | Without Index | With Index | Impact |
|----------|---------------|------------|--------|
| Filter by CompanyId (10k employees) | Full collection scan ~500ms | Index seek ~5ms | **100x faster** |
| Text search on FullName | O(n) scan | Text index lookup | **50-100x faster** |
| Compound filter (CompanyId+Status) | Partial index use or full scan | Composite index | **20-50x faster** |

### Custom Analyzer Rules (Enforced)

| Rule ID | Description |
| ------- | ----------- |
| `EASY_PLATFORM_ANALYZERS_STEP001` | Missing blank line between dependent statements |
| `EASY_PLATFORM_ANALYZERS_STEP002` | Unexpected blank line within a step |
| `EASY_PLATFORM_ANALYZERS_STEP003` | Step must consume all previous outputs |
| `EASY_PLATFORM_ANALYZERS_PERF001` | Avoid O(n) LINQ inside loops |
| `EASY_PLATFORM_ANALYZERS_PERF002` | Avoid 'await' inside loops |
| `EASY_PLATFORM_ANALYZERS_DISALLOW_USING_STATIC` | Disallow 'using static' directive |

---

## Security Rules

### Input Validation

- Always validate user input
- Use parameterized queries (Entity Framework handles this)
- Implement proper authorization checks
- Log security-relevant events

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

### Sensitive Data

- Never commit secrets (.env, API keys, credentials)
- Don't expose sensitive data in DTOs
- Use encryption for sensitive fields

### Ownership Protocol (for 3+ file changes)

When modifying 3+ files, explicitly consider:

1. **Confidence Score (1-10):** How confident are you these changes work correctly?
2. **Ownership:** Can you explain every change and fix bugs that arise?
3. **Debug Entry Point:** If this breaks in production, which file:line do you check first?

**Why this matters:** AI-generated code that passes mechanical review but has no owner leads to "the AI wrote it" deflection when bugs surface. Every line you ship is YOUR responsibility.

**Example:**
```
Confidence: 8/10 (main path verified, edge cases for concurrent access untested)
Ownership: I will fix bugs for 14 days post-merge
Debug Entry: EmployeeService.cs:145 (query construction is the riskiest change)
```

### Operational Readiness (service-layer and API changes)

For backend service-layer or API changes, verify:

#### Observability

- [ ] **Logging:** External API calls log errors with context (request ID, user, parameters)
- [ ] **Metrics:** Operations >100ms tracked with duration metrics
- [ ] **Tracing:** Cross-service calls include correlation IDs
- [ ] **Alerting:** Error rate thresholds considered (>5% = warning, >10% = critical)

```csharp
// [MUST NOT] No error context
var result = await httpClient.GetAsync(url);

// ✅ CORRECT: Structured logging with context
try {
    var result = await httpClient.GetAsync(url);
} catch (Exception ex) {
    logger.LogError(ex, "External API call failed. URL={Url}, User={UserId}", url, userId);
    throw;
}
```

#### Reliability

- [ ] **Retry:** Transient failures use retry policy (3 attempts, exponential backoff)
- [ ] **Timeout:** HTTP clients configured with timeout (default: 30s)
- [ ] **Fallback:** Critical paths define degraded-mode behavior

```csharp
// ✅ CORRECT: Retry with exponential backoff (Polly)
var policy = Policy
    .Handle<HttpRequestException>()
    .WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)));

httpClient.Timeout = TimeSpan.FromSeconds(30);
var result = await policy.ExecuteAsync(() => httpClient.GetAsync(url));
```

**Scope:** Service-layer and API changes only. Frontend-only changes exempt.

---

## Anti-Patterns Catalog

### Backend Anti-Patterns

| Anti-Pattern | Correct Pattern |
| ------------ | --------------- |
| Direct cross-service DB access | Use message bus communication |
| Custom repository interfaces | Platform repositories with extensions |
| Manual validation with exceptions | PlatformValidationResult fluent API |
| Side effects in command handler | Entity Event Handlers |
| DTO mapping in handler | DTO owns mapping via MapToObject() |
| Logic in controllers | CQRS Command Handlers |
| Mixing abstraction levels | Consistent level per method |
| Fetch-then-delete | `DeleteByIdAsync(id)` |

### Frontend Anti-Patterns

| Anti-Pattern | Correct Pattern |
| ------------ | --------------- |
| Direct `HttpClient` | `PlatformApiService` |
| Manual signals for state | `PlatformVmStore` |
| Manual destroy Subject | `this.untilDestroyed()` |
| `ngOnChanges` | `@Watch` decorator |
| `implements OnInit, OnDestroy` | Extend platform base class |
| Elements without BEM classes | All elements have BEM classes |
| Missing `untilDestroyed()` | All subscriptions use it |

### Architecture Anti-Patterns

| Anti-Pattern | Correct Pattern |
| ------------ | --------------- |
| Skip planning | Always EnterPlanMode for non-trivial tasks |
| Assume service boundaries | Verify through code analysis |
| Create custom solutions | Use established Easy.Platform patterns |
| Create without searching | Search for existing implementations first |
| Logic in component | Logic in lowest layer (entity/model) |

---

## Decision Trees

### Repository Pattern Decision

```
Simple CRUD operations?
    → Use IPlatformQueryableRootRepository<TEntity, TKey>

Complex queries needed?
    → Create RepositoryExtensions with static expressions

Legacy custom repository exists?
    → Gradually migrate to platform repository

Cross-service data access?
    → Use message bus (NEVER direct DB access)
```

### Validation Pattern Decision

```
Simple property validation?
    → Command.Validate() method

Async validation (DB check)?
    → Handler.ValidateRequestAsync()

Business rule validation?
    → Entity.ValidateForXXX() method

Cross-field validation?
    → PlatformValidators.dateRange(), etc.
```

### Event Pattern Decision

```
Within same service + Entity changed?
    → EntityEventApplicationHandler

Within same service + Command completed?
    → CommandEventApplicationHandler

Cross-service + Data sync needed?
    → EntityEventBusMessageProducer/Consumer

Cross-service + Background processing?
    → PlatformApplicationBackgroundJob
```

### Component Decision

```
Simple UI display?
    → AppBaseComponent

Complex state management?
    → AppBaseVmStoreComponent<State, Store>

Form with validation?
    → AppBaseFormComponent<FormVm>
```

---

## Quick Reference Checklists

### Backend Review Checklist

- [ ] Independent awaits use `Util.TaskRunner.WhenAll()`?
- [ ] Validation logic in entity, not handler?
- [ ] Using fluent validation style?
- [ ] Delete by ID, not fetch-then-delete?
- [ ] Queries paginated and projected?
- [ ] Service-specific repositories used?
- [ ] DTO owns mapping responsibility?
- [ ] Side effects in Entity Event Handlers?
- [ ] No direct cross-service DB access?
- [ ] Proper authorization checks?
- [ ] Entity expressions have corresponding database indexes?
- [ ] MongoDB `Ensure*IndexesAsync()` methods exist for queried collections?
- [ ] EF Core migrations include indexes for filter columns?

### Frontend Review Checklist

- [ ] Components extend platform base classes?
- [ ] No `ngOnChanges` usage?
- [ ] All subscriptions have `untilDestroyed()`?
- [ ] Services extend `PlatformApiService`?
- [ ] No `implements OnInit, OnDestroy` without base?
- [ ] All HTML elements have BEM classes?
- [ ] Using platform store pattern?
- [ ] No manual destroy Subject?
- [ ] Explicit type annotations on functions?
- [ ] Semicolons used consistently?
- [ ] API calls filtering large datasets use indexed fields?
- [ ] No client-side filtering of large arrays (use server-side pagination)?

### Architecture Review Checklist

- [ ] Logic in lowest appropriate layer?
- [ ] No duplicated logic across changes?
- [ ] New files in correct architectural layers?
- [ ] Service boundaries respected?
- [ ] Clean Architecture followed?
- [ ] Constants/columns in Model, not Component?

### Pre-Commit Checklist

- [ ] Linting passed?
- [ ] Tests passed?
- [ ] No syntax errors?
- [ ] No secrets committed?
- [ ] Focused commits with clean messages?
- [ ] Operational readiness verified? (service-layer/API changes only)

---

## Related Documents

| Document | Purpose |
| -------- | ------- |
| [`docs/backend-patterns-reference.md`](backend-patterns-reference.md) | Backend CQRS, repository, validation patterns |
| [`docs/frontend-patterns-reference.md`](frontend-patterns-reference.md) | Frontend component hierarchy, platform APIs |
| [`docs/integration-test-reference.md`](integration-test-reference.md) | Integration test patterns and conventions |
| [`docs/claude/backend-csharp-complete-guide.md`](claude/backend-csharp-complete-guide.md) | Comprehensive C# reference |
| [`docs/claude/frontend-typescript-complete-guide.md`](claude/frontend-typescript-complete-guide.md) | Complete Angular/TS guide |
| [`docs/claude/scss-styling-guide.md`](claude/scss-styling-guide.md) | BEM methodology, design tokens |

---

## Source References

Rules consolidated from:
- PR #35309, #35419 feedback
- `CLEAN-CODE-RULES.md`
- `docs/claude/anti-patterns.md`
- `.github/AI-DEBUGGING-PROTOCOL.md`
- `.claude/skills/code-review/SKILL.md`
- `.claude/workflows/development-rules.md`
- `docs/lessons.md` (learned lessons via /learn skill)

---

> **Remember:** Technical correctness over social comfort. Verify before implementing. Ask before assuming. Evidence before claims.
