#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Coding Patterns & Agent-Specific Docs page 2/5 (fires 3rd of 13)
 *
 * Outputs: patterns page 2 of 5. Exits silently if content fits in page 1.
 *
 * Execution order: identity → patterns-p1 → patterns-p2 (this) → patterns-p3..p5
 *   → dev-rules-p1..p3 → lessons → ai-mistakes → context-guard → todos
 *
 * Only non-empty for agents in PATTERN_AWARE_AGENT_TYPES or AGENT_DOC_MAP.
 * Dynamic paging: max 8,500 chars per page via splitContentIntoPart().
 *
 * See: .claude/hooks/lib/subagent-context-builders.cjs — buildPatternsContextPart()
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const { buildPatternsContextPart, emitSubagentContext } = require('./lib/subagent-context-builders.cjs');

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        const agentType = payload.agent_type || 'unknown';

        emitSubagentContext(buildPatternsContextPart(1, 5, agentType));
    } catch (error) {
        console.error(`SubagentStart patterns-p2 error: ${error.message}`);
        process.exit(0); // fail-open
    }
}

main();
