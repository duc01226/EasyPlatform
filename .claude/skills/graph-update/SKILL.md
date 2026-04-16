---
name: graph-update
description: '[Code Intelligence] Update the knowledge graph with uncommitted working tree changes. Detects staged/unstaged file changes and re-parses them into the graph. Use mid-session after editing files, or when graph-sync reports no committed changes but working tree has modifications.'
version: 1.0.0
---

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
