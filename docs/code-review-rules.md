# EasyPlatform Code Review Rules

> **Purpose:** Comprehensive checklist for code reviewers. Auto-injected when running /code-review skills.
> **Last Updated:** 2026-01-23
> **Sources:** CLAUDE.md, docs/claude/*.md, .claude/quick-ref/*.md, .claude/skills/code-review/

---

## Table of Contents

1. [Backend (C#) - Critical Rules](#backend-c---critical-rules)
2. [Frontend (TypeScript/Angular) - Critical Rules](#frontend-typescriptangular---critical-rules)
3. [SCSS/CSS Styling Rules](#scsscss-styling-rules)
4. [Architecture Rules](#architecture-rules)
5. [Clean Code Rules](#clean-code-rules)
6. [Performance Rules](#performance-rules)
7. [Security & Authorization](#security--authorization)
8. [Anti-Pattern Detection](#anti-pattern-detection)
9. [Code Review Process Rules](#code-review-process-rules)
10. [Verification Rules](#verification-rules)

---

## Backend (C#) - Critical Rules

### Repository Pattern

- [ ] Uses `IPlatformQueryableRootRepository<TEntity, TKey>` - NEVER generic `IPlatformRootRepository`
- [ ] Repository extensions use static expressions for reusability
- [ ] `GetByIdsAsync()` for batch loading - NEVER N+1 queries
- [ ] `.PageBy()` for all collection queries
- [ ] Creates repository extensions for reusable queries
- [ ] Uses `loadRelatedEntities` parameter for eager loading

### Validation Pattern

- [ ] Uses `PlatformValidationResult` fluent API (`.And()`, `.AndAsync()`, `.AndNot()`, `.AndNotAsync()`)
- [ ] NEVER throws `ValidationException` directly
- [ ] Entity validation in Entity class, not Handler
- [ ] Uses `.EnsureFound()`, `.EnsureValid()`, `.EnsureValidAsync()` fluent helpers
- [ ] Async validation in `ValidateRequestAsync()` override
- [ ] Validation chained with `.Of<T>()` when needed

### CQRS Pattern

- [ ] Command + Result + Handler in ONE file under `UseCaseCommands/{Feature}/`
- [ ] DTO owns mapping via `MapToEntity()` / `MapToObject()` - NEVER in handlers
- [ ] Side effects in Entity Event Handlers (`UseCaseEvents/`) - NEVER in command handlers
- [ ] Query handlers use `GetQueryBuilder` for reusable queries
- [ ] Parallel tuple pattern for independent queries: `var (a, b) = await (task1, task2)`

### Entity Patterns

- [ ] Uses `RootEntity<TEntity, TKey>` or `RootAuditedEntity<TEntity, TKey, TUserKey>`
- [ ] Static expression methods for reusable filters (`UniqueExpr()`, `OfCompanyExpr()`)
- [ ] `[TrackFieldUpdatedDomainEvent]` attribute on tracked properties
- [ ] `[ComputedEntityProperty]` with empty setter for computed props
- [ ] `[PlatformNavigationProperty]` for related entity loading
- [ ] Search columns defined as `static Expression<Func<T, object?>>[] SearchColumns()`

### DTO Patterns

- [ ] Reusable DTOs extend `PlatformEntityDto<TEntity, TKey>`
- [ ] Implements `MapToEntity()`, `GetSubmittedId()`, `GenerateNewId()`
- [ ] With* fluent methods for optional related data loading
- [ ] Constructor accepts entity for mapping

### Async Execution

- [ ] Independent async operations use tuple pattern: `var (a, b) = await (task1, task2)`
- [ ] Uses `.ParallelAsync()` for collection processing
- [ ] Flag: Sequential awaits where operations don't depend on each other
- [ ] Uses `task.WaitResult()` not `task.Wait()` (preserves stack trace)

### Domain Responsibility (90% Rule)

- [ ] Logic 90% belonging to Entity → should be in Entity
- [ ] Duplicated logic across handlers → move to entity method or Helper
- [ ] Static factory methods in Entity for creation
- [ ] Mapping responsibility in DTO, not handler

### Background Jobs

- [ ] Extends `PlatformApplicationPagedBackgroundJobExecutor` or `PlatformApplicationBatchScrollingBackgroundJobExecutor`
- [ ] Uses `[PlatformRecurringJob("cron")]` attribute
- [ ] Paged processing with `PageBy()` for large datasets
- [ ] `dismissSendEvent: true` in migrations to avoid event storms

### Message Bus

- [ ] Consumers extend `PlatformApplicationMessageBusConsumer<TMessage>`
- [ ] Uses `TryWaitUntilAsync()` for dependency waiting
- [ ] Handles `LastMessageSyncDate` for idempotency
- [ ] Proper CRUD action handling (Created, Updated, Deleted)

---

## Frontend (TypeScript/Angular) - Critical Rules

### Component Hierarchy

- [ ] Extends `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent`
- [ ] NEVER extends `PlatformComponent` directly (use AppBase* layer)
- [ ] NEVER raw `@Component` without base class

### State Management

- [ ] Uses `PlatformVmStore` for complex state
- [ ] NEVER uses manual signals for state (`employees = signal([])`)
- [ ] Store pattern: `effectSimple()`, `select()`, `updateState()`
- [ ] Uses `observerLoadingErrorState()` for loading/error tracking

### Subscription Cleanup

- [ ] ALL subscriptions use `.pipe(this.untilDestroyed())`
- [ ] Flag: Any `.subscribe()` without `untilDestroyed()`
- [ ] NEVER uses `private destroy$ = new Subject()` with `takeUntil`

### API Services

- [ ] Extends `PlatformApiService`
- [ ] NEVER uses direct `HttpClient` injection
- [ ] Override `get apiUrl()` property
- [ ] Uses `{ enableCache: true }` for cacheable requests

### Form Patterns

- [ ] Extends `AppBaseFormComponent<TViewModel>`
- [ ] Implements `initialFormConfig()` for form setup
- [ ] Uses `validateForm()` before submission
- [ ] FormArray pattern with `modelItems` and `itemControl`
- [ ] Uses `ifAsyncValidator()` for conditional async validation

### Change Detection

- [ ] Uses `@Watch` decorator instead of `ngOnChanges`
- [ ] Uses `@WatchWhenValuesDiff` for debounced changes

### Template Patterns

- [ ] Uses `@if (vm(); as vm)` for conditional rendering
- [ ] Uses `@for` with `track` expression
- [ ] Uses `<app-loading-and-error-indicator [target]="this">`
- [ ] Handles empty state when no data

### Performance Patterns

- [ ] Uses `trackBy` for all `@for` loops (`trackByItem = this.ngForTrackByItemProp<T>('id')`)
- [ ] Components use `ChangeDetectionStrategy.OnPush` when possible
- [ ] Large lists (>100 items) use `CdkVirtualScrollViewport`
- [ ] Route modules use lazy loading (`loadChildren`)
- [ ] HTTP caching enabled for static data (`{ enableCache: true }`)

---

## SCSS/CSS Styling Rules

### BEM Classes (MANDATORY)

- [ ] ALL template elements have BEM classes (`block__element --modifier`)
- [ ] Block name matches component selector (kebab-case, without prefix)
- [ ] Elements use `__` double underscore separator
- [ ] Modifiers use `--` as SEPARATE class (space-separated, not suffix)
- [ ] Form inputs have identifying modifiers (`--name`, `--email`)
- [ ] Loop items use generic element names with state modifiers

```html
<!-- CORRECT -->
<button class="user-form__btn --primary --large">Save</button>

<!-- WRONG -->
<button class="user-form__btn--primary">Save</button>
```

### SCSS Structure

- [ ] File starts with `@use 'shared-mixin' as *;`
- [ ] Host element has `@include flex-layout;` if page-level
- [ ] Main wrapper class contains full styling (not just host)
- [ ] Layout uses flex mixins (`flex-col`, `flex-row`, `flex-layout`)
- [ ] Typography uses `text-base()` mixin
- [ ] All colors use CSS variables (`var(--*)`)
- [ ] All spacing uses rem values (0.25, 0.5, 0.75, 1, 1.5, 2rem)
- [ ] Borders use `var(--bd-pri-cl)` or `var(--bd-sec-cl)`
- [ ] No hardcoded hex colors
- [ ] No inline styles in HTML
- [ ] No tag selectors (div, span, button)
- [ ] Nesting depth max 3 levels

### Color Variables

| Category   | Variables                                           |
| ---------- | --------------------------------------------------- |
| Background | `--bg-pri-cl`, `--bg-sec-cl`, `--bg-hover-cl`       |
| Text       | `--text-pri-cl`, `--text-sec-cl`, `--primary-cl`    |
| Border     | `--bd-pri-cl`, `--bd-sec-cl`                        |
| Status     | `--color-success-*`, `--color-warning-*`, `--color-error-*` |

---

## Architecture Rules

### Logic Placement Hierarchy

```
Entity/Model (Lowest) → Service → Component/Handler (Highest)
```

- [ ] Constants, dropdowns, display helpers → Entity/Model
- [ ] API calls, data transformation → Service
- [ ] UI event handling ONLY → Component

### Cross-Service Communication

- [ ] Uses RabbitMQ message bus for cross-service communication
- [ ] NEVER direct database access between services
- [ ] Entity Event Consumers for incoming messages
- [ ] Producer pattern for outgoing messages

### Code Duplication

- [ ] Search for similar implementations before creating new
- [ ] Compare related handlers for shared logic
- [ ] Check for repeated mapping code
- [ ] Extract to Helper (with deps) or Util (pure functions)

### Clean Architecture Layers

- [ ] Domain Layer: Entities, domain events, value objects
- [ ] Application Layer: CQRS handlers, jobs, events
- [ ] Persistence Layer: Repository implementations
- [ ] Service/API Layer: Controllers

---

## Clean Code Rules

### Naming Conventions

| Type               | Convention                             | Example                      |
| ------------------ | -------------------------------------- | ---------------------------- |
| Classes/Interfaces | PascalCase                             | `UserService`, `IRepository` |
| Methods/Functions  | PascalCase (C#), camelCase (TS)        | `GetUserById`, `getUserById` |
| Variables/Fields   | camelCase                              | `userName`, `isActive`       |
| Constants          | UPPER_SNAKE_CASE (TS), PascalCase (C#) | `MAX_RETRY`, `MaxRetryCount` |
| Booleans           | is, has, can, should prefix            | `isVisible`, `hasPermission` |
| Collections        | Plural                                 | `users`, `orders`, `items`   |

### Method Naming Patterns

| Pattern             | Purpose               | Example                     |
| ------------------- | --------------------- | --------------------------- |
| `Get*`              | Retrieve data         | `GetUserById`               |
| `Find*`             | Search (may be null)  | `FindByEmail`               |
| `Create*` / `Build*`| Construct new         | `CreateOrder`               |
| `Validate*`         | Check validity        | `ValidateEmail`             |
| `Is*` / `Has*`      | Boolean check         | `IsActive`, `HasPermission` |

### Code Quality

- [ ] Single Responsibility per method/class
- [ ] Consistent abstraction level within method
- [ ] No magic numbers - use named constants
- [ ] Comments explain WHY, not WHAT
- [ ] Early return for guard clauses
- [ ] Max 2-3 levels of nesting

### No Magic Numbers

```csharp
// WRONG
if (status == 3) { }
var timeout = 30000;

// CORRECT
private const int StatusApproved = 3;
private const int DefaultTimeoutMs = 30000;
if (status == StatusApproved) { }
```

---

## Performance Rules

### Query Optimization

- [ ] Project only needed properties in queries
- [ ] Use `.PageBy()` for all collection queries
- [ ] Avoid O(n²) - use dictionary/lookup instead of nested loops
- [ ] Use parallel queries when operations are independent

```csharp
// WRONG: Loads all data then filters
var ids = (await repo.GetAllAsync(x => x.IsActive)).Select(x => x.Id).ToList();

// CORRECT: Projects in query
var ids = await repo.GetAllAsync(q => q.Where(x => x.IsActive).Select(x => x.Id));
```

### Parallel Execution

```csharp
// CORRECT: Parallel independent queries
var (users, orders, products) = await (
    userRepo.GetAllAsync(filter),
    orderRepo.GetAllAsync(filter),
    productRepo.GetAllAsync(filter)
);

// WRONG: Sequential when not needed
var users = await userRepo.GetAllAsync(filter);
var orders = await orderRepo.GetAllAsync(filter);
```

### Database Indexing

```csharp
// Entity defines query expressions
public class Employee : RootEntity<Employee, string>
{
    public string CompanyId { get; set; } = "";
    public Status Status { get; set; }
    public DateTime CreatedDate { get; set; }

    // These expressions REQUIRE matching indexes
    public static Expression<Func<Employee, bool>> OfCompanyExpr(string companyId)
        => e => e.CompanyId == companyId;
    public static Expression<Func<Employee, bool>> IsActiveExpr()
        => e => e.Status == Status.Active;
}
```

**EF Core Index Configuration:**

```csharp
// DbContext OnModelCreating
modelBuilder.Entity<Employee>()
    .HasIndex(e => e.CompanyId);  // Single field

modelBuilder.Entity<Employee>()
    .HasIndex(e => new { e.CompanyId, e.Status })
    .IncludeProperties(e => new { e.FullName, e.Email });  // Covering index

modelBuilder.Entity<Employee>()
    .HasIndex(e => e.CompanyId)
    .HasFilter("Status = 'Active' AND IsDeleted = 0");  // Filtered index
```

**MongoDB Index Configuration:**

```csharp
// DbContext InitializeAsync
await EmployeeCollection.Indexes.CreateManyAsync([
    new CreateIndexModel<Employee>(
        Builders<Employee>.IndexKeys.Ascending(e => e.CompanyId)),
    new CreateIndexModel<Employee>(
        Builders<Employee>.IndexKeys
            .Ascending(e => e.CompanyId)
            .Ascending(e => e.Status)),
    new CreateIndexModel<Employee>(
        Builders<Employee>.IndexKeys
            .Text(e => e.FullName)
            .Text(e => e.Email))
]);
```

**Verification Checklist:**

- [ ] Every `static Expression` filter property has index in DbContext
- [ ] Composite indexes for multi-field queries (`CompanyId + Status`)
- [ ] Text indexes for full-text search columns (`Entity.SearchColumns()`)
- [ ] Covering indexes with `INCLUDE` for frequently selected columns (SQL Server)
- [ ] Index created in both EF migrations AND MongoDB `InitializeAsync`

---

## Security & Authorization

### Backend Authorization

- [ ] `[PlatformAuthorize]` attribute on controllers/actions
- [ ] Role validation in `ValidateRequestAsync()`
- [ ] Entity-level access expressions (`UserCanAccessExpr()`)
- [ ] Company scope validation using `RequestContext.CurrentCompanyId()`

### Frontend Authorization

- [ ] `hasRole()` checks in component getters
- [ ] `@if (hasRole(...))` guards in templates
- [ ] Route guards for protected routes

---

## Anti-Pattern Detection

### Backend Anti-Patterns

| Pattern                             | Flag As                           | Correct Approach                   |
| ----------------------------------- | --------------------------------- | ---------------------------------- |
| `throw new ValidationException()`   | Direct throw                      | Use `PlatformValidationResult`     |
| Mapping in handler                  | Handler responsibility violation  | DTO owns mapping                   |
| Side effects in command handler     | Event handler violation           | Use entity event handlers          |
| Fetch-then-delete                   | Inefficient                       | Use `DeleteByIdAsync()` directly   |
| `await otherDbContext...`           | Cross-service DB access           | Use message bus                    |
| `ICustomEntityRepository`           | Custom repository interface       | Platform repo + extensions         |

### Frontend Anti-Patterns

| Pattern                               | Flag As                    | Correct Approach            |
| ------------------------------------- | -------------------------- | --------------------------- |
| `private http: HttpClient`            | Direct HTTP                | Extend `PlatformApiService` |
| `employees = signal([])`              | Manual signals             | Use `PlatformVmStore`       |
| `ngOnChanges()`                       | Lifecycle method           | Use `@Watch` decorator      |
| `.subscribe()` without `untilDestroyed()` | Memory leak            | Add `.pipe(this.untilDestroyed())` |
| Template element without class        | Missing BEM                | Add BEM class               |
| `extends PlatformComponent`           | Wrong base class           | Use `AppBaseComponent`      |
| `private destroy$ = new Subject()`    | Manual cleanup             | Use `this.untilDestroyed()` |

---

## Code Review Process Rules

### Receiving Feedback

```
1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate requirement in own words (or ask)
3. VERIFY: Check against codebase reality
4. EVALUATE: Technically sound for THIS codebase?
5. RESPOND: Technical acknowledgment or reasoned pushback
6. IMPLEMENT: One item at a time, test each
```

### Forbidden Responses

- NEVER: "You're absolutely right!" (performative)
- NEVER: "Great point!" / "Excellent feedback!"
- NEVER: "Let me implement that now" (before verification)
- INSTEAD: Restate technical requirement, ask clarifying questions, or just start working

### When to Push Back

- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Conflicts with architectural decisions

### Acknowledging Correct Feedback

```
CORRECT: "Fixed. [Brief description of what changed]"
CORRECT: "Good catch - [specific issue]. Fixed in [location]."
CORRECT: [Just fix it and show in the code]

WRONG: "You're absolutely right!"
WRONG: "Thanks for catching that!"
```

---

## Verification Rules

### Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

### Verification Gate

```
1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
5. ONLY THEN: Make the claim
```

### Common Verification Requirements

| Claim              | Requires                          | Not Sufficient                    |
| ------------------ | --------------------------------- | --------------------------------- |
| Tests pass         | Test command output: 0 failures   | Previous run, "should pass"       |
| Linter clean       | Linter output: 0 errors           | Partial check                     |
| Build succeeds     | Build command: exit 0             | Linter passing                    |
| Bug fixed          | Test original symptom: passes     | Code changed, assumed fixed       |
| Regression test    | Red-green cycle verified          | Test passes once                  |
| Requirements met   | Line-by-line checklist            | Tests passing                     |

### Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification

---

## Pre-Removal Verification Checklist

Before removing ANY code:

- [ ] Searched static imports?
- [ ] Searched string literals in code?
- [ ] Checked dynamic invocations (attributes, properties)?
- [ ] Read actual implementations?
- [ ] Traced full dependency chain?
- [ ] Assessed what breaks if removed?
- [ ] Confidence level >= 90%?

**If ANY unchecked** → DO MORE INVESTIGATION
**If confidence < 90%** → REQUEST USER CONFIRMATION

---

## Quick Decision Trees

### Backend Task

```
Need backend feature?
├── API endpoint → PlatformBaseController + CQRS Command
├── Business logic → Command Handler in Application layer
├── Data access → Repository Extensions with static expressions
├── Cross-service → Entity Event Consumer
├── Scheduled task → PlatformApplicationBackgroundJob
└── Migration → PlatformDataMigrationExecutor / EF migrations
```

### Frontend Task

```
Need frontend feature?
├── Simple component → AppBaseComponent
├── Complex state → AppBaseVmStoreComponent + Store
├── Forms → AppBaseFormComponent
├── API calls → PlatformApiService
├── Cross-domain → apps-domains library
└── Reusable → platform-core library
```

### Helper vs Util

```
Business Logic with Dependencies (DB, Services)?
├── YES → Helper (Application layer, injectable service)
└── NO → Util (Pure functions, static class)
```

---

## Source References

| Document                                   | Content                           |
| ------------------------------------------ | --------------------------------- |
| `docs/claude/backend-patterns.md`          | CQRS, Repository, Entity patterns |
| `docs/claude/frontend-patterns.md`         | Component, Store, Form patterns   |
| `docs/claude/clean-code-rules.md`          | Naming, structure, quality        |
| `docs/claude/scss-styling-guide.md`        | BEM, SCSS structure, colors       |
| `docs/claude/advanced-patterns.md`         | Fluent helpers, anti-patterns     |
| `docs/claude/authorization-patterns.md`    | Security, roles, permissions      |
| `docs/claude/decision-trees.md`            | Quick decision guides             |
| `.claude/quick-ref/cqrs-checklist.md`      | CQRS quick reference              |
| `.claude/quick-ref/debugging-checklist.md` | Debug verification checklist      |
| `.claude/skills/code-review/references/`   | Review process, verification      |
