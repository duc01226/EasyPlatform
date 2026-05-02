---
name: docs-update
description: '[Documentation] Holistic documentation orchestrator — detects impacted docs from git changes, then delegates to /feature-docs (business docs), /tdd-spec (test specifications), and /tdd-spec [direction=sync] (dashboard sync). Single entry point for all post-change documentation updates.'
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[BLOCKING]** Create ALL 8 tasks via task tracking BEFORE any action — see **Mandatory Task Creation** table. NEVER skip, batch-complete, or mark done without invoking sub-skill.
> **[BLOCKING]** Follow fixed step-skill order: `Phase 0 -> Phase 1 -> Phase 2 -> Phase 2.5 -> Phase 3 -> Phase 4 -> Phase 5 -> Final review`. NEVER reorder, merge, or skip without explicit user approval.
> **[BLOCKING]** Per-step task lock: BEFORE each step, mark task `in_progress`; AFTER each step, mark task `completed` with evidence or explicit skip reason.
> **[BLOCKING]** If Task tool unavailable, create equivalent 8-step plan tracker and keep statuses synced for every step.

> **Critical Purpose:** Single orchestrator for ALL documentation sync after code changes. Triages impact, delegates to specialized skills.

> **Evidence Gate:** [BLOCKING] — every claim requires `file:line` proof or traced evidence, confidence >80% to act.

## Quick Summary

**Goal:** Detect impacted docs from code changes; orchestrate updates across all doc types.

**Orchestration Model:**

```
git diff → Triage → Phase 1: Project Docs (inline)
                  → Phase 2: $feature-docs (business feature docs)
                  → Phase 2.5: $spec-discovery (engineering spec) [if docs/specs/ exists]
                  → Phase 3: $tdd-spec (test specifications)
                  → Phase 4: $tdd-spec [direction=sync] (dashboard sync)
                  → Phase 5: Summary Report
```

**Key Rules:**

- Router only — NEVER duplicate sub-skill logic or write Section 15 / `docs/specs/` content
- Each phase checks whether needed before invoking — skip phases with no impact
- Step-to-skill order is fixed — run phases sequentially, never out of order
- ALWAYS report what was checked, even if nothing needed updating
- Pass triage context (changed files, detected modules, impacted sections) to each sub-skill via `$ARGUMENTS`
- MUST ATTENTION dedup module list — backend + frontend changes for same module = ONE entry
- MUST ATTENTION track step state live: `in_progress` -> execute -> `completed` (or `completed` with skip reason)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80%.**

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
> Sub-agent writes full report incrementally — never held in memory.

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

---

## Mandatory Task Creation (ZERO TOLERANCE)

> **[BLOCKING]** Create ALL 8 tasks via task tracking BEFORE touching any file. NEVER consolidate, rename, omit. Conditional tasks skipped: mark `completed` immediately with reason — NEVER silently omit.

| #   | Task Subject                                                                                              | Conditional?                                                                             |
| --- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | `[docs-update] Phase 0 — Triage: collect git diff, categorize files, detect modules, check existing docs` | No — always first                                                                        |
| 2   | `[docs-update] Phase 1 — Update project docs (project-structure-reference.md, README.md)`                 | Yes — only if `src/{Framework}/**` or architectural changes in diff                      |
| 3   | `[docs-update] Phase 2 — Invoke $feature-docs: update business feature docs`                              | Yes — service/frontend files changed AND module has existing feature docs                |
| 4   | `[docs-update] Phase 2.5 — Invoke $spec-discovery [mode=update]: update engineering spec bundle`          | Yes — `docs/specs/{app-bucket}/{system-name}/` exists AND service/frontend files changed |
| 5   | `[docs-update] Phase 3 — Invoke $tdd-spec: update/add test specifications`                                | Yes — new functionality added OR existing behavior changed                               |
| 6   | `[docs-update] Phase 4 — Invoke $tdd-spec [direction=sync]: sync QA dashboard`                            | Yes — Phase 3 changed TCs OR `docs/specs/` exists                                        |
| 7   | `[docs-update] Phase 5 — Write summary report to plans/reports/docs-update-{YYMMDD}-{HHMM}.md`            | No — always                                                                              |
| 8   | `[docs-update] Final review — verify all impacted docs updated, no phases skipped without justification`  | No — always                                                                              |

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

| Order | Task ID | Step / Phase                   | Skill Call                             | Tracking Rule                                                                                   |
| ----- | ------- | ------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1     | 1       | Phase 0: Triage                | Inline triage logic in this skill      | Set Task 1 `in_progress` before diff scan; set `completed` after module + impact map recorded   |
| 2     | 2       | Phase 1: Project Docs          | `docs-manager` sub-agent (if impacted) | Set Task 2 `in_progress` before spawn/update; `completed` with updated docs or skip reason      |
| 3     | 3       | Phase 2: Business Feature Docs | `$feature-docs`                        | Set Task 3 `in_progress` before invocation; `completed` after output review                     |
| 4     | 4       | Phase 2.5: Engineering Spec    | `$spec-discovery [mode=update]`        | Set Task 4 `in_progress` before invocation; `completed` with changelog/frontmatter verification |
| 5     | 5       | Phase 3: Test Specs            | `$tdd-spec`                            | Set Task 5 `in_progress` before invocation; `completed` after TC review                         |
| 6     | 6       | Phase 4: Dashboard Sync        | `$tdd-spec [direction=sync]`           | Set Task 6 `in_progress` before invocation; `completed` after sync validation                   |
| 7     | 7       | Phase 5: Summary Report        | Inline report write                    | Set Task 7 `in_progress` before report write; `completed` after file path confirmed             |
| 8     | 8       | Final Review                   | Inline verification gate               | Set Task 8 `in_progress` before final audit; `completed` after all phases justified             |

**Enforcement:** If a required step cannot run, STOP and ask user before adapting order. Never continue with untracked steps.

---

## Phase 0: Triage — Detect Impacted Documentation

### Step 0.1: Collect Changed Files

1. Run `git diff --name-only HEAD` (staged + unstaged changes)
2. No uncommitted changes → `git diff --name-only HEAD~1` (last commit)
3. Still empty → `git diff --name-only origin/develop...HEAD` (branch changes)

### Step 0.2: Categorize Changes

| Changed File Pattern                                                                | Impact Category                                | Phases to Run |
| ----------------------------------------------------------------------------------- | ---------------------------------------------- | ------------- |
| `src/Services/**`                                                                   | **feature-docs** + **tdd-spec** + project-docs | 1 + 2 + 3 + 4 |
| `{frontend-apps-dir}/**`, `{frontend-libs-dir}/{domain-lib}/**`                     | **feature-docs** + **tdd-spec** + project-docs | 1 + 2 + 3 + 4 |
| `{legacy-frontend-dir}/**Client/**`                                                 | **feature-docs** + **tdd-spec** + project-docs | 1 + 2 + 3 + 4 |
| `src/{Framework}/**`                                                                | project-docs only                              | 1 only        |
| `docs/**`                                                                           | project-docs only                              | 1 only        |
| `.claude/**`, config files only                                                     | **none**                                       | Fast exit     |
| `{frontend-libs-dir}/{platform-core-lib}/**`, `{frontend-libs-dir}/{common-lib}/**` | project-docs only                              | 1 only        |

### Step 0.3: Fast Exit Check

ALL changed files in **none** category (only `.claude/`, `.github/`, root config):

- Report: `"No documentation impacted by current changes (config/tooling only)."`
- Mark tasks 2-8 `completed` with reason "Skipped — no business code changed"
- **Exit early.**

### Step 0.4: Auto-Detect Affected Modules

Extract unique module names from changed paths. **MUST ATTENTION dedup:** `unique()` before passing to any sub-skill — backend + frontend same module = ONE entry. Prevents duplicate `$feature-docs` invocations.

| Changed File Path Pattern                           | Detected Module                  |
| --------------------------------------------------- | -------------------------------- |
| `src/Services/{Module}/**`                          | {Module}                         |
| `{frontend-apps-dir}/{app-name}/**`                 | {Module} (map app to module)     |
| `{frontend-libs-dir}/{domain-lib}/src/{feature}/**` | {Module} (map feature to module) |
| `{legacy-frontend-dir}/{Module}Client/**`           | {Module}                         |

Build project-specific mapping:

```bash
ls -d src/Services/*/
ls -d docs/business-features/*/
```

### Step 0.5: Check Existing Docs for Each Module

For each detected module:

1. Check `docs/business-features/{Module}/` exists
2. Check `docs/business-features/{Module}/detailed-features/` has docs
3. Check `docs/specs/{Module}/` exists
4. Record: `hasFeatureDocs`, `hasTestSpecs`, `hasTestSpecsDashboard`

---

## Phase 1: Project Documentation Update (Inline)

**When to run:** Diff includes `src/{Framework}/**`, `docs/**`, or architectural changes.

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

## Phase 2: Business Feature Documentation — Invoke `$feature-docs`

**When to run:** Triage detected modules with `hasFeatureDocs = true` AND service/frontend files changed.

**When to skip:** No service/frontend feature files changed. Report: `"No business feature docs impacted."`

### Step 2.1: Determine Create vs Update

| Scenario                                    | Action                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------ |
| Module has existing feature docs            | Invoke `$feature-docs` — auto-detect triggers update flow                            |
| Module has NO feature docs                  | Report: `"Module {Module} has no feature docs. Run $feature-docs to create."` — skip |
| User explicitly asked for full doc creation | Invoke `$feature-docs` with explicit module name                                     |

### Step 2.2: Invoke `$feature-docs`

```
$feature-docs Update feature docs for modules: {detected modules}.
Changed files: {list from triage}.
Impacted sections based on change types: {section impact from triage}.
Mode: update (existing docs only, do not create from scratch).
```

**What `$feature-docs` handles (DO NOT duplicate here):**

- 17-section structure enforcement
- Diff analysis → section impact mapping
- Codebase analysis (entities, commands, queries, controllers)
- Update impacted sections with evidence
- Master index update (BUSINESS-FEATURES.md)
- 3-pass verification (evidence audit, domain model, cross-reference)
- CHANGELOG entry
- v3.0 principles (no code details in S1-14, evidence in S15 only)

### Step 2.3: Review `$feature-docs` Output

1. Updated sections align with triage's section impact mapping
2. No sections missed that triage flagged as impacted
3. Gaps found → re-invoke `$feature-docs` for missed sections

---

## Phase 2.5: Engineering Spec Update (spec-discovery update mode)

**When to run:** Same conditions as Phase 2 AND `docs/specs/{app-bucket}/{system-name}/` exists.

**When to skip:**

- Only `docs/`, `.claude/`, or config files changed
- `docs/specs/` empty or no `{system-name}/` subfolder exists
- Phase 2 was skipped (no feature impact)
- `project-config.json` contains `"spec_discovery_update": false`

### Step 2.5.0: Check Opt-Out Flag

```bash
cat project-config.json 2>/dev/null | grep spec_discovery_update
```

If `"spec_discovery_update": false` → skip Phase 2.5 entirely.

### Step 2.5.1: Check Engineering Spec Exists

```bash
# Exclude dated legacy folders like 260419-*
ls docs/specs/ 2>/dev/null | head -5
```

If `docs/specs/` empty or not found → skip Phase 2.5.

**Disambiguation rule:**

- Filter out dated folders (`YYMMDD-*` pattern) — legacy artifacts
- Dirs at `docs/specs/` may be **app-bucket** names or flat system names, depending on the host project.
- Probe `ls docs/specs/{app-bucket}/` to find system-name
- ONE stable system-name → use `{app-bucket}/{system-name}`
- MULTIPLE stable system-names → map changed service files to system-name via `00-module-registry.md`; update matching only
- ZERO stable folders → skip Phase 2.5

### Step 2.5.2: Impact Map Reuse

Reuse impact map from Phase 2:

- Map modules to spec-discovery IDs (from `docs/specs/{app-bucket}/{system-name}/00-module-registry.md`)
- Module not in registry → skip (not yet in spec bundle)

### Step 2.5.3: Invoke spec-discovery Update Mode

```
$spec-discovery mode=update modules={list} git_ref={current_ref}
Scope: only impacted modules from Step 2.5.2.
Input: impact map (module list + impacted phases).
Output: updated spec files + SPEC-CHANGELOG.md entry.
```

### Step 2.5.4: Verify Update Complete

- Confirm SPEC-CHANGELOG.md has new entry dated today
- Confirm `last_extracted` frontmatter updated on changed spec files
- Report: `"Engineering spec updated: {N} modules, {M} phases re-extracted"`

> **Separation of concerns:** `docs-update` orchestrates — passes scope to spec-discovery for extraction. NEVER duplicates extraction logic.

---

## Phase 3: Test Specifications — Invoke `$tdd-spec`

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

### Step 3.2: Invoke `$tdd-spec`

```
$tdd-spec Mode: {detected mode}.
Modules: {detected modules}.
Changed files: {list from triage}.
New functionality detected: {new commands/queries/endpoints from diff analysis}.
```

**What `$tdd-spec` handles (DO NOT duplicate here):**

- 5 modes: TDD-first, implement-first, update, sync, from-integration-tests
- TC-{FEATURE}-{NNN} format with decade-based numbering
- Interactive TC review (ask the user directly)
- Cross-cutting categories: authorization, seed data, performance, data migration
- Phase-mapped coverage (plan phases → TCs)
- Graph context analysis for cross-service impact
- Evidence verification per TC
- Write to feature doc Section 15 (canonical TC registry)

### Step 3.3: Review `$tdd-spec` Output

1. New TCs cover all new functionality from triage
2. TC IDs don't collide with existing ones
3. Evidence fields populated (not template placeholders)

---

## Phase 4: Test Specs Dashboard Sync — Invoke `$tdd-spec [direction=sync]`

**When to run:** Phase 3 produced new/updated TCs, OR `docs/specs/` exists and may be stale.

**When to skip:** No test spec changes AND no `docs/specs/` directory exists.

### Step 4.1: Invoke `$tdd-spec [direction=sync]`

```
$tdd-spec [direction=sync] Sync test specs for modules: {detected modules}.
Direction: forward (feature docs Section 15 → docs/specs/ dashboard).
Updated TCs from Phase 3: {list of new/changed TC IDs}.
```

**What `$tdd-spec [direction=sync]` handles (DO NOT duplicate here):**

- Forward/reverse sync: feature docs ↔ dashboard
- 3-way comparison: feature doc vs specs/ vs test code
- PRIORITY-INDEX.md management
- Module dashboard generation
- Integration test cross-reference (`[Trait("TestSpec", ...)]`)

### Step 4.2: Review Sync Results

1. All new TCs from Phase 3 appear in dashboard
2. PRIORITY-INDEX.md updated with correct priority tiers
3. No orphaned TCs (in dashboard but not in feature docs)

---

## Section Ownership Reference

**Which skill owns which doc sections** — `docs-update` delegates only, NEVER writes directly:

| Section                 | Owner Skill                  | docs-update Role                                   |
| ----------------------- | ---------------------------- | -------------------------------------------------- |
| S1–S14 (feature doc)    | `$feature-docs`              | Pass triage context; review output                 |
| S15 (Test Specs)        | `$tdd-spec`                  | Pass TC mode + changed files; NEVER write TCs here |
| `docs/specs/` dashboard | `$tdd-spec [direction=sync]` | Pass module list + direction; NEVER edit directly  |
| Engineering spec bundle | `$spec-discovery`            | Pass module list + update scope                    |

---

## Phase 5: Summary Report

ALWAYS write full report to `plans/reports/docs-update-{YYMMDD}-{HHMM}.md`:

```markdown
### Documentation Update Summary

**Triage:** {N} files changed → {categories detected}
**Modules detected:** {module list}

**Phase 1 — Project Docs:**

- {Updated/Skipped}: {reason}

**Phase 2 — Business Feature Docs ($feature-docs):**

- Module {X}: {Updated sections A, B, C / No existing docs / Not impacted}
- Module {Y}: {Updated sections D, E / Skipped: no feature docs}

**Phase 2.5 — Engineering Spec ($spec-discovery update):**

- {Updated N modules, M phases re-extracted / Skipped: no spec bundle / Skipped: spec_discovery_update=false}
- ⚠️ If skipped: "No engineering spec bundle found. Run $workflow-spec-driven-dev (mode: init-full) to bootstrap."

**Phase 3 — Test Specifications ($tdd-spec):**

- Mode: {mode used}
- New TCs: {list of TC IDs added}
- Updated TCs: {list of TC IDs modified}
- Skipped: {reason if skipped}

**Phase 4 — Dashboard Sync ($tdd-spec [direction=sync]):**

- {Synced N TCs / Skipped: no dashboard}
- Discrepancies: {3-way comparison issues}

**Recommendations:**

- {New docs that should be created}
- {Stale docs flagged but not auto-fixed}
- {TCs flagged as Untested}
```

---

## Decision Matrix: When to Use docs-update vs Direct Skill

| Scenario                                       | Use docs-update?             | Use skill directly?          |
| ---------------------------------------------- | ---------------------------- | ---------------------------- |
| Post-implementation doc sync (any code change) | **Yes** — full orchestration | —                            |
| Create new feature docs from scratch           | No                           | `$feature-docs`              |
| Generate TCs for specific PBI (TDD-first)      | No                           | `$tdd-spec`                  |
| Sync dashboard only (no code changes)          | No                           | `$tdd-spec [direction=sync]` |
| Workflow step after `$code` or `$fix`          | **Yes** — full orchestration | —                            |
| User asks "update docs after my changes"       | **Yes** — full orchestration | —                            |

---

## Additional Requests

Pass caller context via `$ARGUMENTS` to skip redundant triage or narrow scope:

| Key             | Example                                 | Effect                                |
| --------------- | --------------------------------------- | ------------------------------------- |
| `modules`       | `modules=Growth,Employee`               | Skip auto-detect; use provided list   |
| `changed_files` | `changed_files=src/Services/Growth/...` | Skip git diff; use provided file list |
| `phases`        | `phases=2,3`                            | Run only specified phases             |
| `mode`          | `mode=update`                           | Override feature-docs mode detection  |
| `tc_mode`       | `tc_mode=implement-first`               | Override tdd-spec mode detection      |
| `skip_phases`   | `skip_phases=1,2.5`                     | Skip specific phases                  |

<additional_requests>
$ARGUMENTS
</additional_requests>

---

## Escalation: When docs-update Is Not Enough

| Situation                                            | What to do instead                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Spec bundle (`docs/specs/`) missing but should exist | Run `$spec-discovery init` first, then `docs-update`                        |
| Feature doc doesn't exist                            | Run `$feature-docs init` first                                              |
| Integration tests don't match TCs                    | Run `$integration-test-review` to diagnose, then `$integration-test` to fix |
| Bug caused by wrong spec                             | Run `$spec-discovery update` → `$feature-docs update` BEFORE `docs-update`  |

---

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**MUST ATTENTION** create ALL 8 tasks via task tracking BEFORE any action — see Mandatory Task Creation table
**MUST ATTENTION** follow fixed step-skill order: `0 -> 1 -> 2 -> 2.5 -> 3 -> 4 -> 5 -> final review` — NEVER reorder without explicit user approval
**MUST ATTENTION** for EVERY step: set task `in_progress` BEFORE execution, set `completed` AFTER execution with evidence or skip reason
**MUST ATTENTION** if task tooling unavailable, use equivalent 8-step plan tracker and keep statuses synced per step
**MUST ATTENTION** `docs-update` is a router ONLY — NEVER write Section 15, edit `docs/specs/` files, or duplicate sub-skill logic
**MUST ATTENTION** validate decisions with user via a direct user question — NEVER auto-decide
**MUST ATTENTION** dedup module list before passing to sub-skills — same module backend + frontend = ONE entry
**MUST ATTENTION** skip phases with no impact but ALWAYS mark task `completed` with reason — NEVER silently omit
**MUST ATTENTION** Phase 2.5 runs `$spec-discovery [mode=update]` — syncs engineering spec bundle with code changes
**MUST ATTENTION** Phase 3 runs `$tdd-spec` — syncs test case specs in feature docs Section 15
**MUST ATTENTION** Phase 4 runs `$tdd-spec [direction=sync]` — pushes TCs to QA dashboard
**MUST ATTENTION** final review task (#8) verifies all impacted docs updated, no phases skipped without justification

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| "Only docs/config changed — skip all phases" | Run Phase 0 triage anyway — fast-exit is a DECISION, not an assumption |
| "No feature docs exist — skip Phase 2"       | Mark task completed with reason. NEVER silently omit                   |
| "Module unchanged — skip sub-skill"          | Show `file:line` evidence. No proof = no skip                          |
| "Already know what changed"                  | Still run git diff — partial knowledge causes missed updates           |
| "Phase 5 report not needed"                  | ALWAYS write summary report — it's the audit trail                     |
| "I will update tasks later"                  | Invalid. Task status must change before/after each step in real time.  |
| "I'll run skills first then create tasks"    | Invalid. Create/track tasks first, then execute step-skill calls.      |

**[BLOCKING]** Create ALL 8 tasks via task tracking (or equivalent 8-step plan tracker) BEFORE any action. Track each step state live.

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
