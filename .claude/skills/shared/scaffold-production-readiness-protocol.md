# Scaffold Production Readiness Protocol

**Version:** 1.1.0 | **Last Updated:** 2026-03-09

Every scaffolded project MUST include these 4 production-readiness foundations. This protocol is the single source of truth — referenced by `/scaffold`, `/refine`, `/architecture-design`, and `/story` skills.

---

## Summary

This protocol defines the **4 mandatory production-readiness foundations** that every scaffolded project must implement before feature development begins. It serves as the shared contract between `/scaffold`, `/refine`, `/architecture-design`, and `/story` skills — ensuring consistent project bootstrapping across all greenfield and big-feature workflows.

### Foundations at a Glance

| #   | Foundation                         | Purpose                                                    | Min Files | Effort |
| --- | ---------------------------------- | ---------------------------------------------------------- | --------- | ------ |
| 1   | **Code Quality Tooling**           | Linting, formatting, pre-commit hooks, CI quality gates    | 5         | 1-2 SP |
| 2   | **Error Handling Foundation**      | HTTP error interception, classification, user notification | 4         | 2-3 SP |
| 3   | **Loading State Management**       | Request tracking, loading indicators, skip tokens          | 3         | 1-2 SP |
| 4   | **Docker Development Environment** | Compose profiles, multi-stage Dockerfile, health checks    | 5         | 2-3 SP |

### How It Works

1. **Architecture-Design** (`/architecture-design`) evaluates tech stack options and outputs a **Scaffold Handoff** table with chosen tools per concern.
2. **Scaffold** (`/scaffold`) reads the handoff table and generates actual config files using this protocol's templates and option tables.
3. **Refine** (`/refine`) includes a **Production Readiness Concerns** table in every PBI, marking each foundation as Required/Existing/No.
4. **Story** (`/story`) creates **Sprint 0 foundation stories** (one per required concern) before any feature stories.

### Key Design Principles

- **Tech-stack agnostic** — Each foundation provides option tables for multiple stacks (Angular/React/Vue, .NET/Node/Python/Go) with trade-off comparisons.
- **AskUserQuestion-driven** — Present 2-3 options per concern; never auto-select tooling without user confirmation.
- **Verification-first** — Every foundation includes a verification checklist that must pass before marking scaffold complete.
- **Counter-based loading** — Use request counters (not booleans) to handle concurrent API calls correctly.
- **Security defaults** — Port binding to `127.0.0.1`, non-root Docker users, zero-warning policies for new projects.
- **Opt-out supported** — Docker can be skipped if explicitly declined; document the decision in the PBI.

### When This Protocol Applies

| Scenario                                     | Applies? | Notes                                                       |
| -------------------------------------------- | -------- | ----------------------------------------------------------- |
| Greenfield project (`/greenfield`)           | Yes      | All 4 foundations required                                  |
| Big feature with new module (`/big-feature`) | Partial  | Evaluate per-concern; existing project may have 1-3 already |
| Feature in existing codebase (`/feature`)    | No       | Foundations already exist; use existing patterns            |
| Refactoring / bugfix                         | No       | No scaffold needed                                          |

### Cross-Reference

- **Consumed by:** `/scaffold` (file generation), `/refine` (PBI concerns table), `/story` (Sprint 0 stories), `/architecture-design` (Step 9 output)
- **Related docs:** `docs/project-reference/project-structure-reference.md` (ports, tech stack), `docs/getting-started.md` (Docker setup)
- **Templates:** Section 5 (Integration Points) defines the exact handoff formats between skills

---

## 1. Code Quality Tooling

### What to Generate

| File                   | Purpose                                                     | Always?      |
| ---------------------- | ----------------------------------------------------------- | ------------ |
| `.editorconfig`        | Cross-IDE consistency (indentation, encoding, line endings) | Yes          |
| Linter config          | Static analysis rules                                       | Yes          |
| Formatter config       | Code formatting rules                                       | Yes          |
| Pre-commit hook config | Run linter+formatter on commit                              | Yes          |
| CI quality gate step   | Fail pipeline on violations                                 | If CI exists |

### Tech Stack Options (Present 2-3 via AskUserQuestion)

**Frontend Linting (JS/TS):**

| Option                   | Speed   | Ecosystem                            | Best For                       |
| ------------------------ | ------- | ------------------------------------ | ------------------------------ |
| ESLint (flat config v9+) | Medium  | Largest plugin ecosystem             | Any JS/TS project              |
| Biome                    | Fast    | All-in-one (lint+format), Rust-based | Speed-focused, simple projects |
| oxlint                   | Fastest | Drop-in ESLint compat, limited rules | Large codebases needing speed  |

**Backend (.NET) Analyzers:**

| Option                 | Scope                                 | Config                  | Best For                   |
| ---------------------- | ------------------------------------- | ----------------------- | -------------------------- |
| Roslyn + SonarAnalyzer | Comprehensive (bugs, security, style) | `Directory.Build.props` | Any .NET project           |
| StyleCop.Analyzers     | Strict code style enforcement         | `.stylecop.json`        | Teams wanting strict style |
| Roslynator             | Extended diagnostics + refactorings   | `.roslynatorconfig`     | Teams wanting more rules   |

**Backend (Node.js/Python/Go):**

| Stack      | Default Linter                         | Default Formatter      |
| ---------- | -------------------------------------- | ---------------------- |
| Node.js/TS | ESLint flat config                     | Prettier               |
| Python     | Ruff (replaces flake8+isort+pyupgrade) | Ruff format (or Black) |
| Go         | golangci-lint                          | gofmt (built-in)       |
| Rust       | clippy                                 | rustfmt (built-in)     |

**Formatters:**

| Option        | Speed  | Languages              | Best For                     |
| ------------- | ------ | ---------------------- | ---------------------------- |
| Prettier      | Medium | JS/TS/CSS/HTML/JSON/MD | JS/TS ecosystem              |
| Biome         | Fast   | JS/TS/JSON             | Already using Biome for lint |
| dotnet-format | N/A    | C#                     | .NET projects                |

**Pre-commit Hooks:**

| Option              | Runtime     | Speed  | Best For                         |
| ------------------- | ----------- | ------ | -------------------------------- |
| Husky + lint-staged | Node.js     | Medium | JS/TS projects                   |
| Lefthook            | Go (binary) | Fast   | Polyglot, no Node dependency     |
| pre-commit (Python) | Python      | Medium | Python-heavy, large hook library |

### Strictness Defaults

- **New projects:** Zero warnings policy — treat warnings as errors
- **Existing projects:** Warning-only for first sprint, then escalate to errors
- **Always:** `strict: true` in TypeScript, `TreatWarningsAsErrors` in .NET
- **Escape hatch:** Individual `// eslint-disable-next-line` or `#pragma warning disable` with mandatory comment explaining WHY

### Verification Checklist

- [ ] Linter config exists at project root and `lint` script runs without config errors
- [ ] Formatter config exists and `format:check` script runs
- [ ] `.editorconfig` exists at project root
- [ ] Pre-commit hook triggers on `git commit` (test with empty commit)
- [ ] CI pipeline includes lint+format check step (if CI configured)

---

## 2. Error Handling Foundation

### What to Generate (4 files minimum)

| #   | File                       | Purpose                                                                  |
| --- | -------------------------- | ------------------------------------------------------------------------ |
| 1   | Error types/classification | Enum or union type: `network`, `validation`, `auth`, `server`, `unknown` |
| 2   | HTTP error interceptor     | Catches HTTP errors, classifies, routes to notification service          |
| 3   | Notification service       | Abstraction for displaying errors to user (toast, alert, inline)         |
| 4   | Global error handler       | Catches uncaught errors, logs, shows fallback UI                         |

### Framework-Specific Patterns

**Angular:**

```
- ErrorHandler (extends Angular ErrorHandler)
- HttpInterceptorFn (functional interceptor)
- NotificationService (@Injectable, uses toast library)
- Error types file (enum + helper functions)
```

**React:**

```
- ErrorBoundary component (class component with componentDidCatch)
- Axios/fetch interceptor (response error handler)
- useNotification hook or context provider
- Error types file (union type + type guards)
```

**Vue:**

```
- app.config.errorHandler (global error handler)
- Axios interceptor (response error handler)
- useNotification composable
- Error types file (enum + helper functions)
```

**Generic / Backend:**

```
- Error middleware (Express/Koa/ASP.NET middleware pipeline)
- Error response format (RFC 7807 Problem Details recommended)
- Error logging (structured, with correlation ID)
- Custom exception hierarchy (DomainException, ValidationException, NotFoundException)
```

### Error Classification Logic

```
HTTP 400 → validation error → show field-level errors
HTTP 401 → auth error → redirect to login
HTTP 403 → forbidden → show "no permission" message
HTTP 404 → not found → show "not found" message
HTTP 408/429 → retryable → auto-retry with backoff (optional)
HTTP 500+ → server error → show generic error + log details
Network error → connectivity → show "check connection" message
Unknown → unknown → log full error + show generic fallback
```

### Verification Checklist

- [ ] Throwing an unhandled error shows user-visible feedback (not silent)
- [ ] HTTP 500 response shows error notification to user
- [ ] HTTP 401 redirects to login (or refreshes token)
- [ ] Validation errors (400) display field-level messages
- [ ] Errors are logged with context (URL, method, correlation ID)

---

## 3. Loading State Management

### What to Generate (3 files minimum)

| #   | File                        | Purpose                                            |
| --- | --------------------------- | -------------------------------------------------- |
| 1   | Loading service/store       | Tracks pending requests, exposes `isLoading` state |
| 2   | HTTP loading interceptor    | Auto-tracks request lifecycle                      |
| 3   | Loading indicator component | Global or inline, with display delay               |

### Framework-Specific Patterns

**Angular:**

```
- LoadingService: BehaviorSubject<boolean>, increment/decrement counter
- HttpInterceptorFn: tap(increment), finalize(decrement)
- LoadingIndicatorComponent: subscribes to service, shows after 300ms delay
- HttpContext token: SKIP_LOADING = new HttpContextToken(() => false)
```

**React:**

```
- LoadingContext + useLoading hook: counter state, Provider wrapper
- Axios interceptor: request/response handlers with counter
- LoadingOverlay component: reads context, shows after 300ms delay
- Skip mechanism: custom axios instance or request config flag
```

**Vue:**

```
- useLoading composable: ref<number> counter, computed isLoading
- Axios interceptor: request/response handlers
- LoadingOverlay component: v-if="isLoading" with delay
- Skip mechanism: request config metadata flag
```

### Design Rules

- **Counter-based:** Use `pendingRequests` counter (not boolean) to handle concurrent requests
- **Display delay:** 300-500ms before showing indicator (prevents flash for fast requests)
- **Skip token:** Provide mechanism to skip loading for background/polling requests
- **Positioning:** Global overlay for page-level, inline spinner for component-level
- **Naming convention:** `isLoading` (boolean), `loadingCount` (number), `isLoading$` (observable)

### Verification Checklist

- [ ] Making an API call shows loading indicator after 300ms
- [ ] Completing API call hides loading indicator
- [ ] Multiple concurrent requests keep indicator visible until ALL complete
- [ ] Skip token prevents indicator for background requests
- [ ] Fast requests (<300ms) don't flash the indicator

---

## 4. Docker Development Environment

### What to Generate (5 files minimum)

| #   | File                       | Purpose                                     |
| --- | -------------------------- | ------------------------------------------- |
| 1   | `docker-compose.yml`       | Service orchestration with profiles         |
| 2   | `Dockerfile` (per service) | Multi-stage build                           |
| 3   | `.dockerignore`            | Exclude build artifacts, secrets, IDE files |
| 4   | `.env.example`             | Document all required environment variables |
| 5   | Health check endpoints     | Per-service health verification             |

### Docker Compose Structure (Profiles Pattern)

```yaml
# No profile = infrastructure only (always starts)
# --profile backend = infra + backend APIs
# --profile full = infra + backend + frontend

services:
    # === INFRASTRUCTURE (no profile — always starts) ===
    db:
        image: { database-image }
        ports: ['127.0.0.1:{port}:{port}']
        volumes: ['{service}-data:/data']
        healthcheck:
            test: { health-command }
            interval: 10s
            timeout: 5s
            retries: 5

    # === BACKEND (profile: backend) ===
    api:
        profiles: [backend, full]
        build:
            context: .
            dockerfile: Dockerfile
            target: dev
        ports: ['127.0.0.1:{port}:{port}']
        depends_on:
            db: { condition: service_healthy }
        environment:
            - ASPNETCORE_ENVIRONMENT=Development.ForDocker
        volumes:
            - ./src:/app/src # hot-reload in dev

    # === FRONTEND (profile: full) ===
    web:
        profiles: [full]
        build:
            context: ./frontend
            target: dev
        ports: ['127.0.0.1:{port}:{port}']
        depends_on:
            api: { condition: service_healthy }
```

### Dockerfile Multi-Stage Pattern

```dockerfile
# === DEV STAGE (hot-reload, debugging) ===
FROM {sdk-image} AS dev
WORKDIR /app
COPY . .
# Install dev dependencies, enable hot-reload
CMD [{dev-command}]

# === BUILD STAGE (compile/transpile) ===
FROM {sdk-image} AS build
WORKDIR /app
COPY . .
RUN {build-command}

# === PROD STAGE (runtime-only, minimal image) ===
FROM {runtime-image} AS prod
WORKDIR /app
COPY --from=build /app/{output} .
EXPOSE {port}
HEALTHCHECK --interval=30s --timeout=5s CMD {health-command}
USER nonroot
CMD [{prod-command}]
```

### Conventions

- **Port binding:** `127.0.0.1:{port}:{port}` (not `0.0.0.0`) — Windows IPv6 fix
- **Named volumes:** For database data persistence across restarts
- **Health checks:** ALL services must have health checks (HTTP, TCP, or command)
- **Non-root user:** Production images run as non-root
- **Layer caching:** Order COPY statements from least-changed to most-changed
- **`.env.example`:** Document every variable with description and example value
- **Docker Compose Watch:** Include commented section with instructions for hot-reload

### Opt-Out

If user explicitly says "no Docker", skip this section. Document in PBI: `Docker integration: No — {reason}`.

### Verification Checklist

- [ ] `docker compose config` validates without errors
- [ ] `docker compose up` starts infrastructure services
- [ ] `docker compose --profile backend up` starts infra + backend
- [ ] `docker compose --profile full up` starts everything
- [ ] All services pass health checks within 60 seconds
- [ ] `.env.example` has all variables documented with descriptions
- [ ] `.dockerignore` excludes node_modules, bin, obj, .git, .env

---

## 5. Integration Points

### Scaffold Skill → This Protocol

After architecture-design produces tool recommendations:

1. AI reads architecture report for tool choices
2. AI maps choices to this protocol's option tables
3. AI generates config files using protocol templates
4. AI runs verification checklists before marking scaffold complete

### Refine Skill → This Protocol

When creating PBIs, include Production Readiness Concerns table:

| Concern                | Required        | Notes                                   |
| ---------------------- | --------------- | --------------------------------------- |
| Code linting/analyzers | Yes/No/Existing | {tool preference or "scaffold default"} |
| Error handling setup   | Yes/No/Existing | {pattern: toast/inline/error-page}      |
| Loading indicators     | Yes/No/Existing | {pattern: spinner/skeleton/progress}    |
| Docker integration     | Yes/No/Existing | {scope: infra-only/full/none}           |
| CI/CD quality gates    | Yes/No/Existing | {coverage threshold, lint enforcement}  |

### Story Skill → This Protocol

When breaking PBI into stories, create Sprint 0 / foundation stories for each "Required" concern:

- "Set up code linting and formatting" (1-2 SP)
- "Set up error handling foundation" (2-3 SP)
- "Set up loading indicator infrastructure" (1-2 SP)
- "Set up Docker development environment" (2-3 SP)

### Architecture-Design Skill → This Protocol

Step 9 (Code Quality) output format must include:

```markdown
### Scaffold Handoff — Tool Choices

| Concern        | Chosen Tool       | Config File | Rationale |
| -------------- | ----------------- | ----------- | --------- |
| Linter (FE)    | {tool}            | {filename}  | {why}     |
| Linter (BE)    | {tool}            | {filename}  | {why}     |
| Formatter      | {tool}            | {filename}  | {why}     |
| Pre-commit     | {tool}            | {filename}  | {why}     |
| Error handling | {pattern}         | {files}     | {why}     |
| Loading state  | {pattern}         | {files}     | {why}     |
| Docker         | {compose pattern} | {files}     | {why}     |
```

This table is consumed by `/scaffold` to generate actual config files.
