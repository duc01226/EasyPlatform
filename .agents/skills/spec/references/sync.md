> The `spec` skill (`../SKILL.md`) loads this body for `[mode=sync]`. The host SKILL.md resolves the project profile and routes to shared semantic/evidence gates. This body carries the mode-specific reconciliation procedure. For authoring cases, see `tests.md` (`[mode=tests]`).

# Mode: Sync Canonical Cases ↔ Test Code

## Contents

- [Native Profile Procedure](#native-profile-procedure)
- [Strict Default TC/Section 8 Procedure](#strict-default-tcsection-8-procedure)
- [Phase 5 (sync detail): Reconcile Section 8 TCs ↔ Integration Test Code](#phase-5-sync-detail-reconcile-section-8-tcs--integration-test-code)
- [Next Steps (sync mode)](#next-steps-sync-mode)

## Native Profile Procedure

Apply this branch when the host selected a native profile. Do not execute the strict-default TC/Section 8 algorithms below. They preserve the default representation and are not additional native registries or carrier requirements.

1. **Resolve one canonical scope.** Read the configured business root, artifact type, owner rules, logical identifiers, section aliases, native case carriers/field mappings, executable-test or manual-QC selectors, and local lifecycle. Follow explicit local authority/supersession rules before judging declarations to conflict. Exclude derived technical roots and out-of-scope files. A malformed/unresolved profile, unreadable required carrier, incomplete file selection, unresolved owner, or unsupported expression yields `UNKNOWN`/`BLOCKED`; never fall back to TC or report an empty selection as clean.
2. **Enumerate canonical rows from their declared carriers.** Use the project's bounded/validated carrier reader when available; otherwise inspect only an explicit, reviewable file set and record spans. Preserve identity as owner + scenario ID + optional variant ID. Retain declared delivery-slice association as metadata where the owner defines it; do not turn slice numbers into case IDs. A repeated scenario with distinct variants is valid; an exact duplicate identity or conflicting owner is a finding. Do not build or persist a second case registry.
3. **Detect direction.** `forward` compares canonical owner/case rows to the proof carriers selected by the profile (executing tests or explicitly approved manual-QC records); `reverse` reports executable-test or manual-QC proof rows that lack an accepted canonical owner; `full` runs both sequentially; `harvest` captures a proven, spec-silent invariant into the native owner. Default to `forward` when no direction is provided. Reverse insertion or semantic changes still require the canonical owner's approval under the active workflow.
4. **Prove each coverage claim.** For every required owner/scenario/variant row, trace its requirement/invariant and source evidence to the profile-selected proof. For executable tests, inspect the assertion that checks the expected outcome and record the selected runner command and observed result when run. Use manual-QC proof only when the profile explicitly authorizes it; record the approved procedure and observed evidence without labeling it runner-executed. ID/name/source presence or a `status: approved` field alone is not execution proof. A source-mapped row is `mapped/unverified`; report pass only after observing the selected execution method's result. An aggregate runner result covers only rows whose assertions were inspected and whose results were observed.
5. **Reconcile without destroying intent.** Report uncovered canonical rows, unowned executable/manual-QC proof rows, stale links, incompatible expectations, and out-of-scope candidates separately. Never delete or overwrite a canonical case/test during sync. Do not promote an orphan test or QC record into the spec merely because it has a scenario identifier; establish its accepted requirement/invariant, owner, expected outcomes, and applicable semantic scope first.
6. **Harvest invariants at the native owner.** Prove the constraint from enforcement evidence, distinguish invariant from example, record the quantified domain and boundary counter-case where applicable, and route the rule to the configured contract section and guarding scenario carrier. Preserve healthy behavior in bugfixes. A harvest that changes intended behavior or ownership follows the workflow's user/owner approval gate; never create a TC solely to satisfy the default procedure.
7. **Use N/A only when applicability is proven.** A missing default TC does not make a native scenario N/A. Classify an item as N/A only when the resolved profile/scope and evidence demonstrate that the requirement does not apply; otherwise preserve `UNKNOWN`/`BLOCKED` or uncovered. Never claim a passing summary when required cases or selected files remain unresolved.
8. **Keep reconciliation reports disposable.** Put the selected-file inventory, row identities/spans, executor/assertion/result mapping, coverage gaps, and uncertainty in a run-scoped `tmp/` report. Do not write a new tracked index, case list, or mirror to record the sync.

Follow the host workflow, operation-authority, review, and confirmation gates; profile selection changes representation only. If no native profile was selected, use the strict-default procedure below unchanged.

## Strict Default TC/Section 8 Procedure

Everything from this point through the end describes the strict default TC/Section 8 representation only.

**Triggered when:** "sync test specs", "sync tests", "reconcile tests", "reverse sync", "full sync", or `[mode=sync]` with an optional `[direction=sync|forward|reverse|full]` qualifier.

> The canonical business TC registry is **Section 8** of the Feature Spec. This mode reconciles §8 business TCs against test code (§8 is canonical; test code implements it).
> There is **no separate QA dashboard** — a top-level `README.md` + `PRIORITY-INDEX.md` in the business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) are not part of the system. The only derived aid is the bucket `INDEX.md`, regenerated by `$spec [mode=index]` — never hand-synced here.

### Direction Detection

| Trigger phrase                                                             | Direction | Behavior                                            |
| -------------------------------------------------------------------------- | --------- | --------------------------------------------------- |
| "sync test specs" / "sync tests" / `direction=sync` / `direction=forward`  | Forward   | §8 business TCs → test code (flag TCs with no covering test) |
| "reverse sync" / "back-fill TCs" / `direction=reverse`                     | Reverse   | Test code → §8 only for orphan tests whose scenario passes M7 |
| "full sync" / "bidirectional" / `direction=full`                           | Full      | Both directions sequentially                        |
| "harvest invariants" / "harvest" / `direction=harvest`                     | Harvest   | Code/tests/review → §4·§5·§8 (capture a SPEC-SILENT invariant the spec never states — the rule layer, not just a TC) |

**Default** (no direction specified): `forward`.

> **Harvest is the operational home of the SPEC-SILENT class** (`shared/sync-inline-versions.md` → `SYNC:spec-drift-adjudication`). The whole-package review loop (`SYNC:spec-loop-discipline`, step 7 of the local cycle reference) DISCOVERS the unwritten-but-enforced rule; Harvest is the procedure that lands it in the spec. `full` sync runs Harvest after the forward/reverse passes when the review handed in (or the scan finds) any SPEC-SILENT candidate.

### Quality Gate (Before Any Sync)

**[BLOCKING]** Scan all TCs in module and flag:

- `Evidence = TBD` AND `Status = Tested` (contradiction)
- TCs missing GIVEN/WHEN/THEN structure
- TCs missing Acceptance Criteria

Produce quality report alongside sync output. **Do NOT block sync** — surface gaps and continue.

### TC ↔ Test Join Evidence Gate

**[BLOCKING] — applies wherever an EXISTING TC id is resolved against the test corpus: the Forward Sync coverage diff (step 4) and the Reverse Sync ID-keyed merge (step 3).** It does **NOT** apply to Invariant Harvest, which resolves a code enforcement site to a *rule* and **creates** the TC rather than matching one — harvest's equivalent evidence bar is its own "≥2 enforcement points" proof (Invariant Harvest step 2), not this gate.

Matching a TC id against the corpus answers *"does something carry this string?"*, never *"is this TC's behavior guarded?"* — the same join `sdd-artifact-contract.md` (§ TC deletion) already treats as BLOCKING in the delete direction. It fails identically here, and here it is worse: deletion at least ends in a visible removal, whereas a fabricated `CoveredBy:` link written in step 5 reports the TC as **covered forever** while nothing guards it. Before treating a TC as covered, confirm BOTH:

<!-- SYNC:tc-test-join-evidence -->

> 1. **The resolved artifact is an executing TEST** — prove suite/project membership, the configured test-carrier row, or an executing assertion, and say which you checked. A corpus search can match production source; a comment citing a case is not execution evidence.
> 2. With a valid `specArtifacts` profile, join by the configured ownership tuple: canonical owner path + native case/scenario ID + optional variant. Trace each tuple to its actual executor and inspect the assertion at `file:line`; preserve configured one-to-many or many-to-many cardinality. A result for several scenarios proves each only when the executor reaches an assertion for every row.
> 3. With no `specArtifacts` profile, use the strict-default TC identity; a malformed declared profile blocks without fallback. In either profile, the resolved test must match the scenario's native preconditions/actions and owned outcome (Given/When/Then when selected); an ID match is a string match, not proof.

<!-- /SYNC:tc-test-join-evidence -->

### Forward Sync Algorithm (§8 TCs → Test Code)

1. Read all `TC-{FEATURE}-{NNN}` entries from feature doc Section 8 (canonical business source)
2. Grep the configured test-spec coverage paths for the test-spec annotation (key `TestSpec`) — include integration, unit, E2E, contract, and property-test suites that execute and carry the annotation. If the project has no explicit coverage-path config, derive scan roots from `docs/project-config.json` context groups plus the integration/e2e/project testing reference docs; do not fall back to integration-test paths only.
3. Run quality gate — flag issues, log report
4. **Coverage diff:** `uncovered = §8_ids − tested_ids` (where `tested_ids` are the TCs whose test-spec annotation appears in any configured executing test tier)
    - **[BLOCKING] An ID match alone NEVER promotes a TC to `tested`.** Before adding a TC to `tested_ids`, run the **TC ↔ Test Join Evidence Gate** above — BOTH checks must pass. Either check failing ⇒ the TC is `UNKNOWN`, **NOT** `tested`. Report it as an unresolved-join gap; never write a `CoveredBy:` link for it.
    - A TC covered only by a unit/E2E/contract/property test is already **covered** per the one-to-many contract (coverage = ≥1 annotation-tagged test — see `tc-format.md` → TC ↔ Test Code Cardinality). Do NOT downgrade it to `Status: Untested`; the canonical `CoveredBy:` field can name any executing test tier. A legacy `IntegrationTest:` marker means "no integration test," NOT "no test."
    - For each TC with no covering test in any configured tier, record the gap and suggest the appropriate owner. Use `$integration-test [from-prompt]` only when integration coverage is the intended remediation; otherwise route to the relevant unit/E2E/contract/property test owner.
    - NEVER write TCs into a separate file — §8 is the single source of truth; tests are generated FROM it by `$integration-test`.
5. Update each §8 TC's `CoveredBy:` field with **all** covering test links (one TC → many tests), a manual-QC marker, or the not-yet-implemented marker. List every annotation-tagged covering test (comma-separated on one line), or use a test-filter expression when the set is large. Accept legacy `IntegrationTest:` as input during migration, but emit `CoveredBy:` on write:

    ```
    CoveredBy: {TestProject}::{TestClass}::{TestMethodName}, {TestProject}::{OtherClass}::{OtherMethod}
    ```

    The field is representative; the authoritative complete set is whatever carries the TC's `TestSpec` annotation in code. If no integration test exists yet for this TC:

    ```
    CoveredBy: (not yet implemented — run $integration-test [from-prompt] TC-{FEATURE}-{NNN})
    ```

    The "not yet implemented" text is detectable by tools scanning for coverage gaps.
6. Emit a coverage summary: `{tested}/{total} §8 TCs have covering tests; {uncovered} gaps flagged for the owning test route` (a TC covered only by unit/E2E/contract/property tests is still covered per the contract — it is not counted as Untested, only as lacking an integration test when integration coverage is specifically required).

### Reverse Sync Algorithm (Test Code → §8)

Reverse sync is **emergency recovery only** — back-fill §8 for tests that exist without a canonical business TC (e.g. business tests written before the spec system, or imported from another project), with explicit user confirmation and a recovery report. This is the `from-integration-tests` path; use it to recover canonical business coverage, never as a normal update path — forward authoring from §8 remains the default.

1. Grep the configured test-spec coverage paths for the test-spec annotation (key `TestSpec`) — extract all TC IDs referenced by executing test code
2. Read feature doc Section 8 — extract existing TC IDs
3. **ID-keyed merge with M7 gate:** TC referenced by a test but NOT in §8 → first classify the test scenario:
    - **Business-visible:** reverse-engineer a TC (objective + GWT + evidence anchor from the test body), keep the body demoable, and propose insertion into Section 8.
    - **Technical-only:** do **not** insert into Section 8. Report it as a technical orphan and route to the derived technical spec tree/test owner. A sync/consumer/projection/idempotency/load/path test with no user/QC-visible business result is not a missing business TC.
    - NEVER overwrite existing §8 TCs (canonical)
    - Append new TCs at the end of the appropriate decade group
4. **[BLOCKING]** `ask user question tool` — present proposed inserted business TCs for user review before saving, plus report-only technical orphans separately.
5. Write a recovery report naming recovered TC IDs, skipped technical-only test IDs, source test methods, and why reverse sync was required.

### Invariant Harvest Algorithm (Code / Tests / Review → §4·§5·§8)

> **Purpose — the home for "the rule nobody wrote down".** Reverse sync recovers a missing **§8 TC** for a test that already exists. Harvest is different: it captures a **SPEC-SILENT invariant** — a constraint the code correctly enforces that NO canonical artifact (§3 AC, §4 BR, §5 invariant, §8 TC) states — into the **rule layer** (§4/§5) AND a guarding §8 TC. The primary missing home of a SPEC-SILENT rule is the business rule, not the test case; a discovered invariant left only in code (or only in a test) is INCOMPLETE. This closes the feedback half of the loop: the spec is enriched by *discoveries*, not only by code *changes*.

**Trigger:** the whole-package review loop hands in a SPEC-SILENT finding; OR `direction=harvest`/`direction=full`; OR a scan of changed code/tests surfaces an enforced constraint (guard clause, validation, assertion, invariant check) with no matching §3/§4/§5/§8 entry.

1. **Collect candidates.** For each enforced constraint with no spec home, record: the enforcement site(s) as an abstract anchor (`[Source: {namespace}/{service}/{id}]`, never physical coordinates), the observable rule it imposes, and how it was found (review finding vs scan).
2. **Prove it is an invariant, not an example.** A candidate qualifies ONLY if it is genuinely always-true — trace **≥2 enforcement points**, or a single guard clause that rejects every violating input. A behavior seen in one example path is NOT a harvested invariant — discard it. (Anti-fabrication: never promote a sample case to a universal rule.)
3. **Express as a property.** Write the rule as a universally-quantified property — "for ALL inputs in {domain}, {invariant} holds" — plus one boundary counter-case (the input that must be rejected). Example-only phrasing fails this gate (`SYNC:spec-loop-discipline` #1).
4. **Choose the home + strength:**
   - Entity/aggregate always-true constraint → **§5 invariant**.
   - Cross-field / business validation or guard → **§4 BR**; tag **[HARD]** when the code rejects/blocks on violation (an enforced guard is HARD by definition), **[SOFT]** only when advisory. Default-challenge any SOFT candidate: "the code enforces this — should it be [HARD]?"
   - User-observable behavior → **§3 AC**.
   - ALWAYS also a **§8 TC** (the property + its boundary counter-case).
5. **Enrich via the owning modes** (Harvest never writes §1–§7 prose or §8 directly — it routes):
   - Rule into §3/§4/§5 → `$spec [mode=update]`
   - §8 TC for the property → `$spec [mode=tests]`
   - Guarding property/boundary test if absent → `$integration-test`
6. **[BLOCKING] confirm intent changes only.** A pure SPEC-SILENT capture (code already enforces it; the spec was merely silent) is enrichment — add it. `ask user question tool` ONLY when the capture would change documented interpretation, promote SOFT→HARD, or the "always-true" claim is uncertain (drops below the act threshold). Never weaken, rename, or renumber an existing rule — Harvest only ADDS.
7. **Re-review (forced loop, not terminal).** Hand the enriched §3/§4/§5/§8 back to the whole-package review for ONE bounded, module-scoped re-review against the enriched spec (`changes-review` SPEC-CONTENT re-entry) — confirm the newly-written rule is enforced in code AND guarded by a test, and surface any further hidden rule. **Harvest converges when a full review pass discovers no new unwritten invariant** (mirrors `plan --mode=review` recursion; each cycle enriches the spec).
8. **Report.** Name each harvested rule, its new logical ID (`BR-`/`§5 invariant`/`AC-`/`TC-`), the source anchor, the strength decision ([HARD]/[SOFT] + why), and the re-review verdict.

> **[M2/M3 — keep §8 stack-portable]** Harvested TCs carry the abstract `[Source: ...]` anchor only — never expand to physical coordinates. The sole physical reference is the operational `CoveredBy:` field.

### Orphan Detection

Two orphan classes after sync:

- **Untested TC** — a §8 TC with no test-spec annotation (key `TestSpec`) reference in test code → flag for `$integration-test` (NEVER delete the TC).
- **Untracked test** — a test referencing a TC ID absent from §8 → either back-fill via reverse sync, or (if the test's `TestSpec` is stale/`[DEPRECATED]`) flag the test for cleanup by its owner.

NEVER silently delete a §8 TC or a test during sync — surface both orphan classes in the summary and leave the destructive action to the owner.

### Staleness Tracking

**Drift detection:** if the Feature Spec changed since tests were last generated, §8 TCs may have outrun the test code.

```bash
SPEC_ROOT=docs/specs # default only — read specRoots.business.path from docs/project-config.json first
git log -1 --format=%cd -- "$SPEC_ROOT"/{Bucket}/README.{FeatureName}.md
```

Feature-spec newer than the covering test files → warn: `⚠ Section 8 changed since the integration tests were last generated — re-run $integration-test for the affected TCs.`

---

## Phase 5 (sync detail): Reconcile Section 8 TCs ↔ Integration Test Code

Forward-sync the canonical business §8 TCs against the test suite (§8 is canonical; test code implements it):

1. Map each §8 TC to its covering test method(s) via the test-spec annotation (key `TestSpec`, value `TC-…`) — **one TC may be covered by many tests** (integration + unit, across components/services); the annotation is the join key, and finding ≥1 covering test means the TC is covered (see `tc-format.md` → TC ↔ Test Code Cardinality)
2. TDD-first: map to expected test method names (to be created by `$integration-test`)
3. Flag §8 TCs with **zero** covering tests as coverage gaps for `$integration-test` (NEVER flag many-tests-per-TC as a problem — that is the expected one-to-many shape; NEVER split a business TC to achieve a 1:1 map to test methods)

> **[M2/M3 — keep §8 stack-portable]** Each TC's `Evidence` **abstract anchor** (`[Source: {namespace}/{service}/{id}]`) stays verbatim — NEVER expand it to physical code coordinates or repository-root paths. The only physical reference a TC may carry is the operational `CoveredBy` field — one or more `{TestFile}::{MethodName}` link(s), a test-filter expression, or manual-QC coverage, since a business TC maps to many tests.

**Skip** if user says "skip sync" or no integration test project exists for the module.

---

## Next Steps (sync mode)

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`$start-workflow` → Step Execution Protocol, Workflow-step mode).

Based on the reconciliation outcome, suggest via `ask user question tool`:

```
1. "$integration-test — Generate tests for any §8 TCs flagged with no covering integration test (Recommended)"
2. "$test — Run tests to verify all documented TCs pass"
3. "spec [mode=tests] — Author/update §8 TCs first if the quality gate surfaced gaps"
4. "spec [mode=update] — Promote a harvested SPEC-SILENT invariant into §4/§5 (run when Harvest surfaced an unwritten enforced rule)"
5. "Done for now"
```

When Harvest captured any SPEC-SILENT invariant, the loop is NOT done until the enriched package passes one bounded re-review with no new unwritten rule discovered (see Invariant Harvest Algorithm step 7).

For TC authoring (CREATE/UPDATE of §8 entries), switch back to `[mode=tests]` (`tests.md`).
