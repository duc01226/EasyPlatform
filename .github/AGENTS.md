---
name: EasyPlatform Agent
description: Autonomous coding agent for EasyPlatform .NET 9 + Angular 19 enterprise monorepo with CQRS, PlatformVmStore, and BEM patterns
tools: ['codebase', 'terminal', 'editFiles', 'createFiles', 'search']
---

# EasyPlatform - Copilot Workspace Agent Guidelines

> Instructions for autonomous AI agents (Copilot Workspace) on how to plan, reason, and execute tasks in this codebase.

---

## Before Any Implementation

### Pre-Flight Checklist (MANDATORY)

1. **Check recent changes**: `git log --oneline -10` and `git diff HEAD~5`
2. **Verify branch**: Ensure working on correct feature branch
3. **Search for existing patterns**: Use grep/search before creating new code
4. **Review CLAUDE.md**: Reference project patterns and architecture rules

---

## Planning Workflow

### Phase 1: Investigation (MANDATORY)

**Before writing ANY code:**

1. Identify the domain/service boundary
2. Search for existing implementations of similar patterns
3. Verify platform base classes available
4. Check for integration points (message bus, events)
5. Review CLAUDE.md and docs/claude/ for relevant patterns

### Phase 2: Design

**For any non-trivial change:**

1. List all files that will be modified
2. Identify dependencies between changes
3. Plan test coverage approach
4. Consider rollback strategy
5. Estimate effort and risk

### Phase 3: Implementation Order

**Execute changes in this order:**

1. Domain layer (entities, value objects)
2. Application layer (commands, queries, events)
3. Persistence layer (repositories, migrations)
4. API layer (controllers, DTOs)
5. Tests (unit, integration)

---

## Architecture Rules

### Service Boundaries

#### Backend Architecture

```
src/PlatformExampleApp/
├── *.Domain/           → Entities, domain events
├── *.Application/      → CQRS handlers, background jobs
├── *.Persistence*/     → Data access implementations
└── *.Api/              → Web API controllers
```

#### Frontend Architecture

```
src/PlatformExampleAppWeb/
├── apps/               → Application entry points
└── libs/
    ├── platform-core/  → Framework base classes (DO NOT MODIFY)
    └── apps-domains/   → Business domain code
```

### Cross-Service Communication Rules

#### ALLOWED

- RabbitMQ message bus for async communication
- Entity event producers/consumers
- Shared DTOs in `*.Shared` projects

#### FORBIDDEN

- Direct database access across service boundaries
- Synchronous HTTP calls between services (prefer message bus)
- Shared domain entities between services

---

## File Modification Rules

### Backend Code

**When modifying backend code:**

1. **Entity changes** → Also update related DTOs and mappings
2. **Command/Query changes** → Keep handler in same file
3. **Validation changes** → Use `PlatformValidationResult` fluent API
4. **Side effects** → Create entity event handler, NOT in command handler
5. **Repository logic** → Use static expressions in entity, extend repository

### Frontend Code

**When modifying frontend code:**

1. **Component changes** → Ensure extends `AppBase*Component`
2. **State changes** → Use `PlatformVmStore`, not manual signals
3. **API calls** → Use `PlatformApiService` extension
4. **Subscriptions** → Always add `.pipe(this.untilDestroyed())`
5. **Templates** → ALL elements must have BEM classes

---

## Testing Requirements

### Before Completing a Task

1. **Backend**: Run `dotnet test` for affected projects
2. **Frontend**: Run `nx test` for affected libraries
3. **Integration**: Verify with `docker-compose up -d` if database changes
4. **Type checks**: Run `dotnet build` or `nx build`

### Test Coverage Expectations

- New commands/queries: Unit tests for handler
- New entities: Validation tests
- New API endpoints: Integration tests
- New components: Component tests with loading/error states

---

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `test`: Test additions
- `chore`: Maintenance

### Scopes

- `backend`: Backend changes
- `frontend`: Frontend changes
- `platform`: Framework changes
- `infra`: Infrastructure changes

---

## Error Handling Protocol

### When Errors Occur

1. **Read the full error message** - Don't assume based on partial info
2. **Check the stack trace** - Identify the actual source
3. **Search for similar issues** - Check existing code for patterns
4. **Verify assumptions** - Don't guess, use evidence

### Anti-Hallucination Rules

- NEVER assume code exists without searching
- NEVER assume file paths without verification
- NEVER assume API shapes without reading interfaces
- ALWAYS verify with grep/search before claiming
- ALWAYS read CLAUDE.md and relevant docs/claude/ files

---

## Multi-File Changes

### Coordination Rules

1. **Plan all changes first** - List all files before editing
2. **Maintain consistency** - Update all related files together
3. **Test incrementally** - Verify after each logical group
4. **Document dependencies** - Note which changes depend on others

### Example: Adding New Entity

```
Files to modify:
1. *.Domain/Entities/NewEntity.cs          → Entity definition
2. *.Application/Dtos/NewEntityDto.cs      → DTO with mapping
3. *.Application/Commands/SaveNewEntity.cs → CQRS command + handler
4. *.Application/Queries/GetNewEntity.cs   → CQRS query + handler
5. *.Api/Controllers/NewEntityController.cs → API endpoint
6. *.Domain/RepositoryExtensions/...cs     → Repository extension
```

---

## Performance Considerations

### Database Operations

- Use `PageBy(skip, take)` for pagination
- Use static expressions for queries (e.g., `IsActiveExpr()`)
- Batch operations with `CreateManyAsync`, `UpdateManyAsync`
- Use query builders for complex filtering

### Background Jobs

- Use `PlatformApplicationPagedBackgroundJobExecutor` for large datasets
- Implement `ProcessPagedAsync` with proper batching
- Add appropriate scheduling via `[PlatformRecurringJob]`
- Consider scrolling pattern for data affected by processing

---

## Security Checklist

Before completing any task:

- [ ] Authorization checks on all endpoints (`[PlatformAuthorize]`)
- [ ] Input validation on all DTOs (sync and async)
- [ ] No secrets/credentials in code
- [ ] Entity-level access filters applied
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (proper encoding in frontend)

---

## Development Rules

### YAGNI/KISS/DRY Principles

- **YAGNI**: Every solution must honor "You Aren't Gonna Need It"
- **KISS**: Keep It Simple, Stupid - choose simplest approach
- **DRY**: Don't Repeat Yourself - search before creating

### Real Code Only

- Never mock or simulate - implement the real functionality
- Test first: Write tests that validate actual behavior
- Review before commit: Run type checks and linting

### Code Responsibility Hierarchy

Place logic in LOWEST appropriate layer:

```
Entity/Model (Lowest) → Service → Component/Handler (Highest)
```

- **Entity/Model**: Business logic, display helpers, factory methods, defaults, dropdown options
- **Service**: API calls, command factories, data transformation
- **Component**: UI event handling ONLY - delegates to lower layers

---

## File Organization

### Backend (.NET)

- Commands: `UseCaseCommands/{Feature}/`
- Queries: `UseCaseQueries/{Feature}/`
- Events: `UseCaseEvents/{Feature}/`
- Entities: `Domain/Entities/`
- Repository Extensions: `Domain/RepositoryExtensions/`
- DTOs: `Application/Dtos/`

### Frontend (Angular)

- Features: `features/{feature}/`
- Components: `.component.ts`, `.store.ts`, `.html`, `.scss`
- Services: `services/`
- Models: `models/`

---

## Quality Gates

Before claiming work complete:

1. **Type check passes** (`dotnet build` / `nx build`)
2. **Tests pass** (100% required)
3. **No critical linting errors**
4. **Code reviewed for patterns compliance**
5. **All BEM classes applied to frontend elements**
6. **All subscriptions have `.untilDestroyed()`**

---

## Quick Reference

### Key Base Classes

| Layer      | Base Class                                   | Purpose              |
| ---------- | -------------------------------------------- | -------------------- |
| Entity     | `RootEntity<T, TKey>`                        | Domain entities      |
| Command    | `PlatformCqrsCommand<TResult>`               | CQRS commands        |
| Query      | `PlatformCqrsQuery<TResult>`                 | CQRS queries         |
| Handler    | `PlatformCqrsCommandApplicationHandler`      | Command handlers     |
| Event      | `PlatformCqrsEntityEventApplicationHandler`  | Entity event handler |
| Component  | `AppBaseVmStoreComponent`                    | Angular components   |
| Store      | `PlatformVmStore<T>`                         | State management     |
| API        | `PlatformApiService`                         | HTTP client wrapper  |

### Key Patterns

| Pattern            | Location           | Example                                      |
| ------------------ | ------------------ | -------------------------------------------- |
| Repository         | `*.Application/`   | `IPlatformQueryableRootRepository<T, TKey>`  |
| Validation         | Commands           | `.And()`, `.AndAsync()`, `.EnsureValid()`    |
| Side Effects       | `UseCaseEvents/`   | `PlatformCqrsEntityEventApplicationHandler`  |
| Background Jobs    | `BackgroundJobs/`  | `PlatformApplicationBackgroundJobExecutor`   |
| Message Bus        | `MessageBusConsumers/` | `PlatformApplicationMessageBusConsumer`  |

---

## Critical Architecture Assertions

### Backend

1. Use service-specific repositories with static expressions
2. Use PlatformValidationResult fluent API - never throw ValidationException
3. Side effects in entity event handlers - never in command handlers
4. DTOs own mapping via MapToEntity() or MapToObject()
5. Command + Result + Handler in ONE file
6. Cross-service via message bus - never direct DB access

### Frontend

7. Extend AppBase components - never raw Component
8. Use PlatformVmStore - never manual signals
9. Extend PlatformApiService - never direct HttpClient
10. Always use .untilDestroyed() - never manual unsubscribe
11. ALL elements MUST have BEM classes
12. Use PlatformFormComponent for forms with validation

### Architecture

13. Search before creating new code
14. Place logic in lowest layer (Entity > Service > Component)
15. Plan before implementing non-trivial tasks
16. 90% rule: If logic belongs 90% to class A, put it in class A

---

## Documentation References

- **Project Instructions**: `CLAUDE.md` (MUST READ FIRST)
- **Planning Protocol**: `docs/claude/01-planning-protocol.md`
- **Investigation Protocol**: `docs/claude/02-investigation-protocol.md`
- **Backend Patterns**: `docs/claude/03-backend-patterns.md`
- **Frontend Patterns**: `docs/claude/04-frontend-patterns.md`
- **Authorization**: `docs/claude/05-authorization-patterns.md`
- **Decision Trees**: `docs/claude/06-decision-trees.md`
- **Advanced Patterns**: `docs/claude/07-advanced-patterns.md`
- **Clean Code Rules**: `docs/claude/08-clean-code-rules.md`

---

_Always consult CLAUDE.md and docs/claude/ files before making architectural decisions._
