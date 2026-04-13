---
name: workflow-performance
version: 1.0.0
description: '[Workflow] Trigger Performance Optimization workflow — investigate bottlenecks, optimize queries, reduce latency.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `performance` workflow. Run `/workflow-start performance` with the user's prompt as context.

**Steps:** /scout → /investigate → /plan → /plan-review → /plan-validate → /code → /test → /workflow-review-changes → /sre-review → /docs-update → /watzup → /workflow-end

> **[PERFORMANCE EXCEPTION — NO INTEGRATION TESTS]** Integration tests verify functional correctness — they cannot measure latency, throughput, or resource consumption. Do NOT run `/tdd-spec`, `/tdd-spec-review`, `/test-specs-docs`, `/integration-test`, or `/integration-test-review` in this workflow. Run `/test` only to confirm no functional regressions were introduced by the optimization.
