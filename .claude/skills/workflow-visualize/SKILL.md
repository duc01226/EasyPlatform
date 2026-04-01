---
name: workflow-visualize
version: 1.0.0
description: '[Workflow] Trigger Visual Diagram workflow — create visual excalidraw diagrams from codebase investigation or web research.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `visualize` workflow. Run `/workflow-start visualize` with the user's prompt as context.

**Steps:** /scout → /investigate → /excalidraw-diagram → /workflow-end
