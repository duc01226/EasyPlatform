---
name: workflow-refactor
version: 1.0.0
description: '[Workflow] Trigger Code Refactoring workflow — restructure and improve existing code without changing behavior.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `refactor` workflow. Run `/workflow-start refactor` with the user's prompt as context.

**Steps:** /scout → /investigate → /plan → /plan-review → /plan-validate → /why-review → /code → /tdd-spec → /tdd-spec-review → /test-specs-docs → /integration-test → /integration-test-review → /workflow-review-changes → /sre-review → /changelog → /test → /docs-update → /watzup → /workflow-end

> **[PERFORMANCE EXCEPTION]** If this refactor is performance-driven (query optimization, caching, reducing allocations, improving throughput), skip `/tdd-spec`, `/tdd-spec-review`, `/test-specs-docs`, `/integration-test`, `/integration-test-review`, and `/integration-test-verify`. Integration tests verify functional correctness — they cannot measure performance. Use `/test` only to confirm no functional regressions. Activate `/workflow-performance` instead.
