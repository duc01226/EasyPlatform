'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { SCHEMA, validateConfig } = require('../../hooks/lib/project-config-schema.cjs');
const {
    getConfiguredProjectConfigPath,
    getDocsRoot
} = require('../../hooks/lib/project-config-loader.cjs');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const SCHEMA_REQUIRE = createRequire(path.resolve(__dirname, '../../hooks/lib/project-config-schema.cjs'));
function readProjectConfig(configPath = getConfiguredProjectConfigPath()) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}
const MINIMAL_CONFIG = Object.freeze({ project: Object.freeze({ name: 'Experience Config Test' }) });
const realConfig = readProjectConfig();

test('TC-EXP-CONFIG-000: missing required project config is not replaced with a framework skeleton', () => {
    const absentPath = path.join(repoRoot, 'tmp', `experience-config-missing-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    assert.throws(() => readProjectConfig(absentPath), error => error?.code === 'ENOENT');
});

test('TC-EXP-CONFIG-001: the optional experienceVerification contract is declared and minimal and real configs validate', () => {
    assert.equal(SCHEMA.experienceVerification.type, 'object');
    assert.equal(SCHEMA.experienceVerification.required, false);
    assert.equal(validateConfig(realConfig).valid, true);
    assert.equal(validateConfig(MINIMAL_CONFIG).valid, true);
});

test('TC-EXP-CONFIG-001a: minimal config may omit experienceVerification when the capability is absent', () => {
    assert.equal(Object.hasOwn(MINIMAL_CONFIG, 'experienceVerification'), false);
    assert.equal(validateConfig(MINIMAL_CONFIG).valid, true);
    const description = require('../../hooks/lib/project-config-schema.cjs').describeSchema();
    assert.match(description, /Optional evidence contract for user-facing or externally observable surfaces/);
    assert.match(description, /project-root tmp\/ or temp\//);
});

test('TC-EXP-CONFIG-002: a configured surface carries project facts without a framework-specific enum', () => {
    const config = {
        ...MINIMAL_CONFIG,
        experienceVerification: {
            enabled: true,
            evidenceRoot: 'tmp/experience',
            baselineRoot: 'tests/baselines',
            acceptancePolicy: 'manual-acceptance-required',
            surfaces: [{
                id: 'operator-transcript',
                kind: 'terminal',
                runner: 'existing-cli-harness',
                entryPoints: ['bin/tool'],
                changeTriggers: ['bin/**'],
                states: ['default', 'error']
            }]
        }
    };
    const result = validateConfig(config);
    assert.equal(result.valid, true, result.errors.join('; '));
});

test('TC-EXP-CONFIG-003: incomplete configured experience block is rejected', () => {
    const config = { ...MINIMAL_CONFIG, experienceVerification: { enabled: true, surfaces: [] } };
    const result = validateConfig(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes('experienceVerification.evidenceRoot')));
    assert.ok(result.errors.some(error => error.includes('experienceVerification.baselineRoot')));
    assert.ok(result.errors.some(error => error.includes('experienceVerification.acceptancePolicy')));
});

test('TC-EXP-CONFIG-004: an empty disabled contract requires an honest reason', () => {
    const config = {
        ...MINIMAL_CONFIG,
        experienceVerification: {
            enabled: false,
            evidenceRoot: 'tmp/experience',
            baselineRoot: 'tests/baselines',
            acceptancePolicy: 'manual-acceptance-required',
            surfaces: []
        }
    };
    const result = validateConfig(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes('notApplicableReason')));
});

test('TC-EXP-CONFIG-005: enabled experience verification requires a configured surface', () => {
    const config = {
        ...MINIMAL_CONFIG,
        experienceVerification: {
            enabled: true,
            evidenceRoot: 'tmp/experience',
            baselineRoot: 'tests/baselines',
            acceptancePolicy: 'manual-acceptance-required',
            surfaces: [],
            notApplicableReason: 'The surface is not runnable yet.'
        }
    };
    const result = validateConfig(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes('at least one observable surface')));
});

test('TC-EXP-CONFIG-006: malformed object-array entries produce path-specific errors instead of throwing', () => {
    for (const item of [null, [], 'surface', 17, false]) {
        const config = {
            ...MINIMAL_CONFIG,
            experienceVerification: {
                enabled: true,
                evidenceRoot: 'tmp/experience',
                baselineRoot: 'tests/baselines',
                acceptancePolicy: 'manual-acceptance-required',
                surfaces: [item]
            }
        };
        const result = validateConfig(config);
        assert.equal(result.valid, false);
        assert.ok(result.errors.includes('experienceVerification.surfaces[0]: expected object item'));
    }
    // The shared predicate also owns existing object-array clients.
    for (const field of ['modules', 'contextGroups', 'referenceDocs']) {
        const result = validateConfig({ ...MINIMAL_CONFIG, [field]: [null] });
        assert.equal(result.valid, false);
        assert.ok(result.errors.includes(`${field}[0]: expected object item`));
    }
    assert.equal(validateConfig(realConfig).valid, true);
});

function surfaceConfig(enabled = true) {
    return {
        ...MINIMAL_CONFIG,
        experienceVerification: {
            enabled,
            evidenceRoot: 'tmp/experience',
            baselineRoot: 'tests/baselines',
            acceptancePolicy: 'manual-acceptance-required',
            surfaces: [{ id: 'operator', kind: 'terminal', runner: 'cli-harness', entryPoints: ['bin/tool'] }]
        }
    };
}

function expectSurfaceError(result, field, detail) {
    assert.equal(result.valid, false);
    assert.deepEqual(Array.from(result.errors), [`experienceVerification.surfaces[0].${field}: ${detail}`]);
}

test('TC-EXP-CONFIG-007: each surface identity and entry-point field is independently required and typed', () => {
    // Invariant: an otherwise valid surface must not conceal a missing or malformed field.
    assert.equal(validateConfig(surfaceConfig()).valid, true);
    for (const field of ['id', 'kind', 'runner', 'entryPoints']) {
        for (const state of ['missing', 'null', 'wrong-type']) {
            const config = surfaceConfig();
            const surface = config.experienceVerification.surfaces[0];
            if (state === 'missing') delete surface[field];
            else surface[field] = state === 'null' ? null : 42;
            const detail = state === 'wrong-type'
                ? `expected ${field === 'entryPoints' ? 'array' : 'string'}, got number`
                : 'required field is missing';
            expectSurfaceError(validateConfig(config), field, detail);
        }
    }
});

const disabledWarning = 'experienceVerification: surfaces are configured while the contract is disabled; conditional experience review routing is off until enabled';
function expectDisabledWarning(result) {
    assert.equal(result.valid, true, result.errors.join('; '));
    assert.ok(result.warnings.includes(disabledWarning), result.warnings.join('; '));
}

test('TC-EXP-CONFIG-008: disabled configured surfaces warn without rejecting valid configuration', () => {
    expectDisabledWarning(validateConfig(surfaceConfig(false)));
    const enabled = validateConfig(surfaceConfig(true));
    assert.equal(enabled.valid, true);
    assert.equal(enabled.warnings.includes(disabledWarning), false, 'enabled routing must not report disabled');
});

// Mutation anchors below are written with LF newlines, but a Windows checkout under
// `core.autocrlf=true` materializes the schema with CRLF. Normalizing on read keeps every
// multi-line anchor matching the same text the repository stores, so an oracle reports a real
// mutation-site change instead of the checkout's line-ending policy.
function readSchemaSource() {
    return fs
        .readFileSync(path.resolve(__dirname, '../../hooks/lib/project-config-schema.cjs'), 'utf8')
        .replace(/\r\n/g, '\n');
}

function loadSchemaSource(source) {
    const module = { exports: {} };
    // The sandbox must supply a REAL `require`: the schema now requires a sibling registry at load
    // (project-config-schema.cjs:15-18). Bind it to the schema's own directory so its relative ids
    // resolve exactly as in production, and pin `.main = null` so the `require.main === module` CLI
    // guard at the file's tail stays inert inside the sandbox (a non-null main would run the CLI).
    const schemaRequire = Object.assign(
        id => SCHEMA_REQUIRE(id),
        { main: null, resolve: SCHEMA_REQUIRE.resolve }
    );
    vm.runInNewContext(source, { module, exports: module.exports, require: schemaRequire }, { filename: 'project-config-schema.cjs', timeout: 5000 });
    return module.exports.validateConfig;
}

test('TC-EXP-CONFIG-009: actual required-field and type weakenings are killed by surface oracles', () => {
    const source = readSchemaSource();
    const start = source.indexOf('    experienceVerification: {');
    const end = source.indexOf('            notApplicableReason:', start);
    assert.ok(start >= 0 && end > start, 'the owning schema block must exist');
    const block = source.slice(start, end);
    for (const field of ['id', 'kind', 'runner', 'entryPoints']) {
        const type = field === 'entryPoints' ? 'array' : 'string';
        const anchor = `${field}: { type: '${type}', required: true }`;
        assert.equal(block.split(anchor).length, 2, `one ${field} mutation site`);
        for (const change of ['required', 'type']) {
            const replacement = change === 'required'
                ? `${field}: { type: '${type}', required: false }`
                : `${field}: { type: 'unchecked', required: true }`;
            const mutant = loadSchemaSource(source.slice(0, start) + block.replace(anchor, replacement) + source.slice(end));
            assert.equal(mutant(surfaceConfig()).valid, true, 'mutant must still execute valid configuration');
            const config = surfaceConfig();
            if (change === 'required') delete config.experienceVerification.surfaces[0][field];
            else config.experienceVerification.surfaces[0][field] = 42;
            const result = mutant(config);
            assert.equal(result.valid, true, `${field}/${change} mutation must actually weaken the contract`);
            const detail = change === 'required' ? 'required field is missing' : `expected ${type}, got number`;
            assert.throws(() => expectSurfaceError(result, field, detail), { code: 'ERR_ASSERTION' });
        }
    }
});

test('TC-EXP-CONFIG-010: actual disabled-warning deletion is killed by its diagnostic oracle', () => {
    const source = readSchemaSource();
    const anchor = `warnings.push('${disabledWarning}');`;
    assert.equal(source.split(anchor).length, 2, 'one warning mutation site');
    const mutant = loadSchemaSource(source.replace(anchor, '/* warning removed */'));
    const result = mutant(surfaceConfig(false));
    assert.equal(result.valid, true, 'warning removal must not prevent schema execution');
    assert.equal(result.warnings.includes(disabledWarning), false);
    assert.throws(() => expectDisabledWarning(result), { code: 'ERR_ASSERTION' });
});

const validLocalRun = {
    dependencyCommand: 'docker compose up -d',
    startCommand: 'npm run dev',
    workingDir: 'apps/web',
    readyCheck: 'curl -fsS http://127.0.0.1:5173/healthz',
    readyTimeoutSeconds: 120,
    teardownCommand: 'docker compose down',
    logSources: ['docker compose logs api', 'var/log/app.log'],
    credentialsRef: 'REVIEW_FIXTURE_USER'
};

function localRunConfig(localRun) {
    const config = surfaceConfig();
    config.experienceVerification.surfaces[0].localRun = localRun;
    return config;
}

test('TC-EXP-CONFIG-011: the optional local bring-up recipe is accepted whole and absent', () => {
    // Invariant: a review can record how to run the surface locally, and every
    // pre-existing surface without a recipe keeps validating unchanged.
    assert.equal(validateConfig(surfaceConfig()).valid, true, 'absent localRun must stay valid');
    const result = validateConfig(localRunConfig(validLocalRun));
    assert.equal(result.valid, true, result.errors.join('; '));
    assert.deepEqual(result.warnings.filter(warning => warning.includes('localRun')), [], 'declared fields must not warn as unknown');
});

test('TC-EXP-CONFIG-012: each local bring-up field is type-checked at its own path', () => {
    // Invariant: a malformed command accepted here becomes an unrunnable recipe
    // the review only discovers against a dead environment, one round too late.
    for (const field of Object.keys(validLocalRun)) {
        const expected = field === 'readyTimeoutSeconds' ? 'number' : field === 'logSources' ? 'array' : 'string';
        const wrongValue = expected === 'number' ? 'soon' : 42;
        const got = expected === 'number' ? 'string' : 'number';
        const result = validateConfig(localRunConfig({ ...validLocalRun, [field]: wrongValue }));
        assert.equal(result.valid, false, `${field} must be type-checked`);
        assert.deepEqual(
            Array.from(result.errors),
            [`experienceVerification.surfaces[0].localRun.${field}: expected ${expected}, got ${got}`]
        );
    }
    const unknown = validateConfig(localRunConfig({ ...validLocalRun, startCmd: 'npm start' }));
    assert.equal(unknown.valid, true, 'an unknown recipe field warns, never rejects');
    assert.ok(unknown.warnings.includes('experienceVerification.surfaces[0].localRun.startCmd: unknown property (not in schema)'));
});

test('TC-EXP-CONFIG-013: actual freeform weakening of the bring-up recipe is killed by its type oracle', () => {
    const source = readSchemaSource();
    const anchor = "                    localRun: {\n                        type: 'object',\n                        required: false,";
    assert.equal(source.split(anchor).length, 2, 'one localRun mutation site');
    const mutant = loadSchemaSource(source.replace(anchor, `${anchor}\n                        freeform: true,`));
    assert.equal(mutant(surfaceConfig()).valid, true, 'mutant must still execute valid configuration');
    const result = mutant(localRunConfig({ ...validLocalRun, startCommand: 42 }));
    assert.equal(result.valid, true, 'the freeform mutation must actually weaken the contract');
    assert.equal(result.errors.length, 0);
});

function e2eConfig(execution, surface = {}) {
    return {
        ...MINIMAL_CONFIG,
        e2eTesting: {
            framework: 'playwright',
            language: 'typescript',
            execution
        },
        experienceVerification: {
            enabled: true,
            evidenceRoot: 'tmp/experience',
            baselineRoot: 'tests/baselines',
            acceptancePolicy: 'manual-acceptance-required',
            surfaces: [{
                id: 'web',
                kind: 'web',
                runner: 'playwright-cli',
                entryPoints: ['apps/web'],
                ...surface
            }]
        }
    };
}

const validE2eExecution = {
    surfaceIds: ['web'],
    auth: {
        mode: 'fixture',
        credentialsRef: 'env:E2E_REVIEW_USER',
        loginPath: '/login'
    },
    data: {
        seedCommand: 'npm run seed:e2e',
        workingDir: 'apps/web',
        mode: 'idempotent',
        cleanupPolicy: 'current-run ephemeral data only after evidence capture'
    },
    browser: {
        runner: 'playwright-cli',
        engine: 'chromium',
        headed: true,
        actionDelayMs: 250
    },
    evidence: {
        root: 'tmp/e2e',
        capture: ['screenshot', 'console', 'requests', 'trace', 'video'],
        redaction: 'project-configured redactor'
    },
    convergence: {
        maxAttempts: 3,
        consecutiveGreen: 2,
        settleTimeoutSeconds: 120
    }
};

test('TC-E2E-CONFIG-014: a complete optional E2E execution profile validates and is discoverable', () => {
    const result = validateConfig(e2eConfig(validE2eExecution));
    assert.equal(result.valid, true, result.errors.join('; '));
    assert.deepEqual(result.warnings, [], 'the E2E fixture is self-contained and declares no unrelated optional roots');
    assert.equal(SCHEMA.e2eTesting.properties.execution.type, 'object');
    assert.equal(SCHEMA.e2eTesting.properties.execution.properties.browser.properties.runner.type, 'string');
    const description = require('../../hooks/lib/project-config-schema.cjs').describeSchema();
    for (const field of ['surfaceIds', 'auth', 'data', 'browser', 'evidence', 'convergence', 'actionDelayMs', 'redaction', 'consecutiveGreen']) {
        assert.ok(description.includes(field), `--describe output must include ${field}`);
    }
    for (const actionDelayMs of [0, 125, 1800]) {
        const pacingResult = validateConfig(e2eConfig({ browser: { actionDelayMs } }));
        assert.equal(pacingResult.valid, true, `${actionDelayMs}ms is a supported project pacing value: ${pacingResult.errors.join('; ')}`);
    }
});

test('TC-E2E-CONFIG-015: a partial profile remains valid but exposes unresolved capability as a warning', () => {
    const config = e2eConfig({
        surfaceIds: ['not-configured-yet'],
        browser: { headed: true }
    });
    const result = validateConfig(config);
    assert.equal(result.valid, true, result.errors.join('; '));
    assert.ok(result.warnings.some(warning => warning.includes('surfaceIds[0]')));
    assert.equal(config.e2eTesting.execution.browser.headed, true);
    assert.equal(config.e2eTesting.execution.auth, undefined);
});

test('TC-E2E-CONFIG-016: declared nested fields keep path-specific type validation', () => {
    const mutations = [
        ['surfaceIds', 42, 'e2eTesting.execution.surfaceIds: expected array, got number'],
        ['auth', 'fixture', 'e2eTesting.execution.auth: expected object, got string'],
        ['browser', [], 'e2eTesting.execution.browser: expected object, got array'],
        ['evidence', { capture: [42] }, 'e2eTesting.execution.evidence.capture[0]: expected string, got number'],
        ['convergence', { maxAttempts: 'three' }, 'e2eTesting.execution.convergence.maxAttempts: expected number, got string']
    ];
    for (const [field, value, expected] of mutations) {
        const result = validateConfig(e2eConfig({ [field]: value }));
        assert.equal(result.valid, false, `${field} mutation must fail`);
        assert.ok(result.errors.includes(expected), `${field}: ${result.errors.join('; ')}`);
    }
});

test('TC-E2E-CONFIG-017: unsafe paths, unsupported modes, invalid pacing, and unbounded convergence are rejected', () => {
    const config = e2eConfig({
        surfaceIds: ['web'],
        auth: { mode: 'unknown' },
        data: { mode: 'reset-all', workingDir: '../shared' },
        browser: { actionDelayMs: -1 },
        evidence: { root: '../outside', capture: ['dom-dump'] },
        convergence: { maxAttempts: 0, consecutiveGreen: 4, settleTimeoutSeconds: 601 }
    });
    const result = validateConfig(config);
    assert.equal(result.valid, false);
    for (const fragment of [
        'auth.mode: unsupported mode',
        'data.mode: unsupported mode',
        'data.workingDir: must be a project-relative path',
        'browser.actionDelayMs: expected a non-negative safe integer in milliseconds',
        'evidence.root: must be a project-relative path',
        'evidence.capture[0]: unsupported capture',
        'convergence.maxAttempts: expected an integer from 1 through 10',
        'convergence.settleTimeoutSeconds: expected an integer from 1 through 600'
    ]) {
        assert.ok(result.errors.some(error => error.includes(fragment)), `${fragment}: ${result.errors.join('; ')}`);
    }
});

test('TC-E2E-CONFIG-018: credential-looking literals in references and commands are warned', () => {
    const result = validateConfig(e2eConfig({
        auth: {
            mode: 'fixture',
            credentialsRef: 'password=not-a-reference',
            registrationCommand: 'npm run register -- --password hunter2'
        },
        data: { seedCommand: 'npm run seed -- --token abc123' },
        evidence: { capture: ['requests'] }
    }, { localRun: { credentialsRef: 'password=inline' } }));
    assert.equal(result.valid, true, result.errors.join('; '));
    assert.ok(result.warnings.some(warning => warning.includes('credentialsRef') && warning.includes('credential/token literal')));
    assert.ok(result.warnings.some(warning => warning.includes('registrationCommand') && warning.includes('credential/token literal')));
    assert.ok(result.warnings.some(warning => warning.includes('seedCommand') && warning.includes('credential/token literal')));
    assert.ok(result.warnings.some(warning => warning.includes('localRun.credentialsRef') && warning.includes('credential/token literal')));
    assert.ok(result.warnings.some(warning => warning.includes('evidence.redaction')));
});

test('TC-E2E-CONFIG-019: blank conditional capabilities remain unresolved', () => {
    const cases = [
        [{ auth: { mode: 'fixture', credentialsRef: ' ' } }, 'auth.credentialsRef'],
        [{ auth: { mode: 'storage-state', storageStateRef: ' ' } }, 'auth.storageStateRef'],
        [{ auth: { mode: 'registration', registrationCommand: ' ' } }, 'auth.registrationCommand'],
        [{ data: { mode: 'idempotent', seedCommand: ' ' } }, 'data.seedCommand'],
        [{ evidence: { capture: ['requests'], redaction: ' ' } }, 'evidence.redaction'],
        [{ evidence: { capture: ['screenshot'], redaction: ' ' } }, 'evidence.redaction']
    ];
    for (const [execution, fragment] of cases) {
        const result = validateConfig(e2eConfig(execution));
        assert.equal(result.valid, true, result.errors.join('; '));
        assert.ok(result.warnings.some(warning => warning.includes(fragment)), `${fragment}: ${result.warnings.join('; ')}`);
    }
});

test('TC-E2E-CONFIG-020: the real project configuration keeps its explicit E2E state', () => {
    const e2e = realConfig.e2eTesting;
    if (e2e === undefined) {
        assert.equal(validateConfig(realConfig).valid, true);
        return;
    }

    assert.equal(typeof e2e, 'object');
    assert.equal(typeof e2e.framework, 'string');
    assert.ok(e2e.framework.trim().length > 0);

    if (e2e.framework === 'none') {
        assert.deepEqual(e2e.entryPoints, []);
        assert.deepEqual(e2e.runCommands, {});
    } else {
        assert.ok(Array.isArray(e2e.entryPoints));
        assert.ok(e2e.runCommands && typeof e2e.runCommands === 'object' && !Array.isArray(e2e.runCommands));
    }

    assert.equal(validateConfig(realConfig).valid, true);
});

const validUiStateCapture = {
    mode: 'every-action',
    helper: 'e2e/support/capture-ui-state.ts#captureUiState',
    manifestPath: 'tmp/e2e/ui-captures/run/capture-manifest.json',
    maxPerTest: 60,
    maxPerRun: 400,
    fullPageWhenScrollable: true,
    maskSelectors: ['[data-volatile]']
};

function uiStateCaptureConfig(overrides) {
    return e2eConfig({ ...validE2eExecution, evidence: { ...validE2eExecution.evidence, uiStateCapture: { ...validUiStateCapture, ...overrides } } });
}

function uiStateCaptureErrors(result) {
    return result.errors.filter(error => error.includes('uiStateCapture'));
}

test('TC-E2E-CONFIG-021: uiStateCapture rejects unknown modes, unbounded caps, and inverted caps', () => {
    const valid = validateConfig(uiStateCaptureConfig({}));
    assert.equal(valid.valid, true, valid.errors.join('; '));
    assert.deepEqual(valid.warnings.filter(warning => warning.includes('uiStateCapture')), []);

    const cases = [
        [{ mode: 'on-failure' }, 'uiStateCapture.mode: unsupported mode "on-failure"'],
        // A zero cap would silently disable capture instead of recording an escalation.
        [{ maxPerTest: 0 }, 'uiStateCapture.maxPerTest: expected an integer from 1 through 1000'],
        [{ maxPerTest: 1.5 }, 'uiStateCapture.maxPerTest: expected an integer from 1 through 1000'],
        [{ maxPerTest: 1001, maxPerRun: 20000 }, 'uiStateCapture.maxPerTest: expected an integer from 1 through 1000'],
        [{ maxPerRun: 20001 }, 'uiStateCapture.maxPerRun: expected an integer from 1 through 20000'],
        [{ maxPerTest: 100, maxPerRun: 50 }, 'uiStateCapture.maxPerTest: cannot exceed uiStateCapture.maxPerRun'],
        // A blank mode is a typo; omission follows the documented declared-only default.
        [{ mode: '' }, 'uiStateCapture.mode: unsupported mode ""'],
        [{ mode: '  ' }, 'uiStateCapture.mode: unsupported mode "  "'],
        // The manifest indexes screenshots; it must stay inside the project so evidence cannot
        // leave the gitignored disposable root.
        [{ manifestPath: '../shared/capture-manifest.json' }, 'uiStateCapture.manifestPath: must be a project-relative path without parent traversal'],
        [{ manifestPath: 'C:/evidence/capture-manifest.json' }, 'uiStateCapture.manifestPath: must be a project-relative path without parent traversal'],
        [{ manifestPath: '/var/evidence/capture-manifest.json' }, 'uiStateCapture.manifestPath: must be a project-relative path without parent traversal']
    ];
    for (const [overrides, fragment] of cases) {
        const result = validateConfig(uiStateCaptureConfig(overrides));
        assert.equal(result.valid, false, `${JSON.stringify(overrides)} must fail`);
        assert.ok(uiStateCaptureErrors(result).some(error => error.includes(fragment)), `${fragment}: ${result.errors.join('; ')}`);
    }

    // Boundaries stay accepted so the range check cannot drift into an off-by-one rejection.
    assert.deepEqual(uiStateCaptureErrors(validateConfig(uiStateCaptureConfig({ maxPerTest: 1000, maxPerRun: 20000 }))), []);
    assert.deepEqual(uiStateCaptureErrors(validateConfig(uiStateCaptureConfig({ maxPerTest: 1, maxPerRun: 1 }))), []);
});

test('TC-E2E-CONFIG-022: a missing manifest is warned in every mode; a capture boundary is required only for every-action mode', () => {
    for (const mode of ['declared-only', undefined, 'off']) {
        const result = validateConfig(uiStateCaptureConfig({ mode, helper: undefined, manifestPath: ' ' }));
        assert.equal(result.valid, true, result.errors.join('; '));
        assert.ok(result.warnings.some(warning => warning.includes('uiStateCapture.manifestPath')), `${mode}: ${result.warnings.join('; ')}`);
        assert.equal(result.warnings.some(warning => warning.includes('uiStateCapture.helper')), false, `${mode}: ${result.warnings.join('; ')}`);
    }

    const everyAction = validateConfig(uiStateCaptureConfig({ mode: 'every-action', helper: undefined, manifestPath: 'tmp/e2e/capture-manifest.json' }));
    assert.equal(everyAction.valid, true, everyAction.errors.join('; '));
    assert.ok(everyAction.warnings.some(warning => warning.includes('uiStateCapture.helper')), everyAction.warnings.join('; '));

    // `off` drops the action-layer helper but still captures and indexes the declared matrix,
    // so an unindexed matrix would read as UNVERIFIED and weaken the visual gate.
    const off = validateConfig(uiStateCaptureConfig({ mode: 'off', helper: undefined, manifestPath: undefined }));
    assert.equal(off.valid, true, off.errors.join('; '));
    const offWarnings = off.warnings.filter(warning => warning.includes('uiStateCapture'));
    assert.ok(offWarnings.some(warning => warning.includes('uiStateCapture.manifestPath')), offWarnings.join('; '));
    assert.equal(offWarnings.some(warning => warning.includes('uiStateCapture.helper')), false, offWarnings.join('; '));
});

test('TC-E2E-CONFIG-023: every schema-accepted uiStateCapture mode and field has a defined meaning in the protocol', () => {
    const protocol = fs.readFileSync(path.join(repoRoot, '.claude', 'skills', 'shared', 'ui-state-capture-protocol.md'), 'utf8').replace(/\r\n/g, '\n');
    const section = protocol.split('\n## Configuration\n')[1]?.split('\n---\n')[0];
    assert.ok(section, 'protocol must keep a Configuration section');
    assert.ok(section.includes('e2eTesting.execution.evidence.uiStateCapture'), 'Configuration must name the config key it documents');

    const modeTable = section.split('**Modes**')[1]?.split('**Validation**')[0];
    assert.ok(modeTable, 'Configuration must keep its mode table');
    // Body rows only: the header row's first cell is the `mode` column name, not a mode.
    const modeRows = modeTable.split(/^\| --- .*$/m)[1] ?? '';
    const documentedModes = [...modeRows.matchAll(/^\| `([a-z-]+)` \|/gm)].map(match => match[1]);
    assert.deepEqual([...documentedModes].sort(), ['declared-only', 'every-action', 'off'], 'each mode is defined exactly once');
    for (const mode of documentedModes) {
        assert.deepEqual(uiStateCaptureErrors(validateConfig(uiStateCaptureConfig({ mode }))), [], `${mode} is documented but rejected`);
    }
    // `off` has one meaning that keeps the visual gate whole: the matrix is still captured and indexed.
    const offRow = modeRows.split('\n').find(row => row.startsWith('| `off` |')) ?? '';
    assert.match(offRow, /The §1\.4 matrix only \(`source: matrix`\), still indexed in the manifest; no transition captures/);
    assert.match(offRow, /a missing matrix capture stays `ENVIRONMENT-BLOCKED`\/`UNVERIFIED`/);
    assert.doesNotMatch(offRow, /No captures from this protocol/);

    for (const field of Object.keys(SCHEMA.e2eTesting.properties.execution.properties.evidence.properties.uiStateCapture.properties)) {
        assert.ok(section.includes(`| \`${field}\` |`), `Configuration must define the ${field} field`);
    }
});

// A carrier that tells an agent to capture every action without naming the mode makes
// `declared-only` and `off` read as a gate failure instead of a recorded blind spot or N/A.
// Units are prose paragraphs (a numbered list continues the paragraph that introduces it) and
// single table rows, so one qualified row cannot vouch for an unqualified sibling row.
function captureContractUnits(text) {
    const tableRow = line => /^\s*\|/.test(line);
    return text.replace(/\r\n/g, '\n').split(/\n\s*\n(?!\d+\. )/).flatMap(paragraph => {
        const lines = paragraph.split('\n');
        const prose = lines.filter(line => !tableRow(line)).join('\n');
        return [...lines.filter(tableRow), ...(prose.trim() ? [prose] : [])];
    });
}

// Any quantifier over the transition inventory, including "each relevant state, viewport, and
// state-changing transition"; the gap excludes sentence, cell, and clause boundaries.
const QUANTIFIED_TRANSITIONS = /\b(every|each|all|any)\b[^.|;\n]{0,40}\bstate-changing (action|transition|trigger)/i;
// The same contract phrased as a capture trigger or as a per-action gap listing; under `off` a gap
// listing would record every action as a blind spot instead of one N/A. Hard-wrapped prose is
// matched across line breaks.
const TRANSITION_CAPTURE_PHRASES = [
    /\bcapture after\s+(\*\*)?(any|every|each)(\*\*)?\s+action\b/i,
    /\bstate-changing\s+actions?\s+(in\s+the\s+journey\s+)?that\s+produced\s+(\*\*)?no(\*\*)?\s+capture/i,
    /\buncaptured\s+(state-changing\s+actions?|transitions?)\b/i
];
const MODE_TABLE_ROW = /^[ \t]*\|[ \t]*`(every-action|declared-only|off)`[ \t]*\|/;
const MODE_DISMISSED = /\b(regardless of|irrespective of|whatever)\b[^.|\n]{0,20}`?uiStateCapture\.mode/i;

function unqualifiedCaptureImperatives(text) {
    return captureContractUnits(text).filter(unit => (QUANTIFIED_TRANSITIONS.test(unit) || TRANSITION_CAPTURE_PHRASES.some(phrase => phrase.test(unit)))
        && (MODE_DISMISSED.test(unit) || !(unit.includes('uiStateCapture.mode') || MODE_TABLE_ROW.test(unit))));
}

// Wording that makes `off` drop the matrix, which would leave the default visual gate with
// nothing to review while it still reports a missing capture as ENVIRONMENT-BLOCKED.
const OFF_DROPS_MATRIX = [
    /`off` records `N\/A`/,
    /`off`[^.|\n]{0,40}\b(captures nothing|takes no (captures|screenshots)|skips (the|all) (captures|screenshots|matrix))/,
    /`off` (also )?drops the (§1\.4 )?(state × viewport )?matrix/,
    /No captures from this protocol/
];

// Audit both phrase-discovered carriers and the declared floors. A floor remains a
// consumer even when its wording becomes conditional and no longer matches the discovery phrase.
const CAPTURE_CARRIER_FLOOR = [
    '.claude/skills/shared/ui-state-capture-protocol.md',
    '.claude/skills/shared/e2e-quality-protocol.md',
    '.claude/skills/e2e-test/SKILL.md',
    '.claude/skills/e2e-test/references/mode-verify.md',
    '.claude/skills/workflow-e2e/SKILL.md',
    '.claude/skills/experience-review/SKILL.md',
    '.claude/agents/e2e-runner.md'
];

// A manual walk: `readdirSync({ recursive: true })` needs Node 18.17, below the declared engines floor.
// A MISSING root is not a broken walk: `.claude` is portable, so this suite also runs in an adopting
// project that has copied the bundle but not yet generated `docs/project-reference/**`. Throwing
// ENOENT there failed the whole `scripts-tests` stage on a project-owned directory the framework does
// not ship. `.claude/**` roots always exist in a copied bundle, so their absence still throws.
function markdownFiles(dir) {
    let entries;
    try {
        entries = fs.readdirSync(path.join(repoRoot, dir), { withFileTypes: true });
    } catch (error) {
        if (error.code === 'ENOENT' && !dir.startsWith('.claude/')) return [];
        throw error;
    }
    return entries.flatMap(entry => {
        const relative = path.posix.join(dir, entry.name);
        if (entry.isDirectory()) return markdownFiles(relative);
        return entry.isFile() && entry.name.endsWith('.md') ? [relative] : [];
    });
}

function captureCarriers(config = realConfig) {
    const projectReferenceRoot = getDocsRoot('projectReference', config);
    const discovered = ['.claude/skills', '.claude/agents', projectReferenceRoot].flatMap(markdownFiles)
        .filter(carrier => /state-changing (action|transition|trigger)/.test(fs.readFileSync(path.join(repoRoot, carrier), 'utf8')))
    // The project-reference E2E doc is a declared floor exactly like CAPTURE_CARRIER_FLOOR: it stays a
    // consumer after it delegates the contract to the shared protocol and its wording turns conditional,
    // so it must be audited even once it no longer matches the discovery phrase. Resolved from config so
    // a relocated root still works, and included only when present since project docs are optional.
    const floors = [...CAPTURE_CARRIER_FLOOR, path.posix.join(projectReferenceRoot, "e2e-test-reference.md")]
        .filter(carrier => fs.existsSync(path.join(repoRoot, carrier)));
    return [...new Set([...discovered, ...floors])].sort();
}

// Sensor row N4 (P26 scratch run). A converted skill carries a shared protocol as a guide line (the
// shared P25 recognizer, never a copied line format) and the hook delivers the projection file
// `<skills root>/shared/protocols/<tag>.md`. The delivered text joins that file only while the guide
// entry is present, so a skill that lost both forms reads as the bare skill and still fails.
const guideCarrier = require('../lib/protocol-guide-carrier.cjs');
function deliveredSkillText(relative, tag, root = repoRoot) {
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    if (text.includes(`<!-- SYNC:${tag} -->`) || !guideCarrier.hasGuideEntry(text, tag)) return text;
    const projection = path.join(root, '.claude', 'skills', 'shared', 'protocols', `${tag}.md`);
    return fs.existsSync(projection) ? `${text}\n${fs.readFileSync(projection, 'utf8')}` : text;
}

test('TC-PDL-065 the e2e-test non-vacuity mutant reads a guide carrier through its projection (N4)', () => {
    const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'n4-guide-'));
    try {
        // Given a skill that carries the visual contract only as a guide line, and its projection
        const tag = 'e2e-visual-design-contract';
        const skill = path.join(tmp, '.claude', 'skills', 'fx-e2e', 'SKILL.md');
        const projection = path.join(tmp, '.claude', 'skills', 'shared', 'protocols', `${tag}.md`);
        fs.mkdirSync(path.dirname(skill), { recursive: true });
        fs.mkdirSync(path.dirname(projection), { recursive: true });
        fs.writeFileSync(skill, ['# fx', guideCarrier.GUIDE_BLOCK_START, '',
            guideCarrier.formatGuideLine({ tag, summary: 'Visual evidence rules', when: 'handling visual review', path: `.claude/skills/shared/protocols/${tag}.md` }),
            '', guideCarrier.GUIDE_BLOCK_END, ''].join('\n'));
        fs.writeFileSync(projection, '> 5. Capture each state-changing transition under the configured `uiStateCapture.mode`.\n');
        const rel = '.claude/skills/fx-e2e/SKILL.md';
        const mutate = text => unqualifiedCaptureImperatives(text.replaceAll('uiStateCapture.mode', 'capture setting')).length;
        // When the qualifier is deleted from the delivered text, Then the mutant is caught
        assert.equal(unqualifiedCaptureImperatives(deliveredSkillText(rel, tag, tmp)).length, 0, 'the qualified projection passes as is');
        assert.equal(mutate(deliveredSkillText(rel, tag, tmp)), 1, 'the qualifier mutant must be caught through the projection');
        // When the projection is missing, Then nothing is joined and the mutant has nothing to catch
        fs.rmSync(projection);
        assert.equal(mutate(deliveredSkillText(rel, tag, tmp)), 0, 'no projection joins no text');
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});

test('TC-E2E-CONFIG-024: every capture-every-action imperative is qualified by uiStateCapture.mode', () => {
    const carriers = captureCarriers();
    const projectReferenceFloor = path.posix.join(getDocsRoot('projectReference', realConfig), 'e2e-test-reference.md');
    for (const floor of [...CAPTURE_CARRIER_FLOOR, projectReferenceFloor]) {
        const exists = fs.existsSync(path.join(repoRoot, floor));
        // `.claude/**` floors travel inside the copied bundle and must always exist. Project-owned
        // docs are optional in an adopting project, so audit them only when they are present.
        if (floor.startsWith('.claude/')) assert.ok(exists, `required carrier floor is missing: ${floor}`);
        else if (!exists) continue;
        assert.ok(carriers.includes(floor), `carrier discovery must reach ${floor}`);
    }
    for (const carrier of carriers) {
        const text = fs.readFileSync(path.join(repoRoot, carrier), 'utf8');
        assert.deepEqual(unqualifiedCaptureImperatives(text).map(unit => unit.slice(0, 160)), [], carrier);
        for (const wording of OFF_DROPS_MATRIX) assert.doesNotMatch(text, wording, carrier);
    }
    // The consumer that grades the contract must say what the non-default modes record.
    const verify = fs.readFileSync(path.join(repoRoot, '.claude/skills/e2e-test/references/mode-verify.md'), 'utf8');
    assert.match(verify, /Under `declared-only`[^.]*blind spot — never a FAIL/);
    assert.match(verify, /Under `off`, verify the matrix rows, manifest, and reads exactly as under `declared-only`, and record transition coverage once as `N\/A — uiStateCapture off: \{reason\}`/);
    assert.match(verify, /a missing (?:required )?matrix capture still fails it/);

    // Mutants: an unqualified imperative in any wording, a real carrier with its qualifier
    // deleted, and the pre-decision `off` wording must all be caught.
    for (const mutant of [
        'Instrument the helper so every UI-state-changing action emits a capture.',
        '**3. Cover every state-changing trigger**: navigation/route change.',
        'Capture each state-changing transition after its postcondition wait.',
        'Screenshots are taken for all state-changing actions in the journey.',
        'Missing any state-changing trigger is a gate failure.',
        'Capture every state-changing action regardless of `uiStateCapture.mode`.',
        // Round-5 R5-06: the capture trigger and the per-action gap listing, including hard-wrapped prose.
        'Capture after **any** action that can change what a user sees.',
        '4. **Report coverage gaps.** List the state-changing actions in the journey that produced **no** capture.',
        'Then list the state-changing actions that\nproduced no capture, plus anything capped out.',
        'Carry capture coverage (`reviewed/total`, uncaptured state-changing actions, caps hit).',
        // The pre-fix shared quality-gate row (round-4 F-4).
        '| Accessibility/responsive/visual (when relevant) | Applicable states are declared | Each relevant state, viewport, and state-changing transition is observed | Captures are emitted from the shared action layer |'
    ]) {
        assert.equal(unqualifiedCaptureImperatives(mutant).length, 1, `an unqualified imperative must be caught: ${mutant}`);
    }
    // One qualified row must not vouch for an unqualified sibling in the same table.
    const table = [
        '| Gate | Then |',
        '| --- | --- |',
        '| Visual | Follow the resolved `uiStateCapture.mode` for transitions |',
        '| Evidence | Capture every state-changing action |'
    ].join('\n');
    assert.deepEqual(unqualifiedCaptureImperatives(table), ['| Evidence | Capture every state-changing action |']);
    assert.deepEqual(
        unqualifiedCaptureImperatives('| `declared-only`       | State × viewport matrix only; no transition captures. Record every state-changing action as an uncaptured-transition blind spot.'),
        [],
        'a padded Markdown mode row keeps its own transition qualification'
    );
    // The real carrier is the text a model reads for e2e-test: the skill, plus the projection of its
    // visual contract once that contract is carried as a guide line (sensor row N4).
    const e2eTest = deliveredSkillText('.claude/skills/e2e-test/SKILL.md', 'e2e-visual-design-contract');
    assert.ok(unqualifiedCaptureImperatives(e2eTest.replaceAll('uiStateCapture.mode', 'capture setting')).length > 0,
        'deleting the mode qualifier from a real carrier must be caught');
    // Restoring the pre-fix shared quality-gate row inside the real table must be caught in place.
    const qualityGate = fs.readFileSync(path.join(repoRoot, '.claude/skills/shared/e2e-quality-protocol.md'), 'utf8');
    const visualRow = qualityGate.split(/\r?\n/).find(line => line.startsWith('| Accessibility/responsive/visual (when relevant) |'));
    assert.ok(visualRow, 'the shared quality gate keeps its visual row');
    assert.ok(unqualifiedCaptureImperatives(qualityGate.replace(visualRow,
        '| Accessibility/responsive/visual (when relevant) | Applicable states, viewports/devices, design authority, and the UI-state-changing action inventory are declared | Each relevant state, viewport, and state-changing transition is observed | Controls remain usable/readable/responsive; captures are emitted from the shared action layer and indexed in a manifest |')).length > 0,
        'the pre-fix quality-gate row must be caught inside the real table');
    // Deleting the `off` qualifier from the protocol's own gap-listing pass must be caught in place.
    const captureProtocol = fs.readFileSync(path.join(repoRoot, '.claude/skills/shared/ui-state-capture-protocol.md'), 'utf8');
    const gapQualifier = ' — under `uiStateCapture.mode: off`, record transition coverage once as `N/A — uiStateCapture off: {reason}` instead of listing each action, and still list capped/sampled-out matrix captures';
    assert.ok(captureProtocol.includes(gapQualifier), 'the protocol gap-listing pass carries its off qualifier');
    assert.ok(unqualifiedCaptureImperatives(captureProtocol.replace(gapQualifier, '')).length > 0,
        'an unqualified per-action gap listing must be caught inside the real protocol');
    for (const wording of [
        '`declared-only` records blind spots; `off` records `N/A`)',
        'Under `off` the suite captures nothing.',
        '`off` also drops the §1.4 matrix and its manifest.'
    ]) {
        assert.ok(OFF_DROPS_MATRIX.some(pattern => pattern.test(wording)), `the pre-decision off wording must be caught: ${wording}`);
    }
    // The decided `off` meaning itself must never read as a matrix drop.
    assert.equal(OFF_DROPS_MATRIX.some(pattern => pattern.test('`off` records transition coverage once as `N/A — uiStateCapture off: {reason}`')), false);
});

test('TC-E2E-CONFIG-025: carrier discovery follows a relocated project-reference root', () => {
    // Given: a valid adopter config points its project references to a non-default root.
    const tempRoot = path.join(repoRoot, 'tmp');
    fs.mkdirSync(tempRoot, { recursive: true });
    const fixtureRoot = fs.mkdtempSync(path.join(tempRoot, 'experience-reference-root-'));
    try {
        const relativeRoot = path.relative(repoRoot, fixtureRoot).split(path.sep).join('/');
        const fixtureDoc = path.join(fixtureRoot, 'e2e-test-reference.md');
        fs.writeFileSync(fixtureDoc, '# Relocated E2E reference\n\nCapture every state-changing action after its postcondition.\n', 'utf8');
        const config = {
            ...realConfig,
            docsRoots: {
                ...(realConfig.docsRoots || {}),
                projectReference: { path: relativeRoot }
            }
        };
        const carrier = path.posix.join(relativeRoot, 'e2e-test-reference.md');

        // When: the suite resolves the configured root and searches its carrier inventory.
        const carriers = captureCarriers(config);

        // Then: it reaches the relocated doc and the existing imperative detector still flags it.
        assert.equal(getDocsRoot('projectReference', config), relativeRoot);
        assert.ok(carriers.includes(carrier), 'the configured project-reference tree must be scanned');
        assert.equal(unqualifiedCaptureImperatives(fs.readFileSync(path.join(repoRoot, carrier), 'utf8')).length, 1);
        assert.equal(carriers.includes('docs/project-reference/e2e-test-reference.md'), false,
            'a configured relocation must not silently fall back to the default root');
    } finally {
        fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
});
