---
name: graph-export
description: '[Code Intelligence] Use when you need to export the code review knowledge graph. Flag: --format={json|mermaid} (default json); --format=json dumps the full graph to a JSON file, --format=mermaid renders a single file as a Mermaid flowchart diagram.'
disable-model-invocation: false
version: 1.0.0
---

## Quick Summary

**Goal:** [Code Intelligence] Export the code review knowledge graph. `--format=json` (default) dumps all nodes (functions, classes, files) and edges (calls, imports, inheritance) from graph.db for external analysis; `--format=mermaid` renders a single file's internal call graph as a Mermaid flowchart in markdown (folds former `/graph-export-mermaid`).

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- **Format flag** (see [Format Mode](#format-mode---format)): `--format=json` (default) = full graph → `.code-graph/graph-export.json` (CLI `export`); `--format=mermaid` = single-file diagram, requires `<path>` (CLI `export-mermaid`).
- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- NEVER skip mandatory workflow or skill gates.

## Prerequisites

- Graph must be built first: run `/graph-build` if `.code-graph/graph.db` doesn't exist
- Requires Python 3.10+ with tree-sitter, tree-sitter-language-pack, networkx

## Format Mode (`--format=`)

| `--format`       | CLI verb                                  | Output                                                      | Requires |
| ---------------- | ----------------------------------------- | ----------------------------------------------------------- | -------- |
| `json` (default) | `code_graph export --json`                | Full graph dump → `.code-graph/graph-export.json`           | —        |
| `mermaid`        | `code_graph export-mermaid <path> --json` | Single-file Mermaid diagram → `.code-graph/<name>-graph.md` | `<path>` |

`--format=json` dumps ALL nodes + edges from the whole graph. `--format=mermaid` renders ONE file's internal call graph as a Mermaid flowchart (folds former `/graph-export-mermaid`). Pick `--format` FIRST (default `json`), then run the matching branch below.

## Steps

### `--format=json` (default) — full graph → JSON

1. **Export graph** — Run via Bash:

    ```bash
    python .claude/scripts/code_graph export --json
    ```

    Default output: `.code-graph/graph-export.json`

2. **Export specific files only** (optional):

    ```bash
    python .claude/scripts/code_graph export --files {source-root}/auth {source-root}/api --json
    ```

    This exports only nodes and edges belonging to the specified files.

3. **Custom output path** (optional):

    ```bash
    python .claude/scripts/code_graph export -o custom-path.json --json
    ```

4. **Report results:** File path, node count, edge count, file size.

### `--format=mermaid` — single file → Mermaid diagram

1. **Export file graph as Mermaid** — Run via Bash (positional or `--file` flag both work):

    ```bash
    python .claude/scripts/code_graph export-mermaid <relative-path> --json
    # OR
    python .claude/scripts/code_graph export-mermaid --file <relative-path> --json
    ```

    Default output: `.code-graph/<path-based-unique-name>-graph.md` (e.g., `docs--project-config-graph.md`)

2. **Custom output path** (optional):

    ```bash
    python .claude/scripts/code_graph export-mermaid <relative-path> -o custom-path.md --json
    ```

3. **Report results:** File path, node count, edge count.

**Mermaid scope:** functions/classes/test functions within the file + internal call relationships (caller AND callee in-file); class membership via nested subgraphs; edge types calls/imports/inherits/implements/tests/depends. Excludes external/stdlib calls, cross-file callers, and CONTAINS edges (shown structurally). Implicit `MESSAGE_BUS` / `TRIGGERS_EVENT` / `API_ENDPOINT` edges render when present.

## Output Format

**`--format=json`:**

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

**`--format=mermaid`:** a markdown file containing a `flowchart TD` — functions/classes as nodes, calls/imports as labelled edges, class membership as nested subgraphs (e.g., `login -->|calls| validate`).

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

# Export Graph

Export the complete knowledge graph from `.code-graph/graph.db` to a readable JSON file.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Export the code review knowledge graph — `--format=json` dumps the full graph to JSON, `--format=mermaid` renders one file as a Mermaid flowchart.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
