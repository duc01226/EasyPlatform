---
name: seed-test-data
version: 2.0.0
description: '[Dev Data] Implement or enhance test data seeders that simulate QC happy-path scenarios via application-layer commands. Triggers: "seed data", "test data", "seeder", "generate dev data", "dummy data seeder", "add test data", "seed test".'
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TaskCreate, Agent
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** `TaskCreate` for ALL tasks BEFORE starting. For simple tasks, ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

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

## Quick Summary

**Goal:** Implement or enhance test data seeders — simulate QC happy-path scenarios via application-layer commands; NEVER direct DB writes.

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

Before any other step, classify request:

| Task Type        | Detection                                      | Action                                         |
| ---------------- | ---------------------------------------------- | ---------------------------------------------- |
| New seeder       | No existing seeder for feature area            | Create following discovered base class pattern |
| Enhance existing | Seeder exists, needs new scenarios             | Read existing seeder, add without breaking     |
| Fix broken       | Seeder fails env gate / idempotency / DI scope | Diagnose via Universal Rules, fix at root      |
| Unknown          | Request ambiguous                              | Ask user — NEVER assume                        |

```bash
grep -r "{Feature}Seeder\|{Feature}SeedData\|{Feature}TestData" src/ -l
```

## Universal Seed Data Rules

1. **Environment Gate** — First check in seeder. Dev/enabled-config only. NEVER production.
2. **Command-Based** — Calls application commands via full pipeline. Simulates QC manual testing. NEVER direct DB/repo writes for domain entities.
3. **No Duplicate Logic** — Seeder provides realistic inputs. Commands own validation, domain logic, event side-effects.
4. **Idempotency** — Check existing count → calculate remaining → seed only difference. Running N times converges to target.
5. **Count-Configurable** — Reads project config key (discovered Step 1). NEVER hardcode count.
6. **Restart-Safe** — Idempotency handles restarts: existing count found → seeds only missing remainder.

## Protocol

### Step 1: Discover Seeder Patterns

Search for project seeder conventions:

```bash
# .NET
grep -r "IDataSeeder\|ISeedDataHandler\|ApplicationDataSeeder\|CanSeedTestingData\|SeedingMinimumDummyItemsCount" src/ --include="*.cs" -l

# TypeScript
grep -r "seeder\|SeedData\|DataSeed" src/ --include="*.ts" -l
```

Record with `file:line` evidence:

- Seeder base class / interface
- Seeder registration mechanism (DI, module, startup hook)
- Environment gate method/key name
- Count multiplier config key name

### Step 1.5: Verify Dev Config Keys

Confirm dev config has both env gate key and count key. If absent, add following project's dev config convention.

### Step 2: Feature Scope Analysis

Identify before writing any code:

1. **Feature area** — domain entity/aggregate being seeded
2. **Application commands** — `grep -r "{Feature}*Command" src/ --include="*.cs" -l`
3. **Dependencies** — data must exist (users, orgs, prerequisite records)
4. **Scenarios** — 3–5 realistic variations (standard, boundary, multi-actor)
5. **Target count** — clarify: 1 scenario or N repetitions per scenario

### Step 3: Find or Create Seeder

```bash
grep -r "{Feature}TestSeeder\|{Feature}SeedingHelper\|{Feature}TestDataSeeder" src/ -l
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

**Round 2:** If FAIL → fix → new fresh sub-agent. Max 3 rounds → escalate to user.
NEVER reuse sub-agent across rounds. NEVER declare PASS after Round 1 alone.

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

## Closing Reminders

<!-- SYNC:understand-code-first:reminder -->

- **IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE writing any seeder.
    <!-- /SYNC:understand-code-first:reminder -->
    <!-- SYNC:evidence-based-reasoning:reminder -->
- **MUST ATTENTION** cite `file:line` for every claim; declare confidence; "I don't have enough evidence" is valid output.
    <!-- /SYNC:evidence-based-reasoning:reminder -->
    <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding.
  <!-- /SYNC:ai-mistake-prevention:reminder -->
- **IMPORTANT MUST ATTENTION** `TaskCreate` — break all work into tasks BEFORE starting
- **IMPORTANT MUST ATTENTION** NEVER call repo/DB directly — use application-layer commands
- **IMPORTANT MUST ATTENTION** ALWAYS gate by environment FIRST; ALWAYS check count before seeding
- **IMPORTANT MUST ATTENTION** loop from `existing_count` to `target_count` — NEVER from 0
- **IMPORTANT MUST ATTENTION** scoped DI per iteration — shared DI scope = silent DbContext corruption
- **IMPORTANT MUST ATTENTION** NEVER declare PASS after Round 1 alone — fresh sub-agent Round 2 required

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                     |
| -------------------------------------------- | ------------------------------------------------------------ |
| "Simple seeder, skip review loop"            | Idempotency bugs are silent. Run Round 1 always.             |
| "Already know the base class"                | Show `file:line`. No proof = no knowledge.                   |
| "Environment gate is obvious"                | Verify it's FIRST check with `file:line` evidence.           |
| "Just hardcode count for now"                | NEVER — config key required. Find it in Step 1.              |
| "No graph.db, skip trace"                    | Use grep-only trace. Still run 3+ pattern search.            |
| "Existing scenarios look fine, skip enhance" | Read all scenarios; enhancement may conflict — verify first. |

**[TASK-PLANNING]** Before acting, break task into small todo tasks using `TaskCreate`.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->
