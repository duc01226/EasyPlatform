'use strict';

/**
 * TC-HTMLX-015: SKILL.md documents exactly the flags the code accepts.
 *   - Every `--flag` token in SKILL.md is `to`, a GENERIC_FLAGS key of scripts/export.cjs, or a key
 *     of some target module's `flags`. The npm/npx setup flags (`--prefix`, `--with-deps`) are not
 *     exporter flags and are ignored.
 *   - Every flag the code exports appears in SKILL.md.
 *   - Every `references/*.md` path SKILL.md cites exists (TC-HTMLX-400); the check itself can fail
 *     (TC-HTMLX-401).
 * TC-HTMLX-402: every HTML_EXPORT_* environment variable the scripts read is a row of the SKILL.md
 *   environment table, and every row names one the scripts read.
 * TC-HTMLX-403: the exit tables of SKILL.md, references/verification.md and references/deck-export.md
 *   list exactly the EXIT values plus one `other` (interrupted) row.
 * TC-HTMLX-404: SKILL.md states the caller contracts that have no exported data to compare with:
 *   non-HTML input exits 2, a timed-out dependency-check launch exits 1 (only a browser that is missing
 *   or fails otherwise exits 3), Windows overrides must be .exe/.com, HTML_EXPORT_DEBUG prints the
 *   stack, an interrupt (130) can leave .video-work-* folders that are safe to delete, Chromium lives
 *   in Playwright's per-user cache, and the run manifest is the authority on a reused --out.
 * The checks read only files that ship inside this skill, so they hold in any project layout.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { SKILL_ROOT, copySkillScripts, removeTree } = require('./test-env.cjs');

// Setup commands in SKILL.md pass these to npm/npx, not to the exporter.
const EXTERNAL_FLAGS = Object.freeze(['prefix', 'with-deps']);
const FLAG_TOKEN = /(?<![\w-])--([a-z][a-z0-9-]*)/g;
const REFERENCE_PATH = /(?<![\w./-])references\/[A-Za-z0-9._-]+\.md/g;

/** The `--flag` names SKILL.md mentions, without the npm/npx setup flags. */
function documentedFlags(text) {
  const names = [...text.matchAll(FLAG_TOKEN)].map((match) => match[1]);
  return new Set(names.filter((name) => !EXTERNAL_FLAGS.includes(name)));
}

/** `to`, the dispatcher's generic flags, and every flag a target module exports. */
function exportedFlags(skillRoot) {
  const scriptsDir = path.join(skillRoot, 'scripts');
  const dispatcher = require(path.join(scriptsDir, 'export.cjs'));
  const flags = new Set(['to', ...Object.keys(dispatcher.GENERIC_FLAGS)]);
  for (const file of new Set(Object.values(dispatcher.TARGETS))) {
    const target = require(path.join(scriptsDir, file));
    for (const name of Object.keys(target.flags || {})) flags.add(name);
  }
  return flags;
}

/** The distinct `references/<name>.md` paths SKILL.md cites. */
function citedReferences(text) {
  return [...new Set([...text.matchAll(REFERENCE_PATH)].map((match) => match[0]))];
}

function checkSkillDoc(skillRoot) {
  const text = fs.readFileSync(path.join(skillRoot, 'SKILL.md'), 'utf8');
  const documented = documentedFlags(text);
  const exported = exportedFlags(skillRoot);
  const references = citedReferences(text);
  return {
    phantom: [...documented].filter((name) => !exported.has(name)).sort(),
    undocumented: [...exported].filter((name) => !documented.has(name)).sort(),
    references,
    missingReferences: references.filter((ref) => !fs.existsSync(path.join(skillRoot, ...ref.split('/')))),
  };
}

// A temp copy of the skill (scripts, SKILL.md, references) whose SKILL.md is `edit(original)`.
function withEditedCopy(edit, run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'html-export-skill-doc-'));
  try {
    const { skillRoot } = copySkillScripts(root);
    fs.mkdirSync(path.join(skillRoot, 'references'), { recursive: true });
    for (const name of fs.readdirSync(path.join(SKILL_ROOT, 'references'))) {
      fs.copyFileSync(path.join(SKILL_ROOT, 'references', name), path.join(skillRoot, 'references', name));
    }
    const original = fs.readFileSync(path.join(SKILL_ROOT, 'SKILL.md'), 'utf8');
    fs.writeFileSync(path.join(skillRoot, 'SKILL.md'), edit(original), 'utf8');
    return run(skillRoot);
  } finally {
    removeTree(root);
  }
}

test('TC-HTMLX-015 SKILL.md names exactly the flags the dispatcher and the targets export', () => {
  // Given: The shipped SKILL.md and the shipped dispatcher and target modules.
  // When: The flag tokens in SKILL.md are compared with the exported flag names.
  const result = checkSkillDoc(SKILL_ROOT);
  // Then: No documented flag is unknown to the code, and no exported flag is undocumented.
  assert.deepEqual(result.phantom, [], `SKILL.md names flags the code does not accept: ${result.phantom.join(', ')}`);
  assert.deepEqual(result.undocumented, [], `SKILL.md omits exported flags: ${result.undocumented.join(', ')}`);
});

test('TC-HTMLX-400 every references/*.md path SKILL.md cites exists', () => {
  // Given: The shipped SKILL.md.
  // When: Its references/*.md citations are resolved against the skill folder.
  const result = checkSkillDoc(SKILL_ROOT);
  // Then: It cites at least one reference, and each one exists.
  assert.ok(result.references.length > 0, 'SKILL.md cites no references/*.md file');
  assert.deepEqual(result.missingReferences, []);
});

test('TC-HTMLX-401 the check catches a phantom flag, an undocumented flag and a missing reference', () => {
  // Given: Copies of the skill whose SKILL.md adds an unknown flag and a missing reference, or
  // drops every mention of one exported flag.
  // When: The same check runs against each copy.
  const added = withEditedCopy(
    (text) => `${text}\nRun with \`--foo\`; see [notes](references/missing-notes.md).\n`,
    checkSkillDoc,
  );
  const dropped = withEditedCopy((text) => text.split('--keep-frames').join('keep frames'), checkSkillDoc);
  // Then: Each defect is reported by name, so a drifted SKILL.md fails the real check above.
  assert.deepEqual(added.phantom, ['foo']);
  assert.deepEqual(added.missingReferences, ['references/missing-notes.md']);
  assert.deepEqual(dropped.undocumented, ['keep-frames']);
  // And: The npm/npx setup flags are never counted as exporter flags.
  assert.equal(documentedFlags('npm install --prefix x && npx playwright install --with-deps').size, 0);
});

const ENV_NAME = /\bHTML_EXPORT_[A-Z0-9_]+\b/g;
const EXIT_TABLE_DOCS = Object.freeze(['SKILL.md', 'references/verification.md', 'references/deck-export.md']);

/** Every .cjs file under `dir`, recursively. */
function scriptFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return scriptFiles(full);
    return entry.name.endsWith('.cjs') ? [full] : [];
  });
}

/** The rows of the first markdown table whose first header cell is `header`, as arrays of cells. */
function tableRows(text, header) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex((line) => new RegExp(`^\\|\\s*${header}\\s*\\|`).test(line));
  if (start === -1) return null;
  const rows = [];
  for (let i = start + 2; i < lines.length && lines[i].startsWith('|'); i += 1) {
    rows.push(lines[i].split('|').slice(1, -1).map((cell) => cell.trim()));
  }
  return rows;
}

/** HTML_EXPORT_* names the scripts read vs the names in SKILL.md's environment table. */
function checkEnvTable(skillRoot) {
  const code = new Set(scriptFiles(path.join(skillRoot, 'scripts'))
    .flatMap((file) => fs.readFileSync(file, 'utf8').match(ENV_NAME) || []));
  const rows = tableRows(fs.readFileSync(path.join(skillRoot, 'SKILL.md'), 'utf8'), 'Environment variable') || [];
  const documented = new Set(rows.flatMap((cells) => cells[0].match(ENV_NAME) || []));
  return {
    code: [...code].sort(),
    undocumented: [...code].filter((name) => !documented.has(name)).sort(),
    phantom: [...documented].filter((name) => !code.has(name)).sort(),
  };
}

/** The first column of a doc's exit table: its numeric codes (sorted) and its count of `other` rows. */
function exitTableCodes(text) {
  const rows = tableRows(text, 'Exit');
  if (!rows) return null;
  const firstCells = rows.map((cells) => cells[0].replace(/`/g, ''));
  return {
    codes: firstCells.flatMap((cell) => (cell.match(/\d+/g) || []).map(Number)).sort((a, b) => a - b),
    other: firstCells.filter((cell) => cell === 'other').length,
  };
}

test('TC-HTMLX-402 SKILL.md lists exactly the HTML_EXPORT_* environment variables the scripts read', () => {
  // Given: The shipped scripts and the SKILL.md environment table.
  // When: The variable names in each are compared.
  const result = checkEnvTable(SKILL_ROOT);
  // Then: The scripts read at least the ffmpeg override, and code and table name the same variables.
  assert.ok(result.code.includes('HTML_EXPORT_FFMPEG'), `scripts read: ${result.code.join(', ')}`);
  assert.deepEqual(result.undocumented, [], `SKILL.md omits: ${result.undocumented.join(', ')}`);
  assert.deepEqual(result.phantom, [], `SKILL.md documents variables no script reads: ${result.phantom.join(', ')}`);
  // And: A dropped row and an invented row are both caught.
  const dropped = withEditedCopy((text) => text.replace(/^\| `HTML_EXPORT_FFPROBE`.*\r?\n/m, ''), checkEnvTable);
  assert.deepEqual(dropped.undocumented, ['HTML_EXPORT_FFPROBE']);
  const invented = withEditedCopy(
    (text) => text.replace(/^(\| `HTML_EXPORT_FFMPEG`.*)$/m, '$1\n| `HTML_EXPORT_NOPE` | Invented |'),
    checkEnvTable,
  );
  assert.deepEqual(invented.phantom, ['HTML_EXPORT_NOPE']);
});

test('TC-HTMLX-403 every exit table lists exactly the EXIT values plus one interrupted row', () => {
  // Given: The dispatcher's exit-code table and the three docs that restate it.
  const { EXIT } = require(path.join(SKILL_ROOT, 'scripts', 'lib', 'exit-codes.cjs'));
  const expected = Object.values(EXIT).sort((a, b) => a - b);
  for (const rel of EXIT_TABLE_DOCS) {
    // When: Each doc's first `| Exit |` table is read.
    const table = exitTableCodes(fs.readFileSync(path.join(SKILL_ROOT, ...rel.split('/')), 'utf8'));
    // Then: It routes each EXIT value once and has one `other` row (130 after an interrupt).
    assert.ok(table, `${rel} has no | Exit | table`);
    assert.deepEqual(table.codes, expected, `${rel} exit codes`);
    assert.equal(table.other, 1, `${rel} needs exactly one \`other\` (interrupted) row`);
  }
  // And: A table that loses its interrupted row is caught.
  const skill = fs.readFileSync(path.join(SKILL_ROOT, 'SKILL.md'), 'utf8');
  assert.equal(exitTableCodes(skill.replace(/^\| other .*\r?\n/m, '')).other, 0);
});

test('TC-HTMLX-404 SKILL.md states the caller contracts the dispatcher does not export as data', () => {
  // Given: The shipped SKILL.md. Doc text only: these rules live in code branches, not exported values.
  const text = fs.readFileSync(path.join(SKILL_ROOT, 'SKILL.md'), 'utf8');
  const rows = tableRows(text, 'Exit') || [];
  const row = (first) => (rows.find((cells) => cells[0] === first) || [])[1] || '';
  // When / Then: Each contract is stated in the exit table or the note a caller reads for it.
  assert.match(row('`2`'), /not an `\.html` \/ `\.htm` file/, 'exit 2 row: non-HTML input');
  assert.match(row('`1`'), /timed out/, 'exit 1 row: a timed-out dependency-check launch');
  assert.match(row('`1`'), /HTML_EXPORT_DEBUG=1/, 'exit 1 row: how to get the stack');
  assert.match(row('`3`'), /other than a timeout/, 'exit 3 row: only a non-timeout launch failure');
  assert.match(row('`3`'), /`\.exe` \/ `\.com`/, 'exit 3 row: Windows override extension');
  assert.match(row('other'), /130/, 'other row: interrupt code');
  assert.match(row('other'), /\.video-work-\*/, 'other row: leftover work folders');
  assert.match(row('other'), /safe to delete/, 'other row: cleanup guidance');
  assert.match(text, /per-user browser cache/, 'Chromium location');
  assert.match(text, /npx playwright uninstall/, 'removal note');
  assert.match(text, /reused `--out`/, 'manifest authority on a reused --out');
});
