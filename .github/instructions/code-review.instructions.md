---
applyTo: "**/*.cs,**/*.ts,**/*.html,**/*.scss"
---

# Code Review Rules

> Auto-loads when editing code files. See `docs/code-review-rules.md` for comprehensive reference.

## Backend Review Checklist

- [ ] Independent awaits use `Util.TaskRunner.WhenAll()`?
- [ ] Validation logic in entity, not handler?
- [ ] Using fluent validation style (`.And()`, `.AndAsync()`)?
- [ ] Delete by ID, not fetch-then-delete?
- [ ] Queries paginated and projected?
- [ ] Service-specific repositories used (not generic `IPlatformRootRepository`)?
- [ ] DTO owns mapping responsibility (MapToObject/MapToEntity)?
- [ ] Side effects in Entity Event Handlers, not command handlers?
- [ ] No direct cross-service DB access?
- [ ] Proper `[PlatformAuthorize]` on endpoints?
- [ ] Command + Result + Handler in ONE file under `UseCaseCommands/`?
- [ ] No magic numbers/strings (use named constants)?

## Frontend Review Checklist

- [ ] Components extend platform base classes?
- [ ] No `ngOnChanges` usage (use `@Watch`)?
- [ ] All subscriptions have `untilDestroyed()`?
- [ ] Services extend `PlatformApiService`?
- [ ] No `implements OnInit, OnDestroy` without base?
- [ ] All HTML elements have BEM classes?
- [ ] Using platform store pattern (not manual signals)?
- [ ] No manual destroy Subject?
- [ ] Explicit type annotations on all functions?
- [ ] Semicolons used consistently?
- [ ] Boolean variables use is/has/can/should prefix?

## Architecture Review Checklist

- [ ] Logic in lowest appropriate layer (entity > service > component)?
- [ ] No duplicated logic across changes?
- [ ] New files in correct architectural layers?
- [ ] Service boundaries respected (no cross-service DB access)?
- [ ] Constants/dropdown options in Model, not Component?
- [ ] Searched for existing implementations before creating new?

## Decision Trees

### Where Does Logic Go?

```
Business logic/validation?     → Entity class
Data access/queries?           → Repository extensions
API calls/data transform?      → Service layer
UI event handling ONLY?        → Component/Handler
Side effects (email/notify)?   → Entity Event Handler
Cross-service sync?            → Message Bus Consumer
Scheduled processing?          → Background Job
```

### Repository Pattern

```
Simple CRUD?         → Platform repository directly
Complex queries?     → RepositoryExtensions with static expressions
Cross-service data?  → Message bus (NEVER direct DB access)
```

### Validation Pattern

```
Simple property check?    → Command.Validate()
Async check (DB lookup)?  → Handler.ValidateRequestAsync()
Business rule?            → Entity.ValidateFor{Action}()
Cross-field validation?   → PlatformValidators
```

### Component Pattern

```
Simple display?           → AppBaseComponent
Complex state?            → AppBaseVmStoreComponent<State, Store>
Form with validation?     → AppBaseFormComponent<FormVm>
```

## Critical Anti-Patterns

| DO NOT | DO INSTEAD |
|--------|-----------|
| Direct cross-service DB access | Message bus communication |
| Custom repository interfaces | Platform repos + extensions |
| `throw ValidationException` | PlatformValidationResult fluent API |
| Side effects in handler | Entity Event Handlers in `UseCaseEvents/` |
| DTO mapping in handler | DTO.MapToObject() / DTO.MapToEntity() |
| Direct `HttpClient` | Extend `PlatformApiService` |
| Manual signals for state | `PlatformVmStore` |
| `ngOnChanges` | `@Watch` decorator |
| Manual destroy Subject | `this.untilDestroyed()` |
| Elements without BEM classes | ALL elements get BEM classes |
