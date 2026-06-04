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
| `init-full` | Zero — no Feature Spec for target scope      | scout → **size-evaluation** → **plan** → **plan-review** → **plan-validate** → spec [mode=init] → **spec [mode=tests]** → **review-artifact --type=spec-tests** → review-artifact → **docs-update(final sync)** → workflow-end → watzup |
| `update`    | Code changed, new requirement, new PBI       | workflow-review-changes → spec [mode=update] → **spec [mode=tests]** → **review-artifact --type=spec-tests** → spec [mode=sync] → review-changes → **docs-update(final sync)** → workflow-end → watzup                                  |
| `audit`     | Quarterly health check, verify doc freshness | scout → spec [mode=audit] → review-artifact → **docs-update(final sync)** → workflow-end → watzup                                                                                                                                       |

**Key Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- Confirm mode via `AskUserQuestion` BEFORE any action — NEVER skip Step 0
- Invoke `Skill` tool for EACH step — NEVER batch-complete or mark done without invocation
- Spawn sub-agents for 4+ capabilities in ONE message — NEVER sequential
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
  → TaskCreate: "scout — enumerate capabilities + entry points for {Bucket}"

## Step B — Size Evaluation and Divide-and-Conquer Planning (MANDATORY — runs BEFORE plan)

**[BLOCKING GATE]** Before writing any plan, evaluate scope and recursively decompose until
each capability is an independently authorable Feature Spec.

ESTIMATE:
  capability_count = count of distinct capabilities found in scout
  IF capability_count > 10:
    → SPLIT into groups: max 10 capabilities per run, run groups sequentially
  IF 4 ≤ capability_count ≤ 10:
    → Sub-agents mandatory (one spec sub-agent per capability)
  IF capability_count ≤ 3:
    → Single-session authoring

**Recursive decomposition rule:** If a single capability's Feature Spec would exceed the caps
(body §1-7 >1200 lines OR >40 TCs), split the capability into sibling specs.

TaskCreate: "size-evaluation — count capabilities, decide split strategy"

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
  → Caps: body §1-7 ≤1200 lines, whole file ≤1800 (hard) — split when body>1200 OR TCs>40

/spec [mode=tests]
  → Populate Section 8 with TC-{FEATURE}-{NNN} entries (BDD, Business Intent, abstract Evidence, IntegrationTest field, Status)

/review-artifact --type=spec-tests
  → Review §8 TCs for invariant coverage, GIVEN/WHEN/THEN completeness, duplicate TC IDs

/review-artifact
  → Quality check the Feature Spec(s):
    - §1-7 strictly tech-free (zero framework/product/language terms in prose)
    - §5 Mermaid ERD present with entities, relationships, cardinalities
    - §8 every TC has Business Intent, abstract `[Source: ns/service/id]` anchor, IntegrationTest field, Status
    - YAML frontmatter present; body ≤1200 / whole file ≤1800 lines
  → PASS criteria: zero [UNVERIFIED] without exclusion reason + zero tech terms in §1-7
  → Gap found → validate findings → fix validated gaps → restart full review-artifact pass from the first check

/docs-update
  → Near-final synchronization sweep across project docs, the Feature Spec(s), and Section 8
  → MUST run after review-artifact fixes and before /workflow-end
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

/review-artifact --type=spec-tests
  → Review updated/planned TCs for invariant coverage, GIVEN/WHEN/THEN completeness, stale TC handling, duplicate IDs
  → SKIP if /spec [mode=tests] skipped — mark "Skipped: no TC changes"
  → BLOCK sync if review finds missing invariants, ambiguous behavior, or TC/code/spec drift

/spec [mode=sync]
  → Refresh the derived bucket INDEX TC counts from Section 8 (Section 8 stays canonical — no separate dashboard)
  → SKIP if no TC changes in this cycle

/review-changes
  → Holistic review of Feature Spec changes
  → Verify: spec changes match code changes (no over/under documentation); §8 covers all new functionality

/docs-update
  → Near-final synchronization sweep across project docs, the Feature Spec(s), and Section 8
  → MUST run after review-changes fixes and before /workflow-end
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
  → /review-artifact --type=spec-tests: review planned TCs before refreshing the derived index
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

/review-artifact
  → Consolidated audit report
  → Produce: plans/reports/spec-audit-{date}-{Bucket}.md
  → Include: total stale coverage %, estimated update effort, priority order
  → (Optional) /spec-index [mode=audit] — report which DERIVED index/ERD aids lag their source specs

/docs-update
  → Near-final synchronization sweep; MUST run after review-artifact conclusions and before /workflow-end
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
| `/review-artifact --type=spec-tests` in update | `/spec [mode=tests]` skipped because there were no TC changes                                                  |
| `/spec [mode=sync]`                            | No TC changes in this update cycle                                                                             |
| `/docs-update` near-final sync                 | Never skip entirely; sub-phases may be skipped only with explicit reason in the docs-update report             |
| `/review-artifact` audit pass                  | No stale specs found AND no UNVERIFIED items                                                                   |
| `/spec-index` (derived)                        | No derived index/ERD is maintained for this bucket, or it is already current                                   |

---

## Sub-Agent Coordination Protocol (init-full, 4+ capabilities)

1. `/scout` + `/plan` in main context → capability registry + per-capability task list
2. Spawn `spec` sub-agents (one per capability) in ONE message
3. Wait for all sub-agents to complete
4. Spawn `spec [mode=tests]` sub-agents (one per capability) in ONE message to populate Section 8
5. Main context assembles + verifies in `/review-artifact`

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
  Phase 3.5: /review-artifact --type=spec-tests (required when Phase 3 changes TCs)
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

**IMPORTANT MANDATORY Steps:** /scout -> /plan -> /plan-review -> /plan-validate -> /spec -> /spec [mode=tests] -> /review-artifact --type=spec-tests -> /review-artifact -> /docs-update -> /workflow-end -> /watzup

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
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
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

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

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
- **[BLOCKING]** Plan decomposes big→small — ONE task per capability Feature Spec; split a capability when body §1-7 >1200 lines OR TCs >40
- **[BLOCKING]** Per-section authoring: write each section immediately — NEVER accumulate across sections
- **[REQUIRED]** §1-7 STRICTLY tech-free (no framework names, no language constructs, no class names in prose); identifiers live only in §8 evidence carriers, `[Source: ns/service/id]`, and ` ```mermaid ``` ` blocks — mark `[UNVERIFIED]` not blank
- **[REQUIRED]** Each sub-agent prompt MUST include: capability name, output path, tech-agnostic contract, SYNC protocols (critical-thinking, evidence-based, incremental-persistence, cross-scope boundary)
- **[BLOCKING]** Context compaction / session resume → `TaskList` first, re-glob existing Feature Specs, skip done capabilities — NEVER re-run scout or plan
- **[BLOCKING]** review-artifact: PASS = zero `[UNVERIFIED]` without exclusion reason + zero tech terms in §1-7; gap found → validate findings → fix validated gaps → restart the full review-artifact pass from the first check
- **[BLOCKING]** Verify TaskList count ≥ capability_count before any authoring begins — this is the plan completeness gate
- **[REQUIRED]** Apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
- **[REQUIRED]** Apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
> **Anti-Rationalization:**

| Evasion                                 | Rebuttal                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| "Purpose obvious"                       | Anchor it anyway — primacy/recency keeps outcome active through long prompts.                               |
| "Existing reminders enough"             | Echo Goal in Closing Reminders — bottom anchor prevents drift.                                              |
| "Skip evidence for prompt edits"        | Cite changed file evidence and verify no stale protocol text remains.                                       |
| "Re-extract the A-E engineering bundle" | Not part of the spec model. ONE Feature Spec; the ERD is §5. `spec-index` only regenerates a derived index. |
