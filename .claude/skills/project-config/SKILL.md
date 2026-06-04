---
name: project-config
description: '[Utilities] Use when you need to scan workspace and update docs/project-config JSON to match current project structure.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Scan workspace, update `docs/project-config.json` with accurate values.

**IMPORTANT MUST ATTENTION** follow Plan → Review → Execute workflow. **IMPORTANT MUST ATTENTION** use exact schema field names (`--describe`). **IMPORTANT MUST ATTENTION** validate after each phase. **NEVER** use `classPattern`/`keyExtractor` — correct fields: `contentPattern`/`keyGroup`.

**Workflow:** Recon → classify scale → `/plan` → `/plan-review` → Execute phases (scan → merge → validate → fix) → Follow-up scans → `/prompt-enhance`

**Key Rules:**

- MUST ATTENTION run `node .claude/hooks/lib/project-config-schema.cjs --describe` — use field names verbatim
- MUST ATTENTION execute every required config section for every project size; small projects do not skip, defer, or require user approval to combine work
- MUST ATTENTION one TaskCreate per config section or explicit section group — NEVER scan everything in one pass
- MUST ATTENTION validate schema after each merge — `validateConfig(config)` returns PASSED or errors
- MUST ATTENTION review-and-fix after each phase — read back, spot-check paths, self-review
- MUST ATTENTION do not ask the user to choose scan granularity, combination, section ordering, or optional confirmation; auto-select the evidence-backed route and continue
- Path regexes MUST ATTENTION use `[\\/]` for cross-OS separator matching
- Schema enforced by `.claude/hooks/lib/project-config-schema.cjs`

---

## ⛔ Plan → Review → Execute Workflow

### Step 1: Detect — Classify Project Scale

**MUST ATTENTION classify scale FIRST** — drives task granularity for all subsequent phases.

```bash
find . -path "*/node_modules" -prune -o -name "*.csproj" -print 2>/dev/null | wc -l
find . -path "*/node_modules" -prune -o -name "package.json" -print 2>/dev/null | wc -l
find . -path "*/node_modules" -prune -o -type f -name "{configured-source-file-glob}" -print 2>/dev/null | wc -l
find . -maxdepth 3 -type d -name "{candidate-source-dir-name}" 2>/dev/null
```

| Scale         | Signal              | Task Approach                                                                                  |
| ------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Small (<5)    | Few modules         | Execute every section; use compact phase groups only for reporting, not for skipping or asking |
| Medium (5–20) | Moderate count      | Execute every section with one task per section where practical                                |
| Large (20+)   | Many service groups | Execute every section; split 2a/2b and other broad scans per service group when needed         |

Project size controls task grouping and split depth only. It does NOT permit skipping required sections, stopping for user approval, or asking whether to combine work. For small projects, auto-select the compact full-pass plan and keep validating after each merge/review phase.

### Step 2: Create Plan (`/plan`)

Create `plans/{date}-project-config-scan.md`:

1. Record scale classification from Step 1
2. Group config sections into phases (≤5 tasks each) while preserving full section coverage
3. Include review-and-fix cycle after each phase
4. Include every Phase 2 section (2a–2q) as either its own task or a named task inside a compact group with explicit evidence for each section

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

Run `/plan-review` on the generated scan plan; resolve blocking findings before executing any phase.

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
├── workflowPatterns — { architectureStyle, codeHierarchy, cssMethodology, stateManagement, crossModuleValidation, featureDocTemplate, reviewRulesDoc }
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

**Each subsection = one TaskCreate or an explicit named child inside a compact group.** Per task: investigate → report → merge → validate. Small projects still cover every subsection; compact grouping is an execution convenience, not permission to skip or ask.

### 2a. Modules — Backend

```bash
find . -path "*/node_modules" -prune -o -name "*.csproj" -print | head -50
find . -name "pom.xml" -o -name "build.gradle" | head -50
find . -path "*/node_modules" -prune -o -name "package.json" -print | head -50
find . -name "go.mod" | head -50
```

Build `modules[]` entries: `{ name, kind, pathRegex, description, tags[], meta{} }`

- `kind`: `"backend-service"`, `"library"`, `"framework"`

### 2b. Modules — Frontend

```bash
find . -name "nx.json" -o -name "{frontend-framework-config}" -o -name "lerna.json" -o -name "turbo.json" 2>/dev/null | head -5
find . -maxdepth 5 -type d \( -name apps -o -name libs -o -name packages \) 2>/dev/null | head -30
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
Rules MUST ATTENTION be specific: "Use the service-specific repository (e.g. `OrderRepository`), not the generic repository base" not "follow best practices".

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

| Frontend                          | Signal                    | Backend                          | Signal                             |
| --------------------------------- | ------------------------- | -------------------------------- | ---------------------------------- |
| `{configured-frontend-framework}` | configured package marker | `{configured-backend-framework}` | configured backend manifest marker |
| `react`                           | `react`                   | `spring`                         | `spring-boot-starter-web`          |
| `vue`                             | `vue`                     | `express`                        | `express` in package.json          |
| `generic`                         | None                      | `fastapi`                        | `fastapi` in requirements.txt      |

Route prefix: derive from configured backend framework and existing route declarations.

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

- **Configured runtime:** discover event, handler, publisher, and consumer base types from codebase grep and project-reference docs.
- **TypeScript:** Redux dispatch→reducer, NgRx createAction→ofType, EventEmitter emit→on
- **Python:** Celery task.delay→@app.task, Django signal.send→@receiver
- **Java:** publishEvent→@EventListener, KafkaTemplate→@KafkaListener

#### Example (correct format)

```json
{
    "name": "entity-to-event-handlers",
    "edgeKind": "MESSAGE_BUS",
    "paths": ["{configured-domain-source-root}/", "{configured-application-source-root}/{event-handler-folder}/"],
    "source": { "filePattern": "{configured-source-file-glob}", "contentPattern": "{configured-entity-pattern}", "keyGroup": 1 },
    "target": { "filePattern": "{configured-source-file-glob}", "contentPattern": "{configured-event-handler-pattern}", "keyGroup": 1 },
    "matchBy": "key-contains"
}
```

**IMPORTANT MUST ATTENTION** record detected rules in the plan/report before writing; do not pause for user approval. **IMPORTANT MUST ATTENTION** scope `paths` to relevant dirs (not repo root).

### 2q. Reference Docs — Canonical Floor (MUST normalize, NEVER raw-import)

⛔ Reference docs are the FRAMEWORK's canonical set, not whatever files happen to sit in `docs/project-reference/`. Do **NOT** build `referenceDocs[]` by listing on-disk files — that silently re-imports drift (legacy filenames like `feature-docs-reference.md`, missing canonical docs, wrong order). Normalize against the canonical floor instead:

```bash
node -e "const h=require('./.claude/hooks/lib/session-init-helpers.cjs');const{loadProjectConfig}=require('./.claude/hooks/lib/project-config-loader.cjs');console.log(JSON.stringify(h.normalizeReferenceDocs((loadProjectConfig()||{}).referenceDocs),null,2))"
```

- Set `config.referenceDocs` = the returned **`normalized`** array (canonical docs + genuine project-specific extras, canonical order, legacy names resolved, canonical `templatePath`s preserved). Add project-specific reference docs only as EXTRA entries; **never** delete or rename a canonical entry.
- For each **`renames[]`** `{from,to}`: if `docs/project-reference/<from>` exists — `git mv` it to `<to>` when `<to>` is absent; if `<to>` already exists, `<from>` is a stale duplicate → confirm `<to>` holds the canonical content, then `git rm <from>`. Migrate every downstream textual reference (`docs-index-reference.md`, `project-structure-reference.md`) `<from>` → `<to>`.
- **`added[]`** are canonical docs missing on disk — the SessionStart hook (or the matching `/scan --target=<key>`) creates them. Do not hand-fabricate content; per-doc purpose/sections come from `DEFAULT_REFERENCE_DOCS`.
- Re-run the probe after merging; `changed:false` with empty `renames`/`added`/`removedLegacy` is the only PASS state.

---

## Phase 3: Consolidate & Write

Merge section-by-section. Overwrite only with concrete scan findings. Large projects: merge incrementally.

## Phase 4: Verify (MANDATORY)

1. Schema validation — MUST ATTENTION pass with zero errors
2. Spot-check 2–3 service paths — verify each path exists (`file:line` evidence)
3. Run hook tests: `node .claude/hooks/tests/test-all-hooks.cjs`

## Phase 5: Follow-Up Tasks

| Reference Doc                                                                 | Scan Skill                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------ |
| `project-structure-reference.md`                                              | `/scan --target=project-structure` (FIRST) |
| `backend-patterns-reference.md`                                               | `/scan --target=backend-patterns`          |
| `seed-test-data-reference.md`                                                 | `/scan --target=seed-test-data`            |
| `design-system/` + `scss-styling-guide.md` + `frontend-patterns-reference.md` | `/scan --target=ui-system`                 |
| `integration-test-reference.md`                                               | `/scan --target=integration-tests`         |
| `feature-spec-reference.md`                                                   | `/scan --target=feature-spec`              |
| `code-review-rules.md`                                                        | `/scan --target=code-review-rules`         |
| `e2e-test-reference.md`                                                       | `/scan --target=e2e-tests`                 |
| `domain-entities-reference.md`                                                | `/scan --target=domain-entities`           |

Then: `/claude-md-init` (LAST). Optionally: `/graph-build`.

## Phase 6: Enhance Generated Docs (MANDATORY)

Run `/prompt-enhance` on all generated/updated docs and `CLAUDE.md`. One task per file, parallel OK.

## Phase 7: Self-Review Verification (MANDATORY)

Re-invoke skill: `/project-config Self review and verify everything again, ensure all is correct with current source code`. Catches regressions and issues missed in first pass.

## Output

Report: sections updated vs unchanged, new modules discovered, path mismatches, follow-up tasks created.
Include the project scale, the selected full-coverage task grouping, and confirmation that no required section was skipped because the project was small.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Scan workspace, update `docs/project-config.json` with accurate, schema-valid values via Plan → Review → Execute.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** apply critical + sequential thinking; trace every claim, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** classify project scale FIRST (Step 1) — drives all task granularity decisions.
**IMPORTANT MUST ATTENTION** plan first — recon → `/plan` → `/plan-review` → execute. NEVER jump to scanning.
**IMPORTANT MUST ATTENTION** execute all required sections for all project sizes; small projects get compact full-coverage grouping, never a permission question or skipped sections.
**IMPORTANT MUST ATTENTION** break into phases with review cycles — scan → merge → validate → spot-check → fix per phase.
**IMPORTANT MUST ATTENTION** use exact schema field names — run `--describe`, copy verbatim. NEVER guess.
**IMPORTANT MUST ATTENTION** validate after EACH phase — schema errors compound across phases.
**NEVER** use `classPattern`/`keyExtractor` — correct fields: `contentPattern` (regex) + `keyGroup` (number).
**IMPORTANT MUST ATTENTION** one TaskCreate per config section — NEVER monolithic scan.
**IMPORTANT MUST ATTENTION** Phase 7 self-review is MANDATORY — catches what every earlier phase missed.

**Anti-Rationalization:**

| Evasion                               | Rebuttal                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| "File looks simple, skip planning"    | Planning catches scale mistakes and regressions. Apply anyway.                                   |
| "Already know the schema"             | Run `--describe` anyway — field names differ from memory. No proof = no check.                   |
| "Phase N looks fine, skip validate"   | Schema errors compound across phases. Validate every phase, no exceptions.                       |
| "Self-review is redundant"            | Phase 7 catches what every earlier phase missed. Never skip.                                     |
| "Small project, skip task tracking"   | Task tracking prevents drift on all project sizes. Always `TaskCreate` first.                    |
| "Small project, ask before combining" | Do not ask. Auto-select compact full-coverage grouping and execute all sections with validation. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
