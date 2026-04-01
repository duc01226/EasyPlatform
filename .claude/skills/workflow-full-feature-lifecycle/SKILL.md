---
name: workflow-full-feature-lifecycle
version: 1.0.0
description: '[Workflow] Trigger Full Feature Lifecycle workflow — complete feature from idea to release with formal role handoffs (PO→BA→Designer→Dev→QA→PO acceptance).'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `full-feature-lifecycle` workflow. Run `/workflow-start full-feature-lifecycle` with the user's prompt as context.

**Steps:** /idea → /refine → /refine-review → /story → /story-review → /pbi-challenge → /dor-gate → /pbi-mockup → /design-spec → /interface-design → /frontend-design → /plan → /plan-review → /plan-validate → /cook → /code-simplifier → /review-changes → /review-architecture → /code-review → /sre-review → /performance → /test-spec → /quality-gate → /docs-update → /watzup → /acceptance → /workflow-end

## Closing Rule

Every step = `TaskUpdate in_progress` → `Skill` tool → complete skill → `TaskUpdate completed`. No shortcuts.

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
