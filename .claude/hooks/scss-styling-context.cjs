#!/usr/bin/env node
/**
 * Styling Context - PreToolUse Hook
 *
 * Guides AI to read the SCSS style guide when editing style files.
 * Replaces full-content injection with a lightweight read-guidance pointer.
 *
 * Exit Codes: 0 - Success (non-blocking)
 */

const path = require('path');
const { resolveSection } = require('./lib/project-config-loader.cjs');
const { parsePreToolUseInput, wasRecentlyInjected } = require('./lib/context-injector-base.cjs');
const { STYLING_CONTEXT: DEDUP_MARKER, DEDUP_LINES } = require('./lib/dedup-constants.cjs');

const stylingSection = resolveSection('styling', 'scss') || {};
const STYLE_GUIDE_PATH = stylingSection.guideDoc || null;
const STYLE_EXTENSIONS = new Set(stylingSection.fileExtensions || ['.css', '.sass', '.scss']);

function isStyleFile(filePath) {
    return !!filePath && STYLE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function buildGuidance(filePath) {
    const lines = [
        '',
        DEDUP_MARKER,
        `**File:** ${path.basename(filePath)}`,
        '',
    ];

    if (STYLE_GUIDE_PATH) {
        lines.push(`Read \`${STYLE_GUIDE_PATH}\` — SCSS conventions, BEM patterns, variables, mixins.`);
    }

    lines.push(
        '',
        '**Critical:** BEM classes on ALL template elements (`block__element --modifier`). No magic numbers. Max 3 nesting levels.',
        ''
    );

    return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
}

async function main() {
    try {
        const input = parsePreToolUseInput();
        if (!input) process.exit(0);
        const { filePath, transcriptPath } = input;

        if (!isStyleFile(filePath)) process.exit(0);
        if (wasRecentlyInjected(transcriptPath, DEDUP_MARKER, DEDUP_LINES.STYLING_CONTEXT)) process.exit(0);

        console.log(buildGuidance(filePath));
        process.exit(0);
    } catch {
        process.exit(0);
    }
}

main();
