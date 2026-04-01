---
name: workflow-testing
version: 1.0.0
description: '[Workflow] Trigger Testing workflow — test creation and execution workflow.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `testing` workflow. Run `/workflow-start testing` with the user's prompt as context.

**Steps:** /test → /workflow-end
