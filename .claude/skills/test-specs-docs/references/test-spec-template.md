# Test Specification Template & Examples

## Module Test Spec Template (README.md)

Reference: Search for existing test spec files in `docs/test-specs/{Module}/README.md`

```markdown
# {Module} - Comprehensive Test Specifications

**Module**: {Module} ([Description])
**Generated**: {Date}
**Coverage**: [Feature list]

---

## Table of Contents

1. [Feature 1 Test Specs](#1-feature-1-test-specs)
2. [Feature 2 Test Specs](#2-feature-2-test-specs)
...

---

## 1. [Feature Name] Test Specs

### 1.1 [Sub-Feature] Tests

#### TC-{MOD}-{FEAT}-001: [Descriptive Test Name]

**Priority**: P0-Critical | P1-High | P2-Medium | P3-Low

**Preconditions**:
- User has `{Policy}` authorization
- Company has active {Feature} subscription
- [Other setup requirements]

**Test Steps** (Given-When-Then):
```gherkin
Given [initial context/state]
  And [additional context if needed]
When [action performed]
  And [additional action if needed]
Then [expected outcome]
  And [additional verification]
```

**Acceptance Criteria**:
- Success: [Expected success behavior]
- Success: [Another success case]
- Failure: [Expected failure behavior]
- Failure: [Another failure case]

**Test Data**:
```json
{
  "field": "value",
  "required": true
}
```

**Edge Cases**:
- Failure: [Boundary condition 1] -> [Expected error]
- Failure: [Boundary condition 2] -> [Expected error]
- Success: [Edge case that should succeed] -> Success

**Evidence**:

- **Controller**: `{Module}.Service/Controllers/{Controller}.cs:L{lines}`
  - Authorization: `{Policies}`
  - Endpoint: `{Method} /api/{path}`

- **Command Handler**: `{Module}.Application/UseCaseCommands/{Feature}/{Command}.cs:L{lines}`

<details>
<summary>Code Snippet: [Key Logic Description]</summary>

```csharp
// {File}:L{lines}
[actual code snippet]
```
</details>

**Related Files**:

| Layer    | Type       | File Path                                                                           |
| -------- | ---------- | ----------------------------------------------------------------------------------- |
| Backend  | Controller | `src/Services/{Module}/{Module}.Service/Controllers/{Controller}.cs`                |
| Backend  | Command    | `src/Services/{Module}/{Module}.Application/UseCaseCommands/{Feature}/{Command}.cs` |
| Backend  | Entity     | `src/Services/{Module}/{Module}.Domain/Entities/{Entity}.cs`                        |
| Frontend | Component  | `{frontend-apps-dir}/{app-name}/src/app/{feature}/{component}.ts`                   |

---

#### TC-{MOD}-{FEAT}-002: [Next Test Name]

[Continue with same format...]

---

## Cross-Module Integration Tests

See [INTEGRATION-TESTS.md](../INTEGRATION-TESTS.md) for cross-module scenarios.

---

## Related Documentation

- **Business Features**: [docs/business-features/{Module}/README.md](../../business-features/{Module}/README.md)
- **Backend Patterns**: [docs/backend-patterns-reference.md](../../claude/backend-patterns-reference.md)

---

**Last Updated**: {Date}
```

---

## Given-When-Then Best Practices

```gherkin
# GOOD - Specific and actionable
Given user is authenticated with EmployeePolicy role
  And company subscription includes Goal feature
  And goal creation form is displayed
When user fills required fields:
  - Title: "Reduce churn by 15%"
  - GoalType: "Smart"
  - TargetDate: "2025-12-31"
  And user clicks Submit
Then goal is created with status "Draft"
  And success notification is displayed
  And goal appears in dashboard list

# BAD - Vague and unmeasurable
Given user is logged in
When user creates a goal
Then it works
```

### Acceptance Criteria Format

```markdown
**Acceptance Criteria**:
- Success: Form validates all required fields (Title, GoalType, TargetDate)
- Success: Backend creates Goal entity in database
- Success: Goal assigned to current employee as owner
- Success: Notification event triggered via entity event handler
- Failure: External users cannot create goals (returns validation error)
- Failure: Missing required fields shows validation error
- Failure: Invalid date range shows "Target date must be after start date"
```

---

## Evidence Requirements

Every test case MUST include:
1. **Controller reference**: File path + line numbers + authorization policies
2. **Handler/Command reference**: File path + line numbers for business logic
3. **Code snippet**: Actual code in `<details>` block for key validation/logic
4. **Related files table**: All relevant source files

---

## Complete Example: Feature Test Case

```markdown
#### TC-{MOD}-{FEAT}-001: Execute Feature Action Successfully

**Priority**: P1-High

**Preconditions**:
- User has required authorization policy
- Company has feature enabled
- User has remaining quota/permission for current period
- Target entity is active

**Test Steps** (Given-When-Then):
```gherkin
Given user is authenticated with required role
  And company has feature enabled
  And user has required permissions
  And target entity is in valid state
When user performs the action
  And user provides required input data
  And user confirms the action
Then transaction is created
  And state is updated correctly
  And notification is sent
  And result appears in list/feed
  And confirmation message displayed to user
```

**Acceptance Criteria**:
- Success: Transaction created with all required fields
- Success: State updated correctly (e.g., counters, status)
- Success: Notification sent via message bus
- Success: Result visible in appropriate view
- Failure: Invalid target returns validation error
- Failure: Exceeded quota returns limit error
- Failure: Inactive target returns "not found" error
- Failure: Cross-boundary violation returns authorization error

**Test Data**:
```json
{
  "targetEntityId": "entity-12345",
  "actionType": "TypeA",
  "message": "Test action message",
  "additionalFlag": false
}
```

**Edge Cases**:
- Failure: Empty required field -> Validation error
- Failure: Field exceeds max length -> Validation error
- Success: Field with special characters -> Success
- Failure: Invalid enum value -> Validation error

**Evidence**:

- **Controller**: `{Service}.Service/Controllers/{Feature}Controller.cs:L{lines}`
  - Authorization: `{Policy}`
  - Endpoint: `POST /api/{Feature}/{action}`

- **Command Handler**: `{Service}.Application/UseCaseCommands/{Feature}/{Command}.cs:L{lines}`

<details>
<summary>Code Snippet: Validation Logic</summary>

```csharp
// {CommandHandler}.cs:L{lines}
return await requestSelfValidation
    .AndNotAsync(
        r => repository.AnyAsync(e =>
            e.OwnerId == RequestContext.CurrentUserId()
            && e.QuotaRemaining <= 0),
        "Quota exceeded for this period"
    );
```
</details>

**Related Files**:

| Layer    | Type       | File Path                                                                                |
| -------- | ---------- | ---------------------------------------------------------------------------------------- |
| Backend  | Controller | `src/Services/{ServiceDir}/{Service}.Service/Controllers/{Feature}Controller.cs`         |
| Backend  | Command    | `src/Services/{ServiceDir}/{Service}.Application/UseCaseCommands/{Feature}/{Command}.cs` |
| Backend  | Entity     | `src/Services/{ServiceDir}/{Service}.Domain/Entities/{Feature}/{Entity}.cs`              |
| Frontend | Component  | `{frontend-apps-dir}/{app-name}/src/app/{feature}/{action}/{action}.component.ts`        |
```
