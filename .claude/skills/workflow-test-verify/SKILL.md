---
name: workflow-test-verify
version: 1.0.0
description: '[Workflow] Trigger Test Verification & Quality workflow — comprehensive test verification: review quality, diagnose failures, verify traceability, fix flaky tests.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `test-verify` workflow. Run `/workflow-start test-verify` with the user's prompt as context.

**Steps:** /scout → /integration-test → /test → /integration-test → /watzup → /workflow-end
