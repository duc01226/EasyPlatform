Read in full FIRST for positional `review`. This is the positional branch of the integration-test skill; entrypoint-wide case-profile, authority and execution contracts remain in force.

# REVIEW Mode — Test Quality Audit

Mode = REVIEW: audit existing integration tests for quality, flaky patterns, best practices.

## Sub-Agent Routing

| Input type                                        | Sub-agent            | Why                                                                                                                                |
| ------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Test file quality audit                           | `integration-tester` | Purpose-built for spec generation, TC traceability, and test patterns — catches integration-specific issues `code-reviewer` misses |
| Security-sensitive test data (PII, auth fixtures) | `security-auditor`   | Detects PII leakage in test fixtures                                                                                               |

## Sub-Agent Type Override

> **MANDATORY:** Integration test REVIEW mode spawns `integration-tester` sub-agent (`subagent_type: "integration-tester"`), NOT `code-reviewer`.
> **Rationale:** `integration-tester` specializes in test spec generation, TC traceability, CQRS test patterns, async-polling / eventual-consistency assertion correctness, and cross-service integration context — areas `code-reviewer` does not cover at depth.

**One-pass review protocol:** Run one review pass inline. If evidence is low-confidence or contradictory, return `NOT VERIFIABLE` with the missing evidence or owner question; never start a second review round. A later review requires a new explicit invocation after the target or evidence changes.

## Review Workflow

1. **Find test files** — Glob `{Service}.IntegrationTests/{Domain}/**/*IntegrationTests.*`
2. **Read each test file** — analyze for quality issues (persist findings after each file per SYNC:incremental-persistence)
3. **Generate quality report** — categorized findings with severity

## Review Dimensions

**Dimension 1: Reliability** — Think: What causes intermittent failures?

- MUST ATTENTION flag **missing async polling** — DB assertions after async handlers without an await-until-condition poll (the project's async-assertion helper) → WILL flake
- MUST ATTENTION flag **missing retry for eventual consistency** — message bus / event handler / background job state without polling wrapper
- MUST ATTENTION flag **hardcoded delays** — `Thread.Sleep()`, `Task.Delay()` instead of condition-based polling
- MUST ATTENTION flag **race conditions** — tests modifying shared state without isolation (same entity ID, same user context)
- MUST ATTENTION flag **shared mutable data** (see `SYNC:test-data-isolation`) — assertions hung off a shared mutable entity another test can change, OR off a parent a bulk re-sync/recompute/rebuild/cascade consumer can wipe → not parallel-safe, even without your test mutating it
- MUST ATTENTION flag **non-unique test data** — hardcoded strings/IDs instead of unique generators
- MUST ATTENTION flag **time-dependent assertions** — `DateTime.Now` without time abstraction

**Dimension 2: Assertion Value** — Think: Does the test actually verify anything?

- MUST ATTENTION flag DI-resolution-only tests — smoke tests that just resolve services → HIGH severity
- MUST ATTENTION flag exception-check-only tests — `exception.Should().BeNull()` alone → HIGH severity
- MUST ATTENTION verify test reads handler/entity/event source and asserts specific field values
- MUST ATTENTION verify distinct protected behaviors, relevant failures and boundaries; do not impose a minimum case count

**Dimension 3: Conventions** — Think: Does test follow project patterns?

- MUST ATTENTION verify collection/group attribute — correct collection name for shared fixture
- MUST ATTENTION verify category annotation or equivalent test-category marker when the project uses one
- MUST ATTENTION verify TC annotation — every test method has a TC code comment + the test-spec annotation
- MUST ATTENTION verify no mocks — real DI only
- MUST ATTENTION verify unique test data — all string data uses unique generators
- MUST ATTENTION verify user context — via factory, not hardcoded
- MUST ATTENTION verify DB assertions — uses entity assertion helpers, not raw DB queries

**Dimension 4: Code Quality** — Think: Maintainability and isolation?

- MUST ATTENTION verify method naming — `{Action}_When{Condition}_Should{Expectation}`
- MUST ATTENTION verify explicit Given-When-Then — map Arrange to Given, Act to When, and Assert to Then; the three phases must be clear and labeled
- MUST ATTENTION flag logic in tests — conditionals, loops, complex setup in test methods
- MUST ATTENTION verify test independence — each test runs in isolation

## Review Report Format

```markdown
# Integration Test Quality Report — {Domain}

## Summary

- Tests scanned: {N}
- Issues found: {N} (HIGH: {n}, MEDIUM: {n}, LOW: {n})
- Overall quality: {GOOD|NEEDS_WORK|CRITICAL}

## HIGH Severity Issues (Flaky Risk)

| Test         | Issue                                            | Fix                                    |
| ------------ | ------------------------------------------------ | -------------------------------------- |
| {MethodName} | DB assertion without polling after async handler | Wrap in project's async polling helper |

## MEDIUM Severity Issues (Best Practice)

| Test | Issue | Fix |
| ---- | ----- | --- |

## LOW Severity Issues (Style)

| Test | Issue | Fix |
| ---- | ----- | --- |

## Recommendations

1. {Prioritized fix suggestions}
```

---
