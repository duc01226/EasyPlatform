# EasyPlatform Test Specifications

> Given-When-Then test specifications for PlatformExampleApp (TextSnippet)

## Overview

Test specifications for QA Engineers, Testers, and Developers. Each test case includes:

- **Given-When-Then** format (Gherkin syntax)
- **Priority classification** (P0-P3)
- **Code evidence** with file paths and line numbers
- **Test data** examples

## Priority Classification

| Priority | Level    | Description                              |
| -------- | -------- | ---------------------------------------- |
| **P0**   | Critical | Security, authentication, data integrity |
| **P1**   | High     | Core business workflows                  |
| **P2**   | Medium   | Secondary features                       |
| **P3**   | Low      | UI enhancements, non-essential           |

## Module Test Specifications

| Module      | Description       | Priority Focus      |
| ----------- | ----------------- | ------------------- |
| TextSnippet | CRUD, search, tag | P1: Core operations |

## Test Case Naming Convention

```
TC-[MODULE]-[FEATURE]-[NUMBER]

Examples:
- TC-TXT-CRUD-001  = TextSnippet > CRUD > Test 001
- TC-TXT-SRCH-001  = TextSnippet > Search > Test 001
```

### Module Codes

| Code | Module      |
| ---- | ----------- |
| TXT  | TextSnippet |

## Test Specification Format

```markdown
#### TC-[MODULE]-[FEATURE]-[NUM]: [Test Case Name]

**Priority**: P0-Critical | P1-High | P2-Medium | P3-Low

**Test Steps** (Given-When-Then):

Given [initial context/state]
When [action performed]
Then [expected outcome]

**Evidence**: `[FileName.cs:line-range]`
```

## Related Documentation

- **Business Features**: [docs/business-features/](../business-features/)
- **Backend Patterns**: [docs/project-reference/backend-patterns-reference.md](../project-reference/backend-patterns-reference.md)
- **Integration Tests**: [src/Backend/PlatformExampleApp.Tests.Integration/](../../src/Backend/PlatformExampleApp.Tests.Integration/)

## Generating Test Specs

Use the `/test-spec` or `/test-specs-docs` skill to generate comprehensive test specifications from PBIs or codebase analysis.
