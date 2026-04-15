#!/usr/bin/env node
/**
 * Prompt Context Assembler - Project Config Summary (UserPromptSubmit Hook)
 *
 * Injects project-config-summary (~3.2KB) for context recovery after long
 * sessions — project modules, framework, context groups.
 *
 * Split from prompt-context-assembler-claude.cjs to keep each hook under the
 * harness per-hook 10,000 character limit. Content is dynamic (generateProjectSummary()
 * reflects live project-config.json) so splitting adds a permanent safety margin.
 *
 * Companion: prompt-context-assembler-claude.cjs injects CLAUDE.md TL;DR.
 *
 * Dedup marker: PROJECT_CONFIG_SUMMARY → '## [Injected: Project Config Summary]'
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { generateProjectSummary } = require('./lib/project-config-loader.cjs');
const {
    PROJECT_CONFIG_SUMMARY: PROJECT_CONFIG_SUMMARY_MARKER,
    DEDUP_LINES
} = require('./lib/dedup-constants.cjs');
const { isMarkerInContext, loadTranscriptLines } = require('./lib/transcript-utils.cjs');

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        if (payload.hook_event_name === 'SessionStart') process.exit(0);

        const userPrompt = payload.prompt || '';
        if (!userPrompt.trim()) process.exit(0);

        const transcriptLines = loadTranscriptLines(payload.transcript_path);

        if (!isMarkerInContext(transcriptLines, PROJECT_CONFIG_SUMMARY_MARKER, DEDUP_LINES.PROJECT_CONFIG_SUMMARY)) {
            try {
                const summary = generateProjectSummary();
                if (summary && summary.trim()) {
                    console.log([
                        '',
                        PROJECT_CONFIG_SUMMARY_MARKER,
                        '',
                        summary,
                        '',
                        '## [End: Project Config Summary]',
                        ''
                    ].join('\n'));
                }
            } catch { /* non-blocking */ }
        }

        process.exit(0);
    } catch (error) {
        console.error(`<!-- Assembler project-config error: ${error.message} -->`);
        process.exit(0);
    }
}

if (require.main === module) {
    main();
}
