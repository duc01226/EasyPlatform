'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const toPng = require('../scripts/lib/to-png.cjs');
const { splitOfflineErrors } = require('../scripts/lib/browser.cjs');
const { safeBasename, fileStem } = require('../scripts/lib/paths.cjs');
const {
  SKILL_ROOT, makeTestEnv, copySkillScripts, withBrowserEnv: withIsolatedBrowser,
} = require('./test-env.cjs');

const EXPORT_SCRIPT = path.join(SKILL_ROOT, 'scripts', 'export.cjs');
const KNOWN_GOOD = path.join(__dirname, 'fixtures', 'known-good.html');
const ANIMATED_ENTRY_DECK = path.join(__dirname, 'fixtures', 'animated-entry-deck.html');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SPAWN_TIMEOUT_MS = 90_000;
// A run against a hanging page must end on its own well inside this; a hang is killed here and fails.
const HANG_SPAWN_TIMEOUT_MS = 60_000;
// A page that spins its main thread: the 3 s timeout, a responsiveness ping, at most one browser
// close budget (browser.cjs launchBudget: closing a spinning renderer took over 30 s on a loaded
// machine), and the next input, plus margin. A hang never ends, so it is still killed and fails.
const BUSY_RUN_BOUND_MS = 3000 + 1000 + 30_000 + 25_000;
const BUSY_SPAWN_TIMEOUT_MS = BUSY_RUN_BOUND_MS + 30_000;

function writeFile(root, name, content) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

function readReport(outDir) {
  return JSON.parse(fs.readFileSync(path.join(outDir, 'report.json'), 'utf8'));
}

function assertPng(file) {
  assert.ok(fs.existsSync(file), `${file} should exist`);
  const bytes = fs.readFileSync(file);
  assert.ok(bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE), `${file} should be a PNG`);
}

/** Spawns the dispatcher with an argv vector (never a shell) in the isolated test env. */
function runExport(testEnv, args, script = EXPORT_SCRIPT, { timeout = SPAWN_TIMEOUT_MS } = {}) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [script, '--to=png', ...args], {
    cwd: testEnv.root,
    env: testEnv.env,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout,
    maxBuffer: 4 * 1024 * 1024,
  });
  const run = { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '', elapsedMs: Date.now() - started };
  // A spawn timeout keeps the partial output; name it, so a stalled step can be diagnosed.
  if (result.error) {
    assert.fail(`spawn failed after ${run.elapsedMs} ms: ${result.error.message}\n${describeRun(run)}`);
  }
  return run;
}

function describeRun(run) {
  return `exit ${run.status}\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`;
}

/**
 * A clean skill copy (test-env copySkillScripts) plus its known-good fixture, so a case can change
 * one file or drop the dependencies without touching the real skill. With `linkNodeModules`,
 * node_modules is linked (a junction on Windows, a directory symlink on macOS/Linux); returns
 * null when the OS refuses the link.
 */
function makeSkillCopy(root, { linkNodeModules = false, knownGood = null } = {}) {
  const { skillRoot } = copySkillScripts(root);
  writeFile(skillRoot, path.join('tests', 'fixtures', 'known-good.html'), knownGood || fs.readFileSync(KNOWN_GOOD, 'utf8'));
  if (linkNodeModules) {
    try {
      fs.symlinkSync(path.join(SKILL_ROOT, 'node_modules'), path.join(skillRoot, 'node_modules'),
        process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EACCES') return null;
      throw error;
    }
  }
  return { skillRoot, exportScript: path.join(skillRoot, 'scripts', 'export.cjs') };
}

// png cases spawn the dispatcher with testEnv.env, so this process's env is left untouched.
function withBrowserEnv(t, run) {
  return withIsolatedBrowser(t, run, { prefix: 'html-export-png-', apply: false });
}

const THROWING_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Throws</title></head>
<body><h1>Visible heading</h1>
<script>throw new Error('fixture render failure');</script>
</body></html>`;

const EMPTY_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Empty</title>
<style>body{margin:0;background:#ffffff}</style></head>
<body><div class="app"></div></body></html>`;

// Remote assets only: offline aborts them, and nothing on the page depends on them.
const OFFLINE_ASSETS_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Offline assets</title>
<link rel="stylesheet" href="https://example.invalid/html-export-offline.css">
</head><body><h1>Offline heading</h1>
<img alt="" width="10" height="10" src="https://example.invalid/html-export-offline.png">
</body></html>`;

// A remote script the page relies on: offline aborts it, and the page then throws for real.
const OFFLINE_DEPENDENT_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Offline dependency</title>
<script src="https://example.invalid/html-export-chart-lib.js"></script>
</head><body><h1>Chart</h1>
<script>chartLib.render('#chart');</script>
</body></html>`;

const KEY_DECK_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Deck</title>
<style>body{margin:0}.deck__slide{display:none;height:100vh}.deck__slide--active{display:block}</style>
</head><body>
<section class="deck__slide deck__slide--active"><h1>Opening slide</h1></section>
<section class="deck__slide"><h1>Middle slide</h1></section>
<section class="deck__slide"></section>
<script>
var slides = Array.prototype.slice.call(document.querySelectorAll('.deck__slide'));
var index = 0;
document.addEventListener('keydown', function (event) {
  if (event.key === 'ArrowRight' && index < slides.length - 1) index += 1;
  if (event.key === 'Home') index = 0;
  slides.forEach(function (slide, i) { slide.classList.toggle('deck__slide--active', i === index); });
});
</script>
</body></html>`;

test('TC-HTMLX-010 isBlankEvidence is true only when text, images, svg and canvas are all zero', () => {
  // Given: Evidence with every signal at zero.
  const empty = { textLen: 0, imgs: 0, svg: 0, canvas: 0 };
  // When/Then: The all-zero frame is blank.
  assert.equal(toPng.isBlankEvidence(empty), true);
  // And: Any single non-zero signal makes the frame non-blank.
  for (const field of Object.keys(empty)) {
    assert.equal(toPng.isBlankEvidence({ ...empty, [field]: 1 }), false, field);
  }
  // And: Missing or malformed evidence can never hide a blank frame.
  assert.equal(toPng.isBlankEvidence({}), true);
  assert.equal(toPng.isBlankEvidence(null), true);
  assert.equal(toPng.isBlankEvidence({ textLen: Number.NaN, imgs: -1, svg: '0', canvas: undefined }), true);
});

test('TC-HTMLX-200 isPngBuffer requires the PNG signature and the byte floor', () => {
  // Given: A signed buffer above the floor, a truncated one, an unsigned one and a non-buffer.
  // When/Then: Only the signed buffer at or above the floor counts as a PNG.
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(toPng.isPngBuffer(Buffer.concat([header, Buffer.alloc(toPng.MIN_PNG_BYTES)])), true);
  assert.equal(toPng.isPngBuffer(header), false, 'a truncated buffer is below the floor');
  assert.equal(toPng.isPngBuffer(Buffer.alloc(toPng.MIN_PNG_BYTES * 2)), false, 'no signature');
  assert.equal(toPng.isPngBuffer('not a buffer'), false);
});

test('TC-HTMLX-201 offline aborts of blocked URLs move out of page errors; every other error stays', () => {
  // Given: Session errors under --offline, where one URL was aborted by the offline route.
  const blockedUrl = 'https://example.invalid/asset.png';
  const abort = { type: 'console', text: 'Failed to load resource: net::ERR_INTERNET_DISCONNECTED', location: { url: blockedUrl } };
  const unrelatedLoadFailure = { type: 'console', text: 'Failed to load resource: net::ERR_FILE_NOT_FOUND', location: { url: 'file:///missing.png' } };
  const pageConsole = { type: 'console', text: 'real failure', location: { url: blockedUrl } };
  const thrown = { type: 'pageerror', text: 'chartLib is not defined' };
  // When: The errors are split against the blocked list.
  const split = splitOfflineErrors([abort, unrelatedLoadFailure, pageConsole, thrown], [blockedUrl]);
  // Then: Only the abort message for a blocked URL is attributed to --offline.
  assert.deepEqual(split.offlineAborts, [abort]);
  assert.deepEqual(split.pageErrors, [unrelatedLoadFailure, pageConsole, thrown]);
  // And: Without a blocked list nothing is excused.
  assert.deepEqual(splitOfflineErrors([abort], []).pageErrors, [abort]);
});

test('TC-HTMLX-202 viewport list, capture names and the target contract', () => {
  // Given: The png defaults, viewport lists and capture coordinates.
  // When/Then: Defaults apply when --viewport is absent, a repeated size is rejected, and file
  // names encode viewport, 1-based slide number and the full-page suffix.
  assert.deepEqual(toPng.parseViewportList(undefined).map((viewport) => viewport.label), ['1440x900', '390x844']);
  assert.deepEqual(toPng.parseViewportList('800x600, 320x640').map((viewport) => viewport.label), ['800x600', '320x640']);
  for (const bad of ['800x600,', 'wide', '0x10', '800x600,800x600']) {
    assert.throws(() => toPng.parseViewportList(bad), /viewport/, bad);
  }
  assert.equal(toPng.captureName('deck', '1440x900'), 'deck@1440x900.png');
  assert.equal(toPng.captureName('deck', '390x844', 0), 'deck@390x844-s01.png');
  assert.equal(toPng.captureName('deck', '390x844', 11), 'deck@390x844-s12.png');
  assert.equal(toPng.captureName('page', '800x600', null, { fullPage: true }), 'page@800x600-full.png');
  assert.deepEqual(toPng.flags, { 'full-page': 'bool' });
  assert.equal(toPng.preflight({}), null);
});

test('TC-HTMLX-203 judgeSelfCheck trusts only one clean, non-blank known-good capture', () => {
  // Given: The report of a clean known-good render and one variant per failure branch.
  const clean = { files: [{ path: 'known-good.png' }], errors: [], blank: [], failures: [] };
  // When/Then: The clean report is trusted.
  assert.equal(toPng.judgeSelfCheck(clean), null);
  // And: A failed render, a page error, a blank capture or a wrong capture count each break trust,
  // with a reason that names the branch (exit 1 "verifier broken", never exit 4 "fix the page").
  const cases = [
    [{ ...clean, files: [], failures: [{ message: 'navigation timed out' }] }, /failed to render: navigation timed out/],
    [{ ...clean, errors: [{ text: 'boom' }] }, /reported 1 page error\(s\): boom/],
    [{ ...clean, blank: [{ reason: 'no visible text' }] }, /was judged blank: no visible text/],
    [{ ...clean, files: [] }, /produced 0 captures instead of 1/],
    [{ ...clean, files: [{}, {}] }, /produced 2 captures instead of 1/],
  ];
  for (const [report, reason] of cases) assert.match(toPng.judgeSelfCheck(report), reason);
});

test('TC-HTMLX-216 safeBasename applies the Windows file-name rules on every OS', () => {
  // Guards: an output name built from an input name is always a valid Windows file name, and the
  // same input names its outputs identically on Windows, macOS and Linux.
  // Given: Names with Windows-illegal characters, control characters, trailing dots/spaces,
  // device names, device-name look-alikes, and names that sanitize to nothing.
  const cases = [
    ['x<y>z:w"v|u?t*s.html', 'x_y_z_w_v_u_t_s.html'],
    ['a\u0001b\u001fc.html', 'a_b_c.html'],
    ['slides. . ', 'slides'],
    ['report.html. ', 'report.html'],
    ['CON', 'CON_'],
    ['con.html', 'con_.html'],
    ['nul.txt', 'nul_.txt'],
    ['Aux', 'Aux_'],
    ['PRN.pdf', 'PRN_.pdf'],
    ['COM1.pdf', 'COM1_.pdf'],
    ['lpt9', 'lpt9_'],
    ['console.html', 'console.html'],
    ['COM10.html', 'COM10.html'],
    ['CONx', 'CONx'],
    ['page.html', 'page.html'],
  ];
  // When: Each name goes through safeBasename.
  // Then: Illegal and control characters become `_`, trailing dots/spaces are dropped, only an
  // exact device name (bare or before an extension) gets a `_` suffix, and safe names are kept.
  for (const [input, expected] of cases) assert.equal(safeBasename(input), expected, JSON.stringify(input));
  // And: A backslash is a path separator on Windows, so only the last segment is kept; on macOS and
  // Linux it is an ordinary name character, which is Windows-reserved and so becomes `_`.
  const backslashName = 'deck\\v2.html';
  assert.equal(safeBasename(backslashName), process.platform === 'win32' ? 'v2.html' : 'deck_v2.html');
  // And: A name that sanitizes to nothing falls back, to the caller's fallback when given.
  assert.equal(safeBasename(''), 'input');
  assert.equal(safeBasename('. . .'), 'input');
  assert.equal(safeBasename('...', 'export'), 'export');
});

test('TC-HTMLX-217 fileStem drops the last extension, then applies the same safeBasename rules', () => {
  // Guards: png (and video) output stems follow the one shared naming rule in paths.cjs.
  // Given: Input file paths, some with unsafe stems.
  // When/Then: The last extension is removed and the stem is sanitized.
  assert.equal(fileStem(path.join('decks', 'deck.html')), 'deck');
  assert.equal(fileStem('report.v2.htm'), 'report.v2');
  assert.equal(fileStem('CON.html'), 'CON_');
  assert.equal(fileStem('trail. .html'), 'trail');
  assert.equal(fileStem('x|y.html'), 'x_y');
  // And: An empty stem falls back.
  assert.equal(fileStem(''), 'input');
  assert.equal(fileStem('', 'animation'), 'animation');
});

test('TC-HTMLX-218 png validate rejects two inputs whose names sanitize to the same PNG names', (t) => {
  // Guards: the duplicate-name check and the written names use the same stem (paths.cjs fileStem),
  // so two inputs can never overwrite each other's captures.
  if (process.platform === 'win32') {
    // Windows cannot create file names holding `?` or `*`; TC-HTMLX-216/217 cover the rule there.
    t.skip('Windows forbids the `?` and `*` file names this case needs');
    return;
  }
  const testEnv = makeTestEnv({ prefix: 'html-export-png-stem-' });
  t.after(() => testEnv.cleanup());
  // Given: Two different files whose names differ only in characters that sanitize to `_`.
  const first = writeFile(testEnv.root, 'deck?1.html', '<p>one</p>');
  const second = writeFile(testEnv.root, 'deck*1.html', '<p>two</p>');
  // When: The png target validates them together.
  // Then: It is a usage error naming both inputs, because both would write deck_1@<WxH>.png.
  assert.throws(() => toPng.validate({ inputs: [first, second], cwd: testEnv.root }), (error) => {
    assert.match(error.message, /would write the same PNG names; rename one/);
    assert.ok(error.message.includes(first) && error.message.includes(second), error.message);
    return true;
  });
});

test('TC-HTMLX-014 validate rejects bad input with exit 2 even when no dependency is installed', () => {
  // Given: A copy of the skill scripts with NO node_modules, and an unrelated cwd.
  const testEnv = makeTestEnv({ prefix: 'html-export-png-validate-' });
  try {
    const copy = makeSkillCopy(path.join(testEnv.root, 'project'));
    assert.equal(fs.existsSync(path.join(copy.skillRoot, 'node_modules')), false);
    const notes = writeFile(testEnv.root, 'notes.txt', 'plain text');
    const page = writeFile(testEnv.root, 'page.html', '<p>ok</p>');
    // Two inputs with the same file name in different folders would write the same PNG names.
    const samePageA = writeFile(testEnv.root, path.join('a', 'page.html'), '<p>a</p>');
    const samePageB = writeFile(testEnv.root, path.join('b', 'Page.html'), '<p>b</p>');
    const out = path.join(testEnv.root, 'out');
    const cases = [
      { args: [path.join(testEnv.root, 'missing.html')], message: /input file not found/ },
      { args: [notes], message: /\.html or \.htm/ },
      { args: [page, '--viewport=800'], message: /viewport/ },
      { args: [page, '--viewport=800x600,800x600'], message: /--viewport lists 800x600 more than once/ },
      { args: [page, '--page=1280x720'], message: /--page applies only to --to=pdf/ },
      { args: [page, '--timeout=0'], message: /--timeout must be a positive/ },
      { args: [page, '--scale=0'], message: /--scale must be a positive/ },
      { args: [page, '--full-page', '--slides'], message: /--full-page .*cannot be combined with --slides/ },
      { args: [samePageA, samePageB], message: /would write the same PNG names; rename one/ },
      { args: [], message: /at least one \.html input/ },
    ];
    for (const { args, message } of cases) {
      // When: The dispatcher runs the png target with the bad input.
      const run = runExport(testEnv, [...args, '--out', out], copy.exportScript);
      // Then: It is a usage error (2), not a dependency error (3), and names the problem.
      assert.equal(run.status, 2, `${args.join(' ')}\n${describeRun(run)}`);
      assert.match(run.stderr, message);
    }
    // And: A valid input passes validation and reaches the dependency check instead.
    const valid = runExport(testEnv, [page, '--out', out], copy.exportScript);
    assert.equal(valid.status, 3, describeRun(valid));
    assert.equal(fs.existsSync(out), false, 'nothing is written before the run starts');
  } finally {
    testEnv.cleanup();
  }
});

test('TC-HTMLX-012 known-good at the two default viewports writes two PNGs and exits 0', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: The known-good fixture and a temp output directory.
    const out = path.join(testEnv.root, 'out');
    // When: The png target runs with default viewports.
    const run = runExport(testEnv, [KNOWN_GOOD, '--out', out]);
    // Then: Exit 0, one PNG per default viewport, and a clean report.
    assert.equal(run.status, 0, describeRun(run));
    assertPng(path.join(out, 'known-good@1440x900.png'));
    assertPng(path.join(out, 'known-good@390x844.png'));
    const report = readReport(out);
    assert.equal(report.ok, true);
    assert.equal(report.exitCode, 0);
    assert.deepEqual(report.files.map((file) => path.basename(file.path)), ['known-good@1440x900.png', 'known-good@390x844.png']);
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.blank, []);
    assert.equal(report.strategy, null);
    for (const file of report.files) {
      assert.ok(file.evidence.textLen > 0 && file.evidence.svg > 0, JSON.stringify(file.evidence));
    }
  });
});

test('TC-HTMLX-011 a page that throws exits 4 and the report lists the error', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page with visible content whose script throws during load.
    const page = writeFile(testEnv.root, 'throws.html', THROWING_HTML);
    const out = path.join(testEnv.root, 'out');
    // When: The png target renders it at one viewport.
    const run = runExport(testEnv, [page, '--viewport=800x600', '--out', out]);
    // Then: Exit 4, and the thrown error is in report.errors with its viewport and step.
    assert.equal(run.status, 4, describeRun(run));
    const report = readReport(out);
    assert.equal(report.ok, false);
    const thrown = report.errors.find((entry) => entry.type === 'pageerror');
    assert.ok(thrown, `pageerror missing from ${JSON.stringify(report.errors)}`);
    assert.match(thrown.text, /fixture render failure/);
    assert.equal(thrown.viewport, '800x600');
    assert.equal(thrown.at, 'load');
    assert.deepEqual(report.blank, [], 'the page has content, so the failure is the error, not a blank frame');
    assert.match(run.stderr, /fixture render failure/);

    // And: --allow-errors lets the run pass while still reporting the error.
    const allowedOut = path.join(testEnv.root, 'allowed');
    const allowed = runExport(testEnv, [page, '--viewport=800x600', '--allow-errors', '--out', allowedOut]);
    assert.equal(allowed.status, 0, describeRun(allowed));
    assert.equal(readReport(allowedOut).errors.length, report.errors.length);
  });
});

test('TC-HTMLX-204 a blank capture exits 4 and --allow-errors does not excuse it', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page that loads without errors but renders nothing visible.
    const page = writeFile(testEnv.root, 'empty.html', EMPTY_HTML);
    const out = path.join(testEnv.root, 'out');
    // When: The png target renders it, even with --allow-errors.
    const run = runExport(testEnv, [page, '--viewport=800x600', '--allow-errors', '--out', out]);
    // Then: Exit 4 with the capture listed as blank, while the PNG itself was still written.
    assert.equal(run.status, 4, describeRun(run));
    const report = readReport(out);
    assert.deepEqual(report.errors, []);
    assert.equal(report.blank.length, 1);
    assert.equal(path.basename(report.blank[0].path), 'empty@800x600.png');
    assert.match(report.blank[0].reason, /no visible text/);
    assertPng(path.join(out, 'empty@800x600.png'));
  });
});

test('TC-HTMLX-205 offline: a blocked WebSocket is listed in blocked with its own abort message', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page that opens a WebSocket and handles its failure (the socket is not needed to render).
    const page = writeFile(testEnv.root, 'socket.html', '<!doctype html><html><body><h1>Socket page</h1>'
      + '<script>const s = new WebSocket("ws://127.0.0.1:9/html-export-offline"); s.onerror = () => {};</script>'
      + '</body></html>');
    const out = path.join(testEnv.root, 'out-socket');
    // When: The png target renders it with --offline.
    const run = runExport(testEnv, [page, '--viewport=800x600', '--offline', '--out', out]);
    // Then: Exit 0; the socket is blocked and its entry carries the abort text (keyed by the socket URL,
    // not by the script that opened it).
    assert.equal(run.status, 0, describeRun(run));
    const report = readReport(out);
    const socket = report.blocked.find((entry) => entry.url.startsWith('ws://'));
    assert.ok(socket, JSON.stringify(report.blocked));
    assert.match(String(socket.message), /WebSocket connection to/);
  });
});

test('TC-HTMLX-206 offline: aborted remote assets go to blocked, while a page error they cause still exits 4', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page whose remote stylesheet and image are not needed to render.
    const assets = writeFile(testEnv.root, 'assets.html', OFFLINE_ASSETS_HTML);
    const out = path.join(testEnv.root, 'out-assets');
    // When: The png target renders it with --offline.
    const run = runExport(testEnv, [assets, '--viewport=800x600', '--offline', '--out', out]);
    // Then: Exit 0; the abort messages are recorded under blocked, not errors.
    assert.equal(run.status, 0, describeRun(run));
    const report = readReport(out);
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.blocked.map((entry) => entry.url).sort(), [
      'https://example.invalid/html-export-offline.css',
      'https://example.invalid/html-export-offline.png',
    ]);
    for (const entry of report.blocked) assert.match(entry.message, /net::ERR_/);

    // Given: A page that calls into a remote script offline mode blocks.
    const dependent = writeFile(testEnv.root, 'dependent.html', OFFLINE_DEPENDENT_HTML);
    const dependentOut = path.join(testEnv.root, 'out-dependent');
    // When: It renders with --offline.
    const failing = runExport(testEnv, [dependent, '--viewport=800x600', '--offline', '--out', dependentOut]);
    // Then: The abort is excused, but the real exception it caused keeps exit 4.
    assert.equal(failing.status, 4, describeRun(failing));
    const failingReport = readReport(dependentOut);
    assert.deepEqual(failingReport.blocked.map((entry) => entry.url), ['https://example.invalid/html-export-chart-lib.js']);
    assert.equal(failingReport.errors.length, 1, JSON.stringify(failingReport.errors));
    assert.equal(failingReport.errors[0].type, 'pageerror');
    assert.match(failingReport.errors[0].text, /chartLib/);
  });
});

test('TC-HTMLX-207 --slides captures every item as -sNN files and flags a blank slide', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A key-driven deck whose third slide is empty.
    const deck = writeFile(testEnv.root, 'deck.html', KEY_DECK_HTML);
    const out = path.join(testEnv.root, 'out');
    // When: The png target navigates it with the producer's selector.
    const run = runExport(testEnv, [deck, '--slides=section.deck__slide', '--viewport=800x600', '--out', out]);
    // Then: Three numbered PNGs, the keys strategy, and exactly slide 3 reported blank.
    assert.equal(run.status, 4, describeRun(run));
    for (const suffix of ['s01', 's02', 's03']) assertPng(path.join(out, `deck@800x600-${suffix}.png`));
    const report = readReport(out);
    assert.equal(report.strategy, 'keys');
    assert.equal(report.navigation[0].count, 3);
    assert.deepEqual(report.blank.map((entry) => entry.slide), [3]);
    assert.deepEqual(report.errors, []);
    assert.ok(report.files[0].evidence.textLen > 0 && report.files[1].evidence.textLen > 0);
  });
});

test('TC-HTMLX-208 --self-check passes on the shipped fixture and exits 1 "verifier broken" when the fixture fails', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: The real skill and its shipped known-good fixture.
    const page = writeFile(testEnv.root, 'page.html', '<!doctype html><title>Page</title><p>Page body</p>');
    const out = path.join(testEnv.root, 'out');
    // When: The png target runs with --self-check.
    const run = runExport(testEnv, [page, '--self-check', '--viewport=800x600', '--out', out]);
    // Then: The self-check passed first, and the real input was captured.
    assert.equal(run.status, 0, describeRun(run));
    assert.match(run.stdout, /self-check: known-good fixture passed/);
    assertPng(path.join(out, 'self-check', 'known-good@800x600.png'));
    assertPng(path.join(out, 'page@800x600.png'));
    assert.equal(readReport(out).selfCheck.ok, true);

    // Given: A skill copy whose known-good fixture now throws.
    const copy = makeSkillCopy(path.join(testEnv.root, 'project'), { linkNodeModules: true, knownGood: THROWING_HTML });
    if (!copy) {
      console.log('ENVIRONMENT-BLOCKED: directory link (the OS refused to link node_modules into the skill copy)');
      t.skip('ENVIRONMENT-BLOCKED: directory link');
      return;
    }
    const brokenOut = path.join(testEnv.root, 'broken');
    // When: --self-check runs there.
    const broken = runExport(testEnv, [page, '--self-check', '--viewport=800x600', '--out', brokenOut], copy.exportScript);
    // Then: Exit 1 "verifier broken", and the real input is never captured.
    assert.equal(broken.status, 1, describeRun(broken));
    assert.match(broken.stderr, /verifier broken: .*fixture render failure/);
    assert.equal(fs.existsSync(path.join(brokenOut, 'page@800x600.png')), false);
    assert.equal(readReport(brokenOut).selfCheck.ok, false);
  });
});

test('TC-HTMLX-209 the png target module loads without Playwright', () => {
  // Given: A fresh Node process in an isolated env and temp cwd.
  const testEnv = makeTestEnv({ prefix: 'html-export-png-load-' });
  try {
    const probe = `const t = require(${JSON.stringify(path.join(SKILL_ROOT, 'scripts', 'lib', 'to-png.cjs'))});`
      + 'process.stdout.write(String(Object.keys(require.cache).some((key) => /[\\\\/]playwright(-core)?[\\\\/]/.test(key))));';
    // When: It requires the png target.
    const result = spawnSync(process.execPath, ['-e', probe], {
      cwd: testEnv.root, env: testEnv.env, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000,
    });
    // Then: Requiring the target never loads Playwright.
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'false');
  } finally {
    testEnv.cleanup();
  }
});

test('TC-HTMLX-210 --slides with a selector that matches nothing exits 4 with a blank entry and no capture', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A key deck and a selector that matches none of its items.
    const deck = writeFile(testEnv.root, 'deck.html', KEY_DECK_HTML);
    const out = path.join(testEnv.root, 'out');
    // When: The png target navigates with that selector.
    const run = runExport(testEnv, [deck, '--slides=.does-not-exist', '--viewport=800x600', '--out', out]);
    // Then: Exit 4 (a zero-match run is never a pass), the report says why, and nothing was captured.
    assert.equal(run.status, 4, describeRun(run));
    const report = readReport(out);
    assert.deepEqual(report.files, []);
    assert.equal(report.blank.length, 1);
    assert.match(report.blank[0].reason, /matched no items/);
    assert.equal(report.navigation[0].count, 0);
  });
});

test('TC-HTMLX-211 --slides on an entry-animated deck uses keys navigation and captures every slide', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A single-visible deck whose active slide fades in after a delay.
    const out = path.join(testEnv.root, 'out');
    // When: The png target captures it slide by slide.
    const run = runExport(testEnv, [ANIMATED_ENTRY_DECK, '--slides=section.deck__slide', '--viewport=800x600', '--out', out]);
    // Then: The producer's own key navigation was used (not a synthetic stacked layout), and all
    // three slides were captured with visible content.
    assert.equal(run.status, 0, describeRun(run));
    const report = readReport(out);
    assert.equal(report.strategy, 'keys', JSON.stringify(report.navigation));
    assert.equal(report.navigation[0].fallback, null);
    assert.equal(report.files.length, 3);
    assert.deepEqual(report.blank, []);
  });
});

test('TC-HTMLX-212 --full-page adds a whole-document capture whose blank check covers the whole document', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page with a heading on the first screen and a second heading far below the fold.
    const page = writeFile(testEnv.root, 'long.html', '<!doctype html><title>Long</title>'
      + '<style>body{margin:0}.spacer{height:2400px}</style>'
      + '<h1>Above the fold</h1><div class="spacer"></div><h2>Below the fold closing section</h2>');
    const out = path.join(testEnv.root, 'out');
    // When: The png target runs with --full-page at one viewport.
    const run = runExport(testEnv, [page, '--full-page', '--viewport=800x600', '--out', out]);
    // Then: Both the viewport capture and the -full capture exist; the full image is taller than
    // the viewport, and only its evidence includes the below-the-fold text.
    assert.equal(run.status, 0, describeRun(run));
    const report = readReport(out);
    assert.equal(report.fullPage, true);
    const viewportCapture = report.files.find((file) => file.fullPage === false);
    const fullCapture = report.files.find((file) => file.fullPage === true);
    assert.equal(path.basename(viewportCapture.path), 'long@800x600.png');
    assert.equal(path.basename(fullCapture.path), 'long@800x600-full.png');
    assertPng(fullCapture.path);
    const heightOf = (file) => fs.readFileSync(file).readUInt32BE(20);
    assert.equal(heightOf(viewportCapture.path), 600);
    assert.ok(heightOf(fullCapture.path) > 2400, `full capture height ${heightOf(fullCapture.path)}`);
    const belowFold = 'Below the fold closing section'.length;
    assert.equal(fullCapture.evidence.textLen, viewportCapture.evidence.textLen + belowFold, JSON.stringify(report.files));

    // Given: A page whose only content is below the fold.
    const hidden = writeFile(testEnv.root, 'late.html', '<!doctype html><title>Late</title>'
      + '<style>body{margin:0}.spacer{height:2400px}</style><div class="spacer"></div><p>Late content</p>');
    const hiddenOut = path.join(testEnv.root, 'late-out');
    // When: It runs with --full-page.
    const late = runExport(testEnv, [hidden, '--full-page', '--viewport=800x600', '--out', hiddenOut]);
    // Then: The first screen is still reported blank (exit 4), while the whole-document capture is not.
    assert.equal(late.status, 4, describeRun(late));
    const lateReport = readReport(hiddenOut);
    assert.deepEqual(lateReport.blank.map((entry) => path.basename(entry.path)), ['late@800x600.png']);
  });
});

// A page that defines window.__ready and never sets it, so opening it times out.
const NEVER_READY_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Never ready</title>
<script>window.__ready = false;</script></head><body><h1>Never ready</h1></body></html>`;

test('TC-HTMLX-213 a failing input is logged and skipped while the other inputs are still captured', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: One page that never becomes ready and one known-good page, with a short timeout.
    const stuck = writeFile(testEnv.root, 'stuck.html', NEVER_READY_HTML);
    const out = path.join(testEnv.root, 'out');
    // When: Both are exported in one batch, the failing input first.
    const run = runExport(testEnv, [stuck, KNOWN_GOOD, '--viewport=800x600', '--timeout=5000', '--out', out]);
    // Then: The batch did not stop at the failure: the good page was captured, the failure is in
    // report.failures and on stderr, and the exit code still signals the failure (4).
    assert.equal(run.status, 4, describeRun(run));
    assertPng(path.join(out, 'known-good@800x600.png'));
    const report = readReport(out);
    assert.equal(report.failures.length, 1, JSON.stringify(report.failures));
    assert.equal(report.failures[0].input, stuck);
    assert.equal(report.failures[0].viewport, '800x600');
    assert.equal(report.failures[0].step, 'open');
    assert.match(report.failures[0].message, /__ready/);
    assert.equal(report.failures[0].pageFault, true);
    assert.deepEqual(report.files.map((file) => path.basename(file.path)), ['known-good@800x600.png']);
    assert.match(run.stderr, /failed stuck\.html 800x600 open: .*\(page fault; continuing\)/);

    // Given: The same broken page exported alone.
    const aloneOut = path.join(testEnv.root, 'alone');
    // When: It runs.
    const alone = runExport(testEnv, [stuck, '--viewport=800x600', '--timeout=5000', '--out', aloneOut]);
    // Then: TC-HTMLX-018: the page is at fault, so the exit is 4 exactly as inside the batch
    // (never 1 "tool failure"), even though nothing was captured.
    assert.equal(alone.status, 4, describeRun(alone));
    const aloneReport = readReport(aloneOut);
    assert.deepEqual(aloneReport.files, []);
    assert.equal(aloneReport.exitCode, 4);
    assert.deepEqual(aloneReport.failures.map((failure) => [failure.step, failure.pageFault]), [['open', true]]);
    // And: A page that is merely never ready (not busy) is reported as such.
    assert.match(aloneReport.failures[0].message, /page defines window\.__ready but it did not become true within 5000 ms/);
  });
});

test('TC-HTMLX-214 --self-check exits 1 "verifier broken" when the known-good fixture renders blank', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A skill copy whose known-good fixture renders nothing visible.
    const copy = makeSkillCopy(path.join(testEnv.root, 'project'), { linkNodeModules: true, knownGood: EMPTY_HTML });
    if (!copy) {
      console.log('ENVIRONMENT-BLOCKED: directory link (the OS refused to link node_modules into the skill copy)');
      t.skip('ENVIRONMENT-BLOCKED: directory link');
      return;
    }
    const page = writeFile(testEnv.root, 'page.html', '<!doctype html><title>Page</title><p>Page body</p>');
    const out = path.join(testEnv.root, 'out');
    // When: --self-check runs there.
    const run = runExport(testEnv, [page, '--self-check', '--viewport=800x600', '--out', out], copy.exportScript);
    // Then: Exit 1 "verifier broken" (never exit 4 "fix the page"), and the real input is not captured.
    assert.equal(run.status, 1, describeRun(run));
    assert.match(run.stderr, /verifier broken: known-good fixture was judged blank/);
    assert.equal(fs.existsSync(path.join(out, 'page@800x600.png')), false);
    assert.equal(readReport(out).selfCheck.ok, false);
  });
});

test('TC-HTMLX-018 exitCodeFor: a page fault anywhere exits 4, a tool fault alone exits 1', () => {
  const base = { files: [], errors: [], blank: [], failures: [], allowErrors: false };
  const pageFailure = { step: 'open', pageFault: true };
  const toolFailure = { step: 'capture', pageFault: false };
  // Given / When / Then: Nothing wrong -> 0.
  assert.equal(toPng.exitCodeFor(base), 0);
  // And: A page fault exits 4 even when nothing was captured.
  assert.equal(toPng.exitCodeFor({ ...base, failures: [pageFailure] }), 4);
  // And: Only tool faults -> 1 (not verifiable), with or without captures.
  assert.equal(toPng.exitCodeFor({ ...base, failures: [toolFailure] }), 1);
  assert.equal(toPng.exitCodeFor({ ...base, files: [{}], failures: [toolFailure] }), 1);
  // And: Anything the page caused wins over a tool fault: a page-fault failure, a blank capture,
  // or page errors without --allow-errors.
  assert.equal(toPng.exitCodeFor({ ...base, failures: [toolFailure, pageFailure] }), 4);
  assert.equal(toPng.exitCodeFor({ ...base, failures: [toolFailure], blank: [{}] }), 4);
  assert.equal(toPng.exitCodeFor({ ...base, failures: [toolFailure], errors: [{}] }), 4);
  // And: --allow-errors excuses page errors only.
  assert.equal(toPng.exitCodeFor({ ...base, files: [{}], errors: [{}], allowErrors: true }), 0);
  assert.equal(toPng.exitCodeFor({ ...base, errors: [{}], blank: [{}], allowErrors: true }), 4);
});

test('TC-HTMLX-018 a capture that cannot be written is a tool fault: exit 1, never 4', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: An output folder where the capture's file name is already taken by a directory.
    const out = path.join(testEnv.root, 'out');
    fs.mkdirSync(path.join(out, 'known-good@800x600.png'), { recursive: true });
    // When: The known-good page is captured there.
    const run = runExport(testEnv, [KNOWN_GOOD, '--viewport=800x600', '--out', out]);
    // Then: The write failure is recorded as a tool fault and the exit is 1 (not verifiable).
    assert.equal(run.status, 1, describeRun(run));
    const report = readReport(out);
    assert.deepEqual(report.failures.map((failure) => [failure.step, failure.pageFault]), [['capture', false]]);
    assert.match(run.stderr, /\(tool fault; continuing\)/);
  });
});

// A page that reports "not ready" and then blocks its main thread in an endless loop.
const BUSY_AFTER_LOAD_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Busy after load</title>
<script>window.__ready = false; setTimeout(function () { for (;;) {} }, 300);</script>
</head><body><h1>Busy after load</h1></body></html>`;

/**
 * A three-screen prototype (a, b, c) driven by window.__proto.goTo. `onB` is the JavaScript run
 * when screen b is requested, before the screen changes (for example a throw or a pending promise).
 */
function protoDeckHtml(onB) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Prototype</title>
<style>body{margin:0}[data-state]{display:none;height:100vh}[data-state].is-current{display:block}</style>
</head><body>
<section data-state="a" class="is-current"><h1>Screen A</h1></section>
<section data-state="b"><h1>Screen B</h1></section>
<section data-state="c"><h1>Screen C</h1></section>
<script>
window.__proto = {
  goTo: function (id) {
    if (id === 'b') { ${onB} }
    document.querySelectorAll('[data-state]').forEach(function (screen) {
      screen.classList.toggle('is-current', screen.getAttribute('data-state') === id);
    });
  }
};
</script>
</body></html>`;
}

test('TC-HTMLX-017 a page that blocks its main thread is a bounded failure and the batch continues', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page that never becomes ready and blocks its main thread, then a known-good page.
    const busy = writeFile(testEnv.root, 'busy.html', BUSY_AFTER_LOAD_HTML);
    const out = path.join(testEnv.root, 'out');
    // When: Both are captured with a 3 second timeout.
    const run = runExport(testEnv, [busy, KNOWN_GOOD, '--viewport=800x600', '--timeout=3000', '--out', out],
      EXPORT_SCRIPT, { timeout: BUSY_SPAWN_TIMEOUT_MS });
    // Then: The run ended on its own (no hang), the busy page is a recorded page fault, and the
    // known-good page after it was still captured.
    assert.equal(run.status, 4, describeRun(run));
    assert.ok(run.elapsedMs < BUSY_RUN_BOUND_MS, `the run took ${run.elapsedMs} ms (bound ${BUSY_RUN_BOUND_MS} ms)`);
    assertPng(path.join(out, 'known-good@800x600.png'));
    const report = readReport(out);
    assert.equal(report.failures.length, 1, JSON.stringify(report.failures));
    assert.equal(path.basename(report.failures[0].input), 'busy.html');
    assert.equal(report.failures[0].step, 'open');
    assert.equal(report.failures[0].pageFault, true);
    assert.match(report.failures[0].message, /the window\.__ready check did not answer within 3000 ms; a page script is still running/);
  });
});

test('TC-HTMLX-017 a __proto.goTo that never settles fails that slide within --timeout; the other slides are captured', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A prototype whose goTo for screen b returns a promise that never settles.
    const deck = writeFile(testEnv.root, 'pending.html', protoDeckHtml('return new Promise(function () {});'));
    const out = path.join(testEnv.root, 'out');
    // When: Every screen is captured with a 3 second timeout.
    const run = runExport(testEnv, [deck, '--slides=[data-state]', '--viewport=800x600', '--timeout=3000', '--out', out],
      EXPORT_SCRIPT, { timeout: HANG_SPAWN_TIMEOUT_MS });
    // Then: The run ended on its own; screens 1 and 3 were captured, screen 2 is the one failure.
    assert.equal(run.status, 4, describeRun(run));
    assert.ok(run.elapsedMs < 45_000, `the run took ${run.elapsedMs} ms`);
    const report = readReport(out);
    assert.deepEqual(report.files.map((file) => path.basename(file.path)), ['pending@800x600-s01.png', 'pending@800x600-s03.png']);
    report.files.forEach((file) => assertPng(file.path));
    assert.equal(report.failures.length, 1, JSON.stringify(report.failures));
    assert.deepEqual([report.failures[0].slide, report.failures[0].step, report.failures[0].pageFault], [2, 'slide', true]);
    assert.match(report.failures[0].message, /__proto\.goTo for item 2 did not finish within 3000 ms/);
    assert.deepEqual(report.blank, []);
  });
});

test('TC-HTMLX-019 one slide whose navigation throws is recorded; the slides after it are still captured', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A prototype whose goTo throws for screen b.
    const deck = writeFile(testEnv.root, 'throws.html', protoDeckHtml("throw new Error('screen b is broken');"));
    const out = path.join(testEnv.root, 'out');
    // When: Every screen is captured.
    const run = runExport(testEnv, [deck, '--slides=[data-state]', '--viewport=800x600', '--out', out]);
    // Then: Screen 2 is the one recorded page fault, screens 1 and 3 were captured, and the exit is 4.
    assert.equal(run.status, 4, describeRun(run));
    const report = readReport(out);
    assert.deepEqual(report.files.map((file) => path.basename(file.path)), ['throws@800x600-s01.png', 'throws@800x600-s03.png']);
    assert.equal(report.failures.length, 1, JSON.stringify(report.failures));
    assert.deepEqual([report.failures[0].slide, report.failures[0].step, report.failures[0].pageFault], [2, 'slide', true]);
    assert.match(report.failures[0].message, /screen b is broken/);
    assert.match(run.stderr, /failed throws\.html 800x600 slide 2 slide: .*\(page fault; continuing\)/);
    // And: Screen 3 shows its own content, so navigation recovered after the failure.
    assert.ok(report.files[1].evidence.textLen > 0, JSON.stringify(report.files[1]));
    assert.equal(report.navigation[0].strategy, 'proto');
  });
});

test('TC-HTMLX-065 png: an unparsable --slides selector exits 2 (fix the command), never 4 (fix the page)', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A keyboard deck and a selector the browser cannot parse.
    const deck = writeFile(testEnv.root, 'deck.html', KEY_DECK_HTML);
    const out = path.join(testEnv.root, 'out');
    // When: It is captured in slides mode.
    const run = runExport(testEnv, [deck, '--slides=[[bad', '--viewport=800x600', '--out', out]);
    // Then: A usage error (exit 2) naming the selector; nothing captured and nothing blamed on the page.
    assert.equal(run.status, 2, describeRun(run));
    assert.match(run.stderr, /Usage error: the slides selector "\[\[bad" is not a valid CSS selector/);
    assert.doesNotMatch(run.stderr, /page fault/);
    const report = readReport(out);
    assert.equal(report.exitCode, 2);
    assert.match(report.usageError, /\[\[bad/);
    assert.deepEqual([report.files, report.failures, report.blank], [[], [], []]);
    // Control: The same deck with a valid selector is captured (exit 0), so the page was never the problem.
    const controlOut = path.join(testEnv.root, 'control');
    const control = runExport(testEnv, [deck, '--slides=.deck__slide', '--viewport=800x600', '--out', controlOut]);
    assert.notEqual(control.status, 2, describeRun(control));
    assert.ok(readReport(controlOut).files.length > 0);
  });
});

const THROWS_BEFORE_READY_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Throws before ready</title>
<script>window.__ready = false; throw new Error('boom-before-ready');</script>
</head><body><h1>Never ready</h1></body></html>`;

test('TC-HTMLX-066 png: an error the page threw before its open failed is in report.errors, not only the __ready timeout', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page that throws and so never sets window.__ready to true.
    const page = writeFile(testEnv.root, 'stuck.html', THROWS_BEFORE_READY_HTML);
    const out = path.join(testEnv.root, 'out');
    // When: It is captured with a 3 second timeout.
    const run = runExport(testEnv, [page, '--viewport=800x600', '--timeout=3000', '--out', out]);
    // Then: Exit 4, the open failure is recorded, AND the thrown error that caused it is in errors[],
    // tagged with its input, viewport and the load step.
    assert.equal(run.status, 4, describeRun(run));
    const report = readReport(out);
    assert.deepEqual(report.failures.map((failure) => [failure.step, failure.pageFault]), [['open', true]]);
    const thrown = report.errors.find((entry) => /boom-before-ready/.test(entry.text));
    assert.ok(thrown, JSON.stringify(report.errors));
    assert.deepEqual([path.basename(thrown.input), thrown.viewport, thrown.at, thrown.type], ['stuck.html', '800x600', 'load', 'pageerror']);
    assert.match(run.stderr, /error {2}stuck\.html 800x600 load: .*boom-before-ready/);
  });
});

test('TC-HTMLX-215 the png spawn helper names the child output when the child is killed on a spawn timeout', (t) => {
  // Given: A child that prints where it is and then never ends.
  const testEnv = makeTestEnv({ prefix: 'html-export-png-helper-' });
  t.after(() => testEnv.cleanup());
  const stalled = writeFile(testEnv.root, 'stalled.cjs',
    "process.stdout.write('reached-step-capture\\n'); process.stderr.write('last-stderr-line\\n'); setInterval(() => {}, 1000);");
  // When: The helper runs it with a spawn timeout long enough for the child to start under load
  // (10 s; 1.5 s killed a cold-starting child before it printed).
  // Then: It fails, and the failure carries the partial stdout and stderr, so the stalled step is known.
  assert.throws(() => runExport(testEnv, [], stalled, { timeout: 10_000 }), (error) => {
    assert.match(error.message, /spawn failed after \d+ ms: .*ETIMEDOUT/);
    assert.match(error.message, /reached-step-capture/);
    assert.match(error.message, /last-stderr-line/);
    return true;
  });
});
