# EasyPlatform Test Specifications

> Comprehensive Given-When-Then test specifications for all EasyPlatform modules

---

## Overview

This documentation provides systematic test specifications for QA Engineers, Testers, and Developers. Each test case includes:

- **Given-When-Then** format (Gherkin syntax)
- **Priority classification** (P0-P3)
- **Code evidence** with file paths and line numbers
- **Test data** examples
- **Edge cases** and boundary conditions

---

## Priority Classification

| Priority | Level    | Description                              | Examples                                 |
| -------- | -------- | ---------------------------------------- | ---------------------------------------- |
| **P0**   | Critical | Security, authentication, data integrity | Login, password security, data isolation |
| **P1**   | High     | Core business workflows                  | Create snippet, save data, search        |
| **P2**   | Medium   | Secondary features                       | Filters, sorting, notifications          |
| **P3**   | Low      | UI enhancements, non-essential           | Tooltips, preferences                    |

---

## Quick Links

| Document                                        | Purpose                                 |
| ----------------------------------------------- | --------------------------------------- |
| **[Priority Index](./PRIORITY-INDEX.md)**       | All tests organized by priority (P0-P3) |
| **[Integration Tests](./INTEGRATION-TESTS.md)** | Cross-module end-to-end test scenarios  |

---

## Module Test Specifications

| Module                                     | Description               | Test Specs               | Priority Focus      |
| ------------------------------------------ | ------------------------- | ------------------------ | ------------------- |
| **[TextSnippet](./TextSnippet/README.md)** | Snippet & Task Management | CRUD, Search, Categories | P1: Core operations |

---

## Test Case Naming Convention

```
TC-[MODULE]-[FEATURE]-[NUMBER]

Examples:
- TC-SNP-CRT-001  = TextSnippet > Create > Test 001
- TC-SNP-SRC-001  = TextSnippet > Search > Test 001
- TC-TSK-LST-001  = Task > List > Test 001
```

### Module Codes

| Code | Module        |
| ---- | ------------- |
| SNP  | TextSnippet   |
| TSK  | TaskItem      |
| CAT  | Category      |
| JOB  | BackgroundJob |
| MSG  | MessageBus    |

---

## Test Specification Format

````markdown
#### TC-[MODULE]-[FEATURE]-[NUM]: [Test Case Name]

**Priority**: P0-Critical | P1-High | P2-Medium | P3-Low

**Preconditions**:

- [Setup requirements]

**Test Steps** (Given-When-Then):

```gherkin
Given [initial context/state]
  And [additional context if needed]
When [action performed]
  And [additional action if needed]
Then [expected outcome]
  And [additional verification]
```
````

**Acceptance Criteria**:

- ✅ [Expected success behavior]
- ❌ [Expected failure behavior]

**Code Evidence**:

- Backend: `src/Backend/.../Command.cs:45-80`
- Frontend: `src/Frontend/.../component.ts:120-150`

**Test Data**:

```json
{
    "snippetText": "Sample text",
    "categoryId": "cat-001"
}
```

````

---

## Running Tests

### Backend Unit Tests
```bash
dotnet test src/Backend/PlatformExampleApp.TextSnippet.Application.Tests
````

### Frontend Unit Tests

```bash
cd src/Frontend
nx test platform-core
nx test playground-text-snippet
```

### Integration Tests

```bash
dotnet test src/Backend/PlatformExampleApp.IntegrationTests
```

---

## Test Coverage Goals

| Category          | Target | Current |
| ----------------- | ------ | ------- |
| Unit Tests        | 80%    | -       |
| Integration Tests | 60%    | -       |
| E2E Tests         | 40%    | -       |

---

## Contributing

1. Follow naming convention `TC-[MODULE]-[FEATURE]-[NUM]`
2. Include all sections (Priority, Preconditions, Steps, Criteria, Evidence)
3. Update priority index when adding new tests
4. Link to actual code files for evidence
