import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const verifier = path.join(repoRoot, '.claude', 'scripts', 'codex', 'verify-feature-registry.mjs');
const temporaryRoots = [];

after(async () => {
    await Promise.all(temporaryRoots.map(root => fs.rm(root, { recursive: true, force: true })));
});

async function makeRoot(configuredRoots, { configPath = 'docs/project-config.json', specDirectory = 'docs/specs/Fixture' } = {}) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'feature-registry-cli-'));
    temporaryRoots.push(root);
    await fs.mkdir(path.join(root, ...specDirectory.split('/')), { recursive: true });
    const projectConfigPath = path.join(root, ...configPath.split('/'));
    await fs.mkdir(path.dirname(projectConfigPath), { recursive: true });
    await fs.writeFile(projectConfigPath, JSON.stringify({ specSystem: { featureRegistryRoots: configuredRoots } }), 'utf8');
    if (configPath !== 'docs/project-config.json') {
        await fs.mkdir(path.join(root, '.claude'), { recursive: true });
        await fs.writeFile(path.join(root, '.claude', '.ck.json'), JSON.stringify({ portability: { projectConfigPath: configPath } }), 'utf8');
    }
    return root;
}

function runConfigured(root) {
    return spawnSync(process.execPath, [verifier, `--root=${root}`, '--configured-roots'], {
        cwd: root,
        encoding: 'utf8'
    });
}

function runOptionalConfigured(root) {
    return spawnSync(process.execPath, [verifier, `--root=${root}`, '--configured-roots', '--optional'], {
        cwd: root,
        encoding: 'utf8'
    });
}

const parentSpec = [
    '---',
    'feature_code: FIXTURE',
    'tc_status_summary: Tested=0, Untested=2',
    '---',
    '# Fixture',
    '[Part 2](README.FixtureFeature-Part2.md)',
    '## 4. Business Rules',
    '| Rule ID | Name |',
    '| --- | --- |',
    '| **BR-FIXTURE-01** | Fixture rule |',
    '## 8. Test Specifications',
    '### TC-FIXTURE-001: Parent case',
    '> **CoveredBy:** Untested · **Status:** Untested',
    ''
].join('\n');

const continuationSpec = [
    '---',
    'feature_code: FIXTURE',
    'parent_spec: README.FixtureFeature.md',
    '---',
    '# Fixture Part 2',
    '[Parent](README.FixtureFeature.md)',
    '### TC-FIXTURE-002: Continuation case',
    '> **CoveredBy:** Untested · **Status:** Planned',
    ''
].join('\n');

test('TC-FREG-CLI-001: configured canonical roots include every continuation part', async () => {
    const configuredParent = 'docs/specs/Fixture/README.FixtureFeature.md';
    const root = await makeRoot([configuredParent]);
    await fs.writeFile(path.join(root, configuredParent), parentSpec, 'utf8');
    await fs.writeFile(path.join(root, 'docs', 'specs', 'Fixture', 'README.FixtureFeature-Part2.md'), continuationSpec, 'utf8');

    const result = runConfigured(root);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /PASS \(2 canonical TC definitions\)/);
});

test('TC-FREG-CLI-006: sibling configured roots in one directory parse each document once', async () => {
    // Given: two canonical parents share a directory, so both roots discover the same files.
    const configuredParent = 'docs/specs/Fixture/README.FixtureFeature.md';
    const siblingParent = 'docs/specs/Fixture/README.SiblingFeature.md';
    const root = await makeRoot([configuredParent, siblingParent]);
    await fs.writeFile(path.join(root, configuredParent), parentSpec, 'utf8');
    await fs.writeFile(path.join(root, 'docs', 'specs', 'Fixture', 'README.FixtureFeature-Part2.md'), continuationSpec, 'utf8');
    await fs.writeFile(path.join(root, siblingParent), [
        '---',
        'feature_code: SIBLING',
        '---',
        '# Sibling',
        '## 8. Test Specifications',
        '### TC-SIBLING-001: Sibling case',
        '> **CoveredBy:** Untested · **Status:** Untested',
        ''
    ].join('\n'), 'utf8');

    // When: verify in configured-roots mode.
    const result = runConfigured(root);

    // Then: no DUPLICATE_TC_ID from repeated discovery; every definition counted exactly once.
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stderr, /DUPLICATE_(TC|BR)_ID/);
    assert.match(result.stdout, /PASS \(3 canonical TC definitions\)/);
});

test('TC-FREG-CLI-002: a configured root with no canonical parent or parts fails closed', async () => {
    const missing = 'docs/specs/Fixture/README.MissingFeature.md';
    const root = await makeRoot([missing]);

    const result = runConfigured(root);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Configured feature-registry root\(s\) not found/);
    assert.match(result.stderr, /README\.MissingFeature\.md/);
});

test('TC-FREG-CLI-003: configured mode rejects a missing adoption list', async () => {
    const root = await makeRoot([]);

    const result = runConfigured(root);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /specSystem\.featureRegistryRoots must be a non-empty list/);
});

test('TC-FREG-CLI-005: optional configured mode skips when the adoption contract is absent', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'feature-registry-cli-optional-'));
    temporaryRoots.push(root);
    await fs.mkdir(path.join(root, 'docs'), { recursive: true });
    await fs.writeFile(path.join(root, 'docs', 'project-config.json'), JSON.stringify({}), 'utf8');

    const result = runOptionalConfigured(root);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /SKIP \(project config has no specSystem\.featureRegistryRoots contract\)/);
});

test('TC-FREG-CLI-004: configured mode honors a relocated config and non-default canonical root', async () => {
    const configuredParent = 'specifications/Fixture/README.FixtureFeature.md';
    const root = await makeRoot([configuredParent], {
        configPath: 'config/project.json',
        specDirectory: 'specifications/Fixture'
    });
    await fs.writeFile(path.join(root, ...configuredParent.split('/')), parentSpec, 'utf8');
    await fs.writeFile(path.join(root, 'specifications', 'Fixture', 'README.FixtureFeature-Part2.md'), continuationSpec, 'utf8');

    const result = runConfigured(root);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /PASS \(2 canonical TC definitions\)/);
});
