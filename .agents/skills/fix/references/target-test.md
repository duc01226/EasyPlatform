# fix — `--target=test` — failing-test branch

> Read by `$fix --target=test` FIRST, before any other step of the branch (the router `SKILL.md` → **Target Routing**). The Debug Mindset, Confidence & Evidence Gate, Root-Cause Prerequisite Gate and the `SYNC:*` protocol bodies this branch cites live in `SKILL.md`.

## `--target=test` — failing-test branch

**Goal:** Run test suites, analyze failures, and fix the underlying code or test issues.

**Active-goal read (BEFORE fixing):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans/` with `docsRoots.plans.path` in `docs/project-config.json` overriding → create from the reported test failure). Map failing-test evidence (before) and passing-test evidence (after) to the saved success criteria in the Iteration Log — a passing suite that misses a saved required criterion does NOT close the loop.

**Key Rules:**

- Distinguish between code bugs and flawed test expectations.
- Re-run tests after the fix to confirm all pass.
- Read `integration-test-reference.md` from the reference-docs root before reviewing/writing integration tests; consult the business spec root for expected-behavior context when diagnosing failures (defaults `docs/project-reference` / `docs/specs/`; `docsRoots.projectReference.path` and `specRoots.business.path` in `docs/project-config.json` override them).

**Workflow:**

1. Use the `tester` subagent to compile the code and fix any syntax errors.
2. Use the `tester` subagent to run the tests; report back. Write failure analysis to `tmp/analysis/{test-issue}.analysis.md`; re-read before fixing.
3. If tests fail, use the `debugger` subagent to find the root cause; report back.
4. Use the `planner` subagent to create an implementation plan; report back.
5. **🛑 Present root cause + fix plan → `ask user question tool` → wait for approval.**
6. Implement the plan step by step.
7. Use the `tester` subagent to verify; report back.
8. Use the `code-reviewer` subagent to review the changes; report back.
9. If tests fail, repeat from step 2.
10. Report a summary; suggest next steps.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.
