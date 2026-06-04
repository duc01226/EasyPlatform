<!-- Last scanned: 2026-06-12 -->

# Code Review Rules

**Purpose:** Give every PR reviewer the repo-specific DO/DON'T rules + real `file:line` anti-patterns so violations are caught before merge — not generic style advice.

**Top 3 rules (most bugs prevented):** (1) Validation via `PlatformValidationResult` fluent API, NEVER throw exceptions for business rules. (2) Side effects in entity event handlers (`UseCaseEvents/`), NEVER in command handlers. (3) Logic in LOWEST layer: Entity > Service > Component/Handler.

---

## Critical Rules

| #   | Rule                                                                                                                                                                  | Violation Impact                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | **Validation MUST use `PlatformValidationResult` fluent API** — `.Validate()`, `.And()`, `.EnsureValid()`. NEVER throw exceptions for business validation.            | Silent failures, inconsistent error responses              |
| 2   | **Side effects MUST go in entity event handlers** (`UseCaseEvents/`), NEVER in command handlers.                                                                      | Missed side effects on other write paths, untestable logic |
| 3   | **Logic belongs in LOWEST layer** — Entity/Model > Service > Component/Handler. Constants, display helpers, dropdown options = Model layer.                           | Duplicated logic across handlers/components                |
| 4   | **DTOs own their mapping** via `MapToEntity()`/`MapToObject()`. NEVER map in handlers or controllers.                                                                 | Mapping drift, inconsistent create/update behavior         |
| 5   | **Cross-service communication MUST use RabbitMQ message bus**. NEVER access another service's database directly.                                                      | Tight coupling, data consistency issues                    |
| 6   | **Frontend components MUST extend app base classes** — `AppBaseComponent`, `AppBaseVmStoreComponent`, `AppBaseFormComponent`. NEVER extend platform classes directly. | Missed app-wide customizations                             |
| 7   | **All subscriptions MUST use `.pipe(this.untilDestroyed())`**.                                                                                                        | Memory leaks                                               |
| 8   | **MUST use `ChangeDetectionStrategy.OnPush`** and **`ViewEncapsulation.None`** on all components.                                                                     | Performance degradation, style isolation issues            |

---

## Backend Rules

### Controllers

MUST extend `PlatformBaseController`. Controllers are thin — delegate to CQRS only.

```csharp
// DO — src/Backend/PlatformExampleApp.TextSnippet.Api/Controllers/TextSnippetController.cs:22
[Route("api/[controller]")]
[ApiController]
public class TextSnippetController : PlatformBaseController
{
    public async Task<SaveSnippetTextCommandResult> Save([FromBody] SaveSnippetTextCommand request)
        => await Cqrs.SendCommand(request);
}

// DON'T — business logic in controller
public async Task<IActionResult> Save([FromBody] SaveDto dto)
{
    var entity = new MyEntity { Name = dto.Name }; // mapping in controller
    await _repository.CreateAsync(entity);          // direct repo access
    await _notificationService.Send(...);           // side effect in controller
}
```

### CQRS Commands — Command + Result + Handler in ONE File

MUST place all three classes in a single file under `UseCaseCommands/{Feature}/`.

```csharp
// DO — src/Backend/.../UseCaseCommands/SaveSnippetTextCommand.cs
public sealed class SaveSnippetTextCommand : PlatformCqrsCommand<SaveSnippetTextCommandResult>
{
    public TextSnippetEntityDto Data { get; set; }
    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return this.Validate(p => Data != null, "Data must be not null.")
            .And(p => Data.MapToEntity().Validate().Of(p));
    }
}
public sealed class SaveSnippetTextCommandResult : PlatformCqrsCommandResult
{
    public TextSnippetEntityDto SavedData { get; set; }
}
internal sealed class SaveSnippetTextCommandHandler
    : PlatformCqrsCommandApplicationHandler<SaveSnippetTextCommand, SaveSnippetTextCommandResult> { }

// DON'T — separate files for command, result, and handler
// DON'T — public handler class (MUST be internal sealed)
```

### Validation — Fluent API on Entity

Validation logic MUST live in the entity/domain layer. Command `Validate()` delegates to entity.

```csharp
// DO — src/Backend/.../Domain/Entities/TextSnippetEntity.cs:352
public PlatformValidationResult<TextSnippetEntity> ValidateCanBePublished()
{
    return this.Validate(_ => Status != SnippetStatus.Published, "Snippet is already published")
        .And(_ => !IsDeleted, "Cannot publish a deleted snippet")
        .And(_ => SnippetText.IsNotNullOrEmpty(), "Snippet text is required to publish");
}

// DO — call from handler (async + severity tagging)
// SaveSnippetTextCommand.cs:307 — .ValidateSavePermission(...).And(...).AndAsync(...).EnsureValidAsync()
entity.ValidateCanBePublished().EnsureValid();

// DON'T — throw exceptions for validation
if (entity.Status == SnippetStatus.Published)
    throw new InvalidOperationException("Already published"); // WRONG
```

**Fluent operators (use the right one):**

| Operator                                                                                          | Purpose                                   | Evidence                                                                |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| `.And(...)` / `.AndNot(...)`                                                                      | Chain sync conditions (fail-fast)         | `SaveSnippetTextCommand.cs:36-51`                                       |
| `.AndAsync(...)`                                                                                  | Chain async/DB conditions                 | `SaveSnippetTextCommand.cs:307-316`                                     |
| `.ValidateAsync(must: async () => ...)`                                                           | Entity-level async DB check               | `TextSnippetEntity.cs:276-286`                                          |
| `.ThenValidate(...)`                                                                              | Continue only if prior passed             | `SaveSnippetTextCommand.cs:36-43`                                       |
| `.CombineValidations()`                                                                           | Fail-fast across a list                   | `SaveSnippetTextCommand.cs:336`                                         |
| `.AggregateValidations()`                                                                         | Collect ALL errors across a list          | `SaveSnippetTextCommand.cs:345`                                         |
| `.WithPermissionException()` / `.WithDomainValidationException()` / `.WithApplicationException()` | Tag severity → correct HTTP/error mapping | `TextSnippetEntity.cs:336,341`; `SaveSnippetTextCommand.cs:324,328,331` |

### Static Validators on Entity

MUST define reusable validators as static methods on the entity.

```csharp
// DO — src/Backend/.../Domain/Entities/TextSnippetEntity.cs:297
public static PlatformSingleValidator<TextSnippetEntity, string> SnippetTextValidator()
{
    return new PlatformSingleValidator<TextSnippetEntity, string>(
        p => p.SnippetText, p => p.NotNull().NotEmpty().MaximumLength(SnippetTextMaxLength));
}
public override PlatformValidator<TextSnippetEntity> GetValidator()
{
    return PlatformValidator<TextSnippetEntity>.Create(SnippetTextValidator(), FullTextValidator(), AddressValidator());
}
```

### DTO Mapping — DTOs Own It

```csharp
// DO — src/Backend/.../Dtos/EntityDtos/TextSnippetEntityDto.cs:212
protected override TextSnippetEntity MapToEntity(TextSnippetEntity entity, MapToEntityModes mode)
{
    entity.SnippetText = SnippetText;
    entity.FullText = FullText;
    if (mode != MapToEntityModes.MapToUpdateExistingEntity)
        entity.Address = Address;
    return entity;
}

// DON'T — mapping in command handler
var entity = new TextSnippetEntity { SnippetText = command.Data.SnippetText }; // WRONG
```

### Entity Event Handlers — Side Effects Here

```csharp
// DO — src/Backend/.../UseCaseEvents/Snippet/SendNotificationOnPublishSnippetEventHandler.cs
internal sealed class SendNotificationOnPublishSnippetEventHandler
    : PlatformCqrsEntityEventApplicationHandler<TextSnippetEntity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<TextSnippetEntity> @event)
    {
        var statusChange = @event.FindFieldUpdatedEvent(e => e.Status);
        return statusChange?.NewValue is SnippetStatus.Published;
    }
    protected override async Task HandleAsync(PlatformCqrsEntityEvent<TextSnippetEntity> @event, CancellationToken ct)
    {
        // Send notification, update cache, trigger downstream...
    }
}

// DON'T — side effects in command handler
// await _notificationService.Send(...); // WRONG place
```

### Repositories

MUST define service-specific repository interface. NEVER use `IPlatformRootRepository<T>` directly in application code. **Read-vs-Root split:** inject the READ interface (`ITextSnippetRepository<T>`) in queries; inject the ROOT interface (`ITextSnippetRootRepository<T>`) only where writes happen.

```csharp
// DO — src/Backend/.../Domain/Repositories/ITextSnippetRepository.cs:6,11
public interface ITextSnippetRepository<TEntity>          // READ — inject in queries (SearchSnippetTextQuery.cs:86,93)
    : IPlatformQueryableRepository<TEntity, string> { }
public interface ITextSnippetRootRepository<TEntity>      // WRITE — inject in command handlers (SaveSnippetTextCommand.cs:63,70,78)
    : IPlatformQueryableRootRepository<TEntity, string>, ITextSnippetRepository<TEntity>
    where TEntity : class, IRootEntity<string>, new() { }

// DON'T — inject generic interface, or inject the Root (write) interface in a read-only query
public MyHandler(IPlatformRootRepository<MyEntity> repo) // WRONG — use service-specific
```

### Logging — Structured, Named Placeholders

MUST use structured logging with named placeholders. NEVER use string interpolation in log messages (defeats structured fields). Acquire the logger via injected `ILogger<T>` / `ILoggerFactory`, or `CreateLogger(LoggerFactory)` / `CreateGlobalLogger()` in event handlers.

```csharp
// DO — src/Backend/.../UseCaseEvents/Snippet/SendNotificationOnPublishSnippetEventHandler.cs:67
logger.LogInformation("NOTIFICATION: '{SnippetText}' (ID: {SnippetId}) {PreviousStatus} {UserId} {CategoryId}", ...);
// DO — exception as first arg — SaveSnippetTextCommand.cs:296
logger.LogWarning(e, "...");

// DON'T — interpolated message loses structured fields
logger.LogInformation($"User {userId} published {snippetId}"); // WRONG
```

### Background Jobs — `[PlatformRecurringJob]` Executor

Scheduled work MUST live in a `PlatformApplicationBackgroundJobExecutor` decorated with `[PlatformRecurringJob(cron, ...)]`. NEVER put cron logic in a command handler. Connection strings MUST come from `Configuration.GetSection(...)` — never hardcoded.

```csharp
// DO — src/Backend/.../BackgroundJob/TestRecurringBackgroundJobExecutor.cs:18
[PlatformRecurringJob("0 0 * * *", timeZoneOffset: -7)]
public sealed class TestRecurringBackgroundJobExecutor : PlatformApplicationBackgroundJobExecutor
{
    protected override async Task ProcessAsync(object param) { /* job body */ }
}
// DO — connection from config — Persistence.Mongo/TextSnippetMongoPersistenceModule.cs:18
Configuration.GetSection("MongoDB:ConnectionString");

// DON'T — cron/scheduled logic inside a command handler; hardcoded connection string
```

> Data migrations use `PlatformDataMigrationExecutor<TDbContext>` (framework pattern) — no example currently exists in TextSnippet.Application.

---

## Frontend Rules

### Component Base Classes

| Scenario       | Base Class                                    | Example                  |
| -------------- | --------------------------------------------- | ------------------------ |
| Simple display | `AppBaseComponent`                            | Static content, no state |
| State + store  | `AppBaseVmStoreComponent<TViewModel, TStore>` | Lists, dashboards        |
| Forms          | `AppBaseFormComponent<TFormVm>`               | Create/edit forms        |

```typescript
// DO — src/Frontend/apps/playground-text-snippet/src/app/app.component.ts:59
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    standalone: true
})
export class AppComponent extends AppBaseVmStoreComponent<AppVm, AppStore> {
    public constructor(store: AppStore) {
        super(store);
    }
}

// DON'T — extend platform class directly or use default change detection
export class MyComponent extends PlatformVmStoreComponent<V, S> {} // WRONG — use AppBase*
export class MyComponent extends AppBaseComponent {} // with ChangeDetectionStrategy.Default — WRONG
```

### State Management with PlatformVmStore

ViewModel MUST extend `PlatformVm`. Store MUST extend `PlatformVmStore<TViewModel>`. Use `effectSimple()` for async operations.

```typescript
// DO — src/Frontend/apps/playground-text-snippet/src/app/app.store.ts:87,107
export class AppStore extends PlatformVmStore<AppVm> {
    public loadSnippetTextItems = this.effectSimple((query: SearchTextSnippetQuery) => {
        return this.textSnippetApi.search(query).pipe(
            tap(result => this.updateVm(vm => { vm.textSnippetItems = result.items; }))
        );
    });
}

// DON'T — domain/list/async state via manual signal, or direct HttpClient, or state outside store
private items = signal<Item[]>([]);                    // WRONG — list/domain state belongs in the VM store
this.http.get<Item[]>('/api/items').subscribe(...);    // WRONG — go through PlatformApiService
```

> **Nuance:** `signal()` IS allowed for ephemeral local UI flags (e.g. `selectedTask`, `showTaskDetail` — `app.component.ts:64-65`). The forbidden case is domain/list/async/paged state, which MUST live in the `PlatformVmStore` view model.

### API Services

MUST extend `PlatformApiService`. Define `apiUrl` getter. Use `this.get<T>()`, `this.post<T>()`.

```typescript
// DO — src/Frontend/libs/apps-domains/text-snippet-domain/src/lib/apis/text-snippet.api.ts:23
@Injectable()
export class TextSnippetApi extends PlatformApiService {
    protected get apiUrl(): string {
        return `${this.domainModuleConfig.textSnippetApiHost}/api/TextSnippet`;
    }
    public search(query: SearchTextSnippetQuery): Observable<PlatformPagedResultDto<TextSnippetDataModel>> {
        return this.get<IPlatformPagedResultDto<TextSnippetDataModel>>('/search', query);
    }
}

// DON'T — direct HttpClient
constructor(private http: HttpClient) {}
this.http.get('/api/TextSnippet/search', ...); // WRONG
```

### Data Models

MUST extend `PlatformDataModel`. Constructor with `data?: Partial<T>`.

```typescript
// DO — src/Frontend/libs/apps-domains/text-snippet-domain/src/lib/data-models/text-snippet.data-model.ts:3
export class TextSnippetDataModel extends PlatformDataModel {
    public constructor(data?: Partial<TextSnippetDataModel>) {
        super(data);
        this.snippetText = data?.snippetText ?? '';
    }
    public snippetText: string = '';
}
```

### BEM Classes on All Template Elements

```html
<!-- DO — src/Frontend/apps/playground-text-snippet/src/app/shared/components/task-list/task-list.component.html -->
<div class="task-list">
    <div class="task-list__statistics">
        <div class="stat-card">
            <div class="stat-card__value">{{ vm.statistics.totalCount }}</div>
            <div class="stat-card__label">Total Tasks</div>
        </div>
    </div>
</div>

<!-- DON'T — elements without BEM classes -->
<div>
    <div class="statistics"><!-- generic, no BEM block naming --></div>
</div>
```

### ESLint Enforced Rules

Source of truth: `src/Frontend/.eslintrc.json` (root `*.ts` override) + per-app `apps/playground-text-snippet/.eslintrc.json`.

| Rule                                                                    | Severity | What It Catches                                               |
| ----------------------------------------------------------------------- | -------- | ------------------------------------------------------------- |
| `@typescript-eslint/no-explicit-any`                                    | error    | Untyped code — use proper types                               |
| `@typescript-eslint/explicit-member-accessibility`                      | error    | Missing `public`/`private`/`protected` (constructors exempt)  |
| `@typescript-eslint/strict-boolean-expressions`                         | error    | Truthy/falsy bugs (allowNullable + allowString/Number=true)   |
| `@typescript-eslint/typedef`                                            | error    | Missing types on parameters + property declarations           |
| `@typescript-eslint/no-unused-vars`                                     | error    | Unused vars (`{ args: none }`)                                |
| `unused-imports/no-unused-imports`                                      | error    | Dead imports                                                  |
| `import/first` · `import/newline-after-import` · `import/no-duplicates` | error    | Import ordering / duplicate imports                           |
| `@nx/enforce-module-boundaries`                                         | error    | Cross-lib imports that violate Nx project boundaries          |
| `sonar/function-name`                                                   | error    | Non-camelCase function names                                  |
| `prettier/prettier`                                                     | error    | Formatting (`{ endOfLine: auto }`; widths from `.prettierrc`) |
| `@angular-eslint/prefer-on-push-component-change-detection`             | error    | Missing `ChangeDetectionStrategy.OnPush` (app override)       |
| `@angular-eslint/relative-url-prefix`                                   | error    | Non-relative template/style URLs (app override)               |

> Formatting widths (printWidth 160, tabWidth 4, singleQuote, trailingComma none, arrowParens avoid) come from `.prettierrc`, not the eslint rule option. Template files: `prettier/prettier` off, `@angular-eslint/template/recommended` extended.

---

## Architecture Rules

**Runtime call flow:**

```
Controller → CQRS → Handler → Repository/Entity
                            → Entity Event Handler (side effects)
Frontend Component → Store → API Service → Backend API
```

**Project-reference direction (csproj `ProjectReference` — the authoritative compile-time contract; dependency inversion):**

```
Api ──> Application + Infrastructure + Persistence(.*)      (composition root — references everything)  [Api.csproj:41-46]
Application ──> Domain + Shared + Easy.Platform             (NO persistence, NO infrastructure)          [Application.csproj:20-22]
Infrastructure ──> Application + Easy.Platform              (implements Application-defined interfaces)   [Infrastructure.csproj:20-21]
Persistence(.*) ──> Application + Domain + EfCore/MongoDB                                                 [Persistence.csproj:12-15]
Domain ──> Easy.Platform ONLY      (leaf)                                                                 [Domain.csproj:20]
Shared ──> Easy.Platform ONLY      (leaf)                                                                 [Shared.csproj:20]
```

- Controllers MUST NOT contain business logic — only forward to CQRS
- Handlers MUST NOT contain side effects — only core use case logic
- Entities MUST NOT depend on infrastructure — only domain primitives (Domain references framework core ONLY)
- Application MUST NOT reference Persistence/Infrastructure — they depend UP on Application (dependency inversion)
- Frontend components MUST NOT call API services directly — go through store

### Cross-Service Communication

- MUST use RabbitMQ message bus. Producers/Consumers extend `PlatformCqrs{Entity,Command,Domain}EventBusMessage{Producer,Consumer}`; consumers are `internal sealed`, discovered by DI assembly scan (graph trace = 0 static edges — decoupled, not statically wired)
- NEVER access another service's database — a consumer reads/writes ITS OWN service DB; assert cross-service visibility with `WaitUntilAsync` polling (`CrossService/TextSnippetCrossServiceIntegrationTests.cs:62-99`)
- Location: `MessageBus/Producers/{Entity,Command,Domain}EventBusProducers/` and `MessageBus/Consumers/{Entity,Command,Domain}EventConsumers/`, `FreeFormatConsumers/`

### Shared Project Boundary

- `PlatformExampleApp.Shared` holds ONLY cross-assembly message contracts + global usings; references `Easy.Platform` ONLY (`Shared.csproj:20`)
- NEVER reference Domain from Shared or place business entities/DTOs there — that couples the reusable layer to one consumer's domain

### Where Logic Goes

| Logic Type                          | Correct Layer                              | Wrong Layer        |
| ----------------------------------- | ------------------------------------------ | ------------------ |
| Validation rules                    | Entity (`ValidateCanBePublished()`)        | Command handler    |
| Constants/enums                     | Entity (`FullTextMaxLength = 4000`)        | Handler/Controller |
| Display helpers                     | Entity/Model (`DisplayTitle`, `WordCount`) | Component          |
| DTO mapping                         | DTO (`MapToEntity()`)                      | Handler            |
| Side effects (notifications, cache) | Entity event handler                       | Command handler    |
| API calls                           | Store (`effectSimple()`)                   | Component          |
| Dropdown options                    | Entity/Model (static field)                | Component          |

### Testing Conventions

- Integration tests extend `PlatformServiceIntegrationTestWithAssertions<TModule>` (`TextSnippetIntegrationTestBase.cs:33-34`)
- Drive use cases via `ExecuteCommandAsync` / `ExecuteQueryAsync` — never call handlers directly
- Generate ALL test data with `IntegrationTestHelper.UniqueName(...)` (alias defined `IntegrationTests/GlobalUsings.cs:16`) — never literal/static names (collide across parallel runs)
- Assert DB state via `AssertEntityMatchesAsync<T>` / `WaitUntilAsync` (eventual consistency) — never a single immediate read
- Tag tests with `[Trait("TestSpec", "TC-...")]` for spec traceability
- **NO mocking libraries** — `grep Moq|NSubstitute` across `src/Backend` = 0. Integration-first against real DB + real bus (`FluentAssertions` only)

### Configuration & Secrets

- Bind config via `__`-delimited env vars with `${VAR:-default}` shell defaults (`src/platform-example-app.docker-compose.override.yml:64-71`); connection strings from `Configuration.GetSection(...)` (`TextSnippetMongoPersistenceModule.cs:18`)
- Keep `appsettings.Production.json` secret-free — runtime values come from env vars (verified clean)
- NEVER commit real (non-localhost) credentials. The example app's `appsettings.json:32-72` ships **localhost dev defaults** (SQL/Postgres/Mongo/RabbitMQ/Hangfire) — replace with env-var-only bindings when forking; do not treat as a credential pattern to copy

---

## Anti-Patterns

### Backend Anti-Patterns

| Anti-Pattern                                                | Correct Pattern                                   |
| ----------------------------------------------------------- | ------------------------------------------------- |
| `throw new InvalidOperationException("msg")` for validation | `this.Validate(...).EnsureValid()`                |
| Mapping entity in handler: `new Entity { Prop = cmd.Prop }` | `dto.MapToEntity()`                               |
| Side effect in handler: `await notifyService.Send(...)`     | Entity event handler in `UseCaseEvents/`          |
| Public handler class: `public class MyHandler`              | `internal sealed class MyHandler`                 |
| Direct repo in controller: `await repo.GetById(id)`         | `Cqrs.SendQuery(new GetByIdQuery { Id = id })`    |
| Generic repo: `IPlatformRootRepository<T>`                  | Service-specific: `ITextSnippetRootRepository<T>` |

> **Real violations exist in the repo as deliberate framework-demo scaffolding — DO NOT copy into a real service:**
> `TextSnippetController.cs:24-26` injects repos/DbContext into a controller; `:158-160` writes via DbContext directly; `:208-840` holds ~600 lines of business logic (all `Test*`/`Demo*` endpoints). `SaveSnippetTextCommand.cs:88` calls `sendMailService.SendEmail(...)` inside the handler **constructor** (a side-effect-in-handler anti-pattern). `TaskItemController.cs` is the clean thin-controller reference.

### Frontend Anti-Patterns

| Anti-Pattern                                                                                                                       | Correct Pattern                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `extends PlatformComponent` directly                                                                                               | `extends AppBaseComponent`                                                                     |
| `private http: HttpClient` + direct calls                                                                                          | `extends PlatformApiService`                                                                   |
| `signal<T[]>([])` for list/domain/async state                                                                                      | `PlatformVmStore` + `effectSimple()` (ephemeral local UI flags via `signal()` are OK)          |
| Option-array + label helpers duplicated in components (`task-list.component.ts:71-84,174-218`, `task-detail.component.ts:131-144`) | Static `dropdownOptions` + label helpers on the data model (`task-item.data-model.ts:220,238`) |
| `.subscribe()` without `untilDestroyed()`                                                                                          | `.pipe(this.untilDestroyed())`                                                                 |
| `ChangeDetectionStrategy.Default`                                                                                                  | `ChangeDetectionStrategy.OnPush`                                                               |
| Elements without CSS class                                                                                                         | BEM classes on every element                                                                   |
| `public` missing on class members                                                                                                  | Explicit accessibility (ESLint enforced)                                                       |
| `any` type annotation                                                                                                              | Proper typed interfaces/classes                                                                |

---

## Decision Trees

### Which Component Base Class?

- Has reactive form with validation? --> `AppBaseFormComponent<TFormVm>`
- Has complex state (API data, loading, pagination)? --> `AppBaseVmStoreComponent<TViewModel, TStore>`
- Simple display or event forwarding? --> `AppBaseComponent`

### Where to Put New Backend Logic?

- Business rule / validation? --> Entity method (`ValidateCanDoX()`)
- Constant / enum / default value? --> Entity static field
- Orchestrating repositories + services? --> Command/Query Handler
- Reaction to entity change? --> Entity Event Handler in `UseCaseEvents/`
- Cross-service data sync? --> Message Bus Consumer
- Scheduled processing? --> Background Job (`PlatformApplicationBackgroundJobExecutor`)
- Data migration? --> `PlatformDataMigrationExecutor<TDbContext>`

### Where to Put New Frontend Logic?

- Display helper / computed property? --> Data Model class
- API call? --> API Service extending `PlatformApiService`
- State management / side effects? --> Store extending `PlatformVmStore`
- UI event handling? --> Component (delegates to store)

---

## Checklists

### Backend PR Checklist

- Controllers extend `PlatformBaseController` and contain NO business logic
- Command + Result + Handler are in ONE file, handler is `internal sealed`
- Validation uses `PlatformValidationResult` fluent API — no `throw` for business rules
- Entity validation methods live on the entity, not in handlers
- DTO `MapToEntity()` handles both create and update modes (`MapToEntityModes`)
- Side effects (notifications, cache invalidation) are in entity event handlers under `UseCaseEvents/`
- Repository access uses service-specific interface, not generic `IPlatformRootRepository`
- Cross-service communication uses message bus, not direct DB access

### Frontend PR Checklist

- Component extends `AppBaseComponent` / `AppBaseVmStoreComponent` / `AppBaseFormComponent`
- `ChangeDetectionStrategy.OnPush` and `ViewEncapsulation.None` are set
- Component is `standalone: true`
- All subscriptions use `.pipe(this.untilDestroyed())`
- State managed via `PlatformVmStore` with `effectSimple()` — no manual signals
- API calls go through service extending `PlatformApiService` — no direct `HttpClient`
- All template elements have BEM classes
- No `any` types — explicit member accessibility on all members
- Data models extend `PlatformDataModel` with `Partial<T>` constructor

### Cross-Cutting PR Checklist

- Logic placed in lowest appropriate layer (Entity > Service > Component)
- No direct cross-service database access — message bus only
- Integration tests extend `PlatformServiceIntegrationTestWithAssertions<TModule>`, use `ExecuteCommandAsync`/`ExecuteQueryAsync` — no mocking libraries
- Test data uses `IntegrationTestHelper.UniqueName()` for uniqueness; DB asserts use `AssertEntityMatchesAsync`/`WaitUntilAsync`
- Tests tagged with `[Trait("TestSpec", "TC-...")]` for spec traceability
- No hardcoded credentials committed (config binds via `__` env vars)
- File naming follows kebab-case (frontend) / PascalCase (backend)
- Booleans prefixed with `is`, `has`, `can`, `should`
- Constants use UPPER_SNAKE_CASE

---

**Reminder: Top 3 rules** -- (1) `PlatformValidationResult` for validation, never throw. (2) Side effects in `UseCaseEvents/` entity event handlers, never in command handlers. (3) Logic in lowest layer: Entity > Service > Component.

**MUST ATTENTION** `TextSnippetController.cs` + `SaveSnippetTextCommand.cs:88` contain REAL violations as deliberate framework-demo scaffolding — DO NOT copy them; `TaskItemController.cs` is the clean thin-controller reference. — why: the showcase code intentionally breaks the rules to demo framework features.
