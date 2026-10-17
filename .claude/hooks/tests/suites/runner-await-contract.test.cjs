'use strict';

/**
 * Runner await contract — both test runners must settle whatever a test function returns.
 *
 * Business intent: a test reported as passed has actually finished its assertions. A plain
 * (non-async) function that RETURNS a promise — `fn: () => withFixture(async fx => ...)` — is
 * the common shape here; when a runner called it without awaiting, the test was marked ✓ before
 * its assertions ran, and a later rejection surfaced (if at all) against an unrelated test.
 * Invariants guarded:
 *   - run-all-tests.cjs runTest: a rejected promise from a non-async fn is a FAILED result, and a
 *     resolved one passes only after it settles;
 *   - helpers/test-utils.cjs TestGroup.run: same contract for the primary runner's groups.
 */

const assert = require('node:assert/strict');
const path = require('node:path');

const TESTS_DIR = path.resolve(__dirname, '..');
const { runTest } = require(path.join(TESTS_DIR, 'run-all-tests.cjs'));
const { TestGroup } = require(path.join(TESTS_DIR, 'helpers', 'test-utils.cjs'));

const later = (ms, fn) => new Promise((resolve, reject) => setTimeout(() => {
    try { resolve(fn()); } catch (err) { reject(err); }
}, ms));

const tests = [
    {
        name: 'TC-RAC-001 runTest fails a non-async test whose returned promise rejects',
        fn: async () => {
            // Given a plain function returning a promise that rejects after a tick
            const test = { name: 'returns-rejecting-promise', fn: () => later(5, () => { throw new Error('late assertion'); }) };
            // When the aggregate runner runs it
            const result = await runTest(test, false);
            // Then the rejection is the test's own failure, not a silent pass
            assert.equal(result.passed, false, 'a rejected returned promise must fail the test');
            assert.match(result.error, /late assertion/);
        }
    },
    {
        name: 'TC-RAC-002 runTest passes a non-async test only after its returned promise settles',
        fn: async () => {
            let settled = false;
            const test = { name: 'returns-resolving-promise', fn: () => later(5, () => { settled = true; }) };
            const result = await runTest(test, false);
            assert.equal(result.passed, true);
            assert.equal(settled, true, 'the pass is recorded after the assertions finished');
        }
    },
    {
        name: 'TC-RAC-003 TestGroup counts a non-async test whose returned promise rejects as failed',
        fn: async () => {
            const group = new TestGroup('await-contract');
            let settled = false;
            group.test('rejects late', () => later(5, () => { throw new Error('late assertion'); }));
            group.test('resolves late', () => later(5, () => { settled = true; }));
            const log = console.log;
            console.log = () => {};
            let outcome;
            try {
                outcome = await group.run(false);
            } finally {
                console.log = log;
            }
            assert.deepEqual(outcome, { passed: 1, failed: 1 });
            assert.equal(settled, true);
        }
    }
];

module.exports = { name: 'runner-await-contract', tests };
