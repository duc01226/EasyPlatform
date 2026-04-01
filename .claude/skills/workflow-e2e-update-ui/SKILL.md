---
name: workflow-e2e-update-ui
version: 1.0.0
description: '[Workflow] Trigger E2E Update UI workflow — update e2e screenshot baselines after ui changes.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `e2e-update-ui` workflow. Run `/workflow-start e2e-update-ui` with the user's prompt as context.

**Steps:** /scout → /e2e-test → /test → /watzup → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
