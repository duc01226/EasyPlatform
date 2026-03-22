"""CLI for code-graph (easy-claude integration).

Adapted from code-graph v1.8.4 (MIT License).
Source: https://github.com/tirth8205/code-graph

Usage:
    python .claude/scripts/code-graph build [--json]
    python .claude/scripts/code-graph update [--base BASE] [--json]
    python .claude/scripts/code-graph status [--json]
    python .claude/scripts/code-graph blast-radius [--base BASE] [--json]
    python .claude/scripts/code-graph query <pattern> <target> [--json]
    python .claude/scripts/code-graph connections <target> [--json]
    python .claude/scripts/code-graph review-context [--base BASE] [--json]
    python .claude/scripts/code-graph export-mermaid <file> [--json]
    python .claude/scripts/code-graph connect-implicit [--json]
"""

from __future__ import annotations

import sys

if sys.version_info < (3, 10):
    print("code-graph requires Python 3.10 or higher.")
    print(f"  You are running Python {sys.version}")
    sys.exit(1)

import argparse
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def main() -> None:
    ap = argparse.ArgumentParser(
        prog="code-graph",
        description="Structural code knowledge graph for easy-claude",
    )
    sub = ap.add_subparsers(dest="command")

    # build
    build_cmd = sub.add_parser("build", help="Full graph build")
    build_cmd.add_argument("--repo", default=None)
    build_cmd.add_argument("--json", action="store_true", dest="json_output")

    # update
    update_cmd = sub.add_parser("update", help="Incremental update")
    update_cmd.add_argument("--base", default="HEAD~1")
    update_cmd.add_argument("--repo", default=None)
    update_cmd.add_argument("--json", action="store_true", dest="json_output")

    # status
    status_cmd = sub.add_parser("status", help="Graph statistics")
    status_cmd.add_argument("--repo", default=None)
    status_cmd.add_argument("--json", action="store_true", dest="json_output")

    # graph-blast-radius (also accepts blast-radius for backward compat)
    br_cmd = sub.add_parser("graph-blast-radius", aliases=["blast-radius"], help="Impact analysis of changes")
    br_cmd.add_argument("--base", default="HEAD~1")
    br_cmd.add_argument("--no-compact", action="store_true", dest="no_compact", help="Disable compact mode (use verbose output)")
    br_cmd.add_argument("--compact", action="store_true", default=True, help="(default) Compact output: relative paths, minimal metadata")
    br_cmd.add_argument("--repo", default=None)
    br_cmd.add_argument("--json", action="store_true", dest="json_output")

    # query
    query_cmd = sub.add_parser("query", help="Graph query (supports aliases: references_of, uses_of)")
    query_cmd.add_argument("pattern", help="callers_of|callees_of|imports_of|importers_of|references_of|uses_of|etc")
    query_cmd.add_argument("target", help="Node name or file path")
    query_cmd.add_argument("--limit", type=int, default=None, help="Max results to return")
    query_cmd.add_argument("--filter", default=None, dest="filter_pattern", help="Regex to filter results by file path")
    query_cmd.add_argument("--node-mode", choices=["file", "function", "class", "all"],
                           default="all", help="Filter result nodes: file, function, class, all (default)")
    query_cmd.add_argument("--no-compact", action="store_true", dest="no_compact", help="Disable compact mode (use verbose output)")
    query_cmd.add_argument("--compact", action="store_true", default=True, help="(default) Compact output: relative paths, minimal metadata")
    query_cmd.add_argument("--repo", default=None)
    query_cmd.add_argument("--json", action="store_true", dest="json_output")

    # review-context
    rc_cmd = sub.add_parser("review-context", help="Token-optimized review context")
    rc_cmd.add_argument("--base", default="HEAD~1")
    rc_cmd.add_argument("--repo", default=None)
    rc_cmd.add_argument("--json", action="store_true", dest="json_output")

    # export
    export_cmd = sub.add_parser("export", help="Export graph to JSON file")
    export_cmd.add_argument("--output", "-o", default=".code-graph/graph-export.json", help="Output file path")
    export_cmd.add_argument("--files", nargs="*", default=None, help="Export only specific files (relative paths)")
    export_cmd.add_argument("--repo", default=None)
    export_cmd.add_argument("--json", action="store_true", dest="json_output")

    # sync (git-aware)
    sync_cmd = sub.add_parser("sync", help="Sync graph with git state (diff last_synced_commit vs HEAD)")
    sync_cmd.add_argument("--repo", default=None)
    sync_cmd.add_argument("--json", action="store_true", dest="json_output")

    # batch-query (multi-file)
    bq_cmd = sub.add_parser("batch-query", help="Query graph for multiple files at once (deduplicated)")
    bq_cmd.add_argument("files", nargs="+", help="File paths (relative to repo root)")
    bq_cmd.add_argument("--no-compact", action="store_true", dest="no_compact", help="Disable compact mode (use verbose output)")
    bq_cmd.add_argument("--compact", action="store_true", default=True, help="(default) Compact output: relative paths, minimal metadata")
    bq_cmd.add_argument("--repo", default=None)
    bq_cmd.add_argument("--json", action="store_true", dest="json_output")

    # graph-connect-api (also accepts connect-api for backward compat)
    ca_cmd = sub.add_parser("graph-connect-api", aliases=["connect-api"], help="Detect frontend-backend API connections")
    ca_cmd.add_argument("--repo", default=None)
    ca_cmd.add_argument("--json", action="store_true", dest="json_output")

    # graph-connect-implicit (also accepts connect-implicit for backward compat)
    ci_cmd = sub.add_parser("graph-connect-implicit", aliases=["connect-implicit"], help="Detect implicit connections (events, message bus)")
    ci_cmd.add_argument("--repo", default=None)
    ci_cmd.add_argument("--json", action="store_true", dest="json_output")

    # search (keyword search across nodes)
    search_cmd = sub.add_parser("search", help="Search nodes by keyword")
    search_cmd.add_argument("query", help="Search keyword(s)")
    search_cmd.add_argument("--kind", default=None, help="Filter by kind: Function|Class|File|Type|Test")
    search_cmd.add_argument("--limit", type=int, default=20, help="Max results (default: 20)")
    search_cmd.add_argument("--repo", default=None)
    search_cmd.add_argument("--json", action="store_true", dest="json_output")

    # find-path (shortest path between two nodes)
    fp_cmd = sub.add_parser("find-path", help="Find shortest path between two nodes")
    fp_cmd.add_argument("source", help="Source node name or qualified name")
    fp_cmd.add_argument("target", help="Target node name or qualified name")
    fp_cmd.add_argument("--repo", default=None)
    fp_cmd.add_argument("--json", action="store_true", dest="json_output")

    # connections (composite query)
    conn_cmd = sub.add_parser("connections", help="All connections for a file or node")
    conn_cmd.add_argument("target", help="File path or node name")
    conn_cmd.add_argument("--limit", type=int, default=None, help="Max results per section")
    conn_cmd.add_argument("--node-mode", choices=["file", "function", "class", "all"],
                          default="all", help="Filter result nodes: file (overview), function, class, all (default)")
    conn_cmd.add_argument("--no-compact", action="store_true", dest="no_compact", help="Disable compact mode (use verbose output)")
    conn_cmd.add_argument("--compact", action="store_true", default=True, help="(default) Compact output: relative paths, minimal metadata")
    conn_cmd.add_argument("--repo", default=None)
    conn_cmd.add_argument("--json", action="store_true", dest="json_output")

    # trace (BFS through edges for full system flow)
    tr_cmd = sub.add_parser("trace", help="Trace connections through multiple edge types (BFS)")
    tr_cmd.add_argument("target", help="File path or node name to trace from")
    tr_cmd.add_argument("--depth", type=int, default=3, help="Max BFS depth (default: 3)")
    tr_cmd.add_argument("--direction", choices=["downstream", "upstream", "both"],
                        default="downstream", help="Trace direction (default: downstream)")
    tr_cmd.add_argument("--edge-kinds", default=None,
                        help="Comma-separated edge kinds to follow (default: all)")
    tr_cmd.add_argument("--node-mode", choices=["file", "function", "class", "all"],
                        default="all", help="Filter result nodes: file (overview), function, class, all (default)")
    tr_cmd.add_argument("--no-compact", action="store_true", dest="no_compact", help="Disable compact mode (use verbose output)")
    tr_cmd.add_argument("--compact", action="store_true", default=True, help="(default) Compact output: relative paths, minimal metadata")
    tr_cmd.add_argument("--repo", default=None)
    tr_cmd.add_argument("--json", action="store_true", dest="json_output")

    # export-mermaid (accepts positional or --file for consistency)
    em_cmd = sub.add_parser("export-mermaid", help="Export file graph as Mermaid diagram")
    em_cmd.add_argument("file_positional", nargs="?", default=None, help="Relative path to the file (positional)")
    em_cmd.add_argument("--file", default=None, dest="file_flag", help="Relative path to the file (named)")
    em_cmd.add_argument("--output", "-o", default=None, help="Output markdown file path")
    em_cmd.add_argument("--repo", default=None)
    em_cmd.add_argument("--json", action="store_true", dest="json_output")

    # describe (AI-friendly command descriptions)
    desc_cmd = sub.add_parser("describe", help="Show AI-friendly descriptions of all commands")
    desc_cmd.add_argument("command_name", nargs="?", default=None, help="Specific command to describe (omit for all)")
    desc_cmd.add_argument("--json", action="store_true", dest="json_output")

    args = ap.parse_args()
    if not args.command:
        ap.print_help()
        return

    use_json = getattr(args, "json_output", False)
    if not use_json:
        logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    try:
        result = _dispatch(args)
    except Exception as e:
        result = {"status": "error", "error": str(e)}

    if use_json:
        compact = getattr(args, "compact", False) and not getattr(args, "no_compact", False)
        if compact:
            print(_compact_json(result))
        else:
            print(json.dumps(result, indent=2, default=str))
    else:
        _print_human(args.command, result)


def _compact_json(obj: object, indent: int = 0) -> str:
    """Custom JSON formatter: leaf objects on one line, arrays one-item-per-line.

    Rules:
    - Scalars (str, int, float, bool, None): inline
    - Objects with only scalar values: single line  {"name": "X", "path": "Y"}
    - Objects with list/dict children: multi-line, indent children
    - Arrays: one item per line, items follow their own rules
    """
    sp = "  " * indent

    if obj is None:
        return "null"
    if isinstance(obj, bool):
        return "true" if obj else "false"
    if isinstance(obj, (int, float)):
        return str(obj)
    if isinstance(obj, str):
        return json.dumps(obj)  # handles escaping

    if isinstance(obj, dict):
        if not obj:
            return "{}"
        # Check if all values are scalars (no nested dicts/lists)
        all_scalar = all(
            isinstance(v, (str, int, float, bool, type(None))) for v in obj.values()
        )
        if all_scalar:
            pairs = ", ".join(
                f"{json.dumps(k)}: {_compact_json(v)}" for k, v in obj.items()
            )
            return "{" + pairs + "}"
        # Multi-line: has nested structures
        lines = ["{"]
        items = list(obj.items())
        for i, (k, v) in enumerate(items):
            comma = "," if i < len(items) - 1 else ""
            if isinstance(v, (str, int, float, bool, type(None))):
                lines.append(f"{sp}  {json.dumps(k)}: {_compact_json(v)}{comma}")
            else:
                rendered = _compact_json(v, indent + 1)
                lines.append(f"{sp}  {json.dumps(k)}: {rendered}{comma}")
        lines.append(f"{sp}}}")
        return "\n".join(lines)

    if isinstance(obj, list):
        if not obj:
            return "[]"
        # Check if all items are scalar
        all_scalar = all(
            isinstance(item, (str, int, float, bool, type(None))) for item in obj
        )
        if all_scalar:
            items_str = ", ".join(_compact_json(item) for item in obj)
            # If short enough, keep on one line
            if len(items_str) < 100:
                return "[" + items_str + "]"
        # One item per line
        lines = ["["]
        for i, item in enumerate(obj):
            comma = "," if i < len(obj) - 1 else ""
            rendered = _compact_json(item, indent + 1)
            lines.append(f"{sp}  {rendered}{comma}")
        lines.append(f"{sp}]")
        return "\n".join(lines)

    return json.dumps(obj, default=str)


def _dispatch(args) -> dict:
    from .tools import (
        batch_file_query,
        build_or_update_graph,
        find_path,
        get_connections,
        get_impact_radius,
        get_review_context,
        list_graph_stats,
        query_graph,
        search_nodes,
        sync_graph,
        trace_connections,
    )

    # ── Write operations (always run connectors after) ──
    if args.command == "build":
        result = build_or_update_graph(full_rebuild=True, repo_root=args.repo)
        _auto_connect(args.repo, result)
        return result
    elif args.command == "update":
        result = build_or_update_graph(
            full_rebuild=False, repo_root=args.repo, base=args.base
        )
        _auto_connect(args.repo, result)
        return result
    elif args.command == "sync":
        result = sync_graph(repo_root=args.repo)
        if result.get("files_synced", 0) > 0:
            _auto_connect(args.repo, result)
        return result

    # ── Read operations (ensure connectors ran at least once) ──
    elif args.command == "status":
        return list_graph_stats(repo_root=args.repo)
    elif args.command in ("graph-blast-radius", "blast-radius"):
        _ensure_connectors_ran(args.repo)
        return get_impact_radius(
            repo_root=args.repo, base=args.base,
            compact=getattr(args, "compact", False) and not getattr(args, "no_compact", False),
        )
    elif args.command == "query":
        _ensure_connectors_ran(args.repo)
        return query_graph(
            pattern=args.pattern, target=args.target, repo_root=args.repo,
            limit=getattr(args, "limit", None),
            filter_pattern=getattr(args, "filter_pattern", None),
            node_mode=getattr(args, "node_mode", "all"),
            compact=getattr(args, "compact", False) and not getattr(args, "no_compact", False),
        )
    elif args.command == "search":
        return search_nodes(
            query=args.query, kind=args.kind, limit=args.limit, repo_root=args.repo,
        )
    elif args.command == "find-path":
        _ensure_connectors_ran(args.repo)
        return find_path(
            source=args.source, target=args.target, repo_root=args.repo,
        )
    elif args.command == "connections":
        _ensure_connectors_ran(args.repo)
        return get_connections(
            target=args.target, repo_root=args.repo,
            limit=getattr(args, "limit", None),
            node_mode=getattr(args, "node_mode", "all"),
            compact=getattr(args, "compact", False) and not getattr(args, "no_compact", False),
        )
    elif args.command == "trace":
        _ensure_connectors_ran(args.repo)
        edge_kinds = args.edge_kinds.split(",") if args.edge_kinds else None
        return trace_connections(
            target=args.target, repo_root=args.repo,
            depth=args.depth, direction=args.direction,
            edge_kinds=edge_kinds,
            node_mode=getattr(args, "node_mode", "all"),
            compact=getattr(args, "compact", False) and not getattr(args, "no_compact", False),
        )
    elif args.command == "batch-query":
        _ensure_connectors_ran(args.repo)
        return batch_file_query(files=args.files, repo_root=args.repo)
    elif args.command == "review-context":
        _ensure_connectors_ran(args.repo)
        return get_review_context(repo_root=args.repo, base=args.base)

    # ── Other operations ──
    elif args.command == "export":
        return _export_graph(args)
    elif args.command == "export-mermaid":
        return _export_mermaid(args)
    elif args.command in ("graph-connect-api", "connect-api"):
        return _connect_api(args)
    elif args.command in ("graph-connect-implicit", "connect-implicit"):
        return _connect_implicit(args)
    elif args.command == "describe":
        from .descriptions import describe_commands
        return describe_commands(command_name=getattr(args, "command_name", None))
    else:
        return {"status": "error", "error": f"Unknown command: {args.command}"}


def _export_graph(args) -> dict:
    """Export nodes and edges from graph.db to a JSON file. Supports filtering by file."""
    from .graph import GraphStore, node_to_dict, edge_to_dict
    from .incremental import find_project_root, get_db_path

    root = Path(args.repo) if args.repo else find_project_root()
    db_path = get_db_path(root)
    store = GraphStore(db_path)

    try:
        stats = store.get_stats()
        filter_files = args.files  # None = all, list = specific files

        all_nodes = []
        if filter_files:
            # Export only selected files + their connected nodes
            target_paths = {str(root / f) for f in filter_files}
            for file_path in target_paths:
                for node in store.get_nodes_by_file(file_path):
                    all_nodes.append(node_to_dict(node))
        else:
            for file_path in store.get_all_files():
                for node in store.get_nodes_by_file(file_path):
                    all_nodes.append(node_to_dict(node))

        if filter_files:
            # Only edges involving the selected files
            target_paths = {str(root / f) for f in filter_files}
            all_edges = [
                edge_to_dict(e) for e in store.get_all_edges()
                if e.file_path in target_paths
            ]
        else:
            all_edges = [edge_to_dict(e) for e in store.get_all_edges()]

        export_data = {
            "version": "1.8.4-easyclaude",
            "stats": {
                "total_nodes": stats.total_nodes,
                "total_edges": stats.total_edges,
                "files_count": stats.files_count,
                "languages": stats.languages,
                "last_updated": stats.last_updated,
            },
            "nodes": all_nodes,
            "edges": all_edges,
        }

        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(export_data, indent=2, default=str))

        return {
            "status": "ok",
            "summary": f"Exported {len(all_nodes)} nodes and {len(all_edges)} edges to {output_path}",
            "output_path": str(output_path),
            "nodes_count": len(all_nodes),
            "edges_count": len(all_edges),
        }
    finally:
        store.close()


def _export_mermaid(args) -> dict:
    """Export a single file's graph as a Mermaid flowchart in markdown."""
    from .graph import GraphStore
    from .incremental import find_project_root, get_db_path
    from .mermaid_exporter import export_mermaid

    # Resolve file from positional or --file flag
    file_arg = getattr(args, "file_flag", None) or getattr(args, "file_positional", None)
    if not file_arg:
        return {
            "status": "error",
            "error": "File path required. Usage: export-mermaid <file> or export-mermaid --file <file>",
        }

    root = Path(args.repo) if args.repo else find_project_root()
    db_path = get_db_path(root)
    file_path = str(root / file_arg)
    store = GraphStore(db_path)

    try:
        mermaid_md, nodes_count, edges_count = export_mermaid(
            store, file_path, str(root)
        )

        # Determine output path: use relative path structure for uniqueness
        if args.output:
            output_path = Path(args.output)
        else:
            # Build unique name from relative path: docs/project-config.json → docs--project-config-graph.md
            rel = Path(file_arg)
            safe_name = "--".join(rel.parts[:-1] + (rel.stem,)) if len(rel.parts) > 1 else rel.stem
            output_path = Path(".code-graph") / f"{safe_name}-graph.md"

        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(mermaid_md, encoding="utf-8")

        return {
            "status": "ok",
            "summary": f"Exported Mermaid diagram ({nodes_count} nodes, {edges_count} edges) to {output_path}",
            "output_path": str(output_path),
            "nodes_count": nodes_count,
            "edges_count": edges_count,
        }
    finally:
        store.close()


def _print_human(command: str, result: dict) -> None:
    if result.get("status") == "error":
        print(f"Error: {result.get('error', 'unknown')}", file=sys.stderr)
        sys.exit(1)
    summary = result.get("summary", "")
    if summary:
        print(summary)
    elif command == "status":
        print(f"Nodes: {result.get('total_nodes', 0)}")
        print(f"Edges: {result.get('total_edges', 0)}")
        print(f"Files: {result.get('files_count', 0)}")
        print(f"Last updated: {result.get('last_updated', 'never')}")


def _ensure_connectors_ran(repo: str | None) -> None:
    """Ensure API/implicit connectors have run at least once on this graph.

    Called before read operations (trace, query, connections, etc.).
    Fast path: checks metadata timestamp — if connectors already ran, returns
    immediately (<1ms). If never ran, executes connectors once (30-60s first time).

    This makes connect-api a default part of every graph read operation,
    ensuring frontend↔backend API edges are always available.
    """
    try:
        from .graph import GraphStore
        from .incremental import find_project_root, get_db_path

        root = Path(repo) if repo else find_project_root()
        db_path = get_db_path(root)
        if not db_path.exists():
            return

        store = GraphStore(db_path)
        try:
            last_run = store.get_metadata("last_connect_api_run")
            if last_run is not None:
                return  # Already ran — fast exit
        finally:
            store.close()

        # Never ran — execute connectors now
        logger.info("API connectors never ran on this graph. Running now...")
        dummy_result: dict = {}
        _auto_connect(repo, dummy_result)
    except Exception as e:
        logger.debug("_ensure_connectors_ran skipped: %s", e)


def _auto_connect(repo: str | None, result: dict) -> None:
    """Auto-run connectors after build/update/sync.

    Always attempts API endpoint detection (uses auto-detection fallback
    when no explicit config exists). Implicit connections only run when
    explicitly configured in project-config.json.

    Writes last_connect_run timestamp to graph metadata for staleness checks.
    """
    try:
        from .api_connector import connect_api_endpoints, load_project_config
        from .implicit_connector import connect_implicit
        from .graph import GraphStore
        from .incremental import find_project_root, get_db_path

        root = Path(repo) if repo else find_project_root()
        config = load_project_config(root)
        connectors_config = config.get("graphConnectors", {})

        db_path = get_db_path(root)
        store = GraphStore(db_path)
        try:
            # API endpoint connector — ALWAYS try (auto-detection fallback built-in)
            try:
                api_result = connect_api_endpoints(store, root, config)
                if api_result.get("edges_created", 0) > 0:
                    result["api_connector"] = api_result
                # Track last run timestamp in graph metadata
                import time
                store.set_metadata("last_connect_api_run", str(time.time()))
                store.commit()
            except Exception as e:
                logger.warning("API connector failed: %s", e)

            # Implicit connection connector — only when explicitly configured
            if connectors_config.get("implicitConnections"):
                try:
                    imp_result = connect_implicit(store, root, config)
                    if imp_result.get("edges_created", 0) > 0:
                        result["implicit_connector"] = imp_result
                    store.set_metadata("last_connect_implicit_run", str(time.time()))
                    store.commit()
                except Exception as e:
                    logger.warning("Implicit connector failed: %s", e)
        finally:
            store.close()
    except Exception as e:
        logger.warning("Auto-connect failed: %s", e)


def _connect_api(args) -> dict:
    """Run frontend-backend API connector."""
    from .api_connector import connect_api_endpoints, load_project_config
    from .graph import GraphStore
    from .incremental import find_project_root, get_db_path

    root = Path(args.repo) if args.repo else find_project_root()
    config = load_project_config(root)
    db_path = get_db_path(root)
    store = GraphStore(db_path)
    try:
        return connect_api_endpoints(store, root, config)
    finally:
        store.close()


def _connect_implicit(args) -> dict:
    """Run implicit connection detector."""
    from .implicit_connector import connect_implicit
    from .api_connector import load_project_config
    from .graph import GraphStore
    from .incremental import find_project_root, get_db_path

    root = Path(args.repo) if args.repo else find_project_root()
    config = load_project_config(root)
    db_path = get_db_path(root)
    store = GraphStore(db_path)
    try:
        return connect_implicit(store, root, config)
    finally:
        store.close()


if __name__ == "__main__":
    main()
