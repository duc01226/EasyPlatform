#!/usr/bin/env node
/**
 * Design System Canonical Guide - Multi-event Hook
 *
 * Fires on:
 *   - UserPromptSubmit: inject read-guide on every prompt (deduped, 50-line window)
 *   - PreToolUse(Read): inject when reading HTML, CSS, or SCSS files
 *   - PreToolUse(Edit|Write|MultiEdit): inject when editing HTML, CSS, or SCSS files
 *   - PreToolUse(Skill): inject when invoking any skill (plan, cook, etc.)
 *
 * Only guides AI to READ the canonical doc — does not inline content.
 * Full content injection on Edit/Write is handled by design-system-context.cjs.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { DEDUP_LINES, DESIGN_SYSTEM_CANONICAL_GUIDE: DEDUP_MARKER } = require('./lib/dedup-constants.cjs');

const CANONICAL_DOC_PATH = 'docs/project-reference/design-system/design-system-canonical.md';
const UI_EXTENSIONS = new Set(['.html', '.htm', '.css', '.scss', '.sass', '.less']);

function isUiFile(filePath) {
    if (!filePath) return false;
    return UI_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function wasRecentlyInjected(transcriptPath) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
        const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n');
        return lines.slice(-DEDUP_LINES.DESIGN_SYSTEM_CANONICAL_GUIDE).join('\n').includes(DEDUP_MARKER);
    } catch {
        return false;
    }
}

function canonicalDocExists() {
    try {
        const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
        return fs.existsSync(path.join(projectDir, CANONICAL_DOC_PATH));
    } catch {
        return false;
    }
}

function buildGuidance() {
    return `${DEDUP_MARKER} When implementing UI — HTML, CSS, or SCSS — read \`${CANONICAL_DOC_PATH}\` first for design tokens, component patterns, and BEM conventions.`;
}

function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        const eventName = payload.hook_event_name || '';
        const transcriptPath = payload.transcript_path || '';

        if (!canonicalDocExists()) process.exit(0);
        if (wasRecentlyInjected(transcriptPath)) process.exit(0);

        if (eventName === 'UserPromptSubmit') {
            console.log(buildGuidance());
            process.exit(0);
        }

        if (eventName === 'PreToolUse') {
            const toolName = payload.tool_name || '';

            // Skill invocations (plan, cook, feature-investigation, etc.) — inject without file check
            if (toolName === 'Skill') {
                console.log(buildGuidance());
                process.exit(0);
            }

            // File-based tools — only inject for HTML/CSS/SCSS files
            if (['Read', 'Edit', 'Write', 'MultiEdit'].includes(toolName)) {
                const toolInput = payload.tool_input || {};
                const filePath = toolInput.file_path || toolInput.filePath || '';
                if (!isUiFile(filePath)) process.exit(0);
                console.log(buildGuidance());
            }
        }

        process.exit(0);
    } catch {
        process.exit(0);
    }
}

main();
