#!/usr/bin/env node
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { resolveProjectRoot } = require('../hooks/lib/project-root.cjs');
const { renderProfiles, assessEvidence, currentIdentity } = require('./lib/context-delivery-evidence.cjs');
const root = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;

(async () => {
    if (process.argv[2] === 'assess') {
        if (fs.statSync(process.argv[3]).size > 4 * 1024 * 1024) throw new Error('size');
        const input = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
        const manifest = JSON.parse(fs.readFileSync(path.join(root, '.claude/hooks/tests/fixtures/context-delivery/evaluation-tasks.json'), 'utf8'));
        // Evidence supplies receipts, never the expected identity of the current candidate.
        const result = assessEvidence(manifest, input.records, { ...input.options, ...await currentIdentity(root) });
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        if (!result.eligible) process.exitCode = 1;
    } else if (!process.argv[2] || process.argv[2] === 'render') {
        process.stdout.write(`${JSON.stringify(await renderProfiles(root), null, 2)}\n`);
    } else throw new Error('usage');
})().catch(() => {
    process.stderr.write('CONTEXT_AUDIT_UNAVAILABLE: use render or assess <evidence.json>; no profile was changed\n');
    process.exitCode = 1;
});
