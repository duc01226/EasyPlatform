---
name: seed-test-data
version: 2.1.0
description: '[Dev Data] Use when you need to implement or enhance test data seeders that simulate QC happy-path scenarios via application-layer commands.'
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TaskCreate, Agent
---

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

> **MUST ATTENTION — NOT IN WORKFLOW YET:** Use `AskUserQuestion`:
>
> 1. **Activate `workflow-seed-test-data`** (Recommended) — scout → investigate → seed-test-data → review-changes → code-simplifier → docs-update
> 2. **Execute `/seed-test-data` directly** — run this skill standalone

---

## Next Steps

> **MUST ATTENTION** after completing: use `AskUserQuestion` — do NOT skip:

- **"/workflow-review-changes (Recommended)"** — review all changes before commit
- **"/integration-test"** — write tests verifying idempotency and count compliance
- **"Skip, continue manually"** — user decides

---

> **[IMPORTANT]** `TaskCreate` for ALL tasks BEFORE starting. For simple tasks, ask user whether to skip.

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
**IMPORTANT MUST ATTENTION** `TaskCreate` — break all work into tasks BEFORE starting; transition one task at a time, evidence per completed step
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

**[TASK-PLANNING]** Before acting, break task into small todo tasks using `TaskCreate`.

**IMPORTANT MUST ATTENTION** NEVER direct repo/DB writes for domain data · ALWAYS env-gate FIRST then count-gate · `file:line` evidence for every gate (confidence >80%).
