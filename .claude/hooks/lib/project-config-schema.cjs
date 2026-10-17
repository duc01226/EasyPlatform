#!/usr/bin/env node
/**
 * Project Config Schema Validator
 *
 * Validates docs/project-config.json against the expected schema structure.
 * Prevents AI from accidentally changing the schema (adding/removing/renaming sections).
 *
 * Usage:
 *   const { validateConfig, SCHEMA } = require('./lib/project-config-schema.cjs');
 *   const result = validateConfig(config);
 *   // result = { valid: true, errors: [], warnings: [] }
 */
'use strict';

const {
    normalizeProjectRelativePath,
    validateReferenceDocDefinition
} = require('./project-reference-registry.cjs');
const { TASK_TRACKING_SCHEMA, validateTaskTracking } = require('./task-tracking-config.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

/** Workflow activation tiers, loosest first (auto < confirm < manual). */
const WORKFLOW_ACTIVATION_TIERS = ['auto', 'confirm', 'manual'];
/** Workflow route modes (ask = default). Lockstep with ROUTE_MODES in .claude/scripts/lib/workflow-routing-config.cjs. */
const WORKFLOW_ROUTE_MODES = ['ask', 'auto', 'off'];
/** hooks.tokenBudget.checkpointTokens inclusive range (non-cached tokens per advisory checkpoint). */
const TOKEN_BUDGET_CHECKPOINT_RANGE = [50000, 20000000];
/** skillProfile.preset values; the preset data lives in .claude/config/skill-profiles.json. */
const SKILL_PROFILE_PRESETS = ['full', 'standard', 'minimal'];
/** skillProfile per-skill lists, least to most restrictive. */
const SKILL_PROFILE_LISTS = ['nameOnly', 'commandOnly', 'off'];
/** A skill folder name usable as a skillOverrides key. */
const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Schema definition using a simple type system.
 * Types: 'string', 'number', 'array', 'object', 'map', 'arrayOf'
 * 'map' = object with string keys and regex-string values (e.g., serviceMap);
 *         `valuesEnum` restricts every value to one of the listed strings instead
 * 'arrayOf' = array of objects matching a sub-schema
 */
const SCHEMA = {
  frameworkRuntime: {
    type: "object",
    required: false,
    describe: "Framework on, quiet (no context injection; review checks remain), or off. Use framework-mode.cjs to reconcile Claude/Codex native skills too; personal settings never change tracked projections.",
    properties: {
      mode: { type: "string", required: false, enumValues: ["on", "quiet", "off"], describe: "Modes on, quiet, off (default on); later wins: project config, ~/.claude/.ck.json, checkout .claude/.ck.local.json, CK_FRAMEWORK_MODE. Hooks see changes immediately; run framework-mode.cjs apply for native skill changes, then start fresh sessions." },
    },
  },
    taskTracking: TASK_TRACKING_SCHEMA,
    _description: { type: 'string', required: false },
    schemaVersion: { type: 'number', required: false },
    project: {
        type: 'object',
        required: true,
        describe: 'Required project identity. Only name is mandatory; stack, architecture, testing, UI, and other capability sections may be omitted until the adopter needs them.',
        properties: {
            name: { type: 'string', required: true, describe: 'Non-empty human-readable project name.' },
            description: { type: 'string', required: false },
            languages: { type: 'array', required: false },
            packageManagers: { type: 'array', required: false },
            monorepoTool: { type: 'string', required: false }
        }
    },
    backendServices: {
        type: 'object',
        required: false,
        deprecated: true,
        properties: {
            patterns: {
                type: 'arrayOf',
                required: true,
                itemSchema: {
                    name: { type: 'string', required: true },
                    pathRegex: { type: 'string', required: true, isRegex: true },
                    description: { type: 'string', required: false }
                }
            },
            serviceMap: { type: 'map', required: true, valuesAreRegex: true },
            serviceRepositories: { type: 'map', required: true },
            serviceDomains: { type: 'map', required: true }
        }
    },
    frontendApps: {
        type: 'object',
        required: false,
        deprecated: true,
        properties: {
            patterns: {
                type: 'arrayOf',
                required: true,
                itemSchema: {
                    name: { type: 'string', required: true },
                    pathRegex: { type: 'string', required: true, isRegex: true },
                    description: { type: 'string', required: false }
                }
            },
            appMap: { type: 'map', required: true, valuesAreRegex: true },
            legacyApps: { type: 'array', required: true },
            modernApps: { type: 'array', required: true },
            frontendRegex: { type: 'string', required: true, isRegex: true },
            sharedLibRegex: { type: 'string', required: true, isRegex: true }
        }
    },
    designSystem: {
        type: 'object',
        required: false,
        describe: 'Optional design-system capability. Omit for projects with no maintained design system; UI work then follows platform accessibility and the project UI references.',
        properties: {
            docsPath: { type: 'string', required: true },
            modernUiNote: { type: 'string', required: false },
            appMappings: {
                type: 'arrayOf',
                required: true,
                itemSchema: {
                    name: { type: 'string', required: true },
                    pathRegexes: { type: 'array', required: true, itemsAreRegex: true },
                    docFile: { type: 'string', required: true },
                    description: { type: 'string', required: false },
                    quickTips: { type: 'array', required: false }
                }
            },
            canonicalDoc: { type: 'string', required: false },
            tokenFiles: { type: 'array', required: false }
        }
    },
    uiReview: {
        type: 'object',
        required: false,
        describe: 'Optional UI-review tuning. Omit to judge surface load by task and user expertise alone; declared budgets are project policy, never framework defaults.',
        properties: {
            complexityBudget: {
                type: 'object',
                required: false,
                describe: 'Project-declared heuristic ceilings a UI review compares against (design-review-checklist B15). Exceeding one is a finding only when the excess is not justified by the primary user and task.',
                properties: {
                    inputsPerStep: { type: 'number', required: false, describe: 'Maximum inputs shown in one step of an entry flow.' },
                    sectionsPerView: { type: 'number', required: false, describe: 'Maximum headed content or input sections in one view.' },
                    primaryActionsPerView: { type: 'number', required: false, describe: 'Maximum equal-weight actions competing in one view.' },
                    dialogInputs: { type: 'number', required: false, describe: 'Maximum inputs in a dialog before the task belongs in a full view or stepped flow (checklist E9).' }
                }
            },
            representativeSurfaces: { type: 'array', required: false, describe: 'Pages/views reviewed when a global style, theme, token, or shared primitive changes (checklist 0.5). Use route or view names the project recognizes.' }
        }
    },
    // Omitted profiles retain the existing business-spec / section-8 / TestSpec defaults.
    // The bounded, closed profile contract is owned by spec-artifact-profile.cjs.
    specArtifacts: {
        type: 'object',
        required: false,
        freeform: true,
        describe: 'Optional versioned native engineering-contract profile. Omit to retain business intent and legacy TC/TestSpec behavior; declared values are strictly validated.'
    },
    // Spec-system roots. Optional at the top level so existing project configs stay
    // valid, but every declared sub-object requires its `path` — a partially-declared
    // specRoots is a configuration error, not a permissive default.
    specRoots: {
        type: 'object',
        required: false,
        describe: 'Spec-system roots. Each declared sub-object requires its `path`; a\npartially-declared specRoots is a configuration error, not a default.',
        properties: {
            // `authorship` and `m1Policy` declare each tree's SEMANTICS, not just its
            // location: whether its content is hand-authored or generated, and whether
            // its prose may name technology (M1). The tech-spec skill cites both as the
            // basis for its M1 exemption, so they are declared here rather than left as
            // an unbacked claim in prose.
            business: {
                type: 'object',
                required: false,
                describe: 'Hand-authored business/feature spec tree (where /spec writes).',
                properties: {
                    path: { type: 'string', required: true, describe: 'Feature-spec dir, relative to repo root (e.g. "docs/specs").' },
                    authorship: { type: 'string', required: false, describe: 'Origin: "hand" (human-authored) for the business tree.' },
                    m1Policy: { type: 'string', required: false, describe: 'M1 prose policy: "strict" (no technology names in §1-7 prose).' }
                }
            },
            technical: {
                type: 'object',
                required: false,
                describe: 'Generated technical spec tree (projected from code/tests by /tech-spec; never hand-edited).',
                properties: {
                    path: { type: 'string', required: true, describe: 'Derived-view dir, relative to repo root (e.g. "docs/tech-specs").' },
                    authorship: { type: 'string', required: false, describe: 'Origin: "derived" (generated) for the technical tree.' },
                    m1Policy: { type: 'string', required: false, describe: 'M1 policy: "exempt" — naming code in a generated projection is the point, not a leak.' }
                }
            }
        }
    },
    // Relocatable documentation roots, sibling to `specRoots` and copying its shape
    // exactly. Optional at the top level so every existing project config stays valid,
    // but every declared sub-object requires its `path` — a partially-declared docsRoots
    // is a configuration error, not a permissive default. Absent = the framework default;
    // declared-but-invalid = an error, the same asymmetry the tech-spec generator enforces
    // by throwing rather than defaulting.
    docsRoots: {
        type: 'object',
        required: false,
        describe: 'Relocatable documentation roots (paths relative to the repo root). Each declared\nsub-object requires its `path`; a partially-declared docsRoots is a configuration\nerror, not a default. Omit a sub-object entirely to keep the framework default.',
        properties: {
            projectReference: {
                type: 'object',
                required: false,
                describe: 'Generated project-reference doc tree (where /scan writes). Default "docs/project-reference".',
                properties: {
                    path: { type: 'string', required: true, describe: 'Reference-doc dir, relative to repo root (e.g. "docs/project-reference").' }
                }
            },
            adr: {
                type: 'object',
                required: false,
                describe: 'Architecture Decision Record tree. Default "docs/adr".',
                properties: {
                    path: { type: 'string', required: true, describe: 'ADR dir, relative to repo root (e.g. "docs/adr").' }
                }
            },
            templates: {
                type: 'object',
                required: false,
                describe: 'Document template tree. Default "docs/templates".',
                properties: {
                    path: { type: 'string', required: true, describe: 'Template dir, relative to repo root (e.g. "docs/templates").' }
                }
            },
            plans: {
                type: 'object',
                required: false,
                describe: 'Implementation-plan tree (where /plan writes). Default "plans".',
                properties: {
                    path: { type: 'string', required: true, describe: 'Plan dir, relative to repo root (e.g. "plans").' }
                }
            },
            teamArtifacts: {
                type: 'object',
                required: false,
                describe: 'Team artifact tree (initiatives, tasks, stories). Default "team-artifacts".',
                properties: {
                    path: { type: 'string', required: true, describe: 'Team-artifact dir, relative to repo root (e.g. "team-artifacts").' }
                }
            },
            productRoadmap: {
                type: 'object',
                required: false,
                describe: 'Product roadmap document. Default "docs/product-roadmap.md" — a FILE, not a dir.',
                properties: {
                    path: { type: 'string', required: true, describe: 'Roadmap file path, relative to repo root (e.g. "docs/product-roadmap.md").' }
                }
            }
        }
    },
    // Free-text rationale for a DELIBERATE `techSpecScan` omission, so the absence
    // reads as a decision rather than an oversight to the next maintainer.
    _techSpecScanNote: { type: 'string', required: false, describe: 'Free-text rationale for a DELIBERATE techSpecScan omission, so the absence\nreads as a decision, not an oversight. Set this INSTEAD of techSpecScan when\nthe project has no spec-annotation convention.' },
    // How the tech-spec generator discovers annotated tests. Optional: a project whose
    // stack has no such annotation convention simply omits this, and the generator exits
    // non-zero naming the missing key rather than silently reporting zero annotations.
    //
    // CONTRACT — `annotationPattern` MUST expose exactly two capture groups, in order:
    //   group 1 = trait name, which MUST be `TestSpec` or `TechnicalSpec`
    //   group 2 = the spec id, which MUST be non-empty
    // The generator validates both at parse time and refuses to run on a mismatch. This
    // is enforced BEFORE any derived output is deleted — a pattern whose captures don't
    // match would otherwise fail only after the old output was already removed.
    techSpecScan: {
        type: 'object',
        required: false,
        describe: 'Enables /tech-spec generation — how it discovers annotated tests. Populate\nthis for any project that wants derived technical specs; omit it (and set\n_techSpecScanNote) ONLY if the stack has no spec-annotation convention.',
        properties: {
            sourceRoot: { type: 'string', required: true, describe: 'Primary source dir the generator scans, relative to repo root (e.g. "src").' },
            fileExtensions: { type: 'array', required: true, describe: 'Source-language extensions to scan (e.g. [".cs"] | [".ts"] | [".java"]).' },
            annotationPattern: { type: 'string', required: true, isRegex: true, describe: 'Regex matching THIS project\'s spec annotation. CONTRACT: exactly two capture\ngroups — group 1 = trait name (MUST be TestSpec or TechnicalSpec), group 2 =\nthe non-empty spec id. Validated at parse time; generator refuses on mismatch.' }
        }
    },
    scss: {
        type: 'object',
        required: false,
        deprecated: true,
        properties: {
            appMap: { type: 'map', required: true, valuesAreRegex: true },
            patterns: {
                type: 'arrayOf',
                required: true,
                itemSchema: {
                    name: { type: 'string', required: true },
                    pathRegexes: { type: 'array', required: true, itemsAreRegex: true },
                    description: { type: 'string', required: false },
                    scssExamples: { type: 'array', required: false }
                }
            }
        }
    },
    componentFinder: {
        type: 'object',
        required: false,
        deprecated: true,
        properties: {
            selectorPrefixes: { type: 'array', required: true },
            layerClassification: { type: 'map', required: true }
        }
    },
    sharedNamespace: { type: 'string', required: false, deprecated: true },
    modules: {
        type: 'arrayOf',
        required: false,
        itemSchema: {
            name: { type: 'string', required: true },
            kind: { type: 'string', required: true },
            pathRegex: { type: 'string', required: true, isRegex: true },
            description: { type: 'string', required: false },
            tags: { type: 'array', required: false },
            meta: { type: 'object', required: false, freeform: true }
        }
    },
    contextGroups: {
        type: 'arrayOf',
        required: false,
        describe: 'Per-file convention classes: member = fileExtensions ok AND any include (pathRegexes|pathGlobs|fileNameRegexes, or a contentRegexes match in a contentExtensions file) AND no exclude; priority 100/500/900.\n' +
            'Groups with rules|skills|referenceDocs|guideDoc|patternsDoc are rendered in CLAUDE.md and delivered by the hook; detect: node .claude/hooks/lib/convention-merge.cjs --detect\n' +
            'Per-group trigger `on`: read | edit | both (default both); `edit` delivers the group on edits only, never on plain reads.',
        itemSchema: {
            name: { type: 'string', required: true, describe: 'Unique class name (kebab-case); also the convention tag name.' },
            pathRegexes: { type: 'array', required: true, itemsAreRegex: true, describe: 'Case-insensitive regexes tested against "/" + repo-relative forward-slash path; may be [] when pathGlobs or fileNameRegexes is set.' },
            pathGlobs: { type: 'array', required: false, describe: 'Repo-relative globs (** any segments, * within a segment, ? one char; case-insensitive, anchored).' },
            fileNameRegexes: { type: 'array', required: false, itemsAreRegex: true, describe: 'Case-insensitive regexes tested against the file base name only.' },
            excludePathRegexes: { type: 'array', required: false, itemsAreRegex: true, describe: 'Regexes (same path form as pathRegexes) that remove a file from this group.' },
            excludePathGlobs: { type: 'array', required: false, describe: 'Globs that remove a file from this group.' },
            fileExtensions: { type: 'array', required: false },
            contentRegexes: { type: 'array', required: false, itemsAreRegex: true, describe: 'Content signals: case-insensitive regexes tested against the first 64 KiB of a file (files over 2 MiB, binary or unreadable files never match). A file matches when its extension is in contentExtensions and any regex matches, as an alternative to a path include. At most 64 regexes of up to 500 characters; needs contentExtensions. A best-effort lint rejects well-known slow shapes: back-references, a repeated group containing an open-ended repetition, an alternation with overlapping starts under repetition, back-to-back open-ended repetitions, or more than 10 optional elements. Regexes other than the framework built-ins see only the first 16 KiB and run under a hard time budget (a timeout counts as no match).' },
            contentExtensions: { type: 'array', required: false, describe: 'Extensions (leading dot optional, case-insensitive) of the text/code files that are content-scanned for contentRegexes; at most 64. Files of other extensions match by path and name only.' },
            contentLabel: { type: 'string', required: false, describe: 'Short human label for the content signals (up to 80 characters), shown in the generated Automatic Skill Activation table, e.g. "AI SDK use".' },
            priority: { type: 'number', required: false, describe: 'Precedence rank, lower first and wins on conflict. Bands: 100 specific, 500 default, 900 general.' },
            guideDoc: { type: 'string', required: false },
            patternsDoc: { type: 'string', required: false },
            stylingDoc: { type: 'string', required: false },
            designSystemDoc: { type: 'string', required: false },
            rules: { type: 'array', required: false, describe: 'Short, checkable rules injected verbatim (keep each under ~120 chars).' },
            skills: { type: 'array', required: false, describe: 'Skill names whose SKILL.md protocol applies when editing these files.' },
            referenceDocs: { type: 'array', required: false, describe: 'Repo-relative docs the AI must read before editing these files.' },
            reinjectAfterTokens: { type: 'number', required: false, describe: 'Class re-arm distance in conversation tokens (20000..2000000; x22 transcript bytes per token). Omit to use conventionInjection.reinjectAfterBytes.' },
            evidenceDocs: { type: 'array', required: false, describe: 'Repo-relative docs whose Read (ALL of them) inside the class window counts as the class being present — no digest re-delivered.' },
            evidenceSkills: { type: 'array', required: false, describe: 'Skill names whose load (ANY of them) inside the class window counts as the class being present — they carry the protocol inline.' },
            origin: { type: 'string', required: false, describe: '"detected" (written by setup detection; may be refreshed while unedited) or "user" (never touched by setup).' },
            detectedFingerprint: { type: 'string', required: false, describe: 'Setup-owned fingerprint of the detected content; a mismatch marks the group as user-edited.' },
            on: {
                type: 'string',
                required: false,
                enumValues: ['read', 'edit', 'both'],
                describe: 'Which file operation delivers this group: read, edit, or both (default both).'
            }
        }
    },
    conventionInjection: {
        type: 'object',
        required: false,
        describe: 'Opt-in hook delivery of contextGroups (absent/enabled:false => off). Ranges: maxChars 500..10000 (4000), maxClassesPerEdit 1..10 (4), reinjectAfterBytes >=4500000 (4500000), reinjectAfterMinutes 1..1440 (30), blindReinjectAfterMinutes 1..1440 (5), onRead (true).',
        properties: {
            enabled: { type: 'boolean', required: false },
            maxChars: { type: 'number', required: false },
            maxClassesPerEdit: { type: 'number', required: false },
            reinjectAfterBytes: { type: 'number', required: false },
            reinjectAfterMinutes: { type: 'number', required: false },
            blindReinjectAfterMinutes: { type: 'number', required: false },
            onRead: { type: 'boolean', required: false },
            completeLookup: { type: 'boolean', required: false, describe: 'Require complete paged pre-action lookup of all matching classes. With inlinePathRules:false, replaces full root rules/table only when the generator supports complete lookup; bounded automatic reminders remain accelerators.' },
            compactionMarkers: { type: 'array', required: false, itemsAreRegex: true }
        }
    },
    styling: {
        type: 'object',
        required: false,
        properties: {
            technology: { type: 'string', required: false },
            fileExtensions: { type: 'array', required: false },
            guideDoc: { type: 'string', required: false },
            appMap: { type: 'map', required: false, valuesAreRegex: true },
            patterns: {
                type: 'arrayOf',
                required: false,
                itemSchema: {
                    name: { type: 'string', required: true },
                    pathRegexes: { type: 'array', required: true, itemsAreRegex: true },
                    description: { type: 'string', required: false },
                    scssExamples: { type: 'array', required: false }
                }
            }
        }
    },
    componentSystem: {
        type: 'object',
        required: false,
        properties: {
            type: { type: 'string', required: false },
            selectorPrefixes: { type: 'array', required: false },
            filePattern: { type: 'string', required: false },
            layerClassification: { type: 'map', required: false }
        }
    },
    formatting: {
        type: 'object',
        required: false,
        properties: {
            // Preset id the post-edit formatter hook uses (`prettier` default,
            // `biome`, or `none` to disable). Absent -> framework default (prettier).
            formatter: { type: 'string', required: false },
            // Explicit command template; `{file}` is replaced with the path.
            // Overrides `formatter` when set.
            command: { type: 'string', required: false },
            // Extra CLI args inserted before the file path.
            args: { type: 'array', required: false, itemType: 'string' },
            // Extensions to format; defaults to the resolved preset's own set.
            fileExtensions: { type: 'array', required: false },
            // Extra path substrings (treated literally) to skip on edit.
            skipPaths: { type: 'array', required: false }
        }
    },
    framework: {
        type: 'object',
        required: false,
        describe: 'Optional stack and pattern metadata. Omit when the project has no single application framework or when this information is not yet known; configured consumers use neutral defaults.',
        properties: {
            name: { type: 'string', required: true },
            backendPatternsDoc: { type: 'string', required: false },
            frontendPatternsDoc: { type: 'string', required: false },
            codeReviewDoc: { type: 'string', required: false },
            integrationTestDoc: { type: 'string', required: false },
            performanceTestDoc: { type: 'string', required: false, describe: 'Optional repo-relative performance-test preference guide. Feeds configured performance file conventions and the capability-based default reference selection; an explicit referenceDocs array remains exact.' },
            e2eTestDoc: { type: 'string', required: false },
            searchPatternKeywords: { type: 'array', required: false }
        }
    },
    testing: {
        type: 'object',
        required: false,
        properties: {
            frameworks: { type: 'array', required: false },
            filePatterns: { type: 'map', required: false },
            commands: { type: 'map', required: false },
            commandsNote: { type: 'string', required: false },
            coverageTool: { type: 'string', required: false },
            guideDoc: { type: 'string', required: false },
            integrationRules: { type: 'array', required: false, itemType: 'string' }
        }
    },
    e2eTesting: {
        type: 'object',
        required: false,
        properties: {
            framework: { type: 'string', required: false },
            language: { type: 'string', required: false },
            configFile: { type: 'string', required: false },
            platformProject: { type: 'string', required: false },
            sharedProject: { type: 'string', required: false },
            bddProject: { type: 'string', required: false },
            nonBddProject: { type: 'string', required: false },
            testsPath: { type: 'string', required: false },
            pageObjectsPath: { type: 'string', required: false },
            fixturesPath: { type: 'string', required: false },
            guideDoc: { type: 'string', required: false },
            configFiles: { type: 'array', required: false },
            testSpecsDocs: { type: 'array', required: false },
            searchPatterns: { type: 'array', required: false },
            runCommands: { type: 'map', required: false },
            tcCodeFormat: { type: 'string', required: false },
            featureAreas: { type: 'array', required: false },
            stats: { type: 'object', required: false, freeform: true },
            dependencies: { type: 'object', required: false, freeform: true },
            architecture: { type: 'object', required: false, freeform: true },
            bestPractices: { type: 'array', required: false },
            entryPoints: { type: 'array', required: false },
            execution: {
                type: 'object',
                required: false,
                describe: 'Optional E2E execution profile. Link surfaceIds to experienceVerification.surfaces; keep startup/readiness in each surface localRun recipe. Missing facts are discovered or reported ENVIRONMENT-BLOCKED, never invented.',
                properties: {
                    surfaceIds: { type: 'array', required: false, itemType: 'string', describe: 'IDs of observable surfaces exercised by E2E. Resolve lifecycle commands through the matching experienceVerification surface.' },
                    auth: {
                        type: 'object',
                        required: false,
                        describe: 'Authentication strategy. Store references only; never put passwords, tokens, cookies, or storage-state contents in project-config.json.',
                        properties: {
                            mode: { type: 'string', required: false, describe: 'One of fixture, storage-state, registration, manual, or none.' },
                            credentialsRef: { type: 'string', required: false, describe: 'Reference to a local fixture identity or secret-manager/env source; never the secret value.' },
                            storageStateRef: { type: 'string', required: false, describe: 'Reference/path to a project-owned browser storage-state artifact; never its JSON contents.' },
                            loginPath: { type: 'string', required: false, describe: 'Observed application login route when a real login journey is required.' },
                            registrationCommand: { type: 'string', required: false, describe: 'Project-owned registration/setup command only when the repository proves it is safe and repeatable; inline credential arguments are warned, so use environment or fixture references.' }
                        }
                    },
                    data: {
                        type: 'object',
                        required: false,
                        describe: 'Seed/reference-data strategy. Prefer idempotent or additive public-path setup and never reset shared state.',
                        properties: {
                            seedCommand: { type: 'string', required: false, describe: 'Project-defined seed or fixture command; missing capability blocks E2E rather than receiving a guessed command; inline credential arguments are warned, so use environment or fixture references.' },
                            workingDir: { type: 'string', required: false, describe: 'Project-relative directory for the seed command.' },
                            mode: { type: 'string', required: false, describe: 'One of reference-only, idempotent, or additive.' },
                            cleanupPolicy: { type: 'string', required: false, describe: 'Project-defined cleanup policy; cleanup may remove only current-run ephemeral data after evidence capture.' }
                        }
                    },
                    browser: {
                        type: 'object',
                        required: false,
                        describe: 'Optional browser runner, visibility, and action-pacing settings. Use runner-native readiness waits. Configure post-action pacing only when the project has a documented need; it never substitutes for a settle signal.',
                        properties: {
                            runner: { type: 'string', required: false, describe: 'Project-configured browser runner hint, such as playwright-cli; do not infer a dependency from this field alone.' },
                            engine: { type: 'string', required: false, describe: 'Project-configured browser engine or target, such as chromium.' },
                            headed: { type: 'boolean', required: false, describe: 'Whether the browser is visible to the user during human-QC execution.' },
                            actionDelayMs: { type: 'number', required: false, describe: 'Optional non-negative post-action delay in milliseconds for a documented project presentation/pacing need. Omit or set 0 when no delay is needed; never use it as a readiness or settle substitute.' }
                        }
                    },
                    evidence: {
                        type: 'object',
                        required: false,
                        describe: 'Evidence capture and redaction settings. Captures are sensitive by default and must be read, redacted, and retained under a project-owned path.',
                        properties: {
                            root: { type: 'string', required: false, describe: 'Project-relative disposable candidate-evidence root; use tmp/ or temp/ unless explicitly versioned.' },
                            capture: { type: 'array', required: false, itemType: 'string', describe: 'Capture kinds: screenshot, console, requests, trace, or video.' },
                            redaction: { type: 'string', required: false, describe: 'Project-defined redaction rule/tool reference; never a secret value.' },
                            uiStateCapture: {
                                type: 'object',
                                required: false,
                                describe: 'Optional visual UI-state capture. Transition capture is opt-in and requires an evidenced shared action boundary; declared state/viewport captures use the configured runner. Contract: .claude/skills/shared/ui-state-capture-protocol.md',
                                properties: {
                                    mode: { type: 'string', required: false, describe: 'One of every-action, declared-only, or off. Default declared-only; every-action must be selected only when a verified shared action boundary can emit transition captures.' },
                                    helper: { type: 'string', required: false, describe: 'Project-relative path/symbol of a capture integration at an evidenced shared action boundary (for example a fixture, helper, wrapper, action primitive, or page object); discover it from source.' },
                                    manifestPath: { type: 'string', required: false, describe: 'Project-relative capture-manifest.json path under the disposable evidence root; one row per capture including deduped and capped rows.' },
                                    maxPerTest: { type: 'number', required: false, describe: 'Positive bounded per-test capture cap; reaching it records an escalation naming the untaken captures, never a silent truncation.' },
                                    maxPerRun: { type: 'number', required: false, describe: 'Positive bounded per-run capture cap; reaching it records an escalation naming the untaken captures, never a silent truncation.' },
                                    fullPageWhenScrollable: { type: 'boolean', required: false, describe: 'Capture full-page in addition to viewport wherever the surface scrolls; a viewport-only capture hides the overflow defects this capture set exists to find.' },
                                    maskSelectors: { type: 'array', required: false, itemType: 'string', describe: 'Selectors for volatile regions (clocks, GUIDs, avatars) masked so an unchanged UI yields an unchanged image.' }
                                }
                            }
                        }
                    },
                    convergence: {
                        type: 'object',
                        required: false,
                        describe: 'Bounded verify/fix loop controls. A cap or missing capability produces an escalation, never an infinite retry.',
                        properties: {
                            maxAttempts: { type: 'number', required: false, describe: 'Positive bounded maximum remediation attempts.' },
                            consecutiveGreen: { type: 'number', required: false, describe: 'Fresh consecutive green runs required before E2E convergence (default 1; two consecutive runs are the integration-test rule).' },
                            settleTimeoutSeconds: { type: 'number', required: false, describe: 'Positive bounded timeout for observable readiness/settle signals.' }
                        }
                    }
                }
            }
        }
    },
    experienceVerification: {
        type: 'object',
        required: false,
        describe: 'Optional evidence contract for user-facing or externally observable surfaces. Configure only what the project can actually run and inspect; missing capability is recorded as ENVIRONMENT-BLOCKED, never as a successful check.',
        properties: {
            enabled: { type: 'boolean', required: true, describe: 'Enable conditional experience-review routing for configured surfaces.' },
            evidenceRoot: { type: 'string', required: true, describe: 'Project-relative disposable report/candidate-evidence root; use a project-root tmp/ or temp/ path unless the owning contract explicitly declares a versioned output.' },
            baselineRoot: { type: 'string', required: true, describe: 'Expected-baseline root, changed only through explicit acceptance outside automatic comparison.' },
            acceptancePolicy: { type: 'string', required: true, describe: 'Keep manual-acceptance-required unless the project documents a stricter named owner process.' },
            reviewOn: { type: 'array', required: false, itemType: 'string', describe: 'Impact triggers such as new-surface, changed-surface, bugfix, or baseline-mismatch.' },
            surfaces: {
                type: 'arrayOf',
                required: true,
                itemSchema: {
                    id: { type: 'string', required: true },
                    kind: { type: 'string', required: true },
                    runner: { type: 'string', required: true },
                    entryPoints: { type: 'array', required: true },
                    changeTriggers: { type: 'array', required: false },
                    fullCommand: { type: 'string', required: false },
                    focusedCommand: { type: 'string', required: false },
                    evidenceRoot: { type: 'string', required: false },
                    baselineRoot: { type: 'string', required: false },
                    states: { type: 'array', required: false },
                    localRun: {
                        type: 'object',
                        required: false,
                        describe: 'How this surface is brought up as a WHOLE running system on a developer machine, so a review can exercise it the way a person would instead of reading source. Record only commands the project actually has; a missing command is ENVIRONMENT-BLOCKED at review time, never an assumed default.',
                        properties: {
                            dependencyCommand: { type: 'string', required: false, describe: 'Command that starts the backing services this surface needs before the app itself (database, broker, cache, emulator, stub).' },
                            startCommand: { type: 'string', required: false, describe: 'Command that starts the surface itself. Long-running: the reviewer runs it in the background and tears it down afterwards.' },
                            workingDir: { type: 'string', required: false, describe: 'Directory the start/dependency commands run from, relative to the project root, when it is not the root.' },
                            readyCheck: { type: 'string', required: false, describe: 'Observable readiness signal — a health command/URL to poll or a log line to wait for. Readiness is polled, never assumed from a sleep or from process start.' },
                            readyTimeoutSeconds: { type: 'number', required: false, describe: 'How long readiness may take before the surface is recorded ENVIRONMENT-BLOCKED.' },
                            teardownCommand: { type: 'string', required: false, describe: 'Command that stops what startCommand/dependencyCommand started, so a review leaves no running process behind.' },
                            logSources: { type: 'array', required: false, itemType: 'string', describe: 'Runtime log channels to capture and read besides the surface itself — log file paths or container/service log commands. Browser console/page-error capture is inherent to a web surface and needs no entry.' },
                            credentialsRef: { type: 'string', required: false, describe: 'Pointer to the local fixture identity or credential source used to sign in (env var name, secret-manager key, setup doc). NEVER the secret value itself.' }
                        }
                    },
                    notes: { type: 'string', required: false }
                }
            },
            notApplicableReason: { type: 'string', required: false, describe: 'Evidence-backed reason when this repository has no applicable observable surface or the block is intentionally disabled.' }
        }
    },
    databases: { type: 'object', required: false, freeform: true },
    messaging: {
        type: 'object',
        required: false,
        properties: {
            broker: { type: 'string', required: false },
            patterns: { type: 'array', required: false },
            consumerConvention: { type: 'string', required: false }
        }
    },
    api: {
        type: 'object',
        required: false,
        properties: {
            style: { type: 'string', required: false },
            docsFormat: { type: 'string', required: false },
            docsPath: { type: 'string', required: false },
            authPattern: { type: 'string', required: false }
        }
    },
    infrastructure: {
        type: 'object',
        required: false,
        properties: {
            containerization: { type: 'string', required: false },
            orchestration: { type: 'string', required: false },
            cicd: {
                type: 'object',
                required: false,
                properties: {
                    tool: { type: 'string', required: false },
                    provider: { type: 'string', required: false },
                    configPath: { type: 'string', required: false },
                    environments: { type: 'array', required: false }
                }
            },
            iac: {
                type: 'object',
                required: false,
                properties: {
                    tool: { type: 'string', required: false },
                    configPath: { type: 'string', required: false }
                }
            }
        }
    },
    referenceDocs: {
        type: 'arrayOf',
        required: false,
        itemSchema: {
            filename: { type: 'string', required: true },
            purpose: { type: 'string', required: true },
            sections: { type: 'array', required: false },
            templatePath: { type: 'string', required: false },
            scanTarget: { type: 'string', required: false, describe: 'Optional custom-doc owner: generic for an evidence-based scan, manual for curated project ownership. Built-in docs keep their framework-owned target.' },
            notApplicable: { type: 'boolean', required: false, describe: 'True when this stack/doc does not apply to the project; generated root context names it once as N/A and never routes agents to it, and the freshness check never reports it as stale. A purpose that starts with, or parenthesizes, "N/A" / "Not applicable" is read the same way.' }
        }
    },
    graphConnectors: {
        type: 'object',
        required: false,
        properties: {
            apiEndpoints: {
                type: 'object',
                required: false,
                properties: {
                    enabled: { type: 'boolean', required: false },
                    frontend: {
                        type: 'object',
                        required: false,
                        properties: {
                            framework: { type: 'string', required: true },
                            paths: { type: 'array', required: true },
                            customPatterns: { type: 'array', required: false }
                        }
                    },
                    backend: {
                        type: 'object',
                        required: false,
                        properties: {
                            framework: { type: 'string', required: true },
                            paths: { type: 'array', required: true },
                            routePrefix: { type: 'string', required: false },
                            customPatterns: { type: 'array', required: false }
                        }
                    }
                }
            },
            implicitConnections: {
                type: 'arrayOf',
                required: false,
                itemSchema: {
                    name: { type: 'string', required: true },
                    description: { type: 'string', required: false },
                    edgeKind: { type: 'string', required: true },
                    paths: { type: 'array', required: false },
                    source: {
                        type: 'object',
                        required: true,
                        properties: {
                            filePattern: { type: 'string', required: false },
                            filePatterns: { type: 'array', required: false },
                            contentPattern: { type: 'string', required: false },
                            pathPattern: { type: 'string', required: false },
                            keyGroup: { type: 'number', required: false },
                            paths: { type: 'array', required: false }
                        }
                    },
                    target: {
                        type: 'object',
                        required: true,
                        properties: {
                            filePattern: { type: 'string', required: false },
                            filePatterns: { type: 'array', required: false },
                            contentPattern: { type: 'string', required: false },
                            pathPattern: { type: 'string', required: false },
                            keyGroup: { type: 'number', required: false },
                            paths: { type: 'array', required: false }
                        }
                    },
                    matchBy: { type: 'string', required: true }
                }
            }
        }
    },
    architectureRules: {
        type: 'object',
        required: false,
        properties: {
            layerBoundaries: {
                type: 'arrayOf',
                required: false,
                itemSchema: {
                    layer: { type: 'string', required: true },
                    paths: { type: 'array', required: true },
                    cannotImportFrom: { type: 'array', required: true }
                }
            },
            excludePatterns: { type: 'array', required: false }
        }
    },
    codebaseHealth: {
        type: 'object',
        required: false,
        properties: {
            sourcePaths: { type: 'array', required: false },
            docPaths: { type: 'array', required: false },
            configPatterns: { type: 'array', required: false },
            excludePaths: { type: 'array', required: false }
        }
    },
    integrationTestVerify: {
        type: 'object',
        required: false,
        properties: {
            guidance: { type: 'string', required: false },
            referenceDocs: { type: 'array', required: false, itemType: 'string' },
            runScript: { type: 'string', required: false },
            startupScript: { type: 'string', required: false },
            quickRunCommand: { type: 'string', required: false },
            systemCheckCommand: { type: 'string', required: false },
            testProjectPattern: { type: 'string', required: false },
            testProjects: { type: 'array', required: false }
        }
    },
    workflowPatterns: {
        type: 'object',
        required: false,
        properties: {
            _description: { type: 'string', required: false },
            architectureStyle: { type: 'string', required: false },
            codeHierarchy: { type: 'string', required: false },
            cssMethodology: { type: 'string', required: false },
            stateManagement: { type: 'string', required: false },
            crossModuleValidation: { type: 'string', required: false },
            featureDocTemplate: { type: 'string', required: false },
            reviewRulesDoc: { type: 'string', required: false },
            docSyncGate: {
                type: 'object',
                required: false,
                properties: {
                    enabled: { type: 'boolean', required: false },
                    enforcedAreas: {
                        type: 'arrayOf', required: false,
                        itemSchema: {
                            name: { type: 'string', required: true },
                            codePathPrefixes: { type: 'array', required: true, itemType: 'string' },
                            graceDays: { type: 'number', required: false }
                        }
                    }
                }
            }
        }
    },
    localization: {
        type: 'object',
        required: false,
        properties: {
            enabled: { type: 'boolean', required: false },
            supportedLocales: { type: 'array', required: false },
            defaultLocale: { type: 'string', required: false },
            translationFilePatterns: { type: 'array', required: false, itemsAreRegex: true },
            uiPathPatterns: { type: 'array', required: false, itemsAreRegex: true }
        }
    },
    portability: {
        type: 'object',
        required: false,
        properties: {
            // Legacy on/off form of the workflow route mode: false means off, true means ask. Default true.
            // The per-person `workflowRouteMode` (below) is the current form and wins when both are set.
            workflowAutoDetect: { type: 'boolean', required: false },
            // The team default for the per-person workflow route mode: ask (default) | auto | off. A person
            // overrides it in ~/.claude/.ck.json, git-ignored .claude/.ck.local.json or env CK_WORKFLOW_ROUTE_MODE.
            workflowRouteMode: {
                type: 'string',
                required: false,
                enumValues: WORKFLOW_ROUTE_MODES,
                describe: 'Team default for the workflow route mode: ask (default; the workflow question is asked only when the route is to start a catalog workflow; direct and custom-simple routes ask nothing) | auto (the same question, recommending the full workflow first) | off (no workflow is started without an explicit request). A person overrides it in ~/.claude/.ck.json, .claude/.ck.local.json or env CK_WORKFLOW_ROUTE_MODE.'
            },
            skillAutoTrigger: {
                type: 'boolean',
                required: false,
                describe: 'Default true. false asks whether to run a suitable matched framework skill or skip it and execute directly; no match proceeds directly. Commit, pull-request and lightweight framework-config help keep normal triggers. Named user requests, hook-required calls and required steps of an authorized skill remain allowed. Runtime prompt policy, not a host permission block. Personal overrides: ~/.claude/.ck.json, .claude/.ck.local.json, CK_SKILL_AUTO_TRIGGER.'
            },
            // false = the generated golden-rules section names each context group and points to the
            // file-conventions hook + `--lookup` CLI instead of inlining every rule (root byte budget).
            // Complete lookup support can replace the legacy cap/size proof below. Otherwise honored only with conventionInjection.enabled: true, the conventions lib available and every
            // rule-bearing group ranked within maxClassesPerEdit with a worst-case digest within maxChars;
            // otherwise rules stay inline and the generator warns. Default true.
            inlinePathRules: { type: 'boolean', required: false },
            // Optional custom protocol appended to the runtime workflow-route reminder on
            // UserPromptSubmit. A string is inline markdown; an object carries inline `text`
            // and/or a repo-relative `path` to a markdown file read at runtime. The value here
            // is team-shared; a developer may override it in git-ignored `.claude/.ck.local.json`
            // (local replaces team). Runtime-only: it is never stamped into tracked
            // CLAUDE.md/AGENTS.md/Codex context, which stay team-owned.
            workflowRouteProtocol: {
                type: 'union',
                required: false,
                describe: 'Optional custom workflow-route protocol appended to the runtime route reminder. Inline string, or an object { text?, path? } where `path` is a repo-relative markdown file read at runtime. Team value lives here; a developer overrides it in git-ignored .claude/.ck.local.json (local replaces team). Never stamped into tracked context.',
                oneOf: [
                    { type: 'string' },
                    {
                        type: 'object',
                        properties: {
                            text: { type: 'string', required: false },
                            path: { type: 'string', required: false }
                        }
                    }
                ]
            },
            // Per-project workflow activation tier. Tier order auto < confirm < manual.
            // `default` only tightens a workflow's framework tier; `overrides` pin one workflow's
            // tier and may loosen it. Omitted = every workflow keeps its framework tier.
            // A developer may override it in git-ignored `.claude/.ck.local.json` (local wins).
            workflowActivation: {
                type: 'object',
                required: false,
                describe: 'Workflow activation tiers (auto < confirm < manual). default: floor raised onto every workflow\'s framework tier (only tightens); overrides: { <workflowId>: tier } pins one workflow and may loosen it. Omitted = framework tiers. Local override: .claude/.ck.local.json.',
                properties: {
                    default: {
                        type: 'string',
                        required: false,
                        enumValues: WORKFLOW_ACTIVATION_TIERS,
                        describe: 'Minimum tier for every workflow: auto | confirm | manual. Omitted = framework tiers unchanged.'
                    },
                    overrides: {
                        type: 'map',
                        required: false,
                        valuesEnum: WORKFLOW_ACTIVATION_TIERS,
                        describe: 'Map of workflow id -> tier (auto | confirm | manual); wins over default and the framework tier.'
                    }
                }
            },
            // The root package.json `name` that marks this repo as carrying the framework's own
            // npm surface. Read by .claude/scripts/codex/tests/framework-repo.helper.mjs to decide
            // whether the framework-repo self-checks apply here; defaults to the upstream
            // 'easy-claude-tooling'. A project that VENDORS this framework and wires the standalone
            // runner into its own npm scripts MUST declare its package name here — otherwise the
            // guard resolves false and every self-check it gates skips silently while the suite
            // still reports green.
            toolingPackageName: { type: 'string', required: false }
        }
    },
    // Per-project skill frontmatter conventions consumed by
    // .claude/skills/skill-creator/scripts/validate-skills.cjs (Scan & Fix mode).
    // Keeps the reusable validator generic — projects declare their non-official
    // frontmatter fields here instead of editing the script.
    skillConventions: {
        type: 'object',
        required: false,
        properties: {
            _description: { type: 'string', required: false },
            conventionFields: { type: 'array', required: false, itemType: 'string' },
            removableFields: { type: 'array', required: false, itemType: 'string' },
            fieldFixes: { type: 'map', required: false }
        }
    },
    // Optional hook behavior settings. Every property is optional and every
    // omitted property keeps the framework's portable default, so a project that
    // declares nothing behaves exactly as it did before this section existed.
    hooks: {
        type: 'object',
        required: false,
        describe: 'Optional hook behavior settings. Omitted properties keep the framework defaults.',
        properties: {
            uiReuseReminder: {
                type: 'object', required: false,
                describe: 'Default-on concise frontend reuse reminder on prompts and before UI file operations/plan loads. Default interval 100000 tokens.',
                properties: {
                    enabled: { type: 'boolean', required: false, describe: 'Default true. false disables the UI reuse reminder on every event.' },
                    reinjectAfterTokens: { type: 'number', required: false, describe: 'Default 100000. Integer from 20000 to 2000000; transcript-growth window shared by prompt and tool reminders.' },
                    useDefaultMatchers: { type: 'boolean', required: false, describe: 'Default true. false replaces built-in frontend includes with pathGlobs; dependency, build and generated-mirror exclusions remain active.' },
                    pathGlobs: { type: 'array', itemType: 'string', required: false, describe: 'Additional repository-relative frontend globs, or the only includes when useDefaultMatchers is false.' },
                    excludePathGlobs: { type: 'array', itemType: 'string', required: false, describe: 'Additional repository-relative exclusions; built-in dependency, build and generated-mirror exclusions always apply.' }
                }
            },
            failureInvestigationReminder: {
                type: 'object', required: false,
                describe: 'Default-on conditional root-cause skill reminder before shell work and on supported native tool failures. Default interval 150000 approximate transcript tokens; transcriptless hosts re-arm on session/reset changes.',
                properties: {
                    enabled: { type: 'boolean', required: false, describe: 'Default true. false disables every failure investigation reminder event.' },
                    reinjectAfterTokens: { type: 'number', required: false, describe: 'Default 150000. Integer from 20000 to 2000000; one transcript-growth window shared across reminder events.' }
                }
            },
            // Consumed by .claude/hooks/lib/startup-install.cjs through the single
            // registered SessionStart owner (.claude/hooks/verify-install.cjs).
            // The manager EXECUTABLE and its ARGUMENTS are deliberately not
            // configurable: the hook only ever runs a fixed, version-matched argv
            // from its own support matrix, so a project config can never turn the
            // startup hook into an arbitrary command runner.
            startupInstall: {
                type: 'object',
                required: false,
                describe: 'Startup dependency installation. Defaults: enabled true, packageManager "auto", allowLifecycleScripts false. Disabling installation never disables .claude integrity verification.',
                properties: {
                    enabled: {
                        type: 'boolean',
                        required: false,
                        describe: 'Default true (also when this config file is absent). false disables installation only.'
                    },
                    packageManager: {
                        type: 'string',
                        required: false,
                        enumValues: ['auto', 'npm', 'pnpm', 'yarn', 'bun'],
                        describe: 'Default "auto". A non-auto value is one manager SIGNAL, never an override: it must agree with every other available signal or the install fails closed.'
                    },
                    allowLifecycleScripts: {
                        type: 'boolean',
                        required: false,
                        describe: 'Default false. Only explicit true removes the hook\'s own script-suppression argument; manager-native policy (e.g. Bun trustedDependencies) still applies.'
                    }
                }
            },
            // Windows capability policy. The resolver still probes native Git
            // read-only when repair is disabled; these flags only govern the
            // optional background WinGet repair worker.
            windowsGit: {
                type: 'object',
                required: false,
                describe: 'Windows native Git/Git Bash capability. Defaults: enabled true, autoRepair true. Invalid project config disables repair only; integrity verification remains active.',
                properties: {
                    enabled: {
                        type: 'boolean',
                        required: false,
                        describe: 'Default true. false disables Git capability integration and background repair.'
                    },
                    autoRepair: {
                        type: 'boolean',
                        required: false,
                        describe: 'Default true. false keeps the read-only probe but never starts the WinGet repair worker.'
                    }
                }
            },
            codeGraph: {
                type: 'object',
                required: false,
                describe: 'Code-graph hooks and CLI. Default enabled "auto": active only when .code-graph/graph.db exists.',
                properties: {
                    enabled: {
                        type: 'string',
                        required: false,
                        enumValues: ['auto', 'on', 'off'],
                        describe: 'Default "auto" (active only when .code-graph/graph.db exists). "on" = always active; "off" = graph hooks stay silent and the graph CLI refuses to run.'
                    }
                }
            },
            tokenBudget: {
                type: 'object',
                required: false,
                describe: 'Advisory token checkpoint at task/plan step boundaries, read by the token-budget-checkpoint hook (PostToolUse on task/plan tools, Claude transcripts); never blocks. Defaults: enabled true, checkpointTokens 500000 (non-cached tokens). A malformed section keeps the checkpoint off until fixed.',
                properties: {
                    enabled: {
                        type: 'boolean',
                        required: false,
                        describe: 'Default true. false turns the advisory checkpoint note off.'
                    },
                    checkpointTokens: {
                        type: 'number',
                        required: false,
                        describe: 'Integer 50000..20000000, default 500000: one note each time the session\'s non-cached tokens (input + cache creation + output) cross the next multiple.'
                    }
                }
            }
        }
    },
    // Optional commit-skill policy. Every property is optional; omitted keeps the default.
    commit: {
        type: 'object',
        required: false,
        describe: 'Optional commit-skill policy. Omitted properties keep the defaults.',
        properties: {
            reviewMode: {
                type: 'string',
                required: false,
                enumValues: ['lightweight', 'risk-based'],
                describe: 'Default lightweight: automatically run commit-review --fix-loop for commits at every risk tier, at most two rounds. risk-based restores Low skip / Medium why-review / High changes-review. Does not change PR whole-branch reviews, tests, receipts or Git authority. Later overrides: ~/.claude/.ck.json, .claude/.ck.local.json, CK_COMMIT_REVIEW_MODE.'
            },
            fixOriginTrailer: {
                type: 'boolean',
                required: false,
                describe: 'Default false. true = the commit skill writes the author-declared Fix-Origin trailer (feedback | regression | not-applicable) on new commits only; existing commits are never reworded to add it.'
            }
        }
    },
    // Optional pull-request-skill policy. Every property is optional; omitted keeps the default.
    pullRequest: {
        type: 'object',
        required: false,
        describe: 'Optional pull-request-skill policy. Omitted properties keep the defaults.',
        properties: {
            targetBranch: {
                type: 'string',
                required: false,
                describe: 'Default "main". The base branch the pull-request skill branches from and opens PRs into. A base branch named in the request, or the base of an already-open PR for the current branch, takes precedence.'
            },
            // Default merge keeps every adopter's pushed history untouched; rebase is an opt-in
            // because it rewrites commits a collaborator may already hold.
            pushedBranchUpdate: {
                type: 'string',
                required: false,
                enumValues: ['merge', 'rebase'],
                describe: 'Default "merge": the pull-request skill brings an already-pushed PR branch up to date by merging the target in and never rewrites a pushed commit. "rebase": it rebases that branch onto the target and pushes with an explicit --force-with-lease, only when every replayed commit is the current git user\'s and the local branch contains the remote one; otherwise it merges. The target branch is never force-pushed.'
            }
        }
    },
    // Optional team skill profile. `node .claude/scripts/sync-skill-profile.cjs` resolves it and
    // writes only the keys it owns into `.claude/settings.json` `skillOverrides`; a developer's own
    // choices stay in git-ignored `.claude/settings.local.json`. Omitted = no overrides.
    skillProfile: {
        type: 'object',
        required: false,
        describe: 'Team skill visibility profile. Applied by `node .claude/scripts/sync-skill-profile.cjs` into .claude/settings.json skillOverrides (only the keys it wrote; personal choices go in .claude/settings.local.json). Omitted = every skill keeps its default visibility.',
        properties: {
            preset: {
                type: 'string',
                required: false,
                enumValues: SKILL_PROFILE_PRESETS,
                describe: 'Starting point: full = no overrides; standard = the skills other skills or hooks start become name-only; minimal = only start-workflow, commit and the setup skills stay listed, every other skill becomes name-only. Presets live in .claude/config/skill-profiles.json.'
            },
            nameOnly: {
                type: 'array',
                required: false,
                itemType: 'string',
                describe: 'Skills hidden from the model\'s skill list but still callable by name (Claude name-only). Allowed for any skill.'
            },
            commandOnly: {
                type: 'array',
                required: false,
                itemType: 'string',
                describe: 'Skills only a user can start with /name (Claude user-invocable-only). Refused for a skill a workflow, agent, skill or hook starts, unless allowHidingCalledSkills is true.'
            },
            off: {
                type: 'array',
                required: false,
                itemType: 'string',
                describe: 'Skills turned off (Claude off; a call by full name fails). Refused for a skill a workflow, agent, skill or hook starts, unless allowHidingCalledSkills is true.'
            },
            allowHidingCalledSkills: {
                type: 'boolean',
                required: false,
                describe: 'Default false. true lets commandOnly/off hide a skill that a workflow, agent, skill or hook starts; each one is still named in a warning line.'
            }
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate a regex string. Returns null if valid, error string if invalid.
 */
function validateRegex(value, path) {
    try {
        new RegExp(value, 'i');
        return null;
    } catch (e) {
        return `${path}: invalid regex "${value}" — ${e.message}`;
    }
}

/**
 * Validate a value against a field schema.
 * @param {any} value - The value to validate
 * @param {object} fieldSchema - Schema definition for this field
 * @param {string} path - Dot-notation path for error messages
 * @param {string[]} errors - Accumulated errors
 * @param {string[]} warnings - Accumulated warnings
 */
function validateField(value, fieldSchema, path, errors, warnings) {
    // Check required
    if (value === undefined || value === null) {
        if (fieldSchema.required) {
            errors.push(`${path}: required field is missing`);
        } else if (value === null && fieldSchema.rejectNull) {
            errors.push(`${path}: declared value must not be null; omit the field to use its default`);
        }
        return;
    }

    // Emit deprecation warning (field is present but deprecated)
    if (fieldSchema.deprecated) {
        warnings.push(`${path}: DEPRECATED — this field will be removed in a future version`);
    }

    // Union field: the value is valid when it satisfies ANY alternative. Warnings from the
    // matching alternative are kept; non-matching alternatives contribute their errors only
    // when no alternative matches. Used by `portability.workflowRouteProtocol`
    // (inline string | { text?, path? }).
    if (Array.isArray(fieldSchema.oneOf)) {
        const failedTypes = [];
        for (const alternative of fieldSchema.oneOf) {
            const altErrors = [];
            const altWarnings = [];
            validateField(value, alternative, path, altErrors, altWarnings);
            if (altErrors.length === 0) {
                warnings.push(...altWarnings);
                return;
            }
            failedTypes.push(alternative.type || 'value');
        }
        errors.push(`${path}: expected one of ${failedTypes.join(' | ')}`);
        return;
    }

    switch (fieldSchema.type) {
        case 'string':
            if (typeof value !== 'string') {
                errors.push(`${path}: expected string, got ${typeof value}`);
                return;
            }
            if (fieldSchema.isRegex) {
                const regexErr = validateRegex(value, path);
                if (regexErr) errors.push(regexErr);
            }
            if (Array.isArray(fieldSchema.enumValues) && !fieldSchema.enumValues.includes(value)) {
                errors.push(`${path}: expected one of ${fieldSchema.enumValues.join('|')}, got "${value}"`);
            }
            break;

        case 'number':
            if (typeof value !== 'number') {
                errors.push(`${path}: expected number, got ${typeof value}`);
            }
            break;

        case 'boolean':
            if (typeof value !== 'boolean') {
                errors.push(`${path}: expected boolean, got ${typeof value}`);
            }
            break;

        case 'array':
            if (!Array.isArray(value)) {
                errors.push(`${path}: expected array, got ${typeof value}`);
                return;
            }
            if (fieldSchema.itemType) {
                value.forEach((item, i) => {
                    if (typeof item !== fieldSchema.itemType) {
                        errors.push(`${path}[${i}]: expected ${fieldSchema.itemType}, got ${typeof item}`);
                    }
                });
            }
            if (fieldSchema.itemsAreRegex) {
                value.forEach((item, i) => {
                    if (typeof item === 'string') {
                        const regexErr = validateRegex(item, `${path}[${i}]`);
                        if (regexErr) errors.push(regexErr);
                    }
                });
            }
            break;

        case 'object':
            if (typeof value !== 'object' || Array.isArray(value)) {
                errors.push(`${path}: expected object, got ${Array.isArray(value) ? 'array' : typeof value}`);
                return;
            }
            // Skip deep validation for freeform sections (e.g., custom, databases)
            if (fieldSchema.freeform) break;
            // Validate properties
            if (fieldSchema.properties) {
                // Check for required properties
                for (const [propName, propSchema] of Object.entries(fieldSchema.properties)) {
                    validateField(value[propName], propSchema, `${path}.${propName}`, errors, warnings);
                }
                // Warn about unknown top-level properties (but don't error — extensible)
                for (const key of Object.keys(value)) {
                    if (!Object.prototype.hasOwnProperty.call(fieldSchema.properties, key)) {
                        (fieldSchema.closed ? errors : warnings).push(`${path}.${key}: unknown property (not in schema)`);
                    }
                }
            }
            break;

        case 'map':
            if (typeof value !== 'object' || Array.isArray(value)) {
                errors.push(`${path}: expected map (object), got ${Array.isArray(value) ? 'array' : typeof value}`);
                return;
            }
            if (fieldSchema.valuesAreRegex) {
                for (const [key, val] of Object.entries(value)) {
                    if (typeof val === 'string') {
                        const regexErr = validateRegex(val, `${path}.${key}`);
                        if (regexErr) errors.push(regexErr);
                    }
                }
            }
            if (Array.isArray(fieldSchema.valuesEnum)) {
                for (const [key, val] of Object.entries(value)) {
                    if (!fieldSchema.valuesEnum.includes(val)) {
                        const got = typeof val === 'string' ? `"${val}"` : typeof val;
                        errors.push(`${path}.${key}: expected one of ${fieldSchema.valuesEnum.join('|')}, got ${got}`);
                    }
                }
            }
            break;

        case 'arrayOf':
            if (!Array.isArray(value)) {
                errors.push(`${path}: expected array, got ${typeof value}`);
                return;
            }
            if (fieldSchema.itemSchema) {
                value.forEach((item, i) => {
                    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
                        errors.push(`${path}[${i}]: expected object item`);
                        return;
                    }
                    for (const [propName, propSchema] of Object.entries(fieldSchema.itemSchema)) {
                        validateField(item[propName], propSchema, `${path}[${i}].${propName}`, errors, warnings);
                    }
                    if (fieldSchema.closed) {
                        for (const key of Object.keys(item)) {
                            if (!Object.prototype.hasOwnProperty.call(fieldSchema.itemSchema, key)) {
                                errors.push(`${path}[${i}].${key}: unknown property (not in schema)`);
                            }
                        }
                    }
                });
            }
            break;

        default:
            warnings.push(`${path}: unknown schema type "${fieldSchema.type}"`);
    }
}

/**
 * Validate cross-field semantics that cannot be expressed by the structural
 * schema alone. In particular, an empty experience contract must explain why
 * it is disabled; otherwise setup reports can accidentally look like a live
 * verification decision.
 */
function validateExperienceVerificationSemantics(config, errors, warnings) {
    const experience = config.experienceVerification;
    if (experience === undefined || experience === null ||
        typeof experience !== 'object' || Array.isArray(experience)) return;

    if (typeof experience.enabled !== 'boolean' || !Array.isArray(experience.surfaces)) return;

    if (experience.enabled && experience.surfaces.length === 0) {
        errors.push('experienceVerification.surfaces: at least one observable surface is required when experienceVerification.enabled is true; disable it with an evidence-backed notApplicableReason until a surface exists');
    }

    if (!experience.enabled && experience.surfaces.length === 0 &&
        (typeof experience.notApplicableReason !== 'string' || experience.notApplicableReason.trim().length === 0)) {
        errors.push('experienceVerification.notApplicableReason: required when experienceVerification is disabled with no surfaces; provide an evidence-backed NOT-APPLICABLE or pending-capability reason');
    }

    if (!experience.enabled && experience.surfaces.length > 0) {
        warnings.push('experienceVerification: surfaces are configured while the contract is disabled; conditional experience review routing is off until enabled');
    }

    experience.surfaces.forEach((surface, index) => {
        const credentialsRef = surface && surface.localRun && surface.localRun.credentialsRef;
        if (typeof credentialsRef === 'string' && appearsToContainSecretLiteral(credentialsRef)) {
            warnings.push(`experienceVerification.surfaces[${index}].localRun.credentialsRef: appears to contain a credential/token literal; store a reference, not the secret value`);
        }
    });
}

const E2E_AUTH_MODES = new Set(['fixture', 'storage-state', 'registration', 'manual', 'none']);
const E2E_DATA_MODES = new Set(['reference-only', 'idempotent', 'additive']);
const E2E_CAPTURE_KINDS = new Set(['screenshot', 'console', 'requests', 'trace', 'video']);
const E2E_UI_STATE_CAPTURE_MODES = new Set(['every-action', 'declared-only', 'off']);

function isAbsoluteProjectPath(value) {
    return value.startsWith('/') || value.startsWith('\\') || /^[A-Za-z]:[\\/]/.test(value) || value.split(/[\\/]/).includes('..');
}

function appearsToContainSecretLiteral(value) {
    return /\b(?:bearer|basic)\s+[A-Za-z0-9+/=_-]{12,}/i.test(value) ||
        /\b(?:password|passwd|token|secret|cookie)\s*[:=]/i.test(value) ||
        /(?:^|\s)--?(?:password|passwd|token|secret|cookie)(?:[-_a-z]*)\s+(?!\$\{?[\w-]+\}?|%[\w-]+%|(?:env|secret|fixture):)[^\s]+/i.test(value) ||
        /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function validateE2eExecutionSemantics(config, errors, warnings) {
    const e2e = config.e2eTesting;
    if (e2e === undefined || e2e === null || typeof e2e !== 'object' || Array.isArray(e2e)) return;

    const execution = e2e.execution;
    if (execution === undefined || execution === null || typeof execution !== 'object' || Array.isArray(execution)) return;

    const pathFields = [
        ['e2eTesting.execution.data.workingDir', execution.data && execution.data.workingDir],
        ['e2eTesting.execution.evidence.root', execution.evidence && execution.evidence.root],
        // The manifest indexes screenshots; outside the project-relative evidence root they can
        // escape the gitignored disposable tmp/ tree. `helper` stays out: it may name a symbol.
        ['e2eTesting.execution.evidence.uiStateCapture.manifestPath',
            execution.evidence && execution.evidence.uiStateCapture && execution.evidence.uiStateCapture.manifestPath]
    ];
    for (const [path, value] of pathFields) {
        if (typeof value === 'string' && isAbsoluteProjectPath(value)) {
            errors.push(`${path}: must be a project-relative path without parent traversal`);
        }
    }

    const auth = execution.auth;
    if (auth && typeof auth === 'object' && !Array.isArray(auth)) {
        if (typeof auth.mode === 'string' && !E2E_AUTH_MODES.has(auth.mode)) {
            errors.push(`e2eTesting.execution.auth.mode: unsupported mode "${auth.mode}"; expected one of ${Array.from(E2E_AUTH_MODES).join(', ')}`);
        }
        for (const field of ['credentialsRef', 'storageStateRef']) {
            if (typeof auth[field] === 'string' && appearsToContainSecretLiteral(auth[field])) {
                warnings.push(`e2eTesting.execution.auth.${field}: appears to contain a credential/token literal; store a reference, not the secret value`);
            }
        }
        if (auth.mode === 'fixture' && !isNonEmptyString(auth.credentialsRef)) {
            warnings.push('e2eTesting.execution.auth.credentialsRef: required before a fixture-authenticated run can be APPLICABLE');
        }
        if (auth.mode === 'storage-state' && !isNonEmptyString(auth.storageStateRef)) {
            warnings.push('e2eTesting.execution.auth.storageStateRef: required before a storage-state-authenticated run can be APPLICABLE');
        }
        if (auth.mode === 'registration' && !isNonEmptyString(auth.registrationCommand)) {
            warnings.push('e2eTesting.execution.auth.registrationCommand: required before a registration-authenticated run can be APPLICABLE');
        }
    }

    const data = execution.data;
    if (data && typeof data === 'object' && !Array.isArray(data) &&
        typeof data.mode === 'string' && !E2E_DATA_MODES.has(data.mode)) {
        errors.push(`e2eTesting.execution.data.mode: unsupported mode "${data.mode}"; expected one of ${Array.from(E2E_DATA_MODES).join(', ')}`);
    }
    if (data && typeof data === 'object' && !Array.isArray(data) &&
        ['idempotent', 'additive'].includes(data.mode) && !isNonEmptyString(data.seedCommand)) {
        warnings.push('e2eTesting.execution.data.seedCommand: required before an idempotent/additive data run can be APPLICABLE');
    }
    for (const [path, value] of [
        ['e2eTesting.execution.auth.registrationCommand', auth && auth.registrationCommand],
        ['e2eTesting.execution.data.seedCommand', data && data.seedCommand]
    ]) {
        if (typeof value === 'string' && appearsToContainSecretLiteral(value)) {
            warnings.push(`${path}: appears to contain a credential/token literal; use an environment, fixture, or secret-manager reference instead of an inline value`);
        }
    }

    const browser = execution.browser;
    if (browser && typeof browser === 'object' && !Array.isArray(browser)) {
        if (typeof browser.actionDelayMs === 'number' &&
            (!Number.isSafeInteger(browser.actionDelayMs) || browser.actionDelayMs < 0)) {
            errors.push('e2eTesting.execution.browser.actionDelayMs: expected a non-negative safe integer in milliseconds');
        }
    }

    const evidence = execution.evidence;
    if (evidence && typeof evidence === 'object' && !Array.isArray(evidence)) {
        if (Array.isArray(evidence.capture)) {
            evidence.capture.forEach((kind, index) => {
                if (typeof kind === 'string' && !E2E_CAPTURE_KINDS.has(kind)) {
                    errors.push(`e2eTesting.execution.evidence.capture[${index}]: unsupported capture "${kind}"; expected one of ${Array.from(E2E_CAPTURE_KINDS).join(', ')}`);
                }
            });
            if (evidence.capture.some(kind => E2E_CAPTURE_KINDS.has(kind)) && !isNonEmptyString(evidence.redaction)) {
                warnings.push('e2eTesting.execution.evidence.redaction: configure redaction before persisting screenshot, console, request, trace, or video evidence');
            }
        }

        const uiStateCapture = evidence.uiStateCapture;
        if (uiStateCapture && typeof uiStateCapture === 'object' && !Array.isArray(uiStateCapture)) {
            // Any string, including blank, is checked: a blank mode would otherwise read as active
            // capture instead of an error (same convention as auth.mode).
            if (typeof uiStateCapture.mode === 'string' && !E2E_UI_STATE_CAPTURE_MODES.has(uiStateCapture.mode)) {
                errors.push(`e2eTesting.execution.evidence.uiStateCapture.mode: unsupported mode "${uiStateCapture.mode}"; expected one of ${Array.from(E2E_UI_STATE_CAPTURE_MODES).join(', ')}`);
            }
            // Caps bound the capture set; a non-positive cap would silently disable capture
            // instead of producing the escalation record the protocol requires.
            [['maxPerTest', 1, 1000], ['maxPerRun', 1, 20000]].forEach(([field, min, max]) => {
                const value = uiStateCapture[field];
                if (value === undefined || value === null) return;
                if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
                    errors.push(`e2eTesting.execution.evidence.uiStateCapture.${field}: expected an integer from ${min} through ${max}`);
                }
            });
            if (typeof uiStateCapture.maxPerTest === 'number' && typeof uiStateCapture.maxPerRun === 'number' &&
                uiStateCapture.maxPerTest > uiStateCapture.maxPerRun) {
                errors.push('e2eTesting.execution.evidence.uiStateCapture.maxPerTest: cannot exceed uiStateCapture.maxPerRun');
            }
            // `off` still captures and indexes the declared matrix, so every mode needs the manifest path.
            if (!isNonEmptyString(uiStateCapture.manifestPath)) {
                warnings.push('e2eTesting.execution.evidence.uiStateCapture.manifestPath: configure the capture-manifest.json path; an unindexed capture set cannot be reconciled case by case and reads as UNVERIFIED');
            }
            if (uiStateCapture.mode === 'every-action' && !isNonEmptyString(uiStateCapture.helper)) {
                warnings.push('e2eTesting.execution.evidence.uiStateCapture.helper: name the source-verified capture boundary used for every-action transition capture');
            }
        }
    }

    const convergence = execution.convergence;
    if (convergence && typeof convergence === 'object' && !Array.isArray(convergence)) {
        const bounds = [
            ['maxAttempts', convergence.maxAttempts, 1, 10],
            ['consecutiveGreen', convergence.consecutiveGreen, 1, 5],
            ['settleTimeoutSeconds', convergence.settleTimeoutSeconds, 1, 600]
        ];
        for (const [field, value, min, max] of bounds) {
            if (value !== undefined && (!Number.isFinite(value) || !Number.isInteger(value) || value < min || value > max)) {
                errors.push(`e2eTesting.execution.convergence.${field}: expected an integer from ${min} through ${max}`);
            }
        }
        if (typeof convergence.maxAttempts === 'number' && typeof convergence.consecutiveGreen === 'number' && convergence.consecutiveGreen > convergence.maxAttempts) {
            errors.push('e2eTesting.execution.convergence.consecutiveGreen: cannot exceed convergence.maxAttempts');
        }
    }

    if (Array.isArray(execution.surfaceIds)) {
        const surfaces = config.experienceVerification && Array.isArray(config.experienceVerification.surfaces)
            ? config.experienceVerification.surfaces
            : [];
        const knownIds = new Set(surfaces.filter(surface => surface && typeof surface.id === 'string').map(surface => surface.id));
        execution.surfaceIds.forEach((surfaceId, index) => {
            if (typeof surfaceId === 'string' && !knownIds.has(surfaceId)) {
                warnings.push(`e2eTesting.execution.surfaceIds[${index}]: no matching experienceVerification.surfaces[].id; setup must discover or configure the surface before E2E can be APPLICABLE`);
            }
        });
    }
}

const CONTEXT_GROUP_FIELDS = new Set(Object.keys(SCHEMA.contextGroups.itemSchema));
const CONTEXT_GROUP_ORIGINS = new Set(['detected', 'user']);
// Mirrors file-conventions.cjs CLASS_REINJECT_TOKENS_RANGE (parity asserted by the ui-ux-gate suite).
const CONTEXT_GROUP_REINJECT_TOKENS_RANGE = [20000, 2000000];
// Mirrors file-conventions.cjs CONTENT_LIMITS count/length caps (parity asserted by the ai-feature-gate suite).
const CONTEXT_GROUP_CONTENT_LIMITS = { maxRegexes: 64, maxRegexLength: 500, maxExtensions: 64, maxLabelLength: 80 };
const CONTENT_EXTENSION_SHAPE = /^\.?[A-Za-z0-9][A-Za-z0-9_+-]{0,15}$/;

function nonEmptyArray(value) {
    return Array.isArray(value) && value.length > 0;
}

/**
 * Why a content regex is unsafe to run over a file sample, or null when it is acceptable (static lint on
 * the pattern text; it never executes the pattern). Rejects: a blank, over-long (500 characters) or
 * non-compiling pattern; a back-reference; a repeated group that itself contains a large repetition
 * (`(x+)+`, `(x*)*`, `(.*x){2}`); a large repetition over a group whose alternatives can start with the
 * same character (`(a|aa)+`); and two large repetitions in a row over the same or a wildcard-like atom
 * (`a*a*`, `.*.*`); and more than 10 loop-free optional elements in total (`?`, counted ranges of at most 3,
 * empty alternatives), whose compilation V8 cannot interrupt. A "large" repetition is unbounded or has an
 * upper bound over 100. A best-effort pre-filter, not a proof of speed: the vm time budget is the guarantee. Self-contained
 * (no outer constants): file-conventions.cjs carries the identical text and a test compares them.
 */
function contentRegexLintReason(source) {
    if (typeof source !== 'string' || source.trim().length === 0) return 'blank pattern';
    if (source.length > 500) return 'longer than 500 characters';
    try {
        new RegExp(source, 'i');
    } catch {
        return 'does not compile';
    }
    const stack = [];
    let frame = { big: false, hasAlt: false, altStart: true, firsts: [] };
    let last = null;
    let tail = null;
    let optional = 0;
    const addAtom = (text, literal, wild) => {
        if (frame.altStart) {
            frame.firsts.push(literal);
            frame.altStart = false;
        }
        last = { text, group: null, wild, prevTail: tail };
        tail = null;
    };
    let i = 0;
    while (i < source.length) {
        const c = source[i];
        if (c === '\\') {
            const n = source[i + 1] || '';
            if (/[1-9]/.test(n) || (n === 'k' && source[i + 2] === '<')) return 'back-reference';
            addAtom(c + n, null, /[sdwSDW]/.test(n));
            i += 2;
        } else if (c === '[') {
            let j = i + 1;
            if (source[j] === '^') j += 1;
            while (j < source.length && source[j] !== ']') j += source[j] === '\\' ? 2 : 1;
            const text = source.slice(i, j + 1);
            addAtom(text, null, text.startsWith('[^'));
            i = j + 1;
        } else if (c === '(') {
            const prefix = /^\(\?(?:[:=!]|<[=!]|<[A-Za-z_$][\w$]*>)/.exec(source.slice(i));
            if (frame.altStart) {
                frame.firsts.push(null);
                frame.altStart = false;
            }
            stack.push({ frame, last, tail });
            frame = { big: false, hasAlt: false, altStart: true, firsts: [] };
            last = null;
            tail = null;
            i += prefix ? prefix[0].length : 1;
        } else if (c === ')') {
            if (frame.altStart) {
                frame.firsts.push(null);
                optional += 1;
            }
            const closed = frame;
            const parent = stack.pop();
            if (!parent) return 'does not compile';
            frame = parent.frame;
            if (closed.big) frame.big = true;
            last = { text: '(group)', group: closed, wild: false, prevTail: parent.tail };
            tail = null;
            i += 1;
        } else if (c === '|') {
            if (frame.altStart) {
                frame.firsts.push(null);
                optional += 1;
            }
            frame.hasAlt = true;
            frame.altStart = true;
            last = null;
            tail = null;
            i += 1;
        } else if (c === '*' || c === '+' || c === '?' || c === '{') {
            const counted = c === '{' ? /^\{(\d+)(?:(,)(\d*))?\}/.exec(source.slice(i)) : null;
            if (c === '{' && !counted) {
                addAtom(c, c, false);
                i += 1;
                continue;
            }
            let min = 0;
            let max = 1;
            let length = 1;
            if (c === '*') max = Infinity;
            else if (c === '+') {
                min = 1;
                max = Infinity;
            } else if (counted) {
                min = Number(counted[1]);
                max = counted[2] ? (counted[3] === '' ? Infinity : Number(counted[3])) : min;
                length = counted[0].length;
            }
            i += length;
            if (source[i] === '?') i += 1;
            if (!last) continue;
            if (max <= 3 && min < max) {
                optional += max - min;
                if (optional > 10) return 'too many optional elements';
            }
            const big = max === Infinity || max > 100;
            if (last.group) {
                if (max > 1 && last.group.big) return 'repeated group containing a large repetition';
                if (big && last.group.hasAlt) {
                    const firsts = last.group.firsts.map(first => (first === null ? null : first.toLowerCase()));
                    if (firsts.includes(null) || new Set(firsts).size !== firsts.length) return 'repeated alternation with overlapping alternatives';
                }
            }
            if (big) {
                const previous = last.prevTail;
                if (previous && (previous.text === last.text || previous.wild || last.wild)) return 'adjacent overlapping repetitions';
                frame.big = true;
                tail = { text: last.text, wild: last.wild };
            } else {
                tail = null;
            }
            if (min > max) return 'does not compile';
        } else if (c === '.') {
            addAtom(c, null, true);
            i += 1;
        } else {
            addAtom(c, c, false);
            i += 1;
        }
    }
    if (stack.length) return 'does not compile';
    return optional > 10 ? 'too many optional elements' : null;
}

/**
 * Content-signal bounds (contentRegexes / contentExtensions / contentLabel): caps on count and length
 * bound a list, and the lint above is a best-effort pre-filter that rejects the well-known slow shapes
 * (the runtime enforces the time budget by running non-built-in regexes under a vm timeout); content
 * regexes without extensions can never match, so that pair is an error. Malformed types are reported
 * by the structural pass.
 */
function validateContentSignals(group, path, label, errors, warnings) {
    const limits = CONTEXT_GROUP_CONTENT_LIMITS;
    if (Array.isArray(group.contentRegexes)) {
        if (group.contentRegexes.length > limits.maxRegexes) {
            errors.push(`${path}${label}.contentRegexes: at most ${limits.maxRegexes} regexes, got ${group.contentRegexes.length}`);
        }
        group.contentRegexes.forEach((source, index) => {
            if (typeof source !== 'string') return;
            if (source.trim().length === 0) errors.push(`${path}${label}.contentRegexes[${index}]: must not be blank`);
            else if (source.length > limits.maxRegexLength) errors.push(`${path}${label}.contentRegexes[${index}]: at most ${limits.maxRegexLength} characters, got ${source.length}`);
            else {
                // An uncompilable source is reported by the structural pass; only a compilable one can be unsafe.
                const unsafe = validateRegex(source, path) === null ? contentRegexLintReason(source) : null;
                if (unsafe) {
                    errors.push(`${path}${label}.contentRegexes[${index}]: unsafe content regex (${unsafe}); use a bounded repetition such as {0,80} and no nested or back-to-back open-ended repetition, or the pattern can stall every read of a matching file`);
                }
            }
        });
        if (group.contentRegexes.length > 0 && !nonEmptyArray(group.contentExtensions)) {
            errors.push(`${path}${label}.contentRegexes: needs contentExtensions (the text/code file types to scan); without them no file is ever content-matched`);
        }
    }
    if (Array.isArray(group.contentExtensions)) {
        if (group.contentExtensions.length > limits.maxExtensions) {
            errors.push(`${path}${label}.contentExtensions: at most ${limits.maxExtensions} extensions, got ${group.contentExtensions.length}`);
        }
        group.contentExtensions.forEach((ext, index) => {
            if (typeof ext === 'string' && !CONTENT_EXTENSION_SHAPE.test(ext.trim())) {
                errors.push(`${path}${label}.contentExtensions[${index}]: expected a file extension such as ".py" or "ts", got ${JSON.stringify(ext)}`);
            }
        });
        if (group.contentExtensions.length > 0 && !nonEmptyArray(group.contentRegexes)) {
            warnings.push(`${path}${label}.contentExtensions: has no effect without contentRegexes`);
        }
    }
    if (typeof group.contentLabel === 'string' && group.contentLabel.length > limits.maxLabelLength) {
        errors.push(`${path}${label}.contentLabel: at most ${limits.maxLabelLength} characters, got ${group.contentLabel.length}`);
    }
}

/**
 * contextGroups semantics the structural schema cannot express (BR-PFCI-11):
 * unique non-blank names, at least one include matcher, advisory warnings.
 */
function validateContextGroupSemantics(config, errors, warnings) {
    const groups = config.contextGroups;
    if (!Array.isArray(groups)) return;
    const seen = new Set();
    groups.forEach((group, index) => {
        if (!group || typeof group !== 'object' || Array.isArray(group)) return;
        const path = `contextGroups[${index}]`;
        if (typeof group.name === 'string') {
            const name = group.name.trim();
            if (name.length === 0) {
                errors.push(`${path}.name: must not be blank`);
            } else if (seen.has(name)) {
                errors.push(`${path}.name: duplicate context group name "${name}"`);
            } else {
                seen.add(name);
            }
        }
        const label = typeof group.name === 'string' && group.name.trim() ? ` ("${group.name.trim()}")` : '';
        if (label) {
            // Structural errors (e.g. a malformed regex) carry only the index path; name the class too.
            for (let i = 0; i < errors.length; i++) {
                if (errors[i].startsWith(`${path}.`) && !errors[i].startsWith(`${path}.name:`)) {
                    errors[i] = `${path}${label}${errors[i].slice(path.length)}`;
                }
            }
        }
        const hasContentInclude = nonEmptyArray(group.contentRegexes) && nonEmptyArray(group.contentExtensions);
        if (!nonEmptyArray(group.pathRegexes) && !nonEmptyArray(group.pathGlobs) && !nonEmptyArray(group.fileNameRegexes) && !hasContentInclude) {
            errors.push(`${path}${label}: needs at least one include matcher (pathRegexes, pathGlobs, fileNameRegexes, or contentRegexes with contentExtensions)`);
        }
        validateContentSignals(group, path, label, errors, warnings);
        for (const key of Object.keys(group)) {
            if (!CONTEXT_GROUP_FIELDS.has(key)) {
                warnings.push(`${path}.${key}: unknown context group field (not in schema)`);
            }
        }
        if (group.reinjectAfterTokens !== undefined) {
            const [min, max] = CONTEXT_GROUP_REINJECT_TOKENS_RANGE;
            const tokens = group.reinjectAfterTokens;
            if (typeof tokens !== 'number' || !Number.isInteger(tokens) || tokens < min || tokens > max) {
                errors.push(`${path}${label}.reinjectAfterTokens: expected an integer from ${min} through ${max}`);
            }
        }
        if (typeof group.priority === 'number' && !Number.isInteger(group.priority)) {
            warnings.push(`${path}.priority: expected a whole number (bands 100 / 500 / 900)`);
        }
        if (typeof group.origin === 'string' && !CONTEXT_GROUP_ORIGINS.has(group.origin)) {
            warnings.push(`${path}.origin: unknown origin "${group.origin}"; expected "detected" or "user"`);
        }
    });
}

// Mirrors file-conventions.cjs RANGES/DEFAULTS. This schema stays dependency-free (it is also
// evaluated standalone, see experience-config.test.cjs), so parity is enforced by TC-PFCI-013.
const CONVENTION_INJECTION_RANGES = [
    ['maxChars', 500, 10000],
    ['maxClassesPerEdit', 1, 10],
    ['reinjectAfterBytes', 4500000, Number.MAX_SAFE_INTEGER],
    ['reinjectAfterMinutes', 1, 1440],
    ['blindReinjectAfterMinutes', 1, 1440]
];

/** conventionInjection numeric ranges (BR-PFCI-11). */
function validateConventionInjectionSemantics(config, errors) {
    const settings = config.conventionInjection;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return;
    for (const [field, min, max] of CONVENTION_INJECTION_RANGES) {
        const value = settings[field];
        if (value === undefined || value === null || typeof value !== 'number') continue;
        if (!Number.isInteger(value) || value < min || value > max) {
            const range = max === Number.MAX_SAFE_INTEGER ? `at least ${min}` : `from ${min} through ${max}`;
            errors.push(`conventionInjection.${field}: expected an integer ${range}`);
        }
    }
}

/** hooks.tokenBudget.checkpointTokens range; the structural pass already rejects a non-number. */
function validateTokenBudgetSemantics(config, errors) {
    const budget = config.hooks && config.hooks.tokenBudget;
    if (!budget || typeof budget !== 'object' || Array.isArray(budget)) return;
    const value = budget.checkpointTokens;
    if (value === undefined || value === null || typeof value !== 'number') return;
    const [min, max] = TOKEN_BUDGET_CHECKPOINT_RANGE;
    if (!Number.isInteger(value) || value < min || value > max) {
        errors.push(`hooks.tokenBudget.checkpointTokens: expected an integer from ${min} through ${max}, got ${value}`);
    }
}

/**
 * skillProfile lists: every entry must be usable as a skill key, and one skill sits in at most one
 * list (which visibility wins would otherwise be a guess). A name with no `.claude/skills/<name>/SKILL.md`
 * is a warning only: the profile may name a skill the project adds later. The structural pass has
 * already rejected non-array lists and non-string items.
 */
function validateSkillProfileSemantics(config, errors, warnings) {
    const profile = config.skillProfile;
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return;
    const seenIn = new Map();
    const deps = semanticDeps();
    for (const list of SKILL_PROFILE_LISTS) {
        const names = profile[list];
        if (!Array.isArray(names)) continue;
        names.forEach((name, index) => {
            if (typeof name !== 'string') return;
            if (!SKILL_NAME_PATTERN.test(name)) {
                errors.push(`skillProfile.${list}[${index}]: "${name}" is not a skill folder name (lowercase letters, digits, hyphens)`);
                return;
            }
            if (seenIn.has(name) && seenIn.get(name) !== list) {
                errors.push(`skillProfile.${list}: "${name}" is also listed in skillProfile.${seenIn.get(name)}; keep it in one list`);
                return;
            }
            seenIn.set(name, list);
            if (deps && !deps.fs.existsSync(deps.path.join(deps.repoRoot, '.claude', 'skills', name, 'SKILL.md'))) {
                warnings.push(`skillProfile.${list}: unknown skill "${name}" (no .claude/skills/${name}/SKILL.md)`);
            }
        });
    }
}

// Node built-ins + the shared path utils are loaded LAZILY and behind a `typeof require`
// guard on purpose: `experience-config.test.cjs:189` evaluates this file's SOURCE inside
// `vm.runInNewContext` with `require` bound to a plain OBJECT (`{ main: null }`), so a
// top-level `require(...)` would throw and take the whole mutation-oracle suite with it.
// When the deps are unavailable the docsRoots SEMANTIC checks are skipped; the structural
// checks (`validateField`) still run, because they need no I/O.
let semanticDepsCache;
function semanticDeps() {
    if (semanticDepsCache !== undefined) return semanticDepsCache;
    if (typeof require !== 'function' || typeof __dirname !== 'string') {
        semanticDepsCache = null;
        return semanticDepsCache;
    }
    try {
        const nodePath = require('path');
        semanticDepsCache = {
            fs: require('fs'),
            path: nodePath,
            pathUtils: require('./ck-path-utils.cjs'),
            // .claude/hooks/lib -> repo root. Derived from __dirname rather than cwd so a
            // caller validating from a subdirectory resolves the same tree.
            repoRoot: nodePath.resolve(__dirname, '..', '..', '..')
        };
    } catch {
        semanticDepsCache = null;
    }
    return semanticDepsCache;
}

/**
 * docsRoots path semantics — the fail-CLOSED half of the two-plane resolution contract.
 *
 * A declared sub-object whose `path` escapes the repository root is an ERROR (the runtime
 * plane would silently fall back to its default and the relocation would vanish). A
 * declared path that simply does not exist yet is a WARNING, not an error: a project may
 * legitimately declare a root before creating it, and erroring would make the config
 * unusable during setup.
 *
 * A MISSING `path` is not handled here — `validateField` already raises
 * `docsRoots.<key>.path: required field is missing` from the schema's `required: true`.
 *
 * @param {object} config - The parsed project-config.json
 * @param {string[]} errors - Error sink
 * @param {string[]} warnings - Warning sink
 */
function validateDocsRootsSemantics(config, errors, warnings) {
    const roots = config.docsRoots;
    if (!roots || typeof roots !== 'object' || Array.isArray(roots)) return;
    const deps = semanticDeps();
    for (const key of Object.keys(SCHEMA.docsRoots.properties)) {
        const entry = roots[key];
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
        const value = entry.path;
        if (typeof value !== 'string' || !value.trim()) continue;
        if (!deps) continue;
        if (deps.pathUtils.escapesRepoRoot(value)) {
            errors.push(`docsRoots.${key}.path: "${value}" escapes the repository root (absolute path or ".." segment)`);
            continue;
        }
        const normalized = deps.pathUtils.normalizeRootPath(value);
        if (!deps.fs.existsSync(deps.path.resolve(deps.repoRoot, normalized))) {
            warnings.push(`docsRoots.${key}.path: "${normalized}" does not exist on disk`);
        }
    }
}

/**
 * specRoots path semantics — reject declared content roots that escape the
 * repository. Runtime accessors remain fail-soft and resolve such values to
 * their documented defaults; config validation is the fail-closed plane.
 *
 * @param {object} config - The parsed project-config.json
 * @param {string[]} errors - Error sink
 */
function validateSpecRootsSemantics(config, errors) {
    const roots = config.specRoots;
    if (!roots || typeof roots !== 'object' || Array.isArray(roots)) return;
    const deps = semanticDeps();
    if (!deps) return;

    for (const key of Object.keys(SCHEMA.specRoots.properties)) {
        const entry = roots[key];
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
        const value = entry.path;
        if (typeof value !== 'string' || !value.trim()) continue;
        if (deps.pathUtils.escapesRepoRoot(value)) {
            errors.push(`specRoots.${key}.path: "${value}" escapes the repository root (absolute path or ".." segment)`);
        }
    }
}

/**
 * Validate the optional native spec profile using its closed owner schema.
 * Lazy loading keeps VM-based schema mutation tests and hook startup fail-soft.
 */
function validateSpecArtifactProfileSemantics(config, errors) {
    if (!Object.prototype.hasOwnProperty.call(config, 'specArtifacts')) return;
    const profile = config.specArtifacts;
    if (profile === null) {
        errors.push('specArtifacts: expected a non-null object');
        return;
    }
    if (typeof profile !== 'object' || Array.isArray(profile)) return;
    try {
        if (typeof require !== 'function') {
            errors.push('specArtifacts: profile validator unavailable in this runtime');
            return;
        }
        require('./spec-artifact-profile.cjs').resolveSpecArtifactProfile(config);
    } catch (error) {
        errors.push(typeof error?.message === 'string' ? error.message : 'specArtifacts: invalid profile');
    }
}

/** Validate reference-doc ownership metadata and portable output/template paths. */
function validateReferenceDocsSemantics(config, errors, warnings) {
    if (!Array.isArray(config.referenceDocs)) return;

    const allowed = new Set(Object.keys(SCHEMA.referenceDocs.itemSchema));
    config.referenceDocs.forEach((doc, index) => {
        if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return;
        for (const key of Object.keys(doc)) {
            if (!allowed.has(key)) warnings.push(`referenceDocs[${index}].${key}: unknown property (not in schema)`);
        }
        try {
            validateReferenceDocDefinition(doc, index);
        } catch (error) {
            errors.push(error && typeof error.message === 'string'
                ? error.message
                : `referenceDocs[${index}]: invalid reference-doc definition`);
        }
    });
}

/** The optional feature-spec template destination is also a project-relative write path. */
function validateFeatureDocTemplateSemantics(config, errors) {
    const destination = config.workflowPatterns?.featureDocTemplate;
    // Existing adopters may use a blank optional value to request the framework
    // default. Keep that runtime contract; only validate a non-empty declaration.
    if (destination === undefined || destination === null || (typeof destination === 'string' && !destination.trim())) return;
    try {
        normalizeProjectRelativePath(destination, 'workflowPatterns.featureDocTemplate');
    } catch (error) {
        errors.push(error && typeof error.message === 'string'
            ? error.message
            : 'workflowPatterns.featureDocTemplate: invalid project-relative path');
    }
}

/**
 * The optional custom route protocol's file reference must stay inside the repository.
 * Runtime resolution is fail-soft (an escaping or unreadable path is treated as "no opinion"),
 * so this fail-closed plane is the only surface that catches a traversal typo or a stale path.
 * A repo-relative path that does not exist yet is a WARNING, not an error (same convention as
 * docsRoots): the protocol may be authored just after the config that points at it.
 */
function validatePortabilitySemantics(config, errors, warnings) {
    const protocol = config?.portability?.workflowRouteProtocol;
    if (!protocol || typeof protocol !== 'object' || Array.isArray(protocol)) return;
    const refPath = protocol.path;
    if (typeof refPath !== 'string' || !refPath.trim()) return;
    if (isAbsoluteProjectPath(refPath)) {
        errors.push('portability.workflowRouteProtocol.path: must be a repo-relative path without parent traversal (absolute paths and ".." segments are rejected)');
        return;
    }
    try {
        const { isPrivacySensitive } = require('./sensitive-path-policy.cjs');
        if (isPrivacySensitive(refPath)) {
            errors.push('portability.workflowRouteProtocol.path: points at a privacy-sensitive file (.env / credentials / secret / key) that the runtime refuses to inject into model context; declare a non-sensitive protocol document');
            return;
        }
    } catch {
        /* validator module unavailable in this runtime (VM sandbox); the runtime guard still applies */
    }
    const deps = semanticDeps();
    if (!deps) return;
    if (!deps.fs.existsSync(deps.path.resolve(deps.repoRoot, refPath))) {
        warnings.push(`portability.workflowRouteProtocol.path: "${refPath}" does not exist on disk`);
    }
}

/**
 * Validate a config object against the schema.
 * @param {object} config - The parsed project-config.json
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateDocSyncGate(gate, label = 'workflowPatterns.docSyncGate') {
    const errors = [];
    validateField(gate, SCHEMA.workflowPatterns.properties.docSyncGate, label, errors, []);
    if (Array.isArray(gate?.enforcedAreas)) {
        gate.enforcedAreas.forEach((area, index) => {
            const prefix = `${label}.enforcedAreas[${index}]`;
            if (typeof area?.name === 'string' && !area.name.trim()) errors.push(`${prefix}.name: must not be blank`);
            if (Array.isArray(area?.codePathPrefixes)) {
                if (!area.codePathPrefixes.length) errors.push(`${prefix}.codePathPrefixes: needs at least one code prefix`);
                area.codePathPrefixes.forEach((value, i) => {
                    if (typeof value === 'string' && !value.trim()) errors.push(`${prefix}.codePathPrefixes[${i}]: must not be blank`);
                });
            }
        });
    }
    return errors;
}

function validateConfig(config) {
    const errors = [];
    const warnings = [];

    if (!config || typeof config !== 'object') {
        return {
            valid: false,
            errors: ['Config must be a non-null object'],
            warnings: []
        };
    }

    // Validate each top-level section
    for (const [key, fieldSchema] of Object.entries(SCHEMA)) {
        validateField(config[key], fieldSchema, key, errors, warnings);
    }

    if (config.project && typeof config.project.name === 'string' && config.project.name.trim() === '') {
        errors.push('project.name: expected a non-empty project identity');
    }

    // An empty base branch would reach `git fetch origin ""`; omitting the key keeps the "main" default.
    if (config.pullRequest && typeof config.pullRequest.targetBranch === 'string' && config.pullRequest.targetBranch.trim() === '') {
        errors.push('pullRequest.targetBranch: expected a non-empty branch name; omit the key to use the default "main"');
    }

    validateExperienceVerificationSemantics(config, errors, warnings);
    validateE2eExecutionSemantics(config, errors, warnings);
    validateContextGroupSemantics(config, errors, warnings);
    validateReferenceDocsSemantics(config, errors, warnings);
    validateFeatureDocTemplateSemantics(config, errors);
    validateConventionInjectionSemantics(config, errors);
    validateTokenBudgetSemantics(config, errors);
    for (const name of ['uiReuseReminder', 'failureInvestigationReminder']) {
        const tokens = config.hooks?.[name]?.reinjectAfterTokens;
        if (tokens !== undefined) {
            const [min, max] = require('./file-conventions.cjs').CLASS_REINJECT_TOKENS_RANGE;
            if (!Number.isInteger(tokens) || tokens < min || tokens > max) {
                errors.push(`hooks.${name}.reinjectAfterTokens: expected an integer from ${min} through ${max}`);
            }
        }
    }
    validateSpecArtifactProfileSemantics(config, errors);
    validateDocsRootsSemantics(config, errors, warnings);
    validateSpecRootsSemantics(config, errors);
    validatePortabilitySemantics(config, errors, warnings);
    validateSkillProfileSemantics(config, errors, warnings);
    validateTaskTracking(config, errors);
    for (const error of validateDocSyncGate(config.workflowPatterns?.docSyncGate)) {
        if (!errors.includes(error)) errors.push(error);
    }

    // Check for unknown top-level keys
    const knownKeys = new Set(Object.keys(SCHEMA));
    for (const key of Object.keys(config)) {
        if (!knownKeys.has(key)) {
            warnings.push(`${key}: unknown top-level key (not in schema)`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Get list of required top-level sections.
 * @returns {string[]}
 */
function getRequiredSections() {
    return Object.entries(SCHEMA)
        .filter(([_, schema]) => schema.required || (schema.type === 'object' && schema.required !== false))
        .map(([key]) => key);
}

/**
 * Format validation result as a readable string.
 * @param {{ valid: boolean, errors: string[], warnings: string[] }} result
 * @returns {string}
 */
function formatResult(result) {
    const lines = [];
    if (result.valid) {
        lines.push('Schema validation: PASSED');
    } else {
        lines.push('Schema validation: FAILED');
        lines.push('');
        lines.push('Errors:');
        for (const err of result.errors) {
            lines.push(`  - ${err}`);
        }
    }
    if (result.warnings.length > 0) {
        lines.push('');
        lines.push('Warnings:');
        for (const warn of result.warnings) {
            lines.push(`  - ${warn}`);
        }
    }
    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA DESCRIPTION (for AI consumption)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate an example item object from an arrayOf itemSchema.
 * Shows exact field names with type and required/optional markers.
 */
function generateExampleItem(itemSchema) {
    const obj = {};
    for (const [field, def] of Object.entries(itemSchema)) {
        const req = def.required ? 'required' : 'optional';
        if (def.type === 'string') {
            obj[field] = def.isRegex
                ? `<regex> (${req})`
                : Array.isArray(def.enumValues) ? `<${def.enumValues.join('|')}> (${req})` : `<string> (${req})`;
        } else if (def.type === 'number') {
            obj[field] = `<number> (${req})`;
        } else if (def.type === 'array') {
            obj[field] = def.itemsAreRegex ? [`<regex> (${req})`] : [`<string> (${req})`];
        } else if (def.type === 'object') {
            obj[field] = `<object> (${req})`;
        } else {
            obj[field] = `<${def.type}> (${req})`;
        }
    }
    return obj;
}

/**
 * Describe a single schema field, appending lines to the output array.
 * @param {string} name - Field name
 * @param {object} schema - Field schema definition
 * @param {number} depth - Indentation depth
 * @param {string[]} lines - Output lines array
 */
/**
 * Emit a field's optional `describe` note as indented `#` comment lines, so
 * `--describe` teaches the authoring AI what a field is FOR and how to derive
 * its value — not just its name/type. Kept out of validation: `describe` is
 * emitter-only metadata on the schema field def, never validated against config.
 * @param {object} schema - Field schema definition (may carry `describe`)
 * @param {number} depth - Indentation depth for the comment lines
 * @param {string[]} lines - Output lines array
 */
function emitDescribe(schema, depth, lines) {
    if (!schema.describe) return;
    const indent = '  '.repeat(depth);
    for (const line of String(schema.describe).split('\n')) {
        lines.push(`${indent}# ${line}`);
    }
}

function describeField(name, schema, depth, lines) {
    const indent = '  '.repeat(depth);
    const depr = schema.deprecated ? ' [DEPRECATED]' : '';
    const req = schema.required ? 'required' : 'optional';

    if (schema.type === 'string' || schema.type === 'number' || schema.type === 'boolean') {
        const extra = schema.isRegex
            ? ', regex'
            : Array.isArray(schema.enumValues)
                ? `, one of ${schema.enumValues.join('|')}`
                : '';
        lines.push(`${indent}${name} (${schema.type}, ${req}${extra})${depr}`);
        emitDescribe(schema, depth + 1, lines);
    } else if (schema.type === 'array') {
        const extra = schema.itemsAreRegex ? ' of regexes' : schema.itemType ? ` of ${schema.itemType}s` : '';
        lines.push(`${indent}${name} (array${extra}, ${req})${depr}`);
        emitDescribe(schema, depth + 1, lines);
    } else if (schema.type === 'map') {
        const extra = schema.valuesAreRegex
            ? ', values are regexes'
            : Array.isArray(schema.valuesEnum)
                ? `, values one of ${schema.valuesEnum.join('|')}`
                : '';
        lines.push(`${indent}${name} (map${extra}, ${req})${depr}`);
        emitDescribe(schema, depth + 1, lines);
    } else if (schema.type === 'object') {
        lines.push(`${indent}${name} (object, ${req})${depr}`);
        emitDescribe(schema, depth + 1, lines);
        if (!schema.freeform && schema.properties) {
            for (const [prop, propSchema] of Object.entries(schema.properties)) {
                describeField(prop, propSchema, depth + 1, lines);
            }
        }
    } else if (schema.type === 'arrayOf') {
        lines.push(`${indent}${name} (array of objects, ${req})${depr} — each item:`);
        emitDescribe(schema, depth + 1, lines);
        if (schema.itemSchema) {
            const example = generateExampleItem(schema.itemSchema);
            const fields = Object.entries(example);
            lines.push(`${indent}  {`);
            fields.forEach(([key, value], index) => {
                lines.push(`${indent}    ${JSON.stringify(key)}: ${JSON.stringify(value)}${index === fields.length - 1 ? '' : ','}`);
            });
            lines.push(`${indent}  }`);
        }
    } else if (Array.isArray(schema.oneOf)) {
        const shapes = schema.oneOf.map((alt) => alt.type || 'value').join(' | ');
        lines.push(`${indent}${name} (${shapes}, ${req})${depr}`);
        emitDescribe(schema, depth + 1, lines);
        const objectAlt = schema.oneOf.find((alt) => alt.type === 'object' && alt.properties);
        if (objectAlt) {
            for (const [prop, propSchema] of Object.entries(objectAlt.properties)) {
                describeField(prop, propSchema, depth + 1, lines);
            }
        }
    }
}

/**
 * Generate human-readable schema description with example JSON shapes.
 * Use this output to ensure AI generates correct field names.
 * @returns {string} Schema documentation suitable for AI consumption
 */
function describeSchema() {
    const lines = ['# project-config.json Schema Reference', ''];
    for (const [key, fieldSchema] of Object.entries(SCHEMA)) {
        if (key === '_description') continue;
        describeField(key, fieldSchema, 0, lines);
        lines.push('');
    }
    return lines.join('\n');
}

module.exports = {
    SCHEMA,
    validateConfig,
    validateDocSyncGate,
    getRequiredSections,
    formatResult,
    validateRegex,
    contentRegexLintReason,
    describeSchema,
    WORKFLOW_ACTIVATION_TIERS,
    WORKFLOW_ROUTE_MODES,
    TOKEN_BUDGET_CHECKPOINT_RANGE,
    SKILL_PROFILE_PRESETS,
    SKILL_PROFILE_LISTS
};

// ═══════════════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.includes('--describe')) {
        console.log(describeSchema());
    } else if (args.includes('--validate')) {
        const fs = require('fs');
        const idx = args.indexOf('--validate');
        const configPath = args[idx + 1] || 'docs/project-config.json';
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            const result = validateConfig(config);
            console.log(formatResult(result));
            process.exit(result.valid ? 0 : 1);
        } catch (e) {
            console.error('Failed: ' + e.message);
            process.exit(1);
        }
    } else {
        console.log('Usage: --describe | --validate [path]');
    }
}
