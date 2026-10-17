'use strict';

/**
 * Shared Playwright page session for html-export targets.
 *
 * Exports:
 *   openPage({ file, viewport, scale, timeoutMs, offline, beforeNavigate, setupTimeoutMs })
 *     -> Promise<{ page, context, browser, errors, blocked, close }>
 *     - file            path to a local HTML file (required; resolved to an absolute file: URL)
 *     - viewport        'WxH' string or { width, height } (default 1440x900)
 *     - scale           device scale factor (default 1)
 *     - timeoutMs       navigation/ready timeout in ms (default 30000); it bounds the page, never
 *                       the browser's own start or stop (see setupTimeoutMs)
 *     - setupTimeoutMs  bound on the tool-side calls that start and stop the browser:
 *                       chromium.launch, browser.newContext, context.route, context.newPage,
 *                       beforeNavigate and browser.close. Default launchBudget(timeoutMs), so a
 *                       short per-page --timeout never turns a slow launch on a busy machine into a failure. A
 *                       setup call that does not finish rejects with pageFault false naming it.
 *     - offline         when true the whole context is offline (no HTTP, WebSocket or other
 *                       network traffic) and service workers are blocked; a route also aborts
 *                       every request that is not a LOCAL file: URL (empty or `localhost` host;
 *                       the input document itself is always allowed), so a `file://<host>/...`
 *                       (UNC/SMB) URL is aborted and listed too; every WebSocket the page opens is
 *                       refused by the offline context, so `blocked` names what the page tried to
 *                       reach. Chromium itself is launched with a dead proxy for every host,
 *                       loopback included (OFFLINE_LAUNCH_ARGS), and QUIC disabled, which closes
 *                       the channels the context emulation and the route never see: speculation-
 *                       rules prefetch/prerender and WebTransport. Those attempts fail silently
 *                       and are NOT listed in `blocked`. Local file: subresources still load.
 *     - beforeNavigate  async (page) => void, awaited after listeners attach and BEFORE goto,
 *                       so a hook such as page.clock.install() takes effect before page scripts run;
 *                       bounded by setupTimeoutMs (a hook that does not finish is a tool fault)
 *     The context uses reducedMotion: 'reduce'. `errors` collects console errors and uncaught page
 *     errors as { type: 'console' | 'pageerror', text, location? } for the whole session, so
 *     errors raised after load (e.g. during slide navigation) are captured too. `blocked` lists
 *     the request and WebSocket URLs offline mode refused. `close()` is idempotent and closes
 *     the browser through closeBrowser (bounded by setupTimeoutMs; a close that does not finish
 *     abandons the browser with a stderr warning and resolves, so it never hangs).
 *     After load the session waits for document.fonts.ready and, when the page defines
 *     window.__ready, for window.__ready === true (polled from Node, so a paused page clock
 *     cannot stall the wait). Each wait is bounded by timeoutMs through timedEvaluate, so a
 *     font that never finishes loading, a __ready that never turns true, or a page script that
 *     never yields rejects openPage with a message naming the wait, and a target records the
 *     failure and moves on instead of hanging.
 *     Every rejection carries `pageFault`: false for a launch or setup failure (the tool could
 *     not run), true for a navigation or readiness failure (the page is at fault), except when
 *     the browser or page was closed or crashed underneath the call.
 *     Every rejection after launch also carries what the page raised before the open failed, so a
 *     script that threw and then left __ready false is still reported:
 *       error.pageErrors     the page errors (splitOfflineErrors(...).pageErrors, same entry shape
 *                            as `errors`: { type, text, location? }); [] when none
 *       error.blocked        the URLs offline mode refused; [] when none
 *       error.offlineAborts  the console messages those refusals caused; [] when none
 *   launchBudget(timeoutMs) -> number   max(timeoutMs, DEFAULT_TIMEOUT_MS): the ONE rule for how
 *     long the browser may take to start or stop; the dispatcher's dependency probe uses it too.
 *   closeBrowser(browser, budgetMs) -> Promise<{ timedOut }>   browser.close() bounded by budgetMs;
 *     on timeout the browser is abandoned (killed now through browser.process() when it has one;
 *     Playwright 1.6x Browser objects do not, so it is killed by Playwright's own exit handler
 *     when the CLI exits: export.cjs exitProcess), a warning goes to stderr, and it resolves
 *     { timedOut: true }. A close that fails (rather than hangs) still rejects.
 *   hasAbandonedBrowser() -> boolean   true once any close timed out in this process.
 *   abandonedBrowserCount() -> number   how many closes timed out in this process (tests assert a delta).
 *   probeChromium({ budgetMs = DEFAULT_TIMEOUT_MS, playwright = loadPlaywright() }) -> Promise<void>
 *     The dispatcher's dependency probe: launches headless Chromium bounded by budgetMs (a launch
 *     that finishes after the deadline is closed, like openPage's) and closes it through
 *     closeBrowser; a failed close only warns on stderr. Rejects with the launch error, whose
 *     `launchTimedOut` is true when the launch did not finish in time (the probe's deadline or
 *     Playwright's own TimeoutError) and false for any other launch failure.
 *   setupHints() -> string   the per-shell setup commands for the skill-local dependencies.
 *   dependencyFailure(reason) -> string   `reason`, a blank line, then setupHints(); the text a
 *     target preflight or the shared preflight returns for a missing dependency (exit 3).
 *   timedEvaluate(page, fn, arg, timeoutMs, label) -> Promise<result of page.evaluate(fn, arg)>
 *     The one bounded in-page call. Playwright's page.evaluate has no time limit, so a page
 *     busy in a long-running script, or a function awaiting a promise that never settles, would
 *     otherwise hang the exporter. On timeout it rejects with a PageTimeoutError (pageFault
 *     true) whose message names `label`; the call itself is abandoned, never awaited again.
 *     An error thrown by the page while the call runs gets pageFault true (false when the
 *     page/browser was closed or crashed).
 *   timedPageCall(page, work, timeoutMs, label) -> Promise<result of work()>
 *     The same bound for any other page operation that needs the renderer (keyboard.press,
 *     emulateMedia, pdf, screenshot); only a timeout is classified (other errors pass unchanged).
 *     After a call on a page times out, the next call on that page first checks that the page
 *     still answers (a short evaluate, at most PING_MS): a page that only has a promise pending
 *     answers and the call proceeds; a page that does not answer is busy, and from then on
 *     every call on it rejects at once with a PageTimeoutError (busy: true) instead of waiting
 *     out the timeout again. The state clears if the abandoned call ever settles.
 *   PageTimeoutError   { name, label, timeoutMs, timedOut: true, busy, pageFault: true }
 *   isPageFault(error) -> boolean   error.pageFault when it is a boolean, else true only for
 *     Playwright's own TimeoutError (for example a page.screenshot that timed out).
 *   OFFLINE_LAUNCH_ARGS   the Chromium flags added to an offline session's launch.
 *   splitOfflineErrors(errors, blocked) -> { pageErrors, offlineAborts }
 *     Chromium logs a "Failed to load resource: net::ERR_*" console error, located at the URL, for
 *     every request the offline route aborted, and a "WebSocket connection to '<url>' failed: ...
 *     net::ERR_INTERNET_DISCONNECTED" console error for every WebSocket the offline context
 *     refused. Those are a consequence of --offline, not page errors, when the URL is in
 *     `blocked`; every other console error and every uncaught exception (including one thrown by
 *     code that handles the failed connection) stays a page error. All targets use this one rule.
 *   isOfflineAbortError(entry, blockedUrlSet) -> boolean   the predicate behind the split.
 *   parseViewport(value) -> { width, height }   accepts 'WxH' (e.g. '1280x720') or an object.
 *   parseSize(value, label, example) -> { width, height }   the one WxH parser (viewport and
 *     --page); throws 'invalid <label> "<value>"; expected WxH in CSS pixels, ...'.
 *   parseViewportList(value) -> [{ width, height, label }]   'WxH[,WxH]'; rejects an empty entry
 *     and a size listed twice (both entries would write the same file names).
 *   DEFAULT_VIEWPORT, DEFAULT_TIMEOUT_MS, PLAYWRIGHT_ROOT
 *   loadPlaywright() -> the skill-local playwright module.
 *
 * Playwright is resolved ONLY from this skill's own node_modules (never an adopter's parent
 * dependency) and only inside functions, so loading this module never needs the dependency.
 */

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { errorMessage, sleep } = require('./result.cjs');

const SKILL_ROOT = path.resolve(__dirname, '..', '..');
const PLAYWRIGHT_ROOT = path.join(SKILL_ROOT, 'node_modules', 'playwright');
const DEFAULT_VIEWPORT = Object.freeze({ width: 1440, height: 900 });
const DEFAULT_TIMEOUT_MS = 30_000;
const READY_POLL_MS = 25;
// How long a page with an abandoned (timed-out) call may take to answer before it counts as busy.
const PING_MS = 1000;
// Offline sessions route every host, loopback included, to a closed port (discard, 9) and turn
// QUIC off: speculation-rules prefetch/prerender and WebTransport bypass both the context's
// offline emulation and context.route, so only the browser's own proxy/QUIC settings stop them.
const OFFLINE_LAUNCH_ARGS = Object.freeze([
  '--proxy-server=http://127.0.0.1:9',
  '--proxy-bypass-list=<-loopback>',
  '--disable-quic',
]);
// Messages Playwright gives when the page, context or browser went away under a call: not a page fault.
const CLOSED_TEXT = /Target (?:page, context or browser has been closed|closed|crashed)|browser has been closed|Browser closed/i;
const OFFLINE_ABORT_TEXT = /^Failed to load resource: net::ERR_[A-Z_]+/;
// The one error code an offline context gives a WebSocket; any other code is a real page failure.
const OFFLINE_WEBSOCKET_TEXT = /^WebSocket connection to '([^']+)' failed: .*\bnet::ERR_INTERNET_DISCONNECTED\b/;

// The URL an offline-abort message is about: the message location for a request, the quoted URL
// for a WebSocket (whose message is located at the script that opened it). Null otherwise.
function offlineAbortUrl(entry) {
  if (!entry || entry.type !== 'console' || typeof entry.text !== 'string') return null;
  // Targets key abort messages by location, so an entry without one is never excused.
  if (!entry.location || typeof entry.location.url !== 'string') return null;
  if (OFFLINE_ABORT_TEXT.test(entry.text)) return entry.location.url;
  const websocket = OFFLINE_WEBSOCKET_TEXT.exec(entry.text);
  return websocket ? websocket[1] : null;
}

function isOfflineAbortError(entry, blockedUrls) {
  const url = offlineAbortUrl(entry);
  return url !== null && blockedUrls.has(url);
}

function splitOfflineErrors(errors, blocked) {
  const blockedUrls = new Set(blocked || []);
  const pageErrors = [];
  const offlineAborts = [];
  for (const entry of errors || []) {
    if (isOfflineAbortError(entry, blockedUrls)) offlineAborts.push(entry);
    else pageErrors.push(entry);
  }
  return { pageErrors, offlineAborts };
}

function loadPlaywright() {
  // An absolute skill-local path prevents Node from accepting an adopter's parent dependency.
  return require(PLAYWRIGHT_ROOT);
}

// The one WxH parser: positive whole numbers with 'x' or 'X' between them; spaces around are allowed.
function parseSize(value, label, example) {
  const match = /^\s*(\d+)\s*[xX]\s*(\d+)\s*$/.exec(String(value));
  if (!match || Number(match[1]) === 0 || Number(match[2]) === 0) {
    throw new Error(`invalid ${label} "${String(value)}"; expected WxH in CSS pixels, for example ${example}`);
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}

function parseViewport(value) {
  if (value === undefined || value === null || value === '') return { ...DEFAULT_VIEWPORT };
  if (typeof value === 'object') {
    const width = Number(value.width);
    const height = Number(value.height);
    if (Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0) {
      return { width, height };
    }
    throw new Error('viewport must have positive whole-number width and height');
  }
  return parseSize(value, 'viewport', '1280x720');
}

function parseViewportList(value) {
  const raw = String(value);
  const parts = raw.split(',').map((part) => part.trim());
  if (parts.some((part) => part === '')) {
    throw new Error(`invalid --viewport "${raw}"; expected WxH[,WxH], for example 1440x900,390x844`);
  }
  const seen = new Set();
  return parts.map((part) => {
    const size = parseViewport(part);
    const label = `${size.width}x${size.height}`;
    if (seen.has(label)) {
      throw new Error(`--viewport lists ${label} more than once; each size writes the same file names, so list it once`);
    }
    seen.add(label);
    return { ...size, label };
  });
}

// How long the browser may take to start or stop. A short per-page --timeout bounds the page, never
// the browser: a busy machine can take seconds to launch Chromium, and borrowing that short value
// would turn a healthy install into a tool failure (or, in the dependency probe, a missing browser).
function launchBudget(timeoutMs) {
  return Math.max(Number(timeoutMs) || 0, DEFAULT_TIMEOUT_MS);
}

// Bounds one tool-side browser call (launch, newContext, route, newPage, beforeNavigate). A call
// that does not finish rejects with pageFault false and setupTimedOut true; it is abandoned, its
// late rejection is consumed, and a late result is handed to `onLate` (a launch that finishes
// after its deadline must still be closed: closeLateLaunch).
async function boundedSetupCall(work, budgetMs, label, onLate = null) {
  const pending = Promise.resolve().then(work);
  let timer;
  const deadline = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      pending.then((late) => { if (onLate) onLate(late); }).catch(() => {});
      const error = new Error(`${label} did not finish within ${budgetMs} ms; the browser is not responding (a busy or broken machine, not the page)`);
      error.pageFault = false;
      error.setupTimedOut = true;
      reject(error);
    }, budgetMs);
  });
  try {
    return await Promise.race([pending, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

// The onLate handler for a bounded launch: a browser that arrives after its deadline is closed.
function closeLateLaunch(budgetMs) {
  return (late) => {
    if (late && typeof late.close === 'function') closeBrowser(late, budgetMs).catch(() => {});
  };
}

// Browsers whose close() never finished. Playwright's Browser has no public process handle (only
// BrowserServer does), but Playwright kills every browser it launched when the Node process exits,
// so the CLI exits explicitly when this is non-zero (export.cjs exitProcess) instead of waiting on
// an event loop the stuck browser keeps alive.
let abandonedBrowsers = 0;

function hasAbandonedBrowser() {
  return abandonedBrowsers > 0;
}

function abandonedBrowserCount() {
  return abandonedBrowsers;
}

function killBrowserProcess(browser) {
  try {
    const child = typeof browser.process === 'function' ? browser.process() : null;
    if (child && typeof child.kill === 'function') child.kill();
  } catch {}
}

// browser.close() bounded by budgetMs. A close that does not finish must not hang the export: the
// browser is abandoned (its process is killed now when a handle exists, else when the exporter
// exits), a warning goes to stderr, and the call resolves { timedOut: true }.
async function closeBrowser(browser, budgetMs) {
  const closing = Promise.resolve().then(() => browser.close());
  // A close that fails (rather than hangs) rejects here.
  if (await settlesWithin(closing, budgetMs)) return { timedOut: false };
  closing.catch(() => {});
  abandonedBrowsers += 1;
  killBrowserProcess(browser);
  console.error(`Warning: the browser did not close within ${budgetMs} ms; it is stopped when the exporter exits. Continuing.`);
  return { timedOut: true };
}

// What the page raised before openPage failed, attached to the rejection (see the header).
function attachSessionOutput(error, errors, blocked) {
  if (!Array.isArray(error.pageErrors)) {
    const { pageErrors, offlineAborts } = splitOfflineErrors(errors, blocked);
    error.pageErrors = pageErrors;
    error.blocked = [...blocked];
    error.offlineAborts = offlineAborts;
  }
  return error;
}

class PageTimeoutError extends Error {
  /**
   * @param {string} label       the page call that did not finish (or, with busy, the one that was skipped)
   * @param {number} timeoutMs   the bound that expired
   * @param {{ busy?: { label: string, timeoutMs: number } }} [options]  set when the call was skipped
   *                             because an earlier call on the same page never returned
   */
  constructor(label, timeoutMs, { busy = null } = {}) {
    super(busy
      ? `${label} was skipped: the page did not answer a responsiveness check after ${busy.label} timed out (${busy.timeoutMs} ms); a page script is still running`
      : `${label} did not finish within ${timeoutMs} ms (a page script is still running, or the page awaits a promise that never settles)`);
    this.name = 'PageTimeoutError';
    this.label = label;
    this.timeoutMs = timeoutMs;
    this.timedOut = true;
    this.busy = Boolean(busy);
    this.pageFault = true;
  }
}

function isClosedError(error) {
  return CLOSED_TEXT.test(errorMessage(error));
}

// Sets error.pageFault once (the innermost classification wins) and returns an Error.
function classifyFault(error, pageFault) {
  const tagged = error instanceof Error ? error : new Error(String(error));
  if (typeof tagged.pageFault !== 'boolean') tagged.pageFault = pageFault && !isClosedError(tagged);
  return tagged;
}

function isPageFault(error) {
  if (!error || typeof error !== 'object') return false;
  if (typeof error.pageFault === 'boolean') return error.pageFault;
  return error.name === 'TimeoutError';
}

// Per-page record of calls abandoned after a timeout: { stalled, lastStall, busy }.
const pageStates = new WeakMap();

function pageState(page) {
  let state = pageStates.get(page);
  if (!state) {
    state = { stalled: 0, lastStall: null, busy: null };
    pageStates.set(page, state);
  }
  return state;
}

// Resolves true when `promise` settles first, false when `ms` passes first (a rejection propagates).
function settlesWithin(promise, ms) {
  let timer;
  const expired = new Promise((resolve) => { timer = setTimeout(() => resolve(false), ms); });
  return Promise.race([promise.then(() => true), expired]).finally(() => clearTimeout(timer));
}

// Before a call on a page that has an abandoned call: fail at once when the page is known busy,
// otherwise require a quick answer, so a hung page costs one timeout rather than one per call.
async function ensureResponsive(page, timeoutMs, label) {
  const state = pageStates.get(page);
  if (!state || (state.stalled === 0 && !state.busy)) return;
  if (!state.busy) {
    const ping = page.evaluate(() => true);
    ping.catch(() => {});
    if (await settlesWithin(ping, Math.min(timeoutMs, PING_MS))) return;
    state.busy = state.lastStall;
  }
  throw new PageTimeoutError(label, timeoutMs, { busy: state.busy });
}

async function timedPageCall(page, work, timeoutMs, label) {
  if (!page || typeof work !== 'function') throw new Error('timedPageCall requires a page and a function');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('timeoutMs must be a positive number');
  await ensureResponsive(page, timeoutMs, label);
  const pending = Promise.resolve().then(work);
  let timer;
  let expired = false;
  const deadline = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      expired = true;
      reject(new PageTimeoutError(label, timeoutMs));
    }, timeoutMs);
  });
  try {
    return await Promise.race([pending, deadline]);
  } finally {
    clearTimeout(timer);
    if (expired) {
      // Abandon the call: never await it again, and forget it only if it ever settles.
      const state = pageState(page);
      state.stalled += 1;
      state.lastStall = { label, timeoutMs };
      const settled = () => {
        state.stalled -= 1;
        if (state.stalled === 0) state.busy = null;
      };
      pending.then(settled, settled);
    }
  }
}

async function timedEvaluate(page, fn, arg, timeoutMs, label) {
  let evaluating = false;
  try {
    return await timedPageCall(page, () => {
      evaluating = true;
      return page.evaluate(fn, arg);
    }, timeoutMs, label);
  } catch (error) {
    // A timeout or busy skip is already classified. Any other error raised once the call ran means
    // the page threw (a page fault) unless it went away; an argument error before that is the tool's.
    throw evaluating ? classifyFault(error, true) : error;
  }
}

async function waitForPageReady(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  // document.fonts.ready is a promise, not a page timer, so it settles under a paused clock too.
  try {
    await timedEvaluate(page, () => (document.fonts && document.fonts.ready
      ? document.fonts.ready.then(() => true)
      : true), undefined, timeoutMs, 'document.fonts.ready');
  } catch (error) {
    if (error instanceof PageTimeoutError && !error.busy) {
      error.message = `document.fonts.ready did not settle within ${timeoutMs} ms; a web font never finished loading, or a page script is still running`;
    }
    throw error;
  }
  for (;;) {
    let state;
    try {
      // Each poll gets at least a responsiveness window, so a slow answer near the deadline is not
      // mistaken for a busy page; a page that never answers still fails within about that window.
      state = await timedEvaluate(page, () => {
        if (window.__ready === undefined) return 'absent';
        return window.__ready === true ? 'ready' : 'waiting';
      }, undefined, Math.max(deadline - Date.now(), Math.min(timeoutMs, PING_MS)), 'window.__ready check');
    } catch (error) {
      if (error instanceof PageTimeoutError) {
        error.message = `the window.__ready check did not answer within ${timeoutMs} ms; a page script is still running`;
      }
      throw error;
    }
    if (state !== 'waiting') return;
    if (Date.now() >= deadline) {
      const error = new PageTimeoutError('window.__ready', timeoutMs);
      error.message = `page defines window.__ready but it did not become true within ${timeoutMs} ms`;
      throw error;
    }
    await sleep(READY_POLL_MS);
  }
}

// A local file: URL (no host, or localhost); `file://<host>/...` reaches the network (UNC/SMB).
function isLocalFileUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === 'file:' && (parsed.hostname === '' || parsed.hostname.toLowerCase() === 'localhost');
}

async function openPage(options = {}) {
  const {
    file,
    viewport,
    scale = 1,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    offline = false,
    beforeNavigate,
  } = options;

  if (typeof file !== 'string' || file === '') throw new Error('openPage requires a file path');
  const absoluteFile = path.resolve(file);
  if (!fs.existsSync(absoluteFile) || !fs.statSync(absoluteFile).isFile()) {
    throw new Error(`input file not found: ${absoluteFile}`);
  }
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('scale must be a positive number');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('timeoutMs must be a positive number');
  const setupTimeoutMs = options.setupTimeoutMs === undefined ? launchBudget(timeoutMs) : options.setupTimeoutMs;
  if (!Number.isFinite(setupTimeoutMs) || setupTimeoutMs <= 0) throw new Error('setupTimeoutMs must be a positive number');
  if (beforeNavigate !== undefined && typeof beforeNavigate !== 'function') {
    throw new Error('beforeNavigate must be a function');
  }
  const size = parseViewport(viewport);

  const documentUrl = pathToFileURL(absoluteFile).href;
  // Declared before setup, so a failed open still reports what the page raised.
  const errors = [];
  const blocked = [];
  let browser;
  try {
    const playwright = loadPlaywright();
    // Launch args are per browser, and each session launches its own, so they reach offline sessions only.
    browser = await boundedSetupCall(() => playwright.chromium.launch({
      headless: true,
      timeout: setupTimeoutMs,
      ...(offline ? { args: [...OFFLINE_LAUNCH_ARGS] } : {}),
    }), setupTimeoutMs, 'chromium.launch', closeLateLaunch(setupTimeoutMs));
  } catch (error) {
    throw attachSessionOutput(classifyFault(error, false), errors, blocked);
  }
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await closeBrowser(browser, setupTimeoutMs);
  };

  // Setup failures are the tool's (pageFault false); from navigation on, failures are the page's.
  let navigating = false;
  try {
    const context = await boundedSetupCall(() => browser.newContext({
      viewport: size,
      deviceScaleFactor: scale,
      reducedMotion: 'reduce',
      // A route never sees WebSocket handshakes, so offline mode takes the whole context offline
      // and blocks service workers; the route below still records every request it aborts.
      ...(offline ? { offline: true, serviceWorkers: 'block' } : {}),
    }), setupTimeoutMs, 'browser.newContext');
    context.setDefaultTimeout(timeoutMs);
    context.setDefaultNavigationTimeout(timeoutMs);

    if (offline) {
      await boundedSetupCall(() => context.route('**/*', (route) => {
        const url = route.request().url();
        // The input document is always allowed, even on a UNC path the caller chose; anything
        // else must be a local file: URL.
        if (url === documentUrl || isLocalFileUrl(url)) return route.continue();
        blocked.push(url);
        return route.abort('internetdisconnected');
      }), setupTimeoutMs, 'context.route');
    }

    const page = await boundedSetupCall(() => context.newPage(), setupTimeoutMs, 'context.newPage');
    if (offline) {
      // A WebSocket bypasses the route; the offline context refuses it, so record it as blocked.
      page.on('websocket', (socket) => { blocked.push(socket.url()); });
    }
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const location = message.location();
      errors.push({
        type: 'console',
        text: message.text(),
        location: location && location.url ? location : undefined,
      });
    });
    page.on('pageerror', (error) => {
      errors.push({ type: 'pageerror', text: errorMessage(error) });
    });

    // A hook runs browser calls (for example clock.install); a browser that stops answering there
    // must not hang the session, so it is bounded like every other setup call.
    if (beforeNavigate) await boundedSetupCall(() => beforeNavigate(page), setupTimeoutMs, 'beforeNavigate');

    navigating = true;
    await page.goto(documentUrl, { waitUntil: 'load', timeout: timeoutMs });
    await waitForPageReady(page, timeoutMs);

    return { page, context, browser, errors, blocked, close };
  } catch (error) {
    try { await close(); } catch {}
    throw attachSessionOutput(classifyFault(error, navigating), errors, blocked);
  }
}

// The dependency probe: proves the skill-local Chromium starts, then closes it. The launch is
// bounded like every session launch (a launch that finishes after the deadline is closed), and a
// close that fails or hangs only warns, because a launched browser already proves the dependency.
async function probeChromium(options = {}) {
  const budgetMs = options.budgetMs === undefined ? DEFAULT_TIMEOUT_MS : options.budgetMs;
  if (!Number.isFinite(budgetMs) || budgetMs <= 0) throw new Error('budgetMs must be a positive number');
  const playwright = options.playwright || loadPlaywright();
  if (!playwright || !playwright.chromium || typeof playwright.chromium.launch !== 'function') {
    throw new Error('the skill-local Playwright package does not expose chromium.launch()');
  }
  let browser;
  try {
    browser = await boundedSetupCall(
      () => playwright.chromium.launch({ headless: true, timeout: budgetMs }),
      budgetMs,
      'Chromium launch probe',
      closeLateLaunch(budgetMs),
    );
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    // Our own deadline, or Playwright's launch timeout (its TimeoutError): the browser is slow to
    // start, which is a busy or broken machine, not a missing one.
    failure.launchTimedOut = failure.setupTimedOut === true || failure.name === 'TimeoutError';
    throw failure;
  }
  if (!browser || typeof browser.close !== 'function') {
    throw new Error('the Playwright launch probe did not return a closable browser');
  }
  try {
    await closeBrowser(browser, budgetMs);
  } catch (error) {
    console.error(`Warning: the Chromium close probe failed: ${errorMessage(error)}; continuing.`);
  }
}

// The exit-3 setup block for a skill-local dependency (Playwright, its Chromium, pdf-lib). Every
// command installs from INSIDE the skill folder: `npm install --prefix <dir>` run from the project
// root makes npm 10 add the host root package to the skill's package.json as a `file:../../..`
// dependency and link it into node_modules.
function setupHints() {
  return [
    'Setup commands (the exporter never runs these; run them from the project root):',
    '  macOS/Linux shell:  (cd .claude/skills/html-export && npm install && npx playwright install chromium)',
    '  Linux system libs:  (cd .claude/skills/html-export && npx playwright install --with-deps chromium)',
    '  Windows PowerShell: Push-Location .claude/skills/html-export; npm install; npx playwright install chromium; Pop-Location',
    '  Windows cmd:        pushd .claude\\skills\\html-export && npm install && npx playwright install chromium && popd',
  ].join('\n');
}

// A missing skill-local dependency: the reason, then the setup block (the dispatcher exits 3).
function dependencyFailure(reason) {
  return `${reason}\n\n${setupHints()}`;
}

module.exports = {
  DEFAULT_VIEWPORT,
  DEFAULT_TIMEOUT_MS,
  PLAYWRIGHT_ROOT,
  OFFLINE_LAUNCH_ARGS,
  launchBudget,
  closeBrowser,
  hasAbandonedBrowser,
  abandonedBrowserCount,
  probeChromium,
  offlineAbortUrl,
  setupHints,
  dependencyFailure,
  PageTimeoutError,
  timedEvaluate,
  timedPageCall,
  classifyFault,
  isPageFault,
  isLocalFileUrl,
  loadPlaywright,
  parseSize,
  parseViewport,
  parseViewportList,
  openPage,
  isOfflineAbortError,
  splitOfflineErrors,
};
