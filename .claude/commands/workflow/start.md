---
description: Activate a workflow from the injected catalog
argument-hint: <workflowId>
---

Activate workflow: `$ARGUMENTS`

## Your Mission

Start the workflow identified by `<workflowId>` from the workflow catalog injected by the hook system. This creates workflow state and prepares the step sequence for execution.

## Workflow

1. **Validate** the workflow ID against the injected catalog
2. **Create workflow state** via the workflow-step-tracker hook
3. **Create TodoWrite items** for ALL sequence steps immediately after activation
4. **Follow the sequence** in order, marking each step `in_progress` then `completed`

## Activation Rules

- Call this ONLY after reading the workflow catalog injected by the hook
- Use the exact workflow ID shown in the catalog (e.g., `feature`, `bugfix`, `investigation`)
- If the workflow has **Confirm first** marker, ask the user BEFORE calling this command
- If called while another workflow is active, it will auto-switch (end current, start new)

## After Activation

Your FIRST action after this command completes MUST be `TodoWrite` with items like:

    [Workflow] /step-command - Step description (status: in_progress for first, pending for rest)

Do NOT skip TodoWrite. It is a hard-blocking requirement.

---

## IMPORTANT Task Planning Notes (MUST FOLLOW)

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
