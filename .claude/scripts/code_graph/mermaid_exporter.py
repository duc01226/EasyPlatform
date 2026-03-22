"""Mermaid flowchart exporter for code-graph.

Converts a single file's graph nodes and edges into a Mermaid flowchart
diagram embedded in markdown. Only shows internal relationships (both
endpoints within the file). External/stdlib calls are excluded.
"""

from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path

from .graph import GraphNode, GraphStore

# Edge kinds to skip in the diagram (containment shown via subgraph)
_SKIP_EDGE_KINDS = {"CONTAINS"}

# Human-readable edge labels for Mermaid arrows
_EDGE_LABELS = {
    "CALLS": "calls",
    "IMPORTS_FROM": "imports",
    "INHERITS": "inherits",
    "IMPLEMENTS": "implements",
    "TESTED_BY": "tests",
    "DEPENDS_ON": "depends",
}


def _sanitize_id(name: str) -> str:
    """Make a name safe for use as a Mermaid node ID."""
    return re.sub(r"[^a-zA-Z0-9_]", "_", name)


def _get_display_path(file_path: str, project_root: str) -> str:
    """Convert absolute file path to a relative display path."""
    try:
        return str(Path(file_path).relative_to(project_root))
    except ValueError:
        return file_path


def export_mermaid(
    store: GraphStore, file_path: str, project_root: str
) -> tuple[str, int, int]:
    """Export a single file's internal graph as a Mermaid flowchart in markdown.

    Args:
        store: Open GraphStore instance.
        file_path: Absolute path to the file to visualize.
        project_root: Absolute path to the project root (for display paths).

    Returns:
        Tuple of (markdown_string, nodes_count, edges_count).
    """
    nodes = store.get_nodes_by_file(file_path)
    if not nodes:
        display = _get_display_path(file_path, project_root)
        return f"# Graph: {display}\n\nNo nodes found in graph for this file.\n", 0, 0

    # Separate File node from content nodes (Function, Class, Type, Test)
    content_nodes: list[GraphNode] = []
    file_node: GraphNode | None = None
    for n in nodes:
        if n.kind != "File":
            content_nodes.append(n)
        else:
            file_node = n

    if not content_nodes:
        # For non-code files (markdown, JSON, etc.), render IMPORTS_FROM edges
        # as a reference graph showing what the file links to
        if file_node:
            return _export_reference_graph(store, file_node, project_root)
        display = _get_display_path(file_path, project_root)
        return f"# Graph: {display}\n\nFile has no functions or classes in the graph.\n", 0, 0

    # Build qualified name set and get internal edges
    qn_set = {n.qualified_name for n in content_nodes}
    all_edges = store.get_edges_among(qn_set)
    edges = [e for e in all_edges if e.kind not in _SKIP_EDGE_KINDS]

    # Build node ID map: qualified_name -> mermaid_id
    # Detect duplicate names and disambiguate with line number
    name_counts: dict[str, int] = defaultdict(int)
    for n in content_nodes:
        name_counts[n.name] += 1

    qn_to_id: dict[str, str] = {}
    for n in content_nodes:
        if name_counts[n.name] > 1:
            mermaid_id = _sanitize_id(f"{n.name}_L{n.line_start}")
        else:
            mermaid_id = _sanitize_id(n.name)
        qn_to_id[n.qualified_name] = mermaid_id

    # Group nodes by parent (None = top-level, non-None = class member)
    top_level: list[GraphNode] = []
    by_class: dict[str, list[GraphNode]] = defaultdict(list)
    class_nodes: list[GraphNode] = []
    for n in content_nodes:
        if n.kind == "Class":
            class_nodes.append(n)
        elif n.parent_name:
            by_class[n.parent_name].append(n)
        else:
            top_level.append(n)

    # Render Mermaid
    display = _get_display_path(file_path, project_root)
    filename = Path(file_path).name
    lines = [f"# Graph: {display}", "", "```mermaid", "flowchart TD"]

    # File subgraph
    lines.append(f'  subgraph {_sanitize_id(filename)}["{filename}"]')

    # Top-level nodes
    for n in sorted(top_level, key=lambda x: x.line_start):
        nid = qn_to_id[n.qualified_name]
        label = _node_label(n)
        lines.append(f'    {nid}["{label}"]')

    # Class subgraphs with their members
    for cls in sorted(class_nodes, key=lambda x: x.line_start):
        cls_id = qn_to_id[cls.qualified_name]
        lines.append(f'    subgraph {cls_id}["{cls.name}"]')
        members = by_class.get(cls.name, [])
        for m in sorted(members, key=lambda x: x.line_start):
            mid = qn_to_id[m.qualified_name]
            label = _node_label(m)
            lines.append(f'      {mid}["{label}"]')
        lines.append("    end")

    lines.append("  end")

    # Edges
    for e in edges:
        src_id = qn_to_id.get(e.source_qualified)
        tgt_id = qn_to_id.get(e.target_qualified)
        if src_id and tgt_id:
            label = _EDGE_LABELS.get(e.kind, e.kind.lower())
            lines.append(f"  {src_id} -->|{label}| {tgt_id}")

    lines.append("```")
    lines.append("")

    return "\n".join(lines), len(content_nodes), len(edges)


def _node_label(node: GraphNode) -> str:
    """Create a display label for a node, escaping Mermaid-breaking chars."""
    name = node.name.replace('"', "#quot;").replace("]", "#93;")
    if node.kind in ("Function", "Test"):
        return f"{name}()"
    return name


def _export_reference_graph(
    store: GraphStore, file_node: GraphNode, project_root: str,
) -> tuple[str, int, int]:
    """Render a reference graph for non-code files (markdown, JSON, etc.).

    Shows outgoing IMPORTS_FROM edges as a Mermaid flowchart where the file
    points to each referenced target.
    """
    display = _get_display_path(file_node.file_path, project_root)
    filename = Path(file_node.file_path).name

    # Collect outgoing references
    outgoing = []
    for e in store.get_edges_by_source(file_node.qualified_name):
        if e.kind == "IMPORTS_FROM":
            outgoing.append(e)

    # Collect incoming references (who imports this file)
    incoming = []
    for e in store.get_edges_by_target(file_node.qualified_name):
        if e.kind == "IMPORTS_FROM":
            incoming.append(e)

    total_edges = len(outgoing) + len(incoming)
    if not outgoing and not incoming:
        return f"# Graph: {display}\n\nFile has no references in the graph.\n", 0, 0

    # Count nodes: 1 (this file) + unique targets + unique sources
    target_set = {e.target_qualified for e in outgoing}
    source_set = {e.source_qualified for e in incoming}
    total_nodes = 1 + len(target_set) + len(source_set - {file_node.qualified_name})

    lines = [f"# Graph: {display}", "", "```mermaid", "flowchart LR"]

    file_id = _sanitize_id(filename)
    lines.append(f'  {file_id}["{filename}"]')

    # Outgoing references
    if outgoing:
        seen_targets: set[str] = set()
        for e in outgoing:
            if e.target_qualified in seen_targets:
                continue
            seen_targets.add(e.target_qualified)
            # Use short name for display
            target_name = Path(e.target_qualified).name or e.target_qualified
            target_id = _sanitize_id(f"out_{e.target_qualified}")
            lines.append(f'  {target_id}["{target_name}"]')
            lines.append(f"  {file_id} -->|references| {target_id}")

    # Incoming references
    if incoming:
        seen_sources: set[str] = set()
        for e in incoming:
            if e.source_qualified in seen_sources:
                continue
            seen_sources.add(e.source_qualified)
            source_name = Path(e.source_qualified).name or e.source_qualified
            source_id = _sanitize_id(f"in_{e.source_qualified}")
            lines.append(f'  {source_id}["{source_name}"]')
            lines.append(f"  {source_id} -->|references| {file_id}")

    lines.append("```")
    lines.append("")

    return "\n".join(lines), total_nodes, total_edges
