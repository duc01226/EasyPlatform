'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const video = require('../scripts/lib/to-video.cjs');
const ffmpeg = require('../scripts/lib/ffmpeg.cjs');
const { launchBudget } = require('../scripts/lib/browser.cjs');
const { sleep } = require('../scripts/lib/result.cjs');
const { makeTestEnv, copySkillScripts, withBrowserEnv: withIsolatedBrowser, PLAYWRIGHT_ROOT } = require('./test-env.cjs');

const IS_WINDOWS = process.platform === 'win32';
const VIDEO_MODULE = path.resolve(__dirname, '..', 'scripts', 'lib', 'to-video.cjs');
const DISPATCHER_SPAWN_TIMEOUT_MS = 60_000;
const FPS = 30;
const DURATION_MS = 1000;
const VIEWPORT = '160x90';
const CHANGE_FRAME = 20; // 667 ms at 30 fps, after every fixture switches colour at 500 ms.
const RED = 'rgb(200,30,30)';
const BLUE = 'rgb(30,30,200)';

function page(title, body, style = '') {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>html,body{margin:0;height:100%} #box{width:100%;height:100%;background:${RED}}${style}</style>
</head><body><div id="box"></div>
${body}</body></html>`;
}

// Each fixture changes colour at 500 ms through a different time mechanism.
const FIXTURES = Object.freeze({
  seek: page('Seek fixture', `<script>
window.__duration = 1000;
window.__seek = function (ms) {
  document.getElementById('box').style.background = ms >= 500 ? '${BLUE}' : '${RED}';
};
</script>`),
  css: page('CSS keyframes fixture', '', `
#box{animation:flip 1s steps(1,end) forwards}
@keyframes flip{0%{background:${RED}}50%{background:${BLUE}}100%{background:${BLUE}}}
@media (prefers-reduced-motion: reduce){#box{animation:none}}`),
  raf: page('requestAnimationFrame fixture', `<script>
var start = null;
requestAnimationFrame(function tick(timestamp) {
  if (start === null) start = timestamp;
  document.getElementById('box').style.background = timestamp - start >= 500 ? '${BLUE}' : '${RED}';
  requestAnimationFrame(tick);
});
</script>`),
});

// TC-HTMLX-311: __seek updates state and paints on the next animation frame, as component renderers do.
const SEEK_PAINTS_NEXT_FRAME_HTML = page('Seek paints on next frame', `<script>
window.__duration = 1000;
var colour = '${RED}';
window.__seek = function (ms) {
  colour = ms >= 500 ? '${BLUE}' : '${RED}';
  requestAnimationFrame(function () { document.getElementById('box').style.background = colour; });
};
</script>`);

// TC-HTMLX-312, TC-HTMLX-320: __seek returns a promise that waits for an animation frame, which never comes while it runs.
const SEEK_AWAITS_FRAME_HTML = page('Seek awaits a frame', `<script>
window.__duration = 1000;
window.__seek = function (ms) {
  return new Promise(function (resolve) {
    requestAnimationFrame(function () {
      document.getElementById('box').style.background = ms >= 500 ? '${BLUE}' : '${RED}';
      resolve();
    });
  });
};
</script>`);

// window.__ready flips from a 150 ms timer, then a timer-driven change follows at 500 ms of page time.
const TIMER_READY_HTML = page('Timer ready fixture', `<script>
window.__ready = false;
setTimeout(function () {
  window.__ready = true;
  setTimeout(function () { document.getElementById('box').style.background = '${BLUE}'; }, 500);
}, 150);
</script>`);

const PAGE_ERROR_HTML = page('Page error fixture', `<script>
window.__duration = 1000;
window.__seek = function (ms) {
  document.getElementById('box').style.background = ms >= 500 ? '${BLUE}' : '${RED}';
};
throw new Error('boom while loading');
</script>`);

// A remote image under --offline: the aborted request is a consequence of --offline, not a page error.
const OFFLINE_HTML = page('Offline fixture', '<img alt="" src="https://example.invalid/pixel.png">', `
#box{animation:flip 1s steps(1,end) forwards}
@keyframes flip{0%{background:${RED}}50%{background:${BLUE}}100%{background:${BLUE}}}`);

const STILL_HTML = page('Still fixture', '<script>window.__duration = 1000;</script>');

const RECORDING_FLAG_HTML = page('Recording flag fixture', `
<div id="controls" data-export-hide>Play</div>
<script>
window.__sawRecording = window.__recording === true;
</script>`, '#controls{position:fixed;left:0;top:0;width:40px;height:20px;background:#fff}');

// TC-HTMLX-321: reading window.__duration runs a getter that never returns (the page's main thread spins).
const DURATION_HANGS_HTML = page('Duration getter hangs', `<script>
Object.defineProperty(window, '__duration', { get: function () { for (;;) {} } });
</script>`);

// TC-HTMLX-323: __seek throws on every frame.
const SEEK_THROWS_HTML = page('Seek throws', `<script>
window.__duration = 1000;
window.__seek = function () { throw new Error('seek boom'); };
</script>`);

// TC-HTMLX-322: the page declares window.__ready but never sets it to true.
const NEVER_READY_HTML = page('Never ready', `<script>
window.__duration = 1000;
window.__ready = false;
</script>`);

// TC-HTMLX-324: an animation-frame loop that throws once at 300 ms of page time and keeps animating; the
// Playwright clock rethrows that exception from the clock advance instead of raising a pageerror.
const RAF_THROWS_HTML = page('Animation frame throws', `<script>
window.__duration = 1000;
var start = null, thrown = false;
requestAnimationFrame(function tick(timestamp) {
  if (start === null) start = timestamp;
  requestAnimationFrame(tick);
  document.getElementById('box').style.background = timestamp - start >= 500 ? '${BLUE}' : '${RED}';
  if (!thrown && timestamp - start >= 300) { thrown = true; throw new Error('boom in animation frame'); }
});
</script>`);

// TC-HTMLX-325: a timer throws at 50 ms while window.__ready is false; another sets it true at 100 ms.
const TIMER_THROWS_BEFORE_READY_HTML = page('Timer throws before ready', `<script>
window.__duration = 1000;
window.__ready = false;
setTimeout(function () { throw new Error('timer boom before ready'); }, 50);
setTimeout(function () { window.__ready = true; }, 100);
</script>`);

// TC-HTMLX-328: the page throws twice (while loading, and from a timer) and never sets window.__ready.
const THROWS_NEVER_READY_HTML = page('Throws and never ready', `<script>
window.__duration = 1000;
window.__ready = false;
setTimeout(function () { throw new Error('timer boom, never ready'); }, 50);
throw new Error('load boom, never ready');
</script>`);

// TC-HTMLX-326: __seek defers its paint to an animation frame, and that callback throws once at 400 ms.
const SEEK_FRAME_THROWS_HTML = page('Seek frame callback throws', `<script>
window.__duration = 1000;
window.__seek = function (ms) {
  requestAnimationFrame(function () {
    document.getElementById('box').style.background = ms >= 500 ? '${BLUE}' : '${RED}';
    if (ms === 400) throw new Error('boom in seek frame');
  });
};
</script>`);

// TC-HTMLX-327: the page replaces document.getAnimations with one that throws, which breaks animation pinning.
const PIN_BREAKS_HTML = page('Pinning breaks', `<script>
window.__duration = 1000;
document.getAnimations = function () { throw new Error('getAnimations boom'); };
</script>`);

// TC-HTMLX-330: __seek renders frames 0 and 1, then throws from 400 ms on (frame 2 at 5 fps).
const SEEK_THROWS_LATER_HTML = page('Seek throws later', `<script>
window.__duration = 1000;
window.__seek = function (ms) {
  if (ms >= 400) throw new Error('seek boom at ' + ms);
  document.getElementById('box').style.background = '${RED}';
};
</script>`);

// A stand-in for ffmpeg/ffprobe, run as `node fake-ffmpeg.cjs [--fake-*] <ffmpeg args>`. It answers the
// probe calls, and for the encode and GIF passes it writes a small file at the last argument.
const FAKE_FFMPEG_SOURCE = `'use strict';
const fs = require('fs');
const argv = process.argv.slice(2);
const modes = new Set(argv.filter((a) => a.startsWith('--fake-')));
const args = argv.filter((a) => !a.startsWith('--fake-'));
const last = args[args.length - 1];
const mentions = (text) => args.some((a) => a.includes(text));
if (modes.has('--fake-hang')) { setInterval(() => {}, 1000); return; }
if (args[0] === '-version') { console.log('ffmpeg version 9.9-fake'); process.exit(0); }
if (args.includes('-encoders')) {
  console.log('Encoders:\\n V..... = Video\\n ------\\n V....D mpeg4                MPEG-4 part 2'
    + (modes.has('--fake-no-x264') ? '' : '\\n V....D libx264               libx264 H.264 / AVC'));
  process.exit(0);
}
if (args.includes('-show_entries')) { console.log('1.000000'); process.exit(0); }
if (mentions('image2pipe')) {
  let bytes = 0;
  process.stdin.on('data', (chunk) => { bytes += chunk.length; });
  process.stdin.on('end', () => {
    if (modes.has('--fake-encode-fail')) {
      fs.writeFileSync(last, 'partial');
      console.error('fake encoder failed');
      process.exit(1);
    }
    fs.writeFileSync(last, 'fake-mp4 ' + bytes);
    process.exit(0);
  });
  return;
}
if (mentions('palettegen')) {
  if (modes.has('--fake-palette-fail')) { console.error('fake palette pass failed'); process.exit(1); }
  fs.writeFileSync(last, 'palette');
  process.exit(0);
}
if (mentions('paletteuse')) { fs.writeFileSync(last, 'GIF89a-fake'); process.exit(0); }
console.error('fake ffmpeg: unexpected arguments ' + args.join(' '));
process.exit(2);
`;

function writeFile(root, name, content) {
  const file = path.join(root, name);
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

function hasPair(args, first, second) {
  for (let index = 0; index < args.length - 1; index += 1) {
    if (args[index] === first && args[index + 1] === second) return true;
  }
  return false;
}

function baseOptions(extra) {
  return { inputs: [], input: null, to: 'mp4', ...extra };
}

function readManifest(outputDir) {
  return JSON.parse(fs.readFileSync(path.join(outputDir, 'frames.json'), 'utf8'));
}

function workDirs(outputDir) {
  return fs.readdirSync(outputDir).filter((name) => name.startsWith('.video-work-'));
}

// A clean copy of the skill scripts (test-env copySkillScripts: no node_modules) inside the test
// root, run through the real dispatcher. `script` replaces the dispatcher (the helper's own test).
function runCleanDispatcher(testEnv, args, extraEnv, { script = null, timeout = DISPATCHER_SPAWN_TIMEOUT_MS } = {}) {
  const { exportScript } = copySkillScripts(path.join(testEnv.root, 'project'));
  const env = { ...testEnv.env };
  for (const key of Object.keys(env)) {
    if (/^HTML_EXPORT_/i.test(key)) delete env[key];
  }
  Object.assign(env, extraEnv);
  const started = Date.now();
  const result = spawnSync(process.execPath, [script || exportScript, ...args], {
    cwd: testEnv.root,
    env,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout,
  });
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const elapsedMs = Date.now() - started;
  // A spawn timeout keeps the partial output; name it, so a stalled step can be diagnosed.
  if (result.error) {
    assert.fail(`spawn failed after ${elapsedMs} ms: ${result.error.message}\n`
      + `exit ${result.status}\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  }
  return { status: result.status, stdout, stderr, elapsedMs, all: `${stdout}${stderr}` };
}

function withBrowserEnv(t, run) {
  return withIsolatedBrowser(t, run, { prefix: 'html-export-video-' });
}

async function render(file, extra = {}) {
  const session = await video.openRecordingPage({ file, viewport: VIEWPORT, timeoutMs: 20_000, fps: FPS });
  try {
    const capture = await video.captureFrames({ page: session.page, fps: FPS, durationMs: DURATION_MS, ...extra });
    return { ...capture, errors: session.errors };
  } finally {
    await session.close();
  }
}

// Routes every ffmpeg/ffprobe process the video target starts through `node <fake> [modes] <args>`.
// The real spawn, pipe, timeout and exit handling in ffmpeg.cjs still run; only the binary changes.
async function withFakeFfmpeg(root, modes, run) {
  const fake = writeFile(root, 'fake-ffmpeg.cjs', FAKE_FFMPEG_SOURCE);
  const prefix = [fake, ...modes];
  const nodeEnv = { HTML_EXPORT_FFMPEG: process.execPath };
  const original = {
    probeFfmpeg: ffmpeg.probeFfmpeg,
    startEncoder: ffmpeg.startEncoder,
    runFfmpeg: ffmpeg.runFfmpeg,
    probeDuration: ffmpeg.probeDuration,
  };
  const calls = [];
  const fakeSpawn = (binary, args, options) => {
    calls.push({ binary, args });
    return spawnSync(process.execPath, [...prefix, ...args], options);
  };
  ffmpeg.probeFfmpeg = (options = {}) => original.probeFfmpeg({
    ...options, env: { HTML_EXPORT_FFMPEG: path.join(root, IS_WINDOWS ? 'fake-ffmpeg.exe' : 'fake-ffmpeg') }, spawn: fakeSpawn,
  });
  ffmpeg.startEncoder = (options) => original.startEncoder({ ...options, env: nodeEnv, args: [...prefix, ...options.args] });
  ffmpeg.runFfmpeg = (args, options = {}) => original.runFfmpeg([...prefix, ...args], { ...options, env: nodeEnv });
  ffmpeg.probeDuration = () => ffmpeg.parseDuration(fakeSpawn('fake-ffprobe', ['-show_entries'], { encoding: 'utf8' }).stdout);
  try {
    return await run(calls);
  } finally {
    Object.assign(ffmpeg, original);
  }
}

async function captureConsole(run) {
  const lines = [];
  const saved = { log: console.log, error: console.error };
  console.log = (...parts) => lines.push(parts.join(' '));
  console.error = (...parts) => lines.push(parts.join(' '));
  try {
    const result = await run();
    return { result, output: lines.join('\n') };
  } finally {
    Object.assign(console, saved);
  }
}

// Test-owned ffmpeg gate: only "-version" through the OS lookup, never the product probe (TC-HTMLX-305), so a
// product regression in the libx264 check fails TC-HTMLX-083 instead of turning it into a skip.
function ffmpegStatus() {
  for (const [variable, name] of [['HTML_EXPORT_FFMPEG', 'ffmpeg'], ['HTML_EXPORT_FFPROBE', 'ffprobe']]) {
    const binary = process.env[variable] || name;
    const result = spawnSync(binary, ['-version'], { shell: false, windowsHide: true, timeout: 15_000 });
    if (result.error || result.status !== 0) return { available: false, reason: `"${binary} -version" failed` };
  }
  return { available: true, reason: null };
}

function skipWithoutFfmpeg(t) {
  const status = ffmpegStatus();
  if (status.available) return false;
  console.log(`ENVIRONMENT-BLOCKED: ffmpeg (${status.reason})`);
  t.skip(`ENVIRONMENT-BLOCKED: ffmpeg (${status.reason})`);
  return true;
}

test('TC-HTMLX-080 buildMp4Args streams PNG frames into yuv420p faststart H.264, and audio adds aac with -shortest', () => {
  // Given frames piped at 30 fps and no audio
  const silent = ffmpeg.buildMp4Args({ fps: 30, output: 'out.mp4' });
  // Then stdin is an image2pipe input at the frame rate and the output is web-playable H.264
  assert.ok(hasPair(silent, '-f', 'image2pipe'));
  assert.ok(hasPair(silent, '-framerate', '30'));
  assert.ok(hasPair(silent, '-i', '-'));
  assert.ok(hasPair(silent, '-c:v', 'libx264'));
  assert.ok(hasPair(silent, '-pix_fmt', 'yuv420p'));
  assert.ok(hasPair(silent, '-movflags', '+faststart'));
  assert.equal(silent.includes('-shortest'), false, 'no audio means nothing to trim against');
  assert.equal(silent[silent.length - 1], 'out.mp4');

  // Given a user audio file
  const withAudio = ffmpeg.buildMp4Args({ fps: 24, output: 'out.mp4', audio: 'music.m4a' });
  // Then the audio is a second input, encoded as aac and trimmed to the video with -shortest
  assert.ok(withAudio.indexOf('-') < withAudio.indexOf('music.m4a'), 'frames stay input 0, audio input 1');
  assert.ok(hasPair(withAudio, '-i', 'music.m4a'));
  assert.ok(hasPair(withAudio, '-c:a', 'aac'));
  assert.ok(withAudio.includes('-shortest'));
  assert.ok(hasPair(withAudio, '-pix_fmt', 'yuv420p'));
  assert.ok(hasPair(withAudio, '-movflags', '+faststart'));
  assert.equal(withAudio[withAudio.length - 1], 'out.mp4');
});

test('TC-HTMLX-300 buildMp4Args encodes at an explicit constant quality (-crf 18) and preset instead of libx264 defaults', () => {
  // Given any MP4 encode, with or without audio
  for (const args of [ffmpeg.buildMp4Args({ fps: 30, output: 'o.mp4' }), ffmpeg.buildMp4Args({ fps: 30, output: 'o.mp4', audio: 'a.m4a' })]) {
    // Then the video codec carries the quality settings, before the output path
    assert.ok(hasPair(args, '-crf', '18'), args.join(' '));
    assert.ok(hasPair(args, '-preset', 'medium'), args.join(' '));
    assert.ok(args.indexOf('-crf') > args.indexOf('libx264') && args.indexOf('-crf') < args.length - 1);
  }
});

test('TC-HTMLX-081 buildGifArgs runs palettegen before paletteuse on the same scaled stream', () => {
  // Given an intermediate MP4 and the default width
  const passes = ffmpeg.buildGifArgs({ input: 'in.mp4', palette: 'palette.png', output: 'out.gif', fps: 30 });
  // Then pass 1 writes the palette and pass 2 reads it
  assert.equal(passes.length, 2);
  const [paletteArgs, gifArgs] = passes;
  const paletteFilter = paletteArgs[paletteArgs.indexOf('-vf') + 1];
  assert.match(paletteFilter, /scale=960:-1/);
  assert.match(paletteFilter, /palettegen/);
  assert.equal(paletteArgs[paletteArgs.length - 1], 'palette.png');
  assert.ok(hasPair(gifArgs, '-i', 'palette.png'));
  const gifFilter = gifArgs[gifArgs.indexOf('-lavfi') + 1];
  assert.match(gifFilter, /scale=960:-1/);
  assert.match(gifFilter, /paletteuse/);
  assert.equal(gifFilter.includes('palettegen'), false);
  assert.equal(gifArgs[gifArgs.length - 1], 'out.gif');

  // Given --gif-width=480
  const narrow = ffmpeg.buildGifArgs({ input: 'in.mp4', palette: 'p.png', output: 'o.gif', fps: 12, width: 480 });
  // Then both passes use the same width and frame rate
  for (const args of narrow) assert.match(args.join(' '), /fps=12,scale=480:-1/);
});

test('TC-HTMLX-301 a GIF records at 15 fps unless --fps is given, and its palette favours changed regions', () => {
  // Given no --fps: a GIF defaults to 15 fps, an MP4 to 30 fps; an explicit --fps always wins
  assert.equal(video.resolveFps({ to: 'gif' }), 15);
  assert.equal(video.resolveFps({ to: 'mp4' }), 30);
  assert.equal(video.resolveFps({ to: 'gif', fps: 24 }), 24);
  assert.equal(video.resolveFps({ to: 'mp4', fps: 12 }), 12);
  // Then the palette is built from the pixels that change and applied to changed rectangles only
  const [paletteArgs, gifArgs] = ffmpeg.buildGifArgs({ input: 'i.mp4', palette: 'p.png', output: 'o.gif', fps: 15 });
  assert.match(paletteArgs[paletteArgs.indexOf('-vf') + 1], /palettegen=stats_mode=diff/);
  assert.match(gifArgs[gifArgs.indexOf('-lavfi') + 1], /paletteuse=[^;]*diff_mode=rectangle/);
});

test('TC-HTMLX-302 findOnPath searches PATH entries in order and never the current directory', () => {
  const testEnv = makeTestEnv({ prefix: 'html-export-video-path-' });
  const previousCwd = process.cwd();
  try {
    // Given a working directory that holds a planted ffmpeg, also reachable through "", "." and a
    // relative PATH entry, and the real one in the second absolute PATH directory
    const dir = (name) => {
      const full = path.join(testEnv.root, name);
      fs.mkdirSync(full, { recursive: true });
      return full;
    };
    const planted = dir('planted');
    const skipped = dir('skipped');
    const tools = dir('tools');
    const later = dir('later');
    // Windows: only .com/.exe are spawnable without a shell. POSIX: the file must be executable.
    const binaryName = IS_WINDOWS ? 'ffmpeg.exe' : 'ffmpeg';
    const place = (folder, name = binaryName, mode = 0o755) => {
      const file = path.join(folder, name);
      fs.writeFileSync(file, '#!/bin/sh\nexit 0\n');
      if (!IS_WINDOWS) fs.chmodSync(file, mode);
      return file;
    };
    place(planted);
    place(dir(path.join('planted', 'relative-bin')));
    const expected = place(tools);
    place(later);
    // An earlier PATH directory with a candidate the process launcher cannot start is passed over:
    // a .cmd on Windows (needs a shell), a non-executable file on POSIX.
    if (IS_WINDOWS) place(skipped, 'ffmpeg.cmd');
    else place(skipped, 'ffmpeg', 0o644);
    process.chdir(planted);

    const entries = ['', '.', 'relative-bin', skipped, IS_WINDOWS ? `"${tools}"` : tools, later];
    // Windows keeps the variable as "Path" and matches names case-insensitively.
    const env = IS_WINDOWS
      ? { Path: entries.join(path.delimiter), PATHEXT: '.COM;.EXE;.BAT;.CMD' }
      : { PATH: entries.join(path.delimiter) };

    // When the executable is resolved
    // Then the first runnable file in an absolute PATH directory wins, never the working directory
    assert.equal(ffmpeg.findOnPath('ffmpeg', { env }), expected);
    assert.equal(ffmpeg.ffmpegBinary(env), expected);
    // And PATH entries that only point at the working directory resolve to nothing at all
    const cwdOnly = IS_WINDOWS ? { Path: ['', '.', 'relative-bin'].join(';') } : { PATH: ['', '.', 'relative-bin'].join(':') };
    assert.equal(ffmpeg.findOnPath('ffmpeg', { env: cwdOnly }), null);
    assert.equal(ffmpeg.findOnPath('ffmpeg', { env: {} }), null);
    // And an explicit absolute HTML_EXPORT_FFMPEG is used exactly as given
    // An override must name the executable itself: on Windows an .exe (or .com) file.
    const pinned = path.join(later, IS_WINDOWS ? 'pinned-ffmpeg.exe' : 'pinned-ffmpeg');
    assert.equal(ffmpeg.ffmpegBinary({ ...env, HTML_EXPORT_FFMPEG: pinned }), pinned);
    // And a missing tool is reported by the probe as not found on PATH, with install hints
    const probe = ffmpeg.probeFfmpeg({ env: cwdOnly });
    assert.equal(probe.ok, false);
    assert.match(probe.message, /not found on PATH/);
    assert.match(probe.message, /winget install Gyan\.FFmpeg/);
  } finally {
    process.chdir(previousCwd);
    testEnv.cleanup();
  }
});

test('TC-HTMLX-303 a relative HTML_EXPORT_FFMPEG or HTML_EXPORT_FFPROBE is rejected before anything runs', () => {
  // Given overrides judged by each platform's rule (Windows needs a drive root or UNC path)
  const cases = [
    { platform: 'win32', value: 'C:\\tools\\ffmpeg.exe', ok: true },
    { platform: 'win32', value: '\\\\server\\share\\ffmpeg.exe', ok: true },
    { platform: 'win32', value: 'planted', ok: false },
    { platform: 'win32', value: '.\\ffmpeg.exe', ok: false },
    { platform: 'win32', value: '\\tools\\ffmpeg.exe', ok: false },
    { platform: 'win32', value: 'C:ffmpeg.exe', ok: false },
    { platform: 'linux', value: '/usr/bin/ffmpeg', ok: true },
    { platform: 'linux', value: 'bin/ffmpeg', ok: false },
    { platform: 'darwin', value: 'ffmpeg', ok: false },
  ];
  for (const { platform, value, ok } of cases) {
    for (const [variable, resolve] of [['HTML_EXPORT_FFMPEG', ffmpeg.ffmpegBinary], ['HTML_EXPORT_FFPROBE', ffmpeg.ffprobeBinary]]) {
      const env = { [variable]: value };
      // Then an absolute override is used as given, and a relative one throws naming the variable
      if (ok) assert.equal(resolve(env, platform), value, `${platform} ${value}`);
      else assert.throws(() => resolve(env, platform), new RegExp(`${variable} must be an absolute path`), `${platform} ${value}`);
    }
  }
  // When the probe meets a relative override, then it fails with that reason and spawns nothing
  for (const variable of ['HTML_EXPORT_FFMPEG', 'HTML_EXPORT_FFPROBE']) {
    const calls = [];
    const probe = ffmpeg.probeFfmpeg({
      env: { HTML_EXPORT_FFMPEG: '/opt/fake/ffmpeg', [variable]: 'planted' },
      platform: 'linux',
      spawn: (...args) => { calls.push(args); return { status: 0, stdout: '' }; },
    });
    assert.equal(probe.ok, false);
    assert.match(probe.message, new RegExp(`^${variable} must be an absolute path to the executable; got "planted"`));
    assert.deepEqual(calls, []);
  }
});

test('TC-HTMLX-304 the dispatcher exits 3 for a relative HTML_EXPORT_FFMPEG or HTML_EXPORT_FFPROBE, naming it', () => {
  const testEnv = makeTestEnv({ prefix: 'html-export-video-relative-' });
  try {
    const input = writeFile(testEnv.root, 'motion.html', FIXTURES.seek);
    // A real ffmpeg path, so only the relative ffprobe override can fail the second case
    const absolute = process.execPath;
    for (const extraEnv of [{ HTML_EXPORT_FFMPEG: 'planted' }, { HTML_EXPORT_FFMPEG: absolute, HTML_EXPORT_FFPROBE: 'planted' }]) {
      const variable = extraEnv.HTML_EXPORT_FFPROBE ? 'HTML_EXPORT_FFPROBE' : 'HTML_EXPORT_FFMPEG';
      const result = runCleanDispatcher(testEnv,
        ['--to=mp4', input, '--duration=1', `--out=${path.join(testEnv.root, 'out')}`], extraEnv);
      assert.equal(result.status, 3, result.all);
      assert.match(result.all, new RegExp(`${variable} must be an absolute path to the executable; got "planted"`));
    }
  } finally {
    testEnv.cleanup();
  }
});

test('TC-HTMLX-305 the libx264 check reads the encoder list of the probed ffmpeg, independent of the test skip gate', () => {
  const testEnv = makeTestEnv({ prefix: 'html-export-video-x264-' });
  try {
    // Given encoder listings with and without libx264
    assert.equal(ffmpeg.hasLibx264(' V....D libx264              libx264 H.264 / AVC\n'), true);
    assert.equal(ffmpeg.hasLibx264(' V....D libx264rgb           libx264 RGB\n V....D mpeg4  MPEG-4\n'), false);
    assert.equal(ffmpeg.hasLibx264(''), false);
    assert.equal(ffmpeg.hasLibx264(' V....D h264_nvenc           NVIDIA NVENC H.264 encoder (libx264 compatible)\n'), false);

    // Given a stand-in ffmpeg process (a Node script) that prints each listing
    const fake = writeFile(testEnv.root, 'fake-ffmpeg.cjs', FAKE_FFMPEG_SOURCE);
    const calls = [];
    // An absolute path for the probed platform (linux); the stand-in spawn never runs it.
    const pinned = '/opt/fake/ffmpeg';
    const probeWith = (modes) => ffmpeg.probeFfmpeg({
      env: { HTML_EXPORT_FFMPEG: pinned },
      platform: 'linux',
      spawn: (binary, args, options) => {
        calls.push({ binary, args });
        return spawnSync(process.execPath, [fake, ...modes, ...args], options);
      },
    });
    // When the listing lacks libx264, then the probe fails with the libx264 reason (the dispatcher exits 3)
    const missing = probeWith(['--fake-no-x264']);
    assert.equal(missing.ok, false);
    assert.equal(missing.version, 'ffmpeg version 9.9-fake');
    assert.match(missing.message, /has no libx264 encoder/);
    assert.match(missing.message, /apt-get install ffmpeg/);
    // When the listing has libx264, then the probe passes
    const present = probeWith([]);
    assert.deepEqual({ ok: present.ok, message: present.message }, { ok: true, message: null });
    // And both calls went to the configured binary: -version first, then the encoder list
    assert.deepEqual(calls.slice(0, 2), [
      { binary: pinned, args: ['-version'] },
      { binary: pinned, args: ['-hide_banner', '-encoders'] },
    ]);
  } finally {
    testEnv.cleanup();
  }
});

test('TC-HTMLX-306 the dispatcher exits 3 when the probed ffmpeg lacks libx264, and passes the ffmpeg check when it has it', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    const { main } = require('../scripts/export.cjs');
    const input = writeFile(testEnv.root, 'motion.html', FIXTURES.seek);
    const argv = (name) => ['--to=mp4', input, '--duration=0.2', `--viewport=${VIEWPORT}`, `--out=${path.join(testEnv.root, name)}`];
    // Given an ffmpeg without libx264, when the MP4 target runs, then it exits 3 naming libx264
    const without = await withFakeFfmpeg(testEnv.root, ['--fake-no-x264'],
      () => captureConsole(() => main(argv('no-x264'), { cwd: testEnv.root })));
    assert.equal(without.result, 3, without.output);
    assert.match(without.output, /no libx264 encoder/);
    // Given an ffmpeg with libx264, then the run gets past every dependency check and records
    const withX264 = await withFakeFfmpeg(testEnv.root, [],
      () => captureConsole(() => main(argv('x264'), { cwd: testEnv.root })));
    assert.notEqual(withX264.result, 3, withX264.output);
    assert.equal(withX264.result, 0, withX264.output);
  });
});

test('TC-HTMLX-082 a missing ffmpeg exits 3 with install hints before the Playwright check, even without npm deps', () => {
  const testEnv = makeTestEnv({ prefix: 'html-export-video-ffmpeg-' });
  try {
    // Given a clean skill copy with no node_modules and HTML_EXPORT_FFMPEG pointing at nothing
    const input = writeFile(testEnv.root, 'motion.html', FIXTURES.seek);
    const missing = path.join(testEnv.root, 'no-such-dir', 'ffmpeg-missing');
    for (const to of ['mp4', 'gif']) {
      // When the video target runs
      const result = runCleanDispatcher(
        testEnv,
        [`--to=${to}`, input, '--duration=1', `--out=${path.join(testEnv.root, 'out')}`],
        { HTML_EXPORT_FFMPEG: missing },
      );
      // Then it fails as a missing dependency and names ffmpeg with per-OS install commands
      assert.equal(result.status, 3, result.all);
      assert.match(result.all, /ffmpeg/);
      assert.ok(result.all.includes(missing), 'the message names the binary it tried');
      assert.match(result.all, /winget install Gyan\.FFmpeg/);
      assert.match(result.all, /brew install ffmpeg/);
      assert.match(result.all, /apt-get install ffmpeg/);
      assert.doesNotMatch(result.all, /Playwright is not installed/, 'target preflight runs first');
    }
  } finally {
    testEnv.cleanup();
  }
});

test('TC-HTMLX-085 a URL passed to --audio is a usage error before any dependency check, even without npm deps', () => {
  const testEnv = makeTestEnv({ prefix: 'html-export-video-audio-' });
  try {
    // Given a clean skill copy, no ffmpeg and an audio URL
    const input = writeFile(testEnv.root, 'motion.html', FIXTURES.seek);
    // When the MP4 target runs
    const result = runCleanDispatcher(
      testEnv,
      ['--to=mp4', input, '--duration=1', '--audio=https://x/y.mp3', `--out=${path.join(testEnv.root, 'out')}`],
      { HTML_EXPORT_FFMPEG: path.join(testEnv.root, 'ffmpeg-missing') },
    );
    // Then it is rejected as usage (2), not as a missing dependency (3)
    assert.equal(result.status, 2, result.all);
    assert.match(result.all, /--audio must be a local file path/);
    assert.doesNotMatch(result.all, /winget/);
  } finally {
    testEnv.cleanup();
  }
});

test('TC-HTMLX-085 --audio accepts only an existing regular local file', () => {
  const testEnv = makeTestEnv({ prefix: 'html-export-video-audio-unit-' });
  try {
    const input = writeFile(testEnv.root, 'motion.html', FIXTURES.seek);
    const audio = writeFile(testEnv.root, 'voice.m4a', 'not really audio');
    const options = (extra) => baseOptions({ inputs: [input], input, ...extra });

    // An absolute local path (C:\... on Windows, /... on POSIX) is accepted
    assert.doesNotThrow(() => video.validate(options({ audio })));
    assert.equal(video.resolveAudioPath(audio), path.resolve(audio));
    // Protocol-shaped and network values are rejected
    for (const value of ['https://x/y.mp3', 'file:///tmp/a.mp3', 'data:audio/mp3;base64,AA', '\\\\server\\share\\a.mp3', '//server/a.mp3']) {
      assert.throws(() => video.validate(options({ audio: value })), /local file path/, value);
    }
    // A missing file and a directory are rejected
    assert.throws(() => video.validate(options({ audio: path.join(testEnv.root, 'missing.mp3') })), /not found/);
    assert.throws(() => video.validate(options({ audio: testEnv.root })), /regular file/);
    // Audio is an MP4-only option
    assert.throws(() => video.validate(options({ to: 'gif', audio })), /only to --to=mp4/);
  } finally {
    testEnv.cleanup();
  }
});

test('TC-HTMLX-307 video validate enforces fps 1-60, a positive duration, one input and one viewport', () => {
  const testEnv = makeTestEnv({ prefix: 'html-export-video-validate-' });
  try {
    const input = writeFile(testEnv.root, 'motion.html', FIXTURES.css);
    const options = (extra) => baseOptions({ inputs: [input], input, ...extra });

    assert.doesNotThrow(() => video.validate(options({})), 'duration may come from window.__duration');
    assert.doesNotThrow(() => video.validate(options({ fps: 1, duration: 0.5 })));
    assert.doesNotThrow(() => video.validate(options({ fps: 60, to: 'gif', gifWidth: 480 })));
    assert.throws(() => video.validate(options({ fps: 0 })), /--fps must be between 1 and 60/);
    assert.throws(() => video.validate(options({ fps: 61 })), /--fps must be between 1 and 60/);
    assert.throws(() => video.validate(options({ duration: 0 })), /--duration must be greater than 0/);
    assert.throws(() => video.validate(options({ duration: -2 })), /--duration must be greater than 0/);
    assert.throws(() => video.validate(options({ gifWidth: 480 })), /only to --to=gif/);
    assert.throws(() => video.validate(options({ to: 'gif', gifWidth: 0 })), /--gif-width/);
    assert.throws(() => video.validate(options({ viewport: '640x360,320x180' })), /one viewport/);
    assert.throws(() => video.validate(options({ slides: true })), /--slides is not supported/);
    assert.throws(() => video.validate(baseOptions({ inputs: [input, input], input })), /exactly one HTML file/);
    assert.throws(() => video.validate(baseOptions({ inputs: [], input: null })), /exactly one HTML file/);
    const missing = path.join(testEnv.root, 'missing.html');
    assert.throws(() => video.validate(baseOptions({ inputs: [missing], input: missing })), /input file not found/);
  } finally {
    testEnv.cleanup();
  }
});

test('TC-HTMLX-308 frame times are whole milliseconds and the frame count rounds duration x fps', () => {
  // Given exact products, then the count is the product
  assert.equal(video.frameCount(1000, 30), 30);
  assert.equal(video.frameCount(1500, 24), 36);
  // Given a fractional product, then it rounds to the nearest frame: 37.5 up (not floor), 30.3 down (not ceil)
  assert.equal(video.frameCount(1250, 30), 38);
  assert.equal(video.frameCount(1010, 30), 30);
  // Given a duration shorter than one frame, then at least one frame is recorded
  assert.equal(video.frameCount(10, 30), 1, 'at least one frame');
  assert.deepEqual([0, 1, 2, 3, 20].map((index) => video.frameTimeMs(index, 30)), [0, 33, 67, 100, 667]);
  // One frame of page time reaches the next requestAnimationFrame (at most 16 ms away) at every fps.
  assert.ok(video.frameTimeMs(1, 60) >= 16);
  assert.equal(ffmpeg.parseDuration('1.000000\n'), 1);
  assert.throws(() => ffmpeg.parseDuration('N/A'), /no usable duration/);
});

test('TC-HTMLX-309 startEncoder streams every frame byte to the encoder stdin and reports encoder failures with stderr', async () => {
  // Node stands in for ffmpeg so the pipe, backpressure and exit handling run on every machine.
  const env = { HTML_EXPORT_FFMPEG: process.execPath };
  const countingEncoder = [
    '-e',
    'let n = 0; process.stdin.on("data", (c) => { n += c.length; });'
      + ' process.stdin.on("end", () => { require("fs").writeFileSync(process.argv[1], String(n)); });',
  ];
  const testEnv = makeTestEnv({ prefix: 'html-export-video-encoder-' });
  try {
    // Given 40 chunks of 256 KiB, more than any pipe buffer holds
    const countFile = path.join(testEnv.root, 'count.txt');
    const encoder = ffmpeg.startEncoder({ args: [...countingEncoder, countFile], env });
    const chunk = Buffer.alloc(256 * 1024, 7);
    for (let index = 0; index < 40; index += 1) await encoder.write(chunk);
    // When the stream is finished
    await encoder.finish();
    // Then the encoder received every byte
    assert.equal(fs.readFileSync(countFile, 'utf8'), String(40 * chunk.length));

    // Given an encoder that fails after reading its input
    const failing = ffmpeg.startEncoder({
      args: ['-e', 'process.stdin.resume(); process.stdin.on("end", () => { console.error("Unknown encoder x"); process.exit(3); });'],
      env,
    });
    await failing.write(chunk);
    // Then finish rejects with the encoder's own error text
    await assert.rejects(failing.finish(), /exit 3.*Unknown encoder x/s);

    // Given an encoder that exits before the frames arrive
    const early = ffmpeg.startEncoder({ args: ['-e', 'console.error("bad option"); process.exit(1);'], env });
    // Then a write reports the encoder exit rather than a bare pipe error
    await assert.rejects(async () => {
      for (let index = 0; index < 40; index += 1) await early.write(chunk);
      await early.finish();
    }, /bad option/);

    // runFfmpeg reports a failed pass the same way
    await assert.rejects(ffmpeg.runFfmpeg(['-e', 'console.error("palette failed"); process.exit(2);'], { env }), /palette failed/);
  } finally {
    testEnv.cleanup();
  }
});

test('TC-HTMLX-310 every ffmpeg pass is bounded: a stalled pass is stopped and reported instead of hanging', async () => {
  const env = { HTML_EXPORT_FFMPEG: process.execPath };
  const hang = 'setInterval(() => {}, 1000);';
  const started = Date.now();
  // Given a GIF pass that never ends, when it runs with a 300 ms budget, then it is stopped and rejected
  await assert.rejects(ffmpeg.runFfmpeg(['-e', hang], { env, timeoutMs: 300 }), /did not finish within 300 ms/);
  // Given an encoder that reads its input but never exits, then finish() rejects after the budget
  const lingering = ffmpeg.startEncoder({ args: ['-e', `process.stdin.resume(); ${hang}`], env, timeoutMs: 300 });
  await lingering.write(Buffer.alloc(1024));
  await assert.rejects(lingering.finish(), /did not finish encoding within 300 ms/);
  // Given an encoder that never reads its input, then a write that cannot flush rejects after the budget
  const stalled = ffmpeg.startEncoder({ args: ['-e', hang], env, timeoutMs: 300 });
  await assert.rejects(async () => {
    const chunk = Buffer.alloc(256 * 1024, 1);
    for (let index = 0; index < 64; index += 1) await stalled.write(chunk);
  }, /did not accept a frame within 300 ms/);
  await stalled.abort();
  assert.ok(Date.now() - started < 15_000, `bounded passes took ${Date.now() - started} ms`);
});

for (const [name, expectedSource] of [['seek', video.TIME_SOURCE_SEEK], ['css', video.TIME_SOURCE_CLOCK], ['raf', video.TIME_SOURCE_CLOCK]]) {
  test(`TC-HTMLX-084 ${name} fixture: two renders give identical frame hashes and frame 0 differs from frame ${CHANGE_FRAME}`, async (t) => {
    await withBrowserEnv(t, async (testEnv) => {
      // Given an animation that changes colour at 500 ms
      const file = writeFile(testEnv.root, `${name}.html`, FIXTURES[name]);
      // When it is recorded twice at 30 fps for one second
      const first = await render(file);
      const second = await render(file);
      // Then the frame content is identical across renders and the animation actually moved
      assert.equal(first.timeSource, expectedSource);
      assert.equal(first.frames.length, 30);
      assert.deepEqual(first.errors, []);
      assert.deepEqual(first.frames.map((frame) => frame.sha256), second.frames.map((frame) => frame.sha256));
      assert.notEqual(first.frames[0].sha256, first.frames[CHANGE_FRAME].sha256,
        `frame 0 and frame ${CHANGE_FRAME} must differ; the recorder did not advance ${name} time`);
      assert.equal(first.frames[0].sha256, first.frames[1].sha256, 'nothing changes before 500 ms');
      assert.equal(first.identicalFrames, false);
    });
  });
}

test('TC-HTMLX-311 a __seek that paints on the next animation frame is captured after that frame, deterministically', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given a __seek that sets state and defers the paint to requestAnimationFrame
    const file = writeFile(testEnv.root, 'seek-next-frame.html', SEEK_PAINTS_NEXT_FRAME_HTML);
    // When it is recorded twice
    const first = await render(file);
    const second = await render(file);
    // Then the recorder ran the scheduled frame before each screenshot: the colour change is visible
    assert.equal(first.timeSource, video.TIME_SOURCE_SEEK);
    assert.deepEqual(first.errors, []);
    assert.notEqual(first.frames[0].sha256, first.frames[CHANGE_FRAME].sha256,
      'frame 0 and frame 20 are identical: the paint __seek scheduled never ran before the screenshot');
    assert.equal(first.frames[0].sha256, first.frames[1].sha256);
    assert.equal(first.identicalFrames, false);
    // And the result is still the same on every render
    assert.deepEqual(first.frames.map((frame) => frame.sha256), second.frames.map((frame) => frame.sha256));
  });
});

// The per-frame timeout, then at most one browser close budget (browser.cjs launchBudget: closing a
// busy renderer took over 30 s on a loaded machine), plus margin. A real hang never rejects, so it is
// still killed by the test timeout and fails.
const SEEK_HANG_RUN_BOUND_MS = 1500 + 30_000 + 15_000;

test('TC-HTMLX-312 a __seek that waits for an animation frame stops at the per-frame timeout instead of hanging', { timeout: SEEK_HANG_RUN_BOUND_MS + 30_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given a __seek whose promise waits for requestAnimationFrame, which cannot fire while it runs
    const file = writeFile(testEnv.root, 'seek-awaits-frame.html', SEEK_AWAITS_FRAME_HTML);
    const started = Date.now();
    // When it is recorded with a 1500 ms per-frame timeout
    // Then capture stops at frame 0 with a message that names __seek and the fix
    await assert.rejects(render(file, { timeoutMs: 1500 }), (error) => {
      assert.ok(error instanceof video.FrameCaptureError, String(error));
      assert.equal(error.step, 'seek');
      assert.equal(error.frameIndex, 0);
      assert.equal(error.timedOut, true);
      assert.equal(error.pageFault, true);
      assert.match(error.message, /window\.__seek\(ms\) did not finish within 1500 ms/);
      assert.match(error.message, /must not\s+wait on requestAnimationFrame/);
      assert.deepEqual(error.capturedFrames, []);
      return true;
    });
    assert.ok(Date.now() - started < SEEK_HANG_RUN_BOUND_MS, `took ${Date.now() - started} ms`);
  });
});

test('TC-HTMLX-313 a timer-driven window.__ready settles at the same page time on every render', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given a page whose ready signal and first change both come from timers
    const file = writeFile(testEnv.root, 'timer-ready.html', TIMER_READY_HTML);
    // When it is recorded twice
    const first = await render(file);
    const second = await render(file);
    // Then recording starts at the same page time (the first frame step at or after 150 ms) and the frames match
    assert.equal(first.clockStartMs, second.clockStartMs);
    const readyAfterMs = first.clockStartMs - video.CLOCK_ORIGIN_MS;
    assert.ok(readyAfterMs >= 150 && readyAfterMs < 150 + 34, `clock started ${readyAfterMs} ms after the origin`);
    assert.deepEqual(first.frames.map((frame) => frame.sha256), second.frames.map((frame) => frame.sha256));
    assert.notEqual(first.frames[0].sha256, first.frames[CHANGE_FRAME].sha256);
  });
});

test('TC-HTMLX-314 the page sees window.__recording before its scripts run, and data-export-hide elements are hidden', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given a page with preview controls marked data-export-hide
    const file = writeFile(testEnv.root, 'recording-flag.html', RECORDING_FLAG_HTML);
    // When it is opened for recording
    const session = await video.openRecordingPage({ file, viewport: VIEWPORT, timeoutMs: 20_000, fps: FPS });
    try {
      const state = await session.page.evaluate((attribute) => {
        const late = document.createElement('div');
        late.setAttribute(attribute, '');
        document.body.appendChild(late);
        return {
          sawRecording: window.__sawRecording,
          recording: window.__recording,
          controls: getComputedStyle(document.getElementById('controls')).visibility,
          late: getComputedStyle(late).visibility,
          box: getComputedStyle(document.getElementById('box')).visibility,
        };
      }, video.HIDE_ATTRIBUTE);
      // Then the flag was already true while the page's own script ran
      assert.equal(state.sawRecording, true);
      assert.equal(state.recording, true);
      // And marked elements, including ones added later, are hidden while the rest stays visible
      assert.deepEqual({ controls: state.controls, late: state.late, box: state.box },
        { controls: 'hidden', late: 'hidden', box: 'visible' });
    } finally {
      await session.close();
    }
  });
});

test('TC-HTMLX-315 a recording session keeps page errors and sets offline aborts apart', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    const { splitOfflineErrors } = require('../scripts/lib/browser.cjs');
    // Given a page that throws while loading, then the recording session reports it as a page error
    const throwing = await video.openRecordingPage({
      file: writeFile(testEnv.root, 'throws.html', PAGE_ERROR_HTML), viewport: VIEWPORT, timeoutMs: 20_000, fps: FPS,
    });
    try {
      const split = splitOfflineErrors(throwing.errors, throwing.blocked);
      assert.equal(split.pageErrors.length, 1);
      assert.match(split.pageErrors[0].text, /boom while loading/);
    } finally {
      await throwing.close();
    }
    // Given a remote image under --offline, then the aborted request is not a page error
    const offline = await video.openRecordingPage({
      file: writeFile(testEnv.root, 'offline.html', OFFLINE_HTML), viewport: VIEWPORT, timeoutMs: 20_000, fps: FPS, offline: true,
    });
    try {
      assert.ok(offline.blocked.some((url) => url.startsWith('https://example.invalid/')), JSON.stringify(offline.blocked));
      assert.deepEqual(splitOfflineErrors(offline.errors, offline.blocked).pageErrors, []);
    } finally {
      await offline.close();
    }
  });
});

test('TC-HTMLX-316 without --duration or window.__duration the video target exits 2 and writes nothing', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    // Given a CSS animation with no window.__duration, and no --duration
    const input = writeFile(testEnv.root, 'no-duration.html', FIXTURES.css);
    const outputDir = path.join(testEnv.root, 'out');
    // When the MP4 target runs
    const { result, output } = await captureConsole(() => video.run(baseOptions({ inputs: [input], input, viewport: VIEWPORT, outputDir })));
    // Then it is a usage error, before any encoder starts, and no work files remain
    assert.equal(result, 2, output);
    assert.match(output, /--duration=<seconds>/);
    assert.deepEqual(fs.readdirSync(outputDir), []);

    // Given --keep-frames and frames an earlier run kept, when the same usage error happens
    const keptDir = path.join(testEnv.root, 'kept');
    fs.mkdirSync(path.join(keptDir, 'frames'), { recursive: true });
    writeFile(path.join(keptDir, 'frames'), 'frame-00000.png', 'earlier frame');
    const kept = await captureConsole(() => video.run(baseOptions({
      inputs: [input], input, viewport: VIEWPORT, outputDir: keptDir, keepFrames: true,
    })));
    // Then the earlier frames are not emptied
    assert.equal(kept.result, 2, kept.output);
    assert.deepEqual(fs.readdirSync(path.join(keptDir, 'frames')), ['frame-00000.png']);
    assert.equal(fs.readFileSync(path.join(keptDir, 'frames', 'frame-00000.png'), 'utf8'), 'earlier frame');
    // And in a fresh directory no frames/ directory is created
    const freshDir = path.join(testEnv.root, 'fresh');
    const fresh = await captureConsole(() => video.run(baseOptions({
      inputs: [input], input, viewport: VIEWPORT, outputDir: freshDir, keepFrames: true,
    })));
    assert.equal(fresh.result, 2, fresh.output);
    assert.deepEqual(fs.readdirSync(freshDir), []);
  });
});

test('TC-HTMLX-317 --keep-frames refuses an <out>/frames it did not write, exits 2 and changes nothing', async () => {
  const testEnv = makeTestEnv({ prefix: 'html-export-video-frames-' });
  try {
    // Given an --out whose frames/ holds a file the recorder never writes, next to its frame files
    const input = writeFile(testEnv.root, 'motion.html', FIXTURES.seek);
    const outputDir = path.join(testEnv.root, 'assets');
    const framesDir = path.join(outputDir, 'frames');
    fs.mkdirSync(path.join(framesDir, 'nested'), { recursive: true });
    writeFile(framesDir, 'keepme.txt', 'user file');
    writeFile(framesDir, 'frame-00001.png', 'frame');
    const before = fs.readdirSync(framesDir).sort();
    // When the video target runs with --keep-frames (the check runs before the browser starts)
    const { result, output } = await captureConsole(() => video.run(baseOptions({
      inputs: [input], input, duration: 1, viewport: VIEWPORT, outputDir, keepFrames: true,
    })));
    // Then it is a usage error that names the directory and the foreign entries
    assert.equal(result, 2, output);
    assert.ok(output.includes(framesDir), output);
    assert.match(output, /did not write \(.*keepme\.txt/);
    assert.match(output, /Nothing was changed/);
    // And every entry, including the recorder-shaped one, is left exactly as it was; no manifest is written
    assert.deepEqual(fs.readdirSync(framesDir).sort(), before);
    assert.equal(fs.readFileSync(path.join(framesDir, 'keepme.txt'), 'utf8'), 'user file');
    assert.equal(fs.existsSync(path.join(outputDir, 'frames.json')), false);
    assert.deepEqual(workDirs(outputDir), []);

    // Given frames/ is a file rather than a directory, then it is refused the same way
    const fileDir = path.join(testEnv.root, 'file-out');
    fs.mkdirSync(fileDir, { recursive: true });
    writeFile(fileDir, 'frames', 'not a directory');
    const notDir = await captureConsole(() => video.run(baseOptions({
      inputs: [input], input, duration: 1, viewport: VIEWPORT, outputDir: fileDir, keepFrames: true,
    })));
    assert.equal(notDir.result, 2, notDir.output);
    assert.match(notDir.output, /not a directory/);
    assert.equal(fs.readFileSync(path.join(fileDir, 'frames'), 'utf8'), 'not a directory');
  } finally {
    testEnv.cleanup();
  }
});

test('TC-HTMLX-318 --keep-frames replaces only an earlier run\'s frame files with this run\'s frames', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      // Given frames/ holding frame files from an earlier, longer run, and that run's video
      const input = writeFile(testEnv.root, 'seek.html', FIXTURES.seek);
      const outputDir = path.join(testEnv.root, 'out');
      fs.mkdirSync(path.join(outputDir, 'frames'), { recursive: true });
      writeFile(path.join(outputDir, 'frames'), 'frame-00099.png', 'earlier frame');
      writeFile(outputDir, 'seek.mp4', 'stale');
      // When a 5-frame recording keeps its frames
      const { result, output } = await captureConsole(() => video.run(baseOptions({
        inputs: [input], input, fps: 5, viewport: VIEWPORT, outputDir, keepFrames: true,
      })));
      // Then the earlier frame is gone and exactly this run's frames remain, as real PNGs
      assert.equal(result, 0, output);
      const names = fs.readdirSync(path.join(outputDir, 'frames')).sort();
      assert.deepEqual(names, ['frame-00000.png', 'frame-00001.png', 'frame-00002.png', 'frame-00003.png', 'frame-00004.png']);
      const png = fs.readFileSync(path.join(outputDir, 'frames', names[0]));
      assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG');
      // And the earlier video was replaced by this run's, with no work files left behind
      assert.match(fs.readFileSync(path.join(outputDir, 'seek.mp4'), 'utf8'), /^fake-mp4 \d+/);
      assert.deepEqual(workDirs(outputDir), []);
    });
  });
});

test('TC-HTMLX-319 page errors while recording exit 4 with the files written; --allow-errors exits 0; --offline aborts are not errors', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      const runIn = (name, html, extra) => {
        const input = writeFile(testEnv.root, `${name}.html`, html);
        const outputDir = path.join(testEnv.root, name);
        return captureConsole(() => video.run(baseOptions({ inputs: [input], input, fps: 5, viewport: VIEWPORT, outputDir, ...extra })))
          .then(({ result, output }) => ({ result, output, outputDir, manifest: readManifest(outputDir) }));
      };
      // Given a page that throws while loading, when it is recorded, then the exit is 4 and the files are still written
      const blocked = await runIn('throws', PAGE_ERROR_HTML, {});
      assert.equal(blocked.result, 4, blocked.output);
      assert.ok(fs.existsSync(path.join(blocked.outputDir, 'throws.mp4')));
      assert.equal(blocked.manifest.status, 'page-errors');
      assert.equal(blocked.manifest.exitCode, 4);
      assert.match(blocked.manifest.pageErrors.join('\n'), /boom while loading/);
      assert.match(blocked.output, /pass --allow-errors/);
      // Given the same page with --allow-errors, then the exit is 0 and the errors stay on record
      const allowed = await runIn('throws-allowed', PAGE_ERROR_HTML, { allowErrors: true });
      assert.equal(allowed.result, 0, allowed.output);
      assert.equal(allowed.manifest.status, 'ok');
      assert.equal(allowed.manifest.pageErrors.length, 1);
      // Given a remote image recorded with --offline, then the aborted request does not fail the export
      const offline = await runIn('offline', OFFLINE_HTML, { offline: true, duration: 1 });
      assert.equal(offline.result, 0, offline.output);
      assert.deepEqual(offline.manifest.pageErrors, []);
      assert.equal(offline.manifest.noMotion, false);
    });
  });
});

test('TC-HTMLX-320 a recording whose __seek never settles exits 4, records the failure in frames.json and leaves an earlier video untouched', { timeout: 60_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      // Given a __seek that waits for an animation frame, and a video from an earlier run
      const input = writeFile(testEnv.root, 'stuck.html', SEEK_AWAITS_FRAME_HTML);
      const outputDir = path.join(testEnv.root, 'out');
      fs.mkdirSync(outputDir, { recursive: true });
      writeFile(outputDir, 'stuck.mp4', 'stale');
      // When it is recorded with --timeout=1500
      const { result, output } = await captureConsole(() => video.run(baseOptions({
        inputs: [input], input, fps: 5, viewport: VIEWPORT, outputDir, timeout: 1500,
      })));
      // Then the page is at fault (exit 4), stderr and frames.json name the frame and the step
      assert.equal(result, 4, output);
      assert.match(output, /Recording failed \(capture\): frame 0 \(0 ms\): window\.__seek\(ms\) did not finish within 1500 ms/);
      const manifest = readManifest(outputDir);
      assert.equal(manifest.status, 'failed');
      assert.equal(manifest.exitCode, 4);
      assert.deepEqual(
        {
          stage: manifest.failure.stage, step: manifest.failure.step, frameIndex: manifest.failure.frameIndex,
          timedOut: manifest.failure.timedOut, pageFault: manifest.failure.pageFault,
        },
        { stage: 'capture', step: 'seek', frameIndex: 0, timedOut: true, pageFault: true },
      );
      // And the run wrote no video (output null); the earlier file it did not write is left as it was
      assert.equal(manifest.output, null);
      assert.equal(fs.readFileSync(path.join(outputDir, 'stuck.mp4'), 'utf8'), 'stale');
      assert.deepEqual(workDirs(outputDir), []);
    });
  });
});

// Records `html` with the fake encoder and returns the exit code, console output and frames.json.
async function recordFailure(testEnv, name, html, extra = {}) {
  const input = writeFile(testEnv.root, `${name}.html`, html);
  const outputDir = path.join(testEnv.root, name);
  const started = Date.now();
  const { result, output } = await captureConsole(() => video.run(baseOptions({
    inputs: [input], input, fps: 5, viewport: VIEWPORT, outputDir, ...extra,
  })));
  return { result, output, outputDir, elapsedMs: Date.now() - started, manifest: readManifest(outputDir) };
}

// A spinning __duration getter: the 3 s timeout, one responsiveness ping, and at most one browser
// close budget (closing a spinning renderer took over 30 s on a loaded machine), plus margin; the
// same formula as browser.test.cjs's never-ready bound. A hang never ends, so it still fails.
const DURATION_HANG_RUN_BOUND_MS = 3000 + 1000 + launchBudget(3000) + 10_000;

test('TC-HTMLX-321 a window.__duration getter that never returns is bounded by --timeout and exits 4 as a page fault', { timeout: DURATION_HANG_RUN_BOUND_MS + 30_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      // Given a page whose __duration getter spins forever, and no --duration
      // When it is recorded with --timeout=3000
      const run = await recordFailure(testEnv, 'duration-hangs', DURATION_HANGS_HTML, { timeout: 3000 });
      // Then the read is abandoned at the timeout instead of hanging, and the page is at fault
      assert.equal(run.result, 4, run.output);
      assert.ok(run.elapsedMs < DURATION_HANG_RUN_BOUND_MS, `took ${run.elapsedMs} ms (bound ${DURATION_HANG_RUN_BOUND_MS} ms)`);
      assert.match(run.output, /Recording failed \(duration\): reading window\.__duration did not finish within 3000 ms/);
      const { failure } = run.manifest;
      assert.deepEqual(
        {
          status: run.manifest.status, exitCode: run.manifest.exitCode, stage: failure.stage,
          step: failure.step, timedOut: failure.timedOut, pageFault: failure.pageFault, output: run.manifest.output,
        },
        { status: 'failed', exitCode: 4, stage: 'duration', step: 'duration', timedOut: true, pageFault: true, output: null },
      );
      assert.match(failure.message, /^reading window\.__duration did not finish within 3000 ms/);
      assert.equal(fs.existsSync(path.join(run.outputDir, 'duration-hangs.mp4')), false);
      assert.deepEqual(workDirs(run.outputDir), []);
    });
  });
});

test('TC-HTMLX-322 a page that never sets window.__ready to true exits 4 as a page fault, recorded in frames.json', { timeout: 60_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      // Given a page that holds window.__ready === false forever
      // When it is recorded with --timeout=2000
      const run = await recordFailure(testEnv, 'never-ready', NEVER_READY_HTML, { timeout: 2000 });
      // Then the open stage fails as the page's fault (exit 4), not a tool fault (exit 1)
      assert.equal(run.result, 4, run.output);
      assert.match(run.output, /Recording failed \(open\):.*window\.__ready/s);
      assert.deepEqual(
        {
          status: run.manifest.status, exitCode: run.manifest.exitCode, stage: run.manifest.failure.stage,
          step: run.manifest.failure.step, pageFault: run.manifest.failure.pageFault, output: run.manifest.output,
        },
        { status: 'failed', exitCode: 4, stage: 'open', step: 'load', pageFault: true, output: null },
      );
      assert.match(run.manifest.failure.message, /window\.__ready/);
      assert.deepEqual(workDirs(run.outputDir), []);
    });
  });
});

test('TC-HTMLX-323 a __seek that throws exits 4 as a page fault, naming the frame and the step', { timeout: 60_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      // Given a __seek that throws
      // When it is recorded
      const run = await recordFailure(testEnv, 'seek-throws', SEEK_THROWS_HTML);
      // Then capture stops at frame 0: the page is at fault (4), and it was a throw, not a timeout
      assert.equal(run.result, 4, run.output);
      assert.match(run.output, /Recording failed \(capture\): frame 0 \(0 ms\): window\.__seek\(ms\) failed: .*seek boom/);
      const { failure } = run.manifest;
      assert.deepEqual(
        { stage: failure.stage, step: failure.step, frameIndex: failure.frameIndex, timedOut: failure.timedOut, pageFault: failure.pageFault },
        { stage: 'capture', step: 'seek', frameIndex: 0, timedOut: false, pageFault: true },
      );
      assert.deepEqual({ status: run.manifest.status, exitCode: run.manifest.exitCode, output: run.manifest.output },
        { status: 'failed', exitCode: 4, output: null });
      assert.equal(fs.existsSync(path.join(run.outputDir, 'seek-throws.mp4')), false);
      assert.deepEqual(workDirs(run.outputDir), []);
    });
  });
});

test('TC-HTMLX-324 an animation-frame callback that throws mid-recording is a page error: exit 4 with the files written, 0 with --allow-errors', { timeout: 90_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      // Given a requestAnimationFrame loop (clock+waapi path) that throws once at 300 ms and keeps animating
      // When it is recorded at 5 fps for 1 s
      const run = await recordFailure(testEnv, 'raf-throws', RAF_THROWS_HTML);
      // Then the throw is a page error, not a tool fault: exit 4, the video is written, no failure recorded
      assert.equal(run.result, 4, run.output);
      const { manifest } = run;
      assert.deepEqual(
        { status: manifest.status, exitCode: manifest.exitCode, failure: manifest.failure, output: manifest.output },
        { status: 'page-errors', exitCode: 4, failure: null, output: 'raf-throws.mp4' },
      );
      assert.ok(fs.existsSync(path.join(run.outputDir, 'raf-throws.mp4')));
      assert.equal(manifest.timeSource, video.TIME_SOURCE_CLOCK);
      // And frames.json names the exception and where it was thrown
      assert.equal(manifest.pageErrors.length, 1, manifest.pageErrors.join('\n'));
      assert.match(manifest.pageErrors[0], /^pageerror: Error: boom in animation frame \(thrown by a timer or animation-frame callback during the clock advance to frame 2 \(400 ms\)\)/);
      assert.match(run.output, /pass --allow-errors/);
      // And recording went on after the throw: every frame was captured and the colour change at 500 ms is in it
      assert.equal(manifest.frames.length, 5);
      assert.notEqual(manifest.frames[0].sha256, manifest.frames[4].sha256, 'recording stopped at the throw');
      assert.equal(manifest.noMotion, false);

      // Given the same page with --allow-errors, then the export succeeds and the error stays on record
      const allowed = await recordFailure(testEnv, 'raf-throws-allowed', RAF_THROWS_HTML, { allowErrors: true });
      assert.equal(allowed.result, 0, allowed.output);
      assert.deepEqual({ status: allowed.manifest.status, failure: allowed.manifest.failure }, { status: 'ok', failure: null });
      assert.equal(allowed.manifest.pageErrors.length, 1);
      assert.deepEqual(workDirs(run.outputDir), []);
    });
  });
});

test('TC-HTMLX-325 a timer that throws while window.__ready is false is recorded and the recorder keeps pumping to ready', { timeout: 90_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      // Given a page whose 50 ms timer throws before its 100 ms timer sets window.__ready = true
      // When it is recorded at 30 fps (one 33 ms clock step per pump) with --timeout=5000
      const run = await recordFailure(testEnv, 'ready-throws', TIMER_THROWS_BEFORE_READY_HTML, { fps: FPS, timeout: 5000 });
      // Then the page became ready and was recorded: exit 4 for the page error, not a ready timeout
      assert.equal(run.result, 4, run.output);
      assert.doesNotMatch(run.output, /did not become true/);
      assert.deepEqual(
        { status: run.manifest.status, failure: run.manifest.failure, output: run.manifest.output, frames: run.manifest.frames.length },
        { status: 'page-errors', failure: null, output: 'ready-throws.mp4', frames: 30 },
      );
      // And recording started once the ready timer ran, after the throw
      const readyAfterMs = run.manifest.clockStartMs - video.CLOCK_ORIGIN_MS;
      assert.ok(readyAfterMs >= 100 && readyAfterMs < 100 + 34, `clock started ${readyAfterMs} ms after the origin`);
      // And frames.json names the timer's exception
      assert.equal(run.manifest.pageErrors.length, 1, run.manifest.pageErrors.join('\n'));
      assert.match(run.manifest.pageErrors[0], /Error: timer boom before ready \(thrown by a timer or animation-frame callback while window\.__ready was false\)/);

      // Given --allow-errors, then the same recording exits 0 and keeps the error on record
      const allowed = await recordFailure(testEnv, 'ready-throws-allowed', TIMER_THROWS_BEFORE_READY_HTML,
        { fps: FPS, timeout: 5000, allowErrors: true });
      assert.equal(allowed.result, 0, allowed.output);
      assert.equal(allowed.manifest.status, 'ok');
      assert.match(allowed.manifest.pageErrors.join('\n'), /timer boom before ready/);
    });
  });
});

test('TC-HTMLX-326 on the __seek path, a throwing callback __seek scheduled is a page error and recording continues', { timeout: 60_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      // Given a __seek whose deferred paint throws at 400 ms (frame 2 at 5 fps)
      // When it is recorded
      const run = await recordFailure(testEnv, 'seek-frame-throws', SEEK_FRAME_THROWS_HTML);
      // Then exit 4 with the video written, every frame captured, and the error named with its step
      assert.equal(run.result, 4, run.output);
      assert.deepEqual(
        { status: run.manifest.status, failure: run.manifest.failure, frames: run.manifest.frames.length, timeSource: run.manifest.timeSource },
        { status: 'page-errors', failure: null, frames: 5, timeSource: video.TIME_SOURCE_SEEK },
      );
      assert.equal(run.manifest.pageErrors.length, 1, run.manifest.pageErrors.join('\n'));
      assert.match(run.manifest.pageErrors[0], /boom in seek frame \(thrown by a timer or animation-frame callback during the one-frame clock advance after window\.__seek to frame 2 \(400 ms\)\)/);
      assert.notEqual(run.manifest.frames[0].sha256, run.manifest.frames[4].sha256, 'recording stopped at the throw');
    });
  });
});

test('TC-HTMLX-327 a page that breaks animation pinning exits 4 as a page fault, not 1 as a tool fault', { timeout: 60_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      // Given a page whose document.getAnimations throws (the recorder pins animations through it)
      // When it is recorded
      const run = await recordFailure(testEnv, 'pin-breaks', PIN_BREAKS_HTML);
      // Then capture stops at frame 0 on the pin step, and the page is at fault
      assert.equal(run.result, 4, run.output);
      const { failure } = run.manifest;
      assert.deepEqual(
        { status: run.manifest.status, stage: failure.stage, step: failure.step, frameIndex: failure.frameIndex, timedOut: failure.timedOut, pageFault: failure.pageFault },
        { status: 'failed', stage: 'capture', step: 'pin', frameIndex: 0, timedOut: false, pageFault: true },
      );
      assert.match(failure.message, /pinning CSS and Web Animations failed: .*getAnimations boom/);
    });
  });
});

test('TC-HTMLX-328 when the page never gets ready, frames.json and stderr name the errors it raised before the open failed', { timeout: 60_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      // Given a page that throws while loading, throws again from a timer, and never sets window.__ready
      // When it is recorded with --timeout=2000
      const run = await recordFailure(testEnv, 'throws-never-ready', THROWS_NEVER_READY_HTML, { timeout: 2000 });
      // Then the open fails as the page's fault (exit 4)
      assert.equal(run.result, 4, run.output);
      assert.deepEqual(
        { status: run.manifest.status, stage: run.manifest.failure.stage, pageFault: run.manifest.failure.pageFault, output: run.manifest.output },
        { status: 'failed', stage: 'open', pageFault: true, output: null },
      );
      // And both exceptions are listed, the load-time one (openPage) and the timer one (the ready pump)
      const listed = run.manifest.pageErrors.join('\n');
      assert.equal(run.manifest.pageErrors.length, 2, listed);
      assert.match(listed, /load boom, never ready/);
      assert.match(listed, /timer boom, never ready \(thrown by a timer or animation-frame callback while window\.__ready was false\)/);
      assert.match(run.output, /The page also reported 2 error\(s\):[\s\S]*load boom, never ready/);
    });
  });
});

test('TC-HTMLX-329 a tool fault while the page also reported errors exits 4 and reports both; with --allow-errors it exits 1', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, ['--fake-encode-fail'], async () => {
      // Given a page that throws while loading, and an encoder that fails
      // When it is recorded
      const run = await recordFailure(testEnv, 'throws-encode-fails', PAGE_ERROR_HTML);
      // Then the page errors decide the exit (4) while the failure itself stays a tool fault
      assert.equal(run.result, 4, run.output);
      assert.deepEqual(
        { status: run.manifest.status, exitCode: run.manifest.exitCode, stage: run.manifest.failure.stage, pageFault: run.manifest.failure.pageFault },
        { status: 'failed', exitCode: 4, stage: 'encode', pageFault: false },
      );
      assert.match(run.manifest.pageErrors.join('\n'), /boom while loading/);
      // And stderr names both the tool failure and the page error
      assert.match(run.output, /Recording failed \(encode\):.*fake encoder failed/s);
      assert.match(run.output, /The page also reported 1 error\(s\):\s+pageerror: boom while loading/);

      // Given --allow-errors, then only the tool fault is left: exit 1, the page error still listed
      const allowed = await recordFailure(testEnv, 'throws-encode-fails-allowed', PAGE_ERROR_HTML, { allowErrors: true });
      assert.equal(allowed.result, 1, allowed.output);
      assert.equal(allowed.manifest.exitCode, 1);
      assert.equal(allowed.manifest.pageErrors.length, 1);
      assert.match(allowed.output, /The page also reported 1 error\(s\) \(allowed by --allow-errors\)/);
    });
  });
});

test('TC-HTMLX-330 a failed --keep-frames run leaves an earlier run\'s frames exactly as they were', { timeout: 60_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      // Given frames/ holding a frame file from an earlier run
      const outputDir = path.join(testEnv.root, 'seek-throws-later');
      const framesDir = path.join(outputDir, 'frames');
      fs.mkdirSync(framesDir, { recursive: true });
      writeFile(framesDir, 'frame-00077.png', 'earlier frame');
      // When a --keep-frames recording captures two frames and then __seek throws
      const run = await recordFailure(testEnv, 'seek-throws-later', SEEK_THROWS_LATER_HTML, { keepFrames: true });
      assert.equal(run.result, 4, run.output);
      assert.equal(run.manifest.status, 'failed');
      assert.equal(run.manifest.frames.length, 2, 'two frames were captured before the failure');
      // Then the earlier frame is still there, untouched, and no frame of the failed run reached frames/
      assert.deepEqual(fs.readdirSync(framesDir), ['frame-00077.png']);
      assert.equal(fs.readFileSync(path.join(framesDir, 'frame-00077.png'), 'utf8'), 'earlier frame');
      assert.deepEqual(workDirs(outputDir), []);
    });
  });
});

test('TC-HTMLX-331 a recording in which nothing moves is written with a no-motion warning', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      // Given a page with nothing animated
      const input = writeFile(testEnv.root, 'still.html', STILL_HTML);
      const outputDir = path.join(testEnv.root, 'out');
      // When it is recorded
      const { result, output } = await captureConsole(() => video.run(baseOptions({ inputs: [input], input, fps: 5, viewport: VIEWPORT, outputDir })));
      // Then the export succeeds, but stderr and frames.json say every frame is identical
      assert.equal(result, 0, output);
      assert.match(output, /Warning: all 5 frames are identical/);
      const manifest = readManifest(outputDir);
      assert.equal(manifest.noMotion, true);
      assert.match(manifest.warnings.join('\n'), /frames are identical/);
    });
  });
});

test('TC-HTMLX-332 a failed MP4 encode exits 1 as a tool fault, leaves no partial file and leaves an earlier video untouched', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, ['--fake-encode-fail'], async () => {
      // Given an encoder that writes part of the file and then fails, and a video from an earlier run
      const input = writeFile(testEnv.root, 'seek.html', FIXTURES.seek);
      const outputDir = path.join(testEnv.root, 'out');
      fs.mkdirSync(outputDir, { recursive: true });
      writeFile(outputDir, 'seek.mp4', 'stale');
      // When the MP4 target records
      const { result, output } = await captureConsole(() => video.run(baseOptions({ inputs: [input], input, fps: 5, viewport: VIEWPORT, outputDir })));
      // Then it exits 1 with the encoder's reason on stderr and in frames.json
      assert.equal(result, 1, output);
      assert.match(output, /Recording failed \(encode\):.*fake encoder failed/s);
      const manifest = readManifest(outputDir);
      assert.deepEqual({
        status: manifest.status, exitCode: manifest.exitCode, stage: manifest.failure.stage,
        pageFault: manifest.failure.pageFault, output: manifest.output,
      }, { status: 'failed', exitCode: 1, stage: 'encode', pageFault: false, output: null });
      assert.match(manifest.failure.message, /fake encoder failed/);
      assert.equal(manifest.frames.length, 5, 'the captured frames stay on record');
      // And the partial encode never reached the output path, while the earlier file stays as it was
      assert.equal(fs.readFileSync(path.join(outputDir, 'seek.mp4'), 'utf8'), 'stale');
      assert.deepEqual(workDirs(outputDir), []);
    });
  });
});

test('TC-HTMLX-333 when a GIF palette pass fails, the recorded MP4 is kept and the failure is reported', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, ['--fake-palette-fail'], async () => {
      // Given a palette pass that fails
      const input = writeFile(testEnv.root, 'seek.html', FIXTURES.seek);
      const outputDir = path.join(testEnv.root, 'out');
      // When the GIF target records without --fps
      const { result, output } = await captureConsole(() => video.run(baseOptions({
        to: 'gif', inputs: [input], input, duration: 1, viewport: VIEWPORT, outputDir,
      })));
      // Then it exits 1, keeps the MP4, writes no GIF and says so on stderr and in frames.json
      assert.equal(result, 1, output);
      assert.match(output, /Recording failed \(gif\):.*fake palette pass failed/s);
      assert.match(output, /Kept the recorded MP4/);
      assert.match(fs.readFileSync(path.join(outputDir, 'seek.mp4'), 'utf8'), /^fake-mp4 \d+/);
      assert.equal(fs.existsSync(path.join(outputDir, 'seek.gif')), false);
      const manifest = readManifest(outputDir);
      assert.deepEqual({ status: manifest.status, stage: manifest.failure.stage, keptOutput: manifest.keptOutput, fps: manifest.fps },
        { status: 'failed', stage: 'gif', keptOutput: 'seek.mp4', fps: 15 });
      assert.equal(manifest.frames.length, 15, 'a GIF records at 15 fps by default');
      assert.deepEqual(workDirs(outputDir), []);

      // Given an MP4 from an earlier run where the kept MP4 would go
      const occupiedDir = path.join(testEnv.root, 'occupied');
      fs.mkdirSync(occupiedDir, { recursive: true });
      writeFile(occupiedDir, 'seek.mp4', 'earlier');
      const occupied = await captureConsole(() => video.run(baseOptions({
        to: 'gif', inputs: [input], input, duration: 1, viewport: VIEWPORT, outputDir: occupiedDir,
      })));
      // Then the failed GIF run does not overwrite it, and says the recording was not kept
      assert.equal(occupied.result, 1, occupied.output);
      assert.match(occupied.output, /recorded MP4 was not kept: .*already exists/);
      assert.equal(fs.readFileSync(path.join(occupiedDir, 'seek.mp4'), 'utf8'), 'earlier');
      assert.equal(readManifest(occupiedDir).keptOutput, null);
      assert.deepEqual(workDirs(occupiedDir), []);
    });
  });
});

test('TC-HTMLX-083 the seek fixture recorded for 1 s at 30 fps lasts 1.000 +/- 0.034 s', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    if (skipWithoutFfmpeg(t)) return;
    // Given the seek fixture and a fresh output directory
    const input = writeFile(testEnv.root, 'seek.html', FIXTURES.seek);
    const outputDir = path.join(testEnv.root, 'out-mp4');
    // When the MP4 target records it
    const code = await video.run(baseOptions({
      inputs: [input], input, fps: FPS, duration: 1, viewport: VIEWPORT, outputDir, keepFrames: true,
    }));
    // Then the encoded duration is within one frame of 1 s and the manifest lists every frame
    assert.equal(code, 0);
    const duration = ffmpeg.probeDuration(path.join(outputDir, 'seek.mp4'));
    assert.ok(Math.abs(duration - 1) <= 0.034, `ffprobe duration ${duration}`);
    const manifest = readManifest(outputDir);
    assert.equal(manifest.status, 'ok');
    assert.equal(manifest.frames.length, 30);
    assert.equal(manifest.timeSource, video.TIME_SOURCE_SEEK);
    assert.equal(manifest.noMotion, false);
    assert.equal(fs.readdirSync(path.join(outputDir, 'frames')).length, 30);
    assert.deepEqual(workDirs(outputDir), [], 'work files removed');
  });
});

test('TC-HTMLX-083 --to=gif writes a GIF through the palette passes, at 15 fps by default', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    if (skipWithoutFfmpeg(t)) return;
    const input = writeFile(testEnv.root, 'seek.html', FIXTURES.seek);
    const outputDir = path.join(testEnv.root, 'out-gif');
    const code = await video.run(baseOptions({
      to: 'gif', inputs: [input], input, duration: 1, viewport: VIEWPORT, gifWidth: 80, outputDir,
    }));
    assert.equal(code, 0);
    const gif = fs.readFileSync(path.join(outputDir, 'seek.gif'));
    assert.equal(gif.subarray(0, 6).toString('latin1'), 'GIF89a');
    assert.equal(readManifest(outputDir).frames.length, 15);
    assert.deepEqual(workDirs(outputDir), [], 'work files removed');
  });
});

test('TC-HTMLX-334 with real ffmpeg: a page error still writes the MP4 and exits 4', async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    if (skipWithoutFfmpeg(t)) return;
    const input = writeFile(testEnv.root, 'throws.html', PAGE_ERROR_HTML);
    const outputDir = path.join(testEnv.root, 'out');
    const code = await video.run(baseOptions({ inputs: [input], input, fps: 10, viewport: VIEWPORT, outputDir }));
    assert.equal(code, 4);
    assert.ok(ffmpeg.probeDuration(path.join(outputDir, 'throws.mp4')) > 0.9);
    assert.equal(readManifest(outputDir).status, 'page-errors');
  });
});

test('TC-HTMLX-335 the clean-dispatcher spawn helper names the child output when the child is killed on a spawn timeout', () => {
  const testEnv = makeTestEnv({ prefix: 'html-export-video-helper-' });
  try {
    // Given a child that prints where it is and then never ends
    const stalled = writeFile(testEnv.root, 'stalled.cjs',
      "process.stdout.write('reached-step-capture\\n'); process.stderr.write('last-stderr-line\\n'); setInterval(() => {}, 1000);");
    // When the helper runs it with a spawn timeout long enough for the child to start under load
    // Then it fails, and the failure carries the elapsed time and the partial stdout and stderr
    assert.throws(() => runCleanDispatcher(testEnv, [], {}, { script: stalled, timeout: 10_000 }), (error) => {
      assert.match(error.message, /spawn failed after \d+ ms: .*ETIMEDOUT/);
      assert.match(error.message, /reached-step-capture/);
      assert.match(error.message, /last-stderr-line/);
      return true;
    });
  } finally {
    testEnv.cleanup();
  }
});

test('TC-HTMLX-336 a failed output rename exits 1 at stage "output" and leaves frames/ and the output path untouched', { timeout: 90_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      // Given --keep-frames, frames/ holding an earlier run's frame, and a DIRECTORY at the output
      // path (the rename of the video into place fails on Windows, macOS and Linux alike)
      const outputDir = path.join(testEnv.root, 'blocked');
      const framesDir = path.join(outputDir, 'frames');
      fs.mkdirSync(framesDir, { recursive: true });
      writeFile(framesDir, 'frame-00077.png', 'earlier frame');
      fs.mkdirSync(path.join(outputDir, 'blocked.mp4'));
      writeFile(path.join(outputDir, 'blocked.mp4'), 'keep.txt', 'user file');
      // When the recording succeeds but cannot be moved into place
      const run = await recordFailure(testEnv, 'blocked', FIXTURES.seek, { keepFrames: true });
      // Then it is a tool fault at the output step, not the encode step
      assert.equal(run.result, 1, run.output);
      assert.match(run.output, /Recording failed \(output\):/);
      const { manifest } = run;
      assert.deepEqual(
        { status: manifest.status, exitCode: manifest.exitCode, stage: manifest.failure.stage, pageFault: manifest.failure.pageFault, output: manifest.output },
        { status: 'failed', exitCode: 1, stage: 'output', pageFault: false, output: null },
      );
      // And frames/ still holds exactly the earlier frame, and the directory is as it was
      assert.deepEqual(fs.readdirSync(framesDir), ['frame-00077.png']);
      assert.equal(fs.readFileSync(path.join(framesDir, 'frame-00077.png'), 'utf8'), 'earlier frame');
      assert.deepEqual(fs.readdirSync(path.join(outputDir, 'blocked.mp4')), ['keep.txt']);
      assert.deepEqual(workDirs(outputDir), []);

      // Given the same blocked output path without --keep-frames, then the stage is still "output"
      const plain = await recordFailure(testEnv, 'blocked', FIXTURES.seek);
      assert.equal(plain.result, 1, plain.output);
      assert.equal(plain.manifest.failure.stage, 'output');
      assert.deepEqual(fs.readdirSync(path.join(outputDir, 'blocked.mp4')), ['keep.txt']);
      assert.deepEqual(workDirs(outputDir), []);
    });
  });
});

// Makes fs.renameSync fail with EPERM (as a Windows lock does) when a work folder's frames/ is moved
// to <out>/frames, so the frames swap fails after the video is already in place (putting the
// earlier frames back still works).
async function withFramesSwapFailing(run) {
  const original = fs.renameSync;
  fs.renameSync = function renameSync(from, to, ...rest) {
    if (path.basename(String(from)) === 'frames' && path.basename(String(to)) === 'frames'
      && path.basename(path.dirname(String(from))).startsWith('.video-work-')) {
      throw Object.assign(new Error(`EPERM: operation not permitted, rename '${from}' -> '${to}'`), { code: 'EPERM' });
    }
    return original.call(this, from, to, ...rest);
  };
  try {
    return await run();
  } finally {
    fs.renameSync = original;
  }
}

test('TC-HTMLX-337 when the frames swap fails, the earlier frames and the earlier video (or none) are put back', { timeout: 90_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      await withFramesSwapFailing(async () => {
        // Given --keep-frames, an earlier run's frame and video, and a frames swap that fails
        const outputDir = path.join(testEnv.root, 'swap');
        const framesDir = path.join(outputDir, 'frames');
        fs.mkdirSync(framesDir, { recursive: true });
        writeFile(framesDir, 'frame-00077.png', 'earlier frame');
        writeFile(outputDir, 'swap.mp4', 'stale');
        // When the recording is committed
        const run = await recordFailure(testEnv, 'swap', FIXTURES.seek, { keepFrames: true });
        // Then the run fails at the frames step as a tool fault
        assert.equal(run.result, 1, run.output);
        assert.deepEqual(
          { status: run.manifest.status, stage: run.manifest.failure.stage, output: run.manifest.output },
          { status: 'failed', stage: 'frames', output: null },
        );
        assert.match(run.manifest.failure.message, /EPERM/);
        // And the earlier frames and the earlier video are exactly as they were
        assert.deepEqual(fs.readdirSync(framesDir), ['frame-00077.png']);
        assert.equal(fs.readFileSync(path.join(framesDir, 'frame-00077.png'), 'utf8'), 'earlier frame');
        assert.equal(fs.readFileSync(path.join(outputDir, 'swap.mp4'), 'utf8'), 'stale');
        assert.deepEqual(workDirs(outputDir), []);

        // Given no earlier video, when the frames swap fails, then this run's video is removed again
        const freshDir = path.join(testEnv.root, 'swap-fresh');
        fs.mkdirSync(path.join(freshDir, 'frames'), { recursive: true });
        writeFile(path.join(freshDir, 'frames'), 'frame-00001.png', 'earlier frame');
        const fresh = await recordFailure(testEnv, 'swap-fresh', FIXTURES.seek, { keepFrames: true });
        assert.equal(fresh.result, 1, fresh.output);
        assert.equal(fresh.manifest.failure.stage, 'frames');
        assert.equal(fs.existsSync(path.join(freshDir, 'swap-fresh.mp4')), false);
        assert.deepEqual(fs.readdirSync(path.join(freshDir, 'frames')), ['frame-00001.png']);
        assert.deepEqual(workDirs(freshDir), []);
      });
    });
  });
});

// A stand-in page for the ready pump: 'loading' until loadMs of real time passed, then 'waiting'
// until the clock was advanced stepsToReady times (each advance takes stepWallMs), then 'settled'.
function fakeReadyPage({ loadMs = Infinity, stepsToReady = 0, stepWallMs = 0 } = {}) {
  const started = Date.now();
  const state = { steps: 0, closed: false };
  return {
    state,
    isClosed: () => state.closed,
    evaluate: async () => {
      if (Date.now() - started < loadMs) return 'loading';
      return state.steps >= stepsToReady ? 'settled' : 'waiting';
    },
    clock: {
      runFor: async () => {
        await sleep(stepWallMs);
        state.steps += 1;
      },
    },
  };
}

test('TC-HTMLX-338 the ready pump measures its --timeout budget from load, so a slow load is not a false page fault', { timeout: 30_000 }, async () => {
  // Given a page that takes 1.6 s to load and then needs 10 clock steps of 80 ms each (0.8 s) to set
  // window.__ready, with a 2 s budget: the load alone leaves only 0.4 s of a budget counted from the
  // start, but the whole 2 s when counted from load
  const page = fakeReadyPage({ loadMs: 1600, stepsToReady: 10, stepWallMs: 80 });
  const pageErrors = [];
  // When the pump runs
  const fault = await video.advanceUntilReady(page, 33, 2000, pageErrors, {});
  // Then it pumped until the page was ready instead of stopping at the deadline
  assert.equal(fault, null);
  assert.equal(page.state.steps, 10, `the pump stopped after ${page.state.steps} of 10 steps`);
  assert.deepEqual(pageErrors, []);
});

test('TC-HTMLX-339 the ready pump stops once the open fails, even before the page loaded', { timeout: 60_000 }, async () => {
  // Given a page that never loads, and a long --timeout
  const page = fakeReadyPage();
  const control = { stopped: false };
  const started = Date.now();
  // When the open fails 200 ms in (openRecordingPage sets control.stopped)
  setTimeout(() => { control.stopped = true; }, 200);
  const pump = video.advanceUntilReady(page, 33, 40_000, [], control);
  // The bound's timer is cleared once the race settles, so it cannot hold the test process open.
  let bound;
  const outcome = await Promise.race([
    pump.then(() => 'ended'),
    new Promise((resolve) => { bound = setTimeout(resolve, 5_000, 'still polling'); }),
  ]);
  clearTimeout(bound);
  // (A pump that ignored the signal is ended by closing the page, so this case fails instead of hanging.)
  page.state.closed = true;
  const fault = await pump;
  // Then the pump ends at once instead of polling a page that will never load
  assert.equal(outcome, 'ended', `the pump was still polling ${Date.now() - started} ms after the open failed`);
  assert.equal(fault, null);
  assert.equal(page.state.steps, 0);
});

// Makes fs.rmSync fail (as a Windows scanner holding a file does) for the recorder's work folder only.
async function withWorkDirRemovalFailing(run) {
  const original = fs.rmSync;
  fs.rmSync = function rmSync(target, ...rest) {
    if (path.basename(String(target)).startsWith('.video-work-')) {
      throw Object.assign(new Error(`EBUSY: resource busy or locked, rmdir '${target}'`), { code: 'EBUSY' });
    }
    return original.call(this, target, ...rest);
  };
  try {
    return await run();
  } finally {
    fs.rmSync = original;
  }
}

test('TC-HTMLX-340 a work folder that cannot be removed is a warning and never replaces the run\'s result', { timeout: 90_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      await withWorkDirRemovalFailing(async () => {
        // Given a recording that succeeds, and a work folder that cannot be removed
        const run = await recordFailure(testEnv, 'locked-ok', FIXTURES.seek);
        // Then the run still exits 0 with its video and frames.json, and the leftover is a warning
        assert.equal(run.result, 0, run.output);
        assert.deepEqual({ status: run.manifest.status, exitCode: run.manifest.exitCode, output: run.manifest.output },
          { status: 'ok', exitCode: 0, output: 'locked-ok.mp4' });
        assert.ok(fs.existsSync(path.join(run.outputDir, 'locked-ok.mp4')));
        assert.match(run.manifest.warnings.join('\n'), /could not remove the work folder .*EBUSY/);
        assert.match(run.output, /Warning: could not remove the work folder/);
        assert.equal(workDirs(run.outputDir).length, 1, 'the folder that could not be removed is still there');
      });
    });
    await withFakeFfmpeg(testEnv.root, ['--fake-encode-fail'], async () => {
      await withWorkDirRemovalFailing(async () => {
        // Given a recording whose encode fails, and a work folder that cannot be removed
        const run = await recordFailure(testEnv, 'locked-failed', FIXTURES.seek);
        // Then the encode failure keeps its exit code (1) and frames.json, with the warning on stderr
        assert.equal(run.result, 1, run.output);
        assert.deepEqual({ status: run.manifest.status, stage: run.manifest.failure.stage }, { status: 'failed', stage: 'encode' });
        assert.match(run.output, /Warning: could not remove the work folder/);
      });
    });
  });
});

test('TC-HTMLX-341 the exit hook removes the work folder when the process exits early (Ctrl+C exits 130)', () => {
  const testEnv = makeTestEnv({ prefix: 'html-export-video-exit-' });
  try {
    // Given a work folder with frames under the hook, and a second folder whose hook was removed
    const workDir = path.join(testEnv.root, 'out', '.video-work-abc');
    const disposedDir = path.join(testEnv.root, 'out', '.video-work-def');
    const script = [
      'const fs = require("fs");',
      'const path = require("path");',
      `const { removeOnExit } = require(${JSON.stringify(VIDEO_MODULE)});`,
      'const [workDir, disposedDir] = process.argv.slice(1);',
      'for (const dir of [workDir, disposedDir]) {',
      '  fs.mkdirSync(path.join(dir, "frames"), { recursive: true });',
      '  fs.writeFileSync(path.join(dir, "frames", "frame-00000.png"), "frame");',
      '}',
      'removeOnExit(workDir);',
      'removeOnExit(disposedDir)();',
      // What Playwright's SIGINT handler does after closing its browsers.
      'process.exit(130);',
    ].join('\n');
    // When the process exits before run() could clean up
    const result = spawnSync(process.execPath, ['-e', script, workDir, disposedDir], {
      cwd: testEnv.root, env: testEnv.env, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000,
    });
    assert.ifError(result.error);
    // Then the exit code is the interrupt's, the hooked folder is gone, and the disposed one is kept
    assert.equal(result.status, 130, result.stderr);
    assert.equal(fs.existsSync(workDir), false, 'the work folder was left behind');
    assert.equal(fs.existsSync(path.join(disposedDir, 'frames', 'frame-00000.png')), true);
  } finally {
    testEnv.cleanup();
  }
});

// The recorder's own exit hooks (to-video removeOnExit names its listener); Playwright registers
// exit handlers of its own while it launches the browser, so a raw listener count would not do.
function workDirExitHooks() {
  return process.listeners('exit').filter((listener) => listener.name === 'removeVideoWorkDir').length;
}

test('TC-HTMLX-342 a run holds the exit hook only while it runs, on success and on failure', { timeout: 90_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    for (const [name, modes, expected] of [['hook-ok', [], 0], ['hook-failed', ['--fake-encode-fail'], 1]]) {
      await withFakeFfmpeg(testEnv.root, modes, async () => {
        // Given the exit listeners before the run, and a probe at the moment the encoder starts
        const before = workDirExitHooks();
        let during = null;
        const startEncoder = ffmpeg.startEncoder;
        ffmpeg.startEncoder = (options) => {
          during = workDirExitHooks();
          return startEncoder(options);
        };
        // When the recording runs
        const run = await recordFailure(testEnv, name, FIXTURES.seek);
        // Then one exit hook was held during the run and none is left afterwards
        assert.equal(run.result, expected, run.output);
        assert.equal(during, before + 1, 'no exit hook guarded the work folder during the run');
        assert.equal(workDirExitHooks(), before, 'the exit hook leaked past the run');
      });
    }
  });
});

// TC-HTMLX-343: the load handler leaves the input document, so every later check sees about:blank.
const NAVIGATES_AWAY_ON_LOAD_HTML = page('Navigates away on load', `<script>
addEventListener('load', function () { location.href = 'about:blank'; });
</script>`);
const NAVIGATE_AWAY_TIMEOUT_MS = 3000;
// Measured from the browser launch: one ready check in flight and the hide call (each bounded by
// --timeout), plus margin for the page load on a busy machine. A pump that never stops has no bound.
const NAVIGATE_AWAY_BOUND_MS = 2 * NAVIGATE_AWAY_TIMEOUT_MS + 10_000;

// Records every browser openPage launches on the ONE skill-local Playwright instance (require cache),
// so a test can close a session it never got back; always puts the original launch back.
async function withLaunchedBrowsers(run) {
  const { chromium } = require(PLAYWRIGHT_ROOT);
  const own = Object.getOwnPropertyDescriptor(chromium, 'launch');
  const original = chromium.launch;
  const launched = { browsers: [], at: null };
  chromium.launch = async (options) => {
    const browser = await original.call(chromium, options);
    launched.browsers.push(browser);
    launched.at = Date.now();
    return browser;
  };
  try {
    return await run(launched);
  } finally {
    if (own) Object.defineProperty(chromium, 'launch', own);
    else delete chromium.launch;
  }
}

test('TC-HTMLX-343 a page that navigates away while loading still ends the recording open within its bound instead of hanging the ready pump', { timeout: launchBudget(NAVIGATE_AWAY_TIMEOUT_MS) + NAVIGATE_AWAY_BOUND_MS + 30_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withLaunchedBrowsers(async (launched) => {
      // Given a page whose load handler navigates to about:blank, and a 3 s --timeout
      const file = writeFile(testEnv.root, 'navigates-away.html', NAVIGATES_AWAY_ON_LOAD_HTML);
      // When it is opened for recording
      const opening = video.openRecordingPage({ file, viewport: VIEWPORT, timeoutMs: NAVIGATE_AWAY_TIMEOUT_MS, fps: FPS })
        .then((session) => ({ session }), (error) => ({ error }));
      let timer;
      const bound = new Promise((resolve) => {
        const check = () => {
          if (launched.at !== null && Date.now() - launched.at >= NAVIGATE_AWAY_BOUND_MS) resolve('still pending');
          else timer = setTimeout(check, 100);
        };
        check();
      });
      const outcome = await Promise.race([opening.then(() => 'settled'), bound]);
      clearTimeout(timer);
      const elapsedMs = launched.at === null ? null : Date.now() - launched.at;
      // (An open that never ends is ended by closing its browser, so this case fails instead of hanging.)
      if (outcome !== 'settled') await Promise.all(launched.browsers.map((browser) => browser.close().catch(() => {})));
      const { session, error } = await opening;
      if (session) await session.close();
      // Then the open settled within the bound: opened, or a failure classified as page or tool fault
      assert.equal(outcome, 'settled', `the open was still pending ${elapsedMs} ms after the browser launched`);
      if (error) assert.equal(typeof error.pageFault, 'boolean', `unclassified failure: ${error.message}`);
    });
  });
});

// Makes fs.renameSync fail with EPERM (as a Windows lock does) for every rename `failing(from, to)`
// selects; any other rename runs as usual.
async function withRenamesFailing(failing, run) {
  const original = fs.renameSync;
  fs.renameSync = function renameSync(from, to, ...rest) {
    if (failing(String(from), String(to))) {
      throw Object.assign(new Error(`EPERM: operation not permitted, rename '${from}' -> '${to}'`), { code: 'EPERM' });
    }
    return original.call(this, from, to, ...rest);
  };
  try {
    return await run();
  } finally {
    fs.renameSync = original;
  }
}

const inWorkDir = (file) => path.basename(path.dirname(file)).startsWith('.video-work-');
// The encoded video moving from the work folder to <out>/<stem>.mp4.
const isOutputRename = (from, to) => inWorkDir(from) && path.extname(from) === '.mp4' && !inWorkDir(to);
// Putting the earlier video, set aside as <work>/previous-output, back at the output path.
const isOutputRestore = (from, to) => inWorkDir(from) && path.basename(from) === 'previous-output' && !inWorkDir(to);

test('TC-HTMLX-344 when the video cannot be moved into place with --keep-frames, the earlier video is put back and frames/ stays as it was', { timeout: 90_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      await withRenamesFailing(isOutputRename, async () => {
        // Given --keep-frames, an earlier run's frame and video, and a move of the new video into place that fails
        const outputDir = path.join(testEnv.root, 'rename');
        const framesDir = path.join(outputDir, 'frames');
        fs.mkdirSync(framesDir, { recursive: true });
        writeFile(framesDir, 'frame-00077.png', 'earlier frame');
        writeFile(outputDir, 'rename.mp4', 'stale');
        // When the recording is committed
        const run = await recordFailure(testEnv, 'rename', FIXTURES.seek, { keepFrames: true });
        // Then the run fails at the output step as a tool fault
        assert.equal(run.result, 1, run.output);
        assert.deepEqual(
          { status: run.manifest.status, stage: run.manifest.failure.stage, output: run.manifest.output },
          { status: 'failed', stage: 'output', output: null },
        );
        assert.match(run.manifest.failure.message, /EPERM/);
        // And the earlier video is back at the output path, frames/ is untouched, and no work folder is left
        assert.equal(fs.readFileSync(path.join(outputDir, 'rename.mp4'), 'utf8'), 'stale');
        assert.deepEqual(fs.readdirSync(framesDir), ['frame-00077.png']);
        assert.equal(fs.readFileSync(path.join(framesDir, 'frame-00077.png'), 'utf8'), 'earlier frame');
        assert.deepEqual(workDirs(outputDir), []);
      });
    });
  });
});

test('TC-HTMLX-345 when the earlier video cannot be put back either, the work folder holding its only copy is kept and named', { timeout: 90_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      await withRenamesFailing((from, to) => isOutputRename(from, to) || isOutputRestore(from, to), async () => {
        // Given --keep-frames, an earlier run's video, and both the move into place and its rollback failing
        const outputDir = path.join(testEnv.root, 'stuck');
        fs.mkdirSync(outputDir, { recursive: true });
        writeFile(outputDir, 'stuck.mp4', 'stale');
        // When the recording is committed
        const run = await recordFailure(testEnv, 'stuck', FIXTURES.seek, { keepFrames: true });
        // Then the run fails at the output step, and the failure says where the earlier video now is
        assert.equal(run.result, 1, run.output);
        assert.equal(run.manifest.failure.stage, 'output');
        assert.match(run.output, /could not be put back .*so the earlier copy is kept at .*previous-output/);
        // And exactly one work folder is kept, holding the earlier video unchanged
        const kept = workDirs(outputDir);
        assert.equal(kept.length, 1, `work folders left: ${kept.join(', ')}`);
        assert.equal(fs.readFileSync(path.join(outputDir, kept[0], 'previous-output'), 'utf8'), 'stale');
        assert.equal(fs.existsSync(path.join(outputDir, 'stuck.mp4')), false);
      });
    });
  });
});

test('TC-HTMLX-346 a frames/ that gained a file while recording is refused at commit and left untouched, with the earlier video', { timeout: 90_000 }, async (t) => {
  await withBrowserEnv(t, async (testEnv) => {
    await withFakeFfmpeg(testEnv.root, [], async () => {
      // Given --keep-frames, an earlier run's frame and video that pass the start check
      const outputDir = path.join(testEnv.root, 'changed');
      const framesDir = path.join(outputDir, 'frames');
      fs.mkdirSync(framesDir, { recursive: true });
      writeFile(framesDir, 'frame-00077.png', 'earlier frame');
      writeFile(outputDir, 'changed.mp4', 'stale');
      // And a file the recorder did not write appears in frames/ once the recording started
      // (withFakeFfmpeg puts the original startEncoder back when it ends)
      const startEncoder = ffmpeg.startEncoder;
      ffmpeg.startEncoder = (options) => {
        writeFile(framesDir, 'notes.txt', 'written while recording');
        return startEncoder(options);
      };
      // When the recording is committed
      const run = await recordFailure(testEnv, 'changed', FIXTURES.seek, { keepFrames: true });
      // Then the run fails at the frames step as a tool fault, naming the foreign entry
      assert.equal(run.result, 1, run.output);
      assert.deepEqual(
        { status: run.manifest.status, stage: run.manifest.failure.stage, output: run.manifest.output },
        { status: 'failed', stage: 'frames', output: null },
      );
      assert.match(run.manifest.failure.message, /holds entries the recorder did not write \(notes\.txt\); it was left untouched/);
      // And frames/, the new file and the earlier video are exactly as they were
      assert.deepEqual(fs.readdirSync(framesDir).sort(), ['frame-00077.png', 'notes.txt']);
      assert.equal(fs.readFileSync(path.join(framesDir, 'notes.txt'), 'utf8'), 'written while recording');
      assert.equal(fs.readFileSync(path.join(framesDir, 'frame-00077.png'), 'utf8'), 'earlier frame');
      assert.equal(fs.readFileSync(path.join(outputDir, 'changed.mp4'), 'utf8'), 'stale');
      assert.deepEqual(workDirs(outputDir), []);
    });
  });
});
