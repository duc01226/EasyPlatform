'use strict';
/**
 * Help text for every config option whose schema entry carries no inline `describe`.
 * Covers project-config (project-config-schema.cjs SCHEMA) and .ck.json (ck-config-schema.cjs CK_SCHEMA).
 *
 * Read ONLY by the help commands (project-config --help, /framework-config --mode=help config) and the
 * config-help-coverage test — never by hooks, so it adds nothing to hook start-up.
 *
 * Rule: a schema entry's own `describe` wins; this file supplies the rest. A new schema
 * field needs one or the other — config-help-coverage.test.cjs fails when a field has neither,
 * or when a key here no longer names a schema field.
 *
 * Paths: `a.b` nested property · `a[].b` field of each array item · `a{}` map value.
 */

const PROJECT_CONFIG_DESCRIBES = {
    "schemaVersion": "No runtime consumer; marks the config layout version for AI readers. Current configs use 2 (modules[], contextGroups[], styling); earlier names such as backendServices and scss are deprecated.",
    "project.description": "Optional one-line project summary. Rendered after the name in the generated CLAUDE.md TL;DR and shown by /project-help. Omit unless repository evidence confirms it.",
    "project.languages": "Optional language names (e.g. javascript, python). Rendered in the CLAUDE.md Tech Stack line; convention setup maps known names to file extensions for the general-code class and ignores unknown ones.",
    "project.packageManagers": "Startup-install manager signal. Omit or [] for no signal, else exactly one entry: npm, pnpm, yarn or bun, optionally @major.minor.patch. Several or malformed entries, or a conflict with lockfiles, skip the install.",
    "project.monorepoTool": "Optional workspace tool name (e.g. nx, turborepo). Informational: shown by /project-help only; no behavior depends on it.",
    "backendServices": "[DEPRECATED] v1 service registry, replaced by modules[]; validation warns when present. Its presence still adds backend pattern docs when referenceDocs is omitted. Do not add to new configs.",
    "backendServices.patterns": "[DEPRECATED] Required list of { name, pathRegex, description? } service path patterns. No runtime consumer; declare services as modules[] entries instead.",
    "backendServices.patterns[].name": "[DEPRECATED] Required pattern label. No runtime consumer.",
    "backendServices.patterns[].pathRegex": "[DEPRECATED] Required regex for the pattern's paths; it must compile or validation fails. No runtime consumer; use modules[].pathRegex.",
    "backendServices.patterns[].description": "[DEPRECATED] Optional free-text note for the pattern. No runtime consumer.",
    "backendServices.serviceMap": "[DEPRECATED] Required map of service name -> path regex (values must compile). The loader builds backend-service modules from it only when modules[] is empty. Use modules[] instead.",
    "backendServices.serviceRepositories": "[DEPRECATED] Required map of service name -> repository type. The loader's v1 fallback copies it to module meta.repository; the feature-implement skill reads it. Prefer modules[].meta.repository.",
    "backendServices.serviceDomains": "[DEPRECATED] Required map of service name -> domain description; the loader's v1 fallback uses it as the module description. Use modules[].description instead.",
    "frontendApps": "[DEPRECATED] v1 front-end app registry, replaced by modules[]; validation warns when present. Its presence still adds frontend pattern docs when referenceDocs is omitted. Do not add to new configs.",
    "frontendApps.patterns": "[DEPRECATED] Required list of { name, pathRegex, description? } app path patterns. No runtime consumer; declare apps as modules[] entries instead.",
    "frontendApps.patterns[].name": "[DEPRECATED] Required pattern label. No runtime consumer.",
    "frontendApps.patterns[].pathRegex": "[DEPRECATED] Required regex for the pattern's paths; it must compile or validation fails. No runtime consumer; use modules[].pathRegex.",
    "frontendApps.patterns[].description": "[DEPRECATED] Optional free-text note for the pattern. No runtime consumer.",
    "frontendApps.appMap": "[DEPRECATED] Required map of app name -> path regex (values must compile). The loader builds frontend-app modules from it only when modules[] is empty. Use modules[] instead.",
    "frontendApps.legacyApps": "[DEPRECATED] Required list of appMap names treated as legacy; the loader's v1 fallback sets meta.generation to legacy for them and modern for the rest. Use modules[].meta instead.",
    "frontendApps.modernApps": "[DEPRECATED] Required list of modern app names. No runtime consumer: any appMap app not listed in legacyApps is already treated as modern.",
    "frontendApps.frontendRegex": "[DEPRECATED] Required regex matching front-end source paths; it must compile. No runtime consumer; use modules[] entries with a frontend kind.",
    "frontendApps.sharedLibRegex": "[DEPRECATED] Required regex matching shared front-end library paths; it must compile. No runtime consumer; use a modules[] entry instead.",
    "designSystem.docsPath": "Required when designSystem is set: repo-relative folder of the per-app design docs. Session start creates a placeholder for each missing appMappings[].docFile here; doc-impact routing also watches it.",
    "designSystem.modernUiNote": "Optional free-text note on the current UI direction. No runtime consumer; documents the project for AI readers.",
    "designSystem.appMappings": "Required list mapping apps to design docs: { name, pathRegexes[], docFile, description?, quickTips? }. Design, mockup and presentation skills pick the entry matching the work; session start seeds missing docs.",
    "designSystem.appMappings[].name": "Required app label. Skills use it to identify the app; session start names it in the placeholder doc it creates for a missing docFile.",
    "designSystem.appMappings[].pathRegexes": "Required regexes (each must compile) for the app's source paths. Skills use them to pick this mapping; no hook matches files against them.",
    "designSystem.appMappings[].docFile": "Required file name, relative to designSystem.docsPath, of the app's design doc. Session start creates a placeholder when it is missing; skills read it when refactoring that app's screens.",
    "designSystem.appMappings[].description": "Optional free-text summary of the app's UI. No runtime consumer; documents the mapping for AI readers.",
    "designSystem.appMappings[].quickTips": "Optional short design reminders for the app. No runtime consumer; documents the mapping for AI readers.",
    "designSystem.canonicalDoc": "Optional repo-relative path of the design-system doc that governs new UI. Design, mockup and UI agents read it first; omit when no such doc exists, and never invent one.",
    "designSystem.tokenFiles": "Optional repo-relative paths of design-token source files. Design skills and UI agents read them before choosing colors, spacing or type; omit when the project has none.",
    "scss": "[DEPRECATED] v1 name of styling; validation warns when present. Any content still adds scss-styling-guide.md when referenceDocs is omitted. Use styling instead.",
    "scss.appMap": "[DEPRECATED] Required map of app name -> style path regex (values must compile). No runtime consumer; use styling.appMap.",
    "scss.patterns": "[DEPRECATED] Required list of { name, pathRegexes[], description?, scssExamples? } style patterns. No runtime consumer; use styling.patterns.",
    "scss.patterns[].name": "[DEPRECATED] Required pattern label. No runtime consumer.",
    "scss.patterns[].pathRegexes": "[DEPRECATED] Required regexes (each must compile) for the pattern's style files. No runtime consumer; use styling.patterns[].pathRegexes.",
    "scss.patterns[].description": "[DEPRECATED] Optional note for the pattern. No runtime consumer.",
    "scss.patterns[].scssExamples": "[DEPRECATED] Optional example style snippets. No runtime consumer; use styling.patterns[].scssExamples.",
    "componentFinder": "[DEPRECATED] v1 component lookup settings, replaced by componentSystem; validation warns when present. No runtime consumer.",
    "componentFinder.selectorPrefixes": "[DEPRECATED] Required list of component selector prefixes. No runtime consumer; use componentSystem.selectorPrefixes.",
    "componentFinder.layerClassification": "[DEPRECATED] Required map of component layer -> classification. No runtime consumer; use componentSystem.layerClassification.",
    "sharedNamespace": "[DEPRECATED] v1 name of the shared code namespace; validation warns when present. No runtime consumer; describe shared code as a modules[] entry instead.",
    "modules": "Optional list of code areas { name, kind, pathRegex, description?, tags?, meta? }. Drives the CLAUDE.md apps line and key locations, doc-impact routing and convention detection; any entry adds the project-structure doc by default.",
    "modules[].name": "Required module name. Shown in the CLAUDE.md apps line and module summaries; with meta.domain it names the module's folder under the business spec root in the Doc Lookup row.",
    "modules[].kind": "Required category, e.g. backend-service, frontend-app, library, infrastructure. Convention detection keys on backend*/frontend* prefixes; infrastructure with meta.port is listed as a port, not an app.",
    "modules[].pathRegex": "Required regex (must compile), tested case-insensitively against the repo-relative forward-slash path. Feeds doc-impact routing, backend/frontend convention detection and the CLAUDE.md key locations.",
    "modules[].description": "Optional one-line purpose. Shown beside the path in the CLAUDE.md key-locations block; the module name is used when omitted.",
    "modules[].tags": "Optional descriptor words. When referenceDocs is omitted, a word domain in kind or tags adds the domain-entities doc, and frontend, ui or client adds the frontend patterns doc.",
    "modules[].meta": "Optional free-form object. Known keys: repository (Decision Quick-Ref row), port/ports (port tables), credentials (secret reference only; secrets are redacted), domain (Doc Lookup row). Others are ignored.",
    "contextGroups[].fileExtensions": "Optional extension filter: a file must match one (leading dot optional, case-insensitive) as well as an include matcher. Omit or [] for no filter. Part of the class content version, so edits re-deliver it.",
    "contextGroups[].guideDoc": "Optional repo-relative guide doc. Makes the class deliverable, is listed as a must-read when a matching file is read or edited, and routes doc-impact checks for the class's paths.",
    "contextGroups[].patternsDoc": "Optional repo-relative coding-patterns doc. Delivered like guideDoc (must-read, makes the class deliverable) and preferred over guideDoc in the fallback CLAUDE.md activation row.",
    "contextGroups[].stylingDoc": "Optional repo-relative styling doc for the class. Not delivered by the convention reminder; only doc-impact routing and AI readers use it.",
    "contextGroups[].designSystemDoc": "Optional repo-relative design-system doc for the class. Not delivered by the convention reminder; only doc-impact routing and AI readers use it.",
    "conventionInjection.enabled": "Default false. Only literal true turns on hook delivery of contextGroups reminders on file read/edit. Static CLAUDE.md rows and the --lookup command work either way.",
    "conventionInjection.maxChars": "Reminder size cap per trigger; integer 500-10000, default 4000. Over the cap, classes lose their rules from lowest precedence up; if it is still over, whole classes are then dropped, lowest first.",
    "conventionInjection.maxClassesPerEdit": "Max classes delivered per trigger; integer 1-10, default 4. The cap applies in priority order before already-delivered classes are skipped.",
    "conventionInjection.reinjectAfterBytes": "Transcript growth in bytes that re-arms a delivered class; integer of at least 4500000 (the default, about 200K tokens). Smaller values fail validation.",
    "conventionInjection.reinjectAfterMinutes": "Age in minutes that re-arms a class when history size is unknown but condensation has been observed; integer 1-1440, default 30.",
    "conventionInjection.blindReinjectAfterMinutes": "Age in minutes that re-arms a class when the context is blind (no transcript and no condensation ever seen); integer 1-1440, default 5.",
    "conventionInjection.onRead": "Default true. false stops file reads from delivering reminders for every class; edits still deliver. For one class, set its on: edit instead.",
    "conventionInjection.compactionMarkers": "Optional extra regexes, default []. A transcript line matching one counts as a condensation and re-arms delivered classes, alongside the built-in compaction markers.",
    "styling": "Optional styling capability. Its fileExtensions create a styling convention class and count as front-end evidence; SCSS/Sass signals add scss-styling-guide.md when referenceDocs is omitted.",
    "styling.technology": "Optional styling technology name (e.g. scss, css). A value naming scss or sass adds scss-styling-guide.md when referenceDocs is omitted; otherwise informational.",
    "styling.fileExtensions": "Optional style extensions (e.g. .scss, .css). Convention setup builds a styling class from them and proposes the ui-ux-gate class; .scss/.sass entries add the SCSS guide to default referenceDocs.",
    "styling.guideDoc": "Optional repo-relative styling guide. Becomes the reference doc of the detected styling convention class; the demo-guide skill treats it as a UI-surface signal.",
    "styling.appMap": "Optional map of app name -> style path regex (values must compile). Values act as doc-impact triggers for the styling and design-system reference docs.",
    "styling.patterns": "Optional list of { name, pathRegexes[], description?, scssExamples? } style patterns. Only scssExamples has a runtime effect (default referenceDocs); the rest documents patterns for AI readers.",
    "styling.patterns[].name": "Required pattern label. No runtime consumer; documents the pattern for AI readers.",
    "styling.patterns[].pathRegexes": "Required regexes (each must compile) for the files the pattern covers. No runtime consumer matches them; documents the pattern for AI readers.",
    "styling.patterns[].description": "Optional note on when the pattern applies. No runtime consumer; documents the pattern for AI readers.",
    "styling.patterns[].scssExamples": "Optional example SCSS snippets for the pattern. A non-empty list adds scss-styling-guide.md to the default referenceDocs selection.",
    "componentSystem": "Optional component-convention capability; add it only when an established convention helps route work. UI agents read layerClassification; the other fields are informational.",
    "componentSystem.type": "Optional component technology name. No runtime consumer; documents the project for AI readers.",
    "componentSystem.selectorPrefixes": "Optional list of component selector prefixes. Read by the shared test-fixture generator (default ['app-']) and by AI readers; no hook enforces them.",
    "componentSystem.filePattern": "Optional pattern naming component files. No runtime consumer; documents the project for AI readers.",
    "componentSystem.layerClassification": "Optional map of component layer -> meaning. UI agents use it to place components when set; when absent they describe the actual owners and invent no tiers.",
    "formatting": "Optional settings for the post-edit formatter hook. Omitted: Prettier on its supported extensions. Paths under .claude/, node_modules and build output are always skipped.",
    "formatting.formatter": "Preset id: prettier (default) or biome; none, off, disabled or false turn formatting off. An unrecognized id falls back to prettier.",
    "formatting.command": "Optional shell command template; {file} becomes the quoted path (appended when absent). Replaces the preset (fileExtensions and args are then ignored); formatter none/off still turns formatting off.",
    "formatting.args": "Optional extra string arguments inserted after the preset's own arguments and before the file path. Ignored when command is set.",
    "formatting.fileExtensions": "Optional extensions to format, lowercase with a leading dot (e.g. .ts). Replaces the preset's own list; ignored when command is set.",
    "formatting.skipPaths": "Optional path substrings, matched literally rather than as regexes, to skip on edit. Added to the built-in skip list (node_modules, dist, build, .claude and others).",
    "framework.name": "Required when framework is set: the main application framework name. Rendered in the CLAUDE.md Tech Stack line and shown by /project-help; never taken as proof that a pattern doc applies.",
    "framework.backendPatternsDoc": "Optional repo-relative backend patterns doc. Linked in CLAUDE.md and the detected backend convention class unless declared N/A in referenceDocs; also adds backend docs to the default selection.",
    "framework.frontendPatternsDoc": "Optional repo-relative frontend patterns doc. Linked in CLAUDE.md and the detected frontend convention class unless declared N/A in referenceDocs; also adds frontend docs to the default selection.",
    "framework.codeReviewDoc": "Optional repo-relative code-review rules doc. Becomes the reference doc of the detected general-code convention class and adds code-review-rules.md to the default referenceDocs selection.",
    "framework.integrationTestDoc": "Optional repo-relative integration-test guide. Renders the CLAUDE.md Integration Testing section, feeds the detected integration-test class and adds integration docs to the default selection.",
    "framework.e2eTestDoc": "Optional repo-relative E2E guide (e2eTesting.guideDoc is the fallback). Renders the CLAUDE.md E2E section, feeds the detected e2e-test class and adds E2E docs to the default selection.",
    "framework.searchPatternKeywords": "Optional list of framework pattern names worth searching for. Informational: no hook, generator or skill reads it; documents the project for AI readers.",
    "testing": "Optional test-lane metadata read by root-context generation, per-file convention groups, doc-impact routing, and /project-help. Record only lanes found in manifests or scripts.",
    "testing.frameworks": "Array of test framework/runner names; listed by /project-help. A name matching selenium, playwright, cypress, or specflow also counts as E2E evidence for the generated CLAUDE.md E2E section.",
    "testing.filePatterns": "Map of test kind to file pattern (string or array; no '/' means any depth). The integration key feeds the integration-test convention group; other keys feed a generic test group. All feed doc-impact routing.",
    "testing.commands": "Map of label to command (string, or a nested map of sublabel to command). Rendered into the CLAUDE.md Development Commands block and listed by /project-help.",
    "testing.commandsNote": "Free-text caveat rendered below the CLAUDE.md Development Commands block (e.g. per-OS invocation rules). Rendered even without commands, so it survives regeneration instead of being a hand edit.",
    "testing.coverageTool": "Name of the coverage tool. No runtime consumer; documents the project for AI readers and is listed by /project-help.",
    "testing.guideDoc": "Project-relative path of the general test guide. Becomes the reference doc of the generic test convention group (built from non-integration testing.filePatterns); listed by /project-help.",
    "testing.integrationRules": "Array of rule strings attached to the integration-test convention group. A non-empty list also selects the integration-test reference doc when referenceDocs is absent.",
    "e2eTesting": "Optional E2E metadata read by /e2e-test, /e2e-test --mode=verify, E2E workflows, root-context generation, and doc-impact routing. Declare only when an E2E capability exists; unknown keys warn.",
    "e2eTesting.framework": "E2E framework name. Any value but 'none' enables the e2e-test convention group (built from testsPath/pageObjectsPath) and counts as E2E evidence in generated CLAUDE.md; 'none' declares no browser surface.",
    "e2eTesting.language": "Language the E2E tests are written in. Informational: read by /e2e-test with the e2eTesting block and listed by /project-help; no code consumer.",
    "e2eTesting.configFile": "Project-relative path of the E2E runner config. A change to it flags the E2E reference doc in doc-impact routing; /e2e-test --mode=verify records it when resolving the execution contract.",
    "e2eTesting.platformProject": "Path of a shared E2E platform project. Read only by the hook test-fixture generator to build sample paths (fallback src/e2e/platform/); no workflow consumer.",
    "e2eTesting.sharedProject": "Path of a shared E2E pages project. Read only by the hook test-fixture generator to build sample paths (fallback src/e2e/shared/); no workflow consumer.",
    "e2eTesting.bddProject": "Path of the BDD E2E project. Read only by the hook test-fixture generator to build sample paths (fallback src/e2e/bdd/); no workflow consumer.",
    "e2eTesting.nonBddProject": "Path of a non-BDD E2E project. No runtime consumer; documents the project for AI readers.",
    "e2eTesting.testsPath": "Project-relative E2E test root. Becomes a glob of the e2e-test convention group (when framework is set) and a doc-impact trigger for the E2E reference doc.",
    "e2eTesting.pageObjectsPath": "Page-object folder; set only when source shows a real page-object model. Used as an e2e-test convention glob and doc-impact trigger; never proof that page objects are required.",
    "e2eTesting.fixturesPath": "Project-relative E2E fixtures folder. Changes under it flag the E2E reference doc in doc-impact routing; E2E skills treat it as a search hint.",
    "e2eTesting.guideDoc": "Path of the E2E guide doc; framework.e2eTestDoc wins when both are set. Linked from the generated CLAUDE.md E2E section and the e2e-test convention group; a doc declared N/A renders a skip notice.",
    "e2eTesting.configFiles": "Array of additional E2E config file paths. No runtime consumer; documents the project for AI readers of the e2eTesting block.",
    "e2eTesting.testSpecsDocs": "Array of docs that hold E2E test specs. No runtime consumer; documents the project for AI readers of the e2eTesting block.",
    "e2eTesting.searchPatterns": "Array of search patterns for locating E2E code. No runtime consumer; documents the project for AI readers of the e2eTesting block.",
    "e2eTesting.runCommands": "Map of label to E2E command (e.g. all, filter). Listed by /project-help and read by /e2e-test and /e2e-test --mode=verify for full and focused runs; a missing command is never guessed.",
    "e2eTesting.tcCodeFormat": "Test-case ID format used in E2E test names; record an evidence-backed convention only. When specArtifacts is declared, its identifier mappings govern case identity. No code consumer.",
    "e2eTesting.featureAreas": "Array of E2E feature areas. No runtime consumer; documents the project for AI readers of the e2eTesting block.",
    "e2eTesting.stats": "Freeform object, not validated. Prefer reproducible count commands (e.g. grep expressions) over totals that go stale. No code consumer; read by E2E scans and AI readers.",
    "e2eTesting.dependencies": "Freeform object, not validated. Records E2E package dependencies. No runtime consumer; documents the project for AI readers.",
    "e2eTesting.architecture": "Freeform object. Generated CLAUDE.md builds a stack label from webDriverType, bddFramework, and pattern (selenium, playwright, cypress, specflow, page-object-model); other keys are for AI readers.",
    "e2eTesting.bestPractices": "Array of project E2E rule strings. No code consumer; /e2e-test reads them with the e2eTesting block.",
    "e2eTesting.entryPoints": "Array of project-relative files (base classes, key helpers) to read before E2E work. No code consumer; /e2e-test reads them with the e2eTesting block.",
    "experienceVerification.surfaces": "Required array of observable surfaces reviewed by /experience-review and linked by e2eTesting.execution.surfaceIds. Must be non-empty when enabled; empty and disabled requires notApplicableReason.",
    "experienceVerification.surfaces[].id": "Required surface id. Each e2eTesting.execution.surfaceIds entry must match one, or validation warns the surface must be discovered before E2E can be APPLICABLE.",
    "experienceVerification.surfaces[].kind": "Required surface kind, a project fact such as api, library, terminal, web, mobile, desktop, background, or generated. Free string, not enum-checked; /experience-review uses it to classify the surface.",
    "experienceVerification.surfaces[].runner": "Required runner or manual tool that exercises the surface. Configuration alone never proves applicability; if it cannot run, the review records ENVIRONMENT-BLOCKED.",
    "experienceVerification.surfaces[].entryPoints": "Required array of project-specific entry points (route, command, API, output) where the surface is exercised; each is verified before the surface counts as APPLICABLE.",
    "experienceVerification.surfaces[].changeTriggers": "Optional array of paths or impact labels that mark this surface as affected by a change. Informational: documented contract, no code consumer.",
    "experienceVerification.surfaces[].fullCommand": "Optional copy-ready command for this surface's full suite. /test and the E2E/integration workflows run it verbatim and report N/A or BLOCKED rather than substituting another command.",
    "experienceVerification.surfaces[].focusedCommand": "Optional copy-ready command for a focused/partial run of this surface. Invalid or zero-match selections must exit non-zero; used verbatim by /test and E2E workflows.",
    "experienceVerification.surfaces[].evidenceRoot": "Optional surface-specific candidate-evidence root, beside the section-level evidenceRoot. Keep it under project-root tmp/ or temp/. No code consumer.",
    "experienceVerification.surfaces[].baselineRoot": "Optional surface-specific accepted-baseline root, beside the section-level baselineRoot. Changed only by explicit human acceptance. No code consumer.",
    "experienceVerification.surfaces[].states": "Optional array of states to exercise and capture (e.g. default, loading, empty, error, recovery). /experience-review covers each configured state.",
    "experienceVerification.surfaces[].notes": "Free-text notes for reviewers of this surface. No runtime consumer.",
    "databases": "Freeform object, not validated. Listed by /project-help. Any value selects the backend-patterns reference doc when referenceDocs is absent (session-init-helpers.cjs default selection).",
    "messaging": "Optional messaging metadata, listed by /project-help. Any configured value selects the backend-patterns reference doc when referenceDocs is absent. Configure only when the repository confirms a broker.",
    "messaging.broker": "Message broker name. Listed by /project-help; no hook or generator reads it. Free string, not validated.",
    "messaging.patterns": "Array of messaging patterns the project uses (e.g. outbox, saga). No code consumer; documents the project for AI readers and /project-help.",
    "messaging.consumerConvention": "Message-consumer naming or placement convention. Rendered as a row in the generated CLAUDE.md Decision Quick-Ref table.",
    "api": "Optional API metadata, listed by /project-help. Any configured value selects the backend-patterns reference doc when referenceDocs is absent.",
    "api.style": "API style (e.g. REST, GraphQL, gRPC). Listed by /project-help; no hook or generator reads it. Free string, not validated.",
    "api.docsFormat": "API docs format (e.g. OpenAPI). No code consumer; documents the project for AI readers and /project-help.",
    "api.docsPath": "Project-relative path to the API docs or spec. No code consumer; documents the project for AI readers and /project-help.",
    "api.authPattern": "Authentication pattern (e.g. JWT bearer). Listed by /project-help; no hook or generator reads it.",
    "infrastructure": "Optional deployment metadata, listed by /project-help. /production-readiness-review reads it to choose which container, orchestration, and pipeline files to check. Configure only from repository evidence.",
    "infrastructure.containerization": "Container tooling (e.g. docker, docker-compose). Listed by /project-help; /production-readiness-review then checks Dockerfiles and compose files.",
    "infrastructure.orchestration": "Orchestration platform (e.g. kubernetes, helm). Listed by /project-help; /production-readiness-review then checks manifests and charts.",
    "infrastructure.cicd": "CI/CD metadata. Only cicd.tool has consumers (/fix, /production-readiness-review); the other keys document the project for AI readers.",
    "infrastructure.cicd.tool": "CI/CD tool id (e.g. github-actions, gitlab-ci, azure-devops). /fix and /production-readiness-review use it to find the provider's pipeline config files.",
    "infrastructure.cicd.provider": "CI/CD hosting provider. No runtime consumer; documents the project for AI readers.",
    "infrastructure.cicd.configPath": "Project-relative path of the pipeline config. No runtime consumer; documents the project for AI readers.",
    "infrastructure.cicd.environments": "Array of deployment environment names (e.g. dev, staging, prod). No runtime consumer; documents the project for AI readers.",
    "infrastructure.iac": "Infrastructure-as-code metadata. No runtime consumer; documents the project for AI readers and /project-help.",
    "infrastructure.iac.tool": "IaC tool (e.g. terraform, bicep). No runtime consumer; documents the project for AI readers.",
    "infrastructure.iac.configPath": "Project-relative path of the IaC sources. No runtime consumer; documents the project for AI readers.",
    "referenceDocs": "Exact list of project reference docs agents read, created as skeletons at session start. Omitted = only docs the project's configured capabilities evidence; [] = none. Order is kept; aliases and duplicates collapse.",
    "referenceDocs[].filename": "Required. Doc file name or relative path under the reference-docs root (default docs/project-reference; docsRoots.projectReference.path in docs/project-config.json overrides it). Project-relative only (no absolute paths or \"..\"). Legacy names resolve to their canonical doc.",
    "referenceDocs[].purpose": "Required, non-empty. One-line summary of what the doc holds; generated root context uses it for routing. For a built-in doc it overrides the framework wording. A purpose starting with \"N/A\" marks the doc not applicable.",
    "referenceDocs[].sections": "Optional list of section headings written into the skeleton when the doc is first created (only when no template applies). A non-empty list overrides a built-in doc's default sections.",
    "referenceDocs[].templatePath": "Optional project-relative file copied as-is to create the doc on first session start. Built-in docs keep their framework template; this only fills a gap. Absolute paths and \"..\" are rejected.",
    "graphConnectors": "Optional code-graph connectors that add edges imports cannot see: API calls to routes and regex-joined implicit links. Read by the graph CLI after build, after an update or sync that changed files, and by its connect commands.",
    "graphConnectors.apiEndpoints": "Frontend HTTP call to backend route matching; creates API_ENDPOINT edges. Omitted or not enabled = the graph auto-detects frameworks from project markers; with no frontend+backend pair it creates no edges.",
    "graphConnectors.apiEndpoints.enabled": "Default false. true uses the frontend/backend settings below. Gotcha: false does not turn the connector off; the graph then tries auto-detection from framework markers instead.",
    "graphConnectors.apiEndpoints.frontend": "Where to find frontend HTTP calls. Object with framework (required), paths (required) and optional customPatterns.",
    "graphConnectors.apiEndpoints.frontend.framework": "Required. Built-in call patterns: angular, react, vue, nextjs (next), svelte (sveltekit), remix, node or generic. An unknown value falls back to generic.",
    "graphConnectors.apiEndpoints.frontend.paths": "Required. Repo-relative directories scanned for HTTP calls. Defaults to the repo root (\".\") when the connector runs without it.",
    "graphConnectors.apiEndpoints.frontend.customPatterns": "Optional regex strings (case-insensitive) added to the built-in call patterns, never replacing them. Two capture groups = method + URL path; one group = path, method GET.",
    "graphConnectors.apiEndpoints.backend": "Where to find backend route definitions. Object with framework (required), paths (required), optional routePrefix and customPatterns.",
    "graphConnectors.apiEndpoints.backend.framework": "Required. Built-in route patterns: dotnet, spring, express, nestjs, fastapi, django, rails, go or generic. An unknown value falls back to generic.",
    "graphConnectors.apiEndpoints.backend.paths": "Required. Repo-relative directories scanned for route definitions. Defaults to the repo root (\".\") when the connector runs without it.",
    "graphConnectors.apiEndpoints.backend.routePrefix": "Optional URL prefix (e.g. \"api\") the matcher adds to frontend paths and strips from backend paths so relative calls still match routes. Default empty.",
    "graphConnectors.apiEndpoints.backend.customPatterns": "Optional regex strings (case-insensitive) added to the built-in route patterns. Two capture groups = method + path; one group = path, method GET.",
    "graphConnectors.implicitConnections": "Optional rules that link files sharing a regex-captured key with no direct import (e.g. event producer to consumer). Refreshed after a graph build, and after an update or sync that changed files; a malformed rule is skipped with a warning.",
    "graphConnectors.implicitConnections[].name": "Required. Rule identifier, stored on each created edge and shown in the connect summary.",
    "graphConnectors.implicitConnections[].description": "Optional human note explaining what the rule links. Documentation only; not used for matching.",
    "graphConnectors.implicitConnections[].edgeKind": "Required. Edge type written for each match, e.g. TRIGGERS_EVENT or MESSAGE_BUS. Free text; graph queries report it as the relationship kind.",
    "graphConnectors.implicitConnections[].paths": "Optional repo-relative directories that limit both sides' scan; a side's own paths win. Omitted = the whole repo, minus graphSettings.scanSkipDirs. Missing directories are skipped.",
    "graphConnectors.implicitConnections[].source": "Required. How to find the linking side's files and extract its key: globs plus contentPattern or pathPattern. A side with neither pattern finds nothing.",
    "graphConnectors.implicitConnections[].source.filePattern": "Glob (**, *, ?) matched against each file's path relative to the scanned directory (the repo root, or each entry of paths) or its file name. Combine with filePatterns for more globs.",
    "graphConnectors.implicitConnections[].source.filePatterns": "Optional extra globs for source files, used together with filePattern.",
    "graphConnectors.implicitConnections[].source.contentPattern": "Regex run over each source file's content; the capture group named by keyGroup is the join key. A match with no capture group is skipped. Ignored when pathPattern is set.",
    "graphConnectors.implicitConnections[].source.pathPattern": "Regex over the file's repo-relative forward-slash path; its capture group is the key. Use when the key lives in the file name. Takes precedence over contentPattern.",
    "graphConnectors.implicitConnections[].source.keyGroup": "Default 1. Which capture group (1-based) of contentPattern or pathPattern holds the join key.",
    "graphConnectors.implicitConnections[].source.paths": "Optional repo-relative directories to scan for source files; overrides the rule-level paths for this side.",
    "graphConnectors.implicitConnections[].target": "Required. How to find the linked-to side's files and extract its key; same fields as source. A side with neither pattern finds nothing.",
    "graphConnectors.implicitConnections[].target.filePattern": "Glob (**, *, ?) matched against each file's path relative to the scanned directory (the repo root, or each entry of paths) or its file name, to select target files. Combine with filePatterns for more globs.",
    "graphConnectors.implicitConnections[].target.filePatterns": "Optional extra globs for target files, used together with filePattern.",
    "graphConnectors.implicitConnections[].target.contentPattern": "Regex run over each target file's content; the capture group named by keyGroup is the join key. A match with no capture group is skipped. Ignored when pathPattern is set.",
    "graphConnectors.implicitConnections[].target.pathPattern": "Regex over the file's repo-relative forward-slash path; its capture group is the key. Use when the key lives in the file name. Takes precedence over contentPattern.",
    "graphConnectors.implicitConnections[].target.keyGroup": "Default 1. Which capture group (1-based) of contentPattern or pathPattern holds the join key.",
    "graphConnectors.implicitConnections[].target.paths": "Optional repo-relative directories to scan for target files; overrides the rule-level paths for this side.",
    "graphConnectors.implicitConnections[].matchBy": "Required by the schema: key-equals (exact key match) or key-contains (either key contains the other). Any other value makes the rule create no edges.",
    "architectureRules": "Optional layer-boundary rules checked by the code-quality-review and changes-review skills and the architecture review mode (`architecture --mode=review`) on changed files. Omitted = the boundary check is skipped silently.",
    "architectureRules.layerBoundaries": "List of layers, each with paths and the layers it must not import from. A changed file's import from a forbidden layer is a blocking review finding.",
    "architectureRules.layerBoundaries[].layer": "Required. Layer name. Reviewers flag an import whose path contains a name listed in another layer's cannotImportFrom, so pick a name that appears in import paths.",
    "architectureRules.layerBoundaries[].paths": "Required. Glob patterns that assign a file to this layer.",
    "architectureRules.layerBoundaries[].cannotImportFrom": "Required. Layer names this layer must not import from; an import path containing one of them is a violation.",
    "architectureRules.excludePatterns": "Optional patterns for files the boundary check skips, such as framework or generated code.",
    "codebaseHealth": "Optional scan scope for /scan-codebase-health (doc count drift, stale config references, unused exports, orphan files). Omitted = the skill discovers source roots from config and manifests.",
    "codebaseHealth.sourcePaths": "Source roots the health scan and /docs-manager --mode=update inspect. Omitted = discovered from project config, manifests and populated code directories.",
    "codebaseHealth.docPaths": "Documentation folders scanned for numeric claims and broken cross-references. Omitted = [\"docs/\"] when a docs folder exists.",
    "codebaseHealth.configPatterns": "Globs for config files (e.g. settings or environment files) whose references to classes, modules or connections the health scan greps; a missing target is a HIGH finding.",
    "codebaseHealth.excludePaths": "Directory names the health scan leaves out, e.g. node_modules, dist, bin, obj.",
    "integrationTestVerify": "Optional run contract for /integration-test --mode=verify and the integration-test skills and agents. Omitted = fallback mode that guesses the runner from root manifests and changed test files.",
    "integrationTestVerify.guidance": "Free-text run policy shown verbatim: repeat count, reset rules, concurrency, scope. Omitted = two fresh runs without destructive reset for suites with persistent or shared state.",
    "integrationTestVerify.referenceDocs": "Project docs read before any system check or test run to harvest environment preconditions. Also added to the auto-detected integration-test file conventions.",
    "integrationTestVerify.runScript": "Path to the project's CI-style full test run script. Reference only: read as evidence for arguments and setup, never run automatically.",
    "integrationTestVerify.startupScript": "Path to the script that starts the system under test. Reference only: named to the user when the system check fails, and read as setup evidence.",
    "integrationTestVerify.quickRunCommand": "Test runner command used for focused and full runs (e.g. npm test, pytest). Omitted = fallback mode picks a runner from root manifests.",
    "integrationTestVerify.systemCheckCommand": "Shell command run before tests to confirm the system is ready. A failure stops the run as ENVIRONMENT-BLOCKED and points to startupScript.",
    "integrationTestVerify.testProjectPattern": "Glob that discovers test projects; wins over testProjects and git detection. Gotcha: the file-convention auto-detector also reads it as a path regex, using it only when it compiles.",
    "integrationTestVerify.testProjects": "Explicit test project paths, used when testProjectPattern is absent. Entries with a slash also scope the auto-detected integration-test file conventions.",
    "workflowPatterns": "Optional project architecture and process hints. Style fields feed the generated CLAUDE.md Decision Quick-Ref; it also sets the feature-spec template path and the doc-sync gate areas.",
    "workflowPatterns.architectureStyle": "Free text, e.g. \"modular monolith\" or \"microservices\". Shown as the Architecture style row in the generated CLAUDE.md Decision Quick-Ref. Omitted = row left out.",
    "workflowPatterns.codeHierarchy": "Free text describing where logic lives in this project. Shown as the Code hierarchy row in the generated CLAUDE.md Decision Quick-Ref. Omitted = row left out.",
    "workflowPatterns.cssMethodology": "Free text naming the styling method, e.g. BEM or utility classes. Shown as the Styling methodology row in the generated CLAUDE.md Decision Quick-Ref. Omitted = row left out.",
    "workflowPatterns.stateManagement": "Free text naming the UI state approach. Shown as the State management row in the generated CLAUDE.md Decision Quick-Ref. Omitted = row left out.",
    "workflowPatterns.crossModuleValidation": "Free text on how modules validate data or calls across boundaries. Shown as the Cross-module validation row in the generated CLAUDE.md Decision Quick-Ref.",
    "workflowPatterns.featureDocTemplate": "Project-relative path of the feature-spec template that spec skills and workflows read. Copied once from the framework template at session start if absent. Default <templates root>/detailed-feature-spec-template.md.",
    "workflowPatterns.reviewRulesDoc": "Informational: path to the project's review-rules doc. No hook or generator reads it; review skills use the code-review-rules.md reference doc instead.",
    "workflowPatterns.docSyncGate": "Settings for the advisory doc-sync gate hook: warns at edit and commit time when code in an enforced area changes without its feature spec. It never blocks. Only extensions in the hook's behavioralCodeExtensions (default .cs, .ts) count.",
    "workflowPatterns.docSyncGate.enforcedAreas": "List of { name, codePathPrefixes[] }; name is the spec folder under the business spec root. Default [] = gate idle. Only files under a prefix with a behavioral extension (hook config; default .cs, .ts) are checked.",
    "workflowPatterns.docSyncGate.enabled": "Turns the advisory doc-sync gate on or off for this project. Omitted = the value in the hook's own config file. An invalid gate setting disables the gate; it never blocks.",
    "workflowPatterns.docSyncGate.enforcedAreas[].name": "Required, non-blank. The area name: the spec folder under the business spec root whose feature spec must change with the code.",
    "workflowPatterns.docSyncGate.enforcedAreas[].codePathPrefixes": "Required, at least one non-blank project-relative folder prefix. Code under a prefix belongs to this area; a prefix matches whole path segments only.",
    "workflowPatterns.docSyncGate.enforcedAreas[].graceDays": "Optional number. Accepted and type-checked, but no hook reads it today; it has no effect on the gate.",
    "localization": "Optional multilingual settings. Review skills run the translation sync check only when enabled is true and more than one locale is listed.",
    "localization.enabled": "Default false. true, together with two or more supportedLocales, makes reviews require a translation update or an explicit risk decision when UI text changes.",
    "localization.supportedLocales": "Locale codes the project ships, e.g. [\"en\", \"fr\"]. Needs more than one entry (with enabled true) to turn on the translation sync check. Blank entries are ignored.",
    "localization.defaultLocale": "Informational: the source locale, e.g. \"en\". Normalized by the config loader; no review check uses it.",
    "localization.translationFilePatterns": "Case-insensitive regexes that identify translation resource files; reviews look for changes to them when UI text changes. Each entry must compile.",
    "localization.uiPathPatterns": "Case-insensitive regexes that mark extra paths as UI-facing, on top of the default UI extensions, for the translation sync check. Each entry must compile.",
    "portability": "Settings for adopting the framework in other repos: workflow routing, path-rule inlining, activation tiers and the tooling package name.",
    "portability.workflowAutoDetect": "Legacy on/off form of workflowRouteMode: false reads as off, true as ask; workflowRouteMode wins when both are set.",
    "portability.inlinePathRules": "Default true. false makes generated CLAUDE.md list path-rule groups plus a lookup command instead of inlining rules; if hook delivery cannot cover it, rules stay inline with a [WARN] INLINE_PATH_RULES.",
    "portability.toolingPackageName": "Root package.json name that marks this repo as carrying the framework's own npm surface; framework self-check tests run only when it matches. Defaults to the upstream package name. Set it when vendoring.",
    "portability.workflowRouteProtocol.text": "Inline markdown appended to the route reminder; used together with or instead of path.",
    "portability.workflowRouteProtocol.path": "Repo-relative markdown file read at runtime and appended to the route reminder; a sensitive-looking path (.env, keys, secrets) is refused and a file past 20000 characters is truncated with a marker.",
    "skillConventions": "Optional frontmatter rules for the skill validator (validate-skills.cjs, Scan & Fix). Omitted = only the official skill schema plus built-in fixes (remove infer, rename tools to allowed-tools).",
    "skillConventions.conventionFields": "Extra frontmatter field names this project uses on purpose (e.g. version, triggers). Reported as INFO instead of an unknown-field ERROR. Added to the built-in lifecycle fields.",
    "skillConventions.removableFields": "Frontmatter field names to flag as WARN and delete under --fix. Added to the built-in list (infer).",
    "skillConventions.fieldFixes": "Map of wrong field name to correct name, e.g. { \"tools\": \"allowed-tools\" }. Flagged as WARN and renamed under --fix. Merged over the built-in fixes.",
    "taskTracking.kindLabels.initiative": "Optional display word for the initiative kind: nonblank text of at most 160 characters without control characters, never another vocabulary word or label. Changes displayed text only.",
    "taskTracking.kindLabels.task": "Optional display word for the task kind: nonblank text of at most 160 characters without control characters, never another vocabulary word or label. Changes displayed text only.",
    "taskTracking.kindLabels.story": "Optional display word for the story kind: nonblank text of at most 160 characters without control characters, never another vocabulary word or label. Changes displayed text only.",
    "taskTracking.kindLabels.subtask": "Optional display word for the subtask kind: nonblank text of at most 160 characters without control characters, never another vocabulary word or label. Changes displayed text only.",
    "taskTracking.kindLabels.area": "Optional display word for the area kind: nonblank text of at most 160 characters without control characters, never another vocabulary word or label. Changes displayed text only.",
    "taskTracking.levelLabels.application": "Optional display name for the application level of an area: nonblank text of at most 160 characters without control characters. Changes displayed text only.",
    "taskTracking.levelLabels.product": "Optional display name for the product level of an area: nonblank text of at most 160 characters without control characters. Changes displayed text only.",
    "taskTracking.levelLabels.module": "Optional display name for the module level of an area: nonblank text of at most 160 characters without control characters. Changes displayed text only.",
    "taskTracking.levelLabels.feature": "Optional display name for the feature level of an area: nonblank text of at most 160 characters without control characters. Changes displayed text only.",
    "taskTracking.typeLabels.feedback": "Optional display name for the feedback type of an initiative: nonblank text of at most 160 characters without control characters. Changes displayed text only.",
    "taskTracking.typeLabels.idea": "Optional display name for the idea type of an initiative: nonblank text of at most 160 characters without control characters. Changes displayed text only.",
    "taskTracking.typeLabels.initiative": "Optional display name for the initiative type of an initiative: nonblank text of at most 160 characters without control characters. Changes displayed text only."
};

const CK_CONFIG_DESCRIBES = {
    "locale": "Language settings for sessions, usually set globally or in .ck.local.json. Sub-keys thinkingLanguage and responseLanguage; both default to null (unset). SessionStart exports each set value as a session env var.",
    "locale.thinkingLanguage": "Language for internal reasoning (for example \"en\"). String or null; default null. When set, SessionStart exports it as CK_THINKING_LANGUAGE; no other in-repo reader. Personal preference: global or .ck.local.json.",
    "locale.responseLanguage": "Language for user-facing replies (for example \"vi\" or \"fr\"). String or null; default null. When set, SessionStart exports it as CK_RESPONSE_LANGUAGE; no other in-repo reader. Personal preference: global or .ck.local.json.",
    "assertions": "Legacy array of stack-neutral reminder strings; default []. Loaded and validated (non-string items error), but no hook injects it into prompts. Keep project rules in the project config's contextGroups and reference docs instead.",
    "plan": "Plan naming and resolution (project layer). Reads namingFormat, dateFormat, issuePrefix, reportsDir, resolution {order, branchPattern}, validation {mode auto|prompt|off: whether a standalone plan creation starts the validation interview (auto runs it, prompt asks first, off skips it; default auto; read as the merged effective value, so a checkout-local settings file can override the project value), minQuestions: the breadth floor, maxQuestions: the size of one question round and never a cap on the interview, focusAreas}; SessionStart exports them as CK_* env vars.",
    "paths": "Legacy directory settings (project layer): docs and plans, repo-relative or absolute. A relative value escaping the repo falls back to the default. Content roots in the project config's docsRoots take precedence where both exist.",
    "paths.docs": "Documentation directory; default \"docs\". SessionStart exports it as CK_DOCS_PATH; no other in-repo reader. An unsafe relative path falls back to the default. Project layer.",
    "paths.plans": "Plans root; default \"plans\". Used by plan resolution, the reports path and CK_PLANS_PATH. docsRoots.plans.path in the project config wins when set; this is the fallback tier. May be absolute. Project layer.",
    "trust": "Trust-verification settings: enabled (default false) and passphrase (default null). No hook or script currently reads it. If used, keep the passphrase in .ck.local.json, not the committed file.",
    "project": "Project detection overrides: type, packageManager, framework, each default \"auto\". A non-auto value replaces SessionStart detection and is exported as CK_PROJECT_TYPE, CK_PACKAGE_MANAGER or CK_FRAMEWORK. Project layer.",
    "codeReview": "Review-rules settings (project layer): enabled, rulesPath, injectOnSkills. Freeform and validated only as an object; no hook or script reads it today. Review skills read the rules doc through the project reference-docs gate.",
    "subagent": "Per-agent context, documented as agents.<agentName>.contextPrefix (string). Freeform and validated only as an object; no hook or script in this framework currently reads it.",
    "referenceDocs": "Reference-doc freshness settings. Only sub-key: staleDays. Any layer; set it in the project file to share a team threshold.",
    "referenceDocs.staleDays": "Days after which a tracked reference doc counts as stale (1-365; default 60). SessionStart then records a non-blocking notice asking for /scan-all or a /scan-* skill; \"skip scan\" dismisses it for 7 days.",
    "promptLedger": "Settings for the prompt-ledger hook, which records each user prompt and re-anchors the original goal after compaction. On by default. Read from the project .ck.json overlaid per key by .ck.local.json; the global file is not read.",
    "promptLedger.enabled": "Records prompts and delivers goal reminders; default true. false (or \"0\", \"off\", \"false\", \"no\", \"disabled\"), or env CK_PROMPT_LEDGER=0, turns the hook off. .ck.local.json wins over .ck.json.",
    "promptLedger.maxPromptChars": "Characters stored per prompt before a truncation marker; default 4000, allowed 200-20000. Out-of-range values are clamped. Project or .ck.local.json layer.",
    "promptLedger.maxEntries": "Ledger entries kept per session; default 200, allowed 2-1000. The original request is never evicted; out-of-range values are clamped. Project or .ck.local.json layer.",
    "promptLedger.reinjectAfterBytes": "Transcript growth in bytes after which the goal reminder is delivered again; default 1000000, allowed 50000-1000000000, clamped. Project or .ck.local.json layer.",
    "promptLedger.reinjectAfterMinutes": "Minutes after which the reminder is delivered again when transcript size is unknown; default 45, allowed 1-1440, clamped. Project or .ck.local.json layer.",
    "commitSkillRoute": "Settings for the commit-skill-route prompt hook, which reminds the model to commit through the commit skill. Only sub-key: enabled. Read from the project .ck.json overlaid by .ck.local.json; the global file is not read.",
    "commitSkillRoute.enabled": "Turns the commit-skill reminder on or off; default true. false (or \"0\", \"off\", \"false\", \"no\", \"disabled\"), or env CK_COMMIT_SKILL_ROUTE=0, disables it. The commit review gate still applies. .ck.local.json wins.",
    "judgementIntegrityRoute": "Settings for the judgement-integrity-route prompt hook, which adds the judgement-integrity reminder to verdict, root-cause or gap-hunt prompts, and to sub-agent starts and compactions while the latest recorded prompt is one. Only sub-key: enabled. Project .ck.json overlaid by .ck.local.json.",
    "judgementIntegrityRoute.enabled": "Turns the judgement-integrity reminder on or off; default true. false (or \"0\", \"off\", \"false\", \"no\", \"disabled\"), or env CK_JUDGEMENT_INTEGRITY_ROUTE=0, disables it. .ck.local.json wins over .ck.json.",
    "aiFeatureRoute": "Settings for the ai-feature-route prompt hook, which adds ONE short AI-engineering directive (a single protocol pointer and the review route), once per session window, to prompts that ask to build, plan, change or review an AI feature (LLM calls, RAG, embeddings, tool use, guardrails), and to sub-agent starts and compactions while the latest recorded prompt is one; questions and prompts about the framework itself get nothing. Only sub-key: enabled. Project .ck.json overlaid by .ck.local.json.",
    "aiFeatureRoute.enabled": "Turns the AI-feature reminder on or off; default true. false (or \"0\", \"off\", \"false\", \"no\", \"disabled\"), or env CK_AI_FEATURE_ROUTE=0, disables it. The ai-feature-gate convention class still applies on AI-feature files. .ck.local.json wins over .ck.json.",
    "qualitySkillReminder": "Settings for the quality-skill-remind hook, which re-delivers a short digest after tool results (once per scope, again after about 150K tokens of growth or a compaction): reviews go to why-review, changes-review or workflow-review-changes, tests to the project's test skills, and failures or errors to investigate --mode=debug. Only sub-key: enabled. Project .ck.json overlaid by .ck.local.json.",
    "qualitySkillReminder.enabled": "Turns the quality-skill reminder on or off; default true. false (or \"0\", \"off\", \"false\", \"no\", \"disabled\"), or env CK_QUALITY_SKILL_REMINDER=0, disables it. The universal bundle still carries the quality-skill-routing protocol. .ck.local.json wins over .ck.json.",
    "corePrinciplesInject": "Settings for the core-principles-inject hook, which re-delivers the Easy to Change / Scale / Maintain gate (SYNC:core-engineering-principles) on prompts, task-step boundaries, sub-agent starts and right after a compaction. Sub-keys: enabled, reinjectAfterTokens. Project .ck.json overlaid by .ck.local.json.",
    "corePrinciplesInject.enabled": "Turns the core-principles reminder on or off; default true. false (or \"0\", \"off\", \"false\", \"no\", \"disabled\"), or env CK_CORE_PRINCIPLES_INJECT=0, disables it. The root instruction file still carries the principle. .ck.local.json wins over .ck.json.",
    "corePrinciplesInject.reinjectAfterTokens": "Approximate conversation tokens between two deliveries in one session scope; default 100000, integer 20000..2000000 (an out-of-range value uses the default). Compaction or a changed principle text re-delivers sooner.",
    "portability": "Portability boundary and routing settings. Locates the project config and docs index, and allows personal routing overrides. The workflow* keys belong in the project config for the team, and .ck.local.json overrides them for one developer.",
    "portability.enabled": "Portability-boundary switch; default true. A non-boolean value falls back to true. No hook or script currently reads it to change behavior.",
    "portability.rule": "Text for the generic portability boundary: reusable skills stay project-neutral. A blank value falls back to the built-in rule. It is used only by a shared prompt-text helper; no active hook reads it.",
    "portability.projectConfigPath": "Location of the project config file; default \"docs/project-config.json\". Read by the config loaders, sync scripts and routing resolvers. Some scripts read only the project .ck.json, so set it there, not only in global or local files.",
    "portability.docsIndexPath": "Full path to the docs-index file (default docs/project-reference/docs-index-reference.md; docsRoots.projectReference.path in docs/project-config.json moves its folder). An explicit value (.ck.local.json, then .ck.json, then global) wins over that folder.",
    "portability.workflowAutoDetect": "Legacy on/off form of workflowRouteMode: false reads as off, true as ask. workflowRouteMode wins when both are set in one file. The tracked project .ck.json is ignored; read from the project config, ~/.claude/.ck.json and .ck.local.json.",
    "portability.workflowRouteMode": "Your workflow route mode: ask (default; the workflow question is asked only when the model's route is to start a catalog workflow; direct and custom-simple routes ask nothing), auto (the same question, recommending the full workflow first) or off (nothing starts without an explicit request). Precedence, later wins: framework default, project config, ~/.claude/.ck.json (every project), .claude/.ck.local.json (this checkout), env CK_WORKFLOW_ROUTE_MODE. The tracked project .ck.json is ignored.",
    "portability.workflowRouteProtocol": "Extra route rules for the runtime route reminder: an inline string, or {text?, path?} where path is a repo-relative markdown file (truncated with a marker past 20000 characters). The team value is in the project config; a valid .ck.local.json value replaces it.",
    "portability.workflowRouteProtocol.text": "Inline markdown appended to the route reminder; used together with or instead of path.",
    "portability.workflowRouteProtocol.path": "Repo-relative markdown file read at runtime and appended to the route reminder; a sensitive-looking path (.env, keys, secrets) is refused and a file past 20000 characters is truncated with a marker.",
    "portability.workflowActivation": "Personal workflow activation tiers {default, overrides}. The team value is in the project config; in .ck.local.json, each valid local setting wins and overrides merge per workflow id. The project or global .ck.json value is ignored.",
    "portability.workflowActivation.default": "Minimum tier for every workflow: auto, confirm or manual. The effective tier is the stricter of this value and the framework tier, so it only tightens. No default when omitted. A valid .ck.local.json value wins over the project config.",
    "portability.workflowActivation.overrides": "Map of workflow id to auto, confirm or manual. An entry pins that workflow's tier, beating both default and the framework tier, so it can loosen. Entries in .ck.local.json merge per id over the project config; invalid tiers are ignored."
};

/** The help text for one field: its inline describe, else its entry in `map`, else ''. */
function describeField(map, fieldPath, fieldSchema) {
    const inline = fieldSchema && typeof fieldSchema.describe === 'string' ? fieldSchema.describe.trim() : '';
    return inline || (map && typeof map[fieldPath] === 'string' ? map[fieldPath] : '');
}

// Deep enough for every current schema; a guard against a self-referencing shape, not a limit on help.
const MAX_FIELD_DEPTH = 12;

/**
 * The fields directly under one schema entry, from every shape the validators accept:
 * `properties` as `key.child`, `itemSchema` as `key[].child`, `valueSchema` as `key{}`, and the
 * same three inside each `oneOf` alternative (listed under the same key, first shape wins).
 */
function nestedFields(key, fieldSchema) {
    const shapes = [fieldSchema, ...(Array.isArray(fieldSchema && fieldSchema.oneOf) ? fieldSchema.oneOf : [])];
    const out = new Map();
    for (const shape of shapes) {
        if (!shape || typeof shape !== 'object') continue;
        for (const [child, childSchema] of Object.entries(shape.properties || {})) out.set(`${key}.${child}`, childSchema);
        for (const [child, childSchema] of Object.entries(shape.itemSchema || {})) out.set(`${key}[].${child}`, childSchema);
        if (shape.valueSchema && typeof shape.valueSchema === 'object') out.set(`${key}{}`, shape.valueSchema);
    }
    return [...out].filter(([, childSchema]) => childSchema && typeof childSchema === 'object');
}

const isPrivate = fieldPath => fieldPath.split(/[.[\]{}]+/).some(part => part.startsWith('_'));

/**
 * Every field below `key` at any depth, as `{ key, schema }` rows in schema order.
 * Keys whose any segment starts with `_` (schema notes) are skipped with their subtree.
 */
function walkNestedFields(key, fieldSchema, depth = 1, out = []) {
    if (depth > MAX_FIELD_DEPTH) return out;
    for (const [childKey, childSchema] of nestedFields(key, fieldSchema)) {
        if (isPrivate(childKey)) continue;
        out.push({ key: childKey, schema: childSchema });
        walkNestedFields(childKey, childSchema, depth + 1, out);
    }
    return out;
}

/** Every field of a whole schema map (top-level keys first, each followed by its subtree). */
function walkSchemaFields(schemaMap) {
    const out = [];
    for (const [key, fieldSchema] of Object.entries(schemaMap || {})) {
        if (isPrivate(key) || !fieldSchema || typeof fieldSchema !== 'object') continue;
        out.push({ key, schema: fieldSchema });
        walkNestedFields(key, fieldSchema, 1, out);
    }
    return out;
}

module.exports = { PROJECT_CONFIG_DESCRIBES, CK_CONFIG_DESCRIBES, describeField, walkNestedFields, walkSchemaFields };
