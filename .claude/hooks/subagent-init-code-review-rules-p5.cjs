#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Code Review Rules page 5/5 (fires 14th of 18) (last page; silent if fits in p1–p4)
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

        emitSubagentContext(buildCodeReviewRulesContextPart(4, 5, agentType));
    } catch (error) {
        console.error(`SubagentStart code-review-rules-p5 error: ${error.message}`);
        process.exit(0);
    }
}

main();
