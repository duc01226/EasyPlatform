#!/usr/bin/env node
/**
 * Prompt Context Assembler - Project Structure Guidance (UserPromptSubmit)
 *
 * Reminds AI to read docs/project-reference/project-structure-reference.md
 * when needed. Replaces the old full-content injection (split across p1+p2)
 * with a lightweight read-guidance pointer.
 *
 * Dedup marker: '## [Injected: Project Structure Reference]'
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
    PROJECT_STRUCTURE: PROJECT_STRUCTURE_MARKER,
    DEDUP_LINES
} = require('./lib/dedup-constants.cjs');
const { isMarkerInContext, loadTranscriptLines } = require('./lib/transcript-utils.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const STRUCT_DOC = 'docs/project-reference/project-structure-reference.md';

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        if (payload.hook_event_name === 'SessionStart') process.exit(0);

        const userPrompt = payload.prompt || '';
        if (!userPrompt.trim()) process.exit(0);

        const transcriptLines = loadTranscriptLines(payload.transcript_path);
        if (isMarkerInContext(transcriptLines, PROJECT_STRUCTURE_MARKER, DEDUP_LINES.PROJECT_STRUCTURE)) process.exit(0);

        const filePath = path.join(PROJECT_DIR, STRUCT_DOC);
        if (!fs.existsSync(filePath)) process.exit(0);

        console.log([
            '',
            PROJECT_STRUCTURE_MARKER,
            `To understand service architecture, ports, messaging patterns, tech stack, CQRS layers, and cross-service design: read \`${STRUCT_DOC}\`.`,
            ''
        ].join('\n'));

        process.exit(0);
    } catch (error) {
        console.error(`<!-- Assembler docs error: ${error.message} -->`);
        process.exit(0);
    }
}

if (require.main === module) {
    main();
}
