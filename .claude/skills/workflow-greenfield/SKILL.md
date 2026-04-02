---
name: workflow-greenfield
version: 1.0.0
description: '[Workflow] Trigger Greenfield Project Init workflow — start a new project from scratch with full inception, implementation, and integration testing.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `greenfield-init` workflow. Run `/workflow-start greenfield-init` with the user's prompt as context.

**Steps:** /idea → /web-research → /deep-research → /business-evaluation → /domain-analysis → /tech-stack-research → /architecture-design → /plan → /security → /performance → /plan-review → /refine → /refine-review → /story → /story-review → /pbi-mockup → /plan-validate → /tdd-spec → /tdd-spec-review → /plan → /plan-review → /scaffold → /why-review → /cook → /tdd-spec → /tdd-spec-review → /plan → /plan-review → /integration-test → /test → /workflow-review-changes → /sre-review → /security → /changelog → /test → /docs-update → /watzup → /workflow-end

---

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step               | Occurrence   | Task Description                                                |
| ------------------ | ------------ | --------------------------------------------------------------- |
| `/plan`            | 1st (pos 8)  | PLAN₁: High-level architecture plan (after architecture-design) |
| `/plan`            | 2nd (pos 20) | PLAN₂: Sprint-ready implementation plan (after tdd-spec-review) |
| `/plan`            | 3rd (pos 27) | PLAN₃: Integration test architecture plan (post-implementation) |
| `/plan-review`     | 1st (pos 11) | Review PLAN₁ architecture                                       |
| `/plan-review`     | 2nd (pos 21) | Review PLAN₂ implementation                                     |
| `/plan-review`     | 3rd (pos 28) | Review PLAN₃ integration tests                                  |
| `/security`        | 1st (pos 9)  | Architecture security review                                    |
| `/security`        | 2nd (pos 32) | Production readiness security review                            |
| `/tdd-spec`        | 1st (pos 18) | TDD-SPEC₁: Feature test specs (before implementation)           |
| `/tdd-spec`        | 2nd (pos 24) | TDD-SPEC₂: Post-implementation test spec update                 |
| `/tdd-spec-review` | 1st (pos 19) | Review TDD-SPEC₁                                                |
| `/tdd-spec-review` | 2nd (pos 25) | Review TDD-SPEC₂                                                |
| `/test`            | 1st (pos 30) | Test after integration tests                                    |
| `/test`            | 2nd (pos 35) | Final test verification                                         |

**NEVER deduplicate** — each occurrence is a distinct task with a different purpose.

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
