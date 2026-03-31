---
name: project-config
version: 1.0.0
description: '[Utilities] Scan workspace and update docs/project-config.json to match current project structure'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

## Quick Summary

**Goal:** Scan the project workspace and update `docs/project-config.json` with accurate values reflecting the current directory structure, services, apps, and framework patterns.

**Workflow:**

1. **Read** -- Load current `docs/project-config.json` (or skeleton if just created)
2. **Scan** -- Discover backend services, frontend apps, design system docs, SCSS patterns, component prefixes
3. **Update** -- Write updated config preserving the existing schema structure
4. **Verify** -- Validate the updated config is valid JSON and all paths/regexes are correct

**Key Rules:**

- Preserves existing schema structure — only updates values, never removes sections
- Path regexes use `[\\/]` for cross-platform path separator matching
- Non-destructive: creates backup before overwriting if file exists
- Idempotent: safe to run multiple times
- **Schema enforcement:** validated by `.claude/hooks/lib/project-config-schema.cjs`

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## ⛔ Schema Protection Rules (CRITICAL)

The config structure is enforced by a schema validator. **DO NOT:**

- **DO NOT** rename, remove, or restructure any top-level section
- **DO NOT** change the type of any field (e.g., array→object, string→number)
- **DO NOT** rename keys within nested objects (e.g., `serviceMap`→`services`)
- **DO NOT** populate deprecated v1 sections (`backendServices`, `frontendApps`, `scss`, `componentFinder`, `sharedNamespace`) for NEW projects
- **DO NOT** remove v1 data from EXISTING projects — it remains valid until explicitly migrated

**You MAY:**

- Add entries to existing maps/arrays
- Update values within existing entries
- Add optional fields defined in the schema (e.g., `quickTips`, `examples`)
- Populate v2 sections (`modules[]`, `contextGroups[]`, `styling`, `componentSystem`) for any project

### Schema Structure (v2)

```
docs/project-config.json
├── schemaVersion              (number, optional — 1 or 2)
├── project                    (object, optional)
│   ├── name, description, languages[], packageManagers[], monorepoTool
├── modules[]                  (array, optional — universal module registry)
│   └── { name, kind, pathRegex, description, tags[], meta{} }
├── contextGroups[]            (array, optional — hook injection config)
│   └── { name, pathRegexes[], fileExtensions[], guideDoc, patternsDoc, stylingDoc, designSystemDoc, rules[] }
├── styling                    (object, optional — replaces scss)
│   ├── technology, guideDoc, appMap{}, patterns[]
├── designSystem               (object, required)
│   ├── docsPath, modernUiNote, appMappings[]
├── componentSystem            (object, optional — replaces componentFinder)
│   ├── type, selectorPrefixes[], filePattern, layerClassification{}
├── framework                  (object, required)
│   ├── name, backendPatternsDoc, frontendPatternsDoc, codeReviewDoc, integrationTestDoc, searchPatternKeywords[]
├── testing                    (object, optional)
│   ├── frameworks[], filePatterns{}, commands{}, coverageTool, guideDoc
├── databases                  (object, optional, freeform)
├── messaging                  (object, optional)
│   ├── broker, patterns[], consumerConvention
├── api                        (object, optional)
│   ├── style, docsFormat, docsPath, authPattern
├── infrastructure             (object, optional)
│   ├── containerization, orchestration, cicd{ tool, configPath }
├── custom                     (object, optional, freeform)
│
│  ── DEPRECATED v1 sections (still validated if present) ──
├── backendServices            (object, DEPRECATED — use modules[] kind=backend-service)
├── frontendApps               (object, DEPRECATED — use modules[] kind=frontend-app)
├── scss                       (object, DEPRECATED — use styling)
├── componentFinder            (object, DEPRECATED — use componentSystem)
└── sharedNamespace            (string, DEPRECATED)
```

> Run `node .claude/hooks/lib/project-config-schema.cjs --describe` for exact field names and types.

## Phase 0: Validate Current Config (MANDATORY)

Before any changes, validate the existing config:

```bash
node -e "
const { validateConfig, formatResult } = require('./.claude/hooks/lib/project-config-schema.cjs');
const config = JSON.parse(require('fs').readFileSync('docs/project-config.json', 'utf-8'));
console.log(formatResult(validateConfig(config)));
"
```

If validation fails, note the errors — the scan should fix them.

## Phase 0b: Ensure CLAUDE.md Exists

Check if `CLAUDE.md` exists at the project root. If missing, create a skeleton with essential sections so the AI has project instructions from the start.

```bash
test -f CLAUDE.md && echo "EXISTS" || echo "MISSING"
```

**If MISSING — create skeleton CLAUDE.md:**

The skeleton should contain:

- Project name and description (from `docs/project-config.json` if available)
- Key file locations section (empty, to be filled by the user or `/scan-*` skills)
- Development commands section (empty placeholders)
- Naming conventions section
- A note directing users to run `/claude-md-init` after scan skills complete for full generation

> **NOTE:** The `session-init-docs.cjs` hook also creates this skeleton automatically on session start. This phase is a safety net for cases where the hook didn't run or was skipped. The full CLAUDE.md generation via `/claude-md-init` runs as the last task in Phase 5, after all scan skills populate reference docs.

**If EXISTS — skip.** Do not overwrite an existing CLAUDE.md.

## Phase 0c: Read Exact Schema Shapes (MANDATORY for new projects)

Before generating ANY config values, read the exact schema field shapes:

```bash
node .claude/hooks/lib/project-config-schema.cjs --describe
```

This outputs every section with exact field names, types, and required/optional markers.
**Use these field names verbatim** — do NOT guess or abbreviate. Common AI mistakes to avoid:

- `designSystem.appMappings[].name` (NOT `app`)
- `designSystem.appMappings[].pathRegexes` (NOT `pathRegex` singular)
- `designSystem.appMappings[].docFile` (NOT `designDoc` or `doc`)
- `referenceDocs[].filename` (NOT `name` or `file`)
- `styling.patterns[].scssExamples` (NOT `examples`)

## Phase 1: Read Current Config

```
Read docs/project-config.json
```

Note the existing structure and any sections already populated with real values (not skeleton placeholders).

## Phase 2: Discover Project Structure

Run these scans in parallel where possible. **For new projects, populate v2 sections. For existing projects with v1 data, populate v2 alongside v1.**

### 2a. Modules (v2 — replaces backendServices + frontendApps)

Discover all project modules (services, apps, libraries):

```bash
# Backend services: find directories with .csproj files
find src/ -name "*.csproj" -maxdepth 4 | head -30

# Repository interfaces (for meta.repository)
grep -r "interface I.*RootRepository" src/ --include="*.cs" -l

# Frontend apps: find app directories
ls -d src/*/apps/*/ 2>/dev/null || ls -d src/*/ 2>/dev/null
ls -d src/*/libs/*/ 2>/dev/null || ls -d libs/*/ 2>/dev/null

# Detect framework (Angular, React, etc.)
find src/ -name "angular.json" -o -name "nx.json" | head -10
```

**Build `modules[]`:**
Each module entry: `{ name, kind, pathRegex, description, tags[], meta{} }`

- `kind`: `"backend-service"`, `"frontend-app"`, `"library"`, `"framework"`
- `tags`: `["modern"]`, `["legacy"]`, `["microservice", "mongodb"]`, etc.
- `meta`: service-specific data — `{ repository, port, generation }`

### 2b. Context Groups (v2 — hook injection config)

Build context groups from detected language/framework patterns:

```bash
# Detect backend service paths
find src/ -path "*/Services/*" -name "*.cs" | head -5

# Detect frontend paths
find src/ -path "*/{frontend}/*" -name "*.ts" | head -5
find src/ -path "*/Web/*" -name "*.ts" | head -5
```

**Build `contextGroups[]`:**
Each group: `{ name, pathRegexes[], fileExtensions[], guideDoc, patternsDoc, stylingDoc, designSystemDoc, rules[] }`

- `rules[]`: Critical coding rules for this context (consumed by hooks — NO hardcoded fallbacks)
- `stylingDoc`: Path to SCSS/CSS styling guide doc (optional, used by frontend-context hook)
- `designSystemDoc`: Path to design system overview doc (optional, used by frontend-context hook)

### 2c. Design System

```bash
ls docs/project-reference/design-system/ 2>/dev/null
find docs/ -name "*DesignSystem*" -o -name "*design-system*" 2>/dev/null | head -10
```

**Build `designSystem`** (unchanged from v1)

### 2d. Styling (v2 — replaces scss)

```bash
grep -r "@use " src/ --include="*.scss" -l | head -5
grep -r "@import " src/ --include="*.scss" -l | head -5
```

**Build `styling`:**

- `styling.technology` — `"scss"`, `"css"`, `"tailwind"`, etc.
- `styling.appMap{}` — app → SCSS path regex
- `styling.patterns[]` — each item has `name`, `pathRegexes[]`, `description`, `scssExamples[]`

### 2e. Component System (v2 — replaces componentFinder)

```bash
grep -r "selector:" src/ --include="*.ts" | grep -oP "selector:\s*'([a-z]+-)" | sort -u | head -10
```

**Build `componentSystem`:**

- `componentSystem.selectorPrefixes[]`
- `componentSystem.layerClassification{}`

### 2f. Infrastructure & Testing

```bash
# Detect test frameworks
find src/ -name "*.Test.cs" -o -name "*.spec.ts" | head -5

# Detect databases from connection strings
grep -r "ConnectionString\|MongoClient\|SqlConnection" src/ --include="*.json" -l | head -5

# Detect message broker
grep -r "RabbitMQ\|MassTransit\|Azure.Messaging" src/ --include="*.cs" -l | head -5
```

**Build:** `testing`, `databases`, `messaging`, `api`, `infrastructure`

### 2g. Framework & Shared

```bash
find src/ -name "*.csproj" -exec grep -l "PackageReference" {} \; | head -5
```

**Build:** `framework.name`, `framework.searchPatternKeywords[]`

### 2h. E2E Testing Infrastructure

Discover E2E testing setup — framework, paths, configurations:

```bash
# Detect E2E framework from package.json or .csproj
grep -l "playwright\|cypress\|selenium\|webdriver\|puppeteer" package.json */package.json 2>/dev/null
grep -r "Selenium.WebDriver\|Microsoft.Playwright" **/*.csproj 2>/dev/null | head -5

# Find E2E config files
ls playwright.config.* cypress.config.* wdio.conf.* protractor.conf.* 2>/dev/null
find . -path "*/e2e/*" -name "*.config.*" 2>/dev/null | head -5[:search]

# Find E2E test directories
ls -d testing/e2e/ tests/e2e/ e2e/ cypress/ playwright/ 2>/dev/null
find . -name "*.spec.ts" -path "*e2e*" 2>/dev/null | head -10
find . -name "*Tests.cs" -path "*E2E*" 2>/dev/null | head -10

# Find page objects
find . -name "*-page.ts" -o -name "*Page.cs" 2>/dev/null | head -10

# Find fixtures
find . -name "*fixture*" -path "*e2e*" 2>/dev/null | head -10
```

**Build `e2eTesting`:**

```json
{
    "e2eTesting": {
        "framework": "playwright|cypress|selenium|webdriver",
        "language": "typescript|csharp",
        "configFile": "testing/e2e/tests/playwright.config.ts",
        "testsPath": "testing/e2e/tests/specs/",
        "pageObjectsPath": "testing/e2e/tests/page-objects/",
        "fixturesPath": "testing/e2e/tests/fixtures/",
        "guideDoc": "docs/project-reference/e2e-test-reference.md",
        "testSpecsDocs": ["docs/test-specs/", "docs/business-features/**/detailed-features/*.md"],
        "searchPatterns": ["test\\(['\"]TC-", "\\.spec\\.ts$", "\\[Trait"],
        "runCommands": {
            "all": "npm run e2e",
            "headed": "npm run e2e:headed",
            "ui": "npm run e2e:ui"
        },
        "tcCodeFormat": "TC-{MODULE}-E2E-{NNN}",
        "bestPractices": [],
        "entryPoints": []
    }
}
```

**Populate from discovered values:**

- `framework`: Detect from config files or package.json
- `testsPath`, `pageObjectsPath`, `fixturesPath`: Detect from directory structure
- `configFile`: Path to framework config
- `tcCodeFormat`: Detect pattern from existing tests (grep for TC- codes)
- `entryPoints`: List framework config + key fixture files

### 2i. Graph Connectors (auto-detect frontend→backend API mapping)

If the project has BOTH frontend AND backend modules (detected in Phase 2a), auto-populate `graphConnectors` to enable API endpoint detection:

**Detection logic (AI decision):**

1. **Frontend framework detection:**
    - `@angular/core` in any package.json → `"angular"`
    - `react` in any package.json → `"react"`
    - `vue` in any package.json → `"vue"`
    - None detected → `"generic"`

2. **Backend framework detection:**
    - `.csproj` with `Microsoft.AspNetCore` → `"dotnet"`
    - `@springboot` or `spring-boot-starter-web` in pom.xml/build.gradle → `"spring"`
    - `express` in any package.json → `"express"`
    - `fastapi` in any requirements.txt/pyproject.toml → `"fastapi"`
    - None detected → `"generic"`

3. **Path detection:**
    - Frontend paths: use module paths from `modules[]` where `kind=frontend-app`
    - Backend paths: use module paths from `modules[]` where `kind=backend-service`, filter to controller/route directories

4. **Route prefix:** Common prefixes: `"api"` for .NET/Spring, `""` for Express/FastAPI. AI determines based on codebase evidence.

**Build `graphConnectors`:**

```json
{
    "graphConnectors": {
        "apiEndpoints": {
            "enabled": true,
            "frontend": {
                "framework": "<detected>",
                "paths": ["<from modules[]>"],
                "customPatterns": []
            },
            "backend": {
                "framework": "<detected>",
                "paths": ["<from modules[]>"],
                "routePrefix": "<detected>",
                "customPatterns": []
            }
        }
    }
}
```

**Rules:**

- Only populate if both frontend AND backend are detected (skip for backend-only or frontend-only projects)
- Set `enabled: true` by default when both sides detected
- Use AI judgment for ambiguous cases — if unsure, set `"generic"` framework
- Supported frameworks: `angular`, `react`, `vue`, `dotnet`, `spring`, `express`, `fastapi`, `generic`

### 2j. Implicit Connections (auto-detect loosely coupled patterns)

If the project has backend services with event-driven or message bus patterns, auto-populate `graphConnectors.implicitConnections[]`.

**Detection heuristics (AI decision):**

1. If `.cs` files with `EntityEventApplicationHandler<` found in `UseCaseEvents/` dirs → suggest `entity-definition-to-event-handlers` + `repo-crud-to-event-handlers` rules
2. If `.cs` files with `EntityEventBusMessageProducer<` found in `Producers/` dirs → suggest `entity-event-producers` rule
3. If `.cs` files with `EntityEventBusMessageConsumer<` or `PlatformApplicationMessageBusConsumer<` found in `Consumers/` dirs → suggest `bus-message-producers-to-consumers` + `free-format-message-consumers` rules
4. If `.cs` files with `CommandEventApplicationHandler<` found → suggest `command-event-handlers` rule
5. If files contain `new \w+BusMessage` or `SendAsync.*BusMessage` outside of `Producers/` dirs → suggest `free-format-bus-message-send-to-consumers` rule (captures free-format messages sent directly via bus producer service, not via typed producer classes)
6. If files contain `FreeFormatMessages/` directories with bus message class definitions → suggest `free-format-bus-message-class-to-consumers` rule
7. For non-.NET projects: AI uses judgment to detect event/message patterns and propose custom rules (e.g., Redux actions, signal handlers, pub/sub patterns)

**Rules:**

- Only populate `implicitConnections[]` when patterns are detected; omit if none found
- Each rule must have `paths` scoped to relevant directories (not repo root)
- Set `matchBy: "key-equals"` by default; use `"key-contains"` only for fuzzy message name matching
- **MANDATORY:** Present detected rules to user via `AskUserQuestion` before writing — let user confirm or adjust patterns
- After writing rules, run `python .claude/scripts/code_graph connect-implicit --json` to verify edges are created
- Report: "Created N implicit connection rules, detected M edges"

### Merge Strategy

- **If `modules[]` is empty but v1 sections exist** — leave v1 data, skip `modules[]` generation (let hooks use v1 fallback)
- **If scanning fresh** — populate `modules[]` and `contextGroups[]`, skip deprecated v1 sections
- **Only overwrite a field if scan found concrete values** — keep existing values for empty scan results

## Phase 3: Write Updated Config

1. Read the current file again (in case of concurrent changes)
2. Merge discovered values into the existing structure
3. Write `docs/project-config.json` with `JSON.stringify(config, null, 2)`
4. Preserve any existing values that scanning couldn't improve (e.g., manually curated quickTips)

**Merge strategy:** Only overwrite a field if the scan found concrete values. Keep existing values for fields where scan returned empty.

## Phase 4: Verify (MANDATORY)

1. **Schema validation** — Run the validator to ensure structure is intact:
    ```bash
    node -e "
    const { validateConfig, formatResult } = require('./.claude/hooks/lib/project-config-schema.cjs');
    const config = JSON.parse(require('fs').readFileSync('docs/project-config.json', 'utf-8'));
    const result = validateConfig(config);
    console.log(formatResult(result));
    process.exit(result.valid ? 0 : 1);
    "
    ```
2. **If validation fails** — fix the errors before proceeding. Never commit an invalid config.
3. Spot-check 2-3 service paths to confirm they match actual directories
4. Run hook tests: `node .claude/hooks/tests/test-all-hooks.cjs`

## Phase 5: Plan Reference Doc Population (MANDATORY)

After project-config is verified, AI **MANDATORY IMPORTANT MUST** create `TaskCreate` items to populate all reference docs via `/scan-*` skills. Each scan skill reads `docs/project-config.json` for project-specific paths — so this phase depends on Phases 1-4 completing first.

**Canonical mapping** (from `SCAN_SKILL_MAP` in `.claude/hooks/session-init-docs.cjs`):

| Reference Doc                                                                 | Scan Skill Command        |
| ----------------------------------------------------------------------------- | ------------------------- |
| `project-structure-reference.md`                                              | `/scan-project-structure` |
| `backend-patterns-reference.md`                                               | `/scan-backend-patterns`  |
| `design-system/` + `scss-styling-guide.md` + `frontend-patterns-reference.md` | `/scan-ui-system`         |
| `integration-test-reference.md`                                               | `/scan-integration-tests` |
| `feature-docs-reference.md`                                                   | `/scan-feature-docs`      |
| `code-review-rules.md`                                                        | `/scan-code-review-rules` |
| `e2e-test-reference.md`                                                       | `/scan-e2e-tests`         |
| `domain-entities-reference.md`                                                | `/scan-domain-entities`   |

**Instructions:**

1. Create **one `TaskCreate`** per scan skill above (8 tasks total)
2. Each task subject: `"Run /scan-{name} to populate docs/{filename}"`
3. Each task description: `"Invoke /scan-{name} skill to scan codebase and populate docs/{filename} with real project patterns."`
4. Tasks should be `pending` — execute sequentially after project-config phase completes
5. `/scan-project-structure` should run **first** (other scans may reference its output)
6. **LAST TASK:** After ALL scan skills complete, create a final task: `"Run /claude-md-init to generate CLAUDE.md from config + scan results"`. This must run last because it reads populated reference docs to build the documentation index and lookup guide.

## E2E Investigation Guidance

**When investigating or fixing E2E test failures, AI MUST:**

1. **Update `e2eTesting` section** in `docs/project-config.json` with any discovered patterns:
    - New run commands found
    - Missing entry points identified
    - Best practices learned from debugging

2. **Update `docs/project-reference/e2e-test-reference.md`** with learnings:
    - Common failure patterns and fixes
    - Setup gotchas (auth, fixtures, seed data)
    - Environment-specific configurations
    - Selector strategy tips for the project

3. **Check TC code traceability** — ensure all E2E tests have proper:
    - TC code in test name: `TC-{MODULE}-E2E-{NNN}`
    - Tags/traits linking to test specs
    - Comments linking to feature docs

**Example update workflow:**

```bash
# After fixing an E2E auth issue
# 1. Update project-config.json e2eTesting.bestPractices
# 2. Update docs/project-reference/e2e-test-reference.md "Common Issues" section
# 3. Add TC code to any tests that were missing them
```

## Output

Report what changed:

- Sections updated vs unchanged
- New services/apps discovered
- Any path mismatches or warnings
- Reference doc scan tasks created (list all 10)

---

## Post-Completion Tasks (MANDATORY)

After project-config scan completes, **MUST create these follow-up tasks:**

1. **TaskCreate: "Run /graph-build to build code knowledge graph"** — The knowledge graph uses project-config.json for API connector patterns and implicit connection rules. Building the graph after config ensures frontend↔backend API edges and MESSAGE_BUS edges are created correctly.

2. **TaskCreate: "Run /docs-init or /scan-all to populate reference docs"** — Reference docs (backend-patterns, frontend-patterns, etc.) depend on accurate project-config.json. Run scans after config is populated.

3. **TaskCreate: "Verify graph edges: run `python .claude/scripts/code_graph status --json`"** — Confirm graph built successfully with API_ENDPOINT and MESSAGE_BUS edges.

> **Why graph-build after project-config?** The graph auto-connect feature reads `graphConnectors` from project-config.json to match frontend HTTP calls with backend routes. Without populated config, auto-detection is used as fallback — but explicit config produces more accurate matches (custom patterns, scoped paths).

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
