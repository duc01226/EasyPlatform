#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Dispatcher 2/3 — AI mistake prevention (builder 6 of 8)
 *
 * Isolated in its own process: ai-mistakes is ~6,400 chars and lessons (builder 5,
 * ~3,960 chars) sits immediately before it — together they exceed the ~8500 cap,
 * forcing a partition boundary at 5|6. It also can't absorb the context-guard+todos
 * tail without risking the cap once a parent session carries ~30 todos.
 *
 * Emits exactly what the former subagent-init-ai-mistakes.cjs emitted.
 *
 * Order: (after subagent-init.cjs) ai-mistakes → (subagent-init-3.cjs)
 *
 * Exit Codes: 0 — Success (non-blocking, fail-open)
 */

const fs = require('fs');
const { buildAiMistakePreventionContext, emitSubagentContext } = require('./lib/subagent-context-builders.cjs');

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);
        JSON.parse(stdin); // validate payload; fields not needed here

        emitSubagentContext(buildAiMistakePreventionContext());
    } catch (error) {
        console.error(`SubagentStart init (2/3) ai-mistakes error: ${error.message}`);
        process.exit(0); // fail-open
    }
}

main();
