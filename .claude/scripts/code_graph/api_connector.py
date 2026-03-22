"""Frontend-to-backend API endpoint connector.

Scans frontend files for HTTP calls and backend files for route definitions,
matches them by normalized URL path, and creates API_ENDPOINT edges in the graph.

Activated by graphConnectors config in project-config.json.
"""

from __future__ import annotations

import json
import logging
import os
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

from .api_patterns import BACKEND_PATTERNS, FRONTEND_PATTERNS
from .graph import GraphStore
from .parser import EdgeInfo

logger = logging.getLogger(__name__)


@dataclass
class ApiEndpoint:
    """A detected API endpoint (frontend HTTP call or backend route)."""
    file_path: str
    line: int
    method: str       # GET, POST, PUT, DELETE, PATCH
    path: str         # /api/users, /api/users/{id}
    kind: str         # "frontend_call" or "backend_route"
    framework: str    # "angular", "dotnet", etc.
    confidence: float = 1.0


# ---------------------------------------------------------------------------
# Path normalization
# ---------------------------------------------------------------------------

# Matches route parameters in various frameworks
_PARAM_PATTERNS = [
    re.compile(r"/:\w+"),           # Express-style /:id
    re.compile(r"/\{[^}]+\}"),      # .NET/Spring {id}, {id:int}
    re.compile(r"/<[^>]+>"),        # Flask <int:id>
    re.compile(r"\[\w+\]"),         # .NET [controller], [action]
    re.compile(r"\$\{[^}]+\}"),     # JS template literal ${id}, ${params.id}
]


def normalize_path(path: str) -> str:
    """Normalize a URL path for fuzzy matching.

    Handles: route params, template literals, double slashes, trailing slashes.
    Produces a canonical form for comparison across frontend/backend boundaries.
    """
    p = path.strip().lower()
    # Replace all parameter patterns with a single placeholder
    for pat in _PARAM_PATTERNS:
        p = pat.sub("/{param}", p)
    # Collapse double (or more) slashes from parameter replacement
    while "//" in p:
        p = p.replace("//", "/")
    p = p.rstrip("/")
    if not p.startswith("/"):
        p = "/" + p
    return p


def _strip_param_prefix(path: str) -> str:
    """Strip leading /{param} segments from a path for fuzzy suffix matching.

    E.g., '/api/{param}/assessment/available-reviewers' → '/assessment/available-reviewers'
    This handles .NET class-level [Route("api/{companyId}/[controller]")] patterns.
    """
    segments = path.split("/")
    # Skip empty first segment and any {param} segments at the start
    result_segments = []
    found_non_param = False
    for seg in segments:
        if not seg:
            continue
        if not found_non_param and seg == "{param}":
            continue
        found_non_param = True
        result_segments.append(seg)
    return "/" + "/".join(result_segments) if result_segments else "/"


# ---------------------------------------------------------------------------
# Extractors
# ---------------------------------------------------------------------------

class BaseExtractor(ABC):
    """Base class for API endpoint extractors with shared file-scanning logic."""

    extensions: set[str]
    patterns: list[re.Pattern]
    scan_paths: list[str]
    framework: str

    def extract(self, root: Path) -> list[ApiEndpoint]:
        endpoints: list[ApiEndpoint] = []
        for scan_dir in self.scan_paths:
            dir_path = root / scan_dir
            if not dir_path.is_dir():
                continue
            for file_path in dir_path.rglob("*"):
                if file_path.suffix.lower() not in self.extensions:
                    continue
                if file_path.is_symlink() or not file_path.is_file():
                    continue
                try:
                    content = file_path.read_text(errors="replace")
                except (OSError, PermissionError):
                    continue
                for ep in self._extract_from_content(str(file_path), content):
                    endpoints.append(ep)
        return endpoints

    @abstractmethod
    def _extract_from_content(self, file_path: str, content: str) -> list[ApiEndpoint]:
        """Extract endpoints from a single file's content."""


class FrontendExtractor(BaseExtractor):
    """Extract HTTP calls from frontend source files."""

    def __init__(self, framework: str, paths: list[str], custom_patterns: list[str] | None = None):
        config = FRONTEND_PATTERNS.get(framework, FRONTEND_PATTERNS["generic"])
        self.extensions = set(config["extensions"])
        self.patterns = [re.compile(p, re.IGNORECASE) for p in config["patterns"]]
        if custom_patterns:
            self.patterns.extend(re.compile(p, re.IGNORECASE) for p in custom_patterns)
        self.scan_paths = paths
        self.framework = framework

    def _extract_from_content(self, file_path: str, content: str) -> list[ApiEndpoint]:
        results: list[ApiEndpoint] = []
        lines = content.splitlines()
        for line_num, line in enumerate(lines, 1):
            for pat in self.patterns:
                for m in pat.finditer(line):
                    groups = [g for g in m.groups() if g is not None]
                    if len(groups) >= 2:
                        method, path = groups[0].upper(), groups[1]
                    elif len(groups) == 1:
                        method, path = "GET", groups[0]
                    else:
                        continue
                    if path.startswith(("http://", "https://", "#", "mailto:")):
                        continue
                    # Normalize: prepend / if missing (e.g., legacy ${apiHost}offers → /offers)
                    if not path.startswith("/"):
                        path = "/" + path
                    results.append(ApiEndpoint(
                        file_path=file_path, line=line_num,
                        method=method, path=path,
                        kind="frontend_call", framework=self.framework,
                    ))
        return results


class BackendExtractor(BaseExtractor):
    """Extract route definitions from backend source files."""

    def __init__(self, framework: str, paths: list[str],
                 route_prefix: str = "", custom_patterns: list[str] | None = None):
        config = BACKEND_PATTERNS.get(framework, BACKEND_PATTERNS["generic"])
        self.extensions = set(config["extensions"])
        self.patterns = [re.compile(p, re.IGNORECASE) for p in config["patterns"]]
        if custom_patterns:
            self.patterns.extend(re.compile(p, re.IGNORECASE) for p in custom_patterns)
        self.scan_paths = paths
        self.framework = framework
        self.route_prefix = route_prefix.strip("/")
        self.class_route_pattern = None
        if "class_route_pattern" in config:
            self.class_route_pattern = re.compile(config["class_route_pattern"])

    def _extract_from_content(self, file_path: str, content: str) -> list[ApiEndpoint]:
        results: list[ApiEndpoint] = []
        # Detect class-level route prefix for .NET/.NET Core/NestJS controllers
        class_prefix = ""
        if self.class_route_pattern:
            m = self.class_route_pattern.search(content)
            if m:
                class_prefix = m.group(1).strip("/")

        # Resolve [controller] placeholder to actual controller name
        # .NET convention: class 'TimeSheetController' → [controller] = 'TimeSheet'
        # NestJS convention: @Controller('time-sheet') → already in the decorator
        if "[controller]" in class_prefix.lower():
            controller_name = self._resolve_controller_name(content)
            if controller_name:
                class_prefix = re.sub(
                    r"\[controller\]", controller_name, class_prefix, flags=re.IGNORECASE
                )

        lines = content.splitlines()
        for line_num, line in enumerate(lines, 1):
            for pat in self.patterns:
                for m in pat.finditer(line):
                    groups = [g for g in m.groups() if g is not None]
                    if not groups:
                        continue
                    if len(groups) >= 2:
                        raw_method, path = groups[0].upper(), groups[1]
                    else:
                        raw_method, path = "GET", groups[0]
                    # Normalize method: "HTTPGET" → "GET", "HTTPPOST" → "POST"
                    method = raw_method.replace("HTTP", "") if raw_method.startswith("HTTP") else raw_method
                    if method not in ("GET", "POST", "PUT", "DELETE", "PATCH"):
                        method = "GET"
                    # Compose full path with prefix
                    full_path = self._compose_path(class_prefix, path)
                    if not full_path.startswith("/"):
                        full_path = "/" + full_path
                    results.append(ApiEndpoint(
                        file_path=file_path, line=line_num,
                        method=method, path=full_path,
                        kind="backend_route", framework=self.framework,
                    ))
        return results

    @staticmethod
    def _resolve_controller_name(content: str) -> str | None:
        """Resolve the [controller] placeholder from the class name.

        .NET convention: class name 'TimeSheetController' → 'TimeSheet'
        NestJS convention: @Controller('time-sheet') → 'time-sheet' (already resolved)
        Spring convention: @RestController on class → use class name
        Generic: strips 'Controller' suffix from class declaration.
        """
        # Try .NET/Spring: public class FooController : ControllerBase
        m = re.search(r"class\s+(\w+?)Controller\b", content)
        if m:
            name = m.group(1)
            # Convert PascalCase to kebab-case for URL convention
            # e.g., 'TimeSheet' → 'TimeSheet' (keep as-is, URLs are case-insensitive)
            return name
        # Try generic class name without Controller suffix
        m = re.search(r"class\s+(\w+)\b", content)
        if m:
            return m.group(1)
        return None

    def _compose_path(self, class_prefix: str, method_path: str) -> str:
        parts = []
        prefix = self.route_prefix.strip("/") if self.route_prefix else ""
        class_clean = class_prefix.strip("/") if class_prefix else ""
        # Avoid double prefix: if class_prefix already starts with routePrefix, skip it
        if prefix and class_clean and class_clean.lower().startswith(prefix.lower()):
            parts.append(class_clean)
        else:
            if prefix:
                parts.append(prefix)
            if class_clean:
                parts.append(class_clean)
        if method_path:
            parts.append(method_path.strip("/"))
        return "/" + "/".join(p for p in parts if p)


# ---------------------------------------------------------------------------
# Matcher
# ---------------------------------------------------------------------------

def match_endpoints(
    frontend: list[ApiEndpoint], backend: list[ApiEndpoint],
    route_prefix: str = "",
) -> list[tuple[ApiEndpoint, ApiEndpoint, float]]:
    """Match frontend calls to backend routes by normalized path.

    Matching strategy (in order of confidence):
    1. Exact match on normalized path
    2. Prefix-augmented: prepend routePrefix to frontend path
    3. Suffix match: strip routePrefix from backend path, match remainder

    This handles the common case where frontend uses relative paths
    (e.g., '/v2/users') while backend has prefixed routes ('/api/v2/users').
    """
    # Index backend by normalized path (full path including prefix)
    backend_index: dict[str, list[ApiEndpoint]] = {}
    for ep in backend:
        key = normalize_path(ep.path)
        backend_index.setdefault(key, []).append(ep)

    # Build secondary indexes for fuzzy matching
    prefix = route_prefix.strip("/")

    # Index 2: backend paths with routePrefix stripped
    # e.g., '/api/v2/users' → '/v2/users'
    backend_stripped_index: dict[str, list[ApiEndpoint]] = {}
    if prefix:
        prefix_slash = f"/{prefix}/"
        for be_key, be_eps in backend_index.items():
            if be_key.startswith(prefix_slash):
                stripped = be_key[len(prefix_slash) - 1:]  # keep leading /
                backend_stripped_index.setdefault(stripped, []).extend(be_eps)
            elif be_key == f"/{prefix}":
                backend_stripped_index.setdefault("/", []).extend(be_eps)

    # Index 3: backend paths with prefix AND leading {param} segments stripped
    # e.g., '/api/{param}/assessment/available-reviewers' → '/assessment/available-reviewers'
    # This handles .NET [Route("api/{companyId}/[controller]")] patterns
    backend_deep_stripped_index: dict[str, list[ApiEndpoint]] = {}
    for be_key, be_eps in backend_index.items():
        deep_stripped = _strip_param_prefix(be_key)
        # Also strip the routePrefix if present after param stripping
        if prefix and deep_stripped.startswith(f"/{prefix}/"):
            deep_stripped = deep_stripped[len(prefix) + 1:]
        if deep_stripped != be_key:  # only add if stripping actually changed something
            backend_deep_stripped_index.setdefault(deep_stripped, []).extend(be_eps)

    matches: list[tuple[ApiEndpoint, ApiEndpoint, float]] = []
    seen: set[tuple[str, int, str, int]] = set()

    for fe in frontend:
        fe_norm = normalize_path(fe.path)

        # Strategy 1: Exact match (highest confidence)
        candidates = backend_index.get(fe_norm, [])
        conf_base = 1.0

        # Strategy 2: Prefix-augmented (frontend omits /api/)
        if not candidates and prefix:
            fe_with_prefix = normalize_path(f"/{prefix}/{fe_norm.lstrip('/')}")
            candidates = backend_index.get(fe_with_prefix, [])
            conf_base = 0.95

        # Strategy 3: Suffix match (strip prefix from backend, match remainder)
        if not candidates and backend_stripped_index:
            candidates = backend_stripped_index.get(fe_norm, [])
            conf_base = 0.9

        # Strategy 4: Deep strip (strip prefix + leading {param} segments from backend)
        # Handles: .NET [Route("api/{companyId}/[controller]")] + method route
        if not candidates and backend_deep_stripped_index:
            candidates = backend_deep_stripped_index.get(fe_norm, [])
            conf_base = 0.85

        # Strategy 5: Deep strip on frontend too (strip ${param} from frontend path)
        if not candidates and backend_deep_stripped_index:
            fe_deep = _strip_param_prefix(fe_norm)
            if fe_deep != fe_norm:
                candidates = backend_deep_stripped_index.get(fe_deep, [])
                conf_base = 0.8

        for be in candidates:
            pair_key = (fe.file_path, fe.line, be.file_path, be.line)
            if pair_key in seen:
                continue
            seen.add(pair_key)
            # Method match bonus: same method = full confidence, different = -0.1
            confidence = conf_base if fe.method == be.method else conf_base - 0.1
            matches.append((fe, be, round(confidence, 2)))

    return matches


# ---------------------------------------------------------------------------
# Framework auto-detection (zero-config fallback)
# ---------------------------------------------------------------------------

# Directories to skip during framework detection scan
_SKIP_DIRS = frozenset([
    "node_modules", ".git", "bin", "obj", "dist", "build", "out",
    ".next", ".nuxt", "__pycache__", ".venv", "venv", "vendor",
    ".claude", ".code-graph", "coverage", ".angular", ".nx",
])

# Framework detection markers: (marker_file_or_pattern, framework_key, side)
_FRAMEWORK_MARKERS: list[tuple[str, str, str, str | None]] = [
    # (file_to_find, framework, "frontend"|"backend", content_check_substring)
    # Frontend
    ("angular.json", "angular", "frontend", None),
    ("nx.json", "angular", "frontend", None),  # Nx workspace often = Angular
    ("next.config.js", "nextjs", "frontend", None),
    ("next.config.mjs", "nextjs", "frontend", None),
    ("next.config.ts", "nextjs", "frontend", None),
    ("nuxt.config.js", "vue", "frontend", None),
    ("nuxt.config.ts", "vue", "frontend", None),
    ("vue.config.js", "vue", "frontend", None),
    ("svelte.config.js", "svelte", "frontend", None),
    # Backend
    ("manage.py", "django", "backend", None),
    ("Gemfile", "rails", "backend", "rails"),
    ("go.mod", "go", "backend", None),
]

# package.json dependency → framework mapping
_PACKAGE_JSON_DEPS: list[tuple[str, str, str]] = [
    ("@angular/core", "angular", "frontend"),
    ("react", "react", "frontend"),
    ("next", "nextjs", "frontend"),
    ("vue", "vue", "frontend"),
    ("svelte", "svelte", "frontend"),
    ("express", "express", "backend"),
    ("@nestjs/core", "nestjs", "backend"),
    ("fastify", "express", "backend"),  # similar pattern
]


def auto_detect_config(root: Path) -> dict | None:
    """Auto-detect frontend and backend frameworks by scanning for markers.

    Returns a synthetic graphConnectors.apiEndpoints config dict, or None
    if no frontend+backend pair detected. Generic: no project-specific paths.

    Detection strategy:
    1. Scan for marker files (angular.json, *.csproj, manage.py, etc.)
    2. Check package.json dependencies
    3. Check *.csproj for ASP.NET
    4. Infer scan paths from marker locations
    """
    detected: dict[str, list[tuple[str, str]]] = {"frontend": [], "backend": []}

    for dirpath_str, dirnames, filenames in os.walk(str(root)):
        # Skip excluded directories
        dirnames[:] = [d for d in dirnames if d not in _SKIP_DIRS]
        dirpath = Path(dirpath_str)
        rel = dirpath.relative_to(root)

        # Check marker files
        for fname, framework, side, content_check in _FRAMEWORK_MARKERS:
            if fname in filenames:
                if content_check:
                    try:
                        content = (dirpath / fname).read_text(errors="replace")
                        if content_check.lower() not in content.lower():
                            continue
                    except (OSError, PermissionError):
                        continue
                detected[side].append((framework, str(rel)))

        # Check package.json for JS framework dependencies
        if "package.json" in filenames:
            try:
                import json as _json
                pkg = _json.loads((dirpath / "package.json").read_text(errors="replace"))
                all_deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
                for dep_name, framework, side in _PACKAGE_JSON_DEPS:
                    if dep_name in all_deps:
                        detected[side].append((framework, str(rel)))
            except (OSError, PermissionError, _json.JSONDecodeError):
                pass

        # Check *.csproj for ASP.NET backend
        for fname in filenames:
            if fname.endswith(".csproj"):
                try:
                    content = (dirpath / fname).read_text(errors="replace")
                    if "Microsoft.AspNetCore" in content or "Microsoft.NET.Sdk.Web" in content:
                        detected["backend"].append(("dotnet", str(rel)))
                except (OSError, PermissionError):
                    pass

        # Check pom.xml / build.gradle for Spring
        for marker, framework in [("pom.xml", "spring"), ("build.gradle", "spring"), ("build.gradle.kts", "spring")]:
            if marker in filenames:
                try:
                    content = (dirpath / marker).read_text(errors="replace")
                    if "spring-boot" in content.lower() or "spring-web" in content.lower():
                        detected["backend"].append((framework, str(rel)))
                except (OSError, PermissionError):
                    pass

        # Check requirements.txt / pyproject.toml for FastAPI
        for marker in ["requirements.txt", "pyproject.toml"]:
            if marker in filenames:
                try:
                    content = (dirpath / marker).read_text(errors="replace")
                    if "fastapi" in content.lower():
                        detected["backend"].append(("fastapi", str(rel)))
                except (OSError, PermissionError):
                    pass

    # Need at least one side detected. API matching requires both, but
    # backend-only or frontend-only detection is still useful for graph context.
    if not detected["frontend"] and not detected["backend"]:
        return None

    # Pick most common framework per side, collect all paths
    def pick_best(entries: list[tuple[str, str]]) -> tuple[str, list[str]]:
        from collections import Counter
        frameworks = Counter(fw for fw, _ in entries)
        best_fw = frameworks.most_common(1)[0][0]
        paths = sorted(set(p for fw, p in entries if fw == best_fw))
        # Use parent directories (1 level up from marker) as scan paths
        return best_fw, paths if paths else ["."]

    result = {"enabled": True, "auto_detected": True}

    if detected["frontend"]:
        fe_fw, fe_paths = pick_best(detected["frontend"])
        result["frontend"] = {"framework": fe_fw, "paths": fe_paths}

    if detected["backend"]:
        be_fw, be_paths = pick_best(detected["backend"])
        result["backend"] = {"framework": be_fw, "paths": be_paths, "routePrefix": "api"}

    return result


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def connect_api_endpoints(
    store: GraphStore, root: Path, config: dict
) -> dict[str, Any]:
    """Scan files, extract endpoints, match, create API_ENDPOINT edges.

    Resolution order:
    1. Explicit config from project-config.json (graphConnectors.apiEndpoints)
    2. Auto-detection by scanning for framework markers
    Custom patterns from config always EXTEND (union with) built-in defaults.
    """
    api_config = config.get("graphConnectors", {}).get("apiEndpoints", {})

    # If not explicitly configured, try auto-detection
    if not api_config.get("enabled", False):
        detected = auto_detect_config(root)
        if not detected:
            return {"status": "skipped", "reason": "no graphConnectors config and no frameworks detected"}
        api_config = detected
        logger.info("Auto-detected frameworks: frontend=%s, backend=%s",
                     detected["frontend"]["framework"], detected["backend"]["framework"])

    fe_config = api_config.get("frontend", {})
    be_config = api_config.get("backend", {})

    fe_extractor = FrontendExtractor(
        framework=fe_config.get("framework", "generic"),
        paths=fe_config.get("paths", ["."]),
        custom_patterns=fe_config.get("customPatterns"),
    )
    be_extractor = BackendExtractor(
        framework=be_config.get("framework", "generic"),
        paths=be_config.get("paths", ["."]),
        route_prefix=be_config.get("routePrefix", ""),
        custom_patterns=be_config.get("customPatterns"),
    )

    frontend_eps = fe_extractor.extract(root)
    backend_eps = be_extractor.extract(root)
    matches = match_endpoints(
        frontend_eps, backend_eps,
        route_prefix=be_config.get("routePrefix", ""),
    )

    # Create API_ENDPOINT edges
    edges_created = 0
    for fe, be, confidence in matches:
        edge = EdgeInfo(
            kind="API_ENDPOINT",
            source=fe.file_path,
            target=be.file_path,
            file_path=fe.file_path,
            line=fe.line,
            extra={
                "method": fe.method,
                "path": fe.path,
                "backend_path": be.path,
                "confidence": confidence,
                "frontend_framework": fe.framework,
                "backend_framework": be.framework,
            },
        )
        store.upsert_edge(edge)
        edges_created += 1

    store.commit()

    return {
        "status": "ok",
        "summary": (
            f"API connector: {len(frontend_eps)} frontend calls, "
            f"{len(backend_eps)} backend routes, {edges_created} matches"
        ),
        "frontend_endpoints": len(frontend_eps),
        "backend_endpoints": len(backend_eps),
        "edges_created": edges_created,
        "matches": [
            {"frontend": f"{fe.file_path}:{fe.line} {fe.method} {fe.path}",
             "backend": f"{be.file_path}:{be.line} {be.path}",
             "confidence": conf}
            for fe, be, conf in matches[:20]  # Cap output
        ],
    }


def load_project_config(root: Path) -> dict:
    """Load project-config.json if it exists."""
    config_path = root / "docs" / "project-config.json"
    if not config_path.is_file():
        return {}
    try:
        return json.loads(config_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
