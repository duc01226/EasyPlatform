# Integration Test Patterns

Canonical patterns for integration tests that exercise the real application wiring for the configured repository. The patterns are stack-agnostic; syntax, file layout, fixtures, commands, and annotations come from `docs/project-config.json`, `docs/project-reference/integration-test-reference.md`, and nearby existing tests.

## Contents

- [Project Pattern Discovery](#project-pattern-discovery)
- [Required Contract](#required-contract)
- [TC Annotation Pattern](#tc-annotation-pattern)
- [Pattern 1: Write Command Or Mutation](#pattern-1-write-command-or-mutation)
- [Pattern 2: Query Or Read Model](#pattern-2-query-or-read-model)
- [Pattern 3: Update Or State Transition](#pattern-3-update-or-state-transition)
- [Pattern 4: Validation Failure](#pattern-4-validation-failure)
- [Pattern 5: Async Event Or Cross-Boundary Flow](#pattern-5-async-event-or-cross-boundary-flow)
- [Pattern 6: Fixture Setup](#pattern-6-fixture-setup)
- [Pattern 7: Test Data](#pattern-7-test-data)
- [Pattern 8: Adding A New Test Suite](#pattern-8-adding-a-new-test-suite)
- [Pattern 9: Property / Metamorphic Test](#pattern-9-property--metamorphic-test)
- [Pattern 10: Settle Barrier Between Actor Steps](#pattern-10-settle-barrier-between-actor-steps)
- [Anti-Patterns](#anti-patterns)
- [Verification Checklist](#verification-checklist)

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
- Reproduce a sequence, pacing, and data shape production can actually reach — pass the Real-World Fidelity Gate below before writing the arrange step (barrier shape: Pattern 10).
- Link to one protected business intent or invariant.
- Use the resolved canonical owner/case/variant and configured test carrier; strict-default business TCs only when no native contract exists. Technical-only tests name their guarded contract without inventing a business case.
- Follow the project’s isolation policy: shared mutable namespaces need unique identities; deterministic isolated fixtures may use stable values. Supported cleanup removes only run-owned ephemeral resources after evidence, never shared/persistent additive data.
- Assert persisted or externally observable state, not just "no exception".
- Wrap data-state assertions in the repository's async wait/poll helper when writes, handlers, consumers, projections, or background work can be delayed.
- Keep one behavior per test unless the local pattern uses scenario tables for the same invariant.
- Reuse existing fixture, seeding, auth/user-context, clock, queue, storage, and cleanup helpers.

<!-- SYNC:real-world-fidelity-testing -->

> **Real-World Fidelity Gate** — MANDATORY when authoring, reviewing, or repairing any integration / E2E / system test.
>
> A test earns trust by reproducing a situation the system can actually meet in production. A scenario that could never occur in real life proves nothing when it passes, and wastes hours when it fails.
>
> 1. **Ask the fidelity question BEFORE writing the setup:** *"Can this sequence, timing, and data actually occur in production?"* If no, the test is mis-specified — fix the SCENARIO, never the assertion.
> 2. **Model only real actor pacing.** Preserve delays present in the real journey; add presentation pacing only when the project contract configures it. Never add a fixed delay to make readiness or settling appear reliable.
> 2a. **Use the runner's synchronization idiom.** Before an action, use the browser/device runner's native wait or an evidenced project helper for applicable readiness and actionability. Bound custom waits and include useful diagnostics; do not require a helper API or object model the project does not use.
> 2b. **Observe → act → observe.** After an action, wait for the expected positive or negative postcondition before the next dependent action, using observable state and the configured runner. Keep the final business assertion in the test. A timeout is a test failure with diagnostics, not permission to weaken the assertion.
> 3. **Wait on a real signal, never a blind sleep.** Find an observable proving the prior step finished — a persisted state change, an audit/version stamp, a queue/worker idle marker, a completion event — and poll until it settles (unchanged across a short stability window). Use a fixed delay ONLY when no observable exists, and say so in a comment. A browser action delay MUST never replace a readiness/actionability wait.
> 4. **Barriers belong in ARRANGE, never in ASSERT.** Waiting for a precondition is fidelity. Widening an assertion's timeout, loosening a comparison, adding a retry around a failing assertion, or skipping the test is masking. NEVER do the latter to force green.
> 5. **Distinguish harness-amplified from real.** Test topologies (shared infra, fan-out consumers, parallel suites, cold starts) can make a rare production race routine locally. Before filing a product defect, state whether the trigger exists in production and at what likelihood.
> 6. **Keep the protected invariant intact.** Improving fidelity must NEVER reduce what the test protects. If a realistic scenario no longer exercises the rule, the rule needs a DIFFERENT realistic scenario — not a weaker assertion.
> 7. **Deliberate impossible-state tests are allowed, but MUST be labelled.** Corruption-repair, migration, and fail-safe tests intentionally construct states production should never reach; comment WHY the state is reachable (upstream bug, partial write, legacy data), so they are never confused with unrealistic setups.
> 8. **Visible browser evidence is part of fidelity.** When the project contract calls for human-QC on a web surface, use its configured visible browser runner or control path when supported; attach runtime/network listeners before interaction and capture/read the configured screenshots, traces, or video. Follow the runner's native waits or an evidenced bounded project helper, and redact sensitive evidence. An unread artifact is not an observation.

<!-- /SYNC:real-world-fidelity-testing -->

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

- Isolated per test/run under the project policy; unique identities where namespaces are shared.
- Repeatable through supported fixtures/transactions or integrity-checked additive setup; preserve shared/persistent data.
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

## Pattern 9: Property / Metamorphic Test

Use when an invariant must hold across an INPUT SPACE, not just one hand-picked example — the strongest defense against over-fitted, fakeable assertions. An example-based test asserting 3 fixed field values can mirror the implementation and pass while protecting no generalizable rule; a property test forces the invariant to survive generated inputs.

1. **Discover the project's property-based testing library** from `docs/project-config.json`, dependency manifests (`package.json`, `*.csproj`, `requirements.txt`/`pyproject.toml`, `pom.xml`/`build.gradle`), and existing tests. Common per stack: **fast-check** (JS/TS), **Hypothesis** (Python), **jqwik** (Java), **FsCheck** (.NET). If none is present, name the stack-appropriate library as the recommended add and state confidence; do NOT hand-roll a random-input loop when a real generator/shrinker library is available.
2. **Define the input domain** with the library's generators (arbitraries/strategies): the full realistic range of valid inputs for the behavior under test — bounded by the same constraints the production validation enforces. Cite the local generator/builder pattern if the suite already has one.
3. **Assert a named invariant or metamorphic relation** that must hold for EVERY generated input — not a fixed expected value. Common metamorphic relations:
   - **Round-trip:** `decode(encode(x)) == x`; `fromDto(toDto(e))` preserves all business fields.
   - **Commutativity / order-independence:** reordering inputs yields the same aggregate (e.g. total, set, projection).
   - **Idempotency:** applying the operation twice equals applying it once (re-running a sync/upsert/state transition leaves identical state).
   - **Invariance / preservation:** a conserved quantity (sum, count, balance) is unchanged across a transformation that should not alter it.
   - **Monotonicity / ordering:** a larger input never produces a smaller ranked/sorted output.
4. **Let the library shrink on failure** — record the minimal failing counterexample it reports; that counterexample is the exact missing-invariant case to add as a regression example test.
5. **Exercise the real application boundary** for state-changing properties (drive each generated input through the same command/handler path as the other patterns), then assert the invariant on persisted/observable state — wrap in the configured async wait/poll helper when writes are delayed.
6. **Tie the property back to a §8 Invariant/Property TC.** Each property test carries the `TestSpec` annotation linking to its TC-{FEATURE}-{NNN} (the spec's Invariant/Property TC category). One Invariant/Property TC may map to one property test that internally covers the whole space — do NOT split it into one TC per generated input.

Prefer a property test over a hand-picked example whenever the behavior owns a universally-quantified rule (a conservation law, a round-trip, an ordering, an idempotent transition). Keep example-based tests for concrete acceptance scenarios and specific edge cases; use property tests to guard the invariant across the space the examples cannot enumerate.

## Pattern 10: Settle Barrier Between Actor Steps

Use when one arrange step must be fully absorbed by the system before the next actor action starts — the fidelity tool for behaviors production separates by seconds, minutes, or hours (see the Real-World Fidelity Gate above). Firing both actions in the same millisecond lets in-flight asynchronous work from step 1 land after step 2 and overwrite it, which surfaces as a phantom product defect.

1. **Pick an observable that proves step 1 finished** — the persisted field the step writes, an audit/version/revision stamp, a queue depth or worker-idle marker, a completion event, or a projection's last-processed marker. Prefer the one closest to the work that can clobber the next step.
2. **Poll it until it stops changing**, not until it first appears: capture the value, wait a short interval, re-capture, and treat it as settled only when it is unchanged across a stability window (a few consecutive identical reads).
3. **Bound the wait** with a maximum duration drawn from the timeouts nearby tests already use.
4. **Return best-effort on timeout — do NOT fail inside the barrier.** The barrier is arrange, not verdict: let the real assertions produce the failure so the report names the broken behavior, not the helper.
5. **Call it in ARRANGE, between the two actor actions.** Reuse the suite's existing async wait/poll helper rather than adding a new one.

```text
settleBarrier(readObservable, maxWait, pollInterval, stableReads):
    deadline  = now + maxWait
    last      = readObservable()
    stableHits = 0
    while now < deadline:
        wait(pollInterval)
        current = readObservable()
        stableHits = (current == last) ? stableHits + 1 : 0
        last = current
        if stableHits >= stableReads:
            return SETTLED
    return NOT_SETTLED        # best-effort: let the test's own assertions decide the verdict
```

**Contrast with the anti-patterns it replaces:**

| Shape                                                | Why it is wrong                                                                                                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixed sleep between the two actor actions            | Guesses a duration; too short still races, too long taxes every run. Only acceptable when NO observable exists — and then say so in a comment.    |
| Widening the failing assertion's timeout             | Masks a scenario defect as a slow assertion. The precondition never settled; the assertion is not the broken part.                                |
| Retry loop wrapped around the failing assertion      | Converts a fidelity gap into flake tolerance and hides the overwrite entirely.                                                                    |
| Skipping or deleting the test                        | Drops the protected invariant. The rule still needs a realistic scenario.                                                                          |

## Anti-Patterns

- Smoke-only tests that assert only no exception or non-null result.
- Property tests that re-derive the expected value with the SAME computation the handler uses (mirrors implementation — the property is vacuous; assert an independent invariant/metamorphic relation instead).
- Hand-rolled random-input loops with no shrinker when a real property-based library is available in or addable to the stack.
- Tests that duplicate handler implementation instead of asserting externally observable behavior.
- Shared static test data that makes repeat runs flaky.
- Direct data writes that bypass the behavior under test when the invariant belongs to the command/application pipeline.
- Assertions outside the configured async wait helper when the state can be produced asynchronously.
- New local helpers that duplicate existing test utilities.

## Verification Checklist

- The selected business case identity/carrier maps to its canonical owner and actual assertion; technical-only contracts need no invented business TC.
- Protected business intent or invariant is named.
- Existing local integration-test patterns were cited before implementation.
- Test data is unique and repeatable.
- Data-state assertions verify specific fields.
- Async side effects use the configured wait/poll helper.
- Behaviors owning a universally-quantified rule (round-trip, commutativity, idempotency, conservation, ordering) carry a Pattern 9 property test tied to a §8 Invariant/Property TC, using the discovered property-based library and its shrinker.
- Focused test command was run or an explicit blocker was recorded.
