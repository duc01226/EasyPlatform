'use strict';

/**
 * html-export target `--to=png`: render screenshots and prove two things an agent cannot see in
 * a file listing — the page threw no errors, and no capture is blank.
 *
 * Target contract (see ../export.cjs):
 *   flags                 { 'full-page': 'bool' }
 *   validate(options)     sync; throws for usage errors: no input, a missing or non-.html input,
 *                         duplicate input names, --page, or --full-page together with --slides.
 *                         Generic flag formats and ranges (--viewport, --scale, --timeout, --slides)
 *                         are validated once by the dispatcher before this runs.
 *   preflight(options)    -> null (the shared Playwright/Chromium preflight covers this target)
 *   run(options)          -> Promise<exit code>
 *
 * run():
 *   0. --self-check renders tests/fixtures/known-good.html at the first viewport; any failure, page
 *      error, blank capture or a capture count other than 1 there -> exit 1 "verifier broken"
 *      (the verifier is not trusted, so no real input is captured).
 *   1. For every input x every viewport (default 1440x900,390x844): openPage, then either one
 *      viewport screenshot, or with --slides one screenshot per navigator item.
 *      Files: <out>/<name>@<WxH>.png  or  <out>/<name>@<WxH>-s<NN>.png (NN is 1-based).
 *      --full-page additionally writes <out>/<name>@<WxH>-full.png, the whole scrollable document,
 *      whose blank check counts evidence over the whole document instead of the first screen.
 *   2. Log and continue: a failure on one input, viewport or slide (page open or navigation error,
 *      timeout, screenshot error) is recorded in failures[] as { input, viewport, slide, step,
 *      message, pageFault } and printed to stderr; the remaining work still runs. Every page call
 *      (readiness, navigation, the visible-content check, the screenshot) is bounded by --timeout
 *      (browser.cjs timedEvaluate/timedPageCall), so a busy page or a goTo that never settles is a
 *      recorded failure, never a hang.
 *      pageFault (browser.cjs isPageFault) is true when the page caused the failure: a navigation
 *      error, a readiness/font/goTo/capture timeout, a page script that never yields, or an error
 *      the page threw during an in-page call. It is false for a tool fault: the browser failed to
 *      launch or set up, a file could not be written, the browser went away under a call.
 *      When the page fails to OPEN, what it raised before that (openPage rejection pageErrors,
 *      blocked) still goes to errors[] (at: 'load') and blocked[], so the cause is named.
 *      A --slides selector the browser cannot parse (slides.cjs SlideSelectorError) is a usage
 *      error: the run stops, report.json gets exitCode 2 and usageError, and the exit is 2.
 *   3. <out>/report.json: { ok, exitCode, files[], errors[], blank[], failures[], strategy,
 *      navigation[], blocked[], fullPage, selfCheck } (+ usageError on exit 2, fatal on an
 *      unexpected tool defect). files[] entries carry fullPage: true|false.
 *   4. exitCodeFor(report): exit 4 when the page is at fault anywhere: a failures[] entry with
 *      pageFault true, a blank[] entry, or errors[] without --allow-errors (--allow-errors never
 *      excuses a blank capture or a failure). This holds even when nothing was captured, so one
 *      broken page alone exits 4 exactly as it would inside a batch. Otherwise exit 1 when
 *      failures[] holds a tool fault (the result is not verifiable); otherwise 0.
 *
 * Offline rule: under --offline, Chromium logs "Failed to load resource: net::ERR_..." for every
 * request the session aborted, with the aborted URL as the message location. Those messages are
 * a consequence of --offline, not page errors: they move to blocked[]. Every other console error
 * and every uncaught exception (including one caused by a missing blocked script) stays in errors[].
 *
 * Pure helpers exported for tests: isBlankEvidence, isPngBuffer, parseViewportList, captureName,
 * judgeSelfCheck, exitCodeFor.
 *
 * Playwright is loaded only inside browser.cjs functions, so requiring this module never needs it.
 */

const fs = require('node:fs');
const path = require('node:path');

const {
  openPage,
  splitOfflineErrors,
  parseViewportList: parseViewportSizes,
  timedEvaluate,
  timedPageCall,
  isPageFault,
  offlineAbortUrl,
} = require('./browser.cjs');
const { createNavigator, navigationTimeouts, DEFAULT_SLIDE_SELECTOR } = require('./slides.cjs');
const { EXIT } = require('./exit-codes.cjs');
const { fileStem, isHtmlFileName } = require('./paths.cjs');
const { errorMessage, firstLine, errorsBlock, writeReport } = require('./result.cjs');

const DEFAULT_VIEWPORTS = '1440x900,390x844';
// Smallest well-formed PNG (signature + IHDR + tiny IDAT + IEND) is ~67 bytes. The floor only
// catches a truncated or degenerate buffer; a solid-colour frame is several KB and is caught
// by the DOM evidence instead.
const MIN_PNG_BYTES = 100;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SELF_CHECK_FIXTURE = path.resolve(__dirname, '..', '..', 'tests', 'fixtures', 'known-good.html');

const flags = Object.freeze({ 'full-page': 'bool' });

function count(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

/**
 * True when the DOM evidence of a capture region shows nothing a viewer could read or see:
 * no visible text, no loaded image, no svg and no canvas. Missing or non-numeric fields count
 * as zero, so partial evidence never hides a blank frame.
 */
function isBlankEvidence(evidence) {
  const value = evidence || {};
  return count(value.textLen) === 0
    && count(value.imgs) === 0
    && count(value.svg) === 0
    && count(value.canvas) === 0;
}

function isPngBuffer(buffer) {
  return Buffer.isBuffer(buffer)
    && buffer.length >= MIN_PNG_BYTES
    && buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

/** The png viewport list: the dispatcher-validated --viewport, or the two default sizes. */
function parseViewportList(value) {
  return parseViewportSizes(value === undefined || value === null ? DEFAULT_VIEWPORTS : value);
}

function captureName(name, viewportLabel, slideIndex, { fullPage = false } = {}) {
  const slide = Number.isInteger(slideIndex) ? `-s${String(slideIndex + 1).padStart(2, '0')}` : '';
  return `${name}@${viewportLabel}${slide}${fullPage ? '-full' : ''}.png`;
}

function resolveInput(options, input) {
  return path.resolve(options.cwd || process.cwd(), input);
}

function slideSelector(options) {
  if (options.slides === undefined || options.slides === false) return null;
  return options.slides === true ? DEFAULT_SLIDE_SELECTOR : options.slides;
}

function validate(options) {
  const inputs = options.inputs || [];
  if (inputs.length === 0 && !options.selfCheck) {
    throw new Error('provide at least one .html input, for example: --to=png page.html');
  }
  const names = new Map();
  for (const input of inputs) {
    const absolute = resolveInput(options, input);
    let stat = null;
    try { stat = fs.statSync(absolute); } catch {}
    if (!stat || !stat.isFile()) throw new Error(`input file not found: ${absolute}`);
    if (!isHtmlFileName(absolute)) {
      throw new Error(`input must be an .html or .htm file: ${absolute}`);
    }
    // The same stem run() writes with, so two inputs that sanitize to one name are caught here.
    const name = fileStem(absolute);
    const key = name.toLowerCase();
    if (names.has(key)) {
      throw new Error(`inputs ${names.get(key)} and ${absolute} would write the same PNG names; rename one`);
    }
    names.set(key, absolute);
  }
  if (options.page !== undefined) throw new Error('--page applies only to --to=pdf; use --viewport for screenshots');
  if (options.fullPage && slideSelector(options)) {
    throw new Error('--full-page captures the whole document and cannot be combined with --slides; run them separately');
  }
}

function preflight() {
  return null;
}

/**
 * Runs in the page. Scopes evidence to the viewport, to the whole scrollable document
 * (`fullPage`), or to item `index` of `selector` intersected with the viewport, and counts only
 * what a viewer can actually see there.
 */
function collectEvidence({ selector, index, fullPage }) {
  const viewport = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  const root = selector ? document.querySelectorAll(selector)[index] : document.documentElement;
  const zero = { textLen: 0, imgs: 0, svg: 0, canvas: 0 };
  if (!root) return zero;

  let region = viewport;
  if (selector) {
    const box = root.getBoundingClientRect();
    region = {
      left: Math.max(viewport.left, box.left),
      top: Math.max(viewport.top, box.top),
      right: Math.min(viewport.right, box.right),
      bottom: Math.min(viewport.bottom, box.bottom),
    };
    if (region.right <= region.left || region.bottom <= region.top) return zero;
  } else if (fullPage) {
    // The document box in viewport coordinates, so rects below the first screen intersect it.
    const doc = document.documentElement;
    const body = document.body;
    const width = Math.max(doc.scrollWidth, body ? body.scrollWidth : 0, window.innerWidth);
    const height = Math.max(doc.scrollHeight, body ? body.scrollHeight : 0, window.innerHeight);
    region = { left: -window.scrollX, top: -window.scrollY, right: width - window.scrollX, bottom: height - window.scrollY };
  }

  const intersects = (rect) => rect.width > 0 && rect.height > 0
    && rect.right > region.left && rect.bottom > region.top
    && rect.left < region.right && rect.top < region.bottom;
  const shown = (element) => (typeof element.checkVisibility === 'function'
    ? element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    : getComputedStyle(element).visibility !== 'hidden');
  const visible = (element) => shown(element) && intersects(element.getBoundingClientRect());

  let textLen = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim();
    const parent = node.parentElement;
    if (!text || !parent || parent.closest('script, style, noscript, template')) continue;
    if (!shown(parent)) continue;
    range.selectNodeContents(node);
    if (Array.from(range.getClientRects()).some(intersects)) textLen += text.length;
  }

  const elements = (css) => Array.from(root.querySelectorAll(css)).concat(root.matches(css) ? [root] : []);
  let imgs = elements('img').filter((img) => img.complete && img.naturalWidth > 0 && visible(img)).length;
  imgs += elements('video').filter((video) => video.readyState >= 2 && visible(video)).length;
  imgs += elements('*').filter((element) => /url\(/.test(getComputedStyle(element).backgroundImage) && visible(element)).length;
  const svg = elements('svg').filter((element) => !element.parentElement || !element.parentElement.closest('svg'))
    .filter(visible).length;
  const canvas = elements('canvas').filter(visible).length;
  return { textLen, imgs, svg, canvas };
}

async function capture(session, file, scope, timeoutMs) {
  const page = session.page;
  const evidence = await timedEvaluate(page, collectEvidence, scope, timeoutMs, 'visible-content check');
  const buffer = await timedPageCall(page, () => page.screenshot({
    path: file,
    fullPage: Boolean(scope.fullPage),
    animations: 'disabled',
    caret: 'hide',
    timeout: timeoutMs,
  }), timeoutMs, 'screenshot');
  return { evidence, bytes: buffer.length, validPng: isPngBuffer(buffer) };
}

function blankReason(result, fullPage) {
  if (!result.validPng) return `screenshot is not a valid PNG of at least ${MIN_PNG_BYTES} bytes`;
  if (isBlankEvidence(result.evidence)) {
    return `no visible text, image, svg or canvas in the captured ${fullPage ? 'document' : 'region'}`;
  }
  return null;
}

function tagEntries(entries, fields) {
  return entries.map((entry) => ({ ...fields, ...entry }));
}

/**
 * Appends one session's page errors and offline-blocked URLs to the report. A blocked WebSocket's
 * abort message is located at the opening script, not the socket, so it is keyed by the socket URL
 * named in the message; resource aborts are located at the blocked URL.
 */
function recordSessionOutput(report, where, { pageErrors, offlineAborts, blocked }) {
  report.errors.push(...tagEntries(pageErrors, where));
  // Every offlineAborts entry passed isOfflineAbortError, so offlineAbortUrl names its blocked URL.
  const abortText = new Map(offlineAborts.map((entry) => [offlineAbortUrl(entry), entry.text]));
  for (const url of blocked) {
    report.blocked.push({ ...where, url, message: abortText.get(url) || null });
  }
}

// A usage error found only once the page is open (an unparsable --slides selector): the run stops.
function isUsageError(error) {
  return Boolean(error && error.usage === true);
}

function recordFailure(report, failure, error) {
  const entry = {
    input: failure.input,
    viewport: failure.viewport,
    slide: failure.slide,
    step: failure.step,
    message: errorMessage(error),
    pageFault: isPageFault(error),
  };
  report.failures.push(entry);
  const where = [entry.viewport, entry.slide ? `slide ${entry.slide}` : null, entry.step].filter(Boolean).join(' ');
  const fault = entry.pageFault ? 'page fault' : 'tool fault';
  // One line per failure on stderr; report.json keeps the full message (a page error may carry a stack).
  console.error(`  failed ${path.basename(entry.input)} ${where}: ${firstLine(entry.message)} (${fault}; continuing)`);
}

/**
 * Renders one input at one viewport and appends to `report`. Never throws for a page-level
 * problem: an open, navigation or capture failure is recorded in report.failures and the
 * remaining steps still run.
 */
async function renderViewport(file, name, viewport, options, outputDir, report) {
  const selector = slideSelector(options);
  const where = { input: file, viewport: viewport.label };
  const timeouts = navigationTimeouts(options.timeout);
  const callTimeoutMs = timeouts.timeoutMs;
  let session;
  try {
    session = await openPage({
      file,
      viewport,
      scale: options.scale,
      timeoutMs: options.timeout,
      offline: Boolean(options.offline),
    });
  } catch (error) {
    recordFailure(report, { ...where, slide: null, step: 'open' }, error);
    // What the page raised before the open failed (browser.cjs openPage rejection), so a script
    // that threw and then left __ready false is named, not only the __ready timeout.
    recordSessionOutput(report, where, {
      pageErrors: (error.pageErrors || []).map((entry) => ({ ...entry, at: 'load' })),
      offlineAborts: error.offlineAborts || [],
      blocked: error.blocked || [],
    });
    return;
  }

  // Error index boundaries, so each error names the step it arose in ('load' or 'sNN').
  const marks = [{ at: 'load', from: 0 }];
  const record = (result, outFile, slide, fullPage) => {
    const entry = { ...where, slide, fullPage, path: outFile, bytes: result.bytes, evidence: result.evidence };
    report.files.push(entry);
    const reason = blankReason(result, fullPage);
    if (reason) report.blank.push({ ...entry, reason });
  };
  const attempt = async (slide, step, work) => {
    try {
      await work();
    } catch (error) {
      if (isUsageError(error)) throw error;
      recordFailure(report, { ...where, slide, step }, error);
    }
  };

  try {
    if (!selector) {
      await attempt(null, 'capture', async () => {
        const outFile = path.join(outputDir, captureName(name, viewport.label));
        record(await capture(session, outFile, { selector: null, index: 0 }, callTimeoutMs), outFile, null, false);
      });
      if (options.fullPage) {
        await attempt(null, 'capture-full-page', async () => {
          const outFile = path.join(outputDir, captureName(name, viewport.label, null, { fullPage: true }));
          record(await capture(session, outFile, { selector: null, index: 0, fullPage: true }, callTimeoutMs), outFile, null, true);
        });
      }
    } else {
      let navigator = null;
      await attempt(null, 'navigate', async () => { navigator = await createNavigator(session.page, selector, timeouts); });
      if (navigator) {
        const navigation = { ...where, selector, count: navigator.count };
        report.navigation.push(navigation);
        if (navigator.count === 0) {
          report.blank.push({
            ...where,
            slide: null,
            path: null,
            reason: `--slides selector "${selector}" matched no items, so nothing was captured`,
          });
        }
        for (let index = 0; index < navigator.count; index += 1) {
          marks.push({ at: `s${String(index + 1).padStart(2, '0')}`, from: session.errors.length });
          await attempt(index + 1, 'slide', async () => {
            await navigator.goTo(index);
            const outFile = path.join(outputDir, captureName(name, viewport.label, index));
            record(await capture(session, outFile, { selector, index }, callTimeoutMs), outFile, index + 1, false);
          });
        }
        navigation.strategy = navigator.strategy;
        navigation.fallback = navigator.fallback;
      }
    }
  } finally {
    // Collected even when a step failed, so the report shows what the page raised.
    const stepOf = (errorIndex) => marks.filter((mark) => mark.from <= errorIndex).pop().at;
    const indexed = session.errors.map((entry, errorIndex) => ({ ...entry, at: stepOf(errorIndex) }));
    const { pageErrors, offlineAborts } = splitOfflineErrors(indexed, session.blocked);
    recordSessionOutput(report, where, { pageErrors, offlineAborts, blocked: session.blocked });
    try {
      await session.close();
    } catch (error) {
      recordFailure(report, { ...where, slide: null, step: 'close' }, error);
    }
  }
}

function summarizeStrategy(navigation) {
  const strategies = [...new Set(navigation.map((entry) => entry.strategy).filter(Boolean))];
  if (strategies.length === 0) return null;
  return strategies.length === 1 ? strategies[0] : 'mixed';
}

function emptyReport() {
  return { files: [], errors: [], blank: [], failures: [], navigation: [], blocked: [] };
}

/** The self-check verdict for a known-good render: null when trusted, else the reason. */
function judgeSelfCheck(report) {
  if (report.failures.length > 0) {
    return `known-good fixture failed to render: ${report.failures[0].message}`;
  }
  if (report.errors.length > 0) {
    return `known-good fixture reported ${report.errors.length} page error(s): ${report.errors[0].text}`;
  }
  if (report.blank.length > 0) return `known-good fixture was judged blank: ${report.blank[0].reason}`;
  if (report.files.length !== 1) return `known-good fixture produced ${report.files.length} captures instead of 1`;
  return null;
}

async function runSelfCheck(options, viewport, outputDir) {
  const result = { ok: false, fixture: SELF_CHECK_FIXTURE, viewport: viewport.label, reason: null };
  if (!fs.existsSync(SELF_CHECK_FIXTURE)) {
    result.reason = `self-check fixture is missing: ${SELF_CHECK_FIXTURE}`;
    return result;
  }
  const report = emptyReport();
  const selfCheckDir = path.join(outputDir, 'self-check');
  fs.mkdirSync(selfCheckDir, { recursive: true });
  await renderViewport(
    SELF_CHECK_FIXTURE,
    'known-good',
    viewport,
    { ...options, slides: undefined, fullPage: false },
    selfCheckDir,
    report,
  );
  Object.assign(result, { files: report.files, errors: report.errors, blank: report.blank, failures: report.failures });
  result.reason = judgeSelfCheck(report);
  result.ok = result.reason === null;
  return result;
}

function describeEntry(entry) {
  const where = [entry.viewport, entry.slide ? `slide ${entry.slide}` : entry.at].filter(Boolean).join(' ');
  return `${path.basename(entry.input)} ${where}: ${entry.text || entry.reason}`;
}

// The page is at fault anywhere -> 4 (fix the page), even when nothing was captured; otherwise a
// tool fault -> 1 (not verifiable); otherwise 0.
function exitCodeFor(report) {
  const pageFailure = report.failures.some((failure) => failure.pageFault === true);
  if (pageFailure || errorsBlock(report.errors, report.allowErrors) || report.blank.length > 0) return EXIT.PAGE_ERROR;
  return report.failures.length > 0 ? EXIT.ERROR : EXIT.OK;
}

async function run(options) {
  const outputDir = options.outputDir;
  if (typeof outputDir !== 'string' || outputDir === '') throw new Error('run(options) needs options.outputDir');
  const viewports = parseViewportList(options.viewport);
  const inputs = (options.inputs || []).map((input) => resolveInput(options, input));
  fs.mkdirSync(outputDir, { recursive: true });

  const report = {
    ok: false,
    exitCode: null,
    target: 'png',
    inputs,
    viewports: viewports.map((viewport) => viewport.label),
    slides: slideSelector(options),
    fullPage: Boolean(options.fullPage),
    allowErrors: Boolean(options.allowErrors),
    offline: Boolean(options.offline),
    selfCheck: null,
    ...emptyReport(),
    strategy: null,
  };

  if (options.selfCheck) {
    report.selfCheck = await runSelfCheck(options, viewports[0], outputDir);
    if (!report.selfCheck.ok) {
      report.exitCode = EXIT.ERROR;
      const reportPath = writeReport(outputDir, report);
      console.error(`verifier broken: ${report.selfCheck.reason}`);
      console.error(`report: ${reportPath}`);
      return EXIT.ERROR;
    }
    console.log(`self-check: known-good fixture passed at ${report.selfCheck.viewport}`);
  }

  try {
    for (const file of inputs) {
      for (const viewport of viewports) {
        await renderViewport(file, fileStem(file), viewport, options, outputDir, report);
      }
    }
  } catch (error) {
    if (isUsageError(error)) {
      // The command is wrong (an unparsable --slides selector), not the page: stop at once.
      report.exitCode = EXIT.USAGE;
      report.usageError = errorMessage(error);
      const reportPath = writeReport(outputDir, report);
      console.error(`Usage error: ${report.usageError}`);
      console.error(`report: ${reportPath}`);
      return EXIT.USAGE;
    }
    // Only an unexpected tool defect reaches here; page-level problems are in report.failures.
    report.exitCode = EXIT.ERROR;
    report.fatal = errorMessage(error);
    writeReport(outputDir, report);
    throw error;
  }

  report.strategy = summarizeStrategy(report.navigation);
  const exitCode = exitCodeFor(report);
  report.ok = exitCode === EXIT.OK;
  report.exitCode = exitCode;
  const reportPath = writeReport(outputDir, report);

  const summary = `png: ${report.files.length} capture(s), ${report.errors.length} page error(s)`
    + `${report.allowErrors && report.errors.length > 0 ? ' (allowed)' : ''}, ${report.blank.length} blank`
    + `${report.failures.length > 0 ? `, ${report.failures.length} failed step(s)` : ''}`
    + `${report.blocked.length > 0 ? `, ${report.blocked.length} request(s) blocked offline` : ''}`;
  const log = exitCode === EXIT.OK ? console.log : console.error;
  log(summary);
  for (const entry of report.errors.slice(0, 5)) log(`  error  ${describeEntry(entry)}`);
  for (const entry of report.blank.slice(0, 5)) log(`  blank  ${describeEntry(entry)}`);
  log(`report: ${reportPath}`);
  return exitCode;
}

module.exports = {
  flags,
  validate,
  preflight,
  run,
  DEFAULT_VIEWPORTS,
  MIN_PNG_BYTES,
  SELF_CHECK_FIXTURE,
  isBlankEvidence,
  isPngBuffer,
  parseViewportList,
  captureName,
  collectEvidence,
  judgeSelfCheck,
  exitCodeFor,
};
