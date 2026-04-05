---
name: workflow-deployment
version: 1.0.0
description: '[Workflow] Trigger Deployment & Infrastructure workflow — CI/CD pipelines, Docker, Kubernetes setup and deployment.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `deployment` workflow. Run `/workflow-start deployment` with the user's prompt as context.

**Steps:** /scout → /investigate → /plan → /plan-review → /plan-validate → /code → /workflow-review-changes → /sre-review → /test → /watzup → /workflow-end
