import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { frameworkPkg } from './framework-repo.helper.mjs';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const verifierPath = path.resolve(thisDir, '..', 'verify-sync-adoption-parity.mjs');
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');

const { parseAdoptionMatrix, canonicalBody, blockPairs, findParityViolations } =
    await import(pathToFileURL(verifierPath).href);

// ── Fixtures ────────────────────────────────────────────────────────────────────
// A miniature injector source in the same shape as inject_review_skill_blocks.py,
// including the `list(OTHER)` aliasing form the real file uses for co-paired tags.
const INJECTOR_FIXTURE = [
    '"""Docstring."""',
    'ALPHA = [',
    '    "skill-a", "skill-b",',
    ']',
    '# a comment between lists',
    'BETA = [',
    '    "skill-b",',
    ']',
    'GAMMA = list(ALPHA)',
    'MATRIX = [',
    '    ("SYNC:alpha", ALPHA),',
    '    ("SYNC:beta", BETA),',
    ']',
].join('\n');

const CANONICAL_FIXTURE = [
    '## SYNC:alpha',
    '',
    '> Alpha body line.',
    '',
    '---',
    '',
    '## SYNC:alpha:reminder',
    '',
    '- Alpha reminder.',
    '',
    '---',
    '',
    '## SYNC:beta',
    '',
    '> Beta body.',
    '',
    '---',
    '',
    '## SYNC:beta:reminder',
    '',
    '- Beta reminder.',
    '',
    '---',
].join('\n');

/** Build a SKILL.md body carrying the given tag bodies. */
const carrier = (parts) => ['# Skill', '', ...parts].join('\n');
const wrap = (tag, body) => [`<!-- ${tag} -->`, '', body, '', `<!-- /${tag} -->`].join('\n');

const ALPHA_MAIN = '> Alpha body line.';
const ALPHA_REM = '- Alpha reminder.';
const BETA_MAIN = '> Beta body.';
const BETA_REM = '- Beta reminder.';

const cleanAlphaCarrier = carrier([wrap('SYNC:alpha', ALPHA_MAIN), '', wrap('SYNC:alpha:reminder', ALPHA_REM)]);

function baseSetup() {
    const matrix = parseAdoptionMatrix(INJECTOR_FIXTURE);
    const skillText = new Map([
        ['skill-a', cleanAlphaCarrier],
        ['skill-b', carrier([
            wrap('SYNC:alpha', ALPHA_MAIN), '', wrap('SYNC:alpha:reminder', ALPHA_REM), '',
            wrap('SYNC:beta', BETA_MAIN), '', wrap('SYNC:beta:reminder', BETA_REM),
        ])],
    ]);
    return { matrix, canonicalMd: CANONICAL_FIXTURE, skillText };
}

// ── Matrix parsing ──────────────────────────────────────────────────────────────

test('parseAdoptionMatrix reads tag→list pairs from Python source', () => {
    const matrix = parseAdoptionMatrix(INJECTOR_FIXTURE);
    assert.equal(matrix.length, 2);
    assert.deepEqual(matrix[0], { tag: 'SYNC:alpha', listName: 'ALPHA', skills: ['skill-a', 'skill-b'] });
    assert.deepEqual(matrix[1], { tag: 'SYNC:beta', listName: 'BETA', skills: ['skill-b'] });
});

test('parseAdoptionMatrix resolves the list(OTHER) alias form', () => {
    // GAMMA = list(ALPHA) must resolve even though it is not referenced by MATRIX here.
    const matrix = parseAdoptionMatrix(
        INJECTOR_FIXTURE.replace('("SYNC:beta", BETA),', '("SYNC:beta", GAMMA),'),
    );
    assert.deepEqual(matrix[1].skills, ['skill-a', 'skill-b']);
});

test('parseAdoptionMatrix reports an unknown list rather than silently dropping the tag', () => {
    const out = parseAdoptionMatrix(INJECTOR_FIXTURE.replace('("SYNC:beta", BETA),', '("SYNC:beta", NOPE),'));
    assert.match(out.error, /NOPE/);
});

// ── Body extraction ─────────────────────────────────────────────────────────────

test('canonicalBody extracts a tag body and stops at the next SYNC heading', () => {
    assert.equal(canonicalBody(CANONICAL_FIXTURE, 'SYNC:alpha'), ALPHA_MAIN);
    assert.equal(canonicalBody(CANONICAL_FIXTURE, 'SYNC:alpha:reminder'), ALPHA_REM);
    assert.equal(canonicalBody(CANONICAL_FIXTURE, 'SYNC:missing'), null);
});

test('blockPairs never confuses a tag with its :reminder sibling', () => {
    const md = carrier([wrap('SYNC:alpha', ALPHA_MAIN), '', wrap('SYNC:alpha:reminder', ALPHA_REM)]);
    assert.equal(blockPairs(md, 'SYNC:alpha').length, 1, 'main tag must not also match the reminder');
    assert.equal(blockPairs(md, 'SYNC:alpha').at(0).body, ALPHA_MAIN);
    assert.equal(blockPairs(md, 'SYNC:alpha:reminder').length, 1);
});

test('blockPairs flags an unterminated block', () => {
    const md = carrier(['<!-- SYNC:alpha -->', '', ALPHA_MAIN]);
    const found = blockPairs(md, 'SYNC:alpha');
    assert.equal(found.length, 1);
    assert.equal(found[0].unterminated, true);
});

// ── Assertion 1: declared-but-missing ───────────────────────────────────────────

test('a clean fixture yields zero violations', () => {
    const r = findParityViolations(baseSetup());
    assert.deepEqual([r.missing, r.undeclared, r.drifted], [[], [], []]);
    assert.equal(r.pairsChecked, 3, 'skill-a×alpha + skill-b×alpha + skill-b×beta');
});

test('declared carrier missing the MAIN block is a violation', () => {
    const s = baseSetup();
    s.skillText.set('skill-a', carrier([wrap('SYNC:alpha:reminder', ALPHA_REM)]));
    const r = findParityViolations(s);
    assert.equal(r.missing.length, 1);
    assert.match(r.missing[0], /skill-a :: SYNC:alpha/);
    assert.match(r.missing[0], /declared in ALPHA/);
});

test('declared carrier missing only the :reminder is still a violation', () => {
    // This is the real-world shape that exposed a stray review-skill block: a main block
    // with no reminder cannot have been written by the injector, which always writes both.
    const s = baseSetup();
    s.skillText.set('skill-a', carrier([wrap('SYNC:alpha', ALPHA_MAIN)]));
    const r = findParityViolations(s);
    assert.equal(r.missing.length, 1);
    assert.match(r.missing[0], /SYNC:alpha:reminder/);
});

test('a duplicated block is a violation (exactly one expected)', () => {
    const s = baseSetup();
    s.skillText.set('skill-a', carrier([
        wrap('SYNC:alpha', ALPHA_MAIN), '', wrap('SYNC:alpha', ALPHA_MAIN), '',
        wrap('SYNC:alpha:reminder', ALPHA_REM),
    ]));
    const r = findParityViolations(s);
    assert.equal(r.missing.length, 1);
    assert.match(r.missing[0], /found 2/);
});

// ── Assertion 2: undeclared carrier (the drift that already happened twice) ──────

test('undeclared carrier is flagged — the injector would never refresh it', () => {
    const s = baseSetup();
    // skill-a carries beta but BETA only declares skill-b.
    s.skillText.set('skill-a', cleanAlphaCarrier + '\n\n' + wrap('SYNC:beta', BETA_MAIN));
    const r = findParityViolations(s);
    assert.equal(r.undeclared.length, 1);
    assert.match(r.undeclared[0], /skill-a :: SYNC:beta/);
    assert.match(r.undeclared[0], /ABSENT from BETA/);
});

// ── Assertion 3: canonical parity ───────────────────────────────────────────────

test('injected body drifting from canonical is flagged', () => {
    const s = baseSetup();
    s.skillText.set('skill-a', carrier([
        wrap('SYNC:alpha', '> Alpha body line EDITED BY HAND.'), '',
        wrap('SYNC:alpha:reminder', ALPHA_REM),
    ]));
    const r = findParityViolations(s);
    assert.equal(r.drifted.length, 1);
    assert.match(r.drifted[0], /skill-a :: SYNC:alpha/);
    assert.equal(r.missing.length, 0, 'a drifted body is present, so it is drift — not missing');
});

// ── Guide carriers (P48, TC-PDL-065) ────────────────────────────────────────────
// A converted skill carries the main protocol as a guide line (shared P25 writer, never a restated
// format) plus the canonical :reminder pair, and the full text lives in the projection file.
const guideCarrier = createRequire(import.meta.url)('../../lib/protocol-guide-carrier.cjs');
const guideBlock = (tag) => [
    guideCarrier.GUIDE_BLOCK_START, '',
    guideCarrier.formatGuideLine({ tag, summary: `Summary of ${tag}`, when: `using ${tag}`, path: `.claude/skills/shared/protocols/${tag}.md` }),
    '', guideCarrier.GUIDE_BLOCK_END,
].join('\n');
const guidedAlphaCarrier = carrier([guideBlock('alpha'), '', wrap('SYNC:alpha:reminder', ALPHA_REM)]);

test('TC-PDL-065: a guide entry + reminder + projection satisfies the main-block assertion', () => {
    // Given skill-a holds a guide entry and the reminder instead of the alpha body, and the projection exists
    const s = { ...baseSetup(), projectionExists: (tag) => tag === 'alpha' };
    s.skillText.set('skill-a', guidedAlphaCarrier);
    // When the sensor runs
    const r = findParityViolations(s);
    // Then it passes
    assert.deepEqual([r.missing, r.undeclared, r.drifted], [[], [], []]);
});

test('TC-PDL-065: a guide carrier still fails when the guide, the projection or the reminder is missing', () => {
    // Given the guide entry is removed too (both forms missing), When the sensor runs, Then the main block is missing
    const noGuide = { ...baseSetup(), projectionExists: () => true };
    noGuide.skillText.set('skill-a', carrier([wrap('SYNC:alpha:reminder', ALPHA_REM)]));
    const r1 = findParityViolations(noGuide);
    assert.equal(r1.missing.length, 1);
    assert.match(r1.missing[0], /skill-a :: SYNC:alpha — expected exactly 1 complete block, found 0/);

    // Given a guide but no projection file, When the sensor runs, Then it fails naming the projection
    const noProjection = { ...baseSetup(), projectionExists: () => false };
    noProjection.skillText.set('skill-a', guidedAlphaCarrier);
    const r2 = findParityViolations(noProjection);
    assert.equal(r2.missing.length, 1);
    assert.match(r2.missing[0], /guide entry present but its projection file shared\/protocols\/alpha\.md is missing/);

    // Given a guide without the reminder pair, When the sensor runs, Then the reminder is missing
    const noReminder = { ...baseSetup(), projectionExists: () => true };
    noReminder.skillText.set('skill-a', carrier([guideBlock('alpha')]));
    const r3 = findParityViolations(noReminder);
    assert.equal(r3.missing.length, 1);
    assert.match(r3.missing[0], /SYNC:alpha:reminder/);

    // Given a guide whose reminder drifted, When the sensor runs, Then reminder parity still applies
    const drifted = { ...baseSetup(), projectionExists: () => true };
    drifted.skillText.set('skill-a', carrier([guideBlock('alpha'), '', wrap('SYNC:alpha:reminder', '- Edited reminder.')]));
    const r4 = findParityViolations(drifted);
    assert.equal(r4.drifted.length, 1);
    assert.match(r4.drifted[0], /skill-a :: SYNC:alpha:reminder/);
});

// The pure check cannot prove the CLI hands it a real projection lookup, so run a copied verifier
// over a temp fixture project with the recognizer beside it, as in any real install.
test('TC-PDL-065: the verifier CLI accepts a guide carrier only while its projection file exists', () => {
    const temp = fsSync.mkdtempSync(path.join(os.tmpdir(), 'ck-adoption-guide-'));
    try {
        const write = (rel, text) => {
            const target = path.join(temp, rel);
            fsSync.mkdirSync(path.dirname(target), { recursive: true });
            fsSync.writeFileSync(target, text);
        };
        for (const rel of ['.claude/scripts/codex/verify-sync-adoption-parity.mjs', '.claude/scripts/lib/project-root.cjs', '.claude/scripts/lib/protocol-guide-carrier.cjs']) {
            write(rel, fsSync.readFileSync(path.join(repoRoot, rel), 'utf8'));
        }
        write('.claude/scripts/inject_review_skill_blocks.py', 'ALPHA = ["skill-a"]\nMATRIX = [\n    ("SYNC:alpha", ALPHA),\n]\n');
        write('.claude/skills/shared/sync-inline-versions.md', CANONICAL_FIXTURE);
        write('.claude/skills/shared/protocols/alpha.md', `${ALPHA_MAIN}\n`);
        write('.claude/skills/skill-a/SKILL.md', guidedAlphaCarrier);
        const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
        Object.assign(env, { CLAUDE_PROJECT_DIR: temp, HOME: temp, USERPROFILE: temp, TMPDIR: temp, TEMP: temp, TMP: temp });
        const run = () => spawnSync(process.execPath, [path.join(temp, '.claude/scripts/codex/verify-sync-adoption-parity.mjs')],
            { cwd: temp, env, encoding: 'utf8', timeout: 60000 });

        // Given a guided carrier with its projection, When the CLI runs, Then it passes
        const pass = run();
        assert.equal(pass.status, 0, pass.stdout + pass.stderr);
        // Given the projection file is removed, When the CLI runs, Then it fails naming the projection
        fsSync.rmSync(path.join(temp, '.claude/skills/shared/protocols/alpha.md'));
        const fail = run();
        assert.equal(fail.status, 1, fail.stdout + fail.stderr);
        assert.match(fail.stderr, /skill-a :: SYNC:alpha — guide entry present but its projection file shared\/protocols\/alpha\.md is missing/);
    } finally {
        fsSync.rmSync(temp, { recursive: true, force: true });
    }
});

// ── Fail-soft ───────────────────────────────────────────────────────────────────

test('an unreadable declared carrier warns instead of failing the build', () => {
    const s = baseSetup();
    s.skillText.delete('skill-a');
    const r = findParityViolations(s);
    assert.equal(r.missing.length, 0);
    assert.equal(r.undeclared.length, 0);
    assert.equal(r.warnings.filter((w) => /skill-a/.test(w)).length, 1);
});

// ── Live wiring: the sensor must actually be parsing the REAL injector ───────────

test('the real injector source parses, and every MATRIX list resolves', async () => {
    const py = await fs.readFile(path.join(repoRoot, '.claude', 'scripts', 'inject_review_skill_blocks.py'), 'utf8');
    const matrix = parseAdoptionMatrix(py.replace(/\r\n/g, '\n'));
    assert.ok(Array.isArray(matrix), `real injector must parse: ${matrix?.error ?? ''}`);
    assert.ok(matrix.length >= 6, `expected >=6 tags, got ${matrix.length}`);
    for (const entry of matrix) {
        assert.ok(entry.skills.length > 0, `${entry.tag} resolved to an empty list`);
        assert.match(entry.tag, /^SYNC:/);
    }
});

test('the sensor is registered in the runner pipeline and individually runnable from the bundle', async () => {
    // A sensor that exists but is not wired is decoration. The npm half of this check is gone — no
    // host package.json drives the framework any more — so BOTH halves are now unconditional, which
    // is stronger: they hold in every adopting project, not only in this repo.
    const runner = await fs.readFile(
        path.join(repoRoot, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs'), 'utf8');
    const stage = runner.match(/\{[^{}]*\bid:\s*"sync-adoption-parity"[^{}]*\}/);
    assert.ok(stage, 'runner must declare the stage');
    // No `mutate: true` ⇒ `--verify-only` selects it by derivation, so it cannot fall out of the
    // everything-verify run the way an omitted id fell out of the old `verify:all --only` list.
    assert.doesNotMatch(stage[0], /\bmutate:\s*true\b/, 'the sensor must stay in the derived --verify-only set');

    const verifier = path.join(repoRoot, '.claude', 'scripts', 'codex', 'verify-sync-adoption-parity.mjs');
    assert.ok(await fs.access(verifier).then(() => true, () => false),
        'the verifier must exist at its in-bundle path so it is runnable standalone with plain node');
});
