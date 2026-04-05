---
name: workflow-big-feature
version: 1.0.0
description: '[Workflow] Trigger Big Feature workflow — research-driven development for large, complex, or ambiguous features needing market research, business evaluation, domain analysis, tech stack research, and architecture design before implementation.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `big-feature` workflow. Run `/workflow-start big-feature` with the user's prompt as context.

**Steps:** /idea → /web-research → /deep-research → /business-evaluation → /domain-analysis → /tech-stack-research → /architecture-design → /plan → /plan-review → /refine → /refine-review → /story → /story-review → /pbi-mockup → /tdd-spec → /tdd-spec-review → /plan → /plan-review → /scaffold → /plan-validate → /why-review → /cook → /integration-test → /workflow-review-changes → /sre-review → /security → /changelog → /test → /docs-update → /watzup → /workflow-end

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step           | Occurrence   | Task Description                                                |
| -------------- | ------------ | --------------------------------------------------------------- |
| `/plan`        | 1st (pos 8)  | PLAN₁: High-level architecture plan (after architecture-design) |
| `/plan`        | 2nd (pos 17) | PLAN₂: Sprint-ready implementation plan (after tdd-spec-review) |
| `/plan-review` | 1st (pos 9)  | Review PLAN₁ architecture                                       |
| `/plan-review` | 2nd (pos 18) | Review PLAN₂ implementation                                     |

**NEVER deduplicate** — each occurrence is a distinct task with a different purpose.

---

## Closing Rule

Every step = `TaskUpdate in_progress` → `Skill` tool → complete skill → `TaskUpdate completed`. No shortcuts.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
