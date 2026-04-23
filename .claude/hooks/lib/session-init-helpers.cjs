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
const { validateConfig } = require('./project-config-schema.cjs');
const { loadProjectConfig, isConfigPopulated } = require('./project-config-loader.cjs');
const { SCAN_STALE_PATH, ensureProjectTmpDir } = require('./ck-paths.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CONFIG_PATH = path.join(PROJECT_DIR, 'docs', 'project-config.json');
const DOCS_DIR = path.join(PROJECT_DIR, 'docs');
const REFERENCE_DOCS_DIR = path.join(DOCS_DIR, 'project-reference');

// =============================================================================
// SKELETON — from project-config-init.cjs
// =============================================================================

/**
 * Skeleton template for project-config.json.
 * Contains all sections that hooks consume, with placeholder values.
 */
const SKELETON = {
    _description: 'Project-specific configuration consumed by .claude hooks at runtime. Update when adding services/apps.',
    schemaVersion: 2,
    project: {
        name: '',
        description: '',
        languages: [],
        packageManagers: []
    },
    framework: {
        name: '',
        backendPatternsDoc: 'docs/project-reference/backend-patterns-reference.md',
        frontendPatternsDoc: 'docs/project-reference/frontend-patterns-reference.md',
        codeReviewDoc: 'docs/project-reference/code-review-rules.md',
        integrationTestDoc: 'docs/project-reference/integration-test-reference.md',
        searchPatternKeywords: []
    },
    modules: [],
    contextGroups: [],
    designSystem: {
        docsPath: 'docs/project-reference/design-system',
        appMappings: []
    },
    styling: {
        fileExtensions: [],
        guideDoc: '',
        appMap: {},
        patterns: []
    },
    componentSystem: {
        selectorPrefixes: ['app-'],
        layerClassification: {}
    },
    testing: { frameworks: [], filePatterns: {}, commands: {} },
    databases: {},
    messaging: {},
    api: {},
    infrastructure: {},
    referenceDocs: [],
    workflowPatterns: {
        architectureStyle: '',
        codeHierarchy: '',
        cssMethodology: '',
        stateManagement: '',
        crossModuleValidation: '',
        featureDocPath: '',
        featureDocTemplate: '',
        reviewRulesDoc: ''
    },
    integrationTestVerify: {
        guidance: '',
        quickRunCommand: '',
        testProjectPattern: '',
        testProjects: [],
        systemCheckCommand: '',
        runScript: '',
        startupScript: ''
    }
};

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

const SCAN_SKILL_MAP = {
    'project-structure-reference.md': 'scan-project-structure',
    'backend-patterns-reference.md': 'scan-backend-patterns',
    'seed-test-data-reference.md': 'scan-seed-test-data',
    'frontend-patterns-reference.md': 'scan-frontend-patterns',
    'integration-test-reference.md': 'scan-integration-tests',
    'feature-docs-reference.md': 'scan-feature-docs',
    'code-review-rules.md': 'scan-code-review-rules',
    'scss-styling-guide.md': 'scan-scss-styling',
    'design-system/README.md': 'scan-design-system',
    'design-system/design-system-canonical.md': 'scan-design-system',
    'design-system/design-tokens.scss': 'scan-design-system',
    'design-system/design-tokens.css': 'scan-design-system',
    'e2e-test-reference.md': 'scan-e2e-tests',
    'domain-entities-reference.md': 'scan-domain-entities',
    'docs-index-reference.md': 'scan-docs-index'
    // lessons.md excluded — managed by /learn skill
};

// =============================================================================
// DEFAULT_REFERENCE_DOCS — from init-reference-docs.cjs
// =============================================================================

const DEFAULT_REFERENCE_DOCS = [
    {
        filename: 'project-structure-reference.md',
        purpose: 'Project structure, service architecture, directory tree, tech stack, and module registry.',
        sections: ['Service Architecture', 'Project Directory Tree', 'Tech Stack', 'Module Codes']
    },
    {
        filename: 'backend-patterns-reference.md',
        purpose: 'Backend patterns: CQRS, repositories, entities, validation, message bus, background jobs.',
        sections: ['Repository Pattern', 'CQRS Patterns', 'Validation Patterns', 'Entity Patterns', 'Message Bus']
    },
    {
        filename: 'seed-test-data-reference.md',
        purpose: 'Seed test data patterns: idempotent seeder architecture, DI scope safety, command dispatch, and config-driven counts.',
        sections: [],
        templatePath: '.claude/templates/reference-docs/seed-test-data-reference.md'
    },
    {
        filename: 'frontend-patterns-reference.md',
        purpose: 'Frontend patterns: component base classes, state management, API services, styling conventions.',
        sections: ['Component Base Classes', 'State Management', 'API Services', 'Styling Conventions', 'Directory Structure']
    },
    {
        filename: 'integration-test-reference.md',
        purpose: 'Integration test patterns: test base classes, fixtures, helpers, and service-specific setup.',
        sections: ['Test Architecture', 'Test Base Classes', 'Test Helpers', 'Service-Specific Setup']
    },
    {
        filename: 'feature-docs-reference.md',
        purpose: 'Feature documentation patterns: app-to-service mapping, doc structure, templates, and conventions.',
        sections: ['App-to-Service Mapping', 'Feature Doc Structure', 'Templates', 'Conventions']
    },
    {
        filename: 'spec-principles.md',
        purpose: 'Spec quality principles: completeness criteria, AI-implementability, test coverage mapping, and tech-agnostic standards.',
        sections: [],
        templatePath: '.claude/templates/reference-docs/spec-principles.md'
    },
    {
        filename: 'code-review-rules.md',
        purpose: 'Code review rules, conventions, anti-patterns, decision trees, and checklists.',
        sections: ['Critical Rules', 'Backend Rules', 'Frontend Rules', 'Architecture Rules', 'Anti-Patterns', 'Checklists']
    },
    {
        filename: 'lessons.md',
        purpose: 'Learned lessons from past sessions — auto-injected via hook, written via /learn skill.',
        sections: []
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
        purpose: 'Domain entities, data models, DTOs, aggregate boundaries, cross-service entity sync, and ER diagrams.',
        sections: ['Entity Catalog', 'Entity Relationships', 'Cross-Service Entity Map', 'DTO Mapping', 'Aggregate Boundaries']
    },
    {
        filename: 'docs-index-reference.md',
        purpose: 'Documentation tree, file counts by category, doc relationships, and keyword-to-doc lookup table.',
        sections: ['Documentation System', 'Documentation Graph', 'Key Doc Relationships', 'Doc Lookup Guide']
    }
];

// Placeholder marker — present in all generated placeholder docs
const PLACEHOLDER_MARKER = "<!-- Fill in your project's details below. -->";

// Claude-only sentinel for SCSS/CSS placeholders — non-prose so a real authored
// token file cannot collide with this string by accident. Detection in
// isPlaceholderFile is LINE-ANCHORED (full-line equality, not substring).
// MUST be removed by /scan-design-system Phase 3 authoring step.
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

/**
 * Load reference doc definitions from config, falling back to defaults.
 * @returns {Array<{filename: string, purpose: string, sections?: string[], templatePath?: string}>}
 */
function getReferenceDocs() {
    const config = loadProjectConfig();
    const docs = config.referenceDocs;
    if (Array.isArray(docs) && docs.length > 0) return docs;
    return DEFAULT_REFERENCE_DOCS;
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
        const templatePath = path.isAbsolute(rawTemplatePath)
            ? rawTemplatePath
            : path.join(PROJECT_DIR, rawTemplatePath);
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
    const created = [];
    try {
        const config = loadProjectConfig();
        const docsPath = config.designSystem?.docsPath || 'docs/project-reference/design-system';
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
        const configPath = path.join(dir, 'docs', 'project-config.json');
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
 * Get reference docs that are older than staleDays.
 * Skips placeholders and docs without timestamps (graceful degradation).
 * @param {number} staleDays - Age threshold in days
 * @returns {Array<{filename: string, lastScanned: string, ageDays: number, scanSkill: string}>}
 */
function getStaleReferenceDocs(staleDays) {
    const stale = [];
    const now = Date.now();
    const thresholdMs = staleDays * 24 * 60 * 60 * 1000;

    for (const [filename, scanSkill] of Object.entries(SCAN_SKILL_MAP)) {
        const filePath = path.join(REFERENCE_DOCS_DIR, filename);
        const date = parseLastScannedDate(filePath);
        if (!date) continue; // Skip docs without timestamps — never block incorrectly
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
    SKELETON,
    checkConfigStatus,
    // From init-reference-docs.cjs
    SCAN_SKILL_MAP,
    DEFAULT_REFERENCE_DOCS,
    PLACEHOLDER_MARKER,
    PLACEHOLDER_MARKER_SCSS,
    isPlaceholderFile,
    checkProjectConfig,
    getReferenceDocs,
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
    // Shared paths
    PROJECT_DIR,
    CONFIG_PATH,
    DOCS_DIR,
    REFERENCE_DOCS_DIR
};
