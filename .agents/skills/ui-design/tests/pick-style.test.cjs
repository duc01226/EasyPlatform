/**
 * Tests for the design skill's style picker (scripts/pick-style.cjs).
 *
 * Protects the CLI contract the explore workflow relies on:
 *   - the same --seed over the same data picks the same row (reproducible divergence seed);
 *   - different seeds reach different rows, and unseeded runs vary (the pick really diverges);
 *   - stdout is JSON { style, keywords, row };
 *   - exit 0 ok, 1 data error, 2 usage error — including an unterminated quoted field (1)
 *     and a --seed outside 0..4294967295 (2), which a 32-bit PRNG would otherwise alias.
 *
 * The script reads ../data/styles.csv relative to itself, so every case copies the script into a
 * temp skill layout with its own styles.csv — no case reads or edits the shipped data. The child
 * runs with HOME/USERPROFILE/TMPDIR/TEMP/TMP pointed at the temp dir. Node built-ins only;
 * nothing here differs by OS (CRLF input is exercised explicitly).
 *
 * Run: node .claude/skills/ui-design/tests/pick-style.test.cjs
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCE_SCRIPT = path.resolve(__dirname, '..', 'scripts', 'pick-style.cjs');
const SPAWN_TIMEOUT_MS = 30000;
const HEADER = 'No,Style Category,Type,Keywords';

const THREE_ROWS = [
  HEADER,
  '1,Swiss Grid,General,"clean, grid"',
  '2,Brutalist,General,"raw, heavy"',
  '3,Soft Paper,General,"warm, tactile"',
].join('\n');

/** Build a temp skill layout (scripts/ + data/) and return its paths. */
function makeSkill(csvText) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pick-style-'));
  const scriptsDir = path.join(root, 'skill', 'scripts');
  const dataDir = path.join(root, 'skill', 'data');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });
  const script = path.join(scriptsDir, 'pick-style.cjs');
  fs.copyFileSync(SOURCE_SCRIPT, script);
  if (csvText !== null) fs.writeFileSync(path.join(dataDir, 'styles.csv'), csvText, 'utf8');
  return { root, script };
}

function withSkill(csvText, fn) {
  const skill = makeSkill(csvText);
  try {
    return fn(skill);
  } finally {
    fs.rmSync(skill.root, { recursive: true, force: true });
  }
}

/** Spawn the copied CLI in a clean env; never drop partial output on a spawn failure. */
function run(skill, args) {
  // The picker reads no env var; still drop inherited switches and provider keys so a developer
  // machine's settings can never change the verdict.
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^(CLAUDE|CK|ANTHROPIC|OPENAI|CODEX)_|(_API_KEY|_TOKEN|_SECRET)$/i.test(key)) delete env[key];
  }
  for (const key of ['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP']) env[key] = skill.root;
  const result = spawnSync(process.execPath, [skill.script, ...args], {
    cwd: skill.root,
    env,
    encoding: 'utf8',
    timeout: SPAWN_TIMEOUT_MS,
  });
  const out = { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
  if (result.error) {
    assert.fail(`spawn failed: ${result.error.message}\nstdout:\n${out.stdout}\nstderr:\n${out.stderr}`);
  }
  return out;
}

function describe(out) {
  return `status=${out.status}\nstdout:\n${out.stdout}\nstderr:\n${out.stderr}`;
}

test('same --seed over the same data prints the identical row, as { style, keywords, row }', () => {
  withSkill(THREE_ROWS, (skill) => {
    // Given a three-row styles.csv
    // When the picker runs twice with the same seed
    const first = run(skill, ['--seed=7']);
    const second = run(skill, ['--seed=7']);
    // Then both runs exit 0 with byte-identical output
    assert.equal(first.status, 0, describe(first));
    assert.equal(second.status, 0, describe(second));
    assert.equal(second.stdout, first.stdout);
    // And the output is exactly { style, keywords, row } with row keyed by the header
    const picked = JSON.parse(first.stdout);
    assert.deepEqual(Object.keys(picked), ['style', 'keywords', 'row']);
    assert.deepEqual(Object.keys(picked.row), HEADER.split(','));
    assert.equal(picked.style, picked.row['Style Category']);
    assert.equal(picked.keywords, picked.row.Keywords);
    assert.ok(['Swiss Grid', 'Brutalist', 'Soft Paper'].includes(picked.style), picked.style);
  });
});

test('the seed range edges are accepted and the unseeded pick comes from the data', () => {
  withSkill(THREE_ROWS, (skill) => {
    // Given a three-row styles.csv
    for (const args of [['--seed=0'], ['--seed=4294967295'], []]) {
      // When the picker runs with a boundary seed or no seed
      const out = run(skill, args);
      // Then it exits 0 and prints one of the fixture rows
      assert.equal(out.status, 0, `${args.join(' ')}: ${describe(out)}`);
      assert.ok(['Swiss Grid', 'Brutalist', 'Soft Paper'].includes(JSON.parse(out.stdout).style));
    }
  });
});

test('different seeds pick different rows, so --seed actually steers the divergence seed', () => {
  withSkill(THREE_ROWS, (skill) => {
    // Given the three-row fixture
    // When the picker runs once for each seed 0..9
    const picked = new Set();
    const rows = [];
    for (let seed = 0; seed <= 9; seed += 1) {
      const out = run(skill, [`--seed=${seed}`]);
      assert.equal(out.status, 0, `--seed=${seed}: ${describe(out)}`);
      const pick = JSON.parse(out.stdout);
      picked.add(pick.style);
      rows.push(Number(pick.row.No) - 1);
    }
    // Then every fixture row is reached, and each seed lands on its fixed row. Deterministic: over
    // 3 rows, seeds 0..9 map to rows 0,1,2,2,2,2,1,0,0,0 — a picker that ignores --seed (random or
    // constant) cannot reproduce this sequence. A deliberate PRNG change must update this table.
    assert.deepEqual([...picked].sort(), ['Brutalist', 'Soft Paper', 'Swiss Grid'], [...picked].join(', '));
    assert.deepEqual(rows, [0, 1, 2, 2, 2, 2, 1, 0, 0, 0]);
  });
});

test('unseeded runs vary, so explore mode does not always start from the same style', () => {
  withSkill(THREE_ROWS, (skill) => {
    // Given the three-row fixture
    // When the picker runs 20 times without --seed
    const RUNS = 20;
    const picked = new Set();
    for (let i = 0; i < RUNS; i += 1) {
      const out = run(skill, []);
      assert.equal(out.status, 0, `run ${i}: ${describe(out)}`);
      picked.add(JSON.parse(out.stdout).style);
    }
    // Then more than one style appears. With a uniform pick over 3 rows, all 20 runs landing on the
    // same row has probability 3 * (1/3)^20 = 3^-19 ≈ 8.6e-10, so a false failure is negligible,
    // while a constant pick fails every time.
    assert.ok(picked.size > 1, `all ${RUNS} unseeded runs picked ${[...picked].join(', ')}`);
  });
});

test('a --seed outside 0..4294967295 or a malformed argument is a usage error (exit 2)', () => {
  withSkill(THREE_ROWS, (skill) => {
    // Given valid data, so only the argument can be at fault
    for (const arg of ['--seed=4294967296', '--seed=99999999999999999999', '--seed=-1', '--seed=1.5',
      '--seed=', '--seed=0x10', '--seed', '--bogus']) {
      // When the picker runs with the bad argument
      const out = run(skill, [arg]);
      // Then it exits 2, prints usage on stderr and nothing on stdout
      assert.equal(out.status, 2, `${arg}: ${describe(out)}`);
      assert.match(out.stderr, /Usage error/, arg);
      assert.match(out.stderr, /--seed=<integer 0\.\.4294967295>/, arg);
      assert.equal(out.stdout, '', arg);
    }
  });
});

test('--help prints usage and exits 0', () => {
  withSkill(THREE_ROWS, (skill) => {
    // Given any data  When --help is passed
    const out = run(skill, ['--help']);
    // Then usage goes to stdout with exit 0
    assert.equal(out.status, 0, describe(out));
    assert.match(out.stdout, /^Usage:/);
  });
});

test('an unterminated quoted field is a data error (exit 1), not a silently shrunken pool', () => {
  // Given a styles.csv whose last row opens a quote that never closes
  const csv = [HEADER, '1,Swiss Grid,General,"clean, grid"', '2,Brutalist,General,"raw, heavy'].join('\n');
  withSkill(csv, (skill) => {
    // When the picker runs
    const out = run(skill, ['--seed=1']);
    // Then it exits 1 and names the problem and the line the open quote started on
    assert.equal(out.status, 1, describe(out));
    assert.match(out.stderr, /unterminated quoted field starting on line 3/);
    assert.equal(out.stdout, '');
  });
});

test('a stray quote mid-file that swallows later rows still ends as a data error (exit 1)', () => {
  // Given a stray quote on row 2: the next row's quotes pair with it, leaving the final quote open
  const csv = [HEADER, '1,Swiss Grid,General,"clean, grid', '2,Brutalist,General,"raw, heavy"'].join('\n');
  withSkill(csv, (skill) => {
    // When the picker runs
    const out = run(skill, ['--seed=1']);
    // Then it refuses the data instead of picking from a garbled pool
    assert.equal(out.status, 1, describe(out));
    assert.match(out.stderr, /unterminated quoted field/);
    assert.equal(out.stdout, '');
  });
});

test('missing data, a missing required column, or no named row is a data error (exit 1)', () => {
  const cases = [
    { name: 'no styles.csv', csv: null, stderr: /styles data not found/ },
    { name: 'no Keywords column', csv: 'No,Style Category\n1,Swiss Grid\n', stderr: /header must contain/ },
    { name: 'no row with a style name', csv: `${HEADER}\n1,,General,x\n2,  ,General,y\n`, stderr: /no row with a non-empty style name/ },
  ];
  for (const { name, csv, stderr } of cases) {
    withSkill(csv, (skill) => {
      // Given broken data  When the picker runs
      const out = run(skill, ['--seed=3']);
      // Then it exits 1 with the reason on stderr and nothing on stdout
      assert.equal(out.status, 1, `${name}: ${describe(out)}`);
      assert.match(out.stderr, stderr, name);
      assert.equal(out.stdout, '', name);
    });
  }
});

test('BOM, CRLF, quoted commas/newlines, doubled quotes and short rows parse into the row', () => {
  // Given a single-row CSV (so every seed picks it) with BOM, CRLF and a row shorter than the header
  const csv = `﻿${HEADER},Notes\r\n1,"Ink ""Wash""",General,"soft, bleed\r\nline two"\r\n`;
  withSkill(csv, (skill) => {
    // When the picker runs
    const out = run(skill, ['--seed=42']);
    // Then the quoted content survives intact and the missing trailing cell reads as empty
    assert.equal(out.status, 0, describe(out));
    const picked = JSON.parse(out.stdout);
    assert.equal(picked.style, 'Ink "Wash"');
    assert.equal(picked.keywords, 'soft, bleed\r\nline two');
    assert.equal(picked.row.No, '1');
    assert.equal(picked.row.Notes, '');
  });
});
