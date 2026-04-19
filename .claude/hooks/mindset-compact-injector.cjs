#!/usr/bin/env node
'use strict';
/**
 * Mindset Compact Injector - PreToolUse Hook (Read|Grep|Glob|Bash)
 *
 * Fires a single-line critical-thinking reminder on read-only investigation tools.
 * Purpose: long read-only sessions (many consecutive Read/Grep/Glob/Bash calls
 * without Edit/Skill/Agent activity) scroll the critical-thinking marker past
 * the dedup window. This hook re-anchors it with minimal token cost.
 *
 * Dedup is handled by injectCriticalContext — if marker is still within the
 * recency window (DEDUP_LINES.CRITICAL_THINKING lines) or the top primacy
 * window, nothing is emitted. So consecutive greps don't spam.
 *
 * Compact-only: deliberately skips injectAiMistakePrevention (25 bullets)
 * to keep this cheap. Full re-injection still fires on Edit|Write|Agent|Skill.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const { injectCriticalContext } = require('./lib/prompt-injections.cjs');

function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        const toolName = payload.tool_name || '';
        const transcriptPath = payload.transcript_path || '';

        if (!['Read', 'Grep', 'Glob', 'Bash'].includes(toolName)) process.exit(0);

        const critical = injectCriticalContext(transcriptPath);
        if (critical) console.log(critical);
    } catch {
        /* silent fail — non-blocking */
    }
    process.exit(0);
}

main();
