---
name: workflow-bugfix
version: 1.0.0
description: '[Workflow] Trigger Bug Fix workflow — systematic debugging with root cause investigation, fix, and verification.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

> **[CRITICAL] Plan Before Fix Gate:** The `/plan → /plan-review → /plan-validate` steps are MANDATORY before `/fix`. You MUST ATTENTION create todo tasks for these plan steps AND complete them before proceeding to fix. Never skip planning — fixes without validated plans lead to incomplete root cause analysis and regressions.

Activate the `bugfix` workflow. Run `/workflow-start bugfix` with the user's prompt as context.

**Steps:** /scout → /investigate → /debug-investigate → /plan → /plan-review → /plan-validate → /why-review → /fix → /prove-fix → /tdd-spec → /tdd-spec-review → /test-specs-docs → /workflow-review-changes → /changelog → /test → /docs-update → /watzup → /workflow-end
