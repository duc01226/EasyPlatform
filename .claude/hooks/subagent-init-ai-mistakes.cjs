#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — AI Mistake Prevention (fires 6th of 8)
 *
 * Outputs: AI mistake prevention bullets (system lessons — hardcoded in
 * prompt-injections.cjs:injectAiMistakePrevention()).
 *
 * Kept separate from subagent-init-lessons.cjs so each hook stays under Claude
 * Code's 9,000-char hook output limit. Combined, lessons + AI mistakes are
 * ~9,743 chars which exceeded the limit and caused silent tail truncation.
 *
 * WARNING: injectAiMistakePrevention() is currently ~8,200 chars.
 * If content grows past ~8,500 chars, apply splitContentIntoPart() paging
 * to avoid hitting the limit again.
 *
 * Execution order: identity → patterns → dev-rules → code-review-rules
 *   → lessons → ai-mistakes (this, 6th) → context-guard → todos (last)
 * Placement: near-last ensures AI attends to mistake prevention — recency effect.
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
