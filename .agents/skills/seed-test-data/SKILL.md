---
name: seed-test-data
description: '[Dev Data] Use when you need to implement or enhance test data seeders that simulate QC happy-path scenarios via application-layer commands.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Implement or enhance test data seeders that create realistic, idempotent, valid test data through application-layer commands (NEVER direct DB writes) — simulating QC happy-path scenarios without corrupting domain state.

**Summary:**

- Seeders orchestrate the real app pipeline: invoke application-layer commands (which own validation, domain logic, and event side-effects) — never repo/DB inserts for domain entities, never duplicate command logic in the seeder.
- Four non-negotiable gates in order: (1) environment gate as the FIRST check, (2) count-before-seed idempotency, (3) loop from `existing_count` to `target_count` (never 0), (4) scoped DI per iteration — a shared scope silently corrupts the DbContext/session.
- Discover the project's seeder base class, env gate key, and count config key in Step 1 with `file:line` evidence; read the count multiplier from config and never hardcode it (zero → no-op).
- Always pre-read `docs/project-reference/seed-test-data-reference.md` + project-config `Data Seeders` group, then close with a fresh zero-memory `code-reviewer` round; re-review fully only after a validated fix.

**Workflow:**

1. **Phase 0** — Detect seeder task type (new / enhance / fix)
2. **Step 1** — Discover project seeder patterns, env gate key, count key
3. **Step 2** — Analyze feature scope + application commands
4. **Step 3** — Find or create seeder file
5. **Step 4** — Implement using language-agnostic algorithm
6. **Step 5** — Validate against universal rules
7. **Review** — Fresh sub-agent review round

**Key Rules:**

- MUST ATTENTION read `docs/project-reference/seed-test-data-reference.md` and `docs/project-config.json` (`Data Seeders` context group) before writing any seeder changes
- NEVER call repository/DB directly for domain data — use application-layer commands
- NEVER duplicate command logic — seeder orchestrates, commands own validation
- ALWAYS gate by environment first; ALWAYS check count before seeding
- ALWAYS read count multiplier from config (NEVER hardcode)
- ALWAYS loop from `existing_count` to `target_count` for restart-safety

## Phase 0: Detect Seeder Task Type

Before any other step, classify the request:

| Task Type        | Detection                                      | Action                                         |
| ---------------- | ---------------------------------------------- | ---------------------------------------------- |
| New seeder       | No existing seeder for feature area            | Create following discovered base class pattern |
| Enhance existing | Seeder exists, needs new scenarios             | Read existing seeder, add without breaking     |
| Fix broken       | Seeder fails env gate / idempotency / DI scope | Diagnose via Universal Rules, fix at root      |
| Unknown          | Request ambiguous                              | Ask user — NEVER assume                        |

```bash
rg "{Feature}Seeder|{Feature}SeedData|{Feature}TestData" {configured-source-roots} -l
```

## Universal Seed Data Rules

1. **Environment Gate** — First check in seeder. Dev/enabled-config only. NEVER production.
2. **Command-Based** — Calls application commands via full pipeline. Simulates QC manual testing. NEVER direct DB/repo writes for domain entities.
3. **No Duplicate Logic** — Seeder provides realistic inputs. Commands own validation, domain logic, event side-effects.
4. **Idempotency** — Check existing count → calculate remaining → seed only difference. Running N times converges to target.
5. **Count-Configurable** — Reads project config key (discovered Step 1). NEVER hardcode count.
6. **Restart-Safe** — Idempotency handles restarts: existing count found → seeds only missing remainder.
7. **Spec-Consistent (Spec-Loop Discipline — tailored)** — Seeders are orchestration, NOT business logic, so property/metamorphic generation and the MUTATION-SCORE gate are **N/A here** — do not force them. Apply the dual-feedback half: every seeded scenario MUST stay consistent with the **§5 invariants** (commands own validation; a seeder that produces state violating an invariant is a bug, not a fixture). If a seeder encodes a **domain rule** — a required precondition, a status/relationship the scenario assumes, a business default — that rule belongs in the **spec**, not silently in the seeder: feed it into BOTH the spec (the rule) AND, where it is testable, the tests — never a seeder-only fix.

## Protocol

### Step 1: Discover Seeder Patterns

Search for project seeder conventions:

```bash
# Search configured source roots using the repository's discovered seed-data naming conventions
rg "{configured-seeder-interface-or-base-patterns}|seeder|SeedData|DataSeed" {configured-source-roots} -l
```

Record with `file:line` evidence:

- Seeder base class / interface
- Seeder registration mechanism (DI, module, startup hook)
- Environment gate method/key name
- Count multiplier config key name

### Step 1.5: Verify Dev Config Keys

Confirm dev config has both env gate key and count key. If absent, add following project's dev config convention. — why: missing keys silently disable the gate or count, producing no-op or unbounded seeding.

### Step 2: Feature Scope Analysis

Identify before writing any code:

1. **Feature area** — domain entity/aggregate being seeded
2. **Application commands** — `rg "{Feature}.*Command|{configured-command-handler-patterns}" {configured-source-roots} -l`
3. **Dependencies** — data must exist (users, orgs, prerequisite records)
4. **Scenarios** — 3–5 realistic variations (standard, boundary, multi-actor)
5. **Target count** — clarify: 1 scenario or N repetitions per scenario

### Step 3: Find or Create Seeder

```bash
rg "{Feature}TestSeeder|{Feature}SeedingHelper|{Feature}TestDataSeeder" {configured-source-roots} -l
```

- **Exists** → enhance with new scenarios, do NOT break existing ones
- **Absent** → create following discovered base class pattern

### Step 4: Implement

**Algorithm (language-agnostic):**

```
seeder():
  if not is_development_environment(): return
  if not seed_enabled_in_config(): return
  target = config.get("SeedCount")
  if target <= 0: return
  existing = count_by_seeder_marker()
  if existing >= target: return
  for i from existing to target:
    call_application_command(build_scenario_input(i))
```

**Seeder marker** — stable predicate identifying seeded vs user data:

- Email prefix, created-by field, name prefix, or dedicated boolean flag
- MUST be deterministic across restarts

### Step 5: Validate

MUST ATTENTION verify all before complete:

- MUST ATTENTION environment gate is FIRST check — `file:line` evidence required
- MUST ATTENTION count-before-seed idempotency gate present — `file:line` evidence
- MUST ATTENTION loop starts at `existing_count`, not 0 — `file:line` evidence
- MUST ATTENTION only application-layer commands used for domain entities — NEVER repo/DB
- MUST ATTENTION no business logic or validation duplicated in seeder
- MUST ATTENTION seeder registered via project DI mechanism — `file:line` evidence
- MUST ATTENTION count config key read correctly (zero → no-op, NEVER hardcoded)
- MUST ATTENTION scoped DI per iteration — shared scope = DbContext/session corruption

## Sub-Agent Routing

| Task                                              | Sub-Agent               | When                        |
| ------------------------------------------------- | ----------------------- | --------------------------- |
| Discover seeders + commands across large codebase | `general-purpose`       | Steps 1-2                   |
| Review seeder compliance                          | `code-reviewer`         | Round 1 post-implementation |
| Seeder handles credentials/PII                    | `security-auditor`      | Security-sensitive patterns |
| Seeder runs 1000+ records                         | `performance-optimizer` | Performance-intensive       |

**All sub-agent prompts MUST include:**

```
Graph DB active. After grep finds key files, run:
python .claude/scripts/code_graph trace <file> --direction both --json
Pattern: grep → trace → grep verify.
```

## Anti-Patterns

| Anti-Pattern                            | Correct                                                               |
| --------------------------------------- | --------------------------------------------------------------------- |
| Direct repo insert for domain entities  | Call application command                                              |
| Seeder validates business rules         | Command owns validation; seeder provides valid inputs                 |
| No idempotency check                    | Check count first; seed only remaining                                |
| Hardcoded count (`for i in 0..10`)      | Read count from config key (discovered Step 1)                        |
| No environment gate                     | Check project env gate key first                                      |
| Shared DI scope across loop iterations  | Use project's scoped DI per iteration (prevents DbContext corruption) |
| Batch-all-then-write sub-agent findings | Persist findings per file; NEVER batch at end                         |

## Review Loop

**Round 1:** After implementation, spawn fresh `code-reviewer` sub-agent with zero memory of implementation:

```
Review seeder at [file:path]. Verify with file:line evidence for each:
1. Environment gate is FIRST check
2. Idempotency: count-before-seed pattern present
3. Loop starts at existing_count not 0
4. Zero application-layer command bypasses (direct repo/DB = FAIL)
5. No hardcoded count — config key read
6. Scoped DI per iteration
Report: PASS or FAIL with file:line for each finding.
```

**Fix loop:** If FAIL → validate findings → fix validated findings → restart full review from first phase. When restarted review uses sub-agents, NEVER reuse them across rounds. If same blocker repeats across 3 full invocations with no progress, escalate to user.
NEVER fix unvalidated findings. Do not spawn a fresh sub-agent only to re-review known findings before validation/fix.

---

## Workflow Recommendation

> **MUST ATTENTION — NOT IN WORKFLOW YET:** Use a direct user question:
>
> 1. **Activate `workflow-seed-test-data`** (Recommended) — scout → investigate → seed-test-data → review-changes → code-simplifier → docs-update
> 2. **Execute `$seed-test-data` directly** — run this skill standalone

---

## Next Steps

> **MUST ATTENTION** after completing: use a direct user question — do NOT skip:

- **"$workflow-review-changes (Recommended)"** — review all changes before commit
- **"$integration-test"** — write tests verifying idempotency and count compliance
- **"Skip, continue manually"** — user decides

---

> **[IMPORTANT]** task tracking for ALL tasks BEFORE starting. For simple tasks, ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone. — why: long context drifts from the file; the file is ground truth
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation. — why: divergent patterns fragment the codebase and slow every future reader
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE writing any seeder.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**MUST ATTENTION** cite `file:line` for every claim; declare confidence; "I don't have enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Implement/enhance seeders creating realistic, idempotent, valid test data through application-layer commands (NEVER direct DB writes) — simulate QC happy-path scenarios without corrupting domain state.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** MUST ATTENTION apply critical+sequential thinking; traced proof, confidence >80%.
- **Understand Code First:** ALWAYS search 3+ patterns and read code before writing.
- **Evidence:** MUST ATTENTION cite `file:line` per claim; declare confidence; "insufficient evidence" valid.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** NEVER call repo/DB directly for domain data — use application-layer commands — why: bypassing the command pipeline skips validation, domain logic, and event side-effects, producing invalid state that passes silently
**IMPORTANT MUST ATTENTION** ALWAYS gate by environment FIRST, then ALWAYS check count before seeding — why: env gate prevents prod corruption; count gate is the idempotency guarantee
**IMPORTANT MUST ATTENTION** loop from `existing_count` to `target_count` — NEVER from 0 — why: looping from 0 re-seeds on every restart and breaks restart-safety
**IMPORTANT MUST ATTENTION** scoped DI per iteration — shared DI scope = silent DbContext/session corruption
**IMPORTANT MUST ATTENTION** ALWAYS read count multiplier from the discovered config key — NEVER hardcode (zero → no-op, never unbounded loop)
**IMPORTANT MUST ATTENTION** NEVER duplicate command logic in the seeder — seeder provides realistic inputs, commands own validation/domain/events
**IMPORTANT MUST ATTENTION** every seeded scenario MUST stay consistent with the §5 universal invariants; if a seeder encodes a domain rule (precondition, status, default) feed it into the spec — and tests where testable — NEVER a seeder-only fix — why: a hidden rule in a seeder drifts from the spec and breaks future readers

**IMPORTANT MUST ATTENTION Evidence gate:** cite `file:line` for the env gate, count gate, loop start, DI scope, and seeder registration — confidence >80% to act, <60% DO NOT recommend; "Insufficient evidence" is valid output
**IMPORTANT MUST ATTENTION** search 3+ existing seeder patterns and READ them before writing — match the discovered base class / env-gate / count-key conventions exactly; verify the copied pattern shares the same preconditions (base class, scope, lifetime) before reuse
**IMPORTANT MUST ATTENTION** read `docs/project-reference/seed-test-data-reference.md` + `docs/project-config.json` (`Data Seeders` group) BEFORE any seeder change — project conventions override generic defaults
**IMPORTANT MUST ATTENTION** task tracking — break all work into tasks BEFORE starting; transition one task at a time, evidence per completed step
**IMPORTANT MUST ATTENTION** close with a fresh zero-memory `code-reviewer` round; full re-review is required ONLY after a validated fix cycle — a clean review pass ENDS the review; NEVER fix unvalidated findings

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                              |
| -------------------------------------------- | --------------------------------------------------------------------- |
| "Simple seeder, skip review loop"            | Idempotency bugs are silent. Run Round 1 always.                      |
| "Already know the base class"                | Show `file:line`. No proof = no knowledge.                            |
| "Environment gate is obvious"                | Verify it's FIRST check with `file:line` evidence.                    |
| "Just hardcode count for now"                | NEVER — config key required. Find it in Step 1.                       |
| "Seeder can validate this quickly"           | NEVER duplicate logic — command owns validation; seeder feeds inputs. |
| "Skip the reference docs, I know seeders"    | Project conventions override generic patterns. Read them first.       |
| "No graph.db, skip trace"                    | Use grep-only trace. Still run 3+ pattern search.                     |
| "Existing scenarios look fine, skip enhance" | Read all scenarios; enhancement may conflict — verify first.          |

**[TASK-PLANNING]** Before acting, break task into small todo tasks using task tracking.

**IMPORTANT MUST ATTENTION** NEVER direct repo/DB writes for domain data · ALWAYS env-gate FIRST then count-gate · `file:line` evidence for every gate (confidence >80%).

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
