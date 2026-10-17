# `$graph-code --mode=blast-radius` — structural impact of the current code changes

> Loaded by `graph-code/SKILL.md`'s Mode Dispatch when invoked as `$graph-code --mode=blast-radius`. This contract REPLACES every other mode for the invocation.

**Goal:** Analyze the blast radius of the current code changes using the structural knowledge graph: impacted files, functions, test coverage gaps and a risk level. The result is a stale-able hint to verify by reading the files.

**Workflow:** Check the graph exists → run `blast-radius --json` → present changed and impacted nodes → risk assessment → recommendations.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.

## Prerequisites

- Graph not built (`.code-graph/graph.db` absent): report "graph not built — run $graph-code --mode=build, or continue with grep" and stop.
- Requires Python 3.10+ with tree-sitter, tree-sitter-language-pack, networkx.

## Steps

1. **Check graph exists** — Verify `.code-graph/graph.db` exists. If not, report it plainly as above.

2. **Run blast-radius analysis** via Bash:

    ```bash
    python .claude/scripts/code_graph blast-radius --json
    ```

3. **Parse JSON output** and present:
    - **Changed files:** List of modified files (auto-detected from git)
    - **Changed nodes:** Functions/classes directly modified
    - **Impacted nodes:** Functions/classes affected within 2 hops (callers, dependents, tests)
    - **Impacted files:** Additional files that may need attention
    - **Truncation:** If results were truncated, note total vs shown

4. **Risk assessment** based on blast radius size:
    - **Low risk:** <5 impacted nodes, changes well-contained
    - **Medium risk:** 5-20 impacted nodes, review callers carefully
    - **High risk:** >20 impacted nodes, consider splitting PR

5. **Recommendations:**
    - Flag untested changed functions
    - Suggest files to prioritize in review
    - Warn about inheritance/implementation relationship changes

## Run the CLI Live (never expect pre-injected blast-radius)

This mode is the on-invoke home for blast-radius analysis. There is no auto-injected, pre-computed blast-radius context — you MUST ATTENTION **run the CLI yourself** to get LIVE impact data for the current working tree. Frozen/stale numbers are wrong by definition once the diff changes:

```bash
python .claude/scripts/code_graph blast-radius --json
```

## Trace for Deep Impact Analysis

For impact beyond direct callers/importers, use the `trace` command to follow the full chain through implicit connections:

```bash
python .claude/scripts/code_graph trace <changed-file> --direction downstream --depth 3 --json

# File-level overview first (10-30x less noise), then drill into functions:
python .claude/scripts/code_graph trace <changed-file> --direction downstream --node-mode file --json
```

This reveals downstream impact through MESSAGE_BUS edges (cross-service event consumers), TRIGGERS_EVENT (entity event handlers), and other implicit relationships that blast-radius may not surface directly.

## Additional Queries

For deeper investigation, run via Bash:

- `python ... query callers_of <function> --json` — who calls this function?
- `python ... query tests_for <function> --json` — what tests cover this?
- `python ... query inheritors_of <class> --json` — what inherits from this?
- `python ... query importers_of <file> --json` — who imports this file?
