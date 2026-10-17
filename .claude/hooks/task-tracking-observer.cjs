#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

const { runHook, isHookEntryPoint } = require('./lib/hook-runner.cjs');
const { resolveProjectRoot } = require('./lib/project-root.cjs');
const { observerHint } = require('./lib/task-tracking-upkeep.cjs');

function observe(event) {
    try {
        const selected = resolveProjectRoot({ cwd: event?.cwd || process.cwd(), scriptPath: __filename, env: process.env });
        if (selected.error) return;
        const hint = observerHint(event, selected.rootDir);
        if (hint) return { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: hint } };
    } catch { /* Optional tracking must never block the primary tool or fabricate progress. */ }
}

if (isHookEntryPoint(module)) runHook('task-tracking-observer', observe, { timeout: 3000, outputResult: true });
module.exports = { observe };
