---
name: workflow-feature-docs
version: 1.0.0
description: '[Workflow] Trigger Business Feature Documentation workflow — business feature documentation with 26-section template enforcement, plan validation, and mandatory test coverage.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `feature-docs` workflow. Run `/workflow-start feature-docs` with the user's prompt as context.

**Steps:** /scout → /investigate → /plan → /plan-review → /plan-validate → /docs-update → /review-changes → /review-post-task → /watzup → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
