'use strict';

/**
 * Test-environment helper for html-export tests (Portable Test Contract: clean machine, own temp dir).
 *
 * Exports:
 *   makeTestEnv({ prefix, baseEnv, platform, cwd } = {})
 *     -> { root, env, browsersPath, apply(), restore(), cleanup() }
 *     - root          fresh temp directory (the fixture home for this test)
 *     - env           child-process environment built from baseEnv: HOME, USERPROFILE, TMPDIR, TEMP
 *                     and TMP point at root; provider keys are blanked; CLAUDE_PROJECT_DIR is removed;
 *                     PLAYWRIGHT_BROWSERS_PATH is kept resolvable (see resolveBrowsersPath)
 *     - apply()       copies `env` onto process.env for in-process browser tests (keys missing from
 *                     `env` are deleted); restore() puts the previous process.env values back
 *     - cleanup()     restore() plus removal of root; safe to call more than once
 *   resolveBrowsersPath(baseEnv, platform, cwd) -> string
 *     The original PLAYWRIGHT_BROWSERS_PATH when set ('0' and absolute values unchanged, a relative
 *     value resolved against cwd), else Playwright's per-OS default computed from the ORIGINAL env,
 *     BEFORE HOME/USERPROFILE are redirected:
 *       Windows  %LOCALAPPDATA%\ms-playwright (fallback <home>\AppData\Local\ms-playwright)
 *       macOS    ~/Library/Caches/ms-playwright
 *       Linux    $XDG_CACHE_HOME/ms-playwright (fallback ~/.cache/ms-playwright)
 *   hasBrowser() -> Promise<boolean>   true when the skill-local Playwright can launch headless
 *                                      Chromium (browser.cjs probeChromium); memoized. browserStatus() gives { available, reason }.
 *   skipWithoutBrowser(t) -> Promise<boolean>  when Chromium is unavailable, prints
 *                                      'ENVIRONMENT-BLOCKED: chromium (<reason>)', skips ONLY that test
 *                                      case via t.skip(), and resolves true.
 *   withBrowserEnv(t, run, { prefix, apply = true, gate } = {}) -> Promise<void>
 *     Runs one browser case in its own makeTestEnv({ prefix }): apply() first unless apply is false
 *     (cases that only spawn children pass testEnv.env instead), then skipWithoutBrowser(t), then the
 *     optional gate() — a string it returns (sync or async) names a missing dependency, printed and
 *     skipped as 'ENVIRONMENT-BLOCKED: <string>' — then run(testEnv); cleanup() always runs.
 *   copySkillScripts(destRoot) -> { root, skillRoot, libDir, exportScript }
 *     A clean copy of the skill for dependency-free or modified-file cases: every file under
 *     scripts/ (never node_modules) goes to <destRoot>/.claude/skills/html-export/scripts, and the
 *     shared project-root helper the dispatcher requires goes to <destRoot>/.claude/scripts/lib/.
 *     A case then overwrites or adds only the files it changes.
 *   allowlistEnv(root, { projectRoot } = {}) -> env   OS essentials only (CHILD_ENV_ALLOWLIST), with
 *     HOME/USERPROFILE/TMPDIR/TEMP/TMP at root and CLAUDE_PROJECT_DIR only when projectRoot is given.
 *   writeFakePlaywright(skillRoot, { version = '1.63.0', launchError, launchErrorName, recordLaunchesTo } = {})
 *     a skill-local playwright package.json plus a chromium.launch() that succeeds (or throws
 *     launchError, named launchErrorName when given: 'TimeoutError' is the class Playwright
 *     rejects a launch with when the browser does not start within its timeout). With recordLaunchesTo, every launch appends its options as one JSON line to
 *     that file, so a case can assert the budget each launch was given. The fake browser has only
 *     close(), so anything past the launch (a real target's page setup) fails as a tool fault.
 *   assertSetupHints(stderr)   the exact exit-3 setup block (SETUP_HINT_LINES: run from inside the
 *     skill folder per shell) and no `--prefix` anywhere in stderr.
 *   removeTree(dir)   best-effort recursive delete: a failure (for example a Windows file lock) is
 *     logged, never thrown, so cleanup in `finally` cannot replace the assertion error of the test.
 *   SKILL_ROOT, PLAYWRIGHT_ROOT, PROJECT_ROOT_HELPER, PROVIDER_ENV_PATTERN, CHILD_ENV_ALLOWLIST
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
// browser.cjs loads Playwright only inside its functions, so requiring it needs no dependency.
const { probeChromium } = require('../scripts/lib/browser.cjs');
const { firstLine } = require('../scripts/lib/result.cjs');

const SKILL_ROOT = path.resolve(__dirname, '..');
const PLAYWRIGHT_ROOT = path.join(SKILL_ROOT, 'node_modules', 'playwright');
// The dispatcher reaches the shared project-root helper by relative path from the skill.
const PROJECT_ROOT_HELPER = path.resolve(SKILL_ROOT, '..', '..', 'scripts', 'lib', 'project-root.cjs');
// OS essentials only. The Windows well-known folder keys (SYSTEMDRIVE, PROGRAMDATA, ...) stay: without them a
// child that touches the shell writes its cache files under its working directory.
const CHILD_ENV_ALLOWLIST = new Set([
  'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC',
  'SYSTEMDRIVE', 'PROGRAMDATA', 'ALLUSERSPROFILE', 'PUBLIC',
  'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMW6432',
  'COMMONPROGRAMFILES', 'COMMONPROGRAMFILES(X86)', 'COMMONPROGRAMW6432',
  'PROCESSOR_ARCHITECTURE', 'PROCESSOR_ARCHITEW6432', 'NUMBER_OF_PROCESSORS', 'OS', 'LANG', 'LC_ALL', 'TZ',
]);
const REDIRECTED_KEYS = Object.freeze(['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP']);
// Notification providers and framework feature switches a developer machine may have set.
const PROVIDER_ENV_PATTERN = /^(TELEGRAM|DISCORD|SLACK|CK)_/i;
const REMOVED_KEYS = Object.freeze(['CLAUDE_PROJECT_DIR']);
const BROWSER_PROBE_TIMEOUT_MS = 30_000;

function sameKey(left, right, platform) {
  return platform === 'win32' ? left.toUpperCase() === right.toUpperCase() : left === right;
}

function readKey(env, name, platform) {
  const key = Object.keys(env).find((candidate) => sameKey(candidate, name, platform));
  return key === undefined ? undefined : env[key];
}

function setKey(env, name, value, platform) {
  for (const key of Object.keys(env)) {
    if (sameKey(key, name, platform)) delete env[key];
  }
  if (value !== undefined) env[name] = value;
}

function homeFrom(env, platform) {
  const pathApi = platform === 'win32' ? path.win32 : path.posix;
  const home = platform === 'win32'
    ? readKey(env, 'USERPROFILE', platform) || readKey(env, 'HOME', platform)
    : readKey(env, 'HOME', platform);
  return home ? pathApi.resolve(home) : os.homedir();
}

function resolveBrowsersPath(baseEnv = process.env, platform = process.platform, cwd = process.cwd()) {
  const pathApi = platform === 'win32' ? path.win32 : path.posix;
  const explicit = readKey(baseEnv, 'PLAYWRIGHT_BROWSERS_PATH', platform);
  if (explicit !== undefined && explicit !== '') {
    if (explicit === '0' || pathApi.isAbsolute(explicit)) return explicit;
    return pathApi.resolve(cwd, explicit);
  }
  if (platform === 'win32') {
    const localAppData = readKey(baseEnv, 'LOCALAPPDATA', platform)
      || pathApi.join(homeFrom(baseEnv, platform), 'AppData', 'Local');
    return pathApi.join(localAppData, 'ms-playwright');
  }
  if (platform === 'darwin') {
    return pathApi.join(homeFrom(baseEnv, platform), 'Library', 'Caches', 'ms-playwright');
  }
  const cacheHome = readKey(baseEnv, 'XDG_CACHE_HOME', platform) || pathApi.join(homeFrom(baseEnv, platform), '.cache');
  return pathApi.join(cacheHome, 'ms-playwright');
}

function makeTestEnv(options = {}) {
  const {
    prefix = 'html-export-test-',
    baseEnv = process.env,
    platform = process.platform,
    cwd = process.cwd(),
  } = options;

  // Resolve the browser cache from the ORIGINAL env before HOME/USERPROFILE are redirected.
  const browsersPath = resolveBrowsersPath(baseEnv, platform, cwd);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));

  const env = { ...baseEnv };
  for (const key of Object.keys(env)) {
    if (PROVIDER_ENV_PATTERN.test(key)) env[key] = '';
  }
  for (const key of REMOVED_KEYS) setKey(env, key, undefined, platform);
  for (const key of REDIRECTED_KEYS) setKey(env, key, root, platform);
  setKey(env, 'PLAYWRIGHT_BROWSERS_PATH', browsersPath, platform);

  let saved = null;
  function apply() {
    if (saved) return;
    saved = { ...process.env };
    for (const key of Object.keys(process.env)) {
      if (!Object.prototype.hasOwnProperty.call(env, key)) delete process.env[key];
    }
    for (const [key, value] of Object.entries(env)) process.env[key] = value;
  }
  function restore() {
    if (!saved) return;
    for (const key of Object.keys(process.env)) {
      if (!Object.prototype.hasOwnProperty.call(saved, key)) delete process.env[key];
    }
    for (const [key, value] of Object.entries(saved)) process.env[key] = value;
    saved = null;
  }
  let removed = false;
  function cleanup() {
    restore();
    if (removed) return;
    removed = true;
    removeTree(root);
  }

  return { root, env, browsersPath, apply, restore, cleanup };
}

function removeTree(dir) {
  try {
    // Chromium may hold profile files briefly after close on Windows; retry before giving up.
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch (error) {
    console.log(`cleanup warning: could not remove ${dir}: ${error.code || error.message}`);
  }
}

function copyTree(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function copySkillScripts(destRoot) {
  const skillRoot = path.join(destRoot, '.claude', 'skills', 'html-export');
  copyTree(path.join(SKILL_ROOT, 'scripts'), path.join(skillRoot, 'scripts'));
  const helper = path.join(destRoot, '.claude', 'scripts', 'lib', 'project-root.cjs');
  fs.mkdirSync(path.dirname(helper), { recursive: true });
  fs.copyFileSync(PROJECT_ROOT_HELPER, helper);
  return {
    root: destRoot,
    skillRoot,
    libDir: path.join(skillRoot, 'scripts', 'lib'),
    exportScript: path.join(skillRoot, 'scripts', 'export.cjs'),
  };
}

function allowlistEnv(root, { projectRoot } = {}) {
  const env = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (CHILD_ENV_ALLOWLIST.has(name.toUpperCase())) env[name] = value;
  }
  for (const name of REDIRECTED_KEYS) env[name] = root;
  if (projectRoot !== undefined) env.CLAUDE_PROJECT_DIR = projectRoot;
  return env;
}

function writeFakePlaywright(skillRoot, {
  version = '1.63.0', launchError = null, launchErrorName = null, recordLaunchesTo = null,
} = {}) {
  const packageRoot = path.join(skillRoot, 'node_modules', 'playwright');
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'package.json'), JSON.stringify({ name: 'playwright', version }), 'utf8');
  const record = recordLaunchesTo
    ? `require('node:fs').appendFileSync(${JSON.stringify(recordLaunchesTo)}, JSON.stringify(options || {}) + '\\n');`
    : '';
  const errorName = launchErrorName ? ` error.name = ${JSON.stringify(launchErrorName)};` : '';
  const launchBody = launchError
    ? `const error = new Error(${JSON.stringify(launchError)});${errorName} throw error;`
    : 'return { close: async function close() {} };';
  fs.writeFileSync(
    path.join(packageRoot, 'index.js'),
    `module.exports = { chromium: { launch: async function launch(options) { ${record} ${launchBody} } } };`,
    'utf8',
  );
  return packageRoot;
}

// The exact exit-3 setup block. Every command runs npm/npx from INSIDE the skill folder; the hint
// must never use `--prefix`, which makes npm 10 add the host root package as a `file:../../..`
// dependency of the skill.
const SETUP_HINT_LINES = Object.freeze([
  'Setup commands (the exporter never runs these; run them from the project root):',
  '  macOS/Linux shell:  (cd .claude/skills/html-export && npm install && npx playwright install chromium)',
  '  Linux system libs:  (cd .claude/skills/html-export && npx playwright install --with-deps chromium)',
  '  Windows PowerShell: Push-Location .claude/skills/html-export; npm install; npx playwright install chromium; Pop-Location',
  '  Windows cmd:        pushd .claude\\skills\\html-export && npm install && npx playwright install chromium && popd',
]);

function assertSetupHints(stderr) {
  const text = String(stderr).replace(/\r\n/g, '\n');
  assert.ok(text.includes(SETUP_HINT_LINES.join('\n')), `stderr must carry the exact setup block, got:\n${text}`);
  assert.doesNotMatch(text, /--prefix/, 'the setup hint must never use npm/npx --prefix');
}

let browserProbe = null;

async function probeBrowser() {
  if (!fs.existsSync(path.join(PLAYWRIGHT_ROOT, 'package.json'))) {
    return { available: false, reason: 'skill-local playwright is not installed' };
  }
  let playwright;
  try {
    playwright = require(PLAYWRIGHT_ROOT);
  } catch (error) {
    return { available: false, reason: `skill-local playwright failed to load: ${error.message}` };
  }
  try {
    // The product's own probe: a bounded launch whose late browser is still closed, and a close
    // that only warns, so the probe can never hang a test file or leak a live Chromium.
    await probeChromium({ playwright, budgetMs: BROWSER_PROBE_TIMEOUT_MS });
  } catch (error) {
    return { available: false, reason: `Chromium launch failed: ${firstLine(error)}` };
  }
  return { available: true, reason: null };
}

function browserStatus() {
  if (!browserProbe) browserProbe = probeBrowser();
  return browserProbe;
}

async function hasBrowser() {
  return (await browserStatus()).available;
}

async function skipWithoutBrowser(t) {
  const status = await browserStatus();
  if (status.available) return false;
  console.log(`ENVIRONMENT-BLOCKED: chromium (${status.reason})`);
  t.skip(`ENVIRONMENT-BLOCKED: chromium (${status.reason})`);
  return true;
}

// The Portable Test Contract's isolation step for every browser case, in one place: a new env key
// to scrub or a new skip rule is one edit here, not one per test file.
async function withBrowserEnv(t, run, { prefix, apply = true, gate = null } = {}) {
  const testEnv = makeTestEnv({ prefix });
  if (apply) testEnv.apply();
  try {
    if (await skipWithoutBrowser(t)) return;
    const blocked = gate ? await gate() : null;
    if (blocked) {
      console.log(`ENVIRONMENT-BLOCKED: ${blocked}`);
      t.skip(`ENVIRONMENT-BLOCKED: ${blocked}`);
      return;
    }
    await run(testEnv);
  } finally {
    testEnv.cleanup();
  }
}

module.exports = {
  SKILL_ROOT,
  PLAYWRIGHT_ROOT,
  PROJECT_ROOT_HELPER,
  PROVIDER_ENV_PATTERN,
  CHILD_ENV_ALLOWLIST,
  resolveBrowsersPath,
  makeTestEnv,
  removeTree,
  copySkillScripts,
  allowlistEnv,
  writeFakePlaywright,
  SETUP_HINT_LINES,
  assertSetupHints,
  hasBrowser,
  browserStatus,
  skipWithoutBrowser,
  withBrowserEnv,
};
