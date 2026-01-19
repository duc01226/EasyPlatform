---
id: TS-{YYMMDD}-{NNN}
feature: "{Feature name}"
source_pbi: "{PBI-XXXXXX-NNN}"
author: "{QA Engineer name}"
created: {YYYY-MM-DD}
updated: {YYYY-MM-DD}
status: draft | review | approved | executed
coverage: {percentage}
---

# Test Specification: {Feature Name}

## 1. Overview

### 1.1 Scope
<!-- What is being tested -->

### 1.2 Out of Scope
<!-- What is NOT being tested -->

### 1.3 Test Strategy
<!-- Approach: unit, integration, E2E, manual -->

### 1.4 Environment
| Environment | URL | Database |
|-------------|-----|----------|
| Dev | | |
| Staging | | |
| Prod | | |

---

## 2. Test Summary

| Category | Total | Pass | Fail | Blocked | Not Run |
|----------|-------|------|------|---------|---------|
| Functional | | | | | |
| Integration | | | | | |
| Edge Cases | | | | | |
| **Total** | | | | | |

---

## 3. Test Cases

### 3.1 Functional Tests

#### TC-{MOD}-001: {Test case title}
- **Priority:** P1 | P2 | P3
- **Type:** Positive | Negative | Boundary
- **Preconditions:** {Setup required}
- **Test Data:** {Data requirements}

**Steps:**
1. {Step 1}
2. {Step 2}
3. {Step 3}

**Expected Result:**
- {Expected outcome}

**Evidence:** `{FilePath}:{LineNumber}`

---

#### TC-{MOD}-002: {Test case title}
- **Priority:** P2
- **Type:** Negative
- **Preconditions:** {Setup required}

**Given:** {Precondition}
**When:** {Action}
**Then:** {Expected result}

**Evidence:** `{FilePath}:{LineNumber}`

---

### 3.2 Integration Tests

#### TC-{MOD}-101: {Cross-service test}
<!-- Integration test cases -->

---

### 3.3 Edge Cases

#### TC-{MOD}-201: {Edge case title}
<!-- Edge case test cases -->

---

## 4. Test Data Requirements

| Data Set | Description | Setup Method |
|----------|-------------|--------------|
| {Name} | {Description} | Seed / Manual / API |

---

## 5. Regression Impact

### Affected Areas
- [ ] {Module/Feature 1}
- [ ] {Module/Feature 2}

### Regression Test Suite
- Suite: `{SuiteName}`
- Location: `{path/to/tests}`

---

## 6. Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| QA Lead | | | Pending |
| Dev Lead | | | Pending |
| PO | | | Pending |

---
*To generate detailed test cases, run: `/test-cases {this-file}`*
