---
name: graph-trace
description: '[Code Intelligence] Trace full system flow from a target file or function through all edge types (CALLS, events, bus messages, API endpoints). Supports downstream, upstream, or bidirectional tracing. Use when investigating what happens when code executes, understanding blast radius, or tracing frontend-to-backend flows.'
version: 1.0.0
---

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

# Graph Trace — Full System Flow

Trace connections from a target node through multiple edge types using BFS. Shows the complete chain: API endpoints → commands → entity events → bus messages → cross-service consumers.

## Quick Summary

**Goal:** [Code Intelligence] Trace full system flow from a target file or function through all edge types (CALLS, events, bus messages, API endpoints). Supports downstream, upstream, or bidirectional tracing. Use when investigating what happens when code executes, understanding blast radius, or tracing frontend-to-backend flows.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- NEVER skip mandatory workflow or skill gates.

## When to Use

- **"What happens when X is called/created/updated?"** → `--direction downstream`
- **"What calls/triggers X?"** → `--direction upstream`
- **"Show me the full flow through X"** → `--direction both` (best when entry point is a middle file like a controller or command handler)
- **Impact analysis** — understand what's affected by a code change
- **Cross-service tracing** — follow MESSAGE_BUS edges to see which services consume events

## Prerequisites

Graph must exist (`.code-graph/graph.db`). If missing, run `/graph-build` first.

## Workflow

### Step 1: Identify the target

If the user specifies a file path, use it directly. If the query is semantic:

1. **Grep first** to find entry point files related to the user's query
2. Use the discovered file as the trace target

### Step 2: Choose direction

| Direction              | When to Use                         | Example                                   |
| ---------------------- | ----------------------------------- | ----------------------------------------- |
| `downstream` (default) | What does this code trigger?        | "What happens after employee is created?" |
| `upstream`             | What calls this code?               | "What triggers this event handler?"       |
| `both`                 | Full picture through a middle point | "Show full flow through this controller"  |

### Step 3: Run trace

```bash
# Downstream trace (default) — what does this trigger?
python .claude/scripts/code_graph trace <target> --json

# Upstream trace — what calls/triggers this?
python .claude/scripts/code_graph trace <target> --direction upstream --json

# Bidirectional — full flow through this point
python .claude/scripts/code_graph trace <target> --direction both --json

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
# What happens when a user is created? (trace from command handler downstream)
python .claude/scripts/code_graph trace src/Services/Accounts/Commands/CreateUser/CreateUserCommandHandler.cs --json

# What calls this API controller? (trace upstream to find frontend callers)
python .claude/scripts/code_graph trace src/Services/Growth/Controllers/GoalController.cs --direction upstream --json

# Full flow through an entity event handler (upstream triggers + downstream consumers)
python .claude/scripts/code_graph trace src/Services/Employee/UseCaseEvents/EmployeeCreatedEventHandler.cs --direction both --json

# File-level overview (10-30x less noise — great first pass before drilling into functions)
python .claude/scripts/code_graph trace src/Services/Growth/Controllers/GoalController.cs --direction both --node-mode file --json
```

## Anti-Patterns

- **Don't trace without `--json`** — structured output is needed for parsing
- **Don't trace with depth > 5** — results get noisy; use edge-kinds filter instead
- **Don't skip grep-first** — if you don't know the file path, grep for it first
- **Don't use for single-hop queries** — use `callers_of` or `importers_of` instead (faster)

## Related Skills

- `/graph-query` — Individual query patterns (callers_of, importers_of, etc.)
- `/graph-blast-radius` — Change-driven impact analysis from git diff
- `/graph-build` — Build or rebuild the graph
- `/graph-connect-api` — Frontend-to-backend API endpoint matching

---

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

<!-- /SYNC:ai-mistake-prevention -->
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
