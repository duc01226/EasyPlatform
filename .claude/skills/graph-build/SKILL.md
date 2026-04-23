---
name: graph-build
description: '[Code Intelligence] Build or update the code review knowledge graph. Parses codebase with Tree-sitter into a structural graph (functions, classes, imports, calls, tests) stored in SQLite. Enables blast-radius analysis and graph-powered code review.'
version: 1.0.0
---

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

# Build Graph

Build or incrementally update the persistent code knowledge graph for this repository.

## Prerequisites

Requires Python 3.10+ with: `pip install tree-sitter tree-sitter-language-pack networkx`

## Steps

1. **Check availability** — Run via Bash:

    ```bash
    python .claude/scripts/code_graph status --json
    ```

    - If error (Python/deps missing): show install instructions and stop
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

## When to Use

- First time setting up graph for a project
- After major refactoring or branch switches
- If graph seems stale or out of sync
- Graph auto-updates via PostToolUse hook, so manual builds are rarely needed

## Notes

- Graph stored at `.code-graph/graph.db` (SQLite, auto-gitignored)
- Supported: Python, TypeScript, JavaScript, Vue, Go, Rust, Java, C#, Ruby, Kotlin, Swift, PHP, Solidity, C/C++
- Initial build: ~10s for 500 files. Incremental: <2s

## Connectors (Auto-Run)

After build/update, graph connectors run automatically if configured in `project-config.json`:

- **API Endpoints**: Frontend HTTP calls matched to backend routes (`graphConnectors.apiEndpoints`)
- **Implicit Connections**: Entity events, message bus, command events (`graphConnectors.implicitConnections`)

See `/graph-connect-api` and `.claude/docs/code-graph-mechanism.md` for details.

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

### Common Mistakes (DO NOT USE)

| Invalid Command         | Correct Alternative                                               |
| ----------------------- | ----------------------------------------------------------------- |
| `incremental`           | `update --json` (incremental is the default behavior of `update`) |
| `update --files <list>` | `update --json` (auto-detects changed files via git diff)         |
| `build --files <list>`  | `build --json` (always does full rebuild)                         |
| `sync --files <list>`   | `sync --json` (auto-detects from git)                             |
| `file_summary`          | `connections <file> --json`                                       |

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
    <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
