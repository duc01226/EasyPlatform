#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Development Rules page 3/3 (fires 9th of 18)
 *
 * Outputs: development-rules.md page 3 of 3 (max 8,500 chars).
 * Silent if dev-rules content fits in p1+p2 (page 3 is empty for small files).
 * Added when development-rules.md grew to 18,420 chars; 2×8,500=17,000 was insufficient,
 * leaving lines 302-309 (8 closing MANDATORY reminders) uninjected.
 *
 * Execution order: identity → patterns-p1..p5 → dev-rules-p1 → dev-rules-p2 → dev-rules-p3 (this)
 *   → lessons → ai-mistakes → context-guard → todos
 *
 * Only fires for DEV_RULES_AGENT_TYPES. Silent exit otherwise.
 * Dynamic paging: max 8,500 chars per page via splitContentIntoPart().
 *
 * See: .claude/hooks/lib/subagent-context-builders.cjs — DEV_RULES_AGENT_TYPES + buildDevRulesContextPart()
 * Previous: subagent-init-dev-rules-p2.cjs (page 2/3)
 * Next: subagent-init-lessons.cjs (lessons learned)
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

        emitSubagentContext(buildDevRulesContextPart(2, 3, agentType));
    } catch (error) {
        console.error(`SubagentStart dev-rules-p3 error: ${error.message}`);
        process.exit(0); // fail-open
    }
}

main();
