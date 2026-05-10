---
name: project-config
version: 2.2.0
description: '[Utilities] Use when you need to scan workspace and update docs/project-config JSON to match current project structure.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Scan workspace, update `docs/project-config.json` with accurate values.

**IMPORTANT MUST ATTENTION** follow Plan → Review → Execute workflow. **IMPORTANT MUST ATTENTION** use exact schema field names (`--describe`). **IMPORTANT MUST ATTENTION** validate after each phase. **NEVER** use `classPattern`/`keyExtractor` — correct fields: `contentPattern`/`keyGroup`.

**Workflow:** Recon → classify scale → `/plan` → `/plan-review` → Execute phases (scan → merge → validate → fix) → Follow-up scans → `/prompt-enhance`

**Key Rules:**

- MUST ATTENTION run `node .claude/hooks/lib/project-config-schema.cjs --describe` — use field names verbatim
- MUST ATTENTION one TaskCreate per config section — NEVER scan everything in one pass
- MUST ATTENTION validate schema after each merge — `validateConfig(config)` returns PASSED or errors
- MUST ATTENTION review-and-fix after each phase — read back, spot-check paths, self-review
- Path regexes MUST ATTENTION use `[\\/]` for cross-platform separator matching
- Schema enforced by `.claude/hooks/lib/project-config-schema.cjs`

---

## ⛔ Plan → Review → Execute Workflow

### Step 1: Detect — Classify Project Scale

**MUST ATTENTION classify scale FIRST** — drives task granularity for all subsequent phases.

```bash
find src/ -name "*.csproj" 2>/dev/null | wc -l
find src/ -name "package.json" -not -path "*/node_modules/*" 2>/dev/null | wc -l
find src/ -name "*.cs" 2>/dev/null | wc -l
ls -d src/*/ 2>/dev/null
```

| Scale         | Signal              | Task Approach                          |
| ------------- | ------------------- | -------------------------------------- |
| Small (<5)    | Few modules         | Combine 2a+2b, 2k+2l+2m — ~8 tasks     |
| Medium (5–20) | Moderate count      | One task per section — ~15 tasks       |
| Large (20+)   | Many service groups | Split 2a per service group — 20+ tasks |

Small projects: ask user to combine into single pass.

### Step 2: Create Plan (`/plan`)

Create `plans/{date}-project-config-scan.md`:

1. Record scale classification from Step 1
2. Group config sections into phases (≤5 tasks each)
3. Include review-and-fix cycle after each phase

**Phase template:**

```
Phase A: Setup & Metadata — validate config, read schema, scan project metadata
Phase B: Module Discovery — backend projects, frontend apps/libs, framework keywords
Phase C: Context & UI — context groups, design system, styling, component system
Phase D: Testing & Infra — testing, E2E, databases, messaging, API, infrastructure
Phase E: Graph Connectors — API endpoints, implicit connections, referenceDocs
Phase F: Final Review — consolidate, validate, hook tests, create /scan-* tasks
Phase G: Self-Review — re-invoke /project-config to verify all config matches source code
```

### Step 3: Review Plan (`/plan-review`)

### Step 4: Execute

Per phase: TaskCreate → scan → merge → validate → spot-check → fix → next phase.

### Review-and-Fix Cycle (MANDATORY per phase)

1. Read back updated config sections
2. Spot-check 2–3 paths against actual dirs
3. Run schema validation
4. Self-review: missing modules? Accurate descriptions? Correct regexes?
5. Fix before proceeding

---

## Intermediate Workspace

Medium/large projects: `mkdir -p.ai/workspace/project-config` — write phase reports before merging. Delete after consolidation.

---

## ⛔ Schema Protection Rules

**NEVER** rename/remove/restructure top-level sections. **NEVER** change field types. **NEVER** populate deprecated v1 sections for new projects. **NEVER** remove v1 data from existing projects.

**MAY** add entries to maps/arrays, update values, add optional schema fields, populate v2 sections.

### Schema Structure (v2)

```
docs/project-config.json
├── schemaVersion, project{ name, description, languages[], packageManagers[], monorepoTool }
├── modules[] — { name, kind, pathRegex, description, tags[], meta{} }
├── contextGroups[] — { name, pathRegexes[], fileExtensions[], guideDoc, patternsDoc, stylingDoc, designSystemDoc, rules[] }
├── styling — { technology, guideDoc, appMap{}, patterns[] }
├── designSystem — { docsPath, modernUiNote, appMappings[] }
├── componentSystem — { type, selectorPrefixes[], filePattern, layerClassification{} }
├── framework — { name, backendPatternsDoc, frontendPatternsDoc, codeReviewDoc, integrationTestDoc, searchPatternKeywords[] }
├── testing — { frameworks[], filePatterns{}, commands{}, coverageTool, guideDoc, integrationRules[] }
├── e2eTesting — { framework, language, configFile, testsPath, pageObjectsPath, fixturesPath, ... }
├── databases{}, messaging{ broker, patterns[], consumerConvention }, api{ style, docsFormat, docsPath, authPattern }
├── infrastructure — { containerization, orchestration, cicd{ tool, configPath } }
├── graphConnectors — apiEndpoints{ enabled, frontend{ framework, paths[] }, backend{ framework, paths[], routePrefix } }
│   └── implicitConnections[] — { name, edgeKind, paths[], source{ filePattern, contentPattern, keyGroup }, target{...}, matchBy }
├── referenceDocs[] — { filename, purpose, sections[] }
├── integrationTestVerify — { guidance, referenceDocs[], quickRunCommand, testProjectPattern, testProjects[], systemCheckCommand, runScript, startupScript }
├── workflowPatterns — { architectureStyle, codeHierarchy, cssMethodology, stateManagement, crossModuleValidation, featureDocPath, featureDocTemplate, reviewRulesDoc }
└── DEPRECATED: backendServices, frontendApps, scss, componentFinder, sharedNamespace
```

> MUST ATTENTION run `node .claude/hooks/lib/project-config-schema.cjs --describe` for exact field names.

### ⛔ Common AI Field Name Mistakes

| Wrong                                 | Correct                          |
| ------------------------------------- | -------------------------------- |
| `classPattern`, `pattern`, `regex`    | `contentPattern`                 |
| `keyExtractor`, `captureGroup`        | `keyGroup` (number, not regex)   |
| `pathRegex` singular (in appMappings) | `pathRegexes` (array)            |
| `designDoc`, `doc`                    | `docFile`                        |
| `name`, `file` (in referenceDocs)     | `filename`                       |
| `examples`                            | `scssExamples`                   |
| `"exact"`, `"contains"`               | `"key-equals"`, `"key-contains"` |
| `glob`, `fileGlob`                    | `filePattern`                    |

---

## Phase 0: Setup

```bash
# 0a. Validate current config
node -e "const{validateConfig,formatResult}=require('./.claude/hooks/lib/project-config-schema.cjs');const c=JSON.parse(require('fs').readFileSync('docs/project-config.json','utf-8'));console.log(formatResult(validateConfig(c)))"

# 0b. Read exact schema shapes (MANDATORY)
node .claude/hooks/lib/project-config-schema.cjs --describe

# 0c. Check CLAUDE.md
test -f CLAUDE.md && echo "EXISTS" || echo "MISSING"

# 0d. Create workspace
mkdir -p .ai/workspace/project-config
```

## Phase 1: Read Current Config

Read `docs/project-config.json`. Note populated vs skeleton sections.

---

## Phase 2: Section-by-Section Scans

**Each subsection = one TaskCreate.** Per task: investigate → report → merge → validate.

### 2a. Modules — Backend

```bash
find src/ -name "*.csproj" -maxdepth 5 | head -50          # .NET
find . -name "pom.xml" -o -name "build.gradle" | head -50  # Java
find src/ -name "package.json" -not -path "*/node_modules/*" -maxdepth 4 | head -50  # Node
find . -name "go.mod" | head -50                            # Go
```

Build `modules[]` entries: `{ name, kind, pathRegex, description, tags[], meta{} }`

- `kind`: `"backend-service"`, `"library"`, `"framework"`

### 2b. Modules — Frontend

```bash
find . -name "nx.json" -o -name "angular.json" -o -name "lerna.json" -o -name "turbo.json" 2>/dev/null | head -5
ls -d src/*/apps/*/ */apps/*/ apps/*/ 2>/dev/null | head -20
ls -d src/*/libs/*/ */libs/*/ libs/*/ packages/*/ 2>/dev/null | head -30
```

Build entries: `kind: "frontend-app"` or `kind: "library"`.

### 2c. Project Metadata

Detect languages (`.cs`→csharp, `.ts`→typescript, `.py`→python, `.java`→java, `.go`→go), package managers, monorepo tool.
Build `project { name, description, languages[], packageManagers[], monorepoTool }`.

### 2d. Framework Patterns

Grep `abstract class`, `interface I`, most-imported symbols.
Build `framework { name, searchPatternKeywords[] }` from commonly used base classes.

### 2e. Context Groups

Build `contextGroups[]` with `pathRegexes[]`, `fileExtensions[]`, `patternsDoc`, `rules[]`.
Rules MUST ATTENTION be specific: "Use IPlatformRootRepository<TEntity>" not "follow best practices".

### 2f–2h. Design System, Styling, Component System

- `designSystem { docsPath, modernUiNote, appMappings[] }`
- `styling { technology, fileExtensions, guideDoc, appMap{}, patterns[] }`
- `componentSystem { type, selectorPrefixes[], filePattern, layerClassification{} }`

### 2i–2j. Testing & E2E

- `testing { frameworks[], filePatterns{}, commands{}, coverageTool, guideDoc, integrationRules[] }`
- `e2eTesting { framework, language, configFile, testsPath, pageObjectsPath, fixturesPath, runCommands{}, tcCodeFormat, entryPoints[] }`
- `integrationTestVerify { guidance, referenceDocs[], runScript, startupScript, quickRunCommand, systemCheckCommand, testProjectPattern, testProjects[] }`
- `integrationTestVerify.referenceDocs[]` MUST contain project-specific docs that explain setup prerequisites before a verifier runs `systemCheckCommand` or test commands.

### 2k–2n. Databases, Messaging, API, Infrastructure

- `databases {}` (freeform)
- `messaging { broker, patterns[], consumerConvention }`
- `api { style, docsFormat, docsPath, authPattern }`
- `infrastructure { containerization, orchestration, cicd{ tool, configPath } }`

### 2o. Graph Connectors — API Endpoints

Only if project has BOTH frontend AND backend.

| Frontend  | Signal          | Backend   | Signal                             |
| --------- | --------------- | --------- | ---------------------------------- |
| `angular` | `@angular/core` | `dotnet`  | `.csproj` + `Microsoft.AspNetCore` |
| `react`   | `react`         | `spring`  | `spring-boot-starter-web`          |
| `vue`     | `vue`           | `express` | `express` in package.json          |
| `generic` | None            | `fastapi` | `fastapi` in requirements.txt      |

Route prefix: `"api"` for.NET/Spring, `""` for Express/FastAPI.

### 2p. Graph Connectors — Implicit Connections

#### ⛔ How implicitConnections Works (MUST ATTENTION UNDERSTAND)

Algorithm: scan source files → extract keys via `contentPattern` regex capture group `keyGroup` → scan target files → match keys via `matchBy` → create `edgeKind` edges.

#### Exact Schema Fields

| Field             | Type     | Required | Description                                                        |
| ----------------- | -------- | -------- | ------------------------------------------------------------------ |
| `name`            | string   | Yes      | Unique rule identifier                                             |
| `edgeKind`        | string   | Yes      | `"MESSAGE_BUS"`, `"TRIGGERS_EVENT"`, `"PRODUCES_EVENT"`, or custom |
| `paths`           | string[] | No       | Directories to scan                                                |
| `source`/`target` | object   | Yes      | `{ filePattern, contentPattern, keyGroup }`                        |
| `matchBy`         | string   | Yes      | `"key-equals"` (exact) or `"key-contains"` (substring)             |

**source/target fields:** `filePattern` (glob, e.g. `"*.cs"`), `contentPattern` (regex WITH capture group), `keyGroup` (1-based integer, default 1)

**⛔ NEVER use** `classPattern`, `keyExtractor`, `pattern`. **ALWAYS use** `contentPattern`, `keyGroup`.

#### Detection Heuristics

- **.NET:** `EntityEventApplicationHandler<` → entity-to-handler; `EntityEventBusMessageProducer<` → producer; `PlatformApplicationMessageBusConsumer<` → consumer
- **TypeScript:** Redux dispatch→reducer, NgRx createAction→ofType, EventEmitter emit→on
- **Python:** Celery task.delay→@app.task, Django signal.send→@receiver
- **Java:** publishEvent→@EventListener, KafkaTemplate→@KafkaListener

#### Example (correct format)

```json
{
    "name": "entity-to-event-handlers",
    "edgeKind": "MESSAGE_BUS",
    "paths": ["src/Backend/MyApp.Domain/", "src/Backend/MyApp.Application/UseCaseEvents/"],
    "source": { "filePattern": "*.cs", "contentPattern": "class\\s+(\\w+)\\s*:.*PlatformEntity<", "keyGroup": 1 },
    "target": { "filePattern": "*.cs", "contentPattern": "EntityEventApplicationHandler<(\\w+)", "keyGroup": 1 },
    "matchBy": "key-contains"
}
```

**IMPORTANT MUST ATTENTION** present detected rules to user before writing. **IMPORTANT MUST ATTENTION** scope `paths` to relevant dirs (not repo root).

### 2q. Reference Docs

Build `referenceDocs[]` from `docs/project-reference/`: `{ filename, purpose, sections[] }`

---

## Phase 3: Consolidate & Write

Merge section-by-section. Overwrite only with concrete scan findings. Large projects: merge incrementally.

## Phase 4: Verify (MANDATORY)

1. Schema validation — MUST ATTENTION pass with zero errors
2. Spot-check 2–3 service paths — verify each path exists (`file:line` evidence)
3. Run hook tests: `node .claude/hooks/tests/test-all-hooks.cjs`

## Phase 5: Follow-Up Tasks

| Reference Doc                                                                 | Scan Skill                        |
| ----------------------------------------------------------------------------- | --------------------------------- |
| `project-structure-reference.md`                                              | `/scan-project-structure` (FIRST) |
| `backend-patterns-reference.md`                                               | `/scan-backend-patterns`          |
| `seed-test-data-reference.md`                                                 | `/scan-seed-test-data`            |
| `design-system/` + `scss-styling-guide.md` + `frontend-patterns-reference.md` | `/scan-ui-system`                 |
| `integration-test-reference.md`                                               | `/scan-integration-tests`         |
| `feature-docs-reference.md`                                                   | `/scan-feature-docs`              |
| `code-review-rules.md`                                                        | `/scan-code-review-rules`         |
| `e2e-test-reference.md`                                                       | `/scan-e2e-tests`                 |
| `domain-entities-reference.md`                                                | `/scan-domain-entities`           |

Then: `/claude-md-init` (LAST). Optionally: `/graph-build`.

## Phase 6: Enhance Generated Docs (MANDATORY)

Run `/prompt-enhance` on all generated/updated docs and `CLAUDE.md`. One task per file, parallel OK.

## Phase 7: Self-Review Verification (MANDATORY)

Re-invoke skill: `/project-config Self review and verify everything again, ensure all is correct with current source code`. Catches regressions and issues missed in first pass.

## Output

Report: sections updated vs unchanged, new modules discovered, path mismatches, follow-up tasks created.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** classify project scale FIRST (Step 1) — drives all task granularity decisions.
**IMPORTANT MUST ATTENTION** plan first — recon → `/plan` → `/plan-review` → execute. NEVER jump to scanning.
**IMPORTANT MUST ATTENTION** break into phases with review cycles — scan → merge → validate → spot-check → fix per phase.
**IMPORTANT MUST ATTENTION** use exact schema field names — run `--describe`, copy verbatim. NEVER guess.
**IMPORTANT MUST ATTENTION** validate after EACH phase — schema errors compound across phases.
**NEVER** use `classPattern`/`keyExtractor` — correct fields: `contentPattern` (regex) + `keyGroup` (number).
**IMPORTANT MUST ATTENTION** one TaskCreate per config section — NEVER monolithic scan.
**IMPORTANT MUST ATTENTION** Phase 7 self-review is MANDATORY — catches what every earlier phase missed.

**Anti-Rationalization:**

| Evasion                             | Rebuttal                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| "File looks simple, skip planning"  | Planning catches scale mistakes and regressions. Apply anyway.                 |
| "Already know the schema"           | Run `--describe` anyway — field names differ from memory. No proof = no check. |
| "Phase N looks fine, skip validate" | Schema errors compound across phases. Validate every phase, no exceptions.     |
| "Self-review is redundant"          | Phase 7 catches what every earlier phase missed. Never skip.                   |
| "Small project, skip task tracking" | Task tracking prevents drift on all project sizes. Always `TaskCreate` first.  |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
