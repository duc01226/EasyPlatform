---
name: git-merge
version: 1.0.0
description: '[Git] ⚠️ Merge code from one branch to another'
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

**Goal:** Merge code from one branch to another with safety checks and conflict resolution.

**Workflow:**

1. **Validate** -- Check source/target branches, verify clean working tree
2. **Merge** -- Execute git merge with appropriate strategy
3. **Resolve** -- Handle conflicts if any, verify merge result

**Key Rules:**

- WARNING: destructive operation -- always confirm with user first
- Verify clean working tree before merge
- Use `/git-conflict-resolve` if conflicts arise

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Variables

TO_BRANCH: $1 (defaults to `main`)
FROM_BRANCH: $2 (defaults to current branch)

## Workflow

### Step 1: Sync with remote (CRITICAL)

```bash
git fetch origin
git checkout {TO_BRANCH}
git pull origin {TO_BRANCH}
```

### Step 2: Merge from REMOTE tracking branch

```bash
# Use origin/{FROM_BRANCH} to merge remote state, not local WIP
git merge origin/{FROM_BRANCH} --no-ff -m "merge: {FROM_BRANCH} into {TO_BRANCH}"
```

**Why `origin/{FROM_BRANCH}`:** Ensures merging only committed+pushed changes, not local uncommitted work.

### Step 3: Resolve conflicts if any

- If conflicts exist, resolve them manually
- After resolution: `git add . && git commit`

### Step 4: Push merged result

```bash
git push origin {TO_BRANCH}
```

## Notes

- If `gh` command is not available, instruct the user to install and authorize GitHub CLI first.
- If you need more clarifications, use `AskUserQuestion` tool to ask the user for more details.
- Always fetch and pull latest remote state before merging to avoid stale conflicts.

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
