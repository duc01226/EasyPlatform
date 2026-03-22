# Graph-Assisted Investigation Protocol

> **MANDATORY — DO NOT SKIP** when `.code-graph/graph.db` exists. Running graph queries on key files is a required phase in every investigation, scout, and understand-code-first workflow. Without graph, your understanding of the codebase is incomplete. Skip only if graph.db is missing.

<HARD-GATE>
When `.code-graph/graph.db` exists, you MUST run at least ONE graph command on key files
before concluding any investigation, creating any plan, or verifying any fix.
Proceeding without graph evidence when graph.db is available is FORBIDDEN.
</HARD-GATE>

## Minimum Required Graph Actions by Task Type

| Task                | Minimum Graph Action                            |
| ------------------- | ----------------------------------------------- |
| Investigation/Scout | `trace --direction both` on 2-3 entry files     |
| Fix/Debug           | `callers_of` on buggy function + `tests_for`    |
| Feature/Enhancement | `connections` on files to be modified           |
| Code Review         | `tests_for` on changed functions                |
| Prove Fix           | `trace --direction downstream` for blast radius |
| Test Verification   | `batch-query` on changed files for coverage     |

## Core Principle: Orchestrate Grep ↔ Graph ↔ Glob

Graph is a **power tool** alongside grep and glob — not a replacement. AI dynamically decides which tool to use next based on what it learns at each step.

**Valid orchestration flows:**

- `Grep → Graph → Grep` — Find entry files, expand network, verify content
- `Graph → Grep` — Known class/function name? Query graph directly, then verify
- `Glob → Graph` — Find file structure, then graph reveals relationships
- `Grep → Graph → Grep → Graph` — Iterative deepening is encouraged

**The key:** Use the RIGHT tool for each step. Grep finds text. Graph finds structure. Glob finds files.

## When to Use Graph (Decision Guide)

| You need to find...           | Best tool               | Graph query                                     |
| ----------------------------- | ----------------------- | ----------------------------------------------- |
| Files containing a keyword    | **Grep**                | N/A                                             |
| ALL callers of a function     | **Graph**               | `callers_of <function>`                         |
| ALL files importing a module  | **Graph**               | `importers_of <module>`                         |
| Tests covering a function     | **Graph**               | `tests_for <function>`                          |
| Class inheritance hierarchy   | **Graph**               | `inheritors_of <class>`                         |
| Full picture of a file        | **Graph**               | `connections <file>` or `file_summary <file>`   |
| Multiple files' relationships | **Graph**               | `batch-query <f1> <f2> <f3>`                    |
| Cross-service event flow      | **Graph** then **Grep** | `importers_of <BusMessage>` then grep content   |
| Blast radius of changes       | **Graph**               | Auto-injected by hook; or `/graph-blast-radius` |
| Text inside a specific file   | **Grep** or **Read**    | N/A                                             |

### Step 0: Grep/Glob/Search-First Discovery (BEFORE Graph Queries)

When the user's query is semantic (describes a behavior, not a specific file):

1. Use Grep/Glob/Search to find entry point files (class names, commands, handlers, endpoints)
2. These files become the input for subsequent graph queries
3. Skip this step ONLY when the user provides a specific file path

### Using Trace for Full System Flow

After finding entry points, use `trace` for comprehensive flow analysis:

```bash
python .claude/scripts/code_graph trace <entry-file> --direction both --depth 3 --json
```

This is preferred over running multiple individual queries (connections, callers_of, etc.) when you need the complete picture. **Tip:** Use `--node-mode file` for a high-level overview (10-30x less noise), then `--node-mode function` to drill into specific files of interest.

## Standard Investigation Flow

1. **Quick grep/glob** to find 1-3 entry files (entities, commands, handlers)
2. **Graph expand** on found files to discover full dependency network:

    ```bash
    # Check graph exists
    ls .code-graph/graph.db 2>/dev/null && echo "AVAILABLE" || echo "MISSING"

    # Full picture of a key file (callers + importers + tests in one call)
    python .claude/scripts/code_graph connections <file> --json

    # Find all callers of a specific function/class
    python .claude/scripts/code_graph query callers_of <name> --json

    # Find all files importing a module/entity
    python .claude/scripts/code_graph query importers_of <file> --json

    # Find tests for a function
    python .claude/scripts/code_graph query tests_for <name> --json

    # Query multiple files at once (most efficient for batch discovery)
    python .claude/scripts/code_graph batch-query <f1> <f2> <f3> --json

    # Search by keyword (when you don't know exact name, or get "ambiguous" status)
    python .claude/scripts/code_graph search <keyword> --kind Function --json

    # Find shortest path between two nodes (trace how A connects to B)
    python .claude/scripts/code_graph find-path <source> <target> --json

    # Filter results by service/path and limit count
    python .claude/scripts/code_graph query callers_of <name> --limit 5 --filter "ServiceName" --json
    ```

3. **Disambiguate** if graph returns `status: "ambiguous"` — use `search --kind Function` to narrow, then retry with the qualified name
4. **Grep verify** content in graph-discovered files
5. **Repeat** if graph results reveal more entry points worth expanding

## Workflow-Specific Patterns

### Investigation / Scout

- Grep finds entity/command → `connections` reveals full network → grep verifies behavior

### Feature Enhancement

- `connections <modified_file>` → find ALL connected files → check if they need updates too

### Bug Fixing

- `callers_of <buggy_function>` → find all callers (may share the bug)
- `tests_for <buggy_function>` → find tests to verify fix

### Code Review / Review Changes

- `tests_for <changed_function>` → flag UNTESTED changes (coverage gap)
- `callers_of <changed_function>` → check callers handle new behavior
- `importers_of <changed_module>` → check importers need updates

### Test Coverage

- `batch-query <changed_files>` → get all production functions
- `tests_for` on each → list uncovered functions

## Anti-Patterns

- Do NOT rebuild graph during investigation — use `/graph-build` separately
- Do NOT use graph for text search — grep is better for content matching
- Do NOT skip grep entirely — graph may miss files not yet indexed
- Do NOT run graph queries without `--json` flag — unstructured output is harder to parse
