"""Project-neutral module resolution for the code graph.

Resolves import specifiers to real files so the graph can build cross-file
edges (CALLS / IMPORTS_FROM / TESTED_BY) instead of storing opaque module
strings. Every project-specific fact is discovered from the repository or
supplied through ``project-config.json`` — nothing here is hardcoded to one
project:

- **Relative specifiers** (``./x``, ``../x``) resolve from the caller's dir.
- **Path aliases** come from ``graphSettings.pathAliases`` in project config
  and/or the nearest ``tsconfig.json`` / ``jsconfig.json`` ``paths`` map,
  and from common single-letter/short aliases declared there.
- **Workspace packages** (``@scope/pkg/sub``) are discovered from
  ``pnpm-workspace.yaml`` or the root ``package.json`` ``workspaces`` globs,
  then resolved through each package's ``exports`` / ``main`` / ``module``.

The resolver is a pure function of ``(specifier, caller_file)`` plus its
configuration, so it is safe to build once and pass to parse workers.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Optional

_JS_EXTS = [".ts", ".tsx", ".mjs", ".cjs", ".js", ".jsx", ".vue", ".svelte"]
_PY_EXTS = [".py"]

_LANGUAGE_EXTS = {
    "typescript": _JS_EXTS,
    "tsx": _JS_EXTS,
    "javascript": _JS_EXTS,
    "jsx": _JS_EXTS,
    "vue": _JS_EXTS,
    "svelte": _JS_EXTS,
    "python": _PY_EXTS,
}

_ALIAS_STAR = "*"


# ---------------------------------------------------------------------------
# JSONC / YAML-lite helpers (no third-party dependency)
# ---------------------------------------------------------------------------

def _strip_jsonc(text: str) -> str:
    """Remove // and /* */ comments plus trailing commas from JSONC text.

    String-aware: comment markers inside string literals (e.g. the ``/*`` in a
    tsconfig ``"@/*"`` path alias) are preserved.
    """
    out: list[str] = []
    i = 0
    n = len(text)
    in_str = False
    quote = ""
    while i < n:
        ch = text[i]
        if in_str:
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(text[i + 1])
                i += 2
                continue
            if ch == quote:
                in_str = False
            i += 1
            continue
        if ch in ("\"", "'"):
            in_str = True
            quote = ch
            out.append(ch)
            i += 1
            continue
        if ch == "/" and i + 1 < n and text[i + 1] == "/":
            end = text.find("\n", i)
            if end == -1:
                break
            i = end
            continue
        if ch == "/" and i + 1 < n and text[i + 1] == "*":
            end = text.find("*/", i + 2)
            i = n if end == -1 else end + 2
            continue
        out.append(ch)
        i += 1
    stripped = "".join(out)

    # Drop trailing commas outside strings (string-aware, so a comma inside a
    # string value is never removed).
    result: list[str] = []
    i = 0
    n = len(stripped)
    in_str = False
    quote = ""
    while i < n:
        ch = stripped[i]
        if in_str:
            result.append(ch)
            if ch == "\\" and i + 1 < n:
                result.append(stripped[i + 1])
                i += 2
                continue
            if ch == quote:
                in_str = False
            i += 1
            continue
        if ch in ("\"", "'"):
            in_str = True
            quote = ch
            result.append(ch)
            i += 1
            continue
        if ch == ",":
            j = i + 1
            while j < n and stripped[j] in " \t\r\n":
                j += 1
            if j < n and stripped[j] in "}]":
                i += 1
                continue
        result.append(ch)
        i += 1
    return "".join(result)


def _read_jsonc(path: Path) -> dict:
    try:
        return json.loads(_strip_jsonc(path.read_text(encoding="utf-8", errors="replace")))
    except (OSError, json.JSONDecodeError):
        return {}


def _read_workspace_globs(root: Path) -> list[str]:
    """Workspace member globs from pnpm-workspace.yaml or package.json."""
    globs: list[str] = []

    pnpm = root / "pnpm-workspace.yaml"
    if pnpm.is_file():
        try:
            in_packages = False
            for raw in pnpm.read_text(encoding="utf-8", errors="replace").splitlines():
                line = raw.rstrip()
                if re.match(r"^\s*packages\s*:", line):
                    in_packages = True
                    continue
                if in_packages:
                    m = re.match(r"^\s*-\s*['\"]?([^'\"]+)['\"]?\s*$", line)
                    if m:
                        globs.append(m.group(1).strip())
                    elif line.strip() and not line.startswith((" ", "\t")):
                        in_packages = False
        except OSError:
            pass

    if not globs:
        pkg = _read_jsonc(root / "package.json")
        workspaces = pkg.get("workspaces")
        if isinstance(workspaces, list):
            globs = [g for g in workspaces if isinstance(g, str)]
        elif isinstance(workspaces, dict):
            globs = [g for g in workspaces.get("packages", []) if isinstance(g, str)]
    return globs


def _discover_packages(root: Path, extra_globs: Optional[list[str]] = None) -> dict[str, dict]:
    """Map workspace package name -> {dir, exports, main, module}."""
    globs = _read_workspace_globs(root)
    for g in extra_globs or []:
        if g not in globs:
            globs.append(g)
    if not globs:
        return {}

    packages: dict[str, dict] = {}
    seen_dirs: set[str] = set()
    for pattern in globs:
        normalized = pattern.replace("\\", "/").rstrip("/")
        for member in root.glob(normalized):
            if not member.is_dir():
                continue
            rel_dir = member.relative_to(root).as_posix()
            if rel_dir in seen_dirs:
                continue
            seen_dirs.add(rel_dir)
            manifest = member / "package.json"
            if not manifest.is_file():
                continue
            data = _read_jsonc(manifest)
            name = data.get("name")
            if not isinstance(name, str) or not name:
                continue
            exports = data.get("exports")
            packages[name] = {
                "dir": rel_dir,
                "exports": exports if isinstance(exports, dict) else {},
                "main": data.get("main") if isinstance(data.get("main"), str) else None,
                "module": data.get("module") if isinstance(data.get("module"), str) else None,
            }
    return packages


def _discover_aliases(root: Path, packages: dict[str, dict]) -> list[list]:
    """Collect (base_dir_rel, pattern, [targets]) tuples from tsconfig/jsconfig.

    Scans the repo root and every workspace member directory; only files under
    a member (or root) inherit that member's ``paths`` map.
    """
    aliases: list[list] = []
    candidate_dirs = {""} | {meta["dir"] for meta in packages.values()}
    for rel_dir in sorted(candidate_dirs):
        base = root / rel_dir if rel_dir else root
        for fname in ("tsconfig.json", "jsconfig.json"):
            cfg_path = base / fname
            if not cfg_path.is_file():
                continue
            cfg = _read_jsonc(cfg_path)
            compiler = cfg.get("compilerOptions") or {}
            paths = compiler.get("paths") or {}
            if not isinstance(paths, dict):
                continue
            base_url = compiler.get("baseUrl")
            base_dir_rel = rel_dir
            if isinstance(base_url, str) and base_url.strip():
                raw_base = base_url.strip()
                merged = ((Path(rel_dir) / raw_base) if rel_dir else Path(raw_base)).as_posix()
                normalized = merged.rstrip("/")
                # baseUrl "." at the repo root means the root itself; represent it
                # as "" so it prefix-matches every caller instead of "./".
                base_dir_rel = "" if normalized in (".", "") else normalized
            for pattern, targets in paths.items():
                if not isinstance(pattern, str) or not isinstance(targets, list):
                    continue
                clean_targets = [t for t in targets if isinstance(t, str)]
                if clean_targets and pattern:
                    aliases.append([base_dir_rel, pattern, clean_targets])
            break  # tsconfig wins over jsconfig for the same directory
    return aliases


# ---------------------------------------------------------------------------
# Resolver
# ---------------------------------------------------------------------------

class ModuleResolver:
    """Resolve import specifiers to files using project configuration."""

    def __init__(
        self,
        repo_root: str | Path,
        aliases: Optional[list] = None,
        packages: Optional[dict] = None,
    ) -> None:
        self.root = Path(repo_root)
        self._aliases = sorted(
            (list(a) for a in (aliases or []) if len(a) >= 3),
            key=lambda a: len(str(a[0])),
            reverse=True,
        )
        self._packages = packages or {}
        self._cache: dict[tuple[str, str, str], Optional[str]] = {}

    # -- public -----------------------------------------------------------

    def resolve(
        self, specifier: str, caller_file: str, language: Optional[str] = None,
    ) -> Optional[str]:
        if not specifier or "://" in specifier or specifier.startswith(("#", "data:")):
            return None
        caller_dir = str(Path(caller_file).parent)
        cache_key = (specifier, caller_dir, language or "")
        if cache_key in self._cache:
            return self._cache[cache_key]
        resolved = self._resolve_uncached(specifier, caller_file, language)
        self._cache[cache_key] = resolved
        return resolved

    @classmethod
    def from_config(cls, repo_root: str | Path, config: dict) -> "ModuleResolver":
        """Build a resolver from project-config.json + repository discovery.

        Config shape (all optional)::

            "graphSettings": {
              "pathAliases": {"apps/web": {"@/*": ["./*"]}},
              "workspaceGlobs": ["apps/*", "packages/*"]
            }
        """
        graph_settings = (config or {}).get("graphSettings", {}) or {}
        packages = _discover_packages(
            Path(repo_root), graph_settings.get("workspaceGlobs"),
        )
        aliases = _discover_aliases(Path(repo_root), packages)

        configured = graph_settings.get("pathAliases") or {}
        if isinstance(configured, dict):
            for base_dir, paths in configured.items():
                if not isinstance(paths, dict):
                    continue
                for pattern, targets in paths.items():
                    if isinstance(targets, list) and pattern:
                        aliases.append([base_dir, pattern, targets])
        return cls(repo_root, aliases=aliases, packages=packages)

    def to_config(self) -> dict:
        """Picklable snapshot for handing to parse workers."""
        return {"root": str(self.root), "aliases": self._aliases, "packages": self._packages}

    @classmethod
    def from_snapshot(cls, snapshot: Optional[dict]) -> Optional["ModuleResolver"]:
        if not snapshot:
            return None
        return cls(
            snapshot.get("root", "."),
            aliases=snapshot.get("aliases"),
            packages=snapshot.get("packages"),
        )

    # -- internals --------------------------------------------------------

    def _resolve_uncached(
        self, specifier: str, caller_file: str, language: Optional[str],
    ) -> Optional[str]:
        exts = _LANGUAGE_EXTS.get(language or "", _JS_EXTS)

        if specifier.startswith("."):
            return self._resolve_path_like(Path(caller_file).parent / specifier, exts)

        # Path aliases (longest matching baseDir first)
        caller_rel = _safe_rel(caller_file, self.root) or caller_file
        for base_dir, pattern, targets in self._aliases:
            base = str(base_dir).replace("\\", "/")
            if base and not caller_rel.startswith(base.rstrip("/") + "/"):
                continue
            star = _alias_match(specifier, pattern)
            if star is None:
                continue
            for target in targets:
                expanded = target.replace(_ALIAS_STAR, star)
                target_base = self.root / base_dir if base_dir else self.root
                resolved = self._resolve_path_like(target_base / expanded, exts)
                if resolved:
                    return resolved

        # Workspace package names
        return self._resolve_package(specifier, exts)

    def _resolve_package(self, specifier: str, exts: list[str]) -> Optional[str]:
        name, _, subpath = specifier.partition("/")
        if name.startswith("@"):
            scope, _, rest = specifier[1:].partition("/")
            if not rest:
                return None
            name = f"@{scope}/{rest.split('/')[0]}"
            subpath = rest.split("/", 1)[1] if "/" in rest else ""
        meta = self._packages.get(name)
        if not meta:
            return None

        pkg_dir = self.root / meta["dir"]
        exports = meta.get("exports") or {}
        export_key = "./" + subpath if subpath else "."

        target = _export_target(exports, export_key)
        if isinstance(target, str):
            return self._resolve_path_like(pkg_dir / target.lstrip("./"), exts)

        if subpath:
            return self._resolve_path_like(pkg_dir / subpath, exts)

        for fallback in (meta.get("module"), meta.get("main")):
            if isinstance(fallback, str):
                resolved = self._resolve_path_like(pkg_dir / fallback.lstrip("./"), exts)
                if resolved:
                    return resolved
        return self._resolve_path_like(pkg_dir / "src" / "index", exts)

    def _resolve_path_like(self, base: Path, exts: list[str]) -> Optional[str]:
        try:
            if base.is_file():
                return str(base.resolve())
            for ext in exts:
                candidate = Path(str(base) + ext)
                if candidate.is_file():
                    return str(candidate.resolve())
            if base.is_dir():
                for ext in exts:
                    candidate = base / f"index{ext}"
                    if candidate.is_file():
                        return str(candidate.resolve())
        except (OSError, ValueError):
            return None
        return None


def _alias_match(specifier: str, pattern: str) -> Optional[str]:
    """Return the wildcard capture, or '' when the pattern matches exactly."""
    if _ALIAS_STAR in pattern:
        prefix, _, suffix = pattern.partition(_ALIAS_STAR)
        if specifier.startswith(prefix) and specifier.endswith(suffix):
            end = len(specifier) - len(suffix) if suffix else len(specifier)
            return specifier[len(prefix):end]
        return None
    return "" if specifier == pattern else None


def _export_target(exports: dict, key: str) -> Optional[str]:
    """Resolve an ``exports`` entry, supporting ``*`` wildcard keys.

    Handles the bare-string form and the conditional-object form
    (``{"import"|"default"|"require": "..."}``). Longest-prefix wildcard wins,
    mirroring Node's package-exports resolution.
    """
    value = exports.get(key)
    if value is None:
        best: Optional[tuple[int, str, Any]] = None
        for pattern, candidate in exports.items():
            if not isinstance(pattern, str) or "*" not in pattern:
                continue
            prefix, _, suffix = pattern.partition("*")
            if not (key.startswith(prefix) and key.endswith(suffix)):
                continue
            end = len(key) - len(suffix) if suffix else len(key)
            star = key[len(prefix):end]
            if best is None or len(prefix) > best[0]:
                best = (len(prefix), star, candidate)
        if best is None:
            return None
        value = best[2]
        if isinstance(value, dict):
            value = value.get("import") or value.get("default") or value.get("require")
        return value.replace("*", best[1]) if isinstance(value, str) else None
    if isinstance(value, dict):
        value = value.get("import") or value.get("default") or value.get("require")
    return value if isinstance(value, str) else None


def _safe_rel(path: str, root: Path) -> Optional[str]:
    try:
        return Path(path).resolve().relative_to(root).as_posix()
    except (OSError, ValueError):
        return None


def build_resolver_snapshot(repo_root: str | Path, config: dict) -> dict:
    """Picklable resolver snapshot for parse workers / synchronous callers."""
    return ModuleResolver.from_config(repo_root, config).to_config()
