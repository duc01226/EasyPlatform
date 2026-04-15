#!/usr/bin/env node
/**
 * Prompt Context Assembler - Project Structure Part 1 (UserPromptSubmit)
 *
 * Injects the FIRST HALF of docs/project-reference/project-structure-reference.md
 * for context recovery after long sessions. Split into two hooks so each stays
 * under the harness per-hook 10,000 character limit — file content is dynamic
 * (grows as project evolves) so splitting adds a permanent safety margin.
 *
 * Companion: prompt-context-assembler-docs-p2.cjs injects the second half.
 *
 * Dedup marker: '## [Injected: Project Structure Reference]'
 *   Both parts check for this marker — if part 1 was injected this session,
 *   part 2 uses its own marker '## [Injected: Project Structure Reference (part 2)]'.
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

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        if (payload.hook_event_name === 'SessionStart') process.exit(0);

        const userPrompt = payload.prompt || '';
        if (!userPrompt.trim()) process.exit(0);

        const transcriptLines = loadTranscriptLines(payload.transcript_path);

        if (!isMarkerInContext(transcriptLines, PROJECT_STRUCTURE_MARKER, DEDUP_LINES.PROJECT_STRUCTURE)) {
            const filePath = path.join(PROJECT_DIR, 'docs', 'project-reference', 'project-structure-reference.md');
            try {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    if (content.trim()) {
                        const lines = content.split('\n');
                        const halfLine = Math.ceil(lines.length / 2);
                        const firstHalf = lines.slice(0, halfLine).join('\n');
                        console.log([
                            '',
                            PROJECT_STRUCTURE_MARKER,
                            '> Content auto-injected for context recovery (part 1 of 2). See part 2 below for the remainder.',
                            '',
                            firstHalf,
                            '',
                            '## [End: Project Structure Reference (part 1)]',
                            ''
                        ].join('\n'));
                    }
                }
            } catch { /* non-blocking */ }
        }

        process.exit(0);
    } catch (error) {
        console.error(`<!-- Assembler docs error: ${error.message} -->`);
        process.exit(0);
    }
}

if (require.main === module) {
    main();
}
