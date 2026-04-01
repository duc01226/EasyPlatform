---
name: workflow-greenfield
version: 1.0.0
description: '[Workflow] Trigger Greenfield Project Init workflow — start a new project from scratch with full inception, implementation, and integration testing.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `greenfield-init` workflow. Run `/workflow-start greenfield-init` with the user's prompt as context.

**Steps:** /idea → /web-research → /deep-research → /business-evaluation → /domain-analysis → /tech-stack-research → /architecture-design → /plan → /security → /performance → /plan-review → /refine → /refine-review → /story → /story-review → /plan-validate → /tdd-spec → /tdd-spec-review → /plan → /plan-review → /scaffold → /why-review → /cook → /tdd-spec → /tdd-spec-review → /plan → /plan-review → /integration-test → /test → /code-simplifier → /review-changes → /code-review → /sre-review → /security → /performance → /changelog → /test → /docs-update → /watzup → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
