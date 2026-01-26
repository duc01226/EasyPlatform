---
name: frontend-angular-store
description: Use when implementing state management with PlatformVmStore for complex components requiring reactive state, effects, and selectors.
infer: true
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Angular Store Development Workflow

Use when implementing PlatformVmStore state management for lists, CRUD, complex state, or shared/cached data.

## Decision Tree

```
What kind of state?
├── Component-scoped CRUD list     → @Injectable() + providers: [Store]
├── Shared state between components → @Injectable({ providedIn: 'root' })
├── Form with dependent lookups     → @Injectable() + forkJoin for parallel load
├── Cached lookup data              → @Injectable({ providedIn: 'root' }) + enableCaching
└── Simple component (no store)     → Use AppBaseVmComponent instead
```

## Workflow

1. **Search** existing stores: `grep "{Feature}Store" --include="*.ts"`
2. **Read** design system docs (see Read Directives below)
3. **Define** state interface with all required properties
4. **Implement** `vmConstructor` with default state
5. **Add** selectors via `select()`, effects via `effectSimple()`, updaters via `updateState()`
6. **Integrate** with component: extend `AppBaseVmStoreComponent`, provide store
7. **Verify** checklist below

## Key Rules

- Effects use `effectSimple(fn, 'requestKey')` - second param auto-tracks loading state
- State updates must be immutable: `updateState(state => ({ items: [...state.items, newItem] }))`
- Selectors are memoized via `select()` - return `Signal<T>`
- Use `tapResponse(success, error)` inside effects
- Component-scoped: `providers: [Store]` in `@Component`
- Singleton cached: `@Injectable({ providedIn: 'root' })` + `enableCaching`

## File Location

```
src/Frontend/apps/{app-name}/src/app/features/{feature}/
├── {feature}.store.ts
└── {feature}.component.ts
```

## Read Directives

Before implementation, read these references in order:

1. `Read .claude/skills/shared/angular-design-system.md` - hierarchy, platform APIs
2. `Read .claude/skills/shared/bem-component-examples.md` - BEM template examples
3. `Read .claude/skills/frontend-angular-store/references/store-patterns.md` - CRUD, dependent data, caching, integration
4. Read target app design system: `docs/design-system/06-state-management.md`

## Anti-Patterns

- Direct `api.subscribe()` without `effectSimple` - no loading state tracking
- `this.currentVm().items.push(newItem)` - mutates state directly
- Missing `providers: [Store]` in component decorator
- Using `observerLoadingErrorState` inside `effectSimple` (it handles loading internally)
- Store as singleton when it should be component-scoped (or vice versa)

## Verification Checklist

- [ ] State interface defines all required properties
- [ ] `vmConstructor` provides default state
- [ ] Effects use `effectSimple()` with request key
- [ ] Effects use `tapResponse()` for handling
- [ ] Selectors use `select()` for memoization
- [ ] State updates are immutable
- [ ] Store provided at correct level (component vs root)
- [ ] Caching configured if needed (`enableCaching`, `cachedStateKeyName`)
