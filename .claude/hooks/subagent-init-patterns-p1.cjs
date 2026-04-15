#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Coding Patterns & Agent-Specific Docs page 1/5 (fires 2nd of 13)
 *
 * Outputs: backend/frontend patterns + agent-specific docs page 1 of 5 (max 8,500 chars).
 * Content is built dynamically at runtime for the agent type, then paginated.
 *
 * Execution order: identity → patterns-p1 (this) → patterns-p2..p5
 *   → dev-rules-p1..p3 → lessons → ai-mistakes → context-guard → todos
 *
 * Only non-empty for agents in PATTERN_AWARE_AGENT_TYPES or AGENT_DOC_MAP.
 * Exits silently (no output) for agents not in either set.
 * Dynamic paging: max 8,500 chars per page via splitContentIntoPart().
 *
 * See: .claude/hooks/lib/subagent-context-builders.cjs — buildPatternsContextPart()
 * Next: subagent-init-patterns-p2.cjs (page 2/5)
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

        emitSubagentContext(buildPatternsContextPart(0, 5, agentType));
    } catch (error) {
        console.error(`SubagentStart patterns-p1 error: ${error.message}`);
        process.exit(0); // fail-open
    }
}

main();
