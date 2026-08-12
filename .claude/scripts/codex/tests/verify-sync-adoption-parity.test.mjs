import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
    // This is the real-world shape that exposed the stray spec-clarify block: a main block
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

test('the sensor is registered in BOTH the runner pipeline and the npm verify allowlist', async () => {
    // A sensor that exists but is not wired is decoration. PORT-008 locks --only to the runner's
    // stage set; this asserts THIS sensor specifically is present in both, so it cannot be
    // silently dropped from the build gate.
    // Runner half — UNCONDITIONAL: run-codex-sync.mjs travels inside `.claude`, so this must hold in
    // every adopting project. It is the half that actually gates the build.
    const runner = await fs.readFile(
        path.join(repoRoot, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs'), 'utf8');
    assert.match(runner, /id:\s*"sync-adoption-parity"/, 'runner must declare the stage');

    // npm half — framework-repo only: an adopting project keeps its own package.json (or none).
    const pkg = frameworkPkg(repoRoot);
    if (!pkg) return;
    assert.match(String(pkg.scripts['verify:all']), /sync-adoption-parity/, 'verify:all --only must include it');
    assert.ok(pkg.scripts['codex:verify:sync-adoption-parity'], 'a standalone npm script must exist');
});
