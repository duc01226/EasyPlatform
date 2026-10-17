---
title: 'Canonical TC Format'
version: 1.4.0
last_reviewed: 2026-07-16
authority: spec [mode=tests]
consumers: [spec, spec [mode=tests], spec [mode=sync], integration-test, work-item --mode=review]
---

# Canonical TC Format

> **Single source of truth** for TC entry format. Referenced by: `spec`, `spec [mode=tests]`, `spec [mode=sync]`.
> To update TC format: edit THIS file only, then update all consumer skills to reflect the change.

## Applicability And Profile Selection

This file defines the strict default business-case representation: `TC-{FEATURE}-{NNN}` entries in Section 8, with the fields and TC-to-test cardinality defined below. Before authoring or reviewing a project's cases, read its project configuration and required spec/test references, then resolve `specArtifacts`. A valid native profile selects its canonical owner, identifiers, carriers, and declared cardinality; do not also emit this format as a second registry. A native profile may use Markdown, YAML, inline case data, or another existing carrier, but this file does not define a second data schema. A declared but malformed, unsupported, or unresolvable profile is `BLOCKED`; report the validation evidence and never treat it as absent or fall back.

Changing representation or cardinality does not change the semantic obligations in `sdd-artifact-contract.md`: preserve case intent, decision/requirement links, observable expected outcomes, property/invariant and boundary-countercase coverage, healthy-behavior preservation, test rationale, actual executing assertions and results, source evidence, and reconciliation. Use this strict default only when `specArtifacts` is absent; do not infer a profile from the language or test framework.

## Quick Summary

**Goal:** Keep default-profile TC entries consistent, traceable, and reusable across feature docs, TDD specs, and sync mode.

**Workflow:**

1. **Author** — Write each TC with objective, preconditions, GWT steps, acceptance criteria, data, edge cases, evidence, and related files.
2. **Trace** — Link every TC to code/test evidence or mark `TBD (pre-implementation)`.
3. **Preserve** — For bugfixes, add preservation TCs before changing code semantics.
4. **Deprecate** — Mark removed behavior as deprecated; never delete historical TCs.

**Key Rules:**

- Under the strict default TC profile, MUST ATTENTION preserve `TC-{FEATURE}-{NNN}` identity and evidence fields.
- MUST ATTENTION state business intent/invariant so generated tests fail when protected behavior breaks.
- MUST ATTENTION derive **properties, not just examples** — for each [HARD] business rule and each entity invariant, probe the [Invariant Categories to Probe](#invariant-categories-to-probe) and write ≥1 universally-quantified property TC ("for ALL inputs in {domain}, {invariant} holds") plus ≥1 boundary counter-case, distinct from a single-point example TC.
- MUST ATTENTION use preservation TCs for every healthy input that must remain unchanged after a bugfix.
- Under the strict default TC profile, MUST ATTENTION keep cardinality **one TC → many tests**: a single business TC may be covered by many integration/unit tests across components and services (join key = the shared **test-spec annotation** carrying the TC ID, expressed in the configured test framework's syntax). NEVER split or technicalize a TC to force a 1:1 map to one test method (see [TC ↔ Test Code Cardinality](#tc--test-code-cardinality-one-to-many)).
- NEVER delete deprecated TCs; keep audit trail and version history.

## Invariant Categories to Probe

> **Discovery prompt — run BEFORE writing TCs.** An example TC asserts one GIVEN/WHEN/THEN point; a **property TC** asserts a rule that holds for ALL inputs in a domain. For each [HARD] business rule (§4) and each entity invariant (§5), walk these 6 classes and write a universally-quantified property TC ("for ALL inputs in {domain}, {invariant} holds") for every class that applies, plus ≥1 boundary counter-case. Most rules match at least one class — if none match, record why.

| Class                       | Property (for ALL inputs)                                              | Concrete example                                                                                  |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Idempotency**             | applying the same operation twice = applying it once                  | Re-delivering the same payment-confirmation event leaves the balance and order state identical    |
| **Round-trip / inverse**    | `decode(encode(x)) == x`; an operation followed by its inverse = identity | Export then re-import a record yields the same field values; deposit X then withdraw X = no change |
| **Commutativity**           | result is independent of operation order                              | Applying discount A then B yields the same total as B then A                                       |
| **Monotonicity**            | a value only moves in one direction across the operation              | Aggregate/version/sequence number never decreases; an append-only ledger never shrinks            |
| **Conservation**            | a tracked total stays constant across a transformation               | Sum of split line-item amounts equals the original order total; transfer preserves combined balance |
| **State-transition**        | only declared transitions are legal; illegal transitions are rejected | Order may go Pending→Paid but never Shipped→Pending; rejected transition leaves state unchanged    |

**Distinguish property TCs from example TCs:** an example TC fixes one input and checks one outcome; a property TC names the input **domain** ("any valid amount", "any two orderings", "any record") and asserts the invariant holds across it, then pairs it with a boundary counter-case (the input just outside the domain where the invariant must fail-closed). Both kinds belong in §8.

## TC Entry Format

````markdown
#### TC-{FEATURE}-{NNN}: {Descriptive Test Name} [P{0-3}]

**Objective:** {One sentence: what this test verifies and why it matters}

**Business Intent / Invariant Guarded:** {Business rule, invariant, or user promise this TC protects; the TC must fail if it breaks}

**Preconditions:**

- {Required DB state, seeded data, or prior actions}

**Real-World Reachability:** {how production actually reaches the Preconditions above — which actor performs which prior action, in what order, and the realistic elapsed gap between consecutive actor actions. "The data is simply there" is not reachability. Two distinct actor actions with no stated gap get generated as a back-to-back call, which manufactures a race production never has — so "instantaneous" is a claim to justify, never a default.}

**Deliberate Impossible State (only when this TC intentionally constructs a state production should never reach):** {WHY that state is reachable at all — upstream defect, partial write, legacy/migrated data, external-system fault — and which repair or fail-safe behaviour the TC proves. Omit this field entirely for ordinary TCs; unlabelled, an unreachable setup is indistinguishable from a mis-specified one.}

**Demo Flow:** {the actions a real user or QC performs, in order — this TC must be demoable}

```gherkin
Given {a business precondition a user could set up through the product}
And {additional business context if needed}
When {the action a user or QC performs — a click-path, a submitted form, a business interface call}
And {additional action if needed}
Then {the outcome that user or QC can OBSERVE}
And {additional observable verification}
```

> **[HARD] The demo test — a business TC is one a user or QC can DEMO.** Every `Given` is state a user could arrange; every `When` is an action a user could take; every `Then` is an outcome a user could see. **A step that can only be performed or observed by inspecting a queue, a projection, a log, a DB row no screen reads, or a deployed component is TECHNICAL-ONLY** — it belongs to the technical spec tree, not here. If the `When` is "the consumer receives the event" or the `Then` is "the projection row is written", this is not a business TC. See `sdd-artifact-contract.md` → BUSINESS-VISIBLE vs TECHNICAL-ONLY.

**Expected Result:** {what the demo SHOWS — fill every dimension that applies; omit with a reason, never silently}

| Dimension               | Expectation                                                                   |
| ----------------------- | ----------------------------------------------------------------------------- |
| **UI**                  | {what the user sees change — message, state, control, navigation}             |
| **System behavior**     | {what the system observably does — notifies, blocks, permits, recalculates}   |
| **Business data state** | {what the business data reads AFTER, in business terms — not table/column}    |
| **Data shown on UI**    | {what a list/report/query displays afterward — the value a user reads back}   |

> **Why these dimensions.** A business TC that asserts only "no exception thrown" or "the row exists" is not demoable and proves nothing a stakeholder values. **State the business data state in business language** ("the employee's approved leave balance reads 12 days"), never in storage language ("the `LeaveBalance` row's `Days` column = 12) — the same spec must survive re-implementation on a different store. Omit a dimension only when the feature genuinely has no such surface (e.g. no UI), and say so.

**Acceptance Criteria:**

- ✅ {Expected success behavior — what MUST happen, observable in a demo}
- ❌ {Expected failure behavior — what MUST NOT happen, observable in a demo}

**Test Data:**

_Example TC (single point) — one fixed input/output pair:_

```json
{
    "field": "validValue",
    "invalidField": null
}
```

_Property TC — a generator spec, not one example. MANDATORY for any TC guarding a [HARD] §4 rule or §5 invariant. Declare the input **domain** + the invariant that must hold across it + the boundary just outside the domain where it must fail-closed — three machine-readable fields, not prose:_

```yaml
inputDomain: "any valid order with 1..N line items and any non-negative amounts" # the generated space, NOT one point
invariant: "sum(lineItem.amount) == order.total — for ALL inputs in the domain" # the universally-quantified rule
boundaryCounterCase: "amounts summing past the credit limit → order rejected, total unchanged" # fail-closed edge
```

> The three keys (`inputDomain`, `invariant`, `boundaryCounterCase`) are the canonical machine-readable property contract — a `[HARD]`/§5 TC's universality lives in these fields, never only in prose. `inputDomain` names a space (a generator), not a constant; `invariant` is "for ALL …"; `boundaryCounterCase` is the input just outside the domain that must be rejected. This block maps 1:1 to the Pattern 9 property test (`integration-test` → Required patterns per command type → invariant-owning branch).

**Edge Cases:** {business-observable edges ONLY — each must still pass the demo test above}

- {Boundary: empty collection, max length, absent optional value} → {what the user sees}
- {Competing users: two people act on the same record at once} → {what each one sees}
- {Business timing: the action arrives after the window closed, or out of the expected order} → {expected behavior}

> **[HARD] An edge case is not a licence to name architecture.** ⚠️ **This prompt previously read *"{Cross-service: message bus timing}"* and *"{Concurrency: simultaneous updates}"* — a **message bus** and a **write race** are mechanisms, not business edges, and prompting for them here is how a transport-timing test case enters a business spec wearing an edge-case label. **Ask what a user would SEE at the edge, never what the infrastructure does at it.** "Two approvers submit at once → the second sees 'already approved'" is a business edge; "the consumer processes the event twice" is a technical one and belongs to the technical spec tree. *A business spec must yield the same edge cases whether the system is a monolith or microservices — a bus only exists in one of them.*

**Transition Invariants (when the entity has lifecycle states — §5):**

- {Property domain — e.g. "for ALL legal transitions of {Entity}"} → assert the exact post-state business facts the user or QC can verify
- {Boundary counter-case — e.g. "for ALL illegal transitions of {Entity}"} → assert the transition is rejected with the named failure and the pre-state field values are left unchanged

**Evidence:** `[Source: {namespace}/{service}/{id}]` or `TBD (pre-implementation)`

**Related Behaviors:**
| Capability | Anchor |
|------------|----------------------------------|
| API surface | `operation/{service}/{Feature}` |
| Use case (command/query) | `operation/{service}/{Feature}` |
| Domain model | `component/{service}/{Feature}` |
| Test | `test/{service}/{Feature}` |

**CoveredBy:** one or more covering tests or approved coverage carriers for the configured environment — `{configured-test-path}/{TestFile}::{MethodName}` (comma-separated **on one line** when several tests cover this TC), OR a test-filter expression that selects every test annotated with this TC (e.g. `TestSpec=TC-{FEATURE}-{NNN}`), OR `Manual-QC`, OR `Untested`
**Status:** Tested | Untested | Planned
````

> **Stack-portable evidence (M2/M3/M5).** `Evidence` and `Related Behaviors` carriers use **abstract anchors**
> `[Source: namespace/service/id]` — never donor physical code coordinates or repository-root paths. Namespace ∈
> `operation | event | component | schema | requirement | rule | constraint | test`; service = the owning
> module/service (lowercased); id = the artifact concept with code suffixes stripped. Physical coordinates
> are recoverable only through the provenance sidecar. This section is the canonical anchor-taxonomy contract.
>
> **`CoveredBy` is the one exception** — it is operational QA glue (a traceability link to the actual
> executable test(s) or manual coverage carrier, consumed by test/sync skills and surfaced in the §8 TC's `CoveredBy` field). It stays a physical
> test-file + test-method link (`{TestFile}::{MethodName}`, in the configured test layout), is exempt from the prose gate, and is
> regenerated per-stack on rebuild. The field is
> **representative, not exhaustive** — it may list several covering tests, but the authoritative complete set is whatever
> carries the TC's test-spec annotation in code (see [TC ↔ Test Code Cardinality](#tc--test-code-cardinality-one-to-many)).
> Legacy `IntegrationTest:` fields are accepted only as migration input; new templates MUST emit `CoveredBy:`.
>
> **Configurable roots (never donor paths).** When physical coordinates are emitted on rebuild, root them at the
> project-configured roots — `{configured-source-path}` for source/evidence and `{configured-test-path}` for
> executable tests — resolved from `docs/project-config.json`. Never hardcode a donor repository's service-layout paths.

## TC ↔ Test Code Cardinality (One-to-Many)

> **A Section 8 TC is a business / user-story acceptance scenario — not a unit of code.** It is written tech-agnostic
> (M1/M2/M5) and is verified by **one OR MANY** test methods. This section is the canonical cardinality contract for the default TC profile; all
> consumer skills (`spec [mode=tests]`, `spec`, `integration-test`, `integration-test --mode=review`, `work-item --mode=review`) defer to it when that profile applies.

This one-to-many rule is authoritative when this default TC profile is selected. A project reference may instead declare a native many-to-many relation, such as one aggregate executor covering several owner-qualified scenarios while each scenario has multiple variant rows or tests. Preserve each owner + scenario + variant identity, and trace every claimed result to the executor and assertion that actually produced it. A shared aggregate pass does not prove an uninspected row. Do not create extra TC entries or another case registry to represent the native relation.

**The strict default rule (authoritative when this profile applies):**

- **One TC → many tests.** A single `TC-{FEATURE}-{NNN}` MAY be covered by many test methods — integration tests, unit tests, across multiple components / services / layers. Every covering test carries the **same test-spec annotation** — key `TestSpec`, value `TC-{FEATURE}-{NNN}` — expressed in the configured test framework's syntax. That annotation is the **join key**; the cardinality of the join is **1 TC : N tests**.
- **Coverage = ≥1.** A TC is `Tested` when **at least one** test carrying its annotation exists and passes. A TC does NOT need a dedicated, name-matching, or single-purpose test method.
- **`CoveredBy` field is representative.** It lists one or more covering tests, a test-filter expression, or manual-QC coverage. Never assume it enumerates every covering test — the complete set is whatever carries the test-spec annotation in code. Legacy `IntegrationTest:` fields are migration input only.
- **Direction of mapping.** Each test method maps to **one primary** business TC it verifies. Each TC maps to **one or more** test methods. So: test -> primary TC is N:1; TC -> test is 1:N. A test MAY carry additional `TestSpec` annotations only for documented alias/deprecation bridges, where an old TC ID and canonical TC ID intentionally point to the same executable behavior; document the alias in specs and remove the extra tag when the bridge retires.

**FORBIDDEN (these break M1/M5 — the spec stops being business-readable):**

- ❌ Splitting, narrowing, or technicalizing a business TC so it maps 1:1 to a single test method or production class. A TC describes a user-observable promise, not a code unit.
- ❌ Requiring (or auto-generating) a test method whose name equals the TC ID, or enforcing "one test per TC".
- ❌ Flagging "multiple tests reference the same TC" as a duplicate, redundancy, or defect — that is the expected one-to-many shape.
- ❌ Creating a new TC solely to mirror a newly added test method when an existing business TC already covers that behavior — extend coverage under the existing TC instead (add another test carrying the same annotation).

## TC Priority Classification

| Priority | Label    | Description                    | Guideline                                       |
| -------- | -------- | ------------------------------ | ----------------------------------------------- |
| P0       | Critical | Security, auth, data integrity | If this fails, users can't work or data at risk |
| P1       | High     | Core business workflows        | Core happy-path for business operations         |
| P2       | Medium   | Secondary features             | Enhances but doesn't block core workflows       |
| P3       | Low      | UI enhancements, non-essential | Nice-to-have polish                             |

## TC Decade-Based Numbering

Group TCs by category using decade blocks to prevent collisions:

| NNN Range | Category                             |
| --------- | ------------------------------------ |
| 001–009   | CRUD / Core operations (P0-P1)       |
| 011–019   | Validation / Business rules (P1-P2)  |
| 021–029   | Authorization / Permissions (P0-P1)  |
| 031–039   | Business workflows / lifecycle outcomes (P1-P2) |
| 041–049   | External business-facing outcomes (P1-P2) |
| 051–059   | Edge cases / Error scenarios (P2-P3) |
| 061–069   | UI / User journey flows (P2-P3)      |
| 071–079   | Invariant / Property TCs (P0-P2)     |
| 081–099   | Reserved for feature-specific groups |

**Collision prevention:**

1. Check existing TC IDs in the feature doc's Section 8 (Test Specifications) first
2. Find the next free decade for the category
3. Mark deprecated TCs with a `[DEPRECATED]` suffix instead — never reuse a deprecated TC ID

## TC Category Sections

Organize TCs into named category sections. Minimum 3 named sections required, and the **Invariant / Property** section is MANDATORY whenever the feature has a [HARD] §4 rule or §5 invariant (query-only / config-only features exempt — see spec [mode=tests] for exception rules):

```markdown
### CRUD Tests

(Create, Read, Update, Delete — happy path operations)

### Validation Tests

(Input validation, business rule enforcement, error responses)

### Permission Tests

(Role-based access, cross-tenant isolation, authorization checks)

### Business Workflow Tests

(Multi-step user or QC-demoable processes and state transitions)

### Business Edge Case Tests

(Boundary conditions, competing user actions, and business timing edges visible in the product)

### Invariant / Property Tests

(Universally-quantified properties + boundary counter-cases per [HARD] §4 rule / §5 invariant — see "Invariant Categories to Probe")

### External Outcome Tests

(Business outcomes that cross product boundaries and remain demoable without inspecting architecture)
```

## Preservation Tests (Bugfix Context)

When writing TCs for a bugfix, add a Preservation Tests section **before** the new failure TCs:

````markdown
### Preservation Tests

> These TCs verify pre-existing correct behavior that the fix must not regress.

#### TC-{FEATURE}-{NNN}: {Existing Behavior Name} [P{0-3}]

**Objective:** Verify that {pre-existing behavior} is unchanged after the fix.

**Business Intent / Invariant Guarded:** {Healthy behavior or invariant that must stay true before and after the bugfix}

**Demo Flow:**

```gherkin
Given {a healthy business situation a user could arrange, that works correctly TODAY}
And {the business fact that must stay true — in business language, e.g. "the candidate's application shows as Submitted"}
When {the action a user takes that the bugfix also affects}
Then {the same business outcome the user saw BEFORE the fix — stated as something they SEE}
And {no other business behavior the user relies on has changed}
```
````

> **[HARD] A bugfix is not automatically a business change.** Add a Preservation TC here **only** if the behavior it
> protects is one a user or QC can **demo**. If the thing at risk is a downstream store, an orphaned record, a
> consumer, a projection, or an exact field value, the preservation belongs in the technical spec tree
> (`specRoots.technical`) — **not in this spec**. This is the single most common way technical TCs leak into a
> business spec: the bug was technical, the business did not change, **and a TC got added anyway.**
> **If the business behavior did not change, this spec does not change.**

````

**Trigger:** Every business-visible bugfix spec MUST have ≥1 Preservation TC per "Healthy input" enumerated in the plan's Preservation Inventory. A technical-only bugfix with no changed user/QC-visible behavior produces zero business Preservation TCs; preserve that risk in the technical spec tree and executable tests instead.

**Authoring rule:** Write from OLD code semantics BEFORE the fix lands. The TC MUST pass against pre-fix code AND post-fix code.

## TC Deprecation Protocol

When a behavior is removed:

1. Find the TC in feature doc Section 8 (Test Specifications)
2. Add `[DEPRECATED: {date} — {reason}]` to the TC title
3. Change `**Status:**` to `Deprecated`
4. Do NOT delete — keep for audit trail

## Section 8 (Test Specifications) Header Template

```markdown
## Test Specifications

> **For: QA Engineers, Developers**

### Test Summary

| Priority  | Count   | Automated | Manual |
|-----------|---------|-----------|--------|
| P0        | {n}     | {n}       | 0      |
| P1        | {n}     | {n}       | 0      |
| P2        | {n}     | {n}       | 0      |
| **Total** | **{N}** | **{N}**   | **0**  |
````

## Closing Reminders

- MUST ATTENTION keep this file canonical; update consumer skills only after this format changes.
- MUST ATTENTION every TC protects a named behavior, invariant, or regression path.
- MUST ATTENTION derive properties not just examples — probe the 6 Invariant Categories (idempotency, round-trip/inverse, commutativity, monotonicity, conservation, state-transition) for every [HARD] rule and §5 invariant; pair each universally-quantified property TC with a boundary counter-case.
- Under the strict default TC profile, MUST ATTENTION enforce one-to-many TC ↔ test cardinality: a business TC is covered by ≥1 test (often many, across components); the shared test-spec annotation (key `TestSpec`) is the join key. NEVER split/technicalize a TC for a 1:1 test map; NEVER flag many-tests-per-TC as a duplicate.
- MUST ATTENTION preserve evidence links and deprecated TC history for traceability.
- MUST ATTENTION emit evidence as stack-portable abstract anchors `[Source: namespace/service/id]` — never physical code coordinates or repository-root paths (taxonomy: Stack-portable evidence section above).
- NEVER replace specific assertions with smoke checks or existence-only checks.
