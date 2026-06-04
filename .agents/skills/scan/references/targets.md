# Scan Targets Manifest

> The `$scan --target=<key>` host (`../SKILL.md`) loads ONE entry from this file per run. Each entry is the single source of truth for that scan: doc path, sub-agent count + roles, Phase-0 detection tables, verbatim sub-agent Think scopes, output Target Sections, Content-Rule exceptions, target-unique Special slivers, and the target-specific Anti-Rationalization rows. The shared 4-phase engine + SYNC blocks live ONCE in the host body — this manifest carries only the per-target DATA.

**Valid keys:** `project-structure` · `backend-patterns` · `frontend-patterns` · `scss-styling` · `design-system` · `code-review-rules` · `domain-entities` · `feature-spec` · `docs-index` · `e2e-tests` · `integration-tests` · `seed-test-data` · `ui-system`

**Confidence vocab note:** most targets use sub-agent confidence tiers `>80% document / 60-80% "observed (unverified)" / <60% omit`. `code-review-rules` instead classifies rules HIGH / MEDIUM / LOW. `domain-entities` uses %-based thresholds. Honor the per-entry vocab.

---

## Target: project-structure

- **doc:** `docs/project-reference/project-structure-reference.md`
- **description:** `[Documentation] Use when scanning service architecture, ports, directory layout, tech stack, and module registry.`
- **sub-agents:** 3 — Agent 1: Backend Services · Agent 2: Frontend Apps · Agent 3: Infrastructure & Tech Stack

### Phase 0 detection — **[BLOCKING]**, run in parallel (two-axis: architecture type AND orchestration)

Step 1 — Read the doc: detect mode Init (placeholder) or Sync (populated); in Sync mode note which sections have content + check for stale ports/paths.

Step 2 — Detect **architecture type**:

| Signal                                                                                        | Architecture                 | Sub-Agent Focus                                        |
| --------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------ |
| Multiple service directories (one folder per service), each with own deploy/`Dockerfile` unit | Microservices                | Enumerate ALL services; map each to port + deploy unit |
| Single source root with one application entry point                                           | Monolith                     | Single service deep-scan; module/feature breakdown     |
| Single git repo, multiple deployable apps                                                     | Monorepo (non-microservices) | App boundaries; shared library mapping                 |
| Nx workspace / multiple `project.json`                                                        | Nx monorepo                  | Library graph; app/lib/buildable distinction           |
| Multiple repos detected (git submodules)                                                      | Polyrepo                     | Per-repo breakdown; cross-repo contracts               |

Step 3 — Detect **orchestration approach**:

| Signal                            | Orchestration                       | What to Document                                  |
| --------------------------------- | ----------------------------------- | ------------------------------------------------- |
| configured orchestrator directory | configured local orchestration tool | project name, dashboard URL, resource names       |
| `docker-compose*.yml`             | Docker Compose                      | Service definitions, port mappings, volume mounts |
| `k8s/` or `charts/`               | Kubernetes / Helm                   | Deployment targets, ingress config                |
| No orchestration files            | Direct run                          | Launch commands per service                       |

Step 4 — Load module list from `docs/project-config.json` `modules[]` if available — use as expected service catalog.

**Evidence gate:** Confidence <60% on architecture type → report uncertainty, DO NOT proceed with architecture-specific scan assumptions.

### Sub-agent Think scopes

**Agent 1: Backend Services**

- **Think (Completeness dimension):** How many services exist? Is there a service in the codebase with no Dockerfile (worker? library? shared?)? Which services expose HTTP APIs vs are background workers?
- **Think (Port accuracy dimension):** Where are ports defined — `launchSettings.json`, `appsettings*.json`, `docker-compose.yml`, `Program.cs`? Some services may have port in multiple places that must agree.
- **Think (Pattern dimension):** Is there a consistent folder structure per service (e.g., `Service/`, `Domain/`, `Application/`, `Infrastructure/`)? What deviates from the pattern?
- Scan targets: glob `**/*.csproj` + `**/Dockerfile` (reconcile against `project-config.json` modules); read `launchSettings.json` + `appsettings*.json` per service for ports; grep `[ApiController]`, `MapControllers`, `app.MapGet` to classify API vs worker vs library; find entry points (`Program.cs`, `Startup.cs`); flag services in config with no Dockerfile (or vice versa).

**Agent 2: Frontend Apps**

- **Think (App inventory dimension):** How many frontend apps exist? Which are active (have dev-start commands) vs legacy vs deprecated?
- **Think (Port/config dimension):** Where is the dev server port defined — framework serve config, dev-server config, or proxy config? Read the actual config — do not infer.
- **Think (Dependency dimension):** Which apps consume which shared libraries? Is there a design system library? A domain library? What's the dependency graph direction?
- Scan targets: glob configured frontend build and dev-server config files (exclude dependency folders); read serve/dev configs for ports; find entry points from the configured framework; framework versions from package metadata (exact, not ranges); map app-to-library deps from workspace graph or imports.

**Agent 3: Infrastructure & Tech Stack**

- **Think (Infrastructure dimension):** What external services must be running for the app to function? Which are optional? What are the default credentials (from docker-compose or defaults)?
- **Think (CI/CD dimension):** What pipeline system is used? What are the build/test/deploy stages? What environments exist?
- **Think (Version accuracy dimension):** Framework/library versions must come from actual config files — not assumed from project type.
- Scan targets: read `docker-compose*.yml` (infra services, port mappings, credentials); find CI/CD configs (`.github/workflows/*.yml`, `azure-pipelines.yml`, `Jenkinsfile`); parse package managers for key deps + versions; identify DBs per service from connection strings; find message-broker config from appsettings.

### Target Sections

| Section                   | Content                                                                           |
| ------------------------- | --------------------------------------------------------------------------------- |
| **Architecture Overview** | Architecture type, orchestration approach, deployment model                       |
| **Service Architecture**  | Table: Service Name, Type (API/Worker/App), Port, Dockerfile path                 |
| **Infrastructure Ports**  | Table: Service (DB/MQ/Cache), Port, Credentials (from docker-compose)             |
| **Frontend Apps**         | Table: App name, Framework, Dev port, Build command                               |
| **Tech Stack**            | Table: Category (Backend/Frontend/Infra), Technology, Version                     |
| **Module Codes**          | Table: Module code abbreviation, Full name, Service path                          |
| **Key Directories**       | Top 2-3 levels of configured source roots with one-line purpose per top-level dir |

### Content Rules / exceptions

Standard — follows shared `output-quality-principles` (no full trees/counts/TOCs). "Key Directories" limited to top 2-3 levels with one-line purpose (consistent with no-full-trees rule).

### Special slivers

- **Ports-from-config-files rule:** ALL port numbers MUST be read from actual config files — NEVER infer from memory. Reinforced in Agent 1/2/3 Think + scan, Phase 4 Grep verify (ports match config), Round 2 fresh-eyes (ports match `launchSettings.json`/`docker-compose.yml`), closing reminder (cite `file:line` for every port + path).
- **[BLOCKING] Phase 0** architecture-type + mode detection (parallel); sub-agent focus depends on detected type.
- **Two-axis Phase 0** — architecture type (step 2) AND orchestration approach (step 3) are separate classification tables.
- **Evidence-gate fallback** — <60% on architecture type → report uncertainty, DO NOT proceed (stricter than design-system's "Agent 1 only").
- Phase 4 verify: Glob-verify ALL Dockerfile paths in service table (not just 3); Grep-verify port numbers vs config.
- Version accuracy: framework/library versions MUST come from actual config (`package.json`/`.csproj` exact versions, not ranges/inference).

### Anti-Rationalization rows

| Evasion                                              | Rebuttal                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Architecture type obvious from directory names"     | Verify from actual project files — names are not evidence                                                                                         |
| "Port numbers are standard (5000, 8080, etc.)"       | Read config files — NEVER infer ports from framework conventions                                                                                  |
| "Checked 3 Dockerfile paths, that's enough"          | Glob-verify ALL paths — partial verification hides missing services                                                                               |
| "Framework versions obvious from project type"       | Read `package.json`/`.csproj` for exact versions — never assume                                                                                   |
| "Skip Round 2 even when Round 1 found issues"        | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — port numbers and paths are the most hallucination-prone data. |
| "project-config.json not needed if repo looks clear" | Config file provides expected service catalog — use it to detect missing services                                                                 |

### prompt-enhance

`$prompt-enhance docs/project-reference/project-structure-reference.md`

---

## Target: backend-patterns

- **doc:** `docs/project-reference/backend-patterns-reference.md`
- **description:** `[Documentation] Use when scanning backend code to refresh repository, CQRS, validation, entity, event, and migration guidance.`
- **sub-agents:** 4 — Agent 1: Repository & Entity Patterns · Agent 2: CQRS & Validation Patterns · Agent 3: Events, Messaging & Infrastructure · Agent 4: Anti-Pattern Detection (**runs AFTER Agents 1-3 complete — NEVER merged with discovery**)

### Phase 0 detection — BLOCKING, run in parallel

Step 1 — Read the doc: detect Init (placeholder — headings only) or Sync (populated); in Sync mode list documented sections → skip re-scanning unless staleness suspected.

Step 2 — Detect backend framework:

| Signal                                               | Framework               | Next Step                                                                  |
| ---------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| configured backend manifest + CQRS dispatcher marker | configured backend CQRS | Scan for command/query handlers, validation-result wrappers, entity events |
| `package.json` + express/fastify/nestjs              | Node.js                 | Scan for DI decorators, class-validator, TypeORM                           |
| `pom.xml` / `build.gradle`                           | Java/Kotlin             | Scan for Spring annotations, JPA patterns                                  |
| `requirements.txt` / `pyproject.toml`                | Python                  | Scan for Pydantic, SQLAlchemy, FastAPI patterns                            |

Step 3 — Load service paths from `docs/project-config.json` contextGroups/modules if available.
Step 4 — Run graph command on primary service entry point.

**Evidence gate:** Confidence <60% on framework → report uncertainty, DO NOT proceed with framework-specific scan.

Phase 1 — from detected framework derive: repository interface naming, handler base class, validation mechanism, event mechanism, migration tool. NEVER assume — derive from file evidence.

### Sub-agent Think scopes

**Agent 1: Repository & Entity Patterns**

- **Think:** What is the complete chain from domain entity → persistence → retrieval? Where does business logic live — in the entity, the service, or the handler? What makes a "repository" in this repository (naming, base class, interface)?
- Scan targets: repository interfaces (naming, base classes, service-specific vs generic); entity/model base classes (inheritance, property conventions, factory methods); domain-logic placement (entity vs service vs handler); DTO classes (mapping ownership: DTO-owned vs handler-mapped vs AutoMapper); repository extension methods (static query expressions, reusable filters). For each: record `file:line`, 5-15 line snippet, note GOOD vs BAD if anti-pattern present.

**Agent 2: CQRS & Validation Patterns**

- **Think:** How does a request travel from controller to handler? What validates it? What wraps the result? Where does authorization live?
- Scan targets: command handlers (file structure, naming, base class, result types); query handlers (pagination, projection, caching); validation (mechanism, location handler-vs-pipeline-vs-entity, error format); result wrappers (`Result<T>`/`ApiResponse`/validation-result types); controller/endpoint patterns (routes, auth attributes, binding); authorization (attribute/decorator placement, policy vs role, permission-check location).

**Agent 3: Events, Messaging & Infrastructure**

- **Think:** How do side effects happen — synchronous or async? How do services communicate? What triggers background work?
- Scan targets: domain events (trigger mechanism, handler discovery, side-effect placement rules); integration events / message bus (publisher + consumer conventions, message-contract naming); background jobs (scheduler, recurring vs one-time, failure handling); middleware/pipeline (order, cross-cutting concerns); DI registration (lifetime conventions, module registration); migration patterns (file naming, up/down, data migration). For message bus: capture FULL contract naming pattern (ownership prefix matters).

**Agent 4: Anti-Pattern Detection** (run AFTER Agents 1-3)

- **Think:** Where has the team violated the conventions found by Agents 1-3? Look for the 8 most common backend anti-patterns: wrong repo type, wrong logic layer, exception-based validation, cross-service DB access, handler-owned DTO mapping, uncleaned async scopes, unnamed bus contracts, hardcoded config.
- Checklist: generic repository where service-specific required; business logic in handlers/components belonging in entities/models; validation via exceptions instead of validation-result type; direct DB access across service boundaries; DTO mapping in handlers instead of DTO-owned; bus-message naming without ownership prefix; hard-coded config that should be injected. For each violation: record `file:line`, classify severity (CRITICAL/MAJOR/MINOR), suggest fix.

### Target Sections

| Section                 | Content                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Repository Pattern**  | Interface naming, base classes, service-specific repos, extension methods with examples |
| **CQRS Patterns**       | Command structure, query structure, handler patterns, file organization                 |
| **Validation Patterns** | Mechanism, common rules, error response format, DO/DON'T examples                       |
| **Entity Patterns**     | Base classes, property conventions, factory methods, domain logic placement             |
| **DTO Mapping**         | Mapping ownership (who maps: DTO vs handler vs service), examples                       |
| **Event Handlers**      | Domain vs integration events, handler discovery, side-effect placement                  |
| **Message Bus**         | Cross-service patterns, consumer conventions, message contract naming                   |
| **DI & Configuration**  | Service lifetime conventions, module registration, config injection                     |
| **Migrations**          | Strategy, file naming, data migration patterns                                          |
| **Background Jobs**     | Scheduler, recurring vs one-time, failure handling                                      |
| **Authorization**       | Auth mechanism, permission checks, policy vs role                                       |
| **Anti-Patterns**       | Confirmed violations with `file:line`, severity, fix guidance                           |

### Content Rules / exceptions

- Code snippets 5-15 lines from actual project files with `file:line`.
- DO/DON'T pairs where anti-patterns confirmed (BAD: `file:line` / GOOD: `file:line`).
- Tables for convention summaries (naming, file locations, base classes).
- Anti-Patterns section lists violations found by Agent 4. Standard `output-quality-principles` applies.

### Special slivers

- **4 sub-agents** — Agent 4 (Anti-Pattern) is a SEPARATE concern, runs AFTER discovery, NEVER merged.
- Phase 4 verify step 5: Anti-Patterns section populated with actual `file:line` violations (not hypothetical).
- Graph command on 2-3 key pattern files to validate call-chain accuracy.

### Anti-Rationalization rows

| Evasion                                           | Rebuttal                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| "Framework already known, skip Phase 0 detection" | Phase 0 is BLOCKING — derive grep terms from evidence, not assumption               |
| "Only 3 agents needed, skip anti-pattern agent"   | Anti-pattern detection is separate concern — NEVER merge with discovery             |
| "Doc has content, skip re-read"                   | Show section list extracted from doc as proof of re-read                            |
| "Examples look right"                             | Glob-verify ALL file paths + Grep-verify ALL class names — looking right ≠ verified |
| "Round 2 review not needed for small scan"        | Main agent rationalizes own mistakes. Fresh sub-agent is non-negotiable.            |

### prompt-enhance

`$prompt-enhance docs/project-reference/backend-patterns-reference.md`

---

## Target: frontend-patterns

- **doc:** `docs/project-reference/frontend-patterns-reference.md`
- **description:** `[Documentation] Use when scanning frontend component, state, form, API, routing, and styling patterns.`
- **sub-agents:** 3 — Agent 1: Component & Form Patterns · Agent 2: State Management & API Services · Agent 3: Routing, Directives & Directory Structure

### Phase 0 detection — BLOCKING (framework + mode)

Detect frontend framework:

| Signal                                   | Framework                     | Key Patterns to Search                                           |
| ---------------------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| configured frontend workspace manifests  | configured frontend workspace | base component class, state store, teardown, styling conventions |
| configured frontend framework manifest   | configured frontend framework | component markers, lifecycle hooks, forms, API client usage      |
| `package.json` with `react`/`next`       | React                         | hooks, context, `useState`, `useEffect`, `fetch` wrappers        |
| `package.json` with `vue`/`nuxt`         | Vue                           | Composition API, `ref`, `reactive`, Pinia stores                 |
| `package.json` with `svelte`/`sveltekit` | Svelte                        | `$:` reactivity, stores, `onMount`/`onDestroy`                   |
| Multiple frameworks                      | Multi-framework               | Document each separately — DO NOT merge                          |

Detect scan mode:

| Mode | Condition                                    | Action                                               |
| ---- | -------------------------------------------- | ---------------------------------------------------- |
| Init | Target doc doesn't exist or placeholder only | Full scan, create all sections                       |
| Sync | Target doc has real content                  | Diff scan — check new base classes, changed patterns |

Also: reads target doc to detect Init/Sync; in Sync mode extract section list → skip well-documented sections. Load app paths from `docs/project-config.json` `contextGroups`/`modules[]` if available.

**Evidence gate:** Confidence <60% on **framework** → report uncertainty, **ask user** before proceeding.

### Sub-agent Think scopes

**Agent 1: Component & Form Patterns**

- **Think (Base Class dimension):** What base classes exist? What does each provide — lifecycle, subscriptions, form helpers, DI? Which base class is used for simple components vs complex state vs forms?
- **Think (Form dimension):** Is form state reactive or template-driven? Where does validation live — in the form, in validators, in the model? What's the error display pattern?
- **Think (Cleanup dimension):** How are subscriptions cleaned up? Is there a shared mechanism (e.g., `untilDestroyed()`) or is each component responsible?
- Scan targets: component base classes (`extends.*Component`, `React.Component`, `defineComponent`); form handling (reactive forms, builders, validation, error display); lifecycle conventions (init, destroy, cleanup); template/JSX conventions (structural patterns, conditional rendering, BEM classes); component communication (inputs/outputs, props/events, signals, `@Input`/`@Output`).

**Agent 2: State Management & API Services**

- **Think (State dimension):** What is the data flow — unidirectional? How does a component trigger a data load? How does it receive updates? What prevents race conditions?
- **Think (API dimension):** Is there a service base class? What does it provide — base URL, auth headers, error mapping? Who calls the HTTP layer — directly in components or via service abstraction?
- **Think (Subscription dimension):** What patterns prevent memory leaks? Is cleanup enforced by a linter/base class or left to developer discipline?
- Scan targets: state management (`Store`, `useReducer`, `createStore`, `defineStore`, signals); API service base classes (`extends.*Service`, `HttpClient`, `fetch` wrappers); data fetching (interceptors, error handling, loading states, caching); subscription/cleanup (`untilDestroyed`, `takeUntil`, `unsubscribe`, dispose callbacks); shared/common service patterns + DI registration.

**Agent 3: Routing, Directives & Directory Structure**

- **Think (Routing dimension):** How are routes protected? What's the lazy-loading boundary? How are navigation events handled? Is there a routing hierarchy?
- **Think (Reuse dimension):** What custom directives/pipes exist? Are they in a shared library? What naming conventions distinguish feature-specific from cross-cutting reusables?
- **Think (Organization dimension):** What's the pattern for where things live — feature modules, domain libraries, shared libs? How do apps consume shared code?
- Scan targets: routing config (route definitions, guards, resolvers, lazy loading, `canActivate`); custom directives/pipes/hooks + registration; module/library organization (shared modules, feature modules, Nx library structure); directory-structure conventions (where components, services, models, specs live); build config + environment patterns (proxy configs, env-specific settings).

### Target Sections

| Section                    | Content                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| **Component Base Classes** | Hierarchy with what each base provides; when to use which              |
| **State Management**       | Store pattern, reactivity approach, data flow conventions              |
| **Forms**                  | Form creation pattern, validation approach, error display              |
| **API Services**           | Service base class, HTTP call pattern, error handling                  |
| **Routing**                | Route definition pattern, guards, lazy loading, navigation conventions |
| **Directives & Pipes**     | Custom reusable behaviors, naming conventions, registration            |
| **Directory Structure**    | Where things live: components, services, models, shared code           |
| **Subscription Cleanup**   | How subscriptions/listeners are managed and cleaned up                 |
| **Styling Conventions**    | Component styling approach (scoped, BEM, utility classes)              |

### Content Rules / exceptions

Standard. No declarations-only rule, no source whitelist, no directory-tree allowance — follows shared `output-quality-principles`. Per-agent: write incrementally after each pattern category, cite `file:line`, confidence tiers >80%/60-80%/<60%.

### Special slivers

- BLOCKING gate is Phase 0 framework + mode detection.
- Round 2 fresh-eyes questions are framework-pattern specific: every example exists at claimed `file:line` (Glob+Grep); base-class names match actual definitions (Grep); store method names are real not hallucinated (Grep); cleanup patterns documented with actual implementation evidence.
- Phase 4 extra verify: "Verify base class hierarchy from at least 3 concrete examples."
- 3 sub-agents (vs scss's 2).

### Anti-Rationalization rows

| Evasion                                        | Rebuttal                                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| "Framework obvious, skip Phase 0 detection"    | Phase 0 is BLOCKING — grep patterns and agent scope depend on detected framework                                                     |
| "Base class names look right"                  | Grep-verify ALL base class names — AI hallucinates class hierarchies                                                                 |
| "Store method names are standard"              | Every store method name must be grep-verified against actual source                                                                  |
| "Skip Round 2 even when Round 1 found issues"  | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes own fabricated examples. |
| "Cleanup pattern documented, 1 example enough" | Cleanup is the most project-specific pattern — verify with 3+ grep hits                                                              |

### prompt-enhance

`$prompt-enhance docs/project-reference/frontend-patterns-reference.md`

---

## Target: scss-styling

- **doc:** `docs/project-reference/scss-styling-guide.md`
- **description:** `[Documentation] Use when scanning SCSS architecture, BEM conventions, mixins, variables, theming, and responsive patterns.`
- **sub-agents:** 2 — Agent 1: SCSS Architecture & Variables · Agent 2: BEM Patterns & Theming

### Phase 0 detection — BLOCKING (styling approach + BEM + mode)

Detect styling approach:

| Signal                                | Approach     | Agent Emphasis                                          |
| ------------------------------------- | ------------ | ------------------------------------------------------- |
| `*.scss` files present                | SCSS/Sass    | Both agents (variables + BEM)                           |
| `*.less` files present                | Less         | Adapt variable patterns to Less syntax                  |
| `*.module.css`/`*.module.scss`        | CSS Modules  | Focus on naming conventions, composition                |
| `tailwind.config.*` present           | Tailwind CSS | Config-first: extract theme overrides, custom utilities |
| `styled-components`/`emotion` in deps | CSS-in-JS    | Component-level style colocation, theme provider        |
| Multiple approaches                   | Hybrid       | Document each separately with clear boundary            |

Detect BEM usage:

| Signal                                           | BEM Adoption | Notes                                      |
| ------------------------------------------------ | ------------ | ------------------------------------------ |
| `block__element--modifier` patterns in templates | Active BEM   | Document separator style and nesting rules |
| Mixed BEM and utility classes                    | Partial BEM  | Document which layer uses which approach   |
| Only utility classes (Tailwind, Bootstrap)       | No BEM       | Document utility class conventions instead |

Also: reads doc to detect Init/Sync; in Sync mode extract section list → skip well-documented sections. Load styling config from `docs/project-config.json` `designSystem.tokenFiles` if available.

**Source-scope whitelist for token discovery:** configured style, theme, and token source roots; EXCLUDE generated output, dependency folders, coverage, and component-local styles unless configured.

**Evidence gate:** Confidence <60% on **primary approach** → report uncertainty, **proceed with Agent 1 (structure) only**.

### Sub-agent Think scopes

**Agent 1: SCSS Architecture & Variables**

- **Think (Import chain dimension):** What's the entry point? Where do global styles load? Is there a predictable import order (reset → tokens → utilities → components)? What breaks if the order changes?
- **Think (Variable declaration dimension):** Which variables are authoritative declarations vs usages? Are CSS custom properties mirroring SCSS variables (dual-declaration pattern)? What's the naming convention (BEM-inspired, semantic, functional)?
- **Think (Breakpoint dimension):** Where are breakpoints defined? Is there a responsive mixin or just raw media queries scattered across files? Mobile-first or desktop-first?
- Scan targets: glob `**/*.scss` (or detected ext) within whitelist; global stylesheet entry points + their `@import`/`@use`/`@forward` chains; SCSS variable declarations (`^\s*\$[a-zA-Z][a-zA-Z0-9_-]*\s*:`) — dedupe, group by category; CSS custom property declarations (`--[a-zA-Z][a-zA-Z0-9_-]*\s*:`) in `:root`/theme blocks; mixin definitions (`@mixin\s+[a-zA-Z]`) — signature + one usage; function definitions (`@function\s+[a-zA-Z]`); breakpoint definitions (values from media queries + breakpoint variables).
- **Quality gate:** if a variable category has <3 unique declarations OR >200, log "scope too narrow/broad — manual refinement required."

**Agent 2: BEM Patterns & Theming**

- **Think (BEM convention dimension):** What's the exact separator style (double-underscore `__`, double-dash `--`, or variants)? What's the maximum nesting depth before patterns break? Are modifiers on blocks, elements, or both?
- **Think (Theming dimension):** How many themes exist? Is theming via CSS custom property overrides, SCSS theme maps, or class-based switching? How does a developer add a new theme?
- **Think (Component scoping dimension):** Are styles co-located with components (scoped) or global? What naming convention prevents cross-component contamination?
- Scan targets: BEM class patterns in templates/HTML (`__` and `--`) — find 5+ concrete examples; BEM naming in SCSS (`&__element`, `&--modifier`); theming patterns (CSS custom property overrides, theme class switching, dark mode); component-scoped vs global; z-index management (variables, scale, stacking context); animation/transition conventions (duration/easing variables); color palette — grep declarations only (hex/hsl/rgb in variable declarations).

### Target Sections

| Section                 | Content                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **BEM Methodology**     | Separator style, nesting rules, block/element/modifier examples from actual components |
| **SCSS Architecture**   | File organization, import chain, global vs component style boundary                    |
| **Mixins & Functions**  | Table: name, signature, purpose, `file:line` — declarations only                       |
| **Variables & Tokens**  | Table: category (color/spacing/type/breakpoint), variable name, purpose, `file:line`   |
| **Theming**             | Theme approach, CSS custom property blocks, how to add/modify a theme                  |
| **Responsive Patterns** | Breakpoint definitions, responsive mixin usage, mobile-first vs desktop-first          |
| **Color Palette**       | Color variables/tokens grouped by semantic role (not raw hex list)                     |
| **Z-Index Scale**       | Z-index variable definitions and layer naming conventions                              |
| **Anti-Patterns**       | What NOT to do — global overrides, specificity hacks, hardcoded values                 |

### Content Rules / exceptions

- **Declarations only — NOT usages** when cataloguing variables and mixins (reinforced in Round 2, Phase 4 verify, closing reminder, anti-rationalization).
- **Source-scope whitelist** for token discovery (styles/themes/tokens dirs; excludes node_modules/dist/.nx/coverage/component-local).
- Every variable value, mixin signature, breakpoint MUST come from actual declarations; focus on project conventions NOT generic CSS tutorials.
- Agent-1 quality gate on variable-category cardinality (<3 or >200 → flag).
- Color palette grouped by semantic role, NOT raw hex list; colors grepped from declarations only.

### Special slivers

- BLOCKING gate is Phase 0 styling-approach + BEM + mode detection.
- Evidence-gate fallback is unique: <60% confidence → **proceed with Agent 1 only** (not "ask user").
- Source-scope whitelist (styles/themes/tokens) bounds Agent 1's glob.
- Authoring branch: BEM-adoption table drives whether to document BEM rules vs utility-class conventions.
- Round 2 fresh-eyes is declaration-focused: variable names exist as actual declarations (Grep — declarations not usages); mixin names match `@mixin` definitions; color values from declarations not fabricated hex; breakpoint values from actual config not assumed common values.
- 2 sub-agents (vs frontend-patterns' 3).

### Anti-Rationalization rows

| Evasion                                            | Rebuttal                                                                                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| "Styling approach obvious, skip Phase 0 detection" | Phase 0 is BLOCKING — SCSS vs Tailwind vs CSS-in-JS require completely different agent patterns                                         |
| "Variable names look standard (`$primary-color`)"  | Grep-verify every variable name against actual declarations — AI hallucinates variable names                                            |
| "Breakpoints are probably 768px/1024px"            | Read breakpoint declarations — NEVER assume common values                                                                               |
| "Color values look right"                          | ALL color values must come from grep of actual declarations                                                                             |
| "Usages and declarations are the same thing"       | NEVER mix them — document only declarations as authoritative                                                                            |
| "Skip Round 2 even when Round 1 found issues"      | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes fabricated variable values. |

### prompt-enhance

`$prompt-enhance docs/project-reference/scss-styling-guide.md`

---

## Target: design-system

- **doc:** `docs/project-reference/design-system/README.md`
- **description:** `[Documentation] Use when scanning design tokens, component inventory, and app-to-doc design system mappings.`
- **sub-agents:** 3 — Agent 1: Design System Structure · Agent 2: Component Inventory · Agent 3: Token & Component Source Discovery (**token discovery is a SEPARATE agent — NEVER merge with component inventory**)

### Phase 0 detection — BLOCKING

Step 1 (mode-detect) — read the doc; detect Init (placeholder) / Sync (populated); in Sync mode extract section list → skip well-documented sections.

Step 2 — Detect design system **type**:

| Signal                                                                     | Type              | Agent Emphasis                           |
| -------------------------------------------------------------------------- | ----------------- | ---------------------------------------- |
| Token files (`design-tokens.json`, `tokens.scss`, Style Dictionary config) | Token-first       | Prioritize Agent 3 (token discovery)     |
| Storybook config (`.storybook/`, `*.stories.ts`)                           | Component-library | Prioritize Agent 2 (component inventory) |
| Figma token exports or `figma-tokens.json`                                 | Figma-driven      | Prioritize Agent 3 (token import chain)  |
| Only component directories, no token files                                 | Ad-hoc/CSS-only   | Prioritize Agent 1 (structure)           |
| Mix of above                                                               | Hybrid            | Run all 3 agents with equal weight       |

Step 3 — resolve config-driven paths from `docs/project-config.json`: `designSystem.canonicalDoc` (single source of truth for new code), `designSystem.tokenFiles` (drop-in token files). Read these NAMES from config; content varies per project; never hardcode.
Step 4 — check for app-specific design docs in the same directory.

**Evidence gate:** Confidence <60% on design system type → report uncertainty, **proceed with Agent 1 (structure) only**.

### Sub-agent Think scopes

**Agent 1: Design System Structure**

- **Think (VERBATIM):** "How is the design system organized? What's the canonical doc? What's the token chain? Which apps have design docs and which don't?"
- Scan targets: glob `docs/project-reference/design-system/**`; find design token files (CSS custom properties, SCSS variables, JSON tokens); discover Storybook stories (`*.stories.{ts,tsx,mdx}`); component-library entry points (index/barrel exports); map app-to-design-doc relationships; **verify canonical doc** at `{docsPath}/{canonicalDoc}` has expected sections (flag missing); **verify token files** at `{docsPath}/{tokenFiles[i]}` exist + contain declarations (flag empty/missing).

**Agent 2: Component Inventory**

- **Think (VERBATIM):** "What dimensions define a complete component inventory? Consider: Discoverability (can I find it?), Categorization (what type?), Variant coverage (size/color/state?), Accessibility (ARIA/keyboard?), Documentation completeness (JSDoc/README/Storybook?), Icon/asset library coverage."
- Note: derive grep/glob patterns from what the repository actually uses — do NOT hardcode framework-specific patterns unless confirmed.
- Scan targets: reusable UI components (shared dirs, exported components); component categories (layout, forms, feedback, navigation, data display); variants (size, color, state); icon sets / asset libraries; accessibility patterns (ARIA roles, keyboard support); per-component documentation.

**Agent 3: Token & Component Source Discovery**

- **Think (VERBATIM):** "What design tokens actually exist in source code (not just what's documented)? Which are declarations (authoritative) vs usages (derived)?"
- **Source scope (whitelist, not full repo):** configured style, theme, token, palette, design, style-guide, and variable source roots; exclude generated output, dependency folders, coverage, and component-local styles unless configured.
- **Discovery rules (declarations only, NOT usages):** CSS custom properties `--[a-zA-Z][a-zA-Z0-9_-]*\s*:` (LHS only, dedupe); SCSS variable declarations `^\s*\$[a-zA-Z][a-zA-Z0-9_-]*\s*:` (anchor start-of-line); color values used ≥3× across whitelist (hex/rgb/hsl); spacing scale `(padding|margin|gap)\s*:\s*[\d.]+(px|rem|em)` (extract values, dedupe); typography `(font-family|font-size|font-weight)\s*:` (extract RHS, dedupe); breakpoints `@media[^{]*\((min|max)-width:\s*[\d.]+(px|em|rem)\)` (extract widths, dedupe).
- **Categorise:** Colors / Typography / Spacing / Breakpoints / Z-Index / Elevation / Component-prefixes / Other. Persist incrementally — append to report after each category.
- **Quality gate:** if a category has <3 unique entries OR >200, log "scope too narrow/broad — manual refinement required."

### Target Sections

| Section                    | Content                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ |
| **Design System Overview** | High-level description — type, tools, organization                             |
| **App Documentation Map**  | Table: App name, Design doc path, Token source, Component library              |
| **Design Tokens**          | Token categories, file locations, naming convention — values from declarations |
| **Component Inventory**    | Table: Component name, Category, Variants, Path, Has docs?                     |
| **Gap Analysis**           | Missing docs, zero-adoption tokens, undocumented components                    |
| **Icon & Asset Library**   | Icon set source, asset directory paths, usage patterns                         |
| **Storybook**              | Setup (if exists), story organization, how to add new stories                  |
| **Usage Guidelines**       | How to consume tokens and components in application code                       |

### Content Rules / exceptions

- **Token whitelist + declarations-only** (Agent 3): whitelisted source scope (NOT full repo); declarations only, NOT usages; color values only when used ≥3×.
- **Quality gate** on entry counts (<3 too narrow / >200 too broad → manual refinement).
- **Gap Analysis section is mandatory** — document what's missing, not just what exists.
- No directory-tree exception declared (unlike feature-spec); shared no-trees rule stands.

### Special slivers

- **AUTHORING branch (init mode only)** — when init mode detected (canonical doc missing or placeholder):
    1. **Author `{docsPath}/{canonicalDoc}`** from Agent 3 findings: prepend regen marker `<!-- Generated by $scan --target=design-system on YYYY-MM-DD; refine sections manually -->`; sections: Foundations, Tokens, Components, Patterns, Accessibility, Adoption Strategy.
    2. **Author each `{docsPath}/{tokenFiles[i]}`** from grouped declarations — **FIRST: REMOVE the `PLACEHOLDER_MARKER_SCSS` sentinel** before writing real tokens; `.scss`: SCSS variable block per category + CSS custom property mirrors in `:root {}`; categories: Colors, Typography, Spacing, Breakpoints, Z-Index, Elevation/Shadow.
    3. **Preserve manual content in sync mode** — DO NOT overwrite a populated doc/token file.
- **Token whitelist scope** (Agent 3) — whitelist + declarations-only is the distinguishing sliver.
- **Evidence-gate fallback** — <60% on type → Agent 1 (structure) only.
- Sub-agent count = 3 (token discovery SEPARATE from component inventory — never merge).
- Phase 4 verify is config-driven: verify `{docsPath}/{canonicalDoc}` + every `{docsPath}/{tokenFiles[i]}`; Glob-verify ALL component inventory paths (not 3); Grep-verify token names match declarations; Gap Analysis present.

### Anti-Rationalization rows

| Evasion                                              | Rebuttal                                                                                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Design system type obvious, skip Phase 0 detection" | Phase 0 is BLOCKING — agent emphasis depends on detected type                                                                                      |
| "Only 2 agents needed, skip token discovery agent"   | Token discovery is separate from component inventory — NEVER merge                                                                                 |
| "Token values look correct"                          | Grep-verify ALL token values against declarations — "looks correct" ≠ verified                                                                     |
| "Gap Analysis not needed"                            | Gap Analysis is a required section — documents what's missing for future work                                                                      |
| "Skip Round 2 even when Round 1 found issues"        | Clean Round 1 (zero issues) does end the scan. But when issues exist, fresh-eyes is mandatory after fixing — main agent rationalizes own mistakes. |
| "Verified 3 paths, that's enough"                    | Glob-verify ALL paths in inventory — spot-check is insufficient                                                                                    |

### prompt-enhance

`$prompt-enhance docs/project-reference/design-system/README.md`

---

## Target: code-review-rules

- **doc:** `docs/project-reference/code-review-rules.md`
- **description:** `[Documentation] Use when scanning code conventions, anti-patterns, architecture rules, and review checklists.`
- **sub-agents:** 3 — Agent 1: Backend Rules · Agent 2: Frontend Rules · Agent 3: Architecture Rules (**conditionally routed by detected project scope — not all-always**)

### Phase 0 detection — BLOCKING (project scope drives agent routing)

Mode-detect (standard): read the doc → Init (placeholder) / Sync (populated); in Sync mode extract section list → skip well-documented sections.

Project-scope detection table:

| Signal                                        | Scope                      | Agent Routing              |
| --------------------------------------------- | -------------------------- | -------------------------- |
| `.csproj` files present                       | Full-stack or Backend-only | Run Agent 1 (Backend)      |
| configured frontend manifests                 | Frontend present           | Run Agent 2 (Frontend)     |
| Both above                                    | Full-stack                 | Run Agents 1+2+3           |
| `docker-compose.yml` / K8s manifests          | Infrastructure present     | Run Agent 3 (Architecture) |
| Linter configs (`.eslintrc`, `stylecop.json`) | Code quality infra found   | Prioritize Agent 1/2       |

Step 3 — discover code-quality infrastructure: linter configs (`.eslintrc`, `.editorconfig`, `stylecop.json`, `.prettierrc`, `ruff.toml`); CI quality gates, code-analysis configs (SonarQube, CodeClimate); existing standards docs (CONTRIBUTING.md, CODING_STANDARDS.md); git hooks (pre-commit, husky).

**Evidence gate:** Confidence <60% on scope → report uncertainty, ask user before proceeding.

### Sub-agent Think scopes

**Agent 1: Backend Rules**

- **Think (VERBATIM):** "What does a GOOD backend file look like in this repository? What naming, error handling, and DI choices separate good code from code that got merged but should not have? Where are the active anti-patterns?"
- Scan targets: naming conventions (class suffixes, method prefixes, interface naming + examples); base classes (when used vs not — detect violations); error handling (try-catch, Result types, error middleware); dependency injection (registration conventions, lifetime choices); anti-patterns (direct DB access from controllers, business logic in wrong layer); logging (structured logging, log levels, correlation IDs).

**Agent 2: Frontend Rules**

- **Think (VERBATIM):** "What makes frontend code reviewable vs unmaintainable here? Where is state management discipline enforced? What cleanup patterns are used?"
- Scan targets: component conventions (naming, file organization, template patterns + examples); state management (store vs component vs service, with rule evidence); styling (BEM, CSS modules, utility classes — derive from detected approach); subscription/memory management (cleanup, unsubscribe, dispose); accessibility (ARIA, semantic HTML, keyboard nav — if found); performance (lazy loading, change detection, memoization).

**Agent 3: Architecture Rules**

- **Think (VERBATIM):** "What dependency directions are enforced here? Where do services communicate directly vs via messages? What's shared vs duplicated, and is that intentional?"
- Scan targets: layer boundaries (what imports what, dependency direction); cross-service communication (direct calls vs messages — find violations); shared code (shared vs duplicated, rationale); testing conventions (naming, organization, mock patterns); security (auth checks, input validation, output encoding — derive from existing); configuration (env vars, config files, secrets management).

### Target Sections

| Section                | Content                                                        |
| ---------------------- | -------------------------------------------------------------- |
| **Critical Rules**     | Top 5-10 rules that cause most bugs if violated                |
| **Backend Rules**      | Naming, patterns, error handling, DI with DO/DON'T examples    |
| **Frontend Rules**     | Component, state, styling, cleanup with DO/DON'T examples      |
| **Architecture Rules** | Layer boundaries, cross-service rules, shared code conventions |
| **Anti-Patterns**      | Common mistakes found in codebase with real `file:line`, fixes |
| **Decision Trees**     | For common decisions: which base class, where to put logic     |
| **Checklists**         | PR review checklists for backend, frontend, cross-cutting      |

### Content Rules / exceptions

- Every rule has a "DO" code example from the actual project.
- Every rule has a "DON'T" counterexample (real `file:line` or clearly marked realistic).
- Use `file:line` references for all code examples.
- Prioritize rules by impact (bugs prevented, not style preferences). Standard `output-quality-principles` applies.

### Special slivers

- Phase 0 project-scope detection is **BLOCKING** — agent routing depends on detected scope.
- 3 sub-agents (no Agent 4 / cross-service sync agent — unlike domain-entities).
- Conditional agent routing: agents launched per detected scope (Backend-only / Frontend present / Full-stack / Infrastructure present), not all-always.
- **Phase 3 confidence-classification (target-unique vocab):** HIGH (3+ examples, consistent) → rule with DO/DON'T pair; MEDIUM (1-2) → "observed pattern (verify)"; LOW (<1) → omit.
- Round 2 fresh-eyes: every decision-tree node has real code examples; anti-patterns documented with real `file:line` violations (not hypothetical); every rule specific to this repository (not generic).
- No whitelist scope; no authoring branch beyond conditional agent routing.

### Anti-Rationalization rows

| Evasion                                   | Rebuttal                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| "Scope obvious, skip Phase 0 detection"   | Phase 0 is BLOCKING — agent routing depends on detected scope             |
| "Rules are standard, don't need examples" | Every rule MUST have `file:line` evidence from this repository            |
| "Anti-patterns are hypothetical"          | Anti-Patterns section requires REAL `file:line` violations only           |
| "Round 2 review not needed"               | Main agent rationalizes own decisions. Fresh sub-agent is non-negotiable. |
| "Doc has content, skip re-read"           | Show section list extracted from doc as proof of re-read                  |

### prompt-enhance

`$prompt-enhance docs/project-reference/code-review-rules.md`

---

## Target: domain-entities

- **doc:** `docs/project-reference/domain-entities-reference.md`
- **description:** `[Documentation] Use when scanning domain entities, data models, DTOs, aggregate boundaries, sync patterns, and ER diagrams.`
- **sub-agents:** 4 (3-4) — Agent 1: Domain Entities & Aggregates · Agent 2: DTOs, ViewModels & Application Layer Models · Agent 3: Database Schemas & Persistence · Agent 4: Cross-Service Entity Sync (**microservices only — skipped for monolith/modular-monolith**). Phase 2 header reads "Launch 3-4 general-purpose sub-agents."

### Phase 0 detection — BLOCKING, dual-axis (framework AND architecture)

Mode-detect: read the doc → Init/Sync; in Sync mode extract entity catalog sections → skip up-to-date services.

Framework detection table:

| Indicator                             | Framework                  | Entity Patterns to Search                                                |
| ------------------------------------- | -------------------------- | ------------------------------------------------------------------------ |
| configured backend manifest           | configured backend runtime | entity, aggregate-root, value-object, identity/base markers              |
| `package.json` + ORM                  | Node.js                    | Mongoose `Schema`, TypeORM `@Entity`, Prisma `model`, Sequelize `define` |
| `pom.xml` / `build.gradle`            | Java/Kotlin                | JPA `@Entity`, Spring Data, Hibernate, `@Table`                          |
| `requirements.txt` / `pyproject.toml` | Python                     | Django `models.Model`, SQLAlchemy, Pydantic `BaseModel`                  |
| `*.proto`                             | Protobuf                   | `message` definitions (cross-service contracts)                          |

Architecture-type table (drives Agent 4 gate):

| Signal                                                   | Architecture     | Sub-Agents                                         |
| -------------------------------------------------------- | ---------------- | -------------------------------------------------- |
| Multiple service directories with separate domain layers | Microservices    | Run all 4 agents including Agent 4 (cross-service) |
| Single domain layer                                      | Monolith         | Run Agents 1-3, skip Agent 4                       |
| Single deployment, bounded contexts                      | Modular monolith | Run Agents 1-3, analyze module boundaries          |

Step 4 — Load service paths from `docs/project-config.json` `modules[]` if available.

**Evidence gate:** Confidence <60% on framework detection → report uncertainty, DO NOT proceed with framework-specific scan.

### Sub-agent Think scopes

**Agent 1: Domain Entities & Aggregates**

- **Think (VERBATIM):** "What is the entity hierarchy in this repository? Which classes are aggregate roots vs leaf entities vs value objects? What are the key business properties (IDs, status, foreign keys)? Where is domain logic placed?"
- Scan targets: grep entity base-class inheritance (framework-specific from Phase 0); aggregate root classes; value objects; enum types used as entity properties; per entity note key properties (ID, FKs, status/state, timestamps); record `file:line`.

**Agent 2: DTOs, ViewModels & Application Layer Models**

- **Think (VERBATIM):** "How does data flow from entities to consumers? Who owns the mapping — the DTO, the handler, or a mapper service? Where is the mapping defined?"
- Scan targets: grep DTO classes (`*Dto`, `*DTO`, `*ViewModel`, `*Response`, `*Request`); command/query objects carrying entity data; DTO-to-Entity mapping patterns (who owns mapping, method names); which DTOs map to which entities.

**Agent 3: Database Schemas & Persistence**

- **Think (VERBATIM):** "How are entities persisted? What indexes exist? What databases are used per service? Where is schema evolution handled?"
- Scan targets: collection/table definitions; migration files creating/altering entity storage; index definitions; configured database technology per service; seed data files.

**Agent 4: Cross-Service Entity Sync** (microservices only — skip otherwise)

- **Think (VERBATIM):** "Which entities cross service boundaries? Who owns them? How are they synced — via events, via direct API calls, or via shared database (the last being an anti-pattern)?"
- Scan targets: integration event classes (`*IntegrationEvent`, `*Event`, `*Message`); message-bus consumers syncing entity data across services; shared contracts/DTOs between services; map which entity originates in which service + which services consume it; event handler classes creating/updating projected entities.

### Target Sections

| Section                      | Content                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| **Entity Catalog**           | Table per service/module: entity name, key properties (IDs, FKs, status), base class, `file:line` |
| **Entity Relationships**     | Mermaid ER diagram per service — key relationships only                                           |
| **Cross-Service Entity Map** | Table: entity, owner service, consumer services, sync event, direction                            |
| **DTO Mapping**              | Table: DTO class → Entity class, mapping approach, `file:line`                                    |
| **Aggregate Boundaries**     | Which entities form aggregates, aggregate root identification                                     |
| **Naming Conventions**       | Detected naming patterns (suffixes, prefixes, namespace conventions)                              |
| **Coverage Report**          | Services scanned / entities found / services with NO entities (gaps)                              |

### Content Rules / exceptions

- **Entity Catalog Format** — fixed markdown table per service: `### {ServiceName} Entities` with columns `Entity | Key Properties | Base Class | Relationships | File`; example row `Order | Id, CustomerId, UserId, Status | EntityBase | 1:N OrderLines | path/Order.cs:L15`.
- **Detail-level cap (deviation):** Summary + key properties only — IDs, FKs, status/state, important business fields. Do NOT list every property.
- **Mermaid ER Diagram Guidelines:** one diagram per service/bounded context (keep readable); one cross-service diagram showing entity sync flows; show only key relationships, not every FK.

### Special slivers

- **4 sub-agents** — Agent 4 runs only for Microservices; skipped (Agents 1-3 only) for Monolith / Modular monolith.
- Phase 0 framework detection is **BLOCKING** — entity patterns depend on detected framework (closing reminder requires BOTH framework AND architecture).
- Architecture-type **BLOCKING gate** governs Agent 4: must confirm monolith from Phase 0 evidence before skipping Agent 4; directory names alone are NOT evidence.
- **Coverage Report is a MANDATORY required section** — list services with NO entities found (gaps).
- Loads service paths from `docs/project-config.json` `modules[]`.
- Sub-agent confidence thresholds %-based: >80% document; 60-80% note "observed (unverified)"; <60% omit.
- Round 2 fresh-eyes: every entity has real `file:line` (Glob verify); class names match actual definitions (Grep verify); coverage gap report; cross-service sync entries accurate (right owner, right consumer).
- Verify step: Glob-verify ALL entity paths — "5 is insufficient." No whitelist scope.

### Anti-Rationalization rows

| Evasion                                          | Rebuttal                                                                                                                            |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| "Framework obvious, skip Phase 0 detection"      | Phase 0 is BLOCKING — entity patterns depend on detected framework                                                                  |
| "Architecture type obvious from directory names" | Verify from actual service structure — names are not evidence                                                                       |
| "Verified 5 paths, that's enough"                | Glob-verify ALL entity paths — 5 is insufficient                                                                                    |
| "Cross-service agent not needed (monolith)"      | Confirm monolith from Phase 0 evidence before skipping Agent 4                                                                      |
| "Coverage report not needed"                     | Coverage report is a required section — list services with no entities found                                                        |
| "Skip Round 2 even when Round 1 found issues"    | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes own entity discoveries. |

### prompt-enhance

`$prompt-enhance docs/project-reference/domain-entities-reference.md`

---

## Target: feature-spec

- **doc:** `docs/project-reference/feature-spec-reference.md`
- **description:** `[Documentation] Use when scanning feature documentation structure, app-to-service mapping, templates, and conventions.`
- **sub-agents:** 2 — Agent 1: Documentation Structure (+ M1/M2 compliance scan) · Agent 2: App-to-Service Mapping

### Phase 0 detection — **[BLOCKING]** (mode-detection BLOCKING: INIT vs SYNC paths differ significantly)

Determine **mode** first via shell probe:

```bash
test -f docs/project-reference/feature-spec-reference.md && echo "SYNC mode" || echo "INIT mode"
```

| Mode      | Condition                                  | Behavior                                               |
| --------- | ------------------------------------------ | ------------------------------------------------------ |
| **INIT**  | `feature-spec-reference.md` does not exist | Create from scratch; scan entire `docs/specs/`         |
| **SYNC**  | `feature-spec-reference.md` exists         | Read existing file first; update changed sections only |
| **FORCE** | User explicitly says "rebuild" or "reset"  | Treat as INIT even if file exists                      |

Detect documentation **structure** type:

| Signal                                      | Type                      | Scan Approach                              |
| ------------------------------------------- | ------------------------- | ------------------------------------------ |
| `docs/specs/{App}/` directories             | App-bucketed feature docs | Scan per-app, map to services              |
| `docs/features/{Feature}.md` flat structure | Feature-per-file          | Scan each file, derive categories          |
| `wiki/` or external doc system links        | Wiki-based                | Scan wiki references, note external        |
| README.md embedded in service dirs          | Source-embedded           | Scan configured source-root markdown files |

Path branching: INIT → Phase 1 → Phase 2 (full scan) → Phase 3 (full write) → Phase 4 (verify). SYNC → Phase 0 read existing → Phase 1 → Phase 2 (diff scan, new/changed only) → Phase 3 (targeted update) → Phase 4 (verify).

### Sub-agent Think scopes

**Agent 1: Documentation Structure**

- **Think (Coverage dimension):** Which apps/modules have feature documentation? Which are missing? What's the distribution — evenly documented or concentrated?
- **Think (Accuracy dimension):** What section headings actually appear across feature docs? What's the frequency? Which sections are standard (≥80% coverage) vs optional (20-80%) vs rare (<20%)?
- **Think (Completeness dimension):** Are there documentation naming patterns? Section numbering? Required fields (evidence fields, TC IDs)?
- Scan targets: glob `docs/**/*.md`; find documentation templates (template files, skeleton docs); recurring H2/H3 headings across docs; count docs per app/module for coverage distribution; doc naming patterns.
- **M1/M2 Compliance Scan (per feature doc):** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)" for BLOCKING criteria. Scan §1-14 prose lines (excluding evidence carriers `**Evidence**` / `IntegrationTest` / `[Source:]`, YAML frontmatter, and ` ```mermaid ``` ` blocks) and report:
    - **M1 prose leaks:** banned tech-term occurrences (framework/product/language/persistence/messaging/auth names + project-internal framework type names — banned-token list in `spec-principles.md` §3.2) in narrative, headings, tables.
    - **M2 prose leaks:** code-identifier occurrences (class/method names, file paths, namespaces) in narrative prose.
    - Report each leak by **file, line, and section**.

**Agent 2: App-to-Service Mapping**

- **Think (Relationships dimension):** Which frontend apps map to which backend services? Where is this documented vs inferred? Which apps have no service mapping?
- **Think (Conventions dimension):** What naming, numbering, and tagging conventions appear consistently? Are TC IDs present? What format?
- Scan targets: map frontend apps to backend services (from config, imports, or API calls); API reference docs + their relationship to services; troubleshooting docs + coverage; cross-references between docs (links, mentions); doc generation tools/scripts.

### Target Sections

| Section                       | Content                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------- |
| **App-to-Service Mapping**    | Table: App name, Backend services, Doc directory, Doc count                      |
| **Directory Structure**       | Tree showing docs/ organization with purpose annotations                         |
| **Template Paths**            | Table: Template name, Path, Purpose, Used by N docs                              |
| **Section Structure**         | Standard sections across feature docs (with frequency table)                     |
| **Documentation Conventions** | Naming, numbering, required fields, evidence rules                               |
| **Coverage Gaps**             | Apps/services without documentation, incomplete docs                             |
| **M1/M2 Compliance Leaks**    | Per-leak table: File, Line, Section, Mandate (M1/M2), Offending token/identifier |

### Content Rules / exceptions — DEVIATES from shared no-trees rule

- Use tables for all structured data (mappings, templates, conventions).
- **Include actual directory tree output (top 3 levels) — this target INTENTIONALLY includes trees** (inversion of the shared no-trees rule; reinforced in the Output note: the primary output MUST include the actual directory tree as the source of truth for doc locations — deliberately different from spec output documents which suppress trees).
- Section heading patterns with frequency percentages.
- **Coverage Gaps section is mandatory** — list undocumented areas explicitly.
- **NO `output-quality-principles` SYNC block** is present in this target (consistent with the deliberate tree inclusion); its `:reminder` is also absent. The host's output-rule reminder is therefore overridden for this target.

### Special slivers

- **[BLOCKING] Tech-agnostic output gate:** registry/overview/summary prose + headings stay tech-agnostic per `docs/project-reference/spec-principles.md` §3 (+ §3.2 banned-token list) — no framework/product/language/design-pattern names; source paths and class names appear ONLY in evidence fields (`**Evidence**`, `[Source:]`), frontmatter, and Mermaid.
- **[BLOCKING] Phase 0 mode-detection** (INIT vs SYNC paths differ significantly).
- **Tech-agnostic M1/M2 compliance scan** (Agent 1) → produces dedicated **M1/M2 Compliance Leaks** target section.
- **Directory-trees ALLOWED here** — explicit per-target inversion of the shared no-trees rule (top 3 levels).
- **Phase 4 verifies 3 specific template paths:** `docs/specs/{Bucket}/README.{FeatureName}.md` (feature doc template); `.claude/skills/spec/SKILL.md` (feature doc generation skill); `.claude/skills/shared/tc-format.md` (canonical TC format).
- Sub-agent count = 2 (structure agent + mapping agent).

### Anti-Rationalization rows

| Evasion                                       | Rebuttal                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| "Mode obvious, skip Phase 0 detection"        | Phase 0 mode detection is BLOCKING — INIT vs SYNC paths differ significantly                                                         |
| "Coverage Gaps not needed"                    | Coverage Gaps is a required section — omitting it hides maintenance debt                                                             |
| "Template paths probably exist"               | Verify all 3 template paths exist before writing — "probably" ≠ verified                                                             |
| "App-service mapping looks right"             | Verify mappings match actual directory structure via glob                                                                            |
| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes own section extractions. |

### prompt-enhance

`$prompt-enhance docs/project-reference/feature-spec-reference.md`

---

## Target: docs-index

- **doc:** `docs/project-reference/docs-index-reference.md`
- **description:** `[Documentation] Use when scanning documentation structure, counts, relationships, categories, and lookup tables.`
- **sub-agents:** 1 — a single fresh-eyes / zero-memory verification sub-agent spawned in **Phase 5**. This target is NOT structured as parallel "Agent 1/2/3": the MAIN agent performs the scanning (Phases 2-4), and only the Phase 5 verifier is a sub-agent.

### Phase 0 detection

- **Mode-detect (inline `init`/`sync` labels, lowercase):** read the doc → init (placeholder only) / sync (real content). In sync: note which sections exist + current file counts to diff.
- **Documentation organization type table:**

| Signal                                    | Type                 | Scan Approach                                 |
| ----------------------------------------- | -------------------- | --------------------------------------------- |
| Structured `docs/{category}/` directories | Structured hierarchy | Scan per-category with phase table below      |
| Single flat `docs/` with all files        | Flat structure       | Single glob, categorize by filename prefix    |
| `wiki/` or external doc system            | Wiki-based           | Scan wiki directory, note external docs       |
| Mix of docs + inline README.md files      | Hybrid               | Scan both `docs/` and source-embedded READMEs |

- Load service paths from `docs/project-config.json` if available.
- **Evidence gate:** Confidence <60% on organization type → ask user, DO NOT guess structure.

### Think scopes (NO parallel Agent 1/2/3 — Phases 2-4 carry their own Think prompts, performed by the MAIN agent)

**Phase 2: Scan Documentation Tree** — write findings incrementally after each category, NEVER batch.

- **Think (Coverage dimension):** Which directories exist under `docs/`? Which have content vs are empty/stub?
- **Think (Accuracy dimension):** For each count in the existing doc, does the actual glob match? What's the delta?
- **Think (Completeness dimension):** Are there markdown files outside documented directories (configured source roots, `.claude/`, project root)? Are those included in any category?
- **Think (Discovery dimension):** Which files don't fit any existing category? Where do they go?
- Scan targets: **Root-Level Docs** — glob `*.md` in project root (README.md, CLAUDE.md, CHANGELOG.md, etc.), each with one-line purpose; file count verified via glob — NEVER estimate. **docs/ Directory** — scan each subdirectory with verified glob counts via this table:

    | Category                | Glob Pattern                                                                   | What to Extract                           |
    | ----------------------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
    | project-reference/      | `docs/project-reference/**/*.md`                                               | File count (verified), list with purposes |
    | operations              | `docs/getting-started.md`, `docs/deployment.md`, etc.                          | File count, list                          |
    | design-system/          | `docs/design-system/**/*.md` or `docs/project-reference/design-system/**/*.md` | File count, app mapping                   |
    | specs/ feature specs    | `docs/specs/*/README.*.md`                                                     | Feature Spec count per bucket             |
    | specs/ catalogs         | `docs/specs/*/INDEX.md`                                                        | Bucket index presence                     |
    | architecture-decisions/ | `docs/architecture-decisions/**/*.md`                                          | ADR count                                 |
    | templates/              | `docs/templates/**/*.md`                                                       | Template count and types                  |
    | release-notes/          | `docs/release-notes/**/*.md`                                                   | File count                                |

    Plus **Uncategorized files discovery rule:** after scanning all categories, run a broad glob `docs/**/*.md` and diff against the union of all category globs. Files in the diff are uncategorized — create a separate "Uncategorized / Other" section. NEVER silently omit files. **.claude/docs/** — glob `.claude/docs/**/*.md` (count + categorize); glob `.claude/skills/**/*.md` (count skills).

**Phase 3: Build Doc Relationship Map**

- **Think:** Which docs serve as entry points (README → guide chains)? Which are referenced from multiple places? Which are isolated?
- Trace key relationships by grepping markdown links: entry points (README → getting-started → deployment); CLAUDE.md → reference doc pointers; which docs link to which.

**Phase 4: Build Lookup Table** (no Think prompt)

- For each `docs/specs/{Bucket}/`: extract bucket name + key business-capability keywords from each `README.{Feature}.md`; map keywords → bucket path. For each `docs/project-reference/*.md`: extract domain covered; map keywords → file path.

**Phase 5: Fresh-Eyes Verification** (the lone sub-agent, zero memory) — 6 checks:

1. Sample 5 file paths from each category — do they exist? (Glob check)
2. Does the total count for each category match a fresh glob of that pattern?
3. Are there any files in `docs/**/*.md` that appear in no category? (Run the diff)
4. Does the lookup table have entries for all documented categories?
5. Are there duplicate entries in the lookup table (same path, different keyword)?
6. Are uncategorized files documented in a separate section?

### Target Sections

| Section                   | Content                                                                   |
| ------------------------- | ------------------------------------------------------------------------- |
| **Documentation System**  | `{total}` markdown files across `{N}` categories. Last scanned: `{date}`. |
| **Documentation Graph**   | ASCII tree with counts — counts from verified globs only                  |
| **Key Doc Relationships** | ASCII relationship diagram — entry points and cross-references            |
| **Doc Lookup Guide**      | keyword → path table                                                      |
| **Uncategorized Files**   | Files found by broad glob not in any category — with paths                |

Doc header also carries `<!-- Last scanned: {YYYY-MM-DD} -->`, title `# Documentation Index Reference`, and the banner `> Auto-generated by $scan --target=docs-index. Do not edit manually.`

### Content Rules / exceptions — INVERTS the shared no-counts rule

- ALL file counts MUST be verified via glob, not copied from existing content; **evidence gate required for EVERY count claim — never estimate.**
- The OUTPUT doc deliberately DOES contain counts (`{total}`, `{N}`, per-category counts in the Documentation Graph) — counts are the product here, but every count must be glob-verified, never estimated/copied. (The shared output-quality "no counts" rule applies only to the skill's own prose, per the reminder.)
- Discover everything dynamically; never hardcode project-specific values.

### Special slivers

- **Uncategorized discovery diff (unique coverage gate):** broad glob `docs/**/*.md` diffed against union of category globs; remainder MUST get a dedicated "Uncategorized / Other" section — NEVER silently omit.
- **Counts/categories whitelist:** the fixed docs/ category set (project-reference, operations, design-system, specs feature-specs, specs catalogs, architecture-decisions, templates, release-notes) PLUS root-level `*.md` PLUS `.claude/docs/**` and `.claude/skills/**`.
- **Phase 5 fresh-eyes is mandatory before writing final doc** — 6 specific checks; "Proceed to Phase 6 only after fresh-eyes verification passes."
- **Lookup-table completeness gate:** map keywords for EVERY documented category; no duplicate (same path, different keyword) entries.
- No BLOCKING framework-detection gate (that's e2e-tests'); the only conditional branching here is mode init/sync + organization-type routing.

### Anti-Rationalization rows

| Evasion                                          | Rebuttal                                                                                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| "Count looks right from existing doc, skip glob" | EVERY count requires fresh glob verification — no exceptions                                                                     |
| "Only need to check 3 paths"                     | Phase 5 has 6 specific checks — sample across all categories                                                                     |
| "All files fit into existing categories"         | Run the uncategorized discovery diff — NEVER assume full coverage                                                                |
| "Skip Round 2 even when Round 1 found issues"    | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent's counts carry confirmation bias. |
| "Lookup table doesn't need all keywords"         | Map keywords for EVERY documented category, not just top-level                                                                   |

### prompt-enhance

`$prompt-enhance docs/project-reference/docs-index-reference.md`

---

## Target: e2e-tests

- **doc:** `docs/project-reference/e2e-test-reference.md`
- **description:** `[Documentation] Use when scanning E2E test architecture, page objects, step definitions, configuration, and framework patterns.`
- **sub-agents:** 3 (parallel, framework-gated) + 1 fresh-eyes verifier — Agent 1: E2E Framework & Architecture · Agent 2: Page Object Model & Components · Agent 3: BDD & Test Patterns (**runs ONLY if BDD detected**) · plus Phase 3 Round 2 fresh sub-agent (zero memory).

### Phase 0 detection — **BLOCKING framework gate** (BDD vs non-BDD determines which agents run)

Framework + artifact-type routing table:

| Signal                                              | Framework                | Artifact Type      | Agent Routing                |
| --------------------------------------------------- | ------------------------ | ------------------ | ---------------------------- |
| configured BDD feature files + step binding markers | configured BDD framework | BDD + Page Objects | Run Agent 1+2+3 (BDD)        |
| `playwright.config.*`                               | Playwright               | Non-BDD            | Run Agent 1+2 (skip Agent 3) |
| `cypress.config.*`                                  | Cypress                  | Non-BDD            | Run Agent 1+2 (skip Agent 3) |
| `*.feature` files + Python                          | Behave (BDD)             | BDD                | Run Agent 1+2+3 (BDD)        |
| `*.feature` files + Java                            | Cucumber (BDD)           | BDD                | Run Agent 1+2+3 (BDD)        |
| `wdio.conf.*`                                       | WebdriverIO              | Non-BDD            | Run Agent 1+2 (skip Agent 3) |

Mode-detect table (explicit):

| Mode | Condition                                  | Action                                              |
| ---- | ------------------------------------------ | --------------------------------------------------- |
| Init | Target doc doesn't exist or is placeholder | Full scan, create all sections                      |
| Sync | Target doc exists with content             | Diff scan — check for new frameworks, count changes |

Also: in Sync mode extract section list → skip well-documented sections. Read `docs/project-config.json` `e2eTesting` section if it exists — use as path hints.

**Evidence gate:** Confidence <60% on framework → report uncertainty, ask user before proceeding.

### Sub-agent Think scopes (Phase 2 contract: write incrementally per file, cite `file:line`, NEVER document a count — use grep-expression statistics. Report → `plans/reports/scan-e2e-tests-{YYMMDD}-{HHMM}-report.md`.)

**Agent 1: E2E Framework & Architecture**

- **Think:** What makes this test infrastructure reusable vs brittle? How is the test project structured? What base classes exist and what do they provide? What lifecycle hooks are available?
- Scan targets: E2E project structure (test dirs, page object dirs); base classes for tests + page objects; DI/startup config for test projects; WebDriver/browser management (driver creation, lifecycle, options); settings/config classes (URLs, credentials, timeouts). **Security flag:** if test credentials are found hardcoded in source files, flag as CRITICAL security issue in report.

**Agent 2: Page Object Model & Components**

- **Think:** How do page objects encapsulate UI interaction? What patterns make them maintainable? What wait/retry strategies prevent flakiness?
- Scan targets: page object classes + hierarchy; UI component wrappers (reusable element abstractions); selector patterns (CSS, data-testid, XPath, BEM) — note which used most; navigation helpers (page transitions, URL routing); wait/retry patterns (explicit waits, polling, retry logic); assertion helpers + validation patterns.

**Agent 3: BDD & Test Patterns** (run ONLY if BDD detected in Phase 0)

- **Think:** How do feature files, step definitions, and context sharing work together? What patterns enable reuse across scenarios? How is test state managed?
- Scan targets: feature files (`.feature`) — categorize by area; step definition classes — count patterns; context/state sharing (ScenarioContext, World, IBddStepsContext); hooks (Before/After scenario, BeforeAll/AfterAll); test data patterns (fixtures, factories, unique generators); test account/credential management; environment config (per-env settings, CI headless mode).

### Target Sections

Required Sections (all frameworks):

| Section                       | Content                                         |
| ----------------------------- | ----------------------------------------------- |
| **Architecture Overview**     | Layer diagram, project dependencies             |
| **Base Classes**              | Test/page object hierarchies with code examples |
| **Page Object Pattern**       | How to create page objects, component wrappers  |
| **Wait & Assertion Patterns** | Resilient waits, retry, assertion helpers       |
| **Configuration**             | Settings files, environment variants, CI setup  |
| **Running Tests**             | Commands for all, filtered, headed, CI modes    |
| **Best Practices**            | Project-specific conventions                    |

Conditional Sections (framework-specific — only add if corresponding code evidence found):

- **BDD Pattern** (if SpecFlow/Cucumber/Behave) — feature file conventions, step definitions, context sharing, tags
- **Test Account System** (if credential management found) — account types, numbered variants
- **Environment Variants** (if multi-env found) — abstract/concrete page pattern, env-specific configs

### Content Rules / exceptions

- **NEVER document a count — use grep-expression statistics instead** (applies to BOTH report and output doc; `project-config.json` `stats` use grep expressions, NOT hardcoded counts).
- **Conditional-section rule:** only add a conditional section if corresponding code evidence found.
- Every code example from actual project files with `file:line`.

### Special slivers

- **BLOCKING Phase 0 framework gate:** BDD vs non-BDD detection determines which agents run; Agent 3 gated on BDD detection; non-BDD must be confirmed from Phase 0 evidence before skipping Agent 3.
- **BDD authoring branch:** Agent 3 + BDD Pattern section + Test Account System + Environment Variants are all evidence-gated branches.
- **CRITICAL security flag:** hardcoded test credentials in source → flag CRITICAL in report; verified again in Round 2.
- **Grep-expression statistics (no hardcoded counts):** feature/step counts expressed as grep expressions, never numbers; verified in Round 2 and Phase 5.
- **Phase 4 `project-config.json` update (target-unique step):** update/create `e2eTesting` section (framework, language, bddFramework, guideDoc, runCommands, entryPoints, `stats` with `featureFilesGrepExpr` / `stepDefinitionFilesGrepExpr`, dependencies, architecture) — stats use grep expressions NOT counts.
- **Multi-round verification with escalation cap:** R1 (main) → R2 (fresh sub-agent, zero memory) → R3 only if R2 finds issues; max 3 rounds → escalate to user.
- **Phase 5 Write & Verify extras:** verify dependency versions against `.csproj` / `package.json` / `requirements.txt`; verify no hardcoded file counts in output doc.

### Anti-Rationalization rows

| Evasion                                       | Rebuttal                                                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| "Framework obvious, skip Phase 0 detection"   | Phase 0 is BLOCKING — BDD vs non-BDD detection determines which agents run                                                       |
| "BDD agent not needed (probably non-BDD)"     | Confirm non-BDD from Phase 0 evidence before skipping Agent 3                                                                    |
| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes fabricated examples. |
| "File counts in project-config.json are fine" | NEVER hardcode counts — use grep expressions to avoid instant staleness                                                          |
| "Conditional sections not needed"             | Only add conditional sections if corresponding code evidence found in scan                                                       |

### prompt-enhance

`$prompt-enhance docs/project-reference/e2e-test-reference.md`

---

## Target: integration-tests

- **doc:** `docs/project-reference/integration-test-reference.md`
- **description:** `[Documentation] Use when scanning integration test base classes, fixtures, helpers, configuration, and service setup.`
- **sub-agents:** 2 — Agent 1: Test Infrastructure (base classes, fixtures, factories, config, DI overrides, seed data) · Agent 2: Test Patterns & Conventions (assertion patterns, test data uniqueness/cleanup, categorization, coverage distribution)

### Phase 0 detection — **[BLOCKING]**, multi-dimensional (framework + infrastructure approach + mode + config-prereq load)

Step 2 — Detect test framework:

| Signal                         | Framework                 | Key Patterns to Search                                        |
| ------------------------------ | ------------------------- | ------------------------------------------------------------- |
| configured test project marker | configured test framework | configured test attributes, fixtures, or lifecycle hooks      |
| configured test project marker | configured test framework | configured test, setup, teardown, and suite lifecycle markers |
| `package.json` with jest       | Jest                      | `describe`, `it`, `beforeAll`, `afterAll`, `jest.mock`        |
| `package.json` with vitest     | Vitest                    | `describe`, `test`, `vi.mock`, `beforeEach`                   |
| `package.json` with playwright | Playwright                | `test.describe`, `page`, `expect`, `fixtures`                 |
| `pytest.ini`/`conftest.py`     | Python pytest             | `@pytest.fixture`, `conftest`, `@pytest.mark`                 |
| `pom.xml` with JUnit           | Java JUnit                | `@Test`, `@BeforeAll`, `@SpringBootTest`                      |

Step 3 — Detect infrastructure approach:

| Signal                                  | Approach                | Agent Focus                             |
| --------------------------------------- | ----------------------- | --------------------------------------- |
| `Testcontainers` in deps                | Docker-based real infra | Container lifecycle, startup time       |
| `WebApplicationFactory`                 | In-process server       | DI override patterns, test server setup |
| `appsettings.test.json`                 | Config-based test infra | Connection string overrides, env vars   |
| In-memory DB patterns                   | Fake infra              | DB reset strategies, seeding            |
| await-until-condition / polling helpers | Eventual consistency    | Async assertion patterns                |

Step 4 — Detect scan mode:

| Mode | Condition                               | Action                                                 |
| ---- | --------------------------------------- | ------------------------------------------------------ |
| Init | Target doc doesn't exist or placeholder | Full scan, create all sections                         |
| Sync | Target doc has real content             | Diff scan — check for new base classes, helper changes |

Mode-detect: read the doc first → Init/Sync; in Sync mode extract section list → skip well-documented sections.

Step 5 — **config-driven prerequisites load (TARGET-SPECIFIC):** load test project paths + run prerequisites from `docs/project-config.json` → `integrationTestVerify` if available:

- `referenceDocs[]` — read these project-specific setup docs before documenting how verification should run
- `runScript` / `startupScript` — inspect to capture Docker/system startup behavior + supported arguments
- `systemCheckCommand` — document what readiness check must pass before direct test commands
- `quickRunCommand`, `testProjectPattern`, `testProjects[]` — source of truth for runner commands + project discovery
- `integrationRules[]` — document repeatability/data-integrity gates, including 3 consecutive verification runs without DB reset

**Evidence gate:** Confidence <60% on framework detection → report uncertainty, ask user before proceeding.

### Sub-agent Think scopes

**Agent 1: Test Infrastructure**

- **Think (Base Class dimension):** "What does the base class provide — DI container, test server, database connection, fixture lifecycle? Is there a hierarchy (base → service-specific → test)? What must a new test author know to write their first test?"
- **Think (Isolation dimension):** "How is test isolation achieved — unique IDs per run, database reset, transaction rollback, separate tenant? Can tests run in parallel? What breaks parallelism?"
- **Think (Infrastructure dimension):** "What must be running for tests to pass? How is the infrastructure provisioned — Docker, in-memory, seeded fixtures? What's the startup cost?"
- **Security flag:** if test credentials are found hardcoded in source files (not env vars or secret stores), flag as CRITICAL security issue in report.
- Scan targets: test base classes (`extends.*Test`, `TestBase`, `IntegrationTest`, `IClassFixture`, and the project's own integration-test base class — discover via grep); fixtures + factories (`WebApplicationFactory`, `TestFixture`, `conftest`, module bootstrappers); test config (`appsettings.test.json`, `.env.test`, test container setup, port bindings); DI/service registration overrides (mock registrations, test doubles); test data builders, seed data patterns, unique name generators.

**Agent 2: Test Patterns & Conventions**

- **Think (Assertion dimension):** "What assertion patterns are used? Is there a waiting/polling mechanism for async operations? Are assertions on specific field values or just \"does not throw\"?"
- **Think (Data dimension):** "How is test data created — builders, factories, seed methods? How is uniqueness ensured across runs? Is there a cleanup strategy?" — Flag direct repository create/update setup as a risk unless it is a valid, idempotent fixture seeder for service-owned reference data. Flag verification guidance as incomplete if it does not require 3 consecutive successful runs without DB reset.
- **Think (Coverage dimension):** "Which services have tests? Which are missing? What's the test-to-feature ratio?"
- Scan targets: assertion helpers (await-until-condition / polling helpers, custom assertion extensions, fluent `Should*`-style matchers); common test patterns (Arrange-Act-Assert, Given-When-Then, test data flow); test categorization (traits, categories, tags); data uniqueness patterns (`Ulid.NewUlid()`, `Guid.NewGuid()`, timestamp suffixes); infrastructure interaction (database state verification, queue drain, cache clear); map which services have test projects (coverage distribution) — use grep expressions, not counts.

### Target Sections

| Section                    | Content                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ |
| **Test Architecture**      | Overall test strategy, framework, infrastructure approach, isolation mechanism |
| **Test Base Classes**      | Hierarchy with what each base provides; when to use which                      |
| **Fixtures & Factories**   | Test fixture setup, DI overrides, module bootstrappers                         |
| **Test Helpers**           | Assertion helpers, data builders, wait patterns with examples                  |
| **Configuration**          | Test config files, connection strings, environment variables                   |
| **Service-Specific Setup** | Per-service test differences, custom overrides, module registration            |
| **Test Data Patterns**     | How data is created, unique naming, cleanup strategies                         |
| **New Test Quickstart**    | Minimal steps to add a new test for a new service                              |
| **Running Tests**          | Commands for all, filtered, parallel, CI integration                           |

### Content Rules / exceptions

Standard `output-quality-principles` (no counts/trees/TOCs, 1 example per pattern, lead with answer). Plus target-specific Phase-4 write rules: (1) `<!-- Last scanned: YYYY-MM-DD -->` at top; (2) surgical update only; (3) Verify (Glob + Grep) ALL code example paths exist AND class names match; (4) Verify no hardcoded file counts — use grep expressions; (5) Verify security flag present if credentials found; (6) Report sections created vs updated, framework detected, coverage gaps. Round 2 fresh-eyes: every example exists at claimed `file:line`; base class names match actual definitions; hardcoded credentials flagged; coverage stats as grep expressions not counts.

### Special slivers

- **BLOCKING:** Phase 0 detection is `[BLOCKING]` — must run before any other step.
- **Dual-dimension detect requirement:** MUST detect framework AND infrastructure type FIRST — patterns differ significantly.
- **Evidence gate:** Confidence <60% on framework → stop and ask user.
- **Hardcoded-credentials security gate:** test creds hardcoded in source (not env/secret store) → flag CRITICAL in report; verify flag present in Phase 4.
- **3-consecutive-runs repeatability gate (TARGET-UNIQUE):** verification guidance is INCOMPLETE unless it requires 3 consecutive successful runs without DB reset.
- **Direct-repository-setup risk branch:** flag direct repository create/update setup as a risk unless it is a valid, idempotent fixture seeder for service-owned reference data.
- **Smoke-only prohibition:** never document smoke-only assertions as acceptable unless infrastructure is truly unobservable.
- **No hardcoded counts:** coverage/test-file counts MUST be grep expressions, never hardcoded.
- **Config-prereq Step 5:** loads `integrationTestVerify` from `project-config.json` (target-specific).

### Anti-Rationalization rows

| Evasion                                       | Rebuttal                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| "Framework obvious, skip Phase 0 detection"   | Phase 0 is BLOCKING — infrastructure approach determines which patterns to scan                                                      |
| "Smoke-only test assertions are fine"         | NEVER document smoke-only as acceptable unless infrastructure is truly unobservable                                                  |
| "Direct repository setup is just test data"   | Flag it unless it creates valid owned fixture data; tests should exercise real use cases, not impossible states.                     |
| "Base class looks right from memory"          | Grep-verify every base class name — AI hallucinates class hierarchies                                                                |
| "Coverage stats obvious from directory scan"  | NEVER hardcode counts — use grep expressions that stay accurate as tests are added                                                   |
| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes own fabricated examples. |
| "Credential security flag not needed"         | Hardcoded test creds are a CRITICAL security issue — ALWAYS flag if found                                                            |

### prompt-enhance

`$prompt-enhance docs/project-reference/integration-test-reference.md`

---

## Target: seed-test-data

This target scans seeder and dev-data patterns into the seed-test-data reference doc.

- **doc:** `docs/project-reference/seed-test-data-reference.md`
- **description:** `[Documentation] Use when scanning seeder patterns and populating/syncing docs/project-reference/seed-test-data-reference.md from real code evidence.`
- **sub-agents:** 1 — the MAIN agent performs the evidence scan (Steps below); a Phase-3 fresh-eyes / zero-memory verifier sub-agent re-checks examples. NOT structured as parallel Agent 1/2/3.

### Phase 0 detection — mode (init/sync)

Read both, then classify mode:

- `docs/project-reference/seed-test-data-reference.md`
- `docs/project-config.json` (`Data Seeders` context group)

| Mode     | Condition                    | Behavior                             |
| -------- | ---------------------------- | ------------------------------------ |
| **Init** | placeholder / sparse content | fill all sections from scan results  |
| **Sync** | existing real content        | update only stale/incorrect sections |

### Think scopes (NO parallel Agent 1/2/3 — the MAIN agent scans)

**Collect seeder evidence** — run evidence-first scans and adapt search terms to the configured stack:

```bash
# Seeder base class/interface + registration pattern (adapt terms from findings):
rg -n "DataSeeder|SeedData|CanSeedTestingData|SeedingMinimumDummyItemsCount" src
# DI-scoped execution pattern (scoped-async helpers / unit-of-work):
rg -n "Scoped|CreateScope|ServiceScope|UnitOfWork|Uow" src
# Seeder interface + DI registration (replace with actual names found above):
rg -n "ApplicationDataSeeder|AddTransient.*DataSeeder" src
# Cross-service wait / idempotency (count/condition-poll helpers):
rg -n "WaitUntil|PollUntil|CountAsync|AwaitCondition" src
# Concrete seeder examples (common seeder method-name patterns):
rg -n "SeedInitialData|SeedDemoData|SeedTestData|SeedAdmin" src
```

Graph check (when `.code-graph/graph.db` exists): `python .claude/scripts/code_graph trace <seeder-file> --direction both --json`.

**Minimum evidence to capture:** (1) seeder base class/interface; (2) environment gate method/key; (3) idempotency predicate + count loop pattern; (4) DI scope pattern (the project's scoped-execution / unit-of-work helper vs anti-patterns); (5) seeder registration pattern in DI; (6) cross-service wait pattern (if used).

### Target Sections

| Section                           | Content                                                                |
| --------------------------------- | ---------------------------------------------------------------------- |
| **Seeder Base Class / Interface** | Base type new seeders extend; required members                         |
| **Environment Gate**              | Method/key that gates seeding to the right environment                 |
| **Idempotency Pattern**           | Predicate + count loop that makes re-runs safe                         |
| **DI Scope Pattern**              | Project's scoped-execution / unit-of-work helper (vs the anti-pattern) |
| **Registration**                  | How seeders are registered in DI                                       |
| **Cross-Service Wait**            | Count/condition-poll helper for eventual consistency (if used)         |
| **Anti-Patterns**                 | Verified-in-source seeding anti-patterns only                          |

### Content Rules / exceptions

Standard `output-quality-principles`. Surgical sync only — keep existing section structure, replace generic claims with real evidence, every rule/example needs `file:line` proof, include anti-pattern warnings ONLY when verified in source, prefer short snippets with source-path notes.

### Special slivers

- **DI-scope safety gate:** verify the project's scoped-async execution primitive (discover via codebase grep — do NOT assume) against real source usage before documenting it.
- **One graph trace** when graph DB available (seeder entry file).
- Report → `plans/reports/seed-test-data-scan-{YYMMDD}-{HHMM}-report.md` (mode, evidence summary `file:line`, sections updated, open gaps).

### Anti-Rationalization rows

| Evasion                                          | Rebuttal                                                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| "Seeder pattern obvious, skip the grep evidence" | Every rule needs `file:line` proof — discover base class/DI scope from actual source, never assume |
| "Document the anti-pattern I expect to find"     | Include anti-pattern warnings ONLY when verified in source                                         |
| "Full rewrite is cleaner"                        | Sync mode is surgical — preserve structure, update stale sections only                             |
| "Skip Round 2 even when Round 1 found issues"    | Clean Round 1 ends the scan; when issues exist, fresh-eyes is mandatory after fixing               |

### prompt-enhance

`$prompt-enhance docs/project-reference/seed-test-data-reference.md`

---

## Target: ui-system

This is an **orchestrator meta-target**, not a single-doc scanner: it runs the 3 UI child scans and summarizes (it writes no doc of its own).

- **kind:** orchestrator
- **doc:** _(none of its own)_ — its children write `docs/project-reference/design-system/README.md`, `docs/project-reference/scss-styling-guide.md`, `docs/project-reference/frontend-patterns-reference.md`.
- **description:** `[Documentation] Use to orchestrate all UI system scans in parallel: design system + SCSS styling + frontend patterns.`
- **children:** `design-system`, `scss-styling`, `frontend-patterns` (each is a standard `--target=` scan that self-enhances its own doc).

### Orchestration Procedure (replaces the shared 4-phase engine)

**Phase 0 — Pre-Flight [BLOCKING]:**

1. Detect frontend code presence:

| Signal                                                                                    | Action                                                        |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| configured frontend manifests or frontend source dirs (e.g. `web/`, `frontend/`, `apps/`) | Proceed                                                       |
| No frontend code detected                                                                 | **STOP** — report "Backend-only project; `ui-system` skipped" |

2. Assess each child doc freshness (read last-scanned date): `design-system/README.md`, `scss-styling-guide.md`, `frontend-patterns-reference.md` — stale if >30 days old OR placeholder.
3. Decide which children to run:

| Condition                                    | Decision                                           |
| -------------------------------------------- | -------------------------------------------------- |
| All 3 fresh (≤30 days, real content)         | Ask user: "All UI docs are recent. Force refresh?" |
| 1–2 stale/missing                            | Run only the stale/missing scans                   |
| All 3 stale/missing                          | Run all 3 in parallel                              |
| User explicitly invoked `--target=ui-system` | Run all 3 regardless of freshness                  |

4. Read `docs/project-config.json` `designSystem` section if present — pass config-driven paths to the design-system child.
5. **Evidence gate:** confidence <60% on frontend code existence → ask user before proceeding.

**Phase 1 — Plan:** task tracking one task per child scan to run + one verification task per child + one summary task. Do NOT launch without tasks created.

**Phase 2 — Launch (parallel):** run the applicable children simultaneously, each FULLY self-contained (do NOT pass context between them):

- `$scan --target=design-system` → `docs/project-reference/design-system/README.md` (pass detected `designSystem` config if available)
- `$scan --target=scss-styling` → `docs/project-reference/scss-styling-guide.md`
- `$scan --target=frontend-patterns` → `docs/project-reference/frontend-patterns-reference.md`

**Phase 3 — Verify outputs (proceed only after ALL run children verified):** for each child doc — (1) file exists with content beyond placeholder headings (Glob + Read first 20 lines); (2) `<!-- Last scanned: -->` updated to today; (3) if placeholder-only/missing, flag FAILED and re-run that child once. If re-run still placeholder → escalate: "scan --target={child} produced no output. Please run it manually and check for errors."

**Phase 4 — Summarize** (from verified doc content only — NEVER fabricate):

```
UI System Scan Complete ({date}):
Design System    → design-system/README.md   Tokens:{…} Components:{…} Gaps:{…}
SCSS Styling     → scss-styling-guide.md      Approach:{…} BEM:{…} Gaps:{…}
Frontend Patterns→ frontend-patterns-reference.md  Framework:{…} State:{…} Gaps:{…}
```

### Content Rules / exceptions

- Does NOT modify application code — only populates `docs/project-reference/`.
- Summary fields come from verified child-doc content, never memory/estimate.

### Special slivers

- **Pre-flight is BLOCKING** — never launch scans on a backend-only project (wastes 3 child invocations).
- **Explicit-invocation override:** `--target=ui-system` run by the user forces all 3 children regardless of freshness.
- **Auto-trigger:** this meta-target replaces the 3 separate UI scan entries in any `project-config` scan table — one `--target=ui-system` covers design-system + scss-styling + frontend-patterns.

### Anti-Rationalization rows

| Evasion                                  | Rebuttal                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| "Frontend code obvious, skip pre-flight" | Phase 0 is BLOCKING — backend-only project wastes 3 child invocations   |
| "All docs are probably still fresh"      | Check last-scanned date via actual file read — never assume freshness   |
| "Children ran, so output must be there"  | Verify each child doc content — placeholder ≠ populated                 |
| "Summary from memory is fine"            | Summary must come from verified child docs — never fabricate findings   |
| "Only re-run needed children"            | Explicit `--target=ui-system` runs all 3 — override the freshness check |

### prompt-enhance

Each child self-enhances its own doc as its final step. After all children complete, **confirm** each child doc was prompt-enhanced; backfill any skipped via `$prompt-enhance <doc>`. Backfill list: `docs/project-reference/design-system/README.md` · `docs/project-reference/scss-styling-guide.md` · `docs/project-reference/frontend-patterns-reference.md`.
