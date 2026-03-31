---
name: workflow-sprint-planning
version: 1.0.0
description: '[Workflow] Trigger Sprint Planning workflow — sprint planning ceremony with backlog prioritization and dependency check.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `sprint-planning` workflow. Run `/workflow-start sprint-planning` with the user's prompt as context.

**Steps:** /prioritize → /dependency → /team-sync → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
- **MUST** include Test Specifications section and story_points in plan frontmatter
