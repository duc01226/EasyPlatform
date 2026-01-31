# QA Engineer Guide

> **Complete guide for QA Engineers using Claude Code to create test specifications, generate test cases, and ensure quality coverage.**

---

## Quick Start

```bash
# Create test specification from PBI
/team-test-spec team-artifacts/pbis/260119-ba-pbi-biometric-auth.md

# Generate detailed test cases
/team-test-cases team-artifacts/team-test-specs/260119-qa-testspec-biometric-auth.md
```

**Output Location:** `team-artifacts/team-test-specs/`
**Naming Pattern:** `{YYMMDD}-qa-testspec-{slug}.md` or `{YYMMDD}-qa-testcases-{slug}.md`

---

## Your Role in the Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    TESTING WORKFLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   BA ──/refine──> PBI ──> [YOU] ──/team-test-spec──> Dev         │
│                              │                               │
│                              └──/team-test-cases──> Test Suite    │
│                                                   │          │
│                                              QC ──/team-quality-gate
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Your Responsibilities

| Task | Command | Output |
|------|---------|--------|
| Create test specs | `/team-test-spec` | `team-artifacts/team-test-specs/*-testspec-*.md` |
| Generate test cases | `/team-test-cases` | `team-artifacts/team-test-specs/*-testcases-*.md` |
| Map to acceptance criteria | Manual | Coverage matrix |
| Record evidence | Manual | `file:line` format |

---

## Commands

### `/team-test-spec` - Generate Test Specification

**Purpose:** Create comprehensive test specification from PBI/user story acceptance criteria.

#### Basic Usage

```bash
# From PBI
/team-test-spec team-artifacts/pbis/260119-ba-pbi-biometric-auth.md

# From user story
/team-test-spec team-artifacts/pbis/stories/260119-ba-story-face-id.md

# With coverage focus
/team-test-spec PBI-260119-001 --focus "security,edge-cases"

# For regression suite
/team-test-spec PBI-260119-001 --type regression
```

#### What Claude Generates

```markdown
---
id: TS-260119-001
feature: "Biometric Authentication"
source_pbi: PBI-260119-001
author: "QA Engineer"
created: 2026-01-19
coverage: 95%
status: draft
---

## Overview
Test specification for biometric authentication feature covering Face ID and fingerprint login.

## Scope
### In Scope
- Face ID authentication flow
- Fingerprint authentication flow
- Fallback to password
- Settings management

### Out of Scope
- Third-party authentication
- Desktop biometrics

## Test Environment
- iOS 15+ devices with Face ID
- iOS 15+ devices with Touch ID
- iOS Simulator (limited biometric testing)

## Test Data Requirements
- Test user accounts (5+)
- Devices with biometric enrolled
- Devices without biometric

## Coverage Matrix

| Acceptance Criteria | Test Cases | Status |
|---------------------|------------|--------|
| AC-001: Face ID Login | TC-AUTH-001, TC-AUTH-002 | Pending |
| AC-002: Fingerprint Login | TC-AUTH-003, TC-AUTH-004 | Pending |
| AC-003: Fallback | TC-AUTH-005, TC-AUTH-006 | Pending |

## Test Summary
| Type | Count | Automated | Manual |
|------|-------|-----------|--------|
| Positive | 6 | 4 | 2 |
| Negative | 4 | 2 | 2 |
| Edge Case | 3 | 1 | 2 |
| Security | 2 | 0 | 2 |
| **Total** | **15** | **7** | **8** |
```

---

### `/team-test-cases` - Generate Detailed Test Cases

**Purpose:** Create step-by-step test cases with expected results and evidence fields.

#### Basic Usage

```bash
# From test spec
/team-test-cases team-artifacts/team-test-specs/260119-qa-testspec-biometric-auth.md

# With specific types
/team-test-cases TS-260119-001 --types "positive,negative,boundary"

# For automation
/team-test-cases TS-260119-001 --format automation
```

#### What Claude Generates

```markdown
---
id: TC-260119-001
parent_spec: TS-260119-001
feature: "Biometric Authentication"
created: 2026-01-19
---

## Test Cases

### TC-AUTH-001: Face ID Login - Happy Path
**Priority:** Critical
**Type:** Positive
**Automation:** Candidate
**Covers:** AC-001

#### Preconditions
- User has active account
- Face ID enabled on device
- Biometric login enabled in app settings
- App not currently logged in

#### Test Steps

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Launch the app | Splash screen appears | | |
| 2 | Wait for Face ID prompt | Face ID dialog appears within 500ms | | |
| 3 | Complete Face ID scan | Scan succeeds | | |
| 4 | Verify login | Dashboard screen appears within 2s | | |
| 5 | Verify user session | User name displayed in header | | |

#### Test Data
- Username: testuser@example.com
- Face ID: Enrolled on device

#### Evidence
- **Code:** `src/auth/biometric.service.ts:45`
- **API:** `POST /api/auth/biometric`
- **Screenshot:** [attach on execution]

#### Notes
- Cannot fully automate - requires physical device or mock
- Use BiometricPrompt mock for CI pipeline

---

### TC-AUTH-002: Face ID Login - First Time Setup
**Priority:** High
**Type:** Positive
**Automation:** Candidate
**Covers:** AC-001

#### Preconditions
- User logged in with password
- Face ID enabled on device
- Biometric login NOT yet enabled in app

#### Test Steps

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Navigate to Settings | Settings screen appears | | |
| 2 | Tap "Enable Face ID" | System Face ID prompt appears | | |
| 3 | Complete Face ID scan | Success message shown | | |
| 4 | Verify setting saved | Toggle shows "enabled" | | |
| 5 | Log out | Login screen appears | | |
| 6 | Relaunch app | Face ID prompt appears | | |

---

### TC-AUTH-003: Face ID Fails - Fallback to Password
**Priority:** High
**Type:** Negative
**Automation:** Partial
**Covers:** AC-003

#### Preconditions
- Biometric login enabled
- Face ID will fail (use wrong face or mock failure)

#### Test Steps

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Launch app | Face ID prompt appears | | |
| 2 | Fail Face ID (attempt 1) | "Try again" message | | |
| 3 | Fail Face ID (attempt 2) | "Try again" message | | |
| 4 | Fail Face ID (attempt 3) | "Try again" message | | |
| 5 | Fail Face ID (attempt 4) | Password screen appears | | |
| 6 | Verify message | "Please enter your password" shown | | |

#### Evidence
- **Code:** `src/auth/biometric.service.ts:78`
- **Error handling:** `BiometricError.maxAttempts`
```

---

## Test Case ID Format

### Standard Format
```
TC-{MODULE}-{NUMBER}
```

### Examples
| ID | Module | Description |
|----|--------|-------------|
| TC-AUTH-001 | Authentication | Login tests |
| TC-CART-015 | Shopping Cart | Cart operations |
| TC-PAY-003 | Payments | Payment processing |
| TC-USR-042 | User Management | Profile tests |
| TC-SRCH-007 | Search | Search functionality |

### Module Codes
| Code | Module |
|------|--------|
| AUTH | Authentication |
| USR | User Management |
| CART | Shopping Cart |
| PAY | Payments |
| SRCH | Search |
| NOTIF | Notifications |
| ADMIN | Administration |
| RPT | Reporting |

---

## Evidence Format

### Required Evidence Fields

Every test case must include evidence linking to code:

```markdown
#### Evidence
- **Code:** `src/path/to/file.ts:lineNumber`
- **API:** `METHOD /api/endpoint`
- **Component:** `ComponentName.tsx:lineNumber`
- **Test:** `spec/file.spec.ts:lineNumber`
```

### Good Evidence Examples

```markdown
#### Evidence
- **Code:** `src/auth/biometric.service.ts:45-67`
- **API:** `POST /api/v1/auth/biometric/verify`
- **Component:** `LoginScreen.tsx:123`
- **E2E Test:** `e2e/auth/biometric.spec.ts:34`
- **Unit Test:** `src/auth/__tests__/biometric.test.ts:89`
```

### Finding Evidence

```bash
# Search for implementation
/scout "biometric authentication implementation"

# Find specific function
grep -n "authenticateWithBiometric" src/

# Find API endpoint
grep -rn "biometric" src/api/
```

---

## Coverage Types

### Test Type Distribution

| Type | Purpose | Target % |
|------|---------|----------|
| **Positive** | Happy path, expected behavior | 40% |
| **Negative** | Error handling, invalid input | 30% |
| **Edge Case** | Boundary conditions, unusual scenarios | 15% |
| **Security** | Authentication, authorization, injection | 10% |
| **Performance** | Load, response time, resource usage | 5% |

### Coverage Matrix Template

```markdown
## Coverage Matrix

| Acceptance Criteria | Positive | Negative | Edge | Security | Total |
|---------------------|----------|----------|------|----------|-------|
| AC-001: Face ID | 2 | 2 | 1 | 1 | 6 |
| AC-002: Fingerprint | 2 | 2 | 1 | 1 | 6 |
| AC-003: Fallback | 1 | 2 | 1 | 0 | 4 |
| **Total** | **5** | **6** | **3** | **2** | **16** |

**Coverage:** 100% of acceptance criteria covered
```

---

## Real-World Examples

### Example 1: E-commerce Search

**PBI:** "Improve product search with filters"

```markdown
### TC-SRCH-001: Search with Single Filter
**Priority:** Critical
**Type:** Positive

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter "shoes" in search | Results page loads |
| 2 | Select filter "Size: 10" | Results update |
| 3 | Verify results | All products are size 10 |
| 4 | Check count | "X results for 'shoes' in Size 10" |

**Evidence:** `src/search/filters.service.ts:56`

---

### TC-SRCH-002: Search with No Results
**Priority:** High
**Type:** Negative

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter "xyznonexistent" | Search executes |
| 2 | Verify empty state | "No results found" message |
| 3 | Check suggestions | "Try: shoes, boots, sandals" shown |

**Evidence:** `src/search/empty-state.component.ts:23`

---

### TC-SRCH-003: Search with Special Characters
**Priority:** Medium
**Type:** Edge Case

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter "café" | Search executes |
| 2 | Verify results include | "Café Blend Coffee" appears |
| 3 | Enter "shoes & boots" | Search handles ampersand |
| 4 | Enter "<script>" | Input sanitized, no XSS |

**Evidence:** `src/search/sanitize.util.ts:12`
```

### Example 2: Payment Processing

```markdown
### TC-PAY-001: Successful Credit Card Payment
**Priority:** Critical
**Type:** Positive
**Automation:** Full

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add item to cart | Cart total: $99.99 |
| 2 | Proceed to checkout | Payment form appears |
| 3 | Enter valid card (4111...) | Card validated |
| 4 | Submit payment | Processing spinner shown |
| 5 | Verify success | "Order confirmed" page |
| 6 | Check email | Confirmation email received |

**Evidence:**
- `src/payments/stripe.service.ts:89`
- `POST /api/payments/charge`

---

### TC-PAY-002: Declined Card
**Priority:** Critical
**Type:** Negative

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter declined card (4000..0002) | Card accepted for input |
| 2 | Submit payment | Processing spinner shown |
| 3 | Verify decline | Error: "Card declined" |
| 4 | Check form state | Form still editable |
| 5 | Verify no charge | No transaction created |

**Evidence:** `src/payments/error-handler.ts:34`

---

### TC-PAY-003: Payment Timeout
**Priority:** High
**Type:** Edge Case

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Simulate slow network | Throttle to 2G |
| 2 | Submit payment | Processing spinner shown |
| 3 | Wait 30 seconds | Timeout error appears |
| 4 | Verify message | "Payment timed out. Please try again." |
| 5 | Check idempotency | No duplicate charges |

**Evidence:** `src/payments/timeout.config.ts:8`
```

---

## Working with Other Roles

### ← From Business Analyst

**Receiving PBIs:**
1. Check `team-artifacts/pbis/` for new PBIs
2. Verify acceptance criteria are in GIVEN/WHEN/THEN format
3. Flag any missing scenarios

**Quality Check:**
- [ ] All acceptance criteria have clear preconditions
- [ ] WHEN describes testable actions
- [ ] THEN has measurable outcomes
- [ ] Edge cases are documented

### → To QC Specialist

**Handoff for Quality Gate:**
```bash
# When test spec is complete
# QC can run quality gate

/team-quality-gate pre-qa PBI-260119-001

# Include in handoff:
# - Test spec ID
# - Coverage percentage
# - Any blocked tests
# - Environment requirements
```

### → To Development Team

**Test Collaboration:**
- Share test cases early for TDD/BDD
- Provide evidence locations for unit tests
- Flag automation candidates
- Document environment requirements

---

## Automation Guidelines

### Automation Decision Matrix

| Factor | Automate | Manual |
|--------|----------|--------|
| Runs frequently | ✓ | |
| Stable feature | ✓ | |
| Clear pass/fail | ✓ | |
| Visual verification | | ✓ |
| Complex setup | | ✓ |
| Exploratory | | ✓ |

### Automation Candidates Flag

```markdown
**Automation:** Full | Partial | Manual

- **Full:** All steps can be automated
- **Partial:** Some steps require manual verification
- **Manual:** Cannot be automated (visual, physical device)
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                 QA ENGINEER QUICK REFERENCE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CREATE TEST SPEC                                            │
│  /team-test-spec team-artifacts/pbis/PBI-XXX.md                   │
│  /team-test-spec PBI-XXX --focus "security,edge-cases"            │
│                                                              │
│  GENERATE TEST CASES                                         │
│  /team-test-cases team-artifacts/team-test-specs/TS-XXX.md             │
│  /team-test-cases TS-XXX --types "positive,negative"              │
│                                                              │
│  TEST CASE ID FORMAT                                         │
│  TC-{MODULE}-{NNN}                                           │
│  Example: TC-AUTH-001, TC-CART-015                           │
│                                                              │
│  EVIDENCE FORMAT                                             │
│  Code: src/path/file.ts:lineNumber                           │
│  API: METHOD /api/endpoint                                   │
│                                                              │
│  COVERAGE TYPES                                              │
│  Positive (40%) | Negative (30%) | Edge (15%)                │
│  Security (10%) | Performance (5%)                           │
│                                                              │
│  OUTPUT LOCATIONS                                            │
│  Test Specs: team-artifacts/team-test-specs/                      │
│  Test Cases: team-artifacts/team-test-specs/                      │
│                                                              │
│  NAMING: {YYMMDD}-qa-{type}-{slug}.md                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Team Collaboration Guide](../team-collaboration-guide.md) - Full system overview
- [Business Analyst Guide](./business-analyst-guide.md) - PBI handoff details
- [QC Specialist Guide](./qc-specialist-guide.md) - Quality gate process

---

*Last updated: 2026-01-19*
