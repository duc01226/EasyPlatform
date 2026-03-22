# Graph Impact Analysis Protocol

**MANDATORY** for review and test skills when `.code-graph/graph.db` exists.
Skip gracefully if graph.db does not exist.

## Purpose

Detect ALL files potentially affected by current changes — including cross-service consumers, event handlers, and frontend-backend connections that are NOT in the current changeset. These are "potentially stale" files that may need updates.

## What It Traces (7 edge types — all implicit connections)

| Edge Type              | What It Finds                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| CALLS                  | Function call chains (callers + callees)                                                                  |
| MESSAGE_BUS            | Cross-service RabbitMQ consumers (e.g., AccountUserSavedEventBusMessage → 12 consumers across 9 services) |
| API_ENDPOINT           | Frontend → backend HTTP connections                                                                       |
| TRIGGERS_EVENT         | Entity event handlers triggered by CRUD operations                                                        |
| PRODUCES_EVENT         | Events produced by entity changes                                                                         |
| TRIGGERS_COMMAND_EVENT | Command event triggers                                                                                    |
| INHERITS               | Class inheritance chains (base class change affects all children)                                         |

## Steps

### Step 1: Run blast-radius (auto-detects changed files from git)

```bash
# Default: compare HEAD vs HEAD~1 (last commit)
python .claude/scripts/code_graph blast-radius --json

# For PR review: compare current branch vs target branch
python .claude/scripts/code_graph blast-radius --base origin/master --json

# For feature branch review: compare vs develop
python .claude/scripts/code_graph blast-radius --base origin/develop --json
```

**How it detects changes:**

1. `git diff --name-only {base}` — committed changes vs base ref
2. Fallback: `git status --porcelain` — staged + unstaged + untracked files
3. Seeds ALL changed files into ONE graph, then BFS outward (both forward + reverse)

Compact mode is default — relative paths, inline objects, service-disambiguated names.

Parse these keys from the JSON output:

- `changed_files` — files modified in git
- `impacted_files` — files affected within 2 hops (via ALL 7 edge types, relative paths)
- `total_impacted` — count of impacted nodes (for risk assessment)
- `truncated` — whether results were capped at 500 nodes

**Key behavior:** blast-radius seeds ALL changed files at once into a single BFS graph. Cross-file connections are automatically discovered. Deduplication is handled by the visited set.

### Step 2: Deep trace on high-impact files (complementary)

blast-radius gives 2-hop breadth. Trace gives 3-hop depth per file. Use trace for deeper chains on high-impact files:

```bash
python .claude/scripts/code_graph trace <file> --direction downstream --json
```

**blast-radius vs trace:**

| Feature    | blast-radius                       | trace               |
| ---------- | ---------------------------------- | ------------------- |
| Input      | ALL changed files at once          | One file at a time  |
| Graph      | ONE connected graph from all seeds | Separate per file   |
| Depth      | 2 hops (breadth)                   | 3 hops (depth)      |
| Direction  | Both (forward + reverse)           | Configurable        |
| Edge types | ALL (unfiltered)                   | 7 structural types  |
| Best for   | Overview + stale file detection    | Deep chain analysis |

Both use compact output by default — inline objects, relative paths, service-disambiguated names.

### Step 3: Identify potentially stale/missing files

Compute the gap:

- **All impacted files** = `impacted_files` from blast-radius + any additional files from trace
- **Changed files** = files in the current git changeset
- **Gap = impacted_files - changed_files**

These gap files are **potentially stale** — they may need updates but are NOT in the current changeset.

### Step 4: Report findings

Include this section in the review/test output:

```
## Graph Impact Analysis

Changed files: N
Impacted files: M (within 2-3 hops via CALLS + MESSAGE_BUS + API_ENDPOINT + events)
**Potentially stale (not in changeset): K files**
Risk: Low (<5 impacted) / Medium (5-20) / High (>20)

Potentially stale files:
- path/to/ConsumerFile.cs ← MESSAGE_BUS from ChangedFile.cs
- path/to/EventHandler.cs ← TRIGGERS_EVENT from ChangedEntity.cs
- path/to/FrontendComponent.ts ← API_ENDPOINT from ChangedController.cs
```

## Risk Levels

| Risk       | Impacted Nodes | Action                                                                           |
| ---------- | -------------- | -------------------------------------------------------------------------------- |
| **Low**    | <5             | Changes well-contained. Proceed normally.                                        |
| **Medium** | 5-20           | Review callers and consumers carefully. Flag stale files.                        |
| **High**   | >20            | Consider splitting PR. Verify all stale files. Cross-service review recommended. |

## Edge Cases

- **No graph.db**: Skip protocol entirely. Log: "Graph not available, skipping impact analysis."
- **No changed files**: blast-radius returns empty. Log: "No changes detected."
- **Truncated results** (`truncated: true`): Warn that impact may be larger than shown. Consider running trace on specific high-risk files.
- **Large changeset (>20 files)**: blast-radius caps at 500 nodes. Focus trace on service boundary files (controllers, bus message handlers).
