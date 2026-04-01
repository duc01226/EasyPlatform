---
name: workflow-big-feature
version: 1.0.0
description: '[Workflow] Trigger Big Feature workflow — research-driven development for large, complex, or ambiguous features needing market research, business evaluation, domain analysis, tech stack research, and architecture design before implementation.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `big-feature` workflow. Run `/workflow-start big-feature` with the user's prompt as context.

**Steps:** /idea → /web-research → /deep-research → /business-evaluation → /domain-analysis → /tech-stack-research → /architecture-design → /plan → /plan-review → /refine → /refine-review → /story → /story-review → /pbi-mockup → /tdd-spec → /tdd-spec-review → /plan → /plan-review → /scaffold → /plan-validate → /why-review → /cook → /integration-test → /code-simplifier → /review-changes → /review-architecture → /code-review → /sre-review → /security → /performance → /changelog → /test → /docs-update → /watzup → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
