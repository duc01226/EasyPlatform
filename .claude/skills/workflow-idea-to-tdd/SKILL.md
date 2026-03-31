---
name: workflow-idea-to-tdd
version: 1.0.0
description: '[Workflow] Trigger Idea to TDD Specs workflow — full cycle: capture idea interactively, refine to pbi with testability assessment, generate tdd test specifications.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `idea-to-tdd` workflow. Run `/workflow-start idea-to-tdd` with the user's prompt as context.

**Steps:** /idea → /refine → /refine-review → /tdd-spec → /tdd-spec-review → /pbi-mockup → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
