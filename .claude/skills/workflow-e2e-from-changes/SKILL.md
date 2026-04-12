---
name: workflow-e2e-from-changes
version: 1.0.0
description: '[Workflow] Trigger E2E from Changes workflow — update e2e tests based on code or spec changes.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `e2e-from-changes` workflow. Run `/workflow-start e2e-from-changes` with the user's prompt as context.

**Steps:** /scout → /e2e-test → /test → /docs-update → /watzup → /workflow-end

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
