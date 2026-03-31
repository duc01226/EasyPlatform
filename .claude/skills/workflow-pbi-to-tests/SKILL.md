---
name: workflow-pbi-to-tests
version: 1.0.0
description: '[Workflow] Trigger PBI to Tests workflow — qa workflow: generate tdd test specs from pbi, write to feature docs section 17, run quality gate.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `pbi-to-tests` workflow. Run `/workflow-start pbi-to-tests` with the user's prompt as context.

**Steps:** /tdd-spec → /tdd-spec-review → /quality-gate → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
