# EasyPlatform Code Review Rules

> **Purpose:** Detailed checklist for code reviewers. Auto-injected when running /code-review skills.

## Backend (C#) - CRITICAL

### Repository Pattern
- [ ] Uses `IPlatformQueryableRootRepository<TEntity, TKey>` - never generic `IPlatformRootRepository`
- [ ] Repository extensions use static expressions for reusability
- [ ] `GetByIdsAsync()` for batch loading - never N+1 queries
- [ ] `.PageBy()` for all collection queries

### Validation Pattern
- [ ] Uses `PlatformValidationResult` fluent API (`.And()`, `.AndAsync()`)
- [ ] NEVER throws `ValidationException` directly
- [ ] Entity validation in Entity class, not Handler
- [ ] Uses `.EnsureFound()`, `.EnsureValid()` fluent helpers

### CQRS Pattern
- [ ] Command + Result + Handler in ONE file under `UseCaseCommands/{Feature}/`
- [ ] DTO owns mapping via `MapToEntity()` / `MapToObject()` - NEVER in handlers
- [ ] Side effects in Entity Event Handlers (`UseCaseEvents/`) - NEVER in command handlers

### Async Execution
- [ ] Independent async operations use tuple pattern: `var (a, b) = await (task1, task2)`
- [ ] Uses `.ParallelAsync()` for collection processing
- [ ] Flag: Sequential awaits where operations don't depend on each other

### Domain Responsibility (90% Rule)
- [ ] Logic 90% belonging to Entity → should be in Entity
- [ ] Duplicated logic across handlers → move to entity method
- [ ] Static factory methods in Entity for creation

## Frontend (TypeScript) - CRITICAL

### Component Hierarchy
- [ ] Extends `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent`
- [ ] NEVER extends `PlatformComponent` directly (use AppBase* layer)
- [ ] NEVER raw `@Component` without base class

### State Management
- [ ] Uses `PlatformVmStore` for complex state
- [ ] NEVER uses manual signals for state
- [ ] Store pattern: `effectSimple()`, `select()`, `updateState()`

### Subscription Cleanup
- [ ] ALL subscriptions use `.pipe(this.untilDestroyed())`
- [ ] Flag: Any `.subscribe()` without `untilDestroyed()`
- [ ] NEVER uses `private destroy$ = new Subject()` with `takeUntil`

### API Services
- [ ] Extends `PlatformApiService`
- [ ] NEVER uses direct `HttpClient` injection

### BEM Classes (MANDATORY)
- [ ] ALL template elements have BEM classes (`block__element --modifier`)
- [ ] Modifiers use space-separated `--` classes
- [ ] Flag: Any element without class attribute

### Change Detection
- [ ] Uses `@Watch` decorator instead of `ngOnChanges`
- [ ] Uses `@WatchWhenValuesDiff` for debounced changes

## Architecture

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

### Code Duplication
- [ ] Search for similar implementations before creating new
- [ ] Compare related handlers for shared logic
- [ ] Check for repeated mapping code

## Anti-Pattern Detection

### Backend
- [ ] Flag: `throw new ValidationException()` → use `PlatformValidationResult`
- [ ] Flag: Mapping in handler → should be in DTO
- [ ] Flag: Side effects in command handler → should be in event handler
- [ ] Flag: Fetch-then-delete → use `DeleteByIdAsync()` directly

### Frontend
- [ ] Flag: `private http: HttpClient` → should extend `PlatformApiService`
- [ ] Flag: `employees = signal([])` → should use `PlatformVmStore`
- [ ] Flag: `ngOnChanges()` → should use `@Watch` decorator
- [ ] Flag: `.subscribe()` without `.pipe(this.untilDestroyed())`
- [ ] Flag: Template elements without BEM classes
