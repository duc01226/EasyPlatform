---
name: tasks-test-generation
version: 1.1.0
description: '[Subagent Tasks] Autonomous subagent variant of test-generation. Use when creating or enhancing unit tests, integration tests, or defining test strategies for backend and frontend code.'

allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/evidence-based-reasoning-protocol.md` before executing.

## Quick Summary

**Goal:** Autonomously generate unit and integration tests for backend (C#) and frontend (Angular) code using structured patterns.

**Workflow:**

1. **Pre-Flight** — Identify code to test, find existing patterns, determine test type
2. **Read Patterns** — MUST READ `references/test-patterns.md` for 5 canonical patterns
3. **Write Tests** — Follow Arrange-Act-Assert, mock dependencies, cover happy + edge + error paths
4. **Verify** — Ensure naming convention, no interdependencies, deterministic results

**Key Rules:**

- MUST READ `references/test-patterns.md` before writing any test
- Test behavior, not implementation details
- Follow naming: `[Method]_[Scenario]_[ExpectedBehavior]`

> **Skill Variant:** Use this skill for **autonomous test generation** with structured templates. For interactive test writing with user feedback, use `test-spec` instead.

# Test Generation Workflow

## Prerequisites

**⚠️ MUST READ** `references/test-patterns.md` before executing — contains 5 complete test patterns (Command Handler, Query Handler, Entity Validation, Angular Component, Angular Store) and anti-patterns with correct/incorrect examples required by the Test Patterns section.

## When to Use

- Creating unit tests for new code
- Adding tests for bug fixes
- Integration test development
- Test coverage improvement

> **For real-infrastructure integration tests (no mocks, real DI + DB), use `integration-test` skill instead.**

## Pre-Flight Checklist

- [ ] Identify code to test (command, query, entity, component)
- [ ] Find existing test patterns: `grep "Test.*{Feature}" --include="*.cs"`
- [ ] Determine test type (unit, integration, e2e)
- [ ] Identify dependencies to mock

## File Locations

### Backend Tests

```
tests/{Service}.Tests/
  UnitTests/
    Commands/Save{Entity}CommandTests.cs
    Queries/Get{Entity}ListQueryTests.cs
    Entities/{Entity}Tests.cs
  IntegrationTests/{Feature}IntegrationTests.cs
```

### Frontend Tests

```
{frontend-apps-dir}/{app}/src/app/features/{feature}/
  {feature}.component.spec.ts
  {feature}.store.spec.ts
```

## Test Patterns

| Pattern           | Use Case                                      | Reference                                                 |
| ----------------- | --------------------------------------------- | --------------------------------------------------------- |
| Command Handler   | CQRS command create/update/delete             | **⚠️ MUST READ:** `references/test-patterns.md` Pattern 1 |
| Query Handler     | CQRS query with filters/paging                | **⚠️ MUST READ:** `references/test-patterns.md` Pattern 2 |
| Entity Validation | UniqueExpr, ValidateAsync, computed props     | **⚠️ MUST READ:** `references/test-patterns.md` Pattern 3 |
| Angular Component | Component lifecycle, store interaction        | **⚠️ MUST READ:** `references/test-patterns.md` Pattern 4 |
| Angular Store     | State management, API effects, error handling | **⚠️ MUST READ:** `references/test-patterns.md` Pattern 5 |

## Test Naming Convention

```
[MethodName]_[Scenario]_[ExpectedBehavior]

Examples:
- HandleAsync_ValidCommand_ReturnsSuccess
- HandleAsync_InvalidId_ThrowsNotFound
- UniqueExpr_MatchingValues_ReturnsTrue
- LoadItems_ApiError_SetsErrorState
```

## Key Principles

- Test **behavior**, not implementation details
- Mock all dependencies (use `Mock<IRepository>`, `jasmine.createSpyObj`)
- Cover happy path + edge cases + error conditions
- Use Arrange-Act-Assert pattern consistently
- Anti-patterns and examples in `references/test-patterns.md`

## Verification Checklist

- [ ] Unit tests cover happy path
- [ ] Edge cases and error conditions tested
- [ ] Dependencies properly mocked
- [ ] Test naming follows convention
- [ ] Assertions are specific and meaningful
- [ ] No test interdependencies
- [ ] Tests are deterministic (no random, no time-dependent)

## Related

- `test-spec` - Interactive test writing
- `tasks-code-review` - Code review with test coverage checks

## References

| File                          | Contents                                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/test-patterns.md` | 5 complete test patterns (Command Handler, Query Handler, Entity Validation, Angular Component, Angular Store), anti-patterns with correct/incorrect examples |

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
