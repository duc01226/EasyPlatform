"""Implicit connection detector for loosely coupled patterns.

Scans files for regex-matched keys and creates edges between files that
share a common key (entity name, message class, etc.) but have no direct
code reference. Configured via graphConnectors.implicitConnections[] in
project-config.json.

Example connections: entity CRUD -> event handler, producer -> consumer.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .graph import GraphStore
from .models import EdgeInfo

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class SideConfig:
    """One side (source or target) of an implicit connection rule."""
    file_pattern: str      # glob pattern, e.g. "**/UseCaseEvents/**/*.cs"
    content_pattern: str   # regex with capture group for the key
    key_group: int         # which capture group holds the key (1-based)


@dataclass
class ImplicitConnectionRule:
    """A single implicit connection rule from project-config.json."""
    name: str
    edge_kind: str         # e.g. TRIGGERS_EVENT, MESSAGE_BUS
    source: SideConfig
    target: SideConfig
    match_by: str          # "key-equals" or "key-contains"
    description: str = ""
    paths: list[str] = field(default_factory=list)  # optional scan scope


@dataclass
class ExtractedKey:
    """A key extracted from a file by regex scanning."""
    file_path: str
    line: int
    key: str


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class ImplicitConnector:
    """Scans files for implicit connections and creates graph edges."""

    def __init__(self, store: GraphStore, root: Path,
                 rules: list[ImplicitConnectionRule]):
        self._store = store
        self._root = root
        self._rules = rules

    def connect(self) -> dict[str, Any]:
        """Process all rules and create edges. Returns summary."""
        total_edges = 0
        rule_results = []

        for rule in self._rules:
            try:
                sources = self._scan_side(rule.source, rule.paths)
                targets = self._scan_side(rule.target, rule.paths)
                matches = self._match_keys(sources, targets, rule.match_by)
                edges = self._create_edges(rule, matches)
                total_edges += edges
                rule_results.append({
                    "rule": rule.name,
                    "sources": len(sources),
                    "targets": len(targets),
                    "edges_created": edges,
                })
            except re.error as e:
                logger.warning("Skipping rule '%s': invalid regex: %s",
                               rule.name, e)
                rule_results.append({
                    "rule": rule.name, "error": f"invalid regex: {e}"
                })
            except Exception as e:
                logger.warning("Rule '%s' failed: %s", rule.name, e)
                rule_results.append({
                    "rule": rule.name, "error": str(e)
                })

        self._store.commit()
        return {
            "status": "ok",
            "summary": (f"Implicit connector: {len(self._rules)} rules, "
                        f"{total_edges} edges created"),
            "edges_created": total_edges,
            "rules": rule_results,
        }

    def _scan_side(self, side: SideConfig,
                   paths: list[str]) -> list[ExtractedKey]:
        """Scan files matching side config and extract keys."""
        pattern = re.compile(side.content_pattern)
        results: list[ExtractedKey] = []
        scan_roots = ([self._root / p for p in paths]
                      if paths else [self._root])

        for scan_root in scan_roots:
            if not scan_root.is_dir():
                continue
            for file_path in scan_root.rglob(side.file_pattern):
                if not file_path.is_file() or file_path.is_symlink():
                    continue
                try:
                    content = file_path.read_text(errors="replace")
                except (OSError, PermissionError):
                    continue
                for line_num, line in enumerate(content.splitlines(), 1):
                    for m in pattern.finditer(line):
                        if m.lastindex and m.lastindex >= side.key_group:
                            key = m.group(side.key_group)
                            if key:
                                results.append(ExtractedKey(
                                    file_path=str(file_path),
                                    line=line_num,
                                    key=key,
                                ))
        return results

    def _match_keys(self, sources: list[ExtractedKey],
                    targets: list[ExtractedKey],
                    strategy: str) -> list[tuple[ExtractedKey, ExtractedKey]]:
        """Match source keys to target keys by strategy."""
        if not sources or not targets:
            return []

        # Build target index for fast lookup
        target_by_key: dict[str, list[ExtractedKey]] = {}
        for t in targets:
            target_by_key.setdefault(t.key, []).append(t)

        matches: list[tuple[ExtractedKey, ExtractedKey]] = []
        seen: set[tuple[str, str]] = set()  # dedup by file pair

        for src in sources:
            matched_targets: list[ExtractedKey] = []

            if strategy == "key-equals":
                matched_targets = target_by_key.get(src.key, [])
            elif strategy == "key-contains":
                for tgt_key, tgt_list in target_by_key.items():
                    if src.key in tgt_key or tgt_key in src.key:
                        matched_targets.extend(tgt_list)
            else:
                logger.warning("Unknown matchBy strategy: %s", strategy)
                continue

            for tgt in matched_targets:
                # Skip self-connections (same file)
                if src.file_path == tgt.file_path:
                    continue
                pair = (src.file_path, tgt.file_path)
                if pair not in seen:
                    seen.add(pair)
                    matches.append((src, tgt))
        return matches

    def _create_edges(self, rule: ImplicitConnectionRule,
                      matches: list[tuple[ExtractedKey, ExtractedKey]]) -> int:
        """Create graph edges for matched pairs."""
        count = 0
        for src, tgt in matches:
            edge = EdgeInfo(
                kind=rule.edge_kind,
                source=src.file_path,
                target=tgt.file_path,
                file_path=src.file_path,
                line=src.line,
                extra={
                    "rule": rule.name,
                    "source_key": src.key,
                    "target_key": tgt.key,
                    "match_by": rule.match_by,
                },
            )
            self._store.upsert_edge(edge)
            count += 1
        return count


# ---------------------------------------------------------------------------
# Module entry point
# ---------------------------------------------------------------------------

def _parse_side(data: dict) -> SideConfig:
    """Parse a source/target config dict into SideConfig."""
    return SideConfig(
        file_pattern=data["filePattern"],
        content_pattern=data["contentPattern"],
        key_group=data.get("keyGroup", 1),
    )


def _parse_rules(config: dict) -> list[ImplicitConnectionRule]:
    """Parse implicitConnections config into rule objects."""
    raw = config.get("graphConnectors", {}).get("implicitConnections", [])
    rules: list[ImplicitConnectionRule] = []
    for item in raw:
        try:
            rules.append(ImplicitConnectionRule(
                name=item["name"],
                edge_kind=item["edgeKind"],
                source=_parse_side(item["source"]),
                target=_parse_side(item["target"]),
                match_by=item.get("matchBy", "key-equals"),
                description=item.get("description", ""),
                paths=item.get("paths", []),
            ))
        except (KeyError, TypeError) as e:
            logger.warning("Skipping malformed rule: %s", e)
    return rules


def connect_implicit(
    store: GraphStore, root: Path, config: dict
) -> dict[str, Any]:
    """Detect implicit connections from project-config rules.

    Main entry point -- called from cli.py after build/update.
    """
    rules = _parse_rules(config)
    if not rules:
        return {"status": "skipped", "reason": "no implicitConnections rules"}

    connector = ImplicitConnector(store, root, rules)
    return connector.connect()
