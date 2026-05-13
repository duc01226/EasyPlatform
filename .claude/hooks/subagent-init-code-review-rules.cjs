#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Code Review Rules (fires 4th of 8)
 *
 * Guides agent to read docs/project-reference/code-review-rules.md.
 * Replaces the old 5-page content injection (p1-p5) with a single read-guidance pointer.
 * Only fires for CODE_REVIEW_RULES_AGENT_TYPES — silent exit otherwise.
 *
 * Exit Codes: 0 - Success (non-blocking)
 */

const fs = require('fs');
const { buildCodeReviewRulesGuidance, emitSubagentContext } = require('./lib/subagent-context-builders.cjs');

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);
        const payload = JSON.parse(stdin);
        emitSubagentContext(buildCodeReviewRulesGuidance(payload.agent_type || 'unknown'));
    } catch (error) {
        console.error(`SubagentStart code-review-rules error: ${error.message}`);
        process.exit(0);
    }
}

main();
