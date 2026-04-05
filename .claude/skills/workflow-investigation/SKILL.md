---
name: workflow-investigation
version: 1.0.0
description: '[Workflow] Trigger Code Investigation workflow — codebase exploration and understanding workflow.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `investigation` workflow. Run `/workflow-start investigation` with the user's prompt as context.

**Steps:** /scout → /investigate → /workflow-end
