---
name: workflow-po-ba-handoff
version: 1.0.0
description: '[Workflow] Trigger PO to BA Handoff workflow — po hands off idea/pbi to ba for refinement and story creation.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `po-ba-handoff` workflow. Run `/workflow-start po-ba-handoff` with the user's prompt as context.

**Steps:** /idea → /review-artifact → /handoff → /refine → /refine-review → /story → /story-review → /pbi-challenge → /dor-gate → /pbi-mockup → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
