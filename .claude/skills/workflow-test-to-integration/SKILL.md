---
name: workflow-test-to-integration
version: 1.0.0
description: '[Workflow] Trigger Test Specs to Integration Tests workflow — generate integration tests from existing test specifications in feature docs or test-specs/.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `test-to-integration` workflow. Run `/workflow-start test-to-integration` with the user's prompt as context.

**Steps:** /scout → /integration-test → /test → /watzup → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
