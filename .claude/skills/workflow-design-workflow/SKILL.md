---
name: workflow-design-workflow
version: 1.0.0
description: '[Workflow] Trigger Design Workflow workflow — designer workflow: create design specification from requirements, hand off for review.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `design-workflow` workflow. Run `/workflow-start design-workflow` with the user's prompt as context.

**Steps:** /design-spec → /interface-design → /code-review → /workflow-end
