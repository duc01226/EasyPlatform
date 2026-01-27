---
applyTo: "**/*"
description: "Code review rules for EasyPlatform"
excludeAgent: "coding-agent"
---

# Code Review Rules

**Complete checklist:** Read [`docs/code-review-rules.md`](../../docs/code-review-rules.md)

## Backend (C#) Critical Checks

- [ ] Uses `IPlatformQueryableRootRepository<TEntity, TKey>` — not generic repository
- [ ] Uses `PlatformValidationResult` fluent API — not `throw ValidationException`
- [ ] Side effects in `UseCaseEvents/` handlers — not in command handlers
- [ ] Command + Result + Handler in ONE file
- [ ] DTO owns mapping via `MapToEntity()`/`MapToObject()` — not mapped in handler
- [ ] Cross-service via message bus — no direct DB access across services

## Frontend (TypeScript/Angular) Critical Checks

- [ ] Extends `AppBaseComponent`/`AppBaseVmStoreComponent`/`AppBaseFormComponent` — not raw Component
- [ ] Uses `PlatformVmStore` for state — not manual signals
- [ ] Extends `PlatformApiService` — not direct HttpClient
- [ ] All subscriptions have `.pipe(this.untilDestroyed())`
- [ ] ALL template elements have BEM classes (`block__element --modifier`)
- [ ] Uses `effectSimple()` for API calls in stores

## SCSS/CSS Checks

- [ ] No hardcoded hex colors — uses CSS variables
- [ ] Uses flex/grid mixins — no manual `display: flex`
- [ ] `:host` styling present
- [ ] BEM naming convention followed

## Architecture Checks

- [ ] Logic in LOWEST layer (Entity > Service > Component)
- [ ] No code duplication — searched for existing implementations
- [ ] Clean Architecture layers respected (Domain > Application > Persistence > Api)
- [ ] No over-engineering — only changes directly requested
