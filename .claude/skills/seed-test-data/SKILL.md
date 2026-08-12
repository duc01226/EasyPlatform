---
name: seed-test-data
version: 2.2.0
description: '[Dev Data] Use when you need to implement or enhance test data seeders that simulate QC happy-path scenarios via application-layer commands. Flag: --mode=review reviews a target seeder (or the current changes / current work-context result) against every universal seed-data rule AND the project-specific seeder conventions — read-only, evidence-backed PASS/FAIL.'
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TaskCreate, Agent
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Stand up **configurable, local-dev-only** test-data seeders — **enabled by default ONLY on local/dev** — that auto-seed each feature's happy-path scenarios by calling the **same public entry-point application commands a real user / QC tester would** (NEVER direct DB writes), so the system **self-tests its main cases** like a QC engineer exercising them by hand; a **configurable seed count** repeats each scenario to BOTH **cover the main cases** AND **enrich data volume** (many simulated users) for **performance testing** + realistic **first-time-init** data, **idempotent + restart-safe** (never re-seeds already-seeded data; resumes from the last count toward target X, at 50% → continue until X), **defaulting the count small** when nothing is configured — and **ALWAYS finding the project's existing seed-data convention FIRST**.

**Summary:**

- **Find the existing convention FIRST.** Before designing anything, discover the project's seeder base class, env-gate key, count config key, and registration with `file:line` evidence (Step 1) — match it exactly; never invent a parallel mechanism.
- Seeders orchestrate the real app pipeline like a real user: invoke the **public entry-point application commands** (which own validation, domain logic, and event side-effects) — never repo/DB inserts for domain entities, never duplicate command logic in the seeder.
- **Dual purpose, one mechanism — a configurable count:** repeat each happy-path scenario N times to (a) self-test the main cases (QC mimic) and (b) enrich data volume for many-users / performance / first-init realism. Read the count from config (never hardcode); **default small** when unset; zero → no-op.
- Four non-negotiable gates in order: (1) **environment gate** as the FIRST check (local-dev/enabled-config only), (2) **count-before-seed idempotency** (no re-seed when already seeded), (3) **restart-safe loop** from `existing_count` to `target_count` (never 0 — resume the remainder after stop/restart), (4) scoped DI per iteration — a shared scope silently corrupts the DbContext/session.
- Always pre-read `docs/project-reference/seed-test-data-reference.md` + project-config `Data Seeders` group, then close with a fresh zero-memory `code-reviewer` round; re-review fully only after a validated fix.
- **Two modes — surface the flag:** default **Generate** (implement / enhance / fix a seeder); **`--mode=review`** = READ-ONLY convention audit grading a target (prompt → current changes → work-context) against EVERY universal rule + project conventions with `file:line` PASS/FAIL — routes confirmed fixes back to Generate, NEVER edits the seeder itself.
- **Main steps to run (Generate, in order — do not skip):** Phase 0 detect task type (new/enhance/fix) → Step 1 discover conventions (base class, env-gate key, count key, registration) → Step 1.5 verify dev-config keys exist → Step 2 feature scope + application commands → Step 3 find/create seeder → Step 4 implement (env-gate FIRST → config count → idempotency → restart-safe loop → scoped DI) → Step 5 validate every gate with `file:line` → Step 7 `--mode=review` self-audit on the changed code → fresh `code-reviewer` round → `/changes-review` (final).

**Workflow (Generate mode — default):**

1. **Phase 0** — Detect seeder task type (new / enhance / fix)
2. **Step 1** — Discover project seeder patterns, env gate key, count key
3. **Step 2** — Analyze feature scope + application commands
4. **Step 3** — Find or create seeder file
5. **Step 4** — Implement using language-agnostic algorithm
6. **Step 5** — Validate against universal rules
7. **Self-Review** — Re-run THIS skill in `--mode=review` over the changed seeder code (convention gate)
8. **Review** — Fresh sub-agent review round, then hand off to `/changes-review`

**Modes:**

- **Default (generate)** — implement / enhance / fix seeders. Everything in the Generate-mode Protocol below applies. The generate-mode task plan MUST end by re-running this skill in `--mode=review` (Step 7) BEFORE the `/changes-review` hand-off.
- **`--mode=review`** (read-only convention audit) — review a target against EVERY universal seed-data rule AND the project-specific seeder conventions, with `file:line` evidence and a PASS/FAIL verdict. Makes NO code changes; reports findings and routes confirmed defects back to generate mode for the fix. See [Mode: Review](#mode-review-seed-data-convention-audit).

**Key Rules:**

- ALWAYS find the project's existing seed-data convention FIRST — read `docs/project-reference/seed-test-data-reference.md` and `docs/project-config.json` (`Data Seeders` context group) before writing any seeder changes; match the discovered pattern, never invent a new one
- ENABLE seeding by default ONLY on a local/development environment — the environment gate is the FIRST check, NEVER production
- SEED like a real user / QC tester — call the public entry-point application commands; NEVER call repository/DB directly for domain data
- NEVER duplicate command logic — seeder orchestrates, commands own validation
- ALWAYS make the seed count configurable and read it from config (NEVER hardcode); **default to a small number when nothing is configured**; zero → no-op
- A configurable count serves BOTH goals — self-test the main happy-path cases AND enrich data volume (many simulated users) for performance testing and realistic first-time-init data
- GUARANTEE idempotency — check count before seeding; never re-seed already-seeded data on restart
- ALWAYS loop from `existing_count` to `target_count` so stop/restart resumes the remainder (target X, at 50% → continue until X), never re-seeding from 0
- SEED only states the application could actually produce — application-level operations guarantee reachability by construction; a direct store write fabricating an otherwise-unreachable state MUST be commented with why it is legitimate, and seeded entities MUST carry plausible relative timing rather than one shared instant

## Mode Routing (FIRST decision)

Before Phase 0, route on the invocation flag:

| Signal                                                              | Mode                   | Go to                                                   |
| ------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------- |
| `--mode=review` flag, OR prompt asks to review/audit/check a seeder | **Review**             | [Mode: Review](#mode-review-seed-data-convention-audit) |
| Any other invocation (implement / enhance / fix a seeder)           | **Generate** (default) | Phase 0 below                                           |

> **MUST ATTENTION** Generate mode OWNS the fix; Review mode is READ-ONLY and only reports. When Review mode finds a defect, it routes the fix back through Generate mode — it never edits the seeder itself.

## Phase 0: Detect Seeder Task Type _(Generate mode)_

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

> **Rule 0 — Convention First (priority before all others):** ALWAYS discover and follow the project's EXISTING seed-data convention before doing anything — base class, env-gate key, count config key, registration, seeder marker. Match it with `file:line` evidence; never invent a parallel mechanism. If no convention exists, propose the smallest one that fits the project's stack.

1. **Environment Gate (local-dev default-only)** — First check in seeder. Enabled by DEFAULT only on a local/development environment (or an explicit enable-config flag). NEVER seeds in production. The purpose is auto-setting-up feature test data on local/first-init, not a production data path.
2. **Command-Based (mimic a real user / QC tester)** — Seeds by calling the same PUBLIC entry-point application commands a real user or QC engineer would invoke, via the full pipeline (validation + domain logic + events). This is automated happy-path self-testing. NEVER direct DB/repo writes for domain entities.
3. **No Duplicate Logic** — Seeder provides realistic inputs. Commands own validation, domain logic, event side-effects.
4. **Idempotency (no re-seed when already seeded)** — Check existing count → calculate remaining → seed only the difference. On restart with data already seeded, seed NOTHING. Running N times converges to the target, never duplicating.
5. **Count-Configurable (dual purpose, small default)** — Read the seed count/times from the project config key (discovered Step 1); NEVER hardcode. **Default to a small number when nothing is configured.** The same count serves BOTH goals: repeating each scenario like a QC tester running it many times exercises the main cases AND enriches data volume (many simulated users) for performance testing and realistic first-time-init data. Zero → no-op.
6. **Restart-Safe (resume from last count)** — Supports stop/start/restart any number of times: the loop runs from `existing_count` to `target_count`, so if the target is X and only 50% of X is currently seeded, it continues until X is reached — never restarting from 0.
7. **Real-World Reachable State (seed only what the app could produce)** — Every seeded entity MUST represent a state the application itself could have produced. This is the deeper reason Rule 2 exists: an application-level operation can only ever leave reachable state behind. Where a direct store write is genuinely unavoidable, it MUST carry a comment stating WHY that state is legitimate (bootstrapping legacy/migrated data, an externally-owned record, a deliberately corrupt fixture for repair testing) — unexplained, it is a defect, not a fixture. Seeded entities MUST also carry **plausible relative timing**: stagger creation/update/activity stamps across a realistic span instead of stamping every record with one shared instant. — why: a corpus the application could never produce makes every test over it prove nothing, and a corpus where everything happened in the same millisecond hides ordering defects and makes time-window, sort, and pagination behaviour untestable.
8. **Spec-Consistent (Spec-Loop Discipline — tailored)** — Seeders are orchestration, NOT business logic, so property/metamorphic generation and the MUTATION-SCORE gate are **N/A here** — do not force them. Apply the dual-feedback half: every seeded scenario MUST stay consistent with the **§5 invariants** (commands own validation; a seeder that produces state violating an invariant is a bug, not a fixture). If a seeder encodes a **domain rule** — a required precondition, a status/relationship the scenario assumes, a business default — that rule belongs in the **spec**, not silently in the seeder: feed it into BOTH the spec (the rule) AND, where it is testable, the tests — never a seeder-only fix.

## Protocol _(Generate mode)_

### Generate-mode Task Plan (TaskCreate — required)

> **MUST ATTENTION** `TaskCreate` ALL of these BEFORE the first edit. The plan ALWAYS ends with a `--mode=review` self-audit, and `--mode=review` ALWAYS precedes the `/changes-review` hand-off — changes-review stays the final step.

1. Discover seeder patterns, env-gate key, count key (Step 1) — `file:line` evidence.
2. Verify dev config has env-gate + count keys (Step 1.5).
3. Analyze feature scope + application commands (Step 2).
4. Find or create the seeder file (Step 3).
5. Implement using the language-agnostic algorithm (Step 4).
6. Validate against the universal rules (Step 5) — `file:line` for every gate.
7. **Self-review the changed seeder code by re-running THIS skill in `--mode=review`** (convention gate over the just-changed code — MUST be a task, not optional). Fix any FAIL through this generate flow, then re-review.
8. Fresh zero-memory `code-reviewer` round (Review Loop).
9. Hand off to `/changes-review` (final step — review all changes before commit).
10. Analyze AI mistakes & lessons learned.

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
  if not is_local_development_environment(): return   # default-enabled on local/dev only, NEVER prod
  if not seed_enabled_in_config(): return             # explicit enable flag (default on for local)
  target = config.get("SeedCount", SMALL_DEFAULT)     # configurable; small default when unset
  if target <= 0: return                              # zero → no-op
  existing = count_by_seeder_marker()                 # how much is already seeded
  if existing >= target: return                       # idempotent: already seeded → seed NOTHING
  for i from existing to target:                      # restart-safe: resume the remainder (e.g. 50% → target)
    call_application_command(build_scenario_input(i)) # public entry command, like a real user / QC tester
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
- MUST ATTENTION every seeded state is one the application could actually produce; any unavoidable direct store write carries a comment justifying WHY that state is legitimate — `file:line` evidence
- MUST ATTENTION seeded entities carry plausible relative timing (staggered stamps), NEVER one shared instant

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

| Anti-Pattern                                        | Correct                                                                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Direct repo insert for domain entities              | Call application command                                                                                               |
| Seeder validates business rules                     | Command owns validation; seeder provides valid inputs                                                                  |
| No idempotency check                                | Check count first; seed only remaining                                                                                 |
| Hardcoded count (`for i in 0..10`)                  | Read count from config key (discovered Step 1)                                                                         |
| No environment gate                                 | Check project env gate key first                                                                                       |
| Shared DI scope across loop iterations              | Use project's scoped DI per iteration (prevents DbContext corruption)                                                  |
| Seeded state no application operation could produce | Seed it through an application-level operation; if a direct write is unavoidable, comment WHY that state is legitimate |
| Every seeded record sharing one creation instant    | Stagger stamps across a realistic span so ordering / time-window behaviour stays testable                              |
| Batch-all-then-write sub-agent findings             | Persist findings per file; NEVER batch at end                                                                          |

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

## Mode: Review (seed-data convention audit)

> **Invoke with `--mode=review`.** READ-ONLY audit of a seeder target against EVERY [Universal Seed Data Rule](#universal-seed-data-rules) AND the project-specific seeder conventions. Produces a per-principle PASS/FAIL with `file:line` evidence. This mode makes **NO code changes** — it reports findings and routes confirmed defects back to Generate mode for the fix.

### R0 — Resolve the review target

Determine WHAT to review, in priority order:

1. **Explicit target in the user prompt** — a named seeder file / class / feature area → review exactly that.
2. **Else → current changes** — `git diff --name-only` plus staged (`git diff --cached --name-only`) and untracked, filtered to seeder files using the discovered seeder naming (Step 1 / reference doc). Review every changed or added seeder.
3. **Else → current work-context result** — the seeder(s) created or edited earlier in THIS session / work context.

If none resolve → ask the user which seeder to review. NEVER assume a target.

### R1 — Read the conventions BEFORE reviewing (BLOCKING)

MUST ATTENTION read, in full, before forming ANY verdict:

- `docs/project-reference/seed-test-data-reference.md` — project seeder locations, base class, env-gate key, count config key, DI/UoW scope strategy, Required Patterns, Verification Checklist.
- `docs/project-config.json` → `Data Seeders` context group — configured source roots, naming conventions, run commands.
- The [Universal Seed Data Rules](#universal-seed-data-rules) (1–8) in this skill — the principles being graded.
- The target seeder file(s) themselves — re-read in full; NEVER review from memory.
- Step 1 discovery: confirm the project's ACTUAL seeder base class, env-gate key, and count key with `file:line` — the review grades against THESE, not generic defaults.

> If the reference doc is still a skeleton (`TODO` placeholders), say so explicitly, grade against discovered `file:line` conventions instead, and raise the missing/incomplete project reference as its own finding.

### R2 — Review checklist (grade EVERY item: `file:line` evidence or FAIL)

**Universal rules:**

- [ ] **Environment gate is the FIRST check** — dev/enabled-config only, NEVER production.
- [ ] **Command-based** — domain entities created ONLY via application-layer commands; ZERO direct repo/DB writes.
- [ ] **No duplicated logic** — seeder feeds realistic inputs; commands own validation / domain / event side-effects.
- [ ] **Idempotency** — count-before-seed gate present; running N times converges to target (no duplicates).
- [ ] **Count-configurable** — count read from the discovered config key; NEVER hardcoded (zero → no-op).
- [ ] **Restart-safe loop** — loop starts at `existing_count`, NEVER 0.
- [ ] **Scoped DI per iteration** — fresh scope per loop iteration; no shared DbContext/session.
- [ ] **Real-world reachable state** — every seeded entity is a state the application itself could produce; any direct store write fabricating an otherwise-unreachable state carries a comment justifying WHY it is legitimate; seeded entities carry plausible relative timing, not one shared instant.
- [ ] **Spec-consistency** — every seeded scenario satisfies the §5 invariants; any encoded domain rule (precondition / status / default) is reflected in the spec (and tests where testable), not seeder-only.

**Project-specific conventions (from the reference doc):**

- [ ] Seeder lives in the configured folder and extends the project's discovered base class / interface.
- [ ] Registered via the project's documented DI / registration mechanism.
- [ ] Env-gate key + count key match the documented keys AND exist in dev config.
- [ ] Seeder marker (email/name prefix, created-by, dedicated flag) is deterministic across restarts.
- [ ] Conforms to the reference doc's Required Patterns + Verification Checklist.

### R3 — Verdict

Per item: **PASS / FAIL / N/A** with `file:line` evidence and confidence (>80% required to assert a FAIL; <60% → "insufficient evidence", verify before grading). Overall verdict is **PASS only if ZERO universal-rule FAILs**.

- **PASS** → report the evidence table; if idempotency/count tests are absent, suggest `/integration-test`.
- **FAIL** → list each violation with the responsible `file:line` and the correct pattern (from the [Anti-Patterns](#anti-patterns) table / reference doc). Route the fix back through **Generate mode** (Phase 0 → "Fix broken"); after the fix lands, RE-RUN `--mode=review` over the changed code. NEVER edit the seeder inside review mode.

### Review-mode task plan (TaskCreate — required)

1. Resolve the review target (prompt → current changes → work-context).
2. Read `seed-test-data-reference.md` + project-config `Data Seeders` group + Universal Rules + the target file(s).
3. Discover/confirm base class, env-gate key, count key with `file:line` evidence.
4. Grade every universal + project-specific checklist item (R2).
5. Produce the PASS/FAIL verdict with per-item `file:line` evidence (R3).
6. If FAIL → hand confirmed defects to Generate mode and re-review after the fix; else report PASS + next-step suggestion.
7. Analyze AI mistakes & lessons learned.

---

## Workflow Recommendation

> **MUST ATTENTION — NOT IN WORKFLOW YET:** Use `AskUserQuestion`:
>
> 1. **Activate `workflow-seed-test-data`** (Recommended) — scout → investigate → seed-test-data → changes-review → code-simplifier → docs-update
> 2. **Execute `/seed-test-data` directly** — run this skill standalone

---

## Next Steps

> **MUST ATTENTION** after completing (Generate mode): use `AskUserQuestion` — do NOT skip. Step 7 self-review (`--mode=review`) MUST have run on the changed code BEFORE these:

- **"/workflow-review-changes (Recommended)"** — final step: review all changes before commit (runs AFTER the `--mode=review` convention self-audit)
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
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:real-world-fidelity-testing -->

> **Real-World Fidelity Gate** — MANDATORY when authoring, reviewing, or repairing any integration / E2E / system test.
>
> A test earns trust by reproducing a situation the system can actually meet in production. A scenario that could never occur in real life proves nothing when it passes, and wastes hours when it fails.
>
> 1. **Ask the fidelity question BEFORE writing the setup:** _"Can this sequence, timing, and data actually occur in production?"_ If no, the test is mis-specified — fix the SCENARIO, never the assertion.
> 2. **Model real pacing between actor steps.** Two distinct actor actions that production separates by seconds, minutes, or hours MUST NOT be fired back-to-back in the same millisecond. Compressed pacing manufactures races the system was never designed to survive, then reports them as product defects.
> 3. **Wait on a real signal, never a blind sleep.** Find an observable proving the prior step finished — a persisted state change, an audit/version stamp, a queue/worker idle marker, a completion event — and poll until it settles (unchanged across a short stability window). Use a fixed delay ONLY when no observable exists, and say so in a comment.
> 4. **Barriers belong in ARRANGE, never in ASSERT.** Waiting for a precondition is fidelity. Widening an assertion's timeout, loosening a comparison, adding a retry around a failing assertion, or skipping the test is masking. NEVER do the latter to force green.
> 5. **Distinguish harness-amplified from real.** Test topologies (shared infra, fan-out consumers, parallel suites, cold starts) can make a rare production race routine locally. Before filing a product defect, state whether the trigger exists in production and at what likelihood.
> 6. **Keep the protected invariant intact.** Improving fidelity must NEVER reduce what the test protects. If a realistic scenario no longer exercises the rule, the rule needs a DIFFERENT realistic scenario — not a weaker assertion.
> 7. **Deliberate impossible-state tests are allowed, but MUST be labelled.** Corruption-repair, migration, and fail-safe tests intentionally construct states production should never reach; comment WHY the state is reachable (upstream bug, partial write, legacy data), so they are never confused with unrealistic setups.

<!-- /SYNC:real-world-fidelity-testing -->

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

**IMPORTANT MUST ATTENTION Goal:** Set up configurable, **local-development-only (default-enabled)** seeders that auto-seed each feature's happy-path scenarios by calling the **public entry-point commands a real user / QC tester would** (NEVER direct DB writes) — self-testing the main cases. A **configurable count** (small default when unset) repeats scenarios to cover cases AND enrich volume for performance / first-init realism. **Idempotent + restart-safe:** never re-seed already-seeded data; resume from the last count toward target X. **Find the project's existing convention FIRST.**

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** MUST ATTENTION apply critical+sequential thinking; traced proof, confidence >80%.
- **Understand Code First:** ALWAYS search 3+ patterns and read code before writing.
- **Evidence:** MUST ATTENTION cite `file:line` per claim; declare confidence; "insufficient evidence" valid.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Real-World Fidelity:** seed only states the application could actually produce; realistic relative timing; label any deliberately unreachable fixture.

**IMPORTANT MUST ATTENTION** FIND the project's existing seed-data convention FIRST (base class, env-gate key, count key, registration, marker) and MATCH it — never invent a parallel mechanism — why: a divergent seeder fragments the codebase and silently breaks the project's restart/idempotency guarantees
**IMPORTANT MUST ATTENTION** ENABLE by default ONLY on a local/development environment (env gate is the FIRST check) — auto-setup for local/first-init, NEVER production
**IMPORTANT MUST ATTENTION** SEED like a real user / QC tester — call the PUBLIC entry-point application commands; NEVER call repo/DB directly for domain data — why: bypassing the command pipeline skips validation, domain logic, and event side-effects, producing invalid state that passes silently
**IMPORTANT MUST ATTENTION** GUARANTEE idempotency — check count before seeding; on restart with data already seeded, seed NOTHING — why: re-seeding duplicates data and breaks the QC/perf baseline
**IMPORTANT MUST ATTENTION** loop from `existing_count` to `target_count` — NEVER from 0 — supports stop/restart any number of times: target X at 50% → continue until X — why: looping from 0 re-seeds on every restart and breaks restart-safety
**IMPORTANT MUST ATTENTION** scoped DI per iteration — shared DI scope = silent DbContext/session corruption
**IMPORTANT MUST ATTENTION** ALWAYS make the count configurable and read it from the discovered config key — NEVER hardcode; **default to a SMALL number when nothing is configured** (zero → no-op, never unbounded loop); the same count serves BOTH self-testing the main cases AND enriching volume for performance / many-users / first-init realism
**IMPORTANT MUST ATTENTION** NEVER duplicate command logic in the seeder — seeder provides realistic inputs, commands own validation/domain/events
**IMPORTANT MUST ATTENTION** SEED only states the application could actually produce — application-level operations guarantee reachability by construction; a direct store write fabricating an otherwise-unreachable state MUST carry a comment saying why it is legitimate, and seeded entities MUST carry plausible relative timing rather than one shared instant — why: a corpus the application could never produce makes every test over it prove nothing, and same-instant data hides ordering and time-window defects
**IMPORTANT MUST ATTENTION** every seeded scenario MUST stay consistent with the §5 universal invariants; if a seeder encodes a domain rule (precondition, status, default) feed it into the spec — and tests where testable — NEVER a seeder-only fix — why: a hidden rule in a seeder drifts from the spec and breaks future readers

**IMPORTANT MUST ATTENTION Evidence gate:** cite `file:line` for the env gate, count gate, loop start, DI scope, and seeder registration — confidence >80% to act, <60% DO NOT recommend; "Insufficient evidence" is valid output
**IMPORTANT MUST ATTENTION** search 3+ existing seeder patterns and READ them before writing — match the discovered base class / env-gate / count-key conventions exactly; verify the copied pattern shares the same preconditions (base class, scope, lifetime) before reuse
**IMPORTANT MUST ATTENTION** read `docs/project-reference/seed-test-data-reference.md` + `docs/project-config.json` (`Data Seeders` group) BEFORE any seeder change — project conventions override generic defaults
**IMPORTANT MUST ATTENTION** `TaskCreate` — break all work into tasks BEFORE starting; transition one task at a time, evidence per completed step
**IMPORTANT MUST ATTENTION** close with a fresh zero-memory `code-reviewer` round; full re-review is required ONLY after a validated fix cycle — a clean review pass ENDS the review; NEVER fix unvalidated findings
**IMPORTANT MUST ATTENTION Modes:** default = **Generate** (implement/enhance/fix); `--mode=review` = READ-ONLY convention audit (resolve target: prompt → current changes → work-context; read the reference doc + Universal Rules FIRST; grade every rule with `file:line`; route fixes back to Generate — NEVER edit in review mode)
**IMPORTANT MUST ATTENTION** the Generate-mode task plan MUST end with a `--mode=review` self-audit over the changed seeder code, and that self-audit MUST run BEFORE the `/changes-review` hand-off — `/changes-review` stays the final step

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| "Simple seeder, skip review loop"            | Idempotency bugs are silent. Run Round 1 always.                                           |
| "Skip the `--mode=review` self-audit"        | It's a required task — convention gate runs BEFORE `/changes-review`, never instead of it. |
| "Review mode can just fix the seeder"        | Review is READ-ONLY. Route the fix back through Generate mode, then re-review.             |
| "Already know the base class"                | Show `file:line`. No proof = no knowledge.                                                 |
| "Environment gate is obvious"                | Verify it's FIRST check with `file:line` evidence.                                         |
| "Just hardcode count for now"                | NEVER — config key required. Find it in Step 1.                                            |
| "Seeder can validate this quickly"           | NEVER duplicate logic — command owns validation; seeder feeds inputs.                      |
| "Skip the reference docs, I know seeders"    | Project conventions override generic patterns. Read them first.                            |
| "No graph.db, skip trace"                    | Use grep-only trace. Still run 3+ pattern search.                                          |
| "Existing scenarios look fine, skip enhance" | Read all scenarios; enhancement may conflict — verify first.                               |

**[TASK-PLANNING]** Before acting, break task into small todo tasks using `TaskCreate`.

**IMPORTANT MUST ATTENTION** Convention-first · local-dev default-enabled (env-gate FIRST, never prod) · seed via PUBLIC commands like a real user/QC · configurable count with SMALL default (cases + volume) · idempotent + restart-safe (resume to target X, never re-seed) · NEVER direct repo/DB writes · `file:line` evidence per gate (confidence >80%).
