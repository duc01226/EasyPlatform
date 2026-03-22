"""MCP-style AI-friendly command descriptions for code-graph CLI.

Each command has structured metadata so AI agents can decide which tool
to use without reading documentation. Descriptions follow MCP tool schema:
summary, when_to_use, when_not_to_use, input, key_options, output, examples.
"""

COMMAND_DESCRIPTIONS: dict[str, dict] = {
    "trace": {
        "summary": "Trace full system flow from a file or function via BFS",
        "when_to_use": (
            "BEST FIRST CHOICE after grep finds key files. Discovers callers, consumers, "
            "bus messages, event chains that grep cannot find. Reveals complete "
            "upstream + downstream dependency tree."
        ),
        "when_not_to_use": "Simple 'what is in this file' questions — use connections instead.",
        "input": "File path (relative) or function/class name. Accepts qualified names (file::Class.method).",
        "key_options": {
            "--direction": "downstream (what does this affect?), upstream (what calls this?), both (full picture, recommended)",
            "--depth": "BFS hops, default 3. Use 1-2 for focused, 4-5 for deep chains.",
            "--edge-kinds": "Comma-separated: CALLS,IMPORTS_FROM,INHERITS,MESSAGE_BUS,TRIGGERS_EVENT,PRODUCES_EVENT,TRIGGERS_COMMAND_EVENT,API_ENDPOINT. Default: all except CONTAINS and TESTED_BY.",
            "--node-mode": "file (file-level overview, reduces noise 10-30x), function (function detail), class, all (default)",
        },
        "output": "Multi-level tree grouped by BFS depth. Each level has nodes[] and edges[].",
        "examples": [
            "trace src/api/controllers/UserController.cs --direction both --json",
            "trace src/api/controllers/UserController.cs --direction both --node-mode file --json",
            "trace CreateUserCommand --direction downstream --depth 2 --json",
        ],
        "noise_tip": "Use --node-mode file for overview, then --node-mode function on specific files for detail.",
    },
    "query": {
        "summary": "Run a specific graph query pattern (callers, importers, tests, etc.)",
        "when_to_use": (
            "When you know EXACTLY what relationship you want. "
            "'Who calls this function?' → callers_of. 'What imports this file?' → importers_of."
        ),
        "when_not_to_use": "Broad exploration — use trace instead.",
        "input": (
            "Pattern name + target. Patterns: callers_of, callees_of, imports_of, importers_of, "
            "children_of, tests_for, inheritors_of, file_summary. "
            "Aliases: who_calls, who_imports, uses_of, references_of, depends_on, subclasses_of."
        ),
        "key_options": {
            "--filter": "Regex on file paths to narrow results (e.g., 'Services/Users').",
            "--limit": "Max results to return.",
            "--node-mode": "Filter result nodes: file, function, class, all (default).",
        },
        "output": "Flat list of matching nodes + edges.",
        "examples": [
            "query callers_of UserService --json",
            "query importers_of src/models/User.cs --json",
            "query tests_for createUser --json",
        ],
    },
    "connections": {
        "summary": "All relationships for a file or node in one call",
        "when_to_use": (
            "Quick overview of a single file's neighborhood — imports, importers, callers, tests."
        ),
        "when_not_to_use": "Deep multi-hop tracing — use trace instead.",
        "input": "File path or node name.",
        "key_options": {
            "--limit": "Max results per section (default: 20).",
            "--node-mode": "Filter result nodes: file, function, class, all (default).",
        },
        "output": "Grouped sections: file_summary, imports_of, importers_of, callers_of, tests_for.",
        "examples": [
            "connections src/handlers/CreateUserHandler.cs --json",
            "connections src/handlers/CreateUserHandler.cs --node-mode file --json",
        ],
    },
    "search": {
        "summary": "Find nodes by keyword across the entire graph",
        "when_to_use": "When you don't know the exact file/function name. Multi-word AND search.",
        "when_not_to_use": "If you have a file path, use trace or connections directly.",
        "input": "Keyword string (space-separated for AND logic).",
        "key_options": {
            "--kind": "Filter by node kind: Function, Class, File, Test.",
            "--limit": "Max results (default: 20).",
        },
        "output": "List of matching nodes with file paths and line numbers.",
        "examples": [
            "search createUser --kind Function --json",
            "search UserService --kind Class --json",
        ],
    },
    "batch-query": {
        "summary": "Query multiple files at once with deduplicated results",
        "when_to_use": "Reviewing 2+ changed files — gets all nodes + 1-hop edges in one call.",
        "input": "Space-separated file paths.",
        "output": "Deduplicated nodes and edges across all queried files.",
        "examples": ["batch-query src/A.cs src/B.cs src/C.cs --json"],
    },
    "find-path": {
        "summary": "Find shortest path between two nodes",
        "when_to_use": "Investigating how two components are connected — shortest chain of relationships.",
        "input": "Source and target node names or qualified names.",
        "output": "Ordered list of qualified names from source to target.",
        "examples": ["find-path UserController UserRepository --json"],
    },
    "blast-radius": {
        "summary": "Impact analysis of git changes",
        "when_to_use": "Before committing — shows all files and nodes affected by current changes.",
        "input": "Auto-detects from git diff. Override with --base.",
        "output": "Changed nodes, impacted nodes, impacted files, connecting edges.",
        "examples": ["blast-radius --json", "blast-radius --base main --json"],
    },
    "status": {
        "summary": "Graph statistics — node/edge counts, languages, last updated",
        "when_to_use": "Check if graph exists and is up to date.",
        "input": "None.",
        "output": "Node counts by kind, edge counts by kind, languages, file count.",
        "examples": ["status --json"],
    },
    "build": {
        "summary": "Full graph rebuild — re-parses every file",
        "when_to_use": "First-time setup or after major restructuring.",
        "input": "None (scans repo root).",
        "output": "Build summary with file/node/edge counts.",
        "examples": ["build --json"],
    },
    "sync": {
        "summary": "Git-aware incremental sync — re-parses only changed files",
        "when_to_use": "After pulling code or switching branches.",
        "input": "None (auto-detects from git).",
        "output": "Sync summary with added/modified/deleted file counts.",
        "examples": ["sync --json"],
    },
    "describe": {
        "summary": "Show AI-friendly descriptions of all commands (this output)",
        "when_to_use": "When AI needs to decide which graph command to use.",
        "input": "Optional command name to describe a single command.",
        "output": "Structured JSON with summary, when_to_use, examples per command.",
        "examples": ["describe --json", "describe trace --json"],
    },
}


def describe_commands(command_name: str | None = None) -> dict:
    """Return MCP-style descriptions for graph CLI commands.

    Args:
        command_name: If provided, return description for a single command.
                     If None, return all command descriptions.

    Returns:
        Dict with status and descriptions.
    """
    if command_name:
        desc = COMMAND_DESCRIPTIONS.get(command_name)
        if not desc:
            return {
                "status": "error",
                "error": f"Unknown command '{command_name}'. Available: {sorted(COMMAND_DESCRIPTIONS.keys())}",
            }
        return {"status": "ok", "command": command_name, "description": desc}

    return {
        "status": "ok",
        "commands": COMMAND_DESCRIPTIONS,
        "summary": f"{len(COMMAND_DESCRIPTIONS)} commands available. Use 'describe <command> --json' for details.",
    }
