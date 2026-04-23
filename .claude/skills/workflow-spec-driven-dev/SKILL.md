---
name: workflow-spec-driven-dev
version: 2.1.0
last_reviewed: 2026-04-21
description: '[Workflow] Unified spec-driven development workflow — maintains both engineering spec bundle (docs/specs/{app-bucket}/{system-name}/) and business feature docs (docs/business-features/) in sync. Exception: accounts stays flat at docs/specs/accounts/. Modes: init-full (zero → both layers), update (code change → incremental sync both layers), audit (staleness check both layers). Replaces and merges workflow-spec-discovery + standalone feature-docs init. Use for: initial spec generation, ongoing spec maintenance, quarterly spec audits, tech migration specs, onboarding, compliance documentation, clone/fork briefs.'
disable-model-invocation: true
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

**IMPORTANT MANDATORY Steps:** mode-detection -> discovery-scout -> size-evaluation -> extraction-plan -> plan-review -> plan-validation -> execute-mode-sequence -> review-artifact -> watzup -> workflow-end

> **[BLOCKING]** Invoke `Skill` tool for EACH step — NEVER batch-complete, NEVER mark done without skill invocation.
> **[BLOCKING]** Confirm mode via `AskUserQuestion` BEFORE any action — NEVER skip Step 0.
> **[BLOCKING]** Spawn sub-agents for 4+ modules in ONE message — NEVER sequential spawning.
> **[BLOCKING — Context Compaction / Session Resume]** At any session start or after context compaction: (1) `TaskList` FIRST — resume existing, NEVER create duplicates; (2) read `docs/specs/{app-bucket}/{system-name}/README.md` completeness table — skip already-extracted modules (✅); (3) NEVER re-run `/scout` or `/plan` in a resumed session.
> **[BLOCKING]** Read `docs/project-reference/spec-principles.md` before running any extraction/update/audit step — it is the shared spec quality baseline for both engineering spec and feature-doc layers.

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

> **Sub-Agent Return Contract** — Sub-agent MUST return ONLY this structure. Main agent reads only summary — NEVER requests full sub-agent output inline.
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
> Main agent reads `Full report` ONLY when: (a) resolving specific blocker, or (b) building fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — never held in memory.

<!-- /SYNC:subagent-return-contract -->

## Quick Summary

**Goal:** Single entry point for spec-driven doc generation and maintenance. Two output layers, one workflow.

**Output Layers:**

| Layer                 | Path                                     | Format                                                       | Audience                         |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------ | -------------------------------- |
| Engineering Spec      | `docs/specs/{app-bucket}/{system-name}/` | Tech-agnostic bundle (ERD + rules + API + events + journeys) | Engineers, AI agents, architects |
| Business Feature Docs | `docs/business-features/{Module}/`       | 17-section stakeholder docs                                  | PO, BA, Dev, QA, UX              |

**Mode Routing:**

| Mode        | When to Use                                  | Step Sequence                                                                                                                                                             |
| ----------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init-full` | Zero — no specs, no feature docs             | scout → **size-evaluation** → **plan** → **plan-review** → **plan-validate** → spec-discovery(init) → feature-docs(init) → review-artifact → watzup → workflow-end        |
| `update`    | Code changed, new requirement, new PBI       | workflow-review-changes → spec-discovery(update) → feature-docs(update) → **tdd-spec(update)** → tdd-spec [direction=sync](sync) → review-changes → watzup → workflow-end |
| `audit`     | Quarterly health check, verify doc freshness | scout → spec-discovery(audit) → feature-docs(audit) → review-artifact → watzup → workflow-end                                                                             |

**Key Rules:**

- Confirm mode via `AskUserQuestion` BEFORE any action — NEVER skip Step 0
- Invoke `Skill` tool for EACH step — NEVER batch-complete or mark done without invocation
- Spawn sub-agents for 4+ modules in ONE message — NEVER sequential
- NEVER skip Phase A.ERD — mandatory with every Phase A extraction
- Write findings incrementally after each section — NEVER hold in memory

---

## Step 0 — Mode Detection (MANDATORY FIRST)

Use `AskUserQuestion` confirm mode before any action.

**Auto-detection rules:**

```
IF docs/specs/{app-bucket}/{system-name}/ NOT found AND docs/business-features/ has NO modules
  → Suggest: init-full

IF docs/specs/{app-bucket}/{system-name}/ NOT found AND docs/business-features/ has modules
  → Suggest: init-specs-only (run spec-discovery init only, feature-docs already has docs)

IF git diff has service/frontend changes
  → Suggest: update

IF explicit --audit flag OR user says "audit" / "check freshness" / "are docs stale"
  → Suggest: audit
```

**System name confirmation:**

Check for existing spec dirs:

```bash
ls docs/specs/ 2>/dev/null
```

- Dirs found → each is an `{app-bucket}` (e.g., `bravoTALENTS`, `bravoGROWTH`, `bravoSURVEYS`, `bravoINSIGHTS`, `CandidateApp`, `SupportingServices`). **Exception:** `accounts/` stays flat (no app-bucket level). To find a specific `{system-name}`, probe `ls docs/specs/{app-bucket}/`.
- Empty → ask: "System name for spec path? Use a single service name (e.g., `growth`, `candidate`) under its app bucket (e.g., `bravoGROWTH/growth`, `bravoTALENTS/candidate`)."
- **Note:** The path is now two-level: `docs/specs/{app-bucket}/{system-name}/`. Exception: `accounts` stays at `docs/specs/accounts/` (flat). For BravoSUITE, the per-service layout is preferred — one dir per service under its app bucket.

Present detected mode with reasoning. User confirms before proceeding.

---

## MODE: init-full

### When to Use

Starting from zero: no `docs/specs/{app-bucket}/{system-name}/`, no `docs/business-features/{Module}/` for target scope.

### Step Sequence

```
## Step A — Discovery (scout)

/scout
  → Holistic codebase map — module registry, entry points, integration boundaries
  → Produce: docs/specs/{app-bucket}/{system-name}/00-module-registry.md
  → Instruct scout: use spec-discovery Step 1 format (NOT task-file list)
  → TaskCreate: "scout — produce module registry for {system-name}"

## Step B — Size Evaluation and Divide-and-Conquer Planning (MANDATORY — runs BEFORE plan)

**[BLOCKING GATE]** Before writing any extraction plan, evaluate scope and recursively decompose until
each work unit is independently executable.

Evaluation algorithm (run inline after /scout completes):

```

ESTIMATE:
module_count = count dirs in 00-module-registry.md
phases_per_module = count applicable phases (A, B, C, D, E)
total_tasks = module_count × phases_per_module

IF total_tasks > 50 (e.g., 13 modules × 5 phases = 65):
→ SPLIT into groups: max 10 modules per extraction run
→ Create one extraction plan per group
→ Run groups sequentially (one session each)
→ STOP — do NOT attempt full extraction in one session

IF 15 < total_tasks ≤ 50 (e.g., 4–10 modules):
→ Sub-agents mandatory (one per module)
→ Single plan covering all modules — proceed to /plan

IF total_tasks ≤ 15 (1–3 modules):
→ Single-session extraction — proceed to /plan

```

**Recursive decomposition rule:** If any extraction group still feels too large after splitting, split again.
Each sub-agent must handle ≤ 3 modules with ≤ 5 phases each = max 15 tasks per agent. This prevents
high-level shallow output from context dilution.

TaskCreate: "size-evaluation — count modules, estimate total_tasks, decide split strategy"

## Step C — Extraction Plan

/plan
  → Decompose into per-module × per-phase tasks (N×M minimum)
  → Phase A.ERD always included with Phase A (separate task per module)
  → ONE task per module × phase — 10 modules × 5 phases = 50 tasks minimum
  → ≤50 files per task — split large modules: "Business Rules: Orders (Part 1: Commands)", "(Part 2: Event Handlers)"
  → Dependency order: Phase A (domain model) before Phase B (business rules) per module
  → Priority: core domain modules first, infrastructure last
  → Verify TaskList count ≥ N×M before proceeding (BLOCKING gate)
  → If split strategy needed: produce one plan per extraction group
  → Produce: docs/specs/{app-bucket}/{system-name}/extraction-plan.md
  → TaskCreate: "plan — produce N×M extraction plan (N modules × M phases)"

## Step D — Plan Review

/plan-review
  → Validate: N×M task count confirmed, module coverage complete, no phase gaps
  → Verify: no module exceeds 3-module-per-agent limit if sub-agents used
  → Verify: each extraction group is independently executable (no cross-group deps)
  → REJECT plan if: any task is vague ("extract everything"), any agent handles >3 modules,
    any phase missing for a module that has that concern
  → Verify: every task scoped to ≤50 files — split if larger
  → TaskCreate: "plan-review — validate N×M count, agent assignments, no phase gaps"

## Step E — Plan Validation

/plan-validate
  → User confirms: system-name, scope (full/scoped), module list, phases to extract, split strategy
  → TaskCreate: "plan-validate — user confirms scope and split strategy"

/spec-discovery [mode=init]
  → Full extraction → docs/specs/{app-bucket}/{system-name}/
  → Phases: A (domain model + ERD) → B (rules) → C (API) → D (events) → E (journeys)
  → Phase A.ERD: produces `01-domain-erd.md` — Mermaid erDiagram with ALL entities, relationships,
    cardinalities, and aggregate boundaries; foundational artifact referenced by phases B–E
  → Per-task investigation: READ (grep → narrow → read) → TRACE (call chain, validators, triggers)
    → EXTRACT (this phase/module only) → WRITE ([Source: file:line] every claim)
    → VERIFY (mark [UNVERIFIED] without source) → COMPLETE
    NEVER accumulate across tasks — write output after each task immediately
  → Phase F: bundle assembly + README completeness index + SPEC-CHANGELOG.md
  → Phase F.5: per-module README.md (17-section summaries)
  → Sub-agents for 4+ modules (BLOCKING: ONE message spawn)
  → Each sub-agent prompt MUST include: module name, task list, output path, tech-agnostic contract,
    SYNC protocols (critical-thinking, evidence-based, incremental-persistence, cross-scope boundary)

/feature-docs [mode=init]
  → Per-module 17-section docs — runs OWN Phase A-E extraction from source code independently
  → Note: duplicates some source-reading from spec-discovery — ACCEPTED TRADE-OFF
    (see plans/260420-0337-spec-driven-dev-unified/README.md Decision 3: cohesion > coupling —
    feature-docs→spec-discovery one-directional; tight coupling would break on schema changes)
  → spec-discovery output in docs/specs/{app-bucket}/{system-name}/ readable as shortcut reference,
    but feature-docs does NOT take it as formal input parameter
  → Output: docs/business-features/{Module}/detailed-features/README.{Feature}.md
  → Create CHANGELOG.md per module
  → Sub-agents: one per module for 4+ modules (scale gate applies in workflow context only)

/review-artifact
  → Quality check both layers:
    - Engineering spec: source citations, tech-agnostic, completeness, ERD coverage
    - Feature docs: 17 sections, YAML frontmatter, max 1500 lines, evidence in Sections 5+6+15
  → PASS criteria for engineering spec: zero [UNVERIFIED] without exclusion reason + zero tech-specific
    terms (framework names, language constructs, class names) in any spec file
  → MANDATORY: compare entity count + rule count between docs/specs/{app-bucket}/{system-name}/ and docs/business-features/
    for each module. Discrepancy >10% → flag as gap in watzup summary
  → Engineering spec authoritative for structure; feature-docs authoritative for UI/test sections
  → Gap found → fix task → re-investigate → fix → spawn fresh code-reviewer sub-agent (max 2 rounds)
  → NEVER inline re-review — main agent rationalizes its own output

/watzup
  → Session summary:
    - Spec bundle: N modules, X files, ~Y lines, completeness matrix (module × phase ✅/⚠️/❌)
    - Feature docs: N modules, X feature docs
    - Coverage gaps (PARTIAL modules — spec layer vs feature-docs layer)
    - Open questions (confidence < 80%)
    - Next recommended actions: /product-discovery (future backlog from spec), /greenfield-init
      (re-implementation plan), /feature-docs (expand individual features)

/workflow-end
```

---

## MODE: update

### When to Use

Code changed (new feature, bug fix, refactor, new PBI). Sync both layers incrementally.

### Scope Sources

1. Auto-detect from `git diff --name-only HEAD` (default)
2. Explicit module list from user
3. New PBI or requirement description (map to affected modules manually)

### Step Sequence

```
/workflow-review-changes
  → Full code review cycle + docs-update (Phase 2 feature-docs + Phase 2.5 spec-discovery lightweight update)
  → docs-update inside workflow-review-changes does a DIFF-SCOPED lightweight pass:
      Phase 2: /feature-docs update (impacted sections only)
      Phase 2.5: /spec-discovery update (impacted modules × phases only, if bundle exists)
  → Produces: impact map (modules affected, phases impacted, doc sections to update)
  → NOTE: If docs/specs/ does NOT exist, Phase 2.5 is skipped — proceed to /spec-discovery below to initialize or skip entirely

/spec-discovery [mode=update]
  → INTENTIONAL DEEPER RE-EXTRACTION — not a duplicate of docs-update Phase 2.5
  → docs-update Phase 2.5 = diff-scoped lightweight sync (fast, surface-level)
  → This call = full phase re-extraction per impacted module (reads ALL source, not just diff)
  → Use when: significant structural changes, new aggregates/events, or docs-update Phase 2.5 flagged [UNVERIFIED] gaps
  → SKIP THIS STEP if: docs-update Phase 2.5 completed with zero gaps AND no [UNVERIFIED] items — mark as "Skipped: docs-update Phase 2.5 sufficient"
  → Input: impact map from workflow-review-changes
  → Re-extract only impacted modules × phases
  → Append to SPEC-CHANGELOG.md
  → Update per-module README.md summaries
  → Update last_extracted frontmatter on changed spec files

/feature-docs [mode=update]
  → INTENTIONAL DEEPER RE-EXTRACTION — not a duplicate of docs-update Phase 2
  → docs-update Phase 2 = impacted-sections-only lightweight sync
  → This call = full 17-section pass with 3-pass verification (evidence audit, domain model, cross-reference)
  → Use when: new features added, major section restructure, or docs-update Phase 2 reported gaps
  → SKIP THIS STEP if: docs-update Phase 2 completed with zero gaps — mark as "Skipped: docs-update Phase 2 sufficient"
  → Input: same impact map from workflow-review-changes
  → Run section impact mapping (Phase 1.5)
  → Update only impacted sections in each feature doc
  → Append to module CHANGELOG.md

/tdd-spec [mode=update]
  → **EXPLICIT TC STEP — required in update mode when new functionality added**
  → SKIP THIS STEP if: changes are purely cosmetic (CSS, comments, config only) — mark as "Skipped: no behavioral impact"
  → Input: impact map from workflow-review-changes + feature-docs update output
  → Mode detection: If new commands/queries/endpoints added → `implement-first`; if PBI-driven → `TDD-first`; if TC edits only → `update`
  → Write/update TCs in feature doc Section 15 for all impacted modules
  → TC ID collision prevention: grep existing IDs before assigning new ones
  → Do NOT overwrite Tested TCs — append new TCs and mark stale TCs for review

/tdd-spec [direction=sync] [direction=forward]
  → Forward sync: feature doc Section 15 → docs/specs/ dashboard
  → SKIP THIS STEP if: no TC changes in this update cycle
  → Orphan check: quarantine dashboard TCs with no feature-doc source

/review-changes
  → Holistic review of changes to both layers
  → Verify: spec changes match code changes (no over/under documentation)
  → Verify: feature doc sections updated match impact map
  → Verify: new TCs cover all new functionality (no coverage gaps)

/watzup
  → Summary: modules updated, spec files changed, feature doc sections changed, TCs added/updated
  → Any new open questions or UNVERIFIED items introduced

/workflow-end
```

### New PBI / Requirement Update Protocol

Triggering update from new PBI or requirement (not code change):

```
After /workflow-review-changes:
  → User provides PBI text or requirement description
  → Map requirement → affected domain entities → affected modules
  → Treat as "speculative update": add new sections/rules to spec files marked [PLANNED — not yet implemented]
  → Add corresponding TCs in feature doc Section 15 marked Status: Planned
  → These become implementation guidance, not verified spec
```

---

## MODE: audit

### When to Use

Periodic health check (quarterly or before major release). Verify both layers current.

### Audit Time Estimation

Before starting audit, estimate duration to set expectations:

```
audit_effort = module_count × avg_phases_per_module × 5min_per_phase
example: 8 modules × 4 phases = 160 min ≈ 2.5h (AI-assisted)
```

Budget multiplier: If last audit was >90 days ago → ×1.5 (more drift expected).

### Step Sequence

```
/scout
  → Quick codebase scan: current state of entities, commands, controllers
  → Note: scout in audit mode is lightweight — 30min max, no deep investigation

/spec-discovery [mode=audit]
  → Compare each spec file's last_extracted vs git log of source files
  → Produce: docs/specs/{app-bucket}/{system-name}/SPEC-AUDIT-{date}.md
  → Output: stale modules table with recommended re-extraction scope

/feature-docs [mode=audit]
  → Compare each feature doc's last_updated vs git log of source files
  → Produce: docs/business-features/{Module}/AUDIT-{date}.md per module
  → Output: stale sections table with recommended update scope

/review-artifact
  → Consolidated audit report across both layers
  → Produce: plans/reports/spec-audit-{date}-{system-name}.md
  → Include: total stale coverage %, estimated update effort, priority order

/watzup
  → Present action plan: which modules/features to update first
  → Recommend: run update mode scoped to stale modules

/workflow-end
```

---

## Conditional Skip Rules

| Step                          | Skip When                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Phase A.ERD in init           | Never — ERD mandatory with Phase A                                             |
| `/feature-docs` in init-full  | User explicitly requests spec-only output                                      |
| `/spec-discovery` in update   | `docs/specs/{app-bucket}/{system-name}/` doesn't exist (run init-full instead) |
| `/review-artifact` audit pass | No gaps found in both layers AND no UNVERIFIED items                           |
| Phase C (API)                 | Internal library with no public endpoints                                      |
| Phase D (Events)              | No async messaging or background jobs                                          |
| Phase E (Journeys)            | Backend-only scope, no user-facing UI                                          |

---

## Sub-Agent Coordination Protocol (init-full, 4+ modules)

1. `/scout` + `/plan` in main context → module registry + N×M task list
2. Spawn spec-discovery sub-agents (one per module) in ONE message
3. Wait for all spec sub-agents to complete
4. Spawn feature-docs sub-agents (one per module) in ONE message
5. Main context assembles both layers in `/review-artifact`

Each spec-discovery sub-agent receives:

- Module Registry path
- Assigned module task list
- Output path: `docs/specs/{app-bucket}/{system-name}/{module-id}-{module-name}/`
- Incremental persistence instruction (write after each task)

Each feature-docs sub-agent receives:

- Module name + feature name
- Output path: `docs/business-features/{Module}/`
- Incremental persistence instruction

---

## Integration with docs-update workflow step

`docs-update` called as workflow step (not standalone) automatically includes spec-discovery update via Phase 2.5:

```
docs-update (as workflow step):
  Phase 1: Project docs (inline — unchanged)
  Phase 2: /feature-docs update mode (existing)
  Phase 2.5: /spec-discovery update mode (NEW — if docs/specs/{app-bucket}/{system-name}/ exists AND spec_discovery_update != false in project-config.json)
  Phase 3: /tdd-spec (existing)
  Phase 4: /tdd-spec [direction=sync] (existing)
```

Both layers stay in sync on every feature/bugfix/refactor workflow.

---

## When to Use vs When NOT to Use

### Use This Workflow

- First-time spec generation for module or full system
- After significant code changes (new feature, major refactor)
- Onboarding new team to codebase — spec bundle as knowledge handoff artifact
- Before tech migration or re-implementation on new stack
- Quarterly spec health audits
- After new PBIs groomed for implementation spec
- Compliance documentation — prove system behavior in plain language
- Clone/fork — brief any AI agent for reimplementation
- Verify design intent — compare spec bundle against original vision
- Generate future backlog from spec bundle via `/product-discovery`

### Use Standalone Skills Instead

| Goal                                               | Use                        |
| -------------------------------------------------- | -------------------------- |
| Update one specific feature doc after small change | `/feature-docs` directly   |
| Extract spec for one specific module               | `/spec-discovery` directly |
| Understand one specific feature                    | `/investigation`           |
| Write integration tests from existing spec         | `/write-integration-test`  |

---

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

---

**IMPORTANT MANDATORY Steps:** mode-detection -> discovery-scout -> size-evaluation -> extraction-plan -> plan-review -> plan-validation -> execute-mode-sequence -> review-artifact -> watzup -> workflow-end

## Closing Reminders

- **[BLOCKING]** Confirm mode via `AskUserQuestion` BEFORE any action — NEVER skip Step 0
- **[BLOCKING]** Invoke `Skill` tool for EACH step — NEVER batch-complete or mark done without invocation
- **[BLOCKING]** Spawn sub-agents for 4+ modules in ONE message — NEVER sequential spawning
- **[BLOCKING]** NEVER skip Phase A.ERD — produces `01-domain-erd.md` Mermaid erDiagram with ALL entities, relationships, cardinalities, and aggregate boundaries; foundational for phases B–E
- **[BLOCKING]** Scout holistically FIRST — Module Registry MUST exist before plan creation; NEVER re-run scout or plan in resumed session
- **[BLOCKING]** Plan decomposes big→small — ONE task per module × phase, every task ≤50 files in scope; split large modules with part labels
- **[BLOCKING]** Dependency order: Phase A (domain model) before Phase B (rules) per module; priority: core domain modules first, infrastructure last
- **[BLOCKING]** Per-task investigation: READ → TRACE → EXTRACT → WRITE immediately — NEVER accumulate across tasks
- **[REQUIRED]** Every claim cites `[Source: file:line]` — mark `[UNVERIFIED]` not blank; all output tech-agnostic (no framework names, no language constructs)
- **[REQUIRED]** Each sub-agent prompt MUST include: module name, task list, output path, tech-agnostic contract, SYNC protocols (critical-thinking, evidence-based, incremental-persistence, cross-scope boundary)
- **[BLOCKING]** Context compaction / session resume → `TaskList` first, read completeness tracker, skip ✅ modules — NEVER re-run scout or plan
- **[BLOCKING]** review-artifact: PASS = zero `[UNVERIFIED]` without exclusion reason + zero tech terms; gap found → fresh code-reviewer sub-agent (max 2 rounds) — NEVER inline re-review
- **[BLOCKING]** Verify TaskList count ≥ N×M before any extraction begins — this is the plan completeness gate
- **[REQUIRED]** Apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
- **[REQUIRED]** Apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->
