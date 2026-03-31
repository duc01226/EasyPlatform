---
name: graph-export
description: '[Code Intelligence] Export the code review knowledge graph to a JSON file. Dumps all nodes (functions, classes, files) and edges (calls, imports, inheritance) from graph.db for external analysis or inspection.'
version: 1.0.0
allowed-tools: Bash, Read
---

# Export Graph

Export the complete knowledge graph from `.code-graph/graph.db` to a readable JSON file.

## Prerequisites

- Graph must be built first: run `/graph-build` if `.code-graph/graph.db` doesn't exist
- Requires Python 3.10+ with tree-sitter, tree-sitter-language-pack, networkx

## Steps

1. **Export graph** — Run via Bash:

    ```bash
    python .claude/scripts/code_graph export --json
    ```

    Default output: `.code-graph/graph-export.json`

2. **Export specific files only** (optional):

    ```bash
    python .claude/scripts/code_graph export --files src/auth.py src/api.py --json
    ```

    This exports only nodes and edges belonging to the specified files.

3. **Custom output path** (optional):

    ```bash
    python .claude/scripts/code_graph export -o custom-path.json --json
    ```

4. **Report results:** File path, node count, edge count, file size.

## Output Format

```json
{
  "version": "1.8.4-easyclaude",
  "stats": { "total_nodes": N, "total_edges": N, "files_count": N, "languages": [...] },
  "nodes": [
    { "kind": "Function", "name": "login", "qualified_name": "auth.py::login", "file_path": "...", "line_start": 10, "line_end": 25, "language": "python" }
  ],
  "edges": [
    { "kind": "CALLS", "source": "api.py::handler", "target": "auth.py::login", "file_path": "...", "line": 15 }
  ]
}
```

## Implicit Edges in Export

The exported JSON includes ALL edge types, including implicit connections:

- `MESSAGE_BUS` — cross-service bus message producer-to-consumer links
- `TRIGGERS_EVENT` — entity CRUD to event handler links
- `PRODUCES_EVENT` — event handler to bus producer links
- `TRIGGERS_COMMAND_EVENT` — command to command event handler links
- `API_ENDPOINT` — frontend HTTP call to backend route links

These edges are created by the implicit connector and API connector during `build`/`sync`.

## Use Cases

- Inspect graph contents for debugging
- Feed into external analysis tools
- Verify graph correctness after build
- Share graph snapshot with team members

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
