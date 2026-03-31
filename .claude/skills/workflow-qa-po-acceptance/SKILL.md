---
name: workflow-qa-po-acceptance
version: 1.0.0
description: '[Workflow] Trigger QA to PO Acceptance workflow — testing complete, qa hands off to po for acceptance and sign-off.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `qa-po-acceptance` workflow. Run `/workflow-start qa-po-acceptance` with the user's prompt as context.

**Steps:** /quality-gate → /handoff → /acceptance → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
