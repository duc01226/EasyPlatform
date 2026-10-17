import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { validateConfig } = require('../../hooks/lib/project-config-schema.cjs');
const { getSpecArtifactProfile } = require('../../hooks/lib/project-config-loader.cjs');
const { resolveSpecArtifactProfile, matchesSpecArtifactIdentifier, SpecArtifactProfileError, PROFILE_LIMITS } = require('../../hooks/lib/spec-artifact-profile.cjs');

// Project config has two separate contracts: the project identity is required, while individual
// capability sections may be omitted and resolve to documented defaults/skips. The runtime loader
// remains fail-soft for optional consumers, but UserPromptSubmit requires a schema-valid file
// before normal work; this suite protects schema and declared-adapter validation.
//
// This suite lives under the existing `scripts-tests` stage of `npm run verify:all`
// (`run-codex-sync.mjs` stage `scripts-tests` expands `.claude/scripts/tests/*.test.{mjs,cjs}`),
// rather than as a 20th pipeline stage: `verifier-pipeline-wiring.test.mjs:22` pins the roster at
// 19 stages and `:38` pins the matching prose in the MIRRORED `sync-codex/SKILL.md`, so a new
// stage would turn `codex:verify:sync-divergence` red until the user re-runs `/sync-codex`.
//
// Granular surface: `npm run codex:verify:project-config`.

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..');
const schemaCli = path.join(repoRoot, '.claude', 'hooks', 'lib', 'project-config-schema.cjs');

const validate = configPath =>
    spawnSync(process.execPath, [schemaCli, '--validate', configPath], {
        cwd: repoRoot,
        encoding: 'utf-8',
        windowsHide: true
    });

const profileFixturePath = path.join(repoRoot, '.claude', 'hooks', 'tests', 'docs', 'project-config.json');

function profileFixtureConfig() {
    assert.ok(fs.existsSync(profileFixturePath), 'the portable project-config fixture must exist');
    return JSON.parse(fs.readFileSync(profileFixturePath, 'utf-8'));
}

function standardProfile() {
    return {
        version: 1,
        kind: 'engineering-contract',
        sections: {
            intent: ['Purpose', 'Scope', 'Problem Statement', 'Normative Contract', 'Acceptance Criteria', 'Risks and Mitigations', 'Open Questions', 'Known Issues / Downstream Gaps'],
            contracts: ['Interfaces and Data Contracts', 'Delivery'],
            evidence: ['Verification', 'Test Coverage', 'Scenario Contracts', 'Scenario contracts (ADR-127: in Vitest)']
        },
        identifiers: {
            requirement: { prefix: 'REQ-', grammar: 'decimal-lower-suffix' },
            acceptance: { prefix: 'AC-', grammar: 'decimal-lower-suffix' },
            scenario: { prefix: 'SCN-', grammar: 'hyphen-tokens' }
        },
        ownership: 'spec-path-and-case-id',
        carriers: [
            { dialect: 'js-title-v1', roots: ['packages', 'tests'], extensions: ['.test.ts', '.test.tsx', '.spec.ts'], suiteCalls: ['describe'], caseCalls: ['it', 'test'] },
            { dialect: 'js-keyed-cases-v1', roots: ['packages', 'tests'], extensions: ['.test.ts', '.test.tsx', '.spec.ts'], binding: 'cases', fields: { variant: 'id', scenario: 'scn', requirements: 'reqs', rationale: 'why', input: 'input' } },
            { dialect: 'yaml-cases-v1', roots: ['specs'], extensions: ['.yaml', '.yml'], fields: { scenario: 'id', status: 'status', requirements: 'covers.requirements', acceptance: 'covers.acceptance_criteria', lists: ['cases', 'reconciliation'], variant: 'id', input: 'input', expected: 'expected' } }
        ]
    };
}

function configWithProfile(profile) {
    return { ...profileFixtureConfig(), specArtifacts: profile };
}

function assertProfileInvalid(profile, expectedPath) {
    const config = configWithProfile(profile);
    assert.throws(
        () => resolveSpecArtifactProfile(config),
        error => error instanceof SpecArtifactProfileError && error.code === 'ERR_SPEC_ARTIFACT_PROFILE' && error.path === expectedPath
    );
    const result = validateConfig(config);
    assert.equal(result.valid, false, result.errors.join('; '));
    assert.ok(result.errors.some(error => error.startsWith(expectedPath)), result.errors.join('; '));
}

const realConfigPath = path.join(repoRoot, 'docs', 'project-config.json');
const readRealConfig = () => {
    try {
        return JSON.parse(fs.readFileSync(realConfigPath, 'utf-8'));
    } catch {
        return null;
    }
};

test('TC-DOCROOT-011: the required docs/project-config.json exists and passes --validate', () => {
    assert.ok(fs.existsSync(realConfigPath), 'every adopting project must initialize its required project config');
    const result = validate(realConfigPath);
    assert.equal(result.status, 0, `--validate failed:\n${result.stdout}${result.stderr}`);
});

test('TC-CONFIG-REQUIRED-001: project identity is required while capability sections may be omitted', () => {
    // Given: a project with no discovered stack or optional capability metadata.
    // When: the required config contract validates minimal, missing, and blank identities.
    // Then: only a non-empty project identity is required for the file to be valid.
    // Business Intent / Invariant Guarded: every workflow has a canonical project config without inventing stack details.
    // Failure Signal: missing/blank identity passes, or an omitted capability fails validation.
    const minimal = validateConfig({ project: { name: 'Minimal CLI Project' } });
    assert.equal(minimal.valid, true, minimal.errors.join('; '));

    const missingIdentity = validateConfig({});
    assert.equal(missingIdentity.valid, false);
    assert.ok(missingIdentity.errors.some(error => error.startsWith('project:')));

    const blankIdentity = validateConfig({ project: { name: '  ' } });
    assert.equal(blankIdentity.valid, false);
    assert.ok(blankIdentity.errors.some(error => error.startsWith('project.name:')));
});

test('TC-CONFIG-REQUIRED-002: an omitted capability is valid, but a declared incomplete capability fails visibly', () => {
    // Given: optional framework and design-system capabilities may be absent.
    // When: either capability is declared without its required fields.
    // Then: omission passes while an incomplete declaration reports its owning field.
    // Business Intent / Invariant Guarded: optional configuration stays optional without silently accepting broken adapters.
    // Failure Signal: absence fails or a partial declared capability validates.
    assert.equal(validateConfig({ project: { name: 'Minimal Project' } }).valid, true);

    const declaredFramework = validateConfig({ project: { name: 'Minimal Project' }, framework: {} });
    assert.equal(declaredFramework.valid, false);
    assert.ok(declaredFramework.errors.some(error => error.startsWith('framework.name:')));

    const declaredDesignSystem = validateConfig({ project: { name: 'Minimal Project' }, designSystem: {} });
    assert.equal(declaredDesignSystem.valid, false);
    assert.ok(declaredDesignSystem.errors.some(error => error.startsWith('designSystem.')));
});

test('TC-REFERENCE-DOCS-001: custom scan ownership is optional, explicit, and path-contained', () => {
    const minimal = { project: { name: 'Reference Docs Project' } };
    const generic = validateConfig({
        ...minimal,
        referenceDocs: [{
            filename: 'guides/architecture.md',
            purpose: 'Evidence-based architecture and module guide',
            sections: ['Observed structure', 'Trade-offs'],
            scanTarget: 'generic'
        }]
    });
    assert.equal(generic.valid, true, generic.errors.join('; '));

    const manual = validateConfig({
        ...minimal,
        referenceDocs: [{ filename: 'guides/operations.md', purpose: 'Curated operator-owned guide' }]
    });
    assert.equal(manual.valid, true, manual.errors.join('; '));

    const invalidTargets = ['auto', 'scan --target=backend-patterns', '', null];
    for (const scanTarget of invalidTargets) {
        const invalid = validateConfig({
            ...minimal,
            referenceDocs: [{ filename: 'guides/architecture.md', purpose: 'Guide', scanTarget }]
        });
        assert.equal(invalid.valid, false, `unsupported scanTarget ${JSON.stringify(scanTarget)} must fail`);
        assert.ok(invalid.errors.some(error => error.includes('referenceDocs[0].scanTarget')));
    }

    const builtInOverride = validateConfig({
        ...minimal,
        referenceDocs: [{ filename: 'backend-patterns-reference.md', purpose: 'Built-in', scanTarget: 'manual' }]
    });
    assert.equal(builtInOverride.valid, false, 'built-in scan ownership cannot be silently reinterpreted');

    for (const filename of ['../outside.md', 'guides/../outside.md', '/outside.md', 'C:/outside.md', 'guides\\outside.md', 'guides//outside.md']) {
        const invalid = validateConfig({
            ...minimal,
            referenceDocs: [{ filename, purpose: 'Unsafe path', scanTarget: 'generic' }]
        });
        assert.equal(invalid.valid, false, `${filename} must be rejected`);
        assert.ok(invalid.errors.some(error => error.includes('referenceDocs[0].filename')));
    }

    const unsafeTemplate = validateConfig({
        ...minimal,
        referenceDocs: [{ filename: 'guide.md', purpose: 'Guide', templatePath: '../outside.md' }]
    });
    assert.equal(unsafeTemplate.valid, false);
    assert.ok(unsafeTemplate.errors.some(error => error.includes('referenceDocs[0].templatePath')));

    const unsafeFeatureTemplate = validateConfig({
        ...minimal,
        workflowPatterns: { featureDocTemplate: '../outside.md' }
    });
    assert.equal(unsafeFeatureTemplate.valid, false);
    assert.ok(unsafeFeatureTemplate.errors.some(error => error.startsWith('workflowPatterns.featureDocTemplate:')));
});

test('TC-DOCROOT-012: the hooks test fixture config passes --validate (R14, every new key optional)', () => {
    const fixture = path.join(repoRoot, '.claude', 'hooks', 'tests', 'docs', 'project-config.json');
    assert.ok(fs.existsSync(fixture), 'the second fixture config must exist');
    const parsed = JSON.parse(fs.readFileSync(fixture, 'utf-8'));
    assert.equal(parsed.specRoots, undefined, 'fixture must keep declaring no specRoots');
    assert.equal(parsed.docsRoots, undefined, 'fixture must keep declaring no docsRoots');
    const result = validate(fixture);
    assert.equal(result.status, 0, `--validate failed:\n${result.stdout}${result.stderr}`);
});

test('TC-DOCROOT-015: --validate exits NON-ZERO on a declared docsRoots path that escapes the repo root', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-pcfg-'));
    try {
        // The real config is only a realistic BASE; use a minimal valid identity when this test
        // runs outside a configured adopter so the asserted docsRoots defect stays discriminating.
        const source = readRealConfig() ?? { project: { name: 'Fixture Project' } };
        const bad = path.join(dir, 'project-config.json');
        fs.writeFileSync(bad, JSON.stringify({ ...source, docsRoots: { plans: { path: '../escape' } } }), 'utf-8');

        const result = validate(bad);
        assert.notEqual(result.status, 0, 'an escaping declared root must fail the build');
        assert.match(result.stdout, /docsRoots\.plans\.path/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('TC-DOCROOT-006: --validate exits NON-ZERO on a partially declared docsRoots sub-object', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-pcfg-'));
    try {
        const source = readRealConfig() ?? { project: { name: 'Fixture Project' } };
        const bad = path.join(dir, 'project-config.json');
        fs.writeFileSync(bad, JSON.stringify({ ...source, docsRoots: { adr: {} } }), 'utf-8');

        const result = validate(bad);
        assert.notEqual(result.status, 0, 'partial declaration is an error, not a silent default');
        assert.match(result.stdout, /docsRoots\.adr\.path/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('TC-FIT-PROFILE-001: absent profile retains the legacy business-spec defaults', () => {
    // Given: a valid legacy project config with no declared native artifact profile.
    // When: the shared resolver and validation plane inspect it.
    // Then: native resolution stays absent and strict-default validation remains valid.
    // Business Intent / Invariant Guarded: absence preserves the established strict contract rather than inventing a native format.
    // Failure Signal: any synthesized profile or validation failure changes the expected compatibility path.
    const legacy = profileFixtureConfig();
    delete legacy.specArtifacts;
    assert.equal(resolveSpecArtifactProfile(legacy), null);
    assert.equal(getSpecArtifactProfile(legacy), null);
    assert.equal(validateConfig(legacy).valid, true);
});

test('TC-FIT-PROFILE-002: the local native profile normalizes immutably and accepts its identifier grammar', () => {
    // Given: a native profile with a YAML carrier and no explicit lifecycle-value list.
    // When: the shared resolver normalizes and freezes the profile.
    // Then: the compatibility status default, identifier grammar, and input immutability hold.
    // Business Intent / Invariant Guarded: legacy profiles stay valid while local identifiers remain explicit.
    // Failure Signal: altered IDs, mutable output, or a changed default status breaks the assertions.
    const profile = standardProfile();
    profile.sections.intent[0] = '  Purpose\n';
    const supplied = JSON.parse(JSON.stringify(profile));
    const config = configWithProfile(profile);
    const normalized = resolveSpecArtifactProfile(config);

    assert.equal(normalized.sections.intent[0], 'Purpose');
    assert.equal(Object.isFrozen(normalized), true);
    assert.equal(Object.isFrozen(normalized.sections.intent), true);
    assert.equal(Object.isFrozen(normalized.carriers[1].fields), true);
    assert.deepEqual(normalized.carriers[2].acceptedStatuses, ['approved'], 'legacy YAML profiles keep the compatibility status');
    assert.deepEqual(profile, supplied, 'resolution must not mutate caller-owned config');
    assert.deepEqual(resolveSpecArtifactProfile({ specArtifacts: normalized }), normalized, 'normalization must be idempotent');
    assert.equal(validateConfig(config).valid, true);
    assert.equal(matchesSpecArtifactIdentifier(normalized, 'requirement', 'REQ-9'), true);
    assert.equal(matchesSpecArtifactIdentifier(normalized, 'acceptance', 'AC-002a'), true);
    assert.equal(matchesSpecArtifactIdentifier(normalized, 'acceptance', 'AC-002abz'), true);
    assert.equal(matchesSpecArtifactIdentifier(normalized, 'scenario', 'SCN-ARV-009'), true);
    for (const invalid of ['REQ-', 'REQ-001A', 'req-001', 'REQ-١', 'REQ-1_', 'REQ-1.0', 'REQ-1-2']) {
        assert.equal(matchesSpecArtifactIdentifier(normalized, 'requirement', invalid), false, invalid);
    }
    for (const invalid of ['SCN-', 'SCN-A--B', 'SCN-_A', 'SCN-é']) {
        assert.equal(matchesSpecArtifactIdentifier(normalized, 'scenario', invalid), false, invalid);
    }
    for (const digit of '0123456789') assert.equal(matchesSpecArtifactIdentifier(normalized, 'requirement', 'REQ-' + digit), true);
    for (const suffix of 'abcdefghijklmnopqrstuvwxyz') assert.equal(matchesSpecArtifactIdentifier(normalized, 'acceptance', 'AC-1' + suffix), true);
    for (const suffix of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') assert.equal(matchesSpecArtifactIdentifier(normalized, 'acceptance', 'AC-1' + suffix), false);
    for (const token of '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz') assert.equal(matchesSpecArtifactIdentifier(normalized, 'scenario', 'SCN-' + token), true);
    assert.equal(matchesSpecArtifactIdentifier(normalized, 'scenario', 'SCN-A-9'), true, 'hyphen separates nonempty alphanumeric tokens');
    const maxId = 'REQ-' + '1'.repeat(PROFILE_LIMITS.identifierLength - 'REQ-'.length);
    assert.equal(matchesSpecArtifactIdentifier(normalized, 'requirement', maxId), true);
    assert.equal(matchesSpecArtifactIdentifier(normalized, 'requirement', maxId + 'a'), false);
    const maxSuffix = 'AC-1' + 'a'.repeat(PROFILE_LIMITS.identifierLength - 'AC-1'.length);
    assert.equal(matchesSpecArtifactIdentifier(normalized, 'acceptance', maxSuffix), true);
    assert.equal(matchesSpecArtifactIdentifier(normalized, 'acceptance', maxSuffix + 'a'), false);

    const prefixBoundary = standardProfile();
    prefixBoundary.identifiers.requirement.prefix = 'A'.repeat(PROFILE_LIMITS.prefixLength - 1) + '-';
    const boundaryProfile = resolveSpecArtifactProfile({ specArtifacts: prefixBoundary });
    assert.equal(matchesSpecArtifactIdentifier(boundaryProfile, 'requirement', prefixBoundary.identifiers.requirement.prefix + '1'), true);
    prefixBoundary.identifiers.requirement.prefix = 'A'.repeat(PROFILE_LIMITS.prefixLength) + '-';
    assert.throws(() => resolveSpecArtifactProfile({ specArtifacts: prefixBoundary }), error => error.path === 'specArtifacts.identifiers.requirement.prefix');
});

test('TC-FIT-PROFILE-003: an unrelated adopter can relocate roots and configure literal prefixes', () => {
    // Given: an adopter with different spec/test roots, ID prefixes, and accepted YAML lifecycle status.
    // When: the shared profile resolver normalizes its declarations.
    // Then: the relocated roots, identifiers, and `reviewed` value are preserved.
    // Business Intent / Invariant Guarded: project-specific locations and vocabulary stay in configuration.
    // Failure Signal: any one adopter's root, identifier, or status value changes the expected profile.
    const profile = standardProfile();
    profile.identifiers.requirement.prefix = 'NEED-';
    profile.identifiers.acceptance.prefix = 'ACCEPT-';
    profile.identifiers.scenario.prefix = 'CASE-';
    profile.carriers[0].roots = ['Application', 'Unit-Tests'];
    profile.carriers[1].roots = ['Application', 'Unit-Tests'];
    profile.carriers[2].roots = ['Specifications'];
    profile.carriers[2].acceptedStatuses = ['reviewed'];
    const config = configWithProfile(profile);
    const normalized = resolveSpecArtifactProfile(config);

    assert.equal(validateConfig(config).valid, true);
    assert.deepEqual(normalized.carriers.map(carrier => carrier.roots), [['Application', 'Unit-Tests'], ['Application', 'Unit-Tests'], ['Specifications']]);
    assert.deepEqual(normalized.carriers[2].acceptedStatuses, ['reviewed']);
    assert.equal(matchesSpecArtifactIdentifier(normalized, 'requirement', 'NEED-004'), true);
    assert.equal(matchesSpecArtifactIdentifier(normalized, 'acceptance', 'ACCEPT-002b'), true);
    assert.equal(matchesSpecArtifactIdentifier(normalized, 'scenario', 'CASE-login-01'), true);
});

test('TC-FIT-PROFILE-004: invalid versions, mappings, roles, paths and incompatible overlaps fail closed', () => {
    // Given: malformed status sets, incompatible overlapping carriers, and other invalid profile declarations.
    // When: runtime and configuration validation resolve each profile.
    // Then: each malformed profile fails at its precise configuration path.
    // Business Intent / Invariant Guarded: ambiguous lifecycle eligibility cannot silently select evidence.
    // Failure Signal: a malformed profile normalizes or does not report the expected path.
    const cases = [
        [profile => { profile.version = 2; }, 'specArtifacts.version'],
        [profile => { profile.unknown = true; }, 'specArtifacts.unknown'],
        [profile => { profile.carriers[0].dialect = 'regex'; }, 'specArtifacts.carriers[0].dialect'],
        [profile => { profile.carriers[0].dialect = '__proto__'; }, 'specArtifacts.carriers[0].dialect'],
        [profile => { profile.carriers[0].dialect = 'constructor'; }, 'specArtifacts.carriers[0].dialect'],
        [profile => { profile.sections.intent = []; }, 'specArtifacts.sections.intent'],
        [profile => { delete profile.sections.intent; }, 'specArtifacts.sections.intent'],
        [profile => { profile.sections.contracts.push('Purpose'); }, 'specArtifacts.sections.contracts'],
        [profile => { profile.identifiers.requirement.grammar = 'regex'; }, 'specArtifacts.identifiers.requirement.grammar'],
        [profile => { profile.carriers[2].roots[0] = '../outside'; }, 'specArtifacts.carriers[2].roots[0]'],
        [profile => { profile.carriers[2].roots[0] = '/outside'; }, 'specArtifacts.carriers[2].roots[0]'],
        [profile => { profile.carriers[2].roots[0] = 'C:/outside'; }, 'specArtifacts.carriers[2].roots[0]'],
        [profile => { profile.carriers[2].acceptedStatuses = []; }, 'specArtifacts.carriers[2].acceptedStatuses'],
        [profile => { profile.carriers[2].acceptedStatuses = ['approved', 'approved']; }, 'specArtifacts.carriers[2].acceptedStatuses[1]'],
        [profile => { profile.carriers.push({ ...profile.carriers[2], roots: ['specs/other'], acceptedStatuses: ['ready'] }); }, 'specArtifacts.carriers[3]'],
        [profile => { delete profile.carriers[2].fields.acceptance; }, 'specArtifacts.carriers[2].fields.acceptance'],
        [profile => { profile.carriers[2].fields.extra = 'ignored'; }, 'specArtifacts.carriers[2].fields.extra'],
        [profile => { profile.carriers.push({ ...profile.carriers[1], fields: { ...profile.carriers[1].fields, rationale: 'reason' } }); }, 'specArtifacts.carriers[3]']
    ];
    for (const [mutate, path] of cases) {
        const profile = standardProfile();
        mutate(profile);
        assertProfileInvalid(profile, path);
    }

    const malformed = configWithProfile(null);
    assert.equal(getSpecArtifactProfile(malformed), null, 'the runtime loader must stay fail-soft');
    assert.equal(validateConfig(malformed).valid, false, 'the validation plane must reject a declared null profile');
});

test('TC-FIT-PROFILE-006: aliases that collide under case-insensitive consumer matching fail closed', () => {
    // Given: two configured section aliases that differ only by case.
    // When: the shared profile normalizer checks a consumer's case-insensitive heading match.
    // Then: it rejects the ambiguous alias set at the owning config path.
    // Business Intent / Invariant Guarded: one source heading cannot map to multiple profile roles.
    // Failure Signal: a normalized profile or imprecise error path permits ambiguous ownership.
    const profile = standardProfile();
    profile.sections.contracts.push('purpose');
    assertProfileInvalid(profile, 'specArtifacts.sections.contracts');
});

test('TC-FIT-PROFILE-005: the schema CLI rejects an invalid declared profile', () => {
    // Given: a project config with an unsupported identifier grammar.
    // When: the public schema CLI validates the declared profile.
    // Then: validation exits non-zero and identifies the invalid grammar field.
    // Business Intent / Invariant Guarded: declared profiles fail closed on the validation plane.
    // Failure Signal: a zero exit or missing field path accepts unsupported matching behavior.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-spec-profile-'));
    try {
        const invalid = configWithProfile(standardProfile());
        invalid.specArtifacts.identifiers.requirement.grammar = '^REQ-[0-9]+$';
        const file = path.join(dir, 'project-config.json');
        fs.writeFileSync(file, JSON.stringify(invalid), 'utf-8');
        const result = validate(file);
        assert.notEqual(result.status, 0, 'an invalid declared profile must fail --validate');
        assert.match(result.stdout, /specArtifacts\.identifiers\.requirement\.grammar/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('TC-STARTUP-SCHEMA-001: startup install and Windows Git policies accept documented values and fail closed on malformed ones', () => {
    // Given: the portable startup-install and Windows Git policy surfaces.
    // When: the shared project-config schema validates their declared values.
    // Then: documented enum/boolean values are accepted and malformed policy cannot silently enable a path.
    // Business Intent / Invariant Guarded: host repair and startup execution remain explicit, typed policy.
    // Failure Signal: an invalid manager or non-boolean policy value validates successfully.
    const base = { project: { name: 'Startup Fixture' } };
    for (const hooks of [
        undefined,
        { windowsGit: {} },
        { windowsGit: { enabled: true, autoRepair: true } },
        { windowsGit: { enabled: false, autoRepair: false } }
    ]) {
        const result = validateConfig(hooks === undefined ? base : { ...base, hooks });
        assert.equal(result.valid, true, `Windows Git default/boolean policy must validate: ${result.errors.join('; ')}`);
    }

    for (const packageManager of ['auto', 'npm', 'pnpm', 'yarn', 'bun']) {
        const result = validateConfig({
            ...base,
            hooks: {
                startupInstall: { enabled: true, packageManager, allowLifecycleScripts: false },
                windowsGit: { enabled: true, autoRepair: true }
            }
        });
        assert.equal(result.valid, true, `${packageManager}: ${result.errors.join('; ')}`);
    }

    for (const packageManager of ['', 'NPM', 'npm@10.0.0', 'deno', 1]) {
        const result = validateConfig({ ...base, hooks: { startupInstall: { packageManager } } });
        assert.equal(result.valid, false, `invalid manager ${JSON.stringify(packageManager)} must fail`);
        assert.ok(result.errors.some(error => error.startsWith('hooks.startupInstall.packageManager:')));
    }

    for (const [path, value] of [
        ['enabled', 'true'],
        ['enabled', 1],
        ['allowLifecycleScripts', 'true'],
        ['allowLifecycleScripts', []],
        ['windowsGit.enabled', 'true'],
        ['windowsGit.autoRepair', 1]
    ]) {
        const hooks = { startupInstall: {} };
        if (path.startsWith('windowsGit.')) {
            hooks.windowsGit = { [path.slice('windowsGit.'.length)]: value };
        } else {
            hooks.startupInstall[path] = value;
        }
        const result = validateConfig({ ...base, hooks });
        assert.equal(result.valid, false, `${path}=${JSON.stringify(value)} must fail`);
        const errorPath = path.startsWith('windowsGit.') ? `hooks.${path}` : `hooks.startupInstall.${path}`;
        assert.ok(result.errors.some(error => error.startsWith(`${errorPath}:`)));
    }
});
