---
name: workflow-documentation
version: 1.0.0
description: '[Workflow] Trigger Documentation Update workflow — documentation creation and update workflow with plan validation.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `documentation` workflow. Run `/workflow-start documentation` with the user's prompt as context.

**Steps:** /scout → /investigate → /plan → /plan-review → /plan-validate → /docs-update → /workflow-review-changes → /review-post-task → /watzup → /workflow-end
