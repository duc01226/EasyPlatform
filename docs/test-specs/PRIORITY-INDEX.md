# Test Priority Index

> All test cases organized by priority level

---

## P0 - Critical (Security & Data Integrity)

No P0 tests defined yet for example app. In production, these would include:

- Authentication/Authorization tests
- Data isolation between tenants
- Input sanitization and XSS prevention
- SQL injection prevention

---

## P1 - High (Core Business Workflows)

### TextSnippet Module

| Test ID | Test Name | Feature |
|---------|-----------|---------|
| TC-SNP-CRT-001 | Create New Snippet Successfully | Snippet CRUD |
| TC-SNP-CRT-002 | Create Snippet Validation Error | Snippet CRUD |
| TC-SNP-UPD-001 | Update Existing Snippet | Snippet CRUD |
| TC-SNP-DEL-001 | Delete Snippet | Snippet CRUD |
| TC-SNP-SRC-001 | Search by Text | Search |
| TC-CAT-CRT-001 | Create Category | Categories |
| TC-CAT-FLT-001 | Filter by Category | Categories |
| TC-TSK-LST-001 | List All Tasks | Tasks |
| TC-TSK-CRT-001 | Create Task | Tasks |
| TC-TSK-CMP-001 | Complete Task | Tasks |

---

## P2 - Medium (Secondary Features)

| Test ID | Test Name | Module |
|---------|-----------|--------|
| TC-SNP-SRC-002 | Search with No Results | TextSnippet |
| TC-SNP-EDGE-001 | Maximum Text Length | TextSnippet |
| TC-SNP-EDGE-002 | Special Characters | TextSnippet |

---

## P3 - Low (UI Enhancements)

| Test ID | Test Name | Module |
|---------|-----------|--------|
| - | - | - |

---

## Summary by Module

| Module | P0 | P1 | P2 | P3 | Total |
|--------|----|----|----|----|-------|
| TextSnippet | 0 | 7 | 3 | 0 | 10 |
| Tasks | 0 | 3 | 0 | 0 | 3 |
| Categories | 0 | 2 | 0 | 0 | 2 |
| **Total** | 0 | 12 | 3 | 0 | 15 |

---

## Priority Guidelines

### P0 - Critical
- Must pass before any release
- Security implications
- Data loss potential
- Run on every PR

### P1 - High
- Core user journeys
- Must pass for feature release
- Run daily in CI

### P2 - Medium
- Edge cases and error handling
- Run weekly or before major releases

### P3 - Low
- Nice-to-have validations
- Run before major releases
