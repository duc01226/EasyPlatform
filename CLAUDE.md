# EasyPlatform - Code Instructions

> **.NET 9 + Angular 19 Development Platform Framework**

Easy.Platform is a reusable framework providing CQRS, validation, repository, message bus, and background job infrastructure for building .NET microservices with Angular frontends. The `src/Backend/` TextSnippet app demonstrates all patterns end-to-end.

Detailed patterns and protocols are in `docs/claude/`.

---

## Quick Summary (Read This First)

**What this is:** A .NET 9 backend + Angular 19 frontend monorepo built on Easy.Platform framework. Backend uses Clean Architecture (Domain → Application → Persistence → Api) with CQRS. Frontend uses Nx workspace with platform base classes.

**Golden rules (violations = bugs):**

1. **Logic goes in the LOWEST layer:** Entity/Model > Service > Component/Handler
2. **Backend:** Platform repositories only, `PlatformValidationResult` fluent API (never throw), side effects in Event Handlers (never handlers), DTOs own mapping, Command+Result+Handler in ONE file, cross-service via RabbitMQ only — *because custom implementations bypass framework audit/retry/UoW, throwing loses structured error aggregation, inline side effects create untestable coupling, and handler mapping creates transport-domain coupling*
3. **Frontend:** Extend `AppBaseComponent`/`AppBaseVmStoreComponent`/`AppBaseFormComponent` (never raw Component), `PlatformVmStore` for state, extend `PlatformApiService` (never direct HttpClient), always `untilDestroyed()`, all elements need BEM classes — *because raw Components skip subscription cleanup and loading state management, direct HttpClient bypasses centralized auth/error handling, and missing untilDestroyed() causes memory leaks on every component destroy*
4. **🔍 CRITICAL: Always search existing code patterns FIRST** before creating anything new — use Grep/Glob to find similar implementations, read base classes, verify no duplication exists — *because creating duplicate code violates DRY, bypasses battle-tested framework features, creates maintenance burden, and misses reusable utilities that already solve the problem*
5. **Always plan before implementing** non-trivial tasks (use `/plan` commands)
6. **Always create todos BEFORE any action** when the prompt modifies files or involves multiple steps — all skills are blocked without active todos when a workflow is active
7. **Detect workflow from prompt** before any tool call — match keywords to workflow table below
8. **Evidence-based only** — verify with code evidence, never fabricate or assume

**Key paths:** Backend `src/Backend/`, Frontend `src/Frontend/apps/playground-text-snippet/`, Platform framework `src/Platform/`, Patterns `docs/claude/`

**Anti-patterns (never do):** Cross-service DB access *(deployment coupling + hidden data contracts)*, side effects in command handlers *(untestable coupling + no independent retry)*, DTO mapping in handlers *(transport-domain coupling)*, direct HttpClient *(bypasses auth/error handling)*, manual signals *(loses store lifecycle management)*, missing `untilDestroyed()` *(memory leaks)*, missing BEM classes *(breaks style scoping)*, status-only test assertions *(proves nothing about domain behavior -- verify fields/flags, prefer follow-up query)*

---

## FIRST ACTION DECISION (Before ANY tool call)

**⛔ STOP — DO NOT CALL ANY TOOL YET ⛔**

1. Explicit slash command? (e.g., `/plan`, `/cook`) → Execute it
2. Prompt matches workflow? → Activate workflow + confirm if required
3. MODIFICATION keywords present? → Use Feature/Refactor/Bugfix workflow
   (update, add, create, implement, enhance, insert, fix, change, remove, delete)
4. Pure research? (no modification keywords) → Investigation workflow
5. **FALLBACK → MUST invoke `/plan <prompt>` FIRST**

**CRITICAL: Modification > Research.** If prompt contains BOTH research AND modification intent, **modification workflow wins** (investigation is a substep of `/plan`).

---

## **IMPORTANT: Task Planning Rules (MUST FOLLOW)**

- **Create todos for ANY prompt that modifies files or involves multiple steps** — if the task edits, creates, or deletes files, or requires more than one logical step, create todos FIRST before any action
- **When a workflow is active, create exactly ONE todo per workflow step** — if the workflow has 7 steps, create 7 `TaskCreate` calls. Do NOT combine or summarize steps into fewer todos. The enforcement hook will block execution if todo count < workflow step count
- **Always break tasks into many small todo items** — granular tracking prevents missed steps
- **Always add a final review todo task** to review all work done at the end to find any fix or enhancement needed
- **Mark todos complete immediately** after finishing each one — do not batch completions
- **Exactly ONE todo in_progress at any time** — complete current before starting next
- **If blocked, create a new todo** describing what needs resolution — never mark blocked tasks as completed
- **No speculation or hallucination** — always answer with proof (code evidence, file:line references, search results). If unsure, investigate first; never fabricate
- **Skip todos ONLY for:** single-line typo fixes, pure Q&A with no file changes, or `quick:` prefixed prompts

---

## CRITICAL: Always Plan Before Implement

Before implementing ANY non-trivial task, you MUST:

1. **Plan First** - Use `/plan` commands (`/plan`, `/plan-fast`, `/plan-hard`, `/plan-hard --parallel`) to create implementation plans
2. **Investigate & Analyze** - Explore codebase, understand context
3. **Create Implementation Plan** - Write detailed plan with specific files and approach
4. **Validate Plan** - Execute `/plan-validate` or `/plan-review` to check plan quality
5. **Get User Approval** - Present plan and wait for user confirmation before any code changes
6. **Only Then Implement** - Execute the approved plan

**Do NOT use `EnterPlanMode` tool** — it enters a restricted read-only mode that blocks Write, Edit, and Task tools, preventing plan file creation and subagent usage. Use `/plan` commands instead.

**Exceptions:** Single-line fixes, user says "just do it", pure research with no changes.

> **Full protocol:** See [docs/claude/architecture.md#planning-protocol](docs/claude/architecture.md#planning-protocol)

---

## Key Principles

### Code Responsibility Hierarchy (CRITICAL)

**Place logic in the LOWEST appropriate layer to enable reuse and prevent duplication:**

```text
Entity/Model (Lowest)  →  Service  →  Component/Handler (Highest)
```

| Layer            | Contains                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------- |
| **Entity/Model** | Business logic, display helpers, static factory methods, default values, dropdown options |
| **Service**      | API calls, command factories, data transformation                                         |
| **Component**    | UI event handling ONLY - delegates all logic to lower layers                              |

### Backend Principles

1. **Use Platform Repositories:** `IPlatformQueryableRootRepository<TEntity, TKey>`
2. **Use Platform Validation:** `PlatformValidationResult` fluent API
3. **Event-Driven Side Effects:** Never call side effects in command handlers
4. **CQRS File Organization:** Command + Result + Handler in ONE file
5. **DTO Mapping Responsibility:** DTOs own mapping via `MapToObject()` / `MapToEntity()`
6. **Message Bus for Cross-Service:** Never direct database access
7. **Justify Every Dependency:** Evaluate against [`docs/claude/dependency-policy.md`](docs/claude/dependency-policy.md) before adding

### Frontend Principles

1. **Component Hierarchy:** `PlatformComponent` → `AppBaseComponent` → Feature
2. **State Management:** `PlatformVmStore` for complex state
3. **API Services:** Extend `PlatformApiService`
4. **Subscription Cleanup:** Always use `untilDestroyed()`
5. **Form Validation:** Use `PlatformFormComponent` with `initialFormConfig`
6. **BEM CSS Naming:** ALL UI elements must have BEM classes (`block__element --modifier`)

### Critical Anti-Patterns

- **Backend:** No cross-service DB access, no side effects in handlers, DTO owns mapping (not handler)
- **Frontend:** No direct HttpClient, always `untilDestroyed()`, no manual signals, all elements need BEM classes
- **Testing:** No status-only test assertions -- verify domain fields/flags; prefer follow-up query over response-body-only

> **Full catalog with examples:** See [advanced-patterns.md](docs/claude/advanced-patterns.md)

### BEM Naming Convention (MANDATORY)

Every UI element MUST have a BEM class, even without special styling. Block (`user-list`) → Element (`user-list__header`) → Modifier (separate `--` class: `user-list__btn --primary --small`)

```html
<div class="user-list">
    <div class="user-list__header">
        <h1 class="user-list__title">Users</h1>
    </div>
    <div class="user-list__content">
        @for (user of vm.users; track user.id) {
        <div class="user-list__item">
            <span class="user-list__item-name">{{ user.name }}</span>
            <button class="user-list__btn --primary --small">Edit</button>
        </div>
        }
    </div>
</div>
```

> **SCSS patterns & full methodology:** See [scss-styling-guide.md](docs/claude/scss-styling-guide.md) | **Code patterns:** See [backend-patterns.md](docs/claude/backend-patterns.md) and [frontend-patterns.md](docs/claude/frontend-patterns.md)

---

## AI Agent Guidelines

### Success Factors

1. **🔍 Search-First Protocol (MANDATORY):** Before writing ANY code:
   - Use Grep to find similar implementations: `pattern: <feature-name>|<entity-name>|<concept>`
   - Use Glob to locate related files: `pattern: **/*<similar-file-pattern>*`
   - Read base classes and platform utilities
   - Verify no duplication exists
   - Document search evidence (patterns used, files reviewed)
   - **Enforcement:** `search-before-code.cjs` hook blocks Edit/Write without search evidence
2. **Evidence-Based:** Verify patterns with grep/search before implementing
3. **Platform-First:** Use Easy.Platform patterns over custom solutions
4. **Service Boundaries:** Verify through code analysis, never assume
5. **Check Base Classes:** Use IntelliSense to verify available methods

### Key Rules

- Always use TaskCreate/TaskUpdate to track tasks
- Always plan before implementing non-trivial changes
- Always verify code exists before assuming removal is safe
- Declare confidence level when uncertain (if <90%, ask user before proceeding)
- `/why-review` runs automatically in 9 workflows after implementation (`cook`/`fix`/`code`), before code review. Audits reasoning quality with Understanding Score (0-5). Score < 3 flags mechanical changes. Soft review -- never blocks commits. See `docs/adr/` for decision records it validates against.
- **Learning System:** Use `/learn <lesson>` or `remember this: <lesson>` to save patterns to `docs/lessons.md`. Lessons are auto-injected into every prompt and before file edits via `lessons-injector.cjs`.

### Investigation Workflow

When given any task:

1. **Context Discovery** - Extract domain concepts, search for related code
2. **Service Boundary** - Identify which microservice owns the concept
3. **Platform Patterns** - Check established patterns before custom solutions
4. **Evidence-Based** - Verify with code evidence, never assume

### Quick Verification Checklist

Before removing/changing ANY code:

- [ ] Searched static imports?
- [ ] Searched string literals?
- [ ] Checked dynamic invocations?
- [ ] Read actual implementations?
- [ ] Traced dependencies?
- [ ] Declared confidence level?

> **Full protocol:** See [troubleshooting.md#investigation-protocol](docs/claude/troubleshooting.md#investigation-protocol)

---

## Architecture Overview

### System Architecture

- **Backend:** .NET 9 with Clean Architecture (Domain, Application, Infrastructure, Persistence, Api)
- **Frontend:** Angular 19 Nx workspace with component-based architecture
- **Platform Foundation:** Easy.Platform framework providing base infrastructure
- **Communication:** RabbitMQ message bus for cross-service communication
- **Data Storage:** Multi-database support (MongoDB, SQL Server, PostgreSQL)

### Example Application

- **Backend:** `src/Backend/` - TextSnippet service demonstrating all patterns
- **Frontend:** `src/Frontend/apps/playground-text-snippet/` - Angular example

---

## Project Structure

### Backend

```text
src/Platform/                    # Easy.Platform framework
├── Easy.Platform/               # Core (CQRS, validation, repositories)
├── Easy.Platform.AspNetCore/    # ASP.NET Core integration
├── Easy.Platform.MongoDB/       # MongoDB patterns
├── Easy.Platform.RabbitMQ/      # Message bus
└── Easy.Platform.*/             # Other modules

src/Backend/          # Example microservice
├── *.Api/                       # Web API layer
├── *.Application/               # CQRS handlers, jobs, events
├── *.Domain/                    # Entities, domain events
├── *.Infrastructure/            # External concerns (storage, external APIs)
├── *.Persistence*/              # Database implementations
└── *.Shared/                    # Cross-service utilities
```

### Frontend

```text
src/Frontend/       # Angular 19 Nx workspace
├── apps/
│   └── playground-text-snippet/ # Example app
└── libs/
    ├── platform-core/           # Base classes, utilities
    ├── platform-components/     # Reusable UI components
    ├── apps-domains/            # Business domain code
    ├── apps-domains-components/ # Domain-specific components
    └── apps-shared-components/  # Shared app components
```

---

## Quick Decision Trees

### Backend Task

```text
Need backend feature?
├── API endpoint → PlatformBaseController + CQRS Command
├── Business logic → Command Handler in Application layer
├── Data access → Repository Extensions with static expressions
├── Cross-service → Entity Event Consumer
├── Scheduled task → PlatformApplicationPagedBackgroundJobExecutor
└── Migration → PlatformDataMigrationExecutor / EF migrations
```

### Frontend Task

```text
Need frontend feature?
├── Simple component → Extend AppBaseComponent
├── Complex state → AppBaseVmStoreComponent + PlatformVmStore
├── Forms → AppBaseFormComponent with validation
├── API calls → Service extending PlatformApiService
├── Cross-domain → apps-domains library
└── Reusable → platform-core library
```

> **More decision guides:** See [decision-trees.md](docs/claude/decision-trees.md)

---

## Documentation Index

### Quick Start (`docs/claude/`)

| Document                                       | Purpose                                | When to Use                  |
| ---------------------------------------------- | -------------------------------------- | ---------------------------- |
| [README.md](docs/claude/README.md)             | **Start here** - Navigation & decision trees | First reference for any task |
| [claude-kit-setup.md](docs/claude/claude-kit-setup.md) | Claude Kit (hooks, skills, workflows) | Hook/skill internals |

### Pattern References (`docs/claude/`)

| Document                                                                                   | Purpose                             | When to Use              |
| ------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------ |
| [backend-patterns.md](docs/claude/backend-patterns.md)                                     | CQRS, Repository, Entity, Validation | Backend tasks           |
| [frontend-patterns.md](docs/claude/frontend-patterns.md)                                   | Components, Forms, Stores, API       | Frontend tasks          |
| [advanced-patterns.md](docs/claude/advanced-patterns.md)                                   | Fluent helpers, expression composition | Complex implementations |
| [authorization-patterns.md](docs/claude/authorization-patterns.md)                         | Security and migration patterns      | Auth/migration tasks    |
| [scss-styling-guide.md](docs/claude/scss-styling-guide.md)                                 | BEM methodology, design tokens       | Styling tasks           |

### Complete Guides (`docs/claude/`)

| Document                                                                                   | Purpose                                    | Size   |
| ------------------------------------------------------------------------------------------ | ------------------------------------------ | ------ |
| [backend-csharp-complete-guide.md](docs/claude/backend-csharp-complete-guide.md)           | Comprehensive C# reference: SOLID, patterns | Large |
| [frontend-typescript-complete-guide.md](docs/claude/frontend-typescript-complete-guide.md) | Complete Angular/TS guide with principles   | Large |

### Architecture & Operations (`docs/claude/`)

| Document                                                             | Purpose                            |
| -------------------------------------------------------------------- | ---------------------------------- |
| [architecture.md](docs/claude/architecture.md)                       | System architecture & planning     |
| [troubleshooting.md](docs/claude/troubleshooting.md)                 | Investigation protocol & issues    |
| [decision-trees.md](docs/claude/decision-trees.md)                   | Quick decision guides              |
| [clean-code-rules.md](docs/claude/clean-code-rules.md)               | Universal coding standards         |
| [team-collaboration-guide.md](docs/claude/team-collaboration-guide.md) | Team roles, commands, workflows  |
| [subagent-registry.md](docs/claude/subagent-registry.md)             | Subagent capabilities & protocols  |
| [agent-orchestration-principles.md](docs/claude/agent-orchestration-principles.md) | Multi-agent coordination patterns |
| [dependency-policy.md](docs/claude/dependency-policy.md)             | Package evaluation rules           |

### Architectural Decision Records (`docs/adr/`)

| Document                                                          | Decision                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------- |
| [001-cqrs-over-crud](docs/adr/001-cqrs-over-crud.md)             | CQRS for all operations instead of plain CRUD           |
| [002-rabbitmq-message-bus](docs/adr/002-rabbitmq-message-bus.md)  | RabbitMQ for cross-service communication                |
| [003-multi-database-support](docs/adr/003-multi-database-support.md) | DB-agnostic repository with engine-specific modules  |
| [004-event-driven-side-effects](docs/adr/004-event-driven-side-effects.md) | Side effects in event handlers, not command handlers |
| [005-dto-owns-mapping](docs/adr/005-dto-owns-mapping.md)         | DTOs own all transport-to-domain mapping                |

### Project Documentation

| File                                                                    | Purpose                          |
| ----------------------------------------------------------------------- | -------------------------------- |
| [README.md](README.md)                                                  | Platform overview & quick start  |
| [Getting Started](docs/getting-started.md)                              | Dev setup & prerequisites        |
| [Architecture Overview](docs/architecture-overview.md)                  | System architecture & diagrams   |
| **[Business Features](docs/BUSINESS-FEATURES.md)**                      | **Module docs, features, APIs**  |
| [Backend Quick Reference](docs/backend-quickref.md)                     | Backend cheatsheet               |
| [Frontend Quick Reference](docs/frontend-quickref.md)                   | Frontend cheatsheet              |
| [Testing Strategy](docs/TESTING.md)                                     | Testing approach & coverage      |
| [Test Specifications](docs/test-specs/)                                 | TC-IDs, test cases by module     |
| [Design System](docs/design-system/FrontendDesignSystem.md)             | UI tokens, component library     |
| [Code Review Rules](docs/code-review-rules.md)                          | Review checklist (auto-injected) |
| [Commit Conventions](docs/contributing/commit-conventions.md)           | Conventional commit format       |
| [.ai/docs/AI-DEBUGGING-PROTOCOL.md](.ai/docs/AI-DEBUGGING-PROTOCOL.md) | Mandatory debugging & investigation protocol (includes 6-phase architectural validation) |
| [.claude/hooks/tests/](.claude/hooks/tests/)                            | Claude hooks test infrastructure |

> **Claude Hooks Development:** Check existing tests in `.claude/hooks/tests/` before adding new ones. Use `test-utils.cjs`, `hook-runner.cjs` and patterns in `suites/`.

### Prompt-Based Documentation Lookup

When a user prompt matches these keywords, read the corresponding doc first:

| User Prompt Contains                          | Read First                                                            |
| --------------------------------------------- | --------------------------------------------------------------------- |
| setup, install, prerequisites, onboarding     | `docs/getting-started.md`                                             |
| test, coverage, TC-ID, test spec              | `docs/TESTING.md`, `docs/test-specs/`                                 |
| design system, tokens, UI library             | `docs/design-system/FrontendDesignSystem.md`                          |
| commit, commit message, conventional          | `docs/contributing/commit-conventions.md`                             |
| business feature, module docs                 | `docs/BUSINESS-FEATURES.md`, `docs/business-features/`               |
| backend pattern, CQRS, repository             | `docs/backend-quickref.md` → `docs/claude/backend-patterns.md`       |
| frontend pattern, component, store            | `docs/frontend-quickref.md` → `docs/claude/frontend-patterns.md`     |
| architecture, system design                   | `docs/architecture-overview.md` → `docs/claude/architecture.md`      |
| styling, SCSS, BEM, CSS                       | `docs/claude/scss-styling-guide.md`                                   |
| security, auth, authorization                 | `docs/claude/authorization-patterns.md`                               |
| dependency, package, library                  | `docs/claude/dependency-policy.md`                                    |
| debug, investigate, troubleshoot              | `docs/claude/troubleshooting.md`                                      |
| code review, review rules                     | `docs/code-review-rules.md`                                          |
| release notes, changelog                      | `docs/release-notes/`, `CHANGELOG.md`                                |

---

## Code Patterns Reference (Quick Reference)

> Full procedural code examples are loaded **on-demand** by hooks when editing source files.
> This section contains declarative pattern names and interfaces only.

**On-demand pattern files (auto-injected when editing source files):**

- **Backend:** `.ai/docs/backend-code-patterns.md` — 16 patterns with full C# code examples
- **Frontend:** `.ai/docs/frontend-code-patterns.md` — 6 patterns with full TypeScript code examples
- **Compact reference:** `.ai/docs/compact-pattern-reference.md` — Quick lookup table for subagents

### Backend Pattern Index

| #   | Pattern            | Key Interface/Contract                                                                             |
| --- | ------------------ | -------------------------------------------------------------------------------------------------- |
| 1   | Clean Architecture | Domain → Application → Persistence → Api layers                                                    |
| 2   | Repository         | `IPlatformQueryableRootRepository<TEntity, TKey>` + static expression extensions                   |
| 3   | Repository API     | `CreateAsync`, `GetByIdAsync`, `GetAllAsync`, `FirstOrDefaultAsync`, `CountAsync`                  |
| 4   | Validation         | `PlatformValidationResult.And().AndAsync()` fluent chain, never throw                              |
| 5   | Cross-Service      | `PlatformCqrsEntityEventBusMessageProducer` + `PlatformApplicationMessageBusConsumer`              |
| 6   | Full-Text Search   | `searchService.Search(q, text, Entity.SearchColumns())` in query builder                           |
| 7   | CQRS Command       | Command + Result + Handler in ONE file, `PlatformCqrsCommandApplicationHandler`                    |
| 8   | Query              | `PlatformCqrsPagedQuery` + `GetQueryBuilder()` + parallel count/items                              |
| 9   | Side Effects       | Entity Event Handlers in `UseCaseEvents/`, never in command handlers                               |
| 10  | Entity             | `RootEntity<T, TKey>`, static expressions, `[TrackFieldUpdatedDomainEvent]`, navigation properties |
| 11  | DTO                | `PlatformEntityDto<T, TKey>.MapToEntity()`, DTO owns mapping, constructor from entity              |
| 12  | Fluent Helpers     | `.With()`, `.Then()`, `.EnsureFound()`, `.EnsureValid()`, `.ParallelAsync()`                       |
| 13  | Background Jobs    | `PlatformApplicationPagedBackgroundJobExecutor`, `[PlatformRecurringJob("cron")]`                  |
| 14  | Message Bus        | `PlatformApplicationMessageBusConsumer<TMessage>`, `TryWaitUntilAsync()` for deps                  |
| 15  | Data Migration     | `PlatformDataMigrationExecutor<TDbContext>`, `OnlyForDbsCreatedBeforeDate`                         |
| 16  | Multi-Database     | `PlatformEfCorePersistenceModule` / `PlatformMongoDbPersistenceModule`                             |

### Frontend Pattern Index

| #   | Pattern             | Key Interface/Contract                                                                 |
| --- | ------------------- | -------------------------------------------------------------------------------------- |
| 1   | Component Hierarchy | `PlatformComponent → AppBaseComponent → Feature` (never extend Platform* directly)     |
| 2   | Component API       | `observerLoadingErrorState()`, `untilDestroyed()`, `tapResponse()`, `isLoading$()`     |
| 3   | State Store         | `PlatformVmStore<T>`, `effectSimple()`, `updateState()`, `select()`                    |
| 4   | API Service         | Extend `PlatformApiService`, `get apiUrl`, typed CRUD methods                          |
| 5   | Forms               | `PlatformFormComponent`, `initialFormConfig()`, `validateForm()`, FormArray support    |
| 6   | Advanced            | `@Watch`, `skipDuplicates()`, `distinctUntilObjectValuesChanged()`, platform utilities |

> **Full templates & additional patterns (authorization, migration, helpers):** See `.ai/docs/backend-code-patterns.md` and `.ai/docs/frontend-code-patterns.md`

---

## Development Commands

### Local Development Setup

**Prerequisites:** Docker Desktop running, .NET 9 SDK, Node.js + npm.

**Step 1: Start infrastructure** (databases + message bus in Docker):

```bash
cd src
docker network create platform-example-app-network
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p easyplatform-example up --detach sql-data mongo-data postgres-sql rabbitmq redis-cache
```

Or use the CMD script: `src/start-dev-platform-example-app.infrastructure.cmd`

**Step 2: Run backend natively** (hot reload + debugging):

```bash
dotnet run --project src/Backend/PlatformExampleApp.TextSnippet.Api
```

**Step 3: Run frontend natively** (hot reload):

```bash
cd src/Frontend
npm install
npx nx serve playground-text-snippet
```

**Full Docker alternative** (builds and runs everything in containers — API on :5001, SPA on :4001):

```bash
cd src
start-dev-platform-example-app.cmd
```

### Build & Test

```bash
dotnet build src/Easy.Platform.sln                               # Build all backend
dotnet test [Project].csproj                                     # Run backend tests
cd src/Frontend && npx nx build playground-text-snippet           # Build frontend
cd src/Frontend && npx nx test platform-core                     # Run frontend tests
```

### Infrastructure Config

- Docker compose files: `src/platform-example-app.docker-compose.yml` + `*.override.yml`
- Docker project name: `easyplatform-example`
- Docker network: `platform-example-app-network` (must be created before first run)
- Default DB engine: **Postgres** (`UseDbType=Postgres` in override)
- API env when Dockerized: `ASPNETCORE_ENVIRONMENT=Development.Docker`

### Database Connections (Dev)

| Service    | Host:Port       | Credentials        | Notes                    |
| ---------- | --------------- | ------------------ | ------------------------ |
| SQL Server | localhost:14330 | sa / 123456Abc     | Port mapped from 1433    |
| MongoDB    | localhost:27017 | root / rootPassXXX | authSource=admin         |
| PostgreSQL | localhost:54320 | postgres / postgres| Port mapped from 5432    |
| Redis      | localhost:6379  | —                  |                          |
| RabbitMQ   | localhost:5672  | guest / guest      | Management UI on :15672  |

---

## Shell Environment (Windows)

Claude Code runs in Git Bash (MINGW64) on Windows. Use Unix commands, not CMD equivalents.

| Windows CMD (DON'T USE) | Unix Equivalent (USE THIS) | Purpose                  |
| ----------------------- | -------------------------- | ------------------------ |
| `dir /b /s path`        | `find path -type f`        | Recursive file listing   |
| `type file`             | `cat file`                 | View file content        |
| `copy src dst`          | `cp src dst`               | Copy file                |
| `set VAR=value`         | `export VAR=value`         | Set environment variable |

**Path handling:** Use forward slashes (`D:/GitSources/EasyPlatform`) or escaped backslashes in strings.

---

## Universal Clean Code Rules

- **No code duplication** — Search and reuse existing implementations
- **SOLID principles** — Single responsibility, dependency inversion
- **90% Logic Rule** — If logic belongs 90% to class A, put it in class A

### Naming Conventions

| Type        | Convention                | Example                                                 |
| ----------- | ------------------------- | ------------------------------------------------------- |
| Classes     | PascalCase                | `UserService`, `EmployeeDto`                            |
| Methods     | PascalCase (C#)           | `GetEmployeeAsync()`                                    |
| Methods     | camelCase (TS)            | `getEmployee()`                                         |
| Variables   | camelCase                 | `userName`, `employeeList`                              |
| Constants   | UPPER_SNAKE_CASE          | `MAX_RETRY_COUNT`                                       |
| Booleans    | Prefix with verb          | `isActive`, `hasPermission`, `canEdit`, `shouldProcess` |
| Collections | Plural                    | `users`, `items`, `employees`                           |
| BEM CSS     | block__element --modifier | All frontend template elements must have BEM classes    |

> **Detailed rules:** See [clean-code-rules.md](docs/claude/clean-code-rules.md) | **Code review rules:** [code-review-rules.md](docs/code-review-rules.md) (auto-injected on `/code-review`)

---

## Changelog & Release Notes

| Aspect         | changelog-update (Manual)       | release-notes (Automated) |
| -------------- | ------------------------------- | ------------------------- |
| **Purpose**    | Manual CHANGELOG.md updates     | Automated release notes   |
| **Input**      | Manual file review              | Conventional commits      |
| **Output**     | `CHANGELOG.md` [Unreleased]     | `docs/release-notes/*.md` |
| **When**       | During development (PR/feature) | Release time (v1.x.x)     |
| **Invocation** | `/changelog-update`             | `/release-notes`          |

---

## MCP Server Configuration

| Server              | Purpose                                      |
| ------------------- | -------------------------------------------- |
| context7            | Up-to-date library documentation retrieval   |
| figma               | Design extraction for PBI-driven development |
| github              | GitHub API integration (repos, PRs, issues)  |
| memory              | Knowledge graph for persistent memory        |
| sequential-thinking | Step-by-step problem solving                 |

Config: `.mcp.json` | Keys: `.env.local` (gitignored) | Docs: [.mcp.README.md](.mcp.README.md)

---

## Getting Help

1. **Study Examples:** `src/Backend` for backend, `src/Frontend` for frontend
2. **Search Codebase:** Use grep/glob to find existing patterns
3. **Check Rule Files:** `docs/claude/` for detailed guidance
4. **Read Base Classes:** Check platform-core source for available APIs

---

## Path-Based Skill Activation (MANDATORY)

Before creating/modifying files in these paths, ALWAYS invoke the corresponding skill first:

| Path Pattern                 | Skill                           | Pre-Read                                           |
| ---------------------------- | ------------------------------- | -------------------------------------------------- |
| `docs/business-features/**`  | `/business-feature-docs`        | `docs/templates/detailed-feature-docs-template.md` |
| `docs/features/**`           | `/feature-docs`                 | Existing sibling docs in same folder               |
| `src/**/*Command*.cs`        | `/easyplatform-backend`         | CQRS patterns in this file                         |
| `src/**/*.component.ts`      | `/frontend-angular`             | Component, form, store, API service patterns       |
| `src/**/*.store.ts`          | `/frontend-angular`             | Component, form, store, API service patterns       |
| `src/**/*-api.service.ts`    | `/frontend-angular`             | Component, form, store, API service patterns       |
| `src/**/*.component.scss`    | Read SCSS guide                 | `docs/claude/scss-styling-guide.md`                |
| Screenshot + UI intent       | `/find-component` **(before /scout)** | `docs/component-index.json`                   |

---

## CRITICAL: Todo Enforcement (Runtime Enforced — Force Workflow First)

**ALL non-meta skills are blocked** unless you have active todos. This enforces the "workflow first" pipeline: detect workflow → `/workflow-start` → `TaskCreate` → then skills.

### Always Allowed (Meta Skills — No Workflow/Tasks Required)

- `/help`, `/memory`, `/memory-management`, `/checkpoint`, `/recover`, `/context`
- `/ck-help`, `/watzup`, `/compact`, `/kanban`, `/coding-level`
- `/workflow-start` (always allowed — it's the entry point)

### Blocked Without Tasks (Everything Else)

- **Research:** `/scout`, `/investigate`, `/plan`, `/research` — require tasks when workflow active
- **Implementation:** `/cook`, `/fix`, `/code`, `/feature`, `/refactoring`
- **Testing:** `/test`, `/debug`, `/code-review`, `/commit`
- **File edits:** `Edit`, `Write`, `MultiEdit` on non-exempt files (enforced by `edit-enforcement.cjs`)

### Enforcement Architecture

| Hook | Trigger | Gates |
|------|---------|-------|
| `skill-enforcement.cjs` | PreToolUse:Skill | Blocks non-meta skills without tasks |
| `edit-enforcement.cjs` | PreToolUse:Edit\|Write\|MultiEdit\|NotebookEdit | Blocks file edits without tasks |

### Bypass

Use `quick:` prefix to bypass enforcement (not recommended):

```bash
/cook quick: add a button
```

### Context Preservation

- Todos automatically saved to checkpoints during context compaction
- Todos auto-restored on session resume (if checkpoint < 24h old)
- Subagents inherit parent todo state for context continuity
- **External Memory Swap**: Large tool outputs (>threshold) externalized to disk for post-compaction recovery

### External Memory Swap

Large tool outputs (Read >8KB, Grep >4KB, Glob >2KB, Bash >6KB) are automatically externalized to `{temp}/ck/swap/{sessionId}/` with semantic summaries for post-compaction recovery. Use `Read: {path}` to retrieve content after context loss.

> **Details:** See [claude-kit-setup.md#external-memory-swap-system](docs/claude/claude-kit-setup.md#external-memory-swap-system)

---

## Automatic Workflow Detection (MUST FOLLOW)

The `workflow-router.cjs` hook injects a workflow catalog into every qualifying prompt as a `system-reminder`. **Follow the injected catalog's detection steps exactly** — it contains the authoritative workflow list and activation procedure.

**Key rule:** When the injected catalog says to invoke `/workflow-start <id>`, do it BEFORE any other action (no file reads, no tool calls). The catalog is the single source of truth for workflow matching.

### Workflow Execution Protocol

**CRITICAL: First action after workflow detection MUST be calling `/workflow-start <workflowId>` then TaskCreate. No exceptions.**

1. **DETECT:** Read the workflow catalog above and match against user's prompt semantics. Use the Keywords column for guidance.
2. **ACTIVATE:** Call `/workflow-start <workflowId>` using the ID from the first column
3. **CREATE TODOS FIRST (HARD BLOCKING):** Use `TaskCreate` to create todo items for ALL workflow steps BEFORE doing anything else
    - This is NOT optional - it is a hard requirement
    - If you skip this step, you WILL lose track of the workflow
4. **ANNOUNCE:** Tell user: `"Detected: [Intent]. Following workflow: [sequence]"`
5. **CONFIRM (if marked Yes):** Ask: `"Proceed with this workflow? (yes/no/quick)"`
6. **EXECUTE:** Follow each step in sequence, updating todo status as you progress

> **Full workflow definitions:** See `.claude/workflows.json` | **Copilot equivalent:** [copilot-instructions.md](.github/copilot-instructions.md#workflow-decision-guide-comprehensive)
