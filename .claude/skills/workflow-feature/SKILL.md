---
name: workflow-feature
version: 1.0.0
description: '[Workflow] Trigger Feature Implementation workflow — implement a well-defined feature with investigation, planning, implementation, and review.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `feature` workflow. Run `/workflow-start feature` with the user's prompt as context.

**Steps:** /scout → /investigate → /plan → /plan-review → /plan-validate → /why-review → /tdd-spec → /tdd-spec-review → /plan → /plan-review → /cook → /tdd-spec → /tdd-spec-review → /test-specs-docs → /integration-test → /integration-test-review → /workflow-review-changes → /sre-review → /security → /changelog → /test → /docs-update → /watzup → /workflow-end

> **[PERFORMANCE EXCEPTION]** If this feature is a performance enhancement (query optimization, caching, throughput improvement, latency reduction), skip `/tdd-spec` (both occurrences), `/tdd-spec-review` (both occurrences), PLAN₂ + its `/plan-review`, `/test-specs-docs`, `/integration-test`, `/integration-test-review`, and `/integration-test-verify`. Do NOT skip `/cook` — implementation still runs. Integration tests verify functional correctness — they cannot measure performance. Use `/test` only to confirm no functional regressions. Activate `/workflow-performance` instead.

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step               | Occurrence   | Task Description                                 |
| ------------------ | ------------ | ------------------------------------------------ |
| `/plan`            | 1st (pos 3)  | PLAN₁: Investigation-based implementation plan   |
| `/plan`            | 2nd (pos 9)  | PLAN₂: Sprint-ready plan incorporating TDD specs |
| `/plan-review`     | 1st (pos 4)  | Review PLAN₁                                     |
| `/plan-review`     | 2nd (pos 10) | Review PLAN₂                                     |
| `/tdd-spec`        | 1st (pos 7)  | TDD-SPEC₁: Pre-implementation test specs         |
| `/tdd-spec`        | 2nd (pos 11) | TDD-SPEC₂: Post-implementation test spec update  |
| `/tdd-spec-review` | 1st (pos 8)  | Review TDD-SPEC₁                                 |
| `/tdd-spec-review` | 2nd (pos 12) | Review TDD-SPEC₂                                 |

**NEVER deduplicate** — each occurrence is a distinct task with a different purpose.

---

## Conditional UI Planning

When a feature involves UI changes (detected during `/scout` or `/feature-investigation`):

- If image/wireframe/Figma URL is provided → route to `/wireframe-to-spec` or `/figma-design` before `/plan`
- If `/plan` detects frontend phases → ensure `ui-wireframe-protocol.md` sections are included in plan phases
- This is advisory — NOT a mandatory workflow step change. The existing workflow sequence remains unchanged.

## Closing Rule

Every step = `TaskUpdate in_progress` → `Skill` tool → complete skill → `TaskUpdate completed`. No shortcuts.
