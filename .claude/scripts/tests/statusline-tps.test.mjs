import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Unit tests for statusline-tps computeAvgTps turn-pairing logic.
// Pairs assistant.timestamp with the most recent preceding non-assistant
// event (user/tool_result/system). Discards pairs > MAX_TURN_GAP_MS.
//
// statusline-tps is .cjs; bridge to its pure exports via createRequire — the
// .cjs↔.mjs interop the repo uses for .cjs scripts.
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { computeAvgTps, fmt, MAX_TURN_GAP_MS } = require(path.resolve(thisDir, '..', 'statusline-tps.cjs'));

const ms = s => new Date(s).toISOString();
const userEv = t => ({ type: 'user', timestamp: ms(t) });
const asstEv = (t, outputTokens) => ({
    type: 'assistant',
    timestamp: ms(t),
    message: { role: 'assistant', usage: { output_tokens: outputTokens } }
});

test('happy path: two valid turns, average across both', () => {
    const avg = computeAvgTps([
        userEv(1000),
        asstEv(2000, 100),   // 1s gap, 100 tokens → 100 tok/s
        userEv(3000),
        asstEv(5000, 200)    // 2s gap, 200 tokens → 100 tok/s
    ]);
    assert.ok(avg != null, 'expected non-null avg');
    assert.ok(Math.abs(avg - 100) < 0.01, `expected ~100, got ${avg}`);
});

test('gap exceeds MAX_TURN_GAP_MS: turn skipped', () => {
    const avg = computeAvgTps([
        userEv(1000),
        asstEv(1000 + MAX_TURN_GAP_MS + 1, 500), // gap > max → skip
        userEv(2000 + MAX_TURN_GAP_MS),
        asstEv(2000 + MAX_TURN_GAP_MS + 1000, 50)  // 1s, 50 tokens → 50 tok/s
    ]);
    assert.ok(avg != null);
    assert.ok(Math.abs(avg - 50) < 0.01, `expected ~50, got ${avg}`);
});

test('no preceding non-assistant: assistant ignored', () => {
    const avg = computeAvgTps([
        asstEv(1000, 100),  // no prior non-assistant — should not pair
        userEv(2000),
        asstEv(3000, 100)   // 1s, 100 tokens → 100 tok/s
    ]);
    assert.ok(avg != null);
    assert.ok(Math.abs(avg - 100) < 0.01, `expected ~100, got ${avg}`);
});

test('zero output_tokens: turn skipped', () => {
    const avg = computeAvgTps([
        userEv(1000),
        asstEv(2000, 0),    // skipped (out <= 0)
        userEv(3000),
        asstEv(4000, 100)   // 1s, 100 tokens → 100 tok/s
    ]);
    assert.ok(avg != null);
    assert.ok(Math.abs(avg - 100) < 0.01, `expected ~100, got ${avg}`);
});

test('empty events: returns null', () => {
    assert.equal(computeAvgTps([]), null);
});

test('consecutive assistants pair (per file header: prior assistant turn used if none intervened)', () => {
    // 100 tokens over 1000ms = 100 tok/s
    const avg = computeAvgTps([asstEv(1000, 100), asstEv(2000, 100)]);
    assert.ok(avg != null);
    assert.ok(Math.abs(avg - 100) < 0.01, `expected ~100, got ${avg}`);
});

test('single assistant only: returns null (no pair possible)', () => {
    assert.equal(computeAvgTps([asstEv(1000, 100)]), null);
});

test('fmt: formats >=100 with 0 decimals', () => {
    assert.equal(fmt(123.456), '123');
});

test('fmt: formats 10-100 with 1 decimal', () => {
    assert.equal(fmt(45.678), '45.7');
});

test('fmt: formats <10 with 2 decimals', () => {
    assert.equal(fmt(3.14159), '3.14');
});

test('fmt: null/NaN returns null', () => {
    assert.equal(fmt(null), null);
    assert.equal(fmt(Number.NaN), null);
});
