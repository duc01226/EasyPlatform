# BDD Gherkin Templates

Standard GIVEN/WHEN/THEN templates for acceptance criteria and test cases.

---

## Test Case ID Format

```
TC-{MOD}-{NNN}

Examples:
TC-TXT-001    # TextSnippet test case
TC-EXP-015    # ExampleApp test case
TC-ACC-101    # Accounts integration test
TC-COM-201    # Common edge case
```

---

## Scenario Templates (Minimum 3 per story)

### 1. Happy Path (Positive)

```gherkin
Scenario: User successfully {completes action}
  Given {user has required permissions/state}
  And {required data exists}
  When user {performs valid action}
  Then {primary expected outcome}
  And {secondary verification if needed}
```

### 2. Edge Case (Boundary)

```gherkin
Scenario: System handles {boundary condition}
  Given {edge state: empty list, max items, zero value}
  When user {attempts action at boundary}
  Then {appropriate handling: pagination, warning, default}
```

### 3. Error Case (Negative)

```gherkin
Scenario: System prevents {invalid action}
  Given {precondition}
  When user {provides invalid input OR unauthorized action}
  Then error message "{specific error message}"
  And {system remains in valid state}
  And {no partial changes saved}
```

---

## Test Case Format

### Standard Format

```markdown
#### TC-{MOD}-{NNN}: {Descriptive title}
- **Priority:** P1 | P2 | P3
- **Type:** Positive | Negative | Boundary | Integration
- **Preconditions:** {Setup required}
- **Test Data:** {Data requirements}

**Steps:**
1. {Action step}
2. {Action step}
3. {Verification step}

**Expected Result:**
- {Observable outcome}

**Evidence:** `{FilePath}:{LineNumber}`
```

### Gherkin Format

```markdown
#### TC-{MOD}-{NNN}: {Title}
- **Priority:** P1
- **Type:** Positive

**Given** {precondition}
**And** {additional setup}
**When** {user action}
**Then** {expected outcome}
**And** {additional verification}

**Evidence:** `{FilePath}:{LineNumber}`
```

---

## Acceptance Criteria in PBIs

```markdown
**Acceptance Criteria:**

- [ ] AC-01: {Criterion with evidence reference}
- [ ] AC-02: {Criterion with evidence reference}

**Related Requirements:** FR-{MOD}-01, FR-{MOD}-02
```

---

## Evidence Requirements

Every test case MUST have code evidence:

```
{RelativeFilePath}:{LineNumber}
{RelativeFilePath}:{StartLine}-{EndLine}
```
