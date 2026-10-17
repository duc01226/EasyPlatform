'use strict';

/**
 * Canonical review-round policy and bounded durable run record.
 *
 * This module owns the semantic predicate used by review skills and their
 * tooling.  It deliberately does not inspect code, execute commands, or
 * decide whether a finding is true; callers provide findings and binary-gate
 * results.  A run record is bookkeeping, never consent or proof that a review
 * was performed by a trusted host.
 *
 * Policy:
 *   - budget of three rounds (a ceiling, not a target);
 *   - round 1 blocks every finding except an explicitly deferred LOW;
 *     every applied fix needs a fresh review of the settled target;
 *   - from round 2 only CRITICAL/HIGH/MEDIUM findings block;
 *   - failed binary gates always block, at every round;
 *   - LOW findings deferred by the severity floor remain in the record;
 *   - all review blockers may use up to three rounds; remaining blockers
 *     at round 3 escalate; no automatic extension is available;
 *   - every failed gate remains blocking at the cap; further work needs
 *     explicit user approval and a linked bounded run;
 *   - an explicit minRounds may require up to three rounds, but a clean
 *     review still ends as soon as that minimum is reached.
 *
 * CLI (JSON stdin, real clock):
 *   node review-policy.cjs start|record|accept|interrupt|resume|invalidate|check
 * No CLI action accepts a caller-supplied clock.  Tests may pass `now` to the
 * exported functions so time-dependent transitions stay deterministic.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SCHEMA_VERSION = 1;
// Bump whenever the round eligibility predicate changes.  Existing durable
// records are intentionally invalidated rather than interpreted under a new
// severity floor; callers must start a fresh run with the current policy.
const POLICY_VERSION = 7;
// Every run has three review rounds; approved extensions use a linked bounded run.
const MAX_ROUNDS = 3;
const HARD_MAX_ROUNDS = 3;
const SEVERITIES = Object.freeze(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
const NON_SEVERITY_STATES = Object.freeze(['NOT VERIFIABLE']);
const LOW_FINDING_FLOOR_ROUND = 2;
// Only LOW deferral is an accepted resolution; a fix needs fresh review.
const LOW_RESOLUTIONS = Object.freeze(['deferred']);
// Compatibility vocabulary for consumers; current policy grants no extension.
const EXTENSION_SEVERITIES = Object.freeze(['CRITICAL', 'HIGH']);
// Every failed hard gate blocks acceptance and requires escalation at the cap.
// Test gates retain a separate reporting kind, not an unlimited review budget.
const TEST_GATE_KIND = 'test';
const HARD_GATE_KINDS = Object.freeze(['binary', TEST_GATE_KIND]);
const SEVERITY_DEFINITIONS = Object.freeze({
    CRITICAL: 'Immediate material risk: security/authorization bypass, data loss or corruption, unsafe destructive action, or (as a separate hard-gate condition) a failed gate that makes the result untrustworthy.',
    HIGH: 'Material correctness or contract risk: wrong behavior on a supported path, a violated invariant, a meaningful privacy/authority gap, or a defect likely to harm users or downstream systems.',
    MEDIUM: 'Bounded but consequential quality risk: an edge case, resilience/maintainability gap, or likely future defect with a credible impact but no immediate material loss.',
    LOW: 'Non-blocking polish: wording, formatting, minor documentation or defensive improvement with no credible present correctness, security, privacy, authority, or data-integrity impact.',
    'NOT VERIFIABLE': 'Unresolved evidence state: the available proof is insufficient to choose a consequence tier; it remains open and blocking until verified or explicitly owner-accepted with documented residual risk.'
});
const RUN_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/i;
const FINGERPRINT = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const MAX_RECORD_BYTES = 1024 * 1024;

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function requireObject(value, label) {
    if (!isObject(value)) throw new Error(`${label} must be an object`);
    return value;
}

function boundedText(value, label, max = 512) {
    if (typeof value !== 'string' || value.length === 0 || value.length > max ||
        value.trim() !== value || /[\x00-\x1f\x7f]/.test(value)) {
        throw new Error(`${label} must be a bounded printable string`);
    }
    return value;
}

function validateRunId(value) {
    boundedText(value, 'runId', 128);
    if (!RUN_ID.test(value)) throw new Error('runId contains unsupported characters');
    return value;
}

function validateFingerprint(value, label = 'targetFingerprint') {
    boundedText(value, label, 256);
    if (!FINGERPRINT.test(value)) throw new Error(`${label} contains unsupported characters`);
    return value;
}

function validateRound(value, label = 'round') {
    // No upper bound here: the review budget (MAX_ROUNDS/HARD_MAX_ROUNDS) is
    // enforced by evaluateRound/recordRound, with all failed gates blocking at the cap.
    if (!Number.isSafeInteger(value) || value < 1) {
        throw new Error(`${label} must be a positive integer`);
    }
    return value;
}

function validateMinRounds(value, explicit = false) {
    const candidate = value === undefined ? 1 : value;
    // A declared minimum cannot exceed the three-round review ceiling.
    if (!Number.isSafeInteger(candidate) || candidate < 1 || candidate > MAX_ROUNDS) {
        throw new Error(`minRounds must be an integer from 1 to ${MAX_ROUNDS}`);
    }
    return { value: candidate, explicit: explicit || value !== undefined };
}

function normalizeFinding(finding, index) {
    if (typeof finding === 'string') {
        return { id: `finding-${index + 1}`, severity: 'MEDIUM', summary: boundedText(finding, 'finding', 1024) };
    }
    requireObject(finding, `findings[${index}]`);
    const severity = typeof finding.severity === 'string' ? finding.severity.toUpperCase() : '';
    if (![...SEVERITIES, ...NON_SEVERITY_STATES].includes(severity)) {
        throw new Error(`findings[${index}].severity must be CRITICAL/HIGH/MEDIUM/LOW or NOT VERIFIABLE`);
    }
    const id = finding.id === undefined ? `finding-${index + 1}` : boundedText(finding.id, `findings[${index}].id`, 128);
    const result = { id, severity };
    if (finding.resolution !== undefined) {
        const resolution = String(finding.resolution).toLowerCase();
        if (!LOW_RESOLUTIONS.includes(resolution)) {
            throw new Error(`findings[${index}].resolution must be one of ${LOW_RESOLUTIONS.join(', ')}`);
        }
        // Only a LOW closes without a fix-and-full-re-review cycle; a higher tier
        // or an unresolved evidence state stays open until it is fixed.
        if (severity !== 'LOW') throw new Error(`findings[${index}].resolution is allowed only on a LOW finding`);
        result.resolution = resolution;
    }
    for (const key of ['summary', 'file', 'line', 'confidence']) {
        if (finding[key] !== undefined) {
            result[key] = typeof finding[key] === 'number' ? finding[key] : boundedText(String(finding[key]), `findings[${index}].${key}`, 1024);
        }
    }
    return result;
}

function normalizeFindings(findings) {
    if (findings === undefined) return [];
    if (!Array.isArray(findings)) throw new Error('findings must be an array');
    return findings.map(normalizeFinding);
}

function gatePassed(gate) {
    if (gate === true) return true;
    if (gate === false || gate === null || gate === undefined) return false;
    if (typeof gate === 'string') return gate.toUpperCase() === 'PASS' || gate.toUpperCase() === 'PASSED';
    if (isObject(gate)) return gate.ok === true || gate.passed === true ||
        ['PASS', 'PASSED', 'OK', 'GREEN'].includes(String(gate.status || '').toUpperCase());
    return false;
}

function normalizeHardGates(gates) {
    if (gates === undefined) return [];
    if (!Array.isArray(gates)) throw new Error('hardGates must be an array');
    return gates.map((gate, index) => {
        if (typeof gate === 'boolean' || typeof gate === 'string') {
            return { id: `hard-gate-${index + 1}`, kind: 'binary', status: gatePassed(gate) ? 'PASS' : 'FAIL' };
        }
        requireObject(gate, `hardGates[${index}]`);
        const id = gate.id === undefined ? `hard-gate-${index + 1}` : boundedText(gate.id, `hardGates[${index}].id`, 128);
        const kind = gate.kind === undefined ? 'binary' : String(gate.kind).toLowerCase();
        if (!HARD_GATE_KINDS.includes(kind)) throw new Error(`hardGates[${index}].kind must be one of ${HARD_GATE_KINDS.join(', ')}`);
        const status = gate.status === undefined ? (gatePassed(gate) ? 'PASS' : 'FAIL') :
            boundedText(String(gate.status).toUpperCase(), `hardGates[${index}].status`, 32);
        return { id, kind, status, ...(gate.reason === undefined ? {} : { reason: boundedText(String(gate.reason), `hardGates[${index}].reason`, 1024) }) };
    });
}

/**
 * Return the severity tiers that keep a review round open. The first review
 * pass is strict so every finding is validated once; from round two onward a
 * LOW is recorded and deferred rather than triggering another fix/re-review.
 */
function blockingSeverities(round) {
    validateRound(round);
    return round < LOW_FINDING_FLOOR_ROUND ? SEVERITIES : SEVERITIES.filter(severity => severity !== 'LOW');
}

/**
 * Shared predicate. Returns finding objects plus synthetic hard-gate objects
 * that prevent completion. It is pure and deterministic for one input set.
 */
function blockingFindings(round, findings = [], hardGates = []) {
    validateRound(round);
    const normalized = normalizeFindings(findings);
    const allowed = new Set(blockingSeverities(round));
    const blockers = normalized.filter(finding => (allowed.has(finding.severity) && !finding.resolution) ||
        NON_SEVERITY_STATES.includes(finding.severity));
    const failedGates = normalizeHardGates(hardGates).filter(gate => !gatePassed(gate.status)).map(gate => ({
        id: gate.id,
        severity: 'CRITICAL',
        kind: 'hard-gate',
        gateKind: gate.kind,
        summary: gate.reason || `Binary gate ${gate.id} did not pass`
    }));
    return [...blockers, ...failedGates];
}

function isFailingTestGate(blocker) {
    return blocker.kind === 'hard-gate' && blocker.gateKind === TEST_GATE_KIND;
}

/**
 * Blockers bounded by the review budget: every finding plus every failed
 * non-test binary gate. Test gates are listed separately but also block at the cap.
 */
function reviewBlockers(blocking = []) {
    return blocking.filter(blocker => !isFailingTestGate(blocker));
}

/** Retained API: the fixed three-round policy grants no extension. */
function grantsExtension() {
    return false;
}

function evaluateRound({ round, findings = [], hardGates = [], minRounds } = {}) {
    validateRound(round);
    const normalizedFindings = normalizeFindings(findings);
    const normalizedGates = normalizeHardGates(hardGates);
    const minimum = validateMinRounds(minRounds).value;
    const blocking = blockingFindings(round, normalizedFindings, normalizedGates);
    const deferredLow = normalizedFindings.filter(finding => finding.severity === 'LOW' &&
        (round >= LOW_FINDING_FLOOR_ROUND || finding.resolution === 'deferred'));
    const scopedClosedLow = []; // Retained return shape; scoped checks never replace fresh review.
    const minimumMet = round >= minimum;
    const canComplete = round <= MAX_ROUNDS && minimumMet && blocking.length === 0;
    const bounded = reviewBlockers(blocking);
    const failingTestGates = blocking.filter(isFailingTestGate);
    const extensionGranted = grantsExtension(round, blocking);
    const roundBudget = MAX_ROUNDS;
    // A spent review budget with review blockers left is never a pass: the
    // caller asks the user before any linked bounded extension.
    const mustEscalate = round > roundBudget || (blocking.length > 0 && round >= roundBudget);
    return {
        round,
        minRounds: minimum,
        minimumMet,
        findings: normalizedFindings,
        hardGates: normalizedGates,
        blocking,
        deferredLow,
        scopedClosedLow,
        extensionGranted,
        extensionFindings: extensionGranted
            ? bounded.filter(finding => EXTENSION_SEVERITIES.includes(finding.severity))
            : [],
        failingTestGates,
        testLoopContinues: failingTestGates.length > 0 && !mustEscalate,
        roundBudget,
        mustEscalate,
        canComplete,
        status: canComplete ? 'PASS' : (mustEscalate ? 'ESCALATE' : 'CONTINUE')
    };
}

function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
    if (isObject(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
}

function digest(value) {
    return crypto.createHash('sha256').update(stableJson(value)).digest('hex');
}

function clock(options) {
    const now = options?.now === undefined ? Date.now() : options.now;
    if (!Number.isSafeInteger(now) || now <= 0) throw new Error('now must be a positive safe integer');
    return now;
}

function storeContext(options) {
    requireObject(options, 'options');
    const storeDir = options.storeDir;
    boundedText(storeDir, 'storeDir', 32768);
    if (!path.isAbsolute(storeDir)) throw new Error('storeDir must be absolute');
    const resolved = path.resolve(storeDir);
    if (resolved === path.parse(resolved).root) throw new Error('Refusing to use a filesystem root as storeDir');
    if (fs.existsSync(resolved)) {
        const stat = fs.lstatSync(resolved);
        if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('storeDir must be a real directory');
    } else {
        fs.mkdirSync(resolved, { recursive: true, mode: 0o700 });
    }
    const runId = validateRunId(options.runId);
    return { storeDir: resolved, runId, file: path.join(resolved, `${runId}.json`), lock: path.join(resolved, `${runId}.lock`) };
}

function readState(context) {
    let stat;
    try {
        stat = fs.lstatSync(context.file);
    } catch (error) {
        if (error.code === 'ENOENT') return undefined;
        throw new Error('Invalid review run: existing record metadata is unreadable');
    }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_RECORD_BYTES) {
        throw new Error('Invalid review run: record must be a bounded regular file');
    }
    try {
        return JSON.parse(fs.readFileSync(context.file, 'utf8'));
    } catch (_) {
        throw new Error('Invalid review run: existing record is unreadable or malformed');
    }
}

function validState(state) {
    return isObject(state) && state.schemaVersion === SCHEMA_VERSION && state.policyVersion === POLICY_VERSION &&
        RUN_ID.test(state.runId) && FINGERPRINT.test(state.targetFingerprint) &&
        Number.isSafeInteger(state.minRounds) && state.minRounds >= 1 && state.minRounds <= MAX_ROUNDS &&
        Number.isSafeInteger(state.maxRounds) && state.maxRounds >= MAX_ROUNDS && state.maxRounds <= HARD_MAX_ROUNDS &&
        Number.isSafeInteger(state.roundsCompleted) && state.roundsCompleted >= 0 &&
        Array.isArray(state.rounds) && state.roundsCompleted === state.rounds.length &&
        state.rounds.every(record => isObject(record) && validateRecordShape(record)) &&
        (state.status === 'in_progress' || state.status === 'interrupted' || state.status === 'ready' || state.status === 'accepted') &&
        Number.isSafeInteger(state.targetRevision) && state.targetRevision >= 0;
}

function validateRecordShape(record) {
    try {
        validateRound(record.round);
        return record.targetFingerprint && FINGERPRINT.test(record.targetFingerprint) &&
            typeof record.valid === 'boolean' && isObject(record.evaluation) &&
            Array.isArray(record.evaluation.findings) && Array.isArray(record.evaluation.blocking);
    } catch (_) {
        return false;
    }
}

function acquire(context) {
    try {
        fs.mkdirSync(context.lock, { recursive: false, mode: 0o700 });
    } catch (_) {
        throw new Error('Review run is locked by another process');
    }
}

function release(context) {
    try { fs.rmdirSync(context.lock); } catch (_) { /* lock owner already disappeared */ }
}

function writeState(context, state) {
    if (!validState(state)) throw new Error('Refusing to write invalid review state');
    const serialized = JSON.stringify(state, null, 2);
    if (Buffer.byteLength(serialized) > MAX_RECORD_BYTES) throw new Error('Review state is too large');
    const temporary = `${context.file}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    fs.writeFileSync(temporary, serialized, { flag: 'wx', mode: 0o600 });
    try {
        // Rename replaces the destination atomically on supported Node hosts.
        fs.renameSync(temporary, context.file);
    } finally {
        try { fs.unlinkSync(temporary); } catch (_) { /* already renamed */ }
    }
}

function withState(options, action) {
    const context = storeContext(options);
    acquire(context);
    try {
        const state = readState(context);
        if (!state || !validState(state)) throw new Error('Missing or invalid review run');
        return action(state, context);
    } finally {
        release(context);
    }
}

function startRun(options) {
    const context = storeContext(options);
    const targetFingerprint = validateFingerprint(options.targetFingerprint);
    const minimum = validateMinRounds(options.minRounds);
    const now = clock(options);
    acquire(context);
    try {
        if (readState(context) !== undefined) throw new Error(`Review run already exists: ${context.runId}`);
        const state = {
            schemaVersion: SCHEMA_VERSION,
            policyVersion: POLICY_VERSION,
            runId: context.runId,
            targetFingerprint,
            targetRevision: 0,
            minRounds: minimum.value,
            minRoundsExplicit: minimum.explicit,
            maxRounds: MAX_ROUNDS,
            extension: null,
            roundsCompleted: 0,
            rounds: [],
            status: 'in_progress',
            acceptedRound: null,
            interruption: null,
            resumeCount: 0,
            createdAt: now,
            updatedAt: now
        };
        writeState(context, state);
        return state;
    } finally {
        release(context);
    }
}

function getRun(options) {
    const context = storeContext(options);
    const state = readState(context);
    if (!state || !validState(state)) throw new Error('Missing or invalid review run');
    return state;
}

function invalidateState(state, targetFingerprint, now) {
    validateFingerprint(targetFingerprint);
    if (targetFingerprint === state.targetFingerprint) return false;
    state.targetFingerprint = targetFingerprint;
    state.targetRevision += 1;
    state.acceptedRound = null;
    state.status = 'in_progress';
    state.interruption = null;
    // Keep roundsCompleted/maxRounds/extension: changing the target invalidates
    // evidence, but may not reset — or re-grant — the bounded review budget.
    for (const record of state.rounds) record.valid = false;
    state.updatedAt = now;
    return true;
}

function recordRound(options) {
    return withState(options, (state, context) => {
        const now = clock(options);
        const changed = invalidateState(state, options.targetFingerprint, now);
        const targetFingerprint = validateFingerprint(options.targetFingerprint);
        const round = validateRound(options.round);
        const evaluation = evaluateRound({ round, findings: options.findings, hardGates: options.hardGates, minRounds: state.minRounds });
        const reviewedFingerprint = options.reviewedFingerprint === undefined
            ? null : validateFingerprint(options.reviewedFingerprint, 'reviewedFingerprint');
        if (reviewedFingerprint !== null && reviewedFingerprint !== targetFingerprint) {
            throw new Error('reviewedFingerprint must match targetFingerprint; fresh review is required after every fix');
        }
        const proposedDigest = digest({ evaluation, reviewedFingerprint });
        const duplicate = state.rounds.find(item => item.valid && item.round === round && item.targetFingerprint === targetFingerprint);
        // A retried completion is a read-only idempotent transition. Check it
        // before the next-round guard so callers can safely retry after a lost
        // response without consuming another budget slot.
        if (duplicate) {
            if (duplicate.digest !== proposedDigest) throw new Error('Completed review round cannot be overwritten');
            return { ...state, targetChanged: changed };
        }
        const expected = state.roundsCompleted + 1;
        if (round !== expected) throw new Error(`Expected next round ${expected}, received ${round}`);
        // No run continues beyond its three-round review cap without a new approved run.
        if (round > state.maxRounds) throw new Error('Review round budget exhausted; explicit user approval requires a linked bounded run');
        const record = {
            round,
            targetFingerprint,
            ...(reviewedFingerprint === null ? {} : { reviewedFingerprint }),
            targetRevision: state.targetRevision,
            valid: true,
            recordedAt: now,
            digest: proposedDigest,
            evaluation
        };
        state.rounds.push(record);
        state.roundsCompleted = round;
        if (evaluation.extensionGranted && !state.extension) {
            state.extension = {
                grantedAtRound: round,
                grantedAt: now,
                findings: evaluation.extensionFindings.map(finding => finding.id)
            };
            state.maxRounds = HARD_MAX_ROUNDS;
        }
        state.acceptedRound = null;
        state.status = evaluation.canComplete ? 'ready' : 'in_progress';
        state.interruption = null;
        state.updatedAt = now;
        writeState(context, state);
        return { ...state, targetChanged: changed };
    });
}

function acceptRun(options) {
    return withState(options, (state, context) => {
        const now = clock(options);
        const targetFingerprint = validateFingerprint(options.targetFingerprint);
        if (targetFingerprint !== state.targetFingerprint) throw new Error('Target fingerprint is stale');
        const round = options.round === undefined ? state.roundsCompleted : validateRound(options.round);
        if (round !== state.roundsCompleted) throw new Error('Only the latest completed round is eligible for acceptance');
        const record = state.rounds.find(item => item.valid && item.round === round && item.targetFingerprint === targetFingerprint);
        if (!record || !evaluateRound({ round, findings: record.evaluation.findings,
            hardGates: record.evaluation.hardGates, minRounds: state.minRounds }).canComplete) {
            throw new Error('Review round is not eligible for acceptance');
        }
        state.acceptedRound = round;
        state.status = 'accepted';
        state.updatedAt = now;
        writeState(context, state);
        return state;
    });
}

function interruptRun(options) {
    return withState(options, (state, context) => {
        const now = clock(options);
        state.status = 'interrupted';
        state.interruption = { reason: boundedText(options.reason || 'interrupted', 'reason', 1024), at: now };
        state.updatedAt = now;
        writeState(context, state);
        return state;
    });
}

function resumeRun(options) {
    return withState(options, (state, context) => {
        const now = clock(options);
        if (state.status === 'accepted') throw new Error('Accepted review cannot be resumed');
        state.status = 'in_progress';
        state.resumeCount += 1;
        state.interruption = null;
        state.updatedAt = now;
        writeState(context, state);
        return state;
    });
}

function invalidateRun(options) {
    return withState(options, (state, context) => {
        const now = clock(options);
        const changed = invalidateState(state, options.targetFingerprint, now);
        if (changed) writeState(context, state);
        return { ...state, targetChanged: changed };
    });
}

function runCli() {
    try {
        const command = process.argv[2];
        const allowed = new Set(['start', 'record', 'accept', 'interrupt', 'resume', 'invalidate', 'check']);
        if (process.argv.length !== 3 || !allowed.has(command)) throw new Error('Use start|record|accept|interrupt|resume|invalidate|check with JSON stdin');
        const options = JSON.parse(fs.readFileSync(0, 'utf8'));
        if (own(options, 'now')) throw new Error('CLI uses the real clock');
        const actions = { start: startRun, record: recordRound, accept: acceptRun, interrupt: interruptRun,
            resume: resumeRun, invalidate: invalidateRun, check: getRun };
        const result = actions[command](options);
        process.stdout.write(`${JSON.stringify(result)}\n`);
        process.exitCode = 0;
    } catch (error) {
        process.stderr.write(`Review policy failed: ${error.message}\n`);
        process.exitCode = 2;
    }
}

module.exports = {
    SCHEMA_VERSION,
    POLICY_VERSION,
    MAX_ROUNDS,
    HARD_MAX_ROUNDS,
    SEVERITIES,
    NON_SEVERITY_STATES,
    LOW_FINDING_FLOOR_ROUND,
    EXTENSION_SEVERITIES,
    TEST_GATE_KIND,
    HARD_GATE_KINDS,
    LOW_RESOLUTIONS,
    SEVERITY_DEFINITIONS,
    blockingSeverities,
    blockingFindings,
    grantsExtension,
    reviewBlockers,
    evaluateRound,
    startRun,
    getRun,
    recordRound,
    acceptRun,
    interruptRun,
    resumeRun,
    invalidateRun,
    validateFinding: normalizeFinding,
    normalizeFindings
};

if (require.main === module) runCli();
