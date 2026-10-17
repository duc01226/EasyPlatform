'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
    canPromoteBaseline,
    classifyBaselineComparison,
    deriveReviewStatus,
    hasExplicitAcceptance,
    validateEvidenceRecord
} = require('../lib/experience-verification.cjs');

function applicable(overrides = {}) {
    return {
        schemaVersion: 1,
        reviewId: 'review-001',
        surfaceId: 'checkout',
        mode: 'baseline',
        applicability: 'APPLICABLE',
        purpose: 'A buyer can complete checkout and see the resulting confirmation.',
        execution: { method: 'configured-runner', entryPoint: 'checkout journey', command: 'tool run checkout' },
        conditions: { platform: 'test-host', identity: 'run-001', fixture: 'valid-buyer' },
        observations: [{ id: 'obs-001', summary: 'The confirmation appeared after the final action.', evidenceRefs: ['evidence/obs-001'] }],
        judgments: [{ id: 'j-001', result: 'PASS', summary: 'The observed journey served its stated purpose.', evidenceRefs: ['evidence/obs-001'], confidence: 87 }],
        limitations: ['Only the configured happy path was exercised.'],
        ...overrides
    };
}

function accepted() {
    return applicable({ acceptance: {
        status: 'HUMAN-ACCEPTED', acceptedBy: 'owner', acceptedAt: '2026-09-07T10:00:00Z',
        intentRef: 'spec/checkout', evidenceRefs: ['evidence/obs-001'], scope: 'Checkout'
    } });
}

test('TC-EXP-009: malformed acceptance never reports human acceptance', () => {
    for (const [field, values] of Object.entries({
        acceptedBy: ['', ' owner', null], intentRef: ['', 'spec\nref'],
        evidenceRefs: [[null], [''], []], scope: ['', 'scope '], acceptedAt: ['invalid'],
        status: ['APPROVED'], residualRisk: ['']
    })) {
        for (const value of values) {
            const record = accepted();
            record.acceptance[field] = value;
            assert.equal(hasExplicitAcceptance(record), false, field);
            assert.equal(deriveReviewStatus(record), 'ACCEPTANCE-PENDING', field);
            assert.equal(validateEvidenceRecord(record).valid, false, field);
            assert.equal(canPromoteBaseline(record).allowed, false, field);
        }
    }
    assert.equal(hasExplicitAcceptance(null), false);
    assert.equal(hasExplicitAcceptance(applicable()), false);
    assert.equal(hasExplicitAcceptance(accepted()), true);
    assert.equal(deriveReviewStatus(accepted()), 'HUMAN-ACCEPTED');
});

test('TC-EXP-010: each required evidence field has a sole-invalid rejection oracle', () => {
    const cases = [
        ['execution.method', record => { delete record.execution.method; }, 'execution.method must be a bounded printable string'],
        ['judgments[0].evidenceRefs', record => { delete record.judgments[0].evidenceRefs; }, 'judgments[0].evidenceRefs must be a non-empty array with at most 32 items'],
        ['acceptance.acceptedBy', record => { delete record.acceptance.acceptedBy; }, 'acceptance.acceptedBy must be a bounded printable string']
    ];
    for (const [field, invalidate, error] of cases) {
        const record = accepted();
        assert.deepEqual(validateEvidenceRecord(record), { valid: true, errors: [], status: 'HUMAN-ACCEPTED' });
        invalidate(record);
        assert.deepEqual(validateEvidenceRecord(record), { valid: false, errors: [error], status: 'INVALID-RECORD' }, field);
        assert.equal(canPromoteBaseline(record).allowed, false, field);
    }
});

test('TC-EXP-011: real CLI dispatch preserves evidence and reports structured outcomes', t => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'experience-cli-'));
    t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
    const sentinel = path.join(cwd, 'accepted-baseline.json');
    const bytes = '{"accepted":"unchanged"}\n';
    fs.writeFileSync(sentinel, bytes);
    const run = (args, input) => spawnSync(process.execPath,
        [path.resolve(__dirname, '../lib/experience-verification.cjs'), ...args],
        { cwd, input, encoding: 'utf8', timeout: 10000, windowsHide: true });
    for (const [command, input, expected] of [
        ['compare', { baselineExists: true, comparison: 'MATCH' }, { decision: 'NO-REGRESSION', requiresAcceptance: false, action: 'retain the accepted baseline' }],
        ['promote', accepted(), { allowed: true, reasons: [], status: 'HUMAN-ACCEPTED' }],
        ['promote', applicable(), { allowed: false, reasons: ['explicit HUMAN-ACCEPTED record is required'], status: 'ACCEPTANCE-PENDING' }],
        ['validate', accepted(), { valid: true, errors: [], status: 'HUMAN-ACCEPTED' }]
    ]) {
        const result = run([command], JSON.stringify(input));
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stderr, '');
        assert.deepEqual(JSON.parse(result.stdout), expected);
        assert.equal(result.stdout, `${JSON.stringify(expected)}\n`);
    }
    for (const [args, input, diagnostic] of [
        [['validate'], '{', /Experience verification failed:/],
        [['unknown'], '{}', /Use validate\|promote\|compare/],
        [['compare', 'extra'], '{}', /Use validate\|promote\|compare/],
        [['compare'], '{}', /baselineExists must be boolean/]
    ]) {
        const result = run(args, input);
        assert.ifError(result.error);
        assert.equal(result.status, 2);
        assert.equal(result.stdout, '');
        assert.match(result.stderr, diagnostic);
    }
    assert.deepEqual(fs.readdirSync(cwd), ['accepted-baseline.json']);
    assert.equal(fs.readFileSync(sentinel, 'utf8'), bytes);
});

test('TC-EXP-001: observed and judged evidence remains acceptance-pending', () => {
    const record = applicable();
    assert.equal(validateEvidenceRecord(record).valid, true);
    assert.equal(deriveReviewStatus(record), 'ACCEPTANCE-PENDING');
    assert.equal(canPromoteBaseline(record).allowed, false);
});

test('TC-EXP-002: a screenshot or boolean cannot impersonate human acceptance', () => {
    const record = applicable({ acceptance: { accepted: true, evidenceRefs: ['evidence/obs-001'] } });
    const result = validateEvidenceRecord(record);
    assert.equal(result.valid, false);
    assert.match(result.errors.join('\n'), /acceptance\.status/);
});

test('TC-EXP-003: explicit acceptance permits a passing baseline', () => {
    const record = applicable({
        acceptance: {
            status: 'HUMAN-ACCEPTED',
            acceptedBy: 'product-owner',
            acceptedAt: '2026-09-07T10:00:00Z',
            intentRef: 'spec/checkout#confirmation',
            evidenceRefs: ['evidence/obs-001'],
            scope: 'Happy-path checkout confirmation'
        }
    });
    assert.equal(validateEvidenceRecord(record).valid, true);
    assert.equal(deriveReviewStatus(record), 'HUMAN-ACCEPTED');
    assert.deepEqual(canPromoteBaseline(record), { allowed: true, reasons: [], status: 'HUMAN-ACCEPTED' });
});

test('TC-EXP-004: non-applicable and blocked surfaces require a reason and evidence', () => {
    const notApplicable = applicable({ applicability: 'NOT-APPLICABLE', reason: 'This project has no user-facing surface.', evidenceRefs: ['config/project.json'], execution: undefined, conditions: undefined, observations: [], judgments: [] });
    const blocked = applicable({ applicability: 'ENVIRONMENT-BLOCKED', reason: 'The required device is unavailable.', evidenceRefs: ['runner/log.txt'], execution: undefined, conditions: undefined, observations: [], judgments: [] });
    assert.equal(validateEvidenceRecord(notApplicable).status, 'NOT-APPLICABLE');
    assert.equal(validateEvidenceRecord(blocked).status, 'ENVIRONMENT-BLOCKED');
    assert.equal(canPromoteBaseline(blocked).allowed, false);
});

test('TC-EXP-005: missing observation is unverified rather than successful', () => {
    const record = applicable({ observations: [] });
    const result = validateEvidenceRecord(record);
    assert.equal(result.valid, false);
    assert.equal(result.status, 'INVALID-RECORD');
    assert.equal(deriveReviewStatus({ ...record, observations: [] }), 'UNVERIFIED');
});

test('TC-EXP-004: optional judgments on non-applicable records never crash promotion', () => {
    for (const applicability of ['NOT-APPLICABLE', 'ENVIRONMENT-BLOCKED']) {
        const record = applicable({ applicability, reason: 'No observable surface is available.',
            evidenceRefs: ['config/project.json'], observations: undefined, judgments: undefined });
        assert.equal(validateEvidenceRecord(record).valid, true);
        const result = canPromoteBaseline(record);
        assert.equal(result.allowed, false);
        assert.equal(result.status, applicability);
        assert.ok(result.reasons.includes('only an applicable surface can promote a baseline'));
    }
});

test('TC-EXP-005: malformed judgments produce structured invalid evidence, never acceptance', () => {
    for (const judgment of [null, false, 'PASS', [], {}, { result: 'UNKNOWN' }]) {
        for (const acceptance of [undefined, {
            status: 'HUMAN-ACCEPTED', acceptedBy: 'owner', acceptedAt: '2026-09-07T10:00:00Z',
            intentRef: 'spec/checkout', evidenceRefs: ['evidence/obs-001'], scope: 'Checkout'
        }]) {
            const record = applicable({ judgments: [judgment], acceptance });
            const validation = validateEvidenceRecord(record);
            assert.equal(validation.valid, false);
            assert.equal(validation.status, 'INVALID-RECORD');
            assert.ok(validation.errors.some(error => error.startsWith('judgments[0]')));
            assert.equal(deriveReviewStatus(record), 'INVALID-RECORD');
            assert.equal(canPromoteBaseline(record).allowed, false);
        }
    }
});

test('TC-EXP-006: known-invalid conditions cannot establish a clean or candidate baseline', () => {
    for (const comparison of ['MATCH', 'DIFFERENCE', 'INCOMPARABLE']) {
        for (const baselineExists of [true, false]) {
            const result = classifyBaselineComparison({ baselineExists, comparison, testCondition: 'INVALID' });
            assert.equal(result.decision, 'TEST-CONDITION-INVALID');
            assert.equal(result.requiresAcceptance, false);
        }
    }
    assert.equal(classifyBaselineComparison({ baselineExists: true, comparison: 'MATCH', testCondition: 'VALID' }).decision, 'NO-REGRESSION');
    for (const baselineExists of [true, false]) {
        for (const reviewStatus of ['ENVIRONMENT-BLOCKED', 'UNVERIFIED', 'NOT-APPLICABLE', 'INVALID-RECORD']) {
            assert.equal(classifyBaselineComparison({ baselineExists, comparison: 'MATCH', testCondition: 'INVALID', reviewStatus }).decision,
                reviewStatus === 'INVALID-RECORD' ? 'UNVERIFIED' : reviewStatus);
        }
        for (const environmentBlocked of [true, false]) {
            assert.equal(classifyBaselineComparison({ baselineExists, comparison: 'NOT-RUN', testCondition: 'INVALID', environmentBlocked }).decision,
                environmentBlocked ? 'ENVIRONMENT-BLOCKED' : 'UNVERIFIED');
        }
    }
});

test('TC-EXP-006: comparison decisions preserve expectations and require deliberate change acceptance', () => {
    assert.equal(classifyBaselineComparison({ baselineExists: false }).decision, 'CANDIDATE-BASELINE-PENDING-ACCEPTANCE');
    assert.equal(classifyBaselineComparison({ baselineExists: false, reviewStatus: 'NOT-APPLICABLE' }).decision, 'NOT-APPLICABLE');
    assert.equal(classifyBaselineComparison({ baselineExists: true, reviewStatus: 'INVALID-RECORD' }).decision, 'UNVERIFIED');
    assert.equal(classifyBaselineComparison({ baselineExists: true, comparison: 'DIFFERENCE', intent: 'UNCHANGED' }).decision, 'POTENTIAL-REGRESSION');
    assert.equal(classifyBaselineComparison({ baselineExists: true, comparison: 'DIFFERENCE', intent: 'INTENDED' }).decision, 'INTENDED-CHANGE-PENDING-ACCEPTANCE');
    assert.equal(classifyBaselineComparison({ baselineExists: true, comparison: 'DIFFERENCE', testCondition: 'INVALID' }).decision, 'TEST-CONDITION-INVALID');
    assert.equal(classifyBaselineComparison({ baselineExists: true, comparison: 'NOT-RUN', environmentBlocked: true }).decision, 'ENVIRONMENT-BLOCKED');
});

test('TC-EXP-007: a non-pass judgment cannot promote a full expected baseline', () => {
    const record = applicable({
        judgments: [{ id: 'j-001', result: 'PARTIAL', summary: 'Offline recovery was not verified.', evidenceRefs: ['evidence/obs-001'] }],
        acceptance: {
            status: 'HUMAN-ACCEPTED',
            acceptedBy: 'owner',
            acceptedAt: '2026-09-07T10:00:00Z',
            intentRef: 'spec/checkout#confirmation',
            evidenceRefs: ['evidence/obs-001'],
            scope: 'Happy-path confirmation only',
            residualRisk: 'Offline recovery remains unverified.'
        }
    });
    assert.equal(validateEvidenceRecord(record).valid, true);
    assert.equal(canPromoteBaseline(record).allowed, false);
});

test('TC-EXP-008: explicit acceptance must state the accepted scope', () => {
    const record = applicable({
        acceptance: {
            status: 'HUMAN-ACCEPTED',
            acceptedBy: 'owner',
            acceptedAt: '2026-09-07T10:00:00Z',
            intentRef: 'spec/checkout#confirmation',
            evidenceRefs: ['evidence/obs-001']
        }
    });
    const result = validateEvidenceRecord(record);
    assert.equal(result.valid, false);
    assert.match(result.errors.join('\n'), /acceptance\.scope/);
    assert.equal(deriveReviewStatus(record), 'ACCEPTANCE-PENDING');
});
