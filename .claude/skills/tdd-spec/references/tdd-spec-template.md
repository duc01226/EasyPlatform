# TDD Spec Template — Feature Doc Section 17

> Template for test case entries in business feature docs Section 17.
> Used by: `/tdd-spec` skill.
> TC format: `TC-{FEATURE}-{NNN}` (feature codes in `docs/project-reference/feature-docs-reference.md`).

---

## Section 17 Header

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
