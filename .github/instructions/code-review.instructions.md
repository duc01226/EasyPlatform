---
applyTo: "**"
description: "Code review guidelines for AI agents performing PR reviews"
excludeAgent: ["coding-agent"]
---

# Code Review Instructions

## Two-Phase Report-Driven Review (CRITICAL)

**MUST generate TodoWrite tasks for BOTH phases before starting!**
- Phase 1: One todo per file to review + create report
- Phase 2: Todos for big picture review and final recommendations

**ALWAYS create a report file FIRST.** Update it as you review each file.

**Phase 1: File-by-File Review (Build Report)**
For each file, document in report: Change Summary, Purpose, Issues Found, Suggestions.
Review code quality, patterns, performance, security, naming per file.

**Phase 2: Holistic Review (Review the Report)**
After all files reviewed, READ the accumulated report to:
- See big picture of all changes
- Evaluate technical solution completeness
- Check responsibility placement (new files/methods in right layer?)
- Detect code duplication across files
- Assess architecture coherence (Clean Architecture, CQRS, proper separation)
- Verify backend-frontend feature split is correct
- Generate final recommendations prioritized by severity

## Review Focus Areas

### 1. Architecture Compliance

- Follows Clean Architecture layers (Domain -> Application -> Persistence -> API)
- No direct cross-service dependencies
- Uses message bus for cross-service communication
- Correct layer placement (business logic in domain, CQRS in application)

### 2. Platform Pattern Compliance

**Backend:**

- Uses `IPlatformQueryableRootRepository<TEntity, TKey>` for data access
- Command + Handler + Result in ONE file
- Entity event handlers for side effects (NOT direct calls in handlers)
- `PlatformValidationResult` fluent API for validation
- DTOs extend `PlatformEntityDto<TEntity, TKey>` with `MapToEntity()` methods

**Frontend:**

- Correct component hierarchy (PlatformComponent -> AppBaseComponent)
- PlatformVmStore for state management
- PlatformApiService for API calls
- Proper use of `untilDestroyed()` for subscriptions

### 3. Code Quality

- Single Responsibility Principle
- Meaningful, descriptive names that reveal intent (WHAT not HOW)
- No vague names (`data`, `temp`, `result`) - use descriptive names (`userData`, `validatedOrders`)
- No abbreviations except common ones (Id, Url, Api)
- No code duplication
- No magic numbers - use named constants instead of unexplained literals
- Proper error handling
- Clear step-by-step flow with spacing

### 4. Security Checks

- No hardcoded secrets
- Parameterized queries (via EF Core)
- Input validation at boundaries
- Authorization checks where needed

### 5. Performance Considerations

- No O(n²) nested loops - use dictionary/lookup instead
- Project only needed properties in query (not GetAll then Select one prop)
- Always paginate large datasets - never GetAll without paging
- Parallel queries using tuple await pattern
- Appropriate use of `PageBy()` for pagination
- No N+1 query patterns
- Efficient LINQ expressions

## Review Output Format

```markdown
## Code Review Summary

### Strengths

- [What the code does well]

### Issues Found

1. **[Issue Type]** - [File:Line]
   - Problem: [description]
   - Suggestion: [how to fix]

### Recommendations

- [Optional improvements]

### Verdict: [Approve / Request Changes / Needs Discussion]
```

## Anti-Patterns to Flag

**Backend:**

- Separate files for Command/Handler/Result
- Direct side effects in command handlers
- Manual DTO-to-entity mapping in handlers
- Generic `IPlatformRootRepository<>` instead of service-specific
- Catching exceptions in handlers
- Magic numbers (e.g., `if (status == 3)` instead of named constants)

**Frontend:**

- Direct HttpClient usage instead of PlatformApiService
- Manual state management instead of PlatformVmStore
- Missing `untilDestroyed()` on subscriptions
- Assuming base class methods without verification
- Magic numbers and hardcoded config values
