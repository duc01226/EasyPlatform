import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { validateCorpus, validateResults } from '../../../skills/shared/skill-evals/validate.mjs';

const claudeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const contractRoot = process.env.SKILL_REPAIRS_SOURCE_ROOT || claudeRoot;
const skill = name => fs.readFileSync(path.join(contractRoot, 'skills', name, 'SKILL.md'), 'utf8');
const corpus = JSON.parse(fs.readFileSync(path.join(claudeRoot, 'skills/shared/skill-evals/corpus.v1.json'), 'utf8'));

test('Eval CLI executes through a directory symlink instead of silently succeeding', async t => {
    const { spawnSync } = await import('node:child_process');
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-eval-link-'));
    try {
        const alias = path.join(fixture, 'alias');
        try {
            fs.symlinkSync(path.join(claudeRoot, 'skills/shared/skill-evals'), alias,
                process.platform === 'win32' ? 'junction' : 'dir');
        } catch (error) {
            if (['EACCES', 'EPERM', 'ENOSYS', 'ENOTSUP', 'EOPNOTSUPP'].includes(error.code)) {
                t.skip(`Directory aliases unavailable: ${error.code}`);
                return;
            }
            throw error;
        }
        const env = { PATH: process.env.PATH || '', SystemRoot: process.env.SystemRoot || '',
            HOME: fixture, USERPROFILE: fixture, TMPDIR: fixture, TEMP: fixture, TMP: fixture };
        const result = spawnSync(process.execPath, [path.join(alias, 'validate.mjs')],
            { cwd: fixture, env, encoding: 'utf8', timeout: 10000 });
        assert.equal(result.status, 0, result.stderr);
        assert.equal(JSON.parse(result.stdout).cases, corpus.cases.length);
    } finally {
        fs.rmSync(fixture, { recursive: true, force: true });
    }
});

test('RS1: synthesis inputs survive rejection and cleanup waits for accepted closure', () => {
    // Given synthesis's two required inputs and its later review/repair consumer.
    const synthesis = skill('knowledge-synthesis');
    const workflow = skill('workflow-research');
    // When their lifecycle contracts are inspected.
    // Then synthesis cannot delete repair inputs merely on completion.
    assert.match(synthesis, /synthesis completion does not authorize cleanup/);
    assert.match(synthesis, /REVISE, BLOCKED, interruption, or closure failure, keep both files/);
    assert.match(synthesis, /Standalone synthesis retains both files until an explicit acceptance/);
    assert.doesNotMatch(synthesis, /clean(?: up)?.{0,140}after successful synthesis/i);
    assert.match(workflow, /Cleanup is an orchestrator lifecycle action after.*APPROVED.*workflow-end.*successfully accepts closure/);
    assert.match(workflow, /never erase another run’s evidence/);
});

test('RS2: a knowledge-only review has no application hierarchy prerequisite', () => {
    // Given the knowledge artifact review contract.
    const source = skill('knowledge-review');
    // When a research-only target is reviewed.
    // Then code-linked claims remain verifiable without prescribing unrelated code design.
    assert.match(source, /Research-only artifacts have no application-inheritance or linter prerequisite/);
    assert.match(source, /code-linked claims, inspect only the referenced code/);
    assert.doesNotMatch(source, /must inherit a common base \(even if empty/i);
    assert.match(source, /SYNC:review-policy/);
});

test('RS3: offline/fixed stack research uses applicability and a total cap', () => {
    // Given a stack research request that may have absent or fixed layers.
    const source = skill('tech-stack-research');
    // When its research obligations are loaded.
    // Then neither irrelevant layers nor a multiplied minimum search quota is required.
    assert.match(source, /OPEN-REQUIRED.*FIXED.*N\/A/);
    assert.match(source, /CLI or library may need no frontend/);
    assert.match(source, /at most 10 queries.*across all open layers/);
    assert.match(source, /no per-layer minimum/);
    assert.match(source, /fewer, record the eliminated candidates/);
    assert.doesNotMatch(source, /minimum 5 queries|minimum 5 per layer|minimum 3 WebSearched options per stack layer/);
});

test('RS4: query optimization preserves mixed-case and Unicode result semantics', () => {
    // Given the portable case-insensitive query recipe.
    const source = skill('performance-review');
    // When a case-sensitive store can contain arbitrary mixed-case rows.
    // Then normalization/collation equivalence is required before performance proof.
    assert.doesNotMatch(source, /col == x \|\| col == xLower/);
    assert.match(source, /does not preserve arbitrary mixed-case or Unicode matches/);
    assert.match(source, /Preserve tenant\/auth filters, null behavior, locale, Unicode normalization and result sets/);
    assert.match(source, /sequential scan can be optimal/);
});

test('RS5: spec health requires affected owner correspondence, not recent commits', () => {
    // Given a wrap-up with changed business behavior.
    const source = skill('watzup');
    // When spec maintenance evidence is selected.
    // Then unrelated commit recency cannot confer freshness; uncommitted correct updates count.
    assert.match(source, /uncommitted correct owner updates count as current evidence/);
    assert.match(source, /MATCH.*DRIFT|Record `MATCH`/s);
    assert.match(source, /NOT VERIFIED/);
    assert.match(source, /Age and unrelated recent spec commits never establish MATCH or DRIFT/);
    assert.doesNotMatch(source, /Spec bundle is being maintained|Feature docs are being maintained/);
});

function resultFor(item) {
    const runtime = { model: 'fixture-model', modelVersion: 'fixture-v1', host: 'fixture-host', hostVersion: '1', settingsHash: 'a'.repeat(64), toolsetHash: 'b'.repeat(64), contextHash: 'c'.repeat(64) };
    const arm = () => ({ observedAt: '2026-01-01T00:00:00Z', runtime: structuredClone(runtime), skillHashes: {}, loadedSkills: [], outputArtifact: 'fixture-output.txt', checks: item.assertions.map(assertion => ({ assertion, passed: false, evidence: 'synthetic fixture line 1' })) });
    const pair = { caseId: item.id, reviewer: 'fixture-reviewer', taskHash: 'd'.repeat(64), fixtureHash: 'e'.repeat(64), withoutSkill: arm(), withSkill: arm() };
    pair.withSkill.skillHashes = Object.fromEntries(item.skills.map(name => [name, 'f'.repeat(64)]));
    return { schemaVersion: 1, corpusVersion: corpus.corpusVersion, pairs: [pair] };
}

test('evaluation corpus covers activation boundaries and each research repair', () => {
    // Given the shipped versioned corpus, not a live evaluation result.
    const checked = validateCorpus(corpus);
    // When scenarios are inventoried.
    // Then positive/negative/ambiguous activation and RS1–RS5 repairs have rubrics.
    for (const id of ['activation-positive', 'activation-negative', 'activation-ambiguous', 'repair-evidence-rejection', 'repair-evidence-acceptance', 'repair-knowledge-scope', 'repair-cli-stack', 'repair-query-equivalence', 'repair-spec-correspondence', 'repair-uncommitted-spec']) {
        assert.ok(checked.cases.some(item => item.id === id), id);
    }
    const malformed = structuredClone(corpus);
    malformed.cases.push(structuredClone(malformed.cases[0]));
    assert.throws(() => validateCorpus(malformed), /unique/);
});

test('evaluation corpus names shipped skills and states an activation boundary for each changed skill', () => {
    // Given the shipped corpus: a renamed or removed skill must not leave a case that can never run.
    for (const item of corpus.cases) {
        for (const skill of item.skills) assert.ok(fs.existsSync(path.join(claudeRoot, 'skills', skill, 'SKILL.md')), `${item.id}: ${skill}`);
    }
    // Then every skill whose activation changed has a case that expects it, and one where it is offered but not chosen.
    const activation = corpus.cases.filter(item => item.kind === 'activation');
    for (const skill of ['architecture', 'feature-implement', 'plan', 'spec', 'workflow-e2e', 'workflow-end', 'workflow-review-changes']) {
        assert.ok(activation.some(item => item.expectedActivation === skill), `${skill}: a case expects it`);
        assert.ok(activation.some(item => item.skills.includes(skill) && item.expectedActivation !== skill), `${skill}: a case offers it and expects another choice`);
    }
});

test('evaluation schema preserves failures and rejects incomparable/leaked/incomplete arms', () => {
    // Given synthetic records; they are schema fixtures, never real model observations.
    const results = resultFor(corpus.cases[0]);
    // When complete matched pairs carry observed failing rubric scores.
    // Then validation preserves failure rather than asserting behavioral PASS.
    assert.equal(validateResults(corpus, results).pairs[0].withSkill.checks[0].passed, false);
    const alteredRuntime = structuredClone(results);
    alteredRuntime.pairs[0].withSkill.runtime.modelVersion = 'other';
    assert.throws(() => validateResults(corpus, alteredRuntime), /paired runtime differs/);
    const leaked = structuredClone(results);
    leaked.pairs[0].withoutSkill.loadedSkills = [corpus.cases[0].skills[0]];
    assert.throws(() => validateResults(corpus, leaked), /baseline loaded a skill/);
    const missing = structuredClone(results);
    missing.pairs[0].withSkill.checks.pop();
    assert.throws(() => validateResults(corpus, missing), /complete rubric/);
    const missingHash = structuredClone(results);
    missingHash.pairs[0].withSkill.skillHashes = {};
    assert.throws(() => validateResults(corpus, missingHash), /hashes do not match/);
});

test('evaluation CLI validates an isolated corpus and labels model evaluation not run', async () => {
    // Given a disposable fixture with no repo config, provider keys, model, or Git state.
    const { spawnSync } = await import('node:child_process');
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-eval-'));
    try {
        const corpusFile = path.join(fixture, 'corpus.json');
        fs.writeFileSync(corpusFile, JSON.stringify(corpus));
        const env = { PATH: process.env.PATH || '', SystemRoot: process.env.SystemRoot || '', HOME: fixture, USERPROFILE: fixture, TMPDIR: fixture, TEMP: fixture, TMP: fixture };
        // When the real Node entrypoint validates only supplied fixture data.
        const result = spawnSync(process.execPath, [path.join(claudeRoot, 'skills/shared/skill-evals/validate.mjs'), corpusFile], { cwd: fixture, env, encoding: 'utf8' });
        // Then its successful output cannot be confused with a live model quality result.
        assert.equal(result.status, 0, result.stderr);
        assert.equal(JSON.parse(result.stdout).modelEvaluation, 'not run');
        fs.writeFileSync(corpusFile, '{}');
        const invalid = spawnSync(process.execPath, [path.join(claudeRoot, 'skills/shared/skill-evals/validate.mjs'), corpusFile], { cwd: fixture, env, encoding: 'utf8' });
        assert.equal(invalid.status, 1);
        assert.match(invalid.stderr, /Unsupported corpus version/);
    } finally {
        fs.rmSync(fixture, { recursive: true, force: true });
    }
});
