---
agent: 'agent'
description: 'Run tests locally and analyze the summary report'
tools: ['read', 'search', 'execute']
---

# Run Tests

Run tests locally and analyze the results.

## Test Scope
${input:scope}

Options: all, unit, integration, e2e, specific-path

## Process

### Step 1: Identify Test Framework
- Backend (.NET): `dotnet test`
- Frontend (Angular): `nx test` or `npm run test`

### Step 2: Run Tests

**Backend Tests:**
```bash
# All tests
dotnet test EasyPlatform.sln

# Specific project
dotnet test src/PlatformExampleApp/TextSnippet/TextSnippet.Tests/TextSnippet.Tests.csproj

# With verbosity
dotnet test --verbosity normal --logger "console;verbosity=detailed"
```

**Frontend Tests:**
```bash
# All tests
nx run-many --target=test --all

# Specific library
nx test apps-domains

# With coverage
nx test apps-domains --coverage
```

### Step 3: Analyze Results

For each failure:
1. Identify the failing test name and file
2. Understand the assertion that failed
3. Check if it's a flaky test or real issue
4. Categorize: unit, integration, or e2e

### Step 4: Report

```markdown
## Test Results Summary

**Status:** PASS | FAIL
**Total:** X tests
**Passed:** Y
**Failed:** Z
**Skipped:** W

### Failed Tests (if any)
| Test Name | File | Reason |
|-----------|------|--------|
| TestName | path/to/file.cs:line | Brief failure reason |

### Analysis
- [Root cause analysis if failures exist]
- [Recommendations for fixes]

### Next Steps
- [Suggested actions]
```

## Testing Standards

- Unit tests may use mocks for external dependencies
- Integration tests use test environment
- E2E tests use real but isolated data
- **Forbidden:** commenting out tests, changing assertions to pass, TODO/FIXME to defer fixes

**IMPORTANT**: Report findings only - do not implement fixes unless requested.
