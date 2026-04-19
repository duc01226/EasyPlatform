#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Code Review Rules page 1/5 (fires 10th of 18)
 *
 * Outputs: docs/project-reference/code-review-rules.md page 1 of 5 (max 8,500 chars).
 * File is 38 KB / 841 lines — requires 5 pages to inject fully.
 *
 * Only fires for CODE_REVIEW_RULES_AGENT_TYPES (code-reviewer, code-simplifier,
 * spec-compliance-reviewer). Silent exit for all other agent types.
 *
 * Why dedicated hooks instead of AGENT_DOC_MAP: backend+frontend patterns
 * exhaust the 5-page patterns budget (42,500 chars), leaving code-review-rules.md
 * silently uninjected via the overflow path for pattern-aware review agents.
 *
 * See: .claude/hooks/lib/subagent-context-builders.cjs — CODE_REVIEW_RULES_AGENT_TYPES
 * Next: subagent-init-code-review-rules-p2.cjs (page 2/5)
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const { buildCodeReviewRulesContextPart, emitSubagentContext } = require('./lib/subagent-context-builders.cjs');

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        const agentType = payload.agent_type || 'unknown';

        emitSubagentContext(buildCodeReviewRulesContextPart(0, 5, agentType));
    } catch (error) {
        console.error(`SubagentStart code-review-rules-p1 error: ${error.message}`);
        process.exit(0); // fail-open
    }
}

main();
