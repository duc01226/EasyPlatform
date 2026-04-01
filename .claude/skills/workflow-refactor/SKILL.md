---
name: workflow-refactor
version: 1.0.0
description: '[Workflow] Trigger Code Refactoring workflow — restructure and improve existing code without changing behavior.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `refactor` workflow. Run `/workflow-start refactor` with the user's prompt as context.

**Steps:** /scout → /feature-investigation → /plan → /plan-review → /plan-validate → /why-review → /code → /tdd-spec → /tdd-spec-review → /test-specs-docs → /code-simplifier → /review-changes → /review-architecture → /code-review → /sre-review → /performance → /changelog → /test → /docs-update → /watzup → /workflow-end
