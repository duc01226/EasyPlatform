/**
 * Tests for the pdf-convert dispatcher (scripts/convert.cjs).
 *
 * Covers TC-SKREM-001 (routing to the moved converters) and TC-SKREM-002 (a missing or
 * unknown --to is rejected instead of silently converting in the wrong direction).
 *
 * Node built-ins only, and no assertion depends on whether `npm install` has been run in
 * either direction sub-directory — the suite must give the same verdict in both install states.
 *
 * Run: node tests/dispatcher.test.cjs
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const dispatcher = path.resolve(__dirname, '..', 'scripts', 'convert.cjs');

/**
 * @param {string[]} args
 * @returns {{ status: number, stdout: string, stderr: string, all: string }}
 */
function run(args) {
  const result = spawnSync(process.execPath, [dispatcher, ...args], {
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.ifError(result.error);
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  return { status: result.status, stdout, stderr, all: stdout + stderr };
}

// --- TC-SKREM-001: routes to the correct moved converter ------------------------------

test('TC-SKREM-001 --to markdown routes to the PDF-to-Markdown converter', () => {
  const { status, stdout } = run(['--to', 'markdown', '--help']);
  assert.equal(status, 0, 'help through the dispatcher should exit 0');
  assert.match(stdout, /Convert PDF files to Markdown/);
  // --mode belongs to this direction only; --no-highlight belongs to the other one.
  assert.match(stdout, /--mode/);
  assert.doesNotMatch(stdout, /--no-highlight/, 'must not print the to-pdf help');
});

test('TC-SKREM-001 --to pdf routes to the Markdown-to-PDF converter', () => {
  const { status, stdout } = run(['--to', 'pdf', '--help']);
  assert.equal(status, 0, 'help through the dispatcher should exit 0');
  assert.match(stdout, /Convert markdown files to PDF/);
  assert.match(stdout, /--no-highlight/);
  assert.doesNotMatch(stdout, /Convert PDF files to Markdown/, 'must not print the to-markdown help');
});

test('TC-SKREM-001 --to=X is accepted as well as --to X', () => {
  const equalsForm = run(['--to=pdf', '--help']);
  const spaceForm = run(['--to', 'pdf', '--help']);
  assert.equal(equalsForm.status, 0);
  assert.equal(equalsForm.stdout, spaceForm.stdout, 'both --to forms must route identically');
});

test('TC-SKREM-001 arguments after --to reach the converter', () => {
  // Without --input the converter rejects on its own validation; with --input it gets past
  // that check. The difference proves the forwarded argv arrived — and holds whether or not
  // the direction's dependencies are installed.
  const withoutInput = run(['--to', 'markdown']);
  const withInput = run(['--to', 'markdown', '--input', './does-not-exist.pdf']);

  assert.equal(withoutInput.status, 1);
  assert.match(withoutInput.all, /Input file required/);

  assert.equal(withInput.status, 1);
  assert.doesNotMatch(withInput.all, /Input file required/, '--input was not forwarded');
});

test('TC-SKREM-001 the converter exit code is propagated', () => {
  assert.equal(run(['--to', 'markdown', '--help']).status, 0);
  assert.equal(run(['--to', 'markdown']).status, 1);
});

// --- TC-SKREM-002: missing or invalid --to is rejected --------------------------------

test('TC-SKREM-002 a missing --to exits 1 and lists the valid directions', () => {
  const { status, stderr, stdout } = run(['--input', './doc.pdf']);
  assert.equal(status, 1);
  assert.match(stderr, /Missing --to/);
  assert.match(stderr, /markdown\|pdf/);
  assert.equal(stdout, '', 'the usage error belongs on stderr');
});

test('TC-SKREM-002 an unknown --to value exits 1 and names the rejected value', () => {
  const { status, stderr } = run(['--to', 'docx', '--input', './doc.pdf']);
  assert.equal(status, 1);
  assert.match(stderr, /Unknown conversion direction: docx/);
  assert.match(stderr, /markdown\|pdf/);
});

test('TC-SKREM-002 a trailing --to with no value exits 1', () => {
  const { status, stderr } = run(['--to']);
  assert.equal(status, 1);
  assert.match(stderr, /Missing --to/);
});

test('TC-SKREM-002 no arguments at all exits 1 rather than defaulting to a direction', () => {
  const { status, stderr } = run([]);
  assert.equal(status, 1);
  assert.match(stderr, /markdown\|pdf/);
});
