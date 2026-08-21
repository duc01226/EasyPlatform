---
name: workflow-code-to-spec
version: 3.0.0
description: '[Workflow] Use when activating code-to-spec development — author/maintain the single canonical Feature Spec FROM existing code, keeping spec, implementation, and tests synchronized. For idea→spec (no code yet) use workflow-idea-to-spec.'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **Renamed:** formerly `workflow-build-specs` — now `/workflow-code-to-spec`. The old name no longer resolves as a slash command.

## Quick Summary

**Goal:** Keep the Feature Spec, implementation, tests, and project docs synchronized through a governed spec-driven workflow — a single entry point for spec-driven doc generation and maintenance over **ONE canonical artifact**, the tech-free **8-section Feature Spec** at `docs/specs/{Bucket}/README.{Feature}.md` (code is the technical source of truth; there is no parallel engineering tree).

> **[SINGLE HOME]** There is ONE canonical artifact — the tech-free 8-section Feature Spec authored by `spec` at `docs/specs/{Bucket}/`. There is no parallel A-E "Engineering Spec" bundle and no separate Business Feature Docs tree; `spec-index` only regenerates a DERIVED index/ERD over the Feature Specs. Authority: [`docs/project-reference/spec-system-reference.md`](../../../docs/project-reference/spec-system-reference.md).

### One Canonical Artifact + Derived Aids

| Artifact               | Path                                      | Canonical?                       | Maintained By             |
| ---------------------- | ----------------------------------------- | -------------------------------- | ------------------------- |
| **Feature Spec**       | `docs/specs/{Bucket}/README.{Feature}.md` | **Yes — single source of truth** | `spec`                    |
| Section 8 — Test Specs | Same file, **Section 8**                  | Yes — canonical TC registry      | `spec [mode=tests]`       |
| Bucket `INDEX.md`      | `docs/specs/{Bucket}/INDEX.md`            | Derived — regenerable            | `spec` / `spec-index`     |
| System index / ERD     | (generated on demand)                     | Derived — never canonical        | `spec-index` (repurposed) |

### App Bucket Mapping

Resolve service→bucket assignments from the canonical table in [`docs/project-reference/spec-system-reference.md`](../../../docs/project-reference/spec-system-reference.md) → **App Bucket Mapping** — do not inline project-specific bucket names in this skill.

**Mode Routing:**

| Mode        | When to Use                                  | Step Sequence                                                                                                                                                                                                                           |
| ----------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init-full` | Zero — no Feature Spec for target scope      | scout → **size-evaluation** → **plan** → **plan-review** → **plan-validate** → spec [mode=init] → **spec [mode=tests]** → **artifact-review --type=spec-tests** → artifact-review → **docs-update(final sync)** → workflow-end → watzup |
| `update`    | Code changed, new requirement, new PBI       | workflow-review-changes → spec [mode=update] → **spec [mode=tests]** → **artifact-review --type=spec-tests** → spec [mode=sync] → changes-review → **docs-update(final sync)** → workflow-end → watzup                                  |
| `audit`     | Quarterly health check, verify doc freshness | scout → spec [mode=audit] → artifact-review → **docs-update(final sync)** → workflow-end → watzup                                                                                                                                       |

**Key Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- Confirm mode via `AskUserQuestion` BEFORE any action — NEVER skip Step 0
- Invoke `Skill` tool for EACH step — NEVER batch-complete or mark done without invocation
- Spawn sub-agents for 4+ capabilities in ONE message — NEVER sequential
- Every spec carries the THREE layers needed for stack-agnostic rebuild: business logic (§1-7), UI/UX interaction surface (§6.2-6.5 for UI-bearing features), and test specs (§8) — a spec missing any layer is incomplete
- Trace the FULL vertical chain (UI → API → handler → domain → event → read model → UI) per capability and reconcile it (Step 1-INIT.4.6) — a layer-parallel inventory silently misses seam behavior; nothing-missed requires the end-to-end trace
- For multi-bucket/whole-project scope, maintain the resumable Coverage Ledger (Step B.3) and clear the Whole-Project Completeness Gate before `/workflow-end`
- §1-7 of every Feature Spec are STRICTLY tech-free; the §5 Mermaid ERD is authored **inside** the Feature Spec — there is no separate ERD file
- Write findings incrementally after each section — NEVER hold in memory
- If shared skills/workflows/hooks/sync tooling changed, run `npm run codex:sync` before `/workflow-end` or record explicit N/A evidence; verify generated mirrors are current.

---

## Step 0 — Mode Detection (MANDATORY FIRST)

Use `AskUserQuestion` to confirm mode before any action.

**Auto-detection rules:**

```
IF docs/specs/{Bucket}/ has NO Feature Spec for the target scope
  → Suggest: init-full

IF git diff has service/frontend changes touching an already-spec'd capability
  → Suggest: update

IF explicit --audit flag OR user says "audit" / "check freshness" / "are docs stale"
  → Suggest: audit
```

**Bucket + capability confirmation:**

- Probe `Glob docs/specs/{Bucket}/README.*.md` to see which capabilities already have a Feature Spec.
- Map the changed services to a Bucket via the **App Bucket Mapping** table above.
- Confirm the capability name (PascalCase) with the user — this becomes `README.{Feature}.md`.

Present the detected mode with reasoning. User confirms before proceeding.

---

## MODE: init-full

### When to Use

Starting from zero: no `docs/specs/{Bucket}/README.{Feature}.md` for the target scope.

### Step Sequence

````
## Step A — Discovery (scout)

/scout
  → Holistic codebase map — capability registry, entry points, integration boundaries
  → Identify the set of capabilities in scope (one Feature Spec each)
  → **Full-chain awareness:** map not just backend layers but the complete vertical slice per
     capability — UI view/action → API → handler → domain entity/rule → event → consumer/read model
     → UI outcome. The detailed per-capability trace + reconciliation gate runs inside
     `/spec [mode=init]` Step 1-INIT.4.6 (use `graph-connect-api` for frontend→backend links,
     `graph-trace` for backend flow); scout just confirms both ends (frontend + backend) are in scope
     so no seam is invisible at planning time.
  → TaskCreate: "scout — enumerate capabilities + full FE→BE→domain entry points for {Bucket}"

## Step B — Size Evaluation and Divide-and-Conquer Planning (MANDATORY — runs BEFORE plan)

**[BLOCKING GATE]** Before writing any plan, evaluate scope and recursively decompose until
each capability is an independently authorable Feature Spec. **The task may be huge — an entire
project's worth of code-to-spec is the explicit worst case. Size it honestly first, then break it
into many small, independently-completable units; never start authoring against an unsized scope.**

### B.1 — Classify scope breadth FIRST

| Scope | Signal | Strategy |
| ----- | ------ | -------- |
| **Single capability** | one feature named / one diff | single-session authoring |
| **Single bucket** | one module/service | per-capability decomposition within the bucket |
| **Whole project** | "all specs", "the whole project", "every feature", no bucket named | **enumerate ALL buckets × ALL capabilities → build the Coverage Ledger (B.3) → run bucket-by-bucket across resumable sessions** |

### B.2 — Estimate per run

```
capability_count = count of distinct capabilities in the current scope
  IF capability_count > 10:  → SPLIT into groups: max 10 capabilities per run, run groups sequentially
  IF 4 ≤ capability_count ≤ 10: → Sub-agents mandatory (one spec sub-agent per capability)
  IF capability_count ≤ 3:   → Single-session authoring
```

**Recursive decomposition rule:** Feature Specs have no line-count cap. If a single capability has
>40 TCs or contains distinct module-level capabilities, split the capability into sibling specs.

### B.3 — Whole-Project Coverage Ledger [BLOCKING for whole-project scope; recommended for multi-bucket]

When the scope spans more than one bucket, a single session cannot hold it — so coverage MUST be
tracked in a **persistent, resumable ledger on disk**, not in memory or the task list alone. This is
the guard for "the whole-project code-to-spec works flawlessly and nothing is missed."

1. **Enumerate the full target set:** for every bucket (App Bucket Mapping), list every capability
   discovered in scout. This is the denominator — the complete set that MUST end with a Feature Spec.
2. **Write the ledger** to `plans/reports/code-to-spec-coverage-{date}.md`:

   | Bucket | Capability | Spec path | §1-7 | §6 (UI) | §8 TCs | Chain trace | Status |
   | ------ | ---------- | --------- | :--: | :-----: | :----: | :---------: | ------ |
   | {Bucket} | {Capability} | docs/specs/{Bucket}/README.{Feature}.md | ⬜ | ⬜ | 0 | ⬜ | NOT STARTED |

3. **Update the ledger row after each capability completes** (incremental persistence — never batch).
   `Status` ∈ NOT STARTED → IN PROGRESS → SPEC DONE → REVIEWED. `§6 (UI)` is `n/a` for backend-only.
4. **Resume rule:** on any session start / after compaction, read the ledger FIRST, re-glob
   `docs/specs/**` to confirm, and continue from the first non-REVIEWED row — NEVER re-author a done
   capability, NEVER re-run scout for already-enumerated buckets.
5. **[BLOCKING] Whole-Project Completeness Gate (before `/workflow-end`):** every row is `REVIEWED`,
   OR carries an explicit, recorded deferral reason. A bucket/capability discovered in scout but
   absent from `docs/specs/**` with no deferral reason = the workflow is NOT complete. Report the
   final coverage as `{reviewed}/{total} capabilities` in `/watzup`.

TaskCreate: "size-evaluation — classify scope breadth, count capabilities, build coverage ledger (whole-project), decide split strategy"

## Step C — Plan

/plan
  → ONE task per capability Feature Spec (author §1-7 + §8 placeholder)
  → Core domain capabilities first, supporting ones last
  → Verify TaskList count ≥ capability_count before proceeding (BLOCKING gate)
  → TaskCreate: "plan — produce per-capability authoring plan"

## Step D — Plan Review

/plan-review
  → Validate: every in-scope capability has an authoring task, no gaps
  → Verify: no sub-agent handles >3 capabilities; each capability within caps
  → TaskCreate: "plan-review — validate capability coverage + caps"

## Step E — Plan Validation

/plan-validate
  → User confirms: bucket, capability list, scope, split strategy
  → TaskCreate: "plan-validate — user confirms scope and split strategy"

/spec [mode=init]
  → Author the canonical tech-free 8-section Feature Spec PER capability:
      §1 Overview · §2 Glossary · §3 User Stories & AC · §4 Business Rules ·
      §5 Domain Model (Mermaid ERD — MANDATORY, authored INSIDE this file) ·
      §6 Process Flows · §7 Permissions & Roles · §8 Test Specifications
  → §1-7 STRICTLY tech-free; identifiers live only in §8 evidence carriers + `[Source: ns/service/id]` + ` ```mermaid ``` ` blocks
  → Output: docs/specs/{Bucket}/README.{Feature}.md + bucket INDEX.md
  → Sub-agents for 4+ capabilities (BLOCKING: ONE message spawn); each prompt includes capability name, output path, tech-agnostic contract, SYNC protocols
  → No line-count cap applies — split when TCs>40 or distinct module-level capabilities emerge

/spec [mode=tests]
  → Populate Section 8 with demoable business TC-{FEATURE}-{NNN} entries (BDD, Business Intent, abstract Evidence, CoveredBy field, Status)

/artifact-review --type=spec-tests
  → Review §8 TCs for invariant coverage, GIVEN/WHEN/THEN completeness, duplicate TC IDs

/artifact-review
  → Quality check the Feature Spec(s):
    - §1-7 strictly tech-free (zero framework/product/language terms in prose)
    - §5 Mermaid ERD present with entities, relationships, cardinalities
    - §8 every TC has Business Intent, abstract `[Source: ns/service/id]` anchor, CoveredBy field, Status
    - YAML frontmatter present; no line-count cap applied
  → PASS criteria: zero [UNVERIFIED] without exclusion reason + zero tech terms in §1-7
  → Gap found → validate findings → fix validated gaps → restart full artifact-review pass from the first check

/docs-update
  → Near-final synchronization sweep across project docs, the Feature Spec(s), and Section 8
  → MUST run after artifact-review fixes and before /workflow-end
  → (Optional) regenerate the derived bucket INDEX / ERD via /spec-index
  → Report skipped sub-phases explicitly when no impacted docs exist

/workflow-end

/watzup
  → Session summary: capabilities authored, files written, ~lines, §8 TC counts, coverage gaps, open questions (confidence < 80%), plus final /understand handoff
````

---

## MODE: update

### When to Use

Code changed (new feature, bug fix, refactor, new PBI). Sync the Feature Spec incrementally.

### Scope Sources

1. Auto-detect from `git diff --name-only HEAD` (default)
2. Explicit capability list from user
3. New PBI or requirement description (map to affected capabilities manually)

### Step Sequence

```
/workflow-review-changes
  → Full code review cycle + docs-update (Phase 2 spec diff-scoped sync)
  → Produces: impact map (capabilities affected, Feature Spec sections to update)

/spec [mode=update]
  → Update only the impacted sections of each affected Feature Spec (full 8-section pass with 3-pass verification when restructuring)
  → SKIP if docs-update Phase 2 completed with zero gaps — mark "Skipped: docs-update Phase 2 sufficient"

/spec [mode=tests]
  → **EXPLICIT TC STEP — required when new functionality added**
  → SKIP if changes are purely cosmetic (CSS, comments, config) — mark "Skipped: no behavioral impact"
  → Mode detection: new commands/queries/endpoints → implement-first; PBI-driven → TDD-first; TC edits only → update
  → Write/update TCs in Section 8; grep existing IDs before assigning; never overwrite Tested TCs

/artifact-review --type=spec-tests
  → Review updated/planned TCs for invariant coverage, GIVEN/WHEN/THEN completeness, stale TC handling, duplicate IDs
  → SKIP if /spec [mode=tests] skipped — mark "Skipped: no TC changes"
  → BLOCK sync if review finds missing invariants, ambiguous behavior, or TC/code/spec drift

/spec [mode=sync]
  → Refresh the derived bucket INDEX TC counts from Section 8 (Section 8 stays canonical — no separate dashboard)
  → SKIP if no TC changes in this cycle

> **UI-intent maintenance (conditional)** — runs alongside the `/spec [mode=sync]` / spec authoring step, **only when the change carries user-facing behavior** (else state the skip reason — backend-only change, no §6 change). When the reverse-engineered code carries user-facing behavior, the spec authoring step MUST refresh the Feature Spec **§6** interaction surface from the implemented capability — View Inventory, Key UI States, and the per-story (`US-`/`OP-`/`BR-`) click-path — and link the governing `/design-spec`/mockup in the spec frontmatter so §6 and the design artifact stay coupled to what the code actually does. The rules live in the shared block below (`SYNC:ui-intent-layer`) — follow it; do not restate it here.

/changes-review
  → Holistic review of Feature Spec changes
  → Verify: spec changes match code changes (no over/under documentation); §8 covers all new functionality

/docs-update
  → Near-final synchronization sweep across project docs, the Feature Spec(s), and Section 8
  → MUST run after changes-review fixes and before /workflow-end
  → Report skipped sub-phases explicitly when no impacted docs exist

/workflow-end

/watzup
  → Summary: capabilities updated, Feature Spec sections changed, TCs added/updated, new open questions, plus final /understand handoff
```

### New PBI / Requirement Update Protocol

Triggering update from new PBI or requirement (not code change):

```
After /workflow-review-changes:
  → User provides PBI text or requirement description
  → Map requirement → affected domain entities → affected capabilities
  → /dor-gate: required when a new/changed PBI is being made implementation-ready; PASS or WARN before planned specs/TCs become guidance
  → /pbi-mockup: required when the PBI changes user-facing UI/journeys; skip with reason for backend-only requirements
  → Treat as "speculative update": add new rules/sections to the Feature Spec marked [PLANNED — not yet implemented]
  → Add corresponding TCs in Section 8 marked Status: Planned
  → /artifact-review --type=spec-tests: review planned TCs before refreshing the derived index
  → These become implementation guidance, not verified spec
```

---

## MODE: audit

### When to Use

Periodic health check (quarterly or before major release). Verify the Feature Specs are current.

### Audit Time Estimation

```
audit_effort = capability_count × 8min_per_capability
example: 8 capabilities × 8min = ~1h (AI-assisted)
```

Budget multiplier: If last audit was >90 days ago → ×1.5 (more drift expected).

### Step Sequence

```
/scout
  → Quick codebase scan: current state of entities, commands, controllers (lightweight, 30min max)

/spec [mode=audit]
  → Compare each Feature Spec's last_updated vs git log of the source it documents
  → Output: stale capabilities/sections table with recommended update scope

/artifact-review
  → Consolidated audit report
  → Produce: plans/reports/spec-audit-{date}-{Bucket}.md
  → Include: total stale coverage %, estimated update effort, priority order
  → (Optional) /spec-index [mode=audit] — report which DERIVED index/ERD aids lag their source specs

/docs-update
  → Near-final synchronization sweep; MUST run after artifact-review conclusions and before /workflow-end
  → Report skipped sub-phases explicitly when no impacted docs exist

/workflow-end

/watzup
  → Present action plan: which capabilities to update first
  → Recommend: run update mode scoped to stale capabilities
  → Run final /understand handoff
```

---

## Conditional Skip Rules

| Step                                           | Skip When                                                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| §5 Mermaid ERD in init                         | Never — the ERD is a mandatory section of the Feature Spec                                                     |
| `/spec [mode=tests]` in init                   | User explicitly requests a behavior-doc-only pass (TCs deferred to a later cycle)                              |
| `/dor-gate` in update                          | Update source is code diff only, existing PBI is already DoR-ready, or no PBI readiness decision is being made |
| `/pbi-mockup` in update                        | Backend-only/non-UI requirement, code diff only, or existing mockup already covers the change                  |
| `/artifact-review --type=spec-tests` in update | `/spec [mode=tests]` skipped because there were no TC changes                                                  |
| `/spec [mode=sync]`                            | No TC changes in this update cycle                                                                             |
| `/docs-update` near-final sync                 | Never skip entirely; sub-phases may be skipped only with explicit reason in the docs-update report             |
| `/artifact-review` audit pass                  | No stale specs found AND no UNVERIFIED items                                                                   |
| `/spec-index` (derived)                        | No derived index/ERD is maintained for this bucket, or it is already current                                   |

---

## Sub-Agent Coordination Protocol (init-full, 4+ capabilities)

1. `/scout` + `/plan` in main context → capability registry + per-capability task list
2. Spawn `spec` sub-agents (one per capability) in ONE message
3. Wait for all sub-agents to complete
4. Spawn `spec [mode=tests]` sub-agents (one per capability) in ONE message to populate Section 8
5. Main context assembles + verifies in `/artifact-review`

Each `spec` sub-agent receives:

- Capability name + bucket
- Output path: `docs/specs/{Bucket}/README.{Feature}.md`
- Tech-agnostic contract (§1-7 tech-free; §5 ERD mandatory)
- Incremental persistence instruction (write after each section)

---

## Integration with docs-update workflow step

`docs-update` called as a workflow step (not standalone) synchronizes the single canonical artifact:

```
docs-update (as workflow step):
  Phase 1: Project docs (inline — unchanged)
  Phase 2: /spec update mode (impacted sections of the Feature Spec)
  Phase 3: /spec [mode=tests] (Section 8 TCs)
  Phase 3.5: /artifact-review --type=spec-tests (required when Phase 3 changes TCs)
  Phase 4: /spec [mode=sync] (refresh derived INDEX TC counts)
  Phase 4.5: /spec-index (OPTIONAL — regenerate derived bucket INDEX / ERD if one is maintained)
```

The Feature Spec stays in sync on every feature/bugfix/refactor workflow.

---

## When to Use vs When NOT to Use

### Use This Workflow

- First-time Feature Spec authoring for a capability or full bucket
- After significant code changes (new feature, major refactor)
- Onboarding new team to a capability — the Feature Spec as knowledge handoff artifact
- Before tech migration or re-implementation (pair with a derived reimplementation guide)
- Quarterly spec health audits
- After new PBIs groomed for implementation
- Compliance documentation — prove system behavior in plain language
- Verify design intent — compare the Feature Spec against original vision

### Use Standalone Skills Instead

| Goal                                                | Use                           |
| --------------------------------------------------- | ----------------------------- |
| Update one specific Feature Spec after small change | `/spec` directly              |
| Add/sync Section 8 TCs                              | `/spec [mode=tests]` directly |
| Regenerate a derived bucket index / ERD             | `/spec-index` directly        |
| Understand one specific feature                     | `/investigate`                |
| Write integration tests from existing Section 8     | `/integration-test`           |

---

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

---

**IMPORTANT MANDATORY Steps:** /scout -> /plan -> /plan-review -> /plan-validate -> /spec -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /artifact-review -> /docs-update -> /workflow-end -> /watzup

> **[BLOCKING]** Invoke `Skill` tool for EACH step — NEVER batch-complete, NEVER mark done without skill invocation.
> **[BLOCKING]** Confirm mode via `AskUserQuestion` BEFORE any action — NEVER skip Step 0.
> **[BLOCKING]** Spawn sub-agents for 4+ capabilities in ONE message — NEVER sequential spawning.
> **[BLOCKING — Context Compaction / Session Resume]** At any session start or after context compaction: (1) `TaskList` FIRST — resume existing, NEVER create duplicates; (2) re-glob `docs/specs/{Bucket}/` to see which capabilities already have a Feature Spec — skip those; (3) NEVER re-run `/scout` or `/plan` in a resumed session.
> **[BLOCKING]** Read `docs/project-reference/spec-principles.md` before running any author/update/audit step — it is the shared spec quality baseline (tech-agnostic rule + banned-token list).

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from the spec request). Map each spec/test/code cycle output (Feature Specs authored, TCs written, audit findings fixed) to the saved success criteria and append the evidence to the goal file's Iteration Log per cycle. Before `/workflow-end`, emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED); completion requires every required criterion PASS or BLOCKED with a user-facing escalation.

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: ≤10 finding bullets, no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the summary lives in the `Full report` on disk. A sub-agent that would exceed the summary shape MUST write the detail to its report and return only the pointer — the orchestrator's context is the scarce resource the whole map-reduce protects.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:ui-intent-layer -->

> **[BLOCKING] Capture a tech-agnostic UI/UX intent layer in every UI-bearing spec — a reader must be able to visualize how the feature works without naming any technology.** When the feature has a user interface, the spec MUST ATTENTION carry an interaction-surface section so the application — not just its API — can be rebuilt on any stack:
>
> 1. **View Inventory** — list each view/screen by its UX ROLE and purpose (e.g. "list of items", "item editor", "confirmation step") and what information it presents. Describe by role, never by an implementation name.
> 2. **Navigation Map** — how a user moves between views: entry points, transitions, and exits. Trace how this surface connects to neighboring features already in the system.
> 3. **Key observable UI States** — the distinct states a user can observe per view (empty, loading, populated, error, success, permission-denied, etc.) — described as what the user perceives, not how it is rendered.
> 4. **Per-story interaction flow** — for each user story, the step-by-step click/action path from intent to outcome, cross-referenced to the logical IDs the spec already owns (`US-`/`OP-`/`BR-`).
> 5. **Couple to the companion design artifact** — keep deep visual fidelity (layout, tokens, pixel detail) OUT of the spec; it lives in the linked `design-spec`/mockup. Record that companion's path in the spec frontmatter so the spec stays the navigable hub.
>
> **M1-clean (NON-NEGOTIABLE):** the prose names ZERO frameworks, routes/URLs, CSS, or component-class names — only roles, information, states, and flows. Technology detail belongs in the companion design artifact, never here.
>
> **Skip ONLY** when the feature is backend-only (no UI) — state that reason explicitly in the section.

<!-- /SYNC:ui-intent-layer -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (View Inventory + Navigation Map + observable UI States + per-story `US-/OP-/BR-`-traced flow); keep deep visual fidelity in the linked `design-spec`/mockup recorded in frontmatter; name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `plans/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure the Feature Spec, implementation, tests, and project docs stay synchronized through a governed spec-driven workflow.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** expand child phases, link parent when nested; NEVER batch transitions.
- **Critical Thinking:** traced proof per claim, confidence >80% to act; NEVER present guess as fact.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Incremental Persistence:** persist findings to `plans/reports/` per section; NEVER hold in memory.
- **Sub-Agent Return Contract:** sub-agents return summary only; NEVER request full output inline.

- **[BLOCKING]** Confirm mode via `AskUserQuestion` BEFORE any action — NEVER skip Step 0
- **[BLOCKING]** Invoke `Skill` tool for EACH step — NEVER batch-complete or mark done without invocation
- **[BLOCKING]** Spawn sub-agents for 4+ capabilities in ONE message — NEVER sequential spawning
- **[BLOCKING]** ONE canonical artifact — the Feature Spec at `docs/specs/{Bucket}/README.{Feature}.md`; the §5 Mermaid ERD is authored INSIDE it (no separate ERD file, no A-E tree)
- **[BLOCKING]** Scout holistically FIRST — capability registry MUST exist before plan creation; NEVER re-run scout or plan in a resumed session
- **[BLOCKING]** Trace the FULL vertical chain per capability (UI → API → handler → domain/rule → event → consumer → read model → UI) and pass the Step 1-INIT.4.6 reconciliation gate — no orphan UI, no orphan operation, event + read-side closure; a BROKEN chain is a spec-correctness finding, never silently dropped
- **[BLOCKING]** Every spec ships all three rebuild layers — business logic (§1-7) + UI/UX interaction surface (§6.2-6.5, or stated backend-only skip) + test specs (§8); a UI feature missing §6 fails review
- **[BLOCKING]** Whole-project / multi-bucket scope → size it via Step B (classify breadth → build the resumable Coverage Ledger), and clear the Whole-Project Completeness Gate (every capability REVIEWED or explicitly deferred) before `/workflow-end` — report `{reviewed}/{total}` in `/watzup`
- **[BLOCKING]** Plan decomposes big→small — ONE task per capability Feature Spec; split a capability when TCs >40 or distinct module-level capabilities emerge
- **[BLOCKING]** Per-section authoring: write each section immediately — NEVER accumulate across sections
- **[REQUIRED]** §1-7 STRICTLY tech-free (no framework names, no language constructs, no class names in prose); identifiers live only in §8 evidence carriers, `[Source: ns/service/id]`, and ` ```mermaid ``` ` blocks — mark `[UNVERIFIED]` not blank
- **[REQUIRED]** Each sub-agent prompt MUST include: capability name, output path, tech-agnostic contract, SYNC protocols (critical-thinking, evidence-based, incremental-persistence, cross-scope boundary)
- **[BLOCKING]** Context compaction / session resume → `TaskList` first, re-glob existing Feature Specs, skip done capabilities — NEVER re-run scout or plan
- **[BLOCKING]** artifact-review: PASS = zero `[UNVERIFIED]` without exclusion reason + zero tech terms in §1-7; gap found → validate findings → fix validated gaps → restart the full artifact-review pass from the first check
- **[BLOCKING]** Verify TaskList count ≥ capability_count before any authoring begins — this is the plan completeness gate
- **[REQUIRED]** Apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
- **[REQUIRED]** Apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
> **Anti-Rationalization:**

| Evasion                                 | Rebuttal                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| "Purpose obvious"                       | Anchor it anyway — primacy/recency keeps outcome active through long prompts.                               |
| "Existing reminders enough"             | Echo Goal in Closing Reminders — bottom anchor prevents drift.                                              |
| "Skip evidence for prompt edits"        | Cite changed file evidence and verify no stale protocol text remains.                                       |
| "Re-extract the A-E engineering bundle" | Not part of the spec model. ONE Feature Spec; the ERD is §5. `spec-index` only regenerates a derived index. |
