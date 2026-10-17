import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { checkReportEvidence } = require('../../lib/review-report-evidence.cjs');
const claude = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function fixture(run) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'report-evidence-'));
    try {
        fs.writeFileSync(path.join(root, 'report.md'), '# Inspected review report\n');
        const evidence = {
            occurrence: { id: 'r1', skill: 'knowledge-review' },
            satisfiedBy: ['knowledge-review'],
            report: { path: 'report.md', finalStatus: 'APPROVED', reviewedAt: '2026-01-02T12:00:00Z' },
            lastChangedAt: '2026-01-02T11:00:00Z'
        };
        return run(root, evidence);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

test('TC-GWF-042 report acceptance: accepted current report passes, rejected verdicts never do', () => fixture((root, input) => {
    assert.equal(checkReportEvidence(input, root).status, 'PASS');
    for (const verdict of ['FAIL', 'REVISE', 'BLOCKED', 'IN PROGRESS', '', undefined]) {
        const bad = structuredClone(input);
        bad.report.finalStatus = verdict;
        assert.equal(checkReportEvidence(bad, root).status, 'BLOCKED', String(verdict));
    }
}));

test('TC-GWF-042 report acceptance: stale, unknown and mismatched targets block', () => fixture((root, input) => {
    for (const time of ['2026-01-02T10:59:59Z', undefined, 'not-a-date', '2026-01-02T12:00:00']) {
        const bad = structuredClone(input);
        bad.report.reviewedAt = time;
        assert.equal(checkReportEvidence(bad, root).status, 'BLOCKED');
    }
    input.report.reviewedAt = input.lastChangedAt;
    assert.equal(checkReportEvidence(input, root).status, 'PASS', 'same inspected target boundary can pass');
    input.report.targetFingerprint = 'old';
    input.currentTargetFingerprint = 'new';
    assert.equal(checkReportEvidence(input, root).status, 'BLOCKED');
    input.currentTargetFingerprint = 'old';
    assert.equal(checkReportEvidence(input, root).status, 'PASS');
    delete input.lastChangedAt;
    assert.equal(checkReportEvidence(input, root).status, 'BLOCKED');
}));

test('TC-GWF-042 report acceptance: missing reports and non-satisfying occurrences cannot substitute', () => fixture((root, input) => {
    input.satisfiedBy = ['work-item --mode=review'];
    assert.equal(checkReportEvidence(input, root).status, 'BLOCKED');
    input.satisfiedBy = ['knowledge-review'];
    input.report.path = 'absent.md';
    assert.equal(checkReportEvidence(input, root).status, 'BLOCKED');
    input.report.path = '.';
    assert.equal(checkReportEvidence(input, root).status, 'BLOCKED');
}));

test('TC-GWF-042 diagnostic completion: accepted complete diagnostics do not assert target PASS', () => fixture((root, input) => {
    input.occurrence.skill = 'architecture --mode=full';
    input.satisfiedBy = ['architecture --mode=full'];
    Object.assign(input.report, { finalStatus: 'FINISHED', validationStatus: 'PASS', facesMerged: 3, targetVerdict: 'FAIL' });
    assert.equal(checkReportEvidence(input, root).status, 'PASS');
    assert.equal(input.report.targetVerdict, 'FAIL');
    for (const changes of [{ facesMerged: 2 }, { validationStatus: 'FAIL' }, { finalStatus: 'IN PROGRESS' }, { reviewedAt: '2026-01-01T12:00:00Z' }]) {
        const bad = structuredClone(input);
        Object.assign(bad.report, changes);
        assert.equal(checkReportEvidence(bad, root).status, 'BLOCKED');
    }
    input.occurrence.skill = 'knowledge-review';
    input.satisfiedBy = ['knowledge-review'];
    assert.equal(checkReportEvidence(input, root).status, 'BLOCKED', 'implementation cannot opt into diagnostic completion');
}));

test('TC-GWF-042 report acceptance: process status reflects failed evidence and bounded invalid input', () => fixture((root, input) => {
    const env = {};
    for (const key of ['PATH', 'SystemRoot', 'WINDIR']) if (process.env[key]) env[key] = process.env[key];
    Object.assign(env, { HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root });
    const invoke = text => spawnSync(process.execPath, [path.join(claude, 'scripts/lib/review-report-evidence.cjs')], {
        cwd: root, env, input: text, encoding: 'utf8', timeout: 10000
    });
    assert.equal(invoke(JSON.stringify(input)).status, 0);
    input.report.finalStatus = 'REVISE';
    const blocked = invoke(JSON.stringify(input));
    assert.equal(blocked.status, 1);
    assert.equal(JSON.parse(blocked.stdout).status, 'BLOCKED');
    for (const invalid of ['{', 'x'.repeat(65537)]) {
        const error = invoke(invalid);
        assert.equal(error.status, 2);
        assert.equal(JSON.parse(error.stdout).status, 'ERROR');
    }
}));

test('TC-GWF-042 instructions enforce the same fallback on every host and preserve receipt authority', () => {
    const source = process.env.CK_SKILL_REPAIRS_SOURCE_ROOT || claude;
    const text = fs.readFileSync(path.join(source, 'skills/workflow-end/SKILL.md'), 'utf8');
    assert.match(text, /a not-converged verdict, stale report, mismatched target or unknown freshness \*\*blocks the close\*\*/);
    assert.match(text, /manually enforce the SAME verdict, coverage, provenance, target and freshness predicates/);
    assert.match(text, /a commit still needs the receipt/);
    assert.doesNotMatch(text, /never block or ask when a report is cited/);
});
