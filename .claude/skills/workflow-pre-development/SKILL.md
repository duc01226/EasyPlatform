---
name: workflow-pre-development
version: 1.0.0
description: '[Workflow] Trigger Pre-Development Check workflow — quality gate verification before development begins.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `pre-development` workflow. Run `/workflow-start pre-development` with the user's prompt as context.

**Steps:** /quality-gate → /plan → /plan-review → /plan-validate → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
