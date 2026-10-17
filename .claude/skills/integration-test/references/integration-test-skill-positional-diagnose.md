Read in full FIRST for positional `diagnose`. This is the positional branch of the integration-test skill; entrypoint-wide case-profile, authority and execution contracts remain in force.

# DIAGNOSE Mode — Test Failure Root Cause Analysis

Mode = DIAGNOSE: analyze failing tests to determine test bug vs application code bug.

## Diagnose Workflow

1. **Identify failing tests** — User provides test class name or run test suite to collect failures
2. **Read test code** — understand what test expects
3. **Read application code** — trace the command/query handler path
4. **Compare expected vs actual** — determine root cause
5. **Classify** — Test bug vs code bug vs infrastructure issue
6. **Report** — Root cause + recommended fix

## Root Cause Decision Tree

```
Test fails
├── Compilation error?
│   ├── Missing type/method → Code changed, test not updated → TEST BUG
│   └── Wrong import/namespace → TEST BUG
├── Timeout/hang?
│   ├── Missing async/await → TEST BUG
│   ├── Deadlock in handler → CODE BUG
│   └── Infrastructure down → INFRA ISSUE
├── Assertion failure?
│   ├── Expected value wrong?
│   │   ├── Test hardcoded old behavior → TEST BUG
│   │   └── Business logic changed → CODE BUG (if unintended) or TEST BUG (if intended change)
│   ├── Null/empty result?
│   │   ├── Entity not found → Check if create step succeeded → TEST BUG (setup) or CODE BUG (handler)
│   │   └── Query returns empty → Check filters/predicates → CODE BUG
│   ├── Intermittent (passes sometimes)?
│   │   ├── Async assertion without polling → TEST BUG (add async polling/retry)
│   │   ├── Non-unique test data collision → TEST BUG (use unique name generator)
│   │   └── Race condition in handler → CODE BUG
│   └── Wrong/empty count when path under test is provably innocent?
│       ├── Test data leak from other tests → TEST BUG (isolation: own fresh per-test data, not a shared mutable entity)
│       ├── Shared parent wiped by cross-cutting consumer (bulk re-sync, recompute, cascade) → TEST BUG (isolation) — suspect FIRST, grep other tests + consumers before blaming code
│       └── Logic error in query → CODE BUG
├── Validation error (expected success)?
│   ├── Test sends invalid data → TEST BUG
│   └── Validation rule too strict → CODE BUG
└── Exception thrown?
    ├── Known exception type in handler → CODE BUG
    └── DI/config error → INFRA ISSUE
```

## Diagnose Report Format

```markdown
# Test Failure Diagnosis — {TestClass}

## Failing Tests

| Test Method | Error Type        | Root Cause    | Classification              |
| ----------- | ----------------- | ------------- | --------------------------- |
| {Method}    | {AssertionFailed} | {Description} | TEST BUG / CODE BUG / INFRA |

## Detailed Analysis

### {MethodName}

**Error:** {error message}
**Expected:** {what test expected}
**Actual:** {what happened}
**Root Cause:** {explanation with code evidence}
**Classification:** TEST BUG | CODE BUG | INFRA ISSUE
**Evidence:** `{file}:{line}` — {what the code does}
**Recommended Fix:** {specific fix with code location}

## Summary

- Test bugs: {N} — fix in test code
- Code bugs: {N} — fix in application code
- Infra issues: {N} — fix in configuration/environment
```

---
