'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const toPdf = require('../scripts/lib/to-pdf.cjs');
const {
  SKILL_ROOT,
  makeTestEnv,
  withBrowserEnv: withIsolatedBrowser,
  copySkillScripts,
  allowlistEnv,
  writeFakePlaywright,
  assertSetupHints,
  removeTree,
} = require('./test-env.cjs');

const DISPATCHER = path.join(SKILL_ROOT, 'scripts', 'export.cjs');
const LIB_DIR = path.join(SKILL_ROOT, 'scripts', 'lib');
const FIXTURE = path.join(__dirname, 'fixtures', 'deck-two-slides.html');
const CSS_PAGE_SIZE_FIXTURE = path.join(__dirname, 'fixtures', 'css-page-size.html');
const KNOWN_GOOD = path.join(__dirname, 'fixtures', 'known-good.html');
const PDF_LIB_ROOT = path.join(SKILL_ROOT, 'node_modules', 'pdf-lib');
const SPAWN_TIMEOUT_MS = 120_000;
// A run against a hanging page must end on its own well inside this; a hang is killed here and fails.
const HANG_SPAWN_TIMEOUT_MS = 60_000;
// A page that spins its main thread: the 3 s timeout, a responsiveness ping, at most one browser
// close budget (browser.cjs launchBudget: closing a spinning renderer took over 30 s on a loaded
// machine), and the next input, plus margin. A hang never ends, so it is still killed and fails.
const BUSY_RUN_BOUND_MS = 3000 + 1000 + 30_000 + 25_000;
const BUSY_SPAWN_TIMEOUT_MS = BUSY_RUN_BOUND_MS + 30_000;
// CSS pixels to PDF points: 96 px = 72 pt.
const PX_TO_PT = 0.75;

const SLIDE_ALPHA = 'https://example.invalid/slide-alpha';
const SLIDE_BETA = 'https://example.invalid/slide-beta';
const CONTROLS = 'https://example.invalid/deck-controls';

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, 'utf8');
  return file;
}

function spawnNode(script, args, { cwd, env, timeout = SPAWN_TIMEOUT_MS }) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    env,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout,
    maxBuffer: 4 * 1024 * 1024,
  });
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const elapsedMs = Date.now() - started;
  // A spawn timeout keeps the partial output; name it, so a stalled step can be diagnosed.
  if (result.error) {
    assert.fail(`spawn failed after ${elapsedMs} ms: ${result.error.message}\nexit ${result.status}\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  }
  return { status: result.status, stdout, stderr, all: stdout + stderr, elapsedMs };
}

/*
 * A clean copy of the skill scripts in a temp project with no node_modules (test-env
 * copySkillScripts). With `double: true` the target file is a test double that re-exports the
 * REAL target copy (same flags, validate and pdf-lib preflight) but whose run() only
 * writes a marker.
 */
function createSkillCopy({ double = false } = {}) {
  const root = tempDir('html-export-pdf-copy-');
  const { skillRoot, libDir, exportScript } = copySkillScripts(root);
  const runMarker = path.join(skillRoot, 'run-marker.json');
  if (double) {
    fs.copyFileSync(path.join(LIB_DIR, 'to-pdf.cjs'), path.join(libDir, 'to-pdf-real.cjs'));
    writeFile(path.join(libDir, 'to-pdf.cjs'), [
      '\'use strict\';',
      'const fs = require(\'node:fs\');',
      'const real = require(\'./to-pdf-real.cjs\');',
      'module.exports = {',
      '  ...real,',
      '  async run(options) {',
      '    fs.writeFileSync(' + JSON.stringify(runMarker) + ', JSON.stringify({ slides: options.slides || false }));',
      '    return 0;',
      '  },',
      '};',
      '',
    ].join('\n'));
  }
  return {
    root,
    skillRoot,
    runMarker,
    dispatcher: exportScript,
    cleanup: () => removeTree(root),
  };
}

// Reads each page's size (points) and the URIs of its link annotations, in page order.
async function readPdfPages(file) {
  const { PDFDocument, PDFName, PDFArray, PDFDict } = require(PDF_LIB_ROOT);
  const doc = await PDFDocument.load(fs.readFileSync(file));
  return doc.getPages().map((page) => {
    const uris = [];
    const annots = page.node.lookup(PDFName.of('Annots'));
    if (annots instanceof PDFArray) {
      for (let index = 0; index < annots.size(); index += 1) {
        const annot = annots.lookup(index, PDFDict);
        const action = annot.lookup(PDFName.of('A'));
        if (!(action instanceof PDFDict)) continue;
        const uri = action.lookup(PDFName.of('URI'));
        if (uri) uris.push(typeof uri.decodeText === 'function' ? uri.decodeText() : String(uri));
      }
    }
    const { width, height } = page.getSize();
    return { width, height, uris };
  });
}

// Runs one browser case with an isolated environment; skips only this case when Chromium or pdf-lib is missing.
function withBrowserEnv(t, run) {
  return withIsolatedBrowser(t, run, {
    prefix: 'html-export-pdf-',
    gate: () => (fs.existsSync(path.join(PDF_LIB_ROOT, 'package.json'))
      ? null
      : 'pdf-lib (skill-local pdf-lib is not installed)'),
  });
}

function runExport(testEnv, args, { timeout } = {}) {
  return spawnNode(DISPATCHER, ['--to=pdf', ...args], { cwd: testEnv.root, env: testEnv.env, timeout });
}

function readReport(outDir) {
  return JSON.parse(fs.readFileSync(path.join(outDir, 'report.json'), 'utf8'));
}

test('TC-HTMLX-020 natural order, --order override and --page parsing', () => {
  const root = tempDir('html-export-pdf-unit-');
  try {
    // Given: a directory whose HTML names sort differently as text and as numbers, plus a non-HTML file.
    const deck = path.join(root, 'deck');
    for (const name of ['slide-10.html', 'slide-2.html', 'slide-1.html', 'notes.txt']) writeFile(path.join(deck, name), '<p>x</p>');

    // When / Then: naturalSort orders digit runs by value and leaves the input untouched.
    const names = ['slide-10.html', 'slide-2.html', 'slide-1.html', 'Slide-3.html'];
    assert.deepEqual(toPdf.naturalSort(names), ['slide-1.html', 'slide-2.html', 'Slide-3.html', 'slide-10.html']);
    assert.deepEqual(names, ['slide-10.html', 'slide-2.html', 'slide-1.html', 'Slide-3.html']);
    assert.deepEqual(toPdf.naturalSort(['a-01', 'a-1', 'a-001']), ['a-1', 'a-01', 'a-001']);

    // When / Then: a directory input expands to its *.html files in natural order.
    assert.deepEqual(
      toPdf.resolveInputs({ inputs: [deck] }).map((file) => path.basename(file)),
      ['slide-1.html', 'slide-2.html', 'slide-10.html'],
    );

    // When: an order file lists entries (comments, blank lines, CRLF) relative to its own directory.
    const orderFile = writeFile(path.join(deck, 'order.txt'), '# closing first\r\nslide-10.html\r\n\r\nslide-1.html\r\n');
    // Then: readOrderFile returns absolute paths in file order and --order overrides natural order.
    assert.deepEqual(toPdf.readOrderFile(orderFile), [path.join(deck, 'slide-10.html'), path.join(deck, 'slide-1.html')]);
    assert.deepEqual(
      toPdf.resolveInputs({ inputs: [], order: orderFile }).map((file) => path.basename(file)),
      ['slide-10.html', 'slide-1.html'],
    );
    assert.throws(() => toPdf.readOrderFile(path.join(deck, 'missing.txt')), /--order file not found/);
    const badOrder = writeFile(path.join(deck, 'bad-order.txt'), 'slide-99.html\n');
    assert.throws(() => toPdf.resolveInputs({ inputs: [], order: badOrder }), /--order entry not found: .*slide-99\.html/);

    // When / Then: parsePage accepts WxH in CSS pixels and rejects anything else.
    assert.deepEqual(toPdf.parsePage('1920x1080'), { width: 1920, height: 1080 });
    assert.deepEqual(toPdf.parsePage(' 800 X 600 '), { width: 800, height: 600 });
    for (const bad of ['1920', '0x1080', '1920x', 'axb', '1920x1080x2', '-1x5']) {
      assert.throws(() => toPdf.parsePage(bad), /invalid --page/, bad);
    }

    // When / Then: validate rejects ambiguous or unsupported combinations with usage messages.
    const page = path.join(deck, 'slide-1.html');
    assert.throws(() => toPdf.validate({ inputs: [page], order: orderFile }), /not both/);
    assert.throws(() => toPdf.validate({ inputs: [] }), /at least one HTML file/);
    assert.throws(() => toPdf.validate({ inputs: [page], slides: true, page: '1920x1080' }), /--page applies to print mode/);
    assert.throws(() => toPdf.validate({ inputs: [page], viewport: '1280x720,390x844' }), /one --viewport/);
    assert.throws(() => toPdf.validate({ inputs: [path.join(root, 'nope.html')] }), /input not found/);
    assert.throws(() => toPdf.validate({ inputs: [path.join(root, 'empty-dir')] }), /input not found/);
    fs.mkdirSync(path.join(root, 'empty-dir'));
    assert.throws(() => toPdf.validate({ inputs: [path.join(root, 'empty-dir')] }), /no \.html files/);
    assert.doesNotThrow(() => toPdf.validate({ inputs: [page], page: '1920x1080' }));
    // And: --self-check belongs to png; pdf rejects it instead of silently ignoring it.
    assert.throws(() => toPdf.validate({ inputs: [page], selfCheck: true }), /--self-check is not supported by --to=pdf/);
    // And: relative inputs and order files resolve against the dispatcher's runtime cwd, not process.cwd().
    assert.deepEqual(toPdf.resolveInputs({ inputs: ['deck'], cwd: root }).map((file) => path.basename(file)),
      ['slide-1.html', 'slide-2.html', 'slide-10.html']);
    assert.deepEqual(toPdf.resolveInputs({ inputs: [], order: path.join('deck', 'order.txt'), cwd: root })
      .map((file) => path.basename(file)), ['slide-10.html', 'slide-1.html']);
    assert.equal(toPdf.preflight({ inputs: [page] }), null);
    assert.deepEqual(toPdf.flags, { order: 'path' });
  } finally {
    removeTree(root);
  }
});

test('TC-HTMLX-021 print mode with --page=1920x1080 gives landscape pages from the print CSS', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: the two-slide fixture, whose print CSS sets one slide per page and no page size.
    const out = path.join(testEnv.root, 'out');
    // When: it is exported in print mode with an explicit landscape page size.
    const result = runExport(testEnv, [FIXTURE, '--page=1920x1080', '--offline', `--out=${out}`]);
    // Then: one PDF with two landscape 1920x1080 px pages, each holding its own slide and no controls.
    assert.equal(result.status, 0, result.all);
    const pdfPath = path.join(out, 'deck-two-slides.pdf');
    assert.equal(result.stdout.trim(), pdfPath);
    const pages = await readPdfPages(pdfPath);
    assert.equal(pages.length, 2, JSON.stringify(pages));
    assert.ok(pages[0].width > pages[0].height, `page 0 must be landscape, got ${JSON.stringify(pages[0])}`);
    assert.ok(Math.abs(pages[0].width - 1440) < 1 && Math.abs(pages[0].height - 810) < 1, JSON.stringify(pages[0]));
    assert.deepEqual(pages.map((page) => page.uris), [[SLIDE_ALPHA], [SLIDE_BETA]]);
  });
});

test('TC-HTMLX-022 slides mode prints each navigated slide and merges several inputs in order', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: the fixture, whose slides stack vertically and change with ArrowRight.
    const out = path.join(testEnv.root, 'out');
    // When: it is exported in slides mode at a 1280x720 viewport.
    const single = runExport(testEnv, [FIXTURE, '--slides', '--viewport=1280x720', '--offline', `--out=${out}`]);
    // Then: two viewport-sized pages, page N shows ONLY slide N (not the document top, not the controls).
    assert.equal(single.status, 0, single.all);
    const pages = await readPdfPages(path.join(out, 'deck-two-slides.pdf'));
    assert.equal(pages.length, 2, JSON.stringify(pages));
    for (const page of pages) {
      assert.ok(Math.abs(page.width - 960) < 1 && Math.abs(page.height - 540) < 1, JSON.stringify(page));
    }
    assert.deepEqual(pages.map((page) => page.uris), [[SLIDE_ALPHA], [SLIDE_BETA]]);

    // Given: a directory holding two decks whose names sort differently as text and naturally.
    const deckDir = path.join(testEnv.root, 'decks');
    const html = fs.readFileSync(FIXTURE, 'utf8');
    writeFile(path.join(deckDir, 'deck-2.html'), html);
    writeFile(path.join(deckDir, 'deck-10.html'), html.replace(/slide-alpha/g, 'slide-gamma').replace(/slide-beta/g, 'slide-delta'));
    // When: the directory is exported in slides mode.
    const merged = runExport(testEnv, [deckDir, '--slides=section.slide', '--offline', `--out=${out}`]);
    // Then: the page count is the sum of both decks, in natural file order (deck-2 before deck-10).
    assert.equal(merged.status, 0, merged.all);
    const mergedPages = await readPdfPages(path.join(out, 'decks.pdf'));
    assert.equal(mergedPages.length, 4, JSON.stringify(mergedPages));
    assert.deepEqual(mergedPages.map((page) => page.uris), [
      [SLIDE_ALPHA],
      [SLIDE_BETA],
      ['https://example.invalid/slide-gamma'],
      ['https://example.invalid/slide-delta'],
    ]);
    assert.ok(mergedPages.every((page) => !page.uris.includes(CONTROLS)));
  });
});

test('TC-HTMLX-025 --offline aborts are not page errors, but a script error they cause still is', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: a page with a remote image, and a second page whose script needs a remote library.
    const imagePage = path.join(testEnv.root, 'remote-image.html');
    writeFile(imagePage, '<!doctype html><html><body><h1>Offline report</h1>'
      + '<img src="https://example.invalid/logo.png" alt="logo"></body></html>');
    const scriptPage = path.join(testEnv.root, 'remote-script.html');
    writeFile(scriptPage, '<!doctype html><html><body><h1>Chart</h1>'
      + '<script src="https://example.invalid/chart.js"></script>'
      + '<script>window.chartLib.render();</script></body></html>');
    const out = path.join(testEnv.root, 'out');
    // When: each is exported offline in print mode.
    const image = runExport(testEnv, [imagePage, '--offline', `--out=${out}`]);
    const script = runExport(testEnv, [scriptPage, '--offline', `--out=${out}`]);
    // Then: the blocked image alone passes; the script that depended on the blocked library fails.
    assert.equal(image.status, 0, image.all);
    assert.equal(script.status, 4, script.all);
    // And: exit 4 still writes the PDF for inspection, and report.json names the page error.
    const scriptPdf = path.join(out, 'remote-script.pdf');
    assert.equal(fs.existsSync(scriptPdf), true, 'the PDF is written even when the page errors');
    assert.equal(script.stdout.trim(), scriptPdf);
    const report = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
    assert.equal(report.exitCode, 4);
    assert.ok(report.errors.some((entry) => /reading 'render'/.test(entry.text)), JSON.stringify(report.errors));

    // When: the failing page is exported again with --allow-errors.
    const allowedOut = path.join(testEnv.root, 'allowed');
    const allowed = runExport(testEnv, [scriptPage, '--offline', '--allow-errors', `--out=${allowedOut}`]);
    // Then: exit 0, the PDF is written, and the error is still reported.
    assert.equal(allowed.status, 0, allowed.all);
    assert.equal(fs.existsSync(path.join(allowedOut, 'remote-script.pdf')), true);
    assert.match(allowed.stderr, /reading 'render'/);
  });
});

test('TC-HTMLX-021 --page wins over a CSS @page size, and the CSS size applies without --page', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: a page whose print CSS sets @page { size: 600px 400px }.
    const cssOut = path.join(testEnv.root, 'css');
    const flagOut = path.join(testEnv.root, 'flag');
    // When: it is exported once without --page and once with --page=1920x1080.
    const css = runExport(testEnv, [CSS_PAGE_SIZE_FIXTURE, `--out=${cssOut}`]);
    const flag = runExport(testEnv, [CSS_PAGE_SIZE_FIXTURE, '--page=1920x1080', `--out=${flagOut}`]);
    // Then: without the flag the CSS size is used; with it the explicit flag wins.
    assert.equal(css.status, 0, css.all);
    assert.equal(flag.status, 0, flag.all);
    const [cssPage] = await readPdfPages(path.join(cssOut, 'css-page-size.pdf'));
    const [flagPage] = await readPdfPages(path.join(flagOut, 'css-page-size.pdf'));
    const near = (actual, expected) => Math.abs(actual - expected) < 1;
    assert.ok(near(cssPage.width, 600 * PX_TO_PT) && near(cssPage.height, 400 * PX_TO_PT), JSON.stringify(cssPage));
    assert.ok(near(flagPage.width, 1920 * PX_TO_PT) && near(flagPage.height, 1080 * PX_TO_PT), JSON.stringify(flagPage));
  });
});

test('TC-HTMLX-022 a --slides selector that matches nothing exits 2 and writes no PDF', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: a page with no element matching the default slide selector.
    const out = path.join(testEnv.root, 'out');
    // When: it is exported in slides mode.
    const result = runExport(testEnv, [KNOWN_GOOD, '--slides', `--out=${out}`]);
    // Then: a usage error (exit 2) that names the selector, and no PDF (a 0-page PDF is never a pass).
    assert.equal(result.status, 2, result.all);
    assert.match(result.stderr, /no element matches the slides selector "section\.slide\[data-slide-id\], \[data-export-slide\]"/);
    assert.equal(fs.existsSync(path.join(out, 'known-good.pdf')), false);
    assert.equal(result.stdout, '');
  });
});

// A page that defines window.__ready and never sets it, so opening it times out.
const NEVER_READY_HTML = '<!doctype html><html><head><meta charset="utf-8"><title>Never ready</title>'
  + '<script>window.__ready = false;</script></head><body><h1>Never ready</h1></body></html>';

test('TC-HTMLX-022 a failing input is logged and skipped while the other inputs still print', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: an order file listing a page that never becomes ready, then the two-slide deck.
    const deckDir = path.join(testEnv.root, 'batch');
    writeFile(path.join(deckDir, 'stuck.html'), NEVER_READY_HTML);
    writeFile(path.join(deckDir, 'deck.html'), fs.readFileSync(FIXTURE, 'utf8'));
    const orderFile = writeFile(path.join(deckDir, 'order.txt'), 'stuck.html\ndeck.html\n');
    const out = path.join(testEnv.root, 'out');
    // When: the batch is exported in slides mode with a short timeout.
    const result = runExport(testEnv, [`--order=${orderFile}`, '--slides', '--timeout=5000', '--offline', `--out=${out}`]);
    // Then: the batch did not stop: the deck's two slides are in the PDF, the failure is in
    // report.json and on stderr, and the exit code still signals it (4).
    assert.equal(result.status, 4, result.all);
    const pages = await readPdfPages(path.join(out, 'order.pdf'));
    assert.deepEqual(pages.map((page) => page.uris), [[SLIDE_ALPHA], [SLIDE_BETA]]);
    const report = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
    assert.equal(report.failures.length, 1, JSON.stringify(report.failures));
    assert.equal(path.basename(report.failures[0].input), 'stuck.html');
    assert.equal(report.failures[0].step, 'open');
    assert.equal(report.failures[0].pageFault, true);
    assert.match(report.failures[0].message, /__ready/);
    assert.match(result.stderr, /failed stuck\.html \(open\): .*\(page fault; continuing\)/);

    // When: the same broken page is exported alone, so nothing prints.
    const allOut = path.join(testEnv.root, 'all-failed');
    const stuckOnly = runExport(testEnv, [path.join(deckDir, 'stuck.html'), '--timeout=5000', `--out=${allOut}`]);
    // Then: TC-HTMLX-027: the page is at fault, so exit 4 exactly as inside the batch (never 1
    // "tool failure"); no PDF is written, and the reason is in report.json.
    assert.equal(stuckOnly.status, 4, stuckOnly.all);
    assert.equal(fs.existsSync(path.join(allOut, 'stuck.pdf')), false);
    const allReport = readReport(allOut);
    assert.equal(allReport.exitCode, 4);
    assert.equal(allReport.output, null);
    assert.deepEqual(allReport.failures.map((failure) => [failure.step, failure.pageFault]), [['open', true]]);
  });
});

test('TC-HTMLX-023 a missing --order file exits 2 before any dependency check', () => {
  // Given: a copy of the skill with the real PDF target and no node_modules at all.
  const copy = createSkillCopy();
  try {
    const missing = path.join(copy.root, 'decks', 'order.txt');
    const out = path.join(copy.root, 'out');
    // When: the dispatcher runs --to=pdf with an --order file that does not exist.
    const result = spawnNode(copy.dispatcher, ['--to=pdf', `--order=${missing}`, `--out=${out}`], {
      cwd: copy.root,
      env: allowlistEnv(copy.root),
    });
    // Then: a usage error (exit 2) names the file; Playwright/pdf-lib are never checked and nothing is written.
    assert.equal(result.status, 2, result.all);
    assert.match(result.stderr, /Usage error: --order file not found/);
    assert.ok(result.stderr.includes(missing), result.stderr);
    assert.doesNotMatch(result.all, /Playwright|pdf-lib|Dependency missing/);
    assert.equal(result.stdout, '');
    assert.equal(fs.existsSync(out), false);
    assert.equal(fs.existsSync(path.join(copy.skillRoot, 'node_modules')), false);
  } finally {
    copy.cleanup();
  }
});

test('TC-HTMLX-251 an --order entry that is not an .html/.htm file exits 2 before any dependency check', () => {
  // Guards: the one input-acceptance rule covers every pdf input, including each --order entry, so
  // a PDF is never rendered from a non-HTML file and reported as a successful export.
  // Given: a copy of the skill with the real PDF target and no node_modules, an existing Markdown
  // file and an HTML page, and an order file that lists the Markdown file after the page.
  const copy = createSkillCopy();
  try {
    const deck = path.join(copy.root, 'decks');
    writeFile(path.join(deck, 'intro.HTM'), '<p>intro</p>');
    const notes = writeFile(path.join(deck, 'notes.md'), '# notes');
    const orderFile = writeFile(path.join(deck, 'order.txt'), 'intro.HTM\nnotes.md\n');
    const out = path.join(copy.root, 'out');
    // When: the dispatcher runs --to=pdf with that order file.
    const result = spawnNode(copy.dispatcher, ['--to=pdf', `--order=${orderFile}`, `--out=${out}`], {
      cwd: copy.root,
      env: allowlistEnv(copy.root),
    });
    // Then: a usage error (exit 2) names the Markdown entry; the upper-case .HTM entry passed the
    // same rule; no dependency is checked and nothing is written.
    assert.equal(result.status, 2, result.all);
    assert.match(result.stderr, /Usage error: --order entry must be an \.html or \.htm file: /);
    assert.ok(result.stderr.includes(notes), result.stderr);
    assert.doesNotMatch(result.all, /Playwright|pdf-lib|Dependency missing/);
    assert.equal(result.stdout, '');
    assert.equal(fs.existsSync(out), false);
    // And: an order file that lists only .html/.htm files (any case) resolves as before.
    const htmlOnly = writeFile(path.join(deck, 'html-only.txt'), 'intro.HTM\n');
    assert.deepEqual(toPdf.resolveInputs({ inputs: [], order: htmlOnly }), [path.join(deck, 'intro.HTM')]);
  } finally {
    copy.cleanup();
  }
});

test('TC-HTMLX-024 pdf-lib is required only for merges; the pdf target preflight exits 3 before run without it', () => {
  // Guards: pdf-lib is a merge-only dependency. A merge (slides mode or several inputs) without it
  // stops at the target's own preflight with exit 3 and the setup commands; a single print never needs it.
  const root = tempDir('html-export-pdf-predicate-');
  const copy = createSkillCopy({ double: true });
  try {
    // Given: single files, two files, and directories holding one or two HTML files.
    const one = writeFile(path.join(root, 'one.html'), '<p>one</p>');
    const two = writeFile(path.join(root, 'two.html'), '<p>two</p>');
    const singleDir = path.join(root, 'single');
    writeFile(path.join(singleDir, 'only.html'), '<p>only</p>');
    // When / Then: the one merge rule asks for a merge in slides mode and for several inputs only.
    assert.equal(toPdf.needsMerge({ inputs: [one] }), false);
    assert.equal(toPdf.needsMerge({ inputs: [one], slides: true }), true);
    assert.equal(toPdf.needsMerge({ inputs: [one], slides: 'section.slide' }), true);
    assert.equal(toPdf.needsMerge({ inputs: [one, two] }), true);
    assert.equal(toPdf.needsMerge({ inputs: [root] }), true);
    assert.equal(toPdf.needsMerge({ inputs: [singleDir] }), false);
    // And: run() passes the list it already resolved, which decides on its own.
    assert.equal(toPdf.needsMerge({ inputs: [] }, [one, two]), true);
    assert.equal(toPdf.needsMerge({ inputs: [] }, [one]), false);
    // And: the target no longer hands a pdf-lib predicate to the dispatcher.
    assert.equal(toPdf.requiresPdfLib, undefined);

    // Given: the REAL target copied into a skill with NO node_modules/pdf-lib.
    const realTarget = require(path.join(copy.skillRoot, 'scripts', 'lib', 'to-pdf-real.cjs'));
    // When: its preflight runs for a single print and for each kind of merge.
    // Then: a single print needs nothing (null); a merge returns the pdf-lib message plus the setup block.
    assert.equal(realTarget.preflight({ inputs: [one] }), null);
    assert.equal(realTarget.preflight({ inputs: [singleDir] }), null);
    for (const options of [{ inputs: [one], slides: true }, { inputs: [one, two] }, { inputs: [root] }]) {
      const message = realTarget.preflight(options);
      assert.equal(typeof message, 'string', JSON.stringify(options));
      assert.match(message, /pdf-lib is required by target pdf, but is not installed in the html-export skill/);
      assertSetupHints(message);
    }

    // Given: a skill copy whose target re-exports the real preflight with a marker-only run(),
    // a skill-local Playwright 1.63.0 manifest with a working launch probe, and NO pdf-lib.
    writeFakePlaywright(copy.skillRoot);
    const input = writeFile(path.join(copy.root, 'deck.html'), '<section class="slide" data-slide-id="a">A</section>');
    const second = writeFile(path.join(copy.root, 'deck-2.html'), '<section class="slide" data-slide-id="b">B</section>');
    const env = allowlistEnv(copy.root);
    const out = path.join(copy.root, 'out');
    const pdfLibDir = path.join(copy.skillRoot, 'node_modules', 'pdf-lib');
    assert.equal(fs.existsSync(pdfLibDir), false);

    // When: one HTML input is exported with --slides, and two inputs are exported as one merged PDF.
    for (const args of [[input, '--slides'], [input, second]]) {
      const result = spawnNode(copy.dispatcher, ['--to=pdf', ...args, `--out=${out}`], { cwd: copy.root, env });
      // Then: the pdf target preflight exits 3 with the pdf-lib diagnostic and setup hints; run() never starts.
      assert.equal(result.status, 3, result.all);
      assert.match(result.stderr, /pdf-lib is required by target pdf, but is not installed in the html-export skill/);
      assertSetupHints(result.stderr);
      assert.equal(fs.existsSync(copy.runMarker), false, 'target run must not start when pdf-lib is missing');
    }

    // When (control): the same input is exported as a single print result.
    const print = spawnNode(copy.dispatcher, ['--to=pdf', input, `--out=${out}`], { cwd: copy.root, env });
    // Then: pdf-lib is not required, so preflight passes and run() is reached.
    assert.equal(print.status, 0, print.all);
    assert.deepEqual(JSON.parse(fs.readFileSync(copy.runMarker, 'utf8')), { slides: false });

    // When (control): pdf-lib is present and the slides export is repeated.
    fs.rmSync(copy.runMarker);
    fs.mkdirSync(pdfLibDir, { recursive: true });
    const slidesWithLib = spawnNode(copy.dispatcher, ['--to=pdf', input, '--slides', `--out=${out}`], { cwd: copy.root, env });
    // Then: the pdf-lib check passes and run() is reached in slides mode.
    assert.equal(slidesWithLib.status, 0, slidesWithLib.all);
    assert.deepEqual(JSON.parse(fs.readFileSync(copy.runMarker, 'utf8')), { slides: true });
  } finally {
    copy.cleanup();
    removeTree(root);
  }
});

test('TC-HTMLX-027 exitCodeFor: a page fault exits 4 even when nothing printed; a tool fault alone exits 1', () => {
  const base = { errors: [], failures: [], allowErrors: false };
  const pageFailure = { step: 'slide', pageFault: true };
  const toolFailure = { step: 'open', pageFault: false };
  // Given / When / Then: A clean print -> 0; nothing printed and no failure recorded -> 1.
  assert.equal(toPdf.exitCodeFor(base, true), 0);
  assert.equal(toPdf.exitCodeFor(base, false), 1);
  // And: A page fault -> 4, printed or not.
  assert.equal(toPdf.exitCodeFor({ ...base, failures: [pageFailure] }, true), 4);
  assert.equal(toPdf.exitCodeFor({ ...base, failures: [pageFailure] }, false), 4);
  // And: Only tool faults -> 1, printed or not; a page fault beside one still wins.
  assert.equal(toPdf.exitCodeFor({ ...base, failures: [toolFailure] }, true), 1);
  assert.equal(toPdf.exitCodeFor({ ...base, failures: [toolFailure] }, false), 1);
  assert.equal(toPdf.exitCodeFor({ ...base, failures: [toolFailure, pageFailure] }, true), 4);
  // And: Page errors block without --allow-errors, and only page errors are excused by it.
  assert.equal(toPdf.exitCodeFor({ ...base, errors: [{}] }, true), 4);
  assert.equal(toPdf.exitCodeFor({ ...base, errors: [{}], allowErrors: true }, true), 0);
  assert.equal(toPdf.exitCodeFor({ ...base, errors: [{}], failures: [pageFailure], allowErrors: true }, true), 4);
});

/**
 * A three-slide prototype (a, b, c) driven by window.__proto.goTo; each slide carries a link to
 * https://example.invalid/slide-<id>, so a PDF page shows which slide it holds. `onB` runs when
 * slide b is requested, before the slide changes; `onOther` runs for every other slide.
 */
function linkedProtoDeckHtml(onB, onOther = '') {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Linked prototype</title>
<style>body{margin:0}[data-state]{display:none;height:100vh}[data-state].is-current{display:block}</style>
</head><body>
<section data-state="a" class="is-current"><h1><a href="https://example.invalid/slide-a">Slide A</a></h1></section>
<section data-state="b"><h1><a href="https://example.invalid/slide-b">Slide B</a></h1></section>
<section data-state="c"><h1><a href="https://example.invalid/slide-c">Slide C</a></h1></section>
<script>
window.__proto = {
  goTo: function (id) {
    if (id === 'b') { ${onB} } else { ${onOther} }
    document.querySelectorAll('[data-state]').forEach(function (slide) {
      slide.classList.toggle('is-current', slide.getAttribute('data-state') === id);
    });
  }
};
</script>
</body></html>`;
}

// Opens normally, then starts an endless script the moment it is switched to print media, so the
// print step itself can never finish.
const BUSY_WHEN_PRINTING_HTML = '<!doctype html><html><head><meta charset="utf-8"><title>Busy</title></head>'
  + '<body><h1>Busy when printing</h1><script>window.matchMedia("print").addEventListener("change",'
  + ' function (event) { if (event.matches) { for (;;) {} } });</script></body></html>';

test('TC-HTMLX-026 a page that blocks its main thread is a bounded failure and the next input still prints', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: an order file listing a page that blocks its main thread when printed, then a known-good page.
    const dir = path.join(testEnv.root, 'batch');
    writeFile(path.join(dir, 'busy.html'), BUSY_WHEN_PRINTING_HTML);
    writeFile(path.join(dir, 'good.html'), fs.readFileSync(FIXTURE, 'utf8'));
    const orderFile = writeFile(path.join(dir, 'order.txt'), 'busy.html\ngood.html\n');
    const out = path.join(testEnv.root, 'out');
    // When: the batch is printed with a 3 second timeout.
    const result = runExport(testEnv, [`--order=${orderFile}`, '--timeout=3000', '--offline', `--out=${out}`],
      { timeout: BUSY_SPAWN_TIMEOUT_MS });
    // Then: the run ended on its own (no hang); the busy page is one recorded page fault and the
    // good page printed (two pages, one per slide of its print CSS).
    assert.equal(result.status, 4, result.all);
    assert.ok(result.elapsedMs < BUSY_RUN_BOUND_MS, `the run took ${result.elapsedMs} ms (bound ${BUSY_RUN_BOUND_MS} ms)`);
    const report = readReport(out);
    assert.equal(report.failures.length, 1, JSON.stringify(report.failures));
    assert.equal(path.basename(report.failures[0].input), 'busy.html');
    assert.equal(report.failures[0].step, 'print');
    assert.equal(report.failures[0].pageFault, true);
    assert.match(report.failures[0].message, /print did not finish within 3000 ms/);
    const pages = await readPdfPages(path.join(out, 'order.pdf'));
    assert.deepEqual(pages.map((page) => page.uris), [[SLIDE_ALPHA], [SLIDE_BETA]]);
  });
});

test('TC-HTMLX-026 a __proto.goTo that never settles fails that slide within --timeout; the other slides print', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: a prototype whose goTo for slide b returns a promise that never settles.
    const deck = writeFile(path.join(testEnv.root, 'pending.html'), linkedProtoDeckHtml('return new Promise(function () {});'));
    const out = path.join(testEnv.root, 'out');
    // When: it is exported in slides mode with a 3 second timeout.
    const result = runExport(testEnv, [deck, '--slides=[data-state]', '--viewport=800x600', '--timeout=3000', '--offline', `--out=${out}`],
      { timeout: HANG_SPAWN_TIMEOUT_MS });
    // Then: the run ended on its own; the PDF holds slides a and c, and slide 2 is the one failure.
    assert.equal(result.status, 4, result.all);
    assert.ok(result.elapsedMs < 45_000, `the run took ${result.elapsedMs} ms`);
    const pages = await readPdfPages(path.join(out, 'pending.pdf'));
    assert.deepEqual(pages.map((page) => page.uris), [['https://example.invalid/slide-a'], ['https://example.invalid/slide-c']]);
    const report = readReport(out);
    assert.deepEqual(report.failures.map((failure) => [failure.slide, failure.step, failure.pageFault]), [[2, 'slide', true]]);
    assert.match(report.failures[0].message, /__proto\.goTo for item 2 did not finish within 3000 ms/);
  });
});

test('TC-HTMLX-028 a slide whose isolation throws midway is recorded, undone, and the next slide prints correctly', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: a prototype that locks document.head against insertion while slide b is shown, so the
    // exporter's isolation of slide b throws AFTER it has already marked the slides; every other
    // slide unlocks it.
    const deck = writeFile(path.join(testEnv.root, 'locked.html'), linkedProtoDeckHtml(
      "document.head.appendChild = function () { throw new Error('slide b locks the document head'); };",
      'delete document.head.appendChild;',
    ));
    const out = path.join(testEnv.root, 'out');
    // When: it is exported in slides mode.
    const result = runExport(testEnv, [deck, '--slides=[data-state]', '--viewport=800x600', '--offline', `--out=${out}`]);
    // Then: slide 2 is the one recorded page fault (no separate restore failure), and the PDF
    // holds slides a and c.
    assert.equal(result.status, 4, result.all);
    const report = readReport(out);
    assert.deepEqual(report.failures.map((failure) => [failure.slide, failure.step, failure.pageFault]), [[2, 'slide', true]]);
    assert.match(report.failures[0].message, /slide b locks the document head/);
    // And: slide c's page shows slide c: the half-applied isolation of slide b was undone, so it
    // did not hide slide c (without the restore, slide c keeps b's "other slide" mark and prints blank).
    const pages = await readPdfPages(path.join(out, 'locked.pdf'));
    assert.deepEqual(pages.map((page) => page.uris), [['https://example.invalid/slide-a'], ['https://example.invalid/slide-c']]);
  });
});

test('TC-HTMLX-065 pdf: an unparsable --slides selector exits 2 and writes no PDF, never 4', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: The two-slide deck and a selector the browser cannot parse.
    const out = path.join(testEnv.root, 'out');
    // When: It is exported in slides mode.
    const result = runExport(testEnv, [FIXTURE, '--slides=[[bad', `--out=${out}`]);
    // Then: A usage error (exit 2) naming the selector, no PDF, and no failure blamed on the page.
    assert.equal(result.status, 2, result.all);
    assert.match(result.stderr, /Usage error: the slides selector "\[\[bad" is not a valid CSS selector/);
    assert.doesNotMatch(result.stderr, /page fault/);
    assert.equal(result.stdout, '');
    const report = readReport(out);
    assert.equal(report.exitCode, 2);
    assert.match(report.usageError, /\[\[bad/);
    assert.deepEqual([report.failures, report.output], [[], null]);
  });
});

const THROWS_BEFORE_READY_HTML = '<!doctype html><html><head><meta charset="utf-8"><title>Throws before ready</title>'
  + "<script>window.__ready = false; throw new Error('boom-before-ready');</script></head><body><h1>Never ready</h1></body></html>";

test('TC-HTMLX-066 pdf: an error the page threw before its open failed is in report.errors and on stderr', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page that throws and so never sets window.__ready to true.
    const page = writeFile(path.join(testEnv.root, 'stuck.html'), THROWS_BEFORE_READY_HTML);
    const out = path.join(testEnv.root, 'out');
    // When: It is exported with a 3 second timeout.
    const result = runExport(testEnv, [page, '--timeout=3000', `--out=${out}`]);
    // Then: Exit 4, no PDF, the open failure is recorded, AND the thrown error that caused it is in
    // errors[] tagged with its input, and named on stderr.
    assert.equal(result.status, 4, result.all);
    const report = readReport(out);
    assert.equal(report.output, null);
    assert.deepEqual(report.failures.map((failure) => [failure.step, failure.pageFault]), [['open', true]]);
    const thrown = report.errors.find((entry) => /boom-before-ready/.test(entry.text));
    assert.ok(thrown, JSON.stringify(report.errors));
    assert.deepEqual([path.basename(thrown.input), thrown.type], ['stuck.html', 'pageerror']);
    assert.match(result.stderr, /page pageerror in .*stuck\.html: .*boom-before-ready/);
  });
});

test('TC-HTMLX-067 pdf: a PDF that cannot be written still leaves report.json with a fatal entry, and exits 1', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: An output folder where the PDF's file name is already taken by a directory.
    const out = path.join(testEnv.root, 'out');
    fs.mkdirSync(path.join(out, 'known-good.pdf'), { recursive: true });
    // When: The known-good page is printed there.
    const result = runExport(testEnv, [KNOWN_GOOD, `--out=${out}`]);
    // Then: A tool failure (exit 1, never 4), and report.json names it as fatal with no output.
    assert.equal(result.status, 1, result.all);
    assert.match(result.stderr, /html-export error: could not write the PDF/);
    const report = readReport(out);
    assert.equal(report.exitCode, 1);
    assert.equal(report.ok, false);
    assert.equal(report.output, null);
    assert.match(report.fatal, /could not write the PDF: .*known-good\.pdf/);
  });
});

test('TC-HTMLX-250 the pdf spawn helper names the child output when the child is killed on a spawn timeout', (t) => {
  // Given: A child that prints where it is and then never ends.
  const root = tempDir('html-export-pdf-helper-');
  t.after(() => removeTree(root));
  const stalled = writeFile(path.join(root, 'stalled.cjs'),
    "process.stdout.write('reached-step-print\\n'); process.stderr.write('last-stderr-line\\n'); setInterval(() => {}, 1000);");
  // When: The helper runs it with a spawn timeout long enough for the child to start under load
  // (10 s; 1.5 s killed a cold-starting child before it printed).
  // Then: It fails, and the failure carries the partial stdout and stderr.
  assert.throws(() => spawnNode(stalled, [], { cwd: root, env: allowlistEnv(root), timeout: 10_000 }), (error) => {
    assert.match(error.message, /spawn failed after \d+ ms: .*ETIMEDOUT/);
    assert.match(error.message, /reached-step-print/);
    assert.match(error.message, /last-stderr-line/);
    return true;
  });
});
