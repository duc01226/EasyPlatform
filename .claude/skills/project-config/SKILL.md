---
name: project-config
version: 1.0.0
description: '[Utilities] Scan workspace and update docs/project-config.json to match current project structure'
activation: user-invoked
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

## ⛔ Schema Protection Rules (CRITICAL)

The config structure is enforced by a schema validator. **DO NOT:**

- **DO NOT** rename, remove, or restructure any top-level section
- **DO NOT** change the type of any field (e.g., array→object, string→number)
- **DO NOT** rename keys within nested objects (e.g., `serviceMap`→`services`)
- **DO NOT** remove required fields even if they seem empty

**You MAY:**

- Add entries to existing maps/arrays (e.g., new services in `serviceMap`)
- Update values within existing entries
- Add optional fields defined in the schema (e.g., `quickTips`, `scssExamples`)

### Required Schema Structure

```
docs/project-config.json
├── _description              (string, optional)
├── backendServices           (object, required)
│   ├── patterns[]            — { name, pathRegex, description }
│   ├── serviceMap{}          — name → regex string
│   ├── serviceRepositories{} — name → interface name
│   └── serviceDomains{}      — name → domain description
├── frontendApps              (object, required)
│   ├── patterns[]            — { name, pathRegex, description }
│   ├── appMap{}              — name → regex string
│   ├── legacyApps[]          — string[]
│   ├── modernApps[]          — string[]
│   ├── frontendRegex         — combined regex string
│   └── sharedLibRegex        — shared lib regex string
├── designSystem              (object, required)
│   ├── docsPath              — string
│   ├── modernUiNote          — string (optional)
│   └── appMappings[]         — { name, pathRegexes[], docFile, description, quickTips[] }
├── scss                      (object, required)
│   ├── appMap{}              — name → regex string
│   └── patterns[]            — { name, pathRegexes[], description, scssExamples[] }
├── componentFinder           (object, required)
│   ├── selectorPrefixes[]    — string[]
│   └── layerClassification{} — layer → string[]
├── sharedNamespace           (string, required)
└── framework                 (object, required)
    ├── name                  — string
    ├── backendPatternsDoc    — string (optional)
    ├── frontendPatternsDoc   — string (optional)
    ├── codeReviewDoc         — string (optional)
    ├── integrationTestDoc    — string (optional)
    └── searchPatternKeywords[] — string[] (optional)
```

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

## Phase 1: Read Current Config

```
Read docs/project-config.json
```

Note the existing structure and any sections already populated with real values (not skeleton placeholders).

## Phase 2: Discover Project Structure

Run these scans in parallel where possible:

### 2a. Backend Services

Discover backend service directories dynamically:

```bash
# Find service-like directories (look for directories containing .csproj or .sln files)
find src/ -name "*.csproj" -maxdepth 4 | head -30

# Find repository interfaces
grep -r "interface I.*RootRepository" src/ --include="*.cs" -l

# Find service domain descriptions from namespace/project files
grep -r "namespace.*\.Domain" src/ --include="*.cs" -l | head -20
```

**Build:**
- `backendServices.patterns[]` — top-level backend path patterns
- `backendServices.serviceMap{}` — service name → path regex
- `backendServices.serviceRepositories{}` — service → `I{Name}RootRepository<T>`
- `backendServices.serviceDomains{}` — service → domain description

### 2b. Frontend Apps

Discover frontend app directories dynamically:

```bash
# Find directories containing package.json (frontend apps)
find src/ -name "package.json" -maxdepth 3 | head -20

# Find Angular/React/Vue apps by config files
find src/ -name "angular.json" -o -name "nx.json" -o -name "next.config.*" | head -10

# Find app directories and shared libraries
ls -d src/*/apps/*/ 2>/dev/null || ls -d src/*/ 2>/dev/null
ls -d src/*/libs/*/ 2>/dev/null || ls -d libs/*/ 2>/dev/null
```

**Build:**
- `frontendApps.patterns[]` — frontend path patterns
- `frontendApps.appMap{}` — app name → path regex
- `frontendApps.modernApps[]` — modern framework app names
- `frontendApps.legacyApps[]` — legacy app names
- `frontendApps.frontendRegex` — combined regex matching any frontend file
- `frontendApps.sharedLibRegex` — regex matching shared libraries

### 2c. Design System

```bash
# Check for design system docs
ls docs/design-system/ 2>/dev/null

# Find app-specific design system files
find docs/ -name "*DesignSystem*" -o -name "*design-system*" 2>/dev/null | head -10
```

**Build:**
- `designSystem.docsPath` — path to design system docs
- `designSystem.appMappings[]` — app → design doc file + path regexes + quickTips

### 2d. SCSS Patterns

```bash
# Find SCSS import patterns used in the project
grep -r "@use " src/ --include="*.scss" -l | head -5
grep -r "@import " src/ --include="*.scss" -l | head -5
```

**Build:**
- `scss.appMap{}` — app → SCSS path regex
- `scss.patterns[]` — SCSS context patterns with examples

### 2e. Component Finder

```bash
# Find component selector prefixes (Angular, React, or Vue)
grep -r "selector:" src/ --include="*.ts" | grep -oP "selector:\s*'([a-z]+-)" | sort -u | head -10
```

**Build:**
- `componentFinder.selectorPrefixes[]` — component selector prefixes
- `componentFinder.layerClassification{}` — layer → directory paths

### 2f. Framework & Shared

```bash
# Detect framework from project files
find src/ -name "*.csproj" -exec grep -l "PackageReference" {} \; | head -5
find src/ -name "package.json" -maxdepth 3 | head -5

# Find shared namespace
grep -r "namespace.*Shared" src/ --include="*.cs" | head -5
```

**Build:**
- `framework.name` — framework name
- `framework.searchPatternKeywords[]` — framework-specific keywords
- `sharedNamespace` — shared code namespace

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

## Output

Report what changed:
- Sections updated vs unchanged
- New services/apps discovered
- Any path mismatches or warnings

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
