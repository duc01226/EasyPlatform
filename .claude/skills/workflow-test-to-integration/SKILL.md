---
name: workflow-test-to-integration
version: 1.0.0
description: '[Workflow] Trigger Test Specs to Integration Tests workflow — generate integration tests from existing test specifications in feature docs or test-specs/.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `test-to-integration` workflow. Run `/workflow-start test-to-integration` with the user's prompt as context.

**Steps:** /scout → /integration-test → /test → /watzup → /workflow-end

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
