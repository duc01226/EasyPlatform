"""SQLite-backed knowledge graph storage and query engine.

Stores code structure as nodes (File, Class, Function, Type, Test) and
edges (CALLS, IMPORTS_FROM, INHERITS, IMPLEMENTS, CONTAINS, TESTED_BY, DEPENDS_ON).
Supports impact-radius queries and subgraph extraction.
"""

from __future__ import annotations

import json
import logging
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from .models import EdgeInfo, NodeInfo, qualify

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

# Bump when _SCHEMA_SQL changes so already-initialized databases re-run the
# DDL block; otherwise the script is skipped on open (avoids 13 DDL statements
# + a commit on every CLI invocation).
_SCHEMA_VERSION = 2

_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,          -- File, Class, Function, Type, Test
    name TEXT NOT NULL,
    qualified_name TEXT NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    line_start INTEGER,
    line_end INTEGER,
    language TEXT,
    parent_name TEXT,
    params TEXT,
    return_type TEXT,
    modifiers TEXT,
    is_test INTEGER DEFAULT 0,
    file_hash TEXT,
    extra TEXT DEFAULT '{}',
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,           -- CALLS, IMPORTS_FROM, INHERITS, etc.
    source_qualified TEXT NOT NULL,
    target_qualified TEXT NOT NULL,
    file_path TEXT NOT NULL,
    line INTEGER DEFAULT 0,
    extra TEXT DEFAULT '{}',
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nodes_file ON nodes(file_path);
CREATE INDEX IF NOT EXISTS idx_nodes_kind ON nodes(kind);
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_qualified);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_qualified);
CREATE INDEX IF NOT EXISTS idx_edges_kind ON edges(kind);
CREATE INDEX IF NOT EXISTS idx_edges_file ON edges(file_path);
CREATE INDEX IF NOT EXISTS idx_nodes_name ON nodes(name);
CREATE INDEX IF NOT EXISTS idx_edges_kind_source ON edges(kind, source_qualified);
CREATE INDEX IF NOT EXISTS idx_edges_kind_target ON edges(kind, target_qualified);
-- Covers the upsert_edge identity lookup (all five columns) in one seek.
CREATE INDEX IF NOT EXISTS idx_edges_lookup ON edges(kind, source_qualified, target_qualified, file_path, line);
"""


@dataclass
class GraphNode:
    id: int
    kind: str
    name: str
    qualified_name: str
    file_path: str
    line_start: int
    line_end: int
    language: str
    parent_name: Optional[str]
    params: Optional[str]
    return_type: Optional[str]
    modifiers: Optional[str]
    is_test: bool
    file_hash: Optional[str]
    extra: dict


@dataclass
class GraphEdge:
    id: int
    kind: str
    source_qualified: str
    target_qualified: str
    file_path: str
    line: int
    extra: dict


@dataclass
class GraphStats:
    total_nodes: int
    total_edges: int
    nodes_by_kind: dict[str, int]
    edges_by_kind: dict[str, int]
    languages: list[str]
    files_count: int
    last_updated: Optional[str]


# ---------------------------------------------------------------------------
# GraphStore
# ---------------------------------------------------------------------------


class GraphStore:
    """SQLite-backed code knowledge graph."""

    _PATH_MARKERS = (
        ".claude/", ".agents/", ".codex/", ".ai/",
        "src/", "docs/", "scripts/", "plans/",
        "README.md", "CLAUDE.md", "AGENTS.md",
        "package.json", "package-lock.json", "nx.json",
    )

    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)
        self.repo_root = self.db_path.parent.parent.resolve()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(
            str(self.db_path), timeout=30, check_same_thread=False
        )
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA busy_timeout=5000")
        # Initialize caches before the schema migration runs — the migration can
        # touch the search-index flag.
        self._fts_available: bool | None = None
        self._init_schema()

    def __enter__(self) -> "GraphStore":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()

    def _init_schema(self) -> None:
        """Create or migrate the schema to the current version.

        Existing databases from any older version are upgraded in place on open
        (fresh installs and teammates who pull new code both take this path), so
        a stale local ``graph.db`` is never left unusable.
        """
        version = self._conn.execute("PRAGMA user_version").fetchone()[0]
        if version >= _SCHEMA_VERSION:
            # Self-heal an existing database: a prior open may have advanced the
            # version while a step failed (busy lock, older build). Re-apply the
            # idempotent v2 index changes and rebuild the FTS index only when
            # actually missing, so a healthy DB pays a few cheap catalog reads.
            if version >= 2:
                try:
                    self._ensure_v2_indexes()
                except sqlite3.OperationalError as exc:
                    logger.warning("Index self-heal deferred (database busy): %s", exc)
                    try:
                        self._conn.rollback()
                    except sqlite3.Error:
                        pass
                if not self._has_search_index():
                    self._ensure_search_index()
                # A DB advanced to v2 by an earlier build can still hold legacy
                # backslash-relative identities that the old detector missed and that
                # therefore never got normalized. Re-run the normalization sweep on open
                # so exact-path deletes and file hashes match again.
                if self._has_absolute_paths():
                    self.migrate_absolute_paths_to_relative()
            return
        try:
            self._conn.executescript(_SCHEMA_SQL)
            if version < 2:
                self._migrate_to_v2()
            self._conn.execute(f"PRAGMA user_version = {_SCHEMA_VERSION}")
            self._conn.commit()
        except sqlite3.OperationalError as exc:
            # A concurrent opener (another hook/CLI) can hold the write lock.
            # The migration is idempotent, so defer and retry on the next open
            # rather than failing the command.
            logger.warning("Schema migration deferred (database busy): %s", exc)
            try:
                self._conn.rollback()
            except sqlite3.Error:
                pass

    def _index_exists(self, name: str) -> bool:
        return self._conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='index' AND name=?", (name,)
        ).fetchone() is not None

    def _ensure_v2_indexes(self) -> None:
        """Apply the v2 index changes idempotently (no-op when already applied)."""
        need_lookup = not self._index_exists("idx_edges_lookup")
        has_redundant = self._index_exists("idx_nodes_qualified")
        if not need_lookup and not has_redundant:
            return
        if need_lookup:
            self._conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_edges_lookup ON edges"
                "(kind, source_qualified, target_qualified, file_path, line)"
            )
        if has_redundant:
            # Duplicates the UNIQUE(qualified_name) auto-index; only added cost.
            self._conn.execute("DROP INDEX IF EXISTS idx_nodes_qualified")
        self._conn.commit()

    def _migrate_to_v2(self) -> None:
        """v2: lookup index, drop redundant index, relative paths, FTS search."""
        self._ensure_v2_indexes()

        # A stale DB may still hold absolute/backslash identities written before
        # path normalization; convert once so exact-path deletes are sufficient.
        if self._has_absolute_paths():
            self._conn.commit()
            self.migrate_absolute_paths_to_relative()
        else:
            self.set_metadata("path_storage_version", "relative-v1")

        self._ensure_search_index()

    def _ensure_search_index(self) -> None:
        """Create the FTS5 trigram search index and keep it in sync via triggers.

        FTS5/trigram is optional; when the SQLite build lacks it the search path
        falls back transparently to the original LIKE scan.
        """
        try:
            self._conn.execute(
                "CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5("
                "name, qualified_name, content='nodes', content_rowid='id', "
                "tokenize='trigram')"
            )
            self._conn.execute(
                "CREATE TRIGGER IF NOT EXISTS nodes_fts_ai AFTER INSERT ON nodes BEGIN "
                "INSERT INTO nodes_fts(rowid, name, qualified_name) "
                "VALUES (new.id, new.name, new.qualified_name); END"
            )
            self._conn.execute(
                "CREATE TRIGGER IF NOT EXISTS nodes_fts_ad AFTER DELETE ON nodes BEGIN "
                "INSERT INTO nodes_fts(nodes_fts, rowid, name, qualified_name) "
                "VALUES ('delete', old.id, old.name, old.qualified_name); END"
            )
            self._conn.execute(
                "CREATE TRIGGER IF NOT EXISTS nodes_fts_au AFTER UPDATE ON nodes BEGIN "
                "INSERT INTO nodes_fts(nodes_fts, rowid, name, qualified_name) "
                "VALUES ('delete', old.id, old.name, old.qualified_name); "
                "INSERT INTO nodes_fts(rowid, name, qualified_name) "
                "VALUES (new.id, new.name, new.qualified_name); END"
            )
            self._conn.execute("INSERT INTO nodes_fts(nodes_fts) VALUES('rebuild')")
            self._conn.commit()
            self._fts_available = True
        except Exception as exc:  # pragma: no cover - depends on SQLite build
            logger.warning(
                "FTS5 trigram search index unavailable (%s); using LIKE scan", exc
            )
            self._fts_available = False

    def _has_search_index(self) -> bool:
        if self._fts_available is None:
            row = self._conn.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='nodes_fts'"
            ).fetchone()
            self._fts_available = row is not None
        return self._fts_available

    def _invalidate_cache(self) -> None:
        """No-op retained for call-site compatibility.

        Traversals read edges from SQL per frontier level, so there is no
        in-process whole-graph cache to invalidate.
        """
        return

    def close(self) -> None:
        self._conn.close()

    # --- Write operations ---

    def _normalize_path(self, path: str) -> str:
        """Store graph file identities as repo-relative POSIX paths.

        Existing callers may pass absolute paths. The graph schema stores those
        paths inside qualified names, so normalization belongs at the storage
        boundary where every writer passes through one invariant.
        """
        if not path:
            return path
        cleaned = path.replace("\\", "/")
        try:
            p = Path(cleaned)
            if p.is_absolute():
                try:
                    return str(p.resolve().relative_to(self.repo_root)).replace("\\", "/")
                except (OSError, ValueError):
                    try:
                        return str(p.relative_to(self.repo_root)).replace("\\", "/")
                    except ValueError:
                        try:
                            sibling_rel = p.relative_to(self.repo_root.parent)
                            if len(sibling_rel.parts) > 1:
                                return str(Path(*sibling_rel.parts[1:])).replace("\\", "/")
                        except ValueError:
                            pass
                        for marker in self._PATH_MARKERS:
                            marker_index = cleaned.find(marker)
                            if marker_index >= 0:
                                return cleaned[marker_index:]
                        return cleaned
        except (OSError, ValueError):
            return cleaned
        if cleaned.startswith("/"):
            for marker in self._PATH_MARKERS:
                marker_index = cleaned.find(marker)
                if marker_index >= 0:
                    return cleaned[marker_index:]
            return cleaned.lstrip("/")
        return cleaned[2:] if cleaned.startswith("./") else cleaned

    def _normalize_identifier(self, value: str) -> str:
        """Normalize path-bearing graph identifiers without touching bare names."""
        if not value:
            return value
        if "::" in value:
            file_part, symbol_part = value.split("::", 1)
            return f"{self._normalize_path(file_part)}::{symbol_part}"
        if "\\" in value or "/" in value or Path(value).is_absolute():
            return self._normalize_path(value)
        return value

    @staticmethod
    def _looks_path_like(value: str) -> bool:
        return bool(
            value and (
                "\\" in value or "/" in value or "::" in value or Path(value).is_absolute()
            )
        )

    def _has_absolute_paths(self) -> bool:
        """True when stored identities are not yet normalized POSIX relative paths.

        Despite the name this covers BOTH absolute paths AND legacy backslash-relative
        paths (``src\\foo.py``): the latter match neither ``_:%`` nor ``/%``, so a
        backslash-only DB would otherwise be marked ``relative-v1`` without any row
        being converted, and exact-path deletes/hashes would silently miss it.
        """
        node_row = self._conn.execute(
            "SELECT 1 FROM nodes WHERE file_path LIKE '_:%' OR file_path LIKE '/%' "
            "OR file_path LIKE '%\\%' LIMIT 1"
        ).fetchone()
        if node_row:
            return True
        edge_row = self._conn.execute(
            "SELECT 1 FROM edges WHERE file_path LIKE '_:%' OR file_path LIKE '/%' "
            "OR file_path LIKE '%\\%' "
            "OR source_qualified LIKE '_:%' OR source_qualified LIKE '/%' "
            "OR source_qualified LIKE '%\\%' "
            "OR target_qualified LIKE '_:%' OR target_qualified LIKE '/%' "
            "OR target_qualified LIKE '%\\%' LIMIT 1"
        ).fetchone()
        return edge_row is not None

    def migrate_absolute_paths_to_relative(self) -> dict[str, Any]:
        """Convert existing absolute graph rows to repo-relative identities."""
        if not self._has_absolute_paths():
            self.set_metadata("path_storage_version", "relative-v1")
            return {"nodes_migrated": 0, "edges_migrated": 0, "status": "ok"}

        node_rows = self._conn.execute("SELECT * FROM nodes").fetchall()
        nodes_by_qualified: dict[str, tuple] = {}
        for row in node_rows:
            file_path = self._normalize_path(row["file_path"])
            qualified_name = (
                file_path if row["kind"] == "File"
                else self._normalize_identifier(row["qualified_name"])
            )
            name = file_path if row["kind"] == "File" else row["name"]
            migrated = (
                row["kind"], name, qualified_name, file_path,
                row["line_start"], row["line_end"], row["language"],
                row["parent_name"], row["params"], row["return_type"],
                row["modifiers"], row["is_test"], row["file_hash"],
                row["extra"], row["updated_at"],
            )
            existing = nodes_by_qualified.get(qualified_name)
            if existing is None or row["updated_at"] >= existing[-1]:
                nodes_by_qualified[qualified_name] = migrated

        edge_rows = self._conn.execute("SELECT * FROM edges").fetchall()
        migrated_edges: dict[tuple, tuple] = {}
        for row in edge_rows:
            migrated = (
                row["kind"],
                self._normalize_identifier(row["source_qualified"]),
                self._normalize_identifier(row["target_qualified"]),
                self._normalize_path(row["file_path"]),
                row["line"],
                row["extra"],
                row["updated_at"],
            )
            migrated_edges[migrated[:5]] = migrated

        self._conn.execute("DELETE FROM nodes")
        self._conn.executemany(
            """INSERT INTO nodes
               (kind, name, qualified_name, file_path, line_start, line_end,
                language, parent_name, params, return_type, modifiers, is_test,
                file_hash, extra, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            list(nodes_by_qualified.values()),
        )
        self._conn.execute("DELETE FROM edges")
        self._conn.executemany(
            """INSERT INTO edges
               (kind, source_qualified, target_qualified, file_path, line, extra, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            list(migrated_edges.values()),
        )
        self.set_metadata("path_storage_version", "relative-v1")
        self._conn.commit()
        self._invalidate_cache()
        return {
            "nodes_migrated": len(node_rows),
            "nodes_after_dedupe": len(nodes_by_qualified),
            "edges_migrated": len(edge_rows),
            "edges_after_dedupe": len(migrated_edges),
            "status": "ok",
        }

    def upsert_node(self, node: NodeInfo, file_hash: str = "") -> int:
        """Insert or update a node. Returns the node ID."""
        now = time.time()
        file_path = self._normalize_path(node.file_path)
        name = file_path if node.kind == "File" else node.name
        qualified = file_path if node.kind == "File" else qualify(node.name, file_path, node.parent_name)
        extra = json.dumps(node.extra) if node.extra else "{}"

        self._conn.execute(
            """INSERT INTO nodes
               (kind, name, qualified_name, file_path, line_start, line_end,
                language, parent_name, params, return_type, modifiers, is_test,
                file_hash, extra, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(qualified_name) DO UPDATE SET
                 kind=excluded.kind, name=excluded.name,
                 file_path=excluded.file_path, line_start=excluded.line_start,
                 line_end=excluded.line_end, language=excluded.language,
                 parent_name=excluded.parent_name, params=excluded.params,
                 return_type=excluded.return_type, modifiers=excluded.modifiers,
                 is_test=excluded.is_test, file_hash=excluded.file_hash,
                 extra=excluded.extra, updated_at=excluded.updated_at
            """,
            (
                node.kind, name, qualified, file_path,
                node.line_start, node.line_end, node.language,
                node.parent_name, node.params, node.return_type,
                node.modifiers, int(node.is_test), file_hash,
                extra, now,
            ),
        )
        row = self._conn.execute(
            "SELECT id FROM nodes WHERE qualified_name = ?", (qualified,)
        ).fetchone()
        return row["id"]

    def upsert_edge(self, edge: EdgeInfo) -> int:
        """Insert or update an edge."""
        now = time.time()
        source = self._normalize_identifier(edge.source)
        target = self._normalize_identifier(edge.target)
        file_path = self._normalize_path(edge.file_path)
        extra = json.dumps(edge.extra) if edge.extra else "{}"

        # Check for existing edge (include line so multiple call sites are preserved)
        existing = self._conn.execute(
            """SELECT id FROM edges
               WHERE kind=? AND source_qualified=? AND target_qualified=?
                     AND file_path=? AND line=?""",
            (edge.kind, source, target, file_path, edge.line),
        ).fetchone()

        if existing:
            self._conn.execute(
                "UPDATE edges SET line=?, extra=?, updated_at=? WHERE id=?",
                (edge.line, extra, now, existing["id"]),
            )
            return existing["id"]

        self._conn.execute(
            """INSERT INTO edges
               (kind, source_qualified, target_qualified, file_path, line, extra, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (edge.kind, source, target, file_path, edge.line, extra, now),
        )
        return self._conn.execute("SELECT last_insert_rowid()").fetchone()[0]

    def remove_file_data(self, file_path: str) -> None:
        """Remove all nodes and edges associated with a file.

        Stored identities are repo-relative POSIX paths (enforced at the write
        boundary and backfilled by the v2 migration), so exact matches on the
        known path variants are sufficient — no per-file LIKE table scan.
        """
        variants = {file_path, file_path.replace("\\", "/"), self._normalize_path(file_path)}
        for variant in variants:
            self._conn.execute("DELETE FROM nodes WHERE file_path = ?", (variant,))
            self._conn.execute("DELETE FROM edges WHERE file_path = ?", (variant,))
        self._invalidate_cache()

    def store_file_nodes_edges(
        self, file_path: str, nodes: list[NodeInfo], edges: list[EdgeInfo], fhash: str = ""
    ) -> None:
        """Atomically replace all data for a file."""
        self.remove_file_data(file_path)
        for node in nodes:
            self.upsert_node(node, file_hash=fhash)
        for edge in edges:
            self.upsert_edge(edge)
        self._conn.commit()
        self._invalidate_cache()

    def set_metadata(self, key: str, value: str) -> None:
        self._conn.execute(
            "INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)", (key, value)
        )
        self._conn.commit()

    def get_metadata(self, key: str) -> Optional[str]:
        row = self._conn.execute("SELECT value FROM metadata WHERE key=?", (key,)).fetchone()
        return row["value"] if row else None

    def commit(self) -> None:
        self._conn.commit()

    # --- Read operations ---

    def get_node(self, qualified_name: str) -> Optional[GraphNode]:
        row = self._conn.execute(
            "SELECT * FROM nodes WHERE qualified_name = ?", (qualified_name,)
        ).fetchone()
        if not row:
            normalized = self._normalize_identifier(qualified_name)
            row = self._conn.execute(
                "SELECT * FROM nodes WHERE qualified_name = ?",
                (normalized,),
            ).fetchone()
            if not row and normalized != qualified_name and self._looks_path_like(normalized):
                row = self._conn.execute(
                    "SELECT * FROM nodes WHERE REPLACE(qualified_name, ?, '/') LIKE ? LIMIT 1",
                    ("\\", f"%/{normalized}"),
                ).fetchone()
        return self._row_to_node(row) if row else None

    def get_nodes_by_qualified_names(self, qnames: list[str]) -> list[GraphNode]:
        """Batch-fetch nodes by qualified name using IN clause."""
        if not qnames:
            return []
        results = []
        batch_size = 450  # Stay under SQLite 999 variable limit
        for i in range(0, len(qnames), batch_size):
            batch = qnames[i:i + batch_size]
            placeholders = ",".join("?" for _ in batch)
            rows = self._conn.execute(
                f"SELECT * FROM nodes WHERE qualified_name IN ({placeholders})",  # nosec B608
                batch,
            ).fetchall()
            results.extend(self._row_to_node(r) for r in rows)
        return results

    def get_nodes_by_file(self, file_path: str) -> list[GraphNode]:
        normalized = self._normalize_path(file_path)
        variants = list({file_path, file_path.replace("\\", "/"), normalized})
        placeholders = ",".join("?" for _ in variants)
        rows = self._conn.execute(
            f"SELECT * FROM nodes WHERE file_path IN ({placeholders})",  # nosec B608
            variants,
        ).fetchall()
        if not rows and normalized and self._looks_path_like(normalized):
            rows = self._conn.execute(
                "SELECT * FROM nodes WHERE REPLACE(file_path, ?, '/') LIKE ?",
                ("\\", f"%/{normalized}"),
            ).fetchall()
        return [self._row_to_node(r) for r in rows]

    def get_file_hash(self, file_path: str) -> Optional[str]:
        """Return the stored content hash for a file without materializing nodes.

        Mirrors get_nodes_by_file's path variants so the incremental skip check
        can compare a hash with one indexed scalar query instead of a full load.
        """
        normalized = self._normalize_path(file_path)
        variants = list({file_path, file_path.replace("\\", "/"), normalized})
        placeholders = ",".join("?" for _ in variants)
        row = self._conn.execute(
            f"SELECT file_hash FROM nodes WHERE file_path IN ({placeholders}) LIMIT 1",  # nosec B608
            variants,
        ).fetchone()
        if row is None and normalized and self._looks_path_like(normalized):
            row = self._conn.execute(
                "SELECT file_hash FROM nodes WHERE REPLACE(file_path, ?, '/') LIKE ? LIMIT 1",
                ("\\", f"%/{normalized}"),
            ).fetchone()
        return row["file_hash"] if row else None

    def get_nodes_by_files(self, file_paths: list[str]) -> list[GraphNode]:
        """Batch-fetch all nodes for several files in one query per 450 paths."""
        values: set[str] = set()
        for fp in file_paths:
            if fp:
                values.update({fp, fp.replace("\\", "/"), self._normalize_path(fp)})
        if not values:
            return []
        vals = list(values)
        out: list[GraphNode] = []
        for i in range(0, len(vals), 450):
            batch = vals[i:i + 450]
            placeholders = ",".join("?" for _ in batch)
            rows = self._conn.execute(  # nosec B608
                f"SELECT * FROM nodes WHERE file_path IN ({placeholders})", batch
            ).fetchall()
            out.extend(self._row_to_node(r) for r in rows)
        return out

    def get_edges_by_sources(self, qualified_names: list[str]) -> list[GraphEdge]:
        """Batch-fetch edges whose source is any of the given identities."""
        return self._get_edges_by_endpoint(qualified_names, "source_qualified")

    def get_edges_by_targets(self, qualified_names: list[str]) -> list[GraphEdge]:
        """Batch-fetch edges whose target is any of the given identities."""
        return self._get_edges_by_endpoint(qualified_names, "target_qualified")

    def _get_edges_by_endpoint(
        self, qualified_names: list[str], column: str
    ) -> list[GraphEdge]:
        values: set[str] = set()
        for qn in qualified_names:
            if qn:
                values.update({qn, qn.replace("\\", "/"), self._normalize_identifier(qn)})
        if not values:
            return []
        vals = list(values)
        out: list[GraphEdge] = []
        for i in range(0, len(vals), 450):
            batch = vals[i:i + 450]
            placeholders = ",".join("?" for _ in batch)
            rows = self._conn.execute(  # nosec B608
                f"SELECT * FROM edges WHERE {column} IN ({placeholders})", batch
            ).fetchall()
            out.extend(self._row_to_edge(r) for r in rows)
        return out

    def get_edges_by_source(self, qualified_name: str) -> list[GraphEdge]:
        normalized = self._normalize_identifier(qualified_name)
        variants = list({qualified_name, qualified_name.replace("\\", "/"), normalized})
        placeholders = ",".join("?" for _ in variants)
        rows = self._conn.execute(
            f"SELECT * FROM edges WHERE source_qualified IN ({placeholders})",  # nosec B608
            variants,
        ).fetchall()
        if not rows and normalized and self._looks_path_like(normalized):
            rows = self._conn.execute(
                "SELECT * FROM edges WHERE REPLACE(source_qualified, ?, '/') LIKE ?",
                ("\\", f"%/{normalized}"),
            ).fetchall()
        return [self._row_to_edge(r) for r in rows]

    def get_edges_by_target(self, qualified_name: str) -> list[GraphEdge]:
        normalized = self._normalize_identifier(qualified_name)
        variants = list({qualified_name, qualified_name.replace("\\", "/"), normalized})
        placeholders = ",".join("?" for _ in variants)
        rows = self._conn.execute(
            f"SELECT * FROM edges WHERE target_qualified IN ({placeholders})",  # nosec B608
            variants,
        ).fetchall()
        if not rows and normalized and self._looks_path_like(normalized):
            rows = self._conn.execute(
                "SELECT * FROM edges WHERE REPLACE(target_qualified, ?, '/') LIKE ?",
                ("\\", f"%/{normalized}"),
            ).fetchall()
        return [self._row_to_edge(r) for r in rows]

    def search_edges_by_target_name(self, name: str, kind: str = "CALLS") -> list[GraphEdge]:
        """Search for edges where target_qualified matches an unqualified name.

        CALLS edges often store unqualified target names (e.g. ``generateTestCode``)
        rather than fully qualified ones (``file.ts::generateTestCode``).  This
        method finds those edges by exact match on the plain function name so that
        reverse call tracing (callers_of) works even when qualified-name lookup
        returns nothing.
        """
        rows = self._conn.execute(
            "SELECT * FROM edges WHERE target_qualified = ? AND kind = ?",
            (name, kind),
        ).fetchall()
        return [self._row_to_edge(r) for r in rows]

    def get_all_files(self) -> list[str]:
        rows = self._conn.execute(
            "SELECT DISTINCT file_path FROM nodes WHERE kind = 'File'"
        ).fetchall()
        return [r["file_path"] for r in rows]

    def get_distinct_edge_kinds(self) -> set[str]:
        """Return all distinct edge kinds present in the database."""
        rows = self._conn.execute(
            "SELECT DISTINCT kind FROM edges"
        ).fetchall()
        return {r["kind"] for r in rows}

    @staticmethod
    def _chunks(values: list[str], size: int = 450):
        for i in range(0, len(values), size):
            yield values[i:i + size]

    def resolve_bare_calls(self, scope_files: Optional[set[str]] = None) -> dict:
        """Post-build batch resolution of unqualified CALLS targets.

        With ``scope_files`` set (incremental/sync), only the two ways a bare
        edge can newly become resolvable are reconsidered: bare CALLS inside the
        scoped files (their imports may have changed), and bare CALLS anywhere
        whose target name is defined by a scoped file (a new definition). The
        lookup caches are always built from only the referenced names/files, so
        even a full pass avoids loading the whole node/import table.

        Returns stats: {total_bare, resolved_unique, resolved_import, ambiguous, no_match}.
        """
        bare_by_id: dict[int, sqlite3.Row] = {}

        # Step 1: collect candidate bare CALLS edges (no :: = unresolved)
        if scope_files is None:
            rows = self._conn.execute(
                "SELECT id, source_qualified, target_qualified, file_path "
                "FROM edges WHERE kind = 'CALLS' AND target_qualified NOT LIKE '%::%'"
            ).fetchall()
            for r in rows:
                bare_by_id[r["id"]] = r
        else:
            scope = sorted({f.replace("\\", "/") for f in scope_files if f})
            for chunk in self._chunks(scope):
                placeholders = ",".join("?" for _ in chunk)
                rows = self._conn.execute(  # nosec B608
                    "SELECT id, source_qualified, target_qualified, file_path "
                    "FROM edges WHERE kind = 'CALLS' "
                    "AND target_qualified NOT LIKE '%::%' "
                    f"AND file_path IN ({placeholders})",
                    chunk,
                ).fetchall()
                for r in rows:
                    bare_by_id[r["id"]] = r

            # Names newly defined by the scoped files can resolve bare calls elsewhere
            new_names: set[str] = set()
            for chunk in self._chunks(scope):
                placeholders = ",".join("?" for _ in chunk)
                rows = self._conn.execute(  # nosec B608
                    "SELECT DISTINCT name FROM nodes "
                    "WHERE kind IN ('Function', 'Class') "
                    f"AND file_path IN ({placeholders})",
                    chunk,
                ).fetchall()
                new_names.update(r["name"] for r in rows)
            for chunk in self._chunks(sorted(new_names)):
                placeholders = ",".join("?" for _ in chunk)
                rows = self._conn.execute(  # nosec B608
                    "SELECT id, source_qualified, target_qualified, file_path "
                    "FROM edges WHERE kind = 'CALLS' "
                    "AND target_qualified NOT LIKE '%::%' "
                    f"AND target_qualified IN ({placeholders})",
                    chunk,
                ).fetchall()
                for r in rows:
                    bare_by_id[r["id"]] = r

        bare_edges = list(bare_by_id.values())
        if not bare_edges:
            return {"total_bare": 0, "resolved_unique": 0,
                    "resolved_import": 0, "ambiguous": 0, "no_match": 0}

        # Step 2: bare-name lookup for only the referenced names
        name_to_qns: dict[str, list[str]] = {}
        for chunk in self._chunks(sorted({e["target_qualified"] for e in bare_edges})):
            placeholders = ",".join("?" for _ in chunk)
            rows = self._conn.execute(  # nosec B608
                "SELECT name, qualified_name FROM nodes "
                "WHERE kind IN ('Function', 'Class') "
                f"AND name IN ({placeholders})",
                chunk,
            ).fetchall()
            for r in rows:
                name_to_qns.setdefault(r["name"], []).append(r["qualified_name"])

        # Step 3: imports for only the calling files present in the candidates
        import_cache: dict[str, set[str]] = {}
        for chunk in self._chunks(sorted({e["file_path"] for e in bare_edges})):
            placeholders = ",".join("?" for _ in chunk)
            rows = self._conn.execute(  # nosec B608
                "SELECT source_qualified, target_qualified FROM edges "
                "WHERE kind = 'IMPORTS_FROM' "
                f"AND source_qualified IN ({placeholders})",
                chunk,
            ).fetchall()
            for r in rows:
                import_cache.setdefault(r["source_qualified"], set()).add(
                    r["target_qualified"]
                )

        # Step 3b: one-hop re-export expansion so barrel imports
        # (``@scope/pkg`` → index that re-exports Button) count as in-scope.
        file_imports: dict[str, set[str]] = {}
        for chunk in self._chunks(sorted({t for ts in import_cache.values() for t in ts})):
            placeholders = ",".join("?" for _ in chunk)
            rows = self._conn.execute(  # nosec B608
                "SELECT source_qualified, target_qualified FROM edges "
                "WHERE kind = 'IMPORTS_FROM' "
                f"AND source_qualified IN ({placeholders})",
                chunk,
            ).fetchall()
            for r in rows:
                file_imports.setdefault(r["source_qualified"], set()).add(
                    r["target_qualified"]
                )

        scope_cache: dict[str, set[str]] = {}

        def _scope(caller_file: str) -> set[str]:
            cached = scope_cache.get(caller_file)
            if cached is not None:
                return cached
            direct = import_cache.get(caller_file, set())
            scope = {caller_file} | set(direct)
            for target in direct:
                scope |= file_imports.get(target, set())
            scope_cache[caller_file] = scope
            return scope

        # Step 4: Resolve edges — only to candidates a caller can actually
        # reach (same file, a direct import, or a one-hop re-export). A global
        # unique-name match outside that scope is a false cross-file link
        # (e.g. a local useState setter sharing a name with an unrelated
        # function elsewhere), so it stays bare.
        resolved_unique = 0
        resolved_import = 0
        ambiguous = 0
        no_match = 0
        unscoped = 0
        updates: list[tuple[str, int]] = []

        for edge in bare_edges:
            target_name = edge["target_qualified"]
            candidates = name_to_qns.get(target_name, [])
            if not candidates:
                no_match += 1
                continue

            scope = _scope(edge["file_path"])
            in_scope = [qn for qn in candidates if qn.split("::")[0] in scope]

            if len(in_scope) == 1:
                updates.append((in_scope[0], edge["id"]))
                resolved_unique += 1
            elif len(candidates) == 1:
                # Unique globally but unreachable from the caller → leave bare.
                unscoped += 1
            else:
                direct = import_cache.get(edge["file_path"], set())
                matched = [qn for qn in in_scope if qn.split("::")[0] in direct]
                if len(matched) == 1:
                    updates.append((matched[0], edge["id"]))
                    resolved_import += 1
                else:
                    ambiguous += 1

        # Step 5: Batch update resolved edges
        if updates:
            self._conn.executemany(
                "UPDATE edges SET target_qualified = ? WHERE id = ?", updates
            )
            self.commit()
            self._invalidate_cache()

        total_bare = len(bare_edges)
        logger.info(
            "resolve_bare_calls: %d bare → %d unique + %d import = %d resolved "
            "(%.0f%%), %d ambiguous, %d unscoped, %d no-match",
            total_bare, resolved_unique, resolved_import,
            resolved_unique + resolved_import,
            (resolved_unique + resolved_import) * 100 / max(total_bare, 1),
            ambiguous, unscoped, no_match,
        )

        return {
            "total_bare": total_bare,
            "resolved_unique": resolved_unique,
            "resolved_import": resolved_import,
            "ambiguous": ambiguous,
            "unscoped": unscoped,
            "no_match": no_match,
        }

    def search_nodes(self, query: str, limit: int = 20) -> list[GraphNode]:
        """Keyword search across node names with multi-word AND logic.

        Each word in the query must match independently (case-insensitive)
        against the node name or qualified name. For example,
        ``"firebase auth"`` matches ``verify_firebase_token`` and
        ``FirebaseAuth`` but not ``get_user``.
        """
        words = query.lower().split()
        if not words:
            return []

        if self._has_search_index():
            # FTS5 trigram serves the same substring semantics via its index
            # (LIKE is index-accelerated for 3+ char terms), preserving rowid
            # order so the pre-limit candidate set matches the scan fallback.
            conditions: list[str] = []
            params: list[str | int] = []
            for word in words:
                conditions.append("(f.name LIKE ? OR f.qualified_name LIKE ?)")
                params.extend([f"%{word}%", f"%{word}%"])
            where = " AND ".join(conditions)
            sql = (
                "SELECT n.* FROM nodes_fts f JOIN nodes n ON n.id = f.rowid "
                f"WHERE {where} ORDER BY f.rowid LIMIT ?"  # nosec B608
            )
            params.append(limit)
            rows = self._conn.execute(sql, params).fetchall()
            return [self._row_to_node(r) for r in rows]

        conditions: list[str] = []
        params: list[str | int] = []
        for word in words:
            conditions.append(
                "(LOWER(name) LIKE ? OR LOWER(qualified_name) LIKE ?)"
            )
            params.extend([f"%{word}%", f"%{word}%"])

        where = " AND ".join(conditions)
        sql = f"SELECT * FROM nodes WHERE {where} LIMIT ?"  # nosec B608
        params.append(limit)
        rows = self._conn.execute(sql, params).fetchall()
        return [self._row_to_node(r) for r in rows]

    # --- Impact / Graph traversal ---

    def get_impact_radius(
        self, changed_files: list[str], max_depth: int = 2, max_nodes: int = 500
    ) -> dict[str, Any]:
        """BFS from changed files to find all impacted nodes within depth N.

        Returns dict with:
          - changed_nodes: nodes in changed files
          - impacted_nodes: nodes reachable via edges
          - impacted_files: unique set of affected files
          - edges: connecting edges
        """
        # Seed: all qualified names in changed files (batched fetch)
        seeds = {n.qualified_name for n in self.get_nodes_by_files(changed_files)}

        # BFS outward through all edge types, reading one frontier level of
        # edges at a time from SQL (no whole-graph materialization).
        visited: set[str] = set()
        frontier = set(seeds)
        depth = 0
        impacted: set[str] = set()

        while frontier and depth < max_depth:
            next_frontier: set[str] = set()
            visited.update(frontier)
            # Forward edges (things this node affects)
            for e in self.get_edges_by_sources(list(frontier)):
                if e.target_qualified not in visited:
                    next_frontier.add(e.target_qualified)
                    impacted.add(e.target_qualified)
            # Reverse edges (things that depend on this node)
            for e in self.get_edges_by_targets(list(frontier)):
                if e.source_qualified not in visited:
                    next_frontier.add(e.source_qualified)
                    impacted.add(e.source_qualified)
            # Cap total nodes to prevent resource exhaustion on dense graphs
            if len(visited) + len(next_frontier) > max_nodes:
                break
            frontier = next_frontier
            depth += 1

        # Resolve to full node info (batch query instead of N+1)
        changed_nodes = self.get_nodes_by_qualified_names(list(seeds))

        impacted_qns = list(impacted - seeds)
        impacted_nodes = self.get_nodes_by_qualified_names(impacted_qns)

        # Truncation: cap impacted nodes and report total
        total_impacted = len(impacted_nodes)
        truncated = total_impacted > max_nodes
        if truncated:
            impacted_nodes = impacted_nodes[:max_nodes]

        impacted_files = list({n.file_path for n in impacted_nodes})

        # Collect relevant edges in a single batch query
        relevant_edges = []
        all_qns = seeds | {n.qualified_name for n in impacted_nodes}
        if all_qns:
            relevant_edges = self.get_edges_among(all_qns)

        return {
            "changed_nodes": changed_nodes,
            "impacted_nodes": impacted_nodes,
            "impacted_files": impacted_files,
            "edges": relevant_edges,
            "truncated": truncated,
            "total_impacted": total_impacted,
        }

    def get_subgraph(self, qualified_names: list[str]) -> dict[str, Any]:
        """Extract a subgraph containing the specified nodes and their connecting edges."""
        nodes = []
        for qn in qualified_names:
            node = self.get_node(qn)
            if node:
                nodes.append(node)

        edges = []
        qn_set = set(qualified_names)
        for qn in qualified_names:
            for e in self.get_edges_by_source(qn):
                if e.target_qualified in qn_set:
                    edges.append(e)

        return {"nodes": nodes, "edges": edges}

    def get_stats(self) -> GraphStats:
        """Return aggregate statistics about the graph."""
        total_nodes = self._conn.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
        total_edges = self._conn.execute("SELECT COUNT(*) FROM edges").fetchone()[0]

        nodes_by_kind: dict[str, int] = {}
        for row in self._conn.execute("SELECT kind, COUNT(*) as cnt FROM nodes GROUP BY kind"):
            nodes_by_kind[row["kind"]] = row["cnt"]

        edges_by_kind: dict[str, int] = {}
        for row in self._conn.execute("SELECT kind, COUNT(*) as cnt FROM edges GROUP BY kind"):
            edges_by_kind[row["kind"]] = row["cnt"]

        languages = [
            r["language"] for r in self._conn.execute(
                "SELECT DISTINCT language FROM nodes WHERE language IS NOT NULL AND language != ''"
            )
        ]

        files_count = self._conn.execute(
            "SELECT COUNT(*) FROM nodes WHERE kind = 'File'"
        ).fetchone()[0]

        last_updated = self.get_metadata("last_updated")

        return GraphStats(
            total_nodes=total_nodes,
            total_edges=total_edges,
            nodes_by_kind=nodes_by_kind,
            edges_by_kind=edges_by_kind,
            languages=languages,
            files_count=files_count,
            last_updated=last_updated,
        )

    def get_nodes_by_size(
        self,
        min_lines: int = 50,
        max_lines: int | None = None,
        kind: str | None = None,
        file_path_pattern: str | None = None,
        limit: int = 50,
    ) -> list[GraphNode]:
        """Find nodes within a line-count range, ordered largest first.

        Args:
            min_lines: Minimum line count threshold (inclusive).
            max_lines: Maximum line count threshold (inclusive). None = no upper bound.
            kind: Filter by node kind (Function, Class, File, etc.).
            file_path_pattern: SQL LIKE pattern to filter by file path.
            limit: Maximum results to return.

        Returns:
            List of GraphNode objects, ordered by line count descending.
        """
        conditions = [
            "line_start IS NOT NULL",
            "line_end IS NOT NULL",
            "(line_end - line_start + 1) >= ?",
        ]
        params: list = [min_lines]

        if max_lines is not None:
            conditions.append("(line_end - line_start + 1) <= ?")
            params.append(max_lines)
        if kind:
            conditions.append("kind = ?")
            params.append(kind)
        if file_path_pattern:
            conditions.append("file_path LIKE ?")
            params.append(f"%{file_path_pattern}%")

        params.append(limit)
        where = " AND ".join(conditions)
        rows = self._conn.execute(
            f"SELECT * FROM nodes WHERE {where} "  # nosec B608
            "ORDER BY (line_end - line_start + 1) DESC LIMIT ?",
            params,
        ).fetchall()
        return [self._row_to_node(r) for r in rows]

    # --- Public edge access (for visualization etc.) ---

    def get_all_edges(self) -> list[GraphEdge]:
        """Return all edges in the graph."""
        rows = self._conn.execute("SELECT * FROM edges").fetchall()
        return [self._row_to_edge(r) for r in rows]

    def get_edges_among(self, qualified_names: set[str]) -> list[GraphEdge]:
        """Return edges where both source and target are in the given set.

        Batches the source-side IN clause to stay under SQLite's default
        SQLITE_MAX_VARIABLE_NUMBER limit, then filters targets in Python.
        """
        if not qualified_names:
            return []
        qns = list(qualified_names)
        results: list[GraphEdge] = []
        batch_size = 450  # Stay well under SQLite's default 999 limit
        for i in range(0, len(qns), batch_size):
            batch = qns[i:i + batch_size]
            placeholders = ",".join("?" for _ in batch)
            rows = self._conn.execute(  # nosec B608
                f"SELECT * FROM edges WHERE source_qualified IN ({placeholders})",
                batch,
            ).fetchall()
            for r in rows:
                edge = self._row_to_edge(r)
                if edge.target_qualified in qualified_names:
                    results.append(edge)
        return results

    def find_shortest_path(
        self, source_qn: str, target_qn: str
    ) -> list[str] | None:
        """Find the shortest path between two nodes by hop count.

        Uses a bounded, batched SQL BFS (directed, then undirected) instead of
        materializing the whole graph. Returns qualified names source→target,
        or None when either endpoint is absent or no path exists.
        """
        if source_qn == target_qn:
            return [source_qn]
        path = self._bfs_shortest_path(source_qn, target_qn, undirected=False)
        if path is not None:
            return path
        # Connections go both ways in investigation — retry undirected.
        return self._bfs_shortest_path(source_qn, target_qn, undirected=True)

    def _bfs_shortest_path(
        self, source: str, target: str, undirected: bool
    ) -> list[str] | None:
        visited = {source}
        parent: dict[str, str] = {}
        frontier = [source]
        while frontier:
            frontier_set = set(frontier)
            if undirected:
                edges = (
                    self.get_edges_by_sources(frontier)
                    + self.get_edges_by_targets(frontier)
                )
                pairs = []
                for e in edges:
                    pairs.append((e.source_qualified, e.target_qualified))
                    pairs.append((e.target_qualified, e.source_qualified))
            else:
                pairs = [
                    (e.source_qualified, e.target_qualified)
                    for e in self.get_edges_by_sources(frontier)
                ]
            next_frontier: list[str] = []
            for a, b in pairs:
                if a not in frontier_set or b in visited:
                    continue
                visited.add(b)
                parent[b] = a
                if b == target:
                    path = [b]
                    cur = b
                    while cur in parent:
                        cur = parent[cur]
                        path.append(cur)
                    path.reverse()
                    return path
                next_frontier.append(b)
            frontier = next_frontier
        return None

    # --- Internal helpers ---

    def _row_to_node(self, row: sqlite3.Row) -> GraphNode:
        return GraphNode(
            id=row["id"],
            kind=row["kind"],
            name=row["name"],
            qualified_name=row["qualified_name"],
            file_path=row["file_path"],
            line_start=row["line_start"],
            line_end=row["line_end"],
            language=row["language"] or "",
            parent_name=row["parent_name"],
            params=row["params"],
            return_type=row["return_type"],
            modifiers=row["modifiers"],
            is_test=bool(row["is_test"]),
            file_hash=row["file_hash"],
            extra=json.loads(row["extra"]) if row["extra"] else {},
        )

    def _row_to_edge(self, row: sqlite3.Row) -> GraphEdge:
        return GraphEdge(
            id=row["id"],
            kind=row["kind"],
            source_qualified=row["source_qualified"],
            target_qualified=row["target_qualified"],
            file_path=row["file_path"],
            line=row["line"],
            extra=json.loads(row["extra"]) if row["extra"] else {},
        )


def _sanitize_name(s: str, max_len: int = 256) -> str:
    """Strip ASCII control characters and truncate to prevent prompt injection.

    Node names extracted from source code could contain adversarial strings
    (e.g. ``IGNORE_ALL_PREVIOUS_INSTRUCTIONS``).  This function removes control
    characters (0x00-0x1F except tab and newline) and enforces a length limit so
    that names flowing through MCP tool responses cannot easily influence AI
    agent behaviour.
    """
    # Strip control chars 0x00-0x1F except \t (0x09) and \n (0x0A)
    cleaned = "".join(
        ch for ch in s
        if ch in ("\t", "\n") or ord(ch) >= 0x20
    )
    return cleaned[:max_len]


def node_to_dict(n: GraphNode) -> dict:
    return {
        "id": n.id, "kind": n.kind, "name": _sanitize_name(n.name),
        "qualified_name": _sanitize_name(n.qualified_name), "file_path": n.file_path,
        "line_start": n.line_start, "line_end": n.line_end,
        "language": n.language,
        "parent_name": _sanitize_name(n.parent_name) if n.parent_name else n.parent_name,
        "is_test": n.is_test,
    }


def edge_to_dict(e: GraphEdge) -> dict:
    return {
        "id": e.id, "kind": e.kind,
        "source": _sanitize_name(e.source_qualified),
        "target": _sanitize_name(e.target_qualified),
        "file_path": e.file_path, "line": e.line,
    }


# ---------------------------------------------------------------------------
# Compact output helpers (--compact flag)
# ---------------------------------------------------------------------------


def _to_relative(path: str, root: str) -> str:
    """Strip repo root prefix, normalize to forward slashes."""
    try:
        return str(Path(path).relative_to(root)).replace("\\", "/")
    except ValueError:
        return path.replace("\\", "/")


def _short_name(qualified: str, root: str) -> str:
    """Extract a short display name from a qualified name or path.

    Handles three input types:
    - Plain function name ('EnsureOrgUnitAssignmentIntegrity') -> returned as-is
    - Qualified name ('file.cs::ClassName.FuncName') -> extracts func + service
    - File path ('D:\\...\\File.cs') -> extracts filename + service
    """
    # Plain function name — no path separators or qualifiers
    if "/" not in qualified and "\\" not in qualified and "::" not in qualified:
        return _sanitize_name(qualified)

    # Qualified function name (file.cs::Class.Func)
    if "::" in qualified:
        func_name = qualified.split("::")[-1]
        file_part = qualified.split("::")[0]
        rel = _to_relative(file_part, root)
        if "src/Services/" in rel:
            parts = rel.split("/")
            svc_idx = parts.index("Services") + 1
            if svc_idx < len(parts):
                return _sanitize_name(f"{func_name} ({parts[svc_idx]})")
        return _sanitize_name(func_name)

    # File path — extract filename + service context
    name = Path(qualified).name
    rel = _to_relative(qualified, root)
    if "src/Services/" in rel:
        parts = rel.split("/")
        svc_idx = parts.index("Services") + 1
        if svc_idx < len(parts):
            return _sanitize_name(f"{name} ({parts[svc_idx]})")
    return _sanitize_name(name)


def node_to_compact_dict(n: GraphNode, root: str, node_mode: str = "file") -> dict:
    """Compact node: only name + relative path (+ line/kind for function mode)."""
    rel_path = _to_relative(n.file_path, root)
    name = Path(n.file_path).name if n.kind == "File" else _sanitize_name(n.name)
    result: dict = {"name": name, "path": rel_path}
    if node_mode != "file" and n.line_start:
        result["line"] = n.line_start
    if node_mode != "file":
        result["kind"] = n.kind
    return result


def edge_to_compact_dict(e: GraphEdge, root: str) -> dict:
    """Compact edge: kind + short from/to names (no ids, no redundant paths)."""
    result: dict = {"kind": e.kind}
    result["from"] = _short_name(e.source_qualified, root)
    result["to"] = _short_name(e.target_qualified, root)
    if e.line and e.line > 0:
        result["line"] = e.line
    return result
