# EasyPlatform - AI Agent Instructions

> **CRITICAL:** This file is read by GitHub Copilot coding agent. Follow these instructions for ALL development tasks.

---

## MUST READ: Authoritative Source

**[`CLAUDE.md`](CLAUDE.md)** is the **single source of truth** for all EasyPlatform development guidelines. **Read it before any implementation work.**

**[`.github/copilot-instructions.md`](.github/copilot-instructions.md)** contains Copilot-specific workflow configuration, verification protocols, and code patterns.

---

## Core Development Rules

### Backend (C# / .NET 9)

1. Use platform repositories (`IPlatformQueryableRootRepository<TEntity, TKey>`) with static expression extensions
2. Use `PlatformValidationResult` fluent API (`.And()`, `.AndAsync()`) — never throw exceptions
3. Side effects go in Entity Event Handlers (`UseCaseEvents/`) — never in command handlers
4. DTOs own mapping via `PlatformEntityDto<TEntity, TKey>.MapToEntity()` — never map in handlers
5. Command + Result + Handler in ONE file under `UseCaseCommands/{Feature}/`
6. Cross-service communication via RabbitMQ message bus only

### Frontend (Angular 19 / TypeScript)

1. Extend `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent` — never raw `Component`
2. Use `PlatformVmStore` for state management — never manual signals
3. Extend `PlatformApiService` for HTTP calls — never direct `HttpClient`
4. Always use `.pipe(this.untilDestroyed())` for subscriptions
5. All template elements MUST have BEM classes (`block__element --modifier`)

### Architecture

1. Search for existing implementations before creating new code
2. Place logic in LOWEST layer (Entity > Service > Component) to enable reuse
3. Plan before implementing non-trivial tasks

---

## Available Agents

Reference agents from `.github/agents/` for specialized tasks:

| Agent                   | Purpose                           | When to Use                    |
| ----------------------- | --------------------------------- | ------------------------------ |
| **workflow-router**     | Detect intent, route to workflows | First step for any task        |
| **planner**             | Create implementation plans       | Feature planning, architecture |
| **fullstack-developer** | Implement features                | Coding tasks                   |
| **debugger**            | Investigate issues                | Bug diagnosis                  |
| **code-reviewer**       | Quality assessment                | Code review, PR review         |
| **tester**              | Run tests, coverage               | Test verification              |
| **docs-manager**        | Documentation updates             | README, docs changes           |
| **scout**               | Find files, explore codebase      | File search, navigation        |

---

## Workflow Step → Prompt File Mapping

Each workflow step maps to a prompt file in `.github/prompts/`:

| Step           | Prompt File             | Description                |
| -------------- | ----------------------- | -------------------------- |
| `/plan`        | `plan.prompt.md`        | Create implementation plan |
| `/cook`        | `cook.prompt.md`        | Implement feature          |
| `/code`        | `code.prompt.md`        | Execute existing plan      |
| `/test`        | `test.prompt.md`        | Run tests                  |
| `/fix`         | `fix.prompt.md`         | Apply fixes                |
| `/debug`       | `debug.prompt.md`       | Investigate issues         |
| `/code-review` | `code-review.prompt.md` | Review code quality        |
| `/docs-update` | `docs-update.prompt.md` | Update documentation       |
| `/watzup`      | `watzup.prompt.md`      | Summarize changes          |
| `/scout`       | `scout.prompt.md`       | Explore codebase           |
| `/investigate` | `investigate.prompt.md` | Deep dive analysis         |

**Usage:** Read and follow the prompt file instructions for each step in sequence.

---

## Documentation References

| Document                          | Purpose                         |
| --------------------------------- | ------------------------------- |
| `CLAUDE.md`                       | Core principles & architecture  |
| `.github/copilot-instructions.md` | Copilot workflow & code patterns |
| `.claude/workflows.json`          | Workflow definitions (22 total) |
| `docs/claude/backend-patterns.md` | Complete backend patterns       |
| `docs/claude/frontend-patterns.md`| Complete frontend patterns      |
| `docs/claude/clean-code-rules.md` | Coding standards                |

---

## Workflow Decision Guide (22 Workflows)

> **This section is intentionally placed at the end for maximum AI attention.** Use this table to match user prompts to the correct workflow.

### All Workflows — When to Use

| ID | Name | When to Use | When NOT to Use | Confirm? |
|----|------|-------------|-----------------|----------|
| `feature` | Feature Implementation | User wants to **implement, add, create, build, develop** a new feature, functionality, module, or component | Bug fixes, docs-only, test-only, migration, refactoring, investigation | ✅ Yes |
| `bugfix` | Bug Fix | User reports a **bug, error, crash, broken functionality**, or asks to **fix/debug/troubleshoot**. Includes regression fixes, 'not working' reports, exception traces | New features, refactoring, documentation, investigation without fixing | No |
| `refactor` | Code Refactoring | User wants to **refactor, restructure, reorganize, clean up** code, improve quality, extract methods, rename, split/merge components, address technical debt | Bug fixes, new features, quality audits | ✅ Yes |
| `migration` | Database Migration | User wants to **create or run database migrations**: schema changes, data migrations, EF migrations, adding/removing/altering columns or tables | Explaining migration concepts, checking migration history/status | ✅ Yes |
| `batch-operation` | Batch Operation | User wants to **apply changes across multiple files/directories/components** at once. Includes bulk renames, find-and-replace across codebase, operations targeting 'all' or 'every' | Single-file changes, test file creation, documentation updates | ✅ Yes |
| `investigation` | Code Investigation | User asks **how something works, where code is located**, wants to **understand or explore** a feature, trace code paths, explain implementation | Any task requiring code changes | No |
| `review` | Code Review | User wants a **code review, PR review, code quality check**, or audit of specific code or changes | Reviewing uncommitted/staged changes, quality audits with fixes | No |
| `review-changes` | Review Current Changes | User wants to **review current uncommitted, staged, or recent changes** before committing | PR reviews, release prep, quality audits | No |
| `quality-audit` | Quality Audit | User wants a **quality audit**: review code for best practices, ensure no flaws, verify quality standards | Reviewing uncommitted changes, PR review, bug fixes | ✅ Yes |
| `security-audit` | Security Audit | User wants a **security audit**: vulnerability assessment, OWASP check, security review | Implementing new security features, fixing known security bugs | No |
| `performance` | Performance Optimization | User wants to **analyze or optimize performance**: fix slow queries, reduce latency, improve throughput, resolve N+1 problems | Explaining performance concepts | ✅ Yes |
| `verification` | Verification & Validation | User wants to **verify, validate, confirm, check** that something works correctly. Includes 'make sure' and 'ensure that' | New features, code review, documentation, investigation-only | ✅ Yes |
| `pre-development` | Pre-Development Setup | User wants to **prepare before starting development**: quality gate checks, setup for new feature work | Already in development | No |
| `deployment` | Deployment & Infrastructure | User wants to **set up or modify deployment, infrastructure, CI/CD pipelines**, Docker configuration | Explaining deployment concepts | ✅ Yes |
| `documentation` | Documentation Update | User wants to **write, update, or improve general documentation**, README, or code comments | Business feature docs, code implementation | No |
| `business-feature-docs` | Business Feature Docs | User wants to **create or update business feature documentation** using 26-section template targeting `docs/business-features/` | General docs, code comments, README changes | No |
| `idea-to-pbi` | Idea to PBI | User has a **new product idea, feature request**, or wants to **add to the backlog** | Bug fixes, code implementation, investigation | ✅ Yes |
| `pbi-to-tests` | PBI to Tests | User wants to **create or generate test specs/cases** from a PBI, feature, or story | Running existing tests | No |
| `sprint-planning` | Sprint Planning | User wants to **plan a sprint**: prioritize backlog, analyze dependencies, prepare team sync | Sprint review, retrospective, status reports | ✅ Yes |
| `pm-reporting` | PM Reporting | User wants a **status report, sprint update, project progress report** | Git status, commit status, quick checks | No |
| `release-prep` | Release Preparation | User wants to **prepare for a release**: pre-release checks, readiness, deployment checklist | Git release commands, npm publish, release notes | ✅ Yes |
| `design-workflow` | Design Workflow | User wants to **create a UI/UX design specification**, mockup, wireframe, or component spec | Implementing an existing design in code | No |

### Workflow Selection Decision Tree

```
User Prompt Analysis:
│
├─ "bug", "error", "fix", "broken", "crash", "not working", exception trace?
│   └─ YES → bugfix
│
├─ "implement", "add", "create", "build", "develop", "new feature"?
│   └─ YES → feature (confirm first)
│
├─ "refactor", "restructure", "clean up", "improve code", "technical debt"?
│   └─ YES → refactor (confirm first)
│
├─ "migration", "schema change", "add column", "EF migration"?
│   └─ YES → migration (confirm first)
│
├─ "all files", "batch", "bulk", "find-replace across", "every instance"?
│   └─ YES → batch-operation (confirm first)
│
├─ "how does", "where is", "explain", "understand", "find", "trace"?
│   └─ YES → investigation
│
├─ "review PR", "code review", "audit code"?
│   └─ YES → review
│
├─ "review changes", "pre-commit", "staged changes", "uncommitted"?
│   └─ YES → review-changes
│
├─ "quality audit", "best practices", "ensure no flaws"?
│   └─ YES → quality-audit (confirm first)
│
├─ "security", "vulnerability", "OWASP", "penetration"?
│   └─ YES → security-audit
│
├─ "performance", "slow", "optimize", "N+1", "latency", "bottleneck"?
│   └─ YES → performance (confirm first)
│
├─ "verify", "validate", "make sure", "ensure", "confirm works"?
│   └─ YES → verification (confirm first)
│
├─ "deploy", "CI/CD", "infrastructure", "Docker", "pipeline"?
│   └─ YES → deployment (confirm first)
│
├─ "docs", "documentation", "README"?
│   ├─ Target is docs/business-features/ → business-feature-docs
│   └─ Otherwise → documentation
│
├─ "idea", "product request", "backlog", "PBI"?
│   └─ YES → idea-to-pbi (confirm first)
│
├─ "test spec", "test cases", "QA", "generate tests from PBI"?
│   └─ YES → pbi-to-tests
│
├─ "sprint planning", "prioritize backlog", "iteration planning"?
│   └─ YES → sprint-planning (confirm first)
│
├─ "status report", "sprint update", "project progress"?
│   └─ YES → pm-reporting
│
├─ "release prep", "pre-release", "go-live", "deployment checklist"?
│   └─ YES → release-prep (confirm first)
│
├─ "design spec", "wireframe", "mockup", "UI/UX spec"?
│   └─ YES → design-workflow
│
└─ No match → Handle directly (no workflow)
```

### Override Methods

| Method | Example | Effect |
|--------|---------|--------|
| `quick:` prefix | `quick: add a button` | Skip confirmation, execute workflow immediately |
| Explicit command | `/plan implement dark mode` | Bypass detection, run specific command |
| Say "quick" | When asked "Proceed?" | Abort workflow, handle directly |

---

## MANDATORY: Workflow & Task Planning (READ THIS)

> **This section is intentionally placed at the end for maximum AI attention.**

### Workflow Detection Protocol

**Before writing ANY code or reading ANY file, you MUST:**

1. **DETECT** — Match the user's prompt against the workflow table above
2. **ANNOUNCE** — State: `"Detected: **{Workflow}** workflow. Following: {sequence}"`
3. **CREATE TODOS** — Track ALL workflow steps as todo items IMMEDIATELY
4. **CONFIRM** (if marked ✅) — Ask: `"Proceed with this workflow? (yes/no/quick)"`
5. **EXECUTE** — Follow each step sequentially, marking todos as you go

**You MUST NOT:**

- Skip workflow detection because the task "looks simple"
- Read files or write code before announcing the workflow
- Handle a prompt containing error traces, bug reports, or multi-file changes without a workflow

**The ONLY exceptions:**

- Single-line typo fixes
- User explicitly says "just do it" or "no workflow"
- User prefixes with `quick:`

**If in doubt, activate the workflow.**

### Workflow Continuity Rule

- NEVER abandon a detected workflow — complete ALL steps or explicitly ask user to skip
- NEVER end a turn without checking if workflow steps remain
- At start of each response in a workflow, state: `"Continuing workflow: Step X of Y — {step name}"`
- If context seems lost, review the workflow sequence and identify current position

---

### IMPORTANT: Task Planning Rules (MUST FOLLOW)

> **Breaking tasks into small todos is CRITICAL for success.** Research shows 67% higher completion rate with proper task decomposition.

**When to create todos:**

- Features requiring changes in 3+ files
- Bug fixes needing investigation → plan → fix → test
- Refactoring affecting multiple layers
- Any multi-step workflow

**Skip todos for:** Single-file edits <5 lines, simple questions, reading files for information.

**Rules:**

1. **Always break tasks into many small, actionable todos** — Each todo should be completable in one focused step
2. **Always add a final review todo** — Review the work done at the end to find any fixes or enhancements needed
3. **Mark todos complete IMMEDIATELY** — Never batch completions; mark each done as soon as verified
4. **Only ONE todo in-progress at a time** — Focus on completing current task before starting next
5. **Update todos after EVERY command** — Check remaining steps, identify next action

**Good Todo Example:**
```
- [ ] Scout for existing employee validation patterns
- [ ] Read Employee entity to understand current rules
- [ ] Implement email uniqueness validation in SaveEmployeeCommand
- [ ] Add unit test for duplicate email scenario
- [ ] Run tests and verify all pass
- [ ] Review implementation for missed edge cases
```

**Bad Todo Example:**
```
- [ ] Implement feature
- [ ] Test it
```
