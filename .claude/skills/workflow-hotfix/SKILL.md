---
name: workflow-hotfix
version: 1.0.0
description: '[Workflow] Trigger Hotfix workflow — production emergency P0/P1 urgent fix with minimal ceremony.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `hotfix` workflow. Run `/workflow-start hotfix` with the user's prompt as context.

**Steps:** /scout → /plan → /plan-review → /tdd-spec → /tdd-spec-review → /integration-test → /fix → /prove-fix → /integration-test → /integration-test-review → /test → /workflow-review-changes → /sre-review → /docs-update → /watzup → /workflow-end

> **[TDD-FIRST HOTFIX]** The two `/integration-test` occurrences are intentional:
>
> - **First `/integration-test` (RED phase):** Write a regression test that REPRODUCES the production bug. Run it — MUST FAIL. Do NOT skip even in emergencies — an untested hotfix is a future incident.
> - **Second `/integration-test` (GREEN phase):** Re-run after fix — expect PASS. Confirms fix works AND regression guard is in place.
> - **`/integration-test-review`:** Verify test has real assertion value (not smoke-only).

## Repeated Steps Disambiguation (CRITICAL for task creation)

| Step                | Occurrence | Task Description                                          |
| ------------------- | ---------- | --------------------------------------------------------- |
| `/integration-test` | 1st        | INT-TEST₁ — RED phase: write regression test, expect FAIL |
| `/integration-test` | 2nd        | INT-TEST₂ — GREEN phase: re-run after fix, expect PASS    |
