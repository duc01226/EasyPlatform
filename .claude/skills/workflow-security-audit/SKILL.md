---
name: workflow-security-audit
version: 1.0.0
description: '[Workflow] Trigger Security Audit workflow — security review and vulnerability assessment.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `security-audit` workflow. Run `/workflow-start security-audit` with the user's prompt as context.

**Steps:** /scout → /security → /watzup → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
