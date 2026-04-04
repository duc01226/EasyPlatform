---
name: review-post-task
version: 1.0.0
description: '[Code Quality] Two-pass code review for task completion'
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

<!-- SYNC:double-round-trip-review -->

> **Double Round-Trip Review** — TWO mandatory independent rounds. NEVER combine.
>
> **Round 1:** Normal review building understanding. Read all files, note issues.
> **Round 2:** MANDATORY re-read ALL files from scratch. Focus on:
>
> - Cross-cutting concerns missed in Round 1
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces (what should exist but doesn't)
>
> **Rules:** NEVER rely on Round 1 memory for Round 2. Final verdict must incorporate BOTH rounds.
> **Report must include `## Round 2 Findings` section.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:graph-impact-analysis -->

> **Graph Impact Analysis** — When `.code-graph/graph.db` exists, run `blast-radius --json` to detect ALL files affected by changes (7 edge types: CALLS, MESSAGE_BUS, API_ENDPOINT, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, INHERITS). Compute gap: impacted_files - changed_files = potentially stale files. Risk: <5 Low, 5-20 Medium, >20 High. Use `trace --direction downstream` for deep chains on high-impact files.

<!-- /SYNC:graph-impact-analysis -->

<!-- SYNC:logic-and-intention-review -->

> **Logic & Intention Review** — Verify WHAT code does matches WHY it was changed.
>
> 1. **Change Intention Check:** Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
> 2. **Happy Path Trace:** Walk through one complete success scenario through changed code
> 3. **Error Path Trace:** Walk through one failure/edge case scenario through changed code
> 4. **Acceptance Mapping:** If plan context available, map every acceptance criterion to a code change
>
> **NEVER mark review PASS without completing both traces (happy + error path).**

<!-- /SYNC:logic-and-intention-review -->

<!-- SYNC:bug-detection -->

> **Bug Detection** — MUST check categories 1-4 for EVERY review. Never skip.
>
> 1. **Null Safety:** Can params/returns be null? Are they guarded? Optional chaining gaps? `.find()` returns checked?
> 2. **Boundary Conditions:** Off-by-one (`<` vs `<=`)? Empty collections handled? Zero/negative values? Max limits?
> 3. **Error Handling:** Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
> 4. **Resource Management:** Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
> 5. **Concurrency (if async):** Missing `await`? Race conditions on shared state? Stale closures? Retry storms?
> 6. **Stack-Specific:** JS: `===` vs `==`, `typeof null`. C#: `async void`, missing `using`, LINQ deferred execution.
>
> **Classify:** CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO

<!-- /SYNC:bug-detection -->

<!-- SYNC:test-spec-verification -->

> **Test Spec Verification** — Map changed code to test specifications.
>
> 1. From changed files → find TC-{FEAT}-{NNN} in `docs/business-features/{Service}/detailed-features/{Feature}.md` Section 17
> 2. Every changed code path MUST map to a corresponding TC (or flag as "needs TC")
> 3. New functions/endpoints/handlers → flag for test spec creation
> 4. Verify TC evidence fields point to actual code (`file:line`, not stale references)
> 5. Auth changes → TC-{FEAT}-02x exist? Data changes → TC-{FEAT}-01x exist?
> 6. If no specs exist → log gap and recommend `/tdd-spec`
>
> **NEVER skip test mapping.** Untested code paths are the #1 source of production bugs.

<!-- /SYNC:test-spec-verification -->

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify both code AND documentation.

> **MANDATORY IMPORTANT MUST** Plan ToDo Task to READ the following project-specific reference docs:
>
> - `docs/project-reference/code-review-rules.md` — anti-patterns, review checklists, quality standards **(READ FIRST)** (content auto-injected by hook — check for [Injected: ...] header before reading)
> - `project-structure-reference.md` — service list, directory tree, conventions
>
> If files not found, search for: project documentation, coding standards, architecture docs.

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) MUST inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

## Quick Summary

**Goal:** Two-pass code review after task completion to catch issues before commit.

**Workflow:**

1. **Pass 1: File-by-File** — Review each changed file individually
2. **Pass 2: Holistic** — Assess overall approach, architecture, consistency
3. **Report** — Summarize critical issues and recommendations

**Key Rules:**

- Ensure quality: no flaws, no bugs, no missing updates, no stale content
- Check both code AND documentation for completeness
- Evidence-based findings with `file:line` references

Execute mandatory two-pass review protocol after completing code changes.
Focus: $ARGUMENTS

Activate `code-review` skill and follow its workflow with **post-task two-pass** protocol:

## Review Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- Do NOT accept code correctness at face value — verify by reading actual implementations
- Every finding must include `file:line` evidence (grep results, read confirmations)
- If you cannot prove a claim with a code trace, do NOT include it in the report
- Question assumptions: "Does this actually work?" → trace the call path to confirm
- Challenge completeness: "Is this all?" → grep for related usages across services
- Verify side effects: "What else does this change break?" → check consumers and dependents
- No "looks fine" without proof — state what you verified and how

## Core Principles (ENFORCE ALL)

**YAGNI** — Flag code solving hypothetical future problems (unused params, speculative interfaces, premature abstractions)
**KISS** — Flag unnecessarily complex solutions. Ask: "Is there a simpler way?"
**DRY** — Grep for similar/duplicate code across the codebase. If 3+ similar patterns exist, flag for extraction.
**Clean Code** — Readable > clever. Names reveal intent. Functions do one thing. No deep nesting (≤3 levels). Methods <30 lines.
**Follow Convention** — Before flagging ANY pattern violation, grep for 3+ existing examples. Codebase convention wins.
**No Flaws/No Bugs** — Trace logic paths. Verify edge cases (null, empty, boundary). Check error handling.
**Proof Required** — Every claim backed by `file:line` evidence or grep results. Speculation is forbidden.
**Doc Staleness** — Cross-reference changed files against related docs (feature docs, test specs, READMEs). Flag any doc that is stale or missing updates to reflect current code changes.

## Readability Checklist (MUST evaluate)

Before approving, verify the code is **easy to read, easy to maintain, easy to understand**:

- **Schema visibility** — If a function computes a data structure (object, map, config), a comment should show the output shape so readers don't have to trace the code
- **Non-obvious data flows** — If data transforms through multiple steps (A → B → C), a brief comment should explain the pipeline
- **Self-documenting signatures** — Function params should explain their role; flag unused params
- **Magic values** — Unexplained numbers/strings should be named constants or have inline rationale
- **Naming clarity** — Variables/functions should reveal intent without reading the implementation

## Protocol

**Pass 1:** Gather changes (`git diff`), apply project review checklist:

- Backend: platform repos, validation, events, DTOs
- Backend: seed data in data seeders (not migrations) — if data must exist after DB reset, it's a seeder
- Frontend: base classes, stores, untilDestroyed, BEM
- Architecture: layer placement, service boundaries
- **Convention:** grep for 3+ similar patterns to verify code follows codebase conventions
- **Correctness:** trace logic paths, check edge cases (null, empty, boundary values)
- **DRY:** grep for duplicate/similar code across codebase
- **YAGNI/KISS:** flag over-engineering, unnecessary abstractions, speculative features
- **Doc staleness:** cross-reference changed files against `docs/business-features/`, test specs, READMEs — flag stale docs

> **[IMPORTANT] Database Performance Protocol (MANDATORY):**
>
> 1. **Paging Required** — ALL list/collection queries MUST use pagination. NEVER load all records into memory. Verify: no unbounded `GetAll()`, `ToList()`, or `Find()` without `Skip/Take` or cursor-based paging.
> 2. **Index Required** — ALL query filter fields, foreign keys, and sort columns MUST have database indexes configured. Verify: entity expressions match index field order, database collections have index management methods, migrations include indexes for WHERE/JOIN/ORDER BY columns.

Fix issues found.

**Pass 2 (MANDATORY — Round 2):** Re-review ALL changes (original + corrections) with fresh eyes. Do NOT skip even if Pass 1 made no changes. Focus on what Pass 1 missed: cross-cutting concerns, subtle edge cases, naming inconsistencies, missing pieces, convention drift, over-engineering. Update report with Round 2 findings. See `<!-- SYNC:double-round-trip-review -->` block above.

**Round 2 Additional Focus:**

- Logic errors that Round 1 accepted at face value
- Bug patterns that only emerge when viewing cross-file interactions
- Test spec gaps visible only after seeing the full change set

**Final Report:** Task description, Pass 1/2 results, changes summary, issues fixed, remaining concerns.

## Integration Notes

- Auto-triggered by workflow orchestration after `/cook`, `/fix`, `/code`
- Can be manually invoked with `/review-post-task`
- For PR reviews, use `/code-review` instead
- Use `code-reviewer` subagent for complex reviews

---

## Systematic Review Protocol (for 10+ changed files)

> **When the changeset is large (10+ files), categorize files by concern, fire parallel `code-reviewer` sub-agents per category, then synchronize findings into a holistic report.** See `review-changes/SKILL.md` § "Systematic Review Protocol" for the full 4-step protocol (Categorize → Parallel Sub-Agents → Synchronize → Holistic Assessment).

---

## AI Agent Integrity Gate (NON-NEGOTIABLE)

> **Completion ≠ Correctness.** Before reporting ANY work done, prove it:
>
> 1. **Grep every removed name.** Extraction/rename/delete touched N files? Grep confirms 0 dangling refs across ALL file types.
> 2. **Ask WHY before changing.** Existing values are intentional until proven otherwise. No "fix" without traced rationale.
> 3. **Verify ALL outputs.** One build passing ≠ all builds passing. Check every affected stack.
> 4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
> 5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, and reachable by all consumers.

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
- **MUST** execute two review rounds (Round 1: understand, Round 2: catch missed issues)
  **MANDATORY IMPORTANT MUST** READ the following files before starting:
      <!-- SYNC:understand-code-first:reminder -->
- **MUST** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
      <!-- /SYNC:understand-code-first:reminder -->
      <!-- SYNC:design-patterns-quality:reminder -->
- **MUST** check DRY via OOP, right responsibility layer, SOLID. Grep for dangling refs after moves.
      <!-- /SYNC:design-patterns-quality:reminder -->
      <!-- SYNC:double-round-trip-review:reminder -->
- **MUST** execute TWO independent review rounds. Round 2 re-reads ALL files from scratch.
      <!-- /SYNC:double-round-trip-review:reminder -->
      <!-- SYNC:graph-impact-analysis:reminder -->
- **MUST** run graph impact analysis on changed files. Compute gap: impacted minus changed = potentially stale.
      <!-- /SYNC:graph-impact-analysis:reminder -->
      <!-- SYNC:logic-and-intention-review:reminder -->
- **MUST** verify WHAT code does matches WHY it changed. Trace happy + error paths.
      <!-- /SYNC:logic-and-intention-review:reminder -->
      <!-- SYNC:bug-detection:reminder -->
- **MUST** check null safety, boundaries, error handling, resource management for every review.
      <!-- /SYNC:bug-detection:reminder -->
      <!-- SYNC:test-spec-verification:reminder -->
- **MUST** map changed code paths to TC-{FEAT}-{NNN}. Flag untested paths.
      <!-- /SYNC:test-spec-verification:reminder -->
