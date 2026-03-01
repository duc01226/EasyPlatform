#!/usr/bin/env node
/**
 * Session Init Docs — Merged SessionStart Hook
 *
 * Combines the logic of two former hooks:
 *   - project-config-init.cjs  (config skeleton creation + schema validation)
 *   - init-reference-docs.cjs  (placeholder reference doc creation)
 *
 * Phase 1: Ensure docs/project-config.json exists (create skeleton if missing),
 *          validate schema, output warnings for errors.
 * Phase 2: Create placeholder reference docs for any missing files,
 *          suggest scan skills for unpopulated placeholders.
 *
 * Idempotent — skips files that already exist.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
    SKELETON,
    checkConfigStatus,
    SCAN_SKILL_MAP,
    getReferenceDocs,
    generatePlaceholderContent,
    initDesignSystemAppDocs,
    isPlaceholderFile,
    checkProjectConfig,
    DEFAULT_REFERENCE_DOCS,
    PLACEHOLDER_MARKER,
    hasProjectContent,
    REFERENCE_DOCS_DIR
} = require('./lib/session-init-helpers.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CONFIG_PATH = path.join(PROJECT_DIR, 'docs', 'project-config.json');
const DOCS_DIR = path.join(PROJECT_DIR, 'docs');
const REF_DOCS_DIR = path.join(DOCS_DIR, 'project-reference');

// =============================================================================
// MAIN EXECUTION
// =============================================================================

function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        // Guard: skip all file creation in empty/uninitialized projects
        // (no content directories besides .claude, .git, etc.)
        if (!hasProjectContent()) process.exit(0);

        // Ensure docs/ directory exists
        if (!fs.existsSync(DOCS_DIR)) {
            fs.mkdirSync(DOCS_DIR, { recursive: true });
        }

        // =====================================================================
        // Phase 1: Config init (from project-config-init.cjs)
        // =====================================================================

        // Create skeleton silently if missing
        if (!fs.existsSync(CONFIG_PATH)) {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(SKELETON, null, 2) + '\n', 'utf-8');
        }

        // Check config status (works for both just-created and pre-existing)
        const status = checkConfigStatus();

        // Schema validation errors — always warn
        if (status.hasSchemaErrors && status.schemaErrors[0] !== 'Invalid JSON') {
            const output = ['', '## ⚠️ Project Config Schema Validation Failed', '', '`docs/project-config.json` has schema errors that may break hooks:', ''];
            for (const err of status.schemaErrors) {
                output.push(`- **ERROR:** ${err}`);
            }
            output.push('', 'Run `/project-config` to fix the config structure.', '');
            console.log(output.join('\n'));
        } else if (status.hasSchemaErrors) {
            console.log('\n## ⚠️ `docs/project-config.json` contains invalid JSON. Run `/project-config` to fix.\n');
        }

        // Init enforcement is handled by init-prompt-gate.cjs (UserPromptSubmit exit 2).
        // No advisory text needed here — the gate blocks prompts until config is populated.

        // =====================================================================
        // Phase 2: Reference docs init (from init-reference-docs.cjs)
        // =====================================================================

        const referenceDocs = getReferenceDocs();
        const created = [];

        // Ensure docs/project-reference/ directory exists
        if (!fs.existsSync(REF_DOCS_DIR)) {
            fs.mkdirSync(REF_DOCS_DIR, { recursive: true });
        }

        for (const doc of referenceDocs) {
            if (!doc.filename) continue;
            const filePath = path.join(REF_DOCS_DIR, doc.filename);
            if (!fs.existsSync(filePath)) {
                // Ensure parent directory exists for subdirectory paths (e.g. design-system/README.md)
                const parentDir = path.dirname(filePath);
                if (!fs.existsSync(parentDir)) {
                    fs.mkdirSync(parentDir, { recursive: true });
                }
                const content = generatePlaceholderContent(doc);
                fs.writeFileSync(filePath, content, 'utf-8');
                created.push(`- \`docs/project-reference/${doc.filename}\` — ${doc.purpose || 'Reference document'}`);
            }
        }

        // Also initialize design system app-specific docs from project-config.json
        const designSystemCreated = initDesignSystemAppDocs();
        created.push(...designSystemCreated);

        // File creation is silent — no output to avoid context noise.

        // Reference doc enforcement is advisory only (not blocking).
        // Project config enforcement is handled by init-prompt-gate.cjs (exit 2).
        // Placeholder docs are a soft concern — log a brief note for SessionStart only.
        const placeholderDocs = referenceDocs
            .filter(doc => SCAN_SKILL_MAP[doc.filename])
            .filter(doc => isPlaceholderFile(path.join(REF_DOCS_DIR, doc.filename)));

        if (placeholderDocs.length > 0) {
            const skillList = placeholderDocs.map(d => `/${SCAN_SKILL_MAP[d.filename]}`).join(', ');
            console.log(`${placeholderDocs.length} reference doc(s) are placeholders. Run: ${skillList}`);
        }

        // If all files exist and config is populated, output nothing (silent pass-through)
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
    PLACEHOLDER_MARKER
};

// Run if executed directly (not required as module)
if (require.main === module) {
    main();
}
