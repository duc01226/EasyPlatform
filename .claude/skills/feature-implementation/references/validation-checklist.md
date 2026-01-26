# Validation Checklist

Quick reference for pre-implementation validation, post-implementation verification, and anti-patterns.

---

## Pre-Implementation Checklist

- [ ] Discovery phase completed with code evidence
- [ ] Knowledge graph documented in `.ai/workspace/analysis/`
- [ ] Implementation plan approved by user
- [ ] All assumptions validated against actual code

---

## Backend Verification

- [ ] Entity compiles without errors
- [ ] Migration applies successfully
- [ ] Command handler saves entity correctly
- [ ] Query returns expected data
- [ ] API endpoint responds correctly
- [ ] Validation uses `PlatformValidationResult` fluent API
- [ ] No side effects in command handlers (use event handlers)
- [ ] DTO owns mapping via `MapToEntity()` / `MapToObject()`

---

## Frontend Verification

- [ ] Store loads data correctly
- [ ] Component renders without errors
- [ ] Form validation works
- [ ] CRUD operations complete
- [ ] `untilDestroyed()` on all subscriptions
- [ ] BEM classes on all template elements
- [ ] Loading/error states handled

---

## Integration Verification

- [ ] End-to-end flow works
- [ ] Error handling works
- [ ] Authorization applied correctly
- [ ] Cross-service communication via message bus (not direct DB)

---

## Anti-Patterns to AVOID

### Process Anti-Patterns

- Starting implementation without investigation
- Implementing multiple layers simultaneously
- Skipping the approval gate for large features
- Not following existing codebase patterns

### Backend Anti-Patterns

- Side effects in command handlers (use entity event handlers in `UseCaseEvents/`)
- DTO mapping in handlers (DTO owns mapping)
- Direct cross-service database access (use message bus)
- Custom repository interfaces (use platform repo + extensions)
- Manual validation throw (use `PlatformValidationResult`)

### Frontend Anti-Patterns

- `private destroy$ = new Subject()` with `takeUntil` (use `this.untilDestroyed()`)
- Direct `HttpClient` injection (extend `PlatformApiService`)
- `extends Platform*Component` directly (use `AppBase*Component`)
- Template elements without BEM classes
- Manual signals for state (use `PlatformVmStore`)

---

## Completion Checklist

- [ ] Backend layers implemented in order (Domain > Persistence > Application > API)
- [ ] Frontend layers implemented in order (API Service > Store > Components)
- [ ] Integration tested
- [ ] External memory file updated with progress
- [ ] Success validation documented
