#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Context-Overflow Guard (fires 12th of 13)
 *
 * Outputs: context window exhaustion warning + accumulative-write pattern
 *          + resume guidance + Output Contract (write-before-summary rule)
 *          + Report Path Declaration (first-line `Report: <path>` contract).
 *          Universal — all agent types receive this injection.
 *
 * Execution order: identity → patterns-p1..p5 → dev-rules-p1..p3
 *   → lessons → ai-mistakes → context-guard (this, 12th) → todos (last)
 *
 * Split into 13 named hooks to avoid the Claude Code per-hook output size limit
 * (9,000 chars enforced). This hook fires last to ensure the guard reminder is
 * at the tail of the injected context — AI models attend strongly to the last
 * ~100 lines of their context window.
 *
 * See: .claude/hooks/lib/subagent-context-builders.cjs — shared builders.
 * Previous: subagent-init-lessons.cjs (lessons + AI mistake prevention)
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const {
    buildContextGuardContext,
    emitSubagentContext
} = require('./lib/subagent-context-builders.cjs');

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);
        const payload = JSON.parse(stdin);
        const sessionId = payload.session_id || null;

        emitSubagentContext(buildContextGuardContext(sessionId));
    } catch (error) {
        console.error(`SubagentStart context-guard error: ${error.message}`);
        process.exit(0); // fail-open
    }
}

main();
