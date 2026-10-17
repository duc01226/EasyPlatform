#!/usr/bin/env node
'use strict';
// Adapter is a user-selected host runner: argv is literal, stdin/stdout are JSON.
// It must capture actual tool events and usage under normal host permissions.
// The run loop lives in lib/context-evaluation-world.cjs (runEvaluation).
const fs = require('node:fs');
const path = require('node:path');
const { resolveProjectRoot } = require('../hooks/lib/project-root.cjs');
const { renderProfiles, currentIdentity, discoveryBundle } = require('./lib/context-delivery-evidence.cjs');
const { runEvaluation } = require('./lib/context-evaluation-world.cjs');
const root = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;

/** Closed option set: an unknown or incomplete argument blocks instead of silently preparing. */
function parseArgs(argv) {
    const options = { adapter: null, output: null, keepWorlds: false };
    for (let index = 0; index < argv.length; index++) {
        if (argv[index] === '--keep-worlds') options.keepWorlds = true;
        else if (['--adapter', '--output'].includes(argv[index]) && argv[index + 1]) options[argv[index].slice(2)] = argv[++index];
        else throw new Error('usage');
    }
    // Worlds exist only while an adapter runs; there is nothing to keep in a preparation.
    if (options.keepWorlds && !options.adapter) throw new Error('usage');
    return options;
}

(async () => {
    const options = parseArgs(process.argv.slice(2));
    const manifest = JSON.parse(fs.readFileSync(path.join(root, '.claude/hooks/tests/fixtures/context-delivery/evaluation-tasks.json'), 'utf8'));
    // Disposable output: the project tmp/ by default; --output selects another parent directory.
    const outputDir = options.output ? path.resolve(options.output) : path.join(root, 'tmp', 'context-delivery-evaluation');
    const rendered = await renderProfiles(root);
    const bundle = discoveryBundle(root);
    const identity = await currentIdentity(root, rendered, bundle);
    const adapter = options.adapter ? JSON.parse(fs.readFileSync(options.adapter, 'utf8')) : undefined;
    const result = runEvaluation({ manifest, outputDir, bundle, identity, adapter, keepWorlds: options.keepWorlds, log: text => process.stdout.write(text) });
    const relative = path.relative(root, result.dir);
    const where = relative.startsWith('..') || path.isAbsolute(relative) ? result.dir : relative;
    if (!result.records) {
        process.stdout.write(`PREPARED ${result.jobs.length} jobs in ${where}; behavioral evidence NOT RUN. Use --adapter <adapter.json> only with an authorized isolated host runtime.\n`);
        return;
    }
    if (result.leftoverWorlds.length) process.stdout.write(`${result.leftoverWorlds.length} world(s) could not be removed from ${where}\n`);
    process.stdout.write(`Assessment: ${where}/assessment.json; adoption requires separate deterministic and native-platform proof.\n`);
})().catch(() => { process.stderr.write('CONTEXT_EVALUATION_BLOCKED: adapter/isolation/runtime evidence unavailable; compatible default retained. Usage: [--adapter <adapter.json> [--keep-worlds]] [--output <dir>]\n'); process.exitCode = 1; });
