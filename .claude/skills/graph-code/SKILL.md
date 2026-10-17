---
name: graph-code
description: '[Code Intelligence] Use when building/syncing the code graph, querying callers/imports/tests, tracing flow, checking blast radius, linking APIs or exporting JSON/Mermaid. --mode={build|query|trace|blast-radius|connect-api|export}.'
version: 1.1.1
---

> **[BLOCKING] Mode routing — detect FIRST.** The mode is `--mode=build|query|trace|blast-radius|connect-api|export`, or the first argument when it is exactly one of those six words (`/graph-code export --format=mermaid <file>`). Everything after the mode is that mode's own arguments (`--scope=`, `--direction`, `--node-mode`, `--format=`, `--json`, a target). Read the mode file in full before anything else (see [Mode Dispatch](#mode-dispatch)). Each of the six modes works called directly with no workflow.

## Quick Summary

**Goal:** [Code Intelligence] Operate the structural code knowledge graph (Tree-sitter nodes and edges in `.code-graph/graph.db`, SQLite) through the `python .claude/scripts/code_graph` CLI: build or sync it, query relationships, trace system flow, analyze the blast radius of a change, match frontend calls to backend routes, and export JSON snapshots or single-file Mermaid diagrams.

**Workflow:** Detect the mode → read its `references/mode-<x>.md` in full → run the CLI live → report the JSON result with `file:line` evidence.

**Key Rules:**

- One mode per invocation. No mode and no mode word: show the [Mode Dispatch](#mode-dispatch) table and ask which mode via `ask user question tool`; a natural-language request that matches exactly one row of the Intent column selects that row's mode (the Intent column holds action phrases only: a prompt that merely names "code graph", "knowledge graph" or "uncommitted changes" carries no action and gets the table); anything else gets the table, never a guess.
- Always pass `--json` to the CLI so the output is structured and parseable.
- Graph not built (`.code-graph/graph.db` absent): report plainly — "graph not built — run /graph-code --mode=build, or continue with grep" — and stop that mode. It is never an error for a caller.
- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act; MUST ATTENTION keep task tracking updated as each step starts/completes.

## Optional: graph as a hint

Optional: when grep and reading files alone may not reveal a high-risk blast radius (shared contract, many callers, cross-module or cross-service flow, public API), the code graph (`.code-graph/graph.db`) can add callers, dependents and impacted tests. Treat it as a hint, NOT proof: the graph can be stale or incomplete (it lags uncommitted edits and unindexed paths) — verify anything that matters by reading the files/grep. Skip it for low-risk or local changes.

Nothing in this skill is mandatory for other skills or workflows. **Pattern when used:** grep/read finds a key entry-point file (entity, command, query, event or command handler, controller, bus message or consumer, component, store, api-service) → an optional `trace <file> --direction both --json` suggests callers, consumers, bus messages, event chains and tests → grep/read verifies the details.

## Mode Dispatch

Detect the mode from the invocation arguments before any other work; do not load a mode file the invocation did not select.

| Mode | Purpose | Intent (natural-language triggers) | Read in full FIRST |
| --- | --- | --- | --- |
| `--mode=build [--scope={full\|update\|sync}]` | Build, update or sync the graph (installs the graph tooling on first use). Formerly `/graph-build` | "build graph", "sync graph", "update graph", "refresh graph after pull" | `references/mode-build.md` |
| `--mode=query <pattern> <target>` | Query relationships: callers, callees, imports, importers, tests, inheritors, file structure, search, find-path, batch. Formerly `/graph-query` | "who calls", "what imports", "related files", "connections of", "depends on", "tests for", "inherits from", "file structure", "graph query" | `references/mode-query.md` |
| `--mode=trace <target> [--direction …] [--depth N] [--edge-kinds …] [--node-mode …]` | Trace full system flow through CALLS, events, bus messages and API endpoints. Formerly `/graph-trace` | "what happens when X", "what triggers X", "full flow through X", "trace", "execution flow", "frontend-to-backend flow" | `references/mode-trace.md` |
| `--mode=blast-radius` | Impact of the current git changes: impacted files and functions, test gaps, risk level. Formerly `/graph-blast-radius` | "blast radius", "impact analysis", "structural impact of my changes" | `references/mode-blast-radius.md` |
| `--mode=connect-api` | Detect frontend-to-backend API connections and create `API_ENDPOINT` edges. Formerly `/graph-connect-api` | "connect api", "api connections", "frontend backend" | `references/mode-connect-api.md` |
| `--mode=export [--format={json\|mermaid}] [<path>]` | Export a full or filtered JSON graph snapshot, or one file as a Mermaid diagram. | "export graph", "JSON dump", "export Mermaid", "graph diagram", "visualize graph" | `references/mode-export.md` |

- **[BLOCKING]** When `--mode=build`, read `references/mode-build.md` in full FIRST; it owns the tooling-install Step 0, the `--scope=full|update|sync` branches (default: auto-detect) and the Python/CLI preconditions.
- **[BLOCKING]** When `--mode=query`, read `references/mode-query.md` in full FIRST; it owns intent mapping, the `status` handling (`ok`/`ambiguous`/`not_found`/`error`) and the result formats.
- **[BLOCKING]** When `--mode=trace`, read `references/mode-trace.md` in full FIRST; it owns direction choice, the bug/failure upstream-first rule and the CLI flags.
- **[BLOCKING]** When `--mode=blast-radius`, read `references/mode-blast-radius.md` in full FIRST; it owns the live CLI run, the risk bands and the recommendations.
- **[BLOCKING]** When `--mode=connect-api`, read `references/mode-connect-api.md` in full FIRST; it owns the matching strategies, zero-config detection and the optional `graphConnectors.apiEndpoints` config.
- **[BLOCKING]** When `--mode=export`, read `references/mode-export.md` in full FIRST; it owns `--format=json|mermaid` (default JSON), file selection, required Mermaid target, output paths and result reporting.
- The six modes share one CLI and one database, never one body: a mode never loads another mode's file. Cross-mode hints are plain pointers (`/graph-code --mode=build` builds the graph).
- The CLI verbs `blast-radius`, `connect-api`, `connect-implicit`, `export`, `export-mermaid`, `review-context` and `describe` are not skills; `/graph-code --mode=export` owns JSON and Mermaid exports. The hooks `graph-session-init`, `graph-prompt-sync` and `graph-auto-update` keep the graph current without this skill.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; investigating non-trivial bugs or failed verification, changing code behavior, or tracing unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** for non-trivial bugs, failed verification, regression fixes, behavior-changing code or unclear code flow, trace backward from the observed output through every feeder path before fixing. Establish hypotheses, the authoritative invariant owner and forward proof; retain validation at untrusted boundaries. Ordinary artifact review or graph lookup alone does not trigger a debugging workflow.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Operate the code knowledge graph through exactly one mode per invocation, read that mode's reference in full first, and treat every graph answer as a stale-able hint to verify by reading.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **End-To-Start Debugger Trace:** for bug/failure or unclear-code investigation, trace backward from the observed output and establish hypotheses before fixing. Build, query and export alone do not trigger debugging.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** `--mode=<x>` reads `references/mode-<x>.md` in full FIRST; no mode and no matching intent shows the mode table, never a guess
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
