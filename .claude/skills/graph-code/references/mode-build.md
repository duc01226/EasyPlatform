# `/graph-code --mode=build` — build, update or sync the code knowledge graph

> Loaded by `graph-code/SKILL.md`'s Mode Dispatch when invoked as `/graph-code --mode=build [--scope={full|update|sync}]`. This contract REPLACES every other mode for the invocation.

**Goal:** Build, update, or sync the code review knowledge graph. Parses the codebase with Tree-sitter into a structural graph (functions, classes, imports, calls, tests) stored in SQLite, enabling blast-radius analysis, graph queries and traces. `--scope` selects the lifecycle operation — `full` (rebuild), `update` (working-tree changes), `sync` (committed git changes + working-tree update) — default auto-detects from graph status.

**Workflow:** Detect the scope → Step 0 (install the tooling) → run the matching branch → report the JSON result.

**Key Rules:**

- **Scope flag** (see [Scope Mode](#scope-mode---scope)): default (no flag) auto-detects via `status` (full if never built, else incremental); `--scope=full` forces rebuild; `--scope=update` = uncommitted working-tree changes (CLI `update`); `--scope=sync` = committed git changes then working-tree update (CLI `sync` + `update`).
- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.

<!-- SKILL-NAV:START -->
## Contents

- [Prerequisites](#prerequisites)
- [Scope Mode (`--scope=`)](#scope-mode---scope)
- [Steps](#steps)
- [When to Use](#when-to-use)
- [Notes](#notes)
- [Connectors (Auto-Run)](#connectors-auto-run)
- [DB Performance Indexes](#db-performance-indexes)
- [Auto-Connect After Build](#auto-connect-after-build)
- [Describe (AI-Friendly Command Reference)](#describe-ai-friendly-command-reference)
- [Valid CLI Subcommands](#valid-cli-subcommands)

<!-- SKILL-NAV:END -->

## Prerequisites

Requires Python 3.10+ on the machine. The graph tooling (`tree-sitter`, `tree-sitter-language-pack`, `networkx`) is installed by [Step 0](#step-0--install-the-graph-tooling-every-scope) on first use; session start installs it only while the graph is active.

## Scope Mode (`--scope=`)

| `--scope`         | CLI verb(s)                        | What it does                                                              |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| _(none, default)_ | `status` → `build` or `update`     | Auto-detect: full build if never built, else incremental update           |
| `full`            | `build --json`                     | Force full rebuild (ignore existing graph)                                |
| `update`          | `update --json`                    | Re-parse uncommitted working-tree changes (staged/unstaged)               |
| `sync`            | `sync --json` then `update --json` | Sync committed git changes (last_synced_commit → HEAD), then working tree |

Default (no `--scope`) auto-detects from `status`. `update` = working-tree changes (base `HEAD~1`, options `--base`/`--repo`). `sync` = committed changes + chained working-tree `update` (the sync→update chain is preserved). Pick `--scope` FIRST (default auto-detect), then run the matching branch.

**Automatic HEAD reconciliation (independent of this skill).** Two hooks call the CLI `sync` directly, so a manual run is rarely needed just because HEAD moved:

| Hook | Fires | Catches |
| ---- | ----- | ------- |
| `graph-session-init` | SessionStart (`startup\|resume`) | Commits that landed while the session was away |
| `graph-prompt-sync` | UserPromptSubmit | A `git pull` / `checkout` / `merge` performed MID-session — gated on a cheap `git rev-parse HEAD` compare, so Python spawns only when HEAD actually moved |

The `graph-auto-update` PostToolUse hook covers file EDITS; these two cover HEAD MOVES. Between them the graph should already be current — reach for a manual `--scope=sync` only to force the issue or after a rebase/force-push.

## Steps

### Step 0 — Install the graph tooling (every scope)

Run these first, from the project root, before any `--scope` branch. Each command is the same on Windows, macOS and Linux. First check the graph mode (it reads the project config the way the hooks do, including a `.claude/.ck.json` relocation), so a project that switched the graph off never downloads the tooling:

```bash
node -e "const g=require('./.claude/hooks/lib/graph-utils.cjs'),c=require('./.claude/hooks/lib/project-config-loader.cjs');if(g.codeGraphMode({config:c.loadProjectConfig()})==='off'){console.log('code graph is off for this project (hooks.codeGraph)');process.exit(1)}"
```

- **Exit 1 with `code graph is off for this project (hooks.codeGraph)`:** stop. Install nothing and run no graph command; tell the user the off message below. Any other non-zero exit: stop and report the error output.

Then install the tooling:

```bash
node -e "const r=require('./.claude/hooks/lib/graph-utils.cjs').ensurePythonDeps(); process.exit(r && r.ok ? 0 : 1)"
```

- **Exit 0:** the tooling is ready (a quick no-op when it is already installed). Continue with the chosen scope.
- **Non-zero exit:** stop. Tell the user the graph tooling could not be installed, that it needs Python 3.10+ on the PATH, and that the manual fallback is `pip install -r .claude/scripts/code_graph/requirements.txt`. Do not run any graph command.
- The install goes into the project-local virtual environment the graph hooks use. If a later `python .claude/scripts/code_graph ...` call fails with a missing-module error, run the same command with the Python this prints: `node -e "console.log(require('./.claude/hooks/lib/graph-utils.cjs').findPython())"`.
- If the mode check or a graph command answers `code graph is off for this project (hooks.codeGraph)`, stop and tell the user: the project config (default `docs/project-config.json`; a `.claude/.ck.json` `portability.projectConfigPath` relocates it) sets `hooks.codeGraph.enabled` to `off` or to a value other than `auto`, `on` or `off`, and building needs `auto` or `on`.

### Default (auto-detect) — build or incremental update

1. **Check availability** — Run via Bash:

    ```bash
    python .claude/scripts/code_graph status --json
    ```

    - If error (Python/deps missing after Step 0): report the error and stop
    - If `last_updated` is null: graph never built → proceed with full build
    - If `last_updated` exists: graph exists → proceed with incremental update

2. **Build or update** — Run via Bash:
    - Full build: `python .claude/scripts/code_graph build --json`
    - Incremental: `python .claude/scripts/code_graph update --json`

3. **Report results** from JSON output:
    - Files parsed, nodes created, edges created
    - Languages detected
    - Any errors encountered
    - Build type (full vs incremental)

### `--scope=full` — force full rebuild

```bash
python .claude/scripts/code_graph build --json
```

Always does a complete reparse (ignores existing graph). Report: files parsed, nodes/edges created, languages, build type.

### `--scope=update` — uncommitted working-tree changes

```bash
python .claude/scripts/code_graph update --json
```

Diffs the working tree against a base commit (default `HEAD~1`), re-parses changed/added files, removes deleted files from the graph, then re-runs the API + implicit connectors. Options: `--base <commit>` (default `HEAD~1`), `--repo <path>`. Report: files updated/added/deleted, or "Working tree clean — graph already up to date".

### `--scope=sync` — committed git changes + working tree

1. **Sync committed changes** via Bash:

    ```bash
    python .claude/scripts/code_graph sync --json
    ```

    Diffs `last_synced_commit` → HEAD, re-parses changed/added files, removes deleted files, re-runs connectors, stores new HEAD. If it reports `full_rebuild_fallback` (unreachable commit after rebase/force-push), a full rebuild was triggered — inform the user.

2. **Update working tree** (chained) via Bash:

    ```bash
    python .claude/scripts/code_graph update --json
    ```

3. **Report:** files synced/added/modified/deleted, then working-tree update results (or "working tree clean").

> **Older checkout is a deliberate no-op.** When HEAD is an ANCESTOR of the graph's `last_synced_commit` — you checked out an older branch or commit the graph already covers — `sync` returns `{"reason": "graph_ahead_skipped"}` and changes nothing: no re-parse, and `last_synced_commit` is NOT dragged backwards. This is intentional. `git diff A..B` succeeds in BOTH directions, so without the guard an older checkout would silently rewrite the graph to the older tree. **Trade-off to know:** while sitting on that older branch the graph describes the newer tree, so it can report symbols the checked-out code does not have; run `--scope=full` if you need the graph to match an older branch exactly. Diverged branches are NOT "behind" (neither commit is an ancestor of the other) and still sync normally.

> **sync vs update:** `sync` detects **committed** changes only (`last_synced_commit` → HEAD; use after pull/merge/checkout). `update` detects **working-tree** changes (staged/uncommitted, mid-session). No `--files` flag on `sync`/`update` (auto-detected from git); there is no `incremental` subcommand (use `update`).

## When to Use

- First time setting up graph for a project
- After major refactoring or branch switches
- If graph seems stale or out of sync
- Graph auto-updates via the PostToolUse hook (file edits) and auto-syncs via the SessionStart / UserPromptSubmit hooks (HEAD moves), so manual builds are rarely needed

## Notes

- Graph stored at `.code-graph/graph.db` (SQLite, auto-gitignored)
- Supported: Python, TypeScript, JavaScript, Vue, Go, Rust, Java, C#, Ruby, Kotlin, Swift, PHP, Solidity, C/C++
- Initial build: ~10s for 500 files. Incremental: <2s

## Connectors (Auto-Run)

After build/update, graph connectors run automatically if configured in `project-config.json`:

- **API Endpoints**: Frontend HTTP calls matched to backend routes (`graphConnectors.apiEndpoints`)
- **Implicit Connections**: Entity events, message bus, command events (`graphConnectors.implicitConnections`)

See `/graph-code --mode=connect-api` and `.claude/docs/code-graph-mechanism.md` for details.

## DB Performance Indexes

The graph database includes optimized indexes created automatically on first build:

- `idx_nodes_name` — fast node name lookups for search
- `idx_edges_kind_source` — composite index for filtered edge queries (kind + source)
- `idx_edges_kind_target` — composite index for filtered edge queries (kind + target)

These indexes are defined in the init schema and auto-create in any new project on first `graph build`.

## Auto-Connect After Build

After building, the CLI automatically runs:

1. **API connector** — detects frontend HTTP calls matching backend route definitions
2. **Implicit connector** — detects behavioral relationships (entity events, bus messages, command events) based on rules in `project-config.json → graphConnectors.implicitConnections[]`

This creates edges for MESSAGE_BUS, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, and API_ENDPOINT — enabling full system flow tracing via the `trace` command.

## Describe (AI-Friendly Command Reference)

Run `python .claude/scripts/code_graph describe --json` to get MCP-style structured descriptions of all available CLI commands, their parameters, and usage. Useful for AI agents to discover graph capabilities programmatically.

## Valid CLI Subcommands

`build`, `update`, `status`, `blast-radius`, `query`, `connections`, `trace`, `search`, `find-path`, `batch-query`, `sync`, `export`, `export-mermaid`, `connect-api`, `connect-implicit`, `review-context`, `describe`

`migrate-paths` is also available to convert existing databases built with absolute file paths into repo-relative storage without reparsing the repository.

### Common Mistakes (DO NOT USE)

| Invalid Command         | Correct Alternative                                               |
| ----------------------- | ----------------------------------------------------------------- |
| `incremental`           | `update --json` (incremental is the default behavior of `update`) |
| `update --files <list>` | `update --json` (auto-detects changed files via git diff)         |
| `build --files <list>`  | `build --json` (always does full rebuild)                         |
| `sync --files <list>`   | `sync --json` (auto-detects from git)                             |
| `file_summary`          | `connections <file> --json`                                       |
