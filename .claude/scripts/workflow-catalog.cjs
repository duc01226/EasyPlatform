#!/usr/bin/env node
'use strict';

// Explicit catalog retrieval for concise delivery. The existing renderer owns
// tiers, grouped barriers and bounded fallbacks; no second catalog is maintained.
//
//   node .claude/scripts/workflow-catalog.cjs                  activation legend of the configured route mode
//   node .claude/scripts/workflow-catalog.cjs --mode=<mode>    legend of the given mode: ask | auto | off
//
// A prompt directive sets the route mode for one session, which the route hook knows and a tool
// process does not. The concise route cue therefore names this command with the mode of its own state
// line, and `--mode` takes the place of that session directive in the mode's precedence.
// Exit 0 with the catalog on stdout; 1 on a usage error or an unreadable registry (stderr names it).
const { resolveProjectRoot } = require('../hooks/lib/project-root.cjs');
const routing = require('./lib/workflow-routing-config.cjs');

const MODE_FLAG = '--mode=';
const OFF_NOTE = 'Route mode off: choose and start no workflow yourself. Use this catalog only for a workflow the user explicitly requests or a running operation requires; the activation legend below does not apply.';

/** `{ sessionMode }` (undefined without the flag), or `{ error }` naming the arguments that are not understood. */
function parseArgs(argv) {
    let sessionMode;
    const unknown = [];
    for (const raw of argv) {
        const value = String(raw).startsWith(MODE_FLAG) ? String(raw).slice(MODE_FLAG.length).trim().toLowerCase() : null;
        if (value !== null && routing.ROUTE_MODES.includes(value)) sessionMode = value;
        else unknown.push(String(raw).slice(0, 64));
    }
    return unknown.length ? { error: unknown.join(' ') } : { sessionMode };
}

const args = parseArgs(process.argv.slice(2));
if (args.error) {
    process.stderr.write(`WORKFLOW_CATALOG_USAGE: unknown argument(s) ${args.error} (expected ${MODE_FLAG}${routing.ROUTE_MODES.join(' | ')})\n`);
    process.exitCode = 1;
} else {
    try {
        const root = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;
        const { mode } = routing.resolveWorkflowRouteMode({ rootDir: root, env: process.env, sessionMode: args.sessionMode });
        const catalog = require('../hooks/lib/workflow-route-delivery.cjs').buildCatalogInjection(root, mode);
        process.stdout.write(`${mode === 'off' ? `${OFF_NOTE}\n` : ''}${catalog}\n`);
    } catch {
        process.stderr.write('WORKFLOW_CATALOG_UNAVAILABLE: read .claude/workflows.json and the registered start-workflow skill\n');
        process.exitCode = 1;
    }
}
