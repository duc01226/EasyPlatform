#!/usr/bin/env node
/**
 * Session Init Helpers
 *
 * Shared constants and helper functions extracted from:
 *   - project-config-init.cjs (SKELETON, checkConfigStatus)
 *   - init-reference-docs.cjs (SCAN_SKILL_MAP, DEFAULT_REFERENCE_DOCS, etc.)
 *
 * Consumed by session-init-docs.cjs (the merged SessionStart hook).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const referenceRegistry = require('./project-reference-registry.cjs');
const {
    SCAN_SKILL_MAP,
    REFERENCE_DOC_ALIASES,
    resolveReferenceDocAlias,
    resolveReferenceDocTarget,
    resolveContainedPath
} = referenceRegistry;
const { validateConfig } = require('./project-config-schema.cjs');
const {
    loadProjectConfig,
    isConfigPopulated,
    getConfiguredProjectConfigPath,
    getConfiguredDocsIndexPath,
    PORTABILITY_TOKENS
} = require('./project-config-loader.cjs');
const { SCAN_STALE_PATH, SCAN_VERIFIED_PATH, ensureProjectTmpDir } = require('./ck-paths.cjs');
const { contentHash } = require('./doc-stamp-guard.cjs');
const { resolveProjectRoot } = require('./project-root.cjs');

const rootResolution = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env });
const PROJECT_DIR = rootResolution.rootDir;
const CONFIG_PATH = getConfiguredProjectConfigPath();
const DOCS_INDEX_PATH = getConfiguredDocsIndexPath();
const REFERENCE_DOCS_DIR = path.dirname(DOCS_INDEX_PATH);
const DOCS_DIR = path.dirname(REFERENCE_DOCS_DIR);

// =============================================================================
// SKELETON — from project-config-init.cjs
// =============================================================================

/** Force forward slashes so generated JSON never carries a Windows backslash. */
function toPosix(p) {
    return String(p).replace(/\\/g, '/');
}

/**
 * Reference-doc directory as a REPO-RELATIVE posix path.
 *
 * `getConfiguredDocsIndexPath()` returns an ABSOLUTE path
 * (`project-config-loader.cjs:28-31` joins onto the project root), but every value in
 * `project-config.json` is repo-relative — and the schema REJECTS an absolute one as
 * repo-escaping (`project-config-schema.cjs:1199`). Fail-soft: if the derived dir
 * cannot be expressed inside the repo, fall back to the documented default rather
 * than emitting a path the schema will reject.
 */
function referenceDocsRelDir() {
    const rel = toPosix(path.relative(PROJECT_DIR, REFERENCE_DOCS_DIR));
    if (!rel || rel.startsWith('..') || path.posix.isAbsolute(rel) || /^[A-Za-z]:/.test(rel)) {
        return PORTABILITY_TOKENS.REF_DOCS_ROOT.default;
    }
    return rel;
}

/** Join a filename onto the resolved reference-doc directory, POSIX-style. */
function referenceDocPath(filename) {
    return path.posix.join(referenceDocsRelDir(), filename);
}

/** Resolve a selected reference document under the active project's configured root. */
function getReferenceDocPath(docOrFilename) {
    const filename = typeof docOrFilename === 'string' ? docOrFilename : docOrFilename?.filename;
    return resolveContainedPath(REFERENCE_DOCS_DIR, filename, { projectRoot: PROJECT_DIR });
}

/** Resolve a configured template only when it remains physically inside the project. */
function getProjectTemplatePath(relativePath) {
    return resolveContainedPath(PROJECT_DIR, relativePath, { projectRoot: PROJECT_DIR });
}

/** Return a metadata value only when it contains a usable name. */
function usableProjectName(value) {
    if (typeof value !== 'string') return null;
    const name = value.trim();
    return name ? name : null;
}

/** Read a project name from a JSON package manifest without trusting malformed files. */
function readJsonPackageName(projectDir, filename) {
    try {
        const parsed = JSON.parse(fs.readFileSync(path.join(projectDir, filename), 'utf-8'));
        const name = usableProjectName(parsed?.name);
        if (name) return name;
        const repository = typeof parsed?.repository === 'string' ? parsed.repository : parsed?.repository?.url;
        return repositoryNameFromUrl(repository);
    } catch {
        return null;
    }
}

/** Extract only the final repository component; credentials and host details are discarded. */
function repositoryNameFromUrl(value) {
    const url = usableProjectName(value);
    if (!url) return null;
    const clean = url
        .replace(/^git\+/i, '')
        .replace(/[?#].*$/, '')
        .replace(/[\\/]+$/, '');
    const segments = clean.split(/[\\/:]/).filter(Boolean);
    const last = segments[segments.length - 1]?.replace(/\.git$/i, '');
    return usableProjectName(last);
}

/** Read a `name` value from one named TOML section. */
function readTomlSectionName(contents, acceptedSections) {
    let section = '';
    for (const line of contents.split(/\r?\n/)) {
        const sectionMatch = line.match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/);
        if (sectionMatch) {
            section = sectionMatch[1].trim();
            continue;
        }
        if (!acceptedSections.includes(section)) continue;
        const nameMatch = line.match(/^\s*name\s*=\s*["']([^"']+)["']/);
        if (nameMatch) return usableProjectName(nameMatch[1]);
    }
    return null;
}

/** Resolve `.git/config` for normal repositories and linked worktrees. */
function gitConfigPath(projectDir) {
    const dotGitPath = path.join(projectDir, '.git');
    try {
        if (fs.statSync(dotGitPath).isDirectory()) return path.join(dotGitPath, 'config');
        const pointer = fs.readFileSync(dotGitPath, 'utf-8').match(/^\s*gitdir:\s*(.+?)\s*$/im);
        if (pointer) return path.join(path.resolve(projectDir, pointer[1]), 'config');
    } catch {
        /* a repository without readable Git metadata still has its root-folder fallback */
    }
    return null;
}

/** Read the origin URL from Git metadata without invoking Git or exposing its credentials. */
function readGitOriginName(projectDir) {
    const configPath = gitConfigPath(projectDir);
    if (!configPath) return null;
    try {
        let inOrigin = false;
        for (const line of fs.readFileSync(configPath, 'utf-8').split(/\r?\n/)) {
            const section = line.match(/^\s*\[([^\]]+)\]\s*$/);
            if (section) {
                inOrigin = /^remote\s+"origin"$/i.test(section[1].trim());
                continue;
            }
            if (!inOrigin) continue;
            const url = line.match(/^\s*url\s*=\s*(.*?)\s*$/i);
            if (url) return repositoryNameFromUrl(url[1].replace(/^"|"$/g, ''));
        }
    } catch {
        /* repository metadata is a best-effort identity source */
    }
    return null;
}

/**
 * Derive an initial project identity from repository evidence. Package metadata wins,
 * followed by Git's origin repository name, then the project-root folder name.
 * This is identity-only: it deliberately does not infer stack or capability settings.
 */
function deriveProjectName(projectDir = PROJECT_DIR) {
    const jsonNames = ['package.json', 'composer.json'];
    for (const filename of jsonNames) {
        const name = readJsonPackageName(projectDir, filename);
        if (name) return name;
    }

    for (const [filename, sections] of [
        ['pyproject.toml', ['project', 'tool.poetry']],
        ['Cargo.toml', ['package']]
    ]) {
        try {
            const name = readTomlSectionName(fs.readFileSync(path.join(projectDir, filename), 'utf-8'), sections);
            if (name) return name;
        } catch {
            /* continue through other package metadata */
        }
    }

    try {
        const pubspec = fs.readFileSync(path.join(projectDir, 'pubspec.yaml'), 'utf-8');
        const match = pubspec.match(/^\s*name\s*:\s*["']?([^\s#"']+)["']?\s*(?:#.*)?$/m);
        if (match && usableProjectName(match[1])) return match[1].trim();
    } catch {
        /* not a Dart project */
    }

    try {
        const goMod = fs.readFileSync(path.join(projectDir, 'go.mod'), 'utf-8');
        const match = goMod.match(/^\s*module\s+([^\s]+)\s*$/m);
        if (match) {
            const name = repositoryNameFromUrl(match[1]);
            if (name) return name;
        }
    } catch {
        /* not a Go module */
    }

    return readGitOriginName(projectDir) || path.basename(path.resolve(projectDir)) || path.resolve(projectDir);
}

/**
 * Build the minimum valid project-config document for project initialization.
 * Optional settings stay absent until project-init has evidence for them; this avoids
 * presenting invented stacks, architectures, test runners, or UI capabilities as facts.
 *
 * @returns {object} a fresh, schema-valid minimal project config
 */
function buildSkeleton() {
    return {
        _description: 'Project-specific configuration consumed by .claude hooks. Add optional sections only when repository evidence supports them.',
        schemaVersion: 2,
        project: { name: deriveProjectName() }
    };
}

// =============================================================================
// checkConfigStatus — from project-config-init.cjs
// =============================================================================

/**
 * Check if project-config.json is still the skeleton (not populated with real values).
 * @returns {{ exists: boolean, isPopulated: boolean, hasSchemaErrors: boolean, schemaErrors: string[] }}
 */
function checkConfigStatus() {
    if (!fs.existsSync(CONFIG_PATH)) {
        return {
            exists: false,
            isPopulated: false,
            hasSchemaErrors: false,
            schemaErrors: []
        };
    }

    let config;
    try {
        config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {
        return {
            exists: true,
            isPopulated: false,
            hasSchemaErrors: true,
            schemaErrors: ['Invalid JSON']
        };
    }

    // Schema validation
    const result = validateConfig(config);
    const schemaErrors = result.valid ? [] : result.errors;

    // Delegate populated check to shared helper (DRY)
    const isPopulated = isConfigPopulated(config);

    return {
        exists: true,
        isPopulated,
        hasSchemaErrors: schemaErrors.length > 0,
        schemaErrors
    };
}

// =============================================================================
// SCAN_SKILL_MAP — from init-reference-docs.cjs
// =============================================================================

// Built-in scan ownership lives in project-reference-registry.cjs so schema, hooks,
// skills, and impact routing use one exact-filename catalog.

// =============================================================================
// DEFAULT_REFERENCE_DOCS — from init-reference-docs.cjs
// =============================================================================

const REFERENCE_DOC_CATALOG = [
    {
        filename: 'project-structure-reference.md',
        purpose: 'Project purpose, source ownership, entry points, toolchain and supported operations.',
        sections: ['Purpose & Boundaries', 'Owners & Entry Points', 'Toolchain & Operations', 'Discovery']
    },
    {
        filename: 'backend-patterns-reference.md',
        purpose: 'Server-side intended practice, ownership, lifecycle, constraints and verified discovery.',
        sections: ['Purpose & Boundaries', 'Intended Practice', 'Preconditions & Exceptions', 'Discovery']
    },
    {
        filename: 'seed-test-data-reference.md',
        purpose: 'Seed test data patterns: idempotent seeder architecture, DI scope safety, command dispatch, and config-driven counts.',
        sections: [],
        templatePath: '.claude/templates/reference-docs/seed-test-data-reference.md'
    },
    {
        filename: 'frontend-patterns-reference.md',
        purpose: 'UI composition, state/data flow, lifecycle, constraints and verified discovery.',
        sections: ['Purpose & Boundaries', 'Intended Practice', 'Preconditions & Exceptions', 'Discovery']
    },
    {
        filename: 'integration-test-reference.md',
        purpose: 'Integration boundaries, execution, isolation, assertions and verified discovery.',
        sections: ['Execution & Boundaries', 'Fixtures & Isolation', 'Assertions & Exceptions', 'Discovery']
    },
    {
        filename: 'performance-test-reference.md',
        purpose: 'Project performance-test preferences: reusable harness, workload/data/resource budgets, commands and evidence.',
        sections: [],
        templatePath: '.claude/templates/reference-docs/performance-test-reference.md'
    },
    {
        filename: 'feature-spec-reference.md',
        purpose: 'Feature documentation patterns: app-to-service mapping, doc structure, templates, and conventions.',
        sections: ['App-to-Service Mapping', 'Feature Doc Structure', 'Templates', 'Conventions'],
        templatePath: '.claude/templates/reference-docs/feature-spec-reference.md'
    },
    {
        filename: 'spec-system-reference.md',
        purpose: 'Spec system routing: configured spec roots, canonical Feature Spec ownership, TC registry location, and derived index/ERD rules.',
        sections: [],
        templatePath: '.claude/templates/reference-docs/spec-system-reference.md'
    },
    {
        filename: 'spec-principles.md',
        purpose: 'Spec quality principles: completeness criteria, AI-implementability, test coverage mapping, and tech-agnostic standards.',
        sections: [],
        templatePath: '.claude/templates/reference-docs/spec-principles.md'
    },
    {
        filename: 'workflow-spec-test-code-cycle-reference.md',
        purpose: 'Workflow spec-test-code cycle: local workflow sequence, artifact ownership, verification gates, and generated mirror sync.',
        sections: [],
        templatePath: '.claude/templates/reference-docs/workflow-spec-test-code-cycle-reference.md'
    },
    {
        filename: 'code-review-rules.md',
        purpose: 'Code review rules, conventions, anti-patterns, decision trees, and checklists.',
        sections: ['Critical Rules', 'Backend Rules', 'Frontend Rules', 'Architecture Rules', 'Anti-Patterns', 'Checklists']
    },
    {
        filename: 'lessons.md',
        purpose: 'Learned lessons from past sessions — written and managed via the /learn skill (not auto-injected).',
        sections: []
    },
    {
        filename: 'custom-prompts-reference.md',
        purpose: 'Index of project-specific custom prompts (name, description, triggers) — written and managed via the /custom-prompt skill; bodies live in docs/project-prompts/.',
        sections: [],
        templatePath: '.claude/templates/reference-docs/custom-prompts-reference.md'
    },
    {
        filename: 'skill-protocols-reference.md',
        purpose:
            'Index of project protocol overlays layered onto framework skills (target, scope, description) — written and managed via the /project-skill-protocol skill; bodies live in docs/project-protocols/.',
        sections: [],
        templatePath: '.claude/templates/reference-docs/skill-protocols-reference.md'
    },
    {
        filename: 'scss-styling-guide.md',
        purpose: 'SCSS/CSS styling guide: BEM methodology, mixins, variables, theming, responsive patterns.',
        sections: ['BEM Methodology', 'SCSS Architecture', 'Mixins & Variables', 'Theming', 'Responsive Patterns']
    },
    {
        filename: 'design-system/README.md',
        purpose: 'Design system index: app-to-doc mapping, design tokens overview, component inventory.',
        sections: ['Design System Overview', 'App Documentation Map', 'Design Tokens', 'Component Inventory']
    },
    {
        filename: 'e2e-test-reference.md',
        purpose: 'E2E test patterns: framework architecture, page objects, test configuration, and best practices.',
        sections: [
            'Architecture Overview',
            'Project Structure',
            'Key Dependencies',
            'Base Classes',
            'Page Object Pattern',
            'Wait & Assertion Patterns',
            'Configuration',
            'Running Tests',
            'Best Practices'
        ]
    },
    {
        filename: 'domain-entities-reference.md',
        purpose: 'Domain concepts, invariants, ownership, representations and verified relationships.',
        sections: ['Concepts & Invariants', 'Ownership & Relationships', 'Preconditions & Exceptions', 'Discovery']
    },
    {
        filename: 'docs-index-reference.md',
        purpose: 'Documentation tree, file counts by category, doc relationships, and keyword-to-doc lookup table.',
        sections: ['Documentation System', 'Documentation Graph', 'Key Doc Relationships', 'Doc Lookup Guide']
    }
];

// Task-specific reference docs are opt-in by configuration or repository evidence.
// A minimal project has no universal stack-specific reference floor; shared guidance
// lives under `.claude/docs`, and the two project-routing inputs below are separate owners.
const PORTABLE_BASELINE_REFERENCE_DOCS = Object.freeze([]);
const DEFAULT_REFERENCE_DOCS = PORTABLE_BASELINE_REFERENCE_DOCS;

// Always-on routing inputs are not members of the task-specific `referenceDocs` selection.
const ALWAYS_ON_PROJECT_CONTEXT_DOCS = Object.freeze(
    REFERENCE_DOC_CATALOG.filter(doc => ['lessons.md', 'docs-index-reference.md'].includes(doc.filename))
);

/** Return always-on owner docs, resolving docs-index to the configured index file path. */
function getAlwaysOnReferenceDocs() {
    const configuredIndexName = path.basename(DOCS_INDEX_PATH) || 'docs-index-reference.md';
    return ALWAYS_ON_PROJECT_CONTEXT_DOCS.map(doc => ({
        ...doc,
        filename: doc.filename === 'docs-index-reference.md' ? configuredIndexName : doc.filename
    }));
}

// Placeholder marker — present in all generated placeholder docs
const PLACEHOLDER_MARKER = "<!-- Fill in your project's details below. -->";

// Claude-only sentinel for SCSS/CSS placeholders — non-prose so a real authored
// token file cannot collide with this string by accident. Detection in
// isPlaceholderFile is LINE-ANCHORED (full-line equality, not substring).
// MUST be removed by /scan --target=design-system Phase 3 authoring step.
const PLACEHOLDER_MARKER_SCSS = "/* @claude:placeholder — do not commit */";

// =============================================================================
// Helper functions — from init-reference-docs.cjs
// =============================================================================

/**
 * Check if a file is still a placeholder (not yet populated with real content).
 * Reads first 512 bytes and checks for the placeholder marker as a full line.
 * Marker is selected by file extension: SCSS/CSS uses PLACEHOLDER_MARKER_SCSS,
 * everything else uses the Markdown PLACEHOLDER_MARKER.
 * Detection is LINE-ANCHORED — substring .includes() would false-positive on
 * docs that quote the sentinel literally (e.g., a README explaining placeholders).
 * @param {string} filePath
 * @returns {boolean}
 */
function isPlaceholderFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) return false;
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(512);
        fs.readSync(fd, buf, 0, 512, 0);
        fs.closeSync(fd);
        const head = buf.toString('utf-8');
        const ext = path.extname(filePath).toLowerCase();
        const marker = (ext === '.scss' || ext === '.css') ? PLACEHOLDER_MARKER_SCSS : PLACEHOLDER_MARKER;
        return head.split('\n').some(line => line.trim() === marker);
    } catch {
        return false;
    }
}

/**
 * Check if project-config.json exists and is populated (not skeleton).
 * @returns {{ exists: boolean, isPopulated: boolean, needsInit: boolean }}
 */
function checkProjectConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        return { exists: false, isPopulated: false, needsInit: true };
    }

    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

        // Delegate populated check to shared helper (DRY)
        // Fixes bug: previously used .length > 1 instead of filtering ExampleService
        const populated = isConfigPopulated(config);

        return { exists: true, isPopulated: populated, needsInit: !populated };
    } catch {
        // Invalid JSON - needs init
        return { exists: true, isPopulated: false, needsInit: true };
    }
}

// =============================================================================
// REFERENCE DOC SELECTION — portable defaults, alias migration, deduplication
// =============================================================================

/**
 * Legacy reference-doc filename → canonical filename.
 *
 * The framework is canonical; a project's config is brought INTO convention, never
 * the reverse. When a canonical doc is renamed across framework versions, add the
 * old→new mapping here (one line) and every layer — runtime merge, config
 * normalization, and the project-config/project-init repair skills — migrates
 * automatically. Without this map, legacy projects silently re-diverge.
 */
/**
 * Resolve a (possibly legacy) reference-doc filename to its canonical filename.
 * @param {string} filename
 * @returns {string}
 */
/**
 * Resolve a project's explicit reference-doc selection, using only the empty portable
 * baseline when called without a selection. Capability-aware defaults are added by
 * `resolveDefaultReferenceDocs`, which has access to the complete project config.
 *
 * Semantics:
 *   - Missing or non-array selection uses DEFAULT_REFERENCE_DOCS (empty for a minimal project).
 *   - An explicit array is authoritative, including []; selected docs keep their
 *     configured order and unselected canonical docs are never injected.
 *   - Legacy filenames are resolved to canonical (REFERENCE_DOC_ALIASES); aliases and
 *     duplicates collapse at the first selected position. A canonical-named entry wins
 *     over an alias targeting the same canonical doc.
 *   - A config entry matching a canonical doc may override `purpose` (non-empty) and
 *     `sections` (non-empty). The canonical `templatePath` is authoritative for
 *     template-backed docs; config may only SUPPLY a templatePath where canonical has
 *     none — it can never repoint a framework template at a wrong/legacy source.
 *   - Project-specific docs and their metadata/templates are preserved in config order.
 *
 * @param {Array<{filename: string, purpose?: string, sections?: string[], templatePath?: string, scanTarget?: string}>} [configDocs]
 * @returns {Array<{filename: string, purpose: string, sections?: string[], templatePath?: string, scanTarget?: string}>}
 */
function mergeReferenceDocs(configDocs) {
    const canonicalNames = new Set(REFERENCE_DOC_CATALOG.map(d => d.filename));
    if (!Array.isArray(configDocs)) return DEFAULT_REFERENCE_DOCS.map(doc => ({ ...doc }));

    const selected = new Map(); // resolved filename -> selected config entry
    const selectionOrder = [];

    for (const doc of configDocs) {
        if (!doc || typeof doc.filename !== 'string' || doc.filename.trim() === '') continue;
        // Trim only — NEVER case-fold: filesystems are case-sensitive.
        const filename = doc.filename.trim();
        const resolved = resolveReferenceDocAlias(filename);
        const isLegacyAlias = filename !== resolved;
        const existing = selected.get(resolved);

        if (canonicalNames.has(resolved)) {
            // Preserve the first selected position. A canonical entry beats an alias;
            // among multiple canonical entries, the last canonical value remains authoritative.
            if (!existing) selectionOrder.push(resolved);
            if (!existing || !isLegacyAlias) {
                selected.set(resolved, { doc, canonical: true });
            }
        } else if (!existing) {
            selectionOrder.push(resolved);
            selected.set(resolved, {
                doc: { ...doc, filename: resolved },
                canonical: false
            });
        }
    }

    return selectionOrder.map(filename => {
        const entry = selected.get(filename);
        if (!entry.canonical) return entry.doc;

        const canonical = REFERENCE_DOC_CATALOG.find(doc => doc.filename === filename);
        const out = { ...canonical };
        const override = entry.doc;
        if (typeof override.purpose === 'string' && override.purpose.trim() !== '') out.purpose = override.purpose;
        if (override.notApplicable === true) out.notApplicable = true;
        if (Array.isArray(override.sections) && override.sections.length > 0) out.sections = override.sections;
        // Canonical templatePath is authoritative; config may only fill a gap.
        if (!out.templatePath && typeof override.templatePath === 'string' && override.templatePath.trim() !== '') {
            out.templatePath = override.templatePath.trim();
        }
        return out;
    });
}

/** A known reference doc selected only when the matching project capability is evidenced. */
const CAPABILITY_REFERENCE_DOCS = Object.freeze({
    projectStructure: ['project-structure-reference.md'],
    backend: ['backend-patterns-reference.md'],
    frontend: ['frontend-patterns-reference.md'],
    integrationTests: ['integration-test-reference.md'],
    performanceTests: ['performance-test-reference.md'],
    featureSpecs: [
        'feature-spec-reference.md',
        'spec-system-reference.md',
        'spec-principles.md',
        'workflow-spec-test-code-cycle-reference.md'
    ],
    scss: ['scss-styling-guide.md'],
    designSystem: ['design-system/README.md'],
    e2e: ['e2e-test-reference.md'],
    domainModel: ['domain-entities-reference.md'],
    codeReview: ['code-review-rules.md']
});

function hasConfiguredValue(value) {
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    if (!value || typeof value !== 'object') return false;
    return Object.entries(value).some(([key, item]) => !key.startsWith('_') && hasConfiguredValue(item));
}

function hasFrameworkDoc(config, key) {
    return typeof config?.framework?.[key] === 'string' && config.framework[key].trim() !== '';
}

function moduleHasDomainSemantics(module) {
    const descriptors = [module?.kind, ...(Array.isArray(module?.tags) ? module.tags : [])]
        .filter(value => typeof value === 'string')
        .join(' ')
        .toLowerCase();
    return /\bdomain\b/.test(descriptors);
}

/**
 * Derive optional reference docs only from concrete config declarations. The framework
 * never treats a generic `framework.name`, a database file, or an arbitrary source folder
 * as proof that every backend/UI/test pattern applies. Scans and project-init may add a
 * selected reference after they establish a capability; otherwise task skills inspect the
 * project just in time and absent capabilities remain absent.
 *
 * @param {object} [config] - project-config.json, loaded from the configured path if omitted
 * @returns {Array<{filename: string, purpose: string, sections?: string[], templatePath?: string, scanTarget?: string}>}
 */
function resolveDefaultReferenceDocs(config = loadProjectConfig()) {
    const projectConfig = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
    const selected = new Set(PORTABLE_BASELINE_REFERENCE_DOCS.map(doc => doc.filename));
    const modules = Array.isArray(projectConfig.modules) ? projectConfig.modules : [];
    const styling = projectConfig.styling || {};
    const includeCapability = name => {
        for (const filename of CAPABILITY_REFERENCE_DOCS[name] || []) selected.add(filename);
    };

    if (hasConfiguredValue(projectConfig.modules)) includeCapability('projectStructure');
    if (
        hasFrameworkDoc(projectConfig, 'backendPatternsDoc') ||
        hasConfiguredValue(projectConfig.backendServices) ||
        hasConfiguredValue(projectConfig.api) ||
        hasConfiguredValue(projectConfig.databases) ||
        hasConfiguredValue(projectConfig.messaging)
    ) includeCapability('backend');
    if (
        hasFrameworkDoc(projectConfig, 'frontendPatternsDoc') ||
        hasConfiguredValue(projectConfig.frontendApps) ||
        hasConfiguredValue(projectConfig.designSystem) ||
        modules.some(module => /\b(frontend|ui|client)\b/i.test(`${module?.kind || ''} ${(module?.tags || []).join(' ')}`))
    ) includeCapability('frontend');
    if (
        hasFrameworkDoc(projectConfig, 'integrationTestDoc') ||
        hasConfiguredValue(projectConfig.integrationTestVerify) ||
        (Array.isArray(projectConfig.testing?.integrationRules) && projectConfig.testing.integrationRules.length > 0)
    ) includeCapability('integrationTests');
    if (
        hasFrameworkDoc(projectConfig, 'performanceTestDoc') ||
        hasConfiguredValue(projectConfig.testing?.filePatterns?.performance)
    ) includeCapability('performanceTests');
    if (hasFrameworkDoc(projectConfig, 'e2eTestDoc') || hasConfiguredValue(projectConfig.e2eTesting)) {
        includeCapability('e2e');
    }
    if (
        hasConfiguredValue(projectConfig.scss) ||
        (Array.isArray(styling.fileExtensions) && styling.fileExtensions.some(ext => /\.(scss|sass)$/i.test(ext))) ||
        (typeof styling.technology === 'string' && /\b(scss|sass)\b/i.test(styling.technology)) ||
        (Array.isArray(styling.patterns) && styling.patterns.some(pattern => hasConfiguredValue(pattern?.scssExamples)))
    ) includeCapability('scss');
    if (hasConfiguredValue(projectConfig.designSystem)) includeCapability('designSystem');
    if (modules.some(moduleHasDomainSemantics)) includeCapability('domainModel');
    if (
        hasConfiguredValue(projectConfig.specRoots?.business) ||
        hasConfiguredValue(projectConfig.specArtifacts) ||
        (typeof projectConfig.workflowPatterns?.featureDocTemplate === 'string' && projectConfig.workflowPatterns.featureDocTemplate.trim() !== '')
    ) {
        for (const filename of CAPABILITY_REFERENCE_DOCS.featureSpecs) selected.add(filename);
    }
    if (hasFrameworkDoc(projectConfig, 'codeReviewDoc')) includeCapability('codeReview');

    return mergeReferenceDocs([...selected].map(filename => ({ filename })));
}

/**
 * Normalize the configured reference-doc selection and report the repairs needed for
 * config-writing callers. An absent selection resolves from the supplied project-config
 * evidence (which may yield an empty list); explicit arrays remain authoritative and never
 * report unselected defaults as additions.
 *
 * @param {Array} [configDocs] - current config.referenceDocs
 * @param {object} [projectConfig] - full config used only when referenceDocs is absent
 * @returns {{
 *   normalized: Array,                                  // what config.referenceDocs SHOULD be
 *   renames: Array<{from: string, to: string}>,         // legacy→canonical file migrations to apply
 *   added: string[],                                    // default filenames to add when selection is absent
 *   removedLegacy: string[],                            // legacy filenames to drop from config
 *   changed: boolean                                    // true if config differs from normalized selection
 * }}
 */
function normalizeReferenceDocs(configDocs, projectConfig) {
    const hasExplicitSelection = Array.isArray(configDocs);
    const before = hasExplicitSelection ? configDocs : [];
    const normalized = hasExplicitSelection
        ? mergeReferenceDocs(configDocs)
        : resolveDefaultReferenceDocs(projectConfig === undefined ? loadProjectConfig() : projectConfig);

    // Trim once (never case-fold), mirroring mergeReferenceDocs, so a trailing-space legacy
    // entry is detected as a rename here too instead of surviving silently in config.
    // Empty/whitespace-only filenames are dropped.
    const beforeNames = before
        .map(d => (d && typeof d.filename === 'string') ? d.filename.trim() : '')
        .filter(Boolean);

    const renames = [];
    const removedLegacy = [];
    const seenLegacy = new Set(); // a duplicate
                                  // legacy entry must not emit duplicate rename/removal instructions.
    for (const name of beforeNames) {
        const resolved = resolveReferenceDocAlias(name);
        if (resolved !== name && !seenLegacy.has(name)) {
            seenLegacy.add(name);
            renames.push({ from: name, to: resolved });
            removedLegacy.push(name);
        }
    }

    const satisfied = new Set(beforeNames.map(resolveReferenceDocAlias));
    const added = hasExplicitSelection ? [] : normalized.map(d => d.filename).filter(name => !satisfied.has(name));

    const afterNames = normalized.map(d => d.filename);
    const changed = renames.length > 0 || added.length > 0 ||
        beforeNames.length !== afterNames.length ||
        beforeNames.some((n, i) => n !== afterNames[i]);

    return { normalized, renames, added, removedLegacy, changed };
}

// A purpose that OPENS with, or parenthesizes, an N/A marker ("N/A — …", "Backend patterns (N/A for …)").
// Anchored so ordinary prose ("mocks are not applicable here") never hides a real doc. The root-context
// builder reads the same declaration (`declaresNotApplicable` in the ai-context-refresh section builders,
// which must run without this lib); TC-PCI-032 keeps the two readers equal.
const NOT_APPLICABLE_PURPOSE = /^\s*(?:N\/A|not applicable)\b|\(\s*(?:N\/A|not applicable)\b/i;

/**
 * True when a `referenceDocs[]` entry declares its doc not applicable to the project:
 * explicit `notApplicable: true`, or an N/A purpose marker.
 * @param {{notApplicable?: boolean, purpose?: string}} doc
 * @returns {boolean}
 */
function isReferenceDocNotApplicable(doc) {
    return doc?.notApplicable === true || NOT_APPLICABLE_PURPOSE.test(String(doc?.purpose || ''));
}

/**
 * Load configured reference doc definitions. An explicit array is exact; an absent
 * property receives only capability docs supported by config evidence.
 * @returns {Array<{filename: string, purpose: string, sections?: string[], templatePath?: string, scanTarget?: string}>}
 */
function getReferenceDocs(config = loadProjectConfig()) {
    const projectConfig = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
    return Array.isArray(projectConfig.referenceDocs)
        ? mergeReferenceDocs(projectConfig.referenceDocs)
        : resolveDefaultReferenceDocs(projectConfig);
}

/** Resolve built-in, generic, or manual scan ownership for a selected reference doc. */
function getReferenceDocScanTarget(docOrFilename) {
    const filename = typeof docOrFilename === 'string' ? docOrFilename : docOrFilename?.filename;
    if (filename === path.basename(DOCS_INDEX_PATH)) {
        return { kind: 'built-in', command: 'scan --target=docs-index' };
    }
    return resolveReferenceDocTarget(docOrFilename);
}

function getReferenceDocScanSkill(docOrFilename) {
    return getReferenceDocScanTarget(docOrFilename).command;
}

/**
 * Generate placeholder content from a doc definition.
 * Branches on file extension: .scss/.css → SCSS-style body using
 * PLACEHOLDER_MARKER_SCSS sentinel; everything else (default .md) → Markdown
 * body using PLACEHOLDER_MARKER. Title transform strips .md/.scss/.css.
 * If doc.templatePath is provided and exists, that template is copied as-is.
 *
 * @param {{filename: string, purpose: string, sections?: string[], templatePath?: string}} doc
 * @returns {string}
 */
function generatePlaceholderContent(doc) {
    // Optional template passthrough for docs that need rich defaults.
    if (typeof doc.templatePath === 'string' && doc.templatePath.trim() !== '') {
        const rawTemplatePath = doc.templatePath.trim();
        const templatePath = getProjectTemplatePath(rawTemplatePath);
        try {
            if (fs.existsSync(templatePath) && fs.statSync(templatePath).isFile()) {
                const templateContent = fs.readFileSync(templatePath, 'utf-8');
                return templateContent.endsWith('\n') ? templateContent : (templateContent + '\n');
            }
        } catch {
            /* fall through to generated placeholder content */
        }
    }

    const ext = path.extname(doc.filename).toLowerCase();
    const baseName = doc.filename
        .replace(/\.(md|scss|css)$/, '')
        .replace(/.*\//, ''); // strip directory prefix for title
    const title = baseName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const sections = doc.sections || [];

    if (ext === '.scss' || ext === '.css') {
        const lines = [
            `/* ${title} */`,
            '',
            `/* This file is referenced by Claude skills and agents for project-specific design tokens. */`,
            PLACEHOLDER_MARKER_SCSS
        ];
        // .scss accepts both // and /* */; .css spec only accepts /* */. Use /* */ for both.
        for (const section of sections) {
            lines.push('', `/* ${section} */`, `/* Document your ${section.toLowerCase()} here */`);
        }
        return lines.join('\n') + '\n';
    }

    // Markdown default (preserves existing behaviour; literal marker → constant)
    const lines = [
        `# ${title}`,
        '',
        `<!-- This file is referenced by Claude skills and agents for project-specific context. -->`,
        PLACEHOLDER_MARKER
    ];
    for (const section of sections) {
        lines.push('', `## ${section}`, '', `<!-- Document your ${section.toLowerCase()} here -->`);
    }
    return lines.join('\n') + '\n';
}

/**
 * Initialize design system app-specific docs from project-config.json designSystem.appMappings.
 * These are dynamic (project-specific), not part of the static referenceDocs list.
 * @returns {string[]} List of created file descriptions
 */
function initDesignSystemAppDocs() {
    if (rootResolution.error) return [];
    const created = [];
    try {
        const config = loadProjectConfig();
        // Same derivation as the skeleton: a project that relocated its reference-doc
        // tree but never set `designSystem.docsPath` must not fall back to the literal.
        const docsPath = config.designSystem?.docsPath || referenceDocPath('design-system');
        const appMappings = config.designSystem?.appMappings;
        if (!Array.isArray(appMappings) || appMappings.length === 0) return created;

        for (const app of appMappings) {
            if (!app.docFile) continue;
            const filePath = path.join(PROJECT_DIR, docsPath, app.docFile);
            if (fs.existsSync(filePath)) continue;

            const parentDir = path.dirname(filePath);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }
            const doc = {
                filename: app.docFile,
                purpose: `Design system documentation for ${app.name || app.docFile}.`,
                sections: ['Color Tokens', 'Typography', 'Component Patterns', 'Layout Conventions']
            };
            fs.writeFileSync(filePath, generatePlaceholderContent(doc), 'utf-8');
            created.push(`- \`${docsPath}/${app.docFile}\` — ${doc.purpose}`);
        }
    } catch {
        /* non-blocking */
    }
    return created;
}

// =============================================================================
// GREENFIELD DETECTION — shared helpers for hooks & skills
// =============================================================================

/**
 * Non-dot-prefixed directories to ignore when checking if a project has content.
 * Dot-prefixed directories (e.g., .claude, .git, .github, .vscode, .idea, .devcontainer,
 * .husky, .cursor, .windsurf, .circleci, .docker, etc.) are ALL ignored automatically
 * via the dot-prefix check in hasProjectContent() — no need to list them here.
 */
const IGNORED_ROOT_DIRS = new Set(['node_modules']);

/**
 * Check if a directory name should be ignored when detecting project content.
 * Ignores: all dot-prefixed (hidden) directories + explicit non-dot exceptions.
 *
 * @param {string} name - Directory name
 * @returns {boolean} true if the directory should be ignored
 */
function isIgnoredDir(name) {
    return name.startsWith('.') || IGNORED_ROOT_DIRS.has(name);
}

/**
 * Check if the project root contains at least one real content directory
 * (i.e., a directory that is NOT a hidden/tool/config directory).
 *
 * Ignores all dot-prefixed directories (.git, .claude, .vscode, .github, .idea,
 * .devcontainer, .husky, .cursor, .windsurf, etc.) and node_modules.
 *
 * Use case: Guard session-init hooks from creating skeleton files in empty projects.
 *
 * @param {string} [projectDir] - Project root (defaults to PROJECT_DIR)
 * @returns {boolean} true if project has at least one content directory
 */
function hasProjectContent(projectDir) {
    const dir = projectDir || PROJECT_DIR;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        return entries.some(e => e.isDirectory() && !isIgnoredDir(e.name));
    } catch {
        return false;
    }
}

/**
 * Common code directories that indicate a project has been scaffolded.
 * If ANY of these exist with content, the project is NOT greenfield.
 * Covers conventions across major ecosystems:
 *   - src/ (universal), app/ (Rails, Next.js, Laravel), lib/ (Ruby, Elixir, Dart)
 *   - server/ + client/ (fullstack), backend/ + frontend/ (monorepo)
 *   - cmd/ + pkg/ + internal/ (Go), packages/ (monorepo workspaces)
 */
const CODE_DIRECTORIES = ['src', 'app', 'lib', 'server', 'client', 'backend', 'frontend', 'cmd', 'pkg', 'internal', 'packages'];

/**
 * Manifest files that indicate a project has been initialized with a tech stack.
 */
const MANIFEST_FILES = [
    'package.json',
    '*.sln',
    '*.csproj',
    'Cargo.toml',
    'go.mod',
    'pyproject.toml',
    'requirements.txt',
    'pom.xml',
    'build.gradle',
    'Gemfile',
    'composer.json',
    'Makefile',
    'CMakeLists.txt'
];

/**
 * Check if the project is a greenfield (no code, no tech stack).
 *
 * Greenfield = ALL of:
 *   - No code directories with content (src/, app/, lib/, server/, etc.)
 *   - No manifest files (package.json, *.sln, etc.)
 *   - No populated project-config.json
 *   - Planning artifacts (.claude/, docs/, plans/, team-artifacts/, README) may exist — still greenfield
 *
 * Use case: Skills switch to solution-architect mode when greenfield detected.
 *
 * @param {string} [projectDir] - Project root (defaults to PROJECT_DIR)
 * @returns {boolean} true if project is greenfield (no existing codebase)
 */
function isGreenfieldProject(projectDir) {
    const dir = projectDir || PROJECT_DIR;
    try {
        // Check for any code directory with content
        for (const codeDir of CODE_DIRECTORIES) {
            const codePath = path.join(dir, codeDir);
            try {
                if (fs.existsSync(codePath) && fs.statSync(codePath).isDirectory()) {
                    const dirEntries = fs.readdirSync(codePath);
                    if (dirEntries.length > 0) return false;
                }
            } catch {
                /* skip unreadable dirs */
            }
        }

        // Check for manifest files
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
            for (const pattern of MANIFEST_FILES) {
                if (pattern.startsWith('*')) {
                    // Glob match (e.g., *.sln)
                    if (entry.endsWith(pattern.slice(1))) return false;
                } else {
                    if (entry === pattern) return false;
                }
            }
        }

        // Check for populated project-config.json
        const configuredConfigPath = path.relative(PROJECT_DIR, CONFIG_PATH);
        const configPath = dir === PROJECT_DIR
            ? CONFIG_PATH
            : path.join(dir, configuredConfigPath);
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                if (isConfigPopulated(config)) return false;
            } catch {
                /* invalid JSON = not populated */
            }
        }

        return true;
    } catch {
        return true; // If we can't read the directory, assume greenfield
    }
}

// =============================================================================
// STALENESS DETECTION — reference doc freshness enforcement
// =============================================================================

const LAST_SCANNED_RE = /<!--\s*Last scanned:\s*(\d{4}-\d{2}-\d{2})\s*-->/;

/**
 * Parse the <!-- Last scanned: YYYY-MM-DD --> timestamp from a reference doc.
 * Reads only the first 200 bytes for performance.
 * @param {string} filePath - Absolute path to the reference doc
 * @returns {Date|null} Parsed date or null if not found/invalid
 */
function parseLastScannedDate(filePath) {
    try {
        if (!fs.existsSync(filePath)) return null;
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(200);
        fs.readSync(fd, buf, 0, 200, 0);
        fs.closeSync(fd);
        const match = buf.toString('utf-8').match(LAST_SCANNED_RE);
        if (!match) return null;
        const date = new Date(match[1] + 'T00:00:00Z');
        return isNaN(date.getTime()) ? null : date;
    } catch {
        return null;
    }
}

/**
 * Read the local freshness ledger.
 *
 * Records scans that correctly wrote NOTHING because the doc's content had not
 * changed. Without it, suppressing a no-op stamp rewrite would leave the doc
 * looking permanently stale and make the `.scan-stale` nag unclearable.
 *
 * @returns {Record<string, {verifiedAt: string, contentHash: string}>} Empty on any failure
 */
function readScanVerifiedLedger() {
    try {
        if (!fs.existsSync(SCAN_VERIFIED_PATH)) return {};
        const parsed = JSON.parse(fs.readFileSync(SCAN_VERIFIED_PATH, 'utf-8'));
        return parsed && typeof parsed === 'object' && parsed.docs && typeof parsed.docs === 'object'
            ? parsed.docs
            : {};
    } catch {
        return {}; // Corrupt or unreadable ledger degrades to stamp-only behavior
    }
}

/**
 * Resolve a ledger entry into a verification date — but ONLY while it still
 * describes the file currently on disk.
 *
 * The hash gate is what makes an untracked ledger safe to trust: an entry whose
 * content hash no longer matches describes a doc that has since changed, so it
 * proves nothing about the current file and is ignored.
 *
 * @param {object} entry - Ledger entry for one doc
 * @param {string} filePath - Absolute path to the doc
 * @returns {Date|null} Verification date, or null when the entry cannot be trusted
 */
function resolveVerifiedDate(entry, filePath) {
    if (!entry || typeof entry.verifiedAt !== 'string' || typeof entry.contentHash !== 'string') return null;
    const date = new Date(`${entry.verifiedAt.slice(0, 10)}T00:00:00Z`);
    if (isNaN(date.getTime())) return null;
    // A future date would suppress the staleness gate forever — and precisely
    // because nobody rescans, nothing would ever correct the entry. A verification
    // cannot have happened tomorrow; treat it as untrustworthy, not as very fresh.
    if (date.getTime() > Date.now()) return null;
    try {
        if (contentHash(fs.readFileSync(filePath, 'utf-8')) !== entry.contentHash) return null;
    } catch {
        return null;
    }
    return date;
}

/**
 * Record that a doc was re-verified today with no content change.
 *
 * Called by a scan that found nothing to update and therefore wrote nothing.
 * Writes ONLY to the untracked ledger — never to the doc — so re-running a scan
 * produces no git diff.
 *
 * @param {string} filename - Reference doc filename (key of SCAN_SKILL_MAP)
 * @param {string} [today] - ISO date (default: today)
 * @returns {boolean} true when recorded
 */
function recordDocVerified(filename, today = new Date().toISOString().slice(0, 10)) {
    if (rootResolution.error) return false;
    let filePath;
    try {
        filePath = getReferenceDocPath(filename);
    } catch {
        return false;
    }
    try {
        const hash = contentHash(fs.readFileSync(filePath, 'utf-8'));
        const ledger = readScanVerifiedLedger();
        ledger[filename] = { verifiedAt: today, contentHash: hash };
        ensureProjectTmpDir();
        fs.writeFileSync(SCAN_VERIFIED_PATH, `${JSON.stringify({ docs: ledger }, null, 2)}\n`, 'utf-8');
        return true;
    } catch {
        return false;
    }
}

/**
 * Get reference docs that are older than staleDays.
 * Skips placeholders and docs without timestamps (graceful degradation), and docs the
 * project declares not applicable: agents are told to skip those, so their age is never reported.
 *
 * Freshness is the NEWER of the committed `Last scanned` stamp and a trusted
 * local ledger entry, so a scan that legitimately wrote nothing still counts as
 * having happened without dirtying a tracked file.
 *
 * @param {number} staleDays - Age threshold in days
 * @returns {Array<{filename: string, lastScanned: string, ageDays: number, scanSkill: string}>}
 */
function getStaleReferenceDocs(staleDays) {
    const stale = [];
    const now = Date.now();
    const thresholdMs = staleDays * 24 * 60 * 60 * 1000;
    const ledger = readScanVerifiedLedger();

    // Staleness follows the same ownership split as materialization: project routing
    // docs are always tracked, while task-specific docs are tracked only when selected
    // or when an absent selection resolves to an evidenced capability.
    const trackedDocs = new Map();
    for (const doc of [...getAlwaysOnReferenceDocs(), ...getReferenceDocs()]) {
        if (isReferenceDocNotApplicable(doc)) continue;
        const { kind, command } = getReferenceDocScanTarget(doc);
        if ((kind === 'built-in' || kind === 'generic') && command && !trackedDocs.has(doc.filename)) {
            trackedDocs.set(doc.filename, command);
        }
    }

    for (const [filename, scanSkill] of trackedDocs) {
        let filePath;
        try {
            filePath = getReferenceDocPath(filename);
        } catch {
            continue;
        }
        const stampDate = parseLastScannedDate(filePath);
        if (!stampDate) continue; // Skip docs without timestamps — never block incorrectly
        const verifiedDate = resolveVerifiedDate(ledger[filename], filePath);
        const date = verifiedDate && verifiedDate.getTime() > stampDate.getTime() ? verifiedDate : stampDate;
        const ageMs = now - date.getTime();
        if (ageMs > thresholdMs) {
            stale.push({
                filename,
                lastScanned: date.toISOString().slice(0, 10),
                ageDays: Math.floor(ageMs / (24 * 60 * 60 * 1000)),
                scanSkill
            });
        }
    }
    return stale;
}

/**
 * Re-evaluate reference doc staleness and update/remove the .scan-stale flag.
 * Call after any scan-* skill completes to unblock the session.
 * @param {number} [staleDays=60] - Age threshold in days
 */
function refreshScanStaleFlag(staleDays = 60) {
    if (rootResolution.error) return;
    const flagPath = SCAN_STALE_PATH;
    try {
        const stale = getStaleReferenceDocs(staleDays);
        if (stale.length === 0) {
            if (fs.existsSync(flagPath)) fs.unlinkSync(flagPath);
        } else {
            ensureProjectTmpDir();
            fs.writeFileSync(
                flagPath,
                JSON.stringify(
                    {
                        staleDays,
                        docs: stale,
                        checkedAt: new Date().toISOString()
                    },
                    null,
                    2
                ) + '\n',
                'utf-8'
            );
        }
    } catch {
        /* non-blocking */
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    // From project-config-init.cjs
    buildSkeleton,
    checkConfigStatus,
    // From init-reference-docs.cjs
    SCAN_SKILL_MAP,
    DEFAULT_REFERENCE_DOCS,
    PORTABLE_BASELINE_REFERENCE_DOCS,
    REFERENCE_DOC_CATALOG,
    ALWAYS_ON_PROJECT_CONTEXT_DOCS,
    CAPABILITY_REFERENCE_DOCS,
    getAlwaysOnReferenceDocs,
    resolveDefaultReferenceDocs,
    getReferenceDocScanTarget,
    getReferenceDocScanSkill,
    PLACEHOLDER_MARKER,
    PLACEHOLDER_MARKER_SCSS,
    isPlaceholderFile,
    checkProjectConfig,
    getReferenceDocs,
    isReferenceDocNotApplicable,
    deriveProjectName,
    // Reference doc normalization (capability-aware selection + alias migration)
    REFERENCE_DOC_ALIASES,
    resolveReferenceDocAlias,
    mergeReferenceDocs,
    normalizeReferenceDocs,
    generatePlaceholderContent,
    initDesignSystemAppDocs,
    // Greenfield detection
    hasProjectContent,
    isIgnoredDir,
    isGreenfieldProject,
    IGNORED_ROOT_DIRS,
    CODE_DIRECTORIES,
    MANIFEST_FILES,
    // Staleness detection
    LAST_SCANNED_RE,
    parseLastScannedDate,
    getStaleReferenceDocs,
    refreshScanStaleFlag,
    // Local freshness ledger (no-op scans record verification without a git diff)
    readScanVerifiedLedger,
    resolveVerifiedDate,
    recordDocVerified,
    // Shared paths
    PROJECT_DIR,
    CONFIG_PATH,
    DOCS_DIR,
    REFERENCE_DOCS_DIR,
    getReferenceDocPath,
    getProjectTemplatePath
};

// `SKELETON` stays a supported read: `.claude/hooks/session-init-docs.cjs:28`
// destructures it, while `.claude/hooks/tests/test-all-hooks.cjs:381` reads the getter
// directly. Building it at access time carries per-project derivation instead of freezing it.
Object.defineProperty(module.exports, 'SKELETON', {
    enumerable: true,
    get: buildSkeleton
});
