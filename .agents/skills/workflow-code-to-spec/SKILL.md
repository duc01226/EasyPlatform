---
name: workflow-code-to-spec
description: '[Workflow] Use when activating code-to-spec development — author/maintain the single canonical Feature Spec FROM existing code, keeping spec, implementation, and tests synchronized. For idea→spec (no code yet) use workflow-idea-to-spec.'
disable-model-invocation: false
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

> **Renamed:** formerly `workflow-build-specs` — now `$workflow-code-to-spec`. The old name no longer resolves as a slash command.

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
- Confirm mode via a direct user question BEFORE any action — NEVER skip Step 0
- Invoke skill invocation for EACH step — NEVER batch-complete or mark done without invocation
- Spawn sub-agents for 4+ capabilities in ONE message — NEVER sequential
- §1-7 of every Feature Spec are STRICTLY tech-free; the §5 Mermaid ERD is authored **inside** the Feature Spec — there is no separate ERD file
- Write findings incrementally after each section — NEVER hold in memory
- If shared skills/workflows/hooks/sync tooling changed, run `npm run codex:sync` before `$workflow-end` or record explicit N/A evidence; verify generated mirrors are current.

---

## Step 0 — Mode Detection (MANDATORY FIRST)

Use a direct user question to confirm mode before any action.

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

$scout
  → Holistic codebase map — capability registry, entry points, integration boundaries
  → Identify the set of capabilities in scope (one Feature Spec each)
  → Task tracking: "scout — enumerate capabilities + entry points for {Bucket}"

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

Task tracking: "size-evaluation — count capabilities, decide split strategy"

## Step C — Plan

$plan
  → ONE task per capability Feature Spec (author §1-7 + §8 placeholder)
  → Core domain capabilities first, supporting ones last
  → Verify the current task list count ≥ capability_count before proceeding (BLOCKING gate)
  → Task tracking: "plan — produce per-capability authoring plan"

## Step D — Plan Review

$plan-review
  → Validate: every in-scope capability has an authoring task, no gaps
  → Verify: no sub-agent handles >3 capabilities; each capability within caps
  → Task tracking: "plan-review — validate capability coverage + caps"

## Step E — Plan Validation

$plan-validate
  → User confirms: bucket, capability list, scope, split strategy
  → Task tracking: "plan-validate — user confirms scope and split strategy"

$spec [mode=init]
  → Author the canonical tech-free 8-section Feature Spec PER capability:
      §1 Overview · §2 Glossary · §3 User Stories & AC · §4 Business Rules ·
      §5 Domain Model (Mermaid ERD — MANDATORY, authored INSIDE this file) ·
      §6 Process Flows · §7 Permissions & Roles · §8 Test Specifications
  → §1-7 STRICTLY tech-free; identifiers live only in §8 evidence carriers + `[Source: ns/service/id]` + ` ```mermaid ``` ` blocks
  → Output: docs/specs/{Bucket}/README.{Feature}.md + bucket INDEX.md
  → Sub-agents for 4+ capabilities (BLOCKING: ONE message spawn); each prompt includes capability name, output path, tech-agnostic contract, SYNC protocols
  → Caps: body §1-7 ≤1200 lines, whole file ≤1800 (hard) — split when body>1200 OR TCs>40

$spec [mode=tests]
  → Populate Section 8 with TC-{FEATURE}-{NNN} entries (BDD, Business Intent, abstract Evidence, IntegrationTest field, Status)

$review-artifact --type=spec-tests
  → Review §8 TCs for invariant coverage, GIVEN/WHEN/THEN completeness, duplicate TC IDs

$review-artifact
  → Quality check the Feature Spec(s):
    - §1-7 strictly tech-free (zero framework/product/language terms in prose)
    - §5 Mermaid ERD present with entities, relationships, cardinalities
    - §8 every TC has Business Intent, abstract `[Source: ns/service/id]` anchor, IntegrationTest field, Status
    - YAML frontmatter present; body ≤1200 / whole file ≤1800 lines
  → PASS criteria: zero [UNVERIFIED] without exclusion reason + zero tech terms in §1-7
  → Gap found → validate findings → fix validated gaps → restart full review-artifact pass from the first check

$docs-update
  → Near-final synchronization sweep across project docs, the Feature Spec(s), and Section 8
  → MUST run after review-artifact fixes and before $workflow-end
  → (Optional) regenerate the derived bucket INDEX / ERD via $spec-index
  → Report skipped sub-phases explicitly when no impacted docs exist

$workflow-end

$watzup
  → Session summary: capabilities authored, files written, ~lines, §8 TC counts, coverage gaps, open questions (confidence < 80%), plus final $understand handoff
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
$workflow-review-changes
  → Full code review cycle + docs-update (Phase 2 spec diff-scoped sync)
  → Produces: impact map (capabilities affected, Feature Spec sections to update)

$spec [mode=update]
  → Update only the impacted sections of each affected Feature Spec (full 8-section pass with 3-pass verification when restructuring)
  → SKIP if docs-update Phase 2 completed with zero gaps — mark "Skipped: docs-update Phase 2 sufficient"

$spec [mode=tests]
  → **EXPLICIT TC STEP — required when new functionality added**
  → SKIP if changes are purely cosmetic (CSS, comments, config) — mark "Skipped: no behavioral impact"
  → Mode detection: new commands/queries/endpoints → implement-first; PBI-driven → TDD-first; TC edits only → update
  → Write/update TCs in Section 8; grep existing IDs before assigning; never overwrite Tested TCs

$review-artifact --type=spec-tests
  → Review updated/planned TCs for invariant coverage, GIVEN/WHEN/THEN completeness, stale TC handling, duplicate IDs
  → SKIP if $spec [mode=tests] skipped — mark "Skipped: no TC changes"
  → BLOCK sync if review finds missing invariants, ambiguous behavior, or TC/code/spec drift

$spec [mode=sync]
  → Refresh the derived bucket INDEX TC counts from Section 8 (Section 8 stays canonical — no separate dashboard)
  → SKIP if no TC changes in this cycle

$review-changes
  → Holistic review of Feature Spec changes
  → Verify: spec changes match code changes (no over/under documentation); §8 covers all new functionality

$docs-update
  → Near-final synchronization sweep across project docs, the Feature Spec(s), and Section 8
  → MUST run after review-changes fixes and before $workflow-end
  → Report skipped sub-phases explicitly when no impacted docs exist

$workflow-end

$watzup
  → Summary: capabilities updated, Feature Spec sections changed, TCs added/updated, new open questions, plus final $understand handoff
```

### New PBI / Requirement Update Protocol

Triggering update from new PBI or requirement (not code change):

```
After $workflow-review-changes:
  → User provides PBI text or requirement description
  → Map requirement → affected domain entities → affected capabilities
  → $dor-gate: required when a new/changed PBI is being made implementation-ready; PASS or WARN before planned specs/TCs become guidance
  → $pbi-mockup: required when the PBI changes user-facing UI/journeys; skip with reason for backend-only requirements
  → Treat as "speculative update": add new rules/sections to the Feature Spec marked [PLANNED — not yet implemented]
  → Add corresponding TCs in Section 8 marked Status: Planned
  → $review-artifact --type=spec-tests: review planned TCs before refreshing the derived index
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
$scout
  → Quick codebase scan: current state of entities, commands, controllers (lightweight, 30min max)

$spec [mode=audit]
  → Compare each Feature Spec's last_updated vs git log of the source it documents
  → Output: stale capabilities/sections table with recommended update scope

$review-artifact
  → Consolidated audit report
  → Produce: plans/reports/spec-audit-{date}-{Bucket}.md
  → Include: total stale coverage %, estimated update effort, priority order
  → (Optional) $spec-index [mode=audit] — report which DERIVED index/ERD aids lag their source specs

$docs-update
  → Near-final synchronization sweep; MUST run after review-artifact conclusions and before $workflow-end
  → Report skipped sub-phases explicitly when no impacted docs exist

$workflow-end

$watzup
  → Present action plan: which capabilities to update first
  → Recommend: run update mode scoped to stale capabilities
  → Run final $understand handoff
```

---

## Conditional Skip Rules

| Step                                           | Skip When                                                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| §5 Mermaid ERD in init                         | Never — the ERD is a mandatory section of the Feature Spec                                                     |
| `$spec [mode=tests]` in init                   | User explicitly requests a behavior-doc-only pass (TCs deferred to a later cycle)                              |
| `$dor-gate` in update                          | Update source is code diff only, existing PBI is already DoR-ready, or no PBI readiness decision is being made |
| `$pbi-mockup` in update                        | Backend-only/non-UI requirement, code diff only, or existing mockup already covers the change                  |
| `$review-artifact --type=spec-tests` in update | `$spec [mode=tests]` skipped because there were no TC changes                                                  |
| `$spec [mode=sync]`                            | No TC changes in this update cycle                                                                             |
| `$docs-update` near-final sync                 | Never skip entirely; sub-phases may be skipped only with explicit reason in the docs-update report             |
| `$review-artifact` audit pass                  | No stale specs found AND no UNVERIFIED items                                                                   |
| `$spec-index` (derived)                        | No derived index/ERD is maintained for this bucket, or it is already current                                   |

---

## Sub-Agent Coordination Protocol (init-full, 4+ capabilities)

1. `$scout` + `$plan` in main context → capability registry + per-capability task list
2. Spawn `spec` sub-agents (one per capability) in ONE message
3. Wait for all sub-agents to complete
4. Spawn `spec [mode=tests]` sub-agents (one per capability) in ONE message to populate Section 8
5. Main context assembles + verifies in `$review-artifact`

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
  Phase 2: $spec update mode (impacted sections of the Feature Spec)
  Phase 3: $spec [mode=tests] (Section 8 TCs)
  Phase 3.5: $review-artifact --type=spec-tests (required when Phase 3 changes TCs)
  Phase 4: $spec [mode=sync] (refresh derived INDEX TC counts)
  Phase 4.5: $spec-index (OPTIONAL — regenerate derived bucket INDEX / ERD if one is maintained)
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
| Update one specific Feature Spec after small change | `$spec` directly              |
| Add/sync Section 8 TCs                              | `$spec [mode=tests]` directly |
| Regenerate a derived bucket index / ERD             | `$spec-index` directly        |
| Understand one specific feature                     | `$investigate`                |
| Write integration tests from existing Section 8     | `$integration-test`           |

---

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

---

**IMPORTANT MANDATORY Steps:** $scout -> $plan -> $plan-review -> $plan-validate -> $spec -> $spec [mode=tests] -> $review-artifact --type=spec-tests -> $review-artifact -> $docs-update -> $workflow-end -> $watzup

> **[BLOCKING]** Invoke skill invocation for EACH step — NEVER batch-complete, NEVER mark done without skill invocation.
> **[BLOCKING]** Confirm mode via a direct user question BEFORE any action — NEVER skip Step 0.
> **[BLOCKING]** Spawn sub-agents for 4+ capabilities in ONE message — NEVER sequential spawning.
> **[BLOCKING — Context Compaction / Session Resume]** At any session start or after context compaction: (1) the current task list FIRST — resume existing, NEVER create duplicates; (2) re-glob `docs/specs/{Bucket}/` to see which capabilities already have a Feature Spec — skip those; (3) NEVER re-run `$scout` or `$plan` in a resumed session.
> **[BLOCKING]** Read `docs/project-reference/spec-principles.md` before running any author/update/audit step — it is the shared spec quality baseline (tech-agnostic rule + banned-token list).

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from the spec request). Map each spec/test/code cycle output (Feature Specs authored, TCs written, audit findings fixed) to the saved success criteria and append the evidence to the goal file's Iteration Log per cycle. Before `$workflow-end`, emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED); completion requires every required criterion PASS or BLOCKED with a user-facing escalation.

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

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

- **[BLOCKING]** Confirm mode via a direct user question BEFORE any action — NEVER skip Step 0
- **[BLOCKING]** Invoke skill invocation for EACH step — NEVER batch-complete or mark done without invocation
- **[BLOCKING]** Spawn sub-agents for 4+ capabilities in ONE message — NEVER sequential spawning
- **[BLOCKING]** ONE canonical artifact — the Feature Spec at `docs/specs/{Bucket}/README.{Feature}.md`; the §5 Mermaid ERD is authored INSIDE it (no separate ERD file, no A-E tree)
- **[BLOCKING]** Scout holistically FIRST — capability registry MUST exist before plan creation; NEVER re-run scout or plan in a resumed session
- **[BLOCKING]** Plan decomposes big→small — ONE task per capability Feature Spec; split a capability when body §1-7 >1200 lines OR TCs >40
- **[BLOCKING]** Per-section authoring: write each section immediately — NEVER accumulate across sections
- **[REQUIRED]** §1-7 STRICTLY tech-free (no framework names, no language constructs, no class names in prose); identifiers live only in §8 evidence carriers, `[Source: ns/service/id]`, and ` ```mermaid ``` ` blocks — mark `[UNVERIFIED]` not blank
- **[REQUIRED]** Each sub-agent prompt MUST include: capability name, output path, tech-agnostic contract, SYNC protocols (critical-thinking, evidence-based, incremental-persistence, cross-scope boundary)
- **[BLOCKING]** Context compaction / session resume → the current task list first, re-glob existing Feature Specs, skip done capabilities — NEVER re-run scout or plan
- **[BLOCKING]** review-artifact: PASS = zero `[UNVERIFIED]` without exclusion reason + zero tech terms in §1-7; gap found → validate findings → fix validated gaps → restart the full review-artifact pass from the first check
- **[BLOCKING]** Verify the current task list count ≥ capability_count before any authoring begins — this is the plan completeness gate
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
