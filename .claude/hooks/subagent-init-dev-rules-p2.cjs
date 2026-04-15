#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Development Rules page 2/3 (fires 8th of 13)
 *
 * Outputs: development-rules.md page 2 of 3 (max 8,500 chars).
 * Exits silently if dev-rules fits entirely in page 1 (file < 8,500 chars).
 *
 * Execution order: identity → patterns-p1..p5 → dev-rules-p1 → dev-rules-p2 (this) → dev-rules-p3
 *   → lessons → ai-mistakes → context-guard → todos
 *
 * Only fires for DEV_RULES_AGENT_TYPES. Silent exit otherwise.
 * Dynamic paging: max 8,500 chars per page via splitContentIntoPart().
 *
 * See: .claude/hooks/lib/subagent-context-builders.cjs — DEV_RULES_AGENT_TYPES + buildDevRulesContextPart()
 * Next: subagent-init-dev-rules-p3.cjs (page 3/3)
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

        emitSubagentContext(buildDevRulesContextPart(1, 3, agentType));
    } catch (error) {
        console.error(`SubagentStart dev-rules-p2 error: ${error.message}`);
        process.exit(0); // fail-open
    }
}

main();
