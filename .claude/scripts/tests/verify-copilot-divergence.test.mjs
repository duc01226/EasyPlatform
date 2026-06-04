import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// The verifier is .cjs (matches sync-copilot-workflows.cjs). Bridge to its pure
// exports via createRequire — same .cjs↔.mjs interop the repo uses elsewhere.
// Requiring it must NOT trigger a real sync: the verifier guards main() behind a
// require.main === module check, and sync-copilot-workflows.cjs does the same.
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const verifierPath = path.resolve(thisDir, '..', 'verify-copilot-divergence.cjs');
const { diffMaps, readCommitted, buildExpected } = require(verifierPath);

// TC-SYNCFIX-002 — identical maps → no divergence (the in-sync PASS case).
test('TC-SYNCFIX-002: identical maps produce no diffs', () => {
    const a = new Map([
        ['.github/copilot-instructions.md', 'x\n'],
        ['.github/instructions/a.instructions.md', 'y\n']
    ]);
    const b = new Map([
        ['.github/copilot-instructions.md', 'x\n'],
        ['.github/instructions/a.instructions.md', 'y\n']
    ]);
    assert.deepEqual(diffMaps(a, b), []);
});

// TC-SYNCFIX-003 — one diff of each kind (content / missing / extra), asserting
// exact kinds AND stable sorted-by-relPath ordering so CI lists don't churn.
test('TC-SYNCFIX-003: content/missing/extra flagged with sorted ordering', () => {
    const expected = new Map([
        ['.github/copilot-instructions.md', 'fresh\n'],
        ['.github/instructions/a.instructions.md', 'same\n'],
        ['.github/instructions/b.instructions.md', 'only-expected\n']
    ]);
    const actual = new Map([
        ['.github/copilot-instructions.md', 'stale\n'],
        ['.github/instructions/a.instructions.md', 'same\n'],
        ['.github/instructions/c.instructions.md', 'only-actual\n']
    ]);
    assert.deepEqual(diffMaps(expected, actual), [
        { relPath: '.github/copilot-instructions.md', kind: 'content' },
        { relPath: '.github/instructions/b.instructions.md', kind: 'missing-in-mirror' },
        { relPath: '.github/instructions/c.instructions.md', kind: 'extra-in-mirror' }
    ]);
});

// TC-SYNCFIX-003b — CRLF-only differences must NOT register as content drift
// (committed mirror is CRLF on Windows; generator emits LF).
test('TC-SYNCFIX-003b: CRLF-only difference is not divergence', () => {
    const expected = new Map([['.github/copilot-instructions.md', 'line1\nline2\n']]);
    const actual = new Map([['.github/copilot-instructions.md', 'line1\r\nline2\r\n']]);
    assert.deepEqual(diffMaps(expected, actual), []);
});

// TC-SYNCFIX-004 — round-trip happy path: what buildExpected() generates from the
// live sources must equal what readCommitted() reads off disk. Depends on the
// Copilot mirror being in sync — which the pre-commit gate (Phase 04) enforces,
// so a failure here means a real stale mirror, not a flaky test.
test('TC-SYNCFIX-004: live buildExpected vs readCommitted round-trips clean', () => {
    const diffs = diffMaps(buildExpected(), readCommitted());
    assert.deepEqual(
        diffs,
        [],
        `Copilot mirror is stale — run: node .claude/scripts/sync-copilot-workflows.cjs\nDrift: ${JSON.stringify(diffs)}`
    );
});

// TC-RVFIX-004 — fail-open contract: a generator LOAD error must never block a
// commit, so the verifier may require sync-copilot-workflows.cjs only INSIDE
// buildExpected() (covered by main()'s try/catch) — never at module scope.
// Static source check: fails if anyone re-hoists the require above the function.
test('TC-RVFIX-004: generator require is lazy (inside buildExpected, not module scope)', async () => {
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(verifierPath, 'utf8');
    const requireIdx = source.indexOf("require('./sync-copilot-workflows.cjs')");
    const fnIdx = source.indexOf('function buildExpected');
    assert.ok(requireIdx !== -1, 'verifier must still require the generator (oracle pattern)');
    assert.ok(fnIdx !== -1, 'buildExpected() must exist');
    assert.ok(
        requireIdx > fnIdx,
        'generator require must appear AFTER the buildExpected declaration — a top-level require fails CLOSED on load errors, breaking the fail-open contract'
    );
});
