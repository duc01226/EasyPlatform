---
name: workflow-verification
version: 1.0.0
description: '[Workflow] Trigger Verification & Validation workflow — verify, validate, and confirm correctness with investigation and testing.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `verification` workflow. Run `/workflow-start verification` with the user's prompt as context.

**Steps:** /scout → /investigate → /test-initial → /plan → /plan-review → /plan-validate → /fix → /prove-fix → /tdd-spec → /tdd-spec-review → /test-specs-docs → /workflow-review-changes → /test → /watzup → /workflow-end
