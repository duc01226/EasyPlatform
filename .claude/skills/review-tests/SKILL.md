---
name: review-tests
description: "[Testing] Deep test quality audit for integration and E2E tests. Analyzes assertion depth, data verification patterns, domain flag coverage, TC-ID traceability, and anti-pattern detection. Use for thorough test review beyond what review-changes provides."
keywords: "review tests, test quality, test audit, assertion quality, test review, review test code"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
skill-type: user-invoked
---

# Review Tests Skill

## Summary

**Goal:** Deep audit of test assertion quality across integration and E2E test files. Produces a scored report with specific fix recommendations.

| Step | Action | Key Notes |
|------|--------|-----------|
| 1 | Locate test files | Scan specified path or all test directories |
| 2 | Per-file assertion audit | Score each test method against quality rules |
| 3 | Cross-file consistency check | Compare patterns across feature areas |
| 4 | Generate report | Scored findings with fix recommendations |

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale documentation. Every review must verify both code correctness AND documentation accuracy.

**Key Principles:**
- **Be skeptical. Critical thinking. Everything needs traced proof.** — Never accept code at face value; verify claims against actual behavior, trace data flow end-to-end, and demand evidence (file:line references, grep results, runtime confirmation) for every finding
- Data verification via follow-up query is PREFERRED over response-body-only
- Every mutation test must verify at least one domain field
- Never accept status-only assertions as sufficient

## Input

```
/review-tests [path] [--fix] [--scope backend|frontend|both]
```

- **path** (optional): Specific test file or directory. Default: all test directories
- **--fix**: Auto-fix identified issues (present diff for confirmation)
- **--scope**: Limit to backend (C#) or frontend (E2E) tests

## Keywords (Trigger Phrases)

- `review tests`
- `test quality`
- `test audit`
- `assertion quality`
- `review test code`

## Workflow

### Step 1 -- Locate Test Files

```
# Backend integration tests
Glob: src/Backend/PlatformExampleApp.Tests.Integration/**/*.cs

# Frontend E2E tests
Glob: src/Frontend/e2e/tests/**/*.spec.ts
```

If path argument provided, scope to that path only.

### Step 2 -- Per-File Assertion Audit

For each test file, read and analyze every test method against these criteria:

#### 2.1 Assertion Depth Score (per test method)

| Score | Criteria |
|-------|----------|
| 0 - FAIL | No assertions, or only HTTP status check |
| 1 - WEAK | HTTP status + one non-domain assertion (e.g., response not null) |
| 2 - ACCEPTABLE | HTTP status + at least 1 domain field assertion in response body |
| 3 - GOOD | Score 2 + domain boolean flags asserted (wasCreated/wasSoftDeleted/wasRestored) |
| 4 - STRONG | Score 3 + follow-up query verification (proves DB round-trip) |
| 5 - EXEMPLARY | Score 4 + concurrency token threading + descriptive unique `because` strings |

#### 2.2 Per-Test Checklist

**Integration Tests (C# xUnit):**
- [ ] HTTP status assertion with `because` string present?
- [ ] Response deserialized via typed `Api.PostAsync<,>()` / `Api.GetAsync<>()`?
- [ ] At least 1 domain field asserted (id, snippetText, title, status, etc.)?
- [ ] Domain boolean flags asserted when available (wasCreated, wasSoftDeleted, wasRestored)?
- [ ] Follow-up GET/search query after mutation? (PREFERRED)
- [ ] Concurrency token extracted and threaded for updates?
- [ ] Setup steps have status assertion with descriptive `because`?
- [ ] Validation error tests parse error body (not just status check)?

**E2E Tests (Playwright):**
- [ ] Post-mutation verification present (not ending at `waitForLoading()`)?
- [ ] Update tests re-select + re-read field value?
- [ ] Create tests verify item in list?
- [ ] Delete tests verify item absent from list?
- [ ] Form validation tests check error text content (not just presence)?
- [ ] Test data tracked in `currentTestData` for cleanup?
- [ ] TC-ID in test title?

#### 2.3 Anti-Pattern Detection

Flag these patterns with file:line references:

| Pattern | Severity | Regex/Detection |
|---------|----------|-----------------|
| Status-only assertion | CRITICAL | `StatusCode.Should().Be(` without subsequent typed result assertion |
| Missing typed deserialization | CRITICAL | Uses `PostRawAsync`/`GetRawAsync` on success path instead of typed `PostAsync<,>`/`GetAsync<>` |
| E2E ends at waitForLoading | CRITICAL | `waitForLoading()` as last line in test (no subsequent `expect`) |
| Validation status-only | HIGH | `IsSuccessStatusCode.Should().BeFalse()` without `Parse` |
| Missing setup assertion | MEDIUM | `Api.PostRawAsync` in Arrange without `.StatusCode.Should()` |
| Identical because strings | LOW | Same `because` text used in multiple assertions |
| Missing TC-ID | MEDIUM | Test method without `[Trait("TestCase"` or `TC-` in title |

### Step 3 -- Cross-File Consistency

After individual audits:
- [ ] Assertion patterns consistent across test files in same feature area?
- [ ] Naming conventions consistent (method names, TC-ID format)?
- [ ] Test data generation approach consistent (TestDataHelper / createTestSnippet)?
- [ ] `because` strings follow descriptive pattern across all files?

### Step 4 -- Generate Report

Create report at `plans/reports/review-tests-{date}-{slug}.md`:

```markdown
# Test Quality Audit Report

## Summary
- Files audited: N
- Test methods audited: N
- Overall score: X.X / 5.0
- Critical issues: N
- Warnings: N

## Score Distribution
| Score | Count | Percentage |
|-------|-------|------------|
| 0 - FAIL | N | X% |
| 1 - WEAK | N | X% |
| 2 - ACCEPTABLE | N | X% |
| 3 - GOOD | N | X% |
| 4 - STRONG | N | X% |
| 5 - EXEMPLARY | N | X% |

## Critical Issues (Must Fix)
| # | File:Line | Test Method | Issue | Fix |
|---|-----------|-------------|-------|-----|
| 1 | path:42 | MethodName | Status-only assertion | Add body parse + domain field check |

## Warnings (Should Fix)
| # | File:Line | Test Method | Issue | Fix |
|---|-----------|-------------|-------|-----|

## Suggestions (Nice to Have)
| # | File:Line | Test Method | Suggestion |
|---|-----------|-------------|------------|

## Consistency Analysis
- Assertion pattern consistency: X%
- TC-ID coverage: X/Y methods have TC-ID
- Because string quality: X% unique and descriptive

## Exemplary Tests (Reference)
| File:Line | Test Method | Score | Why |
|-----------|-------------|-------|-----|
```

If `--fix` flag provided, after report generation:
1. Present each fix as a diff
2. Apply fixes after user confirmation
3. Re-score affected tests to verify improvement

## References

- **Assertion quality rules**: `.claude/skills/generate-tests/SKILL.md` (Assertion Quality Rules section)
- **Integration test template**: `.claude/skills/generate-tests/references/integration-test-template.md`
- **E2E test template**: `.claude/skills/generate-tests/references/e2e-test-template.md`
- **Exemplar test**: `src/Backend/PlatformExampleApp.Tests.Integration/TaskItem/TaskCrudTests.cs`
- **Light review checklist**: `.claude/skills/review-changes/SKILL.md` (Test-Specific Checks section)

## Anti-Patterns to Avoid

- **Never accept status-only assertions as passing** -- minimum score 2 (ACCEPTABLE) required
- **Never skip follow-up query check** -- flag tests that only verify response body when a query endpoint exists
- **Never ignore domain boolean flags** -- if entity response includes flags, they must be asserted
- **Never report without fix recommendations** -- every issue must have a concrete fix suggestion

## IMPORTANT Task Planning Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end
