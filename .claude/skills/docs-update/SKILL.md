---
name: docs-update
version: 3.0.0
description: '[Documentation] Holistic documentation orchestrator — detects impacted docs from git changes, then delegates to /feature-docs (business docs), /tdd-spec (test specifications), and /test-specs-docs (dashboard sync). Single entry point for all post-change documentation updates.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each phase. For simple tasks, AI MUST ATTENTION ask user whether to skip.

> **Critical Purpose:** Single orchestrator for ALL documentation sync after code changes. Triages impact, then delegates to specialized skills.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

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

## Quick Summary

**Goal:** Detect which documentation is impacted by code changes and orchestrate updates across all doc types.

**Orchestration Model:**

```
git diff → Triage → Phase 1: Project Docs (inline)
                  → Phase 2: /feature-docs (business feature docs)
                  → Phase 3: /tdd-spec (test specifications)
                  → Phase 4: /test-specs-docs (dashboard sync)
                  → Phase 5: Summary Report
```

**Key Rules:**

- This skill is a **router** — it triages, then invokes sub-skills. No duplicating sub-skill logic.
- Each phase checks whether it's needed before invoking — skip phases with no impact.
- Always report what was checked, even if nothing needed updating.
- Pass triage context (changed files, detected modules, impacted sections) to each sub-skill via `$ARGUMENTS`.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

---

## Phase 0: Triage — Detect Impacted Documentation

### Step 0.1: Collect Changed Files

1. Run `git diff --name-only HEAD` (captures both staged and unstaged changes)
2. If no uncommitted changes, run `git diff --name-only HEAD~1` (last commit)
3. If still empty, run `git diff --name-only origin/develop...HEAD` (branch changes)

### Step 0.2: Categorize Changes

Classify each changed file into documentation impact categories:

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

If ALL changed files fall into the **none** category (e.g., only `.claude/`, `.github/`, root config files):

- Report: `"No documentation impacted by current changes (config/tooling only)."`
- **Exit early** — skip all phases.

### Step 0.4: Auto-Detect Affected Modules

Extract unique module names from changed file paths:

| Changed File Path Pattern                           | Detected Module                  |
| --------------------------------------------------- | -------------------------------- |
| `src/Services/{Module}/**`                          | {Module}                         |
| `{frontend-apps-dir}/{app-name}/**`                 | {Module} (map app to module)     |
| `{frontend-libs-dir}/{domain-lib}/src/{feature}/**` | {Module} (map feature to module) |
| `{legacy-frontend-dir}/{Module}Client/**`           | {Module}                         |

Build project-specific mapping by examining:

```bash
ls -d src/Services/*/
ls -d docs/business-features/*/
```

### Step 0.5: Check Existing Docs for Each Module

For each detected module:

1. Check if `docs/business-features/{Module}/` exists
2. Check if `docs/business-features/{Module}/detailed-features/` has feature docs
3. Check if `docs/test-specs/{Module}/` exists
4. Record: `hasFeatureDocs`, `hasTestSpecs`, `hasTestSpecsDashboard`

---

## Phase 1: Project Documentation Update (Inline)

**When to run:** Changed files include `src/{Framework}/**`, `docs/**`, or architectural changes.

**When to skip:** Only service-layer or frontend feature files changed (no architectural impact). Skip and proceed to Phase 2.

### Step 1.1: Spawn Scouts (standalone invocation only)

When invoked standalone (not as a workflow step), spawn scouts for broad codebase context:

1. Spawn 2-4 `scout-external` (preferred) or `scout` (fallback) via Task tool
2. Target directories that actually exist — adapt to project structure
3. Merge scout results into context summary

**When invoked as a workflow step:** Skip scouting — use git diff context from Phase 0 directly.

### Step 1.2: Update Project Docs

Pass context to `docs-manager` sub-agent (Agent tool with `subagent_type="docs-manager"`) to update impacted project docs:

- `docs/project-reference/project-structure-reference.md`: Update if service architecture or cross-service patterns changed
- `README.md`: Update if project scope or setup changed (keep under 300 lines)

Only update docs that are **directly impacted** by the changes. Do not regenerate all docs.

---

## Phase 2: Business Feature Documentation — Invoke `/feature-docs`

**When to run:** Triage detected modules with `hasFeatureDocs = true` AND service/frontend files changed.

**When to skip:** No service-layer or frontend feature files changed. Report: `"No business feature docs impacted."`

### Step 2.1: Determine Create vs Update

| Scenario                                    | Action                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------ |
| Module has existing feature docs            | Invoke `/feature-docs` — auto-detect mode will trigger update flow                   |
| Module has NO feature docs                  | Report: `"Module {Module} has no feature docs. Run /feature-docs to create."` — skip |
| User explicitly asked for full doc creation | Invoke `/feature-docs` with explicit module name                                     |

### Step 2.2: Invoke `/feature-docs`

Execute the `/feature-docs` skill with triage context:

```
/feature-docs Update feature docs for modules: {detected modules}.
Changed files: {list from triage}.
Impacted sections based on change types: {section impact from triage}.
Mode: update (existing docs only, do not create from scratch).
```

**What `/feature-docs` handles (DO NOT duplicate here):**

- 17-section structure enforcement
- Diff analysis → section impact mapping
- Codebase analysis (entities, commands, queries, controllers)
- Update impacted sections with evidence
- Master index update (BUSINESS-FEATURES.md)
- 3-pass verification (evidence audit, domain model, cross-reference)
- CHANGELOG entry
- v3.0 principles (no code details in S1-14, evidence in S15 only)

### Step 2.3: Review `/feature-docs` Output

After `/feature-docs` completes, verify:

1. Updated sections align with triage's section impact mapping
2. No sections were missed that the triage identified as impacted
3. If gaps found → re-invoke `/feature-docs` for missed sections

---

## Phase 3: Test Specifications — Invoke `/tdd-spec`

**When to run:** ANY new functionality was added (new commands, queries, endpoints, components) OR existing behavior changed.

**When to skip:** Changes are purely cosmetic (styling, comments, docs-only) with no behavioral impact.

### Step 3.1: Determine TC Mode

Based on triage context, determine the appropriate `/tdd-spec` mode:

| Context                                | TC Mode                  |
| -------------------------------------- | ------------------------ |
| New feature code, no existing TCs      | `implement-first`        |
| PBI/story exists, code not yet written | `TDD-first`              |
| Existing TCs + code changes / bugfix   | `update`                 |
| User says "sync test specs"            | `sync`                   |
| Tests exist with annotations, no docs  | `from-integration-tests` |

### Step 3.2: Invoke `/tdd-spec`

Execute the `/tdd-spec` skill with triage context:

```
/tdd-spec Mode: {detected mode}.
Modules: {detected modules}.
Changed files: {list from triage}.
New functionality detected: {new commands/queries/endpoints from diff analysis}.
```

**What `/tdd-spec` handles (DO NOT duplicate here):**

- 5 modes: TDD-first, implement-first, update, sync, from-integration-tests
- TC-{FEATURE}-{NNN} format with decade-based numbering
- Interactive TC review with user (AskUserQuestion)
- Cross-cutting categories: authorization, seed data, performance, data migration
- Phase-mapped coverage (plan phases → TCs)
- Graph context analysis for cross-service impact
- Evidence verification per TC
- Write to feature doc Section 15 (canonical TC registry)

### Step 3.3: Review `/tdd-spec` Output

After `/tdd-spec` completes, verify:

1. New TCs cover all new functionality identified in triage
2. TC IDs don't collide with existing ones
3. Evidence fields are populated (not template placeholders)

---

## Phase 4: Test Specs Dashboard Sync — Invoke `/test-specs-docs`

**When to run:** Phase 3 produced new or updated TCs, OR `docs/test-specs/` exists and may be stale.

**When to skip:** No test specification changes and no `docs/test-specs/` directory exists.

### Step 4.1: Invoke `/test-specs-docs`

Execute the `/test-specs-docs` skill:

```
/test-specs-docs Sync test specs for modules: {detected modules}.
Direction: forward (feature docs Section 15 → docs/test-specs/ dashboard).
Updated TCs from Phase 3: {list of new/changed TC IDs}.
```

**What `/test-specs-docs` handles (DO NOT duplicate here):**

- Forward sync: feature docs → dashboard
- Reverse sync: dashboard → feature docs (when requested)
- 3-way comparison: feature doc vs test-specs/ vs test code
- PRIORITY-INDEX.md management
- Module dashboard generation
- Integration test cross-reference (`[Trait("TestSpec", ...)]`)

### Step 4.2: Review Sync Results

After `/test-specs-docs` completes, verify:

1. All new TCs from Phase 3 appear in dashboard
2. PRIORITY-INDEX.md updated with correct priority tiers
3. No orphaned TCs (in dashboard but not in feature docs)

---

## Phase 5: Summary Report

Always output a summary of what happened:

```
### Documentation Update Summary

**Triage:** {N} files changed → {categories detected}
**Modules detected:** {module list}

**Phase 1 — Project Docs:**
- {Updated/Skipped}: {reason}

**Phase 2 — Business Feature Docs (/feature-docs):**
- Module {X}: {Updated sections A, B, C / No existing docs / Not impacted}
- Module {Y}: {Updated sections D, E / Skipped: no feature docs}

**Phase 3 — Test Specifications (/tdd-spec):**
- Mode: {mode used}
- New TCs: {list of TC IDs added}
- Updated TCs: {list of TC IDs modified}
- Skipped: {reason if skipped}

**Phase 4 — Dashboard Sync (/test-specs-docs):**
- {Synced N TCs to dashboard / Skipped: no dashboard exists}
- Discrepancies: {any 3-way comparison issues}

**Recommendations:**
- {Any new docs that should be created}
- {Any stale docs flagged but not auto-fixed}
- {Any TCs flagged as Untested}
```

---

## Decision Matrix: When docs-update Orchestrates vs Direct Skill Invocation

| Scenario                                       | Use docs-update?             | Use skill directly? |
| ---------------------------------------------- | ---------------------------- | ------------------- |
| Post-implementation doc sync (any code change) | **Yes** — full orchestration | —                   |
| Create new feature docs from scratch           | No                           | `/feature-docs`     |
| Generate TCs for a specific PBI (TDD-first)    | No                           | `/tdd-spec`         |
| Sync dashboard only (no code changes)          | No                           | `/test-specs-docs`  |
| Workflow step after `/code` or `/fix`          | **Yes** — full orchestration | —                   |
| User asks "update docs after my changes"       | **Yes** — full orchestration | —                   |

---

## Additional Requests

<additional_requests>
$ARGUMENTS
</additional_requests>

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/watzup (Recommended)"** — Wrap up session and check for remaining doc staleness
- **"/workflow-review-changes"** — Review all changes before commit
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.

  <!-- SYNC:critical-thinking-mindset:reminder -->

- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->
