---
name: graph-sync
description: '[Code Intelligence] Sync the code review knowledge graph with current git state. Detects files changed since last sync via git diff and re-parses them. Runs automatically on session start; use manually after pulling code or switching branches.'
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

# Sync Graph

Sync the knowledge graph with the current git state by diffing `last_synced_commit` against HEAD.

## When to Use

- After `git pull` / `git merge` / `git checkout` to update graph with new code
- When you suspect the graph is stale (e.g., colleague pushed changes)
- After resolving merge conflicts
- Runs **automatically on session start** — manual invocation only needed mid-session

## How It Works

1. Reads `last_synced_commit` from graph metadata
2. Gets current `HEAD` commit hash
3. If same: graph is up to date, no action needed
4. If different: runs `git diff --name-status {last}..{HEAD}` to find changed/added/deleted files
5. Parses changed/added files, removes deleted files from graph
6. Stores new HEAD as `last_synced_commit`

## Auto-Connect Behavior

After syncing changed files, the `sync` command automatically re-runs:

1. **API connector** (`connect-api`) — refreshes frontend-to-backend API endpoint edges
2. **Implicit connector** (`connect-implicit`) — refreshes behavioral edges (MESSAGE_BUS, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT)

This means after `sync`, ALL connections are up-to-date — not just direct code edges. If a new bus message producer was added in a synced file, the implicit connector will create MESSAGE_BUS edges to all matching consumers.

## Steps

1. **Run sync** (committed changes) via Bash:
    ```bash
    python .claude/scripts/code_graph sync --json
    ```
2. **Report results:** Files synced, added, modified, deleted
3. If sync reports `full_rebuild_fallback` (unreachable commit), inform user that a full rebuild was triggered
4. **Run update** (working tree changes) via Bash:
    ```bash
    python .claude/scripts/code_graph update --json
    ```
5. **Report update results:** Files updated from working tree, or "working tree clean"

## Fallback Behavior

- **No stored commit:** First sync — scans for files on disk not in graph, adds them
- **Unreachable commit** (after rebase/force-push): Falls back to full rebuild automatically
- **No git:** Skips sync silently (non-git projects)

## Important: Scope & Limitations

- `sync` only detects **committed** changes (diffs `last_synced_commit` vs HEAD)
- For **uncommitted/staged** changes, use `update --json` instead (detects working tree changes)
- There is NO `incremental` subcommand — use `update` for incremental builds
- There is NO `--files` flag on `sync` — it auto-detects changed files from git

### sync vs update

| Command         | Scope                                              | Use When                                        |
| --------------- | -------------------------------------------------- | ----------------------------------------------- |
| `sync --json`   | Committed changes only (last_synced_commit → HEAD) | After pull, merge, checkout                     |
| `update --json` | Working tree changes from base (default HEAD~1)    | Staged/uncommitted changes, mid-session refresh |

## Related Skills

- `/graph-update` — Update graph with uncommitted working tree changes (explicitly invoked in step 4)
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
