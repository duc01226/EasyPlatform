'use strict';

/**
 * html-export target for --to=mp4 and --to=gif: deterministic, frame-by-frame animation recording.
 *
 * The canonical recorder contract (time rule, window.__ready / __seek / __duration / __recording,
 * authoring rules, frames.json) is references/animation-recording.md. Keep this file and that
 * document in step.
 *
 * Target contract (see scripts/export.cjs):
 *   flags       { fps, duration, audio, gif-width, keep-frames }
 *   validate    synchronous; throws for usage errors (exit 2)
 *   preflight   ffmpeg probe; returns an install hint or null (exit 3 before the Playwright check)
 *   run         records, encodes and returns an exit code. Every failure after validation is
 *               printed to stderr AND recorded in frames.json (status "failed", failure.stage,
 *               failure.message, failure.pageFault); it never hangs: every in-page call and each
 *               ffmpeg pass is bounded. A page fault (the page never loads or settles, a page call
 *               hangs, __seek or a __duration getter throws, the page breaks the recorder's setup
 *               or animation pinning) exits 4. A page timer or animation-frame callback that
 *               throws while the recorder advances the clock is a page error, like an uncaught
 *               exception: recording continues, and the run exits 4 with the files written (0
 *               with --allow-errors). A tool fault (ffmpeg, a file write, the browser) exits 1,
 *               or 4 when the page also reported errors that --allow-errors does not accept; both
 *               are reported. A failed run never writes the output path or <out>/frames and never
 *               deletes a file it did not write. --keep-frames reuses <out>/frames only when it
 *               holds nothing but frame-NNNNN.png files (else exit 2, untouched), and replaces
 *               them only once the recording succeeded: the output is moved into place first
 *               (failure stage "output"), then the frames (stage "frames"); a frames swap that
 *               fails puts the earlier frames and the earlier output (or none) back.
 *   work folder Encodes and kept frames are written to <out>/.video-work-* and reach <out> only as
 *               above. The folder is removed when run() ends; a removal that fails is a warning
 *               (stderr, and frames.json on success), never a change of the exit code. On
 *               Ctrl+C, Playwright closes the browser and exits 130 through process.exit, which
 *               skips run()'s cleanup, so a process 'exit' hook removes the folder as well (best
 *               effort). A hard kill can still leave it; it holds only that run's temporary files
 *               and is safe to delete.
 *
 * Also exported for tests and reuse (Playwright only, no ffmpeg needed):
 *   openRecordingPage({ file, viewport, scale, timeoutMs, offline, fps }) -> openPage session
 *     window.__recording is true before any page script runs. The page clock is installed and
 *     paused at CLOCK_ORIGIN_MS before navigation. While the page holds window.__ready === false, the clock
 *     advances in fixed frame steps, so a timer-driven ready signal still settles at the same page
 *     time on every render; a callback that throws meanwhile is added to session.errors (or, when
 *     the open fails, to error.pageErrors). After load, elements carrying data-export-hide are hidden.
 *   captureFrames({ page, fps, durationMs, timeoutMs, onFrame, pageErrors })
 *     -> { timeSource, clockStartMs, frames, identicalFrames }
 *     Applies the time rule for each frame, screenshots it and hashes the PNG (sha256). Each page
 *     call is bounded by timeoutMs; a failure throws FrameCaptureError (with capturedFrames). A
 *     timer or animation-frame callback that throws during a clock advance is appended to
 *     pageErrors (pass session.errors) as { type: 'pageerror', text } and capture continues.
 *   frameCount(durationMs, fps), frameTimeMs(index, fps), resolveFps(options), resolveAudioPath(value, cwd)
 *   advanceUntilReady(page, stepMs, timeoutMs, pageErrors, control), removeOnExit(dir) -> dispose()
 *
 * Playwright is loaded only inside functions (through browser.cjs), so this module loads without it.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  openPage,
  parseViewport,
  splitOfflineErrors,
  timedEvaluate,
  timedPageCall,
  isPageFault,
  classifyFault,
  PageTimeoutError,
  DEFAULT_TIMEOUT_MS,
} = require('./browser.cjs');
const { fileStem } = require('./paths.cjs');
const ffmpeg = require('./ffmpeg.cjs');
const { errorMessage, firstLine, errorsBlock, sleep } = require('./result.cjs');

const { EXIT } = require('./exit-codes.cjs');

const flags = Object.freeze({
  fps: 'int',
  duration: 'number',
  audio: 'path',
  'gif-width': 'int',
  'keep-frames': 'bool',
});

const DEFAULT_FPS = 30;
// A GIF has no inter-frame compression, so its size grows with every frame; 15 fps halves it.
const DEFAULT_GIF_FPS = 15;
const MIN_FPS = 1;
const MAX_FPS = 60;
const DEFAULT_VIDEO_VIEWPORT = '1920x1080';
const READY_POLL_MS = 20;
// Page time (Date.now()) at which the paused clock starts. An installed clock flows in real time until
// pauseAt() lands, and pauseAt() refuses a time in the past, so the pause point sits well ahead of any
// real delay between the two calls; the page still starts at the same time on every run.
const CLOCK_ORIGIN_MS = 10_000;
// Each ffmpeg pass is bounded by the larger of --timeout and this budget per recorded frame.
const ENCODE_MS_PER_FRAME = 250;
const TIME_SOURCE_SEEK = 'seek';
const TIME_SOURCE_CLOCK = 'clock+waapi';
// Preview-only UI (play buttons, scrubbers) opts out of recordings with this attribute.
const HIDE_ATTRIBUTE = 'data-export-hide';
const HIDE_CSS = `[${HIDE_ATTRIBUTE}]{visibility:hidden !important}`;
// Two or more characters before ':' (so a Windows drive letter such as C: is still a path), or a UNC prefix.
const PROTOCOL_SHAPED = /^(?:[a-z][a-z0-9+.-]+:|\\\\|\/\/)/i;

const STEP_LABELS = Object.freeze({
  seek: 'window.__seek(ms)',
  seekAdvance: 'the one-frame clock advance after window.__seek',
  clock: 'the clock advance',
  pin: 'pinning CSS and Web Animations',
  screenshot: 'the screenshot',
  setup: 'reading window.__seek and the page clock',
});
const TIMEOUT_HINTS = Object.freeze({
  seek: ' Page timers and animation frames are paused while __seek runs, so a returned promise must not'
    + ' wait on requestAnimationFrame or setTimeout: update the state (or schedule the paint) and return;'
    + ' the recorder advances the clock one frame after __seek returns. See references/animation-recording.md.',
  seekAdvance: ' A timer or animation-frame callback scheduled by __seek did not return.',
  clock: ' A page timer or animation-frame callback did not return.',
});

// Steps that run the page's own timer and animation-frame callbacks (page.clock.runFor).
const CLOCK_STEPS = new Set(['clock', 'seekAdvance']);
// Steps whose non-timeout failure is the page's doing: __seek is page code, and setup and pin run
// the recorder's code against globals and animations the page controls.
const PAGE_CODE_STEPS = new Set(['seek', 'setup', 'pin']);
// Bound for the check that the page still answers after a clock advance failed.
const ALIVE_CHECK_MS = 1000;

// The frame files --keep-frames writes; <out>/frames is replaced only when it holds nothing else.
const FRAME_FILE = /^frame-\d{5}\.png$/;

class FrameCaptureError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'FrameCaptureError';
    Object.assign(this, details);
  }
}

// Names the recorder step on a classified error from browser.cjs (pageFault is already set there).
function atStep(error, step) {
  if (error && typeof error === 'object' && typeof error.step !== 'string') error.step = step;
  return error;
}

function isVideoTarget(to) {
  return to === 'mp4' || to === 'gif';
}

function resolveFps(options) {
  if (options.fps) return options.fps;
  return options.to === 'gif' ? DEFAULT_GIF_FPS : DEFAULT_FPS;
}

function frameCount(durationMs, fps) {
  return Math.max(1, Math.round((durationMs / 1000) * fps));
}

// Whole milliseconds keep every clock advance an exact integer, so repeated renders line up.
function frameTimeMs(index, fps) {
  return Math.round((index * 1000) / fps);
}

function resolveAudioPath(value, cwd = process.cwd()) {
  if (typeof value !== 'string' || value === '') throw new Error('--audio requires a file path.');
  if (PROTOCOL_SHAPED.test(value)) {
    throw new Error(`--audio must be a local file path; "${value}" looks like a URL or network location. `
      + 'Download the file first; the exporter never fetches audio.');
  }
  const resolved = path.resolve(cwd, value);
  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch {
    throw new Error(`--audio file not found: ${resolved}`);
  }
  if (!stat.isFile()) throw new Error(`--audio must be a regular file: ${resolved}`);
  return resolved;
}

function validate(options) {
  const to = options.to;
  if (!isVideoTarget(to)) throw new Error(`the video target handles --to=mp4 or --to=gif, not --to=${to}.`);
  if (options.inputs.length !== 1) {
    throw new Error(`--to=${to} records exactly one HTML file; got ${options.inputs.length}.`);
  }
  for (const unsupported of ['slides', 'page', 'selfCheck']) {
    if (options[unsupported] !== undefined) {
      const name = unsupported === 'selfCheck' ? 'self-check' : unsupported;
      throw new Error(`--${name} is not supported by --to=${to}.`);
    }
  }
  if (options.fps !== undefined && (options.fps < MIN_FPS || options.fps > MAX_FPS)) {
    throw new Error(`--fps must be between ${MIN_FPS} and ${MAX_FPS}; got ${options.fps}.`);
  }
  // Without --duration the page must define window.__duration (milliseconds); run() checks that.
  if (options.duration !== undefined && !(options.duration > 0)) {
    throw new Error(`--duration must be greater than 0 seconds; got ${options.duration}.`);
  }
  if (options.gifWidth !== undefined) {
    if (to !== 'gif') throw new Error('--gif-width applies only to --to=gif.');
    if (options.gifWidth <= 0) throw new Error(`--gif-width must be a positive whole number; got ${options.gifWidth}.`);
  }
  if (options.audio !== undefined) {
    if (to !== 'mp4') throw new Error('--audio applies only to --to=mp4.');
    resolveAudioPath(options.audio, options.cwd);
  }
  if (options.viewport !== undefined) {
    if (String(options.viewport).includes(',')) throw new Error(`--to=${to} records one viewport; got ${options.viewport}.`);
    parseViewport(options.viewport);
  }
  const input = path.resolve(options.cwd || process.cwd(), options.input);
  if (!fs.existsSync(input) || !fs.statSync(input).isFile()) throw new Error(`input file not found: ${input}`);
}

function preflight(options = {}) {
  const probe = ffmpeg.probeFfmpeg({ env: options.env || process.env, platform: process.platform });
  return probe.ok ? null : probe.message;
}

function isTimeoutError(error) {
  return error instanceof PageTimeoutError || Boolean(error && error.name === 'TimeoutError');
}

// When a page timer or animation-frame callback throws, the Playwright clock still runs every due
// callback and advances, then rethrows the first exception from runFor; no pageerror event fires.
// Returns that exception as a page-error entry ({ type, text }), or null when the rejection is not
// the page's (a timeout, or a page that closed or stopped answering).
async function clockCallbackError(page, error, timeoutMs, when) {
  if (isTimeoutError(error) || page.isClosed()) return null;
  try {
    await timedEvaluate(page, () => true, undefined, Math.min(timeoutMs, ALIVE_CHECK_MS),
      'a responsiveness check after a clock advance failed');
  } catch {
    return null;
  }
  const thrown = firstLine(error).replace(/^clock\.runFor:\s*/, '');
  return { type: 'pageerror', text: `${thrown} (thrown by a timer or animation-frame callback ${when})` };
}

// Advances the paused clock in fixed steps while the loaded page reports window.__ready === false.
// Steps are taken only after load and document.fonts.ready, so the step count depends on page time,
// not on how fast the machine loaded the file. The timeoutMs budget starts when the pump first sees
// the loaded document, as openPage's own window.__ready wait starts after load, so a slow load
// cannot use it up and turn a healthy page into a false page fault. Until then the pump only polls,
// and stops when the page closes or `control.stopped` is set (openRecordingPage sets it once the
// open ends, failed or not). Each page call is bounded (browser.cjs) by the time left before the deadline. A timer
// or animation-frame callback that throws is appended to `pageErrors` and pumping continues (the
// clock already advanced). Resolves null, or the error that stopped the pump: the PageTimeoutError
// of a page call that hung, or a clock advance that failed for a reason other than the page
// (pageFault false).
async function advanceUntilReady(page, stepMs, timeoutMs, pageErrors, control = {}) {
  let deadline = null;
  const remaining = () => (deadline === null ? timeoutMs : Math.max(1, deadline - Date.now()));
  while (!control.stopped && !page.isClosed() && (deadline === null || Date.now() < deadline)) {
    let state;
    try {
      state = await timedEvaluate(page, async () => {
        if (location.protocol !== 'file:' || document.readyState !== 'complete') return 'loading';
        if (window.__ready !== false) return 'settled';
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        return window.__ready === false ? 'waiting' : 'settled';
      }, undefined, remaining(), 'the window.__ready check while recording');
    } catch (error) {
      if (error instanceof PageTimeoutError) return atStep(error, 'ready');
      state = 'loading'; // The execution context is replaced while about:blank navigates to the file.
    }
    if (state !== 'loading' && deadline === null) deadline = Date.now() + timeoutMs;
    if (state === 'settled') return null;
    if (state === 'waiting') {
      try {
        await timedPageCall(page, () => page.clock.runFor(stepMs), remaining(),
          'a frame-step clock advance while window.__ready is false');
      } catch (error) {
        if (error instanceof PageTimeoutError) return atStep(error, 'ready');
        const entry = await clockCallbackError(page, error, remaining(), 'while window.__ready was false');
        if (!entry) return atStep(classifyFault(error, false), 'ready');
        pageErrors.push(entry);
      }
    } else {
      await sleep(READY_POLL_MS);
    }
  }
  return null;
}

async function openRecordingPage(options = {}) {
  const { fps = DEFAULT_FPS, timeoutMs = DEFAULT_TIMEOUT_MS, ...pageOptions } = options;
  let readyPump = null;
  const pumpControl = { stopped: false };
  // Timer and animation-frame callbacks that threw while the ready pump advanced the clock.
  const pumpErrors = [];
  const beforeNavigate = async (page) => {
    // openPage emulates reduced motion for stills; a recording needs the page's full motion.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // Lets the page tell a recording from live preview before any of its scripts run.
    await page.addInitScript(() => {
      Object.defineProperty(window, '__recording', { value: true, writable: false, configurable: false });
    });
    // install() alone lets time flow; pauseAt() freezes page time at CLOCK_ORIGIN_MS before any script runs.
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(CLOCK_ORIGIN_MS);
    readyPump = advanceUntilReady(page, frameTimeMs(1, fps), timeoutMs, pumpErrors, pumpControl)
      .catch((error) => atStep(error instanceof Error ? error : new Error(String(error)), 'ready'));
  };
  let session;
  try {
    // openPage sets error.pageFault: false for a launch/setup failure, true once navigation began,
    // and error.pageErrors: what the page raised before the failure (browser.cjs).
    session = await openPage({ ...pageOptions, timeoutMs, beforeNavigate });
  } catch (error) {
    pumpControl.stopped = true;
    if (readyPump) await readyPump;
    if (/window\.__ready/.test(error.message)) {
      error.message += '. While recording, page time is paused and only moves in frame steps while '
        + 'window.__ready is false; make sure the page sets it to true once its own assets are ready. '
        + 'See references/animation-recording.md.';
    }
    throw withPageErrors(atStep(error, 'load'), pumpErrors);
  }
  try {
    // openPage resolves only once window.__ready is true or absent (browser.cjs waitForPageReady), so
    // the pump has nothing left to do. Stop it: a page that left the input document while loading
    // would otherwise keep it polling forever. A call already in flight stays bounded by timeoutMs.
    pumpControl.stopped = true;
    const pumpFault = readyPump ? await readyPump : null;
    session.errors.push(...pumpErrors);
    if (pumpFault) throw pumpFault;
    // A stylesheet rule (not a one-off query) so elements added later are hidden as well.
    await timedEvaluate(session.page, (css) => {
      const style = document.createElement('style');
      style.setAttribute('data-html-export', 'recording');
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    }, HIDE_CSS, timeoutMs, 'hiding the data-export-hide elements').catch((error) => { throw atStep(error, 'hide'); });
  } catch (error) {
    const pageErrors = pageErrorsOf(session);
    await session.close();
    throw withPageErrors(error, pageErrors);
  }
  return session;
}

// Adds `entries` to error.pageErrors (kept when openPage already set it), so a failed open still
// names what the page raised.
function withPageErrors(error, entries) {
  if (!error || typeof error !== 'object' || entries.length === 0) return error;
  const known = Array.isArray(error.pageErrors) ? error.pageErrors : [];
  error.pageErrors = [...known, ...entries.filter((entry) => !known.includes(entry))];
  return error;
}

// The page errors a failed open carried (error.pageErrors), as { type, text, location? } entries.
function pageErrorsFrom(error) {
  const list = error && typeof error === 'object' && Array.isArray(error.pageErrors) ? error.pageErrors : [];
  return list.filter((item) => item !== null && item !== undefined)
    .map((item) => (typeof item === 'object' ? item : { type: 'pageerror', text: String(item) }));
}

// Runs in the page: pause every CSS/Web Animation and pin it to recorder time. An animation first
// seen at recorder time b is pinned to currentTime = t - b, so late-starting animations begin at 0.
function seekAnimationsInPage(timeMs) {
  const key = '__htmlExportAnimationBirths';
  if (!window[key]) Object.defineProperty(window, key, { value: new WeakMap() });
  const births = window[key];
  for (const animation of document.getAnimations()) {
    if (!births.has(animation)) births.set(animation, timeMs);
    animation.pause();
    animation.currentTime = timeMs - births.get(animation);
  }
}

// One bounded page call for one frame. A step that does not settle within timeoutMs, or a __seek,
// setup or pin call that throws, is the page's fault (exit 4). A clock step whose timer or
// animation-frame callback throws is not a failure: the clock already advanced, so the exception
// goes to onPageError and the frame is captured (the page-error rule then applies: exit 4 with the
// files written, 0 with --allow-errors). Anything else is a tool failure (exit 1).
async function frameStep(page, frame, step, timeoutMs, work, onPageError) {
  const fail = (isTimeout, error) => {
    const what = isTimeout
      ? `did not finish within ${timeoutMs} ms.${TIMEOUT_HINTS[step] || ''}`
      : `failed: ${firstLine(error)}`;
    return new FrameCaptureError(`frame ${frame.index} (${frame.timeMs} ms): ${STEP_LABELS[step]} ${what}`, {
      step,
      frameIndex: frame.index,
      timeMs: frame.timeMs,
      timedOut: isTimeout,
      pageFault: isTimeout || (PAGE_CODE_STEPS.has(step) && !page.isClosed()),
    });
  };
  try {
    return await timedPageCall(page, work, timeoutMs, `frame ${frame.index}: ${STEP_LABELS[step]}`);
  } catch (error) {
    // The screenshot carries Playwright's own timeout, which rejects with its TimeoutError.
    const isTimeout = isTimeoutError(error);
    if (!isTimeout && CLOCK_STEPS.has(step) && onPageError) {
      const entry = await clockCallbackError(page, error, timeoutMs,
        `during ${STEP_LABELS[step]} to frame ${frame.index} (${frame.timeMs} ms)`);
      if (entry) {
        onPageError(entry);
        return undefined;
      }
    }
    throw fail(isTimeout, error);
  }
}

async function captureFrames(options = {}) {
  const { page, fps, durationMs, onFrame, timeoutMs = DEFAULT_TIMEOUT_MS, pageErrors = [] } = options;
  if (!page) throw new Error('captureFrames requires a page');
  if (!Array.isArray(pageErrors)) throw new Error('pageErrors must be an array');
  const onPageError = (entry) => pageErrors.push(entry);
  if (!Number.isInteger(fps) || fps < MIN_FPS || fps > MAX_FPS) throw new Error(`fps must be ${MIN_FPS}-${MAX_FPS}`);
  if (!Number.isFinite(durationMs) || durationMs <= 0) throw new Error('durationMs must be a positive number');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('timeoutMs must be a positive number');

  const hooks = await frameStep(page, { index: 0, timeMs: 0 }, 'setup', timeoutMs,
    () => page.evaluate(() => ({ useSeek: typeof window.__seek === 'function', now: Date.now() })));
  const useSeek = hooks.useSeek;
  const timeSource = useSeek ? TIME_SOURCE_SEEK : TIME_SOURCE_CLOCK;
  const clockStartMs = hooks.now;
  const total = frameCount(durationMs, fps);
  // One frame of page time; at least 16 ms for every fps up to 60, which always reaches the next
  // requestAnimationFrame callback of the Playwright clock.
  const stepMs = frameTimeMs(1, fps);
  const frames = [];
  let advancedTo = 0;

  try {
    for (let index = 0; index < total; index += 1) {
      const timeMs = frameTimeMs(index, fps);
      const at = { index, timeMs };
      if (useSeek) {
        // __seek renders the state at timeMs (a returned promise is awaited); the one-frame advance
        // then runs the timers and animation-frame callbacks it scheduled, such as a deferred paint.
        await frameStep(page, at, 'seek', timeoutMs, () => page.evaluate((ms) => window.__seek(ms), timeMs));
        await frameStep(page, at, 'seekAdvance', timeoutMs, () => page.clock.runFor(stepMs), onPageError);
      } else {
        if (timeMs > advancedTo) {
          const delta = timeMs - advancedTo;
          await frameStep(page, at, 'clock', timeoutMs, () => page.clock.runFor(delta), onPageError);
        }
        advancedTo = timeMs;
        await frameStep(page, at, 'pin', timeoutMs, () => page.evaluate(seekAnimationsInPage, timeMs));
      }
      const png = await frameStep(page, at, 'screenshot', timeoutMs,
        () => page.screenshot({ type: 'png', timeout: timeoutMs }));
      const frame = { index, timeMs, sha256: crypto.createHash('sha256').update(png).digest('hex') };
      frames.push(frame);
      if (onFrame) await onFrame(png, frame);
    }
  } catch (error) {
    if (error && typeof error === 'object') Object.assign(error, { capturedFrames: frames, timeSource, clockStartMs });
    throw error;
  }

  const identicalFrames = frames.length > 1 && frames.every((frame) => frame.sha256 === frames[0].sha256);
  return { timeSource, clockStartMs, frames, identicalFrames };
}

// window.__duration is page code (it may be a getter), so a read that throws or hangs is a page fault.
async function resolveDurationMs(page, durationSeconds, timeoutMs) {
  if (durationSeconds !== undefined) return durationSeconds * 1000;
  let pageDuration;
  try {
    pageDuration = await timedEvaluate(page, () => window.__duration, undefined, timeoutMs, 'reading window.__duration');
  } catch (error) {
    throw atStep(error, 'duration'); // timedEvaluate marks a throwing or hanging getter as a page fault
  }
  return Number.isFinite(pageDuration) && pageDuration > 0 ? pageDuration : null;
}

// --keep-frames reuses <out>/frames only when it is a real directory holding nothing but this
// recorder's own frame files, so an unrelated frames/ directory under --out is never emptied.
// Returns null when the directory is absent or reusable, else the reason it is not.
function framesDirProblem(framesDir) {
  let stat;
  try {
    stat = fs.lstatSync(framesDir);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  if (!stat.isDirectory()) return 'exists but is not a directory';
  const foreign = fs.readdirSync(framesDir, { withFileTypes: true })
    .filter((entry) => !(entry.isFile() && FRAME_FILE.test(entry.name)))
    .map((entry) => entry.name);
  if (foreign.length === 0) return null;
  const listed = foreign.slice(0, 3).join(', ') + (foreign.length > 3 ? `, and ${foreign.length - 3} more` : '');
  return `holds entries the recorder did not write (${listed})`;
}

// Moves `from` back to `to` while undoing a failed step. When even that fails, the original error
// says where the only copy now is, and asks the caller to keep the work folder (keepWorkDir).
function restoreOrKeep(from, to, error) {
  try {
    fs.renameSync(from, to);
  } catch (restoreError) {
    if (error && typeof error === 'object') {
      error.keepWorkDir = true;
      error.message = `${errorMessage(error)}; ${to} could not be put back (${firstLine(restoreError)}), `
        + `so the earlier copy is kept at ${from}`;
    }
  }
}

// An earlier output the rename would replace; a directory is never replaced (the rename fails).
function isReplaceableFile(file) {
  try {
    return !fs.lstatSync(file).isDirectory();
  } catch {
    return false;
  }
}

// Moves an earlier run's frames/ aside (into the work folder, removed with it), then this run's in.
// A failure puts the earlier frames back.
function swapFramesDir(workFrames, framesDir, aside) {
  const hadFrames = fs.existsSync(framesDir);
  if (hadFrames) fs.renameSync(framesDir, aside);
  try {
    fs.renameSync(workFrames, framesDir);
  } catch (error) {
    if (hadFrames) restoreOrKeep(aside, framesDir, error);
    throw error;
  }
}

// Called only once a recording succeeded: moves it from the work folder into <out>. The output goes
// first, so <out>/frames is never touched unless the video is in place; then, with --keep-frames,
// the frames (a frames/ that changed since the start check is refused untouched). A frames swap that
// fails puts the output back as it was: with --keep-frames an earlier output is set aside first so it
// can be restored, else this run's is removed. progress.stage names the step for the failure report.
function commitRecording({ encoded, output, workFrames, framesDir, workDir, progress }) {
  let previousOutput = null;
  if (workFrames) {
    progress.stage = 'frames';
    const problem = framesDirProblem(framesDir);
    if (problem) throw new Error(`${framesDir} ${problem}; it was left untouched`);
    if (isReplaceableFile(output)) previousOutput = path.join(workDir, 'previous-output');
  }
  progress.stage = 'output';
  if (previousOutput) fs.renameSync(output, previousOutput);
  try {
    fs.renameSync(encoded, output);
  } catch (error) {
    if (previousOutput) restoreOrKeep(previousOutput, output, error);
    throw error;
  }
  if (!workFrames) return;
  progress.stage = 'frames';
  try {
    swapFramesDir(workFrames, framesDir, path.join(workDir, 'previous-frames'));
  } catch (error) {
    if (previousOutput) {
      restoreOrKeep(previousOutput, output, error);
    } else {
      try {
        fs.rmSync(output, { force: true });
      } catch (removeError) {
        error.message = `${errorMessage(error)}; this run's ${output} could not be removed (${firstLine(removeError)})`;
      }
    }
    throw error;
  }
}

const WORK_DIR_REMOVAL = Object.freeze({ recursive: true, force: true, maxRetries: 3, retryDelay: 100 });

// Removes the work folder when run() ends. A folder that cannot be removed (on Windows, a scanner or
// indexer may still hold a file) is a warning: the output and frames.json stay the run's result.
// Returns the warning, or null.
function removeWorkDir(workDir) {
  try {
    fs.rmSync(workDir, WORK_DIR_REMOVAL);
    return null;
  } catch (error) {
    const warning = `could not remove the work folder ${workDir} (${firstLine(error)}); `
      + 'it holds only this run\'s temporary files and can be deleted.';
    console.error(`Warning: ${warning}`);
    return warning;
  }
}

// Best effort for an interrupted run: Playwright answers Ctrl+C by closing its browsers and calling
// process.exit(130), which skips run()'s `finally` but still emits 'exit' (listeners must be
// synchronous). Returns the function that removes the hook again.
function removeOnExit(dir) {
  // Named so a test can tell this hook from the exit handlers Playwright registers.
  const onExit = function removeVideoWorkDir() {
    try { fs.rmSync(dir, WORK_DIR_REMOVAL); } catch {}
  };
  process.on('exit', onExit);
  return () => process.removeListener('exit', onExit);
}

function describeError(item) {
  const where = item.location && item.location.url ? ` (${item.location.url}:${item.location.lineNumber})` : '';
  return `${item.type || 'pageerror'}: ${item.text}${where}`;
}

async function encodeGif(mp4Path, workDir, gifPath, width, fps, timeoutMs, env = process.env) {
  const palette = path.join(workDir, 'palette.png');
  for (const args of ffmpeg.buildGifArgs({ input: mp4Path, palette, output: gifPath, width, fps })) {
    await ffmpeg.runFfmpeg(args, { timeoutMs, env });
  }
}

function probedDuration(file, env = process.env) {
  try {
    return ffmpeg.probeDuration(file, { env });
  } catch (error) {
    console.error(`Note: could not verify the output duration with ffprobe: ${error.message}`);
    return null;
  }
}

function writeManifest(file, manifest) {
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function warn(manifest, message) {
  manifest.warnings.push(message);
  console.error(`Warning: ${message}`);
}

// Offline aborts are a consequence of --offline, not page errors (browser.cjs splitOfflineErrors).
function pageErrorsOf(session) {
  return splitOfflineErrors(session.errors, session.blocked).pageErrors;
}

// A failed run exits 4 (fix the page) when the page caused the failure or reported errors that
// --allow-errors does not accept, as png and pdf do; otherwise 1 (ffmpeg, file writes, the browser).
// browser.cjs isPageFault is the one classification rule for every target.
function failureExitCode(error, pageErrors, allowErrors) {
  return isPageFault(error) || errorsBlock(pageErrors, allowErrors) ? EXIT.PAGE_ERROR : EXIT.ERROR;
}

function newManifest(input, to, fps) {
  return {
    input: path.basename(input),
    target: to,
    status: null,
    exitCode: null,
    output: null,
    keptOutput: null,
    fps,
    durationMs: null,
    frameCount: 0,
    timeSource: null,
    clockStartMs: null,
    probedDurationSeconds: null,
    noMotion: false,
    warnings: [],
    pageErrors: [],
    failure: null,
    frames: [],
  };
}

function recordCapture(manifest, capture) {
  Object.assign(manifest, {
    frameCount: capture.frames.length,
    timeSource: capture.timeSource,
    clockStartMs: capture.clockStartMs,
    frames: capture.frames,
  });
}

// Captures every frame into the encoder (and, with --keep-frames, into the work folder), finishes
// the MP4 and, for --to=gif, the palette passes. Returns the encoded file inside the work folder;
// nothing reaches <out> here except the kept MP4 of a failed GIF pass.
async function recordAndEncode({ session, manifest, recording, progress }) {
  const { to, fps, timeoutMs, env, audio, stem, workDir, workFrames, outputDir, gifWidth } = recording;
  const workMp4 = path.join(workDir, `${stem}.mp4`);
  if (workFrames) fs.mkdirSync(workFrames);
  const encodeTimeoutMs = Math.max(timeoutMs, frameCount(manifest.durationMs, fps) * ENCODE_MS_PER_FRAME);

  progress.stage = 'capture';
  const encoder = ffmpeg.startEncoder({
    args: ffmpeg.buildMp4Args({ fps, output: workMp4, audio }),
    timeoutMs: encodeTimeoutMs,
    env,
  });
  let capture;
  try {
    capture = await captureFrames({
      page: session.page,
      fps,
      durationMs: manifest.durationMs,
      timeoutMs,
      pageErrors: session.errors,
      onFrame: async (png, frame) => {
        if (workFrames) {
          fs.writeFileSync(path.join(workFrames, `frame-${String(frame.index).padStart(5, '0')}.png`), png);
        }
        await encoder.write(png);
      },
    });
  } catch (error) {
    await encoder.abort();
    if (error && error.capturedFrames) {
      recordCapture(manifest, { timeSource: error.timeSource, clockStartMs: error.clockStartMs, frames: error.capturedFrames });
    }
    throw error;
  }
  recordCapture(manifest, capture);
  manifest.noMotion = capture.identicalFrames;

  progress.stage = 'encode';
  await encoder.finish();
  if (to !== 'gif') return workMp4;
  progress.stage = 'gif';
  const gif = path.join(workDir, `${stem}.gif`);
  try {
    await encodeGif(workMp4, workDir, gif, gifWidth || ffmpeg.DEFAULT_GIF_WIDTH, fps, encodeTimeoutMs, env);
  } catch (error) {
    // The recording itself succeeded; keep the MP4 so the frames are not lost with the GIF, but
    // never over a file this run did not write.
    const kept = path.join(outputDir, `${stem}.mp4`);
    if (fs.existsSync(workMp4)) {
      if (fs.existsSync(kept)) {
        console.error(`The recorded MP4 was not kept: ${kept} already exists and was left untouched.`);
      } else {
        fs.renameSync(workMp4, kept);
        manifest.keptOutput = path.basename(kept);
      }
    }
    throw error;
  }
  return gif;
}

// A failed run: nothing of this run reached the output path or frames/ (commitRecording), and a
// file already there (an earlier run's) is left untouched; frames.json (status "failed", output
// null) says this run produced nothing. Page errors are reported next to the failure and decide the
// exit code as well. Returns the exit code.
function reportFailedRun({ error, stage, pageErrors, manifest, manifestPath, outputDir, allowErrors }) {
  const exitCode = failureExitCode(error, pageErrors, allowErrors);
  const details = error && typeof error === 'object' ? error : {};
  Object.assign(manifest, {
    status: 'failed',
    exitCode,
    failure: {
      stage,
      message: firstLine(error),
      pageFault: isPageFault(error),
      ...(typeof details.step === 'string' ? { step: details.step } : {}),
      ...(typeof details.timedOut === 'boolean' ? { timedOut: details.timedOut } : {}),
      ...(error instanceof FrameCaptureError ? { frameIndex: error.frameIndex, timeMs: error.timeMs } : {}),
    },
  });
  manifest.pageErrors = pageErrors.map(describeError);
  writeManifest(manifestPath, manifest);
  console.error(`Recording failed (${stage}): ${errorMessage(error)}`);
  if (pageErrors.length > 0) {
    console.error(`The page also reported ${pageErrors.length} error(s)`
      + `${allowErrors === true ? ' (allowed by --allow-errors)' : ''}:`);
    for (const line of manifest.pageErrors) console.error(`  ${line}`);
  }
  if (manifest.keptOutput) console.error(`Kept the recorded MP4: ${path.join(outputDir, manifest.keptOutput)}`);
  console.error(`Wrote ${manifestPath} (status failed, exit ${exitCode})`);
  return exitCode;
}

// A recording that reached <out>: checks the encoded duration, warns about a still recording,
// applies the page-error rule and writes frames.json. Returns the exit code.
function finishRecording({ manifest, manifestPath, output, framesDir, pageErrors, recording, allowErrors }) {
  const { fps, env, audio, workFrames } = recording;
  manifest.probedDurationSeconds = probedDuration(output, env);
  const oneFrame = 1 / fps;
  const probed = manifest.probedDurationSeconds;
  if (probed !== null && Math.abs(probed - manifest.durationMs / 1000) > oneFrame + 1e-6) {
    warn(manifest, `${path.basename(output)} lasts ${probed.toFixed(3)} s; expected `
      + `${(manifest.durationMs / 1000).toFixed(3)} s (within one frame).`
      + `${audio ? ' Audio shorter than the video trims it (-shortest).' : ''}`);
  }
  if (manifest.noMotion) {
    warn(manifest, `all ${manifest.frameCount} frames are identical, so nothing moved. Check for a`
      + ' reduced-motion rule, or an animation driven by a time source the recorder does not control'
      + ' (see references/animation-recording.md).');
  }
  manifest.pageErrors = pageErrors.map(describeError);
  const blockOnErrors = errorsBlock(pageErrors, allowErrors);
  manifest.exitCode = blockOnErrors ? EXIT.PAGE_ERROR : EXIT.OK;
  manifest.status = blockOnErrors ? 'page-errors' : 'ok';
  writeManifest(manifestPath, manifest);

  console.log(`Wrote ${output}`);
  console.log(`Wrote ${manifestPath} (${manifest.frameCount} frames, time source ${manifest.timeSource})`);
  if (workFrames) console.log(`Kept frames in ${framesDir}`);
  if (blockOnErrors) {
    console.error(`The page reported ${pageErrors.length} error(s) while recording; pass --allow-errors to accept them:`);
    for (const item of pageErrors) console.error(`  ${describeError(item)}`);
  }
  return manifest.exitCode;
}

async function run(options) {
  const to = options.to;
  const fps = resolveFps(options);
  const timeoutMs = options.timeout || DEFAULT_TIMEOUT_MS;
  const input = path.resolve(options.cwd || process.cwd(), options.input);
  const audio = options.audio ? resolveAudioPath(options.audio, options.cwd) : null;
  const outputDir = options.outputDir;
  const stem = fileStem(input, 'animation');
  const output = path.join(outputDir, `${stem}.${to}`);
  const manifestPath = path.join(outputDir, 'frames.json');
  const framesDir = path.join(outputDir, 'frames');
  const framesProblem = options.keepFrames ? framesDirProblem(framesDir) : null;
  if (framesProblem) {
    console.error(`Usage error: --keep-frames writes frame-NNNNN.png files into ${framesDir}, but it ${framesProblem}. `
      + 'Nothing was changed; pass a different --out, or move those files first.');
    return EXIT.USAGE;
  }
  fs.mkdirSync(outputDir, { recursive: true });
  // Every encode, and the frames --keep-frames captures, land in workDir and reach <out> only once
  // the recording succeeded (commitRecording).
  const workDir = fs.mkdtempSync(path.join(outputDir, '.video-work-'));
  const cancelExitRemoval = removeOnExit(workDir);
  const recording = {
    to,
    fps,
    timeoutMs,
    env: options.env || process.env,
    audio,
    stem,
    workDir,
    workFrames: options.keepFrames ? path.join(workDir, 'frames') : null,
    outputDir,
    gifWidth: options.gifWidth,
  };
  const manifest = newManifest(input, to, fps);
  const progress = { stage: 'open' };
  let session;
  let pageErrors = [];
  let keepWorkDir = false;
  let removalWarning = null;
  try {
    session = await openRecordingPage({
      file: input,
      viewport: options.viewport || DEFAULT_VIDEO_VIEWPORT,
      scale: options.scale || 1,
      timeoutMs,
      offline: options.offline === true,
      fps,
    });
    progress.stage = 'duration';
    manifest.durationMs = await resolveDurationMs(session.page, options.duration, timeoutMs);
    if (manifest.durationMs === null) {
      console.error('Usage error: pass --duration=<seconds>, or define window.__duration (milliseconds) in the page.');
      return EXIT.USAGE;
    }
    const encoded = await recordAndEncode({ session, manifest, recording, progress });
    commitRecording({ encoded, output, workFrames: recording.workFrames, framesDir, workDir, progress });
    manifest.output = path.basename(output);
  } catch (error) {
    keepWorkDir = Boolean(error && error.keepWorkDir);
    return reportFailedRun({
      error,
      stage: progress.stage,
      pageErrors: session ? pageErrorsOf(session) : pageErrorsFrom(error),
      manifest,
      manifestPath,
      outputDir,
      allowErrors: options.allowErrors,
    });
  } finally {
    if (session) {
      pageErrors = pageErrorsOf(session);
      try { await session.close(); } catch {}
    }
    // A cleanup problem never replaces the run's result (it is a warning); a work folder that holds
    // the only copy of an earlier file (a rollback that failed) is kept.
    if (!keepWorkDir) removalWarning = removeWorkDir(workDir);
    cancelExitRemoval();
  }
  if (removalWarning) manifest.warnings.push(removalWarning);
  return finishRecording({
    manifest, manifestPath, output, framesDir, pageErrors, recording, allowErrors: options.allowErrors,
  });
}

module.exports = {
  flags,
  validate,
  preflight,
  run,
  DEFAULT_FPS,
  DEFAULT_GIF_FPS,
  CLOCK_ORIGIN_MS,
  HIDE_ATTRIBUTE,
  TIME_SOURCE_SEEK,
  TIME_SOURCE_CLOCK,
  FrameCaptureError,
  frameCount,
  frameTimeMs,
  resolveFps,
  resolveAudioPath,
  openRecordingPage,
  captureFrames,
  advanceUntilReady,
  removeOnExit,
};
