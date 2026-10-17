'use strict';

/**
 * ffmpeg helpers for the html-export video targets (--to=mp4 and --to=gif).
 *
 * Exports:
 *   findOnPath(name, { env, platform }) -> absolute path | null
 *     Searches the PATH entries in order and never the current directory: empty and relative
 *     entries are skipped (on POSIX an empty entry means "the current directory"). On Windows the
 *     candidates are <name><ext> for each PATHEXT extension that spawn can start without a shell
 *     (.com, .exe); on POSIX the file must be executable.
 *   ffmpegBinary(env, platform) / ffprobeBinary(env, platform) -> string | null
 *     HTML_EXPORT_FFMPEG / HTML_EXPORT_FFPROBE override the executables. An override must be an
 *     absolute path (on Windows a drive root or UNC path); a relative one throws, because a bare
 *     name would let spawn start a file from the current directory. On Windows an override must
 *     also end in .exe or .com (case-insensitive), else it throws: a .bat/.cmd wrapper would run
 *     through cmd.exe, which parses arguments built from the input file name. Otherwise the absolute path
 *     findOnPath resolves, or null when the tool is not on PATH.
 *   installHint(platform) -> string   per-OS install commands. The exporter never runs them.
 *   hasLibx264(encoderList) -> boolean   whether an "ffmpeg -encoders" listing names libx264.
 *   probeFfmpeg({ env, platform, spawn }) -> { ok, binary, version, message }
 *     A relative (or, on Windows, non-.exe/.com) HTML_EXPORT_FFMPEG / HTML_EXPORT_FFPROBE fails
 *     first, without running anything;
 *     then <binary> -version, then -hide_banner -encoders to confirm libx264; message is null when ok,
 *     else the reason plus install hints. `spawn` defaults to spawnSync (tests pass a stand-in).
 *   buildMp4Args({ fps, output, audio }) -> string[]
 *     Frames arrive as PNG on stdin (-f image2pipe -framerate <fps> -i -) and are encoded with
 *     libx264 at -crf 18 -preset medium, yuv420p and +faststart. With audio: -c:a aac -shortest.
 *   buildGifArgs({ input, palette, output, width, fps }) -> [paletteArgs, gifArgs]
 *     Two passes in order: palettegen (stats_mode=diff) writes <palette>, then paletteuse
 *     (diff_mode=rectangle, so only changed regions are re-dithered) reads it.
 *   parseDuration(stdout) -> number (seconds)
 *   probeDuration(file, { env }) -> number (seconds) from ffprobe format=duration.
 *   startEncoder({ args, env, timeoutMs }) -> { write(buffer), finish(), abort() }
 *     ffmpeg with a piped stdin. Each write and the final wait are bounded by timeoutMs; on
 *     timeout the process is killed and the promise rejects with the reason.
 *   runFfmpeg(args, { env, timeoutMs }) -> Promise<void>   one bounded ffmpeg pass; rejects with
 *     stderr on failure, or with the timeout after killing the process.
 *
 * Every spawn passes an argv array with shell: false, so no value is ever parsed by a shell.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const DEFAULT_GIF_WIDTH = 960;
const DEFAULT_PASS_TIMEOUT_MS = 120_000;
const PROBE_TIMEOUT_MS = 15_000;
const STDERR_LIMIT = 64 * 1024;
const QUIET_ARGS = Object.freeze(['-hide_banner', '-loglevel', 'error', '-y']);
// Constant-quality H.264: sharp text edges and gradients in UI footage at a moderate file size.
const X264_CRF = '18';
const X264_PRESET = 'medium';
// Node's spawn (shell: false) can start only these on Windows; .bat/.cmd need a shell, so they are skipped.
const WINDOWS_SPAWNABLE_EXTENSIONS = Object.freeze(['.com', '.exe']);

const INSTALL_HINTS = Object.freeze({
  win32: 'Windows: winget install Gyan.FFmpeg',
  darwin: 'macOS: brew install ffmpeg',
  linux: 'Linux (Debian/Ubuntu): sudo apt-get install ffmpeg',
});

function readEnv(env, name, platform) {
  if (platform !== 'win32') return env[name];
  // Windows environment names are case-insensitive (the key is usually "Path").
  const key = Object.keys(env).find((candidate) => candidate.toUpperCase() === name);
  return key === undefined ? undefined : env[key];
}

function isFullyQualified(value, platform) {
  // On Windows "\tools" and "C:tools" depend on the current drive or directory; require a drive root or UNC.
  return platform === 'win32' ? /^(?:[a-zA-Z]:[\\/]|\\\\)/.test(value) : path.posix.isAbsolute(value);
}

function windowsExtensions(env) {
  const listed = String(readEnv(env, 'PATHEXT', 'win32') || '')
    .split(';')
    .map((ext) => ext.trim().toLowerCase())
    .filter((ext) => WINDOWS_SPAWNABLE_EXTENSIONS.includes(ext));
  return listed.length > 0 ? [...new Set(listed)] : [...WINDOWS_SPAWNABLE_EXTENSIONS];
}

function isRunnableFile(candidate, platform) {
  try {
    if (!fs.statSync(candidate).isFile()) return false;
    if (platform !== 'win32') fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function findOnPath(name, options = {}) {
  const { env = process.env, platform = process.platform } = options;
  const pathApi = platform === 'win32' ? path.win32 : path.posix;
  const extensions = platform === 'win32' ? windowsExtensions(env) : [''];
  for (const entry of String(readEnv(env, 'PATH', platform) || '').split(pathApi.delimiter)) {
    const dir = entry.trim().replace(/^"(.*)"$/, '$1');
    if (dir === '' || !isFullyQualified(dir, platform)) continue;
    for (const ext of extensions) {
      const candidate = pathApi.join(dir, `${name}${ext}`);
      if (isRunnableFile(candidate, platform)) return candidate;
    }
  }
  return null;
}

// An override is used only when it is absolute: a bare or relative name would make spawn search the
// current directory first on Windows, which findOnPath deliberately never does. On Windows it must
// also be an .exe or .com, the same rule as the PATH lookup: a .bat/.cmd wrapper runs through
// cmd.exe, which parses the arguments built from the input file name (on Node before 20.12.2 it
// could run commands hidden in that name; later Node refuses to start it at all).
function overrideBinary(env, variable, platform) {
  const value = env[variable];
  if (!value) return null;
  if (!isFullyQualified(value, platform)) {
    throw new Error(`${variable} must be an absolute path to the executable; got "${value}".`);
  }
  if (platform === 'win32' && !WINDOWS_SPAWNABLE_EXTENSIONS.includes(path.win32.extname(value).toLowerCase())) {
    throw new Error(
      `${variable} must point at an .exe or .com file on Windows; got "${value}". `
      + 'Point it at ffmpeg.exe or ffprobe.exe itself, not a .bat/.cmd wrapper or a file without an extension.',
    );
  }
  return value;
}

function ffmpegBinary(env = process.env, platform = process.platform) {
  return overrideBinary(env, 'HTML_EXPORT_FFMPEG', platform) || findOnPath('ffmpeg', { env, platform });
}

function ffprobeBinary(env = process.env, platform = process.platform) {
  return overrideBinary(env, 'HTML_EXPORT_FFPROBE', platform) || findOnPath('ffprobe', { env, platform });
}

function requireBinary(binary, name) {
  if (!binary) throw new Error(`${name} was not found on PATH`);
  return binary;
}

function installHint(platform = process.platform) {
  // The current platform's command comes first; the others stay listed for shared docs and CI logs.
  const order = [platform, ...Object.keys(INSTALL_HINTS).filter((name) => name !== platform)];
  const lines = order.filter((name) => INSTALL_HINTS[name]).map((name) => `  ${INSTALL_HINTS[name]}`);
  return [
    'Install ffmpeg (the exporter never installs it), or set HTML_EXPORT_FFMPEG to the ffmpeg executable'
      + ' and HTML_EXPORT_FFPROBE to ffprobe:',
    ...lines,
  ].join('\n');
}

function probeBinary(binary, run) {
  const result = run(binary, ['-version'], {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: PROBE_TIMEOUT_MS,
  });
  if (result.error) {
    const reason = result.error.code === 'ENOENT' ? 'not found' : result.error.message;
    return { ok: false, reason };
  }
  if (result.status !== 0) {
    return { ok: false, reason: `exited with ${result.status === null ? `signal ${result.signal}` : result.status}` };
  }
  const firstLine = String(result.stdout || '').split(/\r?\n/)[0].trim();
  return { ok: true, version: firstLine || null };
}

// Some ffmpeg builds bundled with other apps omit libx264; failing here beats failing after recording.
// Matches the encoder-name column (" V....D libx264   description"), not a mention in a description.
function hasLibx264(encoderList) {
  return /^\s*[VAS][A-Z.]{5}\s+libx264\s/m.test(String(encoderList || ''));
}

function probeFfmpeg(options = {}) {
  const { env = process.env, platform = process.platform, spawn: run = spawnSync } = options;
  let binary;
  try {
    // ffprobe runs only after encoding, but a relative override is a setup error either way.
    ffprobeBinary(env, platform);
    binary = ffmpegBinary(env, platform);
  } catch (error) {
    return { ok: false, binary: null, version: null, message: `${error.message}\n${installHint(platform)}` };
  }
  const fail = (version, reason) => ({ ok: false, binary, version, message: `${reason}\n${installHint(platform)}` });
  if (!binary) return fail(null, 'ffmpeg is required for video export, but it was not found on PATH.');
  const probe = probeBinary(binary, run);
  if (!probe.ok) {
    return fail(null, `ffmpeg is required for video export, but "${binary} -version" failed (${probe.reason}).`);
  }
  const encoders = run(binary, ['-hide_banner', '-encoders'], {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: PROBE_TIMEOUT_MS,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (encoders.error || encoders.status !== 0 || !hasLibx264(encoders.stdout)) {
    return fail(probe.version, `the ffmpeg at "${binary}" has no libx264 encoder, which MP4 and GIF export need.`);
  }
  return { ok: true, binary, version: probe.version, message: null };
}

function requirePositive(name, value) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number`);
}

function requireText(name, value) {
  if (typeof value !== 'string' || value === '') throw new Error(`${name} is required`);
}

function buildMp4Args(options = {}) {
  const { fps, output, audio } = options;
  requirePositive('fps', fps);
  requireText('output', output);
  const args = [
    ...QUIET_ARGS,
    '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(fps), '-i', '-',
  ];
  if (audio) args.push('-i', audio);
  args.push('-map', '0:v:0');
  if (audio) args.push('-map', '1:a:0');
  args.push(
    // libx264 with yuv420p needs even dimensions; an odd viewport would otherwise fail to encode.
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264', '-crf', X264_CRF, '-preset', X264_PRESET, '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-movflags', '+faststart',
  );
  if (audio) args.push('-c:a', 'aac', '-shortest');
  args.push(output);
  return args;
}

function buildGifArgs(options = {}) {
  const { input, palette, output, width = DEFAULT_GIF_WIDTH, fps } = options;
  requireText('input', input);
  requireText('palette', palette);
  requireText('output', output);
  if (!Number.isInteger(width) || width <= 0) throw new Error('width must be a positive whole number');
  requirePositive('fps', fps);
  const filter = `fps=${fps},scale=${width}:-1:flags=lanczos`;
  const paletteArgs = [
    ...QUIET_ARGS,
    '-i', input,
    '-vf', `${filter},palettegen=stats_mode=diff`,
    palette,
  ];
  const gifArgs = [
    ...QUIET_ARGS,
    '-i', input, '-i', palette,
    '-lavfi', `${filter}[x];[x][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle`,
    '-loop', '0',
    output,
  ];
  return [paletteArgs, gifArgs];
}

function parseDuration(stdout) {
  const value = Number(String(stdout || '').trim().split(/\r?\n/)[0]);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`ffprobe returned no usable duration: ${JSON.stringify(String(stdout || '').slice(0, 200))}`);
  }
  return value;
}

function probeDuration(file, options = {}) {
  const { env = process.env } = options;
  requireText('file', file);
  const binary = requireBinary(ffprobeBinary(env), 'ffprobe');
  const result = spawnSync(binary, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ], {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: PROBE_TIMEOUT_MS,
  });
  if (result.error) throw new Error(`${binary} failed to start: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`${binary} exited with ${result.status}: ${String(result.stderr || '').trim()}`);
  }
  return parseDuration(result.stdout);
}

function collectStderr(child) {
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    if (stderr.length < STDERR_LIMIT) stderr += chunk;
  });
  return () => stderr.trim();
}

function exitPromise(child, binary, readStderr) {
  return new Promise((resolve, reject) => {
    child.once('error', (error) => reject(new Error(`${binary} failed to start: ${error.message}`)));
    child.once('close', (code, signal) => {
      if (code === 0) return resolve();
      const how = code === null ? `signal ${signal}` : `exit ${code}`;
      return reject(new Error(`${binary} failed (${how}): ${readStderr() || 'no error output'}`));
    });
  });
}

function stopChild(child) {
  try { child.stdin && child.stdin.destroy(); } catch {}
  // SIGKILL ends the process on POSIX even if it ignores SIGTERM; on Windows every signal terminates it.
  try { child.kill('SIGKILL'); } catch {}
}

// Rejects when `promise` has not settled within timeoutMs, after stopping the child process.
function bounded(promise, child, timeoutMs, message) {
  promise.catch(() => {}); // A late rejection after the timeout must not become unhandled.
  let timer;
  const timed = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      stopChild(child);
      reject(new Error(message));
    }, timeoutMs);
  });
  return Promise.race([promise, timed]).finally(() => clearTimeout(timer));
}

function startEncoder(options = {}) {
  const { args, env = process.env, timeoutMs = DEFAULT_PASS_TIMEOUT_MS } = options;
  if (!Array.isArray(args) || args.length === 0) throw new Error('startEncoder requires ffmpeg args');
  requirePositive('timeoutMs', timeoutMs);
  const binary = requireBinary(ffmpegBinary(env), 'ffmpeg');
  const child = spawn(binary, args, { shell: false, windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
  const readStderr = collectStderr(child);
  const exited = exitPromise(child, binary, readStderr);
  // Keep an early failure (for example a bad codec) from surfacing as an unhandled rejection.
  exited.catch(() => {});
  // EPIPE after an early ffmpeg exit must not crash the process; the write callback reports it.
  child.stdin.on('error', () => {});

  // Each write resolves once the chunk is flushed, so awaiting it applies backpressure. On a write
  // failure the ffmpeg exit error (with its stderr) is reported instead, since it names the cause.
  function write(buffer) {
    const flushed = new Promise((resolve, reject) => {
      child.stdin.write(buffer, (error) => (error ? reject(error) : resolve()));
    }).catch((error) => exited.then(() => { throw error; }));
    return bounded(flushed, child, timeoutMs, `${binary} did not accept a frame within ${timeoutMs} ms and was stopped`);
  }

  function finish() {
    child.stdin.end();
    return bounded(exited, child, timeoutMs, `${binary} did not finish encoding within ${timeoutMs} ms and was stopped`);
  }

  function abort() {
    stopChild(child);
    return bounded(exited, child, timeoutMs, `${binary} did not stop`).catch(() => {});
  }

  return { write, finish, abort };
}

function runFfmpeg(args, options = {}) {
  const { env = process.env, timeoutMs = DEFAULT_PASS_TIMEOUT_MS } = options;
  requirePositive('timeoutMs', timeoutMs);
  const binary = requireBinary(ffmpegBinary(env), 'ffmpeg');
  const child = spawn(binary, args, { shell: false, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  return bounded(exitPromise(child, binary, collectStderr(child)), child, timeoutMs,
    `${binary} did not finish within ${timeoutMs} ms and was stopped`);
}

module.exports = {
  DEFAULT_GIF_WIDTH,
  findOnPath,
  ffmpegBinary,
  ffprobeBinary,
  installHint,
  hasLibx264,
  probeFfmpeg,
  buildMp4Args,
  buildGifArgs,
  parseDuration,
  probeDuration,
  startEncoder,
  runFfmpeg,
};
