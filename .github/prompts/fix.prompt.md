---
agent: agent
description: Analyze and fix issues with intelligent routing based on issue type. Handles bugs, type errors, UI issues, CI/CD failures, and more.
---

# Fix Issues

Analyze and fix the reported issue.

## Issue Description
$input

## Workflow Sequence

This prompt follows the workflow: `@workspace /scout` → `@workspace /investigate` → `@workspace /debug` → `@workspace /plan` → `@workspace /fix` → `@workspace /code-review` → `@workspace /test`

---

## INPUT: Prior Workflow Integration

**If preceded by debug workflow:**

1. **Use the root cause analysis** from Debug step
2. **Reference the confidence declaration** (90%+ required)
3. **Follow the evidence trail** already established
4. **Check for similar issues** already identified by Debug
5. **Apply fix pattern** identified in Debug's recommendation

**Debug Output Reference:**
```markdown
### Root Cause
[Identified issue with file:line references]

### Confidence: X%
### Evidence: [List of verified facts]
### Recommendation: [Approach to fix]
```

**If NO prior Debug output:** Start with Step 1 Reproduce/Understand.

---

## Decision Tree

Route to specialized fix approach based on issue type:

### A) Type Errors
**Keywords:** type, typescript, tsc, type error, TS2xxx

**Approach:**
1. Run type checker: `npm run typecheck` or `dotnet build`
2. List all type errors with file:line
3. Analyze root causes (often cascading from one source)
4. Fix in dependency order

### B) UI/UX Issues
**Keywords:** ui, ux, design, layout, style, visual, button, css, responsive

**Approach:**
1. Understand the visual issue
2. Find relevant component in `libs/` or `apps/`
3. Check BEM class structure
4. Fix styling/layout while preserving component patterns

### C) CI/CD Issues
**Keywords:** github actions, pipeline, ci/cd, workflow, deployment, build failed

**Approach:**
1. Check workflow file in `.github/workflows/`
2. Analyze failure logs
3. Identify root cause (dependency, environment, script)
4. Fix workflow or underlying code

### D) Test Failures
**Keywords:** test, spec, jest, failing test, test suite

**Approach:**
1. Run specific test: `npm test -- --testPathPattern={file}`
2. Analyze failure message
3. Determine if test or code is wrong
4. Fix appropriately

### E) Backend Errors
**Keywords:** api, 500, exception, null reference, database

**Approach:**
1. Check logs for stack trace
2. Trace to specific handler/service
3. Verify repository usage (service-specific, not generic)
4. Fix with proper validation patterns

### F) Complex/System-wide Issues
**Keywords:** complex, architecture, refactor, major, system-wide

**Approach:**
1. Use `@plan` to create implementation plan first
2. Break into smaller fixable units
3. Address systematically

## Fix Process

### Step 1: Reproduce/Understand
- Verify the issue exists
- Understand expected vs actual behavior
- Identify affected code paths

### Step 2: Root Cause Analysis
- Don't fix symptoms, fix causes
- Trace error to source
- Check for related issues

### Step 3: Implement Fix
Follow EasyPlatform patterns:
- Backend: Use `PlatformValidationResult`, service-specific repos
- Frontend: Extend platform base classes, use `untilDestroyed()`
- No side effects in handlers (use UseCaseEvents/)

### Step 4: Verify Fix
- Ensure original issue is resolved
- Check for regressions
- Run related tests

## Verification Checklist

Before claiming fix is complete:
- [ ] Issue is reproduced/understood?
- [ ] Root cause identified (not just symptom)?
- [ ] Fix follows platform patterns?
- [ ] No new issues introduced?
- [ ] Related tests pass?

## Anti-Patterns to Avoid

| Don't | Do |
|-------|-----|
| `throw new ValidationException()` | Use `PlatformValidationResult` fluent API |
| Side effects in handler | Use Entity Event Handler in `UseCaseEvents/` |
| `IPlatformRootRepository<T>` | Use `IPlatformQueryableRootRepository<T>` etc. |
| Manual subscriptions | Use `.pipe(this.untilDestroyed())` |
