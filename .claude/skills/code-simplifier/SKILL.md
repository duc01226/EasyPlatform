---
name: code-simplifier
version: 2.0.0
description: '[Code Quality] Simplifies and refines code for clarity, consistency, and maintainability while preserving all functionality. Focuses on recently modified code unless instructed otherwise.'
allowed-tools: Read, Edit, Glob, Grep, Task, Bash
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** before executing:

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->
<!-- SYNC:design-patterns-quality -->

> **Design Patterns Quality** — Priority checks for every code change:
>
> 1. **DRY via OOP:** Same-suffix classes (`*Entity`, `*Dto`, `*Service`) MUST share base class. 3+ similar patterns → extract to shared abstraction.
> 2. **Right Responsibility:** Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
> 3. **SOLID:** Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
> 4. **After extraction/move/rename:** Grep ENTIRE scope for dangling references. Zero tolerance.
> 5. **YAGNI gate:** NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
>
> **Anti-patterns to flag:** God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

<!-- /SYNC:design-patterns-quality -->

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) MUST inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

## Quick Summary

**Goal:** Simplify and refine code for clarity, consistency, and maintainability while preserving all functionality.

> **MANDATORY IMPORTANT MUST** Plan ToDo Task to READ the following project-specific reference docs:
>
> - `docs/project-reference/code-review-rules.md` — anti-patterns, review checklists, quality standards **(READ FIRST)**
> - `project-structure-reference.md` — project patterns and structure
>
> If files not found, search for: project documentation, coding standards, architecture docs.

**Workflow:**

1. **Identify Targets** — Recent git changes or specified files (skip generated/vendor)
2. **Analyze** — Find complexity hotspots (nesting >3, methods >20 lines), duplicates, naming issues
3. **Apply Simplifications** — One refactoring type at a time following KISS/DRY/YAGNI
4. **Verify** — Run related tests, confirm no behavior changes

**Key Rules:**

- Preserve all existing functionality; no behavior changes
- Follow platform patterns (Entity expressions, fluent helpers, project store base (search for: store base class), BEM)
- Keep tests passing after every change

### Frontend/UI Context (if applicable)

> When this task involves frontend or UI changes,

<!-- SYNC:ui-system-context -->

> **UI System Context** — For ANY task touching `.ts`, `.html`, `.scss`, or `.css` files:
>
> **MUST READ before implementing:**
>
> 1. `docs/project-reference/frontend-patterns-reference.md` — component base classes, stores, forms
> 2. `docs/project-reference/scss-styling-guide.md` — BEM methodology, SCSS variables, mixins, responsive
> 3. `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
>
> Reference `docs/project-config.json` for project-specific paths.

<!-- /SYNC:ui-system-context -->

- Component patterns: `docs/project-reference/frontend-patterns-reference.md`
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

# Code Simplifier Skill

Simplify and refine code for clarity, consistency, and maintainability.

## Usage

```
/code-simplifier                    # Simplify recently modified files
/code-simplifier path/to/file.ts    # Simplify specific file
/code-simplifier --scope=function   # Focus on function-level simplification
```

## Simplification Mindset

**Be skeptical. Verify before simplifying. Every change needs proof it preserves behavior.**

- Do NOT assume code is redundant — verify by tracing call paths and reading implementations
- Before removing/replacing code, grep for all usages to confirm nothing depends on the current form
- Before flagging a convention violation, grep for 3+ existing examples — codebase convention wins
- Every simplification must include `file:line` evidence of what was verified
- If unsure whether simplification preserves behavior, do NOT apply it

## What It Does

1. **Analyzes** code for unnecessary complexity
2. **Identifies** opportunities to simplify without changing behavior
3. **Applies** KISS, DRY, and YAGNI principles
4. **Preserves** all existing functionality
5. **Follows convention** — grep for 3+ existing patterns before applying simplifications

## Readability Checklist (MUST evaluate)

Before finishing, verify the code is **easy to read, easy to maintain, easy to understand**:

- **Schema visibility** — If a function computes a data structure (object, map, config), add a comment showing the output shape so readers don't have to trace the code
- **Non-obvious data flows** — If data transforms through multiple steps (A → B → C), add a brief comment explaining the pipeline
- **Self-documenting signatures** — Function params should explain their role; remove unused params
- **Magic values** — Replace unexplained numbers/strings with named constants or add inline rationale
- **Naming clarity** — Variables/functions should reveal intent without reading the implementation

## Simplification Targets

- Redundant code paths
- Over-engineered abstractions
- Unnecessary comments (self-documenting code preferred)
- Complex conditionals that can be flattened
- Verbose patterns that have simpler alternatives

## Execution

Use the `code-simplifier:code-simplifier` subagent:

```
Task(subagent_type="code-simplifier:code-simplifier", prompt="Review and simplify [target files]")
```

## Examples

**Before:**

```typescript
function getData() {
    const result = fetchData();
    if (result !== null && result !== undefined) {
        return result;
    } else {
        return null;
    }
}
```

**After:**

```typescript
function getData() {
    return fetchData() ?? null;
}
```

## Workflow

1. **Identify targets**
    - If no arguments: `git diff --name-only HEAD~1` for recent changes
    - If arguments provided: use specified files/patterns
    - Skip: generated code, migrations, vendor files

2. **Analyze each file**
    - Identify complexity hotspots (nesting > 3, methods > 20 lines)
    - Find duplicated code patterns
    - Check naming clarity

3. **Design Pattern Assessment** (per `design-patterns-quality-checklist.md`)
    - **DRY/Abstraction:** Flag duplicate patterns extractable to base class, generic, or helper
    - **Right Responsibility:** Verify logic is in lowest appropriate layer (Entity > Service > Component)
    - **Pattern Opportunities:** Check for creational/structural/behavioral pattern opportunities (switch→Strategy, scattered new→Factory, etc.)
    - **Anti-Patterns:** Flag God Objects, Copy-Paste, Circular Dependencies, Singleton overuse
    - **Guard against over-engineering:** Only recommend patterns with evidence of 3+ occurrences of the problem

4. **Apply simplifications**
    - One refactoring type at a time
    - Preserve all functionality
    - Follow platform patterns

5. **Verify**
    - Run related tests if available
    - Confirm no behavior changes

## Project Patterns

### Backend

- Extract to entity static expressions (search for: entity expression pattern)
- Use fluent helpers (search for: fluent helper pattern in docs/project-reference/backend-patterns-reference.md)
- Move mapping to DTO mapping methods (search for: DTO mapping pattern)
- Use project validation fluent API (see docs/project-reference/backend-patterns-reference.md)
- Check entity expressions have database indexes
- Verify document database index methods exist for collections

> **[IMPORTANT] Database Performance Protocol (MANDATORY):**
>
> 1. **Paging Required** — ALL list/collection queries MUST use pagination. NEVER load all records into memory. Verify: no unbounded `GetAll()`, `ToList()`, or `Find()` without `Skip/Take` or cursor-based paging.
> 2. **Index Required** — ALL query filter fields, foreign keys, and sort columns MUST have database indexes configured. Verify: entity expressions match index field order, database collections have index management methods, migrations include indexes for WHERE/JOIN/ORDER BY columns.

### Frontend

- Use `project store base (search for: store base class)` for state management
- Apply subscription cleanup pattern (search for: subscription cleanup pattern) to all subscriptions
- Ensure BEM class naming on all template elements
- Use platform base classes (`project base component (search for: base component class)`, `project store component base (search for: store component base class)`)

## Constraints

- **Preserve functionality** — No behavior changes
- **Keep tests passing** — Verify after changes
- **Follow patterns** — Use platform conventions
- **Document intent** — Add comments only where non-obvious
- **Doc staleness** — After simplifications, cross-reference changed files against related docs (feature docs, test specs, READMEs); flag any that need updating

<!-- SYNC:shared-protocol-duplication-policy -->

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first, then grep `SYNC:protocol-name` and update all occurrences.

<!-- /SYNC:shared-protocol-duplication-policy -->

## Graph Intelligence (RECOMMENDED if graph.db exists)

If `.code-graph/graph.db` exists, enhance analysis with structural queries:

- **Verify no callers break after simplification:** `python .claude/scripts/code_graph query callers_of <function> --json`
- **Check dependents:** `python .claude/scripts/code_graph query importers_of <module> --json`
- **Batch analysis:** `python .claude/scripts/code_graph batch-query file1 file2 --json`

> See `.claude/skills/shared/graph-intelligence-queries.md` for full query reference.

### Graph-Trace Before Simplification

When graph DB is available, BEFORE simplifying code, trace to understand what depends on it:

- `python .claude/scripts/code_graph trace <file-to-simplify> --direction downstream --json` — all downstream consumers that depend on current behavior
- Verify simplified code preserves the same interface for all traced consumers
- Cross-service MESSAGE_BUS consumers are especially fragile — they may depend on exact message shape

## Related

- `code-review`
- `refactoring`

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `quality-audit` workflow** (Recommended) — code-simplifier → review-changes → code-review
> 2. **Execute `/code-simplifier` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST — NO EXCEPTIONS** after completing this skill, you MUST use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/workflow-review-changes (Recommended)"** — Review all changes before commit
- **"/code-review"** — Full code review
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

> **Completion ≠ Correctness.** Before reporting ANY work done, prove it:
>
> 1. **Grep every removed name.** Extraction/rename/delete touched N files? Grep confirms 0 dangling refs across ALL file types.
> 2. **Ask WHY before changing.** Existing values are intentional until proven otherwise. No "fix" without traced rationale.
> 3. **Verify ALL outputs.** One build passing ≠ all builds passing. Check every affected stack.
> 4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
> 5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, and reachable by all consumers.

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST** READ the following files before starting:

<!-- SYNC:understand-code-first:reminder -->

- **MUST** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
      <!-- /SYNC:understand-code-first:reminder -->
      <!-- SYNC:design-patterns-quality:reminder -->
- **MUST** check DRY via OOP (same-suffix → base class), right responsibility (lowest layer), SOLID. Grep for dangling refs after changes.
      <!-- /SYNC:design-patterns-quality:reminder -->
      <!-- SYNC:ui-system-context:reminder -->
- **MUST** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
    <!-- /SYNC:ui-system-context:reminder -->
