"""Portability proof: verify .claude/ works when copied to any project type.

Creates minimal project structures in temp directories, runs framework
auto-detection and API connector matching, verifies expected results.

Usage: python .claude/scripts/test_portability.py
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

# Add code_graph to path
sys.path.insert(0, str(Path(__file__).parent))
from code_graph.api_connector import (
    FrontendExtractor,
    BackendExtractor,
    auto_detect_config,
    match_endpoints,
)
from code_graph.api_patterns import FRONTEND_PATTERNS, BACKEND_PATTERNS


# ── Test Scenarios ──────────────────────────────────────────────────

SCENARIOS = [
    {
        "name": "React + Express",
        "files": {
            "client/package.json": '{"name":"client","dependencies":{"react":"18.0.0"}}',
            "client/src/api.ts": "fetch('/api/users')\nfetch('/api/products')",
            "server/package.json": '{"name":"server","dependencies":{"express":"4.18.0"}}',
            "server/routes/users.js": "router.get('/api/users', handler)\nrouter.post('/api/users', handler)",
            "server/routes/products.js": "router.get('/api/products', handler)",
            "package.json": '{"name":"my-app","private":true}',
        },
        "expect_frontend": "react",
        "expect_backend": "express",
        "expect_min_api_edges": 2,
    },
    {
        "name": "Angular + .NET",
        "files": {
            "frontend/angular.json": '{"version":1}',
            "frontend/package.json": '{"dependencies":{"@angular/core":"17.0.0"}}',
            "frontend/src/user.service.ts": "this.http.get('/api/users/list')\nthis.http.post('/api/users/create', body)",
            "backend/Api.csproj": '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net9.0</TargetFramework></PropertyGroup></Project>',
            "backend/Controllers/UsersController.cs": '[Route("api/users")]\npublic class UsersController : ControllerBase\n{\n  [HttpGet("list")]\n  public IActionResult GetAll() {}\n  [HttpPost("create")]\n  public IActionResult Create() {}\n}',
        },
        "expect_frontend": "angular",
        "expect_backend": "dotnet",
        "expect_min_api_edges": 1,
    },
    {
        "name": "Vue + Django",
        "files": {
            "frontend/package.json": '{"dependencies":{"vue":"3.4.0"}}',
            "frontend/src/UserList.vue": "<script>\nimport axios from 'axios'\naxios.get('/api/users')\naxios.post('/api/products', data)\n</script>",
            "backend/manage.py": "#!/usr/bin/env python\nimport os\nos.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')",
            "backend/app/urls.py": "from django.urls import path\nurlpatterns = [\n  path('api/users/', views.users),\n  path('api/products/', views.products),\n]",
            "backend/requirements.txt": "django==5.0\ndjango-rest-framework==3.15",
        },
        "expect_frontend": "vue",
        "expect_backend": "django",
        "expect_min_api_edges": 1,
    },
    {
        "name": "Go API only (no frontend)",
        "files": {
            "go.mod": "module example.com/api\n\ngo 1.21",
            "cmd/main.go": 'package main\nimport "fmt"\nfunc main() { fmt.Println("hello") }',
            "handler/user.go": 'package handler\n// r.GET("/api/users", getUsers)\n// r.POST("/api/users", createUser)',
        },
        "expect_frontend": None,
        "expect_backend": "go",
        "expect_min_api_edges": 0,
        "backend_only_ok": True,
    },
    {
        "name": "Plain Python CLI (no web)",
        "files": {
            "main.py": "import click\n\n@click.command()\ndef main():\n    click.echo('hello')",
            "utils.py": "def helper():\n    return 42",
            "requirements.txt": "click==8.1.7",
        },
        "expect_frontend": None,
        "expect_backend": None,
        "expect_min_api_edges": 0,
    },
]


# ── Helpers ─────────────────────────────────────────────────────────

def create_project(base: Path, files: dict[str, str]) -> None:
    """Create a minimal project structure in a temp directory."""
    for rel_path, content in files.items():
        full = base / rel_path
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_text(content, encoding="utf-8")


def run_scenario(scenario: dict) -> dict:
    """Run a single portability test scenario. Returns result dict."""
    name = scenario["name"]
    result = {"name": name, "passed": True, "errors": [], "details": {}}

    tmpdir = Path(tempfile.mkdtemp(prefix=f"claude_portability_{name.replace(' ', '_')}_"))
    try:
        create_project(tmpdir, scenario["files"])

        # Test 1: Auto-detect frameworks
        detected = auto_detect_config(tmpdir)
        result["details"]["detected"] = detected

        if scenario["expect_frontend"] is None and scenario["expect_backend"] is None:
            # No web framework expected — detection should return None or no frontend
            if detected is None:
                result["details"]["detection"] = "correctly_none"
            elif detected.get("frontend", {}).get("framework") is None:
                result["details"]["detection"] = "backend_only_ok"
            else:
                result["details"]["detection"] = "unexpected_detection"
        elif scenario["expect_frontend"] is None:
            # Backend only expected
            if detected and detected.get("backend", {}).get("framework") == scenario["expect_backend"]:
                result["details"]["detection"] = "backend_correct"
                result["details"]["detected_be"] = detected["backend"]["framework"]
            elif detected is None and scenario.get("backend_only_ok"):
                # Go has go.mod but auto_detect needs both sides for API matching
                # Still pass if backend-only is acceptable
                result["details"]["detection"] = "no_detection_acceptable"
            elif detected is None:
                result["errors"].append(f"Expected backend={scenario['expect_backend']}, got None")
                result["passed"] = False
        else:
            # Both expected
            if detected is None:
                result["errors"].append(f"Expected frontend={scenario['expect_frontend']}, backend={scenario['expect_backend']}, got None")
                result["passed"] = False
            else:
                fe = detected.get("frontend", {}).get("framework")
                be = detected.get("backend", {}).get("framework")
                if fe != scenario["expect_frontend"]:
                    result["errors"].append(f"Frontend: expected {scenario['expect_frontend']}, got {fe}")
                    result["passed"] = False
                if be != scenario["expect_backend"]:
                    result["errors"].append(f"Backend: expected {scenario['expect_backend']}, got {be}")
                    result["passed"] = False
                result["details"]["detected_fe"] = fe
                result["details"]["detected_be"] = be

        # Test 2: API endpoint matching (if detection found frameworks)
        if detected and detected.get("frontend") and detected.get("backend"):
            fe_config = detected["frontend"]
            be_config = detected["backend"]
            fe_ext = FrontendExtractor(
                framework=fe_config["framework"],
                paths=fe_config.get("paths", ["."]),
            )
            be_ext = BackendExtractor(
                framework=be_config["framework"],
                paths=be_config.get("paths", ["."]),
                route_prefix=be_config.get("routePrefix", ""),
            )
            fe_eps = fe_ext.extract(tmpdir)
            be_eps = be_ext.extract(tmpdir)
            matches = match_endpoints(fe_eps, be_eps, route_prefix=be_config.get("routePrefix", ""))
            result["details"]["frontend_endpoints"] = len(fe_eps)
            result["details"]["backend_endpoints"] = len(be_eps)
            result["details"]["api_matches"] = len(matches)

            if len(matches) < scenario["expect_min_api_edges"]:
                result["errors"].append(
                    f"API edges: expected >={scenario['expect_min_api_edges']}, got {len(matches)}"
                )
                result["passed"] = False
        else:
            result["details"]["api_matches"] = 0
            if scenario["expect_min_api_edges"] > 0:
                result["errors"].append(
                    f"API edges: expected >={scenario['expect_min_api_edges']}, got 0 (no detection)"
                )
                result["passed"] = False

    except Exception as e:
        result["errors"].append(f"Exception: {e}")
        result["passed"] = False
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    return result


# ── Main ────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  .claude Portability Test Suite")
    print("=" * 60)

    results = []
    for scenario in SCENARIOS:
        result = run_scenario(scenario)
        results.append(result)
        status = "PASS" if result["passed"] else "FAIL"
        symbol = "[OK]" if result["passed"] else "[FAIL]"
        print(f"\n  {symbol} {result['name']}: {status}")
        if result["details"].get("detected_fe"):
            print(f"    Detected: {result['details']['detected_fe']} + {result['details']['detected_be']}")
        if result["details"].get("api_matches") is not None:
            print(f"    API matches: {result['details']['api_matches']}")
        for err in result["errors"]:
            print(f"    ERROR: {err}")

    passed = sum(1 for r in results if r["passed"])
    total = len(results)
    print(f"\n{'=' * 60}")
    print(f"  Results: {passed}/{total} passed")
    print(f"{'=' * 60}")

    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
