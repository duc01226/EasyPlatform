---
name: workflow-package-upgrade
version: 1.0.0
description: '[Workflow] Trigger Package Upgrade workflow — upgrade dependencies, npm update, NuGet upgrade with testing.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `package-upgrade` workflow. Run `/workflow-start package-upgrade` with the user's prompt as context.

**Steps:** /scout → /investigate → /plan → /plan-review → /plan-validate → /code → /integration-test → /integration-test-review → /test → /workflow-review-changes → /docs-update → /watzup → /workflow-end

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
