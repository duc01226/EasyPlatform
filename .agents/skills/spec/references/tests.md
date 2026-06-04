> The `spec` skill (`../SKILL.md`) loads this body for `[mode=tests]`. It is the TC-generation procedure: generate/update test specifications in feature-doc Section 8 using the unified `TC-{FEATURE}-{NNN}` format. The host SKILL.md owns the generic gates (task-tracking, evidence, project-reference docs) and the standalone next-steps tail — this body carries only the mode-specific procedure. For the spec↔test-code reconciliation procedure, see `sync.md` (`[mode=sync]`).

# Mode: Generate / Update Test Specifications (Section 8)

> **Portability:** `docs/specs/` is the fixed Feature Spec root.

**Goal:** Generate/update test specs in feature docs Section 8 (canonical TC registry) — unified `TC-{FEATURE}-{NNN}` format. 5 modes: TDD-first, implement-first, update (post-change/PR), sync, from-integration-tests.

**Workflow:** (1) Mode Detection → (2) Investigation → (3) TC Generation → (4) Write Section 8 → (5) Test-Code Sync → (6) Next Steps

**Key Rules:** Unified `TC-{FEATURE}-{NNN}` format · Section 8 = source of truth · Evidence required on every TC · Minimum 4 categories (positive, negative, authorization, edge cases) · Interactive review via a direct user question mandatory

> **[M5 — Rebuild-from-scratch signal]** A competent team with zero codebase knowledge MUST be able to derive and execute every TC from the spec text alone, on ANY stack — without reading source. If a TC's intent is only understandable by opening the implementation, it fails M5: rewrite the objective/Given-When-Then in business-observable terms. See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)" for BLOCKING criteria.

> **[BLOCKING] One TC → many tests (business-oriented TCs):** Each §8 TC is a **business / user-story acceptance scenario**, not a code unit. It is covered by **one OR MANY** annotation-tagged tests (integration + unit, across components/services), joined by the test-spec annotation (key `TestSpec`, value `TC-...`) in the configured test framework's syntax. Write TCs at the business-behavior grain — NEVER split, narrow, or technicalize a TC so it maps 1:1 to a single test method or production class (that breaks the business/user-story orientation, M1/M5). Coverage = ≥1 annotation-tagged test. Many tests sharing one TC is correct, never a duplicate. Canonical contract: `.claude/skills/shared/tc-format.md` → TC ↔ Test Code Cardinality.

> **Graph Context (MANDATORY when graph.db exists):** Before generating test specs for cross-service features, run:
>
> ```bash
> python .claude/scripts/code_graph trace {configured-source-path}/{feature-entry-file} --direction both --json
> ```
>
> Use output to identify: event consumers, message bus subscribers, background jobs triggered by this feature. These are cross-service TC candidates (category 041–049).

## Reference Files (read BEFORE generating TCs)

> **`.claude/skills/spec/references/spec-tests-template.md`** — TC format template: GWT structure, Evidence field, decade-numbering, Preservation Tests section (mandatory for bugfixes). Read before generating any TC.

- `.claude/skills/spec/references/spec-tests-template.md` — TC template format
- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read directly when relevant; do not rely on hook-injected conversation text)
- `docs/project-reference/integration-test-reference.md` — Integration test patterns, fixture setup, seeder conventions, lessons learned (MUST READ before reviewing/writing integration tests)
- `docs/specs/` — Existing TCs by module — read BEFORE generating to avoid ID collisions

**Workflow:**

1. **Mode Detection** — TDD-first, implement-first, update, sync, or from-integration-tests
2. **Investigation** — Analyze PBI/codebase/existing TCs/git changes per mode
3. **TC Generation** — Generate TC outlines, interactive review with user
4. **Write to Feature Doc** — Upsert TCs into Section 8
5. **Test-Code Sync** — Optionally reconcile Section 8 TCs ↔ integration test code (forward-sync; §8 canonical) — see `sync.md`
6. **Next Steps** — Suggest follow-on actions per mode

**Key Rules:**

- **Unified format:** `TC-{FEATURE}-{NNN}` — feature codes in `docs/project-reference/feature-spec-reference.md`
- **Source of truth:** Feature docs Section 8 — canonical TC registry. NEVER write TCs to `docs/specs/` as primary destination.
- **Evidence required:** Every TC MUST have `Evidence: [Source: {namespace}/{service}/{id}]` (stack-portable abstract anchor — never physical code coordinates or repository-root paths) or `TBD (pre-implementation)` for TDD-first. Canonical format + anchor taxonomy: `shared/tc-format.md`
- **Minimum 4 categories:** Positive (happy path) · Negative (error handling) · **Authorization** (role-based access — MANDATORY) · Edge cases
    - **Bugfix specs:** MANDATORY Preservation Tests — see `references/spec-tests-template.md#preservation-tests-mandatory-for-bugfix-specs`
    - **Query-Only exception:** Read-only, no auth boundaries, no events → validation + authorization + edge cases minimum
    - **Config-Only exception:** Flag-toggle features, no entity changes → authorization + edge cases minimum
- **Cross-cutting TC categories (when applicable):**
    - **Authorization TCs (MANDATORY):** Authorized succeeds, unauthorized rejected, role visibility verified
    - **Seed Data TCs:** Reference data exists, seeder runs correctly
    - **Performance TCs:** Feature within SLA under production-like volume
    - **Data Migration TCs:** Data transforms correctly, rollback works, no data loss
    - **Preservation TCs (MANDATORY bugfixes):** ≥1 per "Healthy input" row — authored from OLD code semantics BEFORE fix lands
- **Interactive review:** ALWAYS a direct user question — review TC list with user before writing

---

## Quick Reference

### Related Skills

| Skill              | Relationship                                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spec [mode=sync]` | **Native sync mode** — forward-syncs Section 8 TCs ↔ integration test code (see `sync.md`)                                                                                                   |
| `integration-test` | Code generator → generates integration tests FROM TCs written by this mode                                                                                                                   |
| `$spec`            | Feature doc creator → creates the Section 8 that this mode populates                                                                                                                         |
| `$spec-index`      | **Derived index** — regenerable navigation catalog/ERD assembled FROM the Feature Specs (never a source of truth). After §8 changes, refresh the bucket `INDEX.md` TC counts via $spec-index |

### Output Locations

| Artifact              | Path                                                                         |
| --------------------- | ---------------------------------------------------------------------------- |
| TCs (canonical)       | `docs/specs/{App}/README.{Feature}.md` Section 8                             |
| Integration test code | `{IntegrationTests}/` — §8 TCs forward-synced here via `[mode=sync]`         |
| Spec index (derived)  | `docs/specs/{App}/INDEX.md` — regenerable TC-count catalog (via $spec-index) |

> **Phase-Mapped Coverage:** When a plan exists with multiple phases, generate test cases
> PER PHASE — not just per feature. Each phase's success criteria must have ≥1 test case.

### Frontend/UI Context (if applicable)

> When this task involves frontend or UI changes,

- Component patterns: `docs/project-reference/frontend-patterns-reference.md`
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

---

## Detailed Workflow

### Phase 1: Mode Detection & Context

Detect mode from prompt and context:

| Mode                       | Signal                                            | Action                                                                  |
| -------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| **TDD-first**              | PBI/story exists, code not yet written            | Generate specs from requirements                                        |
| **Implement-first**        | Code already exists, no/incomplete TCs            | Generate specs from codebase analysis                                   |
| **Update**                 | Existing TCs + code changes / bugfix / PR         | Diff existing TCs against current code/PR, find gaps, update both       |
| **Sync**                   | User says "sync test specs" or bidirectional need | Reconcile feature docs ↔ docs/specs/ (either direction) — see `sync.md` |
| **From-integration-tests** | Tests exist with test spec annotations, no docs   | Extract TC metadata from test code → write to feature docs              |

### Mode Confirmation (ask the user directly)

**[REQUIRED]** Confirm mode before Phase 2 when signals ambiguous:

- Both "update" and "sync" present → which takes priority?
- No mode keyword → TDD-first (new feature) or implement-first (code exists)?
- "from integration tests" → high effort, confirm scope

> "Detected mode: **{detected_mode}** for feature: **{feature_name}**. TCs to write: ~{estimated_count}. Correct?"
>
> Options: [Yes, proceed] [Change mode] [Change scope]

Skip confirmation only when mode explicit in `$ARGUMENTS` AND feature name unambiguous.

**Must read FIRST:**

1. `docs/project-reference/feature-spec-reference.md` — correct `{FEATURE}` code for TC IDs (read directly when relevant; do not rely on hook-injected conversation text)
2. Target feature doc — Section 8 exists? Read existing TCs to avoid ID collisions
3. `docs/project-reference/spec-principles.md` — Section 7 (TC Coverage Mapping), minimum categories and depth (read directly when relevant; do not rely on hook-injected conversation text)

**Spec Readiness Gate (BLOCKING — implement-first and update modes only):**

Read target feature doc Sections 3, 4, 5, 7. Check:

- Every BR-XX in Section 4 has `[Source: {namespace}/{service}/{id}]` abstract-anchor citation — flag missing
- Every US-/AC- in Section 3 references ≥1 `BR-XX` — flag unreferenced user stories
- Section 7 has permission matrix (≥1 role × action row) — flag if absent
- Section 3 has US-/AC- entries with explicit outcomes — flag if empty/vague

If 2+ fail → a direct user question: "Spec readiness below TC generation threshold. Fill gaps first OR proceed with shallow TCs (`Status: Planned`)?" NEVER silently generate shallow TCs.

**If target feature doc missing:** suggest `$spec` first, OR create minimal Section 8 stub.

### Phase 2: Investigation

**TDD-first mode:**

1. Read PBI/story from `team-artifacts/pbis/` or user-provided
2. Extract acceptance criteria
3. Identify TC categories: CRUD, validation, **authorization** (mandatory), workflows, edge cases, seed data, performance, data migration
4. Cross-reference existing feature doc requirements (Sections 1-7)
5. PBI Authorization section → generate authorization TCs (unauthorized rejection per role)
6. PBI Seed Data section → generate seed data TCs if reference/config data needed
7. PBI Data Migration section → generate migration TCs if schema changes exist

**Implement-first mode:**

**[BLOCKING]:** Enumerate ALL operations first — establishes minimum TC floor.

**Use Case Inventory (implement-first):**

```bash
# First resolve {target-source-path} and source file globs from docs/project-config.json
# and the project reference docs named by docs/project-reference/docs-index-reference.md.
# Write-side handlers/operations
rg "{project write-handler patterns}" {target-source-path} -g "{source-file-glob}" -l
# Write-side mutating endpoints/actions
rg "{project mutating-endpoint patterns}" {target-source-path} -g "{source-file-glob}" -l
# Event consumers / background jobs / async processors
rg "{project event-or-background-job patterns}" {target-source-path} -g "{source-file-glob}" -l
# Read-side handlers/operations
rg "{project read-handler patterns}" {target-source-path} -g "{source-file-glob}" -l
# Read-side query endpoints/actions
rg "{project read-endpoint patterns}" {target-source-path} -g "{source-file-glob}" -l
```

Count: N (write) + M (read) + K (event/background) = **minimum TC count**.
If minimum > 20: split into operation-group batches (≤20 ops each per task tracking). NEVER generate all TCs in one pass for large features.

**Actor Catalog Discovery (MANDATORY — feeds authorization TCs):**

```bash
# Permission attributes and role guards
rg "{project authorization/permission guard patterns}" {target-source-path} -g "{source-file-glob}" -n | head -30
# Role/permission enums
rg "{project actor/role/permission definition patterns}" {target-source-path} -g "{source-file-glob}" -n | head -20
```

Build actor catalog: `[Role1, Role2,...]`. Authorization TC minimum = actor count × 2 (authorized succeeds + unauthorized rejected). Every actor MUST appear in ≥1 authorization TC.

1. Grep commands/queries using project patterns from `docs/project-config.json` and the referenced architecture/test docs.
2. Grep entities and domain events
3. Trace: Controller → Command → Handler → Entity → Event Handler
4. Identify testable behaviors from implementation

**Update mode (post-change / post-bugfix / post-PR):**

**[BLOCKING]:** Run Use Case Inventory on full module BEFORE git diff. Check existing TC count in Section 8.

```bash
# Write-side
rg "{project write-handler patterns}" {target-source-path} -g "{source-file-glob}" -l
rg "{project mutating-endpoint patterns}" {target-source-path} -g "{source-file-glob}" -l
rg "{project event-or-background-job patterns}" {target-source-path} -g "{source-file-glob}" -l
# Read-side
rg "{project read-handler patterns}" {target-source-path} -g "{source-file-glob}" -l
rg "{project read-endpoint patterns}" {target-source-path} -g "{source-file-glob}" -l
```

- Count N+M+K (Grand Total) = minimum TC count.
- Existing TC count < minimum → pre-existing coverage gap. Flag: `"Pre-existing gap: {existing}/{minimum} TCs"`. Generate gap-filling TCs in addition to update-triggered TCs.
- NEVER add TCs only for changed code when baseline already under-covered.

1. Read existing Section 8 TCs
2. `git diff` or `git diff main...HEAD` (for PRs) — find code changes since last TC update
3. Identify: new commands/queries not covered, changed behaviors, removed features
4. Bugfixes: add regression TC (e.g., `TC-ORD-040: Regression — order total calculation bypass`)
5. Generate gap analysis

> **[REQUIRED] Spec-Wrong? Decision Gate (UPDATE mode only)**
>
> Before updating TCs to match the current code, determine: **Did the code drift from the spec, or was the spec wrong?**
>
> | Scenario                                                                 | Signal                                                                                     | Action                                                                                                                                                                                                                            |
> | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | Code was wrong (spec described correct behavior)                         | Bug was fixed; spec + TCs describe what SHOULD happen                                      | Proceed — update TCs only if code now matches spec. If code still differs, the fix is incomplete.                                                                                                                                 |
> | Spec was wrong (code implements correct behavior that spec misdescribed) | Spec described behavior that never worked correctly; the "fix" is actually a clarification | **STOP** — do NOT update TCs yet. First: run `$spec [update]` on the affected sections (Section 3, 4, 5 — business rules, user journeys, API contracts) to correct the canonical Feature Spec. THEN return here to update §8 TCs. |
> | Behavior is a new requirement (neither spec nor code was wrong before)   | Feature change approved; both spec and TCs need updating                                   | Update feature doc Section 3/4 first (new behavior description), then update TCs here.                                                                                                                                            |
> | Uncertain                                                                | Cannot determine without stakeholder input                                                 | Escalate: document the ambiguity in this session's summary. Write TCs in both `GIVEN old behavior` and `GIVEN new behavior` variants with `[PENDING REVIEW]` tag.                                                                 |
>
> **Checkpoint:** Answer this question before proceeding: "Is the code change intentional and approved?" If yes, update TCs. If no (regression), the code needs fixing — do not update TCs to document broken behavior.

6. Update feature docs Section 8 (canonical), then forward-sync to integration test code via `[mode=sync]`

#### Step UPDATE-FINAL: TC Blast Radius Analysis (UPDATE mode only)

> **[RECOMMENDED]** After updating TCs for the target feature, scan for other features whose TCs
> may be invalidated by the same code change.

**Run these greps against `docs/specs/`:**

```bash
# 1. Find API endpoint references in other feature docs
grep -rl "{endpoint}" docs/specs/ | grep -v "{current-module}"
# Replace {endpoint} with the main API path changed (e.g., /api/orders, /api/customers)

# 2. Find entity references in other feature docs
grep -rl "{entity-name}" docs/specs/ | grep -v "{current-module}"
# Replace {entity-name} with key domain entities changed (e.g., Order, Customer)

# 3. Find event references in other feature docs
grep -rl "{event-name}" docs/specs/ | grep -v "{current-module}"
# Replace {event-name} with events fired by the changed code
```

**Output:** List of potentially affected feature docs. For each hit:

1. Check if the referenced TC (Section 8) still describes valid behavior
2. If TC is stale → add to the UPDATE mode summary as "POTENTIALLY STALE: TC-{FEATURE}-{NNN} in {other-module} — review recommended"
3. Leave those TCs for the owner of that feature doc to update — never auto-update them yourself

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

**Sync mode (§8 TCs ↔ integration test code):** the full reconciliation procedure lives in `sync.md` (`[mode=sync]`). High-level shape:

1. Read feature docs Section 8 TCs for target module (canonical source)
2. Read test files: grep for the test-spec annotation (key `TestSpec`) in the integration-test paths configured by `docs/project-config.json` or the project integration-test reference doc.
3. Build a 2-way comparison table:

```
| TC ID | In §8 (Feature Doc)? | In Test Code? | Action Needed |
|-------|----------------------|---------------|---------------|
| TC-FEAT-001 | ✅ | ✅ | None |
| TC-FEAT-025 | ✅ | ❌ | Generate test via $integration-test |
| TC-FEAT-030 | ❌ | ✅ | Back-fill §8 TC (from-integration-tests mode) |
```

4. Reconcile: a §8 TC with no covering test → flag for `$integration-test`; an existing test with no §8 TC → back-fill the TC into §8
5. Section 8 remains source of truth — any conflict uses the §8 version

**From-integration-tests mode (reverse-engineer specs from existing tests):**

1. Grep for the test-spec annotation (key `TestSpec`) in the target test project
2. Per test method: extract TC ID, method name, test description from comments
3. Read test method body → generate GWT steps and evidence
4. Write extracted TCs to feature doc Section 8 (if not already there)
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

**FAIL action:** task tracking for each FAIL row — list specific missing TC categories. NEVER proceed to Phase 3 until all gates PASS.

**Operation group decomposition:** If Grand Total > 20, split TC generation into batches of ≤20 related operations:

```
Task tracking: "Generate CRUD TCs for {feature} — ops {1-N}: {CommandA}, {CommandB}, {CommandC}"
Task tracking: "Generate Read TCs for {feature} — ops {1-M}: {QueryA}, {QueryB}"
Task tracking: "Generate Event TCs for {feature} — ops {1-K}: {EventConsumerA}, {BackgroundJobA}"
Task tracking: "Generate Permission TCs for {feature} — actors: {Role1}, {Role2}"
Task tracking: "Generate Edge Case TCs for {feature} — boundary conditions from inventory"
```

Each batch task completes before starting the next. Final ask the user directly review covers all batches together.

### Phase 3: TC Generation with Interactive Review

1. Generate TC outlines as a summary table:

```
| TC ID | Name | Priority | Category | Status |
|-------|------|----------|----------|--------|
| TC-ORD-037 | Create order with multiple line items | P0 | CRUD | New |
| TC-ORD-038 | Reject order without required fields | P1 | Validation | New |
| TC-ORD-039 | Unauthenticated user cannot access orders | P0 | Permission | New |
```

2. Use a direct user question to review with user:

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

### Phase 4: Write to Feature Doc Section 8

**Canonical write — feature docs own TCs. NEVER overwrite existing TCs.**

1. Locate Section 8 in target feature doc
2. Section 8 exists: append new TCs after existing, preserve existing TC IDs
3. Section 8 absent: create from template
4. Use `Edit` tool to upsert

**TC format** (from `spec-tests-template.md`):

```markdown
#### TC-{FEATURE}-{NNN}: {Descriptive Test Name} [{Priority}]

**Objective:** {What this test verifies}

**Business Intent / Invariant Guarded:** {Business rule or invariant this TC protects; the TC must fail if this rule breaks}

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

**Evidence:** `[Source: {namespace}/{service}/{id}]` or `TBD (pre-implementation)`
```

> **[M1-M2 Compliance — authoring the TC body]** The `Objective`, `Business Intent / Invariant Guarded`, and the `Given/When/Then` steps MUST name business operations and observable states only — what an actor does and what the system visibly does in response. NEVER use class/method/file names, transport/handler names, or language-native types in these fields. Those source identifiers belong ONLY in the `**Evidence**` and `IntegrationTest` carriers. Quick check: replace the implementation with a different stack — does the GWT still read correctly? If not, it leaks tech (M1/M2 fail). See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)" for BLOCKING criteria.

**Evidence rules by mode:**

- **TDD-first:** `Evidence: TBD (pre-implementation)` — will be updated after implementation
- **Implement-first:** trace to the real code, then record the stack-portable abstract anchor `Evidence: [Source: {namespace}/{service}/{id}]` (derive namespace/service/id per `shared/tc-format.md`; the physical `file:line` goes to the provenance sidecar, NEVER into the doc)
- **Update:** re-resolve the anchor ONLY if the logical artifact was renamed/split; a file move or stack change does NOT change the anchor — that stability is the point

> **[M3 Traceability — logical-IDs-first]** Every TC MUST map to at least one logical business-rule/operation ID (`BR-`/`OP-` from feature doc Section 6/8) as its primary trace spine — record this mapping in the TC body (e.g. a `Traces: BR-XX, OP-XX` line) SEPARATE from the evidence anchor. The `[Source: {namespace}/{service}/{id}]` in the `**Evidence**` field is the SECONDARY, stack-portable carrier — it names WHICH logical artifact implements/verifies the behavior, never WHAT the TC guards. KEEP the abstract anchor; never drop it and never replace it with `file:line` (physical coordinates live only in the provenance sidecar). A TC with `[Source: ...]` but no logical-ID mapping fails M3. See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)" for BLOCKING criteria.

### Phase 5: Sync Section 8 TCs ↔ Integration Test Code (Optional)

The full reconciliation procedure (direction detection, quality gate, forward/reverse algorithms, orphan detection, staleness tracking) lives in `sync.md` (`[mode=sync]`). At a glance, the forward shape (§8 is canonical; test code implements it):

1. Map each §8 TC to its covering test method(s) via the test-spec annotation (key `TestSpec`, value `TC-…`) — **one TC may be covered by many tests** (integration + unit, across components/services); the annotation is the join key, and finding ≥1 covering test means the TC is covered (see `tc-format.md` → TC ↔ Test Code Cardinality)
2. TDD-first: map to expected test method names (to be created by `$integration-test`)
3. Flag §8 TCs with **zero** covering tests as coverage gaps for `$integration-test` (NEVER flag many-tests-per-TC as a problem — that is the expected one-to-many shape; NEVER split a business TC to achieve a 1:1 map to test methods)

> **[M2/M3 — keep §8 stack-portable]** Each TC's `Evidence` **abstract anchor** (`[Source: {namespace}/{service}/{id}]`) stays verbatim — NEVER expand it to physical code coordinates or repository-root paths. The only physical reference a TC may carry is the operational `IntegrationTest` field — one or more `{TestFile}::{MethodName}` link(s) (or a test-filter expression), since a business TC maps to many tests.

**Skip** if user says "skip sync" or no integration test project exists for the module. For the full algorithm, switch to `[mode=sync]` (`sync.md`).

### Phase 6: Next Step Suggestion

Based on mode, suggest via a direct user question:

**TDD-first:**

```
1. "$review-artifact --type=spec-tests — Validate TC quality before generating tests (Recommended)"
2. "$integration-test — Generate test stubs from these TCs (skip review)"
3. "$plan — Plan the feature implementation"
4. "Done for now — I'll implement later"
```

**Implement-first:**

```
1. "$review-artifact --type=spec-tests — Validate TC quality before generating tests (Recommended)"
2. "$integration-test — Generate integration tests (skip review)"
3. "$workflow-review-changes — Review all changes"
4. "Done for now"
```

**Update (post-change/PR):**

```
1. "$review-artifact --type=spec-tests — Validate updated TCs before regenerating tests (Recommended)"
2. "$integration-test — Generate/update tests for changed TCs (skip review)"
3. "$test — Run existing tests to verify coverage"
4. "spec [mode=sync] — Sync §8 TCs ↔ integration test code"
5. "Done for now"
```

**Sync:**

```
1. "spec [mode=sync] — Sync §8 TCs ↔ integration test code after reconciliation (Recommended)"
2. "$integration-test — Generate tests for any TCs missing test coverage"
3. "Done for now"
```

**From-integration-tests:**

```
1. "spec [mode=sync] — Sync §8 TCs ↔ integration test code for newly documented TCs (Recommended)"
2. "$test — Run tests to verify all documented TCs pass"
3. "Done for now"
```

---

## TC Decade-Based Numbering

**[BLOCKING] Before assigning any TC ID:** Read all existing TC IDs in the feature doc's Section 8. Find the next available decade slot.

| NNN Range | Category                                                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 001–009   | CRUD / Core operations (P0-P1)                                                                                                           |
| 011–019   | Validation / Business rules (P1-P2)                                                                                                      |
| 021–029   | Authorization / Permissions (P0-P1)                                                                                                      |
| 031–039   | Events / Background jobs (P1-P2)                                                                                                         |
| 041–049   | Cross-service / Integration (P1-P2) — run the cross-service boundary scan (producers/consumers/sagas/contracts) before writing these TCs |
| 051–059   | Edge cases / Error scenarios (P2-P3)                                                                                                     |
| 061–069   | UI / User journey flows (P2-P3)                                                                                                          |
| 071–099   | Reserved for feature-specific groups                                                                                                     |

**Collision prevention:**

1. Grep the feature doc for `TC-{FEATURE}-` to list all existing IDs
2. Find the highest NNN in the target decade → assign next sequential
3. If a decade is full (9 entries), use the next available decade in the same category grouping
4. Assign only fresh, never-before-used TC IDs — never reuse a deprecated ID

> **Authoritative reference:** `.claude/skills/shared/tc-format.md` — Decade-Based Numbering section

---

## TC Deprecation Protocol

When feature behavior removed or significantly changed:

1. **NEVER delete TC** — preserve audit trail and git blame
2. Append `[DEPRECATED: {YYYY-MM-DD} — {reason}]` to title
3. Change `**Status:**` → `Deprecated`
4. Test code: add `[Obsolete("TC deprecated: {reason}")]` attribute and skip test
5. Forward sync (`spec [mode=sync]`) auto-handles deprecated TCs in Section 8

**Example:**

```
#### TC-USR-021: User Can View Profile [P1] [DEPRECATED: 2026-04-21 — Field removed per privacy policy]
**Status:** Deprecated
```

---

## Anti-Patterns

- ❌ Writing TCs to `docs/specs/` as the primary destination (use feature docs Section 8)
- ❌ Using `TC-{SVC}-{NNN}` or `TC-{SVC}-{FEATURE}-{NNN}` format (use unified `TC-{FEATURE}-{NNN}`)
- ❌ Generating TCs without reading existing Section 8 (causes ID collisions)
- ❌ Skipping the interactive review step (user must approve TC list)
- ❌ Writing TCs without Evidence field (every TC needs it, even if `TBD`)

---

## See Also

- `review-artifact --type=spec-tests` — TC quality review (use AFTER this mode to validate TC coverage and correctness)
- `spec [mode=sync]` — Native sync mode (forward-syncs Section 8 TCs ↔ integration test code; see `sync.md`)
- `integration-test` — Integration test code generator (use AFTER this mode to generate test stubs)
- `$spec` — Feature doc creator (creates the Section 8 that this mode populates)
- `refine` — PBI refinement (feeds acceptance criteria into this mode's TDD-first path)

---

## Integration with Bugfix Flow

When `spec [mode=tests]` is called in **REGRESSION mode** (bugfix workflow):

1. Run **Spec-Wrong? Gate** FIRST (same logic as UPDATE mode)
2. If spec was wrong → run `$spec [update]` (fix the canonical spec) BEFORE writing regression TCs
3. If code was wrong → write regression TC describing correct (expected) behavior, then proceed to fix
4. Regression TCs describe the CORRECT behavior, not the broken behavior

**Anti-pattern to avoid:**

```
# WRONG: Documenting the bug as expected behavior
TC-REG-001: GIVEN payment processed WHEN amount > limit THEN allow (← this was the bug)

# RIGHT: Documenting the fix as expected behavior
TC-REG-001: GIVEN payment processed WHEN amount > limit THEN reject with PaymentLimitExceededException
```
