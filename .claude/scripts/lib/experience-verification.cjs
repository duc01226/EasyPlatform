'use strict';

/**
 * Portable experience-review evidence and expectation-transition contract.
 *
 * This module validates records and classifies baseline comparisons. It never
 * launches an application, reads a screenshot, updates a test, or infers
 * human approval. Those are agent/human activities whose evidence is supplied
 * to this deterministic boundary.
 */

const SCHEMA_VERSION = 1;
const APPLICABILITY = Object.freeze(['APPLICABLE', 'NOT-APPLICABLE', 'ENVIRONMENT-BLOCKED']);
const REVIEW_MODES = Object.freeze(['review', 'baseline', 'regression']);
const REVIEW_STATUSES = Object.freeze([
    'OBSERVED',
    'JUDGED',
    'HUMAN-ACCEPTED',
    'UNVERIFIED',
    'ENVIRONMENT-BLOCKED',
    'NOT-APPLICABLE',
    'ACCEPTANCE-PENDING',
    'INVALID-RECORD'
]);
const JUDGMENT_RESULTS = Object.freeze(['PASS', 'FAIL', 'PARTIAL', 'NOT-VERIFIABLE']);
const ACCEPTANCE_STATUS = 'HUMAN-ACCEPTED';
const COMPARISON_DECISIONS = Object.freeze([
    'NO-REGRESSION',
    'POTENTIAL-REGRESSION',
    'INTENDED-CHANGE-PENDING-ACCEPTANCE',
    'CANDIDATE-BASELINE-PENDING-ACCEPTANCE',
    'NOT-APPLICABLE',
    'TEST-CONDITION-INVALID',
    'ENVIRONMENT-BLOCKED',
    'UNVERIFIED',
    'AMBIGUOUS'
]);

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function text(value, field, errors, max = 1024) {
    if (typeof value !== 'string' || value.length === 0 || value.length > max ||
        value.trim() !== value || /[\x00-\x1f\x7f]/.test(value)) {
        errors.push(`${field} must be a bounded printable string`);
        return false;
    }
    return true;
}

function stringArray(value, field, errors, maxItems = 32) {
    if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) {
        errors.push(`${field} must be a non-empty array with at most ${maxItems} items`);
        return false;
    }
    value.forEach((item, index) => text(item, `${field}[${index}]`, errors, 2048));
    return true;
}

function optionalString(value, field, errors, max = 1024) {
    if (value !== undefined) text(value, field, errors, max);
}

function validateExecution(record, errors) {
    if (!isObject(record.execution)) {
        errors.push('execution must be an object for an applicable surface');
        return;
    }
    text(record.execution.method, 'execution.method', errors, 256);
    text(record.execution.entryPoint, 'execution.entryPoint', errors, 2048);
    optionalString(record.execution.command, 'execution.command', errors, 4096);
    optionalString(record.execution.tool, 'execution.tool', errors, 256);
}

function validateConditions(record, errors) {
    if (!isObject(record.conditions)) {
        errors.push('conditions must be an object for an applicable surface');
        return;
    }
    text(record.conditions.platform, 'conditions.platform', errors, 256);
    text(record.conditions.identity, 'conditions.identity', errors, 512);
    optionalString(record.conditions.fixture, 'conditions.fixture', errors, 2048);
    optionalString(record.conditions.viewport, 'conditions.viewport', errors, 256);
    optionalString(record.conditions.locale, 'conditions.locale', errors, 128);
    optionalString(record.conditions.network, 'conditions.network', errors, 256);
}

function validateObservations(value, errors) {
    if (!Array.isArray(value) || value.length === 0) {
        errors.push('observations must contain at least one directly observed result');
        return;
    }
    value.forEach((observation, index) => {
        const field = `observations[${index}]`;
        if (!isObject(observation)) {
            errors.push(`${field} must be an object`);
            return;
        }
        text(observation.id, `${field}.id`, errors, 128);
        text(observation.summary, `${field}.summary`, errors, 4096);
        stringArray(observation.evidenceRefs, `${field}.evidenceRefs`, errors);
        optionalString(observation.target, `${field}.target`, errors, 1024);
    });
}

function validateJudgments(value, errors) {
    if (!Array.isArray(value) || value.length === 0) {
        errors.push('judgments must contain an evidence-backed agent judgment');
        return;
    }
    value.forEach((judgment, index) => {
        const field = `judgments[${index}]`;
        if (!isObject(judgment)) {
            errors.push(`${field} must be an object`);
            return;
        }
        text(judgment.id, `${field}.id`, errors, 128);
        if (!JUDGMENT_RESULTS.includes(judgment.result)) {
            errors.push(`${field}.result must be PASS/FAIL/PARTIAL/NOT-VERIFIABLE`);
        }
        text(judgment.summary, `${field}.summary`, errors, 4096);
        stringArray(judgment.evidenceRefs, `${field}.evidenceRefs`, errors);
        if (judgment.confidence !== undefined &&
            (!Number.isFinite(judgment.confidence) || judgment.confidence < 0 || judgment.confidence > 100)) {
            errors.push(`${field}.confidence must be a number from 0 to 100; confidence is not acceptance`);
        }
    });
}

function validTimestamp(value) {
    return typeof value === 'string' && value.length > 0 && value.trim() === value &&
        !/[\x00-\x1f\x7f]/.test(value) && Number.isFinite(Date.parse(value));
}

function validateAcceptance(acceptance, record, errors) {
    if (!isObject(acceptance)) {
        errors.push('acceptance must be an object');
        return;
    }
    if (acceptance.status !== ACCEPTANCE_STATUS) {
        errors.push('acceptance.status must be HUMAN-ACCEPTED; approval cannot be inferred from a boolean or screenshot');
    }
    text(acceptance.acceptedBy, 'acceptance.acceptedBy', errors, 512);
    if (!validTimestamp(acceptance.acceptedAt)) {
        errors.push('acceptance.acceptedAt must be a valid timestamp');
    }
    text(acceptance.intentRef, 'acceptance.intentRef', errors, 2048);
    stringArray(acceptance.evidenceRefs, 'acceptance.evidenceRefs', errors);
    text(acceptance.scope, 'acceptance.scope', errors, 4096);
    optionalString(acceptance.residualRisk, 'acceptance.residualRisk', errors, 4096);

    const nonPass = Array.isArray(record.judgments) && record.judgments.some(judgment => isObject(judgment) && judgment.result !== 'PASS');
    if (nonPass && (!acceptance.scope || !acceptance.residualRisk)) {
        errors.push('acceptance.scope and acceptance.residualRisk are required when any judgment is not PASS');
    }
}

/**
 * Validate one review record. A valid record still describes evidence only;
 * `HUMAN-ACCEPTED` requires the explicit acceptance object below.
 */
function validateEvidenceRecord(record) {
    const errors = [];
    if (!isObject(record)) {
        return { valid: false, errors: ['record must be an object'], status: 'INVALID-RECORD' };
    }
    if (record.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must be ${SCHEMA_VERSION}`);
    text(record.reviewId, 'reviewId', errors, 256);
    text(record.surfaceId, 'surfaceId', errors, 256);
    if (!REVIEW_MODES.includes(record.mode)) errors.push('mode must be review/baseline/regression');
    if (!APPLICABILITY.includes(record.applicability)) {
        errors.push('applicability must be APPLICABLE/NOT-APPLICABLE/ENVIRONMENT-BLOCKED');
    }
    text(record.purpose, 'purpose', errors, 4096);

    if (record.applicability === 'APPLICABLE') {
        validateExecution(record, errors);
        validateConditions(record, errors);
        validateObservations(record.observations, errors);
        validateJudgments(record.judgments, errors);
    } else {
        text(record.reason, 'reason', errors, 4096);
        stringArray(record.evidenceRefs, 'evidenceRefs', errors);
        if (record.observations !== undefined && (!Array.isArray(record.observations) || record.observations.length > 0)) {
            errors.push('non-applicable or blocked records cannot claim observations');
        }
        if (record.judgments !== undefined && (!Array.isArray(record.judgments) || record.judgments.length > 0)) {
            errors.push('non-applicable or blocked records cannot claim judgments');
        }
    }

    if (record.limitations !== undefined) stringArray(record.limitations, 'limitations', errors, 64);
    if (record.acceptance !== undefined) validateAcceptance(record.acceptance, record, errors);

    const valid = errors.length === 0;
    return { valid, errors, status: valid ? deriveReviewStatus(record) : 'INVALID-RECORD' };
}

function hasExplicitAcceptance(record) {
    const acceptance = record?.acceptance;
    if (!isObject(acceptance)) return false;
    const errors = [];
    validateAcceptance(acceptance, record, errors);
    return errors.length === 0;
}

function deriveReviewStatus(record) {
    if (!isObject(record)) return 'INVALID-RECORD';
    if (record.applicability === 'NOT-APPLICABLE') return 'NOT-APPLICABLE';
    if (record.applicability === 'ENVIRONMENT-BLOCKED') return 'ENVIRONMENT-BLOCKED';
    if (record.applicability !== 'APPLICABLE') return 'INVALID-RECORD';
    if (!Array.isArray(record.observations) || record.observations.length === 0) return 'UNVERIFIED';
    if (!Array.isArray(record.judgments) || record.judgments.length === 0) return 'OBSERVED';
    const judgmentErrors = [];
    validateJudgments(record.judgments, judgmentErrors);
    if (judgmentErrors.length > 0) return 'INVALID-RECORD';
    if (record.judgments.some(judgment => judgment.result === 'NOT-VERIFIABLE')) return 'UNVERIFIED';
    if (hasExplicitAcceptance(record)) return 'HUMAN-ACCEPTED';
    return 'ACCEPTANCE-PENDING';
}

/**
 * Return whether evidence may become a durable expected baseline. This is a
 * predicate only; it never writes or replaces a baseline file.
 */
function canPromoteBaseline(record) {
    const validation = validateEvidenceRecord(record);
    const reasons = [...validation.errors];
    if (validation.valid && record.applicability !== 'APPLICABLE') {
        return { allowed: false, reasons: ['only an applicable surface can promote a baseline'], status: validation.status };
    }
    if (validation.valid && !hasExplicitAcceptance(record)) reasons.push('explicit HUMAN-ACCEPTED record is required');
    if (validation.valid && record.judgments.some(judgment => judgment.result !== 'PASS')) {
        reasons.push('all judgments must be PASS before a full expected baseline is promoted');
    }
    return { allowed: reasons.length === 0, reasons, status: validation.status };
}

function normalizeChoice(value, allowed, field) {
    if (typeof value !== 'string' || !allowed.includes(value)) throw new Error(`${field} must be ${allowed.join('/')}`);
    return value;
}

/**
 * Classify a comparison without deciding that a mismatch is acceptable.
 * Existing evidence is retained for every decision except an explicit caller
 * action outside this module after HUMAN-ACCEPTED approval.
 */
function classifyBaselineComparison(input = {}) {
    if (!isObject(input)) throw new Error('comparison input must be an object');
    if (typeof input.baselineExists !== 'boolean') throw new Error('baselineExists must be boolean');

    if (input.reviewStatus === 'ENVIRONMENT-BLOCKED') {
        return { decision: 'ENVIRONMENT-BLOCKED', requiresAcceptance: false, action: 'preserve existing evidence and report the blocked capability' };
    }
    if (input.reviewStatus === 'UNVERIFIED') {
        return { decision: 'UNVERIFIED', requiresAcceptance: false, action: 'collect the missing evidence; do not change expectations' };
    }
    if (input.reviewStatus === 'NOT-APPLICABLE') {
        return { decision: 'NOT-APPLICABLE', requiresAcceptance: false, action: 'retain any unrelated accepted evidence and do not create or change a baseline for this surface' };
    }
    if (input.reviewStatus === 'INVALID-RECORD') {
        return { decision: 'UNVERIFIED', requiresAcceptance: false, action: 'repair the invalid record and collect the required evidence; do not change expectations' };
    }
    const comparison = input.baselineExists ?
        normalizeChoice(input.comparison, ['MATCH', 'DIFFERENCE', 'NOT-RUN', 'INCOMPARABLE'], 'comparison') : input.comparison;
    if (comparison === 'NOT-RUN') {
        return { decision: input.environmentBlocked ? 'ENVIRONMENT-BLOCKED' : 'UNVERIFIED', requiresAcceptance: false,
            action: 'preserve the accepted baseline and report why comparison did not run' };
    }
    if (input.testCondition === 'INVALID') {
        return { decision: 'TEST-CONDITION-INVALID', requiresAcceptance: false, action: 'repair the test condition and rerun; do not update the baseline' };
    }
    if (!input.baselineExists) {
        return { decision: 'CANDIDATE-BASELINE-PENDING-ACCEPTANCE', requiresAcceptance: true, action: 'retain candidate evidence until a human/owner accepts it' };
    }
    if (comparison === 'MATCH') return { decision: 'NO-REGRESSION', requiresAcceptance: false, action: 'retain the accepted baseline' };
    if (comparison === 'INCOMPARABLE') {
        return { decision: 'AMBIGUOUS', requiresAcceptance: false, action: 'resolve conditions or intent before changing expectations' };
    }
    if (input.intent === 'INTENDED') {
        return { decision: 'INTENDED-CHANGE-PENDING-ACCEPTANCE', requiresAcceptance: true,
            action: 'review the changed experience and obtain explicit acceptance before promotion' };
    }
    if (input.intent === 'UNCHANGED') {
        return { decision: 'POTENTIAL-REGRESSION', requiresAcceptance: false,
            action: 'investigate source, test, and environment; keep the accepted baseline' };
    }
    return { decision: 'AMBIGUOUS', requiresAcceptance: false, action: 'resolve intent and evidence before changing expectations' };
}

function runCli() {
    try {
        const command = process.argv[2];
        if (process.argv.length !== 3 || !['validate', 'promote', 'compare'].includes(command)) {
            throw new Error('Use validate|promote|compare with a JSON object on stdin');
        }
        const input = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
        const result = command === 'validate' ? validateEvidenceRecord(input) :
            command === 'promote' ? canPromoteBaseline(input) : classifyBaselineComparison(input);
        process.stdout.write(`${JSON.stringify(result)}\n`);
        process.exitCode = 0;
    } catch (error) {
        process.stderr.write(`Experience verification failed: ${error.message}\n`);
        process.exitCode = 2;
    }
}

module.exports = {
    SCHEMA_VERSION,
    APPLICABILITY,
    REVIEW_MODES,
    REVIEW_STATUSES,
    JUDGMENT_RESULTS,
    ACCEPTANCE_STATUS,
    COMPARISON_DECISIONS,
    validateEvidenceRecord,
    deriveReviewStatus,
    canPromoteBaseline,
    classifyBaselineComparison,
    hasExplicitAcceptance
};

if (require.main === module) runCli();
