# Development Rules

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

## Quick Summary

**Goal:** Enforce code quality, responsibility hierarchy, and evidence-based development across all implementation tasks.

**Workflow:** Understand code → Plan → Implement (follow Code Step Rule) → Review → Test → Doc check

**Key Rules:**

- **Understand code first** — READ existing code, search 3+ patterns, run graph trace before ANY modification
- **Code Step Rule** — Code is a tree of steps: no blank line = same step (parallel), blank line = new step (must consume all previous outputs). Fix violations via extract function or chaining.
- **Class responsibility** — Logic in LOWEST layer: Entity/Model > Service > Component/Handler
- **YAGNI / KISS / DRY** — No speculative abstractions, no over-engineering
- **Evidence-based** — Every claim needs `file:line` proof, confidence >80% to act
- **Zero broken builds** — Code must compile with no syntax errors

---

**IMPORTANT:** You ALWAYS follow these principles: **YAGNI (You Aren't Gonna Need It) - KISS (Keep It Simple, Stupid) - DRY (Don't Repeat Yourself)**

## General

- **File Naming**: kebab-case with meaningful names — LLMs must understand purpose from filename alone without reading content
- **File Size**: Keep code files under 200 lines — split into focused components, extract utilities, use composition over inheritance
- Use `docs-seeker` skill for fetching latest documentation via Context7 MCP
- Use `gh` bash command for Github features
- Use `ai-multimodal` skill for images, videos, documents
- Use `sequential-thinking` and `debug-investigate` skills for analysis and debugging
- **[IMPORTANT]** Follow codebase structure and code standards in `./docs` during implementation
- **[IMPORTANT]** Always implement real code — never simulate or mock implementations
- **[CRITICAL] Class Responsibility Rule:**
    - Logic belongs in LOWEST layer: Entity/Model > Service > Component/Handler
    - Backend: Entity mapping → Command.UpdateEntity() or DTO.MapToEntity(), NOT in Handler
    - Frontend: Constants, column arrays, role lists → static properties in Model class, NOT in Component
    - Frontend: Display logic (CSS class, status text) → instance getter in Model, NOT switch in Component

## Understand Code First (MANDATORY)

> **Understand-Code-First** — Do NOT write code, create plans, or attempt fixes until you READ existing code.
> Search 3+ similar implementations first. Run graph on key files (MANDATORY when graph.db exists).

- Read and understand existing code before making changes
- Validate assumptions with grep/read evidence, never guess
- Search for existing patterns before creating new ones
- **MUST USE graph trace** on key files when `.code-graph/graph.db` exists — after grep finds entry points, **STOP AND DECIDE:** run `python .claude/scripts/code_graph trace <file> --direction both --json` NOW. Use `--node-mode file` for overview (10-30x less noise), `--node-mode function` for detail. Graph reveals callers, importers, bus messages, event chains that grep cannot find. See CLAUDE.md "Graph Intelligence" section.

## Code Quality Guidelines

- **Zero tolerance for broken builds** — code must compile with no syntax errors
- Follow codebase structure and code standards in `./docs`
- Prioritize functionality and readability over strict style enforcement
- Handle edge cases and error scenarios; use try-catch & security standards
- Use `code-reviewer` agent to review code after every implementation
- **DO NOT** create new enhanced files — update existing files directly

<!-- SYNC:shared-protocol-duplication-policy -->

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first (canonical source), then grep `SYNC:protocol-name` and update all occurrences.

<!-- /SYNC:shared-protocol-duplication-policy -->

## Code Step Rule (Universal — All Languages)

**[CRITICAL]** Code is a tree of steps. Formatting MUST reveal the tree structure.

### Three Rules

| Rule                                      | Meaning                                                                                                  | C# Analyzer                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **No blank line** between statements      | Same step — independent/parallel work                                                                    | `STEP002` warns if blank line exists between independent statements |
| **Blank line** between statements         | New step — MUST consume all outputs from previous step                                                   | `STEP001` warns if missing; `STEP003` warns if outputs not consumed |
| **No flat mixing** of unrelated sub-tasks | If tasks A1 and A2 are independent but each has sub-steps, don't flatten all sub-steps into one sequence | Detected by STEP001/STEP002 combination                             |

### Anti-Pattern: Flat Mixing

```
// BAD — a2_a is unrelated to a1, but appears after a1's sub-steps with misleading blank lines
var a1_a = GetInput1();

var a1_b = Process(a1_a);  // depends on a1_a — blank line correct

// VIOLATION: a2 is independent of a1, yet a2's sub-steps are flattened alongside a1's
var a2_a = GetInput2();

var a2_b = Process(a2_a);

var result = Combine(a1_b, a2_b);
```

### Fix Option 1: Extract Functions

When sub-tasks have 2+ internal steps, extract each into a function. Call them on adjacent lines (same step = no blank line):

```
var a1 = GetA1();  // encapsulates a1_a → a1_b internally
var a2 = GetA2();  // encapsulates a2_a → a2_b internally

var result = Combine(a1, a2);  // new step — consumes all outputs from previous step
```

### Fix Option 2: Chaining

When sub-steps exist but you want to keep it flat, use chaining — indentation reveals the tree:

```csharp
// C#
var a1 = GetInput1().Pipe(x => Process(x));
var a2 = GetInput2().Pipe(x => Process(x));

var result = Combine(a1, a2);
```

```typescript
// TypeScript / RxJS
const a1$ = getInput1().pipe(map(x => process(x)));
const a2$ = getInput2().pipe(map(x => process(x)));

const result = combineLatest([a1$, a2$]);
```

```python
# Python — single expression = implicit chaining
a1 = process(get_input_1())
a2 = process(get_input_2())

result = combine(a1, a2)
```

### Decision: Extract vs Chain

| Condition                                         | Prefer           |
| ------------------------------------------------- | ---------------- |
| Sub-steps are 2+ lines each                       | Extract function |
| Sub-steps are 1 line each                         | Chaining         |
| Sub-steps reused elsewhere                        | Extract function |
| Language has good chaining (C# LINQ, JS pipe, Rx) | Chain            |
| Language lacks chaining (Python, Go)              | Extract function |
| Readability suffers from deep chaining            | Extract function |

### When to Extract Functions (Natural Signal)

The step rule naturally tells you when extraction is needed:

- Can't write a step without violating the rule → **extract a function**
- A "step" has internal blank lines → its sub-steps should be a function
- Two adjacent lines are independent but each needs multiple operations → extract each into a function, call both on the same step (no blank line between them)

## Task Decomposition & Iterative Quality

> **Iterative Phase Quality** — Score complexity before planning. Score >=6 → MUST decompose into phases.
> Each phase: <=5 files, <=3h effort, plan → implement → review → fix → verify. No skipping.

- **Principle:** Break large tasks into small phases. Each phase: plan → implement → review → fix → verify
- **Rule:** No phase >5 files or >3h effort. No monolithic plans for complex tasks.

## Pre-commit/Push Rules

- Run linting before commit
- Run tests before push (DO NOT ignore failed tests just to pass the build)
- Keep commits focused on actual code changes
- **DO NOT** commit confidential information (dotenv files, API keys, credentials) to git
- Clean, professional commit messages — conventional commit format

## Git Worktree Best Practices

When using `isolation: "worktree"` or manual git worktrees:

1. **Verify ignored** — Project-local worktree directories must be in `.gitignore`. Use `git check-ignore -q <dir>` to verify.
2. **Baseline tests** — Run tests in new worktree before changes. If tests fail, report and ask before proceeding.
3. **Project setup** — Auto-detect and run setup commands (`npm install`, `dotnet restore`, etc.)
4. **Report location** — Report worktree path, baseline test results, and readiness status.

## Bulk Edit Safety (MANDATORY for multi-file replacements)

When performing bulk find/replace across 3+ files:

1. **Preserve syntax integrity** — Never insert comments that break language syntax (e.g., `ClassName // comment<T>` breaks C# generics). Comments go AFTER complete type expressions.
2. **Grep verification** — After ALL replacements, grep entire repo for old term to catch missed references in docs, configs, catalog tables, tests.
3. **Doc cascade check** — When deleting/renaming components (agents, skills, hooks), map to affected docs:
    - `.claude/agents/**` → `.claude/docs/agents/README.md`, `.claude/docs/agents/agent-patterns.md`
    - `.claude/skills/**` → `.claude/docs/skills/README.md`
    - `.claude/hooks/**` → `.claude/docs/hooks/README.md`

## Doc Review (MANDATORY at session wrap-up)

After completing code changes, check for stale documentation:

1. Run `git diff --name-only` to list changed files
2. Map changed files to relevant docs:
    - Hook/skill/workflow files → `.claude/docs/` reference docs
    - Backend service code → `docs/business-features/` for affected module
    - Frontend app code → `docs/project-reference/frontend-patterns-reference.md` + business-feature docs
    - `CLAUDE.md` structural changes → `.claude/docs/README.md`
3. Flag stale docs in final review task or update immediately
4. Output `No doc updates needed` if no mapping applies

**Use `/watzup` skill** for automatic end-of-session doc check.

---

## Closing Reminders

- **MUST** understand existing code FIRST — read, grep 3+ patterns, run graph trace before ANY modification
- **MUST** follow Code Step Rule — no blank line = same step (parallel), blank line = new step (consume all previous outputs). Fix via extract function or chaining.
- **MUST** place logic in LOWEST layer: Entity/Model > Service > Component/Handler
- **MUST** ensure zero broken builds — code must compile with no syntax errors
- **MUST** follow YAGNI/KISS/DRY — no speculative abstractions
- **MUST** run doc review at session wrap-up (map changed files → affected docs)
- **MUST** activate relevant skills from catalog during the process
