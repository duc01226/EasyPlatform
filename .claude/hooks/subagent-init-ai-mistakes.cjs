#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — AI Mistake Prevention (fires 16th of 18)
 *
 * Outputs: AI mistake prevention bullets (system lessons — hardcoded in
 * prompt-injections.cjs:injectAiMistakePrevention()).
 *
 * Split from subagent-init-lessons.cjs to keep each hook under Claude Code's
 * 9,000-char hook output limit. Combined, lessons + AI mistakes = ~9,743 chars
 * which exceeded the limit and caused silent truncation of the final ~743 chars.
 *
 * WARNING: injectAiMistakePrevention() is currently ~8,200 chars.
 * If content grows past ~8,500 chars, apply splitContentIntoPart() paging
 * (same pattern as subagent-init-patterns-p1..p5) to avoid hitting the limit again.
 *
 * Execution order: identity → patterns-p1..p5 → dev-rules-p1..p3
 *   → lessons → ai-mistakes (this, 11th) → context-guard → todos (last)
 * Placement: near-last ensures AI attends to lessons — recency effect.
 *
 * See: .claude/hooks/lib/subagent-context-builders.cjs — buildAiMistakePreventionContext()
 *      .claude/hooks/lib/prompt-injections.cjs — injectAiMistakePrevention() (content source)
 * Previous: subagent-init-lessons.cjs (lessons learned)
 * Next: subagent-init-context-guard.cjs
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const {
    buildAiMistakePreventionContext,
    emitSubagentContext
} = require('./lib/subagent-context-builders.cjs');

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);
        JSON.parse(stdin); // validate payload; fields not needed here

        emitSubagentContext(buildAiMistakePreventionContext());
    } catch (error) {
        console.error(`SubagentStart ai-mistakes error: ${error.message}`);
        process.exit(0); // fail-open
    }
}

main();
