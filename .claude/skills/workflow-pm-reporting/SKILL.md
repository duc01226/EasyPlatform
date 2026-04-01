---
name: workflow-pm-reporting
version: 1.0.0
description: '[Workflow] Trigger PM Reporting workflow — pm workflow: generate status report and dependency analysis.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `pm-reporting` workflow. Run `/workflow-start pm-reporting` with the user's prompt as context.

**Steps:** /status → /dependency → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
