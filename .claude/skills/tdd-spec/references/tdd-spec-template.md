# TDD Spec Template — Feature Doc Section 15

> Template for test case entries in business feature docs Section 15.
> Used by: `/tdd-spec` skill.
> TC format: `TC-{FEATURE}-{NNN}` (feature codes in `docs/project-reference/feature-docs-reference.md`).

---

## Section 15 Header

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
\`\`\`json
{
"field": "validValue",
"invalidField": null
}
\`\`\`

**Edge Cases:**

- {Boundary: empty collection, max length, null values}
- {Concurrency: simultaneous updates}
- {Cross-service: message bus timing}

**Evidence:** `{FilePath}:{LineRange}` or `TBD (pre-implementation)`

**Related Files:**
| Layer | Type | File |
| ------ | ------------- | ------------------------------------------------------------------------------------- |
| API | Controller | `src/Services/{service}/{Service}.Service/Controllers/{Feature}Controller.cs` |
| App | Command/Query | `src/Services/{service}/{Service}.Application/UseCaseCommands/{Feature}/{Command}.cs` |
| Domain | Entity | `src/Services/{service}/{Service}.Domain/Entities/{Feature}/{Entity}.cs` |
| Test | Integration | `src/Services/{service}/{Service}.IntegrationTests/{Feature}/{TestClass}.cs` |
```

---

## Category Sections

Organize TCs into categories. Minimum 3 categories:

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

```

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
- After implementation, run `/tdd-spec update` to fill in evidence
```
