---
name: graph-export
description: '[Code Intelligence] Use when you need to export the code review knowledge graph. Flag: --format={json|mermaid} (default json); --format=json dumps the full graph to a JSON file, --format=mermaid renders a single file as a Mermaid flowchart diagram.'
disable-model-invocation: true
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
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
