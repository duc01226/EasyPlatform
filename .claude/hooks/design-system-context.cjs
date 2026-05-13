#!/usr/bin/env node
/**
 * Design System Context - PreToolUse Hook
 *
 * Guides AI to read design system docs when editing frontend files.
 * Replaces full-content injection with a lightweight read-guidance pointer.
 *
 * Exit Codes: 0 - Success (non-blocking)
 */

const path = require('path');
const { loadProjectConfig, buildPatternList } = require('./lib/project-config-loader.cjs');
const { parsePreToolUseInput, wasRecentlyInjected } = require('./lib/context-injector-base.cjs');
const { DESIGN_SYSTEM: DEDUP_MARKER, DEDUP_LINES } = require('./lib/dedup-constants.cjs');

const config = loadProjectConfig();
const DESIGN_SYSTEM_DOCS_PATH = config.designSystem?.docsPath || 'docs/project-reference/design-system';
const APP_PATTERNS = buildPatternList(config.designSystem?.appMappings);
const CANONICAL_DOC = config.designSystem?.canonicalDoc;

const FRONTEND_EXTENSIONS = new Set(['.html', '.htm', '.scss', '.css', '.less', '.sass', '.ts', '.tsx', '.js', '.jsx']);

function isFrontendFile(filePath) {
    return !!filePath && FRONTEND_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function detectApp(filePath) {
    if (!filePath) return null;
    const norm = filePath.replace(/\\/g, '/');
    for (const app of APP_PATTERNS) {
        for (const pattern of app.patterns) {
            if (pattern.test(norm)) return app;
        }
    }
    return null;
}

function buildGuidance(app, filePath) {
    const lines = [
        '',
        '## Design System Context',
        `**Detected App:** ${app.name} | **File:** ${path.basename(filePath)}`,
        DEDUP_MARKER,
        '',
        'Before implementing UI, read:',
        `- \`${DESIGN_SYSTEM_DOCS_PATH}/${app.docFile}\` — ${app.name} component inventory and tokens`,
    ];

    if (CANONICAL_DOC) {
        lines.push(`- \`${DESIGN_SYSTEM_DOCS_PATH}/${CANONICAL_DOC}\` — canonical design tokens, BEM conventions`);
    }

    const quickTips = app.quickTips || [];
    if (quickTips.length > 0) {
        lines.push('', '**Quick Tips:**');
        quickTips.forEach(tip => lines.push(`- ${tip}`));
    }

    const modernNote = config.designSystem?.modernUiNote;
    if (modernNote) lines.push('', modernNote);

    lines.push('');
    return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
}

async function main() {
    try {
        const input = parsePreToolUseInput();
        if (!input) process.exit(0);
        const { filePath, transcriptPath } = input;

        if (!isFrontendFile(filePath)) process.exit(0);
        const app = detectApp(filePath);
        if (!app) process.exit(0);
        if (wasRecentlyInjected(transcriptPath, DEDUP_MARKER, DEDUP_LINES.DESIGN_SYSTEM)) process.exit(0);

        console.log(buildGuidance(app, filePath));
        process.exit(0);
    } catch {
        process.exit(0);
    }
}

main();
