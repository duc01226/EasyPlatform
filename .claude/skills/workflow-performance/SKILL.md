---
name: workflow-performance
version: 1.0.0
description: '[Workflow] Trigger Performance Optimization workflow — investigate bottlenecks, optimize queries, reduce latency.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `performance` workflow. Run `/workflow-start performance` with the user's prompt as context.

**Steps:** /scout → /feature-investigation → /plan → /plan-review → /plan-validate → /code → /tdd-spec → /tdd-spec-review → /test-specs-docs → /test → /review-changes → /review-architecture → /sre-review → /watzup → /workflow-end
