---
name: test-specs-docs
version: 1.1.0
description: '[Documentation] Create or update test specifications in docs/test-specs/{Module}/. Use when asked to create test specs, write test cases, document test scenarios, or generate Given-When-Then specifications. Triggers on "test specs", "test specifications", "test cases", "test scenarios", "QA documentation", "Given-When-Then".'

allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task, TaskCreate
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI may ask user whether to skip.

## Quick Summary

**Goal:** Generate comprehensive test specifications with Given-When-Then format and code evidence for project modules.

**Workflow:**

1. **Context Gathering** — Identify module, read existing specs, gather code evidence
2. **Write Test Specs** — Create test cases with priority, GWT steps, acceptance criteria, test data, evidence
3. **Index Updates** — Update PRIORITY-INDEX.md and master README.md

**Key Rules:**

- Test case IDs follow `TC-[MODULE]-[FEATURE]-[NUM]` format
- Every test case MUST reference actual source code (anti-hallucination)
- MUST READ `references/test-spec-template.md` before executing
- Verify IDs against PRIORITY-INDEX.md to avoid duplicates

## Project Pattern Discovery

Before implementation, search your codebase for project-specific patterns:

- Search for: `test-specs`, `TC-`, test specifications
- Look for: existing test spec folders, priority indexes, module test documents

> **MANDATORY IMPORTANT MUST** Read the `integration-test-reference.md` companion doc for project-specific patterns and code examples.
> If file not found, continue with search-based discovery above.

# Test Specifications Documentation

Generate comprehensive test specifications following project conventions with Given-When-Then format and code evidence.

---

## Prerequisites

**MUST READ** `references/test-spec-template.md` before executing -- contains full module test spec template, Given-When-Then best practices, acceptance criteria format, evidence requirements, and complete example required by Phase 2.

## Output Structure

```
docs/test-specs/
  README.md              # Master index
  PRIORITY-INDEX.md      # All tests by P0-P3
  INTEGRATION-TESTS.md   # Cross-module scenarios
  VERIFICATION-REPORT.md # Verification status
  {Module}/README.md     # Module test specs
```

---

## Test Case ID Format

```
TC-[MODULE]-[FEATURE]-[NUM]
```

**⚠️ MUST READ** `shared/references/module-codes.md` for module codes, feature codes, and TC ID formats.

---

## Priority Classification

| Priority        | Description                    | Guideline                                       |
| --------------- | ------------------------------ | ----------------------------------------------- |
| **P0** Critical | Security, auth, data integrity | If this fails, users can't work or data at risk |
| **P1** High     | Core business workflows        | Core happy-path for business operations         |
| **P2** Medium   | Secondary features             | Enhances but doesn't block core workflows       |
| **P3** Low      | UI enhancements, non-essential | Nice-to-have polish                             |

---

## Workflow

### Phase 1: Context Gathering

1. **Identify target module** from user request or codebase search
2. **Read existing specs**: `docs/test-specs/README.md`, `docs/test-specs/{Module}/README.md`, `PRIORITY-INDEX.md`
3. **Gather code evidence**: Validation logic, business rules, authorization, edge cases

### Phase 2: Write Test Specifications

**⚠️ MUST READ:** `references/test-spec-template.md` for full module template, GWT best practices, and complete example.

Each test case requires: Priority, Preconditions, Given-When-Then steps, Acceptance Criteria (success + failure), Test Data (JSON), Edge Cases, Evidence (controller + handler refs + code snippets), Related Files table.

### Phase 3: Index Updates

1. Add new test cases to `PRIORITY-INDEX.md` in appropriate priority section
2. Ensure master `docs/test-specs/README.md` links to module

---

## Anti-Hallucination Protocols

- Every test case MUST reference actual source code
- Read validation logic before writing acceptance criteria
- Verify authorization policies from controller attributes
- Verify line numbers are current using Grep
- Read PRIORITY-INDEX.md before assigning new IDs - never duplicate

---

## Quality Checklist

- [ ] Test case IDs follow TC-[MODULE]-[FEATURE]-[NUM] format
- [ ] All IDs unique (verified against PRIORITY-INDEX.md)
- [ ] Priority assigned per classification guidelines
- [ ] Given-When-Then format for all test steps
- [ ] Acceptance criteria include success AND failure cases
- [ ] Test data in JSON format
- [ ] Edge cases with expected outcomes
- [ ] Code evidence with file paths and line numbers
- [ ] Code snippets in `<details>` blocks
- [ ] Related files table (Backend/Frontend layers)
- [ ] PRIORITY-INDEX.md updated
- [ ] Links to business-features docs

## References

| File                               | Contents                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `references/test-spec-template.md` | Full module template, GWT best practices, acceptance criteria format, evidence requirements, complete Kudos example |

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
