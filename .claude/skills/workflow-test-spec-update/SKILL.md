---
name: workflow-test-spec-update
version: 1.0.0
description: '[Workflow] Trigger Test Spec Update (Post-Change) workflow — update test specs and feature docs after code changes, bug fixes, or pr reviews.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `test-spec-update` workflow. Run `/workflow-start test-spec-update` with the user's prompt as context.

**Steps:** /workflow-review-changes → /tdd-spec → /tdd-spec-review → /test-specs-docs → /integration-test → /integration-test-review → /test → /docs-update → /workflow-end

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
