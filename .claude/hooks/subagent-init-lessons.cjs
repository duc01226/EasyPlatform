#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Lessons Learned (fires 10th of 13)
 *
 * Outputs: lessons learned from docs/project-reference/lessons.md (~1,500 chars).
 * AI mistake prevention is split into subagent-init-ai-mistakes.cjs (fires 11th)
 * to keep each hook under Claude Code's 9,000-char hook output limit.
 *
 * Execution order: identity → patterns-p1..p5 → dev-rules-p1..p3
 *   → lessons (this, 10th) → ai-mistakes → context-guard → todos (last)
 * Placement: near-last ensures AI attends to lessons — AI models attend strongly
 * to the last ~100 lines of their context window.
 *
 * Note: CLAUDE.md is provided natively by Claude Code's claudeMd mechanism
 * (not via hook).
 *
 * See: .claude/hooks/lib/subagent-context-builders.cjs — shared builders.
 * Previous: subagent-init-dev-rules-p3.cjs (dev rules page 3)
 * Next: subagent-init-ai-mistakes.cjs (AI mistake prevention)
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const {
    buildSharedLessonsContext,
    emitSubagentContext
} = require('./lib/subagent-context-builders.cjs');

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);
        JSON.parse(stdin); // validate payload; fields not needed here

        emitSubagentContext(buildSharedLessonsContext());
    } catch (error) {
        console.error(`SubagentStart lessons error: ${error.message}`);
        process.exit(0); // fail-open
    }
}

main();
