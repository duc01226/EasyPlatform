---
name: workflow-business-evaluation
version: 1.0.0
description: '[Workflow] Trigger Business Idea Evaluation workflow — research market, evaluate business idea viability with bmc, financials, risk matrix, and execution plan.'
---

> **[IMPORTANT]** This skill activates a full workflow. You MUST create todo tasks for ALL steps and execute them in sequence. Do NOT skip any step.

Activate the `business-evaluation` workflow. Run `/workflow-start business-evaluation` with the user's prompt as context.

**Steps:** /web-research → /deep-research → /market-analysis → /business-evaluation → /knowledge-review → /workflow-end

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
