"""Built-in regex patterns for frontend HTTP calls and backend route definitions.

Each framework entry has:
- extensions: file extensions to scan
- patterns: list of regex strings. Each must have at least one capture group for the URL path.
  If two groups: first is HTTP method, second is path.
  If one group: path only (method defaults to GET).

Generic: supports Angular, React, Vue, Next.js, Svelte (frontend) and
.NET, Spring, Express, NestJS, FastAPI, Django, Rails, Go (backend).
Custom patterns from project-config.json extend (not replace) these defaults.
"""

from __future__ import annotations

FRONTEND_PATTERNS: dict[str, dict] = {
    "angular": {
        "extensions": [".ts"],
        "patterns": [
            # this.http.get<T>('/api/users') or this.httpClient.post('/api/users', body)
            r"(?:this\.http|this\.httpClient)\s*\.\s*(get|post|put|delete|patch)\s*[<(]\s*['\"]([^\"']+)",
            # Base service pattern: this.get('/path'), this.post<T>('/path', body)
            r"this\.\s*(get|post|put|delete|patch)\s*[<(]\s*['\"]([^\"']+)",
        ],
    },
    "react": {
        "extensions": [".ts", ".tsx", ".js", ".jsx"],
        "patterns": [
            # fetch('/api/users') — method defaults to GET
            r"fetch\s*\(\s*['\"]([^\"']+)",
            # axios.get('/api/users')
            r"axios\s*\.\s*(get|post|put|delete|patch)\s*\(\s*['\"]([^\"']+)",
            # useSWR('/api/users') or useQuery('/api/users')
            r"(?:useSWR|useQuery)\s*\(\s*['\"]([^\"']+)",
        ],
    },
    "vue": {
        "extensions": [".ts", ".js", ".vue"],
        "patterns": [
            r"fetch\s*\(\s*['\"]([^\"']+)",
            r"axios\s*\.\s*(get|post|put|delete|patch)\s*\(\s*['\"]([^\"']+)",
            # $http.get('/api/users') (Vue 2)
            r"\$http\s*\.\s*(get|post|put|delete|patch)\s*\(\s*['\"]([^\"']+)",
        ],
    },
    "nextjs": {
        "extensions": [".ts", ".tsx", ".js", ".jsx"],
        "patterns": [
            r"fetch\s*\(\s*['\"]([^\"']+)",
            r"axios\s*\.\s*(get|post|put|delete|patch)\s*\(\s*['\"]([^\"']+)",
            # Next.js API routes in pages/api/ or app/api/
            r"(?:useSWR|useQuery)\s*\(\s*['\"]([^\"']+)",
        ],
    },
    "svelte": {
        "extensions": [".ts", ".js", ".svelte"],
        "patterns": [
            r"fetch\s*\(\s*['\"]([^\"']+)",
        ],
    },
    "generic": {
        "extensions": [".ts", ".js", ".tsx", ".jsx", ".vue", ".svelte"],
        "patterns": [
            r"(?:http|axios|fetch)\s*\.\s*(get|post|put|delete|patch)\s*[(<]\s*['\"]([^\"']+)",
            r"fetch\s*\(\s*['\"]([^\"']+)",
            # Base service pattern (common in Angular/Vue frameworks)
            r"this\.\s*(get|post|put|delete|patch)\s*[<(]\s*['\"]([^\"']+)",
        ],
    },
}

BACKEND_PATTERNS: dict[str, dict] = {
    "dotnet": {
        "extensions": [".cs"],
        "patterns": [
            # [HttpGet("users/{id}")] or [HttpPost("users")]
            r"\[\s*(HttpGet|HttpPost|HttpPut|HttpDelete|HttpPatch)\s*\(\s*\"([^\"]+)\"",
            # [Route("api/users")]
            r"\[\s*Route\s*\(\s*\"([^\"]+)\"",
        ],
        # Class-level route prefix: [Route("api/[controller]")]
        "class_route_pattern": r"\[\s*Route\s*\(\s*\"([^\"]+)\"",
    },
    "spring": {
        "extensions": [".java", ".kt"],
        "patterns": [
            # @GetMapping("/api/users") or @RequestMapping(value = "/api/users")
            r"@(?:Request|Get|Post|Put|Delete|Patch)Mapping\s*\(\s*(?:value\s*=\s*)?[\"']([^\"']+)",
        ],
        "class_route_pattern": r"@RequestMapping\s*\(\s*(?:value\s*=\s*)?[\"']([^\"']+)",
    },
    "express": {
        "extensions": [".js", ".ts", ".cjs", ".mjs"],
        "patterns": [
            # app.get('/api/users', handler) or router.post('/api/users', handler)
            r"(?:app|router)\s*\.\s*(get|post|put|delete|patch)\s*\(\s*['\"]([^\"']+)",
        ],
    },
    "nestjs": {
        "extensions": [".ts"],
        "patterns": [
            # @Get('users') or @Post('users/:id')
            r"@(Get|Post|Put|Delete|Patch)\s*\(\s*['\"]([^\"']+)",
        ],
        "class_route_pattern": r"@Controller\s*\(\s*['\"]([^\"']+)",
    },
    "fastapi": {
        "extensions": [".py"],
        "patterns": [
            # @app.get("/api/users") or @router.post("/api/users")
            r"@(?:app|router)\s*\.\s*(get|post|put|delete|patch)\s*\(\s*['\"]([^\"']+)",
        ],
    },
    "django": {
        "extensions": [".py"],
        "patterns": [
            # path('api/users/', views.users)
            r"path\s*\(\s*['\"]([^\"']+)",
            # re_path(r'^api/users/', views.users)
            r"re_path\s*\(\s*r?['\"]([^\"']+)",
        ],
    },
    "rails": {
        "extensions": [".rb"],
        "patterns": [
            # get '/api/users', to: 'users#index'
            r"(?:get|post|put|patch|delete)\s+['\"]([^\"']+)",
            # resources :users
            r"resources?\s+:(\w+)",
        ],
    },
    "go": {
        "extensions": [".go"],
        "patterns": [
            # r.GET("/api/users", handler) — Gin
            r"\.(?:GET|POST|PUT|DELETE|PATCH)\s*\(\s*['\"]([^\"']+)",
            # e.GET("/api/users", handler) — Echo
            r"\.(?:Get|Post|Put|Delete|Patch)\s*\(\s*['\"]([^\"']+)",
        ],
    },
    "generic": {
        "extensions": [".py", ".js", ".ts", ".java", ".cs", ".go", ".rb"],
        "patterns": [
            r"['\"]/(api|v\d)/[^\"']+['\"]",
        ],
    },
}
