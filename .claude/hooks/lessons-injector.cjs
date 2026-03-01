#!/usr/bin/env node
'use strict';
/**
 * Lessons Injector - PreToolUse(Edit|Write|MultiEdit) thin wrapper
 *
 * Ensures lessons are in context before every edit operation.
 * UserPromptSubmit injection is handled by prompt-context-assembler.cjs.
 *
 * Uses dedup to avoid re-injecting on consecutive edits (~1K tokens saved per edit).
 */

const fs = require('fs');
const { injectLessons } = require('./lib/prompt-injections.cjs');

function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);
        const payload = JSON.parse(stdin);
        const result = injectLessons(payload.transcript_path);
        if (result) console.log(result);
    } catch {
        /* silent fail */
    }
    process.exit(0);
}

main();
