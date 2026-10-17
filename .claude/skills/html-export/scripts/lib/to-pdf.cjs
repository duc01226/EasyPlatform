'use strict';

/**
 * html-export target: --to=pdf. Vector PDF in one of two explicit modes (no detection heuristic):
 *   print mode (default)  the page's own print CSS: emulateMedia('print') -> page.pdf with
 *                         printBackground. Page size precedence: --page=WxH wins over a CSS
 *                         `@page { size }` rule; without --page the CSS size is used, else
 *                         Chromium's default.
 *   slides mode (--slides[=<css>])  the shared navigator shows each item; running animations and
 *                         transitions are finished, then the item is isolated and printed with
 *                         screen media as one viewport-sized page (pageRanges '1').
 * Several resolved inputs, or slides mode, are merged in order with pdf-lib -> <out>/<name>.pdf.
 *
 * Log and continue: a failure on one input or slide (page open, navigation, print, timeout) is
 * recorded in <out>/report.json failures[] as { input, slide, step, message, pageFault } and on
 * stderr, and the remaining inputs and slides still print. The PDF holds every page that printed.
 * Every page call (readiness, navigation, settle, isolate, restore, emulateMedia, print) is bounded
 * by --timeout (browser.cjs timedEvaluate/timedPageCall), so a busy page or a goTo that never
 * settles is a recorded failure, never a hang. pageFault (browser.cjs isPageFault) is true when
 * the page caused the failure (navigation error, readiness/goTo/print timeout, a page script that
 * never yields, an error the page threw in an in-page call), false for a tool fault (launch or
 * setup failure, the browser went away under a call). When a page fails to OPEN, what it raised
 * before that (openPage rejection pageErrors, blocked) still goes to errors[] and blocked[].
 * Exit codes (exitCodeFor): 4 when a failures[] entry has pageFault true, or page errors were
 * reported without --allow-errors, even when nothing printed (the PDF is written when anything
 * printed); else 1 when failures[] holds a tool fault or nothing printed; else 0. Nothing printed
 * means no PDF is written. 2 when a --slides selector cannot be parsed or matches no item in an
 * input (a usage error, reported at once, report.usageError). A merge or PDF write failure is a
 * tool defect: report.json gets exitCode 1 and `fatal`, and the dispatcher exits 1.
 * report.json: { ok, exitCode, target, mode, inputs, output, allowErrors, offline, errors[],
 * failures[], navigation[], blocked[] } (+ usageError or fatal). stdout carries only the PDF path.
 *
 * Target contract (see ../export.cjs): flags, validate(opts) (sync, throws usage errors),
 * preflight(opts) -> null, or the pdf-lib setup message when a merge is needed (needsMerge: slides
 * mode or several inputs) and pdf-lib is not installed in this skill (the dispatcher then exits 3,
 * before its shared Playwright preflight), async run(opts) -> exit code.
 * Generic flag formats and ranges are validated once by the dispatcher before validate() runs.
 * Pure helpers: naturalSort(names), readOrderFile(file, cwd), parsePage(value), resolveInputs(opts),
 * needsMerge(opts, files?).
 *
 * Playwright and pdf-lib are required only inside functions, from this skill's own node_modules.
 */

const fs = require('node:fs');
const path = require('node:path');
const {
  openPage,
  parseSize,
  parseViewport,
  splitOfflineErrors,
  timedEvaluate,
  timedPageCall,
  isPageFault,
  dependencyFailure,
} = require('./browser.cjs');
const { createNavigator, navigationTimeouts, DEFAULT_SLIDE_SELECTOR } = require('./slides.cjs');
const { safeBasename, isHtmlFileName } = require('./paths.cjs');
const { errorMessage, firstLine, errorsBlock, writeReport } = require('./result.cjs');

const SKILL_ROOT = path.resolve(__dirname, '..', '..');
const PDF_LIB_ROOT = path.join(SKILL_ROOT, 'node_modules', 'pdf-lib');
const HTML_EXTENSION = /\.html?$/i;
const ISOLATE_STYLE_ID = 'html-export-pdf-isolate';
const ITEM_ATTR = 'data-html-export-pdf-item';
const PATH_ATTR = 'data-html-export-pdf-path';
const MAX_SHIFT_PASSES = 3;

const { EXIT } = require('./exit-codes.cjs');

const flags = Object.freeze({ order: 'path' });

// Splits a name into text and digit runs, so 'slide-10' compares as ['slide-', 10].
function chunks(name) {
  return String(name).match(/\d+|\D+/g) || [];
}

function compareDigits(left, right) {
  const a = left.replace(/^0+(?=\d)/, '');
  const b = right.replace(/^0+(?=\d)/, '');
  if (a.length !== b.length) return a.length - b.length;
  if (a !== b) return a < b ? -1 : 1;
  return left.length - right.length;
}

function naturalCompare(left, right) {
  const a = chunks(left);
  const b = chunks(right);
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    const x = a[index];
    const y = b[index];
    const bothDigits = /^\d/.test(x) && /^\d/.test(y);
    let order;
    if (bothDigits) {
      order = compareDigits(x, y);
    } else {
      const lx = x.toLowerCase();
      const ly = y.toLowerCase();
      order = lx === ly ? 0 : (lx < ly ? -1 : 1);
    }
    if (order !== 0) return order;
  }
  if (a.length !== b.length) return a.length - b.length;
  // Case-only differences get a stable, OS-independent tiebreak.
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/** Returns a new array sorted in natural order ('slide-2' before 'slide-10'). */
function naturalSort(names) {
  return Array.from(names).sort(naturalCompare);
}

/**
 * Reads an order file: one HTML path per line; blank lines and lines starting with '#' are skipped.
 * A relative order-file path resolves against `cwd`; relative entries resolve against the order
 * file's directory. Returns absolute paths.
 */
function readOrderFile(file, cwd = process.cwd()) {
  const orderPath = path.resolve(cwd, file);
  let text;
  try {
    text = fs.readFileSync(orderPath, 'utf8');
  } catch (error) {
    throw new Error(`--order file not found or unreadable: ${orderPath} (${error.code || error.message})`);
  }
  const baseDir = path.dirname(orderPath);
  return text.replace(/^﻿/, '').split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((entry) => path.resolve(baseDir, entry));
}

/** Parses --page=WxH (CSS pixels) into { width, height }. */
function parsePage(value) {
  return parseSize(value, '--page', '1920x1080');
}

function statOrNull(file) {
  try {
    return fs.statSync(file);
  } catch {
    return null;
  }
}

function expandDirectory(dir) {
  const names = fs.readdirSync(dir).filter((name) => {
    if (!isHtmlFileName(name)) return false;
    const stat = statOrNull(path.join(dir, name));
    return Boolean(stat && stat.isFile());
  });
  return naturalSort(names).map((name) => path.join(dir, name));
}

/**
 * Resolves the HTML files to export, in merge order. --order replaces positional inputs; a
 * directory input expands to its *.html files in natural order. Throws on a missing input.
 */
function resolveInputs(options) {
  const cwd = options.cwd || process.cwd();
  if (options.order) {
    const entries = readOrderFile(options.order, cwd);
    if (entries.length === 0) throw new Error(`--order file lists no HTML files: ${path.resolve(cwd, options.order)}`);
    for (const entry of entries) {
      if (!isHtmlFileName(entry)) throw new Error(`--order entry must be an .html or .htm file: ${entry}`);
      const stat = statOrNull(entry);
      if (!stat || !stat.isFile()) throw new Error(`--order entry not found: ${entry}`);
    }
    return entries;
  }

  const resolved = [];
  for (const input of options.inputs || []) {
    const absolute = path.resolve(cwd, input);
    const stat = statOrNull(absolute);
    if (!stat) throw new Error(`input not found: ${absolute}`);
    if (stat.isDirectory()) {
      const files = expandDirectory(absolute);
      if (files.length === 0) throw new Error(`input directory has no .html files: ${absolute}`);
      resolved.push(...files);
    } else if (stat.isFile()) {
      resolved.push(absolute);
    } else {
      throw new Error(`input is neither a file nor a directory: ${absolute}`);
    }
  }
  return resolved;
}

function slideSelector(options) {
  return typeof options.slides === 'string' ? options.slides : DEFAULT_SLIDE_SELECTOR;
}

function validate(options) {
  const inputs = options.inputs || [];
  if (options.selfCheck) {
    throw new Error('--self-check is not supported by --to=pdf; run it with --to=png.');
  }
  if (options.order && inputs.length > 0) {
    throw new Error('Pass HTML inputs or --order=<file>, not both; the order file lists every input.');
  }
  if (!options.order && inputs.length === 0) {
    throw new Error('Pass at least one HTML file or directory, or --order=<file>.');
  }
  if (options.slides && options.page !== undefined) {
    throw new Error('--page applies to print mode; slides mode sizes each page from --viewport.');
  }
  if (options.viewport !== undefined && String(options.viewport).includes(',')) {
    throw new Error('--to=pdf takes one --viewport=WxH, not a list.');
  }
  resolveInputs(options);
}

// Merging (slides mode, or several inputs) is the only use of pdf-lib; a single print result is
// written as printed. preflight() and run() both decide through this one rule. `files` defaults to
// resolveInputs(options); run() passes the list it already resolved.
function needsMerge(options, files = resolveInputs(options)) {
  return Boolean(options.slides) || files.length > 1;
}

function pdfLibInstalled() {
  try {
    return fs.statSync(PDF_LIB_ROOT).isDirectory();
  } catch {
    return false;
  }
}

// Runs after validate(), so resolveInputs() cannot throw here.
function preflight(options) {
  if (!needsMerge(options) || pdfLibInstalled()) return null;
  return dependencyFailure('pdf-lib is required by target pdf, but is not installed in the html-export skill.');
}

function outputName(options) {
  const source = options.order || options.input || 'export';
  const base = path.basename(path.resolve(options.cwd || process.cwd(), source))
    .replace(HTML_EXTENSION, '').replace(/\.txt$/i, '');
  return safeBasename(base, 'export');
}

function loadPdfLib() {
  // An absolute skill-local path prevents Node from accepting an adopter's parent dependency.
  return require(PDF_LIB_ROOT);
}

async function printModePdf(page, pageSize, timeoutMs) {
  await timedPageCall(page, () => page.emulateMedia({ media: 'print' }), timeoutMs, 'print media emulation');
  // --page is an explicit request, so it wins over the page's own @page size; without it the
  // CSS size decides.
  const pdfOptions = { preferCSSPageSize: !pageSize, printBackground: true };
  if (pageSize) {
    pdfOptions.width = `${pageSize.width}px`;
    pdfOptions.height = `${pageSize.height}px`;
  }
  return timedPageCall(page, () => page.pdf(pdfOptions), timeoutMs, 'print');
}

/*
 * page.pdf prints the whole document from its top, whatever the scroll position or navigated
 * state. To make page 1 show the navigated item, every other matched item is removed from layout
 * (display:none), content outside the item and its ancestors is made invisible (layout kept, so the
 * item stays where the audience sees it), and when the item still starts below the first page it
 * is shifted up by adjusting body's top margin. restoreIsolation() undoes all of it before the next
 * navigation step.
 */
async function isolateItem(page, selector, index, timeoutMs) {
  return timedEvaluate(page, ({ css, i, styleId, itemAttr, pathAttr, maxPasses }) => {
    const items = Array.from(document.querySelectorAll(css));
    const item = items[i];
    if (!item) return { ok: false, reason: `item ${i} not found` };

    for (let node = item.parentElement; node; node = node.parentElement) node.setAttribute(pathAttr, '');
    item.setAttribute(itemAttr, '');
    items.forEach((other, k) => { if (k !== i) other.setAttribute('data-html-export-pdf-other', ''); });

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `@page { margin: 0 !important; }
[data-html-export-pdf-other]:not([${pathAttr}]) { display: none !important; }
body *:not([${pathAttr}]):not([${itemAttr}]):not([${itemAttr}] *) { visibility: hidden !important; }`;
    document.head.appendChild(style);

    const body = document.body;
    const savedBodyStyle = body.getAttribute('style');
    body.setAttribute('data-html-export-pdf-body-style', savedBodyStyle === null ? '\u0000' : savedBodyStyle);

    let fixed = false;
    for (let node = item; node && node !== document.documentElement; node = node.parentElement) {
      if (getComputedStyle(node).position === 'fixed') { fixed = true; break; }
    }

    let shifted = 0;
    if (!fixed) {
      for (let pass = 0; pass < maxPasses; pass += 1) {
        const rect = item.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const fitsFirstPage = top <= 0 || top + rect.height <= window.innerHeight + 1;
        if (fitsFirstPage || Math.abs(top) < 0.5) break;
        const margin = parseFloat(getComputedStyle(body).marginTop) || 0;
        body.style.setProperty('margin-top', `${margin - top}px`, 'important');
        shifted += top;
      }
    }
    const rect = item.getBoundingClientRect();
    return {
      ok: true,
      fixed,
      shifted,
      box: { top: rect.top + window.scrollY, height: rect.height },
    };
  }, {
    css: selector,
    i: index,
    styleId: ISOLATE_STYLE_ID,
    itemAttr: ITEM_ATTR,
    pathAttr: PATH_ATTR,
    maxPasses: MAX_SHIFT_PASSES,
  }, timeoutMs, `isolate slide ${index + 1}`);
}

async function restoreIsolation(page, timeoutMs) {
  await timedEvaluate(page, ({ styleId, itemAttr, pathAttr }) => {
    const style = document.getElementById(styleId);
    if (style) style.remove();
    for (const attr of [itemAttr, pathAttr, 'data-html-export-pdf-other']) {
      document.querySelectorAll(`[${attr}]`).forEach((node) => node.removeAttribute(attr));
    }
    const body = document.body;
    const saved = body.getAttribute('data-html-export-pdf-body-style');
    if (saved !== null) {
      if (saved === '\u0000') body.removeAttribute('style');
      else body.setAttribute('style', saved);
      body.removeAttribute('data-html-export-pdf-body-style');
    }
  }, { styleId: ISOLATE_STYLE_ID, itemAttr: ITEM_ATTR, pathAttr: PATH_ATTR }, timeoutMs, 'restore after slide isolation');
}

/*
 * A slide transition or entry animation that ignores reduced motion could otherwise print
 * mid-fade. Finishing every running animation jumps it to its end state; an infinite one cannot
 * finish, so it is cancelled instead.
 */
async function settleAnimations(page, timeoutMs) {
  await timedEvaluate(page, () => {
    if (typeof document.getAnimations !== 'function') return;
    for (const animation of document.getAnimations()) {
      try {
        animation.finish();
      } catch {
        try { animation.cancel(); } catch {}
      }
    }
  }, undefined, timeoutMs, 'animation settle');
}

/**
 * Prints one page per navigated item of `file` into `buffers`. A failure on one item is recorded
 * through `fail` and the next item still prints. Returns { count, strategy, fallback }.
 * `timeouts` is slides.cjs navigationTimeouts(--timeout); timeouts.timeoutMs bounds every page call.
 */
async function slidesModePdfs(page, selector, viewport, buffers, fail, timeouts) {
  const timeoutMs = timeouts.timeoutMs;
  const navigator = await createNavigator(page, selector, timeouts);
  if (navigator.count === 0) return { count: 0, strategy: navigator.strategy, fallback: null };
  await timedPageCall(page, () => page.emulateMedia({ media: 'screen' }), timeoutMs, 'screen media emulation');
  for (let index = 0; index < navigator.count; index += 1) {
    let isolated = false;
    try {
      await navigator.goTo(index);
      await settleAnimations(page, timeoutMs);
      // Marked BEFORE the call: isolation can throw after it already changed the DOM, and the
      // next slide prints correctly only if every such change is undone (restore is idempotent).
      isolated = true;
      const isolation = await isolateItem(page, selector, index, timeoutMs);
      if (!isolation.ok) throw new Error(`could not isolate the slide: ${isolation.reason}`);
      buffers.push(await timedPageCall(page, () => page.pdf({
        width: `${viewport.width}px`,
        height: `${viewport.height}px`,
        pageRanges: '1',
        printBackground: true,
      }), timeoutMs, `print slide ${index + 1}`));
    } catch (error) {
      fail(index + 1, 'slide', error);
    } finally {
      if (isolated) {
        try { await restoreIsolation(page, timeoutMs); } catch (error) { fail(index + 1, 'restore', error); }
      }
    }
  }
  return { count: navigator.count, strategy: navigator.strategy, fallback: navigator.fallback };
}

async function mergePdfs(buffers) {
  const { PDFDocument } = loadPdfLib();
  const merged = await PDFDocument.create();
  for (const buffer of buffers) {
    const source = await PDFDocument.load(buffer);
    const pages = await merged.copyPages(source, source.getPageIndices());
    for (const copied of pages) merged.addPage(copied);
  }
  return Buffer.from(await merged.save());
}

/**
 * Prints one input into `buffers` and records its page errors, blocked requests and navigation.
 * Returns { usage: message } when the --slides selector cannot be parsed or matches nothing (the
 * command is wrong); every other problem is recorded through `fail` so the caller can go on with
 * the next input, and the result is 'done' or 'failed'.
 */
async function exportInput(file, settings, report, buffers, fail) {
  let session;
  try {
    session = await openPage({
      file,
      viewport: settings.viewport,
      scale: settings.scale,
      timeoutMs: settings.timeoutMs,
      offline: settings.offline,
    });
  } catch (error) {
    fail(file, null, 'open', error);
    // What the page raised before the open failed (browser.cjs openPage rejection), so a script
    // that threw and then left __ready false is named, not only the __ready timeout.
    report.errors.push(...(error.pageErrors || []).map((entry) => ({ input: file, ...entry })));
    report.blocked.push(...(error.blocked || []).map((url) => ({ input: file, url })));
    return 'failed';
  }
  try {
    if (settings.slides) {
      const itemFail = (slide, step, error) => fail(file, slide, step, error);
      let result;
      try {
        result = await slidesModePdfs(session.page, settings.selector, settings.viewport, buffers, itemFail, settings.timeouts);
      } catch (error) {
        if (error && error.usage === true) return { usage: errorMessage(error) };
        fail(file, null, 'navigate', error);
        return 'failed';
      }
      report.navigation.push({ input: file, selector: settings.selector, ...result });
      if (result.count === 0) {
        return { usage: `no element matches the slides selector "${settings.selector}" in ${file}. Pass --slides=<css> with the selector of one slide or screen.` };
      }
      if (result.fallback) {
        console.error(`note: ${path.basename(file)} fell back from ${result.fallback.from} to stacked navigation at item ${result.fallback.atIndex + 1}: ${result.fallback.reason}`);
      }
    } else {
      try {
        buffers.push(await printModePdf(session.page, settings.pageSize, settings.timeouts.timeoutMs));
      } catch (error) {
        fail(file, null, 'print', error);
      }
    }
    return 'done';
  } finally {
    // Offline aborts are a consequence of --offline, not page errors (browser.cjs splitOfflineErrors).
    const { pageErrors } = splitOfflineErrors(session.errors, session.blocked);
    report.errors.push(...pageErrors.map((error) => ({ input: file, ...error })));
    report.blocked.push(...session.blocked.map((url) => ({ input: file, url })));
    try { await session.close(); } catch (error) { fail(file, null, 'close', error); }
  }
}

async function run(options) {
  const log = (message) => console.error(message);
  const files = resolveInputs(options);
  const slides = Boolean(options.slides);
  const settings = {
    slides,
    selector: slideSelector(options),
    viewport: parseViewport(options.viewport),
    pageSize: options.page === undefined ? null : parsePage(options.page),
    scale: options.scale,
    timeoutMs: options.timeout,
    timeouts: navigationTimeouts(options.timeout),
    offline: Boolean(options.offline),
  };
  const outputDir = options.outputDir;
  fs.mkdirSync(outputDir, { recursive: true });

  const report = {
    ok: false,
    exitCode: null,
    target: 'pdf',
    mode: slides ? 'slides' : 'print',
    inputs: files,
    output: null,
    allowErrors: Boolean(options.allowErrors),
    offline: settings.offline,
    errors: [],
    failures: [],
    navigation: [],
    blocked: [],
  };
  const fail = (input, slide, step, error) => {
    const entry = { input, slide, step, message: errorMessage(error), pageFault: isPageFault(error) };
    report.failures.push(entry);
    const fault = entry.pageFault ? 'page fault' : 'tool fault';
    // One line per failure on stderr; report.json keeps the full message (a page error may carry a stack).
    log(`failed ${path.basename(input)}${slide ? ` slide ${slide}` : ''} (${step}): ${firstLine(entry.message)} (${fault}; continuing)`);
  };
  const finish = (exitCode) => {
    report.exitCode = exitCode;
    report.ok = exitCode === EXIT.OK;
    log(`report: ${writeReport(outputDir, report)}`);
    return exitCode;
  };

  const buffers = [];
  for (const file of files) {
    const outcome = await exportInput(file, settings, report, buffers, fail);
    if (outcome && outcome.usage) {
      // An unparsable selector, or one that matches nothing, is a wrong command, not a page
      // failure: stop at once.
      report.usageError = outcome.usage;
      log(`Usage error: ${outcome.usage}`);
      return finish(EXIT.USAGE);
    }
  }

  for (const error of report.errors) log(`page ${error.type} in ${error.input}: ${error.text}`);
  if (buffers.length === 0) {
    log(`No PDF was written: nothing printed (${report.failures.length} failure(s)).`);
    return finish(exitCodeFor(report, false));
  }

  let outputPath;
  try {
    const output = needsMerge(options, files) ? await mergePdfs(buffers) : Buffer.from(buffers[0]);
    outputPath = path.join(outputDir, `${outputName(options)}.pdf`);
    fs.writeFileSync(outputPath, output);
  } catch (error) {
    // A merge or write failure is a tool defect: report.json still records it (fatal), then the
    // dispatcher exits 1, exactly as the png target does.
    report.exitCode = EXIT.ERROR;
    report.fatal = `could not write the PDF: ${errorMessage(error)}`;
    log(`report: ${writeReport(outputDir, report)}`);
    throw new Error(report.fatal);
  }
  report.output = outputPath;
  console.log(outputPath);

  if (report.failures.length > 0) {
    log(`The PDF was written without ${report.failures.length} failed input(s) or slide(s); see report.json failures[].`);
  }
  if (errorsBlock(report.errors, report.allowErrors)) {
    log(`The PDF was written, but ${report.errors.length} page error(s) were reported. Fix the page, or pass --allow-errors to accept them.`);
  }
  return finish(exitCodeFor(report, true));
}

// The page is at fault anywhere -> 4 (fix the page), even when nothing printed; otherwise a tool
// fault, or nothing printed at all -> 1 (not verifiable); otherwise 0.
function exitCodeFor(report, printed) {
  if (errorsBlock(report.errors, report.allowErrors) || report.failures.some((failure) => failure.pageFault === true)) return EXIT.PAGE_ERROR;
  return !printed || report.failures.length > 0 ? EXIT.ERROR : EXIT.OK;
}

module.exports = {
  flags,
  validate,
  preflight,
  run,
  needsMerge,
  naturalSort,
  readOrderFile,
  parsePage,
  resolveInputs,
  exitCodeFor,
};
