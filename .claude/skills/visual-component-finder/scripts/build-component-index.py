#!/usr/bin/env python3
"""
Build Component Index for BravoSUITE Visual Component Finder.

Scans all Angular components in src/WebV2/ and src/Web/, extracting:
- Component selectors, BEM classes, route paths, text content
- Child/parent component relationships
- Layer classification (page/domain/common/platform)

Output: docs/component-index.json (or custom path via --output)

Usage:
    python build-component-index.py                    # Full scan (all components)
    python build-component-index.py --git-changes      # Incremental: only re-index git-changed files
    python build-component-index.py --git-changes main # Incremental: changes since 'main' branch
    python build-component-index.py --output path.json # Custom output path
    python build-component-index.py --webv2-only       # Skip WebV1 components
"""

import argparse
import glob
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Directories to scan (relative to project root)
WEBV2_DIR = "src/WebV2"
WEBV1_DIR = "src/Web"

# Directories to skip during scanning
SKIP_DIRS = {"node_modules", "dist", ".angular", ".nx", "e2e", "__tests__", "test"}

# Default output path (relative to project root)
DEFAULT_OUTPUT = "docs/component-index.json"

# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

# Extract selector from @Component decorator
RE_SELECTOR = re.compile(r"selector:\s*['\"]([^'\"]+)['\"]")

# Extract templateUrl from @Component decorator
RE_TEMPLATE_URL = re.compile(r"templateUrl:\s*['\"]([^'\"]+)['\"]")

# Extract inline template from @Component decorator (multiline)
RE_INLINE_TEMPLATE = re.compile(
    r"template:\s*`([^`]*)`", re.DOTALL
)

# Extract class name and optional base class
RE_CLASS_EXTENDS = re.compile(
    r"export\s+class\s+(\w+)\s+extends\s+(\w+)"
)
RE_CLASS_SIMPLE = re.compile(r"export\s+class\s+(\w+)")

# Extract BEM root class from HTML: first class attribute value
RE_BEM_ROOT = re.compile(r'class="([a-z][a-z0-9-]*(?:__[a-z0-9-]+)?)')

# Extract child component selectors from HTML templates
# Matches custom element tags (not standard HTML tags)
RE_CHILD_SELECTORS = re.compile(r"<((?:app-|bravo-|platform-)[a-z0-9-]+|(?:[a-z]+-[a-z]+-[a-z0-9-]+))[^>]*>")

# Extract visible text from HTML templates (headers, labels, buttons)
# Matches text between > and < that isn't whitespace or Angular bindings
RE_VISIBLE_TEXT = re.compile(
    r">\s*([A-Z][A-Za-z0-9 ,.'&/()-]{2,50})\s*<"
)

# Route patterns
RE_ROUTE_PATH = re.compile(r"path:\s*['\"]([^'\"]*)['\"]")
RE_ROUTE_COMPONENT = re.compile(r"component:\s*(\w+)")
RE_ROUTE_LAZY_IMPORT = re.compile(
    r"import\(['\"]([^'\"]+)['\"]\)"
)

# Common CSS utility classes to exclude from BEM block detection
UTILITY_CSS_CLASSES = {
    "flex", "grid", "hidden", "block", "inline", "relative", "absolute", "fixed",
    "sticky", "static", "container", "row", "col", "wrap", "overflow",
    "d-flex", "d-grid", "d-block", "d-none", "d-inline",
    "w-full", "h-full", "m-auto", "p-0", "text-center",
}

# Standard HTML tags to exclude from child selector detection
STANDARD_HTML_TAGS = {
    "a", "abbr", "address", "area", "article", "aside", "audio",
    "b", "base", "bdi", "bdo", "blockquote", "body", "br", "button",
    "canvas", "caption", "cite", "code", "col", "colgroup",
    "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt",
    "em", "embed", "fieldset", "figcaption", "figure", "footer", "form",
    "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html",
    "i", "iframe", "img", "input", "ins",
    "kbd", "label", "legend", "li", "link",
    "main", "map", "mark", "menu", "meta", "meter",
    "nav", "noscript",
    "object", "ol", "optgroup", "option", "output",
    "p", "param", "picture", "pre", "progress",
    "q", "rp", "rt", "ruby",
    "s", "samp", "script", "section", "select", "slot", "small", "source",
    "span", "strong", "style", "sub", "summary", "sup",
    "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead",
    "time", "title", "tr", "track",
    "u", "ul", "var", "video", "wbr",
    # Angular-specific structural elements
    "ng-container", "ng-template", "ng-content", "router-outlet",
    # Angular Material / PrimeNG / common library elements
    "mat-icon", "mat-spinner", "mat-tab", "mat-tab-group",
    "p-table", "p-column", "p-dropdown", "p-dialog",
    "as-split", "as-split-area",
}


def find_project_root():
    """Find the project root by looking for CLAUDE.md or .git."""
    current = Path(__file__).resolve()
    for parent in [current] + list(current.parents):
        if (parent / "CLAUDE.md").exists() or (parent / ".git").exists():
            return parent
    # Fallback: assume script is at .claude/skills/visual-component-finder/scripts/
    return current.parent.parent.parent.parent.parent


def should_skip(path_str):
    """Check if a path contains any directory we should skip."""
    parts = Path(path_str).parts
    return any(part in SKIP_DIRS for part in parts)


# ---------------------------------------------------------------------------
# Component extraction
# ---------------------------------------------------------------------------

def extract_selector(content):
    """Extract component selector from @Component decorator."""
    match = RE_SELECTOR.search(content)
    return match.group(1) if match else None


def extract_class_info(content):
    """Extract class name and optional base class."""
    match = RE_CLASS_EXTENDS.search(content)
    if match:
        return match.group(1), match.group(2)
    match = RE_CLASS_SIMPLE.search(content)
    if match:
        return match.group(1), None
    return None, None


def get_template_content(component_path, ts_content):
    """Get template HTML content from sibling .html file or inline template."""
    component_dir = os.path.dirname(component_path)

    # Try templateUrl first
    match = RE_TEMPLATE_URL.search(ts_content)
    if match:
        template_rel = match.group(1)
        template_path = os.path.normpath(os.path.join(component_dir, template_rel))
        if os.path.exists(template_path):
            try:
                with open(template_path, "r", encoding="utf-8", errors="replace") as f:
                    return f.read(), template_rel
            except Exception:
                pass

    # Fallback: try sibling .html file
    html_path = component_path.replace(".component.ts", ".component.html")
    if os.path.exists(html_path):
        try:
            with open(html_path, "r", encoding="utf-8", errors="replace") as f:
                return f.read(), os.path.basename(html_path)
        except Exception:
            pass

    # Last resort: inline template
    match = RE_INLINE_TEMPLATE.search(ts_content)
    if match:
        return match.group(1), "(inline)"

    return None, None


def extract_bem_root(html_content):
    """Extract the BEM root block class from the template's outermost element."""
    if not html_content:
        return None
    for match in RE_BEM_ROOT.finditer(html_content):
        class_name = match.group(1)
        block = class_name.split("__")[0]
        # Skip utility CSS classes (flex, grid, hidden, etc.)
        if block in UTILITY_CSS_CLASSES:
            continue
        return block
    return None


def extract_child_selectors(html_content):
    """Extract custom component selectors used in the template."""
    if not html_content:
        return []
    matches = RE_CHILD_SELECTORS.findall(html_content)
    # Deduplicate and filter out standard HTML tags
    selectors = sorted(set(
        s for s in matches
        if s not in STANDARD_HTML_TAGS and not s.startswith("ng-")
    ))
    return selectors


def extract_text_content(html_content):
    """Extract unique visible text strings from the template (headers, labels)."""
    if not html_content:
        return []
    matches = RE_VISIBLE_TEXT.findall(html_content)
    # Deduplicate, trim, limit to reasonable strings
    texts = sorted(set(
        t.strip() for t in matches
        if len(t.strip()) >= 3
        and not t.strip().startswith("{{")
        and not t.strip().startswith("*ng")
    ))
    # Limit to first 15 text strings to keep index size manageable
    return texts[:15]


def determine_layer(rel_path):
    """Classify component layer based on its file path."""
    path_lower = rel_path.replace("\\", "/").lower()

    # WebV2 patterns
    if "libs/platform-core/" in path_lower:
        return "platform"
    if "libs/bravo-common/" in path_lower:
        return "common"
    if "libs/bravo-domain/" in path_lower:
        if "/_shared/" in path_lower or "\\_shared/" in path_lower:
            return "domain-shared"
        return "domain"
    if "/apps/" in path_lower and "/routes/" in path_lower:
        return "page"
    if "/apps/" in path_lower:
        return "app"

    # WebV1 patterns
    if "bravocomponents/" in path_lower or "libs/" in path_lower:
        return "common"
    if "/shared/" in path_lower:
        return "shared"
    if "/pages/" in path_lower or "/containers/" in path_lower:
        return "page"

    return "unknown"


def determine_app(rel_path):
    """Determine which app a component belongs to."""
    path_parts = rel_path.replace("\\", "/").split("/")

    # WebV2: src/WebV2/apps/{app-name}/
    if "WebV2" in path_parts:
        try:
            idx = path_parts.index("apps")
            if idx + 1 < len(path_parts):
                return path_parts[idx + 1]
        except ValueError:
            pass
        # WebV2 libs
        try:
            idx = path_parts.index("libs")
            if idx + 1 < len(path_parts):
                return f"lib:{path_parts[idx + 1]}"
        except ValueError:
            pass

    # WebV1: src/Web/{AppClient}/
    if "Web" in path_parts and "WebV2" not in path_parts:
        try:
            idx = path_parts.index("Web")
            if idx + 1 < len(path_parts):
                return path_parts[idx + 1]
        except ValueError:
            pass

    return "unknown"


def determine_version(rel_path):
    """Determine Angular version (v1 or v2) based on path."""
    if "WebV2" in rel_path.replace("\\", "/"):
        return "v2"
    return "v1"


def get_scss_path(component_path):
    """Find sibling .scss file for a component."""
    scss_path = component_path.replace(".component.ts", ".component.scss")
    if os.path.exists(scss_path):
        return os.path.basename(scss_path)
    return None


def get_store_path(component_path):
    """Find sibling .store.ts file for a component."""
    store_path = component_path.replace(".component.ts", ".store.ts")
    if os.path.exists(store_path):
        return os.path.basename(store_path)
    return None


# ---------------------------------------------------------------------------
# Route extraction
# ---------------------------------------------------------------------------

def extract_routes_from_file(file_path, project_root):
    """Extract route definitions from a routing file."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except Exception:
        return []

    routes = []
    # Find path + component pairs
    paths = RE_ROUTE_PATH.findall(content)
    components = RE_ROUTE_COMPONENT.findall(content)

    # Simple pairing: each path matched with nearby component
    for i, path in enumerate(paths):
        if path and path != "**":
            component = components[i] if i < len(components) else None
            routes.append({"path": path, "component": component})

    return routes


def build_route_index(project_root, include_v1=True):
    """Build route path → component mapping from all routing files."""
    route_map = {}

    # WebV2 route files
    v2_patterns = [
        os.path.join(project_root, WEBV2_DIR, "apps", "**", "routes.ts"),
        os.path.join(project_root, WEBV2_DIR, "apps", "**", "*.routes.ts"),
    ]

    # WebV1 route files
    v1_patterns = [
        os.path.join(project_root, WEBV1_DIR, "**", "*routing*.ts"),
        os.path.join(project_root, WEBV1_DIR, "**", "*routes*.ts"),
    ] if include_v1 else []

    for pattern in v2_patterns + v1_patterns:
        for route_file in glob.glob(pattern, recursive=True):
            if should_skip(route_file):
                continue
            routes = extract_routes_from_file(route_file, project_root)
            for route in routes:
                if route["component"]:
                    route_map[route["component"]] = route["path"]

    return route_map


# ---------------------------------------------------------------------------
# Main indexing logic
# ---------------------------------------------------------------------------

def index_component(component_path, project_root, route_map):
    """Index a single component file, returning its metadata dict."""
    try:
        with open(component_path, "r", encoding="utf-8", errors="replace") as f:
            ts_content = f.read()
    except Exception:
        return None

    selector = extract_selector(ts_content)
    if not selector:
        return None  # Not a valid component

    class_name, base_class = extract_class_info(ts_content)
    rel_path = os.path.relpath(component_path, project_root)
    html_content, template_ref = get_template_content(component_path, ts_content)

    bem_block = extract_bem_root(html_content)
    child_selectors = extract_child_selectors(html_content)
    text_content = extract_text_content(html_content)
    layer = determine_layer(rel_path)
    app = determine_app(rel_path)
    version = determine_version(rel_path)
    scss = get_scss_path(component_path)
    store = get_store_path(component_path)

    # Route path lookup
    route_path = route_map.get(class_name)

    component_data = {
        "selector": selector,
        "className": class_name,
        "filePath": rel_path.replace("\\", "/"),
        "version": version,
        "app": app,
        "layer": layer,
    }

    # Optional fields — only include if present (keeps JSON smaller)
    if bem_block:
        component_data["bemBlock"] = bem_block
    if template_ref:
        component_data["templatePath"] = template_ref
    if scss:
        component_data["scssPath"] = scss
    if store:
        component_data["storePath"] = store
    if base_class:
        component_data["baseClass"] = base_class
    if route_path:
        component_data["routePath"] = route_path
    if child_selectors:
        component_data["childSelectors"] = child_selectors
    if text_content:
        component_data["textContent"] = text_content

    return component_data


def build_reverse_indexes(components):
    """Build reverse lookup indexes: selector→paths, bem→paths."""
    selector_index = {}
    bem_index = {}

    for comp in components:
        sel = comp["selector"]
        path = comp["filePath"]

        if sel not in selector_index:
            selector_index[sel] = []
        selector_index[sel].append(path)

        bem = comp.get("bemBlock")
        if bem:
            if bem not in bem_index:
                bem_index[bem] = []
            bem_index[bem].append(path)

    return selector_index, bem_index


def build_parent_index(components, selector_index):
    """Build parent selector index: which components use this selector as a child."""
    parent_index = {}  # selector → list of parent component selectors

    for comp in components:
        children = comp.get("childSelectors", [])
        for child_sel in children:
            if child_sel not in parent_index:
                parent_index[child_sel] = []
            parent_index[child_sel].append(comp["selector"])

    # Deduplicate parent lists
    for sel in parent_index:
        parent_index[sel] = sorted(set(parent_index[sel]))

    return parent_index


def build_route_tree(components):
    """Build route path → component file path mapping grouped by app."""
    route_tree = {}
    for comp in components:
        route = comp.get("routePath")
        if route:
            app = comp["app"]
            if app not in route_tree:
                route_tree[app] = {}
            route_tree[app][route] = comp["filePath"]
    return route_tree


def get_git_changed_components(project_root, base_ref="HEAD"):
    """Get list of *.component.ts files changed relative to a git ref.

    Includes: modified, added, renamed components in working tree + staged.
    If base_ref is 'HEAD', compares working tree against last commit.
    If base_ref is a branch/tag, compares current HEAD against that ref.
    """
    try:
        # Changed in working tree + staged (uncommitted changes)
        result = subprocess.run(
            ["git", "diff", "--name-only", "--diff-filter=AMRC", base_ref, "--", "*.component.ts"],
            capture_output=True, text=True, cwd=str(project_root),
        )
        changed = set(result.stdout.strip().splitlines()) if result.stdout.strip() else set()

        # Also include untracked new component files
        result_untracked = subprocess.run(
            ["git", "ls-files", "--others", "--exclude-standard", "--", "*.component.ts"],
            capture_output=True, text=True, cwd=str(project_root),
        )
        untracked = set(result_untracked.stdout.strip().splitlines()) if result_untracked.stdout.strip() else set()

        # Detect deleted components
        result_deleted = subprocess.run(
            ["git", "diff", "--name-only", "--diff-filter=D", base_ref, "--", "*.component.ts"],
            capture_output=True, text=True, cwd=str(project_root),
        )
        deleted = set(result_deleted.stdout.strip().splitlines()) if result_deleted.stdout.strip() else set()

        # Also check changed HTML templates — their parent component needs re-indexing
        result_html = subprocess.run(
            ["git", "diff", "--name-only", "--diff-filter=AMRC", base_ref, "--", "*.component.html"],
            capture_output=True, text=True, cwd=str(project_root),
        )
        changed_html = set(result_html.stdout.strip().splitlines()) if result_html.stdout.strip() else set()
        # Map .component.html -> .component.ts
        for html_path in changed_html:
            ts_path = html_path.replace(".component.html", ".component.ts")
            changed.add(ts_path)

        return changed | untracked, deleted
    except (subprocess.SubprocessError, FileNotFoundError):
        return set(), set()


def load_existing_index(output_path):
    """Load existing component-index.json for incremental update."""
    if not os.path.exists(output_path):
        return None
    try:
        with open(output_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def main():
    parser = argparse.ArgumentParser(description="Build BravoSUITE component index")
    parser.add_argument(
        "--output", "-o",
        default=None,
        help=f"Output file path (default: {{project_root}}/{DEFAULT_OUTPUT})"
    )
    parser.add_argument(
        "--webv2-only",
        action="store_true",
        help="Only index WebV2 components (skip WebV1)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Print progress and warnings"
    )
    parser.add_argument(
        "--git-changes",
        nargs="?",
        const="HEAD",
        default=None,
        metavar="REF",
        help="Incremental update: only re-index components changed since REF (default: HEAD)"
    )
    args = parser.parse_args()

    project_root = find_project_root()
    output_path = args.output or os.path.join(project_root, DEFAULT_OUTPUT)

    if args.verbose:
        print(f"Project root: {project_root}")
        print(f"Output: {output_path}")

    # Build route map (always needed)
    route_map = build_route_index(project_root, include_v1=not args.webv2_only)
    if args.verbose:
        print(f"Found {len(route_map)} route-to-component mappings")

    # --- Incremental mode: merge changes into existing index ---
    if args.git_changes is not None:
        existing_index = load_existing_index(output_path)
        if existing_index is None:
            print("No existing index found. Running full scan instead.")
            args.git_changes = None  # Fall through to full scan
        else:
            changed_paths, deleted_paths = get_git_changed_components(project_root, args.git_changes)
            if not changed_paths and not deleted_paths:
                print("No component changes detected. Index is up to date.")
                return

            if args.verbose:
                print(f"Changed/added: {len(changed_paths)} files")
                print(f"Deleted: {len(deleted_paths)} files")

            # Normalize deleted paths for comparison
            deleted_normalized = {p.replace("\\", "/") for p in deleted_paths}

            # Start from existing components, removing deleted + changed (will re-add changed)
            changed_normalized = set()
            for p in changed_paths:
                changed_normalized.add(p.replace("\\", "/"))

            components = [
                c for c in existing_index.get("components", [])
                if c["filePath"] not in deleted_normalized
                and c["filePath"] not in changed_normalized
            ]

            removed_count = len(existing_index.get("components", [])) - len(components)
            if args.verbose:
                print(f"Kept {len(components)} unchanged components, removed {removed_count}")

            # Re-index changed/added files
            added = 0
            for rel_path in changed_paths:
                abs_path = os.path.join(project_root, rel_path)
                if os.path.exists(abs_path) and not should_skip(abs_path):
                    result = index_component(abs_path, project_root, route_map)
                    if result:
                        components.append(result)
                        added += 1

            print(f"Incremental update: +{added} re-indexed, -{len(deleted_normalized)} deleted, {len(components)} total")

    # --- Full scan mode ---
    if args.git_changes is None:
        component_files = []

        # WebV2 components
        v2_pattern = os.path.join(project_root, WEBV2_DIR, "**", "*.component.ts")
        v2_files = [f for f in glob.glob(v2_pattern, recursive=True) if not should_skip(f)]
        component_files.extend(v2_files)
        if args.verbose:
            print(f"Found {len(v2_files)} WebV2 component files")

        # WebV1 components (unless --webv2-only)
        if not args.webv2_only:
            v1_pattern = os.path.join(project_root, WEBV1_DIR, "**", "*.component.ts")
            v1_files = [f for f in glob.glob(v1_pattern, recursive=True) if not should_skip(f)]
            component_files.extend(v1_files)
            if args.verbose:
                print(f"Found {len(v1_files)} WebV1 component files")

        if args.verbose:
            print(f"Total: {len(component_files)} component files")

        # Index all components
        components = []
        skipped = 0
        for comp_path in component_files:
            result = index_component(comp_path, project_root, route_map)
            if result:
                components.append(result)
            else:
                skipped += 1

        if args.verbose:
            print(f"Indexed {len(components)} components, skipped {skipped}")

    # Build reverse indexes
    selector_index, bem_index = build_reverse_indexes(components)
    parent_index = build_parent_index(components, selector_index)
    route_tree = build_route_tree(components)

    # Add parentSelectors to components
    for comp in components:
        parents = parent_index.get(comp["selector"], [])
        if parents:
            comp["parentSelectors"] = parents

    # Compute stats
    stats = {
        "total": len(components),
        "v2": sum(1 for c in components if c["version"] == "v2"),
        "v1": sum(1 for c in components if c["version"] == "v1"),
        "pages": sum(1 for c in components if c["layer"] == "page"),
        "domain": sum(1 for c in components if c["layer"] in ("domain", "domain-shared")),
        "common": sum(1 for c in components if c["layer"] == "common"),
        "platform": sum(1 for c in components if c["layer"] == "platform"),
        "withRoutes": sum(1 for c in components if "routePath" in c),
        "withBem": sum(1 for c in components if "bemBlock" in c),
        "withStore": sum(1 for c in components if "storePath" in c),
    }

    # Build final output
    index = {
        "version": "1.0.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "stats": stats,
        "components": sorted(components, key=lambda c: c["filePath"]),
        "routes": route_tree,
        "selectorIndex": {k: v for k, v in sorted(selector_index.items())},
        "bemIndex": {k: v for k, v in sorted(bem_index.items())},
    }

    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    # Write JSON output
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

    # Summary
    print(f"Component index generated: {output_path}")
    print(f"  Total: {stats['total']} components ({stats['v2']} V2, {stats['v1']} V1)")
    print(f"  Pages: {stats['pages']}, Domain: {stats['domain']}, Common: {stats['common']}, Platform: {stats['platform']}")
    print(f"  With routes: {stats['withRoutes']}, With BEM: {stats['withBem']}, With store: {stats['withStore']}")


if __name__ == "__main__":
    main()
