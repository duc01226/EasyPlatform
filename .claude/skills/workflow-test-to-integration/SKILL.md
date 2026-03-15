---
name: workflow-test-to-integration
version: 1.0.0
description: '[Workflow] Trigger Test Specs to Integration Tests workflow — generate integration tests from existing test specifications in feature docs or test-specs/.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `test-to-integration` workflow. Run `/workflow-start test-to-integration` with the user's prompt as context.

**Steps:** /scout → /integration-test → /test → /watzup → /workflow-end
