---
name: workflow-feature-with-integration-test
version: 1.0.0
description: '[Workflow] Trigger Feature with Integration Test workflow — implement a well-defined feature with spec-first integration testing: spec writing before implementation, plan refinement, and test verification.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `feature-with-integration-test` workflow. Run `/workflow-start feature-with-integration-test` with the user's prompt as context.

**Steps:** /scout → /investigate → /plan → /plan-review → /plan-validate → /why-review → /tdd-spec → /tdd-spec-review → /plan → /plan-review → /cook → /integration-test → /test → /workflow-review-changes → /sre-review → /security → /changelog → /test → /docs-update → /watzup → /workflow-end

---

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step           | Occurrence   | Task Description                                                |
| -------------- | ------------ | --------------------------------------------------------------- |
| `/plan`        | 1st (pos 3)  | PLAN₁: Investigation-based implementation plan                  |
| `/plan`        | 2nd (pos 9)  | PLAN₂: Implementation + integration test plan (after TDD specs) |
| `/plan-review` | 1st (pos 4)  | Review PLAN₁                                                    |
| `/plan-review` | 2nd (pos 10) | Review PLAN₂                                                    |
| `/test`        | 1st (pos 13) | Test after integration tests                                    |
| `/test`        | 2nd (pos 18) | Final test verification                                         |

**NEVER deduplicate** — each occurrence is a distinct task with a different purpose.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
