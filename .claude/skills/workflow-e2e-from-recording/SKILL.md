---
name: workflow-e2e-from-recording
version: 1.0.0
description: '[Workflow] Trigger E2E from Recording workflow — generate playwright e2e tests from chrome devtools recordings.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `e2e-from-recording` workflow. Run `/workflow-start e2e-from-recording` with the user's prompt as context.

**Steps:** /scout → /e2e-test → /test → /watzup → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
