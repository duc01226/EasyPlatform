#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Coding Patterns & Agent-Specific Docs page 5/5 (fires 6th of 13)
 *
 * Outputs: patterns page 5 of 5 (safety buffer for large pattern sets).
 * Appends overflow notice if patterns content exceeds 5 × 8,500 chars.
 * Exits silently if content fits in pages 1-4 (most agent types will be silent here).
 *
 * Execution order: identity → patterns-p1..p4 → patterns-p5 (this)
 *   → dev-rules-p1..p3 → lessons → ai-mistakes → context-guard → todos
 *
 * Only non-empty for agents in PATTERN_AWARE_AGENT_TYPES or AGENT_DOC_MAP.
 * Dynamic paging: max 8,500 chars per page via splitContentIntoPart().
 *
 * See: .claude/hooks/lib/subagent-context-builders.cjs — buildPatternsContextPart()
 * Next: subagent-init-dev-rules-p1.cjs (dev rules, fires 7th)
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

        emitSubagentContext(buildPatternsContextPart(4, 5, agentType));
    } catch (error) {
        console.error(`SubagentStart patterns-p5 error: ${error.message}`);
        process.exit(0); // fail-open
    }
}

main();
