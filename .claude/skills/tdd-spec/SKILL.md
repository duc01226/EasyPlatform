---
name: tdd-spec
version: 3.2.0
last_reviewed: 2026-04-21
category: Testing
description: '[Testing] Generate or update test specifications in feature docs (Section 15) with unified TC-{FEATURE}-{NNN} format. Also syncs TCs to/from docs/specs/ dashboard (replaces test-specs-docs). Supports TDD-first, implement-first, update, sync, from-integration-tests, and dashboard-sync modes.'
triggers: 'tdd spec, tdd test, test driven, write test specs, create test cases, update test specs, test specifications for feature, test spec for feature, sync test specs, generate test specs from code, update test specs after changes, test specs from PR, test specs from pull request, code to test specs, sync dashboard, update dashboard, sync test specs to docs/specs'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

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

# TDD Spec — Test-Driven Specification Writer

## Quick Summary

**[IMPORTANT] `TaskCreate` BEFORE any work. NEVER skip task creation.**

**Goal:** Generate/update test specs in feature docs Section 15 (canonical TC registry) — unified `TC-{FEATURE}-{NNN}` format. 5 modes: TDD-first, implement-first, update (post-change/PR), sync, from-integration-tests.

**Workflow:** (1) Mode Detection → (2) Investigation → (3) TC Generation → (4) Write Section 15 → (5) Dashboard Sync → (6) Next Steps

**Key Rules:** Unified `TC-{FEATURE}-{NNN}` format · Section 15 = source of truth · Evidence required on every TC · Minimum 4 categories (positive, negative, authorization, edge cases) · Interactive review via `AskUserQuestion` mandatory

---

> **[BLOCKING]** `TaskCreate` — break ALL work into small tasks BEFORE starting. NEVER skip.

> **External Memory:** Complex/lengthy work → write findings to `plans/reports/` — prevents context loss.

> **Evidence Gate:** [BLOCKING] — every claim/finding/recommendation requires `file:line` proof + confidence % (>80% act, <80% verify first).

<!-- SYNC:rationalization-prevention -->

> **Rationalization Prevention** — AI skips steps via these evasions. Recognize and reject:
>
> | Evasion                      | Rebuttal                                                      |
> | ---------------------------- | ------------------------------------------------------------- |
> | "Too simple for a plan"      | Simple + wrong assumptions = wasted time. Plan anyway.        |
> | "I'll test after"            | RED before GREEN. Write/verify test first.                    |
> | "Already searched"           | Show grep evidence with `file:line`. No proof = no search.    |
> | "Just do it"                 | Still need TaskCreate. Skip depth, never skip tracking.       |
> | "Just a small fix"           | Small fix in wrong location cascades. Verify file:line first. |
> | "Code is self-explanatory"   | Future readers need evidence trail. Document anyway.          |
> | "Combine steps to save time" | Combined steps dilute focus. Each step has distinct purpose.  |

<!-- /SYNC:rationalization-prevention -->

> **Graph Context (MANDATORY when graph.db exists):** Before generating test specs for cross-service features, run:
>
> ```bash
> python .claude/scripts/code_graph trace {ServiceDir}/{FeatureFile}.cs --direction both --json
> ```
>
> Use output to identify: event consumers, message bus subscribers, background jobs triggered by this feature. These are cross-service TC candidates (category 041–049).

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

## Estimation & Reference Summary

<!-- SYNC:estimation-framework -->

> **Estimation Framework** — Story Points (Modified Fibonacci) + Man-Days for 3-5yr dev (6 productive hrs/day, .NET + Angular stack). AI estimate assumes Claude Code with good project context (code graph, patterns, hooks active).
>
> | SP  | Complexity | Description                                    | Traditional (code + test) | AI-Assisted (code+rev + test+rev) |
> | --- | ---------- | ---------------------------------------------- | ------------------------- | --------------------------------- |
> | 1   | Low        | Trivial: single field, config flag, CSS fix    | 0.5d (0.3d+0.2d)          | 0.25d (0.15d+0.1d)                |
> | 2   | Low        | Small: simple CRUD endpoint OR basic component | 1d (0.6d+0.4d)            | 0.35d (0.2d+0.15d)                |
> | 3   | Medium     | Medium: form + API + validation                | 2d (1.3d+0.7d)            | 0.65d (0.4d+0.25d)                |
> | 5   | Medium     | Large: multi-layer feature (BE + FE)           | 4d (2.5d+1.5d)            | 1.0d (0.6d+0.4d)                  |
> | 8   | High       | Very large: complex feature + migration        | 6d (4d+2d)                | 1.5d (1.0d+0.5d)                  |
> | 13  | Critical   | Epic: cross-service — SHOULD split             | 10d (6.5d+3.5d)           | 2.0d (1.3d+0.7d)                  |
> | 21  | Critical   | MUST split — not sprint-ready                  | >15d                      | ~3d                               |
>
> **AI speedup grows with task size:** SP 1 ≈ 2x · SP 2-3 ≈ 3x · SP 5-8 ≈ 4x · SP 13+ ≈ 5x. Pattern-heavy CQRS/Angular boilerplate eliminated in hours at any scale. Fixed overhead: human review.
> **AI column breakdown:** `(code_gen × 1.3) + (test_gen × 1.3)` — each artifact adds 30% human review overhead. Test writing with AI = few hours generation + 30% review, same model as coding.
> Output `story_points`, `complexity`, `man_days_traditional`, `man_days_ai` in plan/PBI frontmatter.

<!-- /SYNC:estimation-framework -->

> **[BLOCKING]** TaskCreate todo to READ these reference files BEFORE generating TCs:
>
> <!-- SYNC:evidence-based-reasoning -->
>
> > **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
> >
> > 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> > 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> > 3. Cross-service validation required for architectural changes
> > 4. "I don't have enough evidence" is valid and expected output
> >
> > **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
> >
> > **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> > **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`
>
> <!-- /SYNC:evidence-based-reasoning -->
>
> <!-- SYNC:cross-cutting-quality -->
>
> > **Cross-Cutting Quality** — Check across all changed files:
> >
> > 1. **Error handling consistency** — same error patterns across related files
> > 2. **Logging** — structured logging with correlation IDs for traceability
> > 3. **Security** — no hardcoded secrets, input validation at boundaries, auth checks present
> > 4. **Performance** — no N+1 queries, unnecessary allocations, or blocking calls in async paths
> > 5. **Observability** — health checks, metrics, tracing spans for new endpoints
>
> <!-- /SYNC:cross-cutting-quality -->
>
> > **`.claude/skills/tdd-spec/references/tdd-spec-template.md`** — TC format template: GWT structure, Evidence field, decade-numbering, Preservation Tests section (mandatory for bugfixes). Read before generating any TC.
>
> - `.claude/skills/tdd-spec/references/tdd-spec-template.md` — TC template format
> - `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (content auto-injected by hook — check for [Injected: ...] header before reading)
> - `docs/project-reference/integration-test-reference.md` — Integration test patterns, fixture setup, seeder conventions, lessons learned (MUST READ before reviewing/writing integration tests)
> - `docs/specs/` — Existing TCs by module — read BEFORE generating to avoid ID collisions

**Workflow:**

1. **Mode Detection** — TDD-first, implement-first, update, sync, or from-integration-tests
2. **Investigation** — Analyze PBI/codebase/existing TCs/git changes per mode
3. **TC Generation** — Generate TC outlines, interactive review with user
4. **Write to Feature Doc** — Upsert TCs into Section 15
5. **Dashboard Sync** — Optionally update `docs/specs/` cross-module dashboard
6. **Next Steps** — Suggest follow-on actions per mode

**Key Rules:**

- **Unified format:** `TC-{FEATURE}-{NNN}` — feature codes in `docs/project-reference/feature-docs-reference.md`
- **Source of truth:** Feature docs Section 15 — canonical TC registry. NEVER write TCs to `docs/specs/` as primary destination.
- **Evidence required:** Every TC MUST have `Evidence: {FilePath}:{LineRange}` or `TBD (pre-implementation)` for TDD-first
- **Minimum 4 categories:** Positive (happy path) · Negative (error handling) · **Authorization** (role-based access — MANDATORY) · Edge cases
    - **Bugfix specs:** MANDATORY Preservation Tests — see `references/tdd-spec-template.md#preservation-tests-mandatory-for-bugfix-specs`
    - **Query-Only exception:** Read-only, no auth boundaries, no events → validation + authorization + edge cases minimum
    - **Config-Only exception:** Flag-toggle features, no entity changes → authorization + edge cases minimum
- **Cross-cutting TC categories (when applicable):**
    - **Authorization TCs (MANDATORY):** Authorized succeeds, unauthorized rejected, role visibility verified
    - **Seed Data TCs:** Reference data exists, seeder runs correctly
    - **Performance TCs:** Feature within SLA under production-like volume
    - **Data Migration TCs:** Data transforms correctly, rollback works, no data loss
    - **Preservation TCs (MANDATORY bugfixes):** ≥1 per "Healthy input" row — authored from OLD code semantics BEFORE fix lands
- **Interactive review:** ALWAYS `AskUserQuestion` — review TC list with user before writing

---

## Quick Reference

### Related Skills

| Skill                       | Relationship                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `tdd-spec [direction=sync]` | **Native sync mode** — syncs S15 TCs to/from `docs/specs/` dashboard (replaces `test-specs-docs`) |
| `integration-test`          | Code generator → generates integration tests FROM TCs written by this skill                       |
| `feature-docs`              | Feature doc creator → creates the Section 15 that this skill populates                            |
| `/spec-discovery`           | **Upstream spec** — engineering spec bundle is the source of truth for domain model               | When TCs reveal implementation doesn't match spec-discovery output: run spec-discovery audit/update |

### Output Locations

| Artifact                  | Path                                                                     |
| ------------------------- | ------------------------------------------------------------------------ |
| TCs (canonical)           | `docs/business-features/{App}/detailed-features/{feature}.md` Section 15 |
| Dashboard (optional)      | `docs/specs/{Module}/README.md` Implementation Index                     |
| Priority index (optional) | `docs/specs/PRIORITY-INDEX.md`                                           |

> **Phase-Mapped Coverage:** When a plan exists with multiple phases, generate test cases
> PER PHASE — not just per feature. Each phase's success criteria must have ≥1 test case.

### Frontend/UI Context (if applicable)

> When this task involves frontend or UI changes,

<!-- SYNC:ui-system-context -->

> **UI System Context** — For ANY task touching `.ts`, `.html`, `.scss`, or `.css` files:
>
> **MUST ATTENTION READ before implementing:**
>
> 1. `docs/project-reference/frontend-patterns-reference.md` — component base classes, stores, forms
> 2. `docs/project-reference/scss-styling-guide.md` — BEM methodology, SCSS variables, mixins, responsive
> 3. `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
>
> Reference `docs/project-config.json` for project-specific paths.

<!-- /SYNC:ui-system-context -->

- Component patterns: `docs/project-reference/frontend-patterns-reference.md`
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

---

## Detailed Workflow

### Phase 1: Mode Detection & Context

Detect mode from prompt and context:

| Mode                       | Signal                                            | Action                                                            |
| -------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| **TDD-first**              | PBI/story exists, code not yet written            | Generate specs from requirements                                  |
| **Implement-first**        | Code already exists, no/incomplete TCs            | Generate specs from codebase analysis                             |
| **Update**                 | Existing TCs + code changes / bugfix / PR         | Diff existing TCs against current code/PR, find gaps, update both |
| **Sync**                   | User says "sync test specs" or bidirectional need | Reconcile feature docs ↔ docs/specs/ (either direction)           |
| **From-integration-tests** | Tests exist with test spec annotations, no docs   | Extract TC metadata from test code → write to feature docs        |

### Mode Confirmation (AskUserQuestion)

**[REQUIRED]** Confirm mode before Phase 2 when signals ambiguous:

- Both "update" and "sync" present → which takes priority?
- No mode keyword → TDD-first (new feature) or implement-first (code exists)?
- "from integration tests" → high effort, confirm scope

> "Detected mode: **{detected_mode}** for feature: **{feature_name}**. TCs to write: ~{estimated_count}. Correct?"
>
> Options: [Yes, proceed] [Change mode] [Change scope]

Skip confirmation only when mode explicit in `$ARGUMENTS` AND feature name unambiguous.

**Must read FIRST:**

1. `docs/project-reference/feature-docs-reference.md` — correct `{FEATURE}` code for TC IDs (content auto-injected by hook — check for [Injected: ...] header before reading)
2. Target feature doc — Section 15 exists? Read existing TCs to avoid ID collisions
3. `docs/project-reference/spec-principles.md` — Section 7 (TC Coverage Mapping), minimum categories and depth (content auto-injected by hook — check for [Injected: ...] header before reading)

**Spec Readiness Gate (BLOCKING — implement-first and update modes only):**

Read target feature doc Sections 5, 6, 8, 13. Check:

- Every BR-XX in Section 6 has `[Source: file:line]` citation — flag missing
- Every operation in Section 8 references ≥1 `BR-XX` — flag unreferenced operations
- Section 13 has permission matrix (≥1 role × action row) — flag if absent
- Section 4 has FR-XX entries with explicit outcomes — flag if empty/vague

If 2+ fail → `AskUserQuestion`: "Spec readiness below TC generation threshold. Fill gaps first OR proceed with shallow TCs (`Status: Planned`)?" NEVER silently generate shallow TCs.

**If target feature doc missing:** suggest `/feature-docs` first, OR create minimal Section 15 stub.

### Phase 2: Investigation

**TDD-first mode:**

1. Read PBI/story from `team-artifacts/pbis/` or user-provided
2. Extract acceptance criteria
3. Identify TC categories: CRUD, validation, **authorization** (mandatory), workflows, edge cases, seed data, performance data, data migration
4. Cross-reference existing feature doc requirements (Sections 1–14)
5. PBI Authorization section → generate authorization TCs (unauthorized rejection per role)
6. PBI Seed Data section → generate seed data TCs if reference/config data needed
7. PBI Data Migration section → generate migration TCs if schema changes exist

**Implement-first mode:**

**[BLOCKING]:** Enumerate ALL operations first — establishes minimum TC floor.

**Use Case Inventory (implement-first):**

```bash
# Write-side: CQRS command handlers
grep -r "ICommandHandler\|CommandHandler\b" src/Services/{service}/ --include="*.cs" -l
# Write-side: REST mutating endpoints
grep -r "\[HttpPost\]\|\[HttpPut\]\|\[HttpPatch\]\|\[HttpDelete\]" src/Services/{service}/ --include="*.cs" -l
# Event consumers / background jobs
grep -r "IConsumer\|EventHandler\|IMessageConsumer\|BackgroundJob\|IHostedService" src/Services/{service}/ --include="*.cs" -l
# Read-side: CQRS query handlers
grep -r "IQueryHandler\|QueryHandler\b" src/Services/{service}/ --include="*.cs" -l
# Read-side: REST GET endpoints
grep -r "\[HttpGet\]" src/Services/{service}/ --include="*.cs" -l
```

Count: N (write) + M (read) + K (event/background) = **minimum TC count**.
If minimum > 20: split into operation-group batches (≤20 ops each per `TaskCreate`). NEVER generate all TCs in one pass for large features.

**Actor Catalog Discovery (MANDATORY — feeds authorization TCs):**

```bash
# Permission attributes and role guards
grep -r "\[Authorize\]\|RequirePermission\|IsInRole\|HasPermission" src/Services/{service}/ --include="*.cs" -n | head -30
# Role/permission enums
grep -r "enum.*Role\|enum.*Permission" src/Services/{service}/ --include="*.cs" -n | head -20
```

Build actor catalog: `[Role1, Role2, ...]`. Authorization TC minimum = actor count × 2 (authorized succeeds + unauthorized rejected). Every actor MUST appear in ≥1 authorization TC.

1. Grep commands/queries: `grep -r "class.*Command.*:" src/Services/{service}/`
2. Grep entities and domain events
3. Trace: Controller → Command → Handler → Entity → Event Handler
4. Identify testable behaviors from implementation

**Update mode (post-change / post-bugfix / post-PR):**

**[BLOCKING]:** Run Use Case Inventory on full module BEFORE git diff. Check existing TC count in Section 15.

```bash
# Write-side
grep -r "ICommandHandler\|CommandHandler\b" src/Services/{service}/ --include="*.cs" -l
grep -r "\[HttpPost\]\|\[HttpPut\]\|\[HttpPatch\]\|\[HttpDelete\]" src/Services/{service}/ --include="*.cs" -l
grep -r "IConsumer\|EventHandler\|IMessageConsumer\|BackgroundJob\|IHostedService" src/Services/{service}/ --include="*.cs" -l
# Read-side
grep -r "IQueryHandler\|QueryHandler\b" src/Services/{service}/ --include="*.cs" -l
grep -r "\[HttpGet\]" src/Services/{service}/ --include="*.cs" -l
```

- Count N+M+K (Grand Total) = minimum TC count.
- Existing TC count < minimum → pre-existing coverage gap. Flag: `"Pre-existing gap: {existing}/{minimum} TCs"`. Generate gap-filling TCs in addition to update-triggered TCs.
- NEVER add TCs only for changed code when baseline already under-covered.

1. Read existing Section 15 TCs
2. `git diff` or `git diff main...HEAD` (for PRs) — find code changes since last TC update
3. Identify: new commands/queries not covered, changed behaviors, removed features
4. Bugfixes: add regression TC (e.g., `TC-ORD-040: Regression — order total calculation bypass`)
5. Generate gap analysis

> **[REQUIRED] Spec-Wrong? Decision Gate (UPDATE mode only)**
>
> Before updating TCs to match the current code, determine: **Did the code drift from the spec, or was the spec wrong?**
>
> | Scenario                                                                 | Signal                                                                                     | Action                                                                                                                                                                                                                                                             |
> | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
> | Code was wrong (spec described correct behavior)                         | Bug was fixed; spec + TCs describe what SHOULD happen                                      | Proceed — update TCs only if code now matches spec. If code still differs, the fix is incomplete.                                                                                                                                                                  |
> | Spec was wrong (code implements correct behavior that spec misdescribed) | Spec described behavior that never worked correctly; the “fix” is actually a clarification | **STOP** — do NOT update TCs yet. First: run `/spec-discovery [update]` to correct the engineering spec. Then: run `/feature-docs [update]` on affected sections (Section 3, 4, 5 — business rules, user journeys, API contracts). THEN return here to update TCs. |
> | Behavior is a new requirement (neither spec nor code was wrong before)   | Feature change approved; both spec and TCs need updating                                   | Update feature doc Section 3/4 first (new behavior description), then update TCs here.                                                                                                                                                                             |
> | Uncertain                                                                | Cannot determine without stakeholder input                                                 | Escalate: document the ambiguity in this session’s summary. Write TCs in both `GIVEN old behavior` and `GIVEN new behavior` variants with `[PENDING REVIEW]` tag.                                                                                                  |
>
> **Checkpoint:** Answer this question before proceeding: “Is the code change intentional and approved?” If yes, update TCs. If no (regression), the code needs fixing — do not update TCs to document broken behavior.

6. Update **both** feature docs Section 15 AND `docs/specs/` dashboard

#### Step UPDATE-FINAL: TC Blast Radius Analysis (UPDATE mode only)

> **[RECOMMENDED]** After updating TCs for the target feature, scan for other features whose TCs
> may be invalidated by the same code change.

**Run these greps against `docs/business-features/`:**

```bash
# 1. Find API endpoint references in other feature docs
grep -rl "{endpoint}" docs/business-features/ | grep -v "{current-module}"
# Replace {endpoint} with the main API path changed (e.g., /api/employees, /api/invitations)

# 2. Find entity references in other feature docs
grep -rl "{entity-name}" docs/business-features/ | grep -v "{current-module}"
# Replace {entity-name} with key domain entities changed (e.g., Employee, Invitation)

# 3. Find event references in other feature docs
grep -rl "{event-name}" docs/business-features/ | grep -v "{current-module}"
# Replace {event-name} with events fired by the changed code
```

**Output:** List of potentially affected feature docs. For each hit:

1. Check if the referenced TC (Section 15) still describes valid behavior
2. If TC is stale → add to the UPDATE mode summary as "POTENTIALLY STALE: TC-{FEATURE}-{NNN} in {other-module} — review recommended"
3. Do NOT auto-update those TCs — only the owner of that feature doc should update them

**Summary format for watzup/session end:**

```
TC Blast Radius Analysis:
- Changed: {current-feature} ({N} TCs updated)
- Potentially affected: {module-A} (references {entity/endpoint})
- Potentially affected: {module-B} (references {entity/endpoint})
- Action needed: Review TCs in affected modules before next release
```

**Skip when:**

- Change is UI-only (no API, entity, or event changes)
- Change is additive only (new endpoint added, no existing endpoint modified)
- Module has no dependency surface (standalone, no shared entities)

**Sync mode (bidirectional reconciliation):**

1. Read feature docs Section 15 TCs for target module
2. Read `docs/specs/{Module}/README.md` TCs
3. Read test files: grep for test spec annotations in `src/Services/{service}*.IntegrationTests/`
4. Build 3-way comparison table:

```
| TC ID | In Feature Doc? | In specs/? | In Test Code? | Action Needed |
|-------|----------------|------------|---------------|---------------|
| TC-FEAT-001 | ✅ | ✅ | ✅ | None |
| TC-FEAT-025 | ✅ | ❌ | ✅ | Add to specs/ |
| TC-FEAT-030 | ❌ | ✅ | ❌ | Add to feature doc |
```

5. Reconcile: write missing TCs to whichever system lacks them
6. Feature docs remain source of truth — any conflict uses feature doc version

**From-integration-tests mode (reverse-engineer specs from existing tests):**

1. Grep `[Trait("TestSpec", "TC-...")]` in target test project
2. Per test method: extract TC ID, method name, test description from comments
3. Read test method body → generate GWT steps and evidence
4. Write extracted TCs to feature doc Section 15 (if not already there)
5. Useful when: tests written before spec system existed, or imported from another project

### TC Completeness Gate (BLOCKING — runs before Phase 3)

**[BLOCKING]** Do NOT start Phase 3 until all rows in this table show PASS:

| Gate                | Check                                 | Required                       | Actual | Status    |
| ------------------- | ------------------------------------- | ------------------------------ | ------ | --------- |
| Write-op coverage   | TC count for CRUD/write ops           | ≥ N (write ops from inventory) | {n}    | PASS/FAIL |
| Read-op coverage    | TC count for query/view ops           | ≥ M (read ops from inventory)  | {n}    | PASS/FAIL |
| Event/job coverage  | TC count for events + background jobs | ≥ K (event/job count)          | {n}    | PASS/FAIL |
| Permission coverage | TC count for authorization            | ≥ actor_count × 2              | {n}    | PASS/FAIL |
| Total floor         | Total planned TCs                     | ≥ N + M + K (Grand Total)      | {n}    | PASS/FAIL |

**FAIL action:** TaskCreate for each FAIL row — list specific missing TC categories. NEVER proceed to Phase 3 until all gates PASS.

**Operation group decomposition:** If Grand Total > 20, split TC generation into batches of ≤20 related operations:

```
TaskCreate: "Generate CRUD TCs for {feature} — ops {1-N}: {CommandA}, {CommandB}, {CommandC}"
TaskCreate: "Generate Read TCs for {feature} — ops {1-M}: {QueryA}, {QueryB}"
TaskCreate: "Generate Event TCs for {feature} — ops {1-K}: {EventConsumerA}, {BackgroundJobA}"
TaskCreate: "Generate Permission TCs for {feature} — actors: {Role1}, {Role2}"
TaskCreate: "Generate Edge Case TCs for {feature} — boundary conditions from inventory"
```

Each batch task completes before starting the next. Final AskUserQuestion review covers all batches together.

### Phase 3: TC Generation with Interactive Review

1. Generate TC outlines as a summary table:

```
| TC ID | Name | Priority | Category | Status |
|-------|------|----------|----------|--------|
| TC-ORD-037 | Create order with multiple line items | P0 | CRUD | New |
| TC-ORD-038 | Reject order without required fields | P1 | Validation | New |
| TC-ORD-039 | Unauthenticated user cannot access orders | P0 | Permission | New |
```

2. Use `AskUserQuestion` to review with user:

```
Question: "These {N} test cases cover {feature}. Review the list:
[Coverage context: Use Case Inventory found {total_ops} total operations ({write_ops} write, {read_ops} read, {event_ops} event/background). {N} TCs planned = {coverage_pct}% operation coverage.]"
Options:
- "Approve as-is (Recommended)" — Proceed to writing
- "Add missing scenario" — Describe what's missing
- "Adjust priorities" — Change P0/P1/P2 assignments
- "Regenerate" — Re-analyze and try again
```

**Coverage context calculation:** `coverage_pct = (N / total_ops) × 100`. If `coverage_pct < 80%`: flag `⚠️ Coverage below 80% threshold` and suggest adding TCs before approving.

3. Iterate until user approves.

### Phase 4: Write to Feature Doc Section 15

**Canonical write — feature docs own TCs. NEVER overwrite existing TCs.**

1. Locate Section 15 in target feature doc
2. Section 15 exists: append new TCs after existing, preserve existing TC IDs
3. Section 15 absent: create from template
4. Use `Edit` tool to upsert

**TC format** (from `tdd-spec-template.md`):

```markdown
#### TC-{FEATURE}-{NNN}: {Descriptive Test Name} [{Priority}]

**Objective:** {What this test verifies}

**Preconditions:**

- {Setup requirement}

**Test Steps:**
\`\`\`gherkin
Given {initial state}
And {additional context}
When {action}
Then {expected outcome}
And {additional verification}
\`\`\`

**Acceptance Criteria:**

- ✅ {Success behavior}
- ❌ {Failure behavior}

**Test Data:**
\`\`\`json
{ "field": "value" }
\`\`\`

**Edge Cases:**

- {Boundary condition}

**Evidence:** `{FilePath}:{LineRange}` or `TBD (pre-implementation)`
```

**Evidence rules by mode:**

- **TDD-first:** `Evidence: TBD (pre-implementation)` — will be updated after implementation
- **Implement-first:** `Evidence: {actual file}:{actual lines}` — trace to real code
- **Update:** Update existing evidence references if code moved

### Phase 5: Update docs/specs/ Dashboard (Optional)

If `docs/specs/{Module}/README.md` exists:

1. Update Implementation Index with TC→test method mappings
2. TDD-first: map to expected test method names (created by `/integration-test`)
3. Update `PRIORITY-INDEX.md` with new TC entries in correct priority tier

**Skip** if user says "skip dashboard" or no `docs/specs/` file exists for module.

### Phase 6: Next Step Suggestion

Based on mode, suggest via `AskUserQuestion`:

**TDD-first:**

```
1. "/tdd-spec-review — Validate TC quality before generating tests (Recommended)"
2. "/integration-test — Generate test stubs from these TCs (skip review)"
3. "/plan — Plan the feature implementation"
4. "Done for now — I'll implement later"
```

**Implement-first:**

```
1. "/tdd-spec-review — Validate TC quality before generating tests (Recommended)"
2. "/integration-test — Generate integration tests (skip review)"
3. "/workflow-review-changes — Review all changes"
4. "Done for now"
```

**Update (post-change/PR):**

```
1. "/tdd-spec-review — Validate updated TCs before regenerating tests (Recommended)"
2. "/integration-test — Generate/update tests for changed TCs (skip review)"
3. "/test — Run existing tests to verify coverage"
4. "/tdd-spec [direction=sync] — Sync dashboard with updated TCs"
5. "Done for now"
```

**Sync:**

```
1. "/tdd-spec [direction=sync] — Sync dashboard after reconciliation (Recommended)"
2. "/integration-test — Generate tests for any TCs missing test coverage"
3. "Done for now"
```

**From-integration-tests:**

```
1. "/tdd-spec [direction=sync] — Sync dashboard with newly documented TCs (Recommended)"
2. "/test — Run tests to verify all documented TCs pass"
3. "Done for now"
```

---

## TC Decade-Based Numbering

**[BLOCKING] Before assigning any TC ID:** Read all existing TC IDs in the feature doc's Section 15. Find the next available decade slot.

| NNN Range | Category                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 001–009   | CRUD / Core operations (P0-P1)                                                                                                       |
| 011–019   | Validation / Business rules (P1-P2)                                                                                                  |
| 021–029   | Authorization / Permissions (P0-P1)                                                                                                  |
| 031–039   | Events / Background jobs (P1-P2)                                                                                                     |
| 041–049   | Cross-service / Integration (P1-P2) — See `SYNC:cross-service-check` above for full boundary scan checklist before writing these TCs |
| 051–059   | Edge cases / Error scenarios (P2-P3)                                                                                                 |
| 061–069   | UI / User journey flows (P2-P3)                                                                                                      |
| 071–099   | Reserved for feature-specific groups                                                                                                 |

**Collision prevention:**

1. Grep the feature doc for `TC-{FEAT}-` to list all existing IDs
2. Find the highest NNN in the target decade → assign next sequential
3. If a decade is full (9 entries), use the next available decade in the same category grouping
4. Never reuse a deprecated TC ID

> **Authoritative reference:** `.claude/skills/shared/tc-format.md` — Decade-Based Numbering section

---

## TC Deprecation Protocol

When feature behavior removed or significantly changed:

1. **NEVER delete TC** — preserve audit trail and git blame
2. Append `[DEPRECATED: {YYYY-MM-DD} — {reason}]` to title
3. Change `**Status:**` → `Deprecated`
4. Section 17 (Version History): `TC-{ID} deprecated — {reason}`
5. Test code: add `[Obsolete("TC deprecated: {reason}")]` attribute and skip test
6. Forward sync (`/tdd-spec [direction=sync]`) auto-handles deprecated TCs in QA dashboard

**Example:**

```
#### TC-USR-021: User Can View Profile [P1] [DEPRECATED: 2026-04-21 — Field removed per privacy policy]
**Status:** Deprecated
```

---

## Anti-Patterns

- ❌ Writing TCs to `docs/specs/` as the primary destination (use feature docs Section 15)
- ❌ Using `TC-{SVC}-{NNN}` or `TC-{SVC}-{FEATURE}-{NNN}` format (use unified `TC-{FEATURE}-{NNN}`)
- ❌ Generating TCs without reading existing Section 15 (causes ID collisions)
- ❌ Skipping the interactive review step (user must approve TC list)
- ❌ Writing TCs without Evidence field (every TC needs it, even if `TBD`)

---

## See Also

- `tdd-spec-review` — TC quality review (use AFTER this skill to validate TC coverage and correctness)
- `tdd-spec [direction=sync]` — Native dashboard sync mode (aggregates TCs from feature docs to `docs/specs/` — replaces `test-specs-docs`)
- `integration-test` — Integration test code generator (use AFTER this skill to generate test stubs)
- `feature-docs` — Feature doc creator (creates the Section 15 that this skill populates)
- `refine` — PBI refinement (feeds acceptance criteria into this skill's TDD-first mode)

---

## Mode: Sync to Dashboard

**Triggered when:** "sync test specs", "update dashboard", "sync to feature docs", "reverse sync", "full sync", or `[direction=sync|forward|reverse|full]`.

> Engineering specs live at `docs/specs/{app-bucket}/{system-name}/`. This mode manages ONLY QA dashboard at `docs/specs/{Module}/`.
> **NEVER sync engineering specs here** — maintained by `workflow-spec-driven-dev`.

### Direction Detection

| Trigger phrase                                                                  | Direction | Behavior                                |
| ------------------------------------------------------------------------------- | --------- | --------------------------------------- |
| "sync test specs" / "update dashboard" / `direction=sync` / `direction=forward` | Forward   | Feature docs → `docs/specs/` dashboard  |
| "sync to feature docs" / "reverse sync" / `direction=reverse`                   | Reverse   | `docs/specs/` → feature docs Section 15 |
| "full sync" / "bidirectional" / `direction=full`                                | Full      | Both directions sequentially            |

**Default** (no direction specified): `forward`.

### Quality Gate (Before Any Sync)

**[BLOCKING]** Scan all TCs in module and flag:

- `Evidence = TBD` AND `Status = Tested` (contradiction)
- TCs missing GIVEN/WHEN/THEN structure
- TCs missing Acceptance Criteria

Produce quality report alongside sync output. **Do NOT block sync** — surface gaps and continue.

### Forward Sync Algorithm (Feature Docs → Dashboard)

1. Read all `TC-{FEAT}-{NNN}` entries from feature doc Section 15 (canonical source)
2. Read `docs/specs/{Module}/README.md` — extract existing TC IDs
3. Run quality gate — flag issues, log report
4. **Full-overwrite strategy:** Replace entire TC section in dashboard with re-extracted TCs from feature doc
    - NEVER merge — dashboard is derived, not canonical. Section 15 = single source of truth.

> **[REQUIRED] IntegrationTest field in dashboard rows:**
>
> When writing or updating TC rows in the QA dashboard, always populate the `IntegrationTest:` field
> with the traceability link format:
>
> ```
> IntegrationTest: {TestProject}::{TestClass}::{TestMethodName}
> ```
>
> If no integration test exists yet for this TC, write:
>
> ```
> IntegrationTest: (not yet implemented — run /integration-test [from-prompt] TC-{FEATURE}-{NNN})
> ```
>
> This creates a navigable link from the QA dashboard directly to the test code, and a TODO marker
> for TCs lacking test coverage. The "not yet implemented" text is detectable by tools scanning for
> coverage gaps.
>
> **Also add to dashboard header block:**
>
> ```markdown
> | Related Feature Doc | [docs/business-features/{Module}/README.md](../../business-features/{Module}/README.md) |
> | Engineering Spec | [docs/specs/{app-bucket}/{system-name}/](../{app-bucket}/{system-name}/) |
> ```

5. Update frontmatter in `docs/specs/{Module}/README.md`:
    ```yaml
    last_synced: YYYY-MM-DD
    last_synced_source: docs/business-features/{Module}/detailed-features/README.{FeatureName}.md
    tc_count: N
    ```
6. Run orphan check (see below)
7. Update `PRIORITY-INDEX.md` — add/update TCs in appropriate priority section
8. Ensure master `docs/specs/README.md` links to module

### Reverse Sync Algorithm (Dashboard → Feature Docs)

1. Read all TC IDs from `docs/specs/{Module}/README.md`
2. Read feature doc Section 15 — extract existing TC IDs
3. **ID-keyed merge:** TC in dashboard NOT in feature doc → insert into Section 15
    - NEVER overwrite existing TCs in feature doc (canonical)
    - Append new TCs at end of appropriate decade group
4. **[BLOCKING]** `AskUserQuestion` — present inserted TCs for user review before saving

### Orphaned TC Detection

TC orphaned when exists in `docs/specs/{Module}/README.md` but NOT in feature doc Section 15.

1. After forward sync: compute `orphans = dashboard_ids - feature_doc_ids`
2. Non-empty orphans:
    - Log: `⚠ Orphaned TCs detected: {count} TCs in dashboard have no canonical source`
    - List each orphaned TC-ID
    - Move to `### Quarantined TCs` subsection in dashboard (NEVER delete)
    - Add: `<!-- Orphaned {date}: no matching TC in feature docs Section 15 -->`
3. Orphaned TC has `[DEPRECATED]` in title → silently remove from dashboard

### Staleness Tracking

**Drift detection:** `git log --since={last_synced}` shows changes → flag stale before proceeding.

```bash
git log --since={last_synced} -- docs/business-features/{Module}/detailed-features/README.{FeatureName}.md
```

Non-empty output → warn: `⚠ Source feature doc changed since last sync on {last_synced}. Proceeding with forward sync.`

---

## Workflow Recommendation

> **[BLOCKING]** NOT in a workflow? `AskUserQuestion` — do NOT decide complexity yourself. User decides:
>
> 1. **`pbi-to-tests` workflow** (Recommended) — tdd-spec → tdd-spec-review → quality-gate → workflow-end
> 2. **`/tdd-spec` directly** — standalone

## Next Steps

**[BLOCKING]** After completing, `AskUserQuestion` — do NOT skip:

- **"/tdd-spec-review (Recommended)"** — Validate TC quality (completeness, GWT format, coverage gaps)
- **"/integration-test"** — Generate integration test code directly (skip review when specs already reviewed)
- **"Skip, continue manually"** — user decides

## Closing Reminders

**[BLOCKING]** `TaskCreate` — break ALL work into small tasks BEFORE starting.
**[BLOCKING]** `AskUserQuestion` — validate decisions with user. NEVER auto-decide.
**[REQUIRED]** Add final review todo task to verify work quality.
**[BLOCKING]** READ reference files before starting.

<!-- SYNC:rationalization-prevention:reminder -->

- **IMPORTANT MUST ATTENTION** NEVER skip steps via "too simple" or "already searched" evasions — plan anyway, test first, show grep evidence.
  <!-- /SYNC:rationalization-prevention:reminder -->
  <!-- SYNC:evidence-based-reasoning:reminder -->
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% do NOT recommend.
  <!-- /SYNC:evidence-based-reasoning:reminder -->
  <!-- SYNC:cross-cutting-quality:reminder -->
- **IMPORTANT MUST ATTENTION** check error handling, logging, security, performance, observability across changed files.
  <!-- /SYNC:cross-cutting-quality:reminder -->
  <!-- SYNC:ui-system-context:reminder -->
- **IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
  <!-- /SYNC:ui-system-context:reminder -->
  <!-- SYNC:estimation-framework:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai` in plan/PBI frontmatter. SP table: SP 1=0.5d/0.25d · SP 2=1d/0.35d · SP 3=2d/0.65d · SP 5=4d/1.0d · SP 8=6d/1.5d · SP 13=10d/2.0d. Speedup grows ~2x→5x with size. SP 13 SHOULD split, SP 21 MUST split.
  <!-- /SYNC:estimation-framework:reminder -->
  <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: NEVER present guess as fact.
  <!-- /SYNC:critical-thinking-mindset:reminder -->
  <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
  <!-- /SYNC:ai-mistake-prevention:reminder -->
- **IMPORTANT MUST ATTENTION** NEVER write TCs to `docs/specs/` as primary destination — Section 15 is canonical.
- **IMPORTANT MUST ATTENTION** NEVER generate TCs without reading existing Section 15 — ID collisions corrupt registry.
- **IMPORTANT MUST ATTENTION** run Spec-Wrong? Gate in UPDATE mode — NEVER update TCs to document broken behavior.
- **IMPORTANT MUST ATTENTION** NEVER skip interactive review (`AskUserQuestion`) — user must approve TC list before writing.
- **IMPORTANT MUST ATTENTION** authorization TCs are MANDATORY — every role must appear in ≥1 authorization TC.

---

## Related Skills

| Skill                        | Relationship                                                                               | When to Call                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `/spec-discovery`            | **Upstream spec** — engineering spec bundle is the source of truth for domain model        | When TCs reveal implementation doesn’t match spec-discovery output: run spec-discovery audit/update |
| `/feature-docs`              | **TC host** — Section 15 is where TCs live; feature-docs creates/updates the doc structure | Before calling tdd-spec, feature doc must exist; run /feature-docs if missing                       |
| `/tdd-spec-review`           | **Reviewer** — audits TC coverage, GIVEN/WHEN/THEN quality, no duplicates                  | Always call after tdd-spec (CREATE or UPDATE) — never ship TCs without review                       |
| `/integration-test`          | **Consumer** — generates test code from TCs                                                | After tdd-spec + review, integration-test converts TCs to `.cs` test files                          |
| `/tdd-spec [direction=sync]` | **Self (sync mode)** — syncs QA dashboard from Section 15                                  | Always call after tdd-spec UPDATE; syncs `docs/specs/{Module}/README.md`                            |
| `/docs-update`               | **Orchestrator** — calls tdd-spec as Phase 3 of doc sync chain                             | Run /docs-update for full automated sync (calls tdd-spec UPDATE + sync internally)                  |

## Standalone Chain

> **When called outside a workflow**, follow this chain. Each step is required unless marked [RECOMMENDED].

```
tdd-spec (you are here)
  │
  ├─ PREREQUISITE:
  │    [REQUIRED] feature-docs doc must exist at docs/business-features/{Module}/README.md
  │    If not found → run /feature-docs init first
  │
  ├─ CREATE mode (new feature):
  │    tdd-spec CREATE → /tdd-spec-review → /tdd-spec [direction=sync] → /integration-test [from-prompt]
  │
  ├─ UPDATE mode (code changed):
  │    *** Spec-Wrong? Gate first (see above) ***
  │    tdd-spec UPDATE → Step UPDATE-FINAL (Blast Radius) → /tdd-spec-review → /tdd-spec [direction=sync] → /integration-test [from-changes]
  │
  ├─ [REQUIRED] → /tdd-spec-review
  │     Always run after CREATE or UPDATE. Validates coverage and format.
  │
  ├─ [REQUIRED] → /tdd-spec [direction=sync]
  │     Always run after UPDATE to sync QA dashboard.
  │
  ├─ [REQUIRED] → /integration-test [from-changes or from-prompt]
  │     Generate/update integration test code for changed TCs.
  │
  └─ [RECOMMENDED] → /docs-update
        For full chain including feature-docs (Phase 2) and spec-discovery (Phase 2.5).
        Call when multiple doc layers may be stale.
```

### Integration with Bugfix Flow

When tdd-spec is called in **REGRESSION mode** (bugfix workflow):

1. Run **Spec-Wrong? Gate** FIRST (same logic as UPDATE mode)
2. If spec was wrong → run spec-discovery update BEFORE writing regression TCs
3. If code was wrong → write regression TC describing correct (expected) behavior, then proceed to fix
4. Regression TCs describe the CORRECT behavior, not the broken behavior

**Anti-pattern to avoid:**

```
# WRONG: Documenting the bug as expected behavior
TC-REG-001: GIVEN payment processed WHEN amount > limit THEN allow (← this was the bug)

# RIGHT: Documenting the fix as expected behavior
TC-REG-001: GIVEN payment processed WHEN amount > limit THEN reject with PaymentLimitExceededException
```

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->
