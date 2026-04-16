---
name: graph-sync
description: '[Code Intelligence] Sync the code review knowledge graph with current git state. Detects files changed since last sync via git diff and re-parses them. Runs automatically on session start; use manually after pulling code or switching branches.'
version: 1.0.0
---

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
