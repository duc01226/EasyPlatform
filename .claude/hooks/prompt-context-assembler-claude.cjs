#!/usr/bin/env node
/**
 * Prompt Context Assembler - CLAUDE.md TL;DR Hook (UserPromptSubmit)
 *
 * Injects the CLAUDE.md TL;DR section (~5.5KB) for context recovery after
 * long sessions — golden rules, decision quick-ref.
 *
 * Split into two hooks so each stays under the harness per-hook 10,000 character
 * limit — CLAUDE.md grows over time so splitting adds a permanent safety margin.
 *
 * Companion: prompt-context-assembler-claude-p2.cjs injects project-config-summary.
 *
 * Dedup marker: CLAUDE_MD → '## [Re-Injected: CLAUDE.md Key Rules]'
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
    CLAUDE_MD: CLAUDE_MD_MARKER,
    DEDUP_LINES,
    TOP_DEDUP_LINES
} = require('./lib/dedup-constants.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function isMarkerInContext(lines, marker, bottomWindow, topWindow = TOP_DEDUP_LINES) {
    if (!lines || lines.length === 0) return false;
    if (lines.slice(-bottomWindow).some(l => l.includes(marker))) return true;
    if (lines.slice(0, topWindow).some(l => l.includes(marker))) return true;
    return false;
}

function loadTranscriptLines(transcriptPath) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;
        return fs.readFileSync(transcriptPath, 'utf-8').split('\n');
    } catch {
        return null;
    }
}

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        if (payload.hook_event_name === 'SessionStart') process.exit(0);

        const userPrompt = payload.prompt || '';
        if (!userPrompt.trim()) process.exit(0);

        const transcriptLines = loadTranscriptLines(payload.transcript_path);

        // 1. CLAUDE.md TL;DR section (~5.5KB)
        if (!isMarkerInContext(transcriptLines, CLAUDE_MD_MARKER, DEDUP_LINES.CLAUDE_MD)) {
            const filePath = path.join(PROJECT_DIR, 'CLAUDE.md');
            try {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    if (content.trim()) {
                        // Extract just the TL;DR section (<!-- SECTION:tldr --> markers)
                        const tldrMatch = content.match(/<!-- SECTION:tldr -->([\s\S]*?)<!-- \/SECTION:tldr -->/);
                        const tldrContent = tldrMatch
                            ? `## TL;DR — What You Must Know Before Writing Any Code\n\n${tldrMatch[1].trim()}`
                            : content.split('\n').slice(0, 80).join('\n');

                        console.log([
                            '',
                            CLAUDE_MD_MARKER,
                            '> Key rules re-injected for context recovery. Full CLAUDE.md is always loaded as project instructions.',
                            '',
                            tldrContent,
                            '',
                            '## [End: CLAUDE.md Key Rules]',
                            ''
                        ].join('\n'));
                    }
                }
            } catch { /* non-blocking */ }
        }

        // NOTE: project-config-summary is injected by prompt-context-assembler-claude-p2.cjs
        // (a separate hook registered after this one). Split to keep each hook under the
        // harness per-hook 10,000 character limit.

        process.exit(0);
    } catch (error) {
        console.error(`<!-- Assembler claude error: ${error.message} -->`);
        process.exit(0);
    }
}

if (require.main === module) {
    main();
}
