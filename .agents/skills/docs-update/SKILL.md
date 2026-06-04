---
name: docs-update
description: '[Documentation] Use when updating impacted documentation after code, spec, or test changes.'
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

**Goal:** Detect impacted docs from code changes and orchestrate updates across all doc types so every code/spec/test change leaves documentation in sync — impacted Feature Specs, §8 TCs, test-code links, and derived indexes all reflect the shipped behavior, with zero drift left silent.

**Summary:**

- This skill is a ROUTER, not an author — start with Phase 0 triage (git diff → categorize → dedup modules) and delegate each doc type to its owner (`$spec`, `$spec [mode=tests]`, `$spec [mode=sync]`, `$spec-index`); NEVER write §8 or `docs/specs/` content directly.
- Create ALL 8 tasks via task tracking before touching any file; run the fixed phase order `0 → 1 → 2 → 2.5 → 3 → 4 → 5 → final review` and mark every skipped phase `completed` with a reason — fast-exit is a decision, never a silent omission.
- The final pass (Step 2.4) is the workflow's last gate: per touched module verify the shipped code against §3 ACs, §4 BRs, and §8 TCs — a removed/weakened [HARD] BR is a code-vs-spec contradiction that BLOCKS completion.
- Output is tech-agnostic prose (no framework/product names outside evidence fields) and traceability-first (update `FR-`/`BR-`/`OP-`/`TC-` logical IDs before prose); ALWAYS write the Phase 5 summary report as the audit trail.

**Orchestration Model:**

```
git diff → Triage → Phase 1: Project Docs (inline)
                  → Phase 2: $spec (business feature docs)
                  → Phase 2.5: $spec-index (derived index/ERD refresh) [optional]
                  → Phase 3: $spec [mode=tests] (§8 test specifications)
                  → Phase 4: $spec [mode=sync] (§8 ↔ test code sync)
                  → Phase 5: Summary Report
```

**Key Rules:**

- Router only — NEVER duplicate sub-skill logic or write Section 8 / `docs/specs/` content
- Each phase checks whether needed before invoking — skip phases with no impact
- Step-to-skill order is fixed — run phases sequentially, never out of order
- ALWAYS report what was checked, even if nothing needed updating
- Pass triage context (changed files, detected modules, impacted sections) to each sub-skill via `$ARGUMENTS`
- MUST ATTENTION dedup module list — backend + frontend changes for same module = ONE entry
- MUST ATTENTION track step state live: `in_progress` -> execute -> `completed` (or `completed` with skip reason)
- For `.claude` skills/hooks/workflows/sync tooling changes, flag generated mirror sync status (`npm run codex:sync` completed or explicit N/A). `docs-update` routes and reports this check; it does not edit generated mirrors directly.
- **[BLOCKING] Tech-agnostic output:** when updating spec/specs/README/INDEX, do NOT introduce framework/product/language/design-pattern names into prose or headings — preserve the evidence-field exception (`**Evidence**`, `IntegrationTest`, `[Source:]`, frontmatter, Mermaid). Authority: `docs/project-reference/spec-principles.md` §3.
- **[BLOCKING] M3 Traceability Update:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)" for BLOCKING criteria. When syncing docs after code changes, update the logical-ID mappings (`FR-`/`BR-`/`OP-`/`TC-`) FIRST, then the prose. The `[Source: namespace/service/id]` abstract-anchor evidence is re-resolved ONLY if the logical artifact was renamed/split — a file move or stack change does NOT change the anchor (physical coords live only in the provenance sidecar) — and the logical-ID spine stays stable across the change — never drop or renumber a logical ID just because the code moved. Keep all synced prose M1/M2-clean.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80%.**

---

## Mandatory Task Creation (ZERO TOLERANCE)

> **[BLOCKING]** Create ALL 8 tasks via task tracking BEFORE touching any file. NEVER consolidate, rename, omit. Conditional tasks skipped: mark `completed` immediately with reason — NEVER silently omit.

| #   | Task Subject                                                                                                                                                                                   | Conditional?                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | `[docs-update] Phase 0 — Triage: collect git diff, categorize files, detect modules, check existing docs`                                                                                      | No — always first                                                                           |
| 2   | `[docs-update] Phase 1 — Update project docs (project-structure-reference.md, README.md)`                                                                                                      | Yes — only if configured framework/shared source paths or architectural changes are in diff |
| 3   | `[docs-update] Phase 2 — Invoke $spec: update business feature docs`                                                                                                                           | Yes — service/frontend files changed AND module has existing feature docs                   |
| 4   | `[docs-update] Phase 2.5 — Invoke $spec-index [mode=index]: refresh derived bucket INDEX/ERD`                                                                                                  | Yes — a Feature Spec changed AND the bucket maintains a derived index/ERD                   |
| 5   | `[docs-update] Phase 3 — Invoke $spec [mode=tests]: update/add §8 test specifications`                                                                                                         | Yes — new functionality added OR existing behavior changed                                  |
| 6   | `[docs-update] Phase 4 — Invoke $spec [mode=sync]: sync §8 ↔ test code`                                                                                                                        | Yes — Phase 3 changed §8 TCs                                                                |
| 7   | `[docs-update] Phase 5 — Write summary report to plans/reports/docs-update-{YYMMDD}-{HHMM}.md`                                                                                                 | No — always                                                                                 |
| 8   | `[docs-update] Final review — verify all impacted docs updated, no phases skipped without justification, AND run the Step 2.4 code↔spec sync-verify (AC/BR/TC drift) for every touched module` | No — always                                                                                 |

**Execution rules:**

- Mark each task `in_progress` when starting, `completed` when done — one active at a time
- Multiple modules → add one subtask per module for Phase 2/3 invocations
- NEVER batch-complete — each sub-skill invocation tracked individually
- Phase 0 fast-exit (tooling-only changes) → mark tasks 2-8 `completed` with reason "Skipped — no business code changed"
- NEVER execute a phase step until matching task status is `in_progress`
- After each phase/skill call, write one-line evidence in task update (`what ran`, `what changed`, `why skipped`)
- If task tracking/task updates unavailable, maintain equivalent 8-task plan tracker with same status transitions

---

## Step-Skill Call Order (Do Not Reorder)

| Order | Task ID | Step / Phase                     | Skill Call                             | Tracking Rule                                                                                 |
| ----- | ------- | -------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1     | 1       | Phase 0: Triage                  | Inline triage logic in this skill      | Set Task 1 `in_progress` before diff scan; set `completed` after module + impact map recorded |
| 2     | 2       | Phase 1: Project Docs            | `docs-manager` sub-agent (if impacted) | Set Task 2 `in_progress` before spawn/update; `completed` with updated docs or skip reason    |
| 3     | 3       | Phase 2: Business Feature Docs   | `$spec`                                | Set Task 3 `in_progress` before invocation; `completed` after output review                   |
| 4     | 4       | Phase 2.5: Derived Index Refresh | `$spec-index [mode=index]`             | Set Task 4 `in_progress` before invocation; `completed` after INDEX rows match Feature Specs  |
| 5     | 5       | Phase 3: §8 Test Specs           | `$spec [mode=tests]`                   | Set Task 5 `in_progress` before invocation; `completed` after TC review                       |
| 6     | 6       | Phase 4: §8 ↔ Test Code Sync     | `$spec [mode=sync]`                    | Set Task 6 `in_progress` before invocation; `completed` after sync validation                 |
| 7     | 7       | Phase 5: Summary Report          | Inline report write                    | Set Task 7 `in_progress` before report write; `completed` after file path confirmed           |
| 8     | 8       | Final Review                     | Inline verification gate               | Set Task 8 `in_progress` before final audit; `completed` after all phases justified           |

**Enforcement:** If a required step cannot run, STOP and ask user before adapting order. Never continue with untracked steps.

---

## Phase 0: Triage — Detect Impacted Documentation

### Step 0.1: Collect Changed Files

1. Run `git diff --name-only HEAD` (staged + unstaged changes)
2. No uncommitted changes → `git diff --name-only HEAD~1` (last commit)
3. Still empty → `git diff --name-only origin/develop...HEAD` (branch changes)

### Step 0.2: Categorize Changes

| Changed File Pattern                                                                 | Impact Category                                 | Phases to Run |
| ------------------------------------------------------------------------------------ | ----------------------------------------------- | ------------- |
| `{backend-source-paths}/**` from `docs/project-config.json`                          | **spec** + **spec [mode=tests]** + project-docs | 1 + 2 + 3 + 4 |
| `{frontend-apps-dir}/**`, `{frontend-libs-dir}/{domain-lib}/**`                      | **spec** + **spec [mode=tests]** + project-docs | 1 + 2 + 3 + 4 |
| `{legacy-frontend-dir}/**Client/**`                                                  | **spec** + **spec [mode=tests]** + project-docs | 1 + 2 + 3 + 4 |
| `{configured-framework-source-paths}/**`                                             | project-docs only                               | 1 only        |
| `docs/**`                                                                            | project-docs only                               | 1 only        |
| `.claude/**`, config files only                                                      | **none**                                        | Fast exit     |
| `{frontend-libs-dir}/{framework-core-lib}/**`, `{frontend-libs-dir}/{common-lib}/**` | project-docs only                               | 1 only        |

### Step 0.3: Fast Exit Check

ALL changed files in **none** category (only `.claude/`, `.github/`, root config):

- Report: `"No documentation impacted by current changes (config/tooling only)."`
- Mark tasks 2-8 `completed` with reason "Skipped — no business code changed"
- **Exit early.**

### Step 0.4: Auto-Detect Affected Modules

Extract unique module names from changed paths. **MUST ATTENTION dedup:** `unique()` before passing to any sub-skill — backend + frontend same module = ONE entry. Prevents duplicate `$spec` invocations.

| Changed File Path Pattern                                       | Detected Module                  |
| --------------------------------------------------------------- | -------------------------------- |
| `{backend-module-path}/{Module}/**`                             | {Module}                         |
| `{frontend-apps-dir}/{app-name}/**`                             | {Module} (map app to module)     |
| `{frontend-libs-dir}/{domain-lib}/{configured-feature-path}/**` | {Module} (map feature to module) |
| `{legacy-frontend-dir}/{Module}Client/**`                       | {Module}                         |

Build project-specific mapping from `docs/project-config.json` and project reference docs, not from hard-coded skill paths:

```bash
node -e "const cfg=require('./docs/project-config.json'); console.log(JSON.stringify({sourcePaths: cfg.codebaseHealth?.sourcePaths, contextGroups: cfg.contextGroups?.map(g => ({name:g.name,pathRegexes:g.pathRegexes})), specRoot: 'docs/specs/'}, null, 2))"
node -e "process.stdout.write('docs/specs/')"
```

### Step 0.5: Check Existing Docs for Each Module

For each detected module:

1. Check the matching bucket directory exists under `docs/specs/`
2. Check that the bucket contains `README.*.md` Feature Specs, or use the project reference doc's feature-doc layout
3. Check the matching bucket directory under `docs/specs/` exists using project reference docs
4. Record: `hasFeatureSpec` (§1–§7 present), `hasTestSpecs` (§8 present), `hasDerivedIndex` (bucket INDEX.md present)

---

## Phase 1: Project Documentation Update (Inline)

**When to run:** Diff includes configured framework/shared source paths, `docs/**`, or architectural changes.

**When to skip:** Only service-layer or frontend feature files changed. Skip → proceed to Phase 2.

### Step 1.1: Spawn Scouts (standalone invocation only)

Standalone (not workflow step): spawn 2-4 `scout-external` (preferred) or `scout` (fallback) via Task. Merge results into context.

Workflow step: skip — use Phase 0 git diff context.

### Step 1.2: Update Project Docs

Pass context to `docs-manager` sub-agent (`agent_type="docs-manager"`) for project doc updates:

- `docs/project-reference/project-structure-reference.md` — update if service architecture or cross-service patterns changed
- `README.md` — update if project scope or setup changed (keep under 300 lines)

NEVER regenerate all docs — only update docs **directly impacted** by changes.

---

## Phase 2: Business Feature Documentation — Invoke `$spec`

**When to run:** Triage detected modules with `hasFeatureDocs = true` AND service/frontend files changed.

**When to skip:** No service/frontend feature files changed. Report: `"No business feature docs impacted."`

### Step 2.1: Determine Create vs Update

| Scenario                                                                                                                                    | Action                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module has existing feature docs                                                                                                            | Invoke `$spec` — auto-detect triggers update flow                                                                                                                                                                                       |
| Module has NO feature docs **AND change adds/changes a feature** (new endpoint, command/query, entity, business rule, user-facing behavior) | **BLOCK** — Report: `"Module {Module} has NO Feature Spec but this change introduces feature behavior. Create the tech-free 8-section Feature Spec FIRST via $spec, then re-run docs-update."` Do NOT skip. This is the doc-first gate. |
| Module has NO feature docs **AND change is tooling/style/config-only** (no behavioral impact)                                               | Skip with reason `"No feature behavior changed — no Feature Spec required."` (matches Phase 0 fast-exit at `:113-120`).                                                                                                                 |
| User explicitly asked for full doc creation                                                                                                 | Invoke `$spec` with explicit module name                                                                                                                                                                                                |

### Step 2.2: Invoke `$spec`

```
$spec Update feature docs for modules: {detected modules}.
Changed files: {list from triage}.
Impacted sections based on change types: {section impact from triage}.
Mode: update (existing docs only, do not create from scratch).
```

**What `$spec` handles (DO NOT duplicate here):**

- 8-section tech-free structure enforcement
- Diff analysis → section impact mapping
- Codebase analysis (entities, commands, queries, controllers)
- Update impacted sections with evidence
- Bucket `INDEX.md` catalog row update
- 3-pass verification (evidence audit, domain model, cross-reference)
- Tech-free principles (no implementation details in §1–§7; evidence carriers in §8 + `[Source:]` only)

### Step 2.3: Review `$spec` Output

1. Updated sections align with triage's section impact mapping
2. No sections missed that triage flagged as impacted
3. Gaps found → re-invoke `$spec` for missed sections

### Step 2.4: Code↔Spec Sync-Verify (final pass — runs because docs-update is last in every sequence)

> **Purpose:** docs-update already runs LAST in feature/bugfix/big-feature, so this is the workflow's final gate. It is the **order-time partner of the Phase 4 commit hook** (this step guides; the hook enforces). Verify the SHIPPED code actually matches the mapped tech-free 8-section Feature Spec before the workflow completes.

For each module touched in this run, diff the changed code against its Feature Spec and check three sets:

| Spec set (Feature Spec section)                               | Sync check against changed code                                                                                  | On drift                                                                       |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **§3 Acceptance Criteria** (AC-{FC}-NN)                       | Every changed user-facing behavior maps to an AC; new behavior with no AC = missing AC.                          | Report drift; re-invoke `$spec` to add the AC.                                 |
| **§4 Business Rules** (BR-{FC}-NNN, [HARD]/[SOFT])            | Each changed validation/invariant matches a BR; a [HARD] rule whose code path was removed/weakened = regression. | **BLOCK** — surface as a code-vs-spec contradiction for the author to resolve. |
| **§8 Test Specifications** (TC-{FC}-NNN + `IntegrationTest:`) | Each new/changed behavior has a TC; each `Tested` TC's `IntegrationTest: {File}::{Method}` still resolves.       | Report; route to `$spec [mode=sync]`.                                          |

**Output:** a short sync-verify table (module · AC drift · BR drift/contradiction · TC drift) appended to the docs-update report. Clean = no drift across all three. A [HARD]-BR contradiction blocks workflow completion until resolved or explicitly accepted by the owner.

> **Scope:** business code↔spec drift only. Technical contracts (API routes/DTOs, bus/job mechanics) are code-canonical and intentionally NOT re-verified against prose. No new sequence step and no `verify-sync` mode is added — this responsibility lives inside docs-update's existing final pass.

---

## Phase 2.5: Derived Index / ERD Refresh (OPTIONAL — spec-index)

> **[SINGLE-HOME]** There is no separate "engineering spec bundle". The canonical artifact is the 8-section Feature Spec updated in Phase 2. `spec-index` is **repurposed** to regenerate only the DERIVED bucket `INDEX.md` / cross-capability ERD **from** those Feature Specs — it never re-extracts an A-E tree. Run this phase only if the bucket maintains a derived index/ERD that the Phase 2 change made stale.

**When to run:** Phase 2 changed one or more Feature Specs AND the bucket maintains a derived `INDEX.md` / ERD aid that now lags.

**When to skip:**

- Only `docs/`, `.claude/`, or config files changed
- No Feature Spec under `docs/specs/{Bucket}/` was touched
- Phase 2 was skipped (no feature impact)
- The bucket maintains no derived index/ERD, OR `project-config.json` contains `"spec_discovery_update": false`
- `spec` already refreshed `INDEX.md` in Phase 2 (no separate refresh needed)

### Step 2.5.1: Resolve the Bucket

- Map the changed services to an App Bucket using the canonical table in `docs/project-reference/spec-system-reference.md` → **App Bucket Mapping**.
- Confirm `docs/specs/{Bucket}/` holds the updated Feature Spec(s).

### Step 2.5.2: Invoke spec-index (Derived Index Mode)

```
$spec-index mode=index bucket={Bucket} artifacts=INDEX[,ERD]
Source: the canonical Feature Specs in docs/specs/{Bucket}/.
Output: regenerated DERIVED docs/specs/{Bucket}/INDEX.md (+ {Bucket}.erd.md if maintained), each carrying the DERIVED banner.
```

### Step 2.5.3: Verify Refresh Complete

- Confirm `INDEX.md` rows match the current set of Feature Specs (no dangling links, no missing capabilities).
- Confirm the DERIVED banner + regenerate date are present.
- Report: `"Derived index refreshed: {Bucket} — {N} capabilities catalogued"`.

> **Separation of concerns:** `docs-update` orchestrates — passes the bucket scope to spec-index. NEVER hand-edits the derived index, and NEVER recreates `M##`/A-E artifacts (retired).

---

## Phase 3: Test Specifications — Invoke `$spec [mode=tests]`

**When to run:** New functionality added (commands, queries, endpoints, components) OR existing behavior changed.

**When to skip:** Changes purely cosmetic (styling, comments, docs-only) with no behavioral impact.

### Step 3.1: Determine TC Mode

| Context                                | TC Mode                  |
| -------------------------------------- | ------------------------ |
| New feature code, no existing TCs      | `implement-first`        |
| PBI/story exists, code not yet written | `TDD-first`              |
| Existing TCs + code changes / bugfix   | `update`                 |
| User says "sync test specs"            | `sync`                   |
| Tests exist with annotations, no docs  | `from-integration-tests` |

**PBI/idea artifact route:** when changed artifacts match configured PBI/idea artifact roots from `docs/project-config.json` or project reference docs, `docs-update` performs detection/delegation only. It may identify affected module, feature doc, and TC scope, then route to `$spec`, `$spec [mode=tests]`, or `$spec [mode=sync]`. It must not generate TC content directly from PBI/idea artifacts or edit Section 8 itself. If artifact roots are not configured, ask the user to initialize project config/reference docs before assuming a path.

### Step 3.2: Invoke `$spec [mode=tests]`

```
$spec [mode=tests] Mode: {detected mode}.
Modules: {detected modules}.
Changed files: {list from triage}.
New functionality detected: {new commands/queries/endpoints from diff analysis}.
```

**What `$spec [mode=tests]` handles (DO NOT duplicate here):**

- 5 modes: TDD-first, implement-first, update, sync, from-integration-tests
- TC-{FEATURE}-{NNN} format with decade-based numbering
- Interactive TC review (ask the user directly)
- Cross-cutting categories: authorization, seed data, performance, data migration
- Phase-mapped coverage (plan phases → TCs)
- Graph context analysis for cross-service impact
- Evidence verification per TC
- Write to feature doc Section 8 (canonical TC registry)

### Step 3.3: Review `$spec [mode=tests]` Output

1. New TCs cover all new functionality from triage
2. TC IDs don't collide with existing ones
3. Evidence fields populated (not template placeholders)

---

## Phase 4: Test Spec ↔ Test Code Sync — Invoke `$spec [mode=sync]`

**When to run:** Phase 3 produced new/updated TCs in §8 of a Feature Spec.

**When to skip:** No §8 test-spec changes.

### Step 4.1: Invoke `$spec [mode=sync]`

```
$spec [mode=sync] Sync test specs for capabilities: {detected features}.
Direction: forward (Feature Spec §8 Test Specifications → integration test code).
Updated TCs from Phase 3: {list of new/changed TC IDs}.
```

**What `$spec [mode=sync]` handles (DO NOT duplicate here):**

- Forward/reverse sync: §8 Test Specifications ↔ integration test code
- 2-way comparison: Feature Spec §8 vs test code (code is the technical source of truth)
- Integration test cross-reference (configured test-spec annotation key `TestSpec` and the per-TC `IntegrationTest:` field)

> The retired QA dashboards (`docs/specs/README.md`, `docs/specs/PRIORITY-INDEX.md`) and the `A-E`/`M##` engineering tree no longer exist — §8 is the canonical TC registry. The only derived TC roll-up is the bucket `INDEX.md` count, refreshed in Phase 2.5.

### Step 4.2: Review Sync Results

1. All new TCs from Phase 3 are reflected in test code (or flagged Untested with rationale).
2. No orphaned TCs (referenced by test code's `TestSpec` annotation but absent from §8).

---

## Section Ownership Reference

**Which skill owns which doc sections** — `docs-update` delegates only, NEVER writes directly:

| Section                         | Owner Skill              | docs-update Role                                      |
| ------------------------------- | ------------------------ | ----------------------------------------------------- |
| §1–§7 (Feature Spec, tech-free) | `$spec`                  | Pass triage context; review output                    |
| §8 (Test Specifications)        | `$spec [mode=tests]`     | Pass TC mode + changed files; NEVER write TCs here    |
| §8 ↔ test code sync             | `$spec [mode=sync]`      | Pass capability list + direction; NEVER edit directly |
| Derived bucket `INDEX.md` / ERD | `$spec-index` (optional) | Pass bucket scope; NEVER hand-edit the derived index  |

---

## Phase 5: Summary Report

ALWAYS write full report to `plans/reports/docs-update-{YYMMDD}-{HHMM}.md`:

```markdown
### Documentation Update Summary

**Triage:** {N} files changed → {categories detected}
**Modules detected:** {module list}
**Generated mirror sync:** {Completed / N/A / Required before close}

**Phase 1 — Project Docs:**

- {Updated/Skipped}: {reason}

**Phase 2 — Feature Specs ($spec):**

- {Capability X}: {Updated §1–§7 / No existing Feature Spec / Not impacted}
- {Capability Y}: {Updated §4 Business Rules, §5 Domain Model / Skipped: no Feature Spec}

**Phase 2.5 — Derived Index Refresh ($spec-index, optional):**

- {Refreshed {Bucket} INDEX.md ({N} capabilities) / Skipped: no derived index maintained / Skipped: spec_discovery_update=false}

**Phase 3 — Test Specifications §8 ($spec [mode=tests]):**

- Mode: {mode used}
- New TCs: {list of TC IDs added}
- Updated TCs: {list of TC IDs modified}
- Skipped: {reason if skipped}

**Phase 4 — Test Spec ↔ Test Code Sync ($spec [mode=sync]):**

- {Synced N TCs to test code / Skipped: no §8 changes}
- Discrepancies: {§8-vs-test-code comparison issues}

**Recommendations:**

- {New docs that should be created}
- {Stale docs flagged but not auto-fixed}
- {TCs flagged as Untested}
```

---

## Decision Matrix: When to Use docs-update vs Direct Skill

| Scenario                                       | Use docs-update?             | Use skill directly?                         |
| ---------------------------------------------- | ---------------------------- | ------------------------------------------- |
| Post-implementation doc sync (any code change) | **Yes** — full orchestration | —                                           |
| Create new feature docs from scratch           | No                           | `$spec`                                     |
| Generate TCs for specific PBI (TDD-first)      | No                           | `$spec [mode=tests]`                        |
| Route PBI/idea artifact changes                | Yes — detection/delegation   | `$spec` + `$spec [mode=tests]` owner skills |
| Sync dashboard only (no code changes)          | No                           | `$spec [mode=sync]`                         |
| Workflow step after `$plan-execute` or `$fix`  | **Yes** — full orchestration | —                                           |
| User asks "update docs after my changes"       | **Yes** — full orchestration | —                                           |

---

## Additional Requests

Pass caller context via `$ARGUMENTS` to skip redundant triage or narrow scope:

| Key             | Example                                              | Effect                                    |
| --------------- | ---------------------------------------------------- | ----------------------------------------- |
| `modules`       | `modules=ModuleA,ModuleB`                            | Skip auto-detect; use provided list       |
| `changed_files` | `changed_files=<configured-source-path>/ModuleA/...` | Skip git diff; use provided file list     |
| `phases`        | `phases=2,3`                                         | Run only specified phases                 |
| `mode`          | `mode=update`                                        | Override spec mode detection              |
| `tc_mode`       | `tc_mode=implement-first`                            | Override spec [mode=tests] mode detection |
| `skip_phases`   | `skip_phases=1,2.5`                                  | Skip specific phases                      |

<additional_requests>
$ARGUMENTS
</additional_requests>

---

## Escalation: When docs-update Is Not Enough

| Situation                                  | What to do instead                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Feature Spec missing but capability exists | Run `$spec [mode=init]` to author the 8-section Feature Spec, then `docs-update`                                                           |
| Derived bucket `INDEX.md`/ERD missing      | Run `$spec-index mode=index bucket={Bucket}` to (re)generate it                                                                            |
| Integration tests don't match TCs          | Run `$integration-test-review` to diagnose, then `$integration-test` to fix                                                                |
| Bug caused by wrong spec                   | Run `$spec [mode=update]` (fix the canonical spec) BEFORE `docs-update`; optionally `$spec-index mode=index` to re-derive the bucket index |

---

> **[BLOCKING]** Create ALL 8 tasks via task tracking BEFORE any action — see **Mandatory Task Creation** table. NEVER skip, batch-complete, or mark done without invoking sub-skill.
> **[BLOCKING]** Follow fixed step-skill order: `Phase 0 -> Phase 1 -> Phase 2 -> Phase 2.5 -> Phase 3 -> Phase 4 -> Phase 5 -> Final review`. NEVER reorder, merge, or skip without explicit user approval.
> **[BLOCKING]** Per-step task lock: BEFORE each step, mark task `in_progress`; AFTER each step, mark task `completed` with evidence or explicit skip reason.
> **[BLOCKING]** If Task tool unavailable, create equivalent 8-step plan tracker and keep statuses synced for every step.

> **Critical Purpose:** Single orchestrator for ALL documentation sync after code changes. Triages impact, delegates to specialized skills.

> **Evidence Gate:** [BLOCKING] — every claim requires `file:line` proof or traced evidence, confidence >80% to act.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:cross-service-check -->

> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
>
> | Boundary            | Grep terms                                                                      |
> | ------------------- | ------------------------------------------------------------------------------- |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
>
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
>
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged

<!-- /SYNC:cross-service-check -->

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

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Every code/spec/test change leaves documentation in sync — impacted Feature Specs, §8 TCs, test-code links, and derived indexes all reflect the shipped behavior, with zero drift left silent.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION honor every block below:**

- **Critical Thinking:** Apply critical + sequential thinking; every claim needs `file:line` proof, confidence >80%.
- **Sub-Agent Return:** Spawned sub-agents return ONLY the summary contract; full detail to disk.
- **Cross-Service Check:** Scan producers/consumers/sagas/contracts; missing consumer = silent regression.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** When nested, still expand child phase tasks and link the parent workflow row.
- **Project Reference Docs:** Read required project-reference docs (always `lessons.md`) before target work.
- **Task Tracking:** Bootstrap tasks, one active, persist findings to `plans/reports/` incrementally.

**IMPORTANT MUST ATTENTION** create ALL 8 tasks via task tracking BEFORE any action, then run the FIXED order `0 -> 1 -> 2 -> 2.5 -> 3 -> 4 -> 5 -> final review` — NEVER reorder, merge, or skip without explicit user approval — why: phase order is the gate that catches drift; a skipped phase ships silent staleness
**IMPORTANT MUST ATTENTION** `docs-update` is a ROUTER ONLY — delegate to `$spec`, `$spec [mode=tests]`, `$spec [mode=sync]`, `$spec-index`; NEVER write §8 content, edit Feature Spec / derived-index files, or duplicate sub-skill logic — why: dual authorship causes the two sources to diverge
**IMPORTANT MUST ATTENTION** every skip is a DECISION with evidence — mark the task `completed` with a `file:line`-backed reason; NEVER silently omit a phase — why: an unjustified skip is indistinguishable from a missed update
**MUST ATTENTION** Nested Task Expansion Contract — when invoked inside a workflow, STILL expand internal phases via task tracking with `[N.M] $skill-name — phase` prefix and `TaskUpdate(parentTaskId, addBlockedBy: [childIds])` linkage — why: the workflow row is a container, not a substitute for phase tracking
**MUST ATTENTION** for EVERY step: set task `in_progress` BEFORE execution, set `completed` AFTER execution with evidence or skip reason — never batch transitions, keep exactly one active
**MUST ATTENTION** if task tooling unavailable, use an equivalent 8-step plan tracker and keep statuses synced per step
**MUST ATTENTION** evidence gate — every claim, detected module, and impact mapping needs `file:line` / git-diff proof, confidence >80% to act, <60% DO NOT act; "Module unchanged" without proof is NOT a valid skip — why: speculation routes the wrong docs and misses real drift
**MUST ATTENTION** search-existing-patterns BEFORE asserting a doc shape — read the bucket's existing Feature Spec / INDEX layout and project-reference docs; build the module map from `docs/project-config.json`, NEVER from hard-coded skill paths — why: local doc conventions override generic assumptions
**MUST ATTENTION** evaluate fit before reusing a nearby pattern — a module with backend + frontend changes is ONE deduped entry, not two; verify the change actually alters behavior before routing to `$spec` — why: duplicate or behavior-free invocations waste passes and corrupt the audit
**MUST ATTENTION** validate ambiguous routing decisions with the user via a direct user question — surface the options, NEVER silently auto-decide which phases run
**MUST ATTENTION** tech-agnostic output — when updating spec/specs/README/INDEX, introduce NO framework/product/language/pattern names in prose or headings; update logical IDs (`FR-`/`BR-`/`OP-`/`TC-`) FIRST, then prose; preserve the evidence-field exception — why: prose is the portable contract, evidence carriers hold the physical coords (spec-principles §3)
**MUST ATTENTION** Step 2.4 final code↔spec sync-verify per touched module — a removed/weakened [HARD] BR is a code-vs-spec contradiction that BLOCKS completion until resolved or owner-accepted; AC drift re-invokes `$spec`, TC drift routes to `$spec [mode=sync]`
**MUST ATTENTION** Phase 2.5 `$spec-index [mode=index]` OPTIONALLY refreshes the derived bucket INDEX/ERD from Feature Specs (never re-extracts an A-E tree); Phase 3 `$spec [mode=tests]` syncs §8 TCs; Phase 4 `$spec [mode=sync]` syncs §8 TCs ↔ integration test code (no QA dashboard exists)
**MUST ATTENTION** for `.claude` skills/hooks/workflows/sync-tooling changes, flag generated-mirror sync status (`npm run codex:sync` completed or explicit N/A) — `docs-update` routes/reports this check, NEVER edits generated mirrors directly
**MUST ATTENTION** ALWAYS write the Phase 5 summary report to `plans/reports/docs-update-{YYMMDD}-{HHMM}.md` and the final review task (#8) — the report is the audit trail, the review verifies all impacted docs updated with no unjustified skips

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| "Only docs/config changed — skip all phases" | Run Phase 0 triage anyway — fast-exit is a DECISION, not an assumption           |
| "No feature docs exist — skip Phase 2"       | Mark task completed with reason. NEVER silently omit                             |
| "Module unchanged — skip sub-skill"          | Show `file:line` evidence. No proof = no skip                                    |
| "Already know what changed"                  | Still run git diff — partial knowledge causes missed updates                     |
| "Phase 5 report not needed"                  | ALWAYS write summary report — it's the audit trail                               |
| "I will update tasks later"                  | Invalid. Task status must change before/after each step in real time.            |
| "I'll run skills first then create tasks"    | Invalid. Create/track tasks first, then execute step-skill calls.                |
| "I'll write the §8 TC myself, faster"        | Invalid. Router only — delegate to `$spec [mode=tests]`; dual authors diverge.   |
| "[HARD] BR weakened but tests pass"          | BLOCK — code-vs-spec contradiction; resolve or owner-accept, never wave through. |

**IMPORTANT MUST ATTENTION** create ALL 8 tasks via task tracking (or equivalent tracker) BEFORE any action and track each step live — `in_progress` before, `completed` after with evidence.
**IMPORTANT MUST ATTENTION** router ONLY — delegate every §8 / Feature Spec / derived-index write; NEVER author them here — why: dual authorship diverges the spec from its index.
**IMPORTANT MUST ATTENTION** every skip needs `file:line` evidence and a `completed` task with reason; run the fixed phase order — NEVER silently omit a phase.

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
