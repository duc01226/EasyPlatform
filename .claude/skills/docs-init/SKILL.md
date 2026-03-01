---
name: docs-init
version: 2.0.0
description: '[Documentation] Initialize project reference docs via hook + scan skills'
disable-model-invocation: true
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

## Quick Summary

**Goal:** Initialize project reference documentation by verifying the `session-init-docs.cjs` hook has created placeholder files, then running scan skills to populate them.

**Workflow:**

1. **Verify** -- Check that `session-init-docs.cjs` hook has created placeholder docs in `docs/`
2. **List** -- Show which reference docs exist and which are still placeholders
3. **Populate** -- Ask user which scan skills to run (or run all)

**Key Rules:**

- Do NOT create docs manually -- the hook handles placeholder creation automatically
- Each reference doc has a corresponding `/scan-*` skill that populates it
- Scan skills do deep codebase scanning; expect 5-15 min per skill

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Step 1: Verify Reference Doc Stubs

Check that the `session-init-docs.cjs` hook has created the 10 reference doc files:

```
docs/project-reference/project-structure-reference.md     -> /scan-project-structure
docs/project-reference/backend-patterns-reference.md      -> /scan-backend-patterns
docs/project-reference/frontend-patterns-reference.md     -> /scan-frontend-patterns
docs/project-reference/integration-test-reference.md      -> /scan-integration-tests
docs/project-reference/feature-docs-reference.md          -> /scan-feature-docs
docs/project-reference/code-review-rules.md              -> /scan-code-review-rules
docs/project-reference/scss-styling-guide.md             -> /scan-scss-styling
docs/project-reference/design-system/README.md           -> /scan-design-system
docs/project-reference/e2e-test-reference.md             -> /scan-e2e-tests
docs/project-reference/lessons.md                        -> /learn (managed separately)
```

If any files are missing, the hook should create them on next prompt. Verify by checking `docs/` directory.

## Step 2: Detect Placeholder vs Populated

Read the first 512 bytes of each file. If it contains `<!-- Fill in your project's details below. -->`, it is still a placeholder and needs scanning.

## Step 3: Offer Scan Options

Use `AskUserQuestion` to present:

1. **"Run all scan skills" (Recommended for first-time init)** -- Runs all 9 scan skills sequentially
2. **"Select specific skills"** -- Let user choose which ones to run
3. **"Skip -- docs are already populated"** -- Exit if all docs have content

For each selected scan skill, invoke it via the Skill tool (e.g., `/scan-backend-patterns`).

## Configuration

Reference doc definitions are in `docs/project-config.json` under `referenceDocs`. The hook reads this config to determine which files to create. See `.claude/hooks/session-init-docs.cjs` for the full implementation.

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
