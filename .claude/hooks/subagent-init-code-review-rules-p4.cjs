#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Code Review Rules page 4/5 (fires 13th of 18)
 * See subagent-init-code-review-rules-p1.cjs for full context.
 * Exit Codes: 0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const { buildCodeReviewRulesContextPart, emitSubagentContext } = require('./lib/subagent-context-builders.cjs');

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        const agentType = payload.agent_type || 'unknown';

        emitSubagentContext(buildCodeReviewRulesContextPart(3, 5, agentType));
    } catch (error) {
        console.error(`SubagentStart code-review-rules-p4 error: ${error.message}`);
        process.exit(0); // fail-open
    }
}

main();
