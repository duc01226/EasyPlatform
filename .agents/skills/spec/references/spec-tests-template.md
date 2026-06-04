# TDD Spec Template — Feature Doc Section 8

> Template for test case entries in business feature docs Section 8.
> Used by: `$spec [mode=tests]` skill.
> TC format: `TC-{FEATURE}-{NNN}` (resolve feature codes from project config/reference docs).

## Quick Summary

**Goal:** Provide compact Section 8 templates that generate traceable, intent-guarding TCs.

**Workflow:**

1. **Header** — Create priority summary for generated/manual test coverage.
2. **TC Entry** — Capture objective, business intent/invariant, GWT steps, acceptance criteria, data, edge cases, evidence, and related files.
3. **Categories** — Group TCs by CRUD, validation, permissions, workflows, edge cases, **invariant/property**, preservation, and integration concerns.
4. **Evidence** — Start with `TBD (pre-implementation)` only in TDD-first mode; update after implementation.

**Key Rules:**

- MUST ATTENTION each TC names `Business Intent / Invariant Guarded`.
- MUST ATTENTION derive **properties, not just examples** — for each [HARD] §4 rule + §5 invariant, write ≥1 universally-quantified property TC ("for ALL inputs in {domain}, {invariant} holds") + ≥1 boundary counter-case; probe the 6 invariant classes in `.claude/skills/shared/tc-format.md` → "Invariant Categories to Probe".
- MUST ATTENTION preservation tests assert old healthy behavior before and after bugfixes.
- MUST ATTENTION evidence changes from `TBD` to `[Source: namespace/service/id]` (stack-portable abstract anchor — never physical code coordinates or repository-root paths) after implementation.
- NEVER let generated tests mirror implementation mechanics without guarding behavior.

---

## Section 8 Header

```markdown
## Test Specifications

> **For: QA Engineers, Developers**

### Test Summary

| Priority  | Count   | Automated | Manual |
| --------- | ------- | --------- | ------ |
| P0        | {n}     | {n}       | 0      |
| P1        | {n}     | {n}       | 0      |
| P2        | {n}     | {n}       | 0      |
| **Total** | **{N}** | **{N}**   | **0**  |
```

---

## Individual TC Entry

```markdown
#### TC-{FEATURE}-{NNN}: {Descriptive Test Name} [{Priority}]

**Objective:** {One sentence: what this test verifies and why it matters}

**Business Intent / Invariant Guarded:** {Business rule or invariant this TC protects; the TC must fail if this rule breaks}

**Preconditions:**

- {Required DB state, seeded data, or prior actions}

**Test Steps:**
\`\`\`gherkin
Given {initial context/state}
And {additional context if needed}
When {action performed}
And {additional action if needed}
Then {expected outcome}
And {additional verification}
\`\`\`

**Acceptance Criteria:**

- ✅ {Expected success behavior — what MUST ATTENTION happen}
- ❌ {Expected failure behavior — what MUST ATTENTION NOT happen}

**Test Data:**

_Example TC (single point) — one fixed input/output pair:_
\`\`\`json
{
"field": "validValue",
"invalidField": null
}
\`\`\`

_Property TC — a generator spec, not one example (declare the input DOMAIN + the invariant that must hold across it):_
\`\`\`yaml
inputDomain: "any valid order with 1..N line items and any non-negative amounts"
invariant: "sum(lineItem.amount) == order.total — for ALL inputs in the domain"
boundaryCounterCase: "amounts summing past the credit limit → order rejected, total unchanged"
\`\`\`

**Edge Cases:**

- {Boundary: empty collection, max length, null values}
- {Concurrency: simultaneous updates}
- {Cross-service: message bus timing}

**Transition Invariants (when the entity has lifecycle states — §5):**

- {for ALL legal transitions of {Entity}} → assert exact post-state field values (`Status = X`) + no orphan/side-effect downstream
- {for ALL illegal transitions of {Entity}} → assert the transition is rejected with the named failure + pre-state field values unchanged

**Evidence:** `[Source: namespace/service/id]` or `TBD (pre-implementation)`

**IntegrationTest:** `{configured-test-path}/{TestFile}::{MethodName}` (comma-separated on one line when several tests cover this TC), OR `TestSpec=TC-{FEATURE}-{NNN}`, OR `Untested`

**Related Files:**
| Layer | Type | File |
| ------ | ------------- | ------------------------------------------------------------------------------------- |
| API | Controller/Endpoint | `{configured-source-path}/{module}/{api-layer-path}/{FeatureEndpointFile}` |
| App | Command/Query/Use Case | `{configured-source-path}/{module}/{application-layer-path}/{FeatureUseCaseFile}` |
| Domain | Entity/Model | `{configured-source-path}/{module}/{domain-layer-path}/{FeatureEntityFile}` |
| Test | Integration | `{configured-test-path}/{FeatureTestFile}` |
```

---

## Category Sections

Organize TCs into categories. Minimum 5 categories (positive, negative/validation, permission, edge case, invariant/property):

````markdown
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

### Invariant / Property Tests (MANDATORY)

(Universally-quantified properties — "for ALL inputs in {domain}, {invariant} holds" — derived per [HARD] §4 rule + §5 invariant, each paired with a boundary counter-case. Probe the 6 classes — idempotency, round-trip/inverse, commutativity, monotonicity, conservation, state-transition — in `.claude/skills/shared/tc-format.md` → "Invariant Categories to Probe". A property TC names the input **domain**, not a single point; that is what separates it from an example TC.)

### Preservation Tests (MANDATORY for bugfix specs)

(Regression tests that verify PRE-EXISTING good behavior is UNCHANGED after the fix.)

**Authoring rule:** Write the test from the OLD code's semantics **BEFORE the fix lands**. The test MUST pass against pre-fix code AND post-fix code. If the fix changes behavior on the preserved input, the assertion fails → the fix has regressed a preserved invariant.

**Required template (GWT):**

```gherkin
Given {input state the CURRENT code handles correctly}
And {concrete preserved-state assertion — e.g., "ExternalId = X", "Status = Y"}
When {the fix-triggering operation runs}
Then {preserved state MUST match pre-fix snapshot — assert exact field values}
And {no orphan/side-effect created in downstream store}
```
````

**Trigger:** every bugfix spec MUST ATTENTION have ≥1 Preservation TC per "Healthy input" enumerated in the plan's Preservation Inventory (see `SYNC:preservation-inventory`).

### Integration Tests

(Cross-service message bus flows, event handler chains)

---

## Priority Definitions

| Priority          | Criteria                                                         | Example                                                |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| **P0 - Critical** | Core functionality, security, data integrity. Release blocker.   | Authentication, CRUD save, multi-tenant isolation      |
| **P1 - High**     | Important workflows, common user paths. Should not ship without. | Status transitions, email notifications, search/filter |
| **P2 - Medium**   | Secondary features, non-critical validation. Can defer.          | Sorting, pagination, bulk operations                   |
| **P3 - Low**      | UI polish, tooltips, preferences. Nice-to-have.                  | Theme, tooltip text, default sort order                |

---

## TDD-First Mode Notes

When generating TCs before implementation:

- Set `Evidence: TBD (pre-implementation)` — will be updated after coding
- Use descriptive command/entity names as placeholders in Related Files
- Focus on WHAT the behavior should be, not HOW it's implemented
- Prefer **properties over examples**: when a rule is universal ("for ALL valid amounts…"), write it as a property TC with a generator spec (input domain + invariant) rather than one hand-picked input
- After implementation, run `$spec [mode=tests]` to fill in evidence

## Closing Reminders

- MUST ATTENTION Section 8 TCs protect behavior and invariants, not implementation shape.
- MUST ATTENTION derive properties not just examples — each [HARD] §4 rule / §5 invariant gets a universally-quantified property TC (generator spec: input domain + invariant) plus a boundary counter-case; probe the 6 invariant classes in `tc-format.md`.
- MUST ATTENTION bugfix specs include preservation tests for pre-existing good behavior.
- MUST ATTENTION replace `TBD (pre-implementation)` with concrete evidence after implementation.
- NEVER ship Section 8 with untraceable TC intent or smoke-only acceptance criteria.
