'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const {
  SKILL_ROOT,
  copySkillScripts,
  allowlistEnv,
  writeFakePlaywright,
  assertSetupHints,
  removeTree,
} = require('./test-env.cjs');

const SOURCE_RUNNER = path.join(__dirname, 'run-tests.cjs');
const TARGET_MODULE_FILES = Object.freeze({
  png: 'to-png.cjs',
  pdf: 'to-pdf.cjs',
  mp4: 'to-video.cjs',
  gif: 'to-video.cjs',
});
const SPAWN_TIMEOUT_MS = 30_000;

// A clean skill copy (all scripts, no node_modules) in a temp project, plus an unrelated cwd.
function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'html-export-fixture-'));
  let unrelatedCwd;
  try {
    unrelatedCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'html-export-cwd-'));
    const copy = copySkillScripts(root);
    const testsRoot = path.join(copy.skillRoot, 'tests');
    fs.mkdirSync(testsRoot, { recursive: true });
    return { root, unrelatedCwd, skillRoot: copy.skillRoot, dispatcherPath: copy.exportScript, testsRoot };
  } catch (error) {
    removeTree(root);
    if (unrelatedCwd) removeTree(unrelatedCwd);
    throw error;
  }
}

function cleanupFixture(fixture) {
  removeTree(fixture.root);
  removeTree(fixture.unrelatedCwd);
}

function withFixture(run) {
  const fixture = createFixture();
  try {
    return run(fixture);
  } finally {
    cleanupFixture(fixture);
  }
}

function childEnvironment(tempRoot, projectRoot, extra = {}) {
  return { ...allowlistEnv(tempRoot, { projectRoot }), ...extra };
}

function runProcess(executable, argv, options) {
  const started = Date.now();
  const result = spawnSync(executable, argv, {
    cwd: options.cwd,
    env: childEnvironment(options.fixture.root, options.projectRoot, options.extraEnv),
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: SPAWN_TIMEOUT_MS,
    maxBuffer: 1024 * 1024,
  });
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  if (result.error) {
    // A spawn failure or timeout keeps what the child printed, so a hang is diagnosable.
    assert.fail(`${path.basename(argv[0] || executable)} did not finish (${result.error.code || result.error.message}) `
      + `after ${Date.now() - started} ms\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  }
  return { status: result.status, stdout, stderr, all: stdout + stderr };
}

function runDispatcher(fixture, args, projectRoot, extraEnv) {
  return runProcess(process.execPath, [fixture.dispatcherPath, ...args], {
    fixture,
    projectRoot,
    extraEnv,
    cwd: fixture.unrelatedCwd,
  });
}

function runDispatcherWithRuntime(fixture, args, runtime) {
  const harnessPath = path.join(fixture.root, 'run-export-with-runtime.cjs');
  const source = [
    '\'use strict\';',
    'const { main, EXIT } = require(' + JSON.stringify(fixture.dispatcherPath) + ');',
    'main(' + JSON.stringify(args) + ', ' + JSON.stringify(runtime) + ')',
    '  .then((code) => { process.exitCode = code; })',
    '  .catch((error) => { console.error(error.stack || error); process.exitCode = EXIT.ERROR; });',
  ].join('\n');
  fs.writeFileSync(harnessPath, source, 'utf8');
  return runProcess(process.execPath, [harnessPath], {
    fixture,
    cwd: fixture.unrelatedCwd,
  });
}

function writeTarget(fixture, targetName, options = {}) {
  const targetPath = path.join(
    fixture.skillRoot,
    'scripts',
    'lib',
    TARGET_MODULE_FILES[targetName],
  );
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const config = {
    flags: options.flags || {},
    validateMessage: options.validateMessage || null,
    preflightMessage: options.preflightMessage || null,
    runError: options.runError || null,
  };
  const configLine = 'const config = ' + JSON.stringify(config) + ';';
  const loadMarker = options.loadMarker
    ? 'fs.writeFileSync(' + JSON.stringify(options.loadMarker) + ', \'loaded\');'
    : '';
  const preflightMarker = options.preflightMarker
    ? 'fs.writeFileSync(' + JSON.stringify(options.preflightMarker) + ', \'called\');'
    : '';
  const validateBody = config.validateMessage
    ? 'throw new Error(' + JSON.stringify(config.validateMessage) + ');'
    : '';
  // preflightSource: a raw expression the stub's preflight returns instead of preflightMessage.
  const preflightResult = options.preflightSource || 'config.preflightMessage';
  const source = [
    '\'use strict\';',
    'const fs = require(\'node:fs\');',
    'const path = require(\'node:path\');',
    configLine,
    loadMarker,
    'module.exports = {',
    '  flags: config.flags,',
    options.extraExports || '',
    '  validate() { ' + validateBody + ' },',
    '  preflight() { ' + preflightMarker + ' return ' + preflightResult + '; },',
    '  async run(options) {',
    '    if (config.runError) throw new Error(config.runError);',
    '    fs.writeFileSync(path.resolve(__dirname, \'..\', \'..\', \'capture.json\'), JSON.stringify(options));',
    '    return 0;',
    '  },',
    '};',
  ].filter(Boolean).join('\n');
  fs.writeFileSync(targetPath, source, 'utf8');
  return targetPath;
}

function writeAllTargetLoadMarkers(fixture) {
  const modules = [
    ['png', 'loaded-png'],
    ['pdf', 'loaded-pdf'],
    ['mp4', 'loaded-video'],
  ];
  for (const [targetName, markerName] of modules) {
    writeTarget(fixture, targetName, {
      loadMarker: path.join(fixture.skillRoot, 'scripts', markerName),
    });
  }
  return modules.map(([, markerName]) => path.join(fixture.skillRoot, 'scripts', markerName));
}

// Default version is the dispatcher's floor, so a case only states a version when it matters.
function writePlaywright(fixture, options = {}) {
  return writeFakePlaywright(fixture.skillRoot, { version: '1.55.1', ...options });
}

function readCapture(fixture) {
  return JSON.parse(fs.readFileSync(path.join(fixture.skillRoot, 'capture.json'), 'utf8'));
}

test('TC-HTMLX-001 missing --to is a usage error', () => withFixture((fixture) => {
  // Given: A copied dispatcher with no target selected.
  // When: The dispatcher receives no command-line arguments.
  // Then: It exits 2, reports the required --to option on stderr, and writes no stdout.
  const result = runDispatcher(fixture, []);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Missing --to=/);
  assert.equal(result.stdout, '');
}));

test('TC-HTMLX-002 unknown targets list the four supported targets', () => withFixture((fixture) => {
  // Given: A copied dispatcher and each planned unsupported target name.
  // When: The dispatcher receives --to=pptx and --to=docx in separate processes.
  // Then: Both invocations exit 2 and list png, pdf, mp4, and gif.
  for (const targetName of ['pptx', 'docx']) {
    const result = runDispatcher(fixture, ['--to=' + targetName]);
    assert.equal(result.status, 2, targetName + ' should be rejected as a usage error');
    assert.match(result.stderr, new RegExp('Unknown --to target: ' + targetName));
    assert.match(result.stderr, /Valid targets: png, pdf, mp4, gif/);
    assert.equal(result.stdout, '');
  }
}));

test('TC-HTMLX-003 help lists targets without loading target modules', () => withFixture((fixture) => {
  // Given: All target module paths contain load-time marker writes.
  const loadMarkers = writeAllTargetLoadMarkers(fixture);
  // When: The dispatcher receives --help without dependencies installed.
  const result = runDispatcher(fixture, ['--help']);
  // Then: Help exits 0, names all four targets, and no lazy target module was loaded.
  assert.equal(result.status, 0);
  for (const targetName of ['png', 'pdf', 'mp4', 'gif']) {
    assert.match(result.stdout, new RegExp('--to=' + targetName + '\\b'));
  }
  for (const marker of loadMarkers) assert.equal(fs.existsSync(marker), false, marker + ' must not be created');
  assert.equal(result.stderr, '');
}));

test('TC-HTMLX-004 missing skill dependencies provide setup hints without self-installing', () => withFixture((fixture) => {
  // Given: A target stub and a fresh copied skill with no node_modules directory.
  writeTarget(fixture, 'png');
  const nodeModules = path.join(fixture.skillRoot, 'node_modules');
  assert.equal(fs.existsSync(nodeModules), false);
  // When: The dispatcher starts a supported target without its local dependencies.
  const result = runDispatcher(fixture, ['--to=png', 'scene.html']);
  // Then: It exits 3, prints per-OS setup commands, and creates no node_modules.
  assert.equal(result.status, 3);
  assertSetupHints(result.stderr);
  assert.match(result.stderr, /Playwright is not installed in the html-export skill/);
  assert.equal(fs.existsSync(nodeModules), false, 'the exporter must not install its dependencies');
}));

test('TC-HTMLX-004 rejects a skill-local Playwright below the minimum version', () => withFixture((fixture) => {
  // Given: The copied skill has Playwright 1.55.0, one patch below the 1.55.1 floor that closes
  // advisory GHSA-7mvr-c777-76hp.
  writeTarget(fixture, 'png');
  writePlaywright(fixture, { version: '1.55.0' });
  // When: A target is run with that skill-local dependency.
  const result = runDispatcher(fixture, ['--to=png', 'scene.html']);
  // Then: Dependency preflight exits 3 with the minimum version and setup commands.
  assert.equal(result.status, 3);
  assert.match(result.stderr, /Playwright 1\.55\.1 or newer is required in the html-export skill/);
  assertSetupHints(result.stderr);
}));

test('TC-HTMLX-105 a target preflight built on browser.cjs dependencyFailure exits 3 with the setup block, before the shared checks', () => withFixture((fixture) => {
  // Given: A pdf target whose preflight reports a missing skill-local package through the shared
  // dependencyFailure(reason) helper (what to-pdf does for pdf-lib), and no node_modules at all.
  const reason = 'pdf-lib is required by target pdf, but is not installed in the html-export skill.';
  writeTarget(fixture, 'pdf', {
    preflightSource: 'require(\'./browser.cjs\').dependencyFailure(' + JSON.stringify(reason) + ')',
  });
  // When: The dispatcher runs the target.
  const result = runDispatcher(fixture, ['--to=pdf', 'scene.html']);
  // Then: Exit 3 with the target's reason and the exact setup block, reported before the shared
  // Playwright check (which would otherwise say Playwright is not installed).
  assert.equal(result.status, 3, result.all);
  assert.ok(result.stderr.includes('Dependency missing for target pdf: ' + reason), result.stderr);
  assertSetupHints(result.stderr);
  assert.doesNotMatch(result.stderr, /Playwright is not installed/);
  assert.equal(result.stdout, '');
}));

test('TC-HTMLX-106 the dispatcher no longer reads a requiresPdfLib export: a skill-local package is the target preflight\'s job', () => withFixture((fixture) => {
  // Given: A pdf target that still exports the retired requiresPdfLib: true field, a passing fake
  // Playwright probe, and no pdf-lib in the skill.
  writeTarget(fixture, 'pdf', { extraExports: '  requiresPdfLib: true,' });
  writePlaywright(fixture);
  // When: The dispatcher runs the target.
  const result = runDispatcher(fixture, ['--to=pdf', 'scene.html']);
  // Then: The field is ignored (no pdf-lib check, no exit 3): the target's run is reached.
  assert.equal(result.status, 0, result.all);
  assert.doesNotMatch(result.stderr, /pdf-lib/);
  assert.equal(readCapture(fixture).to, 'pdf');
  assert.equal(fs.existsSync(path.join(fixture.skillRoot, 'node_modules', 'pdf-lib')), false);
}));

test('TC-HTMLX-004 reports a failed local Chromium launch probe', () => withFixture((fixture) => {
  // Given: A valid skill-local Playwright package whose launch probe fails.
  writeTarget(fixture, 'png');
  writePlaywright(fixture, { launchError: 'simulated headless shell unavailable' });
  // When: The dispatcher attempts the browser probe.
  const result = runDispatcher(fixture, ['--to=png', 'scene.html']);
  // Then: Dependency preflight exits 3 with the launch cause and OS-specific setup hints.
  assert.equal(result.status, 3);
  assert.match(result.stderr, /Chromium launch probe failed: simulated headless shell unavailable/);
  assertSetupHints(result.stderr);
}));

test('TC-HTMLX-005 output root honors CLAUDE_PROJECT_DIR and ignores an unrelated cwd', () => withFixture((fixture) => {
  // Given: A copied skill, a different cwd with no .claude marker, target flags, and a successful fake local browser probe.
  writeTarget(fixture, 'mp4', {
    flags: { fps: 'number', duration: 'number', audio: 'path', 'keep-frames': 'bool' },
  });
  writePlaywright(fixture);
  const explicitProjectRoot = path.join(fixture.root, 'explicit-project');
  fs.mkdirSync(path.join(explicitProjectRoot, '.claude'), { recursive: true });
  const { resolveProjectRoot } = require(path.join(
    fixture.root,
    '.claude',
    'scripts',
    'lib',
    'project-root.cjs',
  ));
  const expectedUnsetRoot = resolveProjectRoot({
    cwd: fixture.unrelatedCwd,
    scriptPath: fixture.dispatcherPath,
    env: childEnvironment(fixture.root),
  });
  const expectedSetRoot = resolveProjectRoot({
    cwd: fixture.unrelatedCwd,
    scriptPath: fixture.dispatcherPath,
    env: childEnvironment(fixture.root, explicitProjectRoot),
  });
  const canonicalExpectedUnsetRoot = fs.realpathSync(expectedUnsetRoot.rootDir);
  const canonicalExpectedSetRoot = fs.realpathSync(expectedSetRoot.rootDir);
  assert.notEqual(
    canonicalExpectedUnsetRoot,
    fs.realpathSync(fixture.unrelatedCwd),
    'the unset-env resolution must not select the unrelated working directory',
  );
  // When: One run omits CLAUDE_PROJECT_DIR and one selects the explicit project root.
  const unsetResult = runDispatcher(fixture, [
    '--to=mp4', 'scene.html', '--viewport=1280x720', '--slides', '--offline',
    '--timeout=5000', '--scale=2', '--fps=24', '--duration=2.5', '--audio=music.wav', '--keep-frames',
  ]);
  assert.equal(unsetResult.status, 0, unsetResult.all);
  const unsetOptions = readCapture(fixture);
  const setResult = runProcess(process.execPath, [fixture.dispatcherPath, '--to=mp4', 'second.html'], {
    fixture,
    projectRoot: explicitProjectRoot,
    cwd: fixture.unrelatedCwd,
  });
  // Then: Both default output roots follow project resolution, and generic plus target flags are parsed to owned option values.
  assert.equal(setResult.status, 0, setResult.all);
  const setOptions = readCapture(fixture);
  assert.equal(path.basename(path.dirname(unsetOptions.outputDir)), 'html-export');
  assert.equal(path.basename(path.dirname(path.dirname(unsetOptions.outputDir))), 'tmp');
  assert.equal(path.basename(path.dirname(setOptions.outputDir)), 'html-export');
  assert.equal(path.basename(path.dirname(path.dirname(setOptions.outputDir))), 'tmp');
  assert.equal(
    fs.realpathSync(path.resolve(path.dirname(unsetOptions.outputDir), '..', '..')),
    canonicalExpectedUnsetRoot,
  );
  assert.equal(
    fs.realpathSync(path.resolve(path.dirname(setOptions.outputDir), '..', '..')),
    canonicalExpectedSetRoot,
  );
  assert.match(path.basename(unsetOptions.outputDir), /^\d{6}-\d{4}-scene\.html$/);
  assert.match(path.basename(setOptions.outputDir), /^\d{6}-\d{4}-second\.html$/);
  assert.deepEqual(unsetOptions.inputs, ['scene.html']);
  assert.equal(unsetOptions.input, 'scene.html');
  assert.equal(unsetOptions.viewport, '1280x720');
  assert.equal(unsetOptions.slides, true);
  assert.equal(unsetOptions.offline, true);
  assert.equal(unsetOptions.timeout, 5000);
  assert.equal(unsetOptions.scale, 2);
  assert.equal(unsetOptions.fps, 24);
  assert.equal(unsetOptions.duration, 2.5);
  assert.equal(unsetOptions.audio, 'music.wav');
  assert.equal(unsetOptions.keepFrames, true);
}));

test('TC-HTMLX-006 target validation runs before shared dependency checks', () => withFixture((fixture) => {
  // Given: A target with an invalid-value validation error and a preflight marker, but no node_modules.
  const preflightMarker = path.join(fixture.skillRoot, 'preflight-called');
  writeTarget(fixture, 'mp4', {
    flags: { fps: 'number' },
    validateMessage: 'fps must be positive',
    preflightMarker,
  });
  // When: A negative fps value is validated before shared dependencies are available.
  const result = runDispatcher(fixture, ['--to=mp4', 'scene.html', '--fps=-1']);
  // Then: Usage error exits 2, the target message is preserved, and later checks are not entered.
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage error: fps must be positive/);
  assert.doesNotMatch(result.stderr, /Playwright is not installed/);
  assert.equal(fs.existsSync(preflightMarker), false, 'target preflight must not run after validation fails');

  // When the same invalid target value is used with a rejected project-root override.
  const invalidRootResult = runDispatcher(
    fixture,
    ['--to=mp4', 'scene.html', '--fps=-1'],
    'relative-project-root',
  );
  // Then the target usage error still takes precedence over output-root resolution.
  assert.equal(invalidRootResult.status, 2);
  assert.match(invalidRootResult.stderr, /Usage error: fps must be positive/);
  assert.doesNotMatch(invalidRootResult.stderr, /CLAUDE_PROJECT_DIR/);
}));

test('TC-HTMLX-006 target preflight error precedes the shared missing-Playwright error', () => withFixture((fixture) => {
  // Given: A target preflight message and a copied skill with no node_modules.
  writeTarget(fixture, 'mp4', { preflightMessage: 'target-specific ffmpeg dependency is missing' });
  // When: The dispatcher runs the target.
  const result = runDispatcher(fixture, ['--to=mp4', 'scene.html']);
  // Then: It exits 3 with the target's dependency message before shared Playwright preflight.
  assert.equal(result.status, 3);
  assert.match(result.stderr, /target-specific ffmpeg dependency is missing/);
  assert.doesNotMatch(result.stderr, /Playwright is not installed/);
}));

test('TC-HTMLX-007 undeclared target flags are rejected before dependency preflight', () => withFixture((fixture) => {
  // Given: An mp4 target that declares fps but not mystery-flag, with no node_modules.
  writeTarget(fixture, 'mp4', { flags: { fps: 'number' } });
  // When: The dispatcher receives --to=mp4 with the undeclared --mystery-flag.
  const result = runDispatcher(fixture, ['--to=mp4', 'scene.html', '--mystery-flag']);
  // Then: It exits 2, names the rejected flag and the real target, skips Playwright preflight,
  // and writes no stdout.
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown flag --mystery-flag for --to=mp4;/);
  assert.doesNotMatch(result.stderr, /Playwright is not installed/);
  assert.equal(result.stdout, '');
}));

test('TC-HTMLX-060 Node 19 is rejected before dependency checks', () => withFixture((fixture) => {
  // Given: A valid target stub and an injected Node 19 runtime, with no skill dependencies installed.
  writeTarget(fixture, 'png');
  // When: The exported entrypoint runs with the unsupported runtime version.
  const result = runDispatcherWithRuntime(
    fixture,
    ['--to=png', 'scene.html'],
    { nodeVersion: '19.9.0' },
  );
  // Then: Shared preflight exits 3 for Node <20 before reporting missing Playwright.
  assert.equal(result.status, 3, result.all);
  assert.match(result.stderr, /Node\.js 20 or newer is required; found 19\.9\.0/);
  assert.doesNotMatch(result.stderr, /Playwright is not installed/);
  assert.equal(result.stdout, '');
}));

test('TC-HTMLX-061 a valid target reports an invalid project root before dependency preflight', () => withFixture((fixture) => {
  // Given: A valid target stub and a relative CLAUDE_PROJECT_DIR override.
  writeTarget(fixture, 'png');
  // When: The dispatcher validates the target and resolves its default output root.
  const result = runDispatcher(fixture, ['--to=png', 'scene.html'], 'relative-project-root');
  // Then: It exits 1 with the root configuration error before checking Playwright.
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CLAUDE_PROJECT_DIR must be an absolute path/);
  assert.doesNotMatch(result.stderr, /Playwright is not installed/);
  assert.equal(result.stdout, '');
}));

test('TC-HTMLX-062 unsupported target flag types fail before target preflight', () => withFixture((fixture) => {
  // Given: A target declares an unsupported type token and records whether preflight runs.
  const preflightMarker = path.join(fixture.skillRoot, 'preflight-called');
  writeTarget(fixture, 'mp4', {
    flags: { fps: 'unsupported-type' },
    preflightMarker,
  });
  // When: The dispatcher parses options for that target without installing dependencies.
  const result = runDispatcher(fixture, ['--to=mp4', 'scene.html']);
  // Then: It exits 1 naming the invalid declaration and invokes neither target nor shared preflight.
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unsupported type for target flag --fps: unsupported-type/);
  assert.doesNotMatch(result.stderr, /Playwright is not installed/);
  assert.equal(fs.existsSync(preflightMarker), false, 'target preflight must not run after contract validation fails');
  assert.equal(result.stdout, '');
}));

test('TC-HTMLX-091 phase test runner fails when a child test fails', () => withFixture((fixture) => {
  // Given: A copied runner and one test file whose child process exits with an error.
  const runnerPath = path.join(fixture.testsRoot, 'run-tests.cjs');
  fs.copyFileSync(SOURCE_RUNNER, runnerPath);
  fs.writeFileSync(
    path.join(fixture.testsRoot, 'zz.test.cjs'),
    '\'use strict\';\nthrow new Error(\'intentional child failure\');\n',
    'utf8',
  );
  // When: The copied runner executes the discovered test using its normal child-process path.
  const result = runProcess(process.execPath, [runnerPath], {
    fixture,
    cwd: fixture.skillRoot,
  });
  // Then: The runner reports the failing filename and returns a non-zero status.
  assert.equal(result.status, 1);
  assert.match(result.stdout, /zz\.test\.cjs: FAIL \(exit 1\)/);
}));

test('TC-HTMLX-091 phase test runner prints per-file pass, fail and skipped counts', () => withFixture((fixture) => {
  // Given: A copied runner and one test file with one passing case and one skipped case.
  const runnerPath = path.join(fixture.testsRoot, 'run-tests.cjs');
  fs.copyFileSync(SOURCE_RUNNER, runnerPath);
  fs.writeFileSync(path.join(fixture.testsRoot, 'aa.test.cjs'), [
    '\'use strict\';',
    'const test = require(\'node:test\');',
    'test(\'passes\', () => {});',
    'test(\'is environment-blocked\', (t) => { t.skip(\'ENVIRONMENT-BLOCKED: chromium (fixture)\'); });',
    '',
  ].join('\n'), 'utf8');
  // When: The runner executes it.
  const result = runProcess(process.execPath, [runnerPath], { fixture, cwd: fixture.skillRoot });
  // Then: The file still passes, but its line and the total make the skip visible.
  assert.equal(result.status, 0, result.all);
  assert.match(result.stdout, /aa\.test\.cjs: PASS — pass 1, fail 0, skipped 1/);
  assert.match(result.stdout, /TOTAL: PASS — pass 1, fail 0, skipped 1/);
}));

test('TC-HTMLX-004 the skill manifest declares exactly playwright and pdf-lib, with the patched Playwright floor', () => {
  // Given: The skill's own package.json, which travels with the skill into every adopter project.
  const manifest = JSON.parse(fs.readFileSync(path.join(SKILL_ROOT, 'package.json'), 'utf8'));
  // When: Its dependency tables are read.
  const dependencies = manifest.dependencies || {};
  // Then: Only the two runtime libraries are declared (no link back to an authoring repository),
  // and Playwright cannot resolve below 1.55.1.
  assert.deepEqual(Object.keys(dependencies).sort(), ['pdf-lib', 'playwright']);
  assert.equal(dependencies.playwright, '^1.55.1');
  assert.equal(manifest.devDependencies, undefined);
  assert.equal(manifest.optionalDependencies, undefined);
});

test('TC-HTMLX-007 malformed flag values are usage errors before any target preflight', () => withFixture((fixture) => {
  // Given: A png target stub that records whether its preflight ran, and no node_modules.
  const preflightMarker = path.join(fixture.skillRoot, 'preflight-called');
  writeTarget(fixture, 'png', { preflightMarker });
  const cases = [
    { args: ['--offline=yes'], message: /Boolean flag --offline does not take a value/ },
    { args: ['--out'], message: /Flag --out requires a value/ },
    { args: ['--out='], message: /Flag --out requires a non-empty value/ },
    { args: ['--timeout=1.5'], message: /Flag --timeout requires a whole number/ },
    { args: ['--scale=abc'], message: /Flag --scale requires a number/ },
    { args: ['--scale=NaN'], message: /Flag --scale requires a number/ },
    { args: ['--timeout=0'], message: /--timeout must be a positive whole number of milliseconds/ },
    { args: ['--timeout=-5'], message: /--timeout must be a positive whole number of milliseconds/ },
    { args: ['--scale=0'], message: /--scale must be a positive number/ },
    { args: ['--viewport=800x600,800X600'], message: /--viewport lists 800x600 more than once/ },
    { args: ['--viewport=800x600,'], message: /invalid --viewport/ },
    { args: ['--page=wide'], message: /invalid --page "wide"/ },
    { args: ['--slides=   '], message: /--slides needs a CSS selector/ },
  ];
  for (const { args, message } of cases) {
    // When: The dispatcher parses the malformed value.
    const result = runDispatcher(fixture, ['--to=png', 'scene.html', ...args]);
    // Then: Exit 2 with the reason, and the target never reaches its preflight.
    assert.equal(result.status, 2, `${args.join(' ')}\n${result.all}`);
    assert.match(result.stderr, message, args.join(' '));
    assert.equal(result.stdout, '');
  }
  assert.equal(fs.existsSync(preflightMarker), false, 'no malformed value may reach target preflight');
}));

test('TC-HTMLX-006 generic flag ranges are enforced once for png and mp4, before any ffmpeg or Playwright check', () => withFixture((fixture) => {
  // Given: The REAL png and video targets with no node_modules, an existing input, and an ffmpeg
  // override that points at a file that does not exist.
  const input = path.join(fixture.root, 'scene.html');
  fs.writeFileSync(input, '<!doctype html><title>Scene</title><p>Scene</p>', 'utf8');
  const missingFfmpeg = { HTML_EXPORT_FFMPEG: path.join(fixture.root, 'missing', 'ffmpeg-not-here') };
  const argsFor = (target, extra) => (target === 'mp4'
    ? ['--to=mp4', input, '--duration=1', ...extra]
    : ['--to=png', input, ...extra]);
  for (const target of ['png', 'mp4']) {
    for (const bad of ['--timeout=0', '--timeout=-5', '--scale=0', '--scale=-1']) {
      // When: A non-positive generic value is passed.
      const result = runDispatcher(fixture, argsFor(target, [bad]), undefined, missingFfmpeg);
      // Then: Usage error 2 from the dispatcher, never a dependency error 3 or a tool error 1.
      assert.equal(result.status, 2, `${target} ${bad}\n${result.all}`);
      assert.match(result.stderr, /Usage error: --(timeout|scale) must be a positive/);
      assert.doesNotMatch(result.stderr, /ffmpeg|Playwright|Dependency missing/i);
    }
  }
  // Control: The same mp4 command with valid values gets past validation and stops at the
  // missing ffmpeg (exit 3), proving the ranges were checked first rather than never reached.
  const control = runDispatcher(fixture, argsFor('mp4', ['--timeout=5000']), undefined, missingFfmpeg);
  assert.equal(control.status, 3, control.all);
  assert.match(control.stderr, /ffmpeg/i);
  // Control: The png command with valid values reaches the missing-Playwright check (exit 3).
  const pngControl = runDispatcher(fixture, argsFor('png', ['--timeout=5000', '--scale=2']));
  assert.equal(pngControl.status, 3, pngControl.all);
  assert.match(pngControl.stderr, /Playwright is not installed/);
}));

test('TC-HTMLX-062 a target flag that maps onto a dispatcher-owned option is a developer error', () => withFixture((fixture) => {
  // Given: A target that declares --cwd, which would overwrite the runtime cwd the dispatcher passes.
  const preflightMarker = path.join(fixture.skillRoot, 'preflight-called');
  writeTarget(fixture, 'mp4', { flags: { cwd: 'path' }, preflightMarker });
  // When: The dispatcher builds the flag table for that target.
  const result = runDispatcher(fixture, ['--to=mp4', 'scene.html']);
  // Then: Exit 1 naming the reserved option, and the target never runs.
  assert.equal(result.status, 1, result.all);
  assert.match(result.stderr, /target flag --cwd maps to the reserved option cwd/);
  assert.equal(fs.existsSync(preflightMarker), false);
}));

test('TC-HTMLX-005 targets receive the dispatcher runtime cwd and env', () => withFixture((fixture) => {
  // Given: A target stub that records its options, a successful fake browser probe, and an
  // injected runtime cwd that differs from the process cwd.
  writeTarget(fixture, 'png');
  writePlaywright(fixture);
  const runtimeCwd = path.join(fixture.root, 'runtime-cwd');
  fs.mkdirSync(runtimeCwd, { recursive: true });
  // When: main() runs in-process with that runtime.
  const result = runDispatcherWithRuntime(
    fixture,
    ['--to=png', 'scene.html', '--out=out'],
    { cwd: runtimeCwd, env: { HTML_EXPORT_PROBE: 'runtime-env' } },
  );
  // Then: The target sees the runtime cwd and env, and --out resolved against the runtime cwd.
  assert.equal(result.status, 0, result.all);
  const options = readCapture(fixture);
  assert.equal(options.cwd, path.resolve(runtimeCwd));
  assert.deepEqual(options.env, { HTML_EXPORT_PROBE: 'runtime-env' });
  assert.equal(options.outputDir, path.join(path.resolve(runtimeCwd), 'out'));
}));

test('TC-HTMLX-063 the dependency launch probe never borrows a short per-page --timeout', () => {
  // Given: the one launch budget rule (browser.cjs launchBudget) the probe and every session use, and
  // its 30 s default.
  const { DEFAULT_TIMEOUT_MS, launchBudget } = require('../scripts/lib/browser.cjs');
  // When / Then: a short --timeout keeps the default budget, so a busy machine cannot turn an installed
  // Chromium into a failed probe; a longer --timeout extends it; no --timeout uses the default.
  // (The spawned case below proves the probe really launches with this budget.)
  assert.equal(launchBudget(3000), DEFAULT_TIMEOUT_MS);
  assert.equal(launchBudget(DEFAULT_TIMEOUT_MS * 2), DEFAULT_TIMEOUT_MS * 2);
  assert.equal(launchBudget(undefined), DEFAULT_TIMEOUT_MS);
});

test('TC-HTMLX-063 TC-HTMLX-064 the probe AND the session launch get the launch budget, never a short --timeout', () => withFixture((fixture) => {
  // Given: the REAL png target and a fake skill-local Playwright whose launch records the options it
  // was given (its browser has only close(), so the session stops right after its launch).
  const { DEFAULT_TIMEOUT_MS } = require('../scripts/lib/browser.cjs');
  const launches = path.join(fixture.root, 'launches.jsonl');
  writePlaywright(fixture, { recordLaunchesTo: launches });
  const input = path.join(fixture.root, 'scene.html');
  fs.writeFileSync(input, '<!doctype html><title>Scene</title><p>Scene</p>', 'utf8');
  const out = path.join(fixture.root, 'out');
  const readLaunches = () => fs.readFileSync(launches, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  // When: png runs with a per-page --timeout far below what a busy machine needs to start Chromium.
  const short = runDispatcher(fixture, ['--to=png', input, '--viewport=800x600', '--timeout=100', `--out=${out}`]);
  // Then: two launches happened, the dependency probe and the page session (it got past the probe:
  // the fake browser cannot open a page, a tool fault, so exit 1, never 3) ...
  assert.equal(short.status, 1, short.all);
  assert.match(short.stderr, /\(tool fault; continuing\)/);
  const shortLaunches = readLaunches();
  assert.equal(shortLaunches.length, 2, JSON.stringify(shortLaunches));
  // ... and each was bounded by the launch budget, not by the 100 ms page timeout.
  assert.deepEqual(shortLaunches.map((options) => options.timeout), [DEFAULT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS]);

  // When: a --timeout longer than the default is given.
  fs.rmSync(launches);
  const long = runDispatcher(fixture, ['--to=png', input, '--viewport=800x600', `--timeout=${DEFAULT_TIMEOUT_MS * 2}`, `--out=${out}`]);
  // Then: both launches get the longer budget.
  assert.equal(long.status, 1, long.all);
  assert.deepEqual(readLaunches().map((options) => options.timeout), [DEFAULT_TIMEOUT_MS * 2, DEFAULT_TIMEOUT_MS * 2]);
}));

test('TC-HTMLX-068 a --timeout above the largest Node timer delay is a usage error, not an instant expiry', () => withFixture((fixture) => {
  // Given: the REAL png target with no node_modules and an existing input.
  const { MAX_TIMEOUT_MS } = require('../scripts/export.cjs');
  assert.equal(MAX_TIMEOUT_MS, 2 ** 31 - 1);
  const input = path.join(fixture.root, 'scene.html');
  fs.writeFileSync(input, '<!doctype html><title>Scene</title><p>Scene</p>', 'utf8');
  for (const bad of [MAX_TIMEOUT_MS + 1, 3_000_000_000]) {
    // When: a timeout Node would clamp to 1 ms is passed.
    const result = runDispatcher(fixture, ['--to=png', input, `--timeout=${bad}`]);
    // Then: usage error 2 naming the ceiling, before any dependency check (never exit 3 "missing").
    assert.equal(result.status, 2, `${bad}\n${result.all}`);
    assert.match(result.stderr, /Usage error: --timeout must be at most 2147483647 milliseconds/);
    assert.doesNotMatch(result.stderr, /Playwright|Dependency missing/);
  }
  // Control: the ceiling itself is accepted and the run reaches the missing-Playwright check (exit 3).
  const control = runDispatcher(fixture, ['--to=png', input, `--timeout=${MAX_TIMEOUT_MS}`]);
  assert.equal(control.status, 3, control.all);
  assert.match(control.stderr, /Playwright is not installed/);
}));

test('TC-HTMLX-100 the Node version gate accepts the running Node and any 20+ version string', () => withFixture((fixture) => {
  // Given: A target stub and a passing fake Playwright probe, so the Node gate is the only check
  // that could stop the run.
  writeTarget(fixture, 'png');
  writePlaywright(fixture);
  // When: The entrypoint runs with the real Node version (no override) and with 20+ spellings.
  for (const runtime of [{}, { nodeVersion: process.versions.node }, { nodeVersion: '20.0.0' }, { nodeVersion: 'v24.1.0' }]) {
    const result = runDispatcherWithRuntime(fixture, ['--to=png', 'scene.html'], runtime);
    // Then: The run reaches the target (exit 0) and never reports an unsupported Node.
    assert.equal(result.status, 0, `${JSON.stringify(runtime)}\n${result.all}`);
    assert.doesNotMatch(result.stderr, /Node\.js 20 or newer is required/);
  }
}));

test('TC-HTMLX-101 a non-HTML input is a usage error for every target, before any dependency check', () => withFixture((fixture) => {
  // Given: The REAL targets with no node_modules, an existing .txt file, an existing file with no
  // extension, and an ffmpeg override that would fail the video preflight if it were reached.
  const notes = path.join(fixture.root, 'notes.txt');
  fs.writeFileSync(notes, '<p>not html by name</p>', 'utf8');
  const bare = path.join(fixture.root, 'scene');
  fs.writeFileSync(bare, '<p>no extension</p>', 'utf8');
  const missingFfmpeg = { HTML_EXPORT_FFMPEG: path.join(fixture.root, 'missing', 'ffmpeg-not-here') };
  const argsFor = (target, input) => (target === 'mp4' ? ['--to=mp4', input, '--duration=1'] : [`--to=${target}`, input]);
  for (const target of ['pdf', 'mp4', 'png']) {
    for (const input of [notes, bare]) {
      // When: The target is asked to export it.
      const result = runDispatcher(fixture, argsFor(target, input), undefined, missingFfmpeg);
      // Then: Exit 2 naming the file and the accepted extensions; no ffmpeg or Playwright check ran.
      assert.equal(result.status, 2, `${target} ${input}\n${result.all}`);
      assert.ok(result.stderr.includes(`Usage error: input must be an .html or .htm file: ${input}`), result.stderr);
      assert.doesNotMatch(result.stderr, /ffmpeg|Playwright|Dependency missing/i);
    }
  }
  // Control: An upper-case .HTM input passes the rule (case-insensitive) and stops at the missing
  // Playwright (exit 3), and a pdf directory input is left to the target, which expands it.
  const upper = path.join(fixture.root, 'DECK.HTM');
  fs.writeFileSync(upper, '<!doctype html><title>Deck</title><p>Deck</p>', 'utf8');
  const upperResult = runDispatcher(fixture, ['--to=png', upper]);
  assert.equal(upperResult.status, 3, upperResult.all);
  assert.doesNotMatch(upperResult.stderr, /must be an \.html or \.htm file/);
  const pages = path.join(fixture.root, 'pages');
  fs.mkdirSync(pages);
  fs.writeFileSync(path.join(pages, 'one.html'), '<!doctype html><title>One</title><p>One</p>', 'utf8');
  const dirResult = runDispatcher(fixture, ['--to=pdf', pages]);
  assert.equal(dirResult.status, 3, dirResult.all);
  assert.doesNotMatch(dirResult.stderr, /must be an \.html or \.htm file/);
}));

test('TC-HTMLX-102 a Chromium launch probe that times out is a tool fault (exit 1), never "missing" (exit 3)', () => withFixture((fixture) => {
  // Given: A target stub and a fake Playwright whose launch rejects the way Playwright does when the
  // browser does not start within its timeout (a TimeoutError), as on a heavily loaded machine.
  writeTarget(fixture, 'png');
  writePlaywright(fixture, { launchError: 'browserType.launch: Timeout 30000ms exceeded.', launchErrorName: 'TimeoutError' });
  // When: The dispatcher runs its dependency probe.
  const result = runDispatcher(fixture, ['--to=png', 'scene.html']);
  // Then: Exit 1 with "timed out", no setup commands (reinstalling would not help), and the target
  // never ran.
  assert.equal(result.status, 1, result.all);
  assert.match(result.stderr, /html-export error: the Chromium launch probe timed out after 30000 ms/);
  assert.doesNotMatch(result.stderr, /Dependency missing|Setup commands/);
  assert.equal(fs.existsSync(path.join(fixture.skillRoot, 'capture.json')), false);
}));

test('TC-HTMLX-103 a Chromium executable that is not installed stays a missing dependency (exit 3) with the setup block', () => withFixture((fixture) => {
  // Given: A fake Playwright whose launch fails the way it does when the browser was never downloaded.
  writeTarget(fixture, 'png');
  writePlaywright(fixture, { launchError: 'browserType.launch: Executable doesn\'t exist at /cache/chromium_headless_shell/chrome-headless-shell' });
  // When: The dispatcher runs its dependency probe.
  const result = runDispatcher(fixture, ['--to=png', 'scene.html']);
  // Then: Exit 3, the launch cause, and the setup commands; never the timeout wording.
  assert.equal(result.status, 3, result.all);
  assert.match(result.stderr, /Dependency missing: Chromium launch probe failed: browserType\.launch: Executable doesn't exist/);
  assertSetupHints(result.stderr);
  assert.doesNotMatch(result.stderr, /timed out/);
}));

test('TC-HTMLX-104 HTML_EXPORT_DEBUG=1 adds the stack to an unexpected error; without it stderr keeps one line', () => withFixture((fixture) => {
  // Given: A target whose run throws an unexpected error, and a passing fake Playwright probe.
  writeTarget(fixture, 'png', { runError: 'target run exploded' });
  writePlaywright(fixture);
  // When: The dispatcher runs it without and with HTML_EXPORT_DEBUG=1.
  const plain = runDispatcher(fixture, ['--to=png', 'scene.html']);
  const debug = runDispatcher(fixture, ['--to=png', 'scene.html'], undefined, { HTML_EXPORT_DEBUG: '1' });
  // Then: Both exit 1 with the message; only the debug run prints the stack, which names the
  // throwing file, so a quoted stderr locates the defect.
  for (const result of [plain, debug]) {
    assert.equal(result.status, 1, result.all);
    assert.match(result.stderr, /html-export error: target run exploded/);
  }
  assert.doesNotMatch(plain.stderr, /\n\s+at /);
  assert.match(debug.stderr, /\n\s+at .*to-png\.cjs/);

  // And: A developer error (a target flag with an unsupported type) gets the stack under debug too.
  writeTarget(fixture, 'mp4', { flags: { fps: 'unsupported-type' } });
  const developer = runDispatcher(fixture, ['--to=mp4', 'scene.html'], undefined, { HTML_EXPORT_DEBUG: '1' });
  assert.equal(developer.status, 1, developer.all);
  assert.match(developer.stderr, /html-export developer error: unsupported type for target flag --fps/);
  assert.match(developer.stderr, /\n\s+at .*export\.cjs/);
}));

test('TC-HTMLX-107 on Windows an ffmpeg/ffprobe override must be an .exe or .com, never a batch wrapper', () => {
  // Given: The ffmpeg probe with an injected spawn that records every start, run as on win32 (the
  // platform is a parameter, so this runs on every OS).
  const { probeFfmpeg } = require('../scripts/lib/ffmpeg.cjs');
  const started = [];
  const spawn = (binary) => { started.push(binary); return { error: Object.assign(new Error('absent'), { code: 'ENOENT' }) }; };
  const probe = (env, platform = 'win32') => probeFfmpeg({ env, platform, spawn });
  for (const [variable, value] of [
    ['HTML_EXPORT_FFMPEG', 'C:\\tools\\ffmpeg.bat'],
    ['HTML_EXPORT_FFMPEG', 'C:\\tools\\FFMPEG.CMD'],
    ['HTML_EXPORT_FFMPEG', 'C:\\tools\\ffmpeg'],
    ['HTML_EXPORT_FFPROBE', '\\\\server\\share\\ffprobe.bat'],
  ]) {
    // When: The override names a batch wrapper or a file without an extension.
    const result = probe({ [variable]: value });
    // Then: The probe fails (the exit-3 path) naming the variable and the rule, and starts nothing.
    assert.equal(result.ok, false, value);
    assert.ok(result.message.includes(`${variable} must point at an .exe or .com file on Windows; got "${value}"`), result.message);
    assert.deepEqual(started, [], `${value} must not be started`);
  }
  // Control: An .EXE override (any case) passes the rule and is started; on POSIX a file without an
  // extension is the normal executable form and is started too.
  probe({ HTML_EXPORT_FFMPEG: 'C:\\tools\\FFMPEG.EXE' });
  probe({ HTML_EXPORT_FFMPEG: '/usr/local/bin/ffmpeg' }, 'linux');
  assert.deepEqual(started, ['C:\\tools\\FFMPEG.EXE', '/usr/local/bin/ffmpeg']);
});
