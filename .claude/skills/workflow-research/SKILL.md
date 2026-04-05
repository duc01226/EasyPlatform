---
name: workflow-research
version: 1.0.0
description: '[Workflow] Trigger Research & Synthesis workflow — research a topic, gather web sources, synthesize into structured report.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `research` workflow. Run `/workflow-start research` with the user's prompt as context.

**Steps:** /web-research → /deep-research → /knowledge-synthesis → /knowledge-review → /workflow-end
