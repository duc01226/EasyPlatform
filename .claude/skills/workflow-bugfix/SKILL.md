---
name: workflow-bugfix
version: 1.0.0
description: '[Workflow] Trigger Bug Fix workflow — systematic debugging with root cause investigation, fix, and verification.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

> **[CRITICAL] Plan Before Fix Gate:** The `/plan → /plan-review → /plan-validate` steps are MANDATORY before `/fix`. You MUST ATTENTION create todo tasks for these plan steps AND complete them before proceeding to fix. Never skip planning — fixes without validated plans lead to incomplete root cause analysis and regressions.

Activate the `bugfix` workflow. Run `/workflow-start bugfix` with the user's prompt as context.

**Steps:** /scout → /investigate → /debug-investigate → /plan → /plan-review → /plan-validate → /why-review → /tdd-spec → /tdd-spec-review → /integration-test → /fix → /prove-fix → /integration-test → /integration-test-review → /workflow-review-changes → /changelog → /test → /docs-update → /watzup → /workflow-end

> **[TDD-FIRST BUG FIX]** The two `/integration-test` occurrences are intentional and serve distinct purposes:
>
> - **First `/integration-test` (RED phase):** Write a regression test that REPRODUCES the bug. Run it — it MUST FAIL. If it passes, the test does not catch the bug. Never proceed to fix until the test fails.
> - **Second `/integration-test` (GREEN phase):** Re-run integration tests after the fix — expect all to PASS. Confirms the fix works AND the regression guard is in place.
> - **`/integration-test-review`:** Verify tests have real assertion value (not smoke/existence-only checks).

## Repeated Steps Disambiguation (CRITICAL for task creation)

| Step                | Occurrence | Task Description                                          |
| ------------------- | ---------- | --------------------------------------------------------- |
| `/integration-test` | 1st        | INT-TEST₁ — RED phase: write regression test, expect FAIL |
| `/integration-test` | 2nd        | INT-TEST₂ — GREEN phase: re-run after fix, expect PASS    |
