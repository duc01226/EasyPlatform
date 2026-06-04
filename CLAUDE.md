<!-- CK:UNIVERSAL-GUIDES v3 -->

<!-- CK:WORKFLOW-GATE -->

> **[WORKFLOW-GATE] — routing is your FIRST action, before any tool call.**
> This rule is hook-independent: it binds Claude, Codex, and Copilot equally. Do not wait for any injected reminder to apply it.
>
> Classify complexity and risk first, then route it:
>
> | Request is about…                                                  | Default route                                                                                                                                       |
> | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
> | A simple, straightforward task with a clear target and low risk    | **direct execution** — do it without a workflow                                                                                                     |
> | A simple task that needs a few coordinated steps or skills         | **custom simple workflow** — sequence only the necessary skills/steps                                                                               |
> | A non-trivial bug, error, crash, regression, or wrong/stale output | **`workflow-bugfix` workflow** — `/start-workflow workflow-bugfix`                                                                                  |
> | A non-trivial new feature, capability, or enhancement              | **`workflow-feature` workflow** — `/start-workflow workflow-feature` (use `workflow-big-feature` when scope is large, ambiguous, or research-heavy) |
> | Anything matching a skill's or workflow's "Use" clause             | that skill / workflow                                                                                                                               |
> | A one-off question, or a truly trivial edit                        | direct execution                                                                                                                                    |
>
> 1. **An explicit `/skill` or `/workflow` in the prompt is the user's choice — execute it directly.** Otherwise auto-select the route yourself; never ask the user which path to take.
> 2. **Analyze whether the task is simple and straightforward before defaulting to a standard workflow.** If the target is clear, the change is low-risk, and a short direct execution can satisfy it, choose direct execution.
> 3. **For simple but multi-step work, build a custom simple workflow with only the few relevant skills/steps.** Do not expand to a full standard workflow when a small custom sequence is enough.
> 4. **Use standard workflows for non-trivial bugs and feature/enhancement work** — they force the investigation, tests, and review that risky or broad changes need.
> 5. **Declare the route, then ACTIVATE it — declaring is not activating.** State `Route: {workflow-id | skill | custom-simple | direct} — because {reason}`, then:
>     - **Workflow route →** invoke `/start-workflow <id>` as a tool call. That skill loads the workflow's canonical step `sequence` and creates the task list **1:1** from it. You MUST NOT hand-author your own task list for a workflow route — the canonical `sequence` is the only source of truth. Writing `Route: …` in prose and then improvising a few tasks is the failure this gate exists to prevent.
>     - **Skill route →** invoke that skill via the `Skill` tool.
>     - **Custom simple workflow →** create a small task list from the selected skills/steps, then execute them in order.
>     - **Direct route →** build the task list yourself, then proceed.
>       In every case the route must be activated BEFORE the first edit, sub-agent, or command.
> 6. **Direct execution is a legitimate route** for trivial, one-off, or simple straightforward work — but the declare-route and activate steps still apply.

<!-- /CK:WORKFLOW-GATE -->

<!-- CK:WORKFLOW-SKILLS -->

## Workflow & Skills Catalog

Session-start reference derived from `.claude/workflows.json` — use it to pick a route on any prompt: run a standard workflow, compose a custom workflow from the step-skills, invoke a single skill, or execute directly.

### Workflow Skills (53 composable steps)

Distinct step-skills used across the workflows above — compose these into a custom workflow when no standard workflow fits.

| Skill                     | Use for                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `architecture-design`     | [Architecture] Use when designing solution architecture across backend, frontend, deployment, monitoring, testing, and code quality.                                                                                                                                                                                                                                               |
| `brainstorm`              | [Content] Use when you need to brainstorm as a PO/BA — structured ideation for problem-solving, new product creation, or feature enhancement.                                                                                                                                                                                                                                      |
| `business-evaluation`     | [Content] Use when you need to evaluate business idea viability: Business Model Canvas, financial projections, risk matrix, go-to-market, execution plan.                                                                                                                                                                                                                          |
| `changelog`               | [Documentation] Use when you need to generate or update changelog entries.                                                                                                                                                                                                                                                                                                         |
| `code`                    | [Implementation] Use when you need to start coding & testing an existing plan. Flags: --approval=off (auto/trust mode, no approval gate), --tests=off (skip the test step), --parallel (parallel phase execution via subagents).                                                                                                                                                   |
| `code-simplifier`         | [Code Quality] Use when you need to simplify and refine code for clarity, consistency, and maintainability while preserving all functionality.                                                                                                                                                                                                                                     |
| `cook`                    | [Implementation] Use when you need to implement a feature [step by step].                                                                                                                                                                                                                                                                                                          |
| `debug-investigate`       | [Fix & Debug] Use when investigating a bug''s root cause — reproduce the symptom, trace it end-to-start through the code, form and test hypotheses, and pinpoint the defect before any fix.                                                                                                                                                                                        |
| `deep-research`           | [Research] Use when deeply researching top sources from web-research.                                                                                                                                                                                                                                                                                                              |
| `docs-update`             | [Documentation] Use when updating impacted documentation after code, spec, or test changes.                                                                                                                                                                                                                                                                                        |
| `domain-analysis`         | [Architecture] Use when you need to analyze business domain: bounded contexts, aggregates, entities, ERD, domain events, and cross-context integration.                                                                                                                                                                                                                            |
| `dor-gate`                | [Code Quality] Use when you need to validate a PBI against Definition of Ready before grooming.                                                                                                                                                                                                                                                                                    |
| `e2e-test`                | [Testing] Use when generating, updating, or maintaining E2E tests from recordings, specs, or code changes.                                                                                                                                                                                                                                                                         |
| `excalidraw-diagram`      | [Utilities] Use when the user wants to visualize workflows, architectures, or concepts as Excalidraw diagram JSON files.                                                                                                                                                                                                                                                           |
| `fix`                     | [Implementation] Use when you need to analyze and fix issues [INTELLIGENT ROUTING]. Flag: --target={ci\|issue\|logs\|test\|types\|ui} scopes the fix; --target=types resolves TypeScript errors inline.                                                                                                                                                                            |
| `harness-setup`           | [Quality] Use when setting up an agent quality harness with feedforward guides and feedback sensors.                                                                                                                                                                                                                                                                               |
| `idea`                    | [Project Management] Use when capturing new ideas, feature requests, or concepts for future refinement.                                                                                                                                                                                                                                                                            |
| `integration-test`        | [Testing] Use when you need to generate or review integration tests.                                                                                                                                                                                                                                                                                                               |
| `integration-test-review` | [Code Quality] Use when you need to review integration tests for assertion quality, bug protection, repeatability, and test-spec traceability — AND verify the review target (changed production code) has test coverage (integration-first) with spec↔test↔code alignment.                                                                                                        |
| `integration-test-verify` | [Testing] Use when you need to verify integration tests pass after writing and reviewing them.                                                                                                                                                                                                                                                                                     |
| `investigate`             | [Fix & Debug] Use when you need to investigate and explain how existing features or logic work. Flag: --mode=explain produces a one-way developer-narrative explanation (Purpose → How → Why → Impact) tuned by coding level; use /understand for the standalone prompt-driven explainer.                                                                                          |
| `knowledge-review`        | [Research] Use when you need to review knowledge artifacts for completeness, citation quality, confidence accuracy, and template compliance.                                                                                                                                                                                                                                       |
| `knowledge-synthesis`     | [Research] Use when you need to synthesize research findings into structured report using template.                                                                                                                                                                                                                                                                                |
| `linter-setup`            | [Quality] Use when you need to research and configure code quality tooling for any tech stack — linters, formatters, static analysis, pre-commit hooks, and CI gates.                                                                                                                                                                                                              |
| `pbi-challenge`           | [Code Quality] Use when you need an AI-assisted Dev BA PIC review of PBI drafts.                                                                                                                                                                                                                                                                                                   |
| `pbi-mockup`              | [Project Management] Use when you need to generate an HTML mockup report from PBI and story artifacts.                                                                                                                                                                                                                                                                             |
| `performance-review`      | [Debugging] Use when analyzing or optimizing performance bottlenecks: database queries, N+1 fan-out, indexing, API latency, memory, concurrency, frontend rendering, caching, and distributed paths.                                                                                                                                                                               |
| `plan`                    | [Planning] Use when you need intelligent plan creation with prompt enhancement. Flag: --mode={ci\|cro} (default none — standard planning); --mode=ci plans a fix from a GitHub Actions CI run/log, --mode=cro plans conversion-rate optimization (25-item CRO framework).                                                                                                          |
| `plan-review`             | [Planning] Use when you need to auto-review a plan for validity, correctness, and best practices — recursive: review, validate findings with why-review, fix validated findings, full re-review until no findings.                                                                                                                                                                 |
| `plan-validate`           | [Planning] Use when you need to validate a plan with critical questions interview.                                                                                                                                                                                                                                                                                                 |
| `prioritize`              | [Project Management] Use when you need to prioritize backlog items using RICE, MoSCoW, or Value-Effort frameworks.                                                                                                                                                                                                                                                                 |
| `prove-fix`               | [Code Quality] Use when you need to prove fix correctness with code proof traces, confidence scoring, and stack-trace-style evidence chains.                                                                                                                                                                                                                                       |
| `refine`                  | [Project Management] Use when converting ideas to PBIs, validating problem hypotheses, adding acceptance criteria, or refining requirements.                                                                                                                                                                                                                                       |
| `review-architecture`     | [Code Quality] Use when reviewing architecture compliance for layers, messaging, service boundaries, CQRS, repos, and entity events.                                                                                                                                                                                                                                               |
| `review-artifact`         | [Code Quality] Use when you need to review artifact quality (PBI, user story, test spec, design spec) before handoff. Supports --type={pbi\|story\|spec-tests\|design}.                                                                                                                                                                                                            |
| `review-changes`          | [Code Quality] Use when reviewing current changes, staged or unstaged diffs, or branch-to-branch diffs.                                                                                                                                                                                                                                                                            |
| `review-domain-entities`  | [DDD Quality] Use when you need to review domain entities and value objects for DDD design quality.                                                                                                                                                                                                                                                                                |
| `review-post-task`        | [Code Quality] Use when you need two-pass code review for task completion.                                                                                                                                                                                                                                                                                                         |
| `scaffold`                | [Architecture] Use when scaffolding reusable OOP/SOLID project foundations before feature implementation.                                                                                                                                                                                                                                                                          |
| `scout`                   | [Investigation] Use when quickly locating relevant files and affected areas across a large codebase.                                                                                                                                                                                                                                                                               |
| `security-review`         | [Code Quality] Use when you need to perform a security review or audit on any scope — application code (OWASP Top 10 2025), secrets exposure, dependency/supply-chain malware, third-party repository vetting before install, infrastructure/config, CI/CD pipeline, AI-agent risks, and host/VPS compromise detection.                                                            |
| `seed-test-data`          | [Dev Data] Use when you need to implement or enhance test data seeders that simulate QC happy-path scenarios via application-layer commands.                                                                                                                                                                                                                                       |
| `spec`                    | [Documentation] Use to author, audit, amend, or test-spec a business Feature Spec. The single spec skill — modes init\|update\|audit\|amend create/maintain the tech-free 8-section Feature Spec; tests generates Section 8 TC-{FEATURE}-{NNN} test specifications; sync reconciles §8 TCs ↔ integration test code. Per-mode procedure lives in references/{author,tests,sync}.md. |
| `spec-index`              | [General] Use when you need to (re)generate a DERIVED navigation index, cross-capability ERD, or reimplementation guide assembled FROM the canonical Feature Specs under docs/specs/\*\*. Never extracts a separate A-E engineering tree.                                                                                                                                          |
| `sre-review`              | [Code Quality] Use when reviewing service-layer and API changes for production readiness.                                                                                                                                                                                                                                                                                          |
| `story`                   | [Project Management] Use when creating user stories from PBIs, slicing features, or breaking down requirements.                                                                                                                                                                                                                                                                    |
| `tech-stack-research`     | [Architecture] Use when you need to research, analyze, and compare tech stack options as a solution architect.                                                                                                                                                                                                                                                                     |
| `test`                    | [Testing] Use when you need to run tests locally and analyze the summary report.                                                                                                                                                                                                                                                                                                   |
| `watzup`                  | [Utilities] Use when you need to review recent changes and wrap up the work.                                                                                                                                                                                                                                                                                                       |
| `web-research`            | [Research] Use when starting a web research task — discover, gather, and triage candidate sources on a topic to feed deeper investigation.                                                                                                                                                                                                                                         |
| `why-review`              | [Code Quality] Use when reviewing rationale and change quality for plans, PBIs, commits, diffs, docs, specs, reports, or explicit artifacts.                                                                                                                                                                                                                                       |
| `workflow-end`            | [Process] Use when you need to end the active workflow and clear state.                                                                                                                                                                                                                                                                                                            |
| `workflow-review-changes` | [Workflow] Use when activating the Review Current Changes workflow for review, fix, and re-review recursively until all issues resolved.                                                                                                                                                                                                                                           |

<!-- /CK:WORKFLOW-SKILLS -->

# Easy.Platform - Code Instructions

## Workflow Step Advancement & Parallel Phases

<!-- Universal portable rule shipped by claude-md-init into every project — model-driven workflow progression, identical across Claude, Codex (AGENTS.md whole-file mirror), and Copilot (baked common-protocol), none of which depend on a hook. The runtime workflow-protocol injector and any step-tracker hook are accelerators only. -->

Workflow progression is **model-driven** — your responsibility, not a tool/hook/harness signal:

1. **Advancement.** A step is complete when its work returns — whether run **inline** (a skill/step call) OR dispatched as a **sub-agent** (Agent / Task tool). A sub-agent completion advances the step **identically** to an inline call. Do not wait for any hook or tool event to advance; advance by judgment and your task list.
2. **Parallel phase = all-return barrier.** When steps are declared a parallel-phase group, spawn **ALL** members together (one message), then advance **only after EVERY member returns**. Never start the next step — and never start any code-mutating step (e.g. `code-simplifier`) — until the whole group has returned. A conditional member whose trigger is absent counts as "returned."
3. **Workflow-in-workflow → sub-agent.** A step that itself activates a multi-step workflow MUST run as a sub-agent; it returns only a summary and writes full findings to `plans/reports/`. This preserves context containment.
4. **Hooks/trackers are accelerators only.** Any step-tracking hook (e.g. Claude's `workflow-step-tracker.cjs`) is an optimization that may emit "next step" hints; correctness MUST NOT depend on it. Codex and Copilot run with no hooks and advance entirely by this rule.

---

> .NET 9 Framework + Angular Frontend | Platform Framework & Example Application

**Goal:** Build microservices with CQRS, event-driven architecture, multi-database support using Easy.Platform framework. PlatformExampleApp (TextSnippet) is the reference implementation.

**Workflow:** Detect workflow from prompt → `/workflow-start <id>` → TaskCreate → execute. Modification keywords → Feature/Refactor/Bugfix workflow. Fallback → `/plan <prompt>`.

**Top 5 Rules (AI violates these most):**

1. **Search 3+ existing patterns** before writing ANY code — never invent new patterns
2. **Evidence before conclusion** — cite `file:line`, grep results. Speculation is FORBIDDEN
3. **Logic in LOWEST layer** — Entity/Model > Service > Component/Handler
4. **Workflow detection is non-negotiable** — first action on any non-trivial prompt
5. **TaskCreate before file changes** — mandatory for any file-modifying prompt

> **Development Rules** — YAGNI/KISS/DRY. Kebab-case files. Files under 200 lines. Logic in lowest layer. Run linting before commit. MUST READ [`.claude/workflows/development-rules.md`](.claude/workflows/development-rules.md) for full rules, code quality guidelines, and pre-commit checklist.

> **Evidence-Based Reasoning Protocol** — No speculation: cite `file:line` for every claim. Confidence declaration required (95%+ = recommend freely, <60% = DO NOT recommend). Complete validation chain before any code removal/refactoring. MUST READ [`.claude/skills/shared/evidence-based-reasoning-protocol.md`](.claude/skills/shared/evidence-based-reasoning-protocol.md) for full protocol.

> **Understand Code First Protocol** — Read and understand existing code BEFORE any modification. Search for 3+ similar implementations. Run graph trace on key files when `.code-graph/graph.db` exists. Write analysis to `.ai/workspace/analysis/` for non-trivial tasks. MUST READ [`.claude/skills/shared/understand-code-first-protocol.md`](.claude/skills/shared/understand-code-first-protocol.md) for full protocol.

> **Iterative Phase Quality Protocol** — Score complexity before planning (score 6+ = MUST decompose into phases). Each phase: ≤5 files, ≤3h effort, independently reviewable. Cycle: plan → implement → review → fix → verify. MUST READ [`.claude/skills/shared/iterative-phase-quality-protocol.md`](.claude/skills/shared/iterative-phase-quality-protocol.md) for complexity scoring and phase rules.

**Sections:** [TL;DR](#tldr--what-you-must-know-before-writing-any-code) | [Search First](#mandatory-search-existing-code-first) | [First Action](#first-action-decision-before-any-tool-call) | [Task Planning](#important-task-planning-rules-must-follow) | [Code Hierarchy](#code-responsibility-hierarchy-critical) | [Plan Before Implement](#mandatory-plan-before-implement) | [Naming](#naming-conventions) | [File Locations](#key-file-locations) | [Dev Commands](#development-commands) | [Integration Testing](#integration-testing) | [E2E Testing](#e2e-testing) | [Local Startup](#local-system-startup) | [Evidence & Investigation](#evidence-based-reasoning--investigation-protocol-mandatory) | [Graph Intelligence](#graph-intelligence-mandatory-when-code-graphgraphdb-exists) | [Skill Activation](#automatic-skill-activation-mandatory) | [Documentation Index](#documentation-index) | [Workflow Lookup](#workflow-keyword-lookup--execution-protocol)

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
2. **Design Before Mechanics** — Document WHY before WHAT.
3. **Own Your Abstractions** — Every dependency and framework decision is YOUR responsibility.
4. **Operational Awareness** — Code that can't be debugged or rolled back is technical debt.
5. **Depth Over Breadth** — One well-understood solution beats ten AI-generated variants.

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

| #   | Rule                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **MANDATORY task creation for file-modifying prompts** — `TaskCreate` items BEFORE making changes. Only skip for single-line trivial fixes or pure questions. |
| 2   | **Break work into many small todo tasks** — granular tasks prevent losing track of progress                                                                   |
| 3   | **Final review todo task** — review all work, find fixes/enhancements, **check for doc staleness** (cross-reference changed files against `docs/`)            |
| 4   | **Mark todos completed IMMEDIATELY** — never batch completions                                                                                                |
| 5   | **ONE task in_progress at a time** — complete current before starting next                                                                                    |
| 6   | **TaskCreate proactively** for any task with 2+ steps or any task that modifies files                                                                         |
| 7   | **On context loss** — check `TaskList` for `[Workflow]` items to recover your place                                                                           |
| 8   | **No speculation or hallucination** — always answer with proof (code references, search results, file evidence)                                               |
| 9   | **Evidence-based recommendations** — complete Investigation Protocol validation chain. Declare confidence level.                                              |
| 10  | **Breaking change assessment** — HIGH/MEDIUM risk requires full validation (see Investigation Protocol)                                                       |

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

| Type        | Convention                  | Example                                                 |
| ----------- | --------------------------- | ------------------------------------------------------- |
| Constants   | UPPER_SNAKE_CASE            | `MAX_RETRY_COUNT`                                       |
| Booleans    | Prefix with verb            | `isActive`, `hasPermission`, `canEdit`, `shouldProcess` |
| Collections | Plural                      | `users`, `items`, `employees`                           |
| BEM CSS     | block\_\_element --modifier | All frontend template elements must have BEM classes    |

<!-- SECTION:key-locations -->

```
src/Platform/Easy\.Platform/             # Core framework library — CQRS, entities, validation, repositories, message bus abstractions
src/Platform/Easy\.Platform\.AspNetCore/ # ASP.NET Core integration — controllers, middleware, DI
src/Platform/Easy\.Platform\.MongoDB/    # MongoDB persistence provider
src/Platform/Easy\.Platform\.EfCore/     # EF Core persistence provider (PostgreSQL, SQL Server)
src/Platform/Easy\.Platform\.RabbitMQ/   # RabbitMQ message bus implementation
src/Platform/Easy\.Platform\.RedisCache/ # Redis caching provider
src/Platform/Easy\.Platform\.AutomationTest/ # Test framework — integration test base classes and helpers
src/Platform/Easy\.Platform\.AzureFileStorage/ # Azure Blob Storage file storage provider
src/Platform/Easy\.Platform\.FireBasePushNotification/ # Firebase push notification provider
src/Platform/Easy\.Platform\.HangfireBackgroundJob/ # Hangfire background job integration
src/Backend/PlatformExampleApp\.TextSnippet\.Api/ # Example app API host — controllers, DI modules, startup
src/Backend/PlatformExampleApp\.TextSnippet\.Application/ # Example app application layer — CQRS commands, queries, DTOs, event handlers
src/Backend/PlatformExampleApp\.TextSnippet\.Domain/ # Example app domain layer — entities, repositories, domain events
src/Backend/PlatformExampleApp\.TextSnippet\.Infrastructure/ # Example app infrastructure — external service integrations
src/Backend/PlatformExampleApp\.TextSnippet\.Persistence/ # Example app EF Core persistence (SQL Server/PostgreSQL)
src/Backend/PlatformExampleApp\.TextSnippet\.Persistence\.Mongo/ # Example app MongoDB persistence
src/Backend/PlatformExampleApp\.TextSnippet\.Persistence\.PostgreSql/ # Example app PostgreSQL-specific persistence
src/Backend/PlatformExampleApp\.Shared/  # Shared DTOs and message contracts across example app services
src/Backend/PlatformExampleApp\.TextSnippet\.Persistence\.MultiDbDemo\.Mongo/ # Example app multi-database demo MongoDB persistence
src/Backend/PlatformExampleApp\.Ids/     # Identity server — authentication and authorization
src/Backend/PlatformExampleApp\.IntegrationTests/ # Integration test suite for example app
src/Backend/PlatformExampleApp\.Test\.Shared/ # Shared test utilities and helpers across test projects
src/Backend/PlatformExampleApp\.Test/    # Unit test project for example app
src/Backend/PlatformExampleApp\.Test\.BDD/ # BDD test project for example app
src/Backend/PlatformExampleApp\.Benchmark/ # Benchmarking project
src/Platform/Easy\.Platform\.Benchmark/  # Benchmarking project for Platform framework
src/Platform/Easy\.Platform\.CustomAnalyzers/ # Custom Roslyn analyzers for code quality enforcement
src/Platform/Easy\.Platform\.Tests\.Unit/ # Unit tests for Platform framework
src/Frontend/apps/playground-text-snippet/ # Angular frontend app for TextSnippet example
src/Frontend/libs/platform-core/         # Frontend framework core — base components, stores, API services, utilities
src/Frontend/libs/apps-domains/text-snippet-domain/ # Frontend domain library for TextSnippet
src/Frontend/libs/apps-domains-components/ # Domain-specific UI components
src/Frontend/libs/apps-shared-components/ # Shared UI components across apps
src/Frontend/libs/platform-components/   # Platform-level reusable UI components
```

<!-- /SECTION:key-locations -->

<!-- SECTION:dev-commands -->

```bash
dotnet test src/Backend/PlatformExampleApp.Test/ # backend-unit
dotnet test src/Backend/PlatformExampleApp.IntegrationTests/ # backend-integration
dotnet test src/Backend/PlatformExampleApp.Test.BDD/ # backend-bdd
cd src/Frontend && npm test                   # frontend-unit
cd src/Frontend/e2e && npx playwright test    # e2e
```

<!-- /SECTION:dev-commands -->

<!-- SECTION:integration-testing -->

See [integration-test-reference.md](docs/project-reference/integration-test-reference.md) for integration test patterns and setup.

<!-- /SECTION:integration-testing -->

<!-- SECTION:e2e-testing -->

E2E testing framework(s): xunit, playwright, jest

<!-- /SECTION:e2e-testing -->

## Local System Startup

Start order: **Infrastructure → Backend API → Frontend**. Docker compose files in `src/`.

<!-- SECTION:infra-ports -->
<!-- /SECTION:infra-ports -->

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

**Notes:** Docker port mappings use bare `HOST:CONTAINER` form (e.g. `27017:27017`, `54320:5432`, `5672:5672`), so Docker binds them to `0.0.0.0` — dev infra (MongoDB/PostgreSQL/SQL Server/RabbitMQ/Redis) is reachable from the local network, not just localhost. To restrict to localhost, prefix host ports with `127.0.0.1:` in `src/platform-example-app.docker-compose.override.yml`. See that file for full configuration.

## Evidence-Based Reasoning & Investigation Protocol (MANDATORY)

> **Evidence-Based Reasoning Protocol** — No speculation: cite `file:line` for every claim. Confidence declaration required (95%+ = recommend freely, <60% = DO NOT recommend). Pre-claim checklist: evidence file path + grep search + 3+ similar patterns + framework docs + confidence level. MUST READ [`.claude/skills/shared/evidence-based-reasoning-protocol.md`](.claude/skills/shared/evidence-based-reasoning-protocol.md) for full protocol.

> **Anti-Hallucination Patterns** — Forbidden phrases without evidence: "should be", "obviously", "I think", "probably". Replace with evidence-first language: "Evidence from [file:line] shows...", "Confidence: X% based on [evidence list]". Optional deep-dive: [`.claude/docs/anti-hallucination-patterns.md`](.claude/docs/anti-hallucination-patterns.md).

### Core Rules

1. **Evidence before conclusion** — Cite `file:line`, grep results, or framework docs. Never use "obviously...", "I think...", "this is because..." without proof.
2. **Confidence declaration required** — Every recommendation must state confidence level with evidence list.
3. **Inference alone is FORBIDDEN** — Always upgrade to code evidence (grep results, file reads). When unsure: _"I don't have enough evidence yet. Need to investigate [specific items]."_
4. **Cross-project validation** — Check both Platform framework and PlatformExampleApp before recommending architectural changes.

### Confidence Levels

| Level       | Meaning                                                       | Action                                      |
| ----------- | ------------------------------------------------------------- | ------------------------------------------- |
| **95-100%** | Full trace, all checklist items verified, both layers checked | Recommend freely                            |
| **80-94%**  | Main paths verified, some edge cases unverified               | Recommend with caveats                      |
| **60-79%**  | Implementation found, usage partially traced                  | Recommend cautiously                        |
| **<60%**    | Insufficient evidence                                         | **DO NOT RECOMMEND** — gather more evidence |

**Format:** `Confidence: 85% — Verified in Platform core and ExampleApp, did not check all persistence providers`

**When < 80%:** List what's verified vs. unverified, ask user before proceeding.

### Breaking Change Risk Matrix

| Risk       | Criteria                                                      | Required Evidence                                  |
| ---------- | ------------------------------------------------------------- | -------------------------------------------------- |
| **HIGH**   | Removing registrations, deleting classes, changing interfaces | Full usage trace + impact analysis + all consumers |
| **MEDIUM** | Refactoring methods, changing signatures                      | Usage trace + test verification                    |
| **LOW**    | Renaming, formatting, comments                                | Code review only                                   |

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

## Graph Intelligence (MANDATORY when .code-graph/graph.db exists)

<HARD-GATE>
You MUST run at least ONE graph command on key files before concluding any investigation,
creating any plan, or verifying any fix. Proceeding without graph evidence is FORBIDDEN.
Skip only if `.code-graph/graph.db` does not exist.
</HARD-GATE>

### Quick CLI Reference

```bash
python .claude/scripts/code_graph trace <file> --direction both --json                    # Full system flow
python .claude/scripts/code_graph trace <file> --direction both --node-mode file --json   # File-level overview
python .claude/scripts/code_graph connections <file> --json                               # Structural relationships
python .claude/scripts/code_graph query callers_of <function> --json                      # All callers
python .claude/scripts/code_graph query tests_for <function> --json                       # Test coverage
python .claude/scripts/code_graph batch-query <f1> <f2> <f3> --json                       # Multiple files at once
python .claude/scripts/code_graph search <keyword> --kind Function --json                 # Find by keyword
```

**Pattern:** Grep finds files > trace reveals system flow > grep verifies details.

---

<!-- SECTION:skill-activation -->

These skills auto-activate before file edits in their path patterns:

| Path Pattern      | Skill / Auto-Context | Pre-Read Files                                          |
| ----------------- | -------------------- | ------------------------------------------------------- |
| `src/Backend/**`  | _(auto-context)_     | `docs/project-reference/backend-patterns-reference.md`  |
| `src/Frontend/**` | _(auto-context)_     | `docs/project-reference/frontend-patterns-reference.md` |

<!-- /SECTION:skill-activation -->

<!-- SECTION:doc-index -->

```
docs/project-reference/  (11 files)
docs/templates/  (1 files)
```

<!-- /SECTION:doc-index -->

<!-- SECTION:doc-lookup -->

| If user prompt mentions...                                     | Read first                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| Feature specs, capability behavior, business rules, test cases | `docs/specs/` + `docs/project-reference/feature-spec-reference.md`  |
| Spec paths, TC format, canonical vs derived spec artifacts     | `docs/project-reference/spec-system-reference.md`                   |
| Spec quality, AI-implementability, tech-agnostic prose         | `docs/project-reference/spec-principles.md`                         |
| Behavior or public contract changes, spec-test-code sync       | `docs/project-reference/workflow-spec-test-code-cycle-reference.md` |
| Backend patterns, CQRS, validation                             | `docs/project-reference/backend-patterns-reference.md`              |
| Frontend patterns, components, stores                          | `docs/project-reference/frontend-patterns-reference.md`             |

<!-- /SECTION:doc-lookup -->

## Workflow Keyword Lookup & Execution Protocol

The full workflow catalog (keywords, sequences, descriptions) is defined in `.claude/workflows.json` and **auto-injected by `workflow-router.cjs`** on every prompt — no static table needed here.

For GitHub Copilot (which lacks hooks), run `/sync-copilot-workflows` to regenerate the catalog in `.github/common.copilot-instructions.md`.

### Workflow Execution Protocol

**CRITICAL: First action after workflow detection MUST be calling `/workflow-start <workflowId>` then TaskCreate. No exceptions.**

1. **DETECT:** Match prompt against keyword table above and FIRST ACTION DECISION tree (see top of file)
2. **JUDGE:** Is the task simple? If yes → AI MUST ask user whether to skip workflow
3. **ACTIVATE (non-trivial):** Auto-activate via `/workflow-start <workflowId>` — no confirmation needed
4. **CREATE TASKS (HARD BLOCKING):** Use `TaskCreate` for ALL workflow steps BEFORE doing anything else — this is NOT optional
5. **ANNOUNCE:** Tell user: `"Detected: [Intent]. Following workflow: [sequence]"`
6. **EXECUTE:** Follow each step in sequence, updating todo status as you progress

---

## Closing Reminders (AI Attention Anchor)

**These are the rules AI most commonly violates. Re-read before EVERY action.**

1. **SEARCH FIRST** — Before writing ANY code, grep/glob for 3+ existing patterns. Follow codebase conventions, not generic knowledge. PlatformExampleApp is the reference.
2. **WORKFLOW BEFORE TOOLS** — First action on any non-trivial prompt MUST be workflow detection → `/workflow-start <id>`. Never jump straight to TaskCreate, Read, Grep, or Edit.
3. **EVIDENCE, NOT SPECULATION** — Every claim needs `file:line` proof. Never say "obviously", "I think", "should be" without grep results. Confidence <60% = DO NOT recommend.
4. **LOGIC IN LOWEST LAYER** — Entity/Model > Service > Component/Handler. If logic belongs 90% to an entity, put it in the entity. Constants, dropdowns, display helpers = Model layer.
5. **TaskCreate BEFORE file changes** — Any file-modifying prompt requires TaskCreate items BEFORE making changes. Mark completed IMMEDIATELY. One in_progress at a time.
