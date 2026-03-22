# Code Review Graph — Setup Guide

Structural code intelligence for easy-claude. Parses your codebase with Tree-sitter into a knowledge graph (functions, classes, imports, calls, inheritance) stored in SQLite. Enables graph-blast-radius analysis, dependency tracing, and graph-powered code reviews.

**Optional feature** — everything works without it. When installed, skills and hooks automatically use the graph for richer context.

## Prerequisites

- Python 3.10+

## Installation

```bash
pip install tree-sitter tree-sitter-language-pack networkx
```

## First Build

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

| Command                 | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `/graph-build`          | Build or update the knowledge graph                |
| `/graph-blast-radius`   | Analyze impact of current changes                  |
| `/graph-export`         | Export full graph to JSON file                     |
| `/graph-export-mermaid` | Export single-file graph as Mermaid diagram        |
| `/graph-query`          | Natural language queries (callers, imports, tests) |
| `/graph-connect-api`    | Detect frontend-backend API connections            |
| `/graph-trace`          | Trace full system flow (upstream/downstream/both)  |
| `/graph-sync`           | Sync graph with git state after pull/checkout      |

### CLI Commands

```bash
python .claude/scripts/code_graph build --json                         # Full rebuild
python .claude/scripts/code_graph update --json                        # Incremental (changed files only)
python .claude/scripts/code_graph status --json                        # Graph stats
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

The graph maintains itself through 3 automatic mechanisms:

| Trigger                  | Hook                                      | What happens                                                                                                         |
| ------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Claude edits a file**  | `graph-auto-update.cjs` (PostToolUse)     | Re-parses the edited file, updates nodes/edges. 3s debounce + atomic lock prevents duplicates.                       |
| **New session starts**   | `graph-session-init.cjs` (SessionStart)   | Diffs `last_synced_commit` vs current HEAD. Re-parses all files changed since last sync (git pull, checkout, merge). |
| **Review/Agent invoked** | `graph-context-injector.cjs` (PreToolUse) | Injects blast radius + trace CLI hints when skills or agents (including Explore) are invoked.                        |
| **Grep finds key files** | `graph-grep-suggester.cjs` (PostToolUse)  | Suggests graph queries when grep finds entity/command/handler/consumer files.                                        |
| **Manual rebuild**       | `/graph-build`                            | Full rebuild from scratch. Safety net if graph gets out of sync.                                                     |

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

For projects with custom HTTP service base classes, add patterns to `docs/project-config.json`:

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

## Supported Languages

Python, TypeScript, JavaScript, Vue, Go, Rust, Java, C#, Ruby, Kotlin, Swift, PHP, Solidity, C/C++

## Troubleshooting

| Issue                                 | Fix                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `Python not found`                    | Install Python 3.10+. Windows: use `py` launcher.                        |
| `No module named 'tree_sitter'`       | Run `pip install tree-sitter tree-sitter-language-pack networkx`         |
| `tree-sitter compile error`           | Ensure C compiler available. Windows: install Visual Studio Build Tools. |
| `graph.db not found`                  | Run `/graph-build` first                                                 |
| `Incremental update finds no changes` | Run `build` (full) instead of `update` after branch switches             |

## Attribution

Based on [code-graph](https://github.com/tirth8205/code-graph) v1.8.4 by Tirth Kanani (MIT License).
