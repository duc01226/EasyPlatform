---
name: graph-update
description: '[Code Intelligence] Update the knowledge graph with uncommitted working tree changes. Detects staged/unstaged file changes and re-parses them into the graph. Use mid-session after editing files, or when graph-sync reports no committed changes but working tree has modifications.'
version: 1.0.0
---

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

# Update Graph (Working Tree)

Update the knowledge graph with **uncommitted** working tree changes (staged + unstaged).

## When to Use

- After editing files mid-session (working tree dirty, nothing committed yet)
- When `/graph-sync` reports "up to date" but you've made local changes
- Before running `/graph-blast-radius` on uncommitted work
- At the end of `/graph-sync` (explicitly invoked as step 4)

## How It Works

1. Diffs working tree against a base commit (default: `HEAD~1`)
2. Finds changed/added/deleted files in the working tree
3. Re-parses changed/added files, removes deleted files from graph
4. Re-runs API connector and implicit connector (same as `sync`)

## Steps

1. **Run update** via Bash:
    ```bash
    python .claude/scripts/code_graph update --json
    ```
2. **Report results:** Files updated, added, deleted
3. If no changes detected, report "Working tree clean — graph already up to date"

## Options

| Flag     | Description                 | Default  |
| -------- | --------------------------- | -------- |
| `--base` | Base commit to diff against | `HEAD~1` |
| `--repo` | Repository root path        | `.`      |
| `--json` | Output results as JSON      | off      |

## Related Skills

- `/graph-sync` — Sync committed changes (invokes `/graph-update` in step 4)
- `/graph-build` — Full or incremental graph build
- `/graph-blast-radius` — Analyze structural impact of changes
- `/graph-query` — Query code relationships

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
