---
name: docs-init
version: 2.0.0
description: '[Documentation] Initialize project reference docs via hook + scan skills'
disable-model-invocation: true
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

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

Check that the `session-init-docs.cjs` hook has created the 14 reference doc files:

```
docs/project-reference/project-structure-reference.md     -> /scan-project-structure
docs/project-reference/backend-patterns-reference.md      -> /scan-backend-patterns
docs/project-reference/seed-test-data-reference.md       -> /scan-seed-test-data
docs/project-reference/frontend-patterns-reference.md     -> /scan-frontend-patterns
docs/project-reference/integration-test-reference.md      -> /scan-integration-tests
docs/project-reference/feature-docs-reference.md          -> /scan-feature-docs
docs/project-reference/spec-principles.md                -> static template (no scan skill)
docs/project-reference/code-review-rules.md              -> /scan-code-review-rules
docs/project-reference/scss-styling-guide.md             -> /scan-scss-styling
docs/project-reference/design-system/README.md           -> /scan-design-system
docs/project-reference/e2e-test-reference.md             -> /scan-e2e-tests
docs/project-reference/domain-entities-reference.md      -> /scan-domain-entities
docs/project-reference/docs-index-reference.md           -> /scan-docs-index
docs/project-reference/lessons.md                        -> /learn (managed separately)
```

If any files are missing, the hook should create them on next prompt. Verify by checking `docs/` directory.

## Step 2: Detect Placeholder vs Populated

Read the first 512 bytes of each file. If it contains `<!-- Fill in your project's details below. -->`, it is still a placeholder and needs scanning.

## Step 3: Offer Scan Options

Use `AskUserQuestion` to present:

1. **"Run /claude-md-init + all scan skills" (Recommended for first-time init)** -- Generates CLAUDE.md from config, then runs all 12 scan skills
2. **"Run all scan skills only"** -- Runs all 12 scan skills without CLAUDE.md generation
3. **"Select specific skills"** -- Let user choose which ones to run
4. **"Skip -- docs are already populated"** -- Exit if all docs have content

For each selected scan skill, invoke it via the Skill tool (e.g., `/scan-backend-patterns`).

## Configuration

Reference doc definitions are in `docs/project-config.json` under `referenceDocs`. The hook reads this config to determine which files to create. See `.claude/hooks/session-init-docs.cjs` for the full implementation.

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
  <!-- /SYNC:critical-thinking-mindset:reminder -->
  <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
  <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
