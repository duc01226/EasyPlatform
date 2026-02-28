# BravoSUITE Development Guidelines

**Enterprise HR & Talent Management Platform** - .NET 9 Microservices + Angular 19 Micro Frontends

> **⚠️ MANDATORY — Confirm Before Execute:** If the user prompt is longer than 100 characters, you **MUST** first confirm your understanding of the request and clarify the user's intent before executing any task. Restate what you understood, ask clarifying questions if ambiguous, and only proceed after the user confirms. During confirmation, check if the task matches any workflow from the workflow catalog. If the task is non-trivial, auto-activate the detected workflow immediately. If AI judges the task is simple, AI MUST ask the user whether to skip the workflow. This applies to ALL AI tools (Claude Code, GitHub Copilot, etc.).

---

## TL;DR — What You Must Know Before Writing Any Code

**Project:** BravoSUITE is an enterprise HR platform with 5 apps (bravoTALENTS, bravoGROWTH, bravoSURVEYS, bravoINSIGHTS, Accounts). Backend: .NET 9 + Easy.Platform + CQRS + MongoDB/SQL Server. Frontend: Angular 19 (WebV2) + Angular 12 (Web) + Nx. Messaging: RabbitMQ.

**Golden Rules (memorize these):**

1. **Repositories** — Use service-specific (`IGrowthRootRepository<T>`, `ICandidatePlatformRootRepository<T>`), NEVER generic `IPlatformRootRepository`
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
| Data access        | Service-specific repository + extensions                       |
| Cross-service sync | Entity Event Consumer (message bus)                            |
| Scheduled task     | `PlatformApplicationBackgroundJob`                             |
| Migration          | `PlatformDataMigrationExecutor` / EF migrations                |
| Simple component   | Extend `AppBaseComponent`                                      |
| Complex state      | `AppBaseVmStoreComponent` + `PlatformVmStore`                  |
| Forms              | `AppBaseFormComponent` with validation                         |
| API calls          | Service extending `PlatformApiService`                         |
| Cross-app reusable | Add to `bravo-common`                                          |
| Cross-domain       | `apps-domains` library                                         |
| Repository         | `I{ServiceName}PlatformRootRepository<TEntity>`                |
| Complex queries    | `RepositoryExtensions` with static expressions                 |
| Integration test   | Extend `PlatformServiceIntegrationTestWithAssertions<TModule>` |

**Workflow:** Always plan before implementing non-trivial tasks. Match user prompt to workflow catalog (end of file). If modification keywords present → use Feature/Refactor/Bugfix workflow. Fallback → `/plan <prompt>`.

**Key Locations:** `src/Services/` (microservices), `src/Platform/Easy.Platform/` (framework), `src/WebV2/libs/platform-core/` (frontend framework), `src/PlatformExampleApp/` (examples to study), `docs/business-features/` (18 feature docs)

**⚠️ MANDATORY: Search Existing Code FIRST**

**Before writing ANY code:**

1. **Grep/Glob search** for similar patterns in BravoSUITE (find 3+ examples)
2. **Follow codebase pattern**, NOT generic framework docs
3. **Provide evidence** in plan (file:line references)

**Why:** BravoSUITE has project-specific conventions that differ from framework defaults.

**Enforced by:** Feature/Bugfix/Refactor workflows (scout → investigate steps)

**Anti-Patterns (brief):** No direct cross-service DB access → message bus. No `throw ValidationException` → `PlatformValidationResult`. No side effects in command handlers → entity event handlers. No direct `HttpClient` → `PlatformApiService`. No manual signals → `PlatformVmStore`.

**Verification:** Never claim completion without evidence. Always re-read modified files. Always search before assuming file locations. Provide file paths + line numbers as proof.

---

## FIRST ACTION DECISION (Before ANY tool call)

**⛔ STOP — DO NOT CALL ANY TOOL YET ⛔**

```
1. Explicit slash command? (e.g., `/plan`, `/cook`) → Execute it
2. Prompt matches workflow? → Activate workflow + confirm if required
3. MODIFICATION keywords present? → Use Feature/Refactor/Bugfix workflow
   (update, add, create, implement, enhance, insert, fix, change, remove, delete)
4. Pure research? (no modification keywords) → Investigation workflow
5. FALLBACK → MUST invoke `/plan <prompt>` FIRST
```

**CRITICAL: Modification > Research.** If prompt contains BOTH research AND modification intent, **modification workflow wins** (investigation is a substep of `/plan`).

---

## ⚠️ FINAL REMINDER: Workflow Detection is NOT Optional

**This is the MOST CRITICAL instruction in this entire file.**

Before you respond to ANY user prompt, you MUST:

1. **Check the prompt against the Complete Workflow Catalog below** (at end of file)
2. **If a workflow matches and the task is non-trivial → auto-activate it immediately.** Do NOT skip it. Do NOT read files first.
3. **If the task is simple/straightforward**, AI MUST ask the user: "This seems simple. Skip workflow? (yes/no)". If user says no, activate workflow as normal.
4. **Create a todo list for ALL workflow steps BEFORE doing anything else.**

**The ONLY exceptions:** single-line typo fixes, user explicitly says "just do it" or "no workflow", pure questions with no code changes.

**No speculation or hallucination** — always answer with proof (code references, search results, file evidence). If unsure, investigate first rather than guessing.

---

## IMPORTANT: Task Planning Rules (MUST FOLLOW)

These rules apply to EVERY task, whether using a workflow or not:

1. **MANDATORY task creation for file-modifying prompts** — If the prompt could result in ANY file changes (code, config, docs), you MUST create task items BEFORE making changes. This applies even without a workflow match. Only skip for single-line trivial fixes or pure questions.
2. **Always break work into many small todo tasks** — granular tasks prevent losing track of progress
3. **Always add a final review todo task** to review all work done, find any fixes or enhancements needed, **and check for doc staleness** (cross-reference changed files against `docs/` — see watzup skill for the mapping table)
4. **Mark todos as completed IMMEDIATELY** after finishing each task — never batch completions
5. **Exactly ONE task in_progress at a time** — complete current before starting next
6. **Use task tracking proactively** for any task with 2+ steps or any task that modifies files — visibility into progress is critical
7. **On context loss**, check task list for `[Workflow]` items to recover your place
8. **No speculation or hallucination** — always answer with proof (code references, search results, file evidence). If unsure, investigate first rather than guessing.
9. **Evidence-based recommendations** — Before recommending code removal/refactoring, complete the Investigation Protocol validation chain. Declare confidence level for all architectural recommendations.
10. **Breaking change assessment** — Any recommendation that could break functionality requires HIGH/MEDIUM risk validation (see Investigation & Recommendation Protocol).

---

## ⚠️ FALLBACK: No Workflow Match

**If user prompt does not match any workflows, always use command/skills `/plan <user prompt>`**

---

## Project Overview

BravoSUITE is a comprehensive enterprise platform for HR management, talent acquisition, and employee engagement built with microservices architecture, Clean Architecture, CQRS, and event-driven design.

**Core Business Applications:**

- **bravoTALENTS:** Recruitment & talent management pipeline
- **bravoGROWTH:** Employee lifecycle & HR management
- **bravoSURVEYS:** Survey creation & feedback collection
- **bravoINSIGHTS:** Analytics & business intelligence

**Supporting Services:** Accounts (Auth), CandidateApp, NotificationMessage, ParserApi

**📚 Business Feature Documentation:** All 18 business features have comprehensive 26-section documentation at `docs/business-features/`. This is the authoritative source for understanding feature business rules, test cases, and implementation details.

## Tech Stack

| Layer         | Technology                                                          |
| ------------- | ------------------------------------------------------------------- |
| **Backend**   | .NET 9, Clean Architecture, CQRS, MongoDB/SQL Server/PostgreSQL     |
| **Frontend**  | Angular 19 (WebV2), Angular 12 (Web), Nx workspace, micro frontends |
| **Framework** | Easy.Platform (custom infrastructure)                               |
| **Messaging** | RabbitMQ message bus for cross-service communication                |

## Mandatory: Plan Before Implement

Before implementing ANY non-trivial task, you MUST:

1. **Use Plan Skill** - Use /plan skill automatically
2. **Investigate & Analyze** - Explore codebase, understand context
3. **Create Implementation Plan** - Write detailed plan with files and approach
4. **Get User Approval** - Wait for confirmation before code changes
5. **Then Implement** - Execute the approved plan

**Exceptions:** Single-line fixes, user says "just do it", pure research with no changes.

**Automated enforcement:** `edit-enforcement.cjs` warns at 4 unique files modified without an active plan, re-warns at 8 files. Blocks non-exempt file edits without TaskCreate.

## Core Principles (MANDATORY)

**Backend Rules:**

1. Use microservice-specific repositories (`IGrowthRootRepository`, `ICandidatePlatformRootRepository`) - never generic `IPlatformRootRepository`
2. Use `PlatformValidationResult` fluent API (`.And()`, `.AndAsync()`) - never `throw ValidationException`
3. Side effects (notifications, emails, external APIs) go in Entity Event Handlers (`UseCaseEvents/`) - never in command handlers
4. DTOs own mapping via `PlatformEntityDto<TEntity, TKey>.MapToEntity()` or `PlatformDto<T>.MapToObject()` - never map in handlers
5. Command + Result + Handler in ONE file under `UseCaseCommands/{Feature}/`
6. Cross-service communication via RabbitMQ message bus only - never direct database access

**Frontend Rules:** 7. Extend `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent` - never raw `Component` 8. Use `PlatformVmStore` for state management - never manual signals 9. Extend `PlatformApiService` for HTTP calls - never direct `HttpClient` 10. Always use `.pipe(this.untilDestroyed())` for subscriptions - never manual unsubscribe 11. All template elements MUST have BEM classes (`block__element --modifier`) 12. Use `effectSimple()` for API calls - auto-handles loading/error state

**WebV1 (Angular 12) Specifics (`src/Web/**`):\*\*

- Same rules apply; platform classes (`PlatformComponent`, etc.) from `@orient/bravo-common`
- Each app defines its own `AppBaseComponent` extending `PlatformComponent` (OOP/DRY principle)
- Use `@import '~assets/scss/variables'` for SCSS (not `@use 'shared-mixin'`)
- Extend app's `AppBaseComponent` with full DI signature:
    ```typescript
    constructor(
        changeDetector: ChangeDetectorRef,
        elementRef: ElementRef<HTMLElement>,
        cacheService: PlatformCachingService,
        toast: ToastrService,
        translateSrv: PlatformTranslateService
    ) { super(changeDetector, elementRef, cacheService, toast, translateSrv); }
    ```
- **Anti-pattern:** Never use manual `Subject` for destroy - use `this.untilDestroyed()`
- **API calls:** Use `effectSimple()` - auto-handles loading state, no manual `observerLoadingErrorState()` needed

**Architecture Rules:** 12. Search for existing implementations before creating new code 13. Place logic in LOWEST layer (Entity > Service > Component) to enable reuse 14. Plan before implementing non-trivial tasks 15. Follow Clean Architecture layers: Domain → Application → Infrastructure → Presentation

**Verification Protocol (Research-Backed - 85% Success Rate):** 16. NEVER claim completion without evidence - always re-read modified files, verify test output, check filesystem 17. ALWAYS verify filesystem before claiming file status (use file_search/grep_search, never assume) 18. ALWAYS re-read modified lines after edits to confirm changes applied 19. Run tests and check errors (get_errors tool) after modifications 20. Provide concrete evidence: file paths, line numbers, command output, test results

**Context Gathering Rules (Investigation-First - 67% Faster):** 21. ALWAYS search for existing patterns first (semantic_search, grep_search) before creating new code 22. READ at least 3 similar implementations to understand established patterns 23. Gather context in parallel batches when files are independent 24. Use Scout → Investigate workflow for unfamiliar features/bugs (triggers: complex refactor, cross-service changes, unfamiliar domain) 25. Never assume - verify with file reads (read_file with adequate line ranges)

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

**Forbidden Path Patterns:**

- `../` relative paths that escape workspace
- Absolute paths to other projects (e.g., `D:\OtherProject\`)
- System directories and program files
- User home directories outside workspace (e.g., `~/.bashrc`, `%USERPROFILE%`)

**If Asked to Modify External Files:**

```
STOP. I cannot modify files outside the workspace root.

The requested path [PATH] appears to be outside the current workspace.
Please confirm:
1. Is this file supposed to be within the project?
2. Should I create it inside the workspace instead?
```

## Workflow Configuration Reference

Full workflow patterns are defined in **`.claude/workflows.json`** - the single source of truth for both Claude and Copilot.

For detailed routing logic, see the **`workflow-router`** agent in `.github/agents/workflow-router.md`.

**NOTE:** Complete workflow detection instructions, decision tables, and enforcement rules are at the END of this file.

## Automatic Skill Activation (MANDATORY)

When working in specific areas, these skills MUST be automatically activated BEFORE any file creation or modification:

### Path-Based Skill Activation

| Path Pattern                  | Skill                  | Pre-Read Files           |
| ----------------------------- | ---------------------- | ------------------------ |
| `docs/business-features/**`   | `feature-docs`         | Template + Reference doc |
| `src/Services/**/*.cs`        | `easyplatform-backend` | CQRS patterns reference  |
| `src/WebV2/**/*.component.ts` | `frontend-angular`     | Component base class     |
| `src/WebV2/**/*.store.ts`     | `frontend-angular`     | Store patterns           |
| `src/Web/**/*.component.ts`   | `frontend-angular`     | WebV1 platform component |
| `src/Web/**/*.ts`             | `frontend-angular`     | WebV1 platform patterns  |
| `docs/design-system/**`       | `ui-ux-designer`       | Design tokens file       |

### Activation Protocol

Before creating or modifying files matching these patterns, you MUST:

1. **Activate the skill** - Reference the appropriate skill documentation
2. **Read reference files** - Template + existing example in same folder
3. **Follow skill workflow** - Apply all skill-specific rules

## Debugging Protocol

When debugging or analyzing code removal, follow [AI-DEBUGGING-PROTOCOL.md](.ai/docs/AI-DEBUGGING-PROTOCOL.md):

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

## Evidence-Based Reasoning & Investigation Protocol (CRITICAL)

Speculation is FORBIDDEN. Every claim about code behavior, every recommendation for changes, must be backed by evidence. Ref: [Evidence-Based Reasoning Protocol](.claude/skills/shared/evidence-based-reasoning-protocol.md) (mandatory) | [Anti-Hallucination Patterns](.claude/patterns/anti-hallucination-patterns.md) (optional deep-dive).

### Core Rules

1. **Evidence before conclusion** — Cite `file:line`, grep results, or framework docs. Never use "obviously...", "I think...", "this is because..." without proof.
2. **Confidence declaration required** — Every recommendation must state confidence level with evidence list.
3. **Inference alone is FORBIDDEN** — Always upgrade to code evidence (grep results, file reads). When unsure: _"I don't have enough evidence yet. Need to investigate [specific items]."_
4. **Cross-service validation** — Check ALL 5 services (bravoGROWTH, bravoTALENTS, bravoSURVEYS, Accounts, bravoINSIGHTS) before recommending architectural changes.

### Golden Rule: Evidence Before Conclusion

**NEVER recommend code changes (removal, refactoring, replacement) without completing this validation chain:**

```
1. Interface/API identified
   ↓
2. ALL implementations found (Search: "class.*:.*IInterfaceName")
   ↓
3. ALL registrations traced (Search: "AddScoped.*IInterfaceName")
   ↓
4. ALL usage sites verified (Search + Read actual usage)
   ↓
5. Cross-service impact: Check ALL 5 services
   ↓
6. Impact assessment: What breaks if removed?
   ↓
7. Confidence declaration: X% confident based on [evidence list]
   ↓
ONLY THEN → Output recommendation
```

### Evidence Requirements

| Evidence Type       | Required       | How to Get                           |
| ------------------- | -------------- | ------------------------------------ |
| Static references   | ✅             | Search "TargetName" in all .cs files |
| Usage trace         | ✅             | Read files, trace call chain         |
| Cross-service check | ✅             | Search ALL 5 services                |
| Confidence level    | ✅             | Calculate based on completeness      |
| Impact analysis     | ✅ (HIGH risk) | List what breaks                     |

### Confidence Levels

- **95-100%** — Full trace completed, all 5 services checked
- **80-94%** — Main usage paths verified, some edge cases unverified
- **60-79%** — Implementation found, usage partially traced
- **<60%** — Insufficient evidence → DO NOT RECOMMEND

**Format:** `Confidence: 85% — Verified main usage in Surveys service, did not check bravoTALENTS/bravoGROWTH`

### Cross-Service Validation (MANDATORY)

**Always check ALL 5 microservices:**

- bravoGROWTH
- bravoTALENTS
- bravoSURVEYS
- Accounts
- bravoINSIGHTS

```bash
for svc in bravoGROWTH bravoTALENTS bravoSURVEYS Accounts bravoINSIGHTS; do
    # Search for usage in each service
done
```

### Breaking Change Risk Matrix

| Risk Level | Criteria                                                      | Required Evidence                                   |
| ---------- | ------------------------------------------------------------- | --------------------------------------------------- |
| **HIGH**   | Removing registrations, deleting classes, changing interfaces | Full usage trace + impact analysis + all 5 services |
| **MEDIUM** | Refactoring methods, changing signatures                      | Usage trace + test verification + all 5 services    |
| **LOW**    | Renaming variables, formatting, comments                      | Code review only                                    |

### Comparison Pattern (Service vs Service)

When investigating service-specific implementations:

1. **Find working reference service** — Identify service where feature works correctly
2. **Compare implementations** — Side-by-side file comparison
3. **Identify differences** — List what's different
4. **Verify each difference** — Understand WHY each difference exists
5. **Recommend changes** — Based on proven working pattern, not assumptions

**Example:** Surveys Npgsql issue → Compare with Growth service → Found Growth uses both registrations → Recommendation: match Growth pattern

### Validation Checklist (for code removal/refactoring/replacement)

Before recommending changes, complete ALL items — skip none:

- [ ] Find ALL implementations — `grep "class.*:.*IInterfaceName"`
- [ ] Trace ALL registrations — `grep "AddScoped.*IName|AddSingleton.*IName"`
- [ ] Verify ALL usage sites — injection points, method calls, static references (`grep -r "ClassName"` = 0)
- [ ] Check string literals / dynamic invocations (reflection, factories, message bus)
- [ ] Check config references (appsettings.json, env vars) and test dependencies
- [ ] Cross-service check — ALL 5 microservices
- [ ] Assess impact — what breaks if removed?
- [ ] Declare confidence — X% with evidence list

**If ANY step incomplete → STOP. State "Insufficient evidence."**

### Investigation Patterns

**Service comparison:** Find working reference → compare implementations → identify/verify differences → recommend based on proven pattern.

**Use `/investigate` skill** for: removing registrations/classes, cross-service changes, "this seems unused" claims, breaking change assessment.

## Documentation Index

### Quick Start (`docs/claude/`)

| Document                                     | Purpose                                          | When to Use                  |
| -------------------------------------------- | ------------------------------------------------ | ---------------------------- |
| [README.md](docs/claude/README.md)           | **Start here** - Navigation hub & decision trees | First reference for any task |
| [quick-start.md](docs/claude/quick-start.md) | 5-minute onboarding guide                        | New to development           |

### Claude Code Reference (`docs/claude/`)

| Directory                                             | Contents                                                                                                                                               | When to Use                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [skills/](docs/claude/skills/README.md)               | 155+ skills across 15+ domains (includes all migrated commands)                                                                                        | Finding the right skill/command                                        |
| [hooks/](docs/claude/hooks/README.md)                 | Hooks catalog + [External Memory Swap](docs/claude/hooks/external-memory-swap.md) + [Code Review Rules](docs/claude/hooks/README.md#code-review-rules) | Hook internals, extending, post-compaction recovery, code review rules |
| [agents/](docs/claude/agents/README.md)               | 24+ subagents catalog & patterns                                                                                                                       | Agent selection, parallel execution                                    |
| [configuration/](docs/claude/configuration/README.md) | Settings, coding levels 0-5, MCP                                                                                                                       | Configuration changes                                                  |

### BravoSUITE Patterns (`docs/claude/`)

| Document                                                               | Purpose                                                 | When to Use                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------- |
| [architecture.md](docs/claude/architecture.md)                         | System architecture, file locations, service boundaries | Understanding project structure   |
| [backend-patterns-reference.md](docs/backend-patterns-reference.md)    | CQRS, Repository, Entity, Validation, Message Bus, Jobs | Backend development tasks         |
| [frontend-patterns-reference.md](docs/frontend-patterns-reference.md)  | Components, Forms, Stores, API Services, BEM templates  | Frontend development tasks        |
| [anti-patterns.md](docs/claude/anti-patterns.md)                       | Common mistakes and how to avoid them                   | Code review, debugging            |
| [advanced-patterns.md](docs/claude/advanced-patterns.md)               | Fluent helpers, expression composition, utilities       | Complex implementations           |
| [troubleshooting.md](docs/claude/troubleshooting.md)                   | Common issues and solutions                             | When stuck or encountering errors |
| [skill-naming-conventions.md](docs/claude/skill-naming-conventions.md) | Skill naming prefixes and conventions                   | Creating or reviewing skills      |
| [model-selection-guide.md](docs/claude/model-selection-guide.md)       | Agent model configuration (Opus/Sonnet)                 | Configuring agents or skills      |
| [hooks-reference.md](docs/claude/hooks-reference.md)                   | Hook lifecycle, execution order, state files            | Understanding or extending hooks  |
| [configuration-guide.md](docs/claude/configuration-guide.md)           | Configuration files and schema                          | Configuration changes             |

### Complete Guides (`docs/claude/`)

| Document                                                                                   | Purpose                                                     | Size  |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ----- |
| [backend-csharp-complete-guide.md](docs/claude/backend-csharp-complete-guide.md)           | Comprehensive C# reference: SOLID, clean code, all patterns | ~76KB |
| [frontend-typescript-complete-guide.md](docs/claude/frontend-typescript-complete-guide.md) | Complete Angular/TS guide with principles                   | ~57KB |
| [scss-styling-guide.md](docs/claude/scss-styling-guide.md)                                 | BEM methodology, design tokens, layout mixins               | ~30KB |

### Project & Operations (`docs/`)

| Document / Directory                                                                  | Purpose                                                   | When to Use                    |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------ |
| [getting-started.md](docs/getting-started.md)                                         | Dev environment setup                                     | Onboarding, first-time setup   |
| [deployment.md](docs/deployment.md)                                                   | Deployment procedures                                     | CI/CD, Docker, K8s tasks       |
| [monitoring.md](docs/monitoring.md)                                                   | Observability, alerting                                   | Production issues, SRE tasks   |
| [codebase-summary.md](docs/codebase-summary.md)                                       | High-level project overview                               | Understanding project scope    |
| [webv2-architecture.md](docs/webv2-architecture.md)                                   | Angular 19 frontend architecture                          | WebV2 structural decisions     |
| [bravocommon-guide.md](docs/bravocommon-guide.md)                                     | Shared UI component library                               | Using bravo-common components  |
| [code-review-rules.md](docs/code-review-rules.md)                                     | Code review standards                                     | PR reviews, quality audits     |
| [lessons.md](docs/lessons.md)                                                         | Learned lessons (auto-injected via hook)                  | Avoiding repeated mistakes     |
| [ai-agent-reference.md](docs/ai-agent-reference.md)                                   | AI agent guidelines for BravoSUITE                        | AI behavioral context          |
| [claude-setup-improvement-principles.md](docs/claude-setup-improvement-principles.md) | AI operational principles (Boris Framework)               | Improving AI setup quality     |
| [design-system/](docs/design-system/README.md)                                        | Design tokens, BEM, per-app style guides (5 files)        | UI/UX work, styling, theming   |
| [architecture-decisions/](docs/architecture-decisions/README.md)                      | ADRs (Architecture Decision Records)                      | Reviewing past design choices  |
| [templates/](docs/templates/)                                                         | Doc templates: ADR, changelog, feature docs, AI docs      | Creating new documentation     |
| [test-specs/](docs/test-specs/README.md)                                              | Test specs, integration tests, priority index per service | Test planning, coverage gaps   |
| [release-notes/](docs/release-notes/)                                                 | Release changelogs per feature                            | Release prep, changelog review |

### Business Feature Docs (`docs/business-features/`)

18 features across 5 apps + SupportingServices. Each app has: `INDEX.md` (nav), `README.md` (overview), `API-REFERENCE.md`, `TROUBLESHOOTING.md`, `detailed-features/*.md` (26-section docs per feature).

| App               | Features   | Key Docs                                                                           |
| ----------------- | ---------- | ---------------------------------------------------------------------------------- |
| **bravoTALENTS**  | 8 features | Recruitment, Candidates, Jobs, Interviews, Employees, Coaching, Matching, Settings |
| **bravoGROWTH**   | 6 features | Goals, Kudos, Check-ins, Performance Reviews, Timesheets, Form Templates           |
| **bravoSURVEYS**  | 2 features | Survey Design, Survey Distribution                                                 |
| **bravoINSIGHTS** | 1 feature  | Dashboard Management                                                               |
| **Accounts**      | 1 feature  | User Management                                                                    |

Start at [`DOCUMENTATION-GUIDE.md`](docs/business-features/DOCUMENTATION-GUIDE.md) for how to create/update feature docs.

### Doc Lookup Guide

| If user prompt mentions...                                         | → Read first                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------ |
| Recruitment, candidates, jobs, interviews, hiring, talent matching | `docs/business-features/bravoTALENTS/`                       |
| Goals, kudos, check-ins, performance reviews, timesheets           | `docs/business-features/bravoGROWTH/`                        |
| Surveys, questionnaires, distribution                              | `docs/business-features/bravoSURVEYS/`                       |
| Dashboards, reports, analytics, insights                           | `docs/business-features/bravoINSIGHTS/`                      |
| Users, auth, accounts, login, permissions                          | `docs/business-features/Accounts/`                           |
| UI design, styling, BEM, design tokens, themes                     | `docs/design-system/`, `docs/claude/scss-styling-guide.md`   |
| Deployment, Docker, K8s, CI/CD, infrastructure                     | `docs/deployment.md`, `docs/monitoring.md`                   |
| Architecture decisions, ADR, design rationale                      | `docs/architecture-decisions/`                               |
| Test specs, test coverage                                          | `docs/test-specs/`                                           |
| Integration tests, subcutaneous testing, test base class           | `src/Services/bravoGROWTH/Growth.IntegrationTests/README.md` |
| Shared components, bravo-common library                            | `docs/bravocommon-guide.md`                                  |
| Backend patterns, CQRS, entities, validation                       | `docs/backend-patterns-reference.md`                         |
| Frontend patterns, Angular, stores, forms                          | `docs/frontend-patterns-reference.md`                        |
| Hooks, skills, agents, Claude Code config                          | `docs/claude/` subdirectories                                |

**Additional Resources:** [README.md](README.md), [EasyPlatform.README.md](EasyPlatform.README.md)

## Shell Environment (Critical for Windows)

**Important:** When running commands on Windows, be aware of the shell environment. Always use Unix-compatible commands when possible.

### Command Equivalence Table

| Windows CMD (Avoid if possible) | Unix Equivalent (Prefer this) | Purpose                  |
| ------------------------------- | ----------------------------- | ------------------------ |
| `dir /b /s path`                | `find path -type f`           | Recursive file listing   |
| `dir /b path`                   | `ls path`                     | Basic listing            |
| `type file`                     | `cat file`                    | View file content        |
| `copy src dst`                  | `cp src dst`                  | Copy file                |
| `move src dst`                  | `mv src dst`                  | Move file                |
| `del file`                      | `rm file`                     | Delete file              |
| `mkdir path`                    | `mkdir -p path`               | Create directory         |
| `rmdir /s path`                 | `rm -rf path`                 | Delete directory         |
| `where cmd`                     | `which cmd`                   | Find command location    |
| `set VAR=value`                 | `export VAR=value`            | Set environment variable |

### Path Handling

- Use forward slashes: `D:/GitSources/BravoSuite` (works in both shells)
- Or escaped backslashes in strings: `D:\\GitSources\\BravoSuite`
- Avoid unescaped backslashes: `D:\path` may be interpreted as escape sequences

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

- Always plan before implementing non-trivial changes
- Always verify code exists before assuming removal is safe
- Declare confidence level when uncertain
- Use manage_todo_list to track complex tasks

## Architecture Overview

```
src/Platform/           # Easy.Platform framework components
src/Services/           # Microservices (bravoTALENTS, bravoGROWTH, bravoSURVEYS, bravoINSIGHTS)
src/WebV2/              # Angular 19 micro frontends (growth-for-company, employee)
src/Web/                # Angular 12 applications (bravoTALENTSClient, CandidateAppClient)
docs/design-system/     # Frontend design system documentation
```

## Key File Locations

```
src/Services/                    # Microservices (bravoTALENTS, bravoGROWTH, etc.)
src/Platform/Easy.Platform/      # Framework core
src/WebV2/libs/platform-core/    # Frontend framework
src/WebV2/libs/bravo-common/     # Shared UI components
src/WebV2/libs/bravo-domain/     # Business domain (APIs, models)
src/PlatformExampleApp/          # Working examples (study this!)
docs/design-system/              # Frontend design tokens & components
.claude/hooks/                   # Claude Code hooks
.claude/hooks/lib/swap-engine.cjs # External Memory Swap engine
.claude/hooks/tests/             # Test suite for Claude hooks (257 tests)
docs/code-review-rules.md        # BravoSUITE code review rules (auto-injected)
docs/lessons.md                  # Learned lessons (injected via hook, written via /learn skill)
/tmp/ck/swap/{sessionId}/        # Runtime swap files (post-compaction recovery)
.ai/docs/                        # AI reference docs (prompt-context, common-prompt)
.ai/workspace/                   # AI ephemeral workspace (gitignored)
scripts/k8s/                     # K8s helpers: AKS cluster connect & port-forward (Mongo, RabbitMQ, ES)
```

## Essential Documentation

| Document                            | Purpose                           |
| ----------------------------------- | --------------------------------- |
| `README.md`                         | Platform overview & quick start   |
| `EasyPlatform.README.md`            | Framework deep dive & patterns    |
| `CLEAN-CODE-RULES.md`               | Coding standards & anti-patterns  |
| `.ai/docs/AI-DEBUGGING-PROTOCOL.md` | Debugging protocol for AI agents  |
| `docs/business-features/`           | 18 feature docs (26-section each) |

### Business Feature Documentation (MANDATORY - 26 Sections)

All business features have comprehensive 26-section documentation in `docs/business-features/{Module}/detailed-features/`:

- **bravoGROWTH**: GoalManagement, Kudos, FormTemplates, Timesheet, CheckIn, PerformanceReview
- **bravoTALENTS**: EmployeeSettings, EmployeeManagement, JobBoardIntegration, RecruitmentPipeline, CandidateManagement, InterviewManagement, TalentMatching, Coaching
- **bravoSURVEYS**: SurveyDesign, SurveyDistribution
- **bravoINSIGHTS**: DashboardManagement
- **Accounts**: UserManagement

#### When Creating/Updating Feature Documentation (CRITICAL)

**Pre-Requisites (MUST do before writing):**

1. Activate `feature-docs` skill
2. Read template: `docs/templates/detailed-feature-docs-template.md`
3. Read reference: `docs/business-features/bravoTALENTS/detailed-features/README.RecruitmentPipelineFeature.md`

**Required Structure - ALL 26 Sections (in order):**

1. Executive Summary, 2. Business Value, 3. Business Requirements, 4. Business Rules,
2. Process Flows, 6. Design Reference, 7. System Design, 8. Architecture,
3. Domain Model, 10. API Reference, 11. Frontend Components, 12. Backend Controllers,
4. Cross-Service Integration, 14. Security Architecture, 15. Performance Considerations,
5. Implementation Guide, 17. Test Specifications, 18. Test Data Requirements,
6. Test Data Samples, 20. Edge Cases Catalog, 21. Regression Impact,
7. Troubleshooting, 23. Operational Runbook, 24. Roadmap and Dependencies,
8. Related Documentation, 26. Version History

**Validation Checklist (before delivering):**

- [ ] All 26 sections present
- [ ] Quick Navigation table with Audience column (PO, BA, Dev, QA)
- [ ] Test cases in TC-{MOD}-XXX format
- [ ] GIVEN/WHEN/THEN format for all test cases
- [ ] Evidence field with `file:line` format
- [ ] Cross-reference to parent feature (if sub-feature)

## How This Documentation Works

**Documentation Architecture:**

- **This file (`copilot-instructions.md`)**: Quick reference, core principles, decision trees
- **`.github/instructions/`**: Deep dive patterns (auto-loaded based on file paths via `applyTo`)
- **`.github/prompts/`**: Task-specific prompts (plan, fix, scout, brainstorm, investigate)
- **`.github/agents/`**: 18 specialized agent roles (individual `.md` files)
- **`docs/claude/`**: Domain-specific pattern deep dives (Memory Bank)
- **Design system docs**: `docs/design-system/`, platform-specific UI patterns
- **Framework docs**: `EasyPlatform.README.md`, platform component deep dive

## Memory Bank (Persistent Context)

**Use @workspace to reference these key files for deep domain knowledge:**

| Context Needed                                | Reference via @workspace                         |
| --------------------------------------------- | ------------------------------------------------ |
| Backend patterns (CQRS, Repository, Events)   | `@workspace docs/backend-patterns-reference.md`  |
| Frontend patterns (Components, Forms, Stores) | `@workspace docs/frontend-patterns-reference.md` |
| Architecture & Service boundaries             | `@workspace docs/claude/architecture.md`         |
| Advanced fluent helpers & utilities           | `@workspace docs/claude/advanced-patterns.md`    |
| What NOT to do                                | `@workspace docs/claude/anti-patterns.md`        |
| Debugging & troubleshooting                   | `@workspace docs/claude/troubleshooting.md`      |
| Agent roles & when to use them                | `@workspace .github/agents/`                     |
| Framework deep dive                           | `@workspace EasyPlatform.README.md`              |

**When to load Memory Bank context:**

- Starting complex multi-file tasks → Load architecture.md
- Backend development → Load backend-patterns-reference.md
- Frontend development → Load frontend-patterns-reference.md
- Code review → Load anti-patterns.md
- Debugging → Load troubleshooting.md
- Planning which agent to use → Load `.github/agents/`

**How AI Agents Use This:**

When you ask me to code/debug/analyze, I automatically:

1. **Always load** this file for core principles and decision trees
2. **Auto-load** relevant instruction files from `.github/instructions/` based on file paths being modified
3. **Invoke skills** from `.claude/skills/` for complex tasks (debugging, feature planning, testing)
4. **Read design docs** when working on UI components
5. **Search codebase** for existing patterns before implementing

Example: When you ask me to "add a CQRS command to save employee data", I:

- Read this file → See "Use CQRS pattern, microservice-specific repository"
- Auto-load `backend-dotnet.instructions.md` (applies to `*.cs` files)
- Auto-load `cqrs-patterns.instructions.md` (applies to `*Command*.cs`)
- Search for existing `SaveEmployee*Command.cs` patterns
- Implement following discovered patterns

**You don't need to tell me which files to read - the system loads them automatically based on context.**

## Todo Templates for Common Tasks

> **Todo creation rules, granularity guidelines, and state management are in the "Task Planning Notes (MANDATORY)" section at the END of this file.**

**Feature Implementation**:

```markdown
- [ ] Scout - Find similar implementations (semantic_search)
- [ ] Investigate - Read related files in parallel
- [ ] Plan - Design approach with file-level changes
- [ ] Implement Entity - Domain layer changes
- [ ] Implement Command - Application layer CQRS
- [ ] Implement DTO - Mapping logic
- [ ] Implement Event Handler - Side effects
- [ ] Implement API - Controller endpoint
- [ ] Implement Frontend - Component + service
- [ ] Write Tests - Unit + integration
- [ ] Run Tests - Verify all pass
- [ ] Code Review - Check against patterns
- [ ] Update Docs - README or feature docs
```

**Bug Fix**:

```markdown
- [ ] Scout - Find files related to bug
- [ ] Investigate - Build knowledge graph
- [ ] Debug - Root cause analysis with evidence
- [ ] Plan - Design fix approach
- [ ] Implement Fix - Apply changes
- [ ] Verify Fix - Reproduce bug scenario
- [ ] Run Tests - Ensure no regressions
- [ ] Code Review - Check for side effects
```

**Refactoring**:

```markdown
- [ ] Scout - Find all usages of code to refactor
- [ ] Plan - Design new structure
- [ ] Identify Breaking Changes - List affected code
- [ ] Refactor Core - Make structural changes
- [ ] Update Usages - Fix all references
- [ ] Run Tests - Verify behavior unchanged
- [ ] Performance Check - Compare before/after
```

## External Memory Management (CRITICAL for Long Tasks)

For long-running tasks (investigation, planning, implementation, debugging), you MUST save progress to external files to prevent context loss during session compaction.

### When to Create Checkpoints

| Trigger                    | Action                                      |
| -------------------------- | ------------------------------------------- |
| Starting complex task      | Create initial checkpoint with task context |
| Every 30-60 minutes        | Update checkpoint with progress             |
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
| path/file.cs:line | description | ✅/🔄/⏳ |

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

### Auto-Checkpoint System

The system automatically saves minimal checkpoints before context compaction via the `PreCompact` hook. For better preservation, create manual checkpoints using these patterns.

### Related Files

- `.claude/skills/checkpoint/SKILL.md` - Manual checkpoint command
- `.claude/skills/memory-management/SKILL.md` - Full memory management skill

## Detailed Pattern Instructions

See `.github/instructions/` for path-specific detailed patterns:

| Topic                 | Instruction File                        | Applies To             |
| --------------------- | --------------------------------------- | ---------------------- |
| .NET Backend          | `backend-dotnet.instructions.md`        | `src/Services/**/*.cs` |
| Angular Frontend      | `frontend-angular.instructions.md`      | `src/WebV2/**/*.ts`    |
| CQRS Patterns         | `cqrs-patterns.instructions.md`         | Commands/Queries       |
| Validation            | `validation.instructions.md`            | All validation logic   |
| Entity Development    | `entity-development.instructions.md`    | Domain entities        |
| Entity Events         | `entity-events.instructions.md`         | Side effects           |
| Repository            | `repository.instructions.md`            | Data access            |
| Message Bus           | `message-bus.instructions.md`           | Cross-service sync     |
| Background Jobs       | `background-jobs.instructions.md`       | Scheduled tasks        |
| Migrations            | `migrations.instructions.md`            | Data/schema migrations |
| Performance           | `performance.instructions.md`           | Optimization           |
| Security              | `security.instructions.md`              | Auth, permissions      |
| Testing               | `testing.instructions.md`               | Test patterns          |
| Clean Code            | `clean-code.instructions.md`            | All code               |
| Bug Investigation     | `bug-investigation.instructions.md`     | Debugging              |
| Feature Investigation | `feature-investigation.instructions.md` | Code exploration       |
| SCSS Styling          | `scss-styling.instructions.md`          | `**/*.scss,**/*.css`   |
| Code Review           | `code-review.instructions.md`           | All code reviews       |

## Frontend Design System

**Read design system docs before UI work:**

| Application        | Location                                         |
| ------------------ | ------------------------------------------------ |
| WebV2 Apps         | `docs/design-system/`                            |
| bravoTALENTSClient | `src/Web/bravoTALENTSClient/docs/design-system/` |
| CandidateAppClient | `src/Web/CandidateAppClient/docs/design-system/` |

## Quick Decision Trees

**Backend Task:**

- New API endpoint → `PlatformBaseController` + CQRS Command
- Business logic → Command Handler in Application layer
- Data access → Microservice-specific repository + extensions
- Cross-service sync → Entity Event Consumer
- Scheduled task → `PlatformApplicationBackgroundJob`
- Migration → `PlatformDataMigrationExecutor` or EF Core

**Frontend Task (WebV2):**

- Simple display → `AppBaseComponent`
- Complex state → `AppBaseVmStoreComponent` + `PlatformVmStore`
- Forms → `AppBaseFormComponent` with validation
- API calls → Service extending `PlatformApiService` + `effectSimple()`

**Frontend Task (WebV1 - `src/Web/*`):**

- Platform lib → `PlatformComponent` from `@orient/bravo-common`
- App base (per app) → `AppBaseComponent` extends `PlatformComponent`
- All components → Extend app's `AppBaseComponent` (not raw Component)
- Complex state → `AppBaseVmStoreComponent` + `PlatformVmStore`
- Forms → `AppBaseFormComponent` with validation
- API calls → `effectSimple()` (auto-handles loading state)
- Subscriptions → ALWAYS use `.pipe(this.untilDestroyed())`
- SCSS imports → `@import '~assets/scss/variables'`

**Repository Selection:**

- FIRST: Find `I{ServiceName}PlatformRootRepository<TEntity>`
- Complex queries: Create `RepositoryExtensions` with static expressions
- Fallback: `IPlatformQueryableRootRepository<TEntity, TKey>`

## Critical Anti-Patterns

**Backend:**

- Direct cross-service database access (use message bus)
- Custom repository interfaces (use platform repositories + extensions)
- Manual validation (use `PlatformValidationResult`)
- Side effects in command handlers (use entity event handlers)
- DTO mapping in handlers (use `PlatformDto.MapToObject()`)

**Frontend:**

- Direct `HttpClient` usage (use `PlatformApiService`)
- Manual state management (use `PlatformVmStore`)
- Assuming method names without verification (check base class APIs)
- Skipping `untilDestroyed()` for subscriptions

## Code Responsibility Hierarchy (CRITICAL)

**Place logic in the LOWEST appropriate layer to enable reuse and prevent duplication:**

```
Entity/Model (Lowest)  →  Service  →  Component (Highest)
```

| Layer            | Responsibility                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| **Entity/Model** | Business logic, display helpers, static factory methods, default values, dropdown options, validation rules |
| **Service**      | API calls, command factories, data transformation                                                           |
| **Component**    | UI event handling ONLY - delegates all logic to lower layers                                                |

**Anti-Pattern**: Logic in component that should be in model → leads to duplicated code across components.

```typescript
// ❌ WRONG: Logic in component
readonly providerTypes = [{ value: 1, label: 'ITViec' }, ...]; // Duplicated if another component needs it

// ✅ CORRECT: Logic in entity/model
readonly providerTypes = JobBoardProviderConfiguration.getApiProviderTypeOptions(); // Single source of truth
```

### Naming Conventions

| Type        | Convention       | Example                                                 |
| ----------- | ---------------- | ------------------------------------------------------- |
| Classes     | PascalCase       | `UserService`, `EmployeeDto`                            |
| Methods     | PascalCase (C#)  | `GetEmployeeAsync()`                                    |
| Methods     | camelCase (TS)   | `getEmployee()`                                         |
| Variables   | camelCase        | `userName`, `employeeList`                              |
| Constants   | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`                                       |
| Booleans    | Prefix with verb | `isActive`, `hasPermission`, `canEdit`, `shouldProcess` |
| Collections | Plural           | `users`, `items`, `employees`                           |

**90% Logic Rule:** If logic belongs 90% to class A, put it in class A.

## Universal Clean Code Rules

- Single Responsibility: One method/class does one thing
- Consistent abstraction level in methods
- Reuse code, don't duplicate patterns
- Meaningful names that explain intent
- Group parallel operations (no dependencies) together
- Follow Input → Process → Output pattern
- Use early validation and guard clauses
- 90% Logic Rule: Place logic where 90% of it belongs

## Development Commands

```bash
# Backend
dotnet build BravoSUITE.sln
dotnet run --project [ServiceName].Service

# Frontend (WebV2)
npm run dev-start:growth          # Port 4206
npm run dev-start:employee        # Port 4205
nx build growth-for-company
nx test bravo-domain

# Claude Hooks Tests (257 tests total)
node .claude/hooks/tests/test-all-hooks.cjs          # 247 hook tests
node .claude/hooks/tests/test-lib-modules.cjs        # 10 core lib tests
node .claude/hooks/tests/test-lib-modules-extended.cjs  # 0 extended lib tests (stub)
# Adding new tests: Check .claude/hooks/tests/ for existing patterns before creating new test files

# Infrastructure
.\Bravo-DevStarts\"COMMON Infrastructure Dev-start.cmd"
.\Bravo-DevStarts\"COMMON Accounts Api Dev-start.cmd"
```

## Integration Testing

Subcutaneous CQRS tests through real DI (no HTTP), against live infrastructure. POC: `src/Services/bravoGROWTH/Growth.IntegrationTests/` (40+ tests). Platform base: `src/Platform/Easy.Platform.AutomationTest/IntegrationTests/`. Full guide: `src/Services/bravoGROWTH/Growth.IntegrationTests/README.md`.

**New service setup:** Create fixture extending `PlatformServiceIntegrationTestFixture<T>`, base class extending `PlatformServiceIntegrationTestWithAssertions<T>` with `ResolveRepository<TEntity>` override, test classes with `[Collection]` attribute. Copy Growth's `appsettings.json` as template.

**Key APIs:** `ExecuteCommandAsync`, `ExecuteQueryAsync`, `AssertEntityExistsAsync<T>`, `AssertEntityMatchesAsync<T>`, `AssertEntityDeletedAsync<T>`, `IntegrationTestHelper.UniqueName()`, `TestUserContextFactory.Create*()`

## Local System Startup

Start order: **Infrastructure → Backend APIs → Frontend**. Full setup: [`docs/getting-started.md`](docs/getting-started.md). Scripts: `Bravo-DevStarts/StartDocker/`.

### Infrastructure Ports

| Service       | Port                               | Credentials         |
| ------------- | ---------------------------------- | ------------------- |
| MongoDB       | 127.0.0.1:27017                    | root / rootPassXXX  |
| Elasticsearch | 127.0.0.1:9200                     | (no auth)           |
| RabbitMQ      | 127.0.0.1:5672 (AMQP), :15672 (UI) | guest / guest       |
| Redis         | 127.0.0.1:6379                     | —                   |
| PostgreSQL    | 127.0.0.1:54320                    | postgres / postgres |
| SQL Server    | 127.0.0.1:14330 (optional)         | sa / 123456Abc      |

### API Service Ports

| API Service                  | Port         | Dockerfile                                                |
| ---------------------------- | ------------ | --------------------------------------------------------- |
| account-api                  | 5000 (HTTPS) | Services/Accounts/Dockerfile                              |
| growth-api                   | 5100         | Services/bravoGROWTH/Growth.Service/Dockerfile            |
| talents-candidate-api        | 5202         | Services/bravoTALENTS/Candidate.Service/Dockerfile        |
| talents-email-api            | 5204         | Services/bravoTALENTS/Email.Service/Dockerfile            |
| talents-job-api              | 5207         | Services/bravoTALENTS/Job.Service/Dockerfile              |
| talents-talent-api           | 5209         | Services/bravoTALENTS/Talent.Service/Dockerfile           |
| talents-employee-api         | 5210         | Services/bravoTALENTS/Employee.Service/Dockerfile         |
| talents-setting-api          | 5213         | Services/bravoTALENTS/Setting.Service/Dockerfile          |
| candidate-app-api            | 5214         | Services/CandidateApp/CandidateApp.Api/Dockerfile         |
| surveys-survey-api           | 5400         | Services/bravoSURVEYS/LearningPlatform/Dockerfile         |
| surveys-survey-execution-mvc | 5401 (HTTPS) | Services/bravoSURVEYS/LearningPlatform.Surveys/Dockerfile |
| insights-api                 | 5500         | Services/bravoINSIGHTS/Analyze/Analyze.Service/Dockerfile |

### Quick Start

| Goal                     | Command                                               |
| ------------------------ | ----------------------------------------------------- |
| **Full system (Docker)** | `START-ALL.cmd`                                       |
| **Docker + npm**         | `BRAVO-APIS-DOCKER-Start.cmd` + `npm run dev-start:*` |
| **IDE debug**            | `COMMON Infrastructure Dev-start.cmd` + `dotnet run`  |
| **Reset all data**       | `BRAVO-APIS-DOCKER-Start-RESETDATA.cmd`               |
| **Reset infra only**     | `COMMON Infrastructure Dev-start-RESET-DATA.cmd`      |

**Notes:** All Docker ports bind `127.0.0.1` (not `0.0.0.0`). API env: `Development.ForDocker` in Docker, `Development` via IDE.

## Getting Help

1. Study Platform Example: `src/PlatformExampleApp`
2. Search existing implementations in codebase
3. Check instruction files in `.github/instructions/`
4. Review design system documentation

---

# Code Pattern Reference

> **📚 Detailed code patterns are in separate files to optimize context loading.**
>
> These files are **auto-loaded** when you edit matching file types via `applyTo` in `.github/instructions/`:
>
> | When Editing                 | Auto-Loaded Patterns                                 |
> | ---------------------------- | ---------------------------------------------------- |
> | `src/Services/**/*.cs`       | `.ai/docs/backend-code-patterns.md`                  |
> | `src/WebV2/**/*.ts`          | `.ai/docs/frontend-code-patterns.md`                 |
> | `**/UseCaseCommands/**/*.cs` | `.github/instructions/cqrs-patterns.instructions.md` |
> | `**/*.scss`                  | `.github/instructions/scss-styling.instructions.md`  |
>
> **Manual reference when needed:**
>
> - Backend (C#): `.ai/docs/backend-code-patterns.md` (~550 lines)
> - Frontend (TS): `.ai/docs/frontend-code-patterns.md` (~330 lines)
> - Compact reference: `.ai/docs/compact-pattern-reference.md`

## Quick Pattern Reminders (No Code Examples)

**Backend Essentials:**

- Entity: `RootEntity<T, TKey>` or `RootAuditedEntity<T, TKey, TAuditKey>`
- Repository: Use service-specific (`IGrowthRootRepository`, `ICandidatePlatformRootRepository`)
- Validation: Fluent `PlatformValidationResult` with `.And()`, `.AndAsync()`
- CQRS: Command + Result + Handler in ONE file under `UseCaseCommands/{Feature}/`
- Events: Side effects in `UseCaseEvents/` handlers, not command handlers
- DTO: Mapping via `PlatformEntityDto.MapToEntity()` or `PlatformDto.MapToObject()`

**Frontend Essentials:**

- Components: Extend `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent`
- State: Use `PlatformVmStore` with `effectSimple()` for API calls
- Subscriptions: Always `.pipe(this.untilDestroyed())`
- Templates: All elements MUST have BEM classes (`block__element --modifier`)

**Anti-Patterns (Brief):**

- ❌ Direct cross-service DB access → ✅ Message bus
- ❌ `throw ValidationException` → ✅ `PlatformValidationResult` fluent API
- ❌ Side effects in command handlers → ✅ Entity event handlers
- ❌ Direct `HttpClient` → ✅ `PlatformApiService`
- ❌ Manual signals for state → ✅ `PlatformVmStore`

---

## Collaborative Workflows (PO, BA, QC, QA, Designers)

Collaborative workflows enable cross-role handoffs from **idea to release**. Each role has designated commands and artifacts to ensure smooth transitions through the feature lifecycle.

### Role Quick Reference

| Role                 | Primary Commands                                       | Key Artifacts                             |
| -------------------- | ------------------------------------------------------ | ----------------------------------------- |
| **Product Owner**    | `/team-idea`, `/team-acceptance`, `/team-quality-gate` | Ideas, PBIs, Acceptance Sign-offs         |
| **Business Analyst** | `/team-refine`, `/team-story`, `/team-review-artifact` | PBIs, User Stories, Acceptance Criteria   |
| **UX Designer**      | `/team-design-spec`, `/team-handoff`                   | Design Specs, Wireframes, Component Specs |
| **QA Engineer**      | `/team-test-spec`, `/team-review-artifact`             | Test Specs, Bug Reports                   |
| **QC Specialist**    | `/team-quality-gate`, `/team-acceptance`               | Quality Gates, Compliance Audits          |
| **All Roles**        | `/team-retro`, `/team-status`, `/team-team-sync`       | Retrospectives, Status Reports, Agendas   |

### Feature Lifecycle Flow

```
PO: /team-idea
    ↓
BA: /team-refine → /team-story
    ↓ (→ /team-review-artifact)
Designer: /team-design-spec → /team-handoff [Designer→Dev]
    ↓
Dev: /plan → /plan-review → /plan-validate → /cook → /review-changes → /test
    ↓ (→ /team-handoff [Dev→QA])
QA: /team-test-spec
    ↓
QC: /team-quality-gate
    ↓
PO: /team-acceptance → Release
    ↓
All: /team-retro
```

### Collaborative Commands

| Command                 | Purpose                                           | Used By   |
| ----------------------- | ------------------------------------------------- | --------- |
| `/team-handoff`         | Create role-to-role handoff record with checklist | Any role  |
| `/team-review-artifact` | Review artifact before handoff (INVEST, SMART)    | Any role  |
| `/team-acceptance`      | PO acceptance decision with sign-off              | PO, QC    |
| `/team-retro`           | Sprint retrospective with action items            | All roles |

---

# Automatic Workflow Detection (CRITICAL - MUST FOLLOW)

> **This section is placed at the END intentionally — AI systems give highest attention to content at the start and end of documents (primacy and recency effects). This is the most important instruction in this file.**

**MANDATORY:** You MUST check every prompt against the workflow table below before responding.
If a workflow matches and the task is non-trivial, auto-activate it immediately.
If AI judges the task is simple, AI MUST ask the user whether to skip the workflow.

## Quick Keyword → Workflow Lookup

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
| business feature doc, feature documentation                            | `feature-docs`           |
| pre-dev, ready to start, prerequisites, start dev                      | `pre-development`        |
| test spec, test cases from PBI, acceptance criteria                    | `pbi-to-tests`           |
| design spec, mockup, wireframe, UI spec                                | `design-workflow`        |
| status report, sprint update, progress, weekly                         | `pm-reporting`           |
| handoff to BA, refine idea, BA take over                               | `po-ba-handoff`          |
| handoff to dev, ready for dev, start development                       | `ba-dev-handoff`         |
| handoff to QA, ready for testing, QA handoff                           | `dev-qa-handoff`         |
| acceptance, sign-off, PO approval, UAT                                 | `qa-po-acceptance`       |
| design handoff, implement design, dev from design                      | `design-dev-handoff`     |
| retro, retrospective, sprint end, lessons learned                      | `sprint-retro`           |
| full lifecycle, idea to release, complete feature, end-to-end          | `full-feature-lifecycle` |
| why review, design rationale, validate plan, check alternatives        | invoke `/why-review`     |
| sre review, production readiness, operational readiness, observability | invoke `/sre-review`     |

## Complete Workflow Catalog

### Development Workflows

| ID                | Workflow                      | When to Use                                                                                        | When NOT to Use                                                                                        | Sequence                                                                                                                                                                                                                          | Confirm? |
| ----------------- | ----------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `feature`         | **Feature Implementation**    | Implement new functionality, add feature, create component, build capability, develop module       | Bug fixes, documentation, test-only, feature requests/ideas without implementation, PBI/story creation | `/scout` → `/investigate` → `/plan` → `/plan-review` → `/plan-validate` → `/why-review` → `/cook` → `/code-simplifier` → `/review-changes` → `/code-review` → `/sre-review` → `/changelog` → `/test` → `/docs-update` → `/watzup` | No       |
| `bugfix`          | **Bug Fix**                   | Bug, error, crash, failure, regression, something not working; fix/debug/troubleshoot              | New features, code improvement/refactoring, investigation-only, documentation updates                  | `/scout` → `/investigate` → `/debug` → `/plan` → `/plan-review` → `/plan-validate` → `/why-review` → `/fix` → `/code-simplifier` → `/review-changes` → `/code-review` → `/changelog` → `/test` → `/docs-update` → `/watzup`       | No       |
| `refactor`        | **Code Refactoring**          | Restructure, reorganize, clean up, improve existing code without changing behavior; technical debt | Bug fixes, new feature development                                                                     | `/scout` → `/investigate` → `/plan` → `/plan-review` → `/plan-validate` → `/why-review` → `/code` → `/code-simplifier` → `/review-changes` → `/code-review` → `/sre-review` → `/changelog` → `/test` → `/docs-update` → `/watzup` | No       |
| `verification`    | **Verification & Validation** | Verify, validate, confirm, ensure something is correct/working; sanity check, double-check         | Bug reports (known broken), investigation-only, feature implementation, code reviews                   | `/scout` → `/investigate` → `/test-initial` → `/plan` → `/plan-review` → `/plan-validate` → `/fix` → `/code-simplifier` → `/review-changes` → `/code-review` → `/test` → `/watzup`                                                | No       |
| `batch-operation` | **Batch Operation**           | Modify multiple files at once: bulk rename, find-and-replace across codebase, update all instances | Test-only operations, documentation                                                                    | `/plan` → `/plan-review` → `/plan-validate` → `/why-review` → `/code` → `/code-simplifier` → `/review-changes` → `/sre-review` → `/test` → `/docs-update` → `/watzup`                                                             | No       |

### Investigation & Review Workflows

| ID               | Workflow               | When to Use                                                                                                   | When NOT to Use                                                                      | Sequence                                                                                                         | Confirm? |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------- |
| `investigation`  | **Code Investigation** | Understand how code works, find where logic lives, explore architecture, trace code paths, get explanations   | Any action that modifies code (implement, fix, create, refactor, test, review, doc)  | `/scout` → `/investigate`                                                                                        | No       |
| `review`         | **Code Review**        | Code review, PR review, codebase quality audit, code quality check                                            | Reviewing uncommitted changes (use review-changes), reviewing plans/designs/specs    | `/code-review` → `/watzup`                                                                                       | No       |
| `review-changes` | **Review Changes**     | Review current uncommitted, staged, or unstaged changes before committing                                     | PR reviews, codebase reviews, branch comparisons                                     | `/review-changes` → `/watzup`                                                                                    | No       |
| `quality-audit`  | **Quality Audit**      | Audit code quality, review skills/commands/hooks for best practices, find flaws, suggest enhancements         | Bug fixes, feature implementation, investigation-only, reviewing uncommitted changes | `/code-review` → `/plan` → `/plan-review` → `/plan-validate` → `/code` → `/review-changes` → `/test` → `/watzup` | No       |
| `security-audit` | **Security Audit**     | Security audit, vulnerability assessment, OWASP check, security review, penetration test, security compliance | Implementing new security features, fixing known security bugs (use bugfix)          | `/scout` → `/investigate` → `/watzup`                                                                            | No       |

### Documentation Workflows

| ID              | Workflow                  | When to Use                                                                | When NOT to Use                                            | Sequence                                                                                                                                       | Confirm? |
| --------------- | ------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `documentation` | **Documentation Update**  | Create, update, improve documentation, READMEs, or code comments           | Feature implementation, bug fixes, test writing            | `/scout` → `/investigate` → `/plan` → `/plan-review` → `/plan-validate` → `/docs-update` → `/review-changes` → `/review-post-task` → `/watzup` | No       |
| `feature-docs`  | **Business Feature Docs** | Create or update business feature documentation in docs/business-features/ | Bug fixes, feature implementation, test writing, debugging | `/scout` → `/investigate` → `/plan` → `/plan-review` → `/plan-validate` → `/docs-update` → `/review-changes` → `/review-post-task` → `/watzup` | No       |

### Testing Workflows

| ID             | Workflow         | When to Use                                                                     | When NOT to Use                                   | Sequence                       | Confirm? |
| -------------- | ---------------- | ------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------ | -------- |
| `testing`      | **Testing**      | Write tests, run test suites, check test coverage, execute tests                | Test specification creation, test case generation | `/test`                        | No       |
| `pbi-to-tests` | **PBI to Tests** | Generate test specs or test cases from PBI, feature, story, acceptance criteria | Running existing tests, checking test results     | `/test-spec` → `/quality-gate` | No       |

### Infrastructure Workflows

| ID           | Workflow                        | When to Use                                                                                     | When NOT to Use                                                        | Sequence                                                                                                                                                                      | Confirm? |
| ------------ | ------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `deployment` | **Deployment & Infrastructure** | Set up or modify deployment, infrastructure, CI/CD pipelines, Docker, Kubernetes                | Explaining deployment concepts, checking status/history, investigation | `/scout` → `/investigate` → `/plan` → `/plan-review` → `/plan-validate` → `/code` → `/review-changes` → `/code-review` → `/sre-review` → `/test` → `/watzup`                  | No       |
| `migration`  | **Database Migration**          | Create or run database migrations: schema changes, data migrations, EF migrations, alter tables | Explaining migration concepts, checking history/status, investigation  | `/scout` → `/investigate` → `/plan` → `/plan-review` → `/plan-validate` → `/code` → `/review-changes` → `/code-review` → `/sre-review` → `/test` → `/docs-update` → `/watzup` | No       |

### Team & Planning Workflows

| ID                | Workflow                  | When to Use                                                                           | When NOT to Use                                         | Sequence                                                           | Confirm? |
| ----------------- | ------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| `idea-to-pbi`     | **Idea to PBI**           | New idea, feature request, add to backlog; refine idea into PBI with stories          | Bug fixes, direct implementation (use feature workflow) | `/team-idea` → `/team-refine` → `/team-story` → `/team-prioritize` | No       |
| `sprint-planning` | **Sprint Planning**       | Plan sprint, backlog grooming/refinement, kick off new sprint                         | Sprint reviews, sprint status reports, retrospectives   | `/team-prioritize` → `/team-dependency` → `/team-team-sync`        | No       |
| `pre-development` | **Pre-Development Check** | Verify readiness before starting development: check prerequisites, quality gate       | QA checks, release prep, production readiness           | `/team-quality-gate` → `/plan` → `/plan-review` → `/plan-validate` | No       |
| `release-prep`    | **Release Preparation**   | Verify release readiness, run pre-release quality gate, check if ready to deploy/ship | Rollbacks, hotfixes, release notes, release branch ops  | `/sre-review` → `/team-quality-gate` → `/team-status`              | No       |
| `design-workflow` | **Design Workflow**       | Create UI/UX design spec, mockup, wireframe, component specification                  | Implementing an existing design in code                 | `/team-design-spec` → `/code-review`                               | No       |
| `pm-reporting`    | **PM Reporting**          | Status report, sprint update, project progress report, weekly summary                 | Git status, build status, PR status, commit status      | `/team-status` → `/team-dependency`                                | No       |

### Collaborative Handoff Workflows

| ID                       | Workflow                   | When to Use                                                            | When NOT to Use                                             | Sequence                                                                                                                                                                                                                                                                                           | Confirm? |
| ------------------------ | -------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `po-ba-handoff`          | **PO → BA Handoff**        | PO hands off idea/PBI to BA for refinement and story creation          | Direct development, design-first workflows, already refined | `/team-idea` → `/team-review-artifact` → `/team-handoff` → `/team-refine` → `/team-story`                                                                                                                                                                                                          | No       |
| `ba-dev-handoff`         | **BA → Dev Handoff**       | BA hands off refined stories to development team, pre-dev quality gate | Unrefined ideas, missing acceptance criteria                | `/team-review-artifact` → `/team-quality-gate` → `/team-handoff` → `/plan` → `/plan-review` → `/plan-validate`                                                                                                                                                                                     | No       |
| `dev-qa-handoff`         | **Dev → QA Handoff**       | Development complete, handoff to QA for testing                        | Incomplete features, missing unit tests, untested code      | `/team-handoff` → `/team-test-spec`                                                                                                                                                                                                                                                                | No       |
| `qa-po-acceptance`       | **QA → PO Acceptance**     | Testing complete, QA hands off to PO for acceptance and sign-off       | Incomplete testing, known defects, missing test coverage    | `/team-quality-gate` → `/team-handoff` → `/team-acceptance`                                                                                                                                                                                                                                        | No       |
| `design-dev-handoff`     | **Designer → Dev Handoff** | Designer hands off design spec to developer for implementation         | Incomplete designs, missing specs, design exploration       | `/team-design-spec` → `/team-review-artifact` → `/team-handoff` → `/plan` → `/plan-review` → `/plan-validate`                                                                                                                                                                                      | No       |
| `sprint-retro`           | **Sprint Retrospective**   | End of sprint, gather feedback, identify improvements, create actions  | Mid-sprint, planning activities, status reporting           | `/team-status` → `/team-retro`                                                                                                                                                                                                                                                                     | No       |
| `full-feature-lifecycle` | **Full Feature Lifecycle** | Complete feature from idea to release with all role handoffs           | Quick fixes, minor changes, single-role tasks               | `/team-idea` → `/team-refine` → `/team-story` → `/team-design-spec` → `/plan` → `/plan-review` → `/plan-validate` → `/cook` → `/code-simplifier` → `/review-changes` → `/code-review` → `/sre-review` → `/team-test-spec` → `/team-quality-gate` → `/docs-update` → `/watzup` → `/team-acceptance` | No       |

---

## Workflow Detection Instructions

### Step 1: Match Prompt to Workflow

1. **First**, check the "Quick Keyword → Workflow Lookup" table above for fast matching
2. **If no match**, compare against the full Workflow Catalog tables by semantics

### Step 2: Judge Complexity and Activate

1. **JUDGE** - Is the task simple? If yes → AI MUST ask user whether to skip workflow
2. **ACTIVATE (non-trivial)** - Auto-activate via `/workflow-start <workflowId>` — no confirmation needed
3. **ANNOUNCE** - State the detected workflow: `"Detected: **{Workflow}** workflow. Following: {sequence}"`

### Step 3: Create Todo List FIRST (MANDATORY - BLOCKING)

**You are BLOCKED from proceeding until you create ONE todo item per workflow step.**

You MUST create a separate todo for EACH step in the detected workflow sequence. Do NOT combine steps. Do NOT read files first.

**Format:** `[Workflow] /step-command - Step description`

**Example for bugfix workflow** (`/scout → /investigate → /debug → /plan → /plan-review → /plan-validate → /why-review → /fix → /code-simplifier → /review-changes → /code-review → /changelog → /test → /docs-update → /watzup`):

```
- [ ] [Workflow] /scout - Find relevant files
- [ ] [Workflow] /investigate - Understand current behavior
- [ ] [Workflow] /debug - Root cause analysis
- [ ] [Workflow] /plan - Design solution
- [ ] [Workflow] /plan-review - Review and validate plan
- [ ] [Workflow] /plan-validate - Validate plan with critical questions
- [ ] [Workflow] /why-review - Validate fix design rationale
- [ ] [Workflow] /fix - Apply fix
- [ ] [Workflow] /code-simplifier - Simplify and clean up code
- [ ] [Workflow] /code-review - Review code quality
- [ ] [Workflow] /changelog - Update changelog entries
- [ ] [Workflow] /test - Verify fix and no regressions
- [ ] [Workflow] /docs-update - Update impacted documentation
- [ ] [Workflow] /watzup - Summary report
```

**Example for feature workflow** (`/scout → /investigate → /plan → /plan-review → /plan-validate → /why-review → /cook → /code-simplifier → /review-changes → /code-review → /sre-review → /changelog → /test → /docs-update → /watzup`):

```
- [ ] [Workflow] /plan - Create implementation plan
- [ ] [Workflow] /plan-review - Review and validate plan
- [ ] [Workflow] /plan-validate - Validate plan with critical questions
- [ ] [Workflow] /why-review - Validate design rationale
- [ ] [Workflow] /cook - Implement the feature
- [ ] [Workflow] /code-simplifier - Simplify and clean up code
- [ ] [Workflow] /code-review - Review code quality
- [ ] [Workflow] /sre-review - SRE production readiness review
- [ ] [Workflow] /changelog - Update changelog entries
- [ ] [Workflow] /test - Run tests and verify
- [ ] [Workflow] /docs-update - Update documentation
- [ ] [Workflow] /watzup - Summarize changes
```

**Rules:**

1. Create ONE todo per workflow step — never combine or skip steps
2. Mark the first todo as `in-progress` immediately
3. Mark each todo `completed` only after verification, then move to next
4. After EVERY step, check remaining todos to stay on track
5. On context loss, search for `[Workflow]` todos to recover position

### Step 4: Execute with Evidence

- Mark "in-progress" before starting each step
- Gather evidence during execution (file reads, command outputs)
- Verify with concrete proof before marking complete
- Mark "completed" only after verification (NEVER batch completions)
- Check remaining steps after EVERY command execution

### Prompt File Mapping

Each workflow step executes a prompt file from `.github/prompts/`:

| Step                    | Prompt File                       | Purpose                                |
| ----------------------- | --------------------------------- | -------------------------------------- |
| `/plan`                 | `plan.prompt.md`                  | Create implementation plan             |
| `/plan-review`          | `plan__review.prompt.md`          | Auto-review plan validity              |
| `/cook`                 | `cook.prompt.md`                  | Implement feature (backend + frontend) |
| `/code`                 | `code.prompt.md`                  | Execute existing plan                  |
| `/code-simplifier`      | `code-simplifier.prompt.md`       | Simplify and clean code                |
| `/fix`                  | `fix.prompt.md`                   | Apply fixes                            |
| `/debug`                | `debug.prompt.md`                 | Investigate issues                     |
| `/scout`                | `scout.prompt.md`                 | Explore codebase, find files           |
| `/investigate`          | `investigate.prompt.md`           | Deep dive analysis                     |
| `/code-review`          | `review__codebase.prompt.md`      | Review code quality                    |
| `/review-changes`       | `review-changes.prompt.md`        | Review uncommitted changes             |
| `/test`                 | `test.prompt.md`                  | Run tests                              |
| `/changelog`            | `changelog.prompt.md`             | Update changelog                       |
| `/docs-update`          | `docs__update.prompt.md`          | Update documentation                   |
| `/watzup`               | `watzup.prompt.md`                | Summarize changes                      |
| `/team-idea`            | `team__idea.prompt.md`            | Capture idea                           |
| `/team-refine`          | `team__refine.prompt.md`          | Refine into PBI                        |
| `/team-story`           | `team__story.prompt.md`           | Create user stories                    |
| `/team-prioritize`      | `team__prioritize.prompt.md`      | Prioritize backlog                     |
| `/team-dependency`      | `team__dependency.prompt.md`      | Analyze dependencies                   |
| `/team-team-sync`       | `team__team-sync.prompt.md`       | Generate meeting agenda                |
| `/team-quality-gate`    | `team__quality-gate.prompt.md`    | Run quality gate                       |
| `/team-design-spec`     | `team__design-spec.prompt.md`     | Create design spec                     |
| `/team-status`          | `team__status.prompt.md`          | Generate status report                 |
| `/team-test-spec`       | `team__test-spec.prompt.md`       | Generate test spec                     |
| `/team-handoff`         | `team__handoff.prompt.md`         | Role-to-role handoff                   |
| `/team-acceptance`      | `team__acceptance.prompt.md`      | PO acceptance sign-off                 |
| `/team-retro`           | `team__retro.prompt.md`           | Sprint retrospective                   |
| `/team-review-artifact` | `team__review-artifact.prompt.md` | Review artifact before handoff         |

### Example Workflow Interaction

**User:** "Add a dark mode toggle to the settings page"

**AI Response:**

```
Detected: **Feature Implementation** workflow.
Following: /scout → /investigate → /plan → /plan-review → /plan-validate → /why-review → /cook → /code-simplifier → /review-changes → /code-review → /sre-review → /changelog → /test → /docs-update → /watzup
```

Then execute each step by loading the corresponding prompt file from `.github/prompts/`.

---

## Workflow Continuity Rule (CRITICAL)

**Problem:** Long-running workflows can lose context after executing individual steps, causing the AI to forget remaining workflow steps.

**Solution:** Track workflow state persistently.

**Mandatory:**

1. **IMMEDIATELY after detecting a workflow**, announce and track ALL workflow steps
2. **Before each step**: State which step you're starting
3. **After each step**: Mark completed and identify next step
4. **After EVERY command execution**: Check remaining steps
5. **Continue until**: ALL workflow steps are completed

**Rules:**

- NEVER abandon a detected workflow - complete ALL steps or explicitly ask user to skip
- NEVER end a turn without checking if workflow steps remain
- At the start of each response, if in a workflow, state: "Continuing workflow: Step X of Y - {step name}"
- If context seems lost, review the workflow sequence and identify current position

---

## Simple Task Exception

If AI judges the task is simple/straightforward (single-file changes, clear small fixes), AI MUST ask the user: "This seems simple. Skip workflow? (yes/no)". If user says no, activate workflow as normal. If user says "just do it" or "no workflow", skip without asking.

Skip workflows without asking ONLY for:

- Single-line typo fixes
- User explicitly says "just do it" or "no workflow"
- Pure questions with no code changes

---

## Override Methods

| Method           | Example                     | Effect                                 |
| ---------------- | --------------------------- | -------------------------------------- |
| `quick:` prefix  | `quick: add a button`       | Skip workflow question, start immediately |
| Explicit command | `/plan implement dark mode` | Bypass detection, run specific command    |
| "just do it"     | When asked "Skip workflow?" | Skip workflow entirely                    |

**Note:** `quick:` prefix skips the "Skip workflow?" question and auto-activates immediately.

---

## Evidence-Based Completion Checklist

Before claiming ANY task complete, you MUST verify:

- ✅ **Files Modified** - Re-read specific lines that were changed (never trust memory)
- ✅ **Commands Run** - Captured actual output (build, test, lint commands)
- ✅ **Tests Passed** - Verified test success with concrete output
- ✅ **No Errors** - Checked get_errors tool for compilation/lint errors
- ✅ **Filesystem Verified** - Used file_search/grep_search to confirm file existence/changes
- ✅ **Pattern Followed** - Compared implementation with existing similar code

**Research Impact:** 85% first-attempt success vs 40% without verification | 87% reduction in hallucination incidents

---

## Anti-Hallucination Protocol

**NEVER:**

- ❌ Say "file doesn't exist" without running file_search/grep_search first
- ❌ Claim "tests pass" without actual test execution output
- ❌ Claim "changes applied" without re-reading the modified lines
- ❌ Assume file location - always search first
- ❌ Trust memory over tools - always verify with read_file

**ALWAYS:**

- ✅ Provide evidence: file paths with line numbers, command output, test results
- ✅ Re-read files after modification to confirm changes
- ✅ Use tools to verify claims (file_search, grep_search, read_file, get_errors)
- ✅ State "Let me verify..." before making claims about filesystem/code state

---

## Task Planning Notes (MANDATORY)

**Always break work into many small, trackable todo tasks.**

### When to Create Todo Lists

**ALWAYS create todos for:**

- Features requiring changes in 3+ files
- Bug fixes needing investigation → plan → fix → test
- Refactoring affecting multiple layers
- Any task estimated >15 minutes
- Multi-step workflows (feature, bugfix, documentation)

**SKIP todos for:**

- Single-file edits <5 lines
- Simple questions/explanations
- Reading files for information

### Todo Granularity Guidelines

**✅ Good Todo Size** (actionable, verifiable):

```
- [ ] Read Employee entity to understand validation rules
- [ ] Create SaveEmployeeCommand in UseCaseCommands/Employee/
- [ ] Implement command handler with repository call
- [ ] Add EmployeeCreatedEvent handler for notification
- [ ] Write unit tests for SaveEmployeeCommand validation
- [ ] Run tests and verify all pass
- [ ] Final review: check for issues or enhancements needed
```

**❌ Too Vague** (not actionable):

```
- [ ] Implement employee feature
- [ ] Fix bugs
- [ ] Update documentation
```

**❌ Too Granular** (micro-management):

```
- [ ] Open Employee.cs
- [ ] Add using statement
- [ ] Type public class
- [ ] Add property Name
```

### Todo State Management

1. **Planning Phase**: Create all todos with status="not-started"
2. **Execution Phase**:
    - Mark ONE todo as "in-progress" before starting
    - Complete the work
    - Mark as "completed" immediately after verification
    - Move to next todo
3. **Never batch completions** - mark each done individually
4. **Always add a final review todo** to check for issues or enhancements needed
