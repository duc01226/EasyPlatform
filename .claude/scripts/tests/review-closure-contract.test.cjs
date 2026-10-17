'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const policy = require('../lib/review-policy.cjs');
const baseline = require('../lib/workflow-baseline.cjs');
const { spawnSync } = require('node:child_process');
// A skill's contract is its SKILL.md plus every `references/*.md` (sorted), read as one text: a mode
// section moved to a point-of-use reference is still the skill's contract, so every pinned phrase
// must hold wherever it lives. `readSkillParts` keeps the files apart for position-aware checks.
function readSkillParts(name) {
    const dir = path.resolve(__dirname, '../../skills', name);
    const parts = [['SKILL.md', fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8')]];
    const refs = path.join(dir, 'references');
    if (fs.existsSync(refs)) {
        for (const file of fs.readdirSync(refs).filter(entry => entry.endsWith('.md')).sort()) {
            parts.push([`references/${file}`, fs.readFileSync(path.join(refs, file), 'utf8')]);
        }
    }
    return parts;
}
const joinParts = parts => parts.map(([, text]) => text).join('\n');
const readSkill = name => joinParts(readSkillParts(name));
const whyParts = readSkillParts('why-review');
const why = joinParts(whyParts);
const workflow = readSkill('workflow-review-changes');
const local = text => text.replace(/<!-- SYNC:([^\s>]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, '');
const FIX_LOOP_BLOCK = /<!-- FIX-LOOP-MODE:START -->[\s\S]*?<!-- FIX-LOOP-MODE:END -->/g;
// The opt-in `--fix-loop` mode legitimately owns target clearance (it is the fixing caller), so
// the report-only closure contract binds every DEFAULT-mode carrier outside its delimited blocks.
// assertFixLoopMode pins that those blocks stay few, flagged, and confined to the mode.
const defaultMode = text => local(text).replace(FIX_LOOP_BLOCK, '');

// Intent: report validation never clears a retained target defect; interruptions preserve spent rounds.
function assertReportClosure(text) {
    assert.match(text, /Terminal validation/);
    assert.match(text, /review-only|report-only/i);
    assert.match(text, /validated findings/);
}
function assertDurableBudget(text) {
    assert.match(local(text), /Default maximum two rounds/i);
    assert.match(local(text), /At two rounds,[\s\S]*?require the host question tool/);
    assert.match(text, /completed-round evidence/);
    assert.match(text, /remaining MEDIUM|Remaining MEDIUM/);
    assert.match(local(text), /Wait for an explicit answer before further fixes or review rounds/);
    assert.doesNotMatch(text, /conversation context only|starts fresh at round 0/);
}
test('R2-14/15: report handoff and workflow two-round cap survive newline dialects', () => {
    for (const text of [why, why.replace(/\r?\n/g, '\r\n')]) assertReportClosure(text);
    for (const text of [workflow, workflow.replace(/\r?\n/g, '\r\n')]) assertDurableBudget(text);
});

test('R2-15: CLEAN report with a retained HIGH hands off without clearing the outer target', () => {
    assertReportClosure(why);
    const findings = [{ id: 'supported-path', severity: 'HIGH', summary: 'validated defect' }];
    for (const round of [1, 2, 3]) {
        assert.equal(policy.evaluateRound({ round, findings }).canComplete, false);
        assert.equal(policy.blockingFindings(round, findings).length, 1);
    }
    // The generic policy allows round 3; the workflow's stricter cap requires user approval first.
    assert.equal(policy.evaluateRound({ round: 2, findings }).status, 'CONTINUE');
    assert.equal(policy.evaluateRound({ round: 3, findings }).status, 'ESCALATE');
    assert.equal(policy.evaluateRound({ round: 4, findings }).status, 'ESCALATE');
    assert.equal(policy.evaluateRound({ round: 2, findings: [{ id: 'polish', severity: 'LOW' }] }).canComplete, true);
    assert.equal(policy.evaluateRound({ round: 2, hardGates: [{ id: 'coverage', status: 'FAIL' }] }).canComplete, false);
});

test('R2-14: interruption and target revision retain spent rounds and reject stale acceptance', t => {
    assertDurableBudget(workflow);
    const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-closure-'));
    t.after(() => fs.rmSync(storeDir, { recursive: true, force: true }));
    const run = { storeDir, runId: 'resume', targetFingerprint: 'before' };
    policy.startRun(run);
    policy.recordRound({ ...run, round: 1, findings: [{ id: 'fix', severity: 'HIGH' }] });
    policy.interruptRun({ ...run, reason: 'context interruption' });
    assert.equal(policy.resumeRun(run).roundsCompleted, 1);
    const changed = { ...run, targetFingerprint: 'after' };
    assert.equal(policy.invalidateRun(changed).roundsCompleted, 1);
    assert.throws(() => policy.acceptRun({ ...changed, round: 1 }));
    assert.equal(policy.recordRound({ ...changed, round: 2, findings: [] }).roundsCompleted, 2);
    assert.equal(policy.acceptRun({ ...changed, round: 2 }).acceptedRound, 2);
});

function closureFixture(t) {
    // Resolve the OS temp root (macOS: /var -> /private/var): a supplied store beneath a link is refused by design.
    const fixtureDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'owned-run-closure-')));
    t.after(() => fs.rmSync(fixtureDir, { recursive: true, force: true }));
    const rootDir = path.join(fixtureDir, 'project');
    const storeDir = path.join(fixtureDir, 'private-store');
    fs.mkdirSync(rootDir);
    // Git availability is not required for exact run cleanup; no real repository
    // or shared default store participates in this lifecycle fixture.
    for (const runId of ['parent', 'sibling']) baseline.captureBaseline({ rootDir, storeDir, runId });
    baseline.captureBaseline({ rootDir, storeDir, runId: 'child', parentRunId: 'parent' });
    const retained = ['parent', 'sibling'].map(runId => ({
        file: path.join(storeDir, runId, 'baseline.json'),
        bytes: fs.readFileSync(path.join(storeDir, runId, 'baseline.json')),
    }));
    const close = () => spawnSync(process.execPath, [path.resolve(__dirname, '../lib/workflow-baseline.cjs'), 'close'], {
        input: JSON.stringify({ rootDir, storeDir, runId: 'child' }), encoding: 'utf8', windowsHide: true,
        timeout: 10000, env: { ...process.env, CLAUDE_PROJECT_DIR: rootDir },
    });
    return { rootDir, storeDir, retained, close };
}

test('R3-41: exact child close removes only its record and preserves parent/sibling bytes', t => {
    const fx = closureFixture(t);
    const result = fx.close();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(JSON.parse(result.stdout), { runId: 'child', closed: true, deletionFailures: [] });
    assert.equal(fs.existsSync(path.join(fx.storeDir, 'child')), false);
    for (const retained of fx.retained) assert.deepEqual(fs.readFileSync(retained.file), retained.bytes);
    assert.equal(fs.existsSync(fx.rootDir), true);
});

test('R3-41: zero-exit close with deletion failures is not successful closure', t => {
    const fx = closureFixture(t);
    const extra = path.join(fx.storeDir, 'child', 'unrecorded.txt');
    fs.writeFileSync(extra, 'MUST_NOT_BE_BROADLY_DELETED');
    const result = fx.close();
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.runId, 'child');
    assert.equal(output.closed, false);
    assert.ok(output.deletionFailures.some(failure => failure.label === 'run-directory'));
    assert.equal(fs.readFileSync(extra, 'utf8'), 'MUST_NOT_BE_BROADLY_DELETED');
    for (const retained of fx.retained) assert.deepEqual(fs.readFileSync(retained.file), retained.bytes);
});
