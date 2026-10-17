'use strict';

/**
 * Slide / screen navigation for html-export targets. It drives the producer's OWN navigation,
 * so a capture shows what the audience sees; forcing every item visible is the last resort.
 *
 * Exports:
 *   DEFAULT_SLIDE_SELECTOR = 'section.slide[data-slide-id], [data-export-slide]'
 *   STRATEGIES = ['proto', 'keys', 'stacked']
 *   SlideSelectorError   { name, selector, usage: true, pageFault: false }
 *   createNavigator(page, selector = DEFAULT_SLIDE_SELECTOR, options = {})
 *     -> Promise<{ count, strategy, fallback, goTo(i) }>
 *     - options.stepTimeoutMs  how long one navigation step may take to show its item (default 1500)
 *     - options.timeoutMs      the bound on every single page call the navigator makes (evaluate,
 *                              the awaited __proto.goTo, a key press); default DEFAULT_TIMEOUT_MS.
 *                              A call that does not finish rejects with browser.cjs PageTimeoutError
 *                              (pageFault true), so a busy page or a goTo promise that never settles
 *                              fails that item instead of hanging; an error the page throws inside
 *                              goTo is a page fault too.
 *     The selector is checked once, by the first in-page call (detection): a selector the browser
 *     cannot parse rejects with SlideSelectorError (usage: true, pageFault: false), because the
 *     command is wrong, not the page. Targets map it to exit 2.
 *     - count     number of items matching `selector` (CSS, document order)
 *     - strategy  getter; the strategy in use now. 'proto' or 'keys' becomes 'stacked' when a
 *                 navigation step does not show the requested item (see `fallback`)
 *     - fallback  null, or { from: 'proto' | 'keys', atIndex, reason } after a switch to stacked
 *     - goTo(i)   shows item i and resolves to its viewport-relative bounding box
 *                 { x, y, width, height } (zero-size when the item is not rendered)
 *
 * Strategy is detected once, in this order:
 *   1. proto   window.__proto.goTo is a function -> goTo(i) calls it with item i's data-state value,
 *              then item i MUST become the only visible item within stepTimeoutMs, otherwise the
 *              navigator switches to stacked for that item and every later one.
 *   2. keys    more than one item and exactly one visible -> press Home once, then ArrowRight per
 *              step; after each press the visible item MUST change, otherwise switch to stacked.
 *              When no item is visible yet (for example an entry animation still at opacity 0),
 *              detection waits up to stepTimeoutMs for exactly one item to appear before it
 *              decides, so an animated single-visible deck is not mistaken for a stacked one.
 *   3. stacked inject CSS that makes every item a visible, viewport-sized block ([hidden],
 *              display:none and inactive-class rules are overridden with !important); goTo(i)
 *              scrolls item i into view.
 * All waits poll from Node, so a paused page clock cannot stall navigation.
 *
 *   navigationTimeouts(timeout) -> { timeoutMs, stepTimeoutMs }
 *     The one rule for deriving both from the --timeout flag: an explicit --timeout bounds every
 *     page call AND is the step window (so a slow transition can be given more time); without it
 *     calls get DEFAULT_TIMEOUT_MS and the step window stays DEFAULT_STEP_TIMEOUT_MS (1500 ms),
 *     so a deck that never navigates falls back to stacked quickly.
 */

const { DEFAULT_TIMEOUT_MS, timedEvaluate, timedPageCall } = require('./browser.cjs');
const { sleep } = require('./result.cjs');

const DEFAULT_SLIDE_SELECTOR = 'section.slide[data-slide-id], [data-export-slide]';
const STRATEGIES = Object.freeze(['proto', 'keys', 'stacked']);
const DEFAULT_STEP_TIMEOUT_MS = 1500;
const POLL_MS = 25;
const STACKED_STYLE_ID = 'html-export-stacked-slides';

/** A --slides selector the browser cannot parse: a usage error (exit 2), never a page fault. */
class SlideSelectorError extends Error {
  constructor(selector, reason) {
    super(`the slides selector "${selector}" is not a valid CSS selector (${reason}). Pass --slides=<css> with a valid selector, or --slides alone for the default.`);
    this.name = 'SlideSelectorError';
    this.selector = selector;
    this.usage = true;
    this.pageFault = false;
  }
}

function navigationTimeouts(timeout) {
  const explicit = Number.isFinite(timeout) && timeout > 0;
  return {
    timeoutMs: explicit ? timeout : DEFAULT_TIMEOUT_MS,
    stepTimeoutMs: explicit ? timeout : DEFAULT_STEP_TIMEOUT_MS,
  };
}

// Indices of the matched items a viewer can currently see (rendered, not transparent, in the viewport).
function visibleIndices(page, selector, timeoutMs) {
  return timedEvaluate(page, (css) => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return Array.from(document.querySelectorAll(css)).flatMap((element, index) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return [];
      if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= width || rect.top >= height) return [];
      const shown = typeof element.checkVisibility === 'function'
        ? element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
        : getComputedStyle(element).visibility !== 'hidden';
      return shown ? [index] : [];
    });
  }, selector, timeoutMs, 'slide visibility check');
}

function itemBox(page, selector, index, timeoutMs) {
  return timedEvaluate(page, ({ css, i }) => {
    const element = document.querySelectorAll(css)[i];
    if (!element) return { x: 0, y: 0, width: 0, height: 0 };
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, { css: selector, i: index }, timeoutMs, `slide ${index + 1} bounding box`);
}

// Poll until exactly one item is visible and it satisfies `accept`; null on timeout.
async function waitForSingleVisible(page, selector, accept, stepTimeoutMs, callTimeoutMs) {
  const deadline = Date.now() + stepTimeoutMs;
  for (;;) {
    const visible = await visibleIndices(page, selector, callTimeoutMs);
    if (visible.length === 1 && accept(visible[0])) return visible[0];
    if (Date.now() >= deadline) return null;
    await sleep(POLL_MS);
  }
}

async function injectStackedStyle(page, selector, timeoutMs) {
  await timedEvaluate(page, ({ css, styleId }) => {
    if (document.getElementById(styleId)) return;
    // Keep the producer's own display value (e.g. flex) when one item is already shown.
    const items = Array.from(document.querySelectorAll(css));
    const shown = items.map((element) => getComputedStyle(element).display).find((value) => value !== 'none');
    const display = shown || 'block';
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `:is(${css}) {
  display: ${display} !important;
  visibility: visible !important;
  opacity: 1 !important;
  position: relative !important;
  inset: auto !important;
  transform: none !important;
  transition: none !important;
  animation: none !important;
  box-sizing: border-box !important;
  width: 100vw !important;
  min-height: 100vh !important;
  margin: 0 !important;
}`;
    document.head.appendChild(style);
  }, { css: selector, styleId: STACKED_STYLE_ID }, timeoutMs, 'stacked-layout style injection');
}

async function createNavigator(page, selector = DEFAULT_SLIDE_SELECTOR, options = {}) {
  if (!page || typeof page.evaluate !== 'function') throw new Error('createNavigator requires a Playwright page');
  if (typeof selector !== 'string' || selector.trim() === '') throw new Error('selector must be a non-empty CSS selector');
  const stepTimeoutMs = options.stepTimeoutMs === undefined ? DEFAULT_STEP_TIMEOUT_MS : options.stepTimeoutMs;
  if (!Number.isFinite(stepTimeoutMs) || stepTimeoutMs <= 0) throw new Error('stepTimeoutMs must be a positive number');
  const timeoutMs = options.timeoutMs === undefined ? DEFAULT_TIMEOUT_MS : options.timeoutMs;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('timeoutMs must be a positive number');
  const visibleNow = () => visibleIndices(page, selector, timeoutMs);
  const waitVisible = (accept) => waitForSingleVisible(page, selector, accept, stepTimeoutMs, timeoutMs);
  const boxOf = (index) => itemBox(page, selector, index, timeoutMs);
  const press = (key) => timedPageCall(page, () => page.keyboard.press(key), timeoutMs, `${key} key press`);

  const detected = await timedEvaluate(page, (css) => {
    let matched;
    try {
      matched = document.querySelectorAll(css).length;
    } catch (error) {
      // An unparsable selector is the command's fault; anything else is the page's.
      if (error && error.name === 'SyntaxError') return { invalidSelector: String(error.message || error) };
      throw error;
    }
    return { count: matched, hasProto: Boolean(window.__proto && typeof window.__proto.goTo === 'function') };
  }, selector, timeoutMs, 'slide detection');
  if (detected.invalidSelector !== undefined) throw new SlideSelectorError(selector, detected.invalidSelector);
  const { count } = detected;

  let strategy = 'stacked';
  if (detected.hasProto) {
    strategy = 'proto';
  } else if (count > 1) {
    let visible = (await visibleNow()).length;
    // Nothing visible yet usually means an entry animation is still running: give it one step
    // to settle rather than sampling a single frame. A layout with several items on screen is
    // decided at once, so a stacked deck pays no wait.
    if (visible === 0 && (await waitVisible(() => true)) !== null) {
      visible = 1;
    }
    if (visible === 1) strategy = 'keys';
  }

  let fallback = null;
  let stackedReady = false;
  let homed = false;
  let current = -1;

  async function useStacked() {
    if (!stackedReady) {
      await injectStackedStyle(page, selector, timeoutMs);
      stackedReady = true;
    }
  }

  async function fallBackToStacked(atIndex, reason) {
    fallback = { from: strategy, atIndex, reason };
    strategy = 'stacked';
    await useStacked();
  }

  // One key press that must move the visible item; returns the new index or null.
  async function pressAndVerify(key, before, accept) {
    await press(key);
    return waitVisible((index) => index !== before && accept(index));
  }

  async function goToWithKeys(index) {
    if (!homed || index < current) {
      const before = (await visibleNow())[0];
      if (before === 0) {
        await press('Home');
        current = 0;
      } else {
        const moved = await pressAndVerify('Home', before, (i) => i === 0);
        if (moved === null) {
          await fallBackToStacked(index, 'Home did not show the first item');
          return false;
        }
        current = moved;
      }
      homed = true;
    }
    while (current < index) {
      const moved = await pressAndVerify('ArrowRight', current, (i) => i > current);
      if (moved === null) {
        await fallBackToStacked(index, `ArrowRight did not change the visible item after item ${current}`);
        return false;
      }
      current = moved;
    }
    if (current !== index) {
      await fallBackToStacked(index, `ArrowRight skipped past item ${index}`);
      return false;
    }
    return true;
  }

  async function goTo(index) {
    if (!Number.isInteger(index) || index < 0 || index >= count) {
      throw new RangeError(`slide index ${index} is outside 0..${count - 1}`);
    }

    if (strategy === 'proto') {
      // The page's own goTo may return a promise; it is awaited in the page, within timeoutMs.
      await timedEvaluate(page, async ({ css, i }) => {
        const element = document.querySelectorAll(css)[i];
        const id = element.getAttribute('data-state');
        await window.__proto.goTo(id === null ? i : id);
      }, { css: selector, i: index }, timeoutMs, `__proto.goTo for item ${index + 1}`);
      const shown = await waitVisible((i) => i === index);
      if (shown !== null) return boxOf(index);
      await fallBackToStacked(index, `__proto.goTo did not show item ${index + 1} as the only visible item`);
    }

    if (strategy === 'keys' && (await goToWithKeys(index))) {
      return boxOf(index);
    }

    await useStacked();
    await timedEvaluate(page, ({ css, i }) => {
      document.querySelectorAll(css)[i].scrollIntoView({ block: 'start', inline: 'start', behavior: 'instant' });
    }, { css: selector, i: index }, timeoutMs, `scroll to item ${index + 1}`);
    return boxOf(index);
  }

  return {
    count,
    get strategy() { return strategy; },
    get fallback() { return fallback; },
    goTo,
  };
}

module.exports = {
  DEFAULT_SLIDE_SELECTOR,
  DEFAULT_STEP_TIMEOUT_MS,
  STRATEGIES,
  SlideSelectorError,
  createNavigator,
  navigationTimeouts,
};
