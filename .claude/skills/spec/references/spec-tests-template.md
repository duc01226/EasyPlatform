# TDD Spec Template — Feature Doc Section 8

> Template for test case entries in business feature docs Section 8.
> Used by: `/spec [mode=tests]` skill.
> TC format: `TC-{FEATURE}-{NNN}` (resolve feature codes from project config/reference docs).

## Quick Summary

**Goal:** Provide compact Section 8 templates that generate traceable, intent-guarding TCs.

**Workflow:**

1. **Header** — Create priority summary for generated/manual test coverage.
2. **TC Entry** — Capture objective, business intent/invariant, real-world reachability, GWT steps, acceptance criteria, data, edge cases, evidence, and related files.
3. **Categories** — Group TCs by CRUD, validation, permissions, workflows, edge cases, **invariant/property**, preservation, and integration concerns.
4. **Evidence** — Start with `TBD (pre-implementation)` only in TDD-first mode; update after implementation.

**Key Rules:**

- MUST ATTENTION each TC names `Business Intent / Invariant Guarded`.
- MUST ATTENTION derive **properties, not just examples** — for each [HARD] §4 rule + §5 invariant, write ≥1 universally-quantified property TC ("for ALL inputs in {domain}, {invariant} holds") + ≥1 boundary counter-case; probe the 6 invariant classes in `.claude/skills/shared/tc-format.md` → "Invariant Categories to Probe".
- MUST ATTENTION each TC fills `Real-World Reachability` — the prior actor actions that produce its Preconditions, plus the realistic gap between consecutive actor actions; a TC that intentionally builds an unreachable state fills `Deliberate Impossible State` instead of leaving it unexplained.
- MUST ATTENTION preservation tests assert old healthy behavior before and after bugfixes.
- MUST ATTENTION evidence changes from `TBD` to `[Source: namespace/service/id]` (stack-portable abstract anchor — never physical code coordinates or repository-root paths) after implementation.
- NEVER let generated tests mirror implementation mechanics without guarding behavior.

---

## Contents

- [Quick Summary](#quick-summary)
- [Section 8 Header](#section-8-header)
- [Individual TC Entry](#individual-tc-entry)
- [Category Sections](#category-sections)
- [Priority Definitions](#priority-definitions)
- [TDD-First Mode Notes](#tdd-first-mode-notes)
- [Closing Reminders](#closing-reminders)

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

- {State a user or QC could arrange before the demo — e.g. "a published job opening with 3 applicants". NEVER storage setup ("a row in X", "a seeded document") — that is architecture, and it does not survive re-implementation.}

**Real-World Reachability:** {how production actually reaches the Preconditions above — which actor performs which prior action, in what order, and the realistic elapsed gap between consecutive actor actions (e.g. "a reviewer opens the record minutes after the applicant submits it"). "The data is simply there" is not reachability. Two distinct actor actions with no stated gap get generated as a back-to-back call, which manufactures a race production never has — so "instantaneous" is a claim to justify, never a default.}

**Deliberate Impossible State (only when this TC intentionally constructs a state production should never reach):** {WHY that state is reachable at all — upstream defect, partial write, legacy/migrated data, external-system fault — and which repair or fail-safe behaviour the TC proves. Omit this field entirely for ordinary TCs; unlabelled, an unreachable setup is indistinguishable from a mis-specified one.}

**Demo Flow:** {the actions a real user or QC performs, in order — this TC must be demoable}
\`\`\`gherkin
Given {state a user could arrange}
And {additional context if needed}
When {an action a user could take}
And {additional action if needed}
Then {an outcome a user could SEE}
And {additional visible verification}
\`\`\`

> **[HARD] The demo test.** Every `Given` must be state a user could arrange, every `When` an action a user could
> take, every `Then` an outcome a user could see. If the `When` is "the consumer receives the event" or the `Then`
> is "the projection row is written", **this is not a business TC** — it belongs in the technical spec tree
> (`specRoots.technical`), NOT here. Ask: **what would the stakeholder SEE change? No answer → TECHNICAL-ONLY.**

**Expected Result:** {what the demo SHOWS — fill every dimension that applies; omit with a reason, never silently}

| Dimension | What to state |
| --- | --- |
| **UI** | What the user sees on screen — the control, message, or view that changes |
| **System behavior** | What the system does in response, in business terms |
| **Business data state** | What is now true about the business — in business language, NEVER storage language ("the application is withdrawn", not "Status = 3") |
| **Data shown on UI** | What the user reads back — the values displayed, and where |

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
- {Competing users: simultaneous business actions and what each user sees}
- {External business timing: delayed external outcome and what the user can verify}

**Transition Invariants (when the entity has lifecycle states — §5):**

- {for ALL legal transitions of {Entity}} → assert the exact post-state business facts visible to a user or QC
- {for ALL illegal transitions of {Entity}} → assert the transition is rejected with the named failure + pre-state field values unchanged

**Evidence:** `[Source: namespace/service/id]` or `TBD (pre-implementation)`. Use `{configured-source-path}` only while investigating source evidence; keep the emitted TC evidence as the stack-portable `[Source: ...]` anchor.

**CoveredBy:** `{configured-test-path}/{TestFile}::{MethodName}` (comma-separated on one line when several tests cover this TC), OR `TestSpec=TC-{FEATURE}-{NNN}`, OR `Manual-QC`, OR `Untested`

**Related Behaviors:**
| Capability | Anchor |
| ------ | ------------- |
| Business operation | `[Source: operation/{service}/{Feature}]` |
| Business rule | `[Source: rule/{service}/{RuleId}]` |
| Domain concept | `[Source: component/{service}/{Feature}]` |
| Coverage | `TestSpec=TC-{FEATURE}-{NNN}` or `Manual-QC` |
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

### Business Workflow Tests

(Multi-step user or QC-demoable processes and state transitions)

### Business Edge Case Tests

(Boundary conditions, competing user actions, and business timing edges visible in the product)

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
And {no hidden downstream business state changes outside the expected outcome}
```
````

**Trigger:** every **BUSINESS-VISIBLE** bugfix spec MUST have ≥1 Preservation TC per "Healthy input" enumerated in the plan's Preservation Inventory (see `SYNC:preservation-inventory`).

⚠️ **[GATE] A TECHNICAL-ONLY bugfix produces ZERO Preservation TCs in the business spec.** Run the business-visibility gate first (`author.md` → *"Business-visibility gate"*): if the business rule, the user-visible outcome, and the business data state are all unchanged, this section is a **correct no-op** — the preservation obligation is real but belongs to the **technical** spec tree and its integration tests, not to a business spec.

**Preservation TCs in a business spec must be demoable business outcomes** — *"the employee's approved leave balance still reads 12 days after the fix"* — never *"the consumer still writes the projection row"*. If the preserved state can only be observed by inspecting a queue, projection, or database row no user-facing behavior depends on, it is a technical preservation test and does not belong here.

### External Outcome Tests

(Business outcomes that cross product boundaries and remain demoable without inspecting architecture)

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
- After implementation, run `/spec [mode=tests]` to fill in evidence
- Fill `Real-World Reachability` from the intended actor journey, not from the future test harness — a TC written before the code is the cheapest place to catch an impossible sequence

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

## Closing Reminders

- MUST ATTENTION Section 8 TCs protect behavior and invariants, not implementation shape.
- MUST ATTENTION derive properties not just examples — each [HARD] §4 rule / §5 invariant gets a universally-quantified property TC (generator spec: input domain + invariant) plus a boundary counter-case; probe the 6 invariant classes in `tc-format.md`.
- MUST ATTENTION every TC states `Real-World Reachability` — the actor path that produces its Preconditions and the realistic gap between consecutive actor actions; an intentionally unreachable setup is declared in `Deliberate Impossible State`, never left silent.
- MUST ATTENTION bugfix specs include preservation tests for pre-existing good behavior.
- MUST ATTENTION replace `TBD (pre-implementation)` with concrete evidence after implementation.
- NEVER ship Section 8 with untraceable TC intent or smoke-only acceptance criteria.
- NEVER specify a scenario production could never reach — an impossible sequence in the spec guarantees an unrealistic test, and its failures get reported as product defects.
