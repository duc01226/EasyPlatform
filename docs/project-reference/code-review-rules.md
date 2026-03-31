<!-- Last scanned: 2026-03-15 -->

# Code Review Rules

> Easy.Platform -- .NET 9 + Angular code review standards derived from actual codebase conventions.

## Quick Summary

**Goal:** Enforce consistent, high-quality code across backend (.NET 9 / CQRS) and frontend (Angular / Nx) by catching architectural drift, anti-patterns, and convention violations during review.

**Key Review Categories:**

| Category          | Scope                                                              | Rules        |
| ----------------- | ------------------------------------------------------------------ | ------------ |
| **Critical**      | Validation, DTO mapping, side effects, cross-service, base classes | CR-01..CR-07 |
| **Backend**       | Naming, CQRS, controllers, repositories, entities, formatting      | BE section   |
| **Frontend**      | ESLint, Prettier, stores, API services, BEM, logic placement       | FE section   |
| **Architecture**  | Layer boundaries, module boundaries, DB abstraction, testing       | Arch section |
| **Anti-Patterns** | 6 named anti-patterns with before/after examples                   | AP-01..AP-06 |

**Severity Levels:**

| Severity     | Meaning                                                         | Action         |
| ------------ | --------------------------------------------------------------- | -------------- |
| **Blocker**  | Breaks architecture (wrong layer, thrown exceptions, direct DB) | Must fix       |
| **Critical** | Convention violation (missing BEM, raw HttpClient, no cleanup)  | Must fix       |
| **Warning**  | Style/formatting deviation caught by linter                     | Fix or justify |

---

## Critical Rules

Highest-impact rules. Violations here cause the most bugs and architectural drift.

### CR-01: Validation via PlatformValidationResult, NEVER throw exceptions

Use fluent `.Validate()` / `.And()` / `.ThenValidate()` chains. Return validation results, do not throw.

**DO** (`src/Backend/PlatformExampleApp.TextSnippet.Domain/Entities/TaskItemEntity.cs:369-376`):

```csharp
public PlatformValidationResult<TaskItemEntity> ValidateDateRange()
{
    return this.Validate(
            _ => !StartDate.HasValue || !DueDate.HasValue || DueDate.Value >= StartDate.Value,
            "Due date must be on or after start date")
        .And(_ => !CompletedDate.HasValue || !StartDate.HasValue || CompletedDate.Value >= StartDate.Value,
            "Completed date must be on or after start date");
}
```

**DON'T**:

```csharp
// NEVER throw for business validation
if (DueDate < StartDate)
    throw new ArgumentException("Due date must be on or after start date");
```

### CR-02: DTOs own their mapping -- MapToEntity / MapToObject

DTOs inherit `PlatformEntityDto<TEntity, TKey>` and override `MapToEntity()`. Mapping logic is NEVER in handlers or controllers.

**DO** (`src/Backend/PlatformExampleApp.TextSnippet.Application/Dtos/EntityDtos/TextSnippetEntityDto.cs:17,212`):

```csharp
public sealed class TextSnippetEntityDto : PlatformEntityDto<TextSnippetEntity, string>
{
    protected override TextSnippetEntity MapToEntity(TextSnippetEntity entity, MapToEntityModes mode)
    {
        entity.SnippetText = SnippetText;
        // ...
    }
}
```

**DON'T**:

```csharp
// NEVER map in the command handler
protected override async Task<Result> HandleAsync(Command cmd, ...)
{
    var entity = new TextSnippetEntity { SnippetText = cmd.Data.SnippetText }; // Wrong layer
}
```

### CR-03: Side effects in Entity Event Handlers, NEVER in command handlers

Business side effects (cache clearing, cross-service notifications, audit logging) go in `UseCaseEvents/` handlers, not command handlers.

**DO** (`src/Backend/PlatformExampleApp.TextSnippet.Application/UseCaseEvents/ClearCaches/ClearCacheOnSaveSnippetTextEntityEventHandler.cs:12`):

```csharp
internal sealed class ClearCacheOnSaveSnippetTextEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<TextSnippetEntity>
{
    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<TextSnippetEntity> @event,
        CancellationToken cancellationToken)
    {
        await SearchSnippetTextQuery.ClearCache(cacheRepositoryProvider, @event.EntityData, ...);
    }
}
```

**DON'T**:

```csharp
// NEVER put side effects in command handler
protected override async Task<Result> HandleAsync(Command cmd, ...)
{
    await repo.CreateAsync(entity);
    await cacheService.ClearAsync(...); // Should be in event handler
    await emailService.SendAsync(...);  // Should be in event handler
}
```

### CR-04: Cross-service communication via message bus ONLY

Services communicate through RabbitMQ entity event bus messages. Never access another service's database directly.

**DO** (`src/Backend/PlatformExampleApp.TextSnippet.Application/MessageBus/Producers/EntityEventBusProducers/TextSnippetEntityEventBusMessageProducer.cs:45`):

```csharp
public class TextSnippetEntityEventBusMessage
    : PlatformCqrsEntityEventBusMessage<TextSnippetEntity, string> { }
```

**DON'T**:

```csharp
// NEVER inject another service's repository
private readonly IOtherServiceRepository<OtherEntity> otherRepo;
```

### CR-05: Frontend components must extend AppBase\* classes

All components extend `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent`. Never extend Angular's raw `Component` class.

**DO** (`src/Frontend/apps/playground-text-snippet/src/app/shared/base/app-base.component.ts:21`):

```typescript
export abstract class AppBaseComponent extends PlatformComponent {}
```

**DO** (`src/Frontend/apps/playground-text-snippet/src/app/shared/components/task-list/task-list.component.ts:59`):

```typescript
export class TaskListComponent extends AppBaseVmStoreComponent<TaskListVm, TaskListStore> {}
```

### CR-06: Use `this.untilDestroyed()` for ALL subscriptions

Every `.subscribe()` must be preceded by `.pipe(this.untilDestroyed())` to prevent memory leaks.

**DO** (`src/Frontend/apps/playground-text-snippet/src/app/shared/components/task-detail/task-detail.component.ts:206`):

```typescript
someObservable$.pipe(this.untilDestroyed()).subscribe(value => { ... });
```

**DON'T**:

```typescript
// Memory leak -- no cleanup
someObservable$.subscribe(value => { ... });
```

### CR-07: Use `var` for all local variables in C#

`.editorconfig` enforces `csharp_style_var_for_built_in_types = true:error` and `csharp_style_var_elsewhere = true:error`.

**DO**: `var items = repository.GetAll();`
**DON'T**: `List<TextSnippetEntity> items = repository.GetAll();`

---

## Backend Rules

### Naming Conventions (enforced by `.editorconfig`)

| Element                                                 | Convention                                               | Severity   |
| ------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| Classes, enums, structs, delegates, methods, properties | PascalCase                                               | error      |
| Interfaces                                              | `I` prefix + PascalCase (e.g., `ITextSnippetRepository`) | error      |
| Generic type parameters                                 | `T` prefix + PascalCase (e.g., `TEntity`)                | error      |
| Private fields                                          | camelCase (no underscore prefix)                         | suggestion |
| Local variables, parameters                             | camelCase                                                | error      |
| Constants (all scopes)                                  | PascalCase                                               | error      |
| Static readonly fields                                  | PascalCase                                               | error      |
| Non-private instance fields                             | Disallowed (use properties)                              | error      |

Reference: `src/.editorconfig:230-387`

### CQRS Command Pattern

Command, Result, and Handler in ONE file under `UseCaseCommands/{Feature}/`.

**DO** (`src/Backend/PlatformExampleApp.TextSnippet.Application/UseCaseCommands/SaveSnippetTextCommand.cs`):

```csharp
// All three in one file
public sealed class SaveSnippetTextCommand : PlatformCqrsCommand<SaveSnippetTextCommandResult> { ... }
public sealed class SaveSnippetTextCommandResult : PlatformCqrsCommandResult { ... }
internal sealed class SaveSnippetTextCommandHandler
    : PlatformCqrsCommandApplicationHandler<SaveSnippetTextCommand, SaveSnippetTextCommandResult> { ... }
```

- Command classes: `public sealed`
- Handler classes: `internal sealed`
- Handler overrides `HandleAsync(command, cancellationToken)`

### Controller Pattern

Controllers extend `PlatformBaseController`, use attribute routing, dispatch to CQRS only.

**DO** (`src/Backend/PlatformExampleApp.TextSnippet.Api/Controllers/TextSnippetController.cs:20-22`):

```csharp
[Route("api/[controller]")]
[ApiController]
public class TextSnippetController : PlatformBaseController { ... }
```

### Repository Pattern

Use `IPlatformQueryableRootRepository<TEntity, TKey>` or service-specific wrappers. Never use `DbContext` directly in handlers.

**DO** (`src/Backend/PlatformExampleApp.TextSnippet.Domain/Repositories/ITextSnippetRepository.cs:6,11`):

```csharp
public interface ITextSnippetRepository<TEntity> : IPlatformQueryableRepository<TEntity, string>
    where TEntity : class, IEntity<string> { }

public interface ITextSnippetRootRepository<TEntity> : IPlatformQueryableRootRepository<TEntity, string>,
    ITextSnippetRepository<TEntity>
    where TEntity : class, IRootEntity<string> { }
```

### Entity Design

- Business logic belongs in entity classes (lowest layer)
- Use `RootAuditedEntity<TEntity, TKey, TUserKey>` for audited entities
- Define constants in entity: `public const int FullTextMaxLength = 4000;`
- Validation methods return `PlatformValidationResult<TEntity>`

Reference: `src/Backend/PlatformExampleApp.TextSnippet.Domain/Entities/TextSnippetEntity.cs:22-24`

### Code Analysis Enforcement (`.editorconfig`)

Key rules at `error` severity:

| Rule          | Description                                  |
| ------------- | -------------------------------------------- |
| `IDE0044`     | Make field readonly                          |
| `IDE0051`     | Remove unused private members                |
| `IDE0059`     | Unnecessary value assignment                 |
| `CS4014`      | Unawaited async call                         |
| `CS8602-8604` | Nullable reference dereference               |
| `CA2208`      | Instantiate argument exceptions correctly    |
| `CA1806`      | Do not ignore method results                 |
| `SA1101`      | Prefix local calls with `this`               |
| `SA1402`      | File may only contain a single type          |
| `S1172`       | Unused method parameters should be removed   |
| `S3260`       | Non-derived private classes should be sealed |

Reference: `src/.editorconfig:406-776`

### Formatting

- 4-space indentation, braces on new line (`csharp_new_line_before_open_brace = all`)
- Sort `System` usings first, no trailing whitespace, CRLF line endings for `.cs`

---

## Frontend Rules

### ESLint Enforcement (`.eslintrc.json`)

Key rules at `error` severity:

| Rule                                               | Effect                                                                      |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| `@typescript-eslint/no-explicit-any`               | Ban `any` type                                                              |
| `@typescript-eslint/explicit-member-accessibility` | Require `public`/`private`/`protected` on all members (except constructors) |
| `@typescript-eslint/typedef`                       | Require type annotations on parameters and property declarations            |
| `@typescript-eslint/strict-boolean-expressions`    | Prevent implicit boolean coercion                                           |
| `@typescript-eslint/no-unused-vars`                | Remove unused variables (args excluded)                                     |
| `unused-imports/no-unused-imports`                 | Remove unused imports                                                       |
| `import/first`                                     | Imports must come first                                                     |
| `import/no-duplicates`                             | No duplicate imports                                                        |
| `@nx/enforce-module-boundaries`                    | Enforce Nx library boundaries                                               |

Reference: `src/Frontend/.eslintrc.json:21-101`

### Prettier Formatting

```json
{
    "printWidth": 160,
    "tabWidth": 4,
    "singleQuote": true,
    "trailingComma": "none",
    "arrowParens": "avoid"
}
```

Reference: `src/Frontend/.prettierrc`

### State Management with PlatformVmStore

- ViewModel extends `PlatformVm`, Store extends `PlatformVmStore<TViewModel>`
- Component extends `AppBaseVmStoreComponent<TViewModel, TStore>`
- Use `effectSimple()` for async operations (API calls, state transitions)

**DO** (`src/Frontend/apps/playground-text-snippet/src/app/shared/components/task-list/task-list.store.ts:119,147`):

```typescript
export class TaskListStore extends PlatformVmStore<TaskListVm> {
    public loadTasks = this.effectSimple((query: GetTaskListQuery, isReloading?: boolean) => {
        return this.taskItemApi.getList(query).pipe(/* handle response */);
    });
}
```

**DON'T**:

```typescript
// NEVER use manual signals or direct HttpClient
export class TaskListComponent {
    private data = signal<Task[]>([]);
    constructor(private http: HttpClient) {
        this.http.get('/api/tasks').subscribe(data => this.data.set(data));
    }
}
```

### API Service Pattern

All API services extend `PlatformApiService`. Never inject `HttpClient` directly in components or stores.

**DO** (`src/Frontend/libs/apps-domains/text-snippet-domain/src/lib/apis/text-snippet.api.ts:23`):

```typescript
export class TextSnippetApi extends PlatformApiService {
    protected get apiUrl(): string {
        return `${this.domainModuleConfig.textSnippetApiHost}/api/TextSnippet`;
    }

    public search(query: SearchTextSnippetQuery): Observable<PlatformPagedResultDto<TextSnippetDataModel>> {
        return this.get<IPlatformPagedResultDto<TextSnippetDataModel>>('/search', query).pipe(...);
    }
}
```

### BEM CSS Naming

All template elements must have BEM classes. Pattern: `block__element--modifier`.

**DO** (`src/Frontend/apps/playground-text-snippet/src/app/app.component.html:1-28`):

```html
<header class="app__header">
    <div class="app__errors">
        <main class="app__main">
            <div class="app__side-bar">
                <mat-form-field class="app__search-input" appearance="fill"></mat-form-field>
            </div>
        </main>
    </div>
</header>
```

**DON'T**:

```html
<div class="header">
    <div class="sidebar">
        <div class="search"></div>
    </div>
</div>
```

### Logic Placement -- Entity/Model > Service > Component

Static data (dropdown options, constants, column definitions, roles) belongs in the model/entity class, not the component.

**DO**:

```typescript
export class TaskListVm extends PlatformVm {
    public static readonly pageSize = 10;
}
```

**DON'T**:

```typescript
export class TaskListComponent {
    readonly pageSize = 10; // Should be in ViewModel or model
}
```

---

## Architecture Rules

### Layer Boundaries

```
Domain (Entities, ValueObjects, Repository Interfaces)
   ^
Application (Commands, Queries, DTOs, Event Handlers)
   ^
Infrastructure (External services, Persistence implementations)
   ^
API (Controllers -- thin, dispatch only)
```

- **Domain** has NO dependencies on Application or Infrastructure
- **Application** depends on Domain only
- **Infrastructure** implements Domain interfaces
- **API** dispatches to CQRS, no business logic
- Controllers MUST NOT contain business logic beyond dispatching commands/queries

### Frontend Module Boundaries

Enforced by `@nx/enforce-module-boundaries` in `.eslintrc.json`.

```
platform-core (framework)
   ^
platform-components (shared UI)
   ^
apps-domains (domain models + API services)
   ^
apps-domains-components (domain UI components)
   ^
apps/playground-text-snippet (app)
```

### Cross-Service Communication

- Use `PlatformCqrsEntityEventBusMessage<TEntity, TKey>` for event publishing
- Use `PlatformCqrsEntityEventBusMessageConsumer<TMessage, TEntity>` for event consumption
- NEVER call another service's API directly from backend code
- NEVER access another service's database

### Database Provider Abstraction

Supports MongoDB, PostgreSQL, and SQL Server. Business logic must be provider-agnostic.

- Use repository interfaces from Domain layer
- Each provider has its own project (`*.Persistence`, `*.Persistence.Mongo`, `*.Persistence.PostgreSql`)
- Never use provider-specific APIs (e.g., MongoDB driver) in Application layer

### Integration Testing

- Tests extend `PlatformServiceIntegrationTestFixture<TModule>`
- Subcutaneous testing: go through CQRS, not HTTP
- Use real DI container against live infrastructure
- Key methods: `ExecuteCommandAsync`, `ExecuteQueryAsync`, `AssertEntityExistsAsync<T>`

Reference: `src/Backend/PlatformExampleApp.IntegrationTests/TextSnippetIntegrationTestFixture.cs:14`

---

## Anti-Patterns

### AP-01: Business logic in controllers

Controllers dispatch to CQRS. Any logic beyond parameter mapping is wrong.

```csharp
// WRONG
[HttpPost]
public async Task<IActionResult> Save(SaveDto dto)
{
    var entity = new Entity { Name = dto.Name }; // Mapping in controller
    await repository.CreateAsync(entity);         // Direct repo access
    return Ok();
}

// CORRECT
[HttpPost]
public async Task<SaveResult> Save(SaveCommand command)
{
    return await Cqrs.SendCommandAsync(command);
}
```

### AP-02: Throwing exceptions for validation

```csharp
// WRONG
if (string.IsNullOrEmpty(name))
    throw new ValidationException("Name required");

// CORRECT
return this.Validate(_ => name.IsNotNullOrEmpty(), "Name required");
```

### AP-03: Direct HttpClient usage in frontend

```typescript
// WRONG
constructor(private http: HttpClient) {
    this.http.get('/api/items').subscribe(...);
}

// CORRECT
constructor(private itemApi: ItemApi) {
    this.itemApi.getItems().pipe(this.untilDestroyed()).subscribe(...);
}
```

### AP-04: Missing subscription cleanup

```typescript
// WRONG -- memory leak
ngOnInit() {
    this.store.state$.subscribe(state => { ... });
}

// CORRECT
ngOnInit() {
    this.store.state$.pipe(this.untilDestroyed()).subscribe(state => { ... });
}
```

### AP-05: Mapping in command handlers

```csharp
// WRONG -- mapping belongs in DTO
protected override async Task<Result> HandleAsync(Command cmd, ...)
{
    var entity = new Entity { Prop1 = cmd.Dto.Prop1, Prop2 = cmd.Dto.Prop2 };
}

// CORRECT -- DTO owns mapping
var entity = cmd.Dto.MapToEntity();
```

### AP-06: Static data in components instead of models

```typescript
// WRONG
export class MyComponent {
    readonly statusOptions = [{ value: 0, label: 'Draft' }, ...];
}

// CORRECT -- in entity/model class
export class MyEntity {
    static readonly statusOptions = [{ value: 0, label: 'Draft' }, ...];
}
```

---

## Decision Trees

### Which base component to use?

```
Does the component need state management?
  |
  +-- No --> Does it need form validation?
  |            |
  |            +-- Yes --> AppBaseFormComponent<TFormVm>
  |            +-- No  --> AppBaseComponent
  |
  +-- Yes --> AppBaseVmStoreComponent<TVm, TStore>
              (requires PlatformVmStore<TVm>)
```

### Where does logic belong? (Code Responsibility Hierarchy)

```
Is it business logic, validation, or display data?
  |
  +-- Yes --> Entity / Model class (lowest layer)
  |
  +-- Is it API communication or data transformation?
  |     |
  |     +-- Yes --> Service / API class
  |
  +-- Is it UI event handling only?
        |
        +-- Yes --> Component (highest layer, delegates down)
```

### Which CQRS pattern for a new endpoint?

```
Does it modify data?
  |
  +-- No  --> PlatformCqrsQuery<TResult> + QueryHandler
  |
  +-- Yes --> PlatformCqrsCommand<TResult> + CommandHandler
              (put Command + Result + Handler in ONE file)
```

---

## Checklists

### Backend PR Checklist

- [ ] Command/Query follows CQRS pattern (Command + Result + Handler in one file)
- [ ] Validation uses `PlatformValidationResult` fluent API, no thrown exceptions
- [ ] DTOs extend `PlatformEntityDto` and own their mapping (`MapToEntity`/`MapToObject`)
- [ ] Side effects are in `UseCaseEvents/` handlers, not in command handlers
- [ ] Repository access through `IPlatformRootRepository<TEntity>` or service-specific interface
- [ ] Controller is thin -- dispatches to CQRS only
- [ ] Entity business logic is in the entity class, not in handlers
- [ ] No cross-service direct database access (use message bus)
- [ ] Handler classes are `internal sealed`
- [ ] `var` used for all local variables
- [ ] No `any` warnings from code analysis (check `.editorconfig` rules)
- [ ] Async methods properly awaited (CS4014 = error)

### Frontend PR Checklist

- [ ] Component extends `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent`
- [ ] All subscriptions use `.pipe(this.untilDestroyed())`
- [ ] API calls go through service extending `PlatformApiService`, not direct `HttpClient`
- [ ] State management uses `PlatformVmStore` + `effectSimple()`, not manual signals
- [ ] All template elements have BEM CSS classes (`block__element--modifier`)
- [ ] No `any` type usage (`@typescript-eslint/no-explicit-any` = error)
- [ ] Explicit member accessibility on all class members (except constructors)
- [ ] Type annotations on parameters and property declarations
- [ ] Single quotes, 4-space indentation, 160 char print width (Prettier)
- [ ] No unused imports (`unused-imports/no-unused-imports` = error)
- [ ] Static data (dropdowns, constants, columns) in model/entity, not component
- [ ] Nx module boundary rules respected

### Architecture PR Checklist

- [ ] Domain layer has no upward dependencies
- [ ] No direct cross-service database access
- [ ] Cross-service communication uses entity event bus messages
- [ ] Business logic is at the lowest appropriate layer
- [ ] New persistence code is provider-agnostic (works with MongoDB, PostgreSQL, SQL Server)
- [ ] Integration tests use CQRS dispatch, not HTTP
- [ ] Breaking changes documented in CHANGELOG

---

## Closing Reminders

These are the rules reviewers most commonly miss:

- **MUST** verify side effects are in `UseCaseEvents/` handlers, not command handlers (CR-03) -- the single most frequent architectural violation
- **MUST** check every `.subscribe()` for `.pipe(this.untilDestroyed())` (CR-06) -- memory leaks are silent and cumulative
- **MUST** confirm DTOs own their mapping via `MapToEntity()`/`MapToObject()` (CR-02) -- mapping in handlers causes duplication across every consumer
- **MUST** verify static data (dropdowns, constants, column definitions) lives in entity/model classes, not components (AP-06) -- logic in the wrong layer cascades
- **MUST** ensure controllers are thin dispatchers only -- any logic beyond `Cqrs.SendCommandAsync()` is a violation (AP-01)
