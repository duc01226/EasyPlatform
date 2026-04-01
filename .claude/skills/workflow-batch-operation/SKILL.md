---
name: workflow-batch-operation
version: 1.0.0
description: '[Workflow] Trigger Batch Operation workflow — bulk modifications across multiple files with planning and review.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `batch-operation` workflow. Run `/workflow-start batch-operation` with the user's prompt as context.

**Steps:** /plan → /plan-review → /plan-validate → /why-review → /code → /tdd-spec → /tdd-spec-review → /test-specs-docs → /code-simplifier → /review-changes → /review-architecture → /code-review → /sre-review → /performance → /test → /docs-update → /watzup → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
