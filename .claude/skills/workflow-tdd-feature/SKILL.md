---
name: workflow-tdd-feature
version: 1.0.0
description: '[Workflow] Trigger TDD Feature workflow — test-driven development with spec-first approach, write test specs before implementing.'
---

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `tdd-feature` workflow. Run `/workflow-start tdd-feature` with the user's prompt as context.

**Steps:** /scout → /investigate → /tdd-spec → /tdd-spec-review → /plan → /plan-review → /plan-validate → /why-review → /cook → /integration-test → /test → /workflow-review-changes → /sre-review → /changelog → /docs-update → /watzup → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
