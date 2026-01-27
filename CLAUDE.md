# EasyPlatform - Code Instructions

> **.NET 9 + Angular 19 Development Platform Framework**

This file provides essential context and navigation for AI agents working on EasyPlatform. Detailed patterns and protocols are in `docs/claude/`.

---

## CRITICAL: Always Plan Before Implement

Before implementing ANY non-trivial task, you MUST:

1. **Enter Plan Mode First** - Use `EnterPlanMode` tool automatically
2. **Investigate & Analyze** - Explore codebase, understand context
3. **Create Implementation Plan** - Write detailed plan with specific files and approach
4. **Get User Approval** - Wait for confirmation before any code changes
5. **Only Then Implement** - Execute the approved plan

**Exceptions:** Single-line fixes, user says "just do it", pure research with no changes.

> **Full protocol:** See [docs/claude/architecture.md#planning-protocol](docs/claude/architecture.md#planning-protocol)

---

## CRITICAL: Todo Enforcement (Runtime Enforced)

Planning and implementation skills are **blocked** unless you have active todos. This is enforced by hooks.

### Allowed Without Todos (Read-Only Research & Status)

- `/scout`, `/scout:ext`, `/investigate`, `/research`, `/explore`
- `/watzup`, `/checkpoint`, `/kanban`

### Blocked Without Todos (Planning + Implementation)

- `/plan`, `/plan:fast`, `/plan:hard`, `/plan:validate`
- `/cook`, `/fix`, `/code`, `/feature`, `/implement`
- `/test`, `/debug`, `/code-review`, `/commit`
- All other skills not listed above

### Bypass

Use `quick:` prefix to bypass enforcement (not recommended):

```
/cook quick: add a button
```

### Context Preservation

- Todos automatically saved to checkpoints during context compaction
- Todos auto-restored on session resume (if checkpoint < 24h old)
- Subagents inherit parent todo state for context continuity
- **External Memory Swap**: Large tool outputs (>threshold) externalized to disk for post-compaction recovery

### External Memory Swap

Large tool outputs are automatically externalized to disk files with semantic summaries. After context compaction, exact content can be recovered without re-executing tools.

| Tool | Threshold | Summary Type                               |
| ---- | --------- | ------------------------------------------ |
| Read | 8KB       | Code signatures (class/function/interface) |
| Grep | 4KB       | Match count + preview                      |
| Glob | 2KB       | File count + extensions                    |
| Bash | 6KB       | Truncated output                           |

**How it works:**

1. PostToolUse hook detects large outputs
2. Content saved to `{temp}/ck/swap/{sessionId}/`
3. Markdown pointer injected with summary
4. On session resume: inventory table shows recoverable content
5. Use `Read: {path}` to retrieve exact content

> **Note:** Does NOT reduce active session tokens - value is post-compaction recovery only.

See: [claude-kit-setup.md#external-memory-swap-system](docs/claude/claude-kit-setup.md#external-memory-swap-system)

---

## Documentation Index

### Rule Files (docs/claude/)

| File                                                                                       | Purpose                                                  |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| [README.md](docs/claude/README.md)                                                         | Documentation index & navigation guide                   |
| [claude-kit-setup.md](docs/claude/claude-kit-setup.md)                                     | Claude Kit (ACE, hooks, skills, agents, workflows, swap) |
| [architecture.md](docs/claude/architecture.md)                                             | System architecture & planning protocol                  |
| [troubleshooting.md](docs/claude/troubleshooting.md)                                       | Investigation protocol & common issues                   |
| [backend-patterns.md](docs/claude/backend-patterns.md)                                     | Backend patterns (CQRS, Repository, etc.)                |
| [backend-csharp-complete-guide.md](docs/claude/backend-csharp-complete-guide.md)           | Comprehensive C# backend reference                       |
| [frontend-patterns.md](docs/claude/frontend-patterns.md)                                   | Angular/platform-core patterns                           |
| [frontend-typescript-complete-guide.md](docs/claude/frontend-typescript-complete-guide.md) | Comprehensive Angular/TS frontend reference              |
| [scss-styling-guide.md](docs/claude/scss-styling-guide.md)                                 | SCSS/CSS styling rules, BEM methodology                  |
| [authorization-patterns.md](docs/claude/authorization-patterns.md)                         | Security and migration patterns                          |
| [decision-trees.md](docs/claude/decision-trees.md)                                         | Quick decision guides and templates                      |
| [advanced-patterns.md](docs/claude/advanced-patterns.md)                                   | Advanced techniques and anti-patterns                    |
| [clean-code-rules.md](docs/claude/clean-code-rules.md)                                     | Universal coding standards                               |
| [team-collaboration-guide.md](docs/claude/team-collaboration-guide.md)                     | Team roles, commands, design workflows                   |

### Other Documentation

| File                                                                 | Purpose                          |
| -------------------------------------------------------------------- | -------------------------------- |
| [README.md](README.md)                                               | Platform overview & quick start  |
| [Architecture Overview](docs/architecture-overview.md)               | System architecture & diagrams   |
| **[Business Features](docs/BUSINESS-FEATURES.md)**                   | **Module docs, features, APIs**  |
| [Code Review Rules](docs/code-review-rules.md)                       | Review checklist (auto-injected) |
| [.github/AI-DEBUGGING-PROTOCOL.md](.github/AI-DEBUGGING-PROTOCOL.md) | Mandatory debugging protocol     |
| [.ai/docs/common-prompt.md](.ai/docs/common-prompt.md)               | AI agent prompt library          |
| [.claude/hooks/tests/](.claude/hooks/tests/)                         | Claude hooks test infrastructure |

> **Business Documentation:** Detailed business module documentation (requirements, workflows, APIs, test specs) is in [`docs/business-features/`](docs/business-features/). Use [`docs/BUSINESS-FEATURES.md`](docs/BUSINESS-FEATURES.md) as the master index.

> **Claude Hooks Development:** Before adding new test cases or test scripts for Claude hooks, check existing tests in `.claude/hooks/tests/` folder. Use the existing test utilities (`test-utils.cjs`, `hook-runner.cjs`) and follow established patterns in `suites/` directory.

---

## Architecture Overview

### System Architecture

- **Backend:** .NET 9 with Clean Architecture (Domain, Application, Persistence, Service)
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

```
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
├── *.Persistence*/              # Database implementations
└── *.Shared/                    # Cross-service utilities
```

### Frontend

```
src/Frontend/       # Angular 19 Nx workspace
├── apps/
│   └── playground-text-snippet/ # Example app
└── libs/
    ├── platform-core/           # Base classes, utilities
    ├── apps-domains/            # Business domain code
    ├── share-styles/            # SCSS themes
    └── share-assets/            # Static assets
```

---

## Key Principles

### Backend Principles

1. **Use Platform Repositories:** `IPlatformQueryableRootRepository<TEntity, TKey>`
2. **Use Platform Validation:** `PlatformValidationResult` fluent API
3. **Event-Driven Side Effects:** Never call side effects in command handlers
4. **CQRS File Organization:** Command + Result + Handler in ONE file
5. **DTO Mapping Responsibility:** DTOs own mapping via `MapToObject()` / `MapToEntity()`
6. **Message Bus for Cross-Service:** Never direct database access

### Frontend Principles

1. **Component Hierarchy:** `PlatformComponent` → `AppBaseComponent` → Feature
2. **State Management:** `PlatformVmStore` for complex state
3. **API Services:** Extend `PlatformApiService`
4. **Subscription Cleanup:** Always use `untilDestroyed()`
5. **Form Validation:** Use `PlatformFormComponent` with `initialFormConfig`
6. **BEM CSS Naming:** ALL UI elements must have BEM classes (`block__element --modifier`)

### BEM Naming Convention (MANDATORY)

Every UI element MUST have a BEM class, even without special styling. This makes HTML self-documenting like OOP class hierarchy. Use space-separated modifiers:

```html
<!-- ✅ CORRECT: All elements have BEM classes -->
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

**BEM Naming**: Block (`user-list`) → Element (`user-list__header`) → Modifier (separate `--` class: `user-list__btn --primary --small`)

> **SCSS patterns & full methodology:** See [scss-styling-guide.md](docs/claude/scss-styling-guide.md) | **Code patterns:** See [backend-patterns.md](docs/claude/backend-patterns.md) and [frontend-patterns.md](docs/claude/frontend-patterns.md)

### Code Responsibility Hierarchy (CRITICAL)

**Place logic in the LOWEST appropriate layer to enable reuse and prevent duplication:**

```
Entity/Model (Lowest)  →  Service  →  Component/Handler (Highest)
```

| Layer            | Contains                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------- |
| **Entity/Model** | Business logic, display helpers, static factory methods, default values, dropdown options |
| **Service**      | API calls, command factories, data transformation                                         |
| **Component**    | UI event handling ONLY - delegates all logic to lower layers                              |

**Anti-Pattern**: Logic in component/handler that should be in entity → leads to duplicated code.

```typescript
// ❌ WRONG: Logic in component
readonly providerTypes = [{ value: 1, label: 'ITViec' }, ...];

// ✅ CORRECT: Logic in entity/model
export class JobProvider {
  static readonly dropdownOptions = [{ value: 1, label: 'ITViec' }, ...];
  static getDisplayLabel(value: number): string { return this.dropdownOptions.find(x => x.value === value)?.label ?? ''; }
}

// Component just uses entity
readonly providerTypes = JobProvider.dropdownOptions;
```

---

## Quick Decision Trees

### Backend Task

```
Need backend feature?
├── API endpoint → PlatformBaseController + CQRS Command
├── Business logic → Command Handler in Application layer
├── Data access → Repository Extensions with static expressions
├── Cross-service → Entity Event Consumer
├── Scheduled task → PlatformApplicationBackgroundJob
└── Migration → PlatformDataMigrationExecutor / EF migrations
```

### Frontend Task

```
Need frontend feature?
├── Simple component → PlatformComponent
├── Complex state → PlatformVmStoreComponent + Store
├── Forms → PlatformFormComponent
├── API calls → PlatformApiService
├── Cross-domain → apps-domains library
└── Reusable → platform-core library
```

> **More decision guides:** See [decision-trees.md](docs/claude/decision-trees.md)

---

## Automatic Workflow Detection (MUST FOLLOW)

Before responding to any task request, analyze the user's prompt to detect intent and follow the appropriate workflow.

### Intent Detection Rules

| Intent                     | Trigger Keywords                                                             | Workflow Sequence                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Feature Implementation** | implement, add, create, build, develop, new feature                          | `/plan` → `/plan:review` → `/cook` → `/code-simplifier` → `/code-review` → `/test` → `/docs-update` → `/watzup`                    |
| **Bug Fix**                | bug, fix, error, broken, issue, crash, not working                           | `/scout` → `/investigate` → `/debug` → `/plan` → `/plan:review` → `/fix` → `/code-simplifier` → `/code-review` → `/test`           |
| **Verification**           | verify, validate, confirm that, check if, ensure                             | `/scout` → `/investigate` → `/test` → *[gate]* → `/plan` → `/plan:review` → `/fix` → `/code-simplifier` → `/code-review` → `/test` |
| **Documentation**          | docs, document, readme, update docs                                          | `/scout` → `/investigate` → `/docs-update` → `/watzup`                                                                             |
| **Refactoring**            | refactor, restructure, clean up, improve code                                | `/plan` → `/plan:review` → `/code` → `/code-simplifier` → `/code-review` → `/test`                                                 |
| **Review Changes**         | review current/uncommitted/staged changes                                    | `/review-changes`                                                                                                                  |
| **Code Review**            | review code, audit code, PR review, codebase review                          | `/code-review` → `/watzup`                                                                                                         |
| **Quality Audit**          | audit quality, review skills/commands/hooks, ensure best practices, no flaws | `/code-review` → `/plan` → `/code` → `/test` → `/watzup` (with CRITICAL GATE after review)                                         |
| **Investigation**          | how does, where is, explain, understand, find                                | `/scout` → `/investigate`                                                                                                          |

### Workflow Execution Protocol

**CRITICAL: First action after workflow detection MUST be TodoWrite. No exceptions.**

1. **DETECT:** Analyze user prompt for intent keywords
2. **CREATE TODOS FIRST (HARD BLOCKING):** Use `TodoWrite` to create todo items for ALL workflow steps BEFORE doing anything else
    - This is NOT optional - it is a hard requirement
    - If you skip this step, you WILL lose track of the workflow
3. **ANNOUNCE:** Tell user: `"Detected: [Intent]. Following workflow: [sequence]"`
4. **CONFIRM (for features/refactors):** Ask: `"Proceed with this workflow? (yes/no/quick)"`
5. **EXECUTE:** Follow each step in sequence, updating todo status as you progress

**What qualifies as "simple task" (exceptions):**

- Single-line code changes (typo fix, add import, rename variable)
- User explicitly says "just do it" or "no workflow needed"
- Pure information questions with no code changes

> Workflow continuity (TodoWrite tracking), recovery after context loss, and `quick:` override are handled automatically by `workflow-router.cjs` and `post-compact-recovery.cjs` hooks.

### Path-Based Skill Activation (MANDATORY)

Before creating/modifying files in these paths, ALWAYS invoke the corresponding skill first:

| Path Pattern                 | Skill                           | Pre-Read                                           |
| ---------------------------- | ------------------------------- | -------------------------------------------------- |
| `docs/business-features/**`  | `/business-feature-docs`        | `docs/templates/detailed-feature-docs-template.md` |
| `docs/features/**`           | `/feature-docs`                 | Existing sibling docs in same folder               |
| `src/**/*Command*.cs`        | `/easyplatform-backend`         | CQRS patterns in this file                         |
| `src/**/*-form.component.ts` | `/frontend-angular-form`        | Form patterns, validation rules                    |
| `src/**/*-api.service.ts`    | `/frontend-angular-api-service` | API service patterns                               |
| `src/**/*.component.ts`      | `/frontend-angular-component`   | Base component patterns                            |
| `src/**/*.store.ts`          | `/frontend-angular-store`       | Store patterns                                     |
| `src/**/*.component.scss`    | Read SCSS guide                 | `docs/claude/scss-styling-guide.md`                |

### Example

**User:** "Add a dark mode toggle to the settings page"

**Response:**

> Detected: **Feature Implementation**. Following workflow: `/plan` → `/plan:review` → `/cook` → `/code-simplifier` → `/code-review` → `/test` → `/docs-update` → `/watzup`
>
> Proceed with this workflow? (yes/no/quick)

---

## Investigation Workflow

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

## Development Commands

### Backend

```bash
dotnet build EasyPlatform.sln
dotnet run --project src/Backend/PlatformExampleApp.TextSnippet.Api
dotnet test [Project].csproj
```

### Frontend

```bash
cd src/Frontend
npm install
nx serve playground-text-snippet
nx build playground-text-snippet
nx test platform-core
```

### Infrastructure

```bash
docker-compose -f src/platform-example-app.docker-compose.yml up -d
```

### Database Connections (Dev)

| Service    | Host:Port       | Credentials         |
| ---------- | --------------- | ------------------- |
| SQL Server | localhost,14330 | sa / 123456Abc      |
| MongoDB    | localhost:27017 | root / rootPassXXX  |
| PostgreSQL | localhost:54320 | postgres / postgres |
| Redis      | localhost:6379  | -                   |
| RabbitMQ   | localhost:15672 | guest / guest       |

---

## MCP Server Configuration

This project uses Model Context Protocol (MCP) servers for enhanced AI capabilities.

| File             | Purpose                             |
| ---------------- | ----------------------------------- |
| `.mcp.json`      | Server configuration (project root) |
| `.mcp.README.md` | Setup documentation                 |
| `.env.local`     | API keys (gitignored)               |

### Configured Servers

| Server              | Purpose                                      |
| ------------------- | -------------------------------------------- |
| context7            | Up-to-date library documentation retrieval   |
| figma               | Design extraction for PBI-driven development |
| github              | GitHub API integration (repos, PRs, issues)  |
| memory              | Knowledge graph for persistent memory        |
| sequential-thinking | Step-by-step problem solving                 |

### Required API Keys

Store in `.env.local`:

```bash
FIGMA_API_KEY=your_figma_personal_access_token
GITHUB_TOKEN=your_github_personal_access_token
```

See [.mcp.README.md](.mcp.README.md) for detailed setup instructions.

---

## Code Quality

> **Full checklist:** See [clean-code-rules.md](docs/claude/clean-code-rules.md) | **Code review rules:** [code-review-rules.md](docs/code-review-rules.md) (auto-injected on `/code-review`)

---

## Critical Anti-Patterns

- **Backend:** No cross-service DB access, no side effects in handlers, DTO owns mapping (not handler)
- **Frontend:** No direct HttpClient, always `untilDestroyed()`, no manual signals, all elements need BEM classes

> **Full catalog with examples:** See [advanced-patterns.md](docs/claude/advanced-patterns.md)

---

## Changelog & Release Notes

### When to Use changelog-update vs release-notes

The workspace has two complementary tools for changelog management:

| Aspect         | changelog-update (Manual)       | release-notes (Automated) |
| -------------- | ------------------------------- | ------------------------- |
| **Purpose**    | Manual CHANGELOG.md updates     | Automated release notes   |
| **Input**      | Manual file review              | Conventional commits      |
| **Output**     | `CHANGELOG.md` [Unreleased]     | `docs/release-notes/*.md` |
| **Audience**   | Business + Technical            | Technical (commit-based)  |
| **When**       | During development (PR/feature) | Release time (v1.x.x)     |
| **Automation** | Semi-manual with temp notes     | Fully automated           |
| **Invocation** | `/changelog-update`             | `/release-notes`          |

Use `/changelog-update` during development (before PR) and `/release-notes` at release time. Each skill's SKILL.md has detailed workflows.

---

## AI Agent Guidelines

### Success Factors

1. **Evidence-Based:** Verify patterns with grep/search before implementing
2. **Platform-First:** Use Easy.Platform patterns over custom solutions
3. **Service Boundaries:** Verify through code analysis, never assume
4. **Check Base Classes:** Use IntelliSense to verify available methods

### Workflow

```
Task → Investigate → Plan → Get Approval → Implement
```

### Key Rules

- Always use TodoWrite to track tasks
- Always plan before implementing non-trivial changes
- Always verify code exists before assuming removal is safe
- Declare confidence level when uncertain (if <90%, ask user before proceeding)

---

## Universal Clean Code Rules

- **No code duplication** — Search and reuse existing implementations
- **SOLID principles** — Single responsibility, dependency inversion
- **90% Logic Rule** — If logic belongs 90% to class A, put it in class A

> **Naming conventions & detailed rules:** See [clean-code-rules.md](docs/claude/clean-code-rules.md)

---

## Getting Help

1. **Study Examples:** `src/Backend` for backend, `src/Frontend` for frontend
2. **Search Codebase:** Use grep/glob to find existing patterns
3. **Check Rule Files:** `docs/claude/` for detailed guidance
4. **Read Base Classes:** Check platform-core source for available APIs

---

*For detailed patterns and complete code examples, see the rule files in `docs/claude/`*

---

## Code Patterns Reference (Quick Reference)

> Full procedural code examples are loaded **on-demand** by hooks when editing source files.
> This section contains declarative pattern names and interfaces only.

**On-demand pattern files (auto-injected when editing source files):**

- **Backend:** `.ai/docs/backend-code-patterns.md` — 16 patterns with full C# code examples
- **Frontend:** `.ai/docs/frontend-code-patterns.md` — 6 patterns with full TypeScript code examples
- **Compact reference:** `.ai/docs/compact-pattern-reference.md` — Quick lookup table for subagents

### Backend Patterns

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

### Frontend Patterns

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

## **IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
