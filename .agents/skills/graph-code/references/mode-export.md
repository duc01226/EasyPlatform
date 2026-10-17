# `$graph-code --mode=export` — export graph snapshots and Mermaid diagrams

> Loaded by `graph-code/SKILL.md`'s Mode Dispatch when invoked as `$graph-code --mode=export [--format=json|mermaid] [<path>]`. This contract REPLACES every other mode for the invocation.

**Goal:** Export the structural knowledge graph for inspection, external analysis or sharing. JSON exports all nodes and edges by default; Mermaid renders one file's internal call graph.

**Workflow:** Check graph exists → select format (default JSON) → resolve file selection/output → run the matching CLI → verify the artifact and report results.

**Key Rules:**

- Always pass `--json` to the CLI; this structures its result metadata even when the artifact is Mermaid.
- Keep claims evidence-based (`file:line`) and task tracking current.
- Read only this mode body; build is a prerequisite pointer, not an automatic step.

## Contents

- [Prerequisites](#prerequisites)
- [Format Mode (`--format=`)](#format-mode---format)
- [Steps](#steps)
- [Output Format](#output-format)
- [Implicit Edges in Export](#implicit-edges-in-export)
- [Closing Reminders](#closing-reminders)

## Prerequisites

- Graph not built (`.code-graph/graph.db` absent): report "graph not built — run $graph-code --mode=build, or continue with grep" and stop.
- Requires Python 3.10+ with tree-sitter, tree-sitter-language-pack and networkx.
- Commands below use `python3` on macOS/Linux. On Windows use `py -3` with the same arguments. If build provisioned an isolated Python interpreter, use that interpreter.

## Format Mode (`--format=`)

| Format | CLI verb | Default output | Requires |
| --- | --- | --- | --- |
| `json` (default) | `code_graph export --json` | `.code-graph/graph-export.json` | — |
| `mermaid` | `code_graph export-mermaid <path> --json` | `.code-graph/<path-based-unique-name>-graph.md` | `<path>` or `--file <path>` |

Pick `--format` FIRST (default `json`). An unsupported format stops with a clear message listing `json` and `mermaid`; never silently choose a different format. `--mode` and `--format` route the skill and are not passed to the CLI.

## Steps

### `--format=json` (default) — full or filtered graph → JSON

1. **Export graph**:

    ```sh
    python3 .claude/scripts/code_graph export --json
    ```

    Default output: `.code-graph/graph-export.json`.

2. **Export specific files only** (optional):

    ```sh
    python3 .claude/scripts/code_graph export --files <relative-file-1> <relative-file-2> --json
    ```

    Pass actual indexed file paths. The CLI selects nodes in those files and edges whose `file_path` belongs to the selection; it does not expand directories. Artifact `stats` describes the whole database; result `nodes_count` and `edges_count` describe the export.

3. **Custom output path** (optional; can combine with `--files`):

    ```sh
    python3 .claude/scripts/code_graph export -o <output.json> --json
    ```

4. **Verify and report:** require CLI `status: "ok"`, read the artifact and report `output_path`, `nodes_count`, `edges_count` and file size. Obtain size from the written file, not an invented CLI field. On an error, report the diagnostic and stop without claiming an export.

### `--format=mermaid` — single file → Mermaid diagram

1. **Resolve target:** require one relative file path (positional or `--file`). If missing, ask for it via `ask user question tool` before running the CLI.

2. **Export file graph as Mermaid** (positional or flag both work):

    ```sh
    python3 .claude/scripts/code_graph export-mermaid <relative-path> --json
    # OR
    python3 .claude/scripts/code_graph export-mermaid --file <relative-path> --json
    ```

    Default output uses a unique path-based name: `docs/project-config.json` → `.code-graph/docs--project-config-graph.md`.

3. **Custom output path** (optional):

    ```sh
    python3 .claude/scripts/code_graph export-mermaid <relative-path> -o <output.md> --json
    ```

4. **Verify and report:** require CLI `status: "ok"`, read the generated Markdown and report `output_path`, `nodes_count` and `edges_count`. On an error, report the diagnostic and stop.

**Mermaid scope:** functions/classes/test functions within the file and internal relationships (caller AND callee in-file); class membership uses nested subgraphs. Edge labels include calls/imports/inherits/implements/tests/depends. Excludes external/stdlib calls, cross-file callers and CONTAINS edges (shown structurally). Implicit `MESSAGE_BUS`, `TRIGGERS_EVENT` and `API_ENDPOINT` edges render when present.

## Output Format

**JSON artifact:** `version`, graph-wide `stats`, `nodes` and `edges`. Nodes carry kind, name, qualified name, file path, start/end lines and language. Edges carry kind, source, target, file path and line.

**Mermaid artifact:** Markdown containing a `flowchart TD`; functions/classes are nodes, relationships are labelled edges (for example `login -->|calls| validate`), and class membership uses nested subgraphs.

## Implicit Edges in Export

An unfiltered JSON export includes all edge types, including implicit connections created by the implicit/API connectors during build/sync:

- `MESSAGE_BUS` — bus message producer-to-consumer links.
- `TRIGGERS_EVENT` — entity CRUD to event handler links.
- `PRODUCES_EVENT` — event handler to bus producer links.
- `TRIGGERS_COMMAND_EVENT` — command to command event handler links.
- `API_ENDPOINT` — frontend HTTP call to backend route links.

## Closing Reminders

Check graph existence, select JSON or Mermaid, run the matching CLI with `--json`, verify the artifact and report actual results. JSON defaults to the full graph; Mermaid requires one file. Use `$graph-code --mode=build` when the graph is absent.
