---
name: workflow-sprint-retro
version: 1.0.0
description: '[Workflow] Trigger Sprint Retrospective workflow — end of sprint retrospective with feedback and action items.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `sprint-retro` workflow. Run `/workflow-start sprint-retro` with the user's prompt as context.

**Steps:** /status → /retro → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
