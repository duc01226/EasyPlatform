---
name: workflow-end
version: 1.0.0
description: '[Process] End the active workflow and clear state. Auto-added as last step of every workflow. Clears workflow tracking so next prompt gets fresh workflow detection.'
---

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Workflow End

Finalize and close the active workflow, clearing state so the next user prompt triggers fresh workflow detection.

---

## When This Runs

This skill is the **last step of every workflow sequence**. It runs automatically after the final functional step (e.g., `/watzup`, `/status`, `/acceptance`).

**NOT for**: Manual invocation mid-workflow (use workflow switching via `/workflow-start` instead).

---

## What To Do

1. **Integration test coverage check** (skip if workflow is docs/design/investigation/e2e-only, or project has no test suite):

    ```bash
    git diff --name-only HEAD && git ls-files --others --exclude-standard
    ```

    (The second command lists untracked files not yet staged — catches brand-new handler files before first git add)
    - Scan changed files for those likely requiring integration test coverage: **business logic files** such as handlers, commands, queries, services, controllers, resolvers, event processors. Naming varies by stack — infer from the project's existing file patterns (e.g., `*Service.*`, `*Handler.*`, `*Controller.*`, `*Command.*`, `*Query.*`).
    - For each identified file → search for a corresponding test file. Infer the project's test naming convention from existing tests (e.g., `*.test.ts`, `*Tests.java`, `*_test.py`, `*.spec.js`, `*Tests.cs`). Check standard test directories (`tests/`, `spec/`, `__tests__/`, or adjacent test projects).
    - If ANY identified file lacks a corresponding test → **MANDATORY**: use `AskUserQuestion`:
        - Option A: "Run `/integration-test` now" (Recommended)
        - Option B: "Tests already written/updated — proceed"
    - **No silent skip.** Business logic changes without test coverage MUST be surfaced to the user.
    - If no business logic files changed, or all have matching tests → skip silently

2. **Sync knowledge graph** (skip if `.code-graph/` dir doesn't exist):
    ```bash
    if [ -d ".code-graph" ]; then python .claude/scripts/code_graph sync --json && python .claude/scripts/code_graph update --json; fi
    ```
    Report results briefly.
3. Mark this task as `completed` via `TaskUpdate`
4. Announce to the user: "Workflow **[name]** completed. Next prompt will trigger fresh workflow detection."
5. The `workflow-step-tracker` hook handles the actual state cleanup automatically when this skill completes

---

## See Also

- **Skill:** `/workflow-start` - Start/switch workflows
- **Hook:** `workflow-step-tracker.cjs` - Clears state on final step completion
- **Hook:** `workflow-router.cjs` - Detects active vs inactive workflows

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
