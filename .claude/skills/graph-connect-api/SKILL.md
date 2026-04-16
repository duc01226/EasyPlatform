---
name: graph-connect-api
description: '[Code Intelligence] Detect frontend-to-backend API connections using the knowledge graph. Matches HTTP calls (Angular, React, Vue, fetch, axios) with backend routes (.NET, Spring, Express, FastAPI) via project-config.json configuration.'
version: 2.0.0
---

# Connect API

Detect frontend HTTP calls and match them to backend route definitions, creating `API_ENDPOINT` edges in the knowledge graph.

## How It Works

The connector scans frontend files for HTTP calls and backend files for route definitions, normalizes URL paths, and matches them using a multi-strategy algorithm:

1. **Exact match** — normalized paths identical
2. **Prefix-augmented** — prepends `routePrefix` to frontend path
3. **Suffix match** — strips `routePrefix` from backend, matches remainder
4. **Deep strip** — strips leading `{param}` segments from backend (handles class-level `{companyId}` routes)
5. **Controller resolution** — resolves .NET `[controller]` placeholder to actual class name

## Zero-Config Auto-Detection

**No configuration needed.** The connector auto-detects frameworks by scanning for marker files:

| Frontend | Markers                                                    |
| -------- | ---------------------------------------------------------- |
| Angular  | `angular.json`, `nx.json`, `@angular/core` in package.json |
| React    | `react` in package.json                                    |
| Vue      | `vue.config.js`, `vue` in package.json                     |
| Next.js  | `next.config.js`, `next` in package.json                   |
| Svelte   | `svelte.config.js`, `svelte` in package.json               |

| Backend | Markers                                     |
| ------- | ------------------------------------------- |
| .NET    | `*.csproj` with `Microsoft.AspNetCore`      |
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
                "framework": "angular",
                "paths": ["src/app/"],
                "customPatterns": ["this\\.\\s*(get|post|put|delete|patch)\\s*[<(]\\s*['\"]([^\"']+)"]
            },
            "backend": {
                "framework": "dotnet",
                "paths": ["src/Api/Controllers/"],
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

## Related Skills

- `/graph-build` — Build/update the knowledge graph (prerequisite)
- `/graph-trace` — Trace full system flow (API_ENDPOINT edges enable frontend-to-backend tracing)
- `/graph-blast-radius` — Analyze structural impact of changes
- `/graph-query` — Query code relationships in the graph

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
