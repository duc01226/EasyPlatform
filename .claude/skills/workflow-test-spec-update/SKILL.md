---
name: workflow-test-spec-update
version: 1.0.0
description: '[Workflow] Trigger Test Spec Update (Post-Change) workflow — update test specs and feature docs after code changes, bug fixes, or pr reviews.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `test-spec-update` workflow. Run `/workflow-start test-spec-update` with the user's prompt as context.

**Steps:** /review-changes → /tdd-spec → /tdd-spec-review → /test-specs-docs → /integration-test → /test → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
