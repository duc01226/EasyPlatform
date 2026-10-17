> The `spec` skill (`../SKILL.md`) loads this body for `[mode=tests]`. The host SKILL.md resolves the project profile and routes to the shared semantic/evidence gates. This body carries the mode-specific procedure. For reconciliation, see `sync.md` (`[mode=sync]`).

# Mode: Generate / Update Test Scenarios

## Contents

- [Native Profile Procedure](#native-profile-procedure)
- [Strict Default TC Procedure](#strict-default-tc-procedure)
- [Reference Files (read BEFORE generating TCs)](#reference-files-read-before-generating-tcs)
- [Quick Reference](#quick-reference)
- [Detailed Workflow](#detailed-workflow)
- [TC Decade-Based Numbering](#tc-decade-based-numbering)
- [TC Deprecation Protocol](#tc-deprecation-protocol)
- [Anti-Patterns](#anti-patterns)
- [See Also](#see-also)
- [Integration with Bugfix Flow](#integration-with-bugfix-flow)

## Native Profile Procedure

Apply this branch when the host selected a native profile. Do not execute the strict-default TC procedure below: Section 8, TC IDs, decade ranges, default GWT fields, `CoveredBy`, and default test-category counts are not additional requirements unless the native profile explicitly defines them.

1. **Resolve the canonical owner and carrier.** Read the configured root, section aliases, logical identifiers, owner rule, carrier selectors/field mappings, cardinality, and local workflow references. Follow any explicit local authority/supersession rules before judging declarations to conflict. If a conflict remains, a selected file is outside the declared scope, or a required carrier cannot be read/parsed safely, stop with `UNKNOWN`/`BLOCKED`; do not infer a carrier or fall back to Section 8.
2. **Read the current contract first.** Inspect the owning spec's intent and normative/acceptance sections, then three or more representative native case/test-carrier examples when available; if fewer exist, search related siblings and report the limited sample. Work from accepted requirements and observed local conventions; test inventories and architecture lists are discovery inputs, never an automatic case-count floor.
3. **Preserve canonical identity.** Address each row by its configured owner plus scenario identifier and, where present, variant identifier. Update the configured native case carrier, whether executable, data-driven, declarative, or another profile-defined form. Create another carrier only where the configured/local contract permits it. Preserve declared delivery-slice association as metadata where the owner defines it; do not turn slice numbers into case IDs. Do not create a second markdown test-spec list, TC, shadow file, or derived registry to duplicate it. Keep distinct variants distinct even when one scenario aggregates them.
4. **Write intent and outcomes in the native fields.** Use only the declared input/precondition and expected-result structure. When an executable carrier stores scenario metadata but not expected values, keep the expected result in the existing executor's assertion; a title, rationale, status, or identifier is not an expected result. A manual-QC carrier must name its observable expected outcome and follow the profile's approved evidence procedure. Give every case a concrete expected outcome, and ensure positive and relevant negative/boundary outcomes are covered across the linked requirements/invariants. Preserve the local distinction between intent, normative contract details, and evidence; do not move content across configured roles to imitate the default template. Apply the mandates that govern this artifact tree, authorship model, and operation; M6 remains a review/gate obligation, not case content.
5. **Protect invariants and healthy behavior.** For each applicable hard invariant/property, retain the quantified input domain and a boundary counter-case. In a bugfix, retain tests for healthy behavior at risk. Apply business-visibility where M7 governs; architecture inventory must not manufacture business cases. If the local contract does not classify a required behavior, report it as unresolved rather than deleting or relabeling it.
6. **Trace each row to real proof.** Record the exact carrier span, owning spec, linked requirement/acceptance identifiers, and source evidence. For executable cases, inspect the actual executor/assertion and record the selected runner result when run. For manual-QC cases, use this route only when explicitly allowed by the profile; record the approved procedure, observable outcome, and observed evidence separately. A matching ID, title, source anchor, rationale, or aggregate label alone is not proof. Mark source-mapped rows `mapped/unverified`; claim execution only after observing the selected execution method's result. An aggregate runner result proves only rows whose assertions were inspected and actually run.
7. **Keep missing proof explicit.** Unowned IDs, duplicate owner+scenario+variant identities, unsupported expressions, absent executable tests or approved manual-QC procedures, unexecuted required rows, and ambiguous mappings remain `UNKNOWN`/`BLOCKED` or uncovered under the local vocabulary. Never convert missing scope to N/A or a passing summary. Ask the canonical owner only when required intent or authority is genuinely unresolved.
8. **Report outside the canonical case plane.** Use a run-scoped `tmp/` report for selection counts, source spans, executor/assertion mappings, observed results, and unresolved rows. Do not persist a second tracked index or case registry.

Follow the host workflow and operation-authority gates; this profile branch changes representation only. If no native profile was selected, use the strict-default procedure below unchanged.

## Strict Default TC Procedure

Everything from this point to the end describes the strict default TC/Section 8 representation. It is not a second set of requirements for a native profile.

> **Portability:** the business Feature Spec root — default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path. Resolve it from the config before assuming a location; never edit the literal in prose. It is distinct from the derived technical root (`specRoots.technical.path`, default `docs/specs-technical/`) — §8 TCs are authored in the BUSINESS tree only. A `specRoots` sub-object declared without its `path` is a configuration ERROR, not a silent fallback to the default.

**Goal:** Generate/update business test specs in feature docs Section 8 (canonical business TC registry) — unified `TC-{FEATURE}-{NNN}` format. 5 modes: TDD-first, implement-first, update (post-change/PR), sync, from-integration-tests.

**Workflow:** (1) Mode Detection → (2) Investigation → (3) TC Generation → (4) Write Section 8 → (5) Test-Code Sync → (6) Next Steps

**Key Rules:** Unified `TC-{FEATURE}-{NNN}` format · Section 8 = source of truth · Evidence required on every TC · Minimum 5 categories (positive, negative, authorization, edge cases, invariant/property) · Properties not just examples — every [HARD] rule / §5 invariant gets a universally-quantified property TC · Interactive review via `ask user question tool` mandatory

> **[M5 — Rebuild-from-scratch signal]** A competent team with zero codebase knowledge MUST be able to derive and execute every TC from the spec text alone, on ANY stack — without reading source. If a TC's intent is only understandable by opening the implementation, it fails M5: rewrite the objective/Given-When-Then in business-observable terms. See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for BLOCKING criteria.

> **[BLOCKING] One TC → many tests (business-oriented TCs):** Each §8 TC is a **business / user-story acceptance scenario**, not a code unit. It is covered by **one OR MANY** annotation-tagged tests (integration + unit, across components/services), joined by the test-spec annotation (key `TestSpec`, value `TC-...`) in the configured test framework's syntax. Write TCs at the business-behavior grain — NEVER split, narrow, or technicalize a TC so it maps 1:1 to a single test method or production class (that breaks the business/user-story orientation, M1/M5). Coverage = ≥1 annotation-tagged test. Many tests sharing one TC is correct, never a duplicate. Canonical contract: `.claude/skills/shared/tc-format.md` → TC ↔ Test Code Cardinality.

> **Optional graph hint (when graph.db exists):** Before generating test specs for cross-service features, find event consumers by grep/read; a graph trace can add hints (it may be stale — verify by reading):
>
> ```bash
> python .claude/scripts/code_graph trace {configured-source-path}/{feature-entry-file} --direction both --json
> ```
>
> Use the findings to identify: event consumers, message bus subscribers, background jobs triggered by this feature. These are cross-service TC candidates (category 041–049).

## Reference Files (read BEFORE generating TCs)

> **`.claude/skills/spec/references/spec-tests-template.md`** — TC format template: GWT structure, Evidence field, decade-numbering, Preservation Tests section (mandatory for bugfixes). Read before generating any TC.

Each reference doc below sits in the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path:

- `.claude/skills/spec/references/spec-tests-template.md` — TC template format
- `domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync
- `integration-test-reference.md` — Integration test patterns, fixture setup, seeder conventions, lessons learned (MUST READ before reviewing/writing integration tests)
- The business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) — Existing TCs by module — read BEFORE generating to avoid ID collisions

**Workflow:**

1. **Mode Detection** — TDD-first, implement-first, update, sync, or from-integration-tests
2. **Investigation** — Analyze task/codebase/existing TCs/git changes per mode
3. **TC Generation** — Generate TC outlines, interactive review with user
4. **Write to Feature Doc** — Upsert TCs into Section 8
5. **Test-Code Sync** — Optionally reconcile Section 8 TCs ↔ executing test code (forward-sync; §8 canonical) — see `sync.md`
6. **Next Steps** — Suggest follow-on actions per mode

**Key Rules:**

- **Unified format:** `TC-{FEATURE}-{NNN}` — feature codes in `feature-spec-reference.md`, under the project-reference docs root (default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
- **Source of truth:** Feature docs Section 8 — canonical business TC registry. NEVER write standalone TC files to the business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) as the primary destination; update the governing Feature Spec's Section 8.
- **Evidence required:** Every TC MUST have `Evidence: [Source: {namespace}/{service}/{id}]` (stack-portable abstract anchor — never physical code coordinates or repository-root paths) or `TBD (pre-implementation)` for TDD-first. Canonical format + anchor taxonomy: `shared/tc-format.md`
- **Minimum 5 categories:** Positive (happy path) · Negative (error handling) · **Authorization** (role-based access — MANDATORY) · Edge cases · **Invariant / Property** (MANDATORY — see below)
    - **Invariant / Property TCs (MANDATORY):** For each **[HARD] business rule (§4)** and each **§5 entity invariant**, derive ≥1 **universally-quantified property TC** — phrase the objective/GWT as "for ALL inputs in {domain}, {invariant} holds" — PLUS ≥1 **boundary counter-case** (the input just outside the domain where the invariant must fail-closed). A property TC names the input **domain**, not a single point; this distinguishes it from an example TC (one fixed GIVEN/WHEN/THEN). Walk the 6 invariant classes (idempotency · round-trip/inverse · commutativity · monotonicity · conservation · state-transition) in `.claude/skills/shared/tc-format.md` → "Invariant Categories to Probe" as the discovery prompt. Naming an invariant in the per-TC field is NOT enough — the TC must ASSERT the property across its domain.
    - **Business-visible bugfix specs:** MANDATORY Preservation Tests — see `references/spec-tests-template.md#preservation-tests-mandatory-for-bugfix-specs`
    - **Query-Only exception:** Read-only, no auth boundaries, no events → validation + authorization + edge cases + invariant/property minimum
    - **Config-Only exception:** Flag-toggle features, no entity changes → authorization + edge cases minimum

> **[BLOCKING] Import the Test-Complete Gate.** This mode MUST enforce `.claude/skills/shared/sdd-artifact-contract.md` → **Test-Complete Gate** at the business-visible layer, not just the operation/actor floor below. From that gate: **every user-observable state transition** maps to ≥1 **valid AND ≥1 invalid** transition TC where applicable; **every user-observable external outcome** maps to a demoable TC where applicable; **every test names the business intent or invariant it protects and would fail if that intent breaks**. Architecture-only publish/consume/idempotency obligations belong to the technical spec tree and test code, not to business §8. A spec is NOT test-complete until the business-visible obligations hold — generating only positive/validation/auth example TCs leaves the gate FAILED even when the operation floor passes.
- **Cross-cutting TC categories (when applicable):**
    - **Invariant / Property TCs (MANDATORY):** Per [HARD] §4 rule + §5 invariant — universally-quantified property ("for ALL inputs in {domain}, {invariant} holds") + boundary counter-case; covers business-visible state-transition validity per the imported Test-Complete Gate
    - **Authorization TCs (MANDATORY):** Authorized succeeds, unauthorized rejected, role visibility verified
    - **Seed Data TCs:** Reference data exists, seeder runs correctly
    - **Performance TCs:** Feature within SLA under production-like volume
    - **Data Change TCs:** business data state transforms correctly and remains visible/usable as expected
    - **Preservation TCs (MANDATORY business-visible bugfixes):** ≥1 per "Healthy input" row — authored from OLD code semantics BEFORE fix lands. Technical-only bugfixes with no business-visible result produce zero business TCs.
- **Interactive review:** ALWAYS `ask user question tool` — review TC list with user before writing. Inside a workflow whose sequence runs both an independent `$work-item --mode=review --type=spec-tests` and `$spec [mode=clarify]` after this step, that review replaces this question and the material decisions the cases encode go to that later clarify through the decision log; otherwise, inside a workflow, keep this question narrowed to the material decisions the cases encode; a standalone run keeps the full TC-list review
- **Real-world fidelity (per TC):** every TC's `Preconditions` and `Demo Flow` MUST describe a situation real actor behaviour can actually produce. State HOW production reaches the precondition, and — whenever two consecutive steps are distinct actor actions — state the realistic elapsed gap between them. A TC specifying a sequence production could never reach GUARANTEES an unrealistic test downstream: the spec is the upstream lever, so fix it here, never in the generated test's assertions.

<!-- SYNC:real-world-fidelity-testing -->

> **Real-World Fidelity Gate** — MANDATORY when authoring, reviewing, or repairing any integration / E2E / system test.
>
> A test earns trust by reproducing a situation the system can actually meet in production. A scenario that could never occur in real life proves nothing when it passes, and wastes hours when it fails.
>
> 1. **Ask the fidelity question BEFORE writing the setup:** *"Can this sequence, timing, and data actually occur in production?"* If no, the test is mis-specified — fix the SCENARIO, never the assertion.
> 2. **Model only real actor pacing.** Preserve delays present in the real journey; add presentation pacing only when the project contract configures it. Never add a fixed delay to make readiness or settling appear reliable.
> 2a. **Use the runner's synchronization idiom.** Before an action, use the browser/device runner's native wait or an evidenced project helper for applicable readiness and actionability. Bound custom waits and include useful diagnostics; do not require a helper API or object model the project does not use.
> 2b. **Observe → act → observe.** After an action, wait for the expected positive or negative postcondition before the next dependent action, using observable state and the configured runner. Keep the final business assertion in the test. A timeout is a test failure with diagnostics, not permission to weaken the assertion.
> 3. **Wait on a real signal, never a blind sleep.** Find an observable proving the prior step finished — a persisted state change, an audit/version stamp, a queue/worker idle marker, a completion event — and poll until it settles (unchanged across a short stability window). Use a fixed delay ONLY when no observable exists, and say so in a comment. A browser action delay MUST never replace a readiness/actionability wait.
> 4. **Barriers belong in ARRANGE, never in ASSERT.** Waiting for a precondition is fidelity. Widening an assertion's timeout, loosening a comparison, adding a retry around a failing assertion, or skipping the test is masking. NEVER do the latter to force green.
> 5. **Distinguish harness-amplified from real.** Test topologies (shared infra, fan-out consumers, parallel suites, cold starts) can make a rare production race routine locally. Before filing a product defect, state whether the trigger exists in production and at what likelihood.
> 6. **Keep the protected invariant intact.** Improving fidelity must NEVER reduce what the test protects. If a realistic scenario no longer exercises the rule, the rule needs a DIFFERENT realistic scenario — not a weaker assertion.
> 7. **Deliberate impossible-state tests are allowed, but MUST be labelled.** Corruption-repair, migration, and fail-safe tests intentionally construct states production should never reach; comment WHY the state is reachable (upstream bug, partial write, legacy data), so they are never confused with unrealistic setups.
> 8. **Visible browser evidence is part of fidelity.** When the project contract calls for human-QC on a web surface, use its configured visible browser runner or control path when supported; attach runtime/network listeners before interaction and capture/read the configured screenshots, traces, or video. Follow the runner's native waits or an evidenced bounded project helper, and redact sensitive evidence. An unread artifact is not an observation.

<!-- /SYNC:real-world-fidelity-testing -->

---

## Quick Reference

### Related Skills

| Skill                       | Relationship                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `spec [mode=sync]`          | **Native sync mode** — forward-syncs Section 8 TCs ↔ executing test code (see `sync.md`) |
| `integration-test`          | Code generator → generates integration tests FROM TCs written by this mode          |
| `$spec`                     | Feature doc creator → creates the Section 8 that this mode populates                 |
| `$spec [mode=index]`               | **Derived index** — regenerable navigation catalog/ERD assembled FROM the Feature Specs (never a source of truth). After §8 changes, refresh the bucket `INDEX.md` TC counts via $spec [mode=index] |

### Output Locations

| Artifact                     | Path                                                                     |
| ---------------------------- | ------------------------------------------------------------------------ |
| TCs (canonical)              | `docs/specs/{App}/README.{Feature}.md` Section 8 — the root is a default; a `specRoots.business.path` entry in `docs/project-config.json` overrides it |
| Integration test code        | `{IntegrationTests}/` — §8 TCs forward-synced here via `[mode=sync]` |
| Spec index (derived)         | `docs/specs/{App}/INDEX.md` — regenerable TC-count catalog (via $spec [mode=index]); the root is a default, overridden by `specRoots.business.path` in `docs/project-config.json` |

> **Phase-Mapped Coverage:** When a plan exists with multiple phases, generate test cases
> PER PHASE — not just per feature. Each phase's success criteria must have ≥1 test case.

### Frontend/UI Context (if applicable)

> When this task involves frontend or UI changes,

Each file below sits in the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path:

- Component patterns: `frontend-patterns-reference.md`
- Styling reference: `configured styling reference`
- Design system tokens: `design-system/README.md`

---

## Detailed Workflow

### Phase 1: Mode Detection & Context

Detect mode from prompt and context:

| Mode                       | Signal                                            | Action                                                            |
| -------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| **TDD-first**              | Task/story exists, code not yet written            | Generate specs from requirements                                  |
| **Implement-first**        | Code already exists, no/incomplete TCs            | Generate specs from codebase analysis                             |
| **Update**                 | Existing TCs + code changes / bugfix / PR         | Diff existing TCs against current code/PR, find gaps, update both |
| **Sync**                   | User says "sync test specs" or bidirectional need | Reconcile feature docs ↔ the business spec root (default `docs/specs/`, overridden by `specRoots.business.path` in `docs/project-config.json`), either direction — see `sync.md` |
| **From-integration-tests** | Tests exist with test spec annotations, no docs   | Extract TC metadata from test code → write to feature docs        |

### Mode Confirmation (ask user question tool)

**[REQUIRED]** Confirm mode before Phase 2 when signals ambiguous:

- Both "update" and "sync" present → which takes priority?
- No mode keyword → TDD-first (new feature) or implement-first (code exists)?
- "from integration tests" → high effort, confirm scope

> "Detected mode: **{detected_mode}** for feature: **{feature_name}**. TCs to write: ~{estimated_count}. Correct?"
>
> Options: [Yes, proceed] [Change mode] [Change scope]

Skip confirmation only when mode explicit in `$ARGUMENTS` AND feature name unambiguous.

**Must read FIRST:**

Reference docs below sit in the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path.

1. `feature-spec-reference.md` — correct `{FEATURE}` code for TC IDs
2. Target feature doc — Section 8 exists? Read existing TCs to avoid ID collisions
3. `.claude/skills/shared/sdd-artifact-contract.md` — "Test-Complete Gate" (TC coverage mapping: minimum categories — positive / negative / unauthorized-access / state-transition / event — and depth). `spec-principles.md` adds only repo-local test-mapping conventions (§5).

**Spec Readiness Gate (BLOCKING — implement-first and update modes only):**

Read target feature doc Sections 3, 4, 5, 7. Check:

- Every BR-XX in Section 4 has `[Source: {namespace}/{service}/{id}]` abstract-anchor citation — flag missing
- Every US-/AC- in Section 3 references ≥1 `BR-XX` — flag unreferenced user stories
- Section 7 has permission matrix (≥1 role × action row) — flag if absent
- Section 3 has US-/AC- entries with explicit outcomes — flag if empty/vague

If 2+ fail → `ask user question tool`: "Spec readiness below TC generation threshold. Fill gaps first OR proceed with shallow TCs (`Status: Planned`)?" NEVER silently generate shallow TCs.

**If target feature doc missing:** suggest `$spec` first, OR create minimal Section 8 stub.

### Phase 2: Investigation

**TDD-first mode:**

1. Read task/story from `tasks/` under the team-artifacts root (default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path) or user-provided
2. Extract acceptance criteria
3. Identify TC categories: CRUD, validation, **authorization** (mandatory), workflows, edge cases, seed data, performance, data migration
4. Cross-reference existing feature doc requirements (Sections 1-7)
5. Task Authorization section → generate authorization TCs (unauthorized rejection per role)
6. Task Seed Data section → generate seed data TCs if reference/config data needed
7. Task Data Migration section → generate migration TCs if schema changes exist

**Implement-first mode:**

**[BLOCKING]:** Enumerate ALL operations first — establishes **what the feature does**, so no capability is missed. ⚠️ **It does NOT establish the TC floor.** The floor is `business_floor` (see `author.md` — *"The business TC floor"*), which reads only spec sections.

**Operation discovery (implement-first) — informs WHAT to write about, never HOW MANY:**

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

Use the discovered operations to check that **no business capability was missed** when authoring §3 journeys — then set the count from `business_floor`.

⚠️ **[HARD] The operation count is NOT the TC floor.** `business_floor` is (`author.md` — *"The business TC floor"*). An operation that produces **no user-observable behavior and no business data-state change** gets **no business TC** — it is covered by the technical spec tree. Consumers, event handlers, sync processors and background jobs are architecture; a business TC exists only where a user or QC can **demo** the outcome.

If `business_floor` > 20: split into operation-group batches (≤20 ops each per todo tracking). NEVER generate all TCs in one pass for large features.

**Actor Catalog Discovery — §2-AUTHORING ONLY (never a TC-count input):**

⚠️ **[HARD] These greps discover candidate roles to write into §2 as business nouns. Once §2 exists, §2 is the ONLY source.** `count(§2 actors)` MUST read §2's actor list — never a permission-guard grep. A permission attribute is an *implementation* of a role; sourcing the count from it lets an authorization refactor move a "business" floor with zero business change.

```bash
# Permission attributes and role guards
rg "{project authorization/permission guard patterns}" {target-source-path} -g "{source-file-glob}" -n | head -30
# Role/permission enums
rg "{project actor/role/permission definition patterns}" {target-source-path} -g "{source-file-glob}" -n | head -20
```

Build actor catalog into **§2**: `[Role1, Role2,...]`. Authorization TC minimum = **`count(§2 actors) × 2`** (authorized succeeds + unauthorized rejected) — **read from §2, not from the grep above**. Every §2 actor MUST appear in ≥1 authorization TC.

1. Grep commands/queries using project patterns from `docs/project-config.json` and the referenced architecture/test docs.
2. Grep entities and domain events
3. **Trace the full vertical chain, not just the backend slice:** UI view + action → API/route → command/query handler → entity + business rule → persistence → event → consumer/read model → UI observable outcome. Reuse the Full-Chain Trace Map authored by `spec [mode=init]` (`tmp/analysis/{Module}-chain-map.md`, Step 1-INIT.4.6) when it exists; otherwise build the chain with `graph-code --mode=connect-api` (frontend→backend links) + `graph-code --mode=trace` (backend→entity→event). A TC that asserts only a handler in isolation misses the seam behavior the chain reveals.
4. Identify testable behaviors from implementation — at least one **end-to-end chain TC** (decade 061–069, UI/User-journey) per `COMPLETE` chain that spans intent → outcome across the full slice, in addition to the per-operation TCs

**Update mode (post-change / post-bugfix / post-PR):**

**[BLOCKING] FIRST — the business-visibility gate. Answer before writing ANY TC:**

> **Did this change alter what a user or QC can observe, demo, or rely on?**
>
> - **NO → the correct output is ZERO new business TCs.** Say so explicitly and stop. A no-op is the **expected, correct** result for a technical fix — it is **never** a coverage failure and MUST NOT be recorded as a gap.
> - **YES → author TC(s) for the observable business behavior**, in demo form (actor → flow → observable expectation).
>
> **TECHNICAL-ONLY (→ zero business TCs; route to the technical spec tree):** a consumer/event-handler/sync-processor not firing; a read-model or projection lag; a serialization, mapping, or round-trip persistence defect; a null-reference/exception; a query/index performance fix; a race or idempotency defect; a DI/config/migration error; a retry/timeout; a UI rendering, CSS, layout, or overflow defect; a data-load or pagination mechanic — **where the business rule, the user-visible outcome, and the business data state are all unchanged**.
>
> ⚠️ **The test is NOT "can I phrase this without technical words?"** Any technical case can be laundered into tech-free prose — *"the system correctly synchronizes the record"* is a technical TC in a business costume, and it is exactly the failure this gate exists to stop. **The test is: can a QC engineer DEMO this as a business outcome, and would a stakeholder recognize the value?** If the only way to observe it is to inspect a queue, a projection, a log, or a database row that no user-facing behavior depends on — **it is TECHNICAL-ONLY.**
>
> **The honest question is "what business behavior broke?", not "what code changed?"** Most bugfixes change code without changing business behavior. When the pre-fix and post-fix **business** behavior are identical — the feature was always *supposed* to work this way and now does — **there is no new business rule to specify, and no business TC to add.** The regression belongs in an integration test, which is where regression protection lives.

> ### The constructive form of the gate — write the TC as a DEMO SCRIPT
>
> The gate above says what a business TC must **not** be. This says what it must **be** — and it is the stronger
> target, because *"is it demoable?"* is answerable by **writing the demo** and far more checkable than *"is it
> technical?"*.
>
> **A §8 business TC and a `$demo-guide` case describe THE SAME EVENT** — one case, two audiences: the spec states
> it as intent, the demo guide stages it for an audience. **They MUST be able to converge**, and that is a
> **usable authoring test**: *if `$demo-guide` could not turn this TC into a live demo someone would sit through,
> it is not a business TC.* ⚠️ Conversely, a TC that reads as a demo script **cannot** be a laundered technical
> case — a presenter has nothing to show for *"the consumer receives the event"*.
>
> Author every TC in the template's demo shape (`spec-tests-template.md`): **actor → demo flow → expected result**,
> filling every applicable dimension — **UI**, **system behavior**, **business data state** (in business language,
> never storage language), and **data shown on the UI**. Omit a dimension only **with a reason, never silently**.
> **`$demo-guide` reads §8 as its canonical source of user stories and TC IDs** — so a §8 TC that is not
> demo-shaped surfaces later as a case the demo guide cannot stage.

**[BLOCKING] THEN:** run the operation discovery below **only to locate the changed capability** — never to count TCs. Check existing TC count in Section 8 against `business_floor`.

```bash
# Write-side
rg "{project write-handler patterns}" {target-source-path} -g "{source-file-glob}" -l
rg "{project mutating-endpoint patterns}" {target-source-path} -g "{source-file-glob}" -l
rg "{project event-or-background-job patterns}" {target-source-path} -g "{source-file-glob}" -l
# Read-side
rg "{project read-handler patterns}" {target-source-path} -g "{source-file-glob}" -l
rg "{project read-endpoint patterns}" {target-source-path} -g "{source-file-glob}" -l
```

- **The floor is `business_floor`** (`author.md` — *"The business TC floor"*). **NEVER derive a floor from the operation count.** An operation-derived floor is architecture-derived: it mints a business TC for every consumer, event handler, and background job, and it moves when the code is re-architected though no business behavior changed.
- Existing TC count < `business_floor` → a **business** coverage gap (a user story, `[HARD]` rule, invariant, transition, actor, or observable state with no TC). Flag: `"Pre-existing gap: {existing}/{business_floor} TCs"` and fill it with **business** TCs.
- ⚠️ **A spec is NOT under-covered because it has fewer TCs than the module has handlers.** That comparison is the defect: it reads an architecture count as a business obligation and backfills technical TCs into a business spec on every bugfix. **If `business_floor` is met, there is no gap — regardless of the operation count.**
- **Scope discipline:** update-triggered TCs cover the observable business change. Backfill **only** genuine `business_floor` gaps — never architecture-derived ones.

1. Read existing Section 8 TCs
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
> | Spec was wrong (code implements correct behavior that spec misdescribed) | Spec described behavior that never worked correctly; the "fix" is actually a clarification | **STOP** — do NOT update TCs yet. First: run `$spec [update]` on the affected sections (Section 3, 4, 5 — business rules, user journeys, API contracts) to correct the canonical Feature Spec. THEN return here to update §8 TCs. |
> | Behavior is a new requirement (neither spec nor code was wrong before)   | Feature change approved; both spec and TCs need updating                                   | Update feature doc Section 3/4 first (new behavior description), then update TCs here.                                                                                                                                                                             |
> | Uncertain                                                                | Cannot determine without stakeholder input                                                 | Escalate: document the ambiguity in this session's summary. Write TCs in both `GIVEN old behavior` and `GIVEN new behavior` variants with `[PENDING REVIEW]` tag.                                                                                                  |
>
> **Checkpoint:** Answer this question before proceeding: "Is the code change intentional and approved?" If yes, update TCs. If no (regression), the code needs fixing — do not update TCs to document broken behavior.

6. Update feature docs Section 8 (canonical), then forward-sync to executing test code via `[mode=sync]`

#### Step UPDATE-FINAL: TC Blast Radius Analysis (UPDATE mode only)

> **[RECOMMENDED]** After updating TCs for the target feature, scan for other features whose TCs
> may be invalidated by the same code change.

**Run these greps against the business spec root** (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path):

```bash
SPEC_ROOT=docs/specs # default only — read specRoots.business.path from docs/project-config.json first

# 1. Find API endpoint references in other feature docs
grep -rl "{endpoint}" "$SPEC_ROOT" | grep -v "{current-module}"
# Replace {endpoint} with the main API path changed (e.g., /api/orders, /api/customers)

# 2. Find entity references in other feature docs
grep -rl "{entity-name}" "$SPEC_ROOT" | grep -v "{current-module}"
# Replace {entity-name} with key domain entities changed (e.g., Order, Customer)

# 3. Find event references in other feature docs
grep -rl "{event-name}" "$SPEC_ROOT" | grep -v "{current-module}"
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

**Sync mode (§8 TCs ↔ test code):** read `sync.md` for the full reconciliation procedure. Phase5 below retains the forward-sync summary and default one-to-many safeguards. Section8 is canonical; resolve missing test coverage through the owning test route, and adjudicate test-only business IDs with M7 before back-filling (technical-only tests use `TechnicalSpec`). The comparison shape is:

```
| TC ID | In §8 (Feature Doc)? | In Test Code? | Action Needed |
|-------|----------------------|---------------|---------------|
| TC-FEAT-001 | ✅ | ✅ | None |
| TC-FEAT-025 | ✅ | ❌ | Generate test via $integration-test |
| TC-FEAT-030 | ❌ | ✅ | Back-fill §8 TC (from-integration-tests mode) |
```

**From-integration-tests mode (reverse-engineer specs from existing tests):**

1. Grep for the test-spec annotation (key `TestSpec`) in the target test project
2. Per test method: extract TC ID, method name, test description from comments
3. Read test method body → generate GWT steps and evidence
4. Write extracted TCs to feature doc Section 8 (if not already there)
5. Useful when: tests written before spec system existed, or imported from another project

### TC Completeness Gate (BLOCKING — runs before Phase 3)

**[BLOCKING]** Do NOT start Phase 3 until all rows in this table show PASS:

| Gate                | Check                                                         | Required                                       | Actual | Status    |
| ------------------- | ------------------------------------------------------------- | ---------------------------------------------- | ------ | --------- |
| Story coverage      | TC count for §3 user stories                                  | ≥ count(§3 US × AC)                            | {n}    | PASS/FAIL |
| Permission coverage | TC count for authorization                                    | ≥ count(§2 actors) × 2                         | {n}    | PASS/FAIL |
| State coverage      | TC count for observable §6 states                             | ≥ count(observable §6 states)                  | {n}    | PASS/FAIL |
| Invariant coverage  | **Property TC** count guarding §4 [HARD] rules + §5 invariants | ≥ count([HARD] BR) + count(§5 entity invariants) | {n}    | PASS/FAIL |
| Transition coverage | Valid + invalid transition TCs for each §5 lifecycle state     | ≥ 2 per stateful entity (≥1 valid, ≥1 invalid) | {n}    | PASS/FAIL |
| Chain coverage      | End-to-end chain TC (decade 061–069) per `COMPLETE` user-facing chain (Full-Chain Trace Map) | ≥ 1 per COMPLETE UI-bearing chain | {n} | PASS/FAIL |
| Scenario fidelity   | TCs whose Preconditions + step pacing production can actually reach | ALL planned TCs (0 unreachable; a deliberate impossible-state TC counts only when labelled) | {n} | PASS/FAIL |
| Total floor         | Total planned TCs                                             | ≥ `business_floor`                             | {n}    | PASS/FAIL |

> ⚠️ **This table has NO Write-op / Read-op / Event-job rows, deliberately.** Those made the business TC count a function of the architecture — an Event/job row mints a business TC for every consumer and background job, which is how sync/consumer/event-handler cases entered a tech-free business spec. **The obligation is not abolished: it is owned by the technical spec tree**, where counting handlers is correct. Every row above reads a **spec section**, so re-architecting cannot move any number in this table.
>
> **Count properties, not operations.** The Invariant-coverage row counts TCs that ASSERT a universally-quantified property (per the imported Test-Complete Gate), NOT TCs that merely name an invariant in the per-TC field. A §4 [HARD] rule or §5 invariant with zero property TC = FAIL even when every story/actor row passes. The Transition-coverage row operationalizes `sdd-artifact-contract.md` → Test-Complete Gate ("every state transition maps to ≥1 valid AND ≥1 invalid transition TC"); retain business-visible idempotency cases when they guard canonical intent. Purely architectural event/job idempotency coverage belongs to the technical spec tree and test owner, not an additional business TC-count row.

**FAIL action:** todo tracking for each FAIL row — list specific missing TC categories (and, for Invariant/Transition rows, the exact §4 rule / §5 invariant / lifecycle state left uncovered). NEVER proceed to Phase 3 until all gates PASS.

**Operation group decomposition:** If `business_floor` > 20, split TC generation into batches of ≤20 related operations:

```
Todo tracking: "Generate CRUD TCs for {feature} — ops {1-N}: {CommandA}, {CommandB}, {CommandC}"
Todo tracking: "Generate Read TCs for {feature} — ops {1-M}: {QueryA}, {QueryB}"
Todo tracking: "Generate Event TCs for {feature} — ops {1-K}: {EventConsumerA}, {BackgroundJobA}"
Todo tracking: "Generate Permission TCs for {feature} — actors: {Role1}, {Role2}"
Todo tracking: "Generate Edge Case TCs for {feature} — boundary conditions from §4 [HARD] rules + §5 invariants"
Todo tracking: "Generate Invariant/Property TCs for {feature} — per [HARD] §4 rule + §5 invariant: universally-quantified property + boundary counter-case (probe idempotency/round-trip/commutativity/monotonicity/conservation/state-transition)"
```

Each batch task completes before starting the next. Final ask user question tool review covers all batches together.

### Phase 3: TC Generation with Interactive Review

1. Generate TC outlines as a summary table:

```
| TC ID | Name | Priority | Category | Status |
|-------|------|----------|----------|--------|
| TC-ORD-037 | Create order with multiple line items | P0 | CRUD | New |
| TC-ORD-038 | Reject order without required fields | P1 | Validation | New |
| TC-ORD-039 | Unauthenticated user cannot access orders | P0 | Permission | New |
```

2. Use `ask user question tool` to review with user:

```
Question: "These {N} test cases cover {feature}. Review the list:
[Coverage context (diagnostic only — NOT a gate, and NOT a floor): business_floor = {business_floor} from {us_ac} US×AC + {hard_rule_count} [HARD] rules + {invariant_count} §5 invariants + {transition_count} transitions×2 + {actor_count} §2 actors×2 + {state_count} observable §6 states. {N} TCs planned. Operation discovery found {total_ops} operations — shown ONLY to check no capability was missed; it is NOT a target and a lower TC count is NOT a gap.]"
Options:
- "Approve as-is (Recommended)" — Proceed to writing
- "Add missing scenario" — Describe what's missing
- "Adjust priorities" — Change P0/P1/P2 assignments
- "Regenerate" — Re-analyze and try again
```

**Coverage context calculation:** `coverage_pct = (N / total_ops) × 100`. Treat this as a **diagnostic, not a quality gate** — do NOT gate approval on hitting any line-/operation-coverage percentage. **Low coverage is a useful negative signal:** a low `coverage_pct` flags an under-probed area worth investigating (`ℹ️ {coverage_pct}% operation coverage — likely untested operations; list which ops have zero TCs`). **High coverage is NOT a quality signal:** a high `coverage_pct` can still leave every [HARD] rule / §5 invariant unguarded, so it never implies the spec is test-complete. The real gates are the **Invariant-coverage and Transition-coverage rows** above (does each property hold across its domain?), not the operation-coverage percentage.

3. Iterate until user approves.

### Phase 4: Write to Feature Doc Section 8

**Canonical write — feature docs own TCs. NEVER overwrite existing TCs.**

1. Locate Section 8 in target feature doc
2. Section 8 exists: append new TCs after existing, preserve existing TC IDs
3. Section 8 absent: create from template
4. Use `Edit` tool to upsert

**TC format** — **ILLUSTRATIVE ONLY. The canonical definition is `.claude/skills/shared/tc-format.md` → TC Entry Format.**

> **[HARD] This block does NOT define the format; it only shows it.** If this excerpt and `tc-format.md` ever
> disagree, **`tc-format.md` wins and this excerpt is the bug.** Never author a TC from this copy without checking
> the canonical file. The canonical owner resolves any excerpt drift.

```markdown
#### TC-{FEATURE}-{NNN}: {Descriptive Test Name} [{Priority}]

**Objective:** {What this test verifies}

**Business Intent / Invariant Guarded:** {Business rule or invariant this TC protects; the TC must fail if this rule breaks}

**Preconditions:**

- {State a user or QC could arrange — never storage setup}

**Real-World Reachability:** {how production actually reaches those Preconditions — which actor performs which prior action, in what order, and the realistic elapsed gap between consecutive actor actions}

**Demo Flow:**
\`\`\`gherkin
Given {state a user could arrange}
And {additional context}
When {an action a user could take}
Then {an outcome a user could SEE}
And {additional visible verification}
\`\`\`

**Expected Result:**

| Dimension | What to state |
| --- | --- |
| **UI** | What the user sees on screen |
| **System behavior** | What the system does, in business terms |
| **Business data state** | What is now true about the business — business language, never storage language |
| **Data shown on UI** | What the user reads back, and where |

**Acceptance Criteria:**

- ✅ {Success behavior}
- ❌ {Failure behavior}

**Test Data:**
\`\`\`json
{ "field": "value" }
\`\`\`

> For a TC guarding a [HARD] §4 rule or §5 invariant, use the **Property TC** variant instead of a single example — the structured `inputDomain` / `invariant` / `boundaryCounterCase` generator-spec block (canonical: `.claude/skills/shared/tc-format.md` → TC Entry Format → "Property TC"). The property's universality must be machine-readable in those three fields, not buried in prose.

**Edge Cases:**

- {Boundary condition}

**Evidence:** `[Source: {namespace}/{service}/{id}]` or `TBD (pre-implementation)`
```

> **[M1-M2 Compliance — authoring the TC body]** The `Objective`, `Business Intent / Invariant Guarded`, and the `Given/When/Then` steps MUST name business operations and observable states only — what an actor does and what the system visibly does in response. NEVER use class/method/file names, transport/handler names, or language-native types in these fields. Those source identifiers belong ONLY in the `**Evidence**` and `CoveredBy` carriers. Quick check: replace the implementation with a different stack — does the GWT still read correctly? If not, it leaks tech (M1/M2 fail). See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for BLOCKING criteria.

> **[M7 — Business-visibility — judge the TC BODY]** Apply the demo test to the case BODY: *"what would a stakeholder SEE change?"* — no answer → FAIL as TECHNICAL-ONLY, and the case does NOT belong in §8. A `When` that is an invocation (a handler runs, a consumer receives, a job fires, data syncs) or a `Then` asserting schema/type/nullability/call-count FAILS. Judge the BODY, never the title or ID — a business-sounding title routinely fronts an invocation-shaped `When`.
>
> **M1 governs vocabulary; M7 governs subject matter.** A technical case in impeccably tech-free prose satisfies M1 while violating M7 — *"the system correctly synchronizes the record"* names no technology, passes the M1-M2 check above, and is still a technical TC wearing a business costume. The M1-M2 stack-swap check CANNOT catch this; only the demo test can. See `.claude/skills/shared/sdd-artifact-contract.md` → "Business-Visibility Gate" for the full BLOCKING criteria, the detection recipe, and the no-op rule (a change with no business-behavior delta correctly yields ZERO new TCs).
>
> ⚠️ **Business-visible ≠ UI-demoable — do NOT conflate the two gates.** A genuinely business-visible outcome a stakeholder would recognize, but observable only through a **non-UI surface** (API response, CLI output, or the business state a job produces — observed by an actor, NEVER the job firing itself, which M7's invocation-`When` rule above still FAILS), **PASSES M7 and belongs in §8**. `$demo-guide` files such a case in its closing `Appendix — Technical demo (non-UI)`; that placement is a **demo-channel** decision, NEVER an M7 verdict, and its "technical" label does NOT mean TECHNICAL-ONLY here. Only a case with **no observable business outcome at all** is the M7 violation. Counterpart of `.claude/skills/demo-guide/SKILL.md:292` (§ *Integration with Other Skills* → `$spec`). — why: the two skills are wired together by name (`$demo-guide` reads §8 as its canonical source, below) and share the word "technical" for opposite verdicts; a spec author who reads demo-guide's appendix label as an M7 finding deletes valid business TCs.

> **[BLOCKING] Real-world fidelity — judge the SCENARIO the TC specifies.** Per the Real-World Fidelity Gate above, a TC is the upstream lever on test realism: a spec describing an impossible situation guarantees an unrealistic test, and that test proves nothing when it passes. Before writing any TC body, answer: *"Can this sequence, timing, and data actually occur in production?"*
>
> 1. **`Real-World Reachability` is REQUIRED on every TC** — name the prior actor action(s) that produce the `Preconditions`. "The data is simply there" is not reachability; if no actor path produces that state, the TC is mis-specified — re-scope it, never soften the `Then`.
> 2. **State the gap whenever consecutive steps are distinct actor actions.** A TC whose `When`/`And` steps imply two different actor actions with NO realistic gap MUST declare the gap explicitly (*"the reviewer responds minutes after the applicant submits"*) or be re-scoped into separate TCs. Silence here becomes a back-to-back call in the generated test, manufacturing a race production never has.
> 3. **A deliberately unreachable state MUST be labelled** with WHY it is reachable (upstream defect, partial write, legacy data) — see the template's `Deliberate Impossible State` field. Unlabelled, it is indistinguishable from a mis-specified TC.
> 4. **Fidelity NEVER costs coverage.** If a realistic scenario stops exercising the [HARD] rule or §5 invariant the TC guards, author a DIFFERENT realistic scenario — never a weaker `Then`.
>
> Full field definitions: `references/spec-tests-template.md` → Individual TC Entry.

**Evidence rules by mode:**

- **TDD-first:** `Evidence: TBD (pre-implementation)` — will be updated after implementation
- **Implement-first:** trace to the real code, then record the stack-portable abstract anchor `Evidence: [Source: {namespace}/{service}/{id}]` (derive namespace/service/id per `shared/tc-format.md`; the physical `file:line` goes to the provenance sidecar, NEVER into the doc)
- **Update:** re-resolve the anchor ONLY if the logical artifact was renamed/split; a file move or stack change does NOT change the anchor — that stability is the point

> **[M3 Traceability — logical-IDs-first]** Every TC MUST map to at least one logical business-rule/operation ID (`BR-`/`OP-` from feature doc Section 6/8) as its primary trace spine — record this mapping in the TC body (e.g. a `Traces: BR-XX, OP-XX` line) SEPARATE from the evidence anchor. The `[Source: {namespace}/{service}/{id}]` in the `**Evidence**` field is the SECONDARY, stack-portable carrier — it names WHICH logical artifact implements/verifies the behavior, never WHAT the TC guards. KEEP the abstract anchor; never drop it and never replace it with `file:line` (physical coordinates live only in the provenance sidecar). A TC with `[Source: ...]` but no logical-ID mapping fails M3. See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for BLOCKING criteria.

### Phase 5: Sync Section 8 TCs ↔ Integration Test Code (Optional)

The full reconciliation procedure (direction detection, quality gate, forward/reverse algorithms, orphan detection, staleness tracking) lives in `sync.md` (`[mode=sync]`). At a glance, the forward shape (§8 is canonical; test code implements it):

1. Map each §8 TC to its covering test method(s) via the test-spec annotation (key `TestSpec`, value `TC-…`) — **one TC may be covered by many tests** (integration + unit, across components/services); the annotation is the join key, and finding ≥1 covering test means the TC is covered (see `tc-format.md` → TC ↔ Test Code Cardinality)
2. TDD-first: map to expected test method names (to be created by `$integration-test`)
3. Flag §8 TCs with **zero** covering tests as coverage gaps for `$integration-test` (NEVER flag many-tests-per-TC as a problem — that is the expected one-to-many shape; NEVER split a business TC to achieve a 1:1 map to test methods)

> **[M2/M3 — keep §8 stack-portable]** Each TC's `Evidence` **abstract anchor** (`[Source: {namespace}/{service}/{id}]`) stays verbatim — NEVER expand it to physical code coordinates or repository-root paths. The only physical reference a TC may carry is the operational `CoveredBy` field — one or more `{TestFile}::{MethodName}` link(s), a test-filter expression, or manual-QC coverage, since a business TC maps to many tests. Legacy `IntegrationTest:` is accepted only as migration input.

**Skip** if user says "skip sync" or no integration test project exists for the module. For the full algorithm, switch to `[mode=sync]` (`sync.md`).

### Phase 6: Next Step Suggestion

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`$start-workflow` → Step Execution Protocol, Workflow-step mode).

Based on mode, suggest via `ask user question tool`:

**TDD-first:**

```
1. "$work-item --mode=review --type=spec-tests — Validate TC quality before generating tests (Recommended)"
2. "$integration-test — Generate test stubs from these TCs (skip review)"
3. "$plan — Plan the feature implementation"
4. "Done for now — I'll implement later"
```

**Implement-first:**

```
1. "$work-item --mode=review --type=spec-tests — Validate TC quality before generating tests (Recommended)"
2. "$integration-test — Generate integration tests (skip review)"
3. "$workflow-review-changes — Review all changes"
4. "Done for now"
```

**Update (post-change/PR):**

```
1. "$work-item --mode=review --type=spec-tests — Validate updated TCs before regenerating tests (Recommended)"
2. "$integration-test — Generate/update tests for changed TCs (skip review)"
3. "$test — Run existing tests to verify coverage"
4. "spec [mode=sync] — Sync §8 TCs ↔ executing test code"
5. "Done for now"
```

**Sync:**

```
1. "spec [mode=sync] — Sync §8 TCs ↔ executing test code after reconciliation (Recommended)"
2. "$integration-test — Generate tests for any TCs missing test coverage"
3. "Done for now"
```

**From-integration-tests:**

```
1. "spec [mode=sync] — Sync §8 TCs ↔ executing test code for newly documented TCs (Recommended)"
2. "$test — Run tests to verify all documented TCs pass"
3. "Done for now"
```

---

## TC Decade-Based Numbering

**[BLOCKING] Before assigning any TC ID:** Read all existing TC IDs in the feature doc's Section 8. Find the next available decade slot.

| NNN Range | Category                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 001–009   | CRUD / Core operations (P0-P1)                                                                                                       |
| 011–019   | Validation / Business rules (P1-P2)                                                                                                  |
| 021–029   | Authorization / Permissions (P0-P1)                                                                                                  |
| 031–039   | Business workflows / lifecycle outcomes (P1-P2)                                                                                       |
| 041–049   | External business-facing outcomes (P1-P2) — write only the demoable user/QC-visible outcome; architecture-only flows belong to the technical tree |
| 051–059   | Edge cases / Error scenarios (P2-P3)                                                                                                 |
| 061–069   | UI / User journey flows (P2-P3)                                                                                                      |
| 071–079   | Invariant / Property TCs (P0-P2) — universally-quantified properties + boundary counter-cases per [HARD] §4 rule / §5 invariant      |
| 081–099   | Reserved for feature-specific groups                                                                                                 |

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

- ❌ Writing TCs to the business spec root (default `docs/specs/`, overridden by `specRoots.business.path` in `docs/project-config.json`) as the primary destination (use feature docs Section 8)
- ❌ Using `TC-{SVC}-{NNN}` or `TC-{SVC}-{FEATURE}-{NNN}` format (use unified `TC-{FEATURE}-{NNN}`)
- ❌ Generating TCs without reading existing Section 8 (causes ID collisions)
- ❌ Skipping the interactive review step (the user approves the TC list, unless a later spec-tests review and clarify step in the same workflow take it over)
- ❌ Writing TCs without Evidence field (every TC needs it, even if `TBD`)
- ❌ Specifying a scenario production could never reach — unreachable `Preconditions`, or two distinct actor actions with no realistic gap (mis-specified TC → unrealistic test → false defect report)

---

## See Also

- `work-item --mode=review --type=spec-tests` — TC quality review (use AFTER this mode to validate TC coverage and correctness)
- `spec [mode=sync]` — Native sync mode (forward-syncs Section 8 TCs ↔ executing test code; see `sync.md`)
- `integration-test` — Integration test code generator (use AFTER this mode to generate test stubs)
- `$spec` — Feature doc creator (creates the Section 8 that this mode populates)
- `work-item --mode=refine` — task refinement (feeds acceptance criteria into this mode's TDD-first path)

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
