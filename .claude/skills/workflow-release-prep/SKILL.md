---
name: workflow-release-prep
version: 1.0.0
description: '[Workflow] Trigger Release Preparation workflow — pre-release quality gate with sre review and status verification.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `release-prep` workflow. Run `/workflow-start release-prep` with the user's prompt as context.

**Steps:** /sre-review → /quality-gate → /status → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
