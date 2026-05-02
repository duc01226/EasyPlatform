---
name: sync-copilot-workflows
version: 1.0.0
description: '[AI & Tools] Sync workflow catalog from workflows.json to GitHub Copilot instructions. Run after adding/removing/modifying workflows to keep copilot-instructions.md up to date. Copilot has no hooks, so this manual sync replaces the auto-injection that Claude Code gets from workflow-router.cjs.'
---

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Sync Copilot Workflows

Generate and update the workflow catalog in `.github/copilot-instructions.md` from the source of truth `.claude/workflows.json`.

---

## Quick Summary

**Goal:** [AI & Tools] Sync workflow catalog from workflows.json to GitHub Copilot instructions. Run after adding/removing/modifying workflows to keep copilot-instructions.md up to date. Copilot has no hooks, so this manual sync replaces the auto-injection that Claude Code gets from workflow-router.cjs.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- NEVER skip mandatory workflow or skill gates.

## When to Use

- After adding, removing, or modifying workflows in `.claude/workflows.json`
- After running `/ai-dev-tools-sync` to ensure workflow parity
- When copilot workflow catalog is stale or drifted

**NOT for**: Claude Code workflow issues (Claude gets auto-injected catalog via `workflow-router.cjs` hook).

---

## What To Do

1. Run the sync script:

```bash
node .claude/scripts/sync-copilot-workflows.cjs
```

2. Verify the output shows the correct workflow count and "Updated" message
3. Optionally preview first with `--dry-run`:

```bash
node .claude/scripts/sync-copilot-workflows.cjs --dry-run
```

---

## How It Works

- **Source of truth:** `.claude/workflows.json` (32 workflows, keyword matching, sequences)
- **Target:** `.github/copilot-instructions.md` section `## Workflow Catalog`
- **Script:** `.claude/scripts/sync-copilot-workflows.cjs`
- The script generates a keyword lookup table, full workflow details, handoff table, and execution protocol
- The generated section has `<!-- AUTO-GENERATED -->` markers to prevent manual edits

---

## Why This Exists

Claude Code has `workflow-router.cjs` hook that auto-injects the workflow catalog on every prompt.
GitHub Copilot has no hook system, so the catalog must be statically embedded in `copilot-instructions.md`.
This skill bridges that gap with a one-command sync.

---

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
