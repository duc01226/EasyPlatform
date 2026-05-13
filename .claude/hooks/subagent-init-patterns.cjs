#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Coding Patterns & Reference Docs (fires 2nd of 8)
 *
 * Guides agent to read the right reference docs for its role.
 * Replaces the old 5-page content injection (p1-p5) with a single read-guidance pointer.
 * Only fires for agents in PATTERN_AWARE_AGENT_TYPES or AGENT_DOC_MAP — silent exit otherwise.
 *
 * Exit Codes: 0 - Success (non-blocking)
 */

const fs = require('fs');
const { buildPatternsGuidance, emitSubagentContext } = require('./lib/subagent-context-builders.cjs');

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);
        const payload = JSON.parse(stdin);
        emitSubagentContext(buildPatternsGuidance(payload.agent_type || 'unknown'));
    } catch (error) {
        console.error(`SubagentStart patterns error: ${error.message}`);
        process.exit(0);
    }
}

main();
