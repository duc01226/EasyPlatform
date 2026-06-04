---
title: 'Canonical TC Format'
version: 1.2.0
last_reviewed: 2026-06-12
authority: spec [mode=tests]
consumers: [spec, spec [mode=tests], spec [mode=sync], integration-test, integration-test-review, review-artifact]
---

# Canonical TC Format

> **Single source of truth** for TC entry format. Referenced by: `spec`, `spec [mode=tests]`, `spec [mode=sync]`.
> To update TC format: edit THIS file only, then update all consumer skills to reflect the change.

## Quick Summary

**Goal:** Keep TC entries consistent, traceable, and reusable across feature docs, TDD specs, and sync mode.

**Workflow:**

1. **Author** — Write each TC with objective, preconditions, GWT steps, acceptance criteria, data, edge cases, evidence, and related files.
2. **Trace** — Link every TC to code/test evidence or mark `TBD (pre-implementation)`.
3. **Preserve** — For bugfixes, add preservation TCs before changing code semantics.
4. **Deprecate** — Mark removed behavior as deprecated; never delete historical TCs.

**Key Rules:**

- MUST ATTENTION preserve `TC-{FEATURE}-{NNN}` identity and evidence fields.
- MUST ATTENTION state business intent/invariant so generated tests fail when protected behavior breaks.
- MUST ATTENTION use preservation TCs for every healthy input that must remain unchanged after a bugfix.
- MUST ATTENTION keep cardinality **one TC → many tests**: a single business TC may be covered by many integration/unit tests across components and services (join key = the shared **test-spec annotation** carrying the TC ID, expressed in the configured test framework's syntax). NEVER split or technicalize a TC to force a 1:1 map to one test method (see [TC ↔ Test Code Cardinality](#tc--test-code-cardinality-one-to-many)).
- NEVER delete deprecated TCs; keep audit trail and version history.

## TC Entry Format

````markdown
#### TC-{FEATURE}-{NNN}: {Descriptive Test Name} [P{0-3}]

**Objective:** {One sentence: what this test verifies and why it matters}

**Business Intent / Invariant Guarded:** {Business rule, invariant, or user promise this TC protects; the TC must fail if it breaks}

**Preconditions:**

- {Required DB state, seeded data, or prior actions}

**Test Steps:**

```gherkin
Given {initial context/state}
And {additional context if needed}
When {action performed}
And {additional action if needed}
Then {expected outcome}
And {additional verification}
```

**Acceptance Criteria:**

- ✅ {Expected success behavior — what MUST happen}
- ❌ {Expected failure behavior — what MUST NOT happen}

**Test Data:**

```json
{
    "field": "validValue",
    "invalidField": null
}
```

**Edge Cases:**

- {Boundary: empty collection, max length, null values} → {expected behavior}
- {Concurrency: simultaneous updates} → {expected behavior}
- {Cross-service: message bus timing} → {expected behavior}

**Evidence:** `[Source: {namespace}/{service}/{id}]` or `TBD (pre-implementation)`

**Related Behaviors:**
| Capability | Anchor |
|------------|----------------------------------|
| API surface | `operation/{service}/{Feature}` |
| Use case (command/query) | `operation/{service}/{Feature}` |
| Domain model | `component/{service}/{Feature}` |
| Test | `test/{service}/{Feature}` |

**IntegrationTest:** one or more covering tests for the configured test environment — `{configured-test-path}/{TestFile}::{MethodName}` (comma-separated **on one line** when several tests cover this TC), OR a test-filter expression that selects every test annotated with this TC (e.g. `TestSpec=TC-{FEATURE}-{NNN}`), OR `Untested`
**Status:** Tested | Untested | Planned
````

> **Stack-portable evidence (M2/M3/M5).** `Evidence` and `Related Behaviors` carriers use **abstract anchors**
> `[Source: namespace/service/id]` — never donor physical code coordinates or repository-root paths. Namespace ∈
> `operation | event | component | schema | requirement | rule | constraint | test`; service = the owning
> module/service (lowercased); id = the artifact concept with code suffixes stripped. Physical coordinates
> are recoverable only through the provenance sidecar. This section is the canonical anchor-taxonomy contract.
>
> **`IntegrationTest` is the one exception** — it is operational QA glue (a traceability link to the actual
> executable test(s), consumed by the `integration-test` skill and surfaced in the §8 TC's `IntegrationTest` field). It stays a physical
> test-file + test-method link (`{TestFile}::{MethodName}`, in the configured test layout), is exempt from the prose gate, and is
> regenerated per-stack on rebuild. The field is
> **representative, not exhaustive** — it may list several covering tests, but the authoritative complete set is whatever
> carries the TC's test-spec annotation in code (see [TC ↔ Test Code Cardinality](#tc--test-code-cardinality-one-to-many)).
>
> **Configurable roots (never donor paths).** When physical coordinates are emitted on rebuild, root them at the
> project-configured roots — `{configured-source-path}` for source/evidence and `{configured-test-path}` for
> executable tests — resolved from `docs/project-config.json`. Never hardcode a donor repository's service-layout paths.

## TC ↔ Test Code Cardinality (One-to-Many)

> **A Section 8 TC is a business / user-story acceptance scenario — not a unit of code.** It is written tech-agnostic
> (M1/M2/M5) and is verified by **one OR MANY** test methods. This section is the canonical cardinality contract; all
> consumer skills (`spec [mode=tests]`, `spec`, `integration-test`, `integration-test-review`, `review-artifact`) defer to it.

**The rule (authoritative):**

- **One TC → many tests.** A single `TC-{FEATURE}-{NNN}` MAY be covered by many test methods — integration tests, unit tests, across multiple components / services / layers. Every covering test carries the **same test-spec annotation** — key `TestSpec`, value `TC-{FEATURE}-{NNN}` — expressed in the configured test framework's syntax. That annotation is the **join key**; the cardinality of the join is **1 TC : N tests**.
- **Coverage = ≥1.** A TC is `Tested` when **at least one** test carrying its annotation exists and passes. A TC does NOT need a dedicated, name-matching, or single-purpose test method.
- **`IntegrationTest` field is representative.** It lists one or more covering tests (or a test-filter expression). Never assume it enumerates every covering test — the complete set is whatever carries the test-spec annotation in code.
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
| 031–039   | Events / Background jobs (P1-P2)     |
| 041–049   | Cross-service / Integration (P1-P2)  |
| 051–059   | Edge cases / Error scenarios (P2-P3) |
| 061–069   | UI / User journey flows (P2-P3)      |
| 071–099   | Reserved for feature-specific groups |

**Collision prevention:**

1. Check existing TC IDs in the feature doc's Section 8 (Test Specifications) first
2. Find the next free decade for the category
3. Mark deprecated TCs with a `[DEPRECATED]` suffix instead — never reuse a deprecated TC ID

## TC Category Sections

Organize TCs into named category sections. Minimum 3 categories required (query-only features exempt — see spec [mode=tests] for exception rules):

```markdown
### CRUD Tests

(Create, Read, Update, Delete — happy path operations)

### Validation Tests

(Input validation, business rule enforcement, error responses)

### Permission Tests

(Role-based access, cross-tenant isolation, authorization checks)

### Workflow Tests

(Multi-step processes, state transitions, event handler side effects)

### Edge Case Tests

(Boundary conditions, concurrent operations, data migration scenarios)

### Integration Tests

(Cross-service message bus flows, event handler chains)
```

## Preservation Tests (Bugfix Context)

When writing TCs for a bugfix, add a Preservation Tests section **before** the new failure TCs:

````markdown
### Preservation Tests

> These TCs verify pre-existing correct behavior that the fix must not regress.

#### TC-{FEATURE}-{NNN}: {Existing Behavior Name} [P{0-3}]

**Objective:** Verify that {pre-existing behavior} is unchanged after the fix.

**Business Intent / Invariant Guarded:** {Healthy behavior or invariant that must stay true before and after the bugfix}

**Test Steps:**

```gherkin
Given {input state the CURRENT code handles correctly}
And {concrete preserved-state assertion — e.g., "ExternalId = X", "Status = Y"}
When {the fix-triggering operation runs}
Then {preserved state MUST match pre-fix snapshot — assert exact field values}
And {no orphan/side-effect created in downstream store}
```
````

````

**Trigger:** Every bugfix spec MUST have ≥1 Preservation TC per "Healthy input" enumerated in the plan's Preservation Inventory.

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
- MUST ATTENTION enforce one-to-many TC ↔ test cardinality: a business TC is covered by ≥1 test (often many, across components); the shared test-spec annotation (key `TestSpec`) is the join key. NEVER split/technicalize a TC for a 1:1 test map; NEVER flag many-tests-per-TC as a duplicate.
- MUST ATTENTION preserve evidence links and deprecated TC history for traceability.
- MUST ATTENTION emit evidence as stack-portable abstract anchors `[Source: namespace/service/id]` — never physical code coordinates or repository-root paths (taxonomy: Stack-portable evidence section above).
- NEVER replace specific assertions with smoke checks or existence-only checks.
