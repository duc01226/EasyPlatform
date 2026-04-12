---
name: workflow-test-verify
version: 1.0.0
description: '[Workflow] Trigger Test Verification & Quality workflow — comprehensive test verification: review quality, diagnose failures, verify traceability, fix flaky tests.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `test-verify` workflow. Run `/workflow-start test-verify` with the user's prompt as context.

**Steps:** /scout → /integration-test → /test → /integration-test → /integration-test-review → /docs-update → /watzup → /workflow-end

> **[NOTE]** The two `/integration-test` occurrences are intentional and serve distinct purposes:
>
> - **First `/integration-test` (audit mode):** Review test quality — check for flaky patterns, missing `WaitUntilAsync`, smoke-only assertions, and best practice compliance.
> - **Second `/integration-test` (diagnose mode):** Root-cause failing or flaky tests identified in the audit phase. Fix and re-verify.
> - **`/integration-test-review`:** Final quality gate — verify tests have real assertion value after any fixes applied.

## Repeated Steps Disambiguation (CRITICAL for task creation)

| Step                | Occurrence | Task Description                                                       |
| ------------------- | ---------- | ---------------------------------------------------------------------- |
| `/integration-test` | 1st        | INT-TEST₁ — audit mode: review test quality, identify flaky/weak tests |
| `/integration-test` | 2nd        | INT-TEST₂ — diagnose mode: root-cause and fix failing/flaky tests      |

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
