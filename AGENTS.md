# EasyPlatform - AI Agent Instructions

> **CRITICAL:** This file is read by GitHub Copilot coding agent. Follow these instructions for ALL development tasks.

## Automatic Workflow Detection (MANDATORY)

**BEFORE responding to ANY task request, you MUST:**

1. **DETECT** intent from the user's prompt
2. **ANNOUNCE** the detected workflow
3. **CONFIRM** for high-impact workflows (features, refactors)
4. **EXECUTE** each step in the workflow sequence

### Workflow Detection Rules

| Intent            | Trigger Keywords                            | Workflow Sequence                                                         |
| ----------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| **Feature**       | implement, add, create, build, develop      | `/plan` -> `/cook` -> `/test` -> `/code-review` -> `/docs-update` -> `/watzup` |
| **Bug Fix**       | bug, fix, error, broken, crash, not working | `/debug` -> `/plan` -> `/fix` -> `/test`                                     |
| **Documentation** | docs, document, readme, update docs         | `/docs-update` -> `/watzup`                                                |
| **Refactoring**   | refactor, improve, clean up, restructure    | `/plan` -> `/code` -> `/test` -> `/code-review`                              |
| **Code Review**   | review, check, audit, PR review             | `/code-review` -> `/watzup`                                                |
| **Investigation** | how does, where is, explain, understand     | `/scout` -> `/investigate`                                                 |

### How to Execute Workflow Steps

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

### Workflow Configuration

Full workflow patterns are in `.claude/workflows.json` - supports multilingual triggers (EN, VI, ZH, JA, KO).

### Response Format

When you detect a workflow, respond with:

```
Detected: **{Workflow Name}** workflow. Following: {sequence}

Proceed with this workflow? (yes/no/quick)
```

### Override Methods

| Method           | Example                     | Effect                          |
| ---------------- | --------------------------- | ------------------------------- |
| `quick:` prefix  | `quick: add a button`       | Skip workflow, direct handling  |
| Explicit command | `/plan implement dark mode` | Bypass detection, run command   |
| Say "quick"      | When asked "Proceed?"       | Abort workflow, handle directly |

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

## Core Development Rules

### Backend (C# / .NET 9)

1. Use platform repositories (`IPlatformQueryableRootRepository<T>`)
2. Use `PlatformValidationResult` fluent API - never throw exceptions
3. Side effects go in Entity Event Handlers (`UseCaseEvents/`) - never in handlers
4. DTOs own mapping via `PlatformEntityDto<TEntity, TKey>.MapToEntity()`
5. Command + Result + Handler in ONE file
6. Cross-service communication via RabbitMQ only

### Frontend (Angular 19 / TypeScript)

1. Extend `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent`
2. Use `PlatformVmStore` for state management
3. Extend `PlatformApiService` for HTTP calls
4. Always use `.pipe(this.untilDestroyed())` for subscriptions
5. All template elements MUST have BEM classes

### Architecture

1. Search for existing implementations before creating new code
2. Place logic in LOWEST layer (Entity > Service > Component)
3. Plan before implementing non-trivial tasks

---

## Documentation References

| Document                                            | Purpose                         |
| --------------------------------------------------- | ------------------------------- |
| `docs/claude/03-backend-patterns.md`                | Complete backend patterns       |
| `docs/claude/04-frontend-patterns.md`               | Complete frontend patterns      |
| `docs/claude/08-clean-code-rules.md`                | Coding standards                |
| `.github/copilot-instructions.md`                   | Detailed development guidelines |
| `.github/AGENTS.md`                                 | Agent decision tree             |
| `.claude/workflows.json`                            | Workflow definitions            |

---

## Quick Decision Tree

```
User Request
|-- Contains "implement/add/create/build"?
|   +-- YES -> Feature workflow: /plan -> /cook -> /test -> /code-review -> /docs-update -> /watzup
|
|-- Contains "bug/fix/error/broken"?
|   +-- YES -> Bugfix workflow: /debug -> /plan -> /fix -> /test
|
|-- Contains "refactor/improve/clean"?
|   +-- YES -> Refactor workflow: /plan -> /code -> /test -> /code-review
|
|-- Contains "docs/document/readme"?
|   +-- YES -> Documentation workflow: /docs-update -> /watzup
|
|-- Contains "review/check/audit"?
|   +-- YES -> Review workflow: /code-review -> /watzup
|
|-- Contains "how does/where is/explain"?
|   +-- YES -> Investigation workflow: /scout -> /investigate
|
+-- No match?
    +-- Ask user for clarification or handle directly
```

---

**Remember:** Always detect workflow FIRST, then execute the sequence. This ensures consistent, high-quality development.
