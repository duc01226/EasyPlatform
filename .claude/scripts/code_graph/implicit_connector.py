"""Implicit connection detector for loosely coupled patterns.

Scans files for regex-matched keys and creates edges between files that
share a common key (entity name, message class, etc.) but have no direct
code reference. Configured via graphConnectors.implicitConnections[] in
project-config.json.

Example connections: entity CRUD -> event handler, producer -> consumer.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

from .api_connector import _SKIP_DIRS
from .graph import GraphStore
from .models import EdgeInfo

logger = logging.getLogger(__name__)

# Extra directories pruned during the implicit scan (on top of _SKIP_DIRS).
# Project-specific build dirs belong in graphSettings.scanSkipDirs, not here.
_EXTRA_SKIP_DIRS = frozenset({
    ".turbo", ".vercel", "tmp", "temp", "storybook-static",
    ".cache", ".parcel-cache",
})
# Skip very large files — a content join never needs them and they dominate cost.
_MAX_FILE_BYTES = 2_000_000


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class SideConfig:
    """One side (source or target) of an implicit connection rule.

    A side extracts a key either from file CONTENT (``content_pattern``) or
    from the file's repo-relative PATH (``path_pattern``). Path extraction
    lets rules join on filename-encoded keys (e.g. spec ids in
    ``specs/<domain>/<NNN>-<slug>.md``) that never appear in the file body.
    """
    file_pattern: str      # glob pattern, e.g. "**/UseCaseEvents/**/*.cs"
    content_pattern: str = ""   # regex with capture group for the key
    key_group: int = 1          # which capture group holds the key (1-based)
    path_pattern: str = ""      # regex over repo-relative path (alternative)
    file_patterns: list[str] = field(default_factory=list)  # multi-glob form
    paths: list[str] = field(default_factory=list)  # per-side scan scope


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
                 rules: list[ImplicitConnectionRule],
                 extra_skip_dirs: Optional[list[str]] = None):
        self._store = store
        self._root = root
        self._rules = rules
        self._extra_skip_dirs = frozenset(extra_skip_dirs or [])

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
        """Scan files matching side config and extract keys.

        Uses ``path_pattern`` against the repo-relative POSIX path when set,
        otherwise ``content_pattern`` against each line of the file.
        """
        key_re = None
        if side.path_pattern:
            key_re = re.compile(side.path_pattern)
        elif side.content_pattern:
            key_re = re.compile(side.content_pattern)
        if key_re is None:
            return []

        patterns = [p for p in ([side.file_pattern] + list(side.file_patterns)) if p]
        results: list[ExtractedKey] = []
        scan_bases = side.paths or paths
        scan_roots = ([self._root / p for p in scan_bases]
                      if scan_bases else [self._root])
        seen_files: set[str] = set()

        for scan_root in scan_roots:
            if not scan_root.is_dir():
                continue
            for file_path in _iter_matching_files(scan_root, patterns, self._extra_skip_dirs):
                file_key = str(file_path)
                if file_key in seen_files:
                    continue
                seen_files.add(file_key)

                if side.path_pattern:
                    rel = _rel_posix(file_path, self._root)
                    for m in key_re.finditer(rel):
                        key = _group_or_whole(m, side.key_group)
                        if key:
                            results.append(ExtractedKey(
                                file_path=file_key, line=1, key=key,
                            ))
                    continue

                try:
                    if file_path.stat().st_size > _MAX_FILE_BYTES:
                        continue
                    content = file_path.read_text(errors="replace")
                except (OSError, PermissionError):
                    continue
                for m in key_re.finditer(content):
                    key = _group_or_whole(m, side.key_group)
                    if key:
                        results.append(ExtractedKey(
                            file_path=file_key,
                            line=content.count("\n", 0, m.start()) + 1,
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
    raw_pattern = data.get("filePattern", "")
    if isinstance(raw_pattern, list):
        file_pattern = raw_pattern[0] if raw_pattern else ""
        file_patterns = [p for p in raw_pattern[1:] if isinstance(p, str)]
    else:
        file_pattern = raw_pattern
        file_patterns = [p for p in data.get("filePatterns", []) if isinstance(p, str)]
    return SideConfig(
        file_pattern=file_pattern,
        content_pattern=data.get("contentPattern", ""),
        key_group=data.get("keyGroup", 1),
        path_pattern=data.get("pathPattern", ""),
        file_patterns=file_patterns,
        paths=[p for p in data.get("paths", []) if isinstance(p, str)],
    )


def _glob_to_regex(pattern: str) -> "re.Pattern":
    """Translate a glob (``**``, ``*``, ``?``) into a compiled regex.

    ``**/`` matches zero or more directories; ``*`` stays within a segment.
    """
    out: list[str] = []
    i = 0
    n = len(pattern)
    while i < n:
        ch = pattern[i]
        if ch == "*":
            if i + 1 < n and pattern[i + 1] == "*":
                i += 2
                if i < n and pattern[i] == "/":
                    out.append("(?:.*/)?")
                    i += 1
                else:
                    out.append(".*")
                continue
            out.append("[^/]*")
        elif ch == "?":
            out.append("[^/]")
        else:
            out.append(re.escape(ch))
        i += 1
    return re.compile("^" + "".join(out) + "$")


def _iter_matching_files(root: Path, patterns: list[str],
                         extra_skip_dirs: frozenset[str] = frozenset()):
    """Yield files matching any glob pattern.

    Uses ``os.walk`` with directory pruning (never descends into
    ``node_modules``/build output) so the scan stays bounded on large repos,
    rather than ``rglob`` which enumerates excluded trees first.
    ``extra_skip_dirs`` carries project-specific build dirs from
    ``graphSettings.scanSkipDirs``.
    """
    regexes = [_glob_to_regex(p) for p in patterns]
    skip = _SKIP_DIRS | _EXTRA_SKIP_DIRS | extra_skip_dirs
    for dirpath, dirnames, filenames in os.walk(str(root)):
        dirnames[:] = [d for d in dirnames if d not in skip]
        for fname in filenames:
            full = Path(dirpath) / fname
            if full.is_symlink():
                continue
            rel = _rel_posix(full, root)
            if fname in skip:
                continue
            if any(r.match(rel) or r.match(fname) for r in regexes):
                yield full


def _rel_posix(path: Path, root: Path) -> str:
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except (OSError, ValueError):
        return path.as_posix()


def _group_or_whole(match: "re.Match", group: int) -> Optional[str]:
    """Return a capture group, or None when the pattern captured nothing.

    A pattern without a capture group is a config error for a key-join rule:
    returning the whole match would emit an arbitrary line as a key, so the
    match is skipped instead.
    """
    if match.lastindex and match.lastindex >= group:
        return match.group(group)
    return None


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

    scan_skip_dirs = config.get("graphSettings", {}).get("scanSkipDirs", [])
    connector = ImplicitConnector(store, root, rules, extra_skip_dirs=scan_skip_dirs)
    return connector.connect()
