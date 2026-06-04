# Integration Test Patterns

Canonical patterns for integration tests that exercise the real application wiring for the configured repository. The patterns are stack-agnostic; syntax, file layout, fixtures, commands, and annotations come from `docs/project-config.json`, `docs/project-reference/integration-test-reference.md`, and nearby existing tests.

## Project Pattern Discovery

Before implementation, search the codebase for project-specific patterns:

- Existing integration test suites, fixture names, base test classes, test collection/grouping conventions, and shared test utilities.
- Configured test runner and test command from `docs/project-config.json` or project-reference docs.
- Test data builders, seeders, unique identifier helpers, and async polling helpers.
- Existing test-spec annotation key used to link code tests back to TC IDs.

Record the discovered examples with file evidence before writing a new test. If no project integration-test reference exists, continue with search-based discovery and state the confidence level.

## Required Contract

Every integration test created through this skill must satisfy these rules:

- Exercise real dependency wiring for the scope under test. Do not replace the behavior under review with mocks unless the local reference docs explicitly define that boundary.
- Link to one protected business intent or invariant.
- Include a TC ID comment and the configured test-spec annotation mechanism.
- Seed unique data so the test can run repeatedly without cleanup.
- Assert persisted or externally observable state, not just "no exception".
- Wrap data-state assertions in the repository's async wait/poll helper when writes, handlers, consumers, projections, or background work can be delayed.
- Keep one behavior per test unless the local pattern uses scenario tables for the same invariant.
- Reuse existing fixture, seeding, auth/user-context, clock, queue, storage, and cleanup helpers.

## TC Annotation Pattern

Use this logical contract and adapt it to the configured test framework:

```text
TC-{FEATURE}-{NNN}: {business intent}
TestSpec annotation key: TestSpec
TestSpec annotation value: TC-{FEATURE}-{NNN}
```

Do not invent a new annotation style. Copy the exact syntax from an existing test in the same suite.

## Pattern 1: Write Command Or Mutation

Use when the behavior changes state.

1. Arrange unique input data and all prerequisites through existing builders or seeders.
2. Execute the command/mutation through the same application boundary used by existing integration tests.
3. Assert the result contract only where meaningful.
4. Re-read the authoritative data source through the configured repository/query helper.
5. Assert every business field that proves the invariant.
6. If side effects are asynchronous, wait for the final state with the configured polling helper.

## Pattern 2: Query Or Read Model

Use when the behavior returns data without changing state.

1. Seed records that prove inclusion, exclusion, ordering, paging, and permission rules.
2. Execute the query/read operation through the existing integration-test boundary.
3. Assert returned identifiers and field values, not only counts.
4. Include a negative/control record where the business rule has exclusion behavior.

## Pattern 3: Update Or State Transition

Use when an existing entity changes state.

1. Seed the entity in the previous state and any relationship prerequisites.
2. Execute the transition through the application boundary.
3. Re-read the entity and assert all state, audit, derived, and relationship fields that the invariant owns.
4. Assert unchanged fields when regression risk exists.
5. Assert emitted downstream observable state when the repository's test pattern exposes it.

## Pattern 4: Validation Failure

Use when invalid input must be rejected.

1. Arrange the minimal invalid request that targets exactly one validation rule.
2. Execute through the real validation pipeline.
3. Assert the configured validation result/error contract.
4. Assert no persisted data or side effect was created.
5. Prefer one invalid case per test unless the local suite uses parameterized cases for the same invariant.

## Pattern 5: Async Event Or Cross-Boundary Flow

Use when behavior is completed by event handlers, consumers, jobs, projections, or externalized internal boundaries.

1. Execute the source behavior through the normal application boundary.
2. Wait for the target observable state using the configured eventual-consistency helper.
3. Assert the source state, emitted/handled state when observable, and target state.
4. Use the timeout and retry policy already used by nearby tests.
5. Record which boundaries were covered.

## Pattern 6: Fixture Setup

When a new integration-test suite is required:

1. Discover an existing suite in the same module or closest equivalent module.
2. Copy its fixture shape, test grouping, dependency startup, config loading, unique database/storage naming, and shared helpers.
3. Replace only the module-specific names and dependencies.
4. Add the suite to the configured test runner or solution manifest only if existing suites require explicit registration.

Do not create a new fixture architecture unless existing patterns cannot cover the test.

## Pattern 7: Test Data

Test data must be:

- Unique per run.
- Additive and repeatable.
- Created through the same command/application pipeline when the business invariant depends on command-side behavior.
- Minimal but realistic enough to exercise permissions, relationships, and derived fields.
- Isolated from production or shared non-test resources by configured environment gates.

## Pattern 8: Adding A New Test Suite

When no matching integration-test suite exists:

1. Read `docs/project-config.json` and the integration-test reference.
2. Locate the closest existing suite and record the file evidence.
3. Create the new suite under the configured test source root and naming convention.
4. Reuse the configured test runner, manifest, fixture, and shared utilities.
5. Run the smallest focused test command first, then the relevant suite command.

## Anti-Patterns

- Smoke-only tests that assert only no exception or non-null result.
- Tests that duplicate handler implementation instead of asserting externally observable behavior.
- Shared static test data that makes repeat runs flaky.
- Direct data writes that bypass the behavior under test when the invariant belongs to the command/application pipeline.
- Assertions outside the configured async wait helper when the state can be produced asynchronously.
- New local helpers that duplicate existing test utilities.

## Verification Checklist

- TC ID is present in the spec and in test code.
- Protected business intent or invariant is named.
- Existing local integration-test patterns were cited before implementation.
- Test data is unique and repeatable.
- Data-state assertions verify specific fields.
- Async side effects use the configured wait/poll helper.
- Focused test command was run or an explicit blocker was recorded.
