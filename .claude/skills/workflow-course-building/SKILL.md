---
name: workflow-course-building
version: 1.0.0
description: '[Workflow] Trigger Course Material Builder workflow — research a topic and build structured learning/teaching course material with bloom taxonomy objectives.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `course-building` workflow. Run `/workflow-start course-building` with the user's prompt as context.

**Steps:** /web-research → /deep-research → /course-builder → /knowledge-review → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
