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

## Automatic Workflow Detection (MANDATORY — ZERO EXCEPTIONS)

> **MANDATORY:** Before responding to ANY development task, you MUST detect intent and follow the appropriate workflow. Do NOT skip this step, do NOT read files first, do NOT jump to implementation. Only handle directly if NO workflow matches.
>
> **"Simple task" exception is NARROW:** Only skip workflows for single-line typo fixes or when the user says "just do it" / prefixes with `quick:`. A prompt containing error details, stack traces, multi-line context, or multi-file changes is NEVER simple — always activate the matching workflow.

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
| Frontend Apps     | `docs/design-system/`                                           |

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

## Code Patterns Reference

### Backend Patterns

#### 1. Clean Architecture

```csharp
// Domain Layer
public class Employee : RootEntity<Employee, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string Name { get; set; } = "";
    public static Expression<Func<Employee, bool>> IsActiveExpr() => e => e.Status == Status.Active;
}

public class AuditedEmployee : RootAuditedEntity<AuditedEmployee, string, string> { }

// Application Layer - CQRS Handler
public class SaveEmployeeCommandHandler : PlatformCqrsCommandApplicationHandler<SaveEmployeeCommand, SaveEmployeeCommandResult>
{
    protected override async Task<SaveEmployeeCommandResult> HandleAsync(SaveEmployeeCommand req, CancellationToken ct)
    {
        var employee = await repository.GetByIdAsync(req.Id, ct);
        employee.Name = req.Name;
        var saved = await repository.CreateOrUpdateAsync(employee, ct);
        return new SaveEmployeeCommandResult { Id = saved.Id };
    }
}

// Service Layer - Controller
[ApiController, Route("api/[controller]")]
public class EmployeeController : PlatformBaseController
{
    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveEmployeeCommand cmd) => Ok(await Cqrs.SendAsync(cmd));
}
```

#### 2. Repository Pattern

```csharp
IPlatformQueryableRootRepository<TEntity, TKey>  // Primary
IPlatformRootRepository<TEntity, TKey>           // When queryable not needed

// Extension pattern
public static class EntityRepositoryExtensions
{
    public static async Task<Entity> GetByCodeAsync(this IPlatformQueryableRootRepository<Entity, string> repo, string code, CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(Entity.CodeExpr(code), ct).EnsureFound();

    public static async Task<List<Entity>> GetByIdsValidatedAsync(this IPlatformQueryableRootRepository<Entity, string> repo, List<string> ids, CancellationToken ct = default)
        => await repo.GetAllAsync(p => ids.Contains(p.Id), ct).EnsureFoundAllBy(p => p.Id, ids);

    public static async Task<string> GetIdByCodeAsync(this IPlatformQueryableRootRepository<Entity, string> repo, string code, CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(q => q.Where(Entity.CodeExpr(code)).Select(p => p.Id), ct).EnsureFound();
}
```

#### 3. Repository API

```csharp
await repository.CreateAsync(entity, ct);
await repository.CreateManyAsync(entities, ct);
await repository.UpdateAsync(entity, ct);
await repository.UpdateManyAsync(entities, dismissSendEvent: false, checkDiff: true, ct);
await repository.CreateOrUpdateAsync(entity, ct);
await repository.CreateOrUpdateManyAsync(entities, ct);
await repository.DeleteAsync(entityId, ct);
await repository.DeleteManyAsync(expr => expr.Status == Status.Deleted, ct);
await repository.GetByIdAsync(id, ct, loadRelatedEntities: p => p.Company);
await repository.FirstOrDefaultAsync(expr, ct);
await repository.GetAllAsync(expr, ct);
await repository.GetByIdsAsync(ids, ct);
var queryBuilder = repository.GetQueryBuilder((uow, q) => q.Where(...).OrderBy(...));
await repository.CountAsync(expr, ct);
await repository.AnyAsync(expr, ct);
```

#### 4. Validation Patterns

```csharp
// Sync validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => Age >= 18, "Must be 18+");

// Async validation
protected override async Task<PlatformValidationResult<SaveCommand>> ValidateRequestAsync(PlatformValidationResult<SaveCommand> v, CancellationToken ct)
    => await v
        .AndAsync(r => repo.GetByIdsAsync(r.Ids, ct).ThenValidateFoundAllAsync(r.Ids, ids => $"Not found: {ids}"))
        .AndNotAsync(r => repo.AnyAsync(p => r.Ids.Contains(p.Id) && p.IsExternal, ct), "Externals not allowed");

// Chained with Of<>
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => this.Validate(p => p.Id.IsNotNullOrEmpty(), "Id required")
        .And(p => p.FromDate <= p.ToDate, "Invalid range")
        .Of<IPlatformCqrsRequest>();

// Ensure pattern
var entity = await repo.GetByIdAsync(id, ct).EnsureFound($"Not found: {id}").Then(x => x.Validate().EnsureValid());
```

#### 5. Cross-Service Communication

```csharp
public class EmployeeEventProducer : PlatformCqrsEntityEventBusMessageProducer<EmployeeEventBusMessage, Employee, string> { }

public class EmployeeEventConsumer : PlatformApplicationMessageBusConsumer<EmployeeEventBusMessage>
{
    protected override async Task HandleLogicAsync(EmployeeEventBusMessage msg) { /* sync logic */ }
}
```

#### 6. Full-Text Search

```csharp
var queryBuilder = repository.GetQueryBuilder(q => q
    .Where(t => t.IsActive)
    .PipeIf(req.SearchText.IsNotNullOrEmpty(), q => searchService.Search(q, req.SearchText, Entity.SearchColumns(), fullTextAccurateMatch: true)));

var (total, items) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q).OrderByDescending(e => e.CreatedDate).PageBy(req.Skip, req.Take), ct)
);

// Entity search columns
public static Expression<Func<Entity, object>>[] SearchColumns() => [e => e.Name, e => e.Code];
```

#### 7. CQRS Command Pattern (Command + Result + Handler in ONE file)

```csharp
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public override PlatformValidationResult<IPlatformCqrsRequest> Validate() => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");
}

public sealed class SaveEntityCommandResult : PlatformCqrsCommandResult { public EntityDto Entity { get; set; } = null!; }

internal sealed class SaveEntityCommandHandler : PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    protected override async Task<PlatformValidationResult<SaveEntityCommand>> ValidateRequestAsync(PlatformValidationResult<SaveEntityCommand> v, CancellationToken ct)
        => await v.AndAsync(r => repo.GetByIdsAsync(r.RelatedIds, ct).ThenValidateFoundAllAsync(r.RelatedIds, ids => $"Not found: {ids}"));

    protected override async Task<SaveEntityCommandResult> HandleAsync(SaveEntityCommand req, CancellationToken ct)
    {
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repo.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));
        await entity.ValidateAsync(repo, ct).EnsureValidAsync();
        var saved = await repo.CreateOrUpdateAsync(entity, ct);
        return new SaveEntityCommandResult { Entity = new EntityDto(saved) };
    }
}
```

#### 8. Query Pattern

```csharp
public sealed class GetEntityListQuery : PlatformCqrsPagedQuery<GetEntityListQueryResult, EntityDto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
}

internal sealed class GetEntityListQueryHandler : PlatformCqrsQueryApplicationHandler<GetEntityListQuery, GetEntityListQueryResult>
{
    protected override async Task<GetEntityListQueryResult> HandleAsync(GetEntityListQuery req, CancellationToken ct)
    {
        var qb = repo.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
            .PipeIf(req.SearchText.IsNotNullOrEmpty(), q => searchService.Search(q, req.SearchText, Entity.SearchColumns())));

        var (total, items) = await (
            repo.CountAsync((uow, q) => qb(uow, q), ct),
            repo.GetAllAsync((uow, q) => qb(uow, q).OrderByDescending(e => e.CreatedDate).PageBy(req.Skip, req.Take), ct, e => e.Related)
        );
        return new GetEntityListQueryResult(items, total, req);
    }
}
```

#### 9. Event-Driven Side Effects

```csharp
// ❌ WRONG - direct side effect
await repo.CreateAsync(entity, ct);
await notificationService.SendAsync(entity);

// ✅ CORRECT - just save, platform auto-raises event
await repo.CreateAsync(entity, ct);

// Event handler (UseCaseEvents/[Feature]/)
internal sealed class SendNotificationOnCreateHandler : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> e)
        => !e.RequestContext.IsSeedingTestingData() && e.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<Entity> e, CancellationToken ct)
        => await notificationService.SendAsync(e.EntityData);
}
```

#### 10. Entity Pattern

```csharp
[TrackFieldUpdatedDomainEvent]
public sealed class Entity : RootEntity<Entity, string>
{
    [TrackFieldUpdatedDomainEvent] public string Name { get; set; } = "";
    [JsonIgnore] public Company? Company { get; set; }

    public static Expression<Func<Entity, bool>> UniqueExpr(string companyId, string code) => e => e.CompanyId == companyId && e.Code == code;
    public static Expression<Func<Entity, bool>> FilterExpr(List<Status> s) => e => s.ToHashSet().Contains(e.Status!.Value);
    public static Expression<Func<Entity, bool>> CompositeExpr(string companyId) => OfCompanyExpr(companyId).AndAlsoIf(true, () => e => e.IsActive);
    public static Expression<Func<Entity, object?>>[] SearchColumns() => [e => e.Name, e => e.Code];

    // Async expression with external dependency
    public static async Task<Expression<Func<Entity, bool>>> FilterWithLicenseExprAsync(IRepository<License> licenseRepo, string companyId, CancellationToken ct = default)
    {
        var hasLicense = await licenseRepo.HasLicenseAsync(companyId, ct);
        return hasLicense ? PremiumFilterExpr() : StandardFilterExpr();
    }

    [ComputedEntityProperty] public bool IsRoot { get => Id == RootId; set { } }
    [ComputedEntityProperty] public string FullName { get => $"{First} {Last}".Trim(); set { } }

    public static List<string> ValidateEntity(Entity? e) => e == null ? ["Not found"] : !e.IsActive ? ["Inactive"] : [];
}
```

#### 11. Entity DTO Pattern

```csharp
public class EmployeeDto : PlatformEntityDto<Employee, string>
{
    public EmployeeDto() { }
    public EmployeeDto(Employee e, User? u) : base(e) { Id = e.Id; Name = e.Name ?? u?.Name ?? ""; }

    public string? Id { get; set; }
    public string Name { get; set; } = "";
    public OrgDto? Company { get; set; }

    public EmployeeDto WithCompany(Org c) { Company = new OrgDto(c); return this; }

    protected override object? GetSubmittedId() => Id;
    protected override string GenerateNewId() => Ulid.NewUlid().ToString();
    protected override Employee MapToEntity(Employee e, MapToEntityModes m) { e.Name = Name; return e; }
}

// Usage
var dtos = employees.SelectList(e => new EmployeeDto(e, e.User).WithCompany(e.Company!));
```

#### 12. Fluent Helpers

```csharp
.With(e => e.Name = x).WithIf(cond, e => e.Status = Active)
.Then(e => e.Process()).ThenAsync(async e => await e.ValidateAsync(ct))
.EnsureFound("Not found").EnsureFoundAllBy(x => x.Id, ids).EnsureValidAsync()
.AndAlso(expr).AndAlsoIf(cond, () => expr).OrElse(expr)
.ThenSelect(e => e.Id).ParallelAsync(async i => await Process(i), maxConcurrent: 10)

var (entity, files) = await (repo.CreateOrUpdateAsync(e, ct), files.ParallelAsync(f => Upload(f, ct)));
```

#### 13. Background Jobs

```csharp
[PlatformRecurringJob("0 3 * * *")]
public sealed class PagedJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;
    protected override async Task ProcessPagedAsync(int? skip, int? take, object? p, IServiceProvider sp, IPlatformUnitOfWorkManager uow)
        => await repo.GetAllAsync(q => Query(q).PageBy(skip, take)).Then(items => items.ParallelAsync(Process));
    protected override async Task<int> MaxItemsCount(PlatformApplicationPagedBackgroundJobParam<object?> p) => await repo.CountAsync(Query);
}

[PlatformRecurringJob("0 0 * * *")]
public sealed class BatchJob : PlatformApplicationBatchScrollingBackgroundJobExecutor<Entity, string>
{
    protected override int BatchKeyPageSize => 50;
    protected override int BatchPageSize => 25;
    protected override IQueryable<Entity> EntitiesQueryBuilder(IQueryable<Entity> q, object? p, string? k) => q.WhereIf(k != null, e => e.CompanyId == k);
    protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(IQueryable<Entity> q, object? p, string? k) => EntitiesQueryBuilder(q, p, k).Select(e => e.CompanyId).Distinct();
    protected override async Task ProcessEntitiesAsync(List<Entity> e, string k, object? p, IServiceProvider sp) => await e.ParallelAsync(Process);
}

// Scrolling pattern (data affected by processing, always queries from start)
public override async Task ProcessAsync(Param p) => await UnitOfWorkManager.ExecuteInjectScopedScrollingPagingAsync<Entity>(
    ExecutePaged, await repo.CountAsync(q => Query(q, p)) / PageSize, p, PageSize);

// Job coordination (master schedules child jobs)
await companies.ParallelAsync(async cId => await DateRangeBuilder.BuildDateRange(start, end).ParallelAsync(date =>
    BackgroundJobScheduler.Schedule<ChildJob, Param>(Clock.UtcNow, new Param { CompanyId = cId, Date = date })));
```

#### 14. Message Bus Consumer

```csharp
internal sealed class EntityConsumer : PlatformApplicationMessageBusConsumer<EntityEventBusMessage>
{
    public override async Task<bool> HandleWhen(EntityEventBusMessage m, string r) => true;
    public override async Task HandleLogicAsync(EntityEventBusMessage m, string r)
    {
        if (m.Payload.CrudAction == Created || (m.Payload.CrudAction == Updated && !m.Payload.EntityData.IsDeleted))
        {
            var (companyMissing, userMissing) = await (
                Util.TaskRunner.TryWaitUntilAsync(() => companyRepo.AnyAsync(c => c.Id == m.Payload.EntityData.CompanyId), maxWaitSeconds: 300).Then(p => !p),
                Util.TaskRunner.TryWaitUntilAsync(() => userRepo.AnyAsync(u => u.Id == m.Payload.EntityData.UserId), maxWaitSeconds: 300).Then(p => !p));
            if (companyMissing || userMissing) return;

            var existing = await repo.FirstOrDefaultAsync(e => e.Id == m.Payload.EntityData.Id);
            if (existing == null) await repo.CreateAsync(m.Payload.EntityData.ToEntity().With(e => e.LastSyncDate = m.CreatedUtcDate));
            else if (existing.LastSyncDate <= m.CreatedUtcDate) await repo.UpdateAsync(m.Payload.EntityData.UpdateEntity(existing).With(e => e.LastSyncDate = m.CreatedUtcDate));
        }
        if (m.Payload.CrudAction == Deleted) await repo.DeleteAsync(m.Payload.EntityData.Id);
    }
}
```

#### 15. Data Migration

```csharp
public class MigrateData : PlatformDataMigrationExecutor<DbContext>
{
    public override string Name => "20251022_MigrateData";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 10, 22);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(DbContext db)
    {
        var qb = repo.GetQueryBuilder(q => q.Where(Filter()));
        await RootServiceProvider.ExecuteInjectScopedPagingAsync(await repo.CountAsync(q => qb(q)), 200, ExecutePage, qb);
    }

    static async Task<List<Entity>> ExecutePage(int skip, int take, Func<IQueryable<Entity>, IQueryable<Entity>> qb, IRepo<Entity> r, IPlatformUnitOfWorkManager u)
    {
        using var uow = u.Begin();
        var items = await r.GetAllAsync(q => qb(q).OrderBy(e => e.Id).Skip(skip).Take(take));
        await r.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false, ct: default);
        await uow.CompleteAsync();
        return items;
    }
}
```

### Frontend Patterns

#### 1. Component Hierarchy

```typescript
PlatformComponent → PlatformVmComponent → PlatformFormComponent
                  → PlatformVmStoreComponent

AppBaseComponent → AppBaseVmComponent → AppBaseFormComponent
                 → AppBaseVmStoreComponent

FeatureComponent extends AppBaseVmStoreComponent<State, Store>
```

#### 2. Platform Component API

```typescript
// PlatformComponent
status$: WritableSignal<'Pending'|'Loading'|'Success'|'Error'>;
observerLoadingErrorState<T>(key?: string): OperatorFunction<T, T>;
isLoading$(key?: string): Signal<boolean | null>;
untilDestroyed<T>(): MonoTypeOperatorFunction<T>;
tapResponse<T>(next?, error?, complete?): OperatorFunction<T, T>;

// PlatformVmComponent
vm: WritableSignal<T | undefined>;
currentVm(): T;
updateVm(partial): T;
abstract initOrReloadVm: (isReload: boolean) => Observable<T | undefined>;

// PlatformVmStoreComponent
constructor(public store: TStore) {}
vm: Signal<T | undefined>;
reload(): void;

// PlatformFormComponent
form: FormGroup<PlatformFormGroupControls<T>>;
mode: 'create'|'update'|'view';
validateForm(): boolean;
abstract initialFormConfig: () => PlatformFormConfig<T>;
```

#### 3. Component Usage

```typescript
// PlatformComponent
export class ListComponent extends PlatformComponent {
    load() {
        this.api
            .get()
            .pipe(
                this.observerLoadingErrorState('load'),
                this.tapResponse(d => (this.data = d)),
                this.untilDestroyed()
            )
            .subscribe();
    }
}

// PlatformVmStore
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
    loadData = this.effectSimple(() => this.api.get().pipe(this.tapResponse(d => this.updateState({ data: d }))));
    readonly data$ = this.select(s => s.data);
}

// PlatformVmStoreComponent
export class ListComponent extends PlatformVmStoreComponent<MyVm, MyStore> {
    constructor(store: MyStore) {
        super(store);
    }
    refresh() {
        this.reload();
    }
}

// PlatformFormComponent
export class FormComponent extends AppBaseFormComponent<FormVm> {
    protected initialFormConfig = () => ({
        controls: { email: new FormControl(this.currentVm().email, [Validators.required], [ifAsyncValidator(() => !this.isViewMode, uniqueValidator)]) },
        dependentValidations: { email: ['name'] }
    });
    submit() {
        if (this.validateForm()) {
            /* save */
        }
    }
}
```

#### 4. API Service

```typescript
@Injectable({ providedIn: 'root' })
export class EntityApiService extends PlatformApiService {
    protected get apiUrl() {
        return environment.apiUrl + '/api/Entity';
    }
    getAll(q?: Query): Observable<Entity[]> {
        return this.get('', q);
    }
    save(cmd: SaveCmd): Observable<Result> {
        return this.post('', cmd);
    }
    search(c: Search): Observable<Entity[]> {
        return this.post('/search', c, { enableCache: true });
    }
}
```

#### 5. FormArray

```typescript
protected initialFormConfig = () => ({
  controls: {
    items: { modelItems: () => vm.items, itemControl: (i, idx) => new FormGroup({ name: new FormControl(i.name, [Validators.required]) }) }
  }
});
```

#### 6. Advanced Frontend

```typescript
// @Watch decorator
@Watch('onChanged') public data?: Data;
@WatchWhenValuesDiff('search') public term = '';
private onChanged(v: Data, c: SimpleChange<Data>) { if (!c.isFirstTimeSet) this.update(); }

// RxJS operators
this.search$.pipe(skipDuplicates(500), applyIf(this.enabled$, debounceTime(300)), tapOnce({ next: v => this.init(v) }), distinctUntilObjectValuesChanged(), this.untilDestroyed()).subscribe();

// Form validators
new FormControl('', [Validators.required, noWhitespaceValidator, startEndValidator('err', c => c.parent?.get('start')?.value, c => c.value)], [ifAsyncValidator(c => c.valid, uniqueValidator)]);

// Utilities
import { date_format, date_addDays, date_timeDiff, list_groupBy, list_distinctBy, list_sortBy, string_isEmpty, string_truncate, dictionary_map, dictionary_filter, immutableUpdate, deepClone, removeNullProps, guid_generate, task_delay, task_debounce } from '@libs/platform-core';

// Module import
import { PlatformCoreModule } from '@libs/platform-core';
@NgModule({ imports: [PlatformCoreModule] })

// Platform Directives
<div platformSwipeToScroll>/* Horizontal scroll with drag */</div>
<input [platformDisabledControl]="isDisabled" />

// PlatformComponent APIs
trackByItem = this.ngForTrackByItemProp<User>('id');
trackByList = this.ngForTrackByImmutableList(this.users);
storeSubscription('dataLoad', this.data$.subscribe(...));
cancelStoredSubscription('dataLoad');
isLoading$('req1'); isLoading$('req2');
getAllErrorMsgs$(['req1', 'req2']);
loadingRequestsCount(); reloadingRequestsCount();
protected get devModeCheckLoadingStateElement() { return '.spinner'; }
protected get devModeCheckErrorStateElement() { return '.error'; }

// Store with caching
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
  protected get enableCaching() { return true; }
  protected cachedStateKeyName = () => 'MyStore';
  protected vmConstructor = (d?: Partial<MyVm>) => new MyVm(d);
  protected beforeInitVm = () => this.loadInitialData();
  loadData = this.effectSimple(() => this.api.get().pipe(this.observerLoadingErrorState('load'), this.tapResponse(d => this.updateState({ data: d }))));
}
```

### Authorization

```csharp
// Controller
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost] public async Task<IActionResult> Save([FromBody] Cmd c) => Ok(await Cqrs.SendAsync(c));

// Handler validation
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
    => await v.AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin only")
              .AndAsync(_ => repo.AnyAsync(e => e.CompanyId == RequestContext.CurrentCompanyId()), "Same company");

// Entity filter
public static Expression<Func<E, bool>> AccessExpr(string userId, string companyId) => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);
```

```typescript
// Component
get canEdit() { return this.hasRole(PlatformRoles.Admin) && this.isOwnCompany(); }

// Template
@if (hasRole(PlatformRoles.Admin)) { <button (click)="delete()">Delete</button> }

// Route guard
canActivate(): Observable<boolean> { return this.authService.hasRole$(PlatformRoles.Admin); }
```

### Migration

```csharp
// EF Core
public partial class AddField : Migration { protected override void Up(MigrationBuilder m) { m.AddColumn<string>("Dept", "Employees"); } }

// MongoDB
public class MigrateData : PlatformMongoMigrationExecutor<ServiceDbContext>
{
    public override string Name => "20240115_Migrate";
    public override async Task Execute() => await RootServiceProvider.ExecuteInjectScopedPagingAsync(await repo.CountAsync(q => q.Where(...)), 200,
        async (skip, take, r, u) => { var items = await r.GetAllAsync(q => q.Skip(skip).Take(take)); await r.UpdateManyAsync(items, dismissSendEvent: true); return items; });
}

// Cross-DB migration (first-time setup, use events for ongoing sync)
public class SyncData : PlatformDataMigrationExecutor<TargetDbContext>
{
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2024, 1, 15);
    public override async Task Execute(TargetDbContext db) => await targetRepo.CreateManyAsync(
        (await sourceDbContext.Entities.Where(e => e.CreatedDate < cutoffDate).ToListAsync()).Select(e => e.MapToTargetEntity()));
}
```

### Helper vs Util

```csharp
// Helper (with dependencies)
public class EntityHelper { private readonly IRepo<E> repo; public async Task<E> GetOrCreateAsync(string code, CancellationToken ct) => await repo.FirstOrDefaultAsync(t => t.Code == code, ct) ?? await CreateAsync(code, ct); }

// Util (pure functions)
public static class EntityUtil { public static string FullName(E e) => $"{e.First} {e.Last}".Trim(); public static bool IsActive(E e) => e.Status == Active; }
```

### Advanced Backend

```csharp
.IsNullOrEmpty() / .IsNotNullOrEmpty() / .RemoveWhere(pred, out removed) / .UpsertBy(key, items, update) / .SelectList(sel) / .ThenSelect(sel) / .ParallelAsync(fn, max) / .AddDistinct(item, key)

var entity = dto.NotHasSubmitId() ? dto.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId()) : await repo.GetByIdAsync(dto.Id, ct).Then(x => dto.UpdateToEntity(x));

RequestContext.CurrentCompanyId() / .UserId() / .ProductScope() / .HasRequestAdminRoleInCompany()

var (a, b, c) = await (repo1.GetAllAsync(...), repo2.GetAllAsync(...), repo3.GetAllAsync(...));

public sealed class Helper : IPlatformHelper { private readonly IPlatformApplicationRequestContext ctx; public Helper(IPlatformApplicationRequestContextAccessor a) { ctx = a.Current; } }

.With(e => e.Name = x).PipeActionIf(cond, e => e.Update()).PipeActionAsyncIf(async () => await svc.Any(), async e => await e.Sync())

public static Expression<Func<E, bool>> ComplexExpr(int s, string c, int? m) => BaseExpr(s, c).AndAlso(e => e.User!.IsActive).AndAlsoIf(m != null, () => e => e.Start <= Clock.UtcNow.AddMonths(-m!.Value));

// Domain Service Pattern (strategy for permissions)
public static class PermissionService {
    static readonly Dictionary<string, IRoleBasedPermissionCheckHandler> RoleHandlers = ...;
    public static Expression<Func<E, bool>> GetCanManageExpr(IList<string> roles) => roles.Aggregate(e => false, (expr, role) => expr.OrElse(RoleHandlers[role].GetExpr()));
}

// Object Deep Comparison
if (prop.GetValue(entity).IsValuesDifferent(prop.GetValue(existing))) entity.AddFieldUpdatedEvent(prop, oldVal, newVal);

// Task Extensions
task.WaitResult();  // NOT task.Wait() - preserves stack trace
await target.WaitUntilGetValidResultAsync(t => repo.GetByIdAsync(t.Id), r => r != null, maxWaitSeconds: 30);
.ThenGetWith(selector)  // Returns (T, T1)
.ThenIfOrDefault(condition, nextTask, defaultValue)
```

### Anti-Patterns

```csharp
// ❌ Direct cross-service DB access → ✅ Use message bus
// ❌ Custom repository interface → ✅ Use platform repo + extensions
// ❌ Manual validation throw → ✅ Use PlatformValidationResult fluent API
// ❌ Side effects in handler → ✅ Use entity event handlers
// ❌ DTO mapping in handler → ✅ DTO owns mapping via MapToObject()/MapToEntity()

// ✅ Correct DTO mapping
public sealed class ConfigDto : PlatformDto<ConfigValue> { public override ConfigValue MapToObject() => new() { ClientId = ClientId }; }
var config = req.Config.MapToObject().With(p => p.Secret = encrypt(p.Secret));
```

```typescript
// ❌ Direct HttpClient → ✅ Extend PlatformApiService
// ❌ Manual signals → ✅ Use PlatformVmStore
// ❌ Missing untilDestroyed() → ✅ Always use .pipe(this.untilDestroyed())
```

### Templates

```csharp
public sealed class Save{E}Command : PlatformCqrsCommand<Save{E}CommandResult> { public string Name { get; set; } = ""; public override PlatformValidationResult<IPlatformCqrsRequest> Validate() => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Required"); }
internal sealed class Save{E}CommandHandler : PlatformCqrsCommandApplicationHandler<Save{E}Command, Save{E}CommandResult> { protected override async Task<Save{E}CommandResult> HandleAsync(Save{E}Command r, CancellationToken ct) { /* impl */ } }
```

```typescript
@Component({ selector: 'app-{e}-list', template: `<app-loading [target]="this">@if (vm(); as vm) { @for (i of vm.items; track i.id) { <div>{{i.name}}</div> } }</app-loading>`, providers: [{E}Store] })
export class {E}Component extends AppBaseVmStoreComponent<{E}State, {E}Store> { ngOnInit() { this.store.load(); } }
```

### Commands

```bash
dotnet build EasyPlatform.sln
dotnet run --project src/Backend/PlatformExampleApp.TextSnippet.Api
cd src/Frontend && npm install && nx serve playground-text-snippet
docker-compose -f src/platform-example-app.docker-compose.yml up -d
```

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed

---

## MANDATORY: Workflow Detection Reminder (READ THIS)

> **This section is intentionally placed at the end for maximum attention.** AI models attend most to the start and end of long prompts.

**Before writing ANY code or reading ANY file, you MUST:**

1. **DETECT** — Match the user's prompt against the workflow table (Feature, Bug Fix, Documentation, Refactoring, Code Review, Investigation)
2. **ANNOUNCE** — State: `"Detected: **{Workflow}** workflow. Following: {sequence}"`
3. **CREATE TODOS** — Track ALL workflow steps as todo items
4. **CONFIRM** (if applicable) — Ask: `"Proceed with this workflow? (yes/no/quick)"`
5. **EXECUTE** — Follow each step sequentially

**You MUST NOT:**

- Skip workflow detection because the task "looks simple"
- Read files or write code before announcing the workflow
- Handle a prompt containing error traces, bug reports, or multi-file changes without a workflow

**The ONLY exceptions (truly simple tasks):**

- Single-line typo fixes (e.g., fix a spelling error)
- User explicitly says "just do it" or "no workflow"
- User prefixes with `quick:` to bypass detection

**If in doubt, activate the workflow.** It is always better to follow the workflow and let the user say "quick" than to skip it and produce inconsistent results.
