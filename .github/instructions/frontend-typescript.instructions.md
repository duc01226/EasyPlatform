---
applyTo: "src/Frontend/**/*.ts,src/Frontend/**/*.tsx,src/Frontend/**/*.html,src/Frontend/libs/**/*.ts"
description: "EasyPlatform frontend Angular/TypeScript patterns - Components, Stores, Forms, API Services"
---

# Frontend Angular/TypeScript Development Rules

**Full patterns with code examples:** Read [`.ai/docs/frontend-code-patterns.md`](../../.ai/docs/frontend-code-patterns.md)
**Complete guide:** Read [`docs/claude/frontend-typescript-complete-guide.md`](../../docs/claude/frontend-typescript-complete-guide.md)

## Critical Rules (MUST follow)

1. **Component hierarchy:** Extend `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent` — never raw `Component` or `PlatformComponent` directly
2. **State management:** Use `PlatformVmStore<T>` with `effectSimple()`, `updateState()`, `select()` — never manual signals
3. **API services:** Extend `PlatformApiService` with `get apiUrl` — never direct `HttpClient`
4. **Subscriptions:** Always `.pipe(this.untilDestroyed())` — never manual `unsubscribe()` or `takeUntil(destroy$)`
5. **Loading/error state:** Use `observerLoadingErrorState(key)` + `tapResponse()` — never manual loading flags
6. **Forms:** Use `PlatformFormComponent` with `initialFormConfig()` and `validateForm()` — never manual form setup
7. **BEM classes:** ALL template elements MUST have BEM classes (`block__element --modifier`) even without styling
8. **Store effects:** Use `effectSimple()` for API calls — auto-handles loading/error state
9. **Tracking:** Use `ngForTrackByItemProp<T>('id')` or `ngForTrackByImmutableList()` — never `track` by index

## Template Pattern

```html
<app-loading [target]="this">
  @if (vm(); as vm) {
    <div class="feature-name">
      <div class="feature-name__header">
        <h1 class="feature-name__title">Title</h1>
      </div>
      <div class="feature-name__content">
        @for (item of vm.items; track item.id) {
          <div class="feature-name__item">{{ item.name }}</div>
        }
      </div>
    </div>
  }
</app-loading>
```

## Anti-Patterns

- No direct `HttpClient` — extend `PlatformApiService`
- No manual signals for state — use `PlatformVmStore`
- No missing `untilDestroyed()` — always pipe subscriptions
- No elements without BEM classes — `block__element --modifier` on ALL elements
- No `private destroy$ = new Subject()` + `takeUntil` — use `this.untilDestroyed()`
