#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Development Rules (fires 3rd of 8)
 *
 * Guides agent to read .claude/docs/development-rules.md.
 * Replaces the old 3-page content injection (p1-p3) with a single read-guidance pointer.
 * Only fires for DEV_RULES_AGENT_TYPES — silent exit otherwise.
 *
 * Exit Codes: 0 - Success (non-blocking)
 */

const fs = require('fs');
const { buildDevRulesGuidance, emitSubagentContext } = require('./lib/subagent-context-builders.cjs');

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);
        const payload = JSON.parse(stdin);
        emitSubagentContext(buildDevRulesGuidance(payload.agent_type || 'unknown'));
    } catch (error) {
        console.error(`SubagentStart dev-rules error: ${error.message}`);
        process.exit(0);
    }
}

main();
