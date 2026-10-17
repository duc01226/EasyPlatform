# `/graph-code --mode=trace` — trace full system flow

> Loaded by `graph-code/SKILL.md`'s Mode Dispatch when invoked as `/graph-code --mode=trace <target> [--direction …] [--depth N] [--edge-kinds …] [--node-mode …]`. This contract REPLACES every other mode for the invocation.

**Goal:** Trace full system flow from a target file or function through all edge types (CALLS, events, bus messages, API endpoints) using BFS. Supports downstream, upstream, or bidirectional tracing. Use when investigating what happens when code executes, understanding blast radius, or tracing frontend-to-backend flows. Shows the complete chain: API endpoints → commands → entity events → bus messages → cross-service consumers.

**Workflow:** Identify the target → choose direction → run the trace → present results by depth level → resolve ambiguity with `search`.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.

<!-- SKILL-NAV:START -->
## Contents

- [When to Use](#when-to-use)
- [Prerequisites](#prerequisites)
- [Workflow](#workflow)
- [Edge Types Traced](#edge-types-traced)
- [CLI Reference](#cli-reference)
- [Examples](#examples)
- [Anti-Patterns](#anti-patterns)
- [Related Modes](#related-modes)

<!-- SKILL-NAV:END -->

## When to Use

- **"What happens when X is called/created/updated?"** → `--direction downstream`
- **"What calls/triggers X?"** → `--direction upstream`
- **"Show me the full flow through X"** → `--direction both` (best when entry point is a middle file like a controller or command handler)
- **Impact analysis** — understand what's affected by a code change
- **Cross-service tracing** — follow MESSAGE_BUS edges to see which services consume events

## Prerequisites

Graph must exist (`.code-graph/graph.db`). If missing, report "graph not built — run /graph-code --mode=build, or continue with grep" and stop.

## Workflow

### Step 1: Identify the target

If the user specifies a file path, use it directly. If the query is semantic:

1. **For bug/failure symptoms:** grep for the observed final output first (reader, renderer, assertion, query, aggregate, log, stored field), then use that file as the first trace target.
2. **For feature-flow questions:** grep for entry point files related to the user's query.
3. Use the discovered file as the trace target.

### Step 2: Choose direction

| Direction              | When to Use                         | Example                                   |
| ---------------------- | ----------------------------------- | ----------------------------------------- |
| `downstream` (default) | What does this code trigger?        | "What happens after an order is created?" |
| `upstream`             | What calls this code?               | "What triggers this event handler?"       |
| `both`                 | Full picture through a middle point | "Show full flow through this controller"  |

**Bug/failure rule:** start with `upstream` or `both` from the final reader/output file before tracing producers downstream. This prevents starting from a guessed origin path and missing alternate writers.

### Step 3: Run trace

```bash
# Downstream trace (default) — what does this trigger?
python .claude/scripts/code_graph trace <target> --json

# Upstream trace — what calls/triggers this?
python .claude/scripts/code_graph trace <target> --direction upstream --json

# Bidirectional — full flow through this point
python .claude/scripts/code_graph trace <target> --direction both --json

# End-to-start bug trace — begin at final reader/output, then enumerate upstream producers
python .claude/scripts/code_graph trace <final-reader-or-output-file> --direction upstream --depth 5 --json
python .claude/scripts/code_graph trace <writer-or-consumer-file> --direction both --depth 5 --json

# Custom depth (default: 3)
python .claude/scripts/code_graph trace <target> --direction both --depth 5 --json

# Filter to specific edge types
python .claude/scripts/code_graph trace <target> --edge-kinds CALLS,MESSAGE_BUS --json
```

### Step 4: Present results

The trace returns a multi-level BFS tree:

```json
{
  "status": "ok",
  "direction": "both",
  "levels": [
    { "depth": 0, "nodes": [...], "edges": [] },
    { "depth": 1, "nodes": [...], "edges": [{ "kind": "CALLS", ... }] },
    { "depth": 2, "nodes": [...], "edges": [{ "kind": "MESSAGE_BUS", ... }] }
  ]
}
```

Present results grouped by depth level. Highlight cross-service MESSAGE_BUS edges — these show the flow spreading to other microservices.

### Step 5: Handle ambiguous targets

If trace returns `status: "ambiguous"`, multiple nodes match the target name. Use `search` to find the exact qualified name:

```bash
python .claude/scripts/code_graph search <keyword> --kind Function --json
```

Then retry with the full qualified name.

## Edge Types Traced

| Edge Kind                | Meaning                                          |
| ------------------------ | ------------------------------------------------ |
| `CALLS`                  | Direct function/method calls                     |
| `TRIGGERS_EVENT`         | Entity CRUD triggers event handler               |
| `PRODUCES_EVENT`         | Event handler triggers bus message producer      |
| `MESSAGE_BUS`            | Bus message producer to consumer (cross-service) |
| `TRIGGERS_COMMAND_EVENT` | Command triggers command event handler           |
| `API_ENDPOINT`           | Frontend HTTP call to backend route              |

## CLI Reference

```
trace <target> [--direction downstream|upstream|both] [--depth N] [--edge-kinds KIND1,KIND2] [--node-mode file|function|class|all] [--json]
```

| Flag           | Default      | Description                                                         |
| -------------- | ------------ | ------------------------------------------------------------------- |
| `--direction`  | `downstream` | Trace direction                                                     |
| `--depth`      | `3`          | Maximum BFS depth                                                   |
| `--edge-kinds` | all          | Comma-separated edge kinds to follow                                |
| `--node-mode`  | `all`        | Granularity: `file` (10-30x less noise), `function`, `class`, `all` |
| `--json`       | off          | Structured JSON output                                              |

## Examples

```bash
# What happens when a user is created? (trace from command handler downstream — substitute paths from project config)
python .claude/scripts/code_graph trace {path/to/command-handler-file} --json

# What calls this API controller? (trace upstream to find frontend callers)
python .claude/scripts/code_graph trace {path/to/controller-file} --direction upstream --json

# Full flow through an entity event handler (upstream triggers + downstream consumers)
python .claude/scripts/code_graph trace {path/to/event-handler-file} --direction both --json

# File-level overview (10-30x less noise — great first pass before drilling into functions)
python .claude/scripts/code_graph trace {path/to/controller-file} --direction both --node-mode file --json
```

## Anti-Patterns

- **Don't trace without `--json`** — structured output is needed for parsing
- **Don't trace with depth > 5** — results get noisy; use edge-kinds filter instead
- **Don't skip grep-first** — if you don't know the file path, grep for it first
- **Don't use for single-hop queries** — use `callers_of` or `importers_of` (`/graph-code --mode=query`) instead (faster)

## Related Modes

- `/graph-code --mode=query` — Individual query patterns (callers_of, importers_of, etc.)
- `/graph-code --mode=blast-radius` — Change-driven impact analysis from git diff
- `/graph-code --mode=build` — Build or rebuild the graph
- `/graph-code --mode=connect-api` — Frontend-to-backend API endpoint matching
