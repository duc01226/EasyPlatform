---
name: workflow-review-changes
version: 1.0.0
description: '[Workflow] Trigger Review Current Changes workflow — review uncommitted changes before commit with summary report.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `review-changes` workflow. Run `/workflow-start review-changes` with the user's prompt as context.

**Steps:** /review-changes → /review-architecture → /code-simplifier → /code-review → /performance → /watzup → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
- **MUST** execute two review rounds (Round 1: understand, Round 2: catch missed issues)
