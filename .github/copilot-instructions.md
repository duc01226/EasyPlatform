# EasyPlatform Development Guidelines (GitHub Copilot)

> **.NET 9 + Angular 19 Development Platform Framework**

---

## MUST READ: Authoritative Source

**[`CLAUDE.md`](../CLAUDE.md)** (project root) is the **single source of truth** for all EasyPlatform development guidelines. You **MUST READ** it before any implementation work.

It contains:

- Architecture overview & project structure
- Backend/Frontend principles & anti-patterns
- Code responsibility hierarchy (Entity > Service > Component)
- BEM naming conventions (MANDATORY for all UI elements)
- Decision trees (backend/frontend task routing)
- Development commands & database connections
- Cross-platform shell commands (Git Bash compatibility)
- Clean code rules & code quality checklist
- Changelog & release notes workflow
- Code patterns quick reference table

**For full code examples (auto-injected when editing source files):**

- `.ai/docs/backend-code-patterns.md` — 16 backend C# patterns with full code blocks
- `.ai/docs/frontend-code-patterns.md` — 6 frontend TypeScript patterns with full code blocks

**This file contains Copilot-specific additions only** — workflow configuration, prompt mapping, verification protocols, context strategies, and workspace boundaries.

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
15. Plan before implementing non-trivial tasks
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

## Automatic Workflow Detection (CRITICAL - MUST FOLLOW)

> **This is NOT optional.** Before responding to ANY development task, you MUST detect intent and follow the appropriate workflow. This ensures consistent, high-quality development across the team.

### Workflow Configuration

Full workflow patterns are defined in **`.claude/workflows.json`** - the single source of truth for both Claude and Copilot. Supports multilingual triggers (EN, VI, ZH, JA, KO).

### Quick Reference - Workflow Detection

| Intent            | Trigger Keywords                                    | Workflow Sequence                                                                                                        |
| ----------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Feature**       | implement, add, create, build, develop, new feature | `/plan` → `/plan-review` → `/cook` → `/code-simplifier` → `/code-review` → `/test` → `/docs-update` → `/watzup`          |
| **Bug Fix**       | bug, fix, error, broken, crash, not working, debug  | `/scout` → `/investigate` → `/debug` → `/plan` → `/plan-review` → `/fix` → `/code-simplifier` → `/code-review` → `/test` |
| **Documentation** | docs, document, readme, update docs                 | `/scout` → `/investigate` → `/docs-update` → `/watzup`                                                                   |
| **Refactoring**   | refactor, improve, clean up, restructure            | `/plan` → `/plan-review` → `/code` → `/code-simplifier` → `/code-review` → `/test`                                       |
| **Code Review**   | review, check, audit code, PR review                | `/code-review` → `/watzup`                                                                                               |
| **Investigation** | how does, where is, explain, understand, find       | `/scout` → `/investigate`                                                                                                |

### Workflow Execution Protocol (MANDATORY STEPS)

You MUST follow these steps for EVERY development request:

1. **DETECT** - Analyze user prompt against workflow patterns
2. **ANNOUNCE** - State the detected workflow: `"Detected: **{Workflow}** workflow. Following: {sequence}"`
3. **CREATE TODO LIST FIRST (MANDATORY)** - Create todo items for ALL workflow steps BEFORE starting
4. **CONFIRM** - For features/refactors, ask: `"Proceed with this workflow? (yes/no/quick)"`
5. **EXECUTE** - Follow each step with evidence:
    - Mark "in-progress" before starting each step
    - Gather evidence during execution (file reads, command outputs)
    - Verify with concrete proof before marking complete
    - Mark "completed" only after verification (NEVER batch completions)
    - Check remaining steps after EVERY command execution

### Workflow Continuity Rule (CRITICAL)

**Problem:** Long-running workflows can lose context after executing individual steps, causing the AI to forget remaining workflow steps.

**Solution:** Track workflow state persistently using a structured approach.

**Mandatory Steps:**

1. **IMMEDIATELY after detecting a workflow**, announce and track ALL workflow steps
2. **Before each step**: Clearly state which step you're starting
3. **After each step**: Mark it as completed and identify next step
4. **After EVERY command execution**: Check remaining steps
5. **Continue until**: ALL workflow steps are completed

**Rules:**

- NEVER abandon a detected workflow - complete ALL steps or explicitly ask user to skip
- NEVER end a turn without checking if workflow steps remain
- At the start of each response, if in a workflow, state: "Continuing workflow: Step X of Y - {step name}"
- If context seems lost, review the workflow sequence and identify current position

**Recovery Pattern:**

```
## Workflow Status
- [x] /plan - Completed
- [x] /cook - Completed
- [ ] /test - IN PROGRESS
- [ ] /code-review - Pending
- [ ] /docs-update - Pending
```

### Override Methods

| Method           | Example                     | Effect                                    |
| ---------------- | --------------------------- | ----------------------------------------- |
| `quick:` prefix  | `quick: add a button`       | Skip user confirmation, start immediately |
| Explicit command | `/plan implement dark mode` | Bypass detection, run specific command    |
| Say "quick"      | When asked "Proceed?"       | Abort workflow, handle directly           |

**Note:** `quick:` prefix skips the "Proceed with workflow?" confirmation BUT still follows the complete workflow sequence.

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
| `src/Frontend/**/*.component.ts`      | `frontend-angular-component`   | Component base class                |
| `src/Frontend/**/*.store.ts`          | `frontend-angular-store`       | Store patterns                      |
| `src/Frontend/**/*-form.component.ts` | `frontend-angular-form`        | Form patterns                       |
| `src/Frontend/**/*-api.service.ts`    | `frontend-angular-api-service` | API service patterns                |
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

## Task Decomposition Best Practices

> **Research Finding**: Breaking complex tasks into 5-10 small todos increases completion rate by 67% and reduces context loss in long sessions.

### When to Create Todo Lists

**ALWAYS create todos for**:

- Features requiring changes in 3+ files
- Bug fixes needing investigation -> plan -> fix -> test
- Refactoring affecting multiple layers
- Multi-step workflows (feature, bugfix, documentation)

**SKIP todos for**:

- Single-file edits <5 lines
- Simple questions/explanations
- Reading files for information

### Todo Granularity Guidelines

**Good Todo Size** (actionable, verifiable):

```
- [ ] Read TextSnippet entity to understand validation rules
- [ ] Create SaveTextSnippetCommand in UseCaseCommands/TextSnippet/
- [ ] Implement command handler with repository call
- [ ] Add TextSnippetCreatedEvent handler for notification
- [ ] Write unit tests for SaveTextSnippetCommand validation
- [ ] Run tests and verify all pass
```

**Too Vague** (not actionable):

```
- [ ] Implement feature
- [ ] Fix bugs
- [ ] Update documentation
```

### Todo Templates for Common Tasks

**Feature Implementation:**

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

**Bug Fix:**

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

**Refactoring:**

```markdown
- [ ] Scout - Find all usages of code to refactor
- [ ] Plan - Design new structure
- [ ] Identify Breaking Changes - List affected code
- [ ] Refactor Core - Make structural changes
- [ ] Update Usages - Fix all references
- [ ] Run Tests - Verify behavior unchanged
- [ ] Performance Check - Compare before/after
```

### Todo State Management

Use `manage_todo_list` with proper state transitions:

1. **Planning Phase**: Create all todos with status="not-started"
2. **Execution Phase**:
    - Mark ONE todo as "in-progress" before starting
    - Complete the work
    - Mark as "completed" immediately after verification
    - Move to next todo
3. **Never batch completions** - mark each done individually

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

- `.claude/commands/checkpoint.md` - Manual checkpoint command
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

| Application       | Location                                                        |
| ----------------- | --------------------------------------------------------------- |
| WebV2 Apps        | `docs/design-system/`                                           |
| TextSnippetClient | `src/Frontend/apps/playground-text-snippet/docs/design-system/` |

---

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

---

## File I/O Safety (Learned Patterns)

- **File Locking**: Use `.lock` file pattern for shared state; handle stale locks, use timeout, wrap entire read-modify-write
- **Atomic Writes**: Write to `.tmp` first, rename to final path; handle crash recovery
- **Schema Validation**: Validate at creation and before save; fail fast; bound all counts

**Reference:** See `.claude/skills/code-patterns/` for full implementation details.

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

| Instruction File                           | Applies To                             | Simulates                        |
| ------------------------------------------ | -------------------------------------- | -------------------------------- |
| `backend-csharp.instructions.md`           | `src/Backend/**/*.cs`, `src/Platform/**/*.cs` | Backend C# patterns & rules     |
| `frontend-typescript.instructions.md`      | `src/Frontend/**/*.ts,tsx,html`, `libs/**/*.ts` | Frontend Angular/TS patterns    |
| `frontend-scss.instructions.md`            | `src/Frontend/**/*.scss`, `libs/**/*.scss` | SCSS/BEM styling rules           |
| `documentation.instructions.md`            | `docs/**/*.md`                         | Documentation standards          |
| `code-review.instructions.md`              | `**/*` (excludes coding agent)         | Code review checklist            |

Each file contains critical rules inline + references to full pattern files in `.ai/docs/` and `docs/claude/`.

> **Note:** Instruction files apply to **chat and agent mode only**, not inline completions.

**For full code pattern reference tables:** See `CLAUDE.md` → Code Patterns Reference section.

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
