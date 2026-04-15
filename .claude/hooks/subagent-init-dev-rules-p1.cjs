#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Development Rules page 1/3 (fires 7th of 13)
 *
 * Outputs: development-rules.md page 1 of 3 (max 8,500 chars).
 * .claude/docs/development-rules.md is split dynamically at runtime.
 * Increased from 2→3 pages: file is 18,420 chars; 2×8,500=17,000 was insufficient,
 * leaving lines 302-309 (8 closing MANDATORY reminders) uninjected.
 *
 * Execution order: identity → patterns-p1..p5 → dev-rules-p1 (this) → dev-rules-p2 → dev-rules-p3
 *   → lessons → ai-mistakes → context-guard → todos
 *
 * Only fires for DEV_RULES_AGENT_TYPES. Silent exit otherwise.
 * Dynamic paging: max 8,500 chars per page via splitContentIntoPart().
 *
 * See: .claude/hooks/lib/subagent-context-builders.cjs — DEV_RULES_AGENT_TYPES + buildDevRulesContextPart()
 * Next: subagent-init-dev-rules-p2.cjs (page 2/3)
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const { buildDevRulesContextPart, emitSubagentContext } = require('./lib/subagent-context-builders.cjs');

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        const agentType = payload.agent_type || 'unknown';

        emitSubagentContext(buildDevRulesContextPart(0, 3, agentType));
    } catch (error) {
        console.error(`SubagentStart dev-rules-p1 error: ${error.message}`);
        process.exit(0); // fail-open
    }
}

main();
