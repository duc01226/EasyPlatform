---
name: graph-trace
description: '[Code Intelligence] Use when investigating what happens when code executes, understanding blast radius, or tracing frontend-to-backend flows.'
version: 1.0.0
---

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

## Post-Grep Trace Trigger (run a trace after grep surfaces a key file)

When a grep/glob surfaces an important entry-point file — an entity, command, query, event/command handler, controller, bus message/consumer, component, store, or api-service — immediately run a graph trace on it before concluding. Grep finds files; the trace reveals callers, consumers, bus messages, event chains, and tests that grep CANNOT find:

```bash
python .claude/scripts/code_graph trace <key-entry-file> --direction both --json
```

**Pattern: grep finds files → graph trace reveals full system flow → grep verifies specific details.**

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
- **Don't use for single-hop queries** — use `callers_of` or `importers_of` instead (faster)

## Related Skills

- `/graph-query` — Individual query patterns (callers_of, importers_of, etc.)
- `/graph-blast-radius` — Change-driven impact analysis from git diff
- `/graph-build` — Build or rebuild the graph
- `/graph-connect-api` — Frontend-to-backend API endpoint matching

---

# Graph Trace — Full System Flow

Trace connections from a target node through multiple edge types using BFS. Shows the complete chain: API endpoints → commands → entity events → bus messages → cross-service consumers.

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and the lowest shared point that protects all downstream consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

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

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **End-to-Start Debugger Trace:** trace backward from final output, enumerate feeders before fixing.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** trace every claim, confidence >80% to act, never guess.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
