---
name: workflow-quality-audit
version: 1.0.0
description: '[Workflow] Trigger Quality Audit workflow — audit code quality, review for best practices, find flaws and suggest enhancements.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `quality-audit` workflow. Run `/workflow-start quality-audit` with the user's prompt as context.

**Steps:** /code-review → /plan → /plan-review → /plan-validate → /code → /tdd-spec → /tdd-spec-review → /review-changes → /test → /watzup → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
