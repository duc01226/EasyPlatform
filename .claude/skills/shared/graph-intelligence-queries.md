# Graph Intelligence Queries

> **MANDATORY** when `.code-graph/graph.db` exists. Orchestrate grep ↔ graph ↔ glob dynamically.

## CLI Reference

```bash
# Query patterns (+ aliases: references_of, uses_of, who_calls, who_imports, depends_on, subclasses_of)
python .claude/scripts/code_graph query callers_of <function> --json
python .claude/scripts/code_graph query importers_of <module> --json
python .claude/scripts/code_graph query tests_for <function> --json
python .claude/scripts/code_graph query inheritors_of <class> --json
python .claude/scripts/code_graph connections <target> --json
python .claude/scripts/code_graph batch-query <file1> <file2> --json

# Search (find nodes by keyword — use to disambiguate)
python .claude/scripts/code_graph search <keyword> --json
python .claude/scripts/code_graph search <keyword> --kind Function --limit 5 --json

# Find path (shortest path between two nodes)
python .claude/scripts/code_graph find-path <source> <target> --json

# Trace connections through multiple hops (BFS)
python .claude/scripts/code_graph trace <file> --json
python .claude/scripts/code_graph trace <file> --direction both --depth 3 --json

# Filtering and limiting
python .claude/scripts/code_graph query callers_of <target> --limit 5 --filter "ServiceName" --json

# Node-mode filtering (available on trace, connections, query): file | function | class | all (default)
python .claude/scripts/code_graph trace <file> --direction both --node-mode file --json  # File-level overview (10-30x less noise)

# AI-friendly command descriptions
python .claude/scripts/code_graph describe --json
```

## Grep ↔ Graph ↔ Glob Orchestration

AI dynamically decides which tool to use next based on what it learns at each step:

- **Grep → Graph → Grep**: Find entry files, expand network, verify content
- **Graph → Grep**: Known class/function name? Query graph directly, then verify
- **Glob → Graph**: Find file structure, graph reveals relationships
- **Iterative**: grep→graph→grep→graph is valid and encouraged

## When to Use Each Query

| You want to find...               | Query                              | After finding...        |
| --------------------------------- | ---------------------------------- | ----------------------- |
| All services reacting to an event | `importers_of` on BusMessage class | The event message class |
| All commands modifying an entity  | `callers_of` on entity methods     | The entity class        |
| All tests covering a feature      | `tests_for` on command/handler     | The command handler     |
| All downstream consumers          | `connections` on producer file     | The event producer      |
| Full cross-service flow           | `batch-query` on entry files       | Multiple entry points   |
| Full system flow (multi-hop BFS)  | `trace` with `--direction both`    | Entry point file        |
| Class hierarchy                   | `inheritors_of` on base class      | The base class          |

## Workflow-Specific Patterns

### Investigation / Scout

Grep finds entity/command → `connections` reveals full network → grep verifies behavior

### Feature Enhancement

`connections <modified_file>` → find ALL connected files → check if they need updates

### Bug Fixing

`callers_of <buggy_function>` → find all callers (may share bug)
`tests_for <buggy_function>` → find tests to verify fix

### Code Review / Review Changes

`tests_for <changed_function>` → flag UNTESTED changes (coverage gap)
`callers_of <changed_function>` → check callers handle new behavior
`importers_of <changed_module>` → check importers need updates

### Test Coverage Analysis

`batch-query <changed_files>` → get all production functions
`tests_for` on each → list uncovered functions

## Trace Command (Full System Flow)

The `trace` command is the most powerful tool for understanding full system flows:

```bash
# Trace downstream from a file (what does this trigger?)
python .claude/scripts/code_graph trace <file> --json

# Trace both directions from a middle file (full flow through this point)
python .claude/scripts/code_graph trace <file> --direction both --json

# Trace upstream only (what calls/triggers this?)
python .claude/scripts/code_graph trace <file> --direction upstream --depth 2 --json

# Filter to specific edge types
python .claude/scripts/code_graph trace <file> --edge-kinds CALLS,MESSAGE_BUS --json
```

Returns multi-level BFS tree with nodes and edges grouped by depth. Follows all edge types including implicit connections (MESSAGE_BUS, TRIGGERS_EVENT, PRODUCES_EVENT, INHERITS, API_ENDPOINT). Use `--node-mode file` for a high-level overview first, then `--node-mode function` to drill into specific files.
