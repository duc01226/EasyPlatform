---
name: workflow-review
version: 1.0.0
description: '[Workflow] Trigger Code Review workflow — code review and quality check workflow.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `review` workflow. Run `/workflow-start review` with the user's prompt as context.

**Steps:** /review-architecture → /code-simplifier → /code-review → /performance → /watzup → /workflow-end
