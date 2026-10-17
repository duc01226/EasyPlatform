'use strict';

const fs = require('node:fs');
const net = require('node:net');
const dgram = require('node:dgram');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const {
  OFFLINE_LAUNCH_ARGS,
  PageTimeoutError,
  openPage,
  isLocalFileUrl,
  isPageFault,
  parseSize,
  parseViewport,
  parseViewportList,
  splitOfflineErrors,
  timedEvaluate,
} = require('../scripts/lib/browser.cjs');
const {
  createNavigator,
  navigationTimeouts,
  DEFAULT_SLIDE_SELECTOR,
  DEFAULT_STEP_TIMEOUT_MS,
} = require('../scripts/lib/slides.cjs');
const { sleep } = require('../scripts/lib/result.cjs');
const {
  PLAYWRIGHT_ROOT,
  makeTestEnv,
  resolveBrowsersPath,
  skipWithoutBrowser,
  withBrowserEnv: withIsolatedBrowser,
} = require('./test-env.cjs');

const REMOTE_IMAGE_URL = 'https://example.invalid/html-export-offline-probe.png';

function writeFixture(root, name, html) {
  const file = path.join(root, name);
  fs.writeFileSync(file, html, 'utf8');
  return file;
}

// Runs one browser case in its own isolated environment; skips only this case without Chromium.
function withBrowserEnv(t, run) {
  return withIsolatedBrowser(t, run, { prefix: 'html-export-browser-' });
}

async function withSession(options, run) {
  const session = await openPage(options);
  try {
    return await run(session);
  } finally {
    await session.close();
  }
}

// Polls `check` every 25 ms until it returns true, and fails naming `label` after timeoutMs. For
// the Node-side session arrays (errors, blocked), which fill from browser events that give the
// page no signal to wait on; a fixed sleep there fails falsely under load.
async function waitUntil(check, label, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() >= deadline) assert.fail(`timed out after ${timeoutMs} ms waiting for ${label}`);
    await sleep(25);
  }
}

function assertNonZeroBox(box, label) {
  assert.ok(box && box.width > 0 && box.height > 0, `${label} must have a non-zero box, got ${JSON.stringify(box)}`);
}

const CLOCK_PROBE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Clock probe</title>
<script>window.__startedAt = Date.now();</script>
</head><body><p>Clock probe</p></body></html>`;

const ERROR_AND_REMOTE_IMAGE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Errors</title></head>
<body>
<img id="remote" alt="remote" width="10" height="10" src="${REMOTE_IMAGE_URL}">
<script>console.error('fixture console failure');</script>
<script>throw new Error('fixture script failure');</script>
</body></html>`;

const READY_FLAG_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Ready flag</title>
<script>window.__ready = false; setTimeout(function () { window.__ready = true; }, 150);</script>
</head><body><p>Ready flag</p></body></html>`;

const PROTO_APP_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Prototype</title>
<style>body{margin:0} [data-state]{display:none;height:100vh} [data-state].is-current{display:block}</style>
</head><body>
<section data-state="inbox" class="is-current"><h1>Inbox screen</h1></section>
<section data-state="compose"><h1>Compose screen</h1></section>
<section data-state="sent"><h1>Sent screen</h1></section>
<script>
window.__visited = [];
window.__proto = {
  goTo: function (id) {
    window.__visited.push(id);
    document.querySelectorAll('[data-state]').forEach(function (screen) {
      screen.classList.toggle('is-current', screen.getAttribute('data-state') === id);
    });
  }
};
</script>
</body></html>`;

function keyDeckHtml(startIndex) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Key deck</title>
<style>
body{margin:0}
.deck__slide{display:none;height:100vh;align-items:center;justify-content:center}
.deck__slide--active{display:flex}
</style>
</head><body>
<section class="deck__slide"><h1>First slide</h1></section>
<section class="deck__slide"><h1>Second slide</h1></section>
<section class="deck__slide"><h1>Third slide</h1></section>
<script>
var slides = Array.prototype.slice.call(document.querySelectorAll('.deck__slide'));
var index = 0;
function show(next) {
  if (next < 0 || next >= slides.length) return;
  index = next;
  slides.forEach(function (slide, i) { slide.classList.toggle('deck__slide--active', i === index); });
}
document.addEventListener('keydown', function (event) {
  if (event.key === 'ArrowRight') show(index + 1);
  if (event.key === 'Home') show(0);
});
show(${startIndex});
</script>
</body></html>`;
}

const HIDDEN_DECK_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Hidden deck</title>
<style>body{margin:0} [data-export-slide]{height:100vh}</style>
</head><body>
<section data-export-slide><h1>Opening</h1></section>
<section data-export-slide hidden><h1>Middle</h1></section>
<section data-export-slide hidden><h1>Closing</h1></section>
</body></html>`;

test('TC-HTMLX-016 beforeNavigate runs before page scripts, so a clock at t=0 is seen by the page', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page whose first inline script records Date.now().
    const file = writeFixture(testEnv.root, 'clock-probe.html', CLOCK_PROBE_HTML);
    let urlInsideHook = null;
    // When: openPage installs and pauses the clock at t=0 inside beforeNavigate.
    const startedAt = await withSession({
      file,
      beforeNavigate: async (page) => {
        urlInsideHook = page.url();
        await page.clock.install({ time: 0 });
        await page.clock.pauseAt(0);
      },
    }, ({ page }) => page.evaluate(() => window.__startedAt));
    // Then: The hook ran before navigation, and the page script observed the fake time exactly.
    assert.equal(urlInsideHook, 'about:blank');
    assert.equal(startedAt, 0);

    // Control: without the hook the same script records real wall-clock time.
    const realStartedAt = await withSession({ file }, ({ page }) => page.evaluate(() => window.__startedAt));
    assert.ok(realStartedAt > 1_000_000_000_000, `expected real epoch ms, got ${realStartedAt}`);
  });
});

test('TC-HTMLX-008 page errors are collected and offline mode aborts an https image', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page that logs a console error, throws from a script, and references an https image.
    const file = writeFixture(testEnv.root, 'errors.html', ERROR_AND_REMOTE_IMAGE_HTML);
    // When: The page opens in offline mode.
    await withSession({ file, offline: true }, async ({ page, errors, blocked }) => {
      const image = await page.evaluate(() => {
        const element = document.getElementById('remote');
        return { complete: element.complete, naturalWidth: element.naturalWidth };
      });
      // Then: The thrown error and the console error are both captured.
      assert.ok(
        errors.some((entry) => entry.type === 'pageerror' && entry.text.includes('fixture script failure')),
        `pageerror missing from ${JSON.stringify(errors)}`,
      );
      assert.ok(
        errors.some((entry) => entry.type === 'console' && entry.text.includes('fixture console failure')),
        `console error missing from ${JSON.stringify(errors)}`,
      );
      // And: The https request was aborted by offline routing, so the image never loaded.
      assert.deepEqual(blocked, [REMOTE_IMAGE_URL]);
      assert.equal(image.complete, true);
      assert.equal(image.naturalWidth, 0);
    });
  });
});

test('TC-HTMLX-152 openPage waits for window.__ready when the page defines it', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page that starts with __ready=false and flips it to true after a timer.
    const file = writeFixture(testEnv.root, 'ready.html', READY_FLAG_HTML);
    // When: openPage resolves.
    const ready = await withSession({ file }, ({ page }) => page.evaluate(() => window.__ready));
    // Then: The page had already reported ready.
    assert.equal(ready, true);
  });
});

test('TC-HTMLX-009 proto strategy visits each data-state screen through window.__proto.goTo', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A prototype with three [data-state] screens and window.__proto.goTo.
    const file = writeFixture(testEnv.root, 'proto.html', PROTO_APP_HTML);
    await withSession({ file, viewport: '800x600' }, async ({ page, errors }) => {
      // When: The navigator visits every screen.
      const navigator = await createNavigator(page, '[data-state]');
      assert.equal(navigator.strategy, 'proto');
      assert.equal(navigator.count, 3);
      for (let index = 0; index < navigator.count; index += 1) {
        assertNonZeroBox(await navigator.goTo(index), `screen ${index}`);
      }
      // Then: The producer's own navigation received every screen id in order, ending on the last one.
      assert.deepEqual(await page.evaluate(() => window.__visited), ['inbox', 'compose', 'sent']);
      assert.equal(await page.locator('[data-state="sent"]').isVisible(), true);
      assert.equal(await page.locator('[data-state="inbox"]').isVisible(), false);
      assert.deepEqual(errors, []);
    });
  });
});

test('TC-HTMLX-009 keys strategy drives an ArrowRight deck and shows the third slide on step 2', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    for (const startIndex of [0, 1]) {
      // Given: A deck that toggles .deck__slide--active on ArrowRight/Home, starting on slide startIndex.
      const file = writeFixture(testEnv.root, `keys-${startIndex}.html`, keyDeckHtml(startIndex));
      await withSession({ file, viewport: '800x600' }, async ({ page, errors }) => {
        // When: The navigator goes to slides 0, 1 and 2.
        const navigator = await createNavigator(page, 'section.deck__slide');
        assert.equal(navigator.strategy, 'keys');
        const boxes = [];
        for (let index = 0; index < navigator.count; index += 1) boxes.push(await navigator.goTo(index));
        // Then: Key navigation stayed in use and the third slide is the one on screen.
        assert.equal(navigator.strategy, 'keys', `start ${startIndex}: ${JSON.stringify(navigator.fallback)}`);
        assert.equal(navigator.fallback, null);
        boxes.forEach((box, index) => assertNonZeroBox(box, `start ${startIndex} slide ${index}`));
        assert.equal(await page.locator('section.deck__slide', { hasText: 'Third slide' }).isVisible(), true);
        assert.equal(await page.locator('section.deck__slide', { hasText: 'First slide' }).isVisible(), false);
        assert.deepEqual(errors, []);
      });
    }
  });
});

test('TC-HTMLX-009 a [hidden] deck with no key handler falls back from keys to stacked', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A deck whose later slides use [hidden] and that has no keyboard navigation.
    const file = writeFixture(testEnv.root, 'hidden.html', HIDDEN_DECK_HTML);
    await withSession({ file, viewport: '800x600' }, async ({ page }) => {
      // When: The default selector matches three slides with exactly one visible.
      const navigator = await createNavigator(page, DEFAULT_SLIDE_SELECTOR, { stepTimeoutMs: 400 });
      assert.equal(navigator.count, 3);
      assert.equal(navigator.strategy, 'keys');
      const boxes = [];
      for (let index = 0; index < navigator.count; index += 1) boxes.push(await navigator.goTo(index));
      // Then: The unchanged visible slide is detected, the navigator switches to stacked, and every slide renders.
      assert.equal(navigator.strategy, 'stacked');
      assert.equal(navigator.fallback && navigator.fallback.from, 'keys');
      boxes.forEach((box, index) => assertNonZeroBox(box, `slide ${index}`));
      assert.equal(await page.locator('[data-export-slide]', { hasText: 'Closing' }).isVisible(), true);
    });
  });
});

test('TC-HTMLX-012a makeTestEnv redirects home and temp, clears the project root, and keeps the browser cache', () => {
  // Given: An original env with a project root, a provider key, and per-OS cache locations.
  const baseEnv = {
    PATH: process.env.PATH || '',
    HOME: '/home/dev',
    USERPROFILE: 'C:\\Users\\dev',
    LOCALAPPDATA: 'C:\\Users\\dev\\AppData\\Local',
    CLAUDE_PROJECT_DIR: '/work/project',
    TELEGRAM_BOT_TOKEN: 'placeholder-token',
  };
  const expectedDefaults = {
    win32: 'C:\\Users\\dev\\AppData\\Local\\ms-playwright',
    darwin: '/home/dev/Library/Caches/ms-playwright',
    linux: '/home/dev/.cache/ms-playwright',
  };
  for (const [platform, expected] of Object.entries(expectedDefaults)) {
    // When: A test env is built for that platform from the original env.
    const testEnv = makeTestEnv({ baseEnv, platform });
    try {
      // Then: The browser cache is the per-OS default computed BEFORE the redirect, not a temp path.
      assert.equal(testEnv.browsersPath, expected, platform);
      assert.equal(testEnv.env.PLAYWRIGHT_BROWSERS_PATH, expected, platform);
      for (const key of ['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP']) {
        assert.equal(testEnv.env[key], testEnv.root, `${platform} ${key}`);
      }
      assert.equal(Object.keys(testEnv.env).some((key) => key.toUpperCase() === 'CLAUDE_PROJECT_DIR'), false);
      assert.equal(testEnv.env.TELEGRAM_BOT_TOKEN, '');
      assert.equal(fs.statSync(testEnv.root).isDirectory(), true);
    } finally {
      testEnv.cleanup();
    }
    assert.equal(fs.existsSync(testEnv.root), false, 'cleanup removes the temp root');
  }

  // And: An explicit original PLAYWRIGHT_BROWSERS_PATH wins; XDG_CACHE_HOME is honored on Linux.
  assert.equal(resolveBrowsersPath({ ...baseEnv, PLAYWRIGHT_BROWSERS_PATH: '/opt/pw' }, 'linux'), '/opt/pw');
  assert.equal(resolveBrowsersPath({ ...baseEnv, PLAYWRIGHT_BROWSERS_PATH: '0' }, 'win32'), '0');
  assert.equal(resolveBrowsersPath({ ...baseEnv, XDG_CACHE_HOME: '/cache' }, 'linux'), '/cache/ms-playwright');

  // And: apply() mirrors the env onto process.env and restore() puts the original values back.
  const before = { ...process.env };
  const testEnv = makeTestEnv({ baseEnv: { ...process.env, CLAUDE_PROJECT_DIR: path.resolve('project-dir') } });
  try {
    testEnv.apply();
    assert.equal(process.env.HOME, testEnv.root);
    assert.equal(process.env.CLAUDE_PROJECT_DIR, undefined);
  } finally {
    testEnv.cleanup();
  }
  assert.deepEqual({ ...process.env }, before);
});

// Contract: the one shared isolation step every browser case in png/pdf/video/browser runs through.
test('TC-HTMLX-156 withBrowserEnv isolates each case, honours apply:false, skips on a gate, and always cleans up', async (t) => {
  // Given: Chromium is available (the helper checks it before the gate and before the case).
  if (await skipWithoutBrowser(t)) return;
  const before = { ...process.env };
  const skips = [];
  const fakeT = { skip: (reason) => skips.push(reason) };
  const prefix = 'html-export-shared-env-';

  // When: A case runs with the default apply.
  let seen = null;
  await withIsolatedBrowser(fakeT, async (testEnv) => {
    seen = { root: testEnv.root, home: process.env.HOME, temp: process.env.TEMP, tmpdir: process.env.TMPDIR };
  }, { prefix });
  // Then: process.env pointed at the case's temp root only while it ran; the root is removed after.
  assert.deepEqual([seen.home, seen.temp, seen.tmpdir], [seen.root, seen.root, seen.root]);
  assert.equal(path.basename(seen.root).startsWith(prefix), true, seen.root);
  assert.equal(fs.existsSync(seen.root), false, 'cleanup removes the temp root');
  assert.deepEqual({ ...process.env }, before);

  // When: A spawn-only case passes apply: false.
  await withIsolatedBrowser(fakeT, async (testEnv) => {
    seen = { root: testEnv.root, home: process.env.HOME, childHome: testEnv.env.HOME };
  }, { prefix, apply: false });
  // Then: this process's env is untouched, while the child env is still redirected.
  assert.equal(seen.home, before.HOME);
  assert.equal(seen.childHome, seen.root);
  assert.equal(fs.existsSync(seen.root), false);

  // When: The gate names a missing dependency.
  let ran = false;
  await withIsolatedBrowser(fakeT, async () => { ran = true; }, {
    prefix, gate: async () => 'fixture-dependency (TC-HTMLX-156 gate check)',
  });
  // Then: the case body never runs and only that case is skipped, with the ENVIRONMENT-BLOCKED reason.
  assert.equal(ran, false);
  assert.deepEqual(skips, ['ENVIRONMENT-BLOCKED: fixture-dependency (TC-HTMLX-156 gate check)']);
  assert.deepEqual({ ...process.env }, before);

  // When: A case throws.
  await assert.rejects(withIsolatedBrowser(fakeT, async (testEnv) => {
    seen = { root: testEnv.root };
    throw new Error('case failed');
  }, { prefix }), /case failed/);
  // Then: the case's error propagates unchanged and cleanup still ran.
  assert.equal(fs.existsSync(seen.root), false);
  assert.deepEqual({ ...process.env }, before);
});

test('TC-HTMLX-012a Playwright resolves its browser cache inside the redirected env', (t) => {
  // Given: The skill-local Playwright package (not Chromium itself) is installed.
  if (!fs.existsSync(path.join(PLAYWRIGHT_ROOT, 'package.json'))) {
    console.log('ENVIRONMENT-BLOCKED: playwright (skill-local package not installed)');
    t.skip('ENVIRONMENT-BLOCKED: playwright');
    return;
  }
  const testEnv = makeTestEnv({ prefix: 'html-export-env-' });
  try {
    const probe = `process.stdout.write(require(${JSON.stringify(PLAYWRIGHT_ROOT)}).chromium.executablePath())`;
    const run = (env) => spawnSync(process.execPath, ['-e', probe], {
      env, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000,
    });
    // When: A child process with the redirected env asks Playwright where Chromium lives.
    const withPath = run(testEnv.env);
    assert.ifError(withPath.error);
    assert.equal(withPath.status, 0, withPath.stderr);
    // Then: The answer is under the original browser cache, not under the temp home.
    if (testEnv.browsersPath !== '0') {
      const relative = path.relative(path.resolve(testEnv.browsersPath), path.resolve(withPath.stdout));
      assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative),
        `${withPath.stdout} should be inside ${testEnv.browsersPath}`);
    }
    // Control (POSIX): without the pass-through the redirected HOME would move the cache into the temp dir.
    if (process.platform !== 'win32') {
      const withoutPath = { ...testEnv.env };
      delete withoutPath.PLAYWRIGHT_BROWSERS_PATH;
      delete withoutPath.XDG_CACHE_HOME;
      const redirected = run(withoutPath);
      assert.equal(redirected.status, 0, redirected.stderr);
      // macOS temp dirs may be reported through the /private realpath, so accept either spelling.
      const homes = [path.resolve(testEnv.root), fs.realpathSync(testEnv.root)];
      assert.ok(
        homes.some((home) => path.resolve(redirected.stdout).startsWith(home + path.sep)),
        `${redirected.stdout} should be inside the temp home ${testEnv.root}`,
      );
    }
  } finally {
    testEnv.cleanup();
  }
});

test('TC-HTMLX-153 parseViewport accepts WxH strings and objects and rejects malformed values', () => {
  // Given: Valid and malformed viewport values.
  // When: Each is parsed.
  // Then: Valid forms parse to whole-number sizes; malformed forms throw a viewport error.
  assert.deepEqual(parseViewport('1280x720'), { width: 1280, height: 720 });
  assert.deepEqual(parseViewport({ width: 390, height: 844 }), { width: 390, height: 844 });
  assert.deepEqual(parseViewport(undefined), { width: 1440, height: 900 });
  for (const bad of ['1280', '0x720', 'axb', { width: 0, height: 10 }]) {
    assert.throws(() => parseViewport(bad), /viewport/, JSON.stringify(bad));
  }
});

test('TC-HTMLX-154 parseViewportList labels each size and rejects an empty entry or a size listed twice', () => {
  // Given: A valid list, a list with an empty entry, and lists that repeat one size.
  // When: Each is parsed.
  // Then: The valid list keeps order and labels; a repeat (in any spelling) is rejected, because
  // both entries would write the same file names.
  assert.deepEqual(parseViewportList('800x600, 320X640').map((size) => size.label), ['800x600', '320x640']);
  assert.throws(() => parseViewportList('800x600,'), /invalid --viewport/);
  assert.throws(() => parseViewportList('800x600,800x600'), /--viewport lists 800x600 more than once/);
  assert.throws(() => parseViewportList('800x600, 800X600'), /--viewport lists 800x600 more than once/);
  // And: The shared WxH parser reports the flag it parses for.
  assert.deepEqual(parseSize(' 10 x 20 ', '--page', '1920x1080'), { width: 10, height: 20 });
  assert.throws(() => parseSize('10x0', '--page', '1920x1080'), /invalid --page "10x0"; expected WxH in CSS pixels, for example 1920x1080/);
});

/**
 * Starts a raw TCP server on 127.0.0.1 at a random port and counts every connection it accepts,
 * so an HTTP request, a WebSocket handshake or any other socket from the page shows up.
 */
async function withProbeServer(run) {
  const connections = [];
  const server = net.createServer((socket) => {
    connections.push(Date.now());
    socket.destroy();
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    return await run(server.address().port, connections);
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
  }
}

function networkProbeHtml(port) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Network probe</title>
<script src="local-marker.js"></script>
</head><body><h1>Network probe</h1>
<script>
window.__probe = { ws: 'pending', fetch: 'pending' };
try {
  var socket = new WebSocket('ws://127.0.0.1:${port}/ws-probe?leak=1');
  socket.onopen = function () { window.__probe.ws = 'open'; };
  socket.onerror = function () { window.__probe.ws = 'error'; };
  socket.onclose = function () { if (window.__probe.ws === 'pending') window.__probe.ws = 'closed'; };
} catch (error) { window.__probe.ws = 'threw'; }
fetch('http://127.0.0.1:${port}/fetch-probe').then(
  function () { window.__probe.fetch = 'ok'; },
  function () { window.__probe.fetch = 'failed'; }
);
</script>
</body></html>`;
}

async function settleProbe(page) {
  await page.waitForFunction(() => window.__probe.ws !== 'pending' && window.__probe.fetch !== 'pending', null, { timeout: 10_000 });
  // Give a late socket from the page a moment to reach the server before counting.
  await new Promise((resolve) => setTimeout(resolve, 300));
  return page.evaluate(() => ({ ...window.__probe, localMarker: window.__localMarker === true }));
}

test('TC-HTMLX-008 offline mode blocks WebSocket and HTTP traffic while local file: resources still load', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withProbeServer(async (port, connections) => {
      // Given: A local page that loads a file: script, opens a WebSocket and fetches over HTTP,
      // both aimed at a local probe server.
      fs.writeFileSync(path.join(testEnv.root, 'local-marker.js'), 'window.__localMarker = true;', 'utf8');
      const file = writeFixture(testEnv.root, 'network-probe.html', networkProbeHtml(port));

      // When: The page opens in offline mode.
      const offline = await withSession({ file, offline: true }, async ({ page, errors, blocked }) => ({
        probe: await settleProbe(page),
        errors: [...errors],
        blocked: [...blocked],
      }));
      // Then: Nothing reached the server, the WebSocket never opened, the fetch and the WebSocket
      // were both recorded as blocked, and the local file: script still ran.
      assert.deepEqual(connections, [], `offline mode leaked ${connections.length} connection(s)`);
      assert.notEqual(offline.probe.ws, 'open');
      assert.equal(offline.probe.fetch, 'failed');
      assert.equal(offline.probe.localMarker, true, 'file: subresources must still load offline');
      assert.ok(offline.blocked.includes(`http://127.0.0.1:${port}/fetch-probe`), JSON.stringify(offline.blocked));
      assert.ok(offline.blocked.includes(`ws://127.0.0.1:${port}/ws-probe?leak=1`), JSON.stringify(offline.blocked));
      // And: The page handles both failures, so the failure messages Chromium logs for them are
      // offline aborts, not page errors.
      const split = splitOfflineErrors(offline.errors, offline.blocked);
      assert.deepEqual(split.pageErrors, [], JSON.stringify(offline.errors));
      assert.ok(
        split.offlineAborts.some((entry) => /^WebSocket connection to 'ws:\/\/127\.0\.0\.1:\d+\/ws-probe\?leak=1' failed/.test(entry.text)),
        JSON.stringify(split.offlineAborts),
      );

      // Control: Without offline mode the same page does reach the server, so the probe can see a leak.
      const online = await withSession({ file }, ({ page }) => settleProbe(page));
      assert.equal(online.localMarker, true);
      assert.ok(connections.length > 0, 'the probe server must see the online page connect');
    });
  });
});

test('TC-HTMLX-008 an offline-refused WebSocket is an offline abort; any other WebSocket failure stays a page error', () => {
  // Given: Console messages for WebSockets, as Chromium words them, and the URLs a session blocked.
  const blockedSocket = 'ws://127.0.0.1:9/live';
  const at = { url: 'file:///deck.html', lineNumber: 3, columnNumber: 0 };
  const refused = {
    type: 'console',
    text: `WebSocket connection to '${blockedSocket}' failed: Error in connection establishment: net::ERR_INTERNET_DISCONNECTED`,
    location: at,
  };
  const otherCode = { ...refused, text: refused.text.replace('ERR_INTERNET_DISCONNECTED', 'ERR_CONNECTION_REFUSED') };
  const unblocked = { ...refused, text: refused.text.replace(blockedSocket, 'wss://example.invalid/other') };
  const noLocation = { type: 'console', text: refused.text };
  const thrown = { type: 'pageerror', text: 'socket unavailable' };
  // When: The errors are split against the blocked list.
  const split = splitOfflineErrors([refused, otherCode, unblocked, noLocation, thrown], [blockedSocket]);
  // Then: Only the offline refusal of a blocked socket is attributed to --offline; a different
  // error code, a socket the session did not block, an entry without a location and code that
  // throws all stay page errors.
  assert.deepEqual(split.offlineAborts, [refused]);
  assert.deepEqual(split.pageErrors, [otherCode, unblocked, noLocation, thrown]);
  // And: Without a blocked list nothing is excused.
  assert.deepEqual(splitOfflineErrors([refused], []).pageErrors, [refused]);
});

test('TC-HTMLX-008 offline: code that throws after a refused WebSocket still counts as a page error', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page whose WebSocket error handler throws.
    const file = writeFixture(testEnv.root, 'socket-throws.html', `<!doctype html>
<html><head><meta charset="utf-8"><title>Socket throws</title></head><body><h1>Live feed</h1>
<script>
window.__settled = false;
var socket = new WebSocket('ws://127.0.0.1:9/live-feed');
socket.onerror = function () { window.__settled = true; throw new Error('live feed unavailable'); };
</script>
</body></html>`);
    // When: The page opens offline and the socket fails.
    const session = await withSession({ file, offline: true }, async ({ page, errors, blocked }) => {
      await page.waitForFunction(() => window.__settled === true, null, { timeout: 10_000 });
      // The connection message and the thrown error reach Node as separate events after __settled.
      await waitUntil(() => {
        const split = splitOfflineErrors(errors, blocked);
        return split.offlineAborts.length > 0 && split.pageErrors.some((entry) => /live feed unavailable/.test(entry.text));
      }, 'the refused-socket message and the thrown page error');
      return { errors: [...errors], blocked: [...blocked] };
    });
    // Then: The refused socket is blocked and its connection message is an offline abort, while
    // the exception the handler threw stays the one page error.
    assert.deepEqual(session.blocked, ['ws://127.0.0.1:9/live-feed']);
    const split = splitOfflineErrors(session.errors, session.blocked);
    assert.equal(split.offlineAborts.length, 1, JSON.stringify(session.errors));
    assert.match(split.offlineAborts[0].text, /^WebSocket connection to 'ws:\/\/127\.0\.0\.1:9\/live-feed' failed/);
    assert.equal(split.pageErrors.length, 1, JSON.stringify(split.pageErrors));
    assert.equal(split.pageErrors[0].type, 'pageerror');
    assert.match(split.pageErrors[0].text, /live feed unavailable/);
  });
});

/**
 * A local TCP server on 127.0.0.1 (random port) that accepts connections and never answers, so a
 * resource requested from it stays pending until the page gives up.
 */
async function withSilentServer(run) {
  const held = [];
  const server = net.createServer((socket) => { held.push(socket); });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    return await run(server.address().port, held);
  } finally {
    for (const socket of held) socket.destroy();
    await new Promise((resolve) => server.close(() => resolve()));
  }
}

test('TC-HTMLX-155 openPage bounds document.fonts.ready by the session timeout instead of hanging', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withSilentServer(async (port) => {
      // Given: A page that, once loaded, starts loading a web font from a server that never answers.
      // (A font requested before load delays the load event itself, which navigation already bounds.)
      const file = writeFixture(testEnv.root, 'hanging-font.html', `<!doctype html>
<html><head><meta charset="utf-8"><title>Hanging font</title></head>
<body><h1 style="font-family: Hang, sans-serif">Hanging font</h1>
<script>
window.addEventListener('load', function () {
  var face = new FontFace('Hang', 'url(http://127.0.0.1:${port}/hang.woff2)');
  document.fonts.add(face);
  face.load().catch(function () {});
});
</script>
</body></html>`);
      // When: openPage runs with a 3 second session timeout.
      const started = Date.now();
      let failure = null;
      try {
        const session = await openPage({ file, timeoutMs: 3000 });
        await session.close();
      } catch (error) {
        failure = error;
      }
      const elapsed = Date.now() - started;
      // Then: It rejects with a message naming the font wait, well before any network timeout.
      assert.ok(failure, 'openPage must not report ready while a font is still loading');
      assert.match(failure.message, /document\.fonts\.ready did not settle within 3000 ms/);
      assert.ok(elapsed < 20_000, `openPage took ${elapsed} ms`);
    });
  });
});

const ANIMATED_ENTRY_DECK = path.join(__dirname, 'fixtures', 'animated-entry-deck.html');

// A prototype whose own goTo ignores the requested id and always shows the first screen.
const BROKEN_PROTO_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Broken prototype</title>
<style>body{margin:0} [data-state]{display:none;height:100vh} [data-state].is-current{display:block}</style>
</head><body>
<section data-state="inbox" class="is-current"><h1>Inbox screen</h1></section>
<section data-state="compose"><h1>Compose screen</h1></section>
<section data-state="sent"><h1>Sent screen</h1></section>
<script>
window.__proto = {
  goTo: function () {
    document.querySelectorAll('[data-state]').forEach(function (screen, i) {
      screen.classList.toggle('is-current', i === 0);
    });
  }
};
</script>
</body></html>`;

test('TC-HTMLX-009 an entry-animated single-visible deck is detected as keys, not stacked', async (t) => {
  await withBrowserEnv(t, async () => {
    // Given: A deck whose active slide enters from opacity 0 after a delay that ignores reduced
    // motion, so no slide is visible at the moment navigation starts.
    await withSession({ file: ANIMATED_ENTRY_DECK, viewport: '800x600' }, async ({ page, errors }) => {
      // When: The navigator detects its strategy and visits every slide.
      const navigator = await createNavigator(page, 'section.deck__slide');
      assert.equal(navigator.strategy, 'keys', 'detection must wait for the entry animation to settle');
      const boxes = [];
      for (let index = 0; index < navigator.count; index += 1) boxes.push(await navigator.goTo(index));
      // Then: Key navigation stayed in use for all three slides and the third one is on screen.
      assert.equal(navigator.count, 3);
      assert.equal(navigator.strategy, 'keys', JSON.stringify(navigator.fallback));
      assert.equal(navigator.fallback, null);
      boxes.forEach((box, index) => assertNonZeroBox(box, `slide ${index}`));
      assert.equal(await page.locator('section.deck__slide', { hasText: 'Entry slide three' }).isVisible(), true);
      assert.deepEqual(errors, []);
    });
  });
});

test('TC-HTMLX-009 a proto goTo that does not show the requested screen falls back to stacked', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A prototype whose window.__proto.goTo always shows the first screen.
    const file = writeFixture(testEnv.root, 'broken-proto.html', BROKEN_PROTO_HTML);
    await withSession({ file, viewport: '800x600' }, async ({ page }) => {
      // When: The navigator visits every screen.
      const navigator = await createNavigator(page, '[data-state]', { stepTimeoutMs: 400 });
      assert.equal(navigator.strategy, 'proto');
      const boxes = [];
      for (let index = 0; index < navigator.count; index += 1) boxes.push(await navigator.goTo(index));
      // Then: The failed step is detected at screen 2, the navigator switches to stacked with the
      // reason recorded, and every screen still renders instead of a blank page.
      assert.equal(navigator.strategy, 'stacked');
      assert.equal(navigator.fallback && navigator.fallback.from, 'proto');
      assert.equal(navigator.fallback.atIndex, 1);
      assert.match(navigator.fallback.reason, /__proto\.goTo did not show item 2/);
      boxes.forEach((box, index) => assertNonZeroBox(box, `screen ${index}`));
      assert.equal(await page.locator('[data-state="sent"]').isVisible(), true);
    });
  });
});

// A page whose main thread is blocked by an endless script shortly after load (and, with
// __ready=false, is still waiting to report ready when it blocks).
const BUSY_AFTER_LOAD_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Busy after load</title>
<script>window.__ready = false; setTimeout(function () { for (;;) {} }, 300);</script>
</head><body><h1>Busy after load</h1></body></html>`;

test('TC-HTMLX-017 timedEvaluate bounds a busy page, then fails fast; a pending promise does not poison later calls', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    const file = writeFixture(testEnv.root, 'responsive.html', '<!doctype html><title>Responsive</title><h1>Responsive</h1>');
    let started;
    await withSession({ file, timeoutMs: 10_000 }, async ({ page }) => {
      // Given: A call awaiting a promise the page never settles (the page itself stays responsive).
      started = Date.now();
      await assert.rejects(
        timedEvaluate(page, () => new Promise(() => {}), undefined, 800, 'pending promise call'),
        (error) => error instanceof PageTimeoutError && error.pageFault === true && error.busy === false
          && /pending promise call did not finish within 800 ms/.test(error.message),
      );
      assert.ok(Date.now() - started < 5000, `the bound must hold, took ${Date.now() - started} ms`);
      // When / Then: The next call on the same page still runs, because the page answers.
      assert.equal(await timedEvaluate(page, () => 6 * 7, undefined, 800, 'follow-up call'), 42);

      // Given: A page script that throws inside the call.
      // Then: It is a page fault (the page threw), not a timeout.
      await assert.rejects(
        timedEvaluate(page, () => { throw new Error('page code threw'); }, undefined, 800, 'throwing call'),
        (error) => !(error instanceof PageTimeoutError) && error.pageFault === true && /page code threw/.test(error.message),
      );
    });

    // A fresh page, so the busy case below starts with no abandoned call.
    await withSession({ file, timeoutMs: 10_000 }, async ({ page }) => {
      // Given: The page blocks its main thread in an endless loop.
      await page.evaluate(() => { setTimeout(() => { for (;;) {} }, 50); });
      // No observable to poll: once the loop runs the page answers nothing, and probing it would
      // itself leave an abandoned call. A fixed wait (six times the 50 ms delay) lets it start; if it
      // had not, the call below would answer and the assertion fail loudly, never pass falsely.
      await sleep(300);
      // When: A call runs against the busy page.
      started = Date.now();
      await assert.rejects(
        timedEvaluate(page, () => document.title, undefined, 800, 'title read'),
        (error) => error instanceof PageTimeoutError && error.busy === false && /title read did not finish within 800 ms/.test(error.message),
      );
      const firstTimeout = Date.now() - started;
      // Then: The next call does not wait out another full timeout: the page fails a short
      // responsiveness check once, and every later call rejects at once as busy.
      await assert.rejects(
        timedEvaluate(page, () => 1, undefined, 800, 'second read'),
        (error) => error instanceof PageTimeoutError && error.busy === true && error.pageFault === true
          && /second read was skipped: the page did not answer a responsiveness check after title read timed out \(800 ms\)/.test(error.message),
      );
      started = Date.now();
      await assert.rejects(timedEvaluate(page, () => 1, undefined, 800, 'third read'), (error) => error.busy === true);
      assert.ok(Date.now() - started < 200, `a known-busy page must fail at once, took ${Date.now() - started} ms`);
      assert.ok(firstTimeout < 5000, `the first call must be bounded, took ${firstTimeout} ms`);
    });
    // And: isPageFault reads the tag, and treats Playwright's own TimeoutError as a page fault.
    assert.equal(isPageFault(Object.assign(new Error('x'), { pageFault: false })), false);
    assert.equal(isPageFault(Object.assign(new Error('x'), { name: 'TimeoutError' })), true);
    assert.equal(isPageFault(new Error('write failed')), false);
    assert.equal(isPageFault(null), false);
  });
});

test('TC-HTMLX-017 openPage rejects a page that blocks its main thread while not yet ready, within the timeout', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page that sets __ready=false and then runs an endless loop.
    const file = writeFixture(testEnv.root, 'busy-ready.html', BUSY_AFTER_LOAD_HTML);
    // When: openPage runs with a 3 second timeout.
    const started = Date.now();
    let failure = null;
    try {
      const session = await openPage({ file, timeoutMs: 3000 });
      await session.close();
    } catch (error) {
      failure = error;
    }
    const elapsed = Date.now() - started;
    // Then: It rejects (no hang), names the readiness wait, and blames the page.
    assert.ok(failure, 'openPage must not resolve for a page that never becomes ready');
    assert.match(failure.message, /__ready/);
    assert.equal(failure.pageFault, true);
    assert.equal(isPageFault(failure), true);
    // The bound: the 3 s timeout, one responsiveness ping, and at most one close budget (closing a
    // browser whose renderer spins took over 30 s on a loaded machine), plus scheduling margin.
    // A hang never ends, so it still fails here.
    const { launchBudget } = require('../scripts/lib/browser.cjs');
    const bound = 3000 + 1000 + launchBudget(3000) + 10_000;
    assert.ok(elapsed < bound, `openPage took ${elapsed} ms (bound ${bound} ms)`);
  });
});

test('TC-HTMLX-017 a proto goTo that never settles fails that item within the timeout and the next item still navigates', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A prototype whose goTo for the second screen returns a promise that never settles.
    const file = writeFixture(testEnv.root, 'pending-proto.html', PROTO_APP_HTML.replace(
      'goTo: function (id) {',
      "goTo: function (id) {\n    if (id === 'compose') return new Promise(function () {});",
    ));
    await withSession({ file, viewport: '800x600' }, async ({ page }) => {
      const navigator = await createNavigator(page, '[data-state]', { timeoutMs: 1000, stepTimeoutMs: 400 });
      assertNonZeroBox(await navigator.goTo(0), 'screen 0');
      // When: The navigator goes to the second screen.
      const started = Date.now();
      await assert.rejects(navigator.goTo(1), (error) => error instanceof PageTimeoutError
        && error.pageFault === true && /__proto\.goTo for item 2 did not finish within 1000 ms/.test(error.message));
      // Then: The failure came within the bound, and the third screen still navigates.
      assert.ok(Date.now() - started < 5000, `goTo took ${Date.now() - started} ms`);
      assertNonZeroBox(await navigator.goTo(2), 'screen 2');
      assert.equal(await page.locator('[data-state="sent"]').isVisible(), true);
      assert.equal(navigator.strategy, 'proto');
    });
  });
});

test('TC-HTMLX-017 navigationTimeouts derives both bounds from --timeout, with the 1500 ms step window as the default', () => {
  // Given / When / Then: No --timeout keeps the short step window and the default call bound.
  assert.equal(DEFAULT_STEP_TIMEOUT_MS, 1500);
  assert.deepEqual(navigationTimeouts(undefined), { timeoutMs: 30_000, stepTimeoutMs: 1500 });
  // And: An explicit --timeout is both the call bound and the step window.
  assert.deepEqual(navigationTimeouts(8000), { timeoutMs: 8000, stepTimeoutMs: 8000 });
  assert.deepEqual(navigationTimeouts(500), { timeoutMs: 500, stepTimeoutMs: 500 });
});

test('TC-HTMLX-008 isLocalFileUrl allows only file: URLs with no host or localhost', () => {
  // Given / When / Then: Local forms are allowed.
  for (const url of ['file:///C:/deck/a.png', 'file:///home/me/a.png', 'file://localhost/tmp/a.png', 'file://LOCALHOST/tmp/a.png']) {
    assert.equal(isLocalFileUrl(url), true, url);
  }
  // And: A file: URL naming any other host (UNC/SMB), and every non-file URL, is not local.
  for (const url of ['file://127.0.0.1/c$/Windows/win.ini', 'file://fileserver/share/a.png', 'file://example.invalid/x.png',
    'https://example.invalid/a.png', 'data:text/plain,x', 'not a url']) {
    assert.equal(isLocalFileUrl(url), false, url);
  }
});

test('TC-HTMLX-008 offline mode aborts a file:// URL on another host and lists it in blocked', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page with a local file: image and an image on a remote file host (a UNC/SMB path).
    fs.writeFileSync(path.join(testEnv.root, 'local-marker.js'), 'window.__localMarker = true;', 'utf8');
    const remote = 'file://html-export-probe.invalid/share/remote.png';
    const file = writeFixture(testEnv.root, 'remote-file.html', `<!doctype html>
<html><head><meta charset="utf-8"><title>Remote file host</title><script src="local-marker.js"></script></head>
<body><h1>Remote file host</h1><img id="remote" alt="" width="10" height="10" src="${remote}"></body></html>`);
    // When: It opens offline.
    const session = await withSession({ file, offline: true }, async ({ page, errors, blocked }) => {
      await page.waitForFunction(() => document.getElementById('remote').complete, null, { timeout: 10_000 });
      // The abort's console message reaches Node as its own event, after the image completes.
      await waitUntil(() => blocked.includes(remote) && splitOfflineErrors(errors, blocked).offlineAborts.length > 0,
        'the aborted remote file: URL and its offline-abort message');
      return { errors: [...errors], blocked: [...blocked], localMarker: await page.evaluate(() => window.__localMarker === true) };
    });
    // Then: The remote-host file: URL was aborted and listed; the local file: script still ran.
    assert.deepEqual(session.blocked, [remote]);
    assert.equal(session.localMarker, true);
    // And: Its abort message is an offline abort, never a page error.
    assert.deepEqual(splitOfflineErrors(session.errors, session.blocked).pageErrors, [], JSON.stringify(session.errors));
  });
});

/**
 * A TCP listener and a UDP socket on 127.0.0.1 that record every connection request line and
 * every datagram, so a prefetch (HTTP) or a WebTransport (QUIC over UDP) attempt shows up.
 */
async function withLeakListeners(run) {
  const requests = [];
  const datagrams = [];
  const server = net.createServer((socket) => {
    requests.push('(connection)');
    socket.once('data', (data) => { requests.push(data.toString('latin1').split('\r\n')[0]); });
    socket.on('error', () => {});
    setTimeout(() => socket.destroy(), 200);
  });
  const udp = dgram.createSocket('udp4');
  udp.on('message', (message) => { datagrams.push(message.length); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  await new Promise((resolve, reject) => { udp.once('error', reject); udp.bind(0, '127.0.0.1', resolve); });
  try {
    return await run({ tcpPort: server.address().port, udpPort: udp.address().port, requests, datagrams });
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
    await new Promise((resolve) => udp.close(() => resolve()));
  }
}

function speculationLeakHtml(tcpPort, udpPort) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Speculation leak probe</title>
<script type="speculationrules">{"prefetch":[{"source":"list","urls":["http://127.0.0.1:${tcpPort}/prefetch-probe"]}],
"prerender":[{"source":"list","urls":["http://127.0.0.1:${tcpPort}/prerender-probe"]}]}</script>
</head><body><h1>Speculation leak probe</h1>
<script>try { new WebTransport('https://127.0.0.1:${udpPort}/wt-probe').ready.catch(function () {}); } catch (error) {}</script>
</body></html>`;
}

test('TC-HTMLX-008 offline mode stops speculation-rules prefetch/prerender and WebTransport (QUIC)', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withLeakListeners(async ({ tcpPort, udpPort, requests, datagrams }) => {
      // Given: A page that asks the browser to prefetch and prerender loopback URLs through
      // speculation rules, and opens a WebTransport session (QUIC over UDP) to a loopback port.
      const file = writeFixture(testEnv.root, 'speculation.html', speculationLeakHtml(tcpPort, udpPort));
      const settle = () => new Promise((resolve) => setTimeout(resolve, 2500));

      // When: The page opens offline and gets time to act.
      await withSession({ file, offline: true }, settle);
      // Then: Neither channel reached a listener: no TCP connection and no UDP datagram.
      assert.deepEqual(requests, [], `offline mode leaked over TCP: ${JSON.stringify(requests)}`);
      assert.deepEqual(datagrams, [], `offline mode leaked ${datagrams.length} UDP datagram(s)`);
      // And: The offline launch carries the dead proxy (loopback included) and turns QUIC off.
      assert.deepEqual([...OFFLINE_LAUNCH_ARGS], [
        '--proxy-server=http://127.0.0.1:9',
        '--proxy-bypass-list=<-loopback>',
        '--disable-quic',
      ]);

      // Control: Online, the same page does reach a listener, so the probe can see a leak.
      await withSession({ file }, settle);
      assert.ok(requests.length + datagrams.length > 0, 'the online control must reach a listener');
    });
  });
});

// Swaps chromium.launch on the ONE skill-local Playwright instance openPage loads (require cache),
// and always puts the original back.
async function withPatchedLaunch(replacement, run) {
  const playwright = require(PLAYWRIGHT_ROOT);
  const chromium = playwright.chromium;
  const own = Object.getOwnPropertyDescriptor(chromium, 'launch');
  const original = chromium.launch;
  chromium.launch = (options) => replacement(options, (opts) => original.call(chromium, opts));
  try {
    return await run();
  } finally {
    if (own) Object.defineProperty(chromium, 'launch', own);
    else delete chromium.launch;
  }
}

// Collects console.error lines for the duration of `run`.
async function captureStderr(run) {
  const lines = [];
  const original = console.error;
  console.error = (...args) => { lines.push(args.join(' ')); };
  try {
    return { result: await run(), lines };
  } finally {
    console.error = original;
  }
}

test('TC-HTMLX-064 openPage launches Chromium with the launch budget, never the short per-page timeout', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page and a launch that records the options it was given, then fails on purpose.
    const file = writeFixture(testEnv.root, 'budget.html', CLOCK_PROBE_HTML);
    const { DEFAULT_TIMEOUT_MS, launchBudget } = require('../scripts/lib/browser.cjs');
    const seen = [];
    const sentinel = new Error('launch recorded');
    await withPatchedLaunch(async (options) => { seen.push(options); throw sentinel; }, async () => {
      // When: openPage runs with a 150 ms page timeout, then with one longer than the default.
      await assert.rejects(openPage({ file, timeoutMs: 150 }), (error) => error === sentinel);
      await assert.rejects(openPage({ file, timeoutMs: DEFAULT_TIMEOUT_MS * 2 }), (error) => error === sentinel);
    });
    // Then: The launch got max(timeout, 30 s): a busy machine cannot turn a short --timeout into a
    // failed launch (exit 1), and a longer --timeout still extends it.
    assert.deepEqual(seen.map((options) => options.timeout), [DEFAULT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS * 2]);
    assert.equal(launchBudget(150), DEFAULT_TIMEOUT_MS);
    assert.equal(launchBudget(undefined), DEFAULT_TIMEOUT_MS);
    // And: A launch failure is a tool fault that still carries the (empty) page output fields.
    assert.equal(sentinel.pageFault, false);
    assert.deepEqual([sentinel.pageErrors, sentinel.blocked, sentinel.offlineAborts], [[], [], []]);
  });
});

test('TC-HTMLX-069 closeBrowser kills a browser whose close never finishes, warns, and resolves', async () => {
  // Given: A browser double whose close() never settles and whose process records a kill.
  let killed = 0;
  const hung = { close: () => new Promise(() => {}), process: () => ({ kill: () => { killed += 1; } }) };
  const { closeBrowser } = require('../scripts/lib/browser.cjs');
  // When: It is closed with a 200 ms budget.
  const started = Date.now();
  const { result, lines } = await captureStderr(() => closeBrowser(hung, 200));
  // Then: It resolved on its own (never hangs), killed the process once, and warned on stderr.
  assert.deepEqual(result, { timedOut: true });
  assert.ok(Date.now() - started < 2000, `closeBrowser took ${Date.now() - started} ms`);
  assert.equal(killed, 1);
  assert.match(lines.join('\n'), /Warning: the browser did not close within 200 ms; it is stopped when the exporter exits/);
  // Control: A close that finishes is not killed and does not warn.
  let controlKilled = 0;
  const healthy = { close: async () => {}, process: () => ({ kill: () => { controlKilled += 1; } }) };
  const control = await captureStderr(() => closeBrowser(healthy, 200));
  assert.deepEqual([control.result, controlKilled, control.lines], [{ timedOut: false }, 0, []]);
  // And: A close that fails (rather than hangs) still reports the failure.
  await assert.rejects(closeBrowser({ close: async () => { throw new Error('close failed'); } }, 200), /close failed/);
});

test('TC-HTMLX-069 a browser setup call that never finishes is a bounded tool fault, and a hung close does not hang', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A browser launched before the test (so the launch bound is not what is measured) whose
    // newContext() never settles.
    const file = writeFixture(testEnv.root, 'setup.html', CLOCK_PROBE_HTML);
    const real = await require(PLAYWRIGHT_ROOT).chromium.launch({ headless: true, timeout: 60_000 });
    try {
      real.newContext = () => new Promise(() => {});
      // When: openPage runs with a 1500 ms setup budget.
      const started = Date.now();
      const failure = await withPatchedLaunch(async () => real, () => openPage({ file, setupTimeoutMs: 1500 })
        .then(() => null, (error) => error));
      // Then: It rejected within the bound, naming the call, as a tool fault (never a page fault),
      // and it closed the browser it had started.
      assert.ok(failure, 'openPage must not resolve when newContext never settles');
      assert.match(failure.message, /browser\.newContext did not finish within 1500 ms/);
      assert.equal(failure.pageFault, false);
      assert.ok(Date.now() - started < 10_000, `openPage took ${Date.now() - started} ms`);
      assert.equal(real.isConnected(), false, 'the browser must be closed after a failed setup');
    } finally {
      if (real.isConnected()) await require('../scripts/lib/browser.cjs').closeBrowser(real, 30_000);
    }

    // Given: A healthy session whose browser.close() never settles. Its browser, context and page are
    // created before openPage (so on a loaded machine only the close is measured against the short
    // budget, never the launch or setup).
    const { abandonedBrowserCount, closeBrowser } = require('../scripts/lib/browser.cjs');
    const ready = await require(PLAYWRIGHT_ROOT).chromium.launch({ headless: true, timeout: 60_000 });
    // Kept before any other setup, so the finally below always closes the real Chromium, even when
    // newContext, newPage or openPage fails on a loaded machine.
    const realClose = ready.close.bind(ready);
    try {
      const readyContext = await ready.newContext();
      const readyPage = await readyContext.newPage();
      ready.newContext = async () => readyContext;
      readyContext.newPage = async () => readyPage;
      const session = await withPatchedLaunch(async () => ready, () => openPage({ file, setupTimeoutMs: 3000 }));
      session.browser.close = () => new Promise(() => {});
      // The abandoned-browser count is process-wide (the case above already abandoned one), so the
      // assertion is on the change this close makes, never on the running total.
      const abandonedBefore = abandonedBrowserCount();
      // When: The session is closed.
      const closeStarted = Date.now();
      const { lines } = await captureStderr(() => session.close());
      // Then: close() resolved on its own after the setup budget, warned, and abandoned exactly this
      // browser; the exporter will stop it when it exits (TC-HTMLX-069 CLI case below).
      assert.ok(Date.now() - closeStarted < 10_000, `close took ${Date.now() - closeStarted} ms`);
      assert.match(lines.join('\n'), /did not close within 3000 ms; it is stopped when the exporter exits/);
      assert.equal(abandonedBrowserCount(), abandonedBefore + 1);
    } finally {
      await closeBrowser({ close: realClose }, 30_000);
    }
  });
});

test('TC-HTMLX-069 the CLI exits on its own after a browser close timed out, instead of waiting on the live browser', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A child process that launches Chromium (no short bound on the launch), makes its close()
    // hang, closes it through closeBrowser (what session.close() calls, see the case above), and then
    // ends through the dispatcher's own exitProcess (what `node export.cjs` does on return).
    const harness = writeFixture(testEnv.root, 'exit-harness.cjs', [
      "'use strict';",
      `const { closeBrowser, loadPlaywright } = require(${JSON.stringify(path.join(__dirname, '..', 'scripts', 'lib', 'browser.cjs'))});`,
      `const { exitProcess } = require(${JSON.stringify(path.join(__dirname, '..', 'scripts', 'export.cjs'))});`,
      '(async () => {',
      '  const browser = await loadPlaywright().chromium.launch({ headless: true, timeout: 50000 });',
      '  browser.close = () => new Promise(() => {});',
      '  await closeBrowser(browser, 2000);',
      "  console.log('closed-returned');",
      '  exitProcess(0);',
      '})().catch((error) => { console.error(error.stack || error); process.exit(9); });',
    ].join('\n'));
    // When: It runs.
    const started = Date.now();
    const result = spawnSync(process.execPath, [harness], {
      cwd: testEnv.root, env: testEnv.env, encoding: 'utf8', shell: false, windowsHide: true, timeout: 60_000,
    });
    // Then: It exited 0 well inside the bound (a live browser would otherwise keep Node running), with
    // stdout flushed and the warning on stderr.
    const output = `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`;
    assert.equal(result.error, undefined, `${result.error && result.error.message} after ${Date.now() - started} ms\n${output}`);
    assert.equal(result.status, 0, output);
    assert.match(result.stdout, /closed-returned/);
    assert.match(result.stderr, /did not close within 2000 ms; it is stopped when the exporter exits/);
  });
});

const THROWS_BEFORE_READY_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Throws before ready</title>
<script>window.__ready = false; throw new Error('boom-before-ready');</script>
</head><body><p>Never ready</p></body></html>`;

test('TC-HTMLX-066 a failed open still carries the errors the page raised before it failed', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page that throws, and so never sets window.__ready to true.
    const file = writeFixture(testEnv.root, 'throws-before-ready.html', THROWS_BEFORE_READY_HTML);
    // When: openPage waits for it with a short timeout.
    const failure = await openPage({ file, timeoutMs: 1500 }).then(() => null, (error) => error);
    // Then: The open failed on __ready (a page fault) AND the rejection names the thrown error, so
    // a target can report the cause, not only the symptom.
    assert.ok(failure, 'openPage must reject');
    assert.match(failure.message, /__ready/);
    assert.equal(failure.pageFault, true);
    assert.ok(Array.isArray(failure.pageErrors), 'error.pageErrors must be an array');
    assert.ok(failure.pageErrors.some((entry) => entry.type === 'pageerror' && /boom-before-ready/.test(entry.text)),
      JSON.stringify(failure.pageErrors));
    assert.deepEqual([failure.blocked, failure.offlineAborts], [[], []]);
  });
});

test('TC-HTMLX-065 an unparsable --slides selector is a usage error, never a page fault', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A prototype page.
    const { SlideSelectorError } = require('../scripts/lib/slides.cjs');
    const file = writeFixture(testEnv.root, 'selector.html', PROTO_APP_HTML);
    await withSession({ file, viewport: '800x600' }, async ({ page }) => {
      // When: The navigator is created with a selector the browser cannot parse.
      const failure = await createNavigator(page, '[[bad', { timeoutMs: 5000 }).then(() => null, (error) => error);
      // Then: It rejects with a usage error that names the selector; it is not the page's fault.
      assert.ok(failure instanceof SlideSelectorError, String(failure));
      assert.equal(failure.usage, true);
      assert.equal(isPageFault(failure), false);
      assert.match(failure.message, /the slides selector "\[\[bad" is not a valid CSS selector/);
      // Control: A valid selector on the same page still navigates.
      const navigator = await createNavigator(page, '[data-state]', { timeoutMs: 5000 });
      assert.ok(navigator.count > 0);
    });
  });
});

test('TC-HTMLX-150 a beforeNavigate hook that never finishes is a bounded tool fault, and the browser is closed', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given: A page and a beforeNavigate hook (the video recorder's clock setup runs there) that
    // never settles, as when the browser stops answering right after newPage.
    const file = writeFixture(testEnv.root, 'hook.html', CLOCK_PROBE_HTML);
    let hookPage = null;
    const beforeNavigate = (page) => { hookPage = page; return new Promise(() => {}); };
    // When: openPage runs with a 1500 ms setup budget.
    const started = Date.now();
    const failure = await openPage({ file, beforeNavigate, setupTimeoutMs: 1500 }).then(() => null, (error) => error);
    // Then: It rejected within the bound naming the hook, as a tool fault (never a page fault), and
    // the browser it started is closed.
    assert.ok(failure, 'openPage must not resolve when beforeNavigate never settles');
    assert.match(failure.message, /beforeNavigate did not finish within 1500 ms/);
    assert.equal(failure.pageFault, false);
    assert.ok(Date.now() - started < 10_000, `openPage took ${Date.now() - started} ms`);
    assert.ok(hookPage, 'the hook must have received the page');
    assert.equal(hookPage.context().browser().isConnected(), false, 'the browser must be closed after the failed hook');
    // Control: A hook that finishes still runs before navigation and the session opens.
    await withSession({ file, beforeNavigate: async () => {} }, async ({ page }) => {
      assert.equal(await page.title(), 'Clock probe');
    });
  });
});

test('TC-HTMLX-151 probeChromium bounds the launch, closes a browser that arrives late, and tells a timeout from a missing browser', async () => {
  const { probeChromium } = require('../scripts/lib/browser.cjs');
  // A fake Playwright (injected, so no Chromium is needed) whose launch settles as `settle` says.
  const fakePlaywright = (settle) => ({ chromium: { launch: (options) => settle(options) } });
  const browserDouble = (closed) => ({ close: async () => { closed.push('closed'); } });

  // Given: A launch that answers only after the 100 ms probe budget.
  const lateClosed = [];
  const late = fakePlaywright(() => sleep(400).then(() => browserDouble(lateClosed)));
  // When: The probe runs.
  const started = Date.now();
  const timedOut = await probeChromium({ playwright: late, budgetMs: 100 }).then(() => null, (error) => error);
  // Then: It rejected at the budget as a launch timeout, and the browser that arrived late was
  // still closed (a live one would keep the exporter from exiting).
  assert.ok(timedOut, 'the probe must reject when the launch misses its budget');
  assert.equal(timedOut.launchTimedOut, true);
  assert.match(timedOut.message, /Chromium launch probe did not finish within 100 ms/);
  assert.ok(Date.now() - started < 2000, `probe took ${Date.now() - started} ms`);
  await waitUntil(() => lateClosed.length === 1, 'the late browser to be closed', 5000);

  // Given / When: Playwright's own launch timeout (a TimeoutError) and a browser that is not installed.
  const playwrightTimeout = await probeChromium({
    playwright: fakePlaywright(async () => { throw Object.assign(new Error('browserType.launch: Timeout 30000ms exceeded.'), { name: 'TimeoutError' }); }),
    budgetMs: 5000,
  }).then(() => null, (error) => error);
  const missing = await probeChromium({
    playwright: fakePlaywright(async () => { throw new Error('browserType.launch: Executable doesn\'t exist at /cache/chrome'); }),
    budgetMs: 5000,
  }).then(() => null, (error) => error);
  // Then: Only the timeout is flagged as one; the missing executable is a plain launch failure.
  assert.equal(playwrightTimeout.launchTimedOut, true);
  assert.equal(missing.launchTimedOut, false);
  assert.match(missing.message, /Executable doesn't exist/);

  // Given / When: A healthy launch, and one whose browser fails to close.
  const healthyClosed = [];
  const launches = [];
  await probeChromium({ playwright: fakePlaywright(async (options) => { launches.push(options); return browserDouble(healthyClosed); }), budgetMs: 5000 });
  const { lines } = await captureStderr(() => probeChromium({
    playwright: fakePlaywright(async () => ({ close: async () => { throw new Error('close failed'); } })),
    budgetMs: 5000,
  }));
  // Then: The healthy probe launched headless with the budget and closed its browser once; a failed
  // close only warns, because a launched browser already proves the dependency.
  assert.deepEqual(launches, [{ headless: true, timeout: 5000 }]);
  assert.deepEqual(healthyClosed, ['closed']);
  assert.match(lines.join('\n'), /Warning: the Chromium close probe failed: close failed; continuing\./);
});
