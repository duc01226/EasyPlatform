# BravoSUITE - Code Instructions

> .NET 9 Microservices + Angular 19 Micro Frontends | Enterprise HR & Talent Management Platform

**Core Business Applications:**

| Application       | Purpose                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| **bravoTALENTS**  | Recruitment pipeline, candidate management, job board integration, interview scheduling, talent matching |
| **bravoGROWTH**   | Employee lifecycle, goals, kudos, performance reviews, check-ins, timesheets, form templates             |
| **bravoSURVEYS**  | Survey design, distribution, response collection, and analytics                                          |
| **bravoINSIGHTS** | Dashboards, reporting, and business intelligence across all modules                                      |
| **Accounts**      | Authentication, user management, and access control                                                      |

**Business Feature Documentation:** 18 features with 26-section docs at [`docs/business-features/`](docs/business-features/) — bravoGROWTH (6), bravoTALENTS (8), bravoSURVEYS (2), bravoINSIGHTS (1), Accounts (1)

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

## IMPORTANT: Task Planning Rules (MUST FOLLOW)

These rules apply to EVERY task, whether using a workflow or not:

1. **Always break work into many small todo tasks** — granular tasks prevent losing track of progress
2. **Always add a final review todo task** to review all work done and find any fixes or enhancements needed
3. **Mark todos as completed IMMEDIATELY** after finishing each task — never batch completions
4. **Exactly ONE task in_progress at a time** — complete current before starting next
5. **Use TodoWrite proactively** for any task with 3+ steps — visibility into progress is critical
6. **On context loss**, check TodoWrite for `[Workflow]` items to recover your place
7. **No speculation or hallucination** — always answer with proof (code references, search results, file evidence). If unsure, investigate first rather than guessing.

---

## ⚠️ FALLBACK: No Workflow Match

**If user prompt does not match any workflows, always use command/skills `/plan <user prompt>`**

---

## Critical Rules (MUST FOLLOW)

1. **Repository Priority:** Always use `IGrowthRootRepository<T>`, `ICandidatePlatformRootRepository<T>` over generic `IPlatformRootRepository`
2. **Validation:** Use `PlatformValidationResult` fluent API (`.And()`, `.AndAsync()`), never throw exceptions for validation
3. **Side Effects:** Handle in Entity Event Handlers (`UseCaseEvents/`), never in command handlers
4. **DTO Mapping:** DTOs own mapping responsibility via `PlatformEntityDto<TEntity, TKey>.MapToEntity()` or `PlatformDto<T>.MapToObject()`, never map in handlers
5. **Cross-Service:** Use RabbitMQ message bus only, never direct database access
6. **Frontend State:** Use `PlatformVmStore` patterns, not manual signals
7. **Base Classes:** Check platform-core base classes before writing custom logic. Frontend: extend `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent`. Use `.pipe(this.untilDestroyed())` for subscriptions. Extend `PlatformApiService` for HTTP calls.

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

## Mandatory: Plan Before Implement

Before implementing ANY non-trivial task, you MUST:

1. **Enter Plan Mode** - Use `EnterPlanMode` tool automatically
2. **Investigate & Analyze** - Explore codebase, understand context
3. **Create Implementation Plan** - Write detailed plan with files and approach
4. **Get User Approval** - Wait for confirmation before code changes
5. **Then Implement** - Execute the approved plan

**Exceptions:** Single-line fixes, user says "just do it", pure research with no changes.

## Quick Decision Trees

### Backend Task

```
New API endpoint?     → PlatformBaseController + CQRS Command
Business logic?       → Command Handler in Application layer
Data access?          → Extend microservice-specific repository
Cross-service sync?   → Entity Event Consumer (message bus)
Scheduled task?       → PlatformApplicationBackgroundJob
Migration?            → PlatformDataMigrationExecutor / EF migrations
```

### Frontend Task

```
Simple component?     → Extend AppBaseComponent
Complex state?        → AppBaseVmStoreComponent + PlatformVmStore
Forms?                → AppBaseFormComponent with validation
API calls?            → Service extending PlatformApiService
Cross-app reusable?   → Add to bravo-common
Cross-domain?         → apps-domains library
```

### Repository Pattern

```
Service-specific?     → I{ServiceName}PlatformRootRepository<TEntity>
Complex queries?      → RepositoryExtensions with static expressions
Cross-service data?   → Message bus (NEVER direct DB access)
```

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

## Key File Locations

```
src/Services/                    # Microservices (bravoTALENTS, bravoGROWTH, etc.)
src/Platform/Easy.Platform/      # Framework core
src/WebV2/libs/platform-core/    # Frontend framework
src/WebV2/libs/bravo-common/     # Shared UI components
src/WebV2/libs/bravo-domain/     # Business domain (APIs, models)
src/PlatformExampleApp/          # Working examples (study this!)
docs/design-system/              # Frontend design tokens & components
.claude/hooks/                   # Claude Code hooks (ACE system)
.claude/hooks/lib/swap-engine.cjs # External Memory Swap engine
.claude/hooks/tests/             # Test suite for Claude hooks (545 tests)
docs/code-review-rules.md        # BravoSUITE code review rules (auto-injected)
/tmp/ck/swap/{sessionId}/        # Runtime swap files (post-compaction recovery)
.ai/docs/                        # AI reference docs (prompt-context, common-prompt)
.ai/workspace/                   # AI ephemeral workspace (gitignored)
scripts/k8s/                     # K8s helpers: AKS cluster connect & port-forward (Mongo, RabbitMQ, ES)
```

## Development Commands

```bash
# Backend
dotnet build BravoSUITE.sln
dotnet run --project [Service].Service

# Frontend (WebV2)
npm run dev-start:growth          # Port 4206
npm run dev-start:employee        # Port 4205
nx build growth-for-company

# Claude Hooks Tests (545 tests total)
node .claude/hooks/tests/test-all-hooks.cjs          # 281 hook tests
node .claude/hooks/tests/test-lib-modules.cjs        # 58 core lib tests
node .claude/hooks/tests/test-lib-modules-extended.cjs  # 206 extended lib tests
# Adding new tests: Check .claude/hooks/tests/ for existing patterns before creating new test files
```

## Shell Environment (Critical for Windows)

**Claude Code runs in Git Bash (MINGW64) on Windows, NOT Windows CMD.** Always use Unix commands.

### Command Equivalence Table

| Windows CMD (DON'T USE) | Unix Equivalent (USE THIS) | Purpose                  |
| ----------------------- | -------------------------- | ------------------------ |
| `dir /b /s path`        | `find path -type f`        | Recursive file listing   |
| `dir /b path`           | `ls path`                  | Basic listing            |
| `type file`             | `cat file`                 | View file content        |
| `copy src dst`          | `cp src dst`               | Copy file                |
| `move src dst`          | `mv src dst`               | Move file                |
| `del file`              | `rm file`                  | Delete file              |
| `mkdir path`            | `mkdir -p path`            | Create directory         |
| `rmdir /s path`         | `rm -rf path`              | Delete directory         |
| `where cmd`             | `which cmd`                | Find command location    |
| `set VAR=value`         | `export VAR=value`         | Set environment variable |

### Path Handling

- Use forward slashes: `D:/GitSources/BravoSuite` (works in both shells)
- Or escaped backslashes in strings: `D:\\GitSources\\BravoSuite`
- Avoid unescaped backslashes: `D:\path` may be interpreted as escape sequences

**Database Connections:** See [docs/claude/architecture.md](docs/claude/architecture.md#database-connections-development)

## Debugging Protocol

When debugging or analyzing code removal, follow [AI-DEBUGGING-PROTOCOL.md](.github/AI-DEBUGGING-PROTOCOL.md):

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

## Automatic Skill Activation (MANDATORY)

When working in specific areas, these skills MUST be automatically activated BEFORE any file creation or modification:

### Path-Based Skill Activation

| Path Pattern                  | Skill                        | Pre-Read Files           |
| ----------------------------- | ---------------------------- | ------------------------ |
| `docs/business-features/**`   | `business-feature-docs`      | Template + Reference doc |
| `src/Services/**/*.cs`        | `easyplatform-backend`       | CQRS patterns reference  |
| `src/WebV2/**/*.component.ts` | `frontend-angular-component` | Component base class     |
| `src/WebV2/**/*.store.ts`     | `frontend-angular-store`     | Store patterns           |
| `src/Web/**/*.component.ts`   | `frontend-angular-component` | WebV1 platform component |
| `src/Web/**/*.ts`             | `frontend-angular-component` | WebV1 platform patterns  |
| `docs/design-system/**`       | `ui-ux-designer`             | Design tokens file       |

### Activation Protocol

Before creating or modifying files matching these patterns, Claude MUST:

1. **Activate the skill** - Use `/skill-name` or Skill tool
2. **Read reference files** - Template + existing example in same folder
3. **Follow skill workflow** - Apply all skill-specific rules

### Business Feature Documentation (Critical)

When working in `docs/business-features/`, ALWAYS:

1. Activate `business-feature-docs` skill
2. Read `docs/templates/detailed-feature-docs-template.md`
3. Read reference: `docs/business-features/bravoTALENTS/detailed-features/README.RecruitmentPipelineFeature.md`
4. Verify output has **exactly 26 sections**
5. Include Quick Navigation with Audience column
6. Use TC-{MOD}-XXX format with GIVEN/WHEN/THEN for test cases
7. Add Evidence field with `file:line` format
8. **When updating for new functionality**: ALWAYS update test sections 17-20 (Test Specs, Test Data, Edge Cases, Regression Impact)
9. **Always update** CHANGELOG.md and Version History (Section 26)

## Documentation Index

### Quick Start (`docs/claude/`)

| Document                                     | Purpose                                          | When to Use                  |
| -------------------------------------------- | ------------------------------------------------ | ---------------------------- |
| [README.md](docs/claude/README.md)           | **Start here** - Navigation hub & decision trees | First reference for any task |
| [quick-start.md](docs/claude/quick-start.md) | 5-minute onboarding guide                        | New to Claude Code           |

### Claude Code Reference (`docs/claude/`)

| Directory                                             | Contents                                                                                                                                                                 | When to Use                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [skills/](docs/claude/skills/README.md)               | Skills catalog (workflow, git, utility, team)                                                                                                                            | Finding the right skill                                                |
| [skills/](docs/claude/skills/README.md)               | 93 skills with trigger keywords                                                                                                                                          | Understanding skill activation                                         |
| [hooks/](docs/claude/hooks/README.md)                 | 36 hooks + ACE system deep-dive + [External Memory Swap](docs/claude/hooks/external-memory-swap.md) + [Code Review Rules](docs/claude/hooks/README.md#code-review-rules) | Hook internals, extending, post-compaction recovery, code review rules |
| [agents/](docs/claude/agents/README.md)               | 24+ subagents catalog & patterns                                                                                                                                         | Agent selection, parallel execution                                    |
| [configuration/](docs/claude/configuration/README.md) | Settings, coding levels 0-5, MCP                                                                                                                                         | Configuration changes                                                  |

### BravoSUITE Patterns (`docs/claude/`)

| Document                                                               | Purpose                                                 | When to Use                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| [architecture.md](docs/claude/architecture.md)                         | System architecture, file locations, service boundaries | Understanding project structure              |
| [backend-patterns.md](docs/claude/backend-patterns.md)                 | CQRS, Repository, Entity, Validation, Message Bus, Jobs | Backend development tasks                    |
| [frontend-patterns.md](docs/claude/frontend-patterns.md)               | Components, Forms, Stores, API Services, BEM templates  | Frontend development tasks                   |
| [anti-patterns.md](docs/claude/anti-patterns.md)                       | Common mistakes and how to avoid them                   | Code review, debugging                       |
| [advanced-patterns.md](docs/claude/advanced-patterns.md)               | Fluent helpers, expression composition, utilities       | Complex implementations                      |
| [troubleshooting.md](docs/claude/troubleshooting.md)                   | Common issues and solutions                             | When stuck or encountering errors            |
| [skill-naming-conventions.md](docs/claude/skill-naming-conventions.md) | Skill naming prefixes and conventions                   | Creating or reviewing skills                 |
| [model-selection-guide.md](docs/claude/model-selection-guide.md)       | Agent model configuration (Opus/Sonnet)                 | Configuring agents or skills                 |
| [hooks-reference.md](docs/claude/hooks-reference.md)                   | Hook lifecycle, execution order, state files            | Understanding or extending hooks             |
| [configuration-guide.md](docs/claude/configuration-guide.md)           | Configuration files and schema                          | Configuration changes                        |
| **Docker SSL Setup**                                                   | See README.md "Docker HTTPS Certificate Setup"          | SSL/certificate errors in Docker development |

### Complete Guides (`docs/claude/`)

| Document                                                                                   | Purpose                                                     | Size  |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ----- |
| [backend-csharp-complete-guide.md](docs/claude/backend-csharp-complete-guide.md)           | Comprehensive C# reference: SOLID, clean code, all patterns | ~76KB |
| [frontend-typescript-complete-guide.md](docs/claude/frontend-typescript-complete-guide.md) | Complete Angular/TS guide with principles                   | ~57KB |
| [scss-styling-guide.md](docs/claude/scss-styling-guide.md)                                 | BEM methodology, design tokens, layout mixins               | ~30KB |

### AI Assistant Setup (`docs/claude/`)

| Document                                                                         | Purpose                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [ai-assistant-setup-comparison.md](docs/claude/ai-assistant-setup-comparison.md) | Claude Code vs GitHub Copilot configuration comparison |

**Additional Resources:** [README.md](README.md), [EasyPlatform.README.md](EasyPlatform.README.md), [docs/design-system/](docs/design-system/)

## Getting Help

1. **Study Examples:** `src/PlatformExampleApp` for backend, `src/PlatformExampleAppWeb` for frontend
2. **Search Codebase:** Use grep/glob to find existing patterns
3. **Check Rule Files:** `docs/claude/` for detailed guidance
4. **Read Base Classes:** Check platform-core source for available APIs

**Investigation Workflow:** Domain concepts → semantic search → grep search → Service discovery → Platform patterns → Implementation

For detailed patterns and examples, see [docs/claude/README.md](docs/claude/README.md).

---

## Collaborative Workflows (PO, BA, QC, QA, Designers)

Collaborative workflows enable cross-role handoffs from **idea to release**. Each role has designated commands and artifacts to ensure smooth transitions through the feature lifecycle.

### Role Quick Reference

| Role                 | Primary Commands                                               | Key Artifacts                             |
| -------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| **Product Owner**    | `/team-idea`, `/team:acceptance`, `/team-quality-gate`         | Ideas, PBIs, Acceptance Sign-offs         |
| **Business Analyst** | `/team-refine`, `/team-story`, `/team:review-artifact`         | PBIs, User Stories, Acceptance Criteria   |
| **UX Designer**      | `/team-design-spec`, `/team:handoff`                           | Design Specs, Wireframes, Component Specs |
| **QA Engineer**      | `/team-test-spec`, `/team-test-cases`, `/team:review-artifact` | Test Specs, Test Cases, Bug Reports       |
| **QC Specialist**    | `/team-quality-gate`, `/team:acceptance`                       | Quality Gates, Compliance Audits          |
| **All Roles**        | `/team:retro`, `/team-status`, `/team-team-sync`               | Retrospectives, Status Reports, Agendas   |

### Feature Lifecycle Flow

```
PO: /team-idea
    ↓
BA: /team-refine → /team-story
    ↓ (→ /team:review-artifact)
Designer: /team-design-spec → /team:handoff [Designer→Dev]
    ↓
Dev: /plan → /cook → /test
    ↓ (→ /team:handoff [Dev→QA])
QA: /team-test-spec → /team-test-cases
    ↓
QC: /team-quality-gate
    ↓
PO: /team:acceptance → Release
    ↓
All: /team:retro
```

### Collaborative Commands

| Command                 | Purpose                                           | Used By   |
| ----------------------- | ------------------------------------------------- | --------- |
| `/team:handoff`         | Create role-to-role handoff record with checklist | Any role  |
| `/team:review-artifact` | Review artifact before handoff (INVEST, SMART)    | Any role  |
| `/team:acceptance`      | PO acceptance decision with sign-off              | PO, QC    |
| `/team:retro`           | Sprint retrospective with action items            | All roles |

---

## Automatic Workflow Detection (MUST FOLLOW)

Before responding to any task request, match the user's prompt against the workflow catalog below and select the best-matching workflow. The workflow-router hook also injects this catalog on every prompt — use both sources to make the best decision.

### Quick Keyword → Workflow Lookup

Use this table for fast matching. If prompt contains keywords in left column, use the workflow ID on right:

| If prompt contains...                                                 | → Use workflow ID       |
| --------------------------------------------------------------------- | ----------------------- |
| fix, bug, error, crash, broken, failing, regression, debug            | `bugfix`                |
| implement, add, create, build, develop, new feature, new component    | `feature`               |
| refactor, restructure, clean up, reorganize, technical debt, simplify | `refactor`              |
| how does, where is, explain, understand, trace, explore, find logic   | `investigation`         |
| docs, documentation, readme, update docs                              | `documentation`         |
| review code, code review, PR review, audit code                       | `review`                |
| review changes, uncommitted, staged, before commit                    | `review-changes`        |
| verify, validate, confirm, ensure, check, sanity                      | `verification`          |
| test, run tests, coverage, test suite                                 | `testing`               |
| deploy, CI/CD, Docker, Kubernetes, infrastructure, pipeline           | `deployment`            |
| migration, schema, EF migration, alter table, add column              | `migration`             |
| security, vulnerability, OWASP, penetration, compliance               | `security-audit`        |
| idea, feature request, backlog, PBI, story                            | `idea-to-pbi`           |
| sprint, planning, grooming, backlog                                   | `sprint-planning`       |
| release, ready to deploy, ship, pre-release                           | `release-prep`          |
| bulk, batch, rename all, replace across, update all                   | `batch-operation`       |
| quality, audit, best practices, flaws, enhance                        | `quality-audit`         |
| business feature doc, feature documentation                           | `business-feature-docs` |
| pre-dev, ready to start, prerequisites, start dev                     | `pre-development`       |
| test spec, test cases from PBI, acceptance criteria                   | `pbi-to-tests`          |
| design spec, mockup, wireframe, UI spec                               | `design-workflow`       |
| status report, sprint update, progress, weekly                        | `pm-reporting`          |
| handoff to BA, refine idea, BA take over                              | `po-ba-handoff`         |
| handoff to dev, ready for dev, start development                      | `ba-dev-handoff`        |
| handoff to QA, ready for testing, QA handoff                          | `dev-qa-handoff`        |
| acceptance, sign-off, PO approval, UAT                                | `qa-po-acceptance`      |
| design handoff, implement design, dev from design                     | `design-dev-handoff`    |
| retro, retrospective, sprint end, lessons learned                     | `sprint-retro`          |
| full lifecycle, idea to release, complete feature, end-to-end         | `full-feature-lifecycle`|

### Workflow Catalog (Full Details)

| ID                       | Workflow                        | Use When                                                                                                                      | NOT For                                                                                                              | Keywords                                                                 | Sequence                                                                                                                                                | Confirm? |
| ------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `feature`                | **Feature Implementation**      | Implement new functionality, add feature, create component, build capability, develop module                                  | Bug fixes, documentation, test-only, feature requests/ideas without implementation, PBI/story creation, design specs | implement, add, create, build, develop, new feature, new component       | `/plan` → `/plan-review` → `/cook` → `/code-simplifier` → `/review-codebase` → `/changelog` → `/test` → `/docs-update` → `/watzup`                      | Yes      |
| `bugfix`                 | **Bug Fix**                     | Bug, error, crash, failure, regression, something not working; fix/debug/troubleshoot                                         | New features, code improvement/refactoring, investigation-only, documentation updates                                | fix, bug, error, crash, broken, failing, regression, debug, troubleshoot | `/scout` → `/investigate` → `/debug` → `/plan` → `/plan-review` → `/fix` → `/code-simplifier` → `/review-codebase` → `/changelog` → `/test` → `/watzup` | No       |
| `verification`           | **Verification & Validation**   | Verify, validate, confirm, ensure something is correct/working; sanity check, double-check                                    | Bug reports (known broken), investigation-only, feature implementation, code reviews                                 | verify, validate, confirm, ensure, check, sanity                         | `/scout` → `/investigate` → `/test` → `/plan` → `/plan-review` → `/fix` → `/code-simplifier` → `/review-codebase` → `/test` → `/watzup`                 | Yes      |
| `documentation`          | **Documentation Update**        | Create, update, improve documentation, READMEs, code comments                                                                 | Feature implementation, bug fixes, test writing                                                                      | docs, documentation, readme, update docs                                 | `/scout` → `/investigate` → `/plan` → `/plan-review` → `/docs-update` → `/watzup`                                                                       | No       |
| `refactor`               | **Code Refactoring**            | Restructure, reorganize, clean up, improve existing code without changing behavior; technical debt                            | Bug fixes, new feature development                                                                                   | refactor, restructure, clean up, reorganize, technical debt, simplify    | `/plan` → `/plan-review` → `/code` → `/code-simplifier` → `/review-codebase` → `/changelog` → `/test` → `/watzup`                                       | Yes      |
| `review-changes`         | **Review Changes**              | Review current uncommitted, staged, or unstaged changes before committing                                                     | PR reviews, codebase reviews, branch comparisons                                                                     | review changes, uncommitted, staged, before commit                       | `/review-changes`                                                                                                                                       | No       |
| `review`                 | **Code Review**                 | Code review, PR review, codebase quality audit, code quality check                                                            | Reviewing uncommitted changes (use review-changes), reviewing plans/designs/specs                                    | review code, code review, PR review, audit code                          | `/review-codebase` → `/watzup`                                                                                                                          | No       |
| `quality-audit`          | **Quality Audit**               | Audit code quality, review skills/commands/hooks for best practices, find flaws, suggest enhancements                         | Bug fixes, feature implementation, investigation-only, reviewing uncommitted changes, PR reviews                     | quality, audit, best practices, flaws, enhance                           | `/review-codebase` → `/plan` → `/plan-review` → `/code` → `/test` → `/watzup`                                                                           | Yes      |
| `investigation`          | **Code Investigation**          | Understand how code works, find where logic lives, explore architecture, trace code paths, get explanations                   | Any action that modifies code (implement, fix, create, refactor, test, review, document, design, plan)               | how does, where is, explain, understand, trace, explore, find logic      | `/scout` → `/investigate`                                                                                                                               | No       |
| `release-prep`           | **Release Preparation**         | Verify release readiness, run pre-release quality gate, check if ready to deploy/ship                                         | Rollbacks, hotfixes, release notes writing, release branch operations                                                | release, ready to deploy, ship, pre-release                              | `/team-quality-gate` → `/team-status`                                                                                                                   | Yes      |
| `business-feature-docs`  | **Business Feature Docs**       | Create or update business feature documentation in `docs/business-features/`                                                  | Bug fixes, feature implementation, test writing, debugging, refactoring                                              | business feature doc, feature documentation                              | `/scout` → `/investigate` → `/plan` → `/plan-review` → `/docs-update` → `/watzup`                                                                       | No       |
| `testing`                | **Testing**                     | Write tests, run test suites, check test coverage, execute tests                                                              | Test specification creation (use pbi-to-tests), test case generation from PBI                                        | test, run tests, coverage, test suite                                    | `/test`                                                                                                                                                 | No       |
| `batch-operation`        | **Batch Operation**             | Modify multiple files at once: bulk rename, find-and-replace across codebase, update all instances                            | Test-only operations, documentation                                                                                  | bulk, batch, rename all, replace across, update all                      | `/plan` → `/plan-review` → `/code` → `/test` → `/watzup`                                                                                                | Yes      |
| `idea-to-pbi`            | **Idea to PBI**                 | New idea, feature request, add to backlog; refine idea into PBI with stories                                                  | Bug fixes, direct implementation (use feature workflow)                                                              | idea, feature request, backlog, PBI, story                               | `/team-idea` → `/team-refine` → `/team-story` → `/team-prioritize`                                                                                      | Yes      |
| `sprint-planning`        | **Sprint Planning**             | Plan sprint, backlog grooming/refinement, kick off new sprint                                                                 | Sprint reviews, sprint status reports, sprint retrospectives                                                         | sprint, planning, grooming, backlog                                      | `/team-prioritize` → `/team-dependency` → `/team-team-sync`                                                                                             | Yes      |
| `pre-development`        | **Pre-Development Check**       | Verify readiness before starting development: check prerequisites, quality gate, start dev                                    | QA checks, release prep, production readiness                                                                        | pre-dev, ready to start, prerequisites, quality gate                     | `/team-quality-gate` → `/plan`                                                                                                                          | Yes      |
| `pbi-to-tests`           | **PBI to Tests**                | Generate test specs or test cases from PBI, feature, story, acceptance criteria                                               | Running existing tests, checking test results                                                                        | test spec, test cases from PBI, acceptance criteria                      | `/team-test-spec` → `/team-test-cases` → `/team-quality-gate`                                                                                           | No       |
| `design-workflow`        | **Design Workflow**             | Create UI/UX design spec, mockup, wireframe, component specification                                                          | Implementing an existing design in code                                                                              | design spec, mockup, wireframe, UI spec                                  | `/team-design-spec` → `/review-codebase`                                                                                                                | No       |
| `pm-reporting`           | **PM Reporting**                | Status report, sprint update, project progress report, weekly summary                                                         | Git status, build status, PR status, commit status                                                                   | status report, sprint update, progress, weekly                           | `/team-status` → `/team-dependency`                                                                                                                     | No       |
| `deployment`             | **Deployment & Infrastructure** | Set up or modify deployment, infrastructure, CI/CD pipelines, Docker, Kubernetes                                              | Explaining deployment concepts, checking deployment status/history, investigation only                               | deploy, CI/CD, Docker, Kubernetes, infrastructure, pipeline              | `/scout` → `/investigate` → `/plan` → `/plan-review` → `/code` → `/review-codebase` → `/test` → `/watzup`                                               | Yes      |
| `migration`              | **Database Migration**          | Create or run database migrations: schema changes, data migrations, EF migrations, adding/removing/altering columns or tables | Explaining migration concepts, checking migration history/status, schema investigation only                          | migration, schema, EF migration, alter table, add column                 | `/scout` → `/investigate` → `/plan` → `/plan-review` → `/code` → `/review-codebase` → `/test` → `/watzup`                                               | Yes      |
| `security-audit`         | **Security Audit**              | Security audit, vulnerability assessment, OWASP check, security review, penetration test analysis, security compliance        | Implementing new security features, fixing known security bugs (use bugfix)                                          | security, vulnerability, OWASP, penetration, compliance                  | `/scout` → `/investigate` → `/watzup`                                                                                                                   | No       |
| `po-ba-handoff`          | **PO → BA Handoff**             | PO hands off idea/PBI to BA for refinement and story creation                                                                 | Direct development, design-first workflows, already refined requirements                                             | handoff to BA, refine idea, BA take over                                 | `/team-idea` → `/team:review-artifact` → `/team:handoff` → `/team-refine` → `/team-story`                                                               | Yes      |
| `ba-dev-handoff`         | **BA → Dev Handoff**            | BA hands off refined stories to development team, pre-dev quality gate                                                        | Unrefined ideas, missing acceptance criteria, design-first features                                                  | handoff to dev, ready for dev, start development                         | `/team:review-artifact` → `/team-quality-gate` → `/team:handoff` → `/plan`                                                                              | Yes      |
| `dev-qa-handoff`         | **Dev → QA Handoff**            | Development complete, handoff to QA for testing                                                                               | Incomplete features, missing unit tests, untested code                                                               | handoff to QA, ready for testing, QA handoff                             | `/team:handoff` → `/team-test-spec` → `/team-test-cases`                                                                                                | No       |
| `qa-po-acceptance`       | **QA → PO Acceptance**          | Testing complete, QA hands off to PO for acceptance and sign-off                                                              | Incomplete testing, known defects, missing test coverage                                                             | acceptance, sign-off, PO approval, UAT                                   | `/team-quality-gate` → `/team:handoff` → `/team:acceptance`                                                                                             | Yes      |
| `design-dev-handoff`     | **Designer → Dev Handoff**      | Designer hands off design spec to developer for implementation                                                                | Incomplete designs, missing specs, design exploration                                                                | design handoff, implement design, dev from design                        | `/team-design-spec` → `/team:review-artifact` → `/team:handoff` → `/plan`                                                                               | Yes      |
| `sprint-retro`           | **Sprint Retrospective**        | End of sprint, gather feedback, identify improvements, create action items                                                    | Mid-sprint, planning activities, status reporting                                                                    | retro, retrospective, sprint end, lessons learned                        | `/team-status` → `/team:retro`                                                                                                                          | No       |
| `full-feature-lifecycle` | **Full Feature Lifecycle**      | Complete feature from idea to release with all role handoffs                                                                  | Quick fixes, minor changes, single-role tasks                                                                        | full lifecycle, idea to release, complete feature, end-to-end            | `/team-idea` → `/team-refine` → `/team-story` → `/team-design-spec` → `/plan` → `/cook` → `/team-test-spec` → `/team-quality-gate` → `/team:acceptance` | Yes      |

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

**Task Breakdown Order (CRITICAL):**

- TODO items MUST be created at **workflow step level FIRST** (e.g., "[Workflow] /scout", "[Workflow] /investigate", "[Workflow] /plan", etc.)
- Implementation-level subtasks (e.g., "Update Section 3", "Add test cases") should be created WITHIN each workflow step as it becomes active
- NEVER skip workflow-level TODOs in favor of jumping directly to implementation tasks
- When a prompt starts with an explicit command (e.g., `/plan`), still create workflow-level TODOs for the FULL detected workflow, not just the single command

**What qualifies as "simple task" (exceptions — NARROW):**

- Single-line code changes (typo fix, add import, rename variable)
- User explicitly says "just do it" or "no workflow needed"
- Pure information questions with no code changes

> Workflow catalog injection, continuity (TodoWrite tracking), recovery after context loss, and `quick:` override are handled automatically by `workflow-router.cjs` and `post-compact-recovery.cjs` hooks.
