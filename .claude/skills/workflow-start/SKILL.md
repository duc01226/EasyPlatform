---
name: workflow-start
version: 1.0.0
description: "[Skill Management] Activate a workflow from the injected catalog. Use when starting a detected workflow, initializing workflow state, or activating a workflow sequence. Triggers on 'start workflow', 'activate workflow', 'workflow-start', 'begin workflow'."
allowed-tools: TaskCreate
---

> **[MANDATORY]** You MUST use `TaskCreate` to break ALL work into small tasks BEFORE starting. NEVER skip task creation.

## Quick Summary

**Goal:** Activate a workflow by ID, creating tracking tasks and announcing the workflow sequence.

**Workflow:**

1. **Match** -- Validate workflow ID against catalog
2. **Create** -- Set up TaskCreate items for all workflow steps
3. **Announce** -- Tell user the detected intent and workflow sequence

**Key Rules:**

- AI MUST always detect nearest workflow and ask user via AskUserQuestion to confirm activation
- Present "Activate [Workflow] (Recommended)" vs "Execute directly without workflow"
- Create workflow-level tasks BEFORE any implementation tasks

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Workflow Start

Activate a workflow from the injected catalog and initialize step tracking via TaskCreate.

---

## When to Use

- Starting a detected workflow from the injected catalog
- Initializing workflow state for step-by-step execution
- Switching from one active workflow to another

**NOT for**: Manual step execution (follow TaskCreate items), workflow design (use `planning`), or workflow catalog management.

---

## Quick Reference

### Workflow

1. Read the workflow catalog injected by the hook
2. Validate the workflow ID against available entries
3. Create workflow state via the workflow-step-tracker hook
4. Create TaskCreate items for ALL sequence steps immediately
5. Begin first step, marking it `in_progress`

### Related

- **Command:** `/workflow-start <workflowId>`
- **Hook:** `workflow-step-tracker.cjs`
- **Hook:** `workflow-router.cjs`

---

## Activation Rules

- Call ONLY after reading the workflow catalog injected by the hook
- Use the exact workflow ID shown in the catalog (e.g., `feature`, `bugfix`, `investigation`)
- ALWAYS ask the user via AskUserQuestion to confirm activation before proceeding
- If called while another workflow is active, it will auto-switch (end current, start new)

---

## After Activation — Task Creation Protocol (ZERO TOLERANCE)

Your FIRST action after activation MUST be creating EXACTLY one `TaskCreate` for EACH entry in the workflow's `sequence` array from `.claude/workflows.json`.

### How to determine the task list:

1. Read `.claude/workflows.json`
2. Find the activated workflow by ID
3. Read its `sequence` array — this is the SOLE source of truth
4. Create one `TaskCreate` per array entry, IN ORDER

### Task format:

    TaskCreate: subject="[Workflow] /{step-name} — {brief description}", description="Workflow step N/{total}. {conditional note if applicable}", activeForm="Executing /{step-name}"

### Rules (NON-NEGOTIABLE):

- **1:1 mapping** — Each sequence entry = exactly one task. No consolidation, no summarization, no custom task names.
- **Conditional steps still get tasks** — Steps that may be skipped at runtime (e.g., /plan, /cook after a PASS review) STILL get created as tasks. Add to description: "Conditional — skip if reviews pass".
- **Recursive self-calls get tasks** — If the sequence references itself (e.g., `workflow-review-changes` within `review-changes`), create a task: `[Workflow] /workflow-review-changes — Recursive re-review (conditional)`.
- **Never invent tasks** — Do NOT add tasks not in the sequence array (no "Assess results", no "Final review", no "Check output"). Only create what the sequence defines.
- **Count verification** — After creating all tasks, verify: `task count == len(sequence)`. If mismatch, fix immediately before proceeding.

Create ALL tasks first, then mark the first task `in_progress` via `TaskUpdate`.

## Step Execution Protocol (applies to ALL workflows)

Per step: `TaskUpdate in_progress` → **invoke `Skill` tool** → complete skill workflow → `TaskUpdate completed`.

Marking a task `completed` without invoking its `Skill` tool is a workflow violation. Validation gates (`/plan-validate`, `/plan-review`, `/why-review`) require `AskUserQuestion` — never auto-approve or batch-complete them.

To skip a conditional step: `TaskUpdate in_progress` → add comment "Skipped — {reason}" → `TaskUpdate completed`. Do NOT delete conditional tasks.

---

## See Also

- `planning` skill - Creating implementation plans
- `feature-implementation` skill - Implementing features after planning
- `debug-investigate` skill - Bug fix workflows

---

## IMPORTANT Task Planning Notes (MUST FOLLOW)

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
