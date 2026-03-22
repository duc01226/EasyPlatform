---
name: graph-query
description: >-
    [Code Intelligence] Query code relationships and connections using the structural knowledge graph.
    Show related files, callers, callees, imports, tests, inheritance, and file structure.
    Requires graph to be built first via /graph-build.
    Triggers on "who calls", "what imports", "related files", "connections of",
    "depends on", "tests for", "inherits from", "file structure", "graph query".
version: 1.0.0
allowed-tools: Bash, Read, Grep, AskUserQuestion
---

# Graph Query

Query code relationships using the structural knowledge graph. Maps natural language questions to graph CLI queries and formats structured reports.

## Prerequisites

1. **Graph must exist** -- check `.code-graph/graph.db`. If missing, tell user to run `/graph-build` first.
2. Requires Python 3.10+ with tree-sitter, tree-sitter-language-pack, networkx.

## Intent Mapping

Map user's question to the appropriate query pattern(s):

| User asks...                                                   | Pattern(s) / Command                   |
| -------------------------------------------------------------- | -------------------------------------- |
| "who/what calls X", "callers of X"                             | `callers_of`                           |
| "what does X call", "callees of X"                             | `callees_of`                           |
| "what does X import", "X depends on", "deps of X"              | `imports_of`                           |
| "who/what imports X", "importers of X", "who references X"     | `importers_of`                         |
| "who uses X", "what uses X", "reverse deps of X"               | `importers_of`                         |
| "what's inside X", "structure of X", "contents"                | `file_summary` (files) / `children_of` |
| "what tests cover X", "tests for X"                            | `tests_for`                            |
| "who inherits/extends X", "subclasses of X"                    | `inheritors_of`                        |
| "show all connections/related files of X", "graph connections" | `connections` command (see below)      |

For composite queries ("show all connections", "related files", "full picture"), use the **`connections`** command instead of running multiple queries manually.

## Workflow

### Step 1: Check graph exists

```bash
ls .code-graph/graph.db 2>/dev/null && echo "OK" || echo "MISSING"
```

If MISSING: stop and tell user to run `/graph-build`.

### Step 2: Identify target

Extract the target from user's question (file path, function name, or class name).

- For files: use relative path (e.g., `src/utils.ts`)
- For functions/classes: use the name (e.g., `validateInput`) or qualified name (e.g., `src/utils.ts::validateInput`)

### Step 3: Run query

Execute via Bash with `--json` flag:

```bash
python .claude/scripts/code_graph query <pattern> <target> --json
```

For composite "show all connections" queries, use the **`connections`** command instead:

```bash
python .claude/scripts/code_graph connections <target> --json
```

This returns `file_summary`, `imports_of`, `importers_of`, `callers_of`, and `tests_for` in one call (capped at 20 results per section).

**Tip:** Add `--node-mode file` to `query`, `connections`, or `trace` for a file-level overview with 10-30x less noise. Options: `file`, `function`, `class`, `all` (default).

### Step 4: Handle response status

- **`status: "ok"`** -- Parse `results[]` and `edges[]`, format report (Step 5)
- **`status: "ambiguous"`** -- Multiple matches found. Show `candidates[]` list and ask user to pick one using `AskUserQuestion`
- **`status: "not_found"`** -- No match. Suggest: check spelling, use relative file path, try a different name. Optionally run `file_summary` on the parent file to show available names.
- **`status: "error"`** -- Show error message. Common: graph.db missing, Python version too old.

### Step 5: Format results

Present results grouped by relationship type. For each result show:

- **Name** and **kind** (function, class, method)
- **File path** with line numbers (`file:line_start-line_end`)
- **Relationship** (calls, imports, tests, inherits)

**Single query output format:**

```
## {Pattern Description} for `{target}`

Found {N} result(s).

| Name | Kind | File | Lines |
|------|------|------|-------|
| ... | function | src/file.ts | 10-25 |
```

**Composite query output format:**

```
## Connections of `{target}`

### File Summary
{N} nodes: {list functions/classes}

### Imports (outgoing)
{What this file/module imports}

### Importers (incoming)
{Who imports this file/module}

### Callers
{Functions that call functions in this file}

### Test Coverage
{Tests covering functions in this file}
```

## Semantic Query Protocol (When User Query is Not File-Specific)

When the user asks about a FLOW or BEHAVIOR (not a specific file), follow this protocol:

### Step 0: Grep/Glob/Search to find entry points

Use Grep/Glob/Search to find key classes/functions related to the user's query.
Example: User asks "what happens when X is created" → grep for `CreateX`, `XCommand`, `XHandler`

### Step 1: Use graph to expand

Run `connections` or `batch-query` on the grep-discovered files to find ALL related files.

### Step 2: Trace full system flow

Run the `trace` command to follow the complete chain through all edge types:

```bash
python .claude/scripts/code_graph trace <entry-file> --direction both --depth 3 --json
```

This traces upstream (who calls this?) AND downstream (what does this trigger?) through:
CALLS → TRIGGERS_EVENT → PRODUCES_EVENT → MESSAGE_BUS → API_ENDPOINT

### Step 3: Verify with grep

For any graph edge that seems surprising, verify with grep that the connection is real.

## Available Query Patterns

| Pattern         | Description                              | Edge Kind             |
| --------------- | ---------------------------------------- | --------------------- |
| `callers_of`    | Functions that call the target function  | CALLS                 |
| `callees_of`    | Functions called by the target function  | CALLS                 |
| `imports_of`    | What the target file/module imports      | IMPORTS_FROM          |
| `importers_of`  | Files that import the target file/module | IMPORTS_FROM          |
| `children_of`   | Nodes contained in a file or class       | CONTAINS              |
| `tests_for`     | Tests covering the target function/class | TESTED_BY + naming    |
| `inheritors_of` | Classes inheriting from the target class | INHERITS / IMPLEMENTS |
| `file_summary`  | All nodes (functions, classes) in a file | (direct lookup)       |
| `trace`         | Full system flow from a target node      | All edge types (BFS)  |

**Aliases** (natural language mappings):

| Alias           | Resolves to     |
| --------------- | --------------- |
| `references_of` | `importers_of`  |
| `uses_of`       | `callers_of`    |
| `who_calls`     | `callers_of`    |
| `who_imports`   | `importers_of`  |
| `depends_on`    | `imports_of`    |
| `subclasses_of` | `inheritors_of` |
| `extends`       | `inheritors_of` |

## Search (Find Nodes by Keyword)

When you don't know the exact name, search first to find candidates:

```bash
python .claude/scripts/code_graph search <keyword> --json
python .claude/scripts/code_graph search <keyword> --kind Function --json
python .claude/scripts/code_graph search <keyword> --kind Class --limit 5 --json
```

Use search to **disambiguate** when a query returns `status: "ambiguous"` — narrow results by `--kind` (Function, Class, File, Type, Test) then use the full qualified_name.

## Find Path (Shortest Path Between Nodes)

Discover how two nodes are connected through the dependency graph:

```bash
python .claude/scripts/code_graph find-path <source> <target> --json
```

Returns the shortest path as a list of nodes. Useful for tracing how a command reaches an event handler, or how a frontend component connects to a backend entity.

**Tip:** If ambiguous, search for exact qualified names first, then use those in find-path.

## Query Filtering and Limiting

Control result size for large codebases:

```bash
# Limit results
python .claude/scripts/code_graph query callers_of <target> --limit 5 --json

# Filter by file path regex
python .claude/scripts/code_graph query importers_of <target> --filter "ServiceName" --json

# Limit connections per section
python .claude/scripts/code_graph connections <target> --limit 10 --json
```

**Implicit connection edge types** (created by `connect-implicit`):

| Edge Kind                | Meaning                                     |
| ------------------------ | ------------------------------------------- |
| `TRIGGERS_EVENT`         | Entity CRUD triggers event handler          |
| `PRODUCES_EVENT`         | Event handler triggers bus message producer |
| `MESSAGE_BUS`            | Message bus producer to consumer            |
| `TRIGGERS_COMMAND_EVENT` | Command triggers command event handler      |

## Batch Query (Multiple Files)

When reviewing multiple files, use batch mode for deduplicated results:

```bash
python .claude/scripts/code_graph batch-query file1 file2 file3 --json
```

Returns: deduplicated nodes + edges (internal + 1-hop external) across all queried files. Single DB connection, no duplicate data.

## Trace (Full System Flow)

Trace all connections from a target node through multiple edge types using BFS:

```bash
python .claude/scripts/code_graph trace <target> --json
python .claude/scripts/code_graph trace <target> --direction both --json
python .claude/scripts/code_graph trace <target> --direction upstream --depth 2 --json
python .claude/scripts/code_graph trace <target> --edge-kinds CALLS,MESSAGE_BUS --json
python .claude/scripts/code_graph trace <target> --direction both --node-mode file --json  # file-level overview
```

Direction options:

- `downstream` (default): Follow outgoing edges. "What happens after X?"
- `upstream`: Follow incoming edges. "What calls/triggers X?"
- `both`: Both directions. "Full flow through X" — use when entry point is a middle file (controller, command handler)

Returns a multi-level tree of connected nodes grouped by BFS depth, with edge types at each level.

## Anti-Patterns

- **Don't rebuild graph** -- use `/graph-build` for that. This skill only queries.
- **Don't use for change-driven analysis** -- use `/graph-blast-radius` for git-diff-based impact.
- **Don't use for bulk export** -- use `/graph-export` for full graph dump.
- **Don't use for diagrams** -- use `/graph-export-mermaid` for Mermaid visualization.
- **Always use `--json` flag** -- ensures structured parseable output.

## Related Skills

- `/graph-build` -- Build or update the graph (prerequisite)
- `/graph-blast-radius` -- Change-driven impact analysis from git diff
- `/graph-export` -- Export full graph to JSON
- `/graph-export-mermaid` -- Export file graph as Mermaid diagram
