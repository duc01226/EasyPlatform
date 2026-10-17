# Code Review Graph — Setup Guide

Structural code intelligence for easy-claude. Parses your codebase with Tree-sitter into a knowledge graph (functions, classes, imports, calls, inheritance) stored in SQLite. Enables blast-radius analysis, dependency tracing, and graph-powered code reviews.

**Optional feature** — everything works without it. When installed, the graph is an optional advisory source: a hint that can be stale or incomplete, never a requirement, and verified by reading the files.

## Prerequisites

- Python 3.10+

## Installation

Python 3.10+ required; `/graph-code --mode=build` installs the rest into the hooks' environment (`tree-sitter`, `tree-sitter-language-pack`, `networkx`, on first use). Do not `pip install` them into the system Python.

## Enable or disable

`hooks.codeGraph.enabled` in `docs/project-config.json` sets the mode: `auto` (default) = active only once `.code-graph/graph.db` exists; `on` = always active; `off` = the graph hooks stay silent and the graph CLI refuses every command. A malformed value counts as `off`. Read `.claude/docs/hooks/README.md` § Code graph mode when you need what each hook does per mode.

## First Build

Run `/graph-code --mode=build` (installs the tooling, then builds). The CLI build it runs:

```bash
python .claude/scripts/code_graph build --json
```

This parses your entire codebase (~10s for 500 files). The graph is stored at `.code-graph/graph.db`.

## Verification

```bash
python .claude/scripts/code_graph status --json
```

Should show node/edge counts, languages detected, and last update timestamp.

## .gitignore

The tool auto-creates `.code-graph/.gitignore` with `*` content (prevents committing graph.db). If this directory appears in git status, add manually:

```
.code-graph/
```

## Usage

| Command                     | Description                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `/graph-code --mode=build`              | Build or update the knowledge graph                                                             |
| `/graph-code --mode=blast-radius`       | Analyze impact of current changes                                                               |
| `/graph-code --mode=export`             | Export full graph to JSON (`--format=json`) or single-file Mermaid diagram (`--format=mermaid`) |
| `/graph-code --mode=query`              | Natural language queries (callers, imports, tests)                                              |
| `/graph-code --mode=connect-api`        | Detect frontend-backend API connections                                                         |
| `/graph-code --mode=trace`              | Trace full system flow (upstream/downstream/both)                                               |
| `/graph-code --mode=build --scope=sync` | Sync graph with git state after pull/checkout                                                   |

### CLI Commands

```bash
python .claude/scripts/code_graph build --json                         # Full rebuild
python .claude/scripts/code_graph update --json                        # Incremental (changed files only)
python .claude/scripts/code_graph status --json                        # Graph stats
python .claude/scripts/code_graph migrate-paths --json                 # Convert existing DB paths to repo-relative storage
python .claude/scripts/code_graph graph-blast-radius --json            # Impact analysis
python .claude/scripts/code_graph query callers_of <fn> --json         # Who calls this?
python .claude/scripts/code_graph query importers_of <file> --json     # Who imports this file?
python .claude/scripts/code_graph review-context --json                # Token-optimized review context
python .claude/scripts/code_graph export --json                        # Export graph to JSON
python .claude/scripts/code_graph export-mermaid --file <path> --json  # Mermaid diagram
python .claude/scripts/code_graph graph-connect-api --json             # Detect frontend-backend API connections
python .claude/scripts/code_graph graph-connect-implicit --json        # Detect implicit connections (events, message bus)
python .claude/scripts/code_graph sync --json                          # Sync graph with git state after pull/checkout
python .claude/scripts/code_graph batch-query f1.py f2.ts --json      # Multi-file deduplicated query
python .claude/scripts/code_graph search CreateUser --json             # Search nodes by keyword
python .claude/scripts/code_graph search User --kind Class --limit 5 --json  # Search with kind filter + limit
python .claude/scripts/code_graph find-path <source> <target> --json   # Shortest path between two nodes
python .claude/scripts/code_graph query callers_of X --limit 5 --filter "ServiceName" --json  # Query with limit + filter
python .claude/scripts/code_graph trace <file> --direction both --json        # Full system flow (upstream + downstream)
python .claude/scripts/code_graph trace <file> --direction downstream --json  # Impact analysis (what does this trigger?)
python .claude/scripts/code_graph trace <file> --direction upstream --json    # Root cause (what calls this?)
python .claude/scripts/code_graph trace <file> --depth 5 --json              # Custom depth (default: 3)
python .claude/scripts/code_graph trace <file> --edge-kinds CALLS,MESSAGE_BUS --json  # Filter by edge types
python .claude/scripts/code_graph trace <file> --direction both --node-mode file --json  # File-level overview (10-30x less noise)
python .claude/scripts/code_graph describe --json                                       # AI-friendly command descriptions (MCP-style)
```

**Query aliases:** `references_of`→`importers_of`, `uses_of`→`callers_of`, `who_calls`→`callers_of`, `depends_on`→`imports_of`, `subclasses_of`→`inheritors_of`

### Common Mistakes (Invalid Commands — DO NOT USE)

| Invalid                 | Correct Alternative                                               |
| ----------------------- | ----------------------------------------------------------------- |
| `incremental`           | `update --json` (incremental is the default behavior of `update`) |
| `update --files <list>` | `update --json` (auto-detects changed files via git diff)         |
| `build --files <list>`  | `build --json` (always does full rebuild)                         |
| `sync --files <list>`   | `sync --json` (auto-detects from git)                             |
| `file_summary`          | `connections <file> --json`                                       |

Run `python .claude/scripts/code_graph describe --json` for the authoritative command reference.

## Grep-First + Trace Protocol (Recommended Workflow)

When investigating system flows, follow this protocol:

1. **Grep/Glob/Search** to find entry point files related to the query
2. **Trace** the most important files to see full system flow:
    ```bash
    python .claude/scripts/code_graph trace <found-file> --direction both --json
    ```
3. **Verify** surprising connections with grep

The `trace` command follows ALL edge types (CALLS, TRIGGERS_EVENT, MESSAGE_BUS, INHERITS, API_ENDPOINT, etc.) via BFS, giving a multi-level tree of connected nodes. Direction options: `downstream` (what does this trigger?), `upstream` (what calls this?), `both` (full picture — best for middle-file entry points like controllers/commands). Use `--node-mode file` for a high-level overview (10-30x less noise), then `--node-mode function` for detail on specific files.

## DB Performance Indexes

The graph database includes optimized indexes created automatically on first `build`:

- `idx_nodes_name` — fast node name lookups for search
- `idx_edges_kind_source` — composite index for filtered edge queries (kind + source)
- `idx_edges_kind_target` — composite index for filtered edge queries (kind + target)

These are defined in the init schema and auto-create in any project on first `graph build`. No manual migration needed.

## Auto-Maintenance (Zero Manual Effort)

The graph maintains itself through 2 automatic hooks (plus a manual rebuild):

| Trigger                 | Hook                                    | What happens                                                                                                         |
| ----------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Claude edits a file** | `graph-auto-update.cjs` (PostToolUse)   | Re-parses the edited file, updates nodes/edges. 3s debounce + atomic lock prevents duplicates.                       |
| **New session starts**  | `graph-session-init.cjs` (SessionStart) | Diffs `last_synced_commit` vs current HEAD. Re-parses all files changed since last sync (git pull, checkout, merge). |
| **Manual rebuild**      | `/graph-code --mode=build`                          | Full rebuild from scratch. Safety net if graph gets out of sync.                                                     |

> Blast radius, trace CLI hints, and grep-to-graph suggestions can be pulled on demand by the `graph-*` skills per the hook-delivered graph advice (`.claude/skills/shared/protocols/graph-assisted-investigation.md`) — optional, not injected by a hook.

**After `git pull`:** The next Claude session automatically syncs. No manual action needed.

**After branch switch:** Same — session-init detects HEAD changed and syncs.

**Concurrent edit protection:** Atomic directory lock prevents multiple Python processes from writing to graph.db simultaneously. 30s stale lock auto-cleanup prevents permanent lock.

## Implicit Connections (Event-Driven / Message Bus)

For loosely coupled patterns (entity events, message bus, consumers), configure `graphConnectors.implicitConnections[]` in `docs/project-config.json`. Run `/project-config` to auto-detect patterns in your codebase.

```bash
python .claude/scripts/code_graph connect-implicit --json
```

This creates edges like `TRIGGERS_EVENT`, `MESSAGE_BUS`, `PRODUCES_EVENT` between files that have no direct import but are connected via entity events or message bus patterns.

**Supported patterns (via project-config rules):**

- **Entity event handlers** — entity CRUD → EntityEventApplicationHandler (`TRIGGERS_EVENT`)
- **Typed bus producers → consumers** — EntityEventBusProducer → EntityEventBusConsumer (`MESSAGE_BUS`)
- **Free-format bus messages** — `new XxxBusMessage` → `PlatformApplicationMessageBusConsumer<XxxBusMessage>` (`MESSAGE_BUS`)
- **Command event handlers** — Command → CommandEventApplicationHandler (`TRIGGERS_COMMAND_EVENT`)

**Rule shape.** Each rule has a `source` and a `target`; both sides are scanned independently and joined on a captured key. Per side:

- `contentPattern` — regex over each file line; the joined key is the captured group (`keyGroup`, default 1). Use for keys that appear in code (e.g. `SPEC_REFERENCE` in a comment, a queue constant name).
- `pathPattern` — regex over the repo-relative POSIX path; the key is captured from the **filename** (e.g. `^specs/([a-z0-9-]+/\d+-[a-z0-9-]+)\.md$`, which is how a spec file is addressed by id+slug). Use when the key lives in the path, not the content.
- `paths` — scope each side to its own directories; `filePatterns` / `filePattern` — glob(s) the side scans. A rule may use `contentPattern` on one side and `pathPattern` on the other.
- `matchBy` — `key-equals` (default) or `key-contains`.

If a pattern declares no capture group, that rule's side is skipped (a whole-line hash would join nothing).

**Scan scope.** The connector walks the repo from the root; add generated/heavy trees to `graphSettings.scanSkipDirs` in `docs/project-config.json` (e.g. `[".next-e2e"]`) so they are not scanned.

**Auto-connect:** After every `build`, `update`, and `sync`, implicit connections are automatically refreshed — no manual `connect-implicit` needed. The auto-connect also refreshes API endpoint connections (`connect-api`).

## Frontend↔Backend API Connections (Zero-Config)

The graph automatically detects frontend HTTP calls and matches them to backend route definitions, creating `API_ENDPOINT` edges. **No configuration needed** — the connector auto-detects frameworks by scanning for marker files.

### Supported Frameworks (Auto-Detected)

| Frontend                                  | Backend                                    |
| ----------------------------------------- | ------------------------------------------ |
| Angular (`angular.json`, `@angular/core`) | .NET (`*.csproj` + `Microsoft.AspNetCore`) |
| React (`react` in package.json)           | Spring (`pom.xml` + `spring-boot`)         |
| Vue (`vue.config.js`, `vue`)              | Express (`express` in package.json)        |
| Next.js (`next.config.js`)                | NestJS (`@nestjs/core`)                    |
|                                           | Next.js App Router (`app/**/route.ts`)     |
| Svelte (`svelte.config.js`)               | FastAPI (`fastapi` in requirements.txt)    |
|                                           | Django (`manage.py`)                       |
|                                           | Rails (`Gemfile` + `rails`)                |
|                                           | Go (`go.mod` + Gin/Echo patterns)          |

### Auto-Run Behavior

| When                                    | What Happens                                                 |
| --------------------------------------- | ------------------------------------------------------------ |
| After `build` / `update` / `sync`       | Connect-api runs automatically via `_auto_connect()`         |
| First `trace` / `query` / `connections` | Runs once via `_ensure_connectors_ran()` if never run before |

### Custom Patterns (Optional)

For projects with custom HTTP service base classes (or file-based routes the detector cannot infer), configure `docs/project-config.json`:

```json
{
    "graphConnectors": {
        "apiEndpoints": {
            "enabled": true,
            "frontend": {
                "framework": "angular",
                "paths": ["src/app/"],
                "customPatterns": ["this\\.\\s*(get|post|put|delete)\\s*[<(]\\s*['\"]([^\"']+)"]
            },
            "backend": {
                "framework": "dotnet",
                "paths": ["src/Services/"],
                "routePrefix": "api"
            }
        }
    }
}
```

Custom patterns **extend** (not replace) built-in framework patterns.

**File-based routes (e.g. Next.js App Router).** When routes live in files rather than decorators, point `paths` at each route tree and declare how the file maps to a URL:

```json
{
    "graphConnectors": {
        "apiEndpoints": {
            "enabled": true,
            "frontend": { "framework": "nextjs", "paths": ["apps/web/app"] },
            "backend": {
                "framework": "next-app-router",
                "routeFile": "route.ts",
                "methodExports": ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
                "paths": [
                    { "dir": "apps/web/app/api", "urlPrefix": "/api" },
                    { "dir": "apps/portal/app/api", "urlPrefix": "/api" }
                ]
            }
        }
    }
}
```

- `routeFile` — filename that marks a route module (default `route.ts`); `urlPrefix` on a path entry (or `routePrefix` as a fallback) is prepended to the derived route.
- `methodExports` — exported HTTP method names, one edge per method; defaults to the standard set above.
- `paths` entries are either a bare string or `{ "dir", "urlPrefix" }`; a bare string uses `routePrefix`.

## Supported Languages

Python, TypeScript, JavaScript, Vue, Go, Rust, Java, C#, Ruby, Kotlin, Swift, PHP, Solidity, C/C++

## Troubleshooting

| Issue                                 | Fix                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `Python not found`                    | Install Python 3.10+. Windows: `py -3` launcher; macOS/Linux: `python3`. |
| `No module named 'tree_sitter'`       | Run `/graph-code --mode=build`: it installs the tooling into the hooks' environment. A direct CLI call must use that environment's Python (`/graph-code --mode=build` Step 0 prints how to find it) |
| `tree-sitter compile error`           | Ensure a C compiler. Windows: VS Build Tools; macOS: `xcode-select --install`; Linux: `build-essential`/`gcc`. |
| `graph.db not found`                  | Run `/graph-code --mode=build` first                                                 |
| `Incremental update finds no changes` | Run `build` (full) instead of `update` after branch switches             |

## Attribution

Based on [code-graph](https://github.com/tirth8205/code-graph) v1.8.4 by Tirth Kanani (MIT License).
