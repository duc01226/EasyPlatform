#!/usr/bin/env node
/**
 * Session Init Docs — Merged SessionStart Hook
 *
 * Combines the logic of two former hooks:
 *   - project-config-init.cjs  (config status and schema validation)
 *   - init-reference-docs.cjs  (placeholder reference doc creation)
 *
 * Phase 1: Verify the required configured project file is present and schema-valid.
 *          Only project-init may bootstrap it; this hook never writes a skeleton.
 * Phase 2: Create placeholder reference docs for any missing files.
 *
 * Generic skills rely on this hook as the project-specific extension point:
 * skills stay portable, while local conventions live in configured project
 * config and reference-doc paths. Defaults are docs/project-config.json and docs/project-reference/*
 * unless the portability paths and `docsRoots` entries in docs/project-config.json override them.
 *
 * Idempotent — skips files that already exist.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

const fs = require('fs');
const path = require('path');
const {
    SKELETON,
    checkConfigStatus,
    SCAN_SKILL_MAP,
    getReferenceDocs,
    getAlwaysOnReferenceDocs,
    getReferenceDocScanSkill,
    getReferenceDocPath,
    getProjectTemplatePath,
    generatePlaceholderContent,
    initDesignSystemAppDocs,
    isPlaceholderFile,
    checkProjectConfig,
    DEFAULT_REFERENCE_DOCS,
    PLACEHOLDER_MARKER,
    PLACEHOLDER_MARKER_SCSS,
    hasProjectContent,
    REFERENCE_DOCS_DIR,
    getStaleReferenceDocs
} = require('./lib/session-init-helpers.cjs');
const { loadConfig } = require('./lib/ck-config-loader.cjs');
const { SCAN_STALE_PATH, ensureProjectTmpDir } = require('./lib/ck-paths.cjs');
const {
    getConfiguredDocsIndexPath,
    getDocsRoot,
    loadProjectConfig,
    getProjectConfigStatus
} = require('./lib/project-config-loader.cjs');
const { resolveProjectRoot } = require('./lib/project-root.cjs');
const { isHookEntryPoint } = require('./lib/hook-runner.cjs');

// Generic source for the feature-doc template (relocated to .claude as the
// portable source-of-truth). Bootstrapped into the configured featureDocTemplate
// dest on first SessionStart if absent — same bootstrap-once contract as
// referenceDocs[].templatePath. See phase-08A.
const FEATURE_DOC_TEMPLATE_SOURCE = '.claude/templates/detailed-feature-spec-template.md';
const FEATURE_DOC_TEMPLATE_FILENAME = 'detailed-feature-spec-template.md';

/**
 * Bootstrap destination when `workflowPatterns.featureDocTemplate` is unset: the template
 * filename under the CONFIGURED template root, so a project that relocated `docsRoots.templates`
 * is not seeded into the abandoned default tree. Resolves to the documented default `docs/templates/` when no `docsRoots.templates.path` entry in docs/project-config.json overrides it.
 */
function defaultFeatureDocTemplateDest() {
    return `${getDocsRoot('templates')}/${FEATURE_DOC_TEMPLATE_FILENAME}`;
}

const rootResolution = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env });
const PROJECT_DIR = rootResolution.rootDir;
const DOCS_INDEX_PATH = getConfiguredDocsIndexPath();
const REF_DOCS_DIR = path.dirname(DOCS_INDEX_PATH);

function writeSessionStartNotice(_message) {
    // SessionStart hooks are side-effect-only. Prompt context lives in static files.
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

function main() {
    if (rootResolution.error) {
        console.error(`[session-init-docs] Skipped: ${rootResolution.error}`);
        return;
    }
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        // No usable config -> write NOTHING. The config is optional (a project
        // without one is supported and runs on portable defaults), but "optional"
        // licenses reading defaults, never materializing reference docs and
        // templates into someone's repo on their behalf. An invalid config is a
        // setup error and is equally not permission to write. Either way the
        // prompt gate has already told the session what to do (a one-a-day notice
        // when absent, a block when present-but-invalid); this SessionStart hook
        // stays silent and performs no writes.
        const configStatus = getProjectConfigStatus({ refresh: true });
        if (!configStatus.valid) process.exit(0);

        // Guard: skip reference/template materialization in empty projects.
        if (!hasProjectContent()) process.exit(0);
        // No advisory text needed here — the prompt gate already emits the
        // missing-config notice and the invalid-config block.

        // =====================================================================
        // Phase 2: Reference docs init (from init-reference-docs.cjs)
        // =====================================================================

        // Safety guard: refuse to create placeholders when PROJECT_DIR has
        // resolved to a path inside `.claude/` (indicates misconfigured cwd
        // or env from a test harness — never valid in real use).
        const normalizedProjectDir = PROJECT_DIR.replace(/\\/g, '/');
        if (/\/\.claude(\/|$)/.test(normalizedProjectDir)) {
            process.exit(0);
        }

        const alwaysOnDocs = getAlwaysOnReferenceDocs();
        const referenceDocs = getReferenceDocs();
        // These project-routing inputs have their own owner path and are not part of
        // the task-specific `referenceDocs` selection (which may explicitly be empty).
        const docsToEnsureByPath = new Map();
        for (const doc of [...alwaysOnDocs, ...referenceDocs]) {
            if (!doc.filename) continue;
            let filePath;
            try {
                filePath = getReferenceDocPath(doc);
            } catch (error) {
                console.error(`[session-init-docs] Skipped reference-doc initialization: ${error.message}`);
                process.exit(0);
            }
            if (!docsToEnsureByPath.has(filePath)) docsToEnsureByPath.set(filePath, doc);
        }
        const docsToEnsure = [...docsToEnsureByPath.values()];
        const created = [];

        // Every selected output was containment-checked above before creating the root.
        if (!fs.existsSync(REF_DOCS_DIR)) {
            fs.mkdirSync(REF_DOCS_DIR, { recursive: true });
        }

        for (const doc of docsToEnsure) {
            let filePath;
            try {
                filePath = getReferenceDocPath(doc);
            } catch (error) {
                console.error(`[session-init-docs] Skipped reference-doc initialization: ${error.message}`);
                process.exit(0);
            }
            if (!fs.existsSync(filePath)) {
                // Ensure parent directory exists for subdirectory paths (e.g. design-system/README.md)
                const parentDir = path.dirname(filePath);
                if (!fs.existsSync(parentDir)) {
                    fs.mkdirSync(parentDir, { recursive: true });
                }
                let content;
                try {
                    content = generatePlaceholderContent(doc);
                } catch (error) {
                    console.error(`[session-init-docs] Skipped ${doc.filename}: ${error.message}`);
                    process.exit(0);
                }
                fs.writeFileSync(filePath, content, 'utf-8');
                const relativeFilePath = path.relative(PROJECT_DIR, filePath).replace(/\\/g, '/');
                created.push(`- \`${relativeFilePath}\` — ${doc.purpose || 'Reference document'}`);
            }
        }

        // Also initialize design system app-specific docs from project-config.json
        const designSystemCreated = initDesignSystemAppDocs();
        created.push(...designSystemCreated);

        // Bootstrap the configured feature-doc template from the .claude source
        // (relocated source-of-truth). Copy-once: never overwrites a project's
        // existing/customized template. Mirrors the referenceDocs templatePath contract.
        try {
            const wp = (loadProjectConfig() || {}).workflowPatterns || {};
            const templateDestRel = (typeof wp.featureDocTemplate === 'string' && wp.featureDocTemplate.trim() !== '')
                ? wp.featureDocTemplate.trim()
                : defaultFeatureDocTemplateDest();
            const templateDest = getProjectTemplatePath(templateDestRel);
            const templateSource = getProjectTemplatePath(FEATURE_DOC_TEMPLATE_SOURCE);
            if (!fs.existsSync(templateDest) && fs.existsSync(templateSource) && fs.statSync(templateSource).isFile()) {
                const destParent = path.dirname(templateDest);
                if (!fs.existsSync(destParent)) fs.mkdirSync(destParent, { recursive: true });
                fs.copyFileSync(templateSource, templateDest);
                const relDest = path.relative(PROJECT_DIR, templateDest).replace(/\\/g, '/');
                created.push(`- \`${relDest}\` — Feature Spec template (generated from .claude source)`);
            }
        } catch (error) {
            console.error(`[session-init-docs] Skipped feature template bootstrap: ${error.message}`);
        }

        // File creation is silent — no output to avoid context noise.

        // Reference doc enforcement is advisory only (not blocking).
        // Project config enforcement is handled by init-prompt-gate.cjs using a
        // host-supported UserPromptSubmit JSON block when verification fails.
        // Placeholder docs stay silent here; static docs and prompt gates own guidance.
        const placeholderDocs = docsToEnsure
            .filter(doc => getReferenceDocScanSkill(doc))
            .filter(doc => isPlaceholderFile(getReferenceDocPath(doc)));

        if (placeholderDocs.length > 0) {
            const skillList = placeholderDocs.map(d => `/${getReferenceDocScanSkill(d)}`).join(', ');
            writeSessionStartNotice(`${placeholderDocs.length} reference doc(s) are placeholders. Run: ${skillList}`);
        }

        // If all files exist and config is schema-valid, output nothing (silent pass-through)

        // =====================================================================
        // Phase 3: Staleness check (reference doc freshness enforcement)
        // =====================================================================

        const STALE_FLAG = SCAN_STALE_PATH;

        try {
            const config = loadConfig({
                includeProject: false,
                includeAssertions: false,
                includeLocale: false
            });
            const staleDays = config.referenceDocs?.staleDays ?? 60;
            const staleDocs = getStaleReferenceDocs(staleDays);

            if (staleDocs.length > 0) {
                // Write flag file for UserPromptSubmit gate
                ensureProjectTmpDir();
                fs.writeFileSync(STALE_FLAG, JSON.stringify({ staleDays, docs: staleDocs, checkedAt: new Date().toISOString() }, null, 2) + '\n', 'utf-8');

                // Advisory warning is persisted for the prompt gate; no SessionStart stdout.
                const docList = staleDocs.map(d => `  - ${d.filename} (${d.ageDays}d old, last: ${d.lastScanned}) -> /${d.scanSkill}`).join('\n');
                writeSessionStartNotice(
                    [
                        '',
                        `${staleDocs.length} reference doc(s) are stale (>${staleDays} days):`,
                        docList,
                        '',
                        'Run /scan-all to refresh all, or individual /scan-* skills.',
                        'Type "skip scan" to dismiss for 7 days.',
                        ''
                    ].join('\n')
                );
            } else {
                // Clean up flag if docs are now fresh
                if (fs.existsSync(STALE_FLAG)) {
                    fs.unlinkSync(STALE_FLAG);
                }
            }
        } catch {
            /* non-blocking — staleness check is advisory */
        }
    } catch {
        // Non-blocking — silent fail
    }
    process.exit(0);
}

// Export for testing — includes everything from both original hooks
module.exports = {
    // From project-config-init.cjs
    checkConfigStatus,
    SKELETON,
    // From init-reference-docs.cjs
    getReferenceDocs,
    generatePlaceholderContent,
    checkProjectConfig,
    initDesignSystemAppDocs,
    isPlaceholderFile,
    DEFAULT_REFERENCE_DOCS,
    SCAN_SKILL_MAP,
    PLACEHOLDER_MARKER,
    PLACEHOLDER_MARKER_SCSS
};

// Run if executed directly — `node <hook>` or the Codex `node -e … require(hook)` launcher —
// never when required as a module (tests).
if (isHookEntryPoint(module)) {
    main();
}
