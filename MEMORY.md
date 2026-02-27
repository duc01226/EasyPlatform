# EasyPlatform Project Memory

> Last updated: 2026-02-24

## Identity

- .NET 9 + Angular 19 framework monorepo (Easy.Platform)
- Clean Architecture: Domain > Application > Persistence > Api
- Example app: TextSnippet (`src/Backend/` + `src/Frontend/`)
- Agent config: `.claude/` (hooks, skills, workflows, memory)

## Golden Rules

1. Logic in LOWEST layer: Entity > Service > Component (never skip layers)
2. Never throw for validation -- use `PlatformValidationResult` fluent API (`.And()`, `.AndAsync()`)
3. Side effects in Entity Event Handlers only (`UseCaseEvents/`), never in command handlers
4. DTO owns mapping (`MapToEntity()` / `MapToObject()`), never map in handlers
5. Command + Result + Handler in ONE file under `UseCaseCommands/{Feature}/`
6. Always search existing code before creating anything new (grep/glob first)
7. Frontend: extend `AppBase*` classes, never `Platform*` directly
8. Cross-service communication via RabbitMQ message bus only, never direct DB access

## Anti-Patterns

- Cross-service direct DB access (creates deployment coupling + hidden data contracts)
- Missing `untilDestroyed()` on subscriptions (causes memory leaks on every component destroy)
- Missing BEM classes on template elements (breaks style scoping)
- Direct `HttpClient` usage (bypasses centralized auth/error handling)
- Manual signals instead of `PlatformVmStore` (loses store lifecycle management)
- Side effects in command handlers (creates untestable coupling, no independent retry)
- DTO mapping in handlers (creates transport-domain coupling)

## File Layout

- `src/Platform/` -- Framework core (CQRS, validation, repositories, message bus)
- `src/Backend/` -- TextSnippet service (demonstrates all patterns)
- `src/Frontend/apps/playground-text-snippet/` -- Angular example app
- `.claude/` -- Agent configuration (hooks, skills, workflows, memory)
- `docs/claude/` -- Pattern documentation and guides
- `docs/adr/` -- Architectural Decision Records
- `plans/` -- Implementation plans (naming: `YYMMDD-HHmm-slug`)

## Key Patterns

- **Repository**: `IPlatformQueryableRootRepository<TEntity, TKey>` + static expression extensions
- **Validation**: `PlatformValidationResult.And().AndAsync()` fluent chain
- **Components**: `PlatformComponent > AppBaseComponent > FeatureComponent`
- **State**: `PlatformVmStore<T>` with `effectSimple()`, `updateState()`, `select()`
- **API**: Extend `PlatformApiService`, typed CRUD methods
- **Forms**: `PlatformFormComponent` with `initialFormConfig()`, `validateForm()`
- **Background Jobs**: `PlatformApplicationPagedBackgroundJobExecutor`
- **Message Bus**: `PlatformApplicationMessageBusConsumer<TMessage>`

## Dev Commands

```bash
# Backend
dotnet build EasyPlatform.sln
dotnet test [Project].csproj

# Frontend
cd src/Frontend && npm install && nx serve playground-text-snippet

# Infrastructure
docker-compose -f src/platform-example-app.docker-compose.yml up -d
```

## Agent Conventions

- Plans: `plans/YYMMDD-HHmm-slug/plan.md` with YAML frontmatter
- Hooks: fail-open (exit 0 on error), advisory only, privacy-first (metadata only)
- Workflows: detected by `workflow-router.cjs`, tracked by `workflow-step-tracker.cjs`
- Learning: `/learn` commands save to `docs/lessons.md`, injected by `lessons-injector.cjs`
- Todos required before ALL non-meta skills (enforced by `skill-enforcement.cjs` + `edit-enforcement.cjs`)
