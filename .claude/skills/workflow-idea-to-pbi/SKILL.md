---
name: workflow-idea-to-pbi
version: 1.0.0
description: '[Workflow] Trigger Idea to PBI workflow — po/ba workflow: capture idea, refine to pbi, create stories, prioritize.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `idea-to-pbi` workflow. Run `/workflow-start idea-to-pbi` with the user's prompt as context.

**Steps:** /idea → /refine → /refine-review → /story → /story-review → /pbi-challenge → /dor-gate → /pbi-mockup → /prioritize → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
