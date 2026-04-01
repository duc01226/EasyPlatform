---
name: workflow-feature
version: 1.0.0
description: '[Workflow] Trigger Feature Implementation workflow — implement a well-defined feature with investigation, planning, implementation, and review.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `feature` workflow. Run `/workflow-start feature` with the user's prompt as context.

**Steps:** /scout → /feature-investigation → /plan → /plan-review → /plan-validate → /why-review → /tdd-spec → /tdd-spec-review → /plan → /plan-review → /cook → /tdd-spec → /tdd-spec-review → /test-specs-docs → /code-simplifier → /review-changes → /review-architecture → /code-review → /sre-review → /security → /performance → /changelog → /test → /docs-update → /watzup → /workflow-end

## Conditional UI Planning

When a feature involves UI changes (detected during `/scout` or `/feature-investigation`):

- If image/wireframe/Figma URL is provided → route to `/wireframe-to-spec` or `/figma-design` before `/plan`
- If `/plan` detects frontend phases → ensure `ui-wireframe-protocol.md` sections are included in plan phases
- This is advisory — NOT a mandatory workflow step change. The existing workflow sequence remains unchanged.

## Closing Rule

Every step = `TaskUpdate in_progress` → `Skill` tool → complete skill → `TaskUpdate completed`. No shortcuts.
