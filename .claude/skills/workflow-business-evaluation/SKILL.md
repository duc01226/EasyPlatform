---
name: workflow-business-evaluation
version: 1.0.0
description: '[Workflow] Trigger Business Idea Evaluation workflow — research market, evaluate business idea viability with bmc, financials, risk matrix, and execution plan.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `business-evaluation` workflow. Run `/workflow-start business-evaluation` with the user's prompt as context.

**Steps:** /web-research → /deep-research → /market-analysis → /business-evaluation → /knowledge-review → /workflow-end

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
