---
name: workflow-dev-qa-handoff
version: 1.0.0
description: '[Workflow] Trigger Dev to QA Handoff workflow — development complete, handoff to qa for testing.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `dev-qa-handoff` workflow. Run `/workflow-start dev-qa-handoff` with the user's prompt as context.

**Steps:** /handoff → /test-spec → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
