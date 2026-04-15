---
name: workflow-idea-to-pbi
version: 1.1.0
description: '[Workflow] Trigger Idea to PBI workflow — po/ba workflow: capture or review idea/artifact, optional PO handoff, refine to pbi, create stories, prioritize.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `idea-to-pbi` workflow. Run `/workflow-start idea-to-pbi` with the user's prompt as context.

**Steps:** /idea → /review-artifact (conditional) → /handoff (conditional) → /refine → /refine-review → /story → /story-review → /pbi-challenge → /dor-gate → /pbi-mockup → /prioritize → /workflow-end

> **Note:** `/review-artifact` and `/handoff` are conditional — skip both when starting from a raw idea without a PO artifact. Use them when a PO is handing off an existing ticket, PRD, or brief to the BA team.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
