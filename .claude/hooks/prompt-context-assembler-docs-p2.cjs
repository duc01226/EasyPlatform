#!/usr/bin/env node
/**
 * Prompt Context Assembler - Project Structure Part 2 (UserPromptSubmit)
 *
 * Injects the SECOND HALF of docs/project-reference/project-structure-reference.md
 * for context recovery after long sessions. Companion to prompt-context-assembler-docs.cjs
 * (part 1). Split so each hook stays under the harness per-hook 10,000 character limit.
 *
 * Dedup marker: '## [Injected: Project Structure Reference (part 2)]'
 *   Independent from part 1's marker — each part deduplicates independently.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
    DEDUP_LINES,
    TOP_DEDUP_LINES
} = require('./lib/dedup-constants.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const PROJECT_STRUCTURE_P2_MARKER = '## [Injected: Project Structure Reference (part 2)]';

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

        // Use PROJECT_STRUCTURE dedup window as reference for size (same file, same frequency)
        if (!isMarkerInContext(transcriptLines, PROJECT_STRUCTURE_P2_MARKER, DEDUP_LINES.PROJECT_STRUCTURE)) {
            const filePath = path.join(PROJECT_DIR, 'docs', 'project-reference', 'project-structure-reference.md');
            try {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    if (content.trim()) {
                        const lines = content.split('\n');
                        const halfLine = Math.ceil(lines.length / 2);
                        const secondHalf = lines.slice(halfLine).join('\n');
                        if (secondHalf.trim()) {
                            console.log([
                                '',
                                PROJECT_STRUCTURE_P2_MARKER,
                                '> Content auto-injected for context recovery (part 2 of 2, continuation of Project Structure Reference).',
                                '',
                                secondHalf,
                                '',
                                '## [End: Project Structure Reference (part 2)]',
                                ''
                            ].join('\n'));
                        }
                    }
                }
            } catch { /* non-blocking */ }
        }

        process.exit(0);
    } catch (error) {
        console.error(`<!-- Assembler docs p2 error: ${error.message} -->`);
        process.exit(0);
    }
}

if (require.main === module) {
    main();
}
