'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
    MAX_ROUNDS, HARD_MAX_ROUNDS, POLICY_VERSION, blockingFindings, blockingSeverities, SEVERITY_DEFINITIONS, NON_SEVERITY_STATES,
    grantsExtension, evaluateRound, startRun, getRun, recordRound, LOW_RESOLUTIONS,
    acceptRun, interruptRun, resumeRun, invalidateRun
} = require('../lib/review-policy.cjs');
const { resolveProjectRoot } = require('../../hooks/lib/project-root.cjs');

test('TC-HARNESS-006: shared predicate applies round floor and never waives binary gates', () => {
    const low = { id: 'L1', severity: 'LOW', summary: 'minor clarity' };
    assert.equal(blockingFindings(1, [low]).length, 1);
    assert.equal(blockingFindings(2, [low]).length, 0);
    assert.equal(blockingFindings(3, [low]).length, 0);
    // The pure predicate stays defined beyond the budget; evaluation and
    // durable recording still reject completion or continuation there.
    assert.equal(blockingFindings(4, [low]).length, 0);
    assert.throws(() => blockingFindings(0, [low]), /round/);
    assert.equal(blockingFindings(2, [low], [{ id: 'tests', status: 'FAIL' }]).length, 1);
    assert.equal(evaluateRound({ round: 2, findings: [low] }).deferredLow.length, 1);
    assert.equal(evaluateRound({ round: 2, findings: [low] }).canComplete, true);
    assert.equal(evaluateRound({ round: 2, findings: [low], minRounds: 2 }).canComplete, true);
});

test('TC-HARNESS-044: LOW deferral is disclosed, while a scoped fix cannot bypass fresh review', () => {
    const low = { id: 'L', severity: 'LOW' };
    assert.equal(evaluateRound({ round: 1, findings: [low] }).canComplete, false);
    assert.deepEqual(LOW_RESOLUTIONS, ['deferred']);
    assert.throws(() => evaluateRound({ round: 1, findings: [{ ...low, resolution: 'scoped-fix-verified' }] }), /resolution/);
    const deferred = evaluateRound({ round: 1, findings: [{ ...low, resolution: 'deferred' }] });
    assert.equal(deferred.canComplete, true);
    assert.deepEqual(deferred.deferredLow.map(f => f.id), ['L']);
    for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'NOT VERIFIABLE']) {
        assert.throws(() => blockingFindings(1, [{ id: 'X', severity, resolution: 'deferred' }]), /only on a LOW/);
    }
});

test('TC-HARNESS-047: a post-fix target cannot claim evidence from the pre-fix full pass', t => {
    const f = fixture(t);
    startRun(f);
    recordRound({ ...f, round: 1, findings: [{ id: 'L', severity: 'LOW' }] });
    const fixed = { ...f, targetFingerprint: 'target-fixed' };
    assert.throws(() => recordRound({ ...fixed, reviewedFingerprint: f.targetFingerprint, round: 2 }), /must match/);
    assert.throws(() => acceptRun({ ...fixed, round: 1 }), /eligible|target|stale|round/i);
    recordRound({ ...fixed, reviewedFingerprint: fixed.targetFingerprint, round: 2 });
    assert.equal(acceptRun({ ...fixed, round: 2 }).acceptedRound, 2);
});

test('TC-HARNESS-006: severity definitions and round eligibility are shared and explicit', () => {
    assert.deepEqual(blockingSeverities(1), ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
    assert.deepEqual(blockingSeverities(2), ['CRITICAL', 'HIGH', 'MEDIUM']);
    assert.deepEqual(blockingSeverities(3), ['CRITICAL', 'HIGH', 'MEDIUM']);
    assert.deepEqual(blockingSeverities(4), ['CRITICAL', 'HIGH', 'MEDIUM']);
    assert.throws(() => blockingSeverities(0), /round/);
    for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
        assert.ok(SEVERITY_DEFINITIONS[severity]);
        assert.match(SEVERITY_DEFINITIONS[severity], /risk|impact|immediate|non-blocking/i);
    }
});

test('TC-HARNESS-006: explicit minimum rounds is honored within the bounded maximum', () => {
    const clean = evaluateRound({ round: 1, minRounds: 2 });
    assert.equal(clean.minimumMet, false);
    assert.equal(clean.canComplete, false);
    assert.equal(evaluateRound({ round: 2, minRounds: 2 }).canComplete, true);
    assert.throws(() => evaluateRound({ round: 1, minRounds: 4 }), /minRounds/);
});

test('TC-HARNESS-006: bounded property domain keeps predicate symmetric for all severities', () => {
    // Exhaustive finite domain: each severity × round × gate state is checked.
    for (const round of [1, 2, 3]) {
        for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
            const result = blockingFindings(round, [{ id: severity, severity }]);
            assert.equal(result.length > 0, round < 2 || severity !== 'LOW', `${round}/${severity}`);
        }
        assert.equal(blockingFindings(round, [], [{ id: 'binary', status: 'FAIL' }]).length, 1);
        assert.equal(blockingFindings(round, [], [{ id: 'binary', status: 'PASS' }]).length, 0);
    }
    assert.throws(() => evaluateRound({ round: 0 }), /round/);
    assert.throws(() => evaluateRound({ round: 1.5 }), /round/);
    assert.equal(evaluateRound({ round: 4, findings: [{ id: 'h', severity: 'HIGH' }] }).status, 'ESCALATE',
        'a review blocker past the hard cap still escalates');
});

test('TC-HARNESS-006: unresolved evidence is a blocking state, never a LOW escape hatch', () => {
    assert.deepEqual(NON_SEVERITY_STATES, ['NOT VERIFIABLE']);
    const unresolved = { id: 'evidence', severity: 'NOT VERIFIABLE', summary: 'missing runtime proof' };
    assert.equal(blockingFindings(1, [unresolved]).length, 1);
    assert.equal(blockingFindings(2, [unresolved]).length, 1);
    assert.equal(evaluateRound({ round: 2, findings: [unresolved] }).deferredLow.length, 0);
    assert.equal(evaluateRound({ round: 2, findings: [unresolved] }).canComplete, false);
});

test('TC-HARNESS-ROUND-CAP-001: every blocker gets a fixed three-round ceiling', () => {
    for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'NOT VERIFIABLE']) {
        for (const round of [1, 2, 3]) {
            const result = evaluateRound({ round, findings: [{ id: 'finding', severity }] });
            assert.equal(result.roundBudget, 3);
            assert.equal(result.extensionGranted, false);
            assert.deepEqual(result.extensionFindings, []);
            assert.equal(result.status, round < 3 ? 'CONTINUE' : 'ESCALATE');
        }
    }
    for (const round of [1, 2, 3, 4]) assert.equal(grantsExtension(round, [{ id: 'c', severity: 'CRITICAL' }]), false);
    assert.equal(evaluateRound({ round: 2, hardGates: [{ id: 'security', status: 'FAIL' }] }).status, 'CONTINUE');
    assert.equal(evaluateRound({ round: 3, hardGates: [{ id: 'security', status: 'FAIL' }] }).status, 'ESCALATE');
    assert.equal(evaluateRound({ round: 3, findings: [{ id: 'low', severity: 'LOW' }] }).status, 'PASS');
    assert.equal(evaluateRound({ round: 1, minRounds: 3 }).status, 'CONTINUE');
    assert.equal(evaluateRound({ round: 3, minRounds: 3 }).status, 'PASS');
    assert.throws(() => evaluateRound({ round: 1, minRounds: 4 }), /minRounds/);
    const red = evaluateRound({ round: 4, hardGates: [{ id: 'unit', kind: 'test', status: 'FAIL' }] });
    assert.equal(red.status, 'ESCALATE');
    assert.equal(red.testLoopContinues, false);
    assert.throws(() => evaluateRound({ round: 2, hardGates: [{ id: 'x', kind: 'flaky', status: 'FAIL' }] }), /kind/);
});

function fixture(t) {
    const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-policy-'));
    t.after(() => fs.rmSync(storeDir, { recursive: true, force: true }));
    return { storeDir, runId: 'run-1', targetFingerprint: 'target-a' };
}

test('TC-HARNESS-STATE-001: existing malformed records cannot restart or lose history', t => {
    for (const contents of ['{', 'null', 'false', '{}', ' '.repeat(1024 * 1024 + 1)]) {
        const f = fixture(t);
        startRun(f);
        recordRound({ ...f, round: 1, findings: [{ id: 'retained', severity: 'HIGH' }] });
        const file = path.join(f.storeDir, `${f.runId}.json`);
        fs.writeFileSync(file, contents);
        assert.throws(() => startRun(f), /invalid review run|already exists/i);
        assert.throws(() => getRun(f), /invalid review run/i);
        assert.equal(fs.readFileSync(file, 'utf8'), contents);
        assert.deepEqual(fs.readdirSync(f.storeDir), [`${f.runId}.json`]);
    }
});

test('TC-HARNESS-STATE-002: non-file records remain untouched and missing records may start', t => {
    const f = fixture(t);
    const file = path.join(f.storeDir, `${f.runId}.json`);
    fs.mkdirSync(file);
    assert.throws(() => startRun(f), /invalid review run/i);
    assert.equal(fs.lstatSync(file).isDirectory(), true);
    const fresh = fixture(t);
    assert.equal(startRun(fresh).roundsCompleted, 0);
    assert.throws(() => startRun(fresh), /already exists/);
});

test('TC-HARNESS-STATE-003: dangling symbolic records cannot be replaced', t => {
    const f = fixture(t);
    const file = path.join(f.storeDir, `${f.runId}.json`);
    try { fs.symlinkSync('missing-target.json', file); }
    catch (error) {
        if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) return t.skip(`symlink capability unavailable: ${error.code}`);
        throw error;
    }
    assert.throws(() => startRun(f), /invalid review run/i);
    assert.equal(fs.lstatSync(file).isSymbolicLink(), true);
    assert.equal(fs.readlinkSync(file), 'missing-target.json');
});

test('TC-HARNESS-STATE-004: unreadable metadata/content and oversized valid state fail closed', t => {
    const f = fixture(t);
    const state = startRun(f);
    const file = path.join(f.storeDir, `${f.runId}.json`);
    const original = fs.readFileSync(file, 'utf8');
    const moduleFile = path.resolve(__dirname, '../lib/review-policy.cjs');
    const source = fs.readFileSync(moduleFile, 'utf8');
    for (const operation of ['lstatSync', 'readFileSync']) {
        const facade = Object.create(fs);
        facade[operation] = (target, ...args) => {
            if (target === file) throw Object.assign(new Error('synthetic access denied'), { code: 'EACCES' });
            return fs[operation](target, ...args);
        };
        const loaded = { exports: {} };
        require('node:vm').runInNewContext(source, {
            require: name => name === 'node:fs' ? facade : require(name), module: loaded, process, Buffer
        }, { filename: moduleFile });
        assert.throws(() => loaded.exports.startRun(f), /invalid review run/i, operation);
        assert.throws(() => loaded.exports.getRun(f), /invalid review run/i, operation);
        assert.equal(fs.readFileSync(file, 'utf8'), original);
        assert.deepEqual(fs.readdirSync(f.storeDir), [`${f.runId}.json`]);
    }
    const oversized = JSON.stringify({ ...state, padding: 'x'.repeat(1024 * 1024) });
    fs.writeFileSync(file, oversized);
    assert.throws(() => getRun(f), /bounded regular file/);
    assert.throws(() => startRun(f), /bounded regular file/);
    assert.equal(fs.readFileSync(file, 'utf8'), oversized);
});

test('TC-HARNESS-006: durable transitions are idempotent and preserve interruption budget', t => {
    const f = fixture(t);
    const started = startRun({ ...f, now: 1000 });
    assert.equal(started.roundsCompleted, 0);
    const first = recordRound({ ...f, round: 1, findings: [{ id: 'x', severity: 'HIGH' }], now: 1100 });
    assert.equal(first.roundsCompleted, 1);
    const same = recordRound({ ...f, round: 1, findings: [{ id: 'x', severity: 'HIGH' }], now: 1200 });
    assert.equal(same.roundsCompleted, 1);
    assert.throws(() => recordRound({ ...f, round: 1, findings: [{ id: 'y', severity: 'LOW' }], now: 1201 }), /cannot be overwritten|Expected next/);
    const paused = interruptRun({ ...f, reason: 'host closed', now: 1300 });
    assert.equal(paused.roundsCompleted, 1);
    const resumed = resumeRun({ ...f, now: 1400 });
    assert.equal(resumed.roundsCompleted, 1);
    assert.equal(resumed.resumeCount, 1);
    const done = recordRound({ ...f, round: 2, findings: [], now: 1500 });
    assert.equal(done.status, 'ready');
    assert.throws(() => recordRound({ ...f, round: 4, findings: [], now: 1550 }), /round/);
    const accepted = acceptRun({ ...f, round: 2, now: 1600 });
    assert.equal(accepted.status, 'accepted');
    assert.equal(getRun(f).acceptedRound, 2);
});

test('TC-HARNESS-ROUND-CAP-002: durable MEDIUM/evidence runs can use round 3 but never round 4', t => {
    for (const severity of ['MEDIUM', 'NOT VERIFIABLE', 'HIGH']) {
        const f = fixture(t);
        startRun({ ...f, now: 5000 });
        recordRound({ ...f, round: 1, findings: [{ id: 'open', severity }], now: 5010 });
        const second = recordRound({ ...f, round: 2, findings: [{ id: 'open', severity }], now: 5020 });
        assert.equal(second.maxRounds, 3);
        assert.equal(second.extension, null);
        assert.equal(second.rounds[1].evaluation.status, 'CONTINUE');
        const changed = invalidateRun({ ...f, targetFingerprint: 'target-b', now: 5030 });
        assert.equal(changed.maxRounds, 3);
        assert.equal(changed.roundsCompleted, 2);
        const third = recordRound({ ...f, targetFingerprint: 'target-b', round: 3, findings: [{ id: 'open', severity }], now: 5040 });
        assert.equal(third.rounds[2].evaluation.status, 'ESCALATE');
        assert.throws(() => acceptRun({ ...f, targetFingerprint: 'target-b', round: 3, now: 5050 }), /not eligible/);
        assert.throws(() => recordRound({ ...f, targetFingerprint: 'target-b', round: 4, now: 5060 }), /budget exhausted/);
    }
});

test('TC-HARNESS-TEST-LOOP-001: failed tests exhaust the same cap and cannot silently continue', t => {
    const f = fixture(t); startRun(f);
    for (let round = 1; round <= 3; round++) {
        const state = recordRound({ ...f, round, hardGates: [{ id: 'suite', kind: 'test', status: 'FAIL' }] });
        assert.equal(state.rounds.at(-1).evaluation.status, round < 3 ? 'CONTINUE' : 'ESCALATE');
        assert.throws(() => acceptRun(f), /not eligible/);
    }
    assert.throws(() => recordRound({ ...f, round: 4 }), /budget exhausted/);
    assert.equal(evaluateRound({ round: 4 }).status, 'ESCALATE', 'a clean result cannot fabricate a fourth round');
});

test('TC-HARNESS-006: changed target invalidates evidence without resetting bounded budget', t => {
    const f = fixture(t);
    startRun({ ...f, now: 2000 });
    recordRound({ ...f, round: 1, findings: [], now: 2100 });
    const changed = invalidateRun({ ...f, targetFingerprint: 'target-b', now: 2200 });
    assert.equal(changed.targetChanged, true);
    assert.equal(changed.roundsCompleted, 1);
    assert.equal(changed.rounds[0].valid, false);
    assert.throws(() => acceptRun({ ...f, targetFingerprint: 'target-b', now: 2300 }), /not eligible/);
    const next = recordRound({ ...f, targetFingerprint: 'target-b', round: 2, findings: [], now: 2400 });
    assert.equal(next.roundsCompleted, 2);
    assert.equal(next.targetRevision, 1);
    assert.throws(() => recordRound({ ...f, targetFingerprint: 'target-b', round: 1, findings: [], now: 2500 }), /Expected next round/);
});

test('TC-HARNESS-006: round-two LOWs survive in state while hard gates block acceptance', t => {
    const f = fixture(t);
    startRun({ ...f, now: 3000 });
    recordRound({ ...f, round: 1, findings: [], now: 3010 });
    const second = recordRound({ ...f, round: 2, findings: [{ id: 'low', severity: 'LOW' }], hardGates: [{ id: 'tests', status: 'PASS' }], now: 3020 });
    assert.equal(second.status, 'ready');
    assert.equal(second.rounds[1].evaluation.deferredLow.length, 1);
    const g = fixture(t);
    startRun({ ...g, now: 3100 });
    recordRound({ ...g, round: 1, findings: [], now: 3110 });
    const blocked = recordRound({ ...g, round: 2, findings: [{ id: 'low', severity: 'LOW' }], hardGates: [{ id: 'tests', status: 'FAIL' }], now: 3120 });
    assert.equal(blocked.status, 'in_progress');
    assert.throws(() => acceptRun({ ...g, round: 2, now: 3130 }), /not eligible/);
});

test('TC-HARNESS-006: newer evidence supersedes acceptance of an earlier clean round', t => {
    for (const evidence of [
        { findings: [{ id: 'new-defect', severity: 'HIGH' }] },
        { hardGates: [{ id: 'tests', status: 'FAIL' }] },
        { findings: [] }
    ]) {
        const f = fixture(t);
        startRun(f);
        recordRound({ ...f, round: 1 });
        acceptRun({ ...f, round: 1 });
        const next = recordRound({ ...f, round: 2, ...evidence });
        assert.equal(next.acceptedRound, null, 'new evidence revokes superseded acceptance');
        assert.throws(() => acceptRun({ ...f, round: 1 }), /latest completed round/);
        if (next.status === 'ready') {
            assert.equal(acceptRun(f).acceptedRound, 2);
            assert.equal(acceptRun({ ...f, round: 2 }).acceptedRound, 2, 'retry remains idempotent');
        } else {
            assert.throws(() => acceptRun(f), /not eligible/);
        }
    }
});

test('TC-HARNESS-006: acceptance recomputes eligibility from recorded gate evidence', t => {
    const f = fixture(t);
    startRun(f);
    recordRound({ ...f, round: 1, hardGates: [{ id: 'tests', status: 'FAIL' }] });
    const file = path.join(f.storeDir, `${f.runId}.json`);
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    state.rounds[0].evaluation.canComplete = true;
    fs.writeFileSync(file, JSON.stringify(state));
    assert.throws(() => acceptRun(f), /not eligible/);
    assert.equal(getRun(f).acceptedRound, null);
});

test('TC-HARNESS-006: CLI rejects injected clocks and malformed store roots', t => {
    const f = fixture(t);
    const script = path.resolve(__dirname, '../lib/review-policy.cjs');
    const badClock = spawnSync(process.execPath, [script, 'start'], {
        input: JSON.stringify({ ...f, now: 1 }), encoding: 'utf8'
    });
    assert.equal(badClock.status, 2);
    assert.match(badClock.stderr, /real clock/);
    assert.throws(() => startRun({ ...f, storeDir: path.parse(f.storeDir).root, now: 4000 }), /filesystem root/);
});

test('TC-HARNESS-006: seeded round-reset mutant is killed', () => {
    // The mutant would treat a round-2 LOW as blocking; the shared predicate
    // must preserve the documented severity floor instead.
    const mutant = findings => findings.filter(() => true);
    assert.equal(blockingFindings(2, [{ id: 'low', severity: 'LOW' }]).length, 0);
    assert.equal(mutant([{ id: 'low', severity: 'LOW' }]).length, 1);
});

test('TC-HARNESS-PORT-014: project root resolves from nested cwd and copied bundle script path', t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'project-root-'));
    const nested = path.join(root, 'packages', 'service', 'src');
    const script = path.join(root, '.claude', 'scripts', 'entry.cjs');
    fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
    fs.mkdirSync(nested, { recursive: true });
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));

    assert.deepEqual(resolveProjectRoot({ cwd: nested, scriptPath: script, env: {} }), {
        rootDir: root,
        source: 'cwd-ancestor'
    });
    assert.deepEqual(resolveProjectRoot({ cwd: path.parse(root).root, scriptPath: script, env: {} }), {
        rootDir: root,
        source: 'script-ancestor'
    });
    assert.equal(resolveProjectRoot({ cwd: nested, env: { CLAUDE_PROJECT_DIR: root } }).source, 'env');
    const invalid = resolveProjectRoot({ cwd: nested, env: { CLAUDE_PROJECT_DIR: 'relative-root' } });
    assert.equal(invalid.source, 'invalid-env-fallback');
    assert.match(invalid.error, /absolute path/);
});

assert.equal(MAX_ROUNDS, 3);
assert.equal(HARD_MAX_ROUNDS, 3);
assert.equal(POLICY_VERSION, 7);
