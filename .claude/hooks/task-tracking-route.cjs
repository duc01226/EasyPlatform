#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

const { isHookEntryPoint } = require('./lib/hook-runner.cjs');
const { deliverAdvisory } = require('./lib/task-tracking-advisory.cjs');
const MAX_INPUT_BYTES = 131072;

function readInput() {
    const fs = require('node:fs');
    const { parseJsonInput } = require('./lib/stdin-parser.cjs');
    const bytes = Buffer.alloc(MAX_INPUT_BYTES + 1);
    let length = 0;
    while (length < bytes.length) {
        const count = fs.readSync(0, bytes, length, bytes.length - length, null);
        if (!count) break;
        length += count;
    }
    if (length > MAX_INPUT_BYTES) return null;
    const text = bytes.subarray(0, length).toString('utf8').trim();
    return text ? parseJsonInput(text) : null;
}

module.exports = { MAX_INPUT_BYTES, run: deliverAdvisory };

if (isHookEntryPoint(module)) {
    process.exitCode = 0;
    try {
        const input = readInput();
        if (input) deliverAdvisory(input).then(() => { process.exitCode = 0; }, () => { process.exitCode = 0; });
    } catch {
        process.exitCode = 0;
    }
}
