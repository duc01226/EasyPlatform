# Easy.Platform - Code Instructions

> .NET 9 Framework + Angular Frontend | Platform Framework & Example Application

> **⚠️ MANDATORY — Confirm Before Execute:** If the user prompt is longer than 100 characters, you **MUST** first confirm your understanding of the request and clarify the user's intent before executing any task. Restate what you understood, ask clarifying questions if ambiguous, and only proceed after the user confirms. During confirmation, check if the task matches any workflow from the workflow catalog. If the task is non-trivial, auto-activate the detected workflow immediately. If AI judges the task is simple, AI MUST ask the user whether to skip the workflow. This applies to ALL AI tools (Claude Code, GitHub Copilot, etc.).

**Sections:** [TL;DR](#tldr--what-you-must-know-before-writing-any-code) | [Search First](#mandatory-search-existing-code-first) | [First Action](#first-action-decision-before-any-tool-call) | [Task Planning](#important-task-planning-rules-must-follow) | [Code Hierarchy](#code-responsibility-hierarchy-critical) | [Plan Before Implement](#mandatory-plan-before-implement) | [Naming](#naming-conventions) | [File Locations](#key-file-locations) | [Dev Commands](#development-commands) | [Integration Testing](#integration-testing) | [Local Startup](#local-system-startup) | [Evidence & Investigation](#evidence-based-reasoning--investigation-protocol-mandatory) | [Skill Activation](#automatic-skill-activation-mandatory) | [Documentation Index](#documentation-index) | [Workflow Lookup](#workflow-keyword-lookup--execution-protocol)

---

## TL;DR — What You Must Know Before Writing Any Code

**Project:** Easy.Platform is a .NET 9 framework for building microservices with CQRS, event-driven architecture, and multi-database support. It includes PlatformExampleApp (TextSnippet) as a reference implementation. Backend: .NET 9 + Easy.Platform + CQRS + MongoDB/PostgreSQL/SQL Server. Frontend: Angular + Nx. Messaging: RabbitMQ.

**Golden Rules (memorize these):**

1. **Repositories** — Use `IPlatformRootRepository<TEntity>` or service-specific repository interfaces
2. **Validation** — `PlatformValidationResult` fluent API (`.And()`, `.AndAsync()`), NEVER throw exceptions
3. **Side Effects** — Entity Event Handlers in `UseCaseEvents/`, NEVER in command handlers
4. **DTO Mapping** — DTOs own mapping via `PlatformEntityDto<TEntity, TKey>.MapToEntity()` or `PlatformDto<T>.MapToObject()`, NEVER map in handlers
5. **Cross-Service** — RabbitMQ message bus ONLY, NEVER direct database access
6. **Frontend State** — `PlatformVmStore` + `effectSimple()`, NEVER manual signals or direct `HttpClient`
7. **Base Classes** — Always extend `AppBaseComponent`/`AppBaseVmStoreComponent`/`AppBaseFormComponent` + `.pipe(this.untilDestroyed())` + BEM classes on all template elements. Extend `PlatformApiService` for HTTP calls.

**Architecture Hierarchy** — Place logic in LOWEST layer: `Entity/Model → Service → Component/Handler`

**First Principles (Code Quality in AI Era):**

1. **Understanding > Output** — Never ship code you can't explain. AI generates candidates; humans validate intent.
2. **Design Before Mechanics** — Document WHY before WHAT. A 3-sentence rationale prevents 3-day debugging sessions.
3. **Own Your Abstractions** — Every dependency, framework, and platform decision is YOUR responsibility. Understand what's under the hood.
4. **Operational Awareness** — Code that works but can't be debugged, monitored, or rolled back is technical debt in disguise.
5. **Depth Over Breadth** — One well-understood solution beats ten AI-generated variants. Quality compounds; quantity decays.

**Decision Quick-Ref:**

| Task               | → Pattern                                                      |
| ------------------ | -------------------------------------------------------------- |
| New API endpoint   | `PlatformBaseController` + CQRS Command                        |
| Business logic     | Command Handler (Application layer)                            |
| Data access        | `IPlatformRootRepository<TEntity>` + extensions                |
| Cross-service sync | Entity Event Consumer (message bus)                            |
| Scheduled task     | `PlatformApplicationBackgroundJob`                             |
| Migration          | `PlatformDataMigrationExecutor` / EF migrations                |
| Simple component   | Extend `AppBaseComponent`                                      |
| Complex state      | `AppBaseVmStoreComponent` + `PlatformVmStore`                  |
| Forms              | `AppBaseFormComponent` with validation                         |
| API calls          | Service extending `PlatformApiService`                         |
| Repository         | `IPlatformRootRepository<TEntity>`                             |
| Complex queries    | `RepositoryExtensions` with static expressions                 |
| Integration test   | Extend `PlatformServiceIntegrationTestWithAssertions<TModule>` |

**Workflow:** Always plan before implementing non-trivial tasks. Match user prompt to workflow catalog (below). If modification keywords present → use Feature/Refactor/Bugfix workflow. Fallback → `/plan <prompt>`.

**Key Locations:** `src/Platform/Easy.Platform/` (framework core), `src/Backend/` (PlatformExampleApp backend), `src/Frontend/` (Angular frontend), `src/Frontend/libs/platform-core/` (frontend framework)

## MANDATORY: Search Existing Code FIRST

**Before writing ANY code:**

1. **Grep/Glob search** for similar patterns in the codebase (find 3+ examples)
2. **Follow codebase pattern**, NOT generic framework docs
3. **Provide evidence** in plan (file:line references)

**Why:** This project has specific conventions. PlatformExampleApp serves as the reference implementation.

**Enforced by:** Feature/Bugfix/Refactor workflows (scout → investigate steps)

---

## FIRST ACTION DECISION (Before ANY tool call)

**⛔ STOP — DO NOT CALL ANY TOOL YET ⛔**

```
1. Explicit slash command? (e.g., `/plan`, `/cook`) → Execute it
2. Prompt matches workflow? → Auto-activate workflow (non-trivial) or ask to skip (simple)
3. MODIFICATION keywords present? → Use Feature/Refactor/Bugfix workflow
   (update, add, create, implement, enhance, insert, fix, change, remove, delete)
4. Pure research? (no modification keywords) → Investigation workflow
5. FALLBACK → MUST invoke `/plan <prompt>` FIRST
```

**CRITICAL: Modification > Research.** If prompt contains BOTH research AND modification intent, **modification workflow wins** (investigation is a substep of `/plan`).

### ⛔ WORKFLOW DETECTION IS NON-NEGOTIABLE

VERY FIRST action on ANY non-trivial prompt (>15 chars, not "yes/no/continue") MUST be workflow detection → `/workflow-start <id>`. NEVER jump to TaskCreate, Read, Grep, Edit before activating a workflow.

**[MUST NOT]** `"verify changes"` → `[TaskCreate immediately]` — skipped workflow match
**✅** `"verify changes"` → `[/workflow-start verification]` → `[TaskCreate]` → execute immediately

For simple/straightforward tasks (single-file changes, clear small fixes), AI MUST ask the user whether to skip the workflow.

---

## IMPORTANT: Task Planning Rules (MUST FOLLOW)

These rules apply to EVERY task, whether using a workflow or not:

1. **MANDATORY task creation for file-modifying prompts** — If the prompt could result in ANY file changes (code, config, docs), you MUST create `TaskCreate` items BEFORE making changes. This applies even without a workflow match. Only skip for single-line trivial fixes or pure questions.
2. **Always break work into many small todo tasks** — granular tasks prevent losing track of progress
3. **Always add a final review todo task** to review all work done, find any fixes or enhancements needed, **and check for doc staleness** (cross-reference changed files against `docs/` — see watzup skill for the mapping table)
4. **Mark todos as completed IMMEDIATELY** after finishing each task — never batch completions
5. **Exactly ONE task in_progress at a time** — complete current before starting next
6. **Use TaskCreate proactively** for any task with 2+ steps or any task that modifies files — visibility into progress is critical
7. **On context loss**, check `TaskList` for `[Workflow]` items to recover your place
8. **No speculation or hallucination** — always answer with proof (code references, search results, file evidence). If unsure, investigate first rather than guessing.
9. **Evidence-based recommendations** — Before recommending code removal/refactoring, complete the Investigation Protocol validation chain. Declare confidence level for all architectural recommendations.
10. **Breaking change assessment** — Any recommendation that could break functionality requires HIGH/MEDIUM risk validation (see Investigation & Recommendation Protocol).

---

## Code Responsibility Hierarchy (CRITICAL)

**Place logic in the LOWEST appropriate layer to enable reuse and prevent duplication.** If logic belongs 90% to class A, put it in class A.

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
// [MUST NOT] Logic in component
readonly providerTypes = [{ value: 1, label: 'Type A' }, ...];

// ✅ CORRECT: Logic in entity/model
export class SomeEntity {
  static readonly dropdownOptions = [{ value: 1, label: 'Type A' }, ...];
  static getDisplayLabel(value: number): string { return this.dropdownOptions.find(x => x.value === value)?.label ?? ''; }
}

// Component just uses entity
readonly providerTypes = SomeEntity.dropdownOptions;
```

## Mandatory: Plan Before Implement

Before implementing ANY non-trivial task, you MUST:

1. **Use Plan Skill** - Use /plan skill automatically
2. **Investigate & Analyze** - Explore codebase, understand context
3. **Create Implementation Plan** - Write detailed plan with files and approach
4. **Get User Approval** - Wait for confirmation before code changes
5. **Then Implement** - Execute the approved plan

**Exceptions:** Single-line fixes, user says "just do it", pure research with no changes.

**Automated enforcement:** `edit-enforcement.cjs` warns at 4 unique files modified without an active plan, re-warns at 8 files. Blocks non-exempt file edits without TaskCreate.

## Naming Conventions

| Type        | Convention                | Example                                                 |
| ----------- | ------------------------- | ------------------------------------------------------- |
| Constants   | UPPER_SNAKE_CASE          | `MAX_RETRY_COUNT`                                       |
| Booleans    | Prefix with verb          | `isActive`, `hasPermission`, `canEdit`, `shouldProcess` |
| Collections | Plural                    | `users`, `items`, `employees`                           |
| BEM CSS     | block__element --modifier | All frontend template elements must have BEM classes    |

## Key File Locations

```
src/Platform/Easy.Platform/      # Framework core
src/Platform/Easy.Platform.AspNetCore/  # ASP.NET Core integration
src/Platform/Easy.Platform.MongoDB/     # MongoDB persistence
src/Platform/Easy.Platform.EfCore/      # EF Core persistence
src/Platform/Easy.Platform.RabbitMQ/    # Message bus
src/Platform/Easy.Platform.RedisCache/  # Caching
src/Platform/Easy.Platform.AutomationTest/  # Test framework
src/Backend/                     # PlatformExampleApp backend
src/Frontend/                    # Angular frontend (Nx workspace)
src/Frontend/apps/playground-text-snippet/  # Example frontend app
src/Frontend/libs/platform-core/ # Frontend framework core
docs/                            # Project documentation
.claude/hooks/                   # Claude Code hooks
docs/code-review-rules.md        # Code review rules (auto-injected)
docs/lessons.md                  # Learned lessons (injected via hook, written via /learn skill)
```

## Development Commands

```bash
# Backend
dotnet build Easy.Platform.sln
dotnet run --project src/Backend/PlatformExampleApp.TextSnippet.Api

# Frontend
cd src/Frontend && npm install
cd src/Frontend && npm start

# Docker (Example App)
# See start-dev-platform-example-app*.cmd scripts in src/

# Claude Hooks Tests
node .claude/hooks/tests/test-all-hooks.cjs
node .claude/hooks/tests/test-lib-modules.cjs
node .claude/hooks/tests/test-lib-modules-extended.cjs
```

## Integration Testing

Subcutaneous CQRS tests through real DI (no HTTP), against live infrastructure. Reference: `src/Backend/PlatformExampleApp.Tests.Integration/`. Platform base: `src/Platform/Easy.Platform.AutomationTest/IntegrationTests/`.

**Setup:** Create fixture extending `PlatformServiceIntegrationTestFixture<T>`, base class extending `PlatformServiceIntegrationTestWithAssertions<T>` with `ResolveRepository<TEntity>` override, test classes with `[Collection]` attribute.

**Key APIs:** `ExecuteCommandAsync`, `ExecuteQueryAsync`, `AssertEntityExistsAsync<T>`, `AssertEntityMatchesAsync<T>`, `AssertEntityDeletedAsync<T>`, `IntegrationTestHelper.UniqueName()`, `TestUserContextFactory.Create*()`

## Local System Startup

Start order: **Infrastructure → Backend API → Frontend**. Docker compose files in `src/`.

### Infrastructure Ports

| Service       | Port                               | Credentials         |
| ------------- | ---------------------------------- | -------------------- |
| MongoDB       | 127.0.0.1:27017                    | root / rootPassXXX   |
| Elasticsearch | 127.0.0.1:9200                     | (no auth)            |
| RabbitMQ      | 127.0.0.1:5672 (AMQP), :15672 (UI) | guest / guest       |
| Redis         | 127.0.0.1:6379                     | —                    |
| PostgreSQL    | 127.0.0.1:54320                    | postgres / postgres  |
| SQL Server    | 127.0.0.1:14330 (optional)         | sa / 123456Abc       |

### Quick Start

| Goal                     | Command                                                 |
| ------------------------ | ------------------------------------------------------- |
| **Full system (Docker)** | `src/start-dev-platform-example-app.cmd`                |
| **MongoDB variant**      | `src/start-dev-platform-example-app-mongodb.cmd`        |
| **PostgreSQL variant**   | `src/start-dev-platform-example-app-postgres.cmd`       |
| **SQL Server variant**   | `src/start-dev-platform-example-app-usesql.cmd`         |
| **No rebuild**           | `src/start-dev-platform-example-app-NO-REBUILD.cmd`     |
| **Reset all data**       | `src/start-dev-platform-example-app-RESET-DATA.cmd`     |
| **Infra only**           | `src/start-dev-platform-example-app.infrastructure.cmd` |

**Notes:** All Docker ports bind `127.0.0.1` (not `0.0.0.0`). See `src/platform-example-app.docker-compose.yml` for full configuration.

## Evidence-Based Reasoning & Investigation Protocol (MANDATORY)

Speculation is FORBIDDEN. Every claim about code behavior, every recommendation for changes, must be backed by evidence. Ref: [Evidence-Based Reasoning Protocol](.claude/skills/shared/evidence-based-reasoning-protocol.md) (mandatory) | [Anti-Hallucination Patterns](.claude/patterns/anti-hallucination-patterns.md) (optional deep-dive).

### Core Rules

1. **Evidence before conclusion** — Cite `file:line`, grep results, or framework docs. Never use "obviously...", "I think...", "this is because..." without proof.
2. **Confidence declaration required** — Every recommendation must state confidence level with evidence list.
3. **Inference alone is FORBIDDEN** — Always upgrade to code evidence (grep results, file reads). When unsure: *"I don't have enough evidence yet. Need to investigate [specific items]."*
4. **Cross-project validation** — Check both Platform framework and PlatformExampleApp before recommending architectural changes.

### Confidence Levels

| Level       | Meaning                                                           | Action                                      |
| ----------- | ----------------------------------------------------------------- | ------------------------------------------- |
| **95-100%** | Full trace, all checklist items verified, both layers checked     | Recommend freely                            |
| **80-94%**  | Main paths verified, some edge cases unverified                   | Recommend with caveats                      |
| **60-79%**  | Implementation found, usage partially traced                      | Recommend cautiously                        |
| **<60%**    | Insufficient evidence                                             | **DO NOT RECOMMEND** — gather more evidence |

**Format:** `Confidence: 85% — Verified in Platform core and ExampleApp, did not check all persistence providers`

**When < 80%:** List what's verified vs. unverified, ask user before proceeding.

### Breaking Change Risk Matrix

| Risk       | Criteria                                                      | Required Evidence                                         |
| ---------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| **HIGH**   | Removing registrations, deleting classes, changing interfaces | Full usage trace + impact analysis + all consumers        |
| **MEDIUM** | Refactoring methods, changing signatures                      | Usage trace + test verification                           |
| **LOW**    | Renaming, formatting, comments                                | Code review only                                          |

### Validation Checklist (for code removal/refactoring/replacement)

Before recommending changes, complete ALL items — skip none:

- [ ] Find ALL implementations — `grep "class.*:.*IInterfaceName"`
- [ ] Trace ALL registrations — `grep "AddScoped.*IName|AddSingleton.*IName"`
- [ ] Verify ALL usage sites — injection points, method calls, static references (`grep -r "ClassName"` = 0)
- [ ] Check string literals / dynamic invocations (reflection, factories, message bus)
- [ ] Check config references (appsettings.json, env vars) and test dependencies
- [ ] Cross-project check — Platform framework + PlatformExampleApp
- [ ] Assess impact — what breaks if removed?
- [ ] Declare confidence — X% with evidence list

**If ANY step incomplete → STOP. State "Insufficient evidence."**

### Investigation Patterns

**Layer comparison:** Find working reference in PlatformExampleApp → compare with Platform framework → identify/verify patterns → recommend based on proven pattern.

**Use `/investigate` skill** for: removing registrations/classes, cross-layer changes, "this seems unused" claims, breaking change assessment.

## Automatic Skill Activation (MANDATORY)

When working in specific areas, these skills MUST be automatically activated BEFORE any file creation or modification:

### Path-Based Skill Activation

| Path Pattern                                  | Skill                  | Pre-Read Files           |
| --------------------------------------------- | ---------------------- | ------------------------ |
| `src/Frontend/**/*.component.ts`              | `frontend-angular`     | Component base class     |
| `src/Frontend/**/*.store.ts`                  | `frontend-angular`     | Store patterns           |
| `docs/design-system/**`                       | `ui-ux-designer`       | Design tokens file       |

### Activation Protocol

Before creating or modifying files matching these patterns, Claude MUST:

1. **Activate the skill** - Use `/skill-name` or Skill tool
2. **Read reference files** - Template + existing example in same folder
3. **Follow skill workflow** - Apply all skill-specific rules

## Documentation Index

**Full reference:** [`docs/claude/README.md`](docs/claude/README.md) — skills (155+), hooks, agents (24+), configuration, patterns, complete guides.

### Project & Operations (`docs/`)

| Document / Directory                                                                  | Purpose                                 | When to Use                    |
| ------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------ |
| [getting-started.md](docs/getting-started.md)                                         | Dev environment setup                   | Onboarding, first-time setup   |
| [deployment.md](docs/deployment.md)                                                   | Deployment procedures                   | CI/CD, Docker, K8s tasks       |
| [monitoring.md](docs/monitoring.md)                                                   | Observability, alerting                 | Production issues, SRE tasks   |
| [codebase-summary.md](docs/codebase-summary.md)                                       | High-level project overview             | Understanding project scope    |
| [code-review-rules.md](docs/code-review-rules.md)                                     | Code review standards                   | PR reviews, quality audits     |
| [lessons.md](docs/lessons.md)                                                         | Learned lessons (auto-injected)         | Avoiding repeated mistakes     |
| [ai-agent-reference.md](docs/ai-agent-reference.md)                                   | AI agent guidelines                     | AI behavioral context          |
| [claude-setup-improvement-principles.md](docs/claude-setup-improvement-principles.md) | AI operational principles               | Improving AI setup quality     |
| [design-system/](docs/design-system/README.md)                                        | Design tokens, BEM, style guides        | UI/UX work, styling, theming   |
| [architecture-decisions/](docs/architecture-decisions/README.md)                      | ADRs (Architecture Decision Records)    | Reviewing past design choices  |
| [templates/](docs/templates/)                                                         | Doc templates: ADR, changelog, etc.     | Creating new documentation     |
| [test-specs/](docs/test-specs/README.md)                                              | Test specs, integration tests           | Test planning, coverage gaps   |
| [release-notes/](docs/release-notes/)                                                 | Release changelogs                      | Release prep, changelog review |

### Doc Lookup Guide

| If user prompt mentions...                                         | → Read first                                                          |
| ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| TextSnippet, example app, reference implementation                 | `src/Backend/PlatformExampleApp.TextSnippet.Application/`             |
| Integration tests, subcutaneous testing, test base class           | `src/Backend/PlatformExampleApp.Tests.Integration/`                   |
| Platform framework, CQRS, entities, validation                     | `src/Platform/Easy.Platform/`                                         |
| Frontend patterns, Angular, stores, forms                          | `src/Frontend/libs/platform-core/`                                    |
| Backend patterns, CQRS, entities, validation                       | `docs/backend-patterns-reference.md`                                  |
| Frontend patterns, Angular, stores, forms                          | `docs/frontend-patterns-reference.md`                                 |
| UI design, styling, BEM, design tokens, themes                     | `docs/design-system/`                                                 |
| Deployment, Docker, K8s, CI/CD, infrastructure                     | `docs/deployment.md`, `docs/monitoring.md`                            |
| Architecture decisions, ADR, design rationale                      | `docs/architecture-decisions/`                                        |
| Test specs, test coverage                                          | `docs/test-specs/`                                                    |
| Hooks, skills, agents, Claude Code config                          | `docs/claude/` subdirectories                                         |

**Additional Resources:** [README.md](README.md), [EasyPlatform.README.md](EasyPlatform.README.md)

## Workflow Keyword Lookup & Execution Protocol

### Quick Keyword → Workflow Lookup

Use this table for fast matching. If prompt contains keywords in left column, use the workflow ID on right:

| If prompt contains...                                                  | → Use workflow ID        |
| ---------------------------------------------------------------------- | ------------------------ |
| fix, bug, error, crash, broken, failing, regression, debug             | `bugfix`                 |
| implement, add, create, build, develop, new feature, new component     | `feature`                |
| refactor, restructure, clean up, reorganize, technical debt, simplify  | `refactor`               |
| how does, where is, explain, understand, trace, explore, find logic    | `investigation`          |
| docs, documentation, readme, update docs                               | `documentation`          |
| review code, code review, PR review, audit code                        | `review`                 |
| review changes, uncommitted, staged, before commit                     | `review-changes`         |
| verify, validate, confirm, ensure, check, sanity                       | `verification`           |
| test, run tests, coverage, test suite                                  | `testing`                |
| deploy, CI/CD, Docker, Kubernetes, infrastructure, pipeline            | `deployment`             |
| migration, schema, EF migration, alter table, add column               | `migration`              |
| security, vulnerability, OWASP, penetration, compliance                | `security-audit`         |
| idea, feature request, backlog, PBI, story                             | `idea-to-pbi`            |
| sprint, planning, grooming, backlog                                    | `sprint-planning`        |
| release, ready to deploy, ship, pre-release                            | `release-prep`           |
| bulk, batch, rename all, replace across, update all                    | `batch-operation`        |
| quality, audit, best practices, flaws, enhance                         | `quality-audit`          |
| pre-dev, ready to start, prerequisites, start dev                      | `pre-development`        |
| test spec, test cases from PBI, acceptance criteria                    | `pbi-to-tests`           |
| design spec, mockup, wireframe, UI spec                                | `design-workflow`        |
| status report, sprint update, progress, weekly                         | `pm-reporting`           |
| retro, retrospective, sprint end, lessons learned                      | `sprint-retro`           |
| full lifecycle, idea to release, complete feature, end-to-end          | `full-feature-lifecycle` |
| why review, design rationale, validate plan, check alternatives        | invoke `/why-review`     |
| sre review, production readiness, operational readiness, observability | invoke `/sre-review`     |

> **Note:** The full workflow catalog with sequences, keywords, and descriptions is defined in `.claude/workflows.json` and auto-injected by `workflow-router.cjs` on every prompt.

### Workflow Execution Protocol

**CRITICAL: First action after workflow detection MUST be calling `/workflow-start <workflowId>` then TaskCreate. No exceptions.**

1. **DETECT:** Match prompt against keyword table above and FIRST ACTION DECISION tree (see top of file)
2. **JUDGE:** Is the task simple? If yes → AI MUST ask user whether to skip workflow
3. **ACTIVATE (non-trivial):** Auto-activate via `/workflow-start <workflowId>` — no confirmation needed
4. **CREATE TASKS (HARD BLOCKING):** Use `TaskCreate` for ALL workflow steps BEFORE doing anything else — this is NOT optional
5. **ANNOUNCE:** Tell user: `"Detected: [Intent]. Following workflow: [sequence]"`
6. **EXECUTE:** Follow each step in sequence, updating todo status as you progress

### Task Breakdown Order (CRITICAL)

- TODO items MUST be created at **workflow step level FIRST** (e.g., "[Workflow] /scout", "[Workflow] /investigate", "[Workflow] /plan", etc.)
- Implementation-level subtasks should be created WITHIN each workflow step as it becomes active
- NEVER skip workflow-level TODOs in favor of jumping directly to implementation tasks
- When a prompt starts with an explicit command (e.g., `/plan`), still create workflow-level TODOs for the FULL detected workflow

**Simple task exception:** If AI judges the task is simple/straightforward (single-file changes, clear small fixes), AI MUST ask the user: "This seems simple. Skip workflow? (yes/no)". If user says no, activate workflow as normal. If user says "just do it" or "no workflow", skip without asking.

> Workflow catalog injection, continuity (TaskCreate tracking), recovery after context loss, and `quick:` override are handled automatically by `workflow-router.cjs` and `post-compact-recovery.cjs` hooks.
