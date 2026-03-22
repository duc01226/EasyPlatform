"""Code Review Graph query and analysis tools.

Adapted from code-graph v1.8.4 (MIT License).
Source: https://github.com/tirth8205/code-graph

Provides 7 tools:
1. build_or_update_graph  - full or incremental build
1b. sync_graph            - git-aware sync (diff last_synced_commit vs HEAD)
2. get_impact_radius      - blast radius from changed files
3. query_graph            - predefined graph queries
4. get_review_context     - focused subgraph + review prompt
5. search_nodes           - keyword search across nodes
6. find_large_functions   - find oversized functions/classes by line count
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .graph import (
    GraphStore,
    edge_to_dict,
    edge_to_compact_dict,
    node_to_dict,
    node_to_compact_dict,
    _to_relative,
)
from .incremental import (
    find_project_root,
    full_build,
    get_changed_files,
    get_db_path,
    get_staged_and_unstaged,
    incremental_update,
    sync_with_git,
)

# Common JS/TS builtin method names filtered from callers_of results.
# "Who calls .map()?" returns hundreds of hits and is never useful.
# These are kept in the graph (callees_of still shows them) but excluded
# when doing reverse call tracing to reduce noise.
_BUILTIN_CALL_NAMES: set[str] = {
    "map", "filter", "reduce", "reduceRight", "forEach", "find", "findIndex",
    "some", "every", "includes", "indexOf", "lastIndexOf",
    "push", "pop", "shift", "unshift", "splice", "slice",
    "concat", "join", "flat", "flatMap", "sort", "reverse", "fill",
    "keys", "values", "entries", "from", "isArray", "of", "at",
    "trim", "trimStart", "trimEnd", "split", "replace", "replaceAll",
    "match", "matchAll", "search", "substring", "substr",
    "toLowerCase", "toUpperCase", "startsWith", "endsWith",
    "padStart", "padEnd", "repeat", "charAt", "charCodeAt",
    "assign", "freeze", "defineProperty", "getOwnPropertyNames",
    "hasOwnProperty", "create", "is", "fromEntries",
    "log", "warn", "error", "info", "debug", "trace", "dir", "table",
    "time", "timeEnd", "assert", "clear", "count",
    "then", "catch", "finally", "resolve", "reject", "all", "allSettled", "race", "any",
    "parse", "stringify",
    "floor", "ceil", "round", "random", "max", "min", "abs", "pow", "sqrt",
    "addEventListener", "removeEventListener", "querySelector", "querySelectorAll",
    "getElementById", "createElement", "appendChild", "removeChild",
    "setAttribute", "getAttribute", "preventDefault", "stopPropagation",
    "setTimeout", "clearTimeout", "setInterval", "clearInterval",
    "toString", "valueOf", "toJSON", "toISOString",
    "getTime", "getFullYear", "now",
    "isNaN", "parseInt", "parseFloat", "toFixed",
    "encodeURIComponent", "decodeURIComponent",
    "call", "apply", "bind", "next",
    "emit", "on", "off", "once",
    "pipe", "write", "read", "end", "close", "destroy",
    "send", "status", "json", "redirect",
    "set", "get", "delete", "has",
    "findUnique", "findFirst", "findMany", "createMany",
    "update", "updateMany", "deleteMany", "upsert",
    "aggregate", "groupBy", "transaction",
    "describe", "it", "test", "expect", "beforeEach", "afterEach",
    "beforeAll", "afterAll", "mock", "spyOn",
    "require", "fetch",
}


def _validate_repo_root(path: Path) -> Path:
    """Validate that a path is a plausible project root.

    Ensures the path is an existing directory that contains a ``.git``
    or ``.code-graph`` directory, preventing arbitrary file-system
    traversal via the ``repo_root`` parameter.
    """
    resolved = path.resolve()
    if not resolved.is_dir():
        raise ValueError(
            f"repo_root is not an existing directory: {resolved}"
        )
    if not (resolved / ".git").exists() and not (resolved / ".code-graph").exists():
        raise ValueError(
            f"repo_root does not look like a project root (no .git or "
            f".code-graph directory found): {resolved}"
        )
    return resolved


def _get_store(repo_root: str | None = None) -> tuple[GraphStore, Path]:
    """Resolve repo root and open the graph store."""
    root = _validate_repo_root(Path(repo_root)) if repo_root else find_project_root()
    db_path = get_db_path(root)
    return GraphStore(db_path), root


def _resolve_target_node(store: GraphStore, root: Path, target: str):
    """Resolve a target string to a graph node using 3-step lookup."""
    node = store.get_node(target)
    if not node:
        abs_target = str(root / target)
        node = store.get_node(abs_target)
    if not node:
        candidates = store.search_nodes(target, limit=5)
        if len(candidates) == 1:
            node = candidates[0]
        elif len(candidates) > 1:
            return None, {
                "status": "ambiguous",
                "summary": f"Multiple matches for '{target}'. Please use a qualified name.",
                "candidates": [node_to_dict(c) for c in candidates],
            }
    return node, None


def _find_tests_for(store: GraphStore, node, name: str) -> list[dict]:
    """Find tests for a node via TESTED_BY edges and naming convention."""
    qn = node.qualified_name if node else name
    tests = []
    if node:
        for e in store.get_edges_by_target(qn):
            if e.kind == "TESTED_BY":
                test = store.get_node(e.source_qualified)
                if test:
                    tests.append(node_to_dict(test))
    test_nodes = store.search_nodes(f"test_{name}", limit=10)
    test_nodes += store.search_nodes(f"Test{name}", limit=10)
    seen = {t.get("qualified_name") for t in tests}
    for t in test_nodes:
        if t.qualified_name not in seen and t.is_test:
            tests.append(node_to_dict(t))
    return tests


# ---------------------------------------------------------------------------
# Tool 1: build_or_update_graph
# ---------------------------------------------------------------------------


def build_or_update_graph(
    full_rebuild: bool = False,
    repo_root: str | None = None,
    base: str = "HEAD~1",
) -> dict[str, Any]:
    """Build or incrementally update the code knowledge graph.

    Args:
        full_rebuild: If True, re-parse every file. If False (default),
                      only re-parse files changed since `base`.
        repo_root: Path to the repository root. Auto-detected if omitted.
        base: Git ref for incremental diff (default: HEAD~1).

    Returns:
        Summary with files_parsed/updated, node/edge counts, and errors.
    """
    store, root = _get_store(repo_root)
    try:
        if full_rebuild:
            result = full_build(root, store)
            return {
                "status": "ok",
                "build_type": "full",
                "summary": (
                    f"Full build complete: parsed {result['files_parsed']} files, "
                    f"created {result['total_nodes']} nodes and {result['total_edges']} edges."
                ),
                **result,
            }
        else:
            result = incremental_update(root, store, base=base)
            if result["files_updated"] == 0:
                return {
                    "status": "ok",
                    "build_type": "incremental",
                    "summary": "No changes detected. Graph is up to date.",
                    **result,
                }
            return {
                "status": "ok",
                "build_type": "incremental",
                "summary": (
                    f"Incremental update: {result['files_updated']} files re-parsed, "
                    f"{result['total_nodes']} nodes and {result['total_edges']} edges updated. "
                    f"Changed: {result['changed_files']}. "
                    f"Dependents also updated: {result['dependent_files']}."
                ),
                **result,
            }
    finally:
        store.close()


# ---------------------------------------------------------------------------
# Tool 1b: sync_graph (git-aware sync)
# ---------------------------------------------------------------------------


def sync_graph(repo_root: str | None = None) -> dict[str, Any]:
    """Sync graph with current git state.

    Compares last_synced_commit against HEAD, re-parses changed files.
    """
    store, root = _get_store(repo_root)
    try:
        result = sync_with_git(root, store)
        if result.get("files_synced", 0) > 0:
            reason = result.get("reason", "synced")
            if reason == "first sync — added missing files":
                result["summary"] = f"First sync: added {result['files_synced']} files to graph."
            else:
                result["summary"] = (
                    f"Synced {result['files_synced']} files: "
                    f"+{result.get('added', 0)} added, "
                    f"~{result.get('modified', 0)} modified, "
                    f"-{result.get('deleted', 0)} deleted."
                )
        elif result.get("reason") == "up_to_date":
            result["summary"] = "Graph is up to date with HEAD."
        else:
            result["summary"] = result.get("reason", "sync complete")
        return result
    finally:
        store.close()


# ---------------------------------------------------------------------------
# Tool 1c: batch_file_query (multi-file deduplicated query)
# ---------------------------------------------------------------------------


def batch_file_query(
    files: list[str],
    repo_root: str | None = None,
) -> dict[str, Any]:
    """Query graph for multiple files at once, returning deduplicated results.

    For each file: nodes in file + 1-hop external edges (callers/importers).
    All results deduplicated by qualified_name (nodes) and source+target+kind (edges).
    """
    store, root = _get_store(repo_root)
    try:
        seen_nodes: dict[str, dict] = {}
        seen_edges: set[tuple[str, str, str]] = set()
        edges_out: list[dict] = []
        files_found = []
        files_not_found = []

        for rel_path in files:
            abs_path = str(root / rel_path)
            file_nodes = store.get_nodes_by_file(abs_path)
            if not file_nodes:
                # Try as-is (might already be absolute)
                file_nodes = store.get_nodes_by_file(rel_path)
            if not file_nodes:
                files_not_found.append(rel_path)
                continue
            files_found.append(rel_path)

            # Collect nodes (deduplicated by qualified_name)
            for n in file_nodes:
                if n.qualified_name not in seen_nodes:
                    seen_nodes[n.qualified_name] = node_to_dict(n)

            # Collect edges within and 1-hop external
            for n in file_nodes:
                # Outgoing edges (calls, imports from this node)
                for e in store.get_edges_by_source(n.qualified_name):
                    key = (e.source_qualified, e.target_qualified, e.kind)
                    if key not in seen_edges:
                        seen_edges.add(key)
                        edges_out.append(edge_to_dict(e))
                # Incoming edges (callers, importers of this node)
                for e in store.get_edges_by_target(n.qualified_name):
                    key = (e.source_qualified, e.target_qualified, e.kind)
                    if key not in seen_edges:
                        seen_edges.add(key)
                        edges_out.append(edge_to_dict(e))

        nodes_list = list(seen_nodes.values())
        return {
            "status": "ok",
            "files_queried": len(files),
            "files_found": len(files_found),
            "files_not_in_graph": files_not_found,
            "nodes": nodes_list,
            "edges": edges_out,
            "summary": (
                f"{len(files_found)} files, "
                f"{len(nodes_list)} nodes, "
                f"{len(edges_out)} edges"
            ),
        }
    finally:
        store.close()


# ---------------------------------------------------------------------------
# Tool 2: get_impact_radius
# ---------------------------------------------------------------------------


def get_impact_radius(
    changed_files: list[str] | None = None,
    max_depth: int = 2,
    max_results: int = 500,
    repo_root: str | None = None,
    base: str = "HEAD~1",
    compact: bool = True,
) -> dict[str, Any]:
    """Analyze the blast radius of changed files.

    Args:
        changed_files: Explicit list of changed file paths (relative to repo root).
                       If omitted, auto-detects from git diff.
        max_depth: How many hops to traverse in the graph (default: 2).
        max_results: Maximum impacted nodes to return (default: 500).
        repo_root: Repository root path. Auto-detected if omitted.
        base: Git ref for auto-detecting changes (default: HEAD~1).

    Returns:
        Changed nodes, impacted nodes, impacted files, connecting edges,
        plus ``truncated`` flag and ``total_impacted`` count.
    """
    store, root = _get_store(repo_root)
    try:
        if changed_files is None:
            changed_files = get_changed_files(root, base)
            if not changed_files:
                changed_files = get_staged_and_unstaged(root)

        if not changed_files:
            return {
                "status": "ok",
                "summary": "No changed files detected.",
                "changed_nodes": [],
                "impacted_nodes": [],
                "impacted_files": [],
                "truncated": False,
                "total_impacted": 0,
            }

        # Convert to absolute paths for graph lookup
        abs_files = [str(root / f) for f in changed_files]
        result = store.get_impact_radius(
            abs_files, max_depth=max_depth, max_nodes=max_results
        )

        root_str = str(root)
        _n2d = (lambda n: node_to_compact_dict(n, root_str)) if compact else node_to_dict
        _e2d = (lambda e: edge_to_compact_dict(e, root_str)) if compact else edge_to_dict

        changed_dicts = [_n2d(n) for n in result["changed_nodes"]]
        impacted_dicts = [_n2d(n) for n in result["impacted_nodes"]]
        edge_dicts = [_e2d(e) for e in result["edges"]]
        impacted_files = (
            [_to_relative(f, root_str) for f in result["impacted_files"]] if compact
            else result["impacted_files"]
        )
        truncated = result["truncated"]
        total_impacted = result["total_impacted"]

        summary_parts = [
            f"Blast radius for {len(changed_files)} changed file(s):",
            f"  - {len(changed_dicts)} nodes directly changed",
            f"  - {len(impacted_dicts)} nodes impacted (within {max_depth} hops)",
            f"  - {len(impacted_files)} additional files affected",
        ]
        if truncated:
            summary_parts.append(
                f"  - Results truncated: showing {len(impacted_dicts)}"
                f" of {total_impacted} impacted nodes"
            )

        return {
            "status": "ok",
            "summary": "\n".join(summary_parts),
            "changed_files": changed_files,
            "changed_nodes": changed_dicts,
            "impacted_nodes": impacted_dicts,
            "impacted_files": impacted_files,
            "edges": edge_dicts,
            "truncated": truncated,
            "total_impacted": total_impacted,
        }
    finally:
        store.close()


# ---------------------------------------------------------------------------
# Tool 3: query_graph
# ---------------------------------------------------------------------------

_QUERY_PATTERNS = {
    "callers_of": "Find all functions that call a given function",
    "callees_of": "Find all functions called by a given function",
    "imports_of": "Find all imports of a given file or module",
    "importers_of": "Find all files that import a given file or module",
    "children_of": "Find all nodes contained in a file or class",
    "tests_for": "Find all tests for a given function or class",
    "inheritors_of": "Find all classes that inherit from a given class",
    "file_summary": "Get a summary of all nodes in a file",
}

# Natural language aliases that map to canonical patterns
_QUERY_ALIASES = {
    "references_of": "importers_of",
    "uses_of": "callers_of",
    "who_calls": "callers_of",
    "who_imports": "importers_of",
    "depends_on": "imports_of",
    "subclasses_of": "inheritors_of",
    "extends": "inheritors_of",
}

# Patterns used by the composite `connections` command
_CONNECTIONS_PATTERNS = ["file_summary", "imports_of", "importers_of", "callers_of", "tests_for"]
_CONNECTIONS_CAP_PER_PATTERN = 20


def find_path(
    source: str,
    target: str,
    repo_root: str | None = None,
) -> dict[str, Any]:
    """Find shortest path between two nodes in the graph.

    Args:
        source: Source node name, qualified name, or file path.
        target: Target node name, qualified name, or file path.
        repo_root: Repository root path. Auto-detected if omitted.

    Returns:
        Shortest path as list of qualified names, or not_found/ambiguous status.
    """
    store, root = _get_store(repo_root)
    try:
        src_node, src_err = _resolve_target_node(store, root, source)
        if src_err:
            src_err["context"] = "source"
            return src_err

        tgt_node, tgt_err = _resolve_target_node(store, root, target)
        if tgt_err:
            tgt_err["context"] = "target"
            return tgt_err

        if not src_node:
            return {"status": "not_found", "summary": f"Source node '{source}' not found."}
        if not tgt_node:
            return {"status": "not_found", "summary": f"Target node '{target}' not found."}

        path = store.find_shortest_path(src_node.qualified_name, tgt_node.qualified_name)

        if not path:
            return {
                "status": "ok",
                "source": source,
                "target": target,
                "path": [],
                "summary": f"No path found between '{source}' and '{target}'.",
            }

        # Enrich path with node details
        path_details = []
        for qn in path:
            node = store.get_node(qn)
            if node:
                path_details.append(node_to_dict(node))
            else:
                path_details.append({"qualified_name": qn})

        return {
            "status": "ok",
            "source": source,
            "target": target,
            "path": path_details,
            "path_length": len(path),
            "summary": f"Path found: {len(path)} nodes from '{source}' to '{target}'.",
        }
    finally:
        store.close()


def query_graph(
    pattern: str,
    target: str,
    repo_root: str | None = None,
    limit: int | None = None,
    filter_pattern: str | None = None,
    node_mode: str = "all",
    compact: bool = True,
) -> dict[str, Any]:
    """Run a predefined graph query.

    Args:
        pattern: Query pattern. One of: callers_of, callees_of, imports_of,
                 importers_of, children_of, tests_for, inheritors_of, file_summary.
                 Aliases: references_of→importers_of, uses_of→callers_of.
        target: The node name, qualified name, or file path to query about.
        limit: Maximum number of results to return.
        filter_pattern: Regex pattern to filter results by file path.
        repo_root: Repository root path. Auto-detected if omitted.
        node_mode: Filter output nodes: "file", "function", "class", or "all".

    Returns:
        Matching nodes and edges for the query.
    """
    import re as _re

    # Resolve aliases
    original_pattern = pattern
    pattern = _QUERY_ALIASES.get(pattern, pattern)

    store, root = _get_store(repo_root)
    try:
        if pattern not in _QUERY_PATTERNS:
            available = list(_QUERY_PATTERNS.keys()) + list(_QUERY_ALIASES.keys())
            return {
                "status": "error",
                "error": f"Unknown pattern '{original_pattern}'. Available: {available}",
            }

        results: list[dict] = []
        edges_out: list[dict] = []

        # For callers_of, skip common builtins early (bare names only)
        # "Who calls .map()?" returns hundreds of useless hits.
        # Qualified names (e.g. "utils.py::map") bypass this filter.
        if pattern == "callers_of" and target in _BUILTIN_CALL_NAMES and "::" not in target:
            return {
                "status": "ok", "pattern": pattern, "target": target,
                "description": _QUERY_PATTERNS[pattern],
                "summary": f"'{target}' is a common builtin — callers_of skipped to avoid noise.",
                "results": [], "edges": [],
            }

        # Resolve target
        node, err = _resolve_target_node(store, root, target)
        if err:
            return err
        if node:
            target = node.qualified_name

        if not node and pattern != "file_summary":
            return {
                "status": "not_found",
                "summary": f"No node found matching '{target}'.",
            }

        qn = node.qualified_name if node else target
        root_str = str(root)
        _n2d = (lambda n: node_to_compact_dict(n, root_str, node_mode)) if compact else node_to_dict
        _e2d = (lambda e: edge_to_compact_dict(e, root_str)) if compact else edge_to_dict

        if pattern == "callers_of":
            for e in store.get_edges_by_target(qn):
                if e.kind == "CALLS":
                    caller = store.get_node(e.source_qualified)
                    if caller:
                        results.append(_n2d(caller))
                    edges_out.append(_e2d(e))
            # Fallback: CALLS edges store unqualified target names
            # (e.g. "generateTestCode") while qn is fully qualified
            # (e.g. "file.ts::generateTestCode"). Search by plain name too.
            if not results and node:
                for e in store.search_edges_by_target_name(node.name):
                    caller = store.get_node(e.source_qualified)
                    if caller:
                        results.append(_n2d(caller))
                    edges_out.append(_e2d(e))

        elif pattern == "callees_of":
            for e in store.get_edges_by_source(qn):
                if e.kind == "CALLS":
                    callee = store.get_node(e.target_qualified)
                    if callee:
                        results.append(_n2d(callee))
                    edges_out.append(_e2d(e))

        elif pattern == "imports_of":
            for e in store.get_edges_by_source(qn):
                if e.kind == "IMPORTS_FROM":
                    t = _to_relative(e.target_qualified, root_str) if compact else e.target_qualified
                    results.append({"import_target": t})
                    edges_out.append(_e2d(e))

        elif pattern == "importers_of":
            # Find edges where target matches this file
            abs_target = str(root / target) if node is None else node.file_path
            for e in store.get_edges_by_target(abs_target):
                if e.kind == "IMPORTS_FROM":
                    imp = _to_relative(e.source_qualified, root_str) if compact else e.source_qualified
                    f = _to_relative(e.file_path, root_str) if compact else e.file_path
                    results.append({"importer": imp, "file": f})
                    edges_out.append(_e2d(e))

        elif pattern == "children_of":
            for e in store.get_edges_by_source(qn):
                if e.kind == "CONTAINS":
                    child = store.get_node(e.target_qualified)
                    if child:
                        results.append(_n2d(child))

        elif pattern == "tests_for":
            results = _find_tests_for(store, node, node.name if node else target)

        elif pattern == "inheritors_of":
            for e in store.get_edges_by_target(qn):
                if e.kind in ("INHERITS", "IMPLEMENTS"):
                    child = store.get_node(e.source_qualified)
                    if child:
                        results.append(_n2d(child))
                    edges_out.append(_e2d(e))

        elif pattern == "file_summary":
            abs_path = str(root / target)
            file_nodes = store.get_nodes_by_file(abs_path)
            for n in file_nodes:
                results.append(_n2d(n))

        # Apply filter (regex on file path)
        if filter_pattern:
            filter_re = _re.compile(filter_pattern, _re.IGNORECASE)
            results = [r for r in results if filter_re.search(
                r.get("file_path", "") or r.get("file", "") or r.get("importer", "") or ""
            )]

        # Apply node-mode filter (only for results that have "kind" field)
        allowed_kinds = _NODE_MODE_KINDS.get(node_mode)
        if allowed_kinds is not None:
            results = [r for r in results if r.get("kind") in allowed_kinds]

        # Apply limit
        total_before_limit = len(results)
        if limit and limit > 0:
            results = results[:limit]

        alias_note = f" (alias for {pattern})" if original_pattern != pattern else ""
        mode_note = f" [node-mode={node_mode}]" if node_mode != "all" else ""
        summary = (
            f"Found {len(results)} result(s) for {pattern}('{target}'){mode_note}"
            + (f" (filtered from {total_before_limit})" if filter_pattern else "")
            + (f" (limited to {limit})" if limit and total_before_limit > limit else "")
        )

        if compact:
            return {
                "status": "ok",
                "pattern": pattern,
                "target": target,
                "summary": summary,
                "results": results,
                "edges": edges_out,
            }

        return {
            "status": "ok",
            "pattern": pattern,
            "target": target,
            "node_mode": node_mode,
            "description": _QUERY_PATTERNS[pattern] + alias_note,
            "summary": summary,
            "results": results,
            "edges": edges_out,
        }
    finally:
        store.close()


# ---------------------------------------------------------------------------
# Tool 3b: get_connections (composite query)
# ---------------------------------------------------------------------------


def get_connections(
    target: str,
    repo_root: str | None = None,
    limit: int | None = None,
    node_mode: str = "all",
    compact: bool = True,
) -> dict[str, Any]:
    """Show all graph connections for a file or node in one call.

    Runs file_summary + imports_of + importers_of + callers_of + tests_for
    and returns combined results grouped by relationship type.

    Args:
        target: File path (relative) or node name / qualified name.
        repo_root: Repository root path. Auto-detected if omitted.
        limit: Maximum results per section.
        node_mode: Filter output nodes: "file", "function", "class", or "all".

    Returns:
        Combined results from all connection patterns.
    """
    store, root = _get_store(repo_root)
    try:
        # Resolve target node
        node, err = _resolve_target_node(store, root, target)
        if err:
            return err
        if not node:
            return {
                "status": "not_found",
                "summary": f"No node found matching '{target}'.",
            }

        qn = node.qualified_name
        root_str = str(root)
        cap = limit if limit and limit > 0 else _CONNECTIONS_CAP_PER_PATTERN
        _n2d = (lambda n: node_to_compact_dict(n, root_str, node_mode)) if compact else node_to_dict
        sections: dict[str, list[dict]] = {}

        # file_summary
        file_nodes = store.get_nodes_by_file(node.file_path)
        sections["file_summary"] = [_n2d(n) for n in file_nodes][:cap]

        # imports_of
        imports = []
        for e in store.get_edges_by_source(qn):
            if e.kind == "IMPORTS_FROM":
                t = _to_relative(e.target_qualified, root_str) if compact else e.target_qualified
                imports.append({"import_target": t, "line": e.line})
        sections["imports_of"] = imports[:cap]

        # importers_of
        importers = []
        for e in store.get_edges_by_target(node.file_path):
            if e.kind == "IMPORTS_FROM":
                imp = _to_relative(e.source_qualified, root_str) if compact else e.source_qualified
                f = _to_relative(e.file_path, root_str) if compact else e.file_path
                importers.append({"importer": imp, "file": f, "line": e.line})
        # Also check by qualified name
        if qn != node.file_path:
            for e in store.get_edges_by_target(qn):
                if e.kind == "IMPORTS_FROM":
                    imp = _to_relative(e.source_qualified, root_str) if compact else e.source_qualified
                    f = _to_relative(e.file_path, root_str) if compact else e.file_path
                    importers.append({"importer": imp, "file": f, "line": e.line})
        sections["importers_of"] = importers[:cap]

        # callers_of (for non-File nodes)
        callers = []
        if node.kind != "File":
            for e in store.get_edges_by_target(qn):
                if e.kind == "CALLS":
                    caller = store.get_node(e.source_qualified)
                    if caller:
                        callers.append(_n2d(caller))
            # Fallback: search by plain name
            if not callers:
                for e in store.search_edges_by_target_name(node.name):
                    caller = store.get_node(e.source_qualified)
                    if caller:
                        callers.append(_n2d(caller))
        sections["callers_of"] = callers[:cap]

        # tests_for
        sections["tests_for"] = _find_tests_for(store, node, node.name)[:cap]

        # Apply node-mode filter to sections that contain node dicts
        allowed_kinds = _NODE_MODE_KINDS.get(node_mode)
        if allowed_kinds is not None:
            for key in ("file_summary", "callers_of", "tests_for"):
                if key in sections:
                    sections[key] = [
                        n for n in sections[key] if n.get("kind") in allowed_kinds
                    ]

        # Build summary
        counts = {k: len(v) for k, v in sections.items()}
        total = sum(counts.values())
        mode_note = f" [node-mode={node_mode}]" if node_mode != "all" else ""
        summary_parts = [
            f"Connections for '{target}'{mode_note} ({total} total):",
        ]
        for pattern, count in counts.items():
            if count > 0:
                summary_parts.append(f"  {pattern}: {count}")

        summary = "\n".join(summary_parts)
        if compact:
            return {
                "status": "ok",
                "target": target,
                "summary": summary,
                "connections": sections,
            }

        return {
            "status": "ok",
            "target": target,
            "resolved_node": node_to_dict(node),
            "node_mode": node_mode,
            "summary": summary,
            "connections": sections,
        }
    finally:
        store.close()


# ---------------------------------------------------------------------------
# Tool 4: get_review_context
# ---------------------------------------------------------------------------


def get_review_context(
    changed_files: list[str] | None = None,
    max_depth: int = 2,
    include_source: bool = True,
    max_lines_per_file: int = 200,
    repo_root: str | None = None,
    base: str = "HEAD~1",
) -> dict[str, Any]:
    """Generate a focused review context from changed files.

    Builds a token-optimized subgraph + source snippets for code review.

    Args:
        changed_files: Files to review (auto-detected from git diff if omitted).
        max_depth: Impact radius depth (default: 2).
        include_source: Whether to include source code snippets (default: True).
        max_lines_per_file: Max source lines per file in output (default: 200).
        repo_root: Repository root path. Auto-detected if omitted.
        base: Git ref for change detection (default: HEAD~1).

    Returns:
        Structured review context with subgraph, source snippets, and review guidance.
    """
    store, root = _get_store(repo_root)
    try:
        # Get impact radius first
        if changed_files is None:
            changed_files = get_changed_files(root, base)
            if not changed_files:
                changed_files = get_staged_and_unstaged(root)

        if not changed_files:
            return {
                "status": "ok",
                "summary": "No changes detected. Nothing to review.",
                "context": {},
            }

        abs_files = [str(root / f) for f in changed_files]
        impact = store.get_impact_radius(abs_files, max_depth=max_depth)

        # Build review context
        context: dict[str, Any] = {
            "changed_files": changed_files,
            "impacted_files": impact["impacted_files"],
            "graph": {
                "changed_nodes": [node_to_dict(n) for n in impact["changed_nodes"]],
                "impacted_nodes": [node_to_dict(n) for n in impact["impacted_nodes"]],
                "edges": [edge_to_dict(e) for e in impact["edges"]],
            },
        }

        # Add source snippets for changed files
        if include_source:
            snippets = {}
            for rel_path in changed_files:
                full_path = root / rel_path
                if full_path.is_file():
                    try:
                        lines = full_path.read_text(errors="replace").splitlines()
                        if len(lines) > max_lines_per_file:
                            # Include only the relevant functions/classes
                            relevant_lines = _extract_relevant_lines(
                                lines, impact["changed_nodes"], str(full_path)
                            )
                            snippets[rel_path] = relevant_lines
                        else:
                            snippets[rel_path] = "\n".join(
                                f"{i+1}: {line}" for i, line in enumerate(lines)
                            )
                    except (OSError, UnicodeDecodeError):
                        snippets[rel_path] = "(could not read file)"
            context["source_snippets"] = snippets

        # Generate review guidance
        guidance = _generate_review_guidance(impact, changed_files)
        context["review_guidance"] = guidance

        summary_parts = [
            f"Review context for {len(changed_files)} changed file(s):",
            f"  - {len(impact['changed_nodes'])} directly changed nodes",
            f"  - {len(impact['impacted_nodes'])} impacted nodes"
            f" in {len(impact['impacted_files'])} files",
            "",
            "Review guidance:",
            guidance,
        ]

        return {
            "status": "ok",
            "summary": "\n".join(summary_parts),
            "context": context,
        }
    finally:
        store.close()


def _extract_relevant_lines(
    lines: list[str], nodes: list, file_path: str
) -> str:
    """Extract only the lines relevant to changed nodes."""
    ranges = []
    for n in nodes:
        if n.file_path == file_path:
            start = max(0, n.line_start - 3)  # 2 lines context before
            end = min(len(lines), n.line_end + 2)  # 1 line context after
            ranges.append((start, end))

    if not ranges:
        # Show first N lines as fallback
        return "\n".join(f"{i+1}: {line}" for i, line in enumerate(lines[:50]))

    # Merge overlapping ranges
    ranges.sort()
    merged = [ranges[0]]
    for start, end in ranges[1:]:
        if start <= merged[-1][1] + 1:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))

    parts: list[str] = []
    for start, end in merged:
        if parts:
            parts.append("...")
        for i in range(start, end):
            parts.append(f"{i+1}: {lines[i]}")

    return "\n".join(parts)


def _generate_review_guidance(impact: dict, changed_files: list[str]) -> str:
    """Generate review guidance based on the impact analysis."""
    guidance_parts = []

    # Check for test coverage
    changed_funcs = [
        n for n in impact["changed_nodes"] if n.kind == "Function"
    ]
    test_edges = [e for e in impact["edges"] if e.kind == "TESTED_BY"]
    tested_funcs = {e.source_qualified for e in test_edges}

    untested = [
        f for f in changed_funcs
        if f.qualified_name not in tested_funcs and not f.is_test
    ]
    if untested:
        guidance_parts.append(
            f"- {len(untested)} changed function(s) lack test coverage: "
            + ", ".join(n.name for n in untested[:5])
        )

    # Check for wide blast radius
    if len(impact["impacted_nodes"]) > 20:
        guidance_parts.append(
            f"- Wide blast radius: {len(impact['impacted_nodes'])} nodes impacted. "
            "Review callers and dependents carefully."
        )

    # Check for inheritance changes
    inheritance_edges = [e for e in impact["edges"] if e.kind in ("INHERITS", "IMPLEMENTS")]
    if inheritance_edges:
        guidance_parts.append(
            f"- {len(inheritance_edges)} inheritance/implementation relationship(s) affected. "
            "Check for Liskov substitution violations."
        )

    # Check for cross-file impact
    impacted_file_count = len(impact["impacted_files"])
    if impacted_file_count > 3:
        guidance_parts.append(
            f"- Changes impact {impacted_file_count} other files."
            " Consider splitting into smaller PRs."
        )

    if not guidance_parts:
        guidance_parts.append("- Changes appear well-contained with minimal blast radius.")

    return "\n".join(guidance_parts)


# ---------------------------------------------------------------------------
# Tool 5: semantic_search_nodes
# ---------------------------------------------------------------------------


def search_nodes(
    query: str,
    kind: str | None = None,
    limit: int = 20,
    repo_root: str | None = None,
) -> dict[str, Any]:
    """Search for nodes by name or keyword.

    Args:
        query: Search string to match against node names and qualified names.
        kind: Optional filter by node kind (File, Class, Function, Type, Test).
        limit: Maximum results to return (default: 20).
        repo_root: Repository root path. Auto-detected if omitted.

    Returns:
        Ranked list of matching nodes.
    """
    store, root = _get_store(repo_root)
    try:
        results = store.search_nodes(query, limit=limit * 2)

        if kind:
            results = [r for r in results if r.kind == kind]

        def score(node):
            name_lower = node.name.lower()
            q_lower = query.lower()
            if name_lower == q_lower:
                return 0
            if name_lower.startswith(q_lower):
                return 1
            return 2

        results.sort(key=score)
        results = results[:limit]

        return {
            "status": "ok",
            "query": query,
            "search_mode": "keyword",
            "summary": f"Found {len(results)} node(s) matching '{query}'" + (
                f" (kind={kind})" if kind else ""
            ),
            "results": [node_to_dict(r) for r in results],
        }
    finally:
        store.close()


# ---------------------------------------------------------------------------
# Tool 6: list_graph_stats
# ---------------------------------------------------------------------------


def list_graph_stats(repo_root: str | None = None) -> dict[str, Any]:
    """Get aggregate statistics about the knowledge graph.

    Args:
        repo_root: Repository root path. Auto-detected if omitted.

    Returns:
        Total nodes, edges, breakdown by kind, languages, and last update time.
    """
    store, root = _get_store(repo_root)
    try:
        stats = store.get_stats()

        summary_parts = [
            f"Graph statistics for {root.name}:",
            f"  Files: {stats.files_count}",
            f"  Total nodes: {stats.total_nodes}",
            f"  Total edges: {stats.total_edges}",
            f"  Languages: {', '.join(stats.languages) if stats.languages else 'none'}",
            f"  Last updated: {stats.last_updated or 'never'}",
            "",
            "Nodes by kind:",
        ]
        for kind, count in sorted(stats.nodes_by_kind.items()):
            summary_parts.append(f"  {kind}: {count}")
        summary_parts.append("")
        summary_parts.append("Edges by kind:")
        for kind, count in sorted(stats.edges_by_kind.items()):
            summary_parts.append(f"  {kind}: {count}")

        return {
            "status": "ok",
            "summary": "\n".join(summary_parts),
            "total_nodes": stats.total_nodes,
            "total_edges": stats.total_edges,
            "nodes_by_kind": stats.nodes_by_kind,
            "edges_by_kind": stats.edges_by_kind,
            "languages": stats.languages,
            "files_count": stats.files_count,
            "last_updated": stats.last_updated,
        }
    finally:
        store.close()


# ---------------------------------------------------------------------------
# Tool 7: find_large_functions
# ---------------------------------------------------------------------------


def find_large_functions(
    min_lines: int = 50,
    kind: str | None = None,
    file_path_pattern: str | None = None,
    limit: int = 50,
    repo_root: str | None = None,
) -> dict[str, Any]:
    """Find functions, classes, or files exceeding a line-count threshold.

    Useful for identifying decomposition targets, code-quality audits,
    and enforcing size limits during code review.

    Args:
        min_lines: Minimum line count to flag (default: 50).
        kind: Filter by node kind: Function, Class, File, or Test.
        file_path_pattern: Filter by file path substring (e.g. "components/").
        limit: Maximum results (default: 50).
        repo_root: Repository root path. Auto-detected if omitted.

    Returns:
        Oversized nodes with line counts, ordered largest first.
    """
    store, root = _get_store(repo_root)
    try:
        nodes = store.get_nodes_by_size(
            min_lines=min_lines,
            kind=kind,
            file_path_pattern=file_path_pattern,
            limit=limit,
        )

        results = []
        for n in nodes:
            d = node_to_dict(n)
            d["line_count"] = (n.line_end - n.line_start + 1) if n.line_start and n.line_end else 0
            # Make file_path relative for readability
            try:
                d["relative_path"] = str(Path(n.file_path).relative_to(root))
            except ValueError:
                d["relative_path"] = n.file_path
            results.append(d)

        summary_parts = [
            f"Found {len(results)} node(s) with >= {min_lines} lines"
            + (f" (kind={kind})" if kind else "")
            + (f" matching '{file_path_pattern}'" if file_path_pattern else "")
            + ":",
        ]
        for r in results[:10]:
            summary_parts.append(
                f"  {r['line_count']:>4} lines | {r['kind']:>8} | "
                f"{r['name']} ({r['relative_path']}:{r['line_start']})"
            )
        if len(results) > 10:
            summary_parts.append(f"  ... and {len(results) - 10} more")

        return {
            "status": "ok",
            "summary": "\n".join(summary_parts),
            "total_found": len(results),
            "min_lines": min_lines,
            "results": results,
        }
    finally:
        store.close()


# ---------------------------------------------------------------------------
# Node-mode filtering (shared by trace, connections, query)
# ---------------------------------------------------------------------------

# Maps --node-mode values to the set of node kinds to include in results.
# None means "all" (no filtering). BFS traversal is always unfiltered —
# only the OUTPUT is shaped by node-mode.
_NODE_MODE_KINDS: dict[str, set[str] | None] = {
    "file": {"File"},
    "function": {"Function", "Test"},
    "class": {"Class"},
    "all": None,
}


def _qn_to_file(qn: str) -> str:
    """Extract file path from a qualified name (e.g., 'file.cs::Class.Method' → 'file.cs')."""
    return qn.split("::")[0] if "::" in qn else qn


def _filter_by_node_mode(levels: list[dict], node_mode: str) -> list[dict]:
    """Post-filter BFS results to only include nodes matching the requested mode.

    For 'file' mode: collapses all nodes to their parent file, deduplicates,
    and aggregates edge types between file pairs.
    For 'function'/'class' mode: simple kind filter on result nodes.
    """
    allowed = _NODE_MODE_KINDS.get(node_mode)
    if allowed is None:
        return levels

    filtered_levels: list[dict] = []
    for lv in levels:
        if node_mode == "file":
            # Collapse to unique file paths (handle both standard and compact node formats)
            seen_files: set[str] = set()
            file_nodes: list[dict] = []
            for n in lv["nodes"]:
                fp = n.get("file_path", "") or n.get("path", "")
                if fp and fp not in seen_files:
                    seen_files.add(fp)
                    name = fp.replace("\\", "/").rsplit("/", 1)[-1]
                    # Preserve compact format if input uses "path" key
                    if "path" in n and "file_path" not in n:
                        file_nodes.append({"name": name, "path": fp})
                    else:
                        file_nodes.append({
                            "kind": "File", "name": name,
                            "file_path": fp, "qualified_name": fp,
                        })
            nodes = file_nodes

            # Aggregate edges between file pairs (dedup by file_pair + kind)
            # Handle both standard (source/target) and compact (from/to) edge formats
            edge_agg: dict[tuple[str, str], set[str]] = {}
            for e in lv["edges"]:
                src_raw = e.get("source", "") or e.get("from", "")
                tgt_raw = e.get("target", "") or e.get("to", "")
                src_file = _qn_to_file(src_raw) if "::" in src_raw or "/" in src_raw or "\\" in src_raw else src_raw
                tgt_file = _qn_to_file(tgt_raw) if "::" in tgt_raw or "/" in tgt_raw or "\\" in tgt_raw else tgt_raw
                if src_file and tgt_file and src_file != tgt_file:
                    pair = (src_file, tgt_file)
                    edge_agg.setdefault(pair, set()).add(e.get("kind", "UNKNOWN"))
            # Preserve compact format if input uses "from/to" keys
            is_compact_edges = any("from" in e for e in lv["edges"]) if lv["edges"] else False
            if is_compact_edges:
                edges = [
                    {"kind": ",".join(sorted(kinds)), "from": src, "to": tgt}
                    for (src, tgt), kinds in edge_agg.items()
                ]
            else:
                edges = [
                    {"kind": ",".join(sorted(kinds)), "source": src, "target": tgt,
                     "file_path": src, "line": 0}
                    for (src, tgt), kinds in edge_agg.items()
                ]
        else:
            nodes = [n for n in lv["nodes"] if n.get("kind") in allowed]
            visible_qns = {n.get("qualified_name") for n in nodes}
            edges = [e for e in lv["edges"]
                     if e.get("source") in visible_qns or e.get("target") in visible_qns]

        if nodes:
            filtered_levels.append({"depth": lv["depth"], "nodes": nodes, "edges": edges})

    return filtered_levels


# ---------------------------------------------------------------------------
# Tool 8: trace (BFS through edges for full system flow)
# ---------------------------------------------------------------------------

# Default edge kinds to follow during trace.
# Includes call chains + all implicit connector types:
# - CALLS: function-to-function call chains
# - INHERITS: class inheritance chains
# - MESSAGE_BUS: cross-service bus message producer→consumer
# - TRIGGERS_EVENT: entity event → handler
# - PRODUCES_EVENT: event producer
# - TRIGGERS_COMMAND_EVENT: command → event chain
# - API_ENDPOINT: frontend HTTP call → backend route
# Excluded from default (add via --edge-kinds when needed):
# - IMPORTS_FROM (64K edges, depth 2+ causes massive fan-out)
# - CONTAINS (94K edges, structural only)
# - TESTED_BY (test links, use query tests_for instead)
_TRACE_DEFAULT_EDGE_KINDS = frozenset({
    "CALLS", "INHERITS",
    "TRIGGERS_EVENT", "PRODUCES_EVENT",
    "MESSAGE_BUS", "TRIGGERS_COMMAND_EVENT", "API_ENDPOINT",
})


def trace_connections(
    target: str,
    repo_root: str | None = None,
    depth: int = 3,
    direction: str = "downstream",
    edge_kinds: list[str] | None = None,
    node_mode: str = "all",
    compact: bool = True,
) -> dict[str, Any]:
    """Trace connections from a target node through multiple edge types.

    Performs BFS from the target node, following edges of specified kinds
    up to a configurable depth. Supports downstream (outgoing), upstream
    (incoming), or both directions.

    Args:
        target: File path (relative) or node name / qualified name.
        repo_root: Repository root path. Auto-detected if omitted.
        depth: Maximum BFS depth (default 3).
        direction: "downstream" (source->target), "upstream" (target->source),
                   or "both" (both directions). Default: "downstream".
        edge_kinds: List of edge kinds to follow. Default: all structural
                    + implicit edge kinds.
        node_mode: Filter output nodes: "file" (file-level only), "function",
                   "class", or "all" (default, no filter).

    Returns:
        Multi-level tree of connected nodes grouped by BFS depth.
    """
    store, root = _get_store(repo_root)
    try:
        node, err = _resolve_target_node(store, root, target)
        if err:
            return err
        if not node:
            return {
                "status": "not_found",
                "summary": f"No node found matching '{target}'.",
            }

        allowed_kinds = set(edge_kinds) if edge_kinds else _TRACE_DEFAULT_EDGE_KINDS
        visited: set[str] = set()
        levels: list[dict[str, Any]] = []

        # Seed with all nodes in the target file (if target is a file)
        if node.kind == "File":
            file_nodes = store.get_nodes_by_file(node.file_path)
            current_qns = {n.qualified_name for n in file_nodes}
        else:
            current_qns = {node.qualified_name}

        # Select dict converters based on compact flag
        root_str = str(root)
        _n2d = (lambda n: node_to_compact_dict(n, root_str, node_mode)) if compact else node_to_dict
        _e2d = (lambda e: edge_to_compact_dict(e, root_str)) if compact else edge_to_dict

        # Level 0: the starting node(s)
        level0_nodes = []
        for qn in current_qns:
            n = store.get_node(qn)
            if n:
                level0_nodes.append(_n2d(n))
        levels.append({"depth": 0, "nodes": level0_nodes, "edges": []})
        visited.update(current_qns)

        # BFS levels 1..depth
        for d in range(1, depth + 1):
            next_qns: set[str] = set()
            level_edges: list[dict] = []

            for qn in current_qns:
                edges: list = []

                if direction in ("downstream", "both"):
                    edges.extend(store.get_edges_by_source(qn))
                if direction in ("upstream", "both"):
                    edges.extend(store.get_edges_by_target(qn))

                # Also check edges by file_path — connector edges (API_ENDPOINT,
                # MESSAGE_BUS) store raw file paths as source/target, not qualified names.
                # This bridges the gap between structural (CALLS) and connector edges.
                n = store.get_node(qn)
                if n and n.file_path and n.file_path != qn:
                    if direction in ("downstream", "both"):
                        edges.extend(store.get_edges_by_source(n.file_path))
                    if direction in ("upstream", "both"):
                        edges.extend(store.get_edges_by_target(n.file_path))

                for e in edges:
                    if e.kind not in allowed_kinds:
                        continue

                    # Determine the "other" node (the one we haven't visited)
                    other_qn = (
                        e.target_qualified
                        if e.source_qualified == qn
                        else e.source_qualified
                    )

                    if other_qn not in visited:
                        # For connector edges, other_qn may be a raw file path.
                        # Try to resolve it to the File node's qualified_name.
                        resolved = other_qn
                        if not store.get_node(other_qn):
                            file_nodes = store.get_nodes_by_file(other_qn)
                            if file_nodes:
                                resolved = file_nodes[0].qualified_name
                        if resolved not in visited:
                            next_qns.add(resolved)
                            level_edges.append(_e2d(e))

            if not next_qns:
                break

            # Resolve next level nodes
            level_nodes = []
            for nqn in next_qns:
                n = store.get_node(nqn)
                if n:
                    level_nodes.append(_n2d(n))

            visited.update(next_qns)
            levels.append({
                "depth": d,
                "nodes": level_nodes,
                "edges": level_edges,
            })
            current_qns = next_qns

        # Apply node-mode post-filter (BFS traversal was unfiltered)
        levels = _filter_by_node_mode(levels, node_mode)

        # Summary
        total_nodes = sum(len(lv["nodes"]) for lv in levels)
        total_edges = sum(len(lv["edges"]) for lv in levels)
        edge_kind_counts: dict[str, int] = {}
        for lv in levels:
            for e in lv["edges"]:
                for k in e.get("kind", "UNKNOWN").split(","):
                    edge_kind_counts[k] = edge_kind_counts.get(k, 0) + 1

        mode_note = f" [node-mode={node_mode}]" if node_mode != "all" else ""
        summary = (
            f"Traced {direction} from '{target}'{mode_note}: "
            f"{total_nodes} nodes, {total_edges} edges across {len(levels)} levels. "
            f"Edge types: {edge_kind_counts}"
        )

        if compact:
            return {
                "status": "ok",
                "summary": summary,
                "levels": levels,
            }

        return {
            "status": "ok",
            "target": target,
            "resolved_node": node_to_dict(node),
            "direction": direction,
            "max_depth": depth,
            "node_mode": node_mode,
            "edge_kinds_filter": sorted(allowed_kinds),
            "summary": summary,
            "levels": levels,
        }
    finally:
        store.close()
