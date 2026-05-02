#!/usr/bin/env node
'use strict';

// Unit tests for statusline-tps computeAvgTps turn-pairing logic.
// Pairs assistant.timestamp with the most recent preceding non-assistant
// event (user/tool_result/system). Discards pairs > MAX_TURN_GAP_MS.

const assert = require('assert');
const { computeAvgTps, fmt, MAX_TURN_GAP_MS } = require('../statusline-tps.cjs');

const ms = s => new Date(s).toISOString();

function userEv(t) { return { type: 'user', timestamp: ms(t) }; }
function asstEv(t, outputTokens) {
    return {
        type: 'assistant',
        timestamp: ms(t),
        message: { role: 'assistant', usage: { output_tokens: outputTokens } }
    };
}

const cases = [];

cases.push({
    name: 'happy path: two valid turns, average across both',
    events: [
        userEv(1000),
        asstEv(2000, 100),   // 1s gap, 100 tokens → 100 tok/s
        userEv(3000),
        asstEv(5000, 200)    // 2s gap, 200 tokens → 100 tok/s
    ],
    expect: avg => {
        assert.ok(avg != null, 'expected non-null avg');
        assert.ok(Math.abs(avg - 100) < 0.01, `expected ~100, got ${avg}`);
    }
});

cases.push({
    name: 'gap exceeds MAX_TURN_GAP_MS: turn skipped',
    events: [
        userEv(1000),
        asstEv(1000 + MAX_TURN_GAP_MS + 1, 500), // gap > max → skip
        userEv(2000 + MAX_TURN_GAP_MS),
        asstEv(2000 + MAX_TURN_GAP_MS + 1000, 50)  // 1s, 50 tokens → 50 tok/s
    ],
    expect: avg => {
        assert.ok(avg != null);
        assert.ok(Math.abs(avg - 50) < 0.01, `expected ~50, got ${avg}`);
    }
});

cases.push({
    name: 'no preceding non-assistant: assistant ignored',
    events: [
        asstEv(1000, 100),  // no prior non-assistant — should not pair
        userEv(2000),
        asstEv(3000, 100)   // 1s, 100 tokens → 100 tok/s
    ],
    expect: avg => {
        assert.ok(avg != null);
        assert.ok(Math.abs(avg - 100) < 0.01, `expected ~100, got ${avg}`);
    }
});

cases.push({
    name: 'zero output_tokens: turn skipped',
    events: [
        userEv(1000),
        asstEv(2000, 0),    // skipped (out <= 0)
        userEv(3000),
        asstEv(4000, 100)   // 1s, 100 tokens → 100 tok/s
    ],
    expect: avg => {
        assert.ok(avg != null);
        assert.ok(Math.abs(avg - 100) < 0.01, `expected ~100, got ${avg}`);
    }
});

cases.push({
    name: 'empty events: returns null',
    events: [],
    expect: avg => assert.strictEqual(avg, null)
});

cases.push({
    name: 'consecutive assistants pair (per file header: prior assistant turn used if none intervened)',
    events: [asstEv(1000, 100), asstEv(2000, 100)],
    expect: avg => {
        // 100 tokens over 1000ms = 100 tok/s
        assert.ok(avg != null);
        assert.ok(Math.abs(avg - 100) < 0.01, `expected ~100, got ${avg}`);
    }
});

cases.push({
    name: 'single assistant only: returns null (no pair possible)',
    events: [asstEv(1000, 100)],
    expect: avg => assert.strictEqual(avg, null)
});

cases.push({
    name: 'fmt: formats >=100 with 0 decimals',
    events: null,
    expect: () => assert.strictEqual(fmt(123.456), '123')
});

cases.push({
    name: 'fmt: formats 10-100 with 1 decimal',
    events: null,
    expect: () => assert.strictEqual(fmt(45.678), '45.7')
});

cases.push({
    name: 'fmt: formats <10 with 2 decimals',
    events: null,
    expect: () => assert.strictEqual(fmt(3.14159), '3.14')
});

cases.push({
    name: 'fmt: null/NaN returns null',
    events: null,
    expect: () => {
        assert.strictEqual(fmt(null), null);
        assert.strictEqual(fmt(Number.NaN), null);
    }
});

let pass = 0, fail = 0;
for (const c of cases) {
    try {
        const avg = c.events == null ? null : computeAvgTps(c.events);
        c.expect(avg);
        console.log(`\x1b[32m✓\x1b[0m ${c.name}`);
        pass++;
    } catch (err) {
        console.log(`\x1b[31m✗\x1b[0m ${c.name}: ${err.message}`);
        fail++;
    }
}

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
