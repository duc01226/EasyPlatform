# EasyPlatform Development Guidelines (GitHub Copilot)

> **.NET 9 + Angular 19 Development Platform Framework**

---

## Quick Summary (Read This First)

**What this is:** .NET 9 + Angular 19 monorepo on Easy.Platform framework. Clean Architecture backend (CQRS), Nx workspace frontend with platform base classes.

**Golden rules (violations = bugs):**

1. **Logic goes in the LOWEST layer:** Entity/Model > Service > Component/Handler
2. **Backend:** Platform repos only, `PlatformValidationResult` (never throw), side effects in Event Handlers only, DTOs own mapping, Command+Result+Handler in ONE file, cross-service via RabbitMQ only
3. **Frontend:** Extend `AppBase*Component` (never raw Component), `PlatformVmStore` for state, extend `PlatformApiService` (never HttpClient), always `untilDestroyed()`, all elements need BEM classes
4. **Always search existing code** before creating new — reuse over reinvent
5. **Always detect workflow** from user prompt before any tool call
6. **Always plan** before implementing non-trivial tasks (`/plan` commands)
7. **Always use todos** to track tasks — mark complete immediately after each step
8. **Evidence-based only** — verify with tools, never fabricate or assume

**Anti-patterns (never do):** Cross-service DB access, side effects in handlers, mapping in handlers, direct HttpClient, manual signals, missing `untilDestroyed()`, missing BEM classes

**Key references:** `CLAUDE.md` for full patterns, `docs/claude/` for deep dives, `.ai/docs/` for code pattern templates

---

## FIRST ACTION DECISION (Before ANY tool call)

**⛔ STOP — DO NOT CALL ANY TOOL YET ⛔**

1. Is this a slash command (e.g., `/plan`, `/cook`)? → Execute it
2. Does prompt match a workflow? → Activate workflow
3. Is this research-only? → Proceed with investigation
4. **OTHERWISE → MUST invoke `/plan <prompt>` FIRST**

**Research-only means:** Explain, describe, list, summarize — with NO file output.
**NOT research-only:** Analyze + update, recommend + implement, review + fix → Use `/plan`

---

### IMPORTANT: Task Planning Rules (MUST FOLLOW)

> **Breaking tasks into small todos is CRITICAL for success.**

**Rules:**

1. **Always break tasks into many small, actionable todos** — Each todo should be completable in one focused step
2. **Always add a final review todo** — Review the work done at the end to find any fixes or enhancements needed
3. **Mark todos complete IMMEDIATELY** — Never batch completions; mark each done as soon as verified
4. **Only ONE todo in-progress at a time** — Focus on completing current task before starting next
5. **Update todos after EVERY command** — Check remaining steps, identify next action
6. **No speculation or hallucination** — always answer with proof (code evidence, file:line references, search results). If unsure, investigate first; never fabricate

---

> **IMPORTANT:** If the user's prompt does not match any workflows, always use the command skill `/plan <user prompt>` to create an implementation plan first.

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
    ├── apps-domains/            # Business domain code
    ├── share-styles/            # SCSS themes
    └── share-assets/            # Static assets
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
├── Scheduled task → PlatformApplicationBackgroundJob
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

---

## Copilot Documentation Architecture

| Layer                     | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| **`CLAUDE.md`** (root)    | Core principles, decision trees, architecture, patterns     |
| **`.github/prompts/`**    | Task-specific prompts (plan, fix, scout, investigate, etc.) |
| **`.claude/skills/`**     | Universal skills (auto-activated based on context)          |
| **`docs/claude/`**        | Domain-specific pattern deep dives (Memory Bank)            |
| **`docs/design-system/`** | Frontend design system documentation                        |

---

## Core Principles (MANDATORY)

**Backend Rules:**

1. Use platform repositories (`IPlatformQueryableRootRepository<TEntity, TKey>`) with static expression extensions
2. Use `PlatformValidationResult` fluent API (`.And()`, `.AndAsync()`) - never `throw ValidationException`
3. Side effects (notifications, emails, external APIs) go in Entity Event Handlers (`UseCaseEvents/`) - never in command handlers
4. DTOs own mapping via `PlatformEntityDto<TEntity, TKey>.MapToEntity()` or `PlatformDto<T>.MapToObject()` - never map in handlers
5. Command + Result + Handler in ONE file under `UseCaseCommands/{Feature}/`
6. Cross-service communication via RabbitMQ message bus only - never direct database access

**Frontend Rules:**

7. Extend `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent` - never raw `Component`
8. Use `PlatformVmStore` for state management - never manual signals
9. Extend `PlatformApiService` for HTTP calls - never direct `HttpClient`
10. Always use `.pipe(this.untilDestroyed())` for subscriptions - never manual unsubscribe
11. All template elements MUST have BEM classes (`block__element --modifier`)
12. Use `effectSimple()` for API calls - auto-handles loading/error state

**Architecture Rules:**

13. Search for existing implementations before creating new code
14. Place logic in LOWEST layer (Entity > Service > Component) to enable reuse
15. Plan (use /plan <user-prompt>) before implementing non-trivial tasks
16. Follow Clean Architecture layers: Domain > Application > Persistence > Api

---

## Prompt File Mapping

Each workflow step executes a prompt file from `.github/prompts/`:

### Workflow Prompts

| Step               | File                        | Purpose                    |
| ------------------ | --------------------------- | -------------------------- |
| `/plan`            | `plan.prompt.md`            | Create implementation plan |
| `/plan__review`    | `plan__review.prompt.md`    | Auto-review plan validity  |
| `/cook`            | `cook.prompt.md`            | Implement feature          |
| `/code`            | `code.prompt.md`            | Execute existing plan      |
| `/code-simplifier` | `code-simplifier.prompt.md` | Simplify and clean code    |
| `/test`            | `test.prompt.md`            | Run tests                  |
| `/fix`             | `fix.prompt.md`             | Apply fixes                |
| `/debug`           | `debug.prompt.md`           | Investigate issues         |
| `/review`          | `review.prompt.md`          | Review code quality        |
| `/docs__update`    | `docs__update.prompt.md`    | Update documentation       |
| `/watzup`          | `watzup.prompt.md`          | Summarize changes          |
| `/scout`           | `scout.prompt.md`           | Explore codebase           |
| `/investigate`     | `investigate.prompt.md`     | Deep dive analysis         |

### General Developer Prompts

| Prompt              | File                         | Purpose                                                 |
| ------------------- | ---------------------------- | ------------------------------------------------------- |
| `/git__cm`          | `git__cm.prompt.md`          | Smart conventional commits with auto-generated messages |
| `/git__cp`          | `git__cp.prompt.md`          | Commit and push                                         |
| `/checkpoint`       | `checkpoint.prompt.md`       | Save memory checkpoint to preserve analysis             |
| `/build`            | `build.prompt.md`            | Build backend/frontend projects                         |
| `/lint`             | `lint.prompt.md`             | Run linters and fix issues                              |
| `/fix__types`       | `fix__types.prompt.md`       | Fix TypeScript type errors                              |
| `/content__enhance` | `content__enhance.prompt.md` | Analyze and enhance UI copy quality                     |
| `/content__cro`     | `content__cro.prompt.md`     | Conversion rate optimization for CTAs                   |
| `/journal`          | `journal.prompt.md`          | Development journal entries                             |
| `/compact`          | `compact.prompt.md`          | Context compression for long sessions                   |
| `/kanban`           | `kanban.prompt.md`           | View and manage plans dashboard                         |

---

## Automatic Workflow Detection (MANDATORY — ZERO EXCEPTIONS)

> **MANDATORY:** Before responding to ANY development task, you MUST detect intent and follow the appropriate workflow. Do NOT skip this step, do NOT read files first, do NOT jump to implementation. Only handle directly if NO workflow matches.
>
> **"Simple task" exception is NARROW:** Only skip workflows for single-line typo fixes or when the user says "just do it" / prefixes with `quick:`. A prompt containing error details, stack traces, multi-line context, or multi-file changes is NEVER simple — always activate the matching workflow.

### Workflow Selection Decision Tree (PRIMARY — Use This First)

```text
Analyze user prompt for these keywords (check in order):
│
├─ "bug" | "error" | "fix" | "broken" | "crash" | "not working" | exception trace
│   └─ → bugfix
│
├─ "implement" | "add" | "create" | "build" | "develop" | "new feature"
│   └─ → feature (confirm first)
│
├─ "refactor" | "restructure" | "clean up" | "extract" | "technical debt"
│   └─ → refactor (confirm first)
│
├─ "migration" | "schema" | "add column" | "EF migration" | "alter table"
│   └─ → migration (confirm first)
│
├─ "all files" | "batch" | "bulk" | "find-replace across" | "every instance"
│   └─ → batch-operation (confirm first)
│
├─ "how does" | "where is" | "explain" | "understand" | "trace" | "explore"
│   └─ → investigation
│
├─ "review PR" | "code review" | "review this code"
│   └─ → review
│
├─ "review changes" | "pre-commit" | "staged" | "uncommitted" | "before commit"
│   └─ → review-changes
│
├─ "quality audit" | "best practices" | "ensure no flaws" | "audit-and-fix"
│   └─ → quality-audit (confirm first)
│
├─ "security" | "vulnerability" | "OWASP" | "penetration"
│   └─ → security-audit
│
├─ "performance" | "slow" | "optimize" | "N+1" | "latency" | "bottleneck"
│   └─ → performance (confirm first)
│
├─ "verify" | "validate" | "make sure" | "ensure" | "confirm works"
│   └─ → verification (confirm first)
│
├─ "deploy" | "CI/CD" | "infrastructure" | "Docker" | "pipeline"
│   └─ → deployment (confirm first)
│
├─ "docs" | "documentation" | "README"
│   ├─ target is docs/business-features/ → business-feature-docs
│   └─ otherwise → documentation
│
├─ "idea" | "product request" | "backlog" | "PBI" | "feature request"
│   └─ → idea-to-pbi (confirm first)
│
├─ "test spec" | "test cases" | "QA" | "generate tests from"
│   └─ → pbi-to-tests
│
├─ "sprint planning" | "prioritize backlog" | "iteration planning"
│   └─ → sprint-planning (confirm first)
│
├─ "status report" | "sprint update" | "project progress"
│   └─ → pm-reporting
│
├─ "release prep" | "pre-release" | "go-live" | "deployment checklist"
│   └─ → release-prep (confirm first)
│
├─ "design spec" | "wireframe" | "mockup" | "UI/UX spec"
│   └─ → design-workflow
│
├─ "prepare" | "setup" | "kick off" | "pre-coding" | "quality gate"
│   └─ → pre-development
│
└─ No keyword match → Ask user: "No workflow matched. Should I: (a) handle directly, (b) use `/plan` first, or (c) pick a workflow?"
```

### Workflow Quick Reference by Category

#### Implementation Workflows (confirm: Yes unless noted)

- `feature` — implement, add, create, build, develop
- `bugfix` — bug, error, crash, fix, debug (No confirm)
- `refactor` — restructure, clean up, extract, rename
- `migration` — schema, columns, EF migration
- `batch-operation` — all files, bulk, find-replace across
- `deployment` — CI/CD, Docker, infrastructure
- `performance` — slow, optimize, N+1, bottleneck

#### Review & Audit Workflows (confirm: Yes for audit workflows)

- `review` — PR review, code review (No confirm)
- `review-changes` — pre-commit, staged changes (No confirm)
- `quality-audit` — best practices, ensure no flaws
- `security-audit` — vulnerability, OWASP (No confirm)
- `verification` — verify, validate, make sure

#### Investigation & Documentation Workflows (No confirm)

- `investigation` — how does, where is, explain, trace
- `documentation` — general docs, README, comments
- `business-feature-docs` — 26-section template in docs/business-features/

#### Product & Planning Workflows

- `idea-to-pbi` — new idea, feature request, backlog (confirm)
- `pbi-to-tests` — test specs from PBI (No confirm)
- `sprint-planning` — prioritize, iteration planning (confirm)
- `pm-reporting` — status report, sprint update (No confirm)
- `release-prep` — pre-release checks, go-live (confirm)
- `design-workflow` — wireframe, mockup, UI spec (No confirm)
- `pre-development` — quality gate, setup for new feature (No confirm)

### Workflow Configuration

Full workflow patterns are defined in **`.claude/workflows.json`** - the single source of truth for both Claude and Copilot. Supports multilingual triggers (EN, VI, ZH, JA, KO).

> **Detailed workflow reference table:** See [Workflow Decision Guide](#workflow-decision-guide-comprehensive) at end of file.

> **Workflow execution protocol, continuity rules, override methods:** See [MANDATORY: Workflow & Task Planning](#mandatory-workflow--task-planning-read-this) at end of file.

---

## Verification Protocol (Research-Backed)

### Evidence-Based Completion Checklist

Before claiming ANY task complete, you MUST verify:

- [ ] **Files Modified** - Re-read specific lines that were changed (never trust memory)
- [ ] **Commands Run** - Captured actual output (build, test, lint commands)
- [ ] **Tests Passed** - Verified test success with concrete output
- [ ] **No Errors** - Checked get_errors tool for compilation/lint errors
- [ ] **Filesystem Verified** - Used file_search/grep_search to confirm file existence/changes
- [ ] **Pattern Followed** - Compared implementation with existing similar code

**Research Impact:** 85% first-attempt success vs 40% without verification | 87% reduction in hallucination incidents

### Anti-Hallucination Protocol

**NEVER:**

- Say "file doesn't exist" without running file_search/grep_search first
- Claim "tests pass" without actual test execution output
- Claim "changes applied" without re-reading the modified lines
- Assume file location - always search first
- Trust memory over tools - always verify with read_file

**ALWAYS:**

- Provide evidence: file paths with line numbers, command output, test results
- Re-read files after modification to confirm changes
- Use tools to verify claims (file_search, grep_search, read_file, get_errors)
- State "Let me verify..." before making claims about filesystem/code state

---

## Context Gathering Strategy (Research-Backed)

### 4-Step Systematic Approach

**Step 1: Search for Patterns**

```
- Use semantic_search for conceptual/feature-based search
- Use grep_search for exact string/class name matching
- Use file_search for filename patterns
```

**Step 2: Identify Files to Modify**

```
- List all relevant files with line number ranges
- Categorize by layer (Domain, Application, Persistence, Api)
- Identify dependencies and integration points
```

**Step 3: Read Context in Parallel**

```
# EFFICIENT: Parallel reads when files are independent
read_file(CommandA.cs, 1, 100)
read_file(CommandB.cs, 1, 100)
read_file(CommandC.cs, 1, 100)

# INEFFICIENT: Sequential reads when could be parallel
read CommandA → analyze → read CommandB → analyze → read CommandC
```

**Step 4: Verify Understanding Before Implementation**

```
- Confirm pattern consistency across discovered examples
- Identify which pattern to follow (newest, most common, or specified)
- Document assumptions before coding
```

**When to Use Scout -> Investigate Workflow:**

- Unfamiliar feature domain (never worked on this module)
- Complex refactoring (cross-service, breaking changes)
- Bug investigation (need to trace execution flow)
- Cross-cutting concerns (affects multiple services)

**Research Impact:** 85% success with systematic context gathering vs 40% with direct implementation

---

## Automatic Skill Activation (MANDATORY)

When working in specific areas, these skills MUST be automatically activated BEFORE any file creation or modification:

### Path-Based Skill Activation

| Path Pattern                          | Skill                          | Pre-Read Files                      |
| ------------------------------------- | ------------------------------ | ----------------------------------- |
| `docs/business-features/**`           | `business-feature-docs`        | Template + Reference                |
| `src/Backend/**/*Command*.cs`         | `easyplatform-backend`         | CQRS patterns reference             |
| `src/Frontend/**/*.component.ts`      | `frontend-angular`             | Component, form, store, API patterns |
| `src/Frontend/**/*.store.ts`          | `frontend-angular`             | Component, form, store, API patterns |
| `src/Frontend/**/*-api.service.ts`    | `frontend-angular`             | Component, form, store, API patterns |
| `src/Frontend/**/*.component.scss`    | Read SCSS guide                | `docs/claude/scss-styling-guide.md` |
| `docs/design-system/**`               | `ui-ux-designer`               | Design tokens file                  |

### Activation Protocol

Before creating or modifying files matching these patterns, you MUST:

1. **Activate the skill** - Reference the appropriate skill documentation
2. **Read reference files** - Template + existing example in same folder
3. **Follow skill workflow** - Apply all skill-specific rules

---

## Investigation Workflow (Enhanced)

The `/scout` -> `/investigate` workflow supports **structured knowledge model construction**:

**Scout Phase:** Priority-based file categorization (HIGH/MEDIUM/LOW), cross-service message bus analysis, structured output with suggested starting points.

**Investigate Phase:** External memory at `.ai/workspace/analysis/[feature]-investigation.md`, knowledge graph with 15+ fields per file, progress tracking with todo management.

| Priority | File Types                                                                                   |
| -------- | -------------------------------------------------------------------------------------------- |
| HIGH     | Domain Entities, Commands, Queries, Event Handlers, Controllers, Jobs, Consumers, Components |
| MEDIUM   | Services, Helpers, DTOs, Repositories                                                        |
| LOW      | Tests, Config                                                                                |

---

## Memory Bank (Copilot @workspace References)

**Use @workspace to reference these key files for deep domain knowledge:**

| Context Needed                                | Reference via @workspace                      |
| --------------------------------------------- | --------------------------------------------- |
| Backend patterns (CQRS, Repository, Events)   | `@workspace docs/claude/backend-patterns.md`  |
| Frontend patterns (Components, Forms, Stores) | `@workspace docs/claude/frontend-patterns.md` |
| Architecture & Service boundaries             | `@workspace docs/claude/architecture.md`      |
| Advanced fluent helpers & utilities           | `@workspace docs/claude/advanced-patterns.md` |
| What NOT to do                                | `@workspace docs/claude/advanced-patterns.md` |
| Debugging & troubleshooting                   | `@workspace docs/claude/troubleshooting.md`   |
| System architecture                           | `@workspace docs/architecture-overview.md`    |

**When to load Memory Bank context:**

- Starting complex multi-file tasks -> Load architecture.md
- Backend development -> Load backend-patterns.md
- Frontend development -> Load frontend-patterns.md
- Code review -> Load advanced-patterns.md
- Debugging -> Load troubleshooting.md

---

---

## External Memory Management (CRITICAL for Long Tasks)

For long-running tasks (investigation, planning, implementation, debugging), you MUST save progress to external files to prevent context loss during session compaction.

### When to Create Checkpoints

| Trigger                    | Action                                      |
| -------------------------- | ------------------------------------------- |
| Starting complex task      | Create initial checkpoint with task context |
| Completing major phase     | Create detailed checkpoint                  |
| Before expected compaction | Save current analysis state                 |
| Task completion            | Final checkpoint with summary               |

### Checkpoint File Location

Save to: `plans/reports/checkpoint-{YYMMDD}-{HHMM}-{slug}.md`

### Required Checkpoint Structure

```markdown
# Memory Checkpoint: {Task Description}

> Created: {timestamp}
> Task Type: {investigation|planning|bugfix|feature|docs}
> Phase: {current phase}

## Task Context

{What you're working on and why}

## Key Findings

{Critical discoveries - include file paths and line numbers}

## Files Analyzed

| File              | Purpose     | Status   |
| ----------------- | ----------- | -------- |
| path/file.cs:line | description | done/wip |

## Progress

- [x] Completed items
- [ ] In-progress items
- [ ] Remaining items

## Important Context

{Decisions, assumptions, rationale that must be preserved}

## Next Steps

1. {Immediate next action}
2. {Following action}

## Recovery Instructions

{Exact steps to resume: which file to read, which line to continue from}
```

### Recovery Protocol

When resuming after context reset:

1. Search for checkpoints: `plans/reports/checkpoint-*.md`
2. Read the most recent checkpoint
3. Load referenced analysis files
4. Review Progress section
5. Continue from documented Next Steps

### Related Files

- `.claude/skills/checkpoint.md` - Manual checkpoint command
- `.claude/skills/memory-management/SKILL.md` - Full memory management skill

---

## Workspace Boundary Rules (CRITICAL - SECURITY)

> **All file operations MUST remain within the workspace root.** This prevents accidental modifications to system files, other projects, or sensitive locations.

**Absolute Rules:**

1. **NEVER** create, edit, or delete files outside the current VS Code workspace
2. **NEVER** use `../` paths that escape the workspace root
3. **NEVER** write to system directories (`/etc`, `/usr`, `C:\Windows`, `C:\Program Files`)
4. **NEVER** modify files in sibling project directories

**Before ANY File Operation:**

1. Verify the target path is within the workspace boundaries
2. If path contains `..` segments, mentally resolve to absolute path first
3. If resolved path would be outside workspace, **STOP** and inform user
4. When uncertain about workspace root, ask user for clarification

**Allowed:** `src/`, `docs/`, `plans/`, `scripts/`, `.vscode/`, `.github/`, `.claude/`, `.ai/`, root configs

**Prohibited:** Outside workspace root, parent directories (`../`), sibling repos, system directories

---

## Frontend Design System

| Application   | Location              |
| ------------- | --------------------- |
| Frontend Apps | `docs/design-system/` |

---

## Debugging Protocol

When debugging or analyzing code removal, follow [AI-DEBUGGING-PROTOCOL.md](AI-DEBUGGING-PROTOCOL.md):

- Never assume based on first glance
- Verify with multiple search patterns
- Check both static AND dynamic code usage
- Read actual implementations, not just interfaces
- Declare confidence level (<90% = ask user)

### Quick Verification Checklist

Before removing/changing ANY code:

- [ ] Searched static imports?
- [ ] Searched string literals?
- [ ] Checked dynamic invocations?
- [ ] Read actual implementations?
- [ ] Traced dependencies?
- [ ] Declared confidence level?

---

## File I/O Safety (Learned Patterns)

- **File Locking**: Use `.lock` file pattern for shared state; handle stale locks, use timeout, wrap entire read-modify-write
- **Atomic Writes**: Write to `.tmp` first, rename to final path; handle crash recovery
- **Schema Validation**: Validate at creation and before save; fail fast; bound all counts

**Reference:** See `.claude/skills/code-patterns/` for full implementation details.

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

## Naming Conventions

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

---

## Universal Clean Code Rules

- **No code duplication** — Search and reuse existing implementations
- **SOLID principles** — Single responsibility, dependency inversion
- **90% Logic Rule** — If logic belongs 90% to class A, put it in class A

---

## Shell Environment (Critical for Windows)

**Important:** Use Unix-compatible commands (Git Bash). Forward slashes for paths. See `CLAUDE.md` for the full command translation table.

---

## Manual Lessons (Self-Improvement)

- **Concurrency**: Lock all read-modify-write operations on shared state [100%]
- **Verification**: Always check filesystem before claiming file status [100%]
- **Fix Verification**: Re-read lines after every claimed fix [100%]

_Last updated: 2026-01-27_

---

<!-- ACE-LEARNED-PATTERNS-START -->

## ACE Learned Patterns

> These patterns were learned from Claude Code execution outcomes.
> Do not edit manually - managed by ACE sync.

### High Confidence (90%+)

- **When using /cook skill**: cook skill execution pattern showing reliable success -> Continue using this skill pattern (100% success rate observed) [100%]

_Last synced: 2026-01-11_

<!-- ACE-LEARNED-PATTERNS-END -->

---

## Instruction Files (File-Type-Specific Rules)

Copilot instruction files in `.github/instructions/` provide **file-type-targeted rules** that are automatically loaded when editing matching files in chat/agent mode:

| Instruction File                      | Applies To                                      | Simulates                    |
| ------------------------------------- | ----------------------------------------------- | ---------------------------- |
| `backend-csharp.instructions.md`      | `src/Backend/**/*.cs`, `src/Platform/**/*.cs`   | Backend C# patterns & rules  |
| `frontend-typescript.instructions.md` | `src/Frontend/**/*.ts,tsx,html`, `libs/**/*.ts` | Frontend Angular/TS patterns |
| `frontend-scss.instructions.md`       | `src/Frontend/**/*.scss`, `libs/**/*.scss`      | SCSS/BEM styling rules       |
| `documentation.instructions.md`       | `docs/**/*.md`                                  | Documentation standards      |
| `code-review.instructions.md`         | `**/*` (excludes coding agent)                  | Code review checklist        |

Each file contains critical rules inline + references to full pattern files in `.ai/docs/` and `docs/claude/`.

> **Note:** Instruction files apply to **chat and agent mode only**, not inline completions.

---

## Code Patterns Reference (On-Demand via Skills)

> **Code patterns are now loaded on-demand** via Agent Skills to optimize context usage.
> Skills auto-activate based on file type being edited.

### Skills for Code Patterns

| Skill                       | Location                                    | Auto-Activates When                               |
| --------------------------- | ------------------------------------------- | ------------------------------------------------- |
| `backend-csharp-patterns`   | `.github/skills/backend-csharp-patterns/`   | Editing `*.cs` in `src/Backend/`, `src/Platform/` |
| `frontend-angular-patterns` | `.github/skills/frontend-angular-patterns/` | Editing `*.ts` in `src/Frontend/`, `libs/`        |
| `scss-bem-patterns`         | `.github/skills/scss-bem-patterns/`         | Editing `*.scss`, `*.css` files                   |

### Full Pattern Files (Referenced by Skills)

| File                                    | Content                                      |
| --------------------------------------- | -------------------------------------------- |
| `.ai/docs/backend-code-patterns.md`     | 16 backend patterns with full C# examples    |
| `.ai/docs/frontend-code-patterns.md`    | 6 frontend patterns with TypeScript examples |
| `.ai/docs/compact-pattern-reference.md` | Quick lookup table for subagents             |
| `docs/claude/scss-styling-guide.md`     | SCSS/BEM methodology guide                   |

### Pattern Index (Quick Reference)

**Backend (16 patterns):** Clean Architecture, Repository, Repository API, Validation, Cross-Service, Full-Text Search, CQRS Command, Query, Side Effects, Entity, DTO, Fluent Helpers, Background Jobs, Message Bus, Data Migration, Multi-Database

**Frontend (6 patterns):** Component Hierarchy, Component API, State Store, API Service, Forms, Advanced

### Critical Anti-Patterns

```csharp
// ❌ Direct cross-service DB access → ✅ Use message bus
// ❌ Custom repository interface → ✅ Use platform repo + extensions
// ❌ Manual validation throw → ✅ Use PlatformValidationResult fluent API
// ❌ Side effects in handler → ✅ Use entity event handlers
// ❌ DTO mapping in handler → ✅ DTO owns mapping via MapToObject()/MapToEntity()
```

```typescript
// ❌ Direct HttpClient → ✅ Extend PlatformApiService
// ❌ Manual signals → ✅ Use PlatformVmStore
// ❌ Missing untilDestroyed() → ✅ Always use .pipe(this.untilDestroyed())
```

---

## Workflow Decision Guide (Comprehensive)

> **This section is intentionally placed at the end for maximum AI attention.** Use the decision tree in the earlier section as PRIMARY lookup. This section provides detailed descriptions for disambiguation.

### Workflow Definitions (Grouped by Category)

#### Implementation Workflows

**`feature`** — Feature Implementation (Confirm: Yes)

- **Triggers:** implement, add, create, build, develop, new feature, functionality, module, component
- **NOT for:** Bug fixes, documentation-only, test-only, migration, refactoring, investigation

**`bugfix`** — Bug Fix (Confirm: No)

- **Triggers:** bug, error, crash, broken, not working, fix, debug, troubleshoot, exception trace, regression
- **NOT for:** New features, refactoring, documentation, investigation without fixing

**`refactor`** — Code Refactoring (Confirm: Yes)

- **Triggers:** refactor, restructure, reorganize, clean up, extract methods, rename, split/merge, technical debt
- **NOT for:** Bug fixes, new features, quality audits

**`migration`** — Database Migration (Confirm: Yes)

- **Triggers:** database migration, schema change, EF migration, add/remove/alter column, data migration
- **NOT for:** Explaining migration concepts, checking migration history/status

**`batch-operation`** — Batch Operation (Confirm: Yes)

- **Triggers:** all files, batch, bulk, find-replace across, merge/combine/consolidate all, every instance, multiple files/components
- **NOT for:** Single-file changes, test file creation, documentation updates

**`deployment`** — Deployment & Infrastructure (Confirm: Yes)

- **Triggers:** deploy, CI/CD, infrastructure, Docker, pipeline, environment setup
- **NOT for:** Explaining deployment concepts, checking deployment status/history

**`performance`** — Performance Optimization (Confirm: Yes)

- **Triggers:** performance, slow, optimize, N+1, latency, bottleneck, throughput
- **NOT for:** Explaining performance concepts, checking performance reports/history

#### Review & Audit Workflows

**`review`** — Code Review (Confirm: No)

- **Triggers:** code review, PR review, code quality check, audit specific code
- **NOT for:** Reviewing uncommitted/staged changes, reviewing plans/designs/docs, quality audits with fixes

**`review-changes`** — Review Current Changes (Confirm: No)

- **Triggers:** review changes, pre-commit, staged changes, uncommitted, before commit
- **NOT for:** PR reviews, release prep, quality audits, investigating how code works

**`quality-audit`** — Quality Audit (Confirm: Yes)

- **Triggers:** quality audit, best practices, ensure no flaws, verify quality standards, audit-and-fix
- **NOT for:** Reviewing uncommitted changes (use review-changes), PR review, bug fixes

**`security-audit`** — Security Audit (Confirm: No)

- **Triggers:** security audit, vulnerability, OWASP, security review, penetration test
- **NOT for:** Implementing new security features, fixing known security bugs

**`verification`** — Verification & Validation (Confirm: Yes)

- **Triggers:** verify, validate, confirm, check works, ensure, make sure
- **NOT for:** New feature implementation, code review, documentation, investigation-only

#### Investigation & Documentation Workflows

**`investigation`** — Code Investigation (Confirm: No)

- **Triggers:** how does, where is, explain, understand, explore, trace code paths
- **NOT for:** Any task requiring code changes (implementing, fixing, refactoring, creating, updating)

**`documentation`** — Documentation Update (Confirm: No)

- **Triggers:** write docs, update documentation, improve README, code comments
- **NOT for:** Business feature docs (use business-feature-docs), code implementation

**`business-feature-docs`** — Business Feature Documentation (Confirm: No)

- **Triggers:** business feature docs, 26-section template, module docs, docs/business-features/
- **NOT for:** General documentation updates, code comments, README changes

#### Product & Planning Workflows

**`idea-to-pbi`** — Idea to PBI (Confirm: Yes)

- **Triggers:** new idea, product request, feature request, add to backlog, refine into PBI
- **NOT for:** Bug fixes, code implementation, investigation

**`pbi-to-tests`** — PBI to Tests (Confirm: No)

- **Triggers:** test spec, test cases, QA, generate tests from PBI/feature/story
- **NOT for:** Running existing tests, executing test suites

**`sprint-planning`** — Sprint Planning Session (Confirm: Yes)

- **Triggers:** plan sprint, prioritize backlog, analyze dependencies, iteration planning, sprint kickoff
- **NOT for:** Sprint review, retrospective, sprint status report, end-of-sprint activities

**`pm-reporting`** — PM Reporting (Confirm: No)

- **Triggers:** status report, sprint update, project progress, blocker analysis
- **NOT for:** Git status, commit status, PR status, build status, quick one-line checks

**`release-prep`** — Release Preparation (Confirm: Yes)

- **Triggers:** release prep, pre-release checks, release readiness, deployment checklist, go-live
- **NOT for:** Git release commands, npm publish, release notes generation

**`design-workflow`** — Design Workflow (Confirm: No)

- **Triggers:** design spec, wireframe, mockup, UI/UX spec, component spec from requirements
- **NOT for:** Implementing an existing design in code, coding from a spec

**`pre-development`** — Pre-Development Setup (Confirm: No)

- **Triggers:** prepare before development, quality gate checks, kick off new feature, pre-coding
- **NOT for:** Already in development, just explaining pre-development concept

### Override Methods

| Method           | Example                     | Effect                                          |
| ---------------- | --------------------------- | ----------------------------------------------- |
| `quick:` prefix  | `quick: add a button`       | Skip confirmation, execute workflow immediately |
| Explicit command | `/plan implement dark mode` | Bypass detection, run specific command          |
| Say "quick"      | When asked "Proceed?"       | Abort workflow, handle directly                 |

---

## Complete Workflow Catalog (WITH SEQUENCES)

> **This section documents ALL workflow sequences with the standardized `plan → plan-validate → plan-review` pattern.**

### Implementation Workflows

| Workflow ID         | Name                              | Sequence                                                                                                                                                | Confirm? |
| ------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `feature`           | Feature Implementation            | `/scout` → `/plan` → `/plan-validate` → `/plan-review` → `/cook` → `/code-simplifier` → `/review-codebase` → `/changelog-update` → `/test` → `/docs-update` → `/watzup` | Yes      |
| `bugfix`            | Bug Fix                           | `/scout` → `/investigate` → `/debug` → `/plan` → `/plan-validate` → `/plan-review` → `/fix` → `/code-simplifier` → `/review-codebase` → `/changelog-update` → `/test` → `/watzup` | No       |
| `refactor`          | Code Refactoring                  | `/scout` → `/plan` → `/plan-validate` → `/plan-review` → `/code` → `/code-simplifier` → `/review-codebase` → `/test` → `/watzup`                     | Yes      |
| `migration`         | Database Migration                | `/scout` → `/investigate` → `/plan` → `/plan-validate` → `/plan-review` → `/code` → `/review-codebase` → `/test` → `/watzup`                          | Yes      |
| `batch-operation`   | Batch Operation                   | `/scout` → `/plan` → `/plan-validate` → `/plan-review` → `/code` → `/review-codebase` → `/test` → `/watzup`                                           | Yes      |
| `deployment`        | Deployment & Infrastructure       | `/scout` → `/investigate` → `/plan` → `/plan-validate` → `/plan-review` → `/code` → `/review-codebase` → `/test` → `/watzup`                          | Yes      |
| `performance`       | Performance Optimization          | `/scout` → `/investigate` → `/plan` → `/plan-validate` → `/plan-review` → `/code` → `/review-codebase` → `/test` → `/watzup`                          | Yes      |

### Review & Audit Workflows

| Workflow ID      | Name                        | Sequence                                                                                                                       | Confirm? |
| ---------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `review`         | Code Review                 | `/review-codebase` → `/watzup`                                                                                                 | No       |
| `review-changes` | Review Current Changes      | `/scout` → `/investigate` → `/review-codebase` → `/watzup`                                                                     | No       |
| `quality-audit`  | Quality Audit               | `/review-codebase` → `/plan` → `/plan-validate` → `/plan-review` → `/code` → `/review-codebase` → `/test` → `/watzup`        | Yes      |
| `security-audit` | Security Audit              | `/scout` → `/investigate` → `/watzup`                                                                                          | No       |
| `verification`   | Verification & Validation   | `/scout` → `/investigate` → `/test` → `/plan` → `/plan-validate` → `/plan-review` → `/fix` → `/review` → `/watzup`           | Yes      |

### Investigation & Documentation Workflows

| Workflow ID              | Name                            | Sequence                                                                                                                              | Confirm? |
| ------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `investigation`          | Code Investigation              | `/scout` → `/investigate`                                                                                                             | No       |
| `documentation`          | Documentation Update            | `/scout` → `/investigate` → `/plan` → `/plan-validate` → `/plan-review` → `/docs-update` → `/watzup`                                 | No       |
| `business-feature-docs`  | Business Feature Documentation  | `/scout` → `/investigate` → `/plan` → `/plan-validate` → `/plan-review` → `/docs-update` → `/team-test-spec` → `/team-test-cases` → `/watzup` | No       |

### Product & Planning Workflows

| Workflow ID       | Name                      | Sequence                                                                           | Confirm? |
| ----------------- | ------------------------- | ---------------------------------------------------------------------------------- | -------- |
| `idea-to-pbi`     | Idea to PBI               | `/team-idea` → `/team-refine` → `/team-story` → `/team-prioritize` → `/watzup`    | Yes      |
| `pbi-to-tests`    | PBI to Tests              | `/team-test-spec` → `/team-test-cases` → `/team-quality-gate` → `/watzup`         | No       |
| `sprint-planning` | Sprint Planning Session   | `/team-prioritize` → `/team-dependency` → `/team-team-sync`                        | Yes      |
| `pm-reporting`    | PM Reporting              | `/team-status` → `/team-dependency`                                                | No       |
| `release-prep`    | Release Preparation       | `/review-changes` → `/test` → `/team-quality-gate` → `/team-status`                | Yes      |
| `design-workflow` | Design Workflow           | `/team-design-spec` → `/review-codebase` → `/watzup`                               | No       |
| `pre-development` | Pre-Development Setup     | `/team-quality-gate` → `/plan` → `/plan-validate` → `/plan-review`                | No       |

### Key Observations

**All planning workflows now follow the standardized pattern:**
```
... → /plan → /plan-validate → /plan-review → ...
```

**This ensures:**
- Every plan is validated with critical questions before review
- Assumptions and risks are surfaced early
- Plan quality is verified before implementation begins

---

## MANDATORY: Workflow & Task Planning (READ THIS)

> **This section is intentionally placed at the end for maximum AI attention.** AI models attend most to the start and end of long prompts.

### Workflow Execution Protocol

**CRITICAL: First action after workflow detection MUST be calling `/workflow-start <workflowId>` then TodoWrite. No exceptions.**

1. **DETECT:** Read the workflow catalog above and match against user's prompt semantics. Use the Keywords column for guidance.
2. **ACTIVATE:** Call `/workflow-start <workflowId>` using the ID from the first column
3. **CREATE TODOS FIRST (HARD BLOCKING):** Use `TodoWrite` to create todo items for ALL workflow steps BEFORE doing anything else
    - This is NOT optional - it is a hard requirement
    - If you skip this step, you WILL lose track of the workflow
4. **ANNOUNCE:** Tell user: `"Detected: [Intent]. Following workflow: [sequence]"`
5. **CONFIRM (if marked Yes):** Ask: `"Proceed with this workflow? (yes/no/quick)"`
6. **EXECUTE:** Follow each step in sequence, updating todo status as you progress

**You MUST NOT:**

- Skip workflow detection because the task "looks simple"
- Read files or write code before announcing the workflow
- Handle a prompt containing error traces, bug reports, or multi-file changes without a workflow

**The ONLY exceptions (truly simple tasks):**

- Single-line typo fixes (e.g., fix a spelling error)
- User explicitly says "just do it" or "no workflow"
- User prefixes with `quick:` to bypass detection

**If in doubt, activate the workflow.** It is always better to follow the workflow and let the user say "quick" than to skip it and produce inconsistent results.

### Workflow Continuity Rule

- NEVER abandon a detected workflow — complete ALL steps or explicitly ask user to skip
- NEVER end a turn without checking if workflow steps remain
- At start of each response in a workflow, state: `"Continuing workflow: Step X of Y — {step name}"`
- If context seems lost, review the workflow sequence and identify current position
