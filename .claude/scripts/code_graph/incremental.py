"""Incremental graph update logic.

Detects changed files via git diff, re-parses only changed + impacted files,
and updates the graph accordingly. Also supports CLI invocation for hooks.
"""

from __future__ import annotations

import fnmatch
import hashlib
import json
import logging
import os
import subprocess
import time
from pathlib import Path
from typing import Optional

from .graph import GraphStore
from .parser import CodeParser


# ---------------------------------------------------------------------------
# Project config location — the SAME resolution the hooks use.
#
# Mirrors `.claude/hooks/lib/ck-config-loader.cjs` (`loadConfig` layer order and
# `sanitizeConfig`) and `.claude/hooks/lib/project-config-loader.cjs`
# (`getConfiguredProjectConfigPath`, `getProjectConfigStatus`). Two readers of
# one setting must agree, or the CLI answers graph queries in a project whose
# hooks treat the graph as off. The cross-language parity suite
# `.claude/hooks/tests/suites/code-graph-config-agreement.test.cjs` pins both.
# ---------------------------------------------------------------------------

DEFAULT_PROJECT_CONFIG_PATH = "docs/project-config.json"

# Lowest priority first: user-global, project, project-local override.
_CK_CONFIG_LAYERS = (
    lambda root: Path.home() / ".claude" / ".ck.json",
    lambda root: root / ".claude" / ".ck.json",
    lambda root: root / ".claude" / ".ck.local.json",
)


def _reject_json_constant(name: str):
    # JSON.parse rejects NaN/Infinity; json.loads accepts them unless told otherwise.
    raise ValueError(f"invalid JSON constant {name}")


def _read_json_file(path: Path):
    """`loadConfigFromPath`: parsed JSON, or None when absent or unreadable."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
        return json.loads(text, parse_constant=_reject_json_constant)
    except (OSError, ValueError):
        return None


def _node_is_absolute(value: str) -> bool:
    """`path.isAbsolute` of the host OS (Python 3.13 no longer treats a rooted Windows path as absolute)."""
    if os.name == "nt":
        return value[:1] in ("/", "\\") or (
            len(value) >= 3 and value[0].isalpha() and value[1] == ":" and value[2] in ("/", "\\")
        )
    return value.startswith("/")


def _sanitize_path(value, project_root: str) -> Optional[str]:
    """`ck-path-utils.sanitizePath`: keep absolute values, reject relative values that escape the root."""
    if not isinstance(value, str):
        return None
    normalized = value.strip().rstrip("/\\")
    if not normalized or "\x00" in normalized:
        return None
    if _node_is_absolute(normalized):
        return normalized
    resolved = os.path.abspath(os.path.join(project_root, normalized))
    if resolved != project_root and not resolved.startswith(project_root + os.sep):
        return None
    return normalized


def configured_project_config_path(root: Path) -> Path:
    """The project config path the hooks resolve, whether or not the file exists.

    Precedence (highest first): `.claude/.ck.local.json`, `.claude/.ck.json`,
    `~/.claude/.ck.json` — key `portability.projectConfigPath` — then the
    default `docs/project-config.json`. A value that is not a string, is blank,
    or is relative and escapes the project root falls back to the default.
    """
    project_root = os.path.abspath(str(root))
    declared = DEFAULT_PROJECT_CONFIG_PATH
    portability_is_object = True
    for layer_path in _CK_CONFIG_LAYERS:
        layer = _read_json_file(layer_path(root))
        # deepMerge ignores a falsy, primitive or array layer for the `portability` key.
        if not isinstance(layer, dict) or "portability" not in layer:
            continue
        section = layer["portability"]
        if isinstance(section, dict):
            if "projectConfigPath" in section:
                declared = section["projectConfigPath"]
            elif not portability_is_object:
                declared = None
            portability_is_object = True
        else:
            # A non-object `portability` replaces the merged section; sanitizeConfig then
            # finds no projectConfigPath and restores the default.
            portability_is_object = False
            declared = None
    if not _sanitize_path(declared, project_root):
        declared = DEFAULT_PROJECT_CONFIG_PATH
    if _node_is_absolute(declared):
        return Path(declared)
    return Path(os.path.normpath(project_root + os.sep + declared))


def find_project_config(root: Path) -> Optional[Path]:
    """The configured project config file, or None when it does not exist."""
    candidate = configured_project_config_path(root)
    return candidate if candidate.is_file() else None


_PROJECT_CONFIG_CACHE: dict[str, tuple[float, dict]] = {}


def load_project_config(root: Path) -> dict:
    """Load the configured project config. Returns {} when missing, unreadable or not an object.

    Cached per resolved path and mtime so the 2-3 reads in one invocation
    parse the file once; a changed file (new mtime) is always re-read.
    """
    config_path = find_project_config(root)
    if not config_path:
        return {}
    try:
        mtime = config_path.stat().st_mtime
    except OSError:
        return {}
    cache_key = str(config_path)
    cached = _PROJECT_CONFIG_CACHE.get(cache_key)
    if cached is not None and cached[0] == mtime:
        return cached[1]
    data = _read_json_file(config_path)
    if not isinstance(data, dict):
        return {}
    _PROJECT_CONFIG_CACHE[cache_key] = (mtime, data)
    return data


def _call_noise_extra(repo_root: Path) -> Optional[dict]:
    """Extract graphSettings.callNoiseFilter as {lang: frozenset} or None."""
    config = load_project_config(repo_root)
    noise_config = config.get("graphSettings", {}).get("callNoiseFilter", {})
    if not noise_config:
        return None
    extra_noise = {
        lang: frozenset(entries)
        for lang, entries in noise_config.items()
        if isinstance(entries, list) and entries
    }
    return extra_noise or None


def _resolver_snapshot(repo_root: Path) -> Optional[dict]:
    """Picklable module-resolution snapshot (aliases + workspace packages)."""
    try:
        from .resolver import build_resolver_snapshot
        return build_resolver_snapshot(repo_root, load_project_config(repo_root))
    except Exception as exc:  # noqa: BLE001 - resolution is best-effort
        logger.warning("Module resolver unavailable (%s); using relative-only resolution", exc)
        return None


def _make_parser(repo_root: Path) -> CodeParser:
    """Create a CodeParser with project-specific call noise + module resolver.

    Reads optional graphSettings.callNoiseFilter and discovers tsconfig path
    aliases / workspace packages so imported symbols resolve to real files.
    Falls back to engine defaults if no config exists.
    """
    from .resolver import ModuleResolver

    snapshot = _resolver_snapshot(repo_root)
    resolver = ModuleResolver.from_snapshot(snapshot)
    return CodeParser(
        call_noise_extra=_call_noise_extra(repo_root),
        module_resolver=resolver,
    )


# ---------------------------------------------------------------------------
# Parallel file parsing (F8)
# ---------------------------------------------------------------------------

_WORKER_NOISE: Optional[dict] = None
_WORKER_RESOLVER_SNAPSHOT: Optional[dict] = None


def _init_parse_worker(noise_extra: Optional[dict], resolver_snapshot: Optional[dict] = None) -> None:
    global _WORKER_NOISE, _WORKER_RESOLVER_SNAPSHOT
    _WORKER_NOISE = noise_extra
    _WORKER_RESOLVER_SNAPSHOT = resolver_snapshot


def _parse_job(job: tuple[str, str, Optional[str]]) -> tuple:
    """Parse one file in a worker process.

    Returns ``(rel_path, fhash, nodes, edges, error)``. When ``expected_hash``
    matches the file's content hash, ``nodes``/``edges`` are ``None`` to signal
    "unchanged, skip storing". The tree-sitter parser is created lazily inside
    the worker (native objects are not picklable).
    """
    rel_path, abs_path, expected_hash = job
    try:
        from .parser import CodeParser  # lazy: workers only pay this when parsing
        from .resolver import ModuleResolver

        resolver = ModuleResolver.from_snapshot(_WORKER_RESOLVER_SNAPSHOT)
        parser = CodeParser(call_noise_extra=_WORKER_NOISE, module_resolver=resolver)
        path = Path(abs_path)
        source = path.read_bytes()
        fhash = hashlib.sha256(source).hexdigest()
        if expected_hash is not None and fhash == expected_hash:
            return (rel_path, fhash, None, None, None)
        nodes, edges = parser.parse_bytes(path, source)
        return (rel_path, fhash, nodes, edges, None)
    except (OSError, PermissionError) as e:
        return (rel_path, None, None, None, str(e))
    except Exception as e:  # noqa: BLE001 - isolate a bad file from the batch
        return (rel_path, None, None, None, str(e))


def _parse_workers(n_jobs: int) -> int:
    """Bounded worker count; ``CRG_PARSE_WORKERS`` overrides (1 disables)."""
    raw = os.environ.get("CRG_PARSE_WORKERS")
    if raw is not None:
        try:
            return max(1, int(raw))
        except ValueError:
            return 1
    if n_jobs < 200:
        return 1
    return min(4, os.cpu_count() or 1)


def _run_parse_jobs(
    jobs: list[tuple],
    noise_extra: Optional[dict],
    resolver_snapshot: Optional[dict] = None,
) -> list[tuple]:
    """Run parse jobs with a bounded process pool, falling back to serial."""
    workers = _parse_workers(len(jobs))
    if workers <= 1:
        _init_parse_worker(noise_extra, resolver_snapshot)
        return [_parse_job(j) for j in jobs]
    try:
        from concurrent.futures import ProcessPoolExecutor

        with ProcessPoolExecutor(
            max_workers=workers,
            initializer=_init_parse_worker,
            initargs=(noise_extra, resolver_snapshot),
        ) as executor:
            return list(executor.map(_parse_job, jobs))
    except Exception as exc:  # pragma: no cover - environment dependent
        logger.warning("Parallel parse unavailable (%s); falling back to serial", exc)
        _init_parse_worker(noise_extra, resolver_snapshot)
        return [_parse_job(j) for j in jobs]

logger = logging.getLogger(__name__)

# Default ignore patterns (in addition to .gitignore)
DEFAULT_IGNORE_PATTERNS = [
    ".code-graph/**",
    "node_modules/**",
    ".git/**",
    "__pycache__/**",
    "*.pyc",
    ".venv/**",
    "venv/**",
    "dist/**",
    "build/**",
    ".next/**",
    "target/**",
    "*.min.js",
    "*.min.css",
    "*.map",
    "*.lock",
    "package-lock.json",
    "yarn.lock",
    "*.db",
    "*.sqlite",
    "*.db-journal",
    "*.db-wal",
]


def find_repo_root(start: Path | None = None) -> Optional[Path]:
    """Walk up from start to find the nearest .git directory."""
    current = start or Path.cwd()
    while current != current.parent:
        if (current / ".git").exists():
            return current
        current = current.parent
    if (current / ".git").exists():
        return current
    return None


def find_project_root(start: Path | None = None) -> Path:
    """Find the project root: git repo root if available, otherwise cwd."""
    root = find_repo_root(start)
    if root:
        return root
    return start or Path.cwd()


_INNER_GITIGNORE_CONTENT = (
    "# Auto-generated by code-graph — do not commit database files.\n"
    "# The graph.db contains repo-relative paths and code structure metadata.\n"
    "*\n"
)


def _ensure_inner_gitignore(inner_gitignore: Path) -> None:
    """Create the owned ignore file as UTF-8 and repair malformed legacy copies."""
    if inner_gitignore.exists():
        try:
            inner_gitignore.read_bytes().decode("utf-8")
            return
        except UnicodeDecodeError:
            pass

    inner_gitignore.write_text(
        _INNER_GITIGNORE_CONTENT,
        encoding="utf-8",
        newline="\n",
    )


def get_db_path(repo_root: Path) -> Path:
    """Determine the database path for a repository.

    Creates the ``.code-graph/`` directory and an inner ``.gitignore``
    (with ``*``) so generated files are never committed.  If a legacy
    ``.code-graph.db`` exists at the repo root the database is migrated
    into the new directory (WAL/SHM side-files are discarded).
    """
    crg_dir = repo_root / ".code-graph"
    new_db = crg_dir / "graph.db"

    # Ensure directory exists
    crg_dir.mkdir(exist_ok=True)

    # Auto-create .gitignore inside the directory and self-heal legacy files
    # written with a Windows locale encoding.
    inner_gitignore = crg_dir / ".gitignore"
    _ensure_inner_gitignore(inner_gitignore)

    # Migrate legacy database if present
    legacy_db = repo_root / ".code-graph.db"
    if legacy_db.exists() and not new_db.exists():
        legacy_db.rename(new_db)
    # Discard stale WAL/SHM side-files from the old location
    for suffix in ("-wal", "-shm", "-journal"):
        side = repo_root / f".code-graph.db{suffix}"
        if side.exists():
            side.unlink()

    return new_db


def _load_ignore_patterns(repo_root: Path) -> list[str]:
    """Load ignore patterns from .code-graphignore file."""
    patterns = list(DEFAULT_IGNORE_PATTERNS)
    ignore_file = repo_root / ".code-graphignore"
    if ignore_file.exists():
        for line in ignore_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                patterns.append(line)
    return patterns


def _should_ignore(path: str, patterns: list[str]) -> bool:
    """Check if a path matches any ignore pattern."""
    return any(fnmatch.fnmatch(path, p) for p in patterns)


def _is_binary(path: Path) -> bool:
    """Quick heuristic: check if file appears to be binary."""
    try:
        with path.open("rb") as fh:
            chunk = fh.read(8192)
        return b"\x00" in chunk
    except (OSError, PermissionError):
        return True


try:
    _GIT_TIMEOUT = int(os.environ.get("CRG_GIT_TIMEOUT", "30"))
except ValueError:
    _GIT_TIMEOUT = 30


def get_changed_files(repo_root: Path, base: str = "HEAD~1") -> list[str]:
    """Get list of changed files via git diff."""
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", base],
            capture_output=True,
            text=True,
            cwd=str(repo_root),
            timeout=_GIT_TIMEOUT,
        )
        if result.returncode != 0:
            # Fallback: try diff against empty tree (initial commit)
            result = subprocess.run(
                ["git", "diff", "--name-only", "--cached"],
                capture_output=True,
                text=True,
                cwd=str(repo_root),
                timeout=_GIT_TIMEOUT,
            )
        files = [f.strip() for f in result.stdout.splitlines() if f.strip()]
        return files
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return []


def get_staged_and_unstaged(repo_root: Path) -> list[str]:
    """Get all modified files (staged + unstaged + untracked)."""
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True,
            text=True,
            cwd=str(repo_root),
            timeout=_GIT_TIMEOUT,
        )
        files = []
        for line in result.stdout.splitlines():
            if len(line) > 3:
                entry = line[3:].strip()
                # Handle renamed files: "R  old -> new"
                if " -> " in entry:
                    entry = entry.split(" -> ", 1)[1]
                files.append(entry)
        return files
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return []


def get_all_tracked_files(repo_root: Path) -> list[str]:
    """Get all files tracked by git."""
    try:
        result = subprocess.run(
            ["git", "ls-files"],
            capture_output=True,
            text=True,
            cwd=str(repo_root),
            timeout=_GIT_TIMEOUT,
        )
        return [f.strip() for f in result.stdout.splitlines() if f.strip()]
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return []


def collect_all_files(repo_root: Path) -> list[str]:
    """Collect all parseable files in the repo, respecting ignore patterns."""
    ignore_patterns = _load_ignore_patterns(repo_root)
    parser = _make_parser(repo_root)
    files = []

    # Prefer git ls-files for tracked files
    tracked = get_all_tracked_files(repo_root)
    if tracked:
        candidates = tracked
    else:
        # Fallback: walk directory
        candidates = [
            str(p.relative_to(repo_root))
            for p in repo_root.rglob("*")
            if p.is_file()
        ]

    for rel_path in candidates:
        if _should_ignore(rel_path, ignore_patterns):
            continue
        full_path = repo_root / rel_path
        if not full_path.is_file():
            continue
        if full_path.is_symlink():
            continue
        if parser.detect_language(full_path) is None:
            continue
        if _is_binary(full_path):
            continue
        files.append(rel_path)

    return files


def find_dependents(store: GraphStore, file_path: str) -> list[str]:
    """Find files that import from or depend on the given file.

    Looks at IMPORTS_FROM edges where target matches the file path.
    """
    dependents = set()
    # Find edges where someone imports from this file
    edges = store.get_edges_by_target(file_path)
    for e in edges:
        if e.kind == "IMPORTS_FROM":
            # The source is a file path (for IMPORTS_FROM edges)
            dependents.add(e.file_path)

    # Also check for DEPENDS_ON edges
    nodes = store.get_nodes_by_file(file_path)
    for node in nodes:
        for e in store.get_edges_by_target(node.qualified_name):
            if e.kind in ("CALLS", "IMPORTS_FROM", "INHERITS", "IMPLEMENTS"):
                dependents.add(e.file_path)

    dependents.discard(file_path)
    return list(dependents)


def full_build(repo_root: Path, store: GraphStore) -> dict:
    """Full rebuild of the entire graph."""
    files = collect_all_files(repo_root)
    noise_extra = _call_noise_extra(repo_root)
    resolver_snapshot = _resolver_snapshot(repo_root)

    # Purge stale data from files no longer on disk
    existing_files = set(store.get_all_files())
    current_files = {f.replace("\\", "/") for f in files}
    for stale in existing_files - current_files:
        store.remove_file_data(stale)

    jobs = [
        (rel_path.replace("\\", "/"), str(repo_root / rel_path), None)
        for rel_path in files
    ]
    results = _run_parse_jobs(jobs, noise_extra, resolver_snapshot)

    total_nodes = 0
    total_edges = 0
    errors = []
    for rel_path, fhash, nodes, edges, err in results:
        if err:
            logger.warning("Error parsing %s: %s", rel_path, err)
            errors.append({"file": rel_path, "error": err})
            continue
        store.store_file_nodes_edges(rel_path, nodes or [], edges or [], fhash or "")
        total_nodes += len(nodes or [])
        total_edges += len(edges or [])
    logger.info("Full build: %d/%d files stored", len(files) - len(errors), len(files))

    store.set_metadata("last_updated", time.strftime("%Y-%m-%dT%H:%M:%S"))
    store.set_metadata("last_build_type", "full")
    head = get_current_head(repo_root)
    if head:
        store.set_metadata("last_synced_commit", head)
    store.commit()

    # Post-build: resolve bare CALLS targets against global node table
    resolution_stats = store.resolve_bare_calls()

    return {
        "files_parsed": len(files),
        "total_nodes": total_nodes,
        "total_edges": total_edges,
        "errors": errors,
        "call_resolution": resolution_stats,
    }


def incremental_update(
    repo_root: Path,
    store: GraphStore,
    base: str = "HEAD~1",
    changed_files: list[str] | None = None,
) -> dict:
    """Incremental update: re-parse changed + dependent files only."""
    parser = _make_parser(repo_root)
    ignore_patterns = _load_ignore_patterns(repo_root)

    # Determine changed files
    if changed_files is None:
        changed_files = get_changed_files(repo_root, base)

    if not changed_files:
        return {
            "files_updated": 0,
            "total_nodes": 0,
            "total_edges": 0,
            "changed_files": [],
            "dependent_files": [],
        }

    # Find dependent files (files that import from changed files)
    dependent_files: set[str] = set()
    for rel_path in changed_files:
        normalized_rel = rel_path.replace("\\", "/")
        deps = find_dependents(store, normalized_rel)
        for d in deps:
            dependent_files.add(d.replace("\\", "/"))

    # Combine changed + dependent
    all_files = {f.replace("\\", "/") for f in changed_files} | dependent_files

    total_nodes = 0
    total_edges = 0
    errors = []
    reparsed_files: set[str] = set()

    noise_extra = _call_noise_extra(repo_root)
    resolver_snapshot = _resolver_snapshot(repo_root)
    jobs = []
    for rel_path in all_files:
        if _should_ignore(rel_path, ignore_patterns):
            continue
        abs_path = repo_root / rel_path
        if not abs_path.is_file():
            # File was deleted
            store.remove_file_data(rel_path.replace("\\", "/"))
            continue
        if parser.detect_language(abs_path) is None:
            continue
        jobs.append((
            rel_path.replace("\\", "/"),
            str(abs_path),
            store.get_file_hash(rel_path.replace("\\", "/")),
        ))

    for rel_path, fhash, nodes, edges, err in _run_parse_jobs(jobs, noise_extra, resolver_snapshot):
        if err:
            logger.warning("Error parsing %s: %s", rel_path, err)
            errors.append({"file": rel_path, "error": err})
            continue
        if nodes is None:
            # Unchanged file (content hash matched) — skip storing
            continue
        store.store_file_nodes_edges(rel_path, nodes, edges or [], fhash or "")
        total_nodes += len(nodes)
        total_edges += len(edges or [])
        reparsed_files.add(rel_path)

    store.set_metadata("last_updated", time.strftime("%Y-%m-%dT%H:%M:%S"))
    store.set_metadata("last_build_type", "incremental")
    head = get_current_head(repo_root)
    if head:
        store.set_metadata("last_synced_commit", head)
    store.commit()

    # Post-update: resolve bare CALLS, scoped to the files actually re-parsed
    resolution_stats = store.resolve_bare_calls(reparsed_files)

    return {
        "files_updated": len(all_files),
        "files_reparsed": len(reparsed_files),
        "total_nodes": total_nodes,
        "total_edges": total_edges,
        "changed_files": list(changed_files),
        "dependent_files": list(dependent_files),
        "errors": errors,
        "call_resolution": resolution_stats,
    }


# ---------------------------------------------------------------------------
# Git-aware sync
# ---------------------------------------------------------------------------


def get_current_head(repo_root: Path) -> str | None:
    """Get the current HEAD commit hash."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True, text=True,
            cwd=str(repo_root), timeout=_GIT_TIMEOUT,
        )
        return result.stdout.strip() if result.returncode == 0 else None
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None


def _is_ancestor(repo_root: Path, maybe_ancestor: str, descendant: str) -> bool:
    """True only when `maybe_ancestor` is a strict-or-equal ancestor of `descendant`.

    Wraps `git merge-base --is-ancestor`, whose exit codes are: 0 = yes, 1 = no,
    anything else = error (e.g. either commit missing locally after a force-push).
    Only exit 0 answers yes — an error must NOT be read as "yes", or an
    unreachable commit would silently suppress a needed resync.
    """
    try:
        result = subprocess.run(
            ["git", "merge-base", "--is-ancestor", maybe_ancestor, descendant],
            capture_output=True, text=True,
            cwd=str(repo_root), timeout=_GIT_TIMEOUT,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def _get_git_diff_files(repo_root: Path, old_ref: str, new_ref: str) -> dict[str, list[str]]:
    """Get files changed between two git refs, categorized by status.

    Returns dict with keys: added, modified, deleted.
    """
    try:
        result = subprocess.run(
            ["git", "diff", "--name-status", f"{old_ref}..{new_ref}"],
            capture_output=True, text=True,
            cwd=str(repo_root), timeout=_GIT_TIMEOUT,
        )
        if result.returncode != 0:
            return {"added": [], "modified": [], "deleted": [], "error": "diff failed"}
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return {"added": [], "modified": [], "deleted": [], "error": "git unavailable"}

    added, modified, deleted = [], [], []
    for line in result.stdout.splitlines():
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        status = parts[0].strip()
        if status.startswith("R") or status.startswith("C"):
            # Rename/Copy: R100\told_path\tnew_path — track new path as modified, old as deleted
            if len(parts) >= 3:
                deleted.append(parts[1].strip())
                modified.append(parts[2].strip())
            else:
                modified.append(parts[1].strip())
        elif status.startswith("A"):
            added.append(parts[1].strip())
        elif status.startswith("D"):
            deleted.append(parts[1].strip())
        elif status.startswith(("M", "T")):
            modified.append(parts[1].strip())
    return {"added": added, "modified": modified, "deleted": deleted}


def _find_untracked_files(repo_root: Path, store: GraphStore, all_files: list[str]) -> list[str]:
    """Find files on disk that exist but are not in the graph (never synced)."""
    graph_files = {f.replace("\\", "/") for f in store.get_all_files()}
    untracked = []
    for rel_path in all_files:
        normalized_rel = rel_path.replace("\\", "/")
        if normalized_rel not in graph_files:
            untracked.append(rel_path)
    return untracked


def sync_with_git(repo_root: Path, store: GraphStore) -> dict:
    """Sync graph with git state by diffing last_synced_commit against HEAD.

    Detects files changed via git pull/checkout/merge and updates the graph.
    """
    parser = _make_parser(repo_root)
    ignore_patterns = _load_ignore_patterns(repo_root)

    current_head = get_current_head(repo_root)
    if not current_head:
        return {"status": "skip", "reason": "not a git repository or git unavailable"}

    last_synced = store.get_metadata("last_synced_commit")

    # First-time sync: no stored commit
    if not last_synced:
        all_files = collect_all_files(repo_root)
        untracked = _find_untracked_files(repo_root, store, all_files)
        if not untracked:
            store.set_metadata("last_synced_commit", current_head)
            store.commit()
            return {"status": "ok", "reason": "first sync — graph already covers all files",
                    "synced_commit": current_head, "files_synced": 0}
        # Parse untracked files
        total_nodes, total_edges, errors = 0, 0, []
        jobs = []
        for rel_path in untracked:
            if _should_ignore(rel_path, ignore_patterns):
                continue
            abs_path = repo_root / rel_path
            if not abs_path.is_file() or parser.detect_language(abs_path) is None:
                continue
            jobs.append((rel_path.replace("\\", "/"), str(abs_path), None))
        for rel_path, fhash, nodes, edges, err in _run_parse_jobs(
            jobs, _call_noise_extra(repo_root), _resolver_snapshot(repo_root)
        ):
            if err:
                errors.append({"file": rel_path, "error": err})
                continue
            store.store_file_nodes_edges(rel_path, nodes or [], edges or [], fhash or "")
            total_nodes += len(nodes or [])
            total_edges += len(edges or [])
        store.set_metadata("last_synced_commit", current_head)
        store.set_metadata("last_updated", time.strftime("%Y-%m-%dT%H:%M:%S"))
        store.commit()
        return {"status": "ok", "reason": "first sync — added missing files",
                "synced_commit": current_head, "files_synced": len(untracked),
                "total_nodes": total_nodes, "total_edges": total_edges, "errors": errors}

    # Same commit — already synced
    if last_synced == current_head:
        return {"status": "ok", "reason": "up_to_date", "synced_commit": current_head,
                "files_synced": 0}

    # HEAD is behind the graph — checked out an older branch/commit that the
    # graph already covers. Do nothing: leave the nodes and last_synced_commit
    # alone rather than re-parsing backwards. Without this, `git diff A..B`
    # succeeds in BOTH directions, so an older checkout would silently rewrite
    # the graph to the older tree and drag last_synced_commit backwards with it.
    # Diverged branches are NOT "behind" (neither commit is an ancestor of the
    # other), so they still fall through and sync normally.
    if _is_ancestor(repo_root, current_head, last_synced):
        return {"status": "ok", "reason": "graph_ahead_skipped",
                "synced_commit": last_synced, "head_commit": current_head,
                "files_synced": 0}

    # Different commit — diff and sync
    diff = _get_git_diff_files(repo_root, last_synced, current_head)
    if "error" in diff:
        # Unreachable commit (rebase/force-push) — fall back to full rebuild
        logger.warning("Git diff failed (%s), falling back to full rebuild", diff["error"])
        result = full_build(repo_root, store)
        store.set_metadata("last_synced_commit", current_head)
        store.commit()
        return {"status": "ok", "reason": "full_rebuild_fallback",
                "synced_commit": current_head, **result}

    all_changed = diff["added"] + diff["modified"]
    total_nodes, total_edges, errors = 0, 0, []
    reparsed_files: set[str] = set()

    # Remove deleted files from graph
    for rel_path in diff["deleted"]:
        store.remove_file_data(rel_path.replace("\\", "/"))

    # Find dependent files (files that import from changed files)
    dependent_files: set[str] = set()
    for rel_path in all_changed:
        normalized_rel = rel_path.replace("\\", "/")
        deps = find_dependents(store, normalized_rel)
        for d in deps:
            dependent_files.add(d.replace("\\", "/"))
    # Combine changed + dependent, excluding already-deleted
    all_to_parse = set(all_changed) | dependent_files

    # Parse changed/added/dependent files
    jobs = []
    for rel_path in all_to_parse:
        if _should_ignore(rel_path, ignore_patterns):
            continue
        abs_path = repo_root / rel_path
        if not abs_path.is_file():
            continue
        if parser.detect_language(abs_path) is None:
            continue
        jobs.append((
            rel_path.replace("\\", "/"),
            str(abs_path),
            store.get_file_hash(rel_path.replace("\\", "/")),
        ))
    for rel_path, fhash, nodes, edges, err in _run_parse_jobs(
        jobs, _call_noise_extra(repo_root), _resolver_snapshot(repo_root)
    ):
        if err:
            errors.append({"file": rel_path, "error": err})
            continue
        if nodes is None:
            continue  # unchanged (hash match)
        store.store_file_nodes_edges(rel_path, nodes, edges or [], fhash or "")
        total_nodes += len(nodes)
        total_edges += len(edges or [])
        reparsed_files.add(rel_path)

    store.set_metadata("last_synced_commit", current_head)
    store.set_metadata("last_updated", time.strftime("%Y-%m-%dT%H:%M:%S"))
    store.set_metadata("last_build_type", "sync")
    store.commit()

    files_synced = len(all_changed) + len(diff["deleted"])

    # Post-sync: resolve bare CALLS, scoped to the files actually re-parsed
    resolution_stats = store.resolve_bare_calls(reparsed_files) if reparsed_files else {}
    result = {
        "status": "ok", "reason": "synced",
        "synced_commit": current_head, "previous_commit": last_synced,
        "files_synced": files_synced,
        "added": len(diff["added"]), "modified": len(diff["modified"]),
        "deleted": len(diff["deleted"]),
        "total_nodes": total_nodes, "total_edges": total_edges,
        "errors": errors,
    }
    if resolution_stats:
        result["call_resolution"] = resolution_stats
    return result


# ---------------------------------------------------------------------------
# Watch mode
# ---------------------------------------------------------------------------


_DEBOUNCE_SECONDS = 0.3


try:
    from watchdog.events import FileSystemEventHandler as _BaseHandler
except ImportError:
    _BaseHandler = object


class _GraphUpdateHandler(_BaseHandler):
    """FileSystemEventHandler for graph auto-updates with debounce."""

    def __init__(self, repo_root: Path, store: GraphStore,
                 parser: CodeParser, ignore_patterns: list):
        self._repo_root = repo_root
        self._store = store
        self._parser = parser
        self._ignore_patterns = ignore_patterns
        self._pending: set[str] = set()
        self._lock: "threading.Lock | None" = None
        self._timer = None

    def _ensure_lock(self):
        if self._lock is None:
            import threading
            self._lock = threading.Lock()

    def _should_handle(self, path: str) -> bool:
        if Path(path).is_symlink():
            return False
        try:
            rel = str(Path(path).relative_to(self._repo_root))
        except ValueError:
            return False
        if _should_ignore(rel, self._ignore_patterns):
            return False
        if self._parser.detect_language(Path(path)) is None:
            return False
        return True

    def on_modified(self, event):
        if event.is_directory:
            return
        if self._should_handle(event.src_path):
            self._schedule(event.src_path)

    def on_created(self, event):
        if event.is_directory:
            return
        if self._should_handle(event.src_path):
            self._schedule(event.src_path)

    def on_deleted(self, event):
        if event.is_directory:
            return
        try:
            rel = str(Path(event.src_path).relative_to(self._repo_root))
        except ValueError:
            return
        if _should_ignore(rel, self._ignore_patterns):
            return
        self._store.remove_file_data(rel.replace("\\", "/"))
        self._store.commit()
        logger.info("Removed: %s", rel)

    def _schedule(self, abs_path: str):
        import threading
        self._ensure_lock()
        with self._lock:
            self._pending.add(abs_path)
            if self._timer is not None:
                self._timer.cancel()
            self._timer = threading.Timer(_DEBOUNCE_SECONDS, self._flush)
            self._timer.start()

    def _flush(self):
        self._ensure_lock()
        with self._lock:
            paths = list(self._pending)
            self._pending.clear()
            self._timer = None
        for abs_path in paths:
            self._update_file(abs_path)

    def _update_file(self, abs_path: str):
        path = Path(abs_path)
        if not path.is_file() or path.is_symlink() or _is_binary(path):
            return
        try:
            source = path.read_bytes()
            fhash = hashlib.sha256(source).hexdigest()
            nodes, edges = self._parser.parse_bytes(path, source)
            rel = str(path.relative_to(self._repo_root)).replace("\\", "/")
            self._store.store_file_nodes_edges(rel, nodes, edges, fhash)
            self._store.set_metadata(
                "last_updated", time.strftime("%Y-%m-%dT%H:%M:%S")
            )
            self._store.commit()
            logger.info("Updated: %s (%d nodes, %d edges)", rel, len(nodes), len(edges))
        except Exception as e:
            logger.error("Error updating %s: %s", abs_path, e)


def watch(repo_root: Path, store: GraphStore) -> None:
    """Watch for file changes and auto-update the graph."""
    from watchdog.observers import Observer

    parser = _make_parser(repo_root)
    ignore_patterns = _load_ignore_patterns(repo_root)
    handler = _GraphUpdateHandler(repo_root, store, parser, ignore_patterns)

    observer = Observer()
    observer.schedule(handler, str(repo_root), recursive=True)
    observer.start()

    logger.info("Watching %s for changes... (Ctrl+C to stop)", repo_root)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
    logger.info("Watch stopped.")

