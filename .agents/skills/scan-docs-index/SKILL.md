---
name: scan-docs-index
description: '[Documentation] Scan project and populate/sync docs/project-reference/docs-index-reference.md with documentation tree, file counts, category breakdown, doc relationships, and lookup table.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources, admit uncertainty, self-check output, cross-reference independently. Certainty without evidence = root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — Surgical updates only, NEVER full rewrite.
>
> 1. **Read existing doc** first — understand structure and manual annotations
> 2. **Detect mode:** Placeholder (headings only) → Init. Has content → Sync.
> 3. **Scan codebase** (grep/glob) for current state
> 4. **Diff** findings vs doc — identify stale sections only
> 5. **Update ONLY** diverged sections. Preserve manual annotations.
> 6. **Update metadata** (date, version) in frontmatter/header
> 7. **NEVER** rewrite entire doc. **NEVER** remove sections without evidence obsolete.

<!-- /SYNC:scan-and-update-reference-doc -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — stale instantly
> 2. No directory trees — use 1-line path conventions
> 3. No TOCs — AI reads linearly
> 4. One example per pattern — only if non-obvious
> 5. Lead with answer, not reasoning
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end

<!-- /SYNC:output-quality-principles -->

## Quick Summary

**Goal:** Scan the project's `docs/` directory → populate `docs/project-reference/docs-index-reference.md` with accurate documentation tree, file counts by category, doc relationships, and keyword-to-doc lookup table.

**Workflow:**

1. **Classify** — Detect doc organization type, scan mode
2. **Scan** — Count docs by category, trace relationships, build lookup
3. **Generate** — Build/update reference doc with verified counts and paths
4. **Fresh-Eyes** — Round 2 verification validates all counts and paths

**Key Rules:**

- Generic — discover everything dynamically, never hardcode project-specific values
- ALL file counts must be verified via glob, not copied from existing content
  **MUST ATTENTION** evidence gate required for EVERY count claim — never estimate

---

# Scan Docs Index

## Phase 0: Classify Doc Organization

**Before any other step**, run in parallel:

1. Read `docs/project-reference/docs-index-reference.md`
    - Detect mode: **init** (placeholder only) or **sync** (has real content)
    - In sync: note which sections exist and current file counts to diff

2. Detect documentation organization type:

| Signal                                    | Type                 | Scan Approach                                 |
| ----------------------------------------- | -------------------- | --------------------------------------------- |
| Structured `docs/{category}/` directories | Structured hierarchy | Scan per-category with phase table below      |
| Single flat `docs/` with all files        | Flat structure       | Single glob, categorize by filename prefix    |
| `wiki/` or external doc system            | Wiki-based           | Scan wiki directory, note external docs       |
| Mix of docs + inline README.md files      | Hybrid               | Scan both `docs/` and source-embedded READMEs |

3. Load service paths from `docs/project-config.json` if available

**Evidence gate:** Confidence <60% on organization type → ask user, DO NOT guess structure.

## Phase 1: Plan

Create task tracking entries for each scan dimension. **Do not start Phase 2 without tasks created.**

## Phase 2: Scan Documentation Tree

Write findings incrementally after each category — NEVER batch at end.

**Think (Coverage dimension):** Which directories exist under `docs/`? Which ones have content vs are empty/stub?

**Think (Accuracy dimension):** For each count in the existing doc, does the actual glob match? What's the delta?

**Think (Completeness dimension):** Are there markdown files outside documented directories (e.g., in `src/`, `.claude/`, project root)? Are those included in any category?

**Think (Discovery dimension):** Which files don't fit any existing category? Where do they go?

### Root-Level Docs

- Glob for `*.md` in project root (README.md, CLAUDE.md, CHANGELOG.md, etc.)
- Record each with one-line purpose description
- **Evidence gate:** File count verified via glob — NEVER estimate

### docs/ Directory

Scan each subdirectory with verified glob counts:

| Category                | Glob Pattern                                                                   | What to Extract                           |
| ----------------------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| project-reference/      | `docs/project-reference/**/*.md`                                               | File count (verified), list with purposes |
| business-features/      | `docs/business-features/**/*.md`                                               | Count per app, feature count              |
| operations              | `docs/getting-started.md`, `docs/deployment.md`, etc.                          | File count, list                          |
| design-system/          | `docs/design-system/**/*.md` or `docs/project-reference/design-system/**/*.md` | File count, app mapping                   |
| specs/                  | `docs/specs/**/*.md`                                                           | File count, module coverage               |
| architecture-decisions/ | `docs/architecture-decisions/**/*.md`                                          | ADR count                                 |
| templates/              | `docs/templates/**/*.md`                                                       | Template count and types                  |
| release-notes/          | `docs/release-notes/**/*.md`                                                   | File count                                |

**Uncategorized files discovery rule:** After scanning all categories above, run a broad glob for `docs/**/*.md` and diff against the union of all category globs. Files in the diff are uncategorized — create a separate "Uncategorized / Other" section for them. NEVER silently omit files.

### .claude/docs/

- Glob for `.claude/docs/**/*.md` — count and categorize
- Glob for `.claude/skills/**/*.md` — count skills

## Phase 3: Build Doc Relationship Map

**Think:** Which docs serve as entry points (README → guide chains)? Which docs are referenced from multiple places? Which are isolated?

Trace key doc relationships by grepping for markdown links between docs:

- Entry points (README → getting-started → deployment chain)
- CLAUDE.md → reference doc pointers
- Which docs link to which (cross-references)

## Phase 4: Build Lookup Table

For each `docs/business-features/{App}/` directory:

- Extract the app name and key business domain keywords
- Map keywords → directory path for the lookup table

For each `docs/project-reference/*.md`:

- Extract the domain covered
- Map keywords → file path

## Phase 5: Fresh-Eyes Verification

**Spawn a fresh sub-agent (zero memory)** to independently verify:

1. Sample 5 file paths from each category — do they exist? (Glob check)
2. Does the total count for each category match a fresh glob of that pattern?
3. Are there any files in `docs/**/*.md` that appear in no category? (Run the diff)
4. Does the lookup table have entries for all documented categories?
5. Are there duplicate entries in the lookup table (same path, different keyword)?
6. Are uncategorized files documented in a separate section?

**Do NOT proceed to Phase 6 until fresh-eyes verification passes.**

## Phase 6: Generate Reference Doc

Write to `docs/project-reference/docs-index-reference.md` with sections:

```markdown
<!-- Last scanned: {YYYY-MM-DD} -->

# Documentation Index Reference

> Auto-generated by `$scan-docs-index`. Do not edit manually.

## Documentation System

{total} markdown files across {N} categories. Last scanned: {date}.

## Documentation Graph

{ASCII tree with counts — counts from verified globs only}

## Key Doc Relationships

{ASCII relationship diagram — entry points and cross-references}

## Doc Lookup Guide

{keyword → path table}

## Uncategorized Files

{Files found by broad glob not in any category — with paths}
```

---

<!-- SYNC:scan-and-update-reference-doc:reminder -->

**IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.

<!-- /SYNC:scan-and-update-reference-doc:reminder -->
<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs in the skill output itself, 1 example per pattern, lead with answer.

<!-- /SYNC:output-quality-principles:reminder -->
<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid:
>
> **Verify AI-generated content against actual code.** AI hallucinates file paths and counts. Glob to confirm existence before documenting.
> **Trace full dependency chain after edits.** Always trace full chain.
> **Surface ambiguity before coding.** NEVER pick silently.
> **Update docs that embed canonical data when source changes.** Docs inlining counts go stale silently.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small task tracking tasks BEFORE starting
**IMPORTANT MUST ATTENTION** detect doc organization type in Phase 0 — scan approach depends on it
**IMPORTANT MUST ATTENTION** evidence gate for EVERY count — glob to verify, NEVER estimate or copy from existing content
**IMPORTANT MUST ATTENTION** write findings incrementally after each category — NEVER batch at end
**IMPORTANT MUST ATTENTION** run uncategorized file discovery — NEVER silently omit files that don't fit categories
**IMPORTANT MUST ATTENTION** Phase 5 fresh-eyes verification is mandatory before writing final doc

**Anti-Rationalization:**

| Evasion                                             | Rebuttal                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| "Count looks right from existing doc, skip glob"    | EVERY count requires fresh glob verification — no exceptions       |
| "Only need to check 3 paths"                        | Phase 5 has 6 specific checks — sample across all categories       |
| "All files fit into existing categories"            | Run the uncategorized discovery diff — NEVER assume full coverage  |
| "Round 2 verification not needed for small doc set" | Fresh-eyes mandatory — main agent's counts carry confirmation bias |
| "Lookup table doesn't need all keywords"            | Map keywords for EVERY documented category, not just top-level     |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.

## Learned Lessons

# Lessons Learned

> **[CRITICAL]** Hard-won project debugging/architecture rules. MUST ATTENTION apply BEFORE forming hypothesis or writing code.

## Quick Summary

**Goal:** Prevent recurrence of known failure patterns — debugging, architecture, naming, AI orchestration, environment.

**Top Rules (apply always):**

- MUST ATTENTION verify ALL preconditions (config, env, DB names, DI regs) BEFORE code-layer hypothesis
- MUST ATTENTION fix responsible layer — NEVER patch symptom sites with caller-specific defensive code
- MUST ATTENTION use `ExecuteInjectScopedAsync` for parallel async + repo/UoW — NEVER `ExecuteUowTask`
- MUST ATTENTION name by PURPOSE not CONTENT — adding member forces rename = abstraction broken
- MUST ATTENTION persist sub-agent findings incrementally after each file — NEVER batch at end
- MUST ATTENTION Windows bash: verify Python alias (`where python`/`where py`) — NEVER assume `python`/`python3` resolves

---

## Debugging & Root Cause Reasoning

- [2026-04-11] **Holistic-first: verify environment before code.** Failure → list ALL preconditions (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites) → verify each via evidence (grep/cat/query) BEFORE code-layer hypothesis. Worst rabbit holes: diving nearest layer while bug sits elsewhere — e.g., hours debugging "sync timeout", real cause: test appsettings pointing wrong DB. Cheapest check first.
- [2026-04-01] **Ask "whose responsibility?" before fixing.** Trace: bug in caller (wrong data) or callee (wrong handling)? Fix responsible layer — NEVER patch symptom site masking real issue.
- [2026-04-01] **Trace data lifecycle, not error site.** Follow data: creation → transformation → consumption. Bug usually where data created wrong, not consumed.
- [2026-04-01] **Code is caller-agnostic.** Functions/handlers/consumers don't know who invokes them. Comments/guards/messages describe business intent — NEVER reference specific callers (tests, seeders, scripts).

## Architecture Invariants

- [2026-03-31] **ParallelAsync + repo/UoW MUST use `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask`.** `ExecuteUowTask` creates new UoW but reuses outer DI scope (same DbContext) — parallel iterations sharing non-thread-safe DbContext silently corrupt data. `ExecuteInjectScopedAsync` creates new UoW + new DI scope (fresh repo per iteration).
- [2026-03-31] **Bus message naming MUST include service name prefix — core services NEVER consume feature events.** Prefix declares schema ownership (`AccountUserEntityEventBusMessage` = Accounts owns). Core services (Accounts, Communication) are leaders. Feature services (Growth, Talents) sending to core MUST use `{CoreServiceName}...RequestBusMessage` — never define own event for core to consume.

## Naming & Abstraction

- [2026-04-12] **Name PURPOSE not CONTENT — "OrXxx" anti-pattern.** `HrManagerOrHrOrPayrollHrOperationsPolicy` names set members, not what it guards. Add role → rename = broken abstraction. **Rule:** names express DOES/GUARDS, not CONTAINS. **Test:** adding/removing member forces rename? YES = content-driven = bad → rename to purpose (e.g., `HrOperationsAccessPolicy`). **Nuance:** "Or" fine in behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) — expresses HAPPENS, not membership.

## Environment & Tooling

- [2026-04-20] **Windows bash: NEVER assume `python`/`python3` resolves — verify alias first.** Python may not be in bash PATH under those names. Check: `where python` / `where py`. Prefer `py` (Windows Python Launcher) for one-liners, `node` if JS alternative exists.

> Test-specific lessons → `docs/project-reference/integration-test-reference.md` Lessons Learned section. Production-code anti-patterns → `docs/project-reference/backend-patterns-reference.md` Anti-Patterns section. Generic debugging/refactoring reminders → System Lessons in `.claude/hooks/lib/prompt-injections.cjs`.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** holistic-first: verify ALL preconditions (config, env, DB names, endpoints, DI regs) BEFORE code-layer hypothesis — cheapest check first
- **IMPORTANT MUST ATTENTION** fix responsible layer — NEVER patch symptom site; trace caller (wrong data) vs callee (wrong handling), fix root owner
- **IMPORTANT MUST ATTENTION** parallel async + repo/UoW → ALWAYS `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask` (shared DbContext = silent data corruption)
- **IMPORTANT MUST ATTENTION** bus message prefix = schema ownership; feature services NEVER define events for core services — use `{CoreServiceName}...RequestBusMessage`
- **IMPORTANT MUST ATTENTION** name by PURPOSE — adding/removing member forces rename = broken abstraction
- **IMPORTANT MUST ATTENTION** sub-agents MUST write findings after each file/section — NEVER batch all findings into one final write
- **IMPORTANT MUST ATTENTION** Windows bash: NEVER assume `python`/`python3` resolves — run `where python`/`where py` first, use `py` launcher or `node`

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`/simplify`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
