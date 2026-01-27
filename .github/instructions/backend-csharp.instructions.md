---
applyTo: "src/Backend/**/*.cs,src/Platform/**/*.cs"
description: "EasyPlatform backend C# patterns - CQRS, Repository, Validation, Entity, Events"
---

# Backend C# Development Rules

**Full patterns with code examples:** Read [`.ai/docs/backend-code-patterns.md`](../../.ai/docs/backend-code-patterns.md)
**Complete guide:** Read [`docs/claude/backend-csharp-complete-guide.md`](../../docs/claude/backend-csharp-complete-guide.md)

## Critical Rules (MUST follow)

1. **Repository:** Use `IPlatformQueryableRootRepository<TEntity, TKey>` with static expression extensions — never generic `IPlatformRootRepository`
2. **Validation:** Use `PlatformValidationResult.And().AndAsync()` fluent chain — never `throw ValidationException`
3. **Side effects:** Entity Event Handlers in `UseCaseEvents/` — never side effects in command handlers
4. **CQRS:** Command + Result + Handler in ONE file under `UseCaseCommands/{Feature}/`
5. **DTO mapping:** `PlatformEntityDto<TEntity, TKey>.MapToEntity()` — DTO owns mapping, not handler
6. **Cross-service:** RabbitMQ message bus only — never direct cross-service database access
7. **Architecture:** Domain > Application > Persistence > Api layers (Clean Architecture)
8. **Full-text search:** `searchService.Search(q, text, Entity.SearchColumns())` in query builder
9. **Entity:** `RootEntity<T, TKey>`, use static expressions, `[TrackFieldUpdatedDomainEvent]` for auditing
10. **Background jobs:** `PlatformApplicationPagedBackgroundJobExecutor`, `[PlatformRecurringJob("cron")]`
11. **Data migration:** `PlatformDataMigrationExecutor<TDbContext>`, use `OnlyForDbsCreatedBeforeDate`
12. **Fluent helpers:** Use `.With()`, `.Then()`, `.EnsureFound()`, `.EnsureValid()`, `.ParallelAsync()`

## Anti-Patterns

- No `throw ValidationException` — use `PlatformValidationResult` fluent API
- No side effects in command handlers — use Entity Event Handlers
- No direct cross-service DB access — use message bus
- No mapping in handlers — DTO owns mapping via `MapToEntity()`/`MapToObject()`
- No manual validation throwing — return `PlatformValidationResult`
