---
name: workflow-feature-with-integration-test
version: 1.0.0
description: '[Workflow] Trigger Feature with Integration Test workflow — implement a well-defined feature with spec-first integration testing: spec writing before implementation, plan refinement, and test verification.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `feature-with-integration-test` workflow. Run `/workflow-start feature-with-integration-test` with the user's prompt as context.

**Steps:** /scout → /feature-investigation → /plan → /plan-review → /plan-validate → /why-review → /tdd-spec → /tdd-spec-review → /plan → /plan-review → /cook → /integration-test → /test → /code-simplifier → /review-changes → /review-architecture → /code-review → /sre-review → /security → /performance → /changelog → /test → /docs-update → /watzup → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
