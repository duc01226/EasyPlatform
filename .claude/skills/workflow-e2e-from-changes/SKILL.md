---
name: workflow-e2e-from-changes
version: 1.0.0
description: '[Workflow] Trigger E2E from Changes workflow — update e2e tests based on code or spec changes.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `e2e-from-changes` workflow. Run `/workflow-start e2e-from-changes` with the user's prompt as context.

**Steps:** /scout → /e2e-test → /test → /watzup → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
