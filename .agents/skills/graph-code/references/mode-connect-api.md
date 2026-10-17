# `$graph-code --mode=connect-api` — detect frontend-to-backend API connections

> Loaded by `graph-code/SKILL.md`'s Mode Dispatch when invoked as `$graph-code --mode=connect-api`. This contract REPLACES every other mode for the invocation.

**Goal:** Detect frontend-to-backend API connections using the knowledge graph. Matches configured frontend HTTP-call patterns with configured backend route patterns via `project-config.json` configuration, creating `API_ENDPOINT` edges.

**Workflow:** Run the connector → report frontend calls found, backend routes found, matches created and edge count.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.

<!-- SKILL-NAV:START -->
## Contents

- [How It Works](#how-it-works)
- [Zero-Config Auto-Detection](#zero-config-auto-detection)
- [Auto-Run Behavior](#auto-run-behavior)
- [Custom Config (Optional)](#custom-config-optional)
- [Manual Run](#manual-run)
- [Steps (when manually invoked)](#steps-when-manually-invoked)
- [Matching Strategies](#matching-strategies)
- [See Also](#see-also)
- [Related Modes](#related-modes)

<!-- SKILL-NAV:END -->

## How It Works

The connector scans frontend files for HTTP calls and backend files for route definitions, normalizes URL paths, and matches them using a multi-strategy algorithm:

1. **Exact match** — normalized paths identical
2. **Prefix-augmented** — prepends `routePrefix` to frontend path
3. **Suffix match** — strips `routePrefix` from backend, matches remainder
4. **Deep strip** — strips leading `{param}` segments from backend (handles class-level `{companyId}` routes)
5. **Controller resolution** — resolves configured route placeholders to actual route owner names

## Zero-Config Auto-Detection

**No configuration needed.** The connector auto-detects frameworks by scanning for marker files:

| Frontend | Markers                                                    |
| -------- | ---------------------------------------------------------- |
| Configured frontend framework | framework manifests and package metadata from project config |
| React    | `react` in package.json                                    |
| Vue      | `vue.config.js`, `vue` in package.json                     |
| Next.js  | `next.config.js`, `next` in package.json                   |
| Svelte   | `svelte.config.js`, `svelte` in package.json               |

| Backend | Markers                                     |
| ------- | ------------------------------------------- |
| Configured backend framework | backend manifests and route metadata from project config |
| Spring  | `pom.xml`/`build.gradle` with `spring-boot` |
| Express | `express` in package.json                   |
| NestJS  | `@nestjs/core` in package.json              |
| FastAPI | `fastapi` in requirements.txt               |
| Django  | `manage.py` with django                     |
| Rails   | `Gemfile` with `rails`                      |
| Go      | `go.mod` (Gin/Echo patterns)                |

## Auto-Run Behavior

The connector runs **automatically** in these situations:

| When                                    | Behavior                                                     |
| --------------------------------------- | ------------------------------------------------------------ |
| After `build` / `update` / `sync`       | Always runs via `_auto_connect()`                            |
| First `trace` / `query` / `connections` | Runs once via `_ensure_connectors_ran()` if never run before |

**You almost never need to run this manually.** The graph CLI handles it automatically.

## Custom Config (Optional)

For projects with custom HTTP patterns (e.g., base class API service), add to `docs/project-config.json`:

```json
{
    "graphConnectors": {
        "apiEndpoints": {
            "enabled": true,
            "frontend": {
                "framework": "{configured-frontend-framework}",
                "paths": ["{frontend-source-root}/"],
                "customPatterns": ["this\\.\\s*(get|post|put|delete|patch)\\s*[<(]\\s*['\"]([^\"']+)"]
            },
            "backend": {
                "framework": "dotnet",
                "paths": ["{api-source-root}/"],
                "routePrefix": "api",
                "customPatterns": []
            }
        }
    }
}
```

Custom patterns **extend** (not replace) built-in framework patterns. Explicit config **overrides** auto-detected config for paths.

## Manual Run

```bash
python .claude/scripts/code_graph connect-api --json
```

## Steps (when manually invoked)

1. **Run connector** via Bash:
    ```bash
    python .claude/scripts/code_graph connect-api --json
    ```
2. **Report results:** Frontend calls found, backend routes found, matches created, edge count

## Matching Strategies

The connector tries 5 strategies in order (highest confidence first):

| #   | Strategy         | Confidence | Example                                           |
| --- | ---------------- | ---------- | ------------------------------------------------- |
| 1   | Exact match      | 1.0        | FE `/api/users` = BE `/api/users`                 |
| 2   | Prefix-augmented | 0.95       | FE `/users` + prefix `api` → `/api/users`         |
| 3   | Suffix match     | 0.9        | BE `/api/users` stripped → `/users` = FE `/users` |
| 4   | Deep strip       | 0.85       | BE `/api/{param}/users` → `/users` = FE `/users`  |
| 5   | Deep strip both  | 0.8        | Both sides have `{param}` segments stripped       |

## See Also

- **Implicit Connections** — For event buses, entity events: `graphConnectors.implicitConnections[]` in project-config.json. CLI: `connect-implicit --json`

## Related Modes

- `$graph-code --mode=build` — Build/update the knowledge graph (prerequisite)
- `$graph-code --mode=trace` — Trace full system flow (API_ENDPOINT edges enable frontend-to-backend tracing)
- `$graph-code --mode=blast-radius` — Analyze structural impact of changes
- `$graph-code --mode=query` — Query code relationships in the graph
