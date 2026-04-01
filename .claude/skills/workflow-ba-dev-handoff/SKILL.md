---
name: workflow-ba-dev-handoff
version: 1.0.0
description: '[Workflow] Trigger BA to Dev Handoff workflow — ba hands off refined stories to development team with quality gate.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `ba-dev-handoff` workflow. Run `/workflow-start ba-dev-handoff` with the user's prompt as context.

**Steps:** /review-artifact → /quality-gate → /handoff → /plan → /plan-review → /plan-validate → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
