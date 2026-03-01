---
name: workflow-batch-operation
version: 1.0.0
description: '[Workflow] Trigger Batch Operation workflow — bulk modifications across multiple files with planning and review.'
---

Activate the `batch-operation` workflow. Run `/workflow-start batch-operation` with the user's prompt as context.

**Steps:** /plan → /plan-review → /plan-validate → /why-review → /code → /code-simplifier → /review-changes → /sre-review → /test → /docs-update → /watzup → /workflow-end
