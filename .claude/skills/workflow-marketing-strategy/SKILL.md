---
name: workflow-marketing-strategy
version: 1.0.0
description: '[Workflow] Trigger Marketing Strategy workflow — research market landscape and build a comprehensive marketing strategy with positioning, channels, campaigns, and kpis.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `marketing-strategy` workflow. Run `/workflow-start marketing-strategy` with the user's prompt as context.

**Steps:** /web-research → /deep-research → /market-analysis → /strategy-builder → /knowledge-review → /workflow-end

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
