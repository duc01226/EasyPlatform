---
title: 'Canonical TC Format'
version: 1.0.0
last_reviewed: 2026-04-21
authority: tdd-spec
consumers: [feature-docs, tdd-spec, tdd-spec (sync mode)]
---

# Canonical TC Format

> **Single source of truth** for TC entry format. Referenced by: `feature-docs`, `tdd-spec`, `tdd-spec (sync mode)`.
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

**Evidence:** `[Source: {FilePath}:{LineRange}]` or `TBD (pre-implementation)`

**Related Files:**
| Layer | Type | File |
|----------|---------------|---------------------------------------------------------------------------------------|
| API | Controller/Endpoint | `{configured-source-path}/{module}/{api-layer-path}/{FeatureEndpointFile}` |
| App | Command/Query/Use Case | `{configured-source-path}/{module}/{application-layer-path}/{FeatureUseCaseFile}` |
| Domain | Entity/Model | `{configured-source-path}/{module}/{domain-layer-path}/{FeatureEntityFile}` |
| Test | Integration | `{configured-test-path}/{FeatureTestFile}` |

**IntegrationTest:** `{IntegrationTests}/{TestFile}.cs::{MethodName}` (or `Untested`)
**Status:** Tested | Untested | Planned
````

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

1. Check existing TC IDs in the feature doc's Section 15 first
2. Find the next free decade for the category
3. Mark deprecated TCs with a `[DEPRECATED]` suffix instead — never reuse a deprecated TC ID

## TC Category Sections

Organize TCs into named category sections. Minimum 3 categories required (query-only features exempt — see tdd-spec for exception rules):

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

1. Find the TC in feature doc Section 15
2. Add `[DEPRECATED: {date} — {reason}]` to the TC title
3. Change `**Status:**` to `Deprecated`
4. Do NOT delete — keep for audit trail
5. Note in Section 17 (Version History): "TC-{ID} deprecated"

## Section 15 Header Template

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
- MUST ATTENTION preserve evidence links and deprecated TC history for traceability.
- NEVER replace specific assertions with smoke checks or existence-only checks.
