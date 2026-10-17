'use strict';

/**
 * Startup-install regression suite.
 *
 * This suite owns the base startup boundary. It deliberately keeps package
 * managers fake and process-isolated: no test may perform an install, run a
 * lifecycle script, load a PnP loader, or use the network. Phase 02b owns the
 * exhaustive literal argv matrix and Phase 02c owns lock/process lifecycle.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const LOCK = require('../../lib/startup-install-lock.cjs');
const {
    LOCK_OUTCOMES,
    DEFAULT_SEAMS: LOCK_DEFAULT_SEAMS
} = LOCK;

const {
    OUTCOMES,
    DEFAULT_SEAMS,
    LOCKFILE_OWNERS,
    MATRIX,
    buildChildEnv,
    buildInstallRequest,
    buildLaunchPlan,
    collectDependencyNames,
    formatDiagnostic,
    inspectPnp,
    parsePackageManagersMetadata,
    resolveSettings,
    runStartupInstall
} = require('../../lib/startup-install.cjs');

const HOOKS_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(HOOKS_ROOT, '..', '..');

// The CI-matrix pin below asserts the UPSTREAM framework repo's own GitHub Actions workflow, so it
// applies ONLY in that repo, identified by its package name (lockstep with DEFAULT_FRAMEWORK_PACKAGE_NAME
// in .claude/scripts/codex/tests/framework-repo.helper.mjs; PORT-011 fails loudly on a rename).
// Never key it on `.github/workflows/ci.yml` existing ALONE: an adopting project's own ci.yml would
// then fail these pins, so the package-name gate comes first. Existence is a second gate, because
// the upstream repo does not ship a CI workflow yet. The runner prints such a case as "(skipped)", not
// as a pass; the skip reason naming the missing file is kept for readers and direct debugging.
const UPSTREAM_CI_WORKFLOW = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml');
const UPSTREAM_CI_SKIP = (() => {
    let name = null;
    try { name = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).name; } catch { /* no root package */ }
    if (name !== 'easy-claude-tooling') return 'asserts the upstream framework repo CI workflow only';
    return fs.existsSync(UPSTREAM_CI_WORKFLOW) ? false : 'upstream CI workflow .github/workflows/ci.yml is not present in this checkout';
})();
const SOURCE_VERIFIER = path.join(HOOKS_ROOT, 'verify-install.cjs');

function withTempFixture(fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-startup-install-'));
    try {
        return fn(root);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

function writeJson(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(file, value, executable = false) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, value, 'utf8');
    if (executable && process.platform !== 'win32') fs.chmodSync(file, 0o755);
}

function writeManifest(root, manifest = {}) {
    writeJson(path.join(root, 'package.json'), manifest);
}

function addDependency(root, name) {
    const parts = name.split('/');
    fs.mkdirSync(path.join(root, 'node_modules', ...parts), { recursive: true });
}

function fakeSeams(root, options = {}) {
    const env = {
        PATH: '',
        Path: '',
        ...options.env
    };
    const managerVersions = options.managerVersions || {};
    return {
        exists: file => fs.existsSync(file),
        readFile: file => fs.readFileSync(file, 'utf8'),
        realpath: file => fs.realpathSync(file),
        platform: () => options.platform || 'linux',
        env: () => env,
        resolveExecutable: ({ managerId }) => ({
            ok: true,
            execPath: `/trusted/bin/${managerId}`,
            viaCorepack: false
        }),
        readManagerVersion: ({ managerId }) => ({
            ok: true,
            version: managerVersions[managerId] || options.version || '10.0.0'
        }),
        ...(options.overrides || {})
    };
}

function buildRequest(root, options = {}) {
    const configStatus = options.configStatus || { state: 'missing', exists: false, valid: false, config: {} };
    const extra = options.extra || {};
    const seams = extra.seams || options.seams || fakeSeams(root, {
        platform: options.platform,
        env: options.env,
        managerVersions: options.managerVersions,
        version: options.version,
        overrides: options.overrides
    });
    return buildInstallRequest({
        projectRoot: root,
        source: options.source === undefined ? 'startup' : options.source,
        configStatus,
        seams,
        ...extra
    });
}

function invokeNode(script, args = [], options = {}) {
    const env = {
        ...process.env,
        ...options.env,
        CLAUDE_PROJECT_DIR: options.cwd || process.cwd()
    };
    return spawnSync(process.execPath, [script, ...args], {
        cwd: options.cwd || process.cwd(),
        env,
        input: options.input,
        encoding: 'utf8',
        timeout: options.timeout || 15000,
        windowsHide: true
    });
}

function makeVerifierFixture(root, { complete, orderLog }) {
    const claude = path.join(root, '.claude');
    const hooks = path.join(claude, 'hooks');
    fs.mkdirSync(hooks, { recursive: true });
    let verifierSource = fs.readFileSync(SOURCE_VERIFIER, 'utf8');
    if (complete) {
        verifierSource = verifierSource.replace(
            '  if (missing.size === 0 && !bootstrapWarning) {',
            "  if (missing.size === 0 && !bootstrapWarning) {\n    fs.appendFileSync(process.env.CK_ORDER_LOG, 'integrity-scan-complete\\n');"
        );
    }
    fs.writeFileSync(path.join(hooks, 'verify-install.cjs'), verifierSource, 'utf8');
    writeJson(path.join(claude, 'settings.json'), {
        hooks: {
            SessionStart: [{
                matcher: 'startup|resume|clear|compact',
                hooks: [{ command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/verify-install.cjs' }]
            }]
        }
    });

    if (!complete) return;

    const append = marker => `require('node:fs').appendFileSync(process.env.CK_ORDER_LOG, ${JSON.stringify(`${marker}\n`)});`;
    fs.mkdirSync(path.join(hooks, 'lib'), { recursive: true });
    // Runtime mode is an optional read-only preflight before installation. This
    // complete bundle fixture must ship that dependency too; its actual mode
    // semantics are covered by framework-runtime.test.cjs.
    writeText(path.join(hooks, 'lib', 'framework-runtime.cjs'), 'module.exports = { skipHook: () => false };\n');
    writeText(path.join(hooks, 'lib', 'project-config-loader.cjs'), `${append('config-loader')}
module.exports = { getProjectConfigStatus: () => ({ state: 'missing', exists: false, valid: false, config: {}, errors: [], warnings: [] }) };
`);
    writeText(path.join(hooks, 'lib', 'windows-git.cjs'), `${append('windows-helper')}
module.exports = {
  OUTCOMES: { READY: 'ready' },
  ensureWindowsGit: () => { ${append('windows-probe')} return { outcome: 'ready', capability: null }; },
  formatDiagnostic: () => null
};
`);
    writeText(path.join(hooks, 'lib', 'startup-install.cjs'), `${append('startup-module')}
module.exports = {
  OUTCOMES: { SKIP_CONFIG_UNAVAILABLE: 'skip-config-unavailable' },
  runStartupInstall: async () => { ${append('startup-run')} return { outcome: 'noop-no-manifest' }; },
  formatDiagnostic: () => null
};
`);
}

function invokeVerifier(root, source, extraEnv = {}) {
    return invokeNode(path.join(root, '.claude', 'hooks', 'verify-install.cjs'), [], {
        cwd: root,
        env: {
            CK_ORDER_LOG: extraEnv.CK_ORDER_LOG,
            ...extraEnv
        },
        input: JSON.stringify({ hook_event_name: 'SessionStart', source })
    });
}

async function withAsyncFixture(fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-startup-install-'));
    try {
        return await fn(root);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

function fixtureLockSeams(parent, options = {}) {
    const platform = options.platform || 'linux';
    const processAlive = typeof options.processAlive === 'function'
        ? options.processAlive
        : () => options.processAlive === undefined ? false : options.processAlive;
    return LOCK.createLockSeams({
        platform: () => platform,
        tempParent: () => parent,
        probePlatformSupport: () => true,
        probePathSafety: () => ({ ok: true }),
        probeParentProtection: () => ({ ok: true }),
        probeChildPrivacy: () => ({ ok: true }),
        processStartIdentity: () => options.processStart || 'fixture-process-start',
        processAlive,
        pid: () => options.pid || 4242,
        userKey: () => options.userKey || 'fixture-user',
        hostKey: () => options.hostKey || 'fixture-host',
        randomToken: () => options.token || 'fixture-token',
        ...(options.now ? { now: options.now } : {}),
        ...(options.sleep ? { sleep: options.sleep } : {}),
        ...(options.overrides || {})
    });
}

function writeFixtureLockRecord(root, parent, seams, overrides = {}) {
    fs.mkdirSync(root, { recursive: true });
    const prepared = LOCK.prepareLockDirectory(seams);
    assert.equal(prepared.ok, true, 'fixture lock directory must be available');
    const key = LOCK.rootKey(fs.realpathSync(root));
    const base = LOCK.buildRecord(seams, key);
    assert.ok(base, 'fixture owner record must be buildable');
    const record = { ...base, ...overrides };
    const lockPath = path.join(prepared.dir, `${key}.lock`);
    fs.rmSync(lockPath, { force: true });
    LOCK.writeRecordExclusive(seams, lockPath, record);
    return { lockPath, record };
}

async function waitForFile(file, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (fs.existsSync(file)) return;
        await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw new Error(`timed out waiting for ${file}`);
}

function spawnWithOutput(args, options = {}) {
    return new Promise(resolve => {
        const child = spawn(process.execPath, args, {
            cwd: options.cwd || process.cwd(),
            env: { ...process.env, ...(options.env || {}) },
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', chunk => { stdout += chunk; });
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
        child.on('error', error => resolve({ code: null, signal: null, stdout, stderr: `${stderr}${error}` }));
    });
}

function createNativeDirectoryLink(target, link) {
    fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
}

// These vectors are deliberately authored independently of MATRIX/buildArgv.
// The runtime matrix is the policy authority; this table proves the resolved
// process-boundary request rather than reusing that authority to generate the
// expected argv.
const LITERAL_MATRIX_ROWS = Object.freeze([
    {
        id: 'npm@10-11',
        manager: 'npm',
        versions: ['10.0.0', '11.0.0'],
        lockfile: 'package-lock.json',
        locklessCreates: 'package-lock.json',
        executable: '/trusted/bin/npm',
        lockedDefault: ['ci', '--ignore-scripts'],
        lockedOptIn: ['ci'],
        locklessDefault: ['install', '--ignore-scripts'],
        locklessOptIn: ['install']
    },
    {
        id: 'npm@12',
        manager: 'npm',
        versions: ['12.0.0'],
        lockfile: 'package-lock.json',
        locklessCreates: 'package-lock.json',
        executable: '/trusted/bin/npm',
        lockedDefault: ['ci', '--ignore-scripts'],
        lockedOptIn: ['ci'],
        locklessDefault: ['install', '--ignore-scripts'],
        locklessOptIn: ['install']
    },
    {
        id: 'pnpm@9.15.0',
        manager: 'pnpm',
        versions: ['9.15.0'],
        lockfile: 'pnpm-lock.yaml',
        locklessCreates: 'pnpm-lock.yaml',
        executable: '/trusted/bin/pnpm',
        lockedDefault: ['install', '--frozen-lockfile', '--ignore-scripts'],
        lockedOptIn: ['install', '--frozen-lockfile'],
        locklessDefault: ['install', '--ignore-scripts'],
        locklessOptIn: ['install']
    },
    {
        id: 'pnpm@12',
        manager: 'pnpm',
        versions: ['12.0.0'],
        lockfile: 'pnpm-lock.yaml',
        locklessCreates: 'pnpm-lock.yaml',
        executable: '/trusted/bin/pnpm',
        lockedDefault: ['install', '--frozen-lockfile', '--ignore-scripts', '--pm-on-fail=error'],
        lockedOptIn: ['install', '--frozen-lockfile', '--pm-on-fail=error'],
        locklessDefault: ['install', '--ignore-scripts', '--pm-on-fail=error'],
        locklessOptIn: ['install', '--pm-on-fail=error']
    },
    {
        id: 'yarn@1',
        manager: 'yarn',
        versions: ['1.22.22'],
        lockfile: 'yarn.lock',
        locklessCreates: 'yarn.lock',
        executable: '/trusted/bin/yarn',
        lockedDefault: ['install', '--frozen-lockfile', '--ignore-scripts', '--non-interactive'],
        lockedOptIn: ['install', '--frozen-lockfile', '--non-interactive'],
        locklessDefault: ['install', '--ignore-scripts', '--non-interactive'],
        locklessOptIn: ['install', '--non-interactive']
    },
    {
        id: 'yarn@2.4',
        manager: 'yarn',
        versions: ['2.4.0'],
        lockfile: 'yarn.lock',
        locklessCreates: 'yarn.lock',
        executable: '/trusted/bin/yarn',
        lockedDefault: ['install', '--immutable', '--skip-builds'],
        lockedOptIn: ['install', '--immutable'],
        locklessDefault: ['install', '--skip-builds'],
        locklessOptIn: ['install']
    },
    {
        id: 'yarn@3-4',
        manager: 'yarn',
        versions: ['3.0.0', '4.0.0'],
        lockfile: 'yarn.lock',
        locklessCreates: 'yarn.lock',
        executable: '/trusted/bin/yarn',
        lockedDefault: ['install', '--immutable', '--mode=skip-build'],
        lockedOptIn: ['install', '--immutable'],
        locklessDefault: ['install', '--mode=skip-build'],
        locklessOptIn: ['install']
    },
    {
        id: 'bun@1.2',
        manager: 'bun',
        versions: ['1.2.0'],
        lockfile: 'bun.lock',
        locklessCreates: 'bun.lock',
        executable: '/trusted/bin/bun',
        lockedDefault: ['install', '--frozen-lockfile', '--ignore-scripts'],
        lockedOptIn: ['install', '--frozen-lockfile'],
        locklessDefault: ['install', '--ignore-scripts'],
        locklessOptIn: ['install']
    }
]);

function literalMatrixConfig(manager, policy) {
    return {
        state: 'valid',
        config: {
            hooks: {
                startupInstall: {
                    packageManager: manager,
                    allowLifecycleScripts: policy !== 'default'
                }
            }
        }
    };
}

function runProcessIsolatedMatrixRow(root, row, version, mode, policy, lockfile = row.lockfile) {
    writeManifest(root, {
        dependencies: { dep: '1.0.0' },
        ...(row.manager === 'bun' ? { trustedDependencies: ['esbuild'] } : {})
    });
    if (mode === 'locked') writeText(path.join(root, lockfile), 'fixture-lock-bytes\n');
    const marker = path.join(root, 'matrix-manager-plan.json');
    const worker = path.join(root, 'matrix-worker.cjs');
    const source = path.join(REPO_ROOT, '.claude', 'hooks', 'lib', 'startup-install.cjs');
    const bundleLib = path.join(root, 'copied-bundle', 'lib');
    const copiedSource = path.join(bundleLib, 'startup-install.cjs');
    fs.mkdirSync(bundleLib, { recursive: true });
    fs.copyFileSync(source, copiedSource);
    fs.copyFileSync(path.join(REPO_ROOT, '.claude', 'hooks', 'lib', 'startup-install-lock.cjs'), path.join(bundleLib, 'startup-install-lock.cjs'));
    const spec = {
        root,
        marker,
        manager: row.manager,
        version,
        policy,
        trust: policy === 'opt-in-trust',
        executable: row.executable
    };
    writeText(worker, `
const fs = require('node:fs');
const startup = require(${JSON.stringify(copiedSource)});
const spec = ${JSON.stringify(spec)};
const env = spec.trust ? { PATH: '', CK_STARTUP_INSTALL_TRUST: '1' } : { PATH: '' };
const seams = {
  exists: file => fs.existsSync(file),
  readFile: file => fs.readFileSync(file, 'utf8'),
  realpath: file => fs.realpathSync(file),
  platform: () => 'linux',
  env: () => env,
  resolveExecutable: () => ({ ok: true, execPath: spec.executable, viaCorepack: false }),
  readManagerVersion: () => ({ ok: true, version: spec.version }),
  spawnManager: async plan => {
    fs.writeFileSync(spec.marker, JSON.stringify({ command: plan.command, args: plan.args }), 'utf8');
    return { outcome: startup.OUTCOMES.INSTALLED, exitCode: 0 };
  },
  lock: { withProjectLock: async ({ run }) => {
    const inner = await run({ publishGroup: () => {} });
    return { outcome: inner.outcome, lockRetained: false };
  } }
};
startup.runStartupInstall({
  projectRoot: spec.root,
  source: 'startup',
  configStatus: {
    state: 'valid',
    config: { hooks: { startupInstall: { packageManager: spec.manager, allowLifecycleScripts: spec.policy !== 'default' } } }
  },
  seams
}).then(result => {
  const observedPlan = JSON.parse(fs.readFileSync(spec.marker, 'utf8'));
  process.stdout.write(JSON.stringify({ result, observedPlan }));
}).catch(error => {
  process.stderr.write(String(error));
  process.exitCode = 1;
});
`);
    const child = invokeNode(worker, [], { cwd: root });
    assert.equal(child.status, 0, child.stderr);
    const output = JSON.parse(child.stdout);
    return { result: output.result, observedPlan: output.observedPlan };
}

// Phase 06 owns the live hook-reference carrier. Until that phase adds the
// exact heading/table, its versioned plan is the checked-in carrier. Once the
// live heading exists, a malformed table must fail rather than falling back.
const PHASE06_MATRIX_HEADING = '### Exact package-manager matrix required in the hook reference';
const LIVE_HOOK_REFERENCE = path.join(REPO_ROOT, '.claude', 'docs', 'hooks', 'README.md');
const PHASE06_PLAN = path.join(REPO_ROOT, 'plans', 'goals', '260921-1426-portable-startup-install', 'phase-06-documentation.md');

function matrixCarrier() {
    if (fs.existsSync(LIVE_HOOK_REFERENCE)) {
        const live = fs.readFileSync(LIVE_HOOK_REFERENCE, 'utf8');
        if (live.includes(PHASE06_MATRIX_HEADING)) return { path: LIVE_HOOK_REFERENCE, text: live };
    }
    if (fs.existsSync(PHASE06_PLAN)) return { path: PHASE06_PLAN, text: fs.readFileSync(PHASE06_PLAN, 'utf8') };
    throw new Error('Phase 06 package-manager matrix carrier is missing');
}

function normalizedDocCell(value) {
    return value.replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

function parseArgvPair(value) {
    const parts = normalizedDocCell(value).split(/\s+\/\s+/);
    if (parts.length !== 2) throw new Error(`unparseable argv pair: ${value}`);
    return parts.map(part => part === '(none)' ? [] : part.split(/\s+/).filter(Boolean));
}

function parseDocumentedMatrix(text) {
    const headingAt = text.indexOf(PHASE06_MATRIX_HEADING);
    if (headingAt < 0) throw new Error('Phase 06 matrix heading is missing');
    const lines = text.slice(headingAt).split(/\r?\n/);
    const headerIndex = lines.findIndex(line => line.includes('| Manager / supported version |'));
    if (headerIndex < 0) throw new Error('Phase 06 matrix header is missing');
    const rows = [];
    for (const line of lines.slice(headerIndex)) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('|')) {
            if (rows.length > 0) break;
            continue;
        }
        const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
        if (cells.every(cell => /^-+$/.test(cell))) continue;
        if (cells[0] === 'Manager / supported version') continue;
        if (cells.length !== 5) throw new Error(`Phase 06 matrix row has ${cells.length} cells`);
        rows.push({
            label: normalizedDocCell(cells[0]),
            lockfileEvidence: normalizedDocCell(cells[1]),
            locked: parseArgvPair(cells[2]),
            lockless: parseArgvPair(cells[3]),
            skipBoundary: normalizedDocCell(cells[4])
        });
    }
    if (rows.length === 0) throw new Error('Phase 06 matrix has no data rows');
    return rows;
}

const DOCUMENTED_MATRIX_CONTRACT = Object.freeze([
    {
        id: 'npm@10-11',
        label: 'npm 10.x / 11.x',
        lockfileEvidence: 'Exactly one of package-lock.json or npm-shrinkwrap.json; manager signals agree',
        locked: [['ci', '--ignore-scripts'], ['ci']],
        lockless: [['install', '--ignore-scripts'], ['install']],
        skipBoundary: 'Skip unknown versions, both npm lockfiles, another manager lockfile, or conflicts. npm ci replaces the existing root node_modules tree when it rebuilds dependencies.'
    },
    {
        id: 'npm@12',
        label: 'npm 12.x',
        lockfileEvidence: 'package-lock.json',
        locked: [['ci', '--ignore-scripts'], ['ci']],
        lockless: [['install', '--ignore-scripts'], ['install']],
        skipBoundary: 'Shrinkwrap-only is an unsupported lockfile, not lockless; skip both npm lockfiles and conflicts. npm ci replaces the existing root node_modules tree when it rebuilds dependencies.'
    },
    {
        id: 'pnpm@9.15.0',
        label: 'pnpm 9.15.0',
        lockfileEvidence: 'pnpm-lock.yaml; manager signals agree',
        locked: [['install', '--frozen-lockfile', '--ignore-scripts'], ['install', '--frozen-lockfile']],
        lockless: [['install', '--ignore-scripts'], ['install']],
        skipBoundary: 'Skip other pnpm 9 versions, unsupported versions/lockfiles, or conflicts. Do not pass --pm-on-fail.'
    },
    {
        id: 'pnpm@12',
        label: 'pnpm 12.x',
        lockfileEvidence: 'pnpm-lock.yaml; manager signals agree',
        locked: [['install', '--frozen-lockfile', '--ignore-scripts', '--pm-on-fail=error'], ['install', '--frozen-lockfile', '--pm-on-fail=error']],
        lockless: [['install', '--ignore-scripts', '--pm-on-fail=error'], ['install', '--pm-on-fail=error']],
        skipBoundary: 'Skip unsupported versions/lockfiles or conflicts; --pm-on-fail=error prevents pinned-CLI downloads.'
    },
    {
        id: 'yarn@1',
        label: 'Yarn Classic 1.x',
        lockfileEvidence: 'yarn.lock; exact trusted external version',
        locked: [['install', '--frozen-lockfile', '--ignore-scripts', '--non-interactive'], ['install', '--frozen-lockfile', '--non-interactive']],
        lockless: [['install', '--ignore-scripts', '--non-interactive'], ['install', '--non-interactive']],
        skipBoundary: 'Skip unknown versions and unsafe .yarnrc yarn-path forwarding; never apply Berry flags.'
    },
    {
        id: 'yarn@2.4',
        label: 'Yarn Berry 2.4.x',
        lockfileEvidence: 'yarn.lock; exact trusted external version; no unsafe yarnPath',
        locked: [['install', '--immutable', '--skip-builds'], ['install', '--immutable']],
        lockless: [['install', '--skip-builds'], ['install']],
        skipBoundary: 'Skip Berry 2.0–2.3, unsupported versions/lockfiles, conflicts, plugins, or unsafe forwarding.'
    },
    {
        id: 'yarn@3-4',
        label: 'Yarn Berry 3.x–4.x',
        lockfileEvidence: 'yarn.lock; exact trusted external version; no unsafe yarnPath',
        locked: [['install', '--immutable', '--mode=skip-build'], ['install', '--immutable']],
        lockless: [['install', '--mode=skip-build'], ['install']],
        skipBoundary: 'Skip unsupported/new majors, versions/lockfiles, conflicts, plugins, or unsafe forwarding.'
    },
    {
        id: 'bun@1.2',
        label: 'Bun 1.2.x',
        lockfileEvidence: 'bun.lock; bun.lockb unsupported',
        locked: [['install', '--frozen-lockfile', '--ignore-scripts'], ['install', '--frozen-lockfile']],
        lockless: [['install', '--ignore-scripts'], ['install']],
        skipBoundary: 'Skip other Bun versions, .lockb, unsupported lockfiles, or conflicts; Bun trustedDependencies still applies after opt-in.'
    }
]);

// The parity test also probes the structured row's lock-state function. The
// prose cell is not accepted merely because a duplicated prose expectation
// matches; these independent inputs must produce the documented locked,
// lockless, or fail-closed state from the runtime authority.
const RUNTIME_LOCKFILE_PROBES = Object.freeze({
    'npm@10-11': [
        { files: [], expected: { mode: 'lockless' } },
        { files: ['package-lock.json'], expected: { mode: 'locked' } },
        { files: ['npm-shrinkwrap.json'], expected: { mode: 'locked' } },
        { files: ['package-lock.json', 'npm-shrinkwrap.json'], expected: { skip: OUTCOMES.SKIP_LOCKFILE_AMBIGUOUS } }
    ],
    'npm@12': [
        { files: [], expected: { mode: 'lockless' } },
        { files: ['package-lock.json'], expected: { mode: 'locked' } },
        { files: ['npm-shrinkwrap.json'], expected: { skip: OUTCOMES.SKIP_LOCKFILE_UNSUPPORTED } },
        { files: ['package-lock.json', 'npm-shrinkwrap.json'], expected: { skip: OUTCOMES.SKIP_LOCKFILE_AMBIGUOUS } }
    ],
    'pnpm@9.15.0': [
        { files: [], expected: { mode: 'lockless' } },
        { files: ['pnpm-lock.yaml'], expected: { mode: 'locked' } }
    ],
    'pnpm@12': [
        { files: [], expected: { mode: 'lockless' } },
        { files: ['pnpm-lock.yaml'], expected: { mode: 'locked' } }
    ],
    'yarn@1': [
        { files: [], expected: { mode: 'lockless' } },
        { files: ['yarn.lock'], expected: { mode: 'locked' } }
    ],
    'yarn@2.4': [
        { files: [], expected: { mode: 'lockless' } },
        { files: ['yarn.lock'], expected: { mode: 'locked' } }
    ],
    'yarn@3-4': [
        { files: [], expected: { mode: 'lockless' } },
        { files: ['yarn.lock'], expected: { mode: 'locked' } }
    ],
    'bun@1.2': [
        { files: [], expected: { mode: 'lockless' } },
        { files: ['bun.lock'], expected: { mode: 'locked' } },
        { files: ['bun.lockb'], expected: { skip: OUTCOMES.SKIP_LOCKFILE_UNSUPPORTED } }
    ]
});

// The two entry files of the workflow route, named by their owner so the verifier's own list cannot drift from it.
const ROUTE_DELIVERY = require('../../lib/workflow-route-delivery.cjs');
const ROUTE_ENTRY = `${ROUTE_DELIVERY.HOOK_NAME}.cjs`;
const CATALOG_ENTRY = `${ROUTE_DELIVERY.CATALOG_HOOK_NAME}.cjs`;

/** Register `entries` beside the verifier in the fixture's settings, each present on disk as a stub hook. */
function registerPromptHooks(root, entries) {
    const hooks = path.join(root, '.claude', 'hooks');
    for (const entry of [ROUTE_ENTRY, CATALOG_ENTRY]) writeText(path.join(hooks, entry), "'use strict';\n");
    const command = entry => `node "$CLAUDE_PROJECT_DIR"/.claude/hooks/${entry}`;
    writeJson(path.join(root, '.claude', 'settings.json'), {
        hooks: {
            SessionStart: [{ matcher: 'startup|resume|clear|compact', hooks: [{ command: command('verify-install.cjs') }] }],
            UserPromptSubmit: entries.map(entry => ({ hooks: [{ command: command(entry), type: 'command' }] }))
        }
    });
}

const tests = [
    {
        // Intent: the workflow route is two hook outputs, each registered on its own. A settings file kept
        // across an upgrade can register one without the other, and the session then gets half the route
        // with no error anywhere. The integrity scan names that state, in either direction, and still runs
        // the startup work: every registered file is present, so the bundle itself is usable.
        name: '[startup-integrity] a route registered without its catalog, or the reverse, is named once and startup still proceeds',
        fn: () => withTempFixture(root => {
            const cases = [
                [[ROUTE_ENTRY], ROUTE_ENTRY, CATALOG_ENTRY, 'prompts get the workflow route gate but not the workflow catalog'],
                [[CATALOG_ENTRY], CATALOG_ENTRY, ROUTE_ENTRY, 'prompts get the workflow catalog but not the workflow route gate']
            ];
            for (const [registered, present, absent, effect] of cases) {
                // Given a complete bundle whose settings register one of the two route entries
                const orderLog = path.join(root, `order-${present}.log`);
                makeVerifierFixture(root, { complete: true, orderLog });
                registerPromptHooks(root, registered);
                // When a session starts
                const result = invokeVerifier(root, 'startup', { CK_ORDER_LOG: orderLog });
                // Then one block names the registered entry, the missing one, what the session loses and the repair
                assert.equal(result.status, 0, result.stderr);
                assert.equal(result.stdout, '');
                assert.equal((result.stderr.match(/Hook registration incomplete/g) || []).length, 1, result.stderr);
                assert.ok(result.stderr.includes(`${present} is registered without ${absent}: ${effect}.`), result.stderr);
                assert.match(result.stderr, /settings\.json was kept across a framework upgrade/);
                assert.match(result.stderr, /Repair: add the missing hook entry/);
                // And it is not reported as a broken copy, and the startup owner still runs
                assert.doesNotMatch(result.stderr, /Install incomplete|node:internal|Require stack|\n\s+at /);
                assert.ok(fs.readFileSync(orderLog, 'utf8').split('\n').includes('startup-run'), 'the startup owner must still run');
            }
        })
    },
    {
        // Intent: the scan names a half-registered route only. Registering both entries is the shipped
        // state, and registering neither is a project's own choice: both stay silent.
        name: '[startup-integrity] a route registered in full, or not at all, raises no registration warning',
        fn: () => withTempFixture(root => {
            for (const registered of [[ROUTE_ENTRY, CATALOG_ENTRY], []]) {
                const orderLog = path.join(root, `order-${registered.length}.log`);
                makeVerifierFixture(root, { complete: true, orderLog });
                registerPromptHooks(root, registered);
                const result = invokeVerifier(root, 'startup', { CK_ORDER_LOG: orderLog });
                assert.equal(result.status, 0, result.stderr);
                assert.equal(result.stdout, '');
                assert.equal(result.stderr, '', `${registered.length} route entries registered`);
            }
        })
    },
    {
        // Intent: a copy that is both missing files and half-registered still gets ONE warning block, with
        // the missing files first (the session cannot run without them) and the registration lines after.
        name: '[startup-integrity] a broken copy with a half-registered route reports both in one block',
        fn: () => withTempFixture(root => {
            const orderLog = path.join(root, 'order.log');
            makeVerifierFixture(root, { complete: true, orderLog });
            registerPromptHooks(root, [ROUTE_ENTRY]);
            fs.rmSync(path.join(root, '.claude', 'hooks', ROUTE_ENTRY));
            const result = invokeVerifier(root, 'startup', { CK_ORDER_LOG: orderLog });
            assert.equal(result.status, 0, result.stderr);
            assert.equal(result.stdout, '');
            assert.equal((result.stderr.match(/⚠ \[easy-claude\]/g) || []).length, 1, result.stderr);
            assert.match(result.stderr, /Install incomplete — 1 hook file\(s\) missing/);
            assert.ok(result.stderr.includes(`- .claude/hooks/${ROUTE_ENTRY}`), result.stderr);
            assert.ok(result.stderr.indexOf('Hook registration is also incomplete') > result.stderr.indexOf('Repair: from the consuming project root'), result.stderr);
            assert.ok(result.stderr.includes(`${ROUTE_ENTRY} is registered without ${CATALOG_ENTRY}`), result.stderr);
            assert.equal(fs.existsSync(orderLog), false, 'a broken copy must not run the startup work');
        })
    },
    {
        // Intent: the shipped settings register every entry of every hook set, so a fresh install never
        // starts with the warning above. This reads the bundle's own settings file, which ships with it.
        name: '[startup-integrity] the shipped settings register both route entries',
        fn: () => {
            const settings = fs.readFileSync(path.join(HOOKS_ROOT, '..', 'settings.json'), 'utf8');
            for (const entry of [ROUTE_ENTRY, CATALOG_ENTRY]) {
                assert.ok(settings.includes(`/.claude/hooks/${entry}`), `settings.json must register ${entry}`);
                assert.ok(fs.existsSync(path.join(HOOKS_ROOT, entry)), `${entry} must ship with the bundle`);
            }
        }
    },
    {
        name: '[startup-integrity] incomplete copied bundle warns once without importing dependent modules',
        fn: () => withTempFixture(root => {
            const orderLog = path.join(root, 'order.log');
            makeVerifierFixture(root, { complete: false, orderLog });
            const result = invokeVerifier(root, 'startup', { CK_ORDER_LOG: orderLog });

            assert.equal(result.status, 0, result.stderr);
            assert.equal(result.stdout, '');
            assert.match(result.stderr, /Install incomplete/);
            assert.equal((result.stderr.match(/Install incomplete/g) || []).length, 1);
            assert.doesNotMatch(result.stderr, /node:internal|Require stack|\n\s+at /);
            assert.equal(fs.existsSync(orderLog), false, 'incomplete copies must not import config/Git/install modules');
        })
    },
    {
        name: '[startup-integrity] complete copy imports helpers only after the integrity scan and only launches startup owner on startup',
        fn: () => withTempFixture(root => {
            const orderLog = path.join(root, 'order.log');
            makeVerifierFixture(root, { complete: true, orderLog });
            const result = invokeVerifier(root, 'startup', { CK_ORDER_LOG: orderLog });

            assert.equal(result.status, 0, result.stderr);
            assert.equal(result.stdout, '');
            assert.equal(result.stderr, '');
            assert.deepEqual(
                fs.readFileSync(orderLog, 'utf8').trim().split('\n'),
                ['integrity-scan-complete', 'config-loader', 'windows-helper', 'windows-probe', 'startup-module', 'startup-run']
            );
        })
    },
    {
        name: '[startup-source] resume, clear, compact, and absent sources never build an install request',
        fn: () => withTempFixture(root => {
            writeManifest(root, { dependencies: { missing: '1.0.0' } });
            for (const source of ['resume', 'clear', 'compact', null]) {
                const result = buildRequest(root, { source });
                assert.equal(result.outcome, OUTCOMES.SKIP_NOT_STARTUP, source || 'absent source');
            }
            const unsupported = buildRequest(root, { seams: fakeSeams(root, { platform: 'solaris' }) });
            assert.equal(unsupported.outcome, OUTCOMES.SKIP_UNSUPPORTED_PLATFORM);
        })
    },
    {
        name: '[startup-dependencies] missing manifest and empty/all-present dependency sets are clean no-ops',
        fn: () => withTempFixture(root => {
            const noManifest = buildRequest(root, {
                extra: {
                    seams: fakeSeams(root, { overrides: { resolveExecutable: () => { throw new Error('must not resolve'); } } })
                }
            });
            assert.equal(noManifest.outcome, OUTCOMES.NOOP_NO_MANIFEST);

            writeManifest(root, { dependencies: {}, devDependencies: {} });
            const empty = buildRequest(root, {
                extra: {
                    seams: fakeSeams(root, { overrides: { resolveExecutable: () => { throw new Error('must not resolve'); } } })
                }
            });
            assert.equal(empty.outcome, OUTCOMES.NOOP_NO_DEPENDENCIES);

            writeManifest(root, {
                dependencies: { direct: '1.0.0', '@scope/scoped': '2.0.0' },
                devDependencies: { dev: '3.0.0', direct: '4.0.0' }
            });
            addDependency(root, 'direct');
            addDependency(root, '@scope/scoped');
            addDependency(root, 'dev');
            const present = buildRequest(root, {
                extra: {
                    seams: fakeSeams(root, { overrides: { resolveExecutable: () => { throw new Error('must not resolve'); } } })
                }
            });
            assert.equal(present.outcome, OUTCOMES.NOOP_DEPENDENCIES_PRESENT);
            assert.deepEqual(collectDependencyNames(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))), ['direct', '@scope/scoped', 'dev']);
        })
    },
    {
        name: '[startup-dependencies] one missing direct or scoped package selects one trusted fake request',
        fn: () => withTempFixture(root => {
            writeManifest(root, { dependencies: { direct: '1.0.0' } });
            let result = buildRequest(root);
            assert.equal(result.outcome, 'eligible');
            assert.equal(result.request.missingCount, 1);
            assert.deepEqual(result.request.argv, ['install', '--ignore-scripts']);
            assert.equal(result.request.managerId, 'npm');

            writeManifest(root, { dependencies: { '@scope/pkg': '1.0.0' } });
            result = buildRequest(root, { version: '10.0.0' });
            assert.equal(result.outcome, 'eligible');
            assert.equal(result.request.missingCount, 1);
            assert.deepEqual(result.request.argv, ['install', '--ignore-scripts']);
        })
    },
    {
        name: '[startup-config] absent defaults, disabled config, and invalid config remain distinct',
        fn: () => {
            assert.deepEqual(resolveSettings({ state: 'missing', config: {} }), {
                settings: { enabled: true, packageManager: 'auto', allowLifecycleScripts: false }
            });
            assert.deepEqual(resolveSettings({ state: 'valid', config: { hooks: { startupInstall: { enabled: false, packageManager: 'npm', allowLifecycleScripts: true } } } }), {
                settings: { enabled: false, packageManager: 'npm', allowLifecycleScripts: true }
            });
            assert.deepEqual(resolveSettings({ state: 'invalid', config: {} }), { skip: OUTCOMES.SKIP_CONFIG_INVALID });
        }
    },
    {
        name: '[startup-manager-signals] project.packageManagers accepts only one lowercase manager and optional dotted pin',
        fn: () => {
            assert.deepEqual(parsePackageManagersMetadata(undefined), { signal: null });
            assert.deepEqual(parsePackageManagersMetadata([]), { signal: null });
            assert.deepEqual(parsePackageManagersMetadata(['pnpm']), { signal: { source: 'project.packageManagers', manager: 'pnpm', version: null } });
            assert.deepEqual(parsePackageManagersMetadata(['pnpm@9.15.0']), { signal: { source: 'project.packageManagers', manager: 'pnpm', version: '9.15.0' } });
            for (const value of [
                'pnpm',
                ['NPM'],
                ['pnpm@9.15'],
                ['pnpm@9.15.0-beta.1'],
                ['pnpm@9.15.0+build'],
                ['npm', 'pnpm'],
                [1],
                { manager: 'npm' }
            ]) {
                assert.equal(parsePackageManagersMetadata(value).skip, OUTCOMES.SKIP_MANAGER_METADATA_INVALID, JSON.stringify(value));
            }
        }
    },
    {
        name: '[startup-manager-signals] exact pins match trusted version, mismatch, conflict, and unsupported-valid versions fail closed',
        fn: () => withTempFixture(root => {
            writeManifest(root, { dependencies: { dep: '1.0.0' } });

            let result = buildRequest(root, {
                version: '10.0.0',
                configStatus: { state: 'valid', config: { project: { packageManagers: ['npm@10.0.0'] } } }
            });
            assert.equal(result.outcome, 'eligible');
            assert.equal(result.version, '10.0.0');

            result = buildRequest(root, {
                version: '10.0.1',
                configStatus: { state: 'valid', config: { project: { packageManagers: ['npm@10.0.0'] } } }
            });
            assert.equal(result.outcome, OUTCOMES.SKIP_MANAGER_VERSION_PIN_MISMATCH);

            result = buildRequest(root, {
                version: '99.1.1',
                configStatus: { state: 'valid', config: { project: { packageManagers: ['npm@99.1.1'] } } }
            });
            assert.equal(result.outcome, OUTCOMES.SKIP_MANAGER_VERSION_UNSUPPORTED);

            result = buildRequest(root, {
                configStatus: {
                    state: 'valid',
                    config: {
                        project: { packageManagers: [] },
                        hooks: { startupInstall: { packageManager: 'pnpm' } }
                    }
                },
                version: '10.0.0'
            });
            writeJson(path.join(root, 'package.json'), { packageManager: 'npm', dependencies: { dep: '1.0.0' } });
            result = buildRequest(root, {
                configStatus: {
                    state: 'valid',
                    config: {
                        project: { packageManagers: [] },
                        hooks: { startupInstall: { packageManager: 'pnpm' } }
                    }
                },
                version: '10.0.0'
            });
            assert.equal(result.outcome, OUTCOMES.SKIP_MANAGER_CONFLICT);
        })
    },
    {
        name: '[startup-manager-trust] project-local shims are skipped before an external manager is trusted',
        fn: () => withTempFixture(root => {
            const project = path.join(root, 'project');
            const localBin = path.join(project, 'node_modules', '.bin');
            const trustedBin = path.join(root, 'trusted-bin');
            fs.mkdirSync(localBin, { recursive: true });
            fs.mkdirSync(trustedBin, { recursive: true });
            const managerName = process.platform === 'win32' ? 'npm.cmd' : 'npm';
            writeText(path.join(localBin, managerName), process.platform === 'win32' ? '@echo off\r\n' : '#!/usr/bin/env node\n', true);
            writeText(path.join(trustedBin, managerName), process.platform === 'win32' ? '@echo off\r\n' : '#!/usr/bin/env node\n', true);

            const result = DEFAULT_SEAMS.resolveExecutable({
                managerId: 'npm',
                projectRoot: project,
                platform: process.platform,
                env: { PATH: [localBin, trustedBin].join(path.delimiter) }
            });
            assert.equal(result.ok, true);
            assert.equal(result.execPath, fs.realpathSync(path.join(trustedBin, managerName)));
        })
    },
    {
        name: '[startup-manager-trust] Corepack-only provenance is rejected without executing a shim',
        fn: () => withTempFixture(root => {
            const corepackBin = path.join(root, 'corepack-bin');
            fs.mkdirSync(corepackBin, { recursive: true });
            const managerName = process.platform === 'win32' ? 'npm.cmd' : 'npm';
            writeText(path.join(corepackBin, managerName), process.platform === 'win32' ? '@echo off\r\nrem corepack\r\n' : '#!/usr/bin/env node\n// corepack\n', true);
            const result = DEFAULT_SEAMS.resolveExecutable({
                managerId: 'npm',
                projectRoot: path.join(root, 'project'),
                platform: process.platform,
                env: { PATH: corepackBin }
            });
            assert.equal(result.ok, false);
            assert.equal(result.code, OUTCOMES.SKIP_COREPACK_SHIM);
        })
    },
    {
        name: '[startup-manager-trust] a canonical executable path resolving inside the project is untrusted',
        fn: () => withTempFixture(root => {
            const project = path.join(root, 'project');
            const externalBin = path.join(root, 'external-bin');
            const localTarget = path.join(project, 'node_modules', '.bin', process.platform === 'win32' ? 'npm.cmd' : 'npm');
            const candidate = path.join(externalBin, path.basename(localTarget));
            fs.mkdirSync(path.dirname(localTarget), { recursive: true });
            fs.mkdirSync(externalBin, { recursive: true });
            writeText(localTarget, process.platform === 'win32' ? '@echo off\r\n' : '#!/usr/bin/env node\n', true);
            writeText(candidate, process.platform === 'win32' ? '@echo off\r\n' : '#!/usr/bin/env node\n', true);

            const originalRealpath = fs.realpathSync;
            const canonicalCandidate = originalRealpath(candidate);
            const canonicalLocalTarget = originalRealpath(localTarget);
            fs.realpathSync = target => originalRealpath(target) === canonicalCandidate
                ? canonicalLocalTarget
                : originalRealpath(target);
            try {
                const result = DEFAULT_SEAMS.resolveExecutable({
                    managerId: 'npm',
                    projectRoot: project,
                    platform: process.platform,
                    env: { PATH: externalBin }
                });
                assert.equal(result.ok, false);
                assert.equal(result.code, OUTCOMES.SKIP_MANAGER_UNTRUSTED_PATH);
            } finally {
                fs.realpathSync = originalRealpath;
            }
        })
    },
    {
        name: '[startup-policy] lifecycle opt-in requires the host grant and credentials never mutate the parent environment',
        fn: () => withTempFixture(root => {
            writeManifest(root, { dependencies: { dep: '1.0.0' } });
            const baseEnv = {
                PATH: '',
                NPM_TOKEN: 'secret-token',
                NPM_CONFIG_USERCONFIG: 'C:\\Users\\owner\\.npmrc',
                YARN_PLUGINS: 'project-plugin.cjs'
            };
            const before = { ...baseEnv };
            const clean = buildChildEnv(baseEnv, false, 'linux');
            assert.equal(clean.NPM_TOKEN, undefined);
            assert.equal(clean.NPM_CONFIG_USERCONFIG, '/dev/null');
            assert.equal(clean.YARN_PLUGINS, undefined);
            assert.deepEqual(baseEnv, before);

            const trusted = buildChildEnv({ ...baseEnv, CK_STARTUP_INSTALL_TRUST: '1' }, false, 'linux');
            assert.equal(trusted.NPM_TOKEN, 'secret-token');
            assert.equal(trusted.YARN_PLUGINS, undefined, 'project-loaded Yarn extensions remain blocked even under host trust');

            const config = { state: 'valid', config: { hooks: { startupInstall: { packageManager: 'npm', allowLifecycleScripts: true } } } };
            let result = buildRequest(root, { configStatus: config, env: baseEnv });
            assert.equal(result.outcome, 'eligible');
            assert.equal(result.request.allowLifecycleScripts, false);
            assert.deepEqual(result.request.argv, ['install', '--ignore-scripts']);
            result = buildRequest(root, { configStatus: config, env: { ...baseEnv, CK_STARTUP_INSTALL_TRUST: '1' } });
            assert.equal(result.outcome, 'eligible');
            assert.equal(result.request.allowLifecycleScripts, true);
            assert.deepEqual(result.request.argv, ['install']);
        })
    },
    {
        name: '[startup-policy] Bun lifecycle opt-in preserves manifest trustedDependencies without synthesizing trust',
        fn: () => withTempFixture(root => {
            const trustedDependencies = ['esbuild'];
            writeManifest(root, {
                packageManager: 'bun@1.2.0',
                dependencies: { dep: '1.0.0' },
                trustedDependencies
            });
            const config = allowLifecycleScripts => ({
                state: 'valid',
                config: { project: { packageManagers: ['bun'] }, hooks: { startupInstall: { packageManager: 'bun', allowLifecycleScripts } } }
            });
            for (const [allowLifecycleScripts, env] of [[false, {}], [true, { CK_STARTUP_INSTALL_TRUST: '1' }]]) {
                const result = buildRequest(root, { configStatus: config(allowLifecycleScripts), env, version: '1.2.0' });
                assert.equal(result.outcome, 'eligible');
                assert.equal(result.request.allowLifecycleScripts, allowLifecycleScripts);
                assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).trustedDependencies, trustedDependencies);
            }
        })
    },
    {
        name: '[startup-extensions] pnpm/Yarn project extensions skip before any manager resolution under both lifecycle policies',
        fn: () => withTempFixture(root => {
            writeManifest(root, { dependencies: { dep: '1.0.0' } });
            const config = state => ({ state: 'valid', config: { project: { packageManagers: ['pnpm'] }, hooks: { startupInstall: { allowLifecycleScripts: state } } } });
            writeText(path.join(root, '.pnpmfile.cjs'), 'process.exit(91);');
            for (const allow of [false, true]) {
                const result = buildRequest(root, {
                    configStatus: config(allow),
                    env: { CK_STARTUP_INSTALL_TRUST: allow ? '1' : '0' },
                    overrides: { resolveExecutable: () => { throw new Error('extension must skip before resolution'); } }
                });
                assert.equal(result.outcome, OUTCOMES.SKIP_PROJECT_EXTENSION);
            }

            fs.rmSync(path.join(root, '.pnpmfile.cjs'));
            writeJson(path.join(root, 'package.json'), { packageManager: 'yarn@1.22.22', dependencies: { dep: '1.0.0' } });
            for (const fixture of [
                { env: { YARN_PLUGINS: 'plugin.cjs' } },
                { env: {}, text: 'yarnPath: .yarn/releases/project.cjs\n' },
                { env: {}, text: 'plugins:\n  - path: .yarn/plugins/project.cjs\n' }
            ]) {
                if (fixture.text) writeText(path.join(root, '.yarnrc.yml'), fixture.text);
                const result = buildRequest(root, {
                    configStatus: { state: 'valid', config: { hooks: { startupInstall: { packageManager: 'yarn' } } } },
                    env: fixture.env,
                    overrides: { resolveExecutable: () => { throw new Error('Yarn extension must skip before resolution'); } }
                });
                assert.equal(result.outcome, OUTCOMES.SKIP_PROJECT_EXTENSION);
                fs.rmSync(path.join(root, '.yarnrc.yml'), { force: true });
            }
        })
    },
    {
        name: '[startup-pnp] PnP loaders are never executed and inconclusive/malformed sidecars skip safely',
        fn: () => withTempFixture(root => {
            writeManifest(root, { dependencies: { dep: '1.0.0' } });
            const sentinel = path.join(root, 'pnp-loader-ran');
            writeText(path.join(root, '.pnp.cjs'), `require('node:fs').writeFileSync(${JSON.stringify(sentinel)}, 'ran');`);
            let result = buildRequest(root, {
                overrides: { resolveExecutable: () => { throw new Error('PnP inconclusive must skip before resolution'); } }
            });
            assert.equal(result.outcome, OUTCOMES.SKIP_PNP_INCONCLUSIVE);
            assert.equal(fs.existsSync(sentinel), false);

            writeText(path.join(root, '.pnp.data.json'), '{bad');
            result = buildRequest(root, {
                overrides: { resolveExecutable: () => { throw new Error('malformed PnP must skip before resolution'); } }
            });
            assert.equal(result.outcome, OUTCOMES.SKIP_PNP_UNSUPPORTED);

            writeJson(path.join(root, '.pnp.data.json'), { packageRegistryData: [[null, []], ['dep', [['ref', { packageLocation: 'node_modules/dep/' }]]]] });
            fs.mkdirSync(path.join(root, 'node_modules', 'dep'), { recursive: true });
            result = buildRequest(root, {
                overrides: { resolveExecutable: () => { throw new Error('complete PnP state must no-op'); } }
            });
            assert.equal(result.outcome, OUTCOMES.NOOP_DEPENDENCIES_PRESENT);

            writeJson(path.join(root, '.pnp.data.json'), { packageRegistryData: [[null, []]] });
            result = buildRequest(root, { version: '1.22.22' });
            assert.equal(result.outcome, 'eligible');
            assert.equal(result.request.missingCount, 1);
        })
    },
    {
        name: '[startup-pnp] escaping archive locations are unsupported rather than treated as missing',
        fn: () => withTempFixture(root => {
            const names = ['dep'];
            writeJson(path.join(root, '.pnp.data.json'), { packageRegistryData: [[null, []], ['dep', [['ref', { packageLocation: '../outside/cache.zip' }]]]] });
            const result = inspectPnp({ projectRoot: root, names, seams: fakeSeams(root) });
            assert.deepEqual(result, { skip: OUTCOMES.SKIP_PNP_UNSUPPORTED });
        })
    },
    {
        name: '[startup-diagnostics] hostile manager/config/path values cannot forge or leak diagnostics',
        fn: () => {
            const hostile = '\u001b[31mC:\\secret\\project\r\nFORGED\u001b[0m';
            const safe = formatDiagnostic({ outcome: OUTCOMES.INSTALL_FAILED, manager: hostile, version: hostile, exitCode: 7, stderr: hostile, path: hostile });
            assert.equal(safe, '[startup-install] package-manager: install failed (exit 7). Run the install manually to see its output.');
            assert.doesNotMatch(safe, /FORGED|secret|\u001b|\r|\n/);
            assert.equal(formatDiagnostic({ outcome: OUTCOMES.SKIP_CONFIG_INVALID, config: hostile }), '[startup-install] project config is invalid — installation skipped (integrity checks still ran).');
            assert.equal(formatDiagnostic({ outcome: OUTCOMES.SKIP_MANAGER_VERSION_UNSUPPORTED, manager: 'npm\r\nforged', version: '99.1.1\u001b[31m' }), '[startup-install] skipped: skip-manager-version-unsupported.');
        }
    },
    {
        name: '[startup-windows-launch] unsafe .cmd paths skip and safe fixed templates never interpolate cwd or command text',
        fn: () => {
            const unsafe = buildLaunchPlan({
                managerId: 'npm',
                execPath: 'C:\\Program Files\\bad&evil\\npm.cmd',
                args: ['install', '--ignore-scripts'],
                cwd: 'C:\\project\\with spaces & controls',
                env: { SystemRoot: 'C:\\Windows' },
                platform: 'win32'
            });
            assert.equal(unsafe.skip, OUTCOMES.SKIP_UNSAFE_LAUNCH);

            const safe = buildLaunchPlan({
                managerId: 'npm',
                execPath: 'C:\\Program Files\\Trusted\\npm.cmd',
                args: ['install', '--ignore-scripts'],
                cwd: 'C:\\project\\with spaces & controls',
                env: { SystemRoot: 'C:\\Windows' },
                platform: 'win32'
            });
            assert.equal(safe.plan.command, path.join('C:\\Windows', 'System32', 'cmd.exe'));
            assert.deepEqual(safe.plan.args.slice(0, 2), ['/d', '/s']);
            assert.equal(safe.plan.args[3], '""C:\\Program Files\\Trusted\\npm.cmd" install --ignore-scripts"');
            assert.equal(safe.plan.args[3].includes('with spaces & controls'), false);
        }
    },
    {
        name: '[startup-matrix] literal executable and argv vectors cover every supported row and lifecycle policy',
        fn: () => {
            for (const row of LITERAL_MATRIX_ROWS) {
                assert.equal(LOCKFILE_OWNERS[row.lockfile], row.manager, `${row.id} lockfile owner`);
                for (const version of row.versions) {
                    for (const mode of ['locked', 'lockless']) {
                        for (const policy of ['default', 'opt-in-no-trust', 'opt-in-trust']) {
                            withTempFixture(root => {
                                const observed = runProcessIsolatedMatrixRow(root, row, version, mode, policy);
                                const result = observed.result;
                                const granted = policy === 'opt-in-trust';
                                const expected = mode === 'locked'
                                    ? (granted ? row.lockedOptIn : row.lockedDefault)
                                    : (granted ? row.locklessOptIn : row.locklessDefault);

                    assert.equal(result.outcome, OUTCOMES.INSTALLED, `${row.id} ${version} ${mode} ${policy}`);
                                assert.equal(result.request.rowId, row.id);
                                assert.equal(result.request.mode, mode);
                                assert.equal(observed.observedPlan.command, row.executable);
                                assert.deepEqual(observed.observedPlan.args, expected);
                                assert.equal(result.request.plan.command, row.executable);
                                assert.deepEqual(result.request.plan.args, expected);
                                assert.deepEqual(result.request.argv, expected);
                                assert.equal(result.request.allowLifecycleScripts, granted);
                                if (mode === 'locked') {
                                    assert.equal(
                                        fs.readFileSync(path.join(root, row.lockfile), 'utf8'),
                                        'fixture-lock-bytes\n',
                                        `${row.id} ${version} must not mutate the matching lockfile`
                                    );
                                }
                            });
                        }
                    }
                }
            }
        }
    },
    {
        name: '[startup-matrix] unsupported versions, lockfiles, and conflicts fail closed before lockless fallback',
        fn: () => {
            const assertSkip = ({ manager, version, files, outcome }) => withTempFixture(root => {
                writeManifest(root, { dependencies: { dep: '1.0.0' } });
                for (const file of files) writeText(path.join(root, file), 'fixture-lock\n');
                const result = buildRequest(root, {
                    configStatus: literalMatrixConfig(manager, 'default'),
                    version
                });
                assert.equal(result.outcome, outcome, `${manager}@${version} ${files.join(',')}`);
            });

            const npmRow = LITERAL_MATRIX_ROWS.find(row => row.id === 'npm@10-11');
            for (const version of ['10.0.0', '11.0.0']) {
                withTempFixture(root => {
                    const observed = runProcessIsolatedMatrixRow(root, npmRow, version, 'locked', 'default', 'npm-shrinkwrap.json');
                    assert.equal(observed.result.outcome, OUTCOMES.INSTALLED, `npm ${version} shrinkwrap fake run`);
                    assert.deepEqual(observed.observedPlan.args, ['ci', '--ignore-scripts']);
                    assert.equal(fs.readFileSync(path.join(root, 'npm-shrinkwrap.json'), 'utf8'), 'fixture-lock-bytes\n');
                });
            }

            assertSkip({ manager: 'npm', version: '12.0.0', files: ['npm-shrinkwrap.json'], outcome: OUTCOMES.SKIP_LOCKFILE_UNSUPPORTED });
            assertSkip({ manager: 'npm', version: '12.0.0', files: ['package-lock.json', 'npm-shrinkwrap.json'], outcome: OUTCOMES.SKIP_LOCKFILE_AMBIGUOUS });
            assertSkip({ manager: 'pnpm', version: '9.15.1', files: [], outcome: OUTCOMES.SKIP_MANAGER_VERSION_UNSUPPORTED });
            assertSkip({ manager: 'yarn', version: '2.3.0', files: [], outcome: OUTCOMES.SKIP_MANAGER_VERSION_UNSUPPORTED });
            assertSkip({ manager: 'bun', version: '1.2.0', files: ['bun.lockb'], outcome: OUTCOMES.SKIP_LOCKFILE_UNSUPPORTED });
            assertSkip({ manager: 'pnpm', version: '12.0.0', files: ['package-lock.json'], outcome: OUTCOMES.SKIP_MANAGER_CONFLICT });

            withTempFixture(root => {
                writeManifest(root, { dependencies: { dep: '1.0.0' } });
                const fallback = buildRequest(root, { version: '10.0.0' });
                assert.equal(fallback.outcome, 'eligible');
                assert.equal(fallback.manager, 'npm');
                assert.equal(fallback.request.plan.command, '/trusted/bin/npm');
                assert.deepEqual(fallback.request.plan.args, ['install', '--ignore-scripts']);
            });
        }
    },
    {
        name: '[startup-matrix] lockless fake manager may create its lockfile while no real manager or network runs',
        fn: async () => {
            for (const row of LITERAL_MATRIX_ROWS) {
                const version = row.versions[0];
                await withAsyncFixture(async root => {
                    writeManifest(root, { dependencies: { dep: '1.0.0' } });
                    const created = path.join(root, row.locklessCreates);
                    let calls = 0;
                    const seams = fakeSeams(root, {
                        version,
                        overrides: {
                            spawnManager: async plan => {
                                calls += 1;
                                assert.equal(plan.command, row.executable);
                                assert.deepEqual(plan.args, row.locklessDefault);
                                fs.writeFileSync(created, 'fake-manager-created-lock\n', 'utf8');
                                return { outcome: OUTCOMES.INSTALLED, exitCode: 0 };
                            },
                            lock: {
                                withProjectLock: async ({ run }) => {
                                    const inner = await run({ publishGroup: () => {} });
                                    return { outcome: inner.outcome, lockRetained: false };
                                }
                            }
                        }
                    });
                    const result = await runStartupInstall({
                        projectRoot: root,
                        source: 'startup',
                        configStatus: literalMatrixConfig(row.manager, 'default'),
                        seams
                    });
                    assert.equal(result.outcome, OUTCOMES.INSTALLED, row.id);
                    assert.equal(result.request.mode, 'lockless');
                    assert.equal(calls, 1, `${row.id} fake manager invocation count`);
                    assert.equal(fs.readFileSync(created, 'utf8'), 'fake-manager-created-lock\n');
                });
            }
        }
    },
    {
        name: '[startup-matrix] Phase 06 documentation carrier matches every structured row and argv cell',
        fn: () => {
            const carrier = matrixCarrier();
            const documented = parseDocumentedMatrix(carrier.text);
            const contracts = new Map(DOCUMENTED_MATRIX_CONTRACT.map(row => [row.id, row]));
            const runtimeIds = MATRIX.map(row => row.id).sort();
            const documentedIds = [...contracts.keys()].sort();

            assert.deepEqual(documentedIds, runtimeIds, `matrix row set drift in ${carrier.path}`);
            assert.equal(documented.length, DOCUMENTED_MATRIX_CONTRACT.length, `unexpected documented row count in ${carrier.path}`);

            const rowIdByLabel = new Map(DOCUMENTED_MATRIX_CONTRACT.map(row => [row.label, row.id]));
            const seen = new Set();
            for (const docRow of documented) {
                const id = rowIdByLabel.get(docRow.label);
                assert.ok(id, `unknown documented manager row: ${docRow.label}`);
                assert.equal(seen.has(id), false, `duplicate documented manager row: ${id}`);
                seen.add(id);

                const contract = contracts.get(id);
                assert.equal(docRow.lockfileEvidence, contract.lockfileEvidence, `${id} lockfile evidence`);
                assert.deepEqual(docRow.locked, contract.locked, `${id} documented locked vectors`);
                assert.deepEqual(docRow.lockless, contract.lockless, `${id} documented lockless vectors`);
                assert.equal(docRow.skipBoundary, contract.skipBoundary, `${id} skip boundary`);

                const runtime = MATRIX.find(row => row.id === id);
                assert.ok(runtime, `${id} is missing from the structured runtime matrix`);
                const probes = RUNTIME_LOCKFILE_PROBES[id];
                assert.ok(probes, `${id} has no structured lock-state probes`);
                for (const probe of probes) {
                    assert.deepEqual(
                        runtime.lockState(new Set(probe.files)),
                        probe.expected,
                        `${id} lock-state probe ${probe.files.join(',') || '(none)'}`
                    );
                }
                const runtimeLockedDefault = [...runtime.locked, ...(runtime.suppression || []), ...runtime.trailing];
                const runtimeLockedOptIn = [...runtime.locked, ...runtime.trailing];
                const runtimeLocklessDefault = [...runtime.lockless, ...(runtime.suppression || []), ...runtime.trailing];
                const runtimeLocklessOptIn = [...runtime.lockless, ...runtime.trailing];
                assert.deepEqual(contract.locked[0], runtimeLockedDefault, `${id} locked default runtime parity`);
                assert.deepEqual(contract.locked[1], runtimeLockedOptIn, `${id} locked opt-in runtime parity`);
                assert.deepEqual(contract.lockless[0], runtimeLocklessDefault, `${id} lockless default runtime parity`);
                assert.deepEqual(contract.lockless[1], runtimeLocklessOptIn, `${id} lockless opt-in runtime parity`);
            }
            assert.deepEqual([...seen].sort(), runtimeIds, `missing documented rows in ${carrier.path}`);
        }
    },
    {
        name: '[startup-lock] unsupported platforms and unsafe temp/child states skip before manager launch',
        fn: async () => withAsyncFixture(async root => {
            const parent = path.join(root, 'fixture-temp');
            fs.mkdirSync(parent, { recursive: true });
            let runCalls = 0;
            let mkdirCalls = 0;

            const unsupported = fixtureLockSeams(parent, {
                platform: 'freebsd',
                overrides: { mkdir: () => { mkdirCalls += 1; } }
            });
            let result = await LOCK.withProjectLock({
                canonicalRoot: root,
                seams: unsupported,
                recheck: () => false,
                run: async () => { runCalls += 1; return { outcome: 'must-not-run' }; }
            });
            assert.equal(result.outcome, LOCK_OUTCOMES.UNSUPPORTED_PLATFORM);
            assert.equal(mkdirCalls, 0, 'unsupported platforms skip before lock-directory creation');
            assert.equal(runCalls, 0);

            const platformUnavailable = fixtureLockSeams(parent, {
                overrides: { probePlatformSupport: () => false }
            });
            result = await LOCK.withProjectLock({
                canonicalRoot: root,
                seams: platformUnavailable,
                recheck: () => false,
                run: async () => { runCalls += 1; return { outcome: 'must-not-run' }; }
            });
            assert.equal(result.outcome, LOCK_OUTCOMES.PRIVACY_UNPROVABLE);
            assert.equal(runCalls, 0);

            const unsafeParent = fixtureLockSeams(parent, {
                overrides: {
                    probePathSafety: () => ({ ok: false, code: LOCK_OUTCOMES.UNSAFE_TEMP_PARENT })
                }
            });
            result = await LOCK.withProjectLock({
                canonicalRoot: root,
                seams: unsafeParent,
                recheck: () => false,
                run: async () => { runCalls += 1; return { outcome: 'must-not-run' }; }
            });
            assert.equal(result.outcome, LOCK_OUTCOMES.UNSAFE_TEMP_PARENT);
            assert.equal(runCalls, 0);

            const unsafeChild = fixtureLockSeams(parent, {
                overrides: { probeChildPrivacy: () => ({ ok: false, code: LOCK_OUTCOMES.UNSAFE_LOCK_CHILD }) }
            });
            result = await LOCK.withProjectLock({
                canonicalRoot: path.join(root, 'unsafe-child-project'),
                seams: unsafeChild,
                recheck: () => false,
                run: async () => { runCalls += 1; return { outcome: 'must-not-run' }; }
            });
            assert.equal(result.outcome, LOCK_OUTCOMES.UNSAFE_LOCK_CHILD);
            assert.equal(runCalls, 0);

            const safe = fixtureLockSeams(parent);
            result = await LOCK.withProjectLock({
                canonicalRoot: path.join(root, 'safe-project'),
                seams: safe,
                recheck: () => false,
                run: async () => { runCalls += 1; return { outcome: 'fake-installed' }; }
            });
            assert.equal(result.outcome, 'fake-installed');
            assert.equal(runCalls, 1);
            assert.equal(fs.existsSync(result.lockPath), false, 'a proven no-group run releases its lock');
            assert.equal(path.resolve(result.lockPath).startsWith(path.resolve(root, 'safe-project') + path.sep), false, 'lock state stays outside the project');
        })
    },
    {
        name: '[startup-lock] same-root contention is process-isolated and post-lock recheck prevents a second manager',
        fn: async () => withAsyncFixture(async root => {
            const parent = path.join(root, 'shared-temp');
            fs.mkdirSync(parent, { recursive: true });
            const ownerReady = path.join(parent, 'owner-ready');
            const ownerRelease = path.join(parent, 'owner-release');
            const contenderRan = path.join(parent, 'contender-ran');
            const contenderDone = path.join(parent, 'contender-done');
            const worker = path.join(root, 'lock-worker.cjs');
            writeText(worker, `
const fs = require('node:fs');
const lock = require(${JSON.stringify(path.join(REPO_ROOT, '.claude', 'hooks', 'lib', 'startup-install-lock.cjs'))});
const root = ${JSON.stringify(root)};
const parent = ${JSON.stringify(parent)};
const ready = ${JSON.stringify(ownerReady)};
const release = ${JSON.stringify(ownerRelease)};
const contenderRan = ${JSON.stringify(contenderRan)};
const contenderDone = ${JSON.stringify(contenderDone)};
const mode = process.argv[2];
let logicalNow = 0;
const seams = lock.createLockSeams({
  platform: () => 'linux',
  tempParent: () => parent,
  probePlatformSupport: () => true,
  probePathSafety: () => ({ ok: true }),
  probeParentProtection: () => ({ ok: true }),
  probeChildPrivacy: () => ({ ok: true }),
  processStartIdentity: () => 'same-owner-start',
  processAlive: () => mode === 'contender',
  userKey: () => 'same-user',
  hostKey: () => 'same-host',
  randomToken: () => mode + '-token',
  now: () => mode === 'contender' ? logicalNow : Date.now(),
  sleep: async ms => { logicalNow += ms; }
});
const run = async () => {
  if (mode === 'owner') {
    fs.writeFileSync(ready, 'ready');
    const deadline = Date.now() + 15000;
    while (!fs.existsSync(release)) {
      if (Date.now() >= deadline) throw new Error('timed out waiting for contender');
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    return { outcome: 'owner-finished' };
  }
  fs.writeFileSync(contenderRan, 'unexpected');
  return { outcome: 'contender-ran' };
};
lock.withProjectLock({ canonicalRoot: fs.realpathSync(root), seams, recheck: () => false, run })
  .then(result => {
    if (mode === 'contender') fs.writeFileSync(contenderDone, 'done');
    process.stdout.write(JSON.stringify(result));
  })
  .catch(error => { process.stderr.write(String(error)); process.exitCode = 1; });
`);

            const ownerPromise = spawnWithOutput([worker, 'owner'], { cwd: root });
            await waitForFile(ownerReady);
            const contenderPromise = spawnWithOutput([worker, 'contender'], { cwd: root });
            await waitForFile(contenderDone);
            fs.writeFileSync(ownerRelease, 'release');
            const [owner, contender] = await Promise.all([ownerPromise, contenderPromise]);
            assert.equal(owner.code, 0, owner.stderr);
            assert.equal(contender.code, 0, contender.stderr);
            const ownerResult = JSON.parse(owner.stdout);
            const contenderResult = JSON.parse(contender.stdout);
            assert.equal(ownerResult.outcome, 'owner-finished');
            assert.equal(contenderResult.outcome, LOCK_OUTCOMES.IN_PROGRESS);
            assert.equal(fs.existsSync(contenderRan), false, 'a live same-root owner blocks a second manager');
            assert.notEqual(LOCK.rootKey(path.join(root, 'project-a')), LOCK.rootKey(path.join(root, 'project-b')));

            let complete = false;
            let runs = 0;
            const seams = fixtureLockSeams(parent);
            const first = await LOCK.withProjectLock({
                canonicalRoot: path.join(root, 'recheck-project'),
                seams,
                recheck: () => complete,
                run: async () => { runs += 1; complete = true; return { outcome: 'repaired' }; }
            });
            const second = await LOCK.withProjectLock({
                canonicalRoot: path.join(root, 'recheck-project'),
                seams,
                recheck: () => complete,
                run: async () => { runs += 1; return { outcome: 'must-not-run' }; }
            });
            assert.equal(first.outcome, 'repaired');
            assert.equal(second.outcome, LOCK_OUTCOMES.REPAIRED_BY_PEER);
            assert.equal(runs, 1, 'the post-lock completeness recheck owns the no-op');

            let active = 0;
            let maxActive = 0;
            const rootA = path.join(root, 'root-a');
            const rootB = path.join(root, 'root-b');
            const independent = projectRoot => LOCK.withProjectLock({
                canonicalRoot: projectRoot,
                seams,
                recheck: () => false,
                run: async () => {
                    active += 1;
                    maxActive = Math.max(maxActive, active);
                    await new Promise(resolve => setTimeout(resolve, 40));
                    active -= 1;
                    return { outcome: 'independent' };
                }
            });
            const independentResults = await Promise.all([independent(rootA), independent(rootB)]);
            assert.deepEqual(independentResults.map(item => item.outcome), ['independent', 'independent']);
            assert.equal(maxActive, 2, 'distinct canonical roots do not serialize behind one lock');
        })
    },
    {
        name: '[startup-lock] stale recovery is positive-proof-only and token/identity races fail closed',
        fn: async () => withAsyncFixture(async root => {
            const parent = path.join(root, 'fixture-temp');
            fs.mkdirSync(parent, { recursive: true });
            const staleRoot = path.join(root, 'stale-root');
            const staleSeams = fixtureLockSeams(parent, { processAlive: false });
            const stale = writeFixtureLockRecord(staleRoot, parent, staleSeams);
            let runs = 0;
            const recovered = await LOCK.withProjectLock({
                canonicalRoot: fs.realpathSync(staleRoot),
                seams: staleSeams,
                recheck: () => false,
                run: async () => { runs += 1; return { outcome: 'recovered' }; }
            });
            assert.equal(recovered.outcome, 'recovered');
            assert.equal(runs, 1);
            assert.equal(fs.existsSync(stale.lockPath), false);

            const reusedRoot = path.join(root, 'reused-root');
            const oldIdentity = fixtureLockSeams(parent, {
                pid: 5001,
                processStart: 'old-process-start',
                processAlive: false
            });
            writeFixtureLockRecord(reusedRoot, parent, oldIdentity);
            const reused = fixtureLockSeams(parent, {
                pid: 5001,
                processStart: 'new-process-start',
                processAlive: true
            });
            runs = 0;
            const reusedResult = await LOCK.withProjectLock({
                canonicalRoot: fs.realpathSync(reusedRoot),
                seams: reused,
                recheck: () => false,
                run: async () => { runs += 1; return { outcome: 'must-not-run' }; }
            });
            assert.equal(reusedResult.outcome, LOCK_OUTCOMES.OWNERSHIP_UNVERIFIABLE);
            assert.equal(runs, 0);

            const malformedRoot = path.join(root, 'malformed-root');
            const malformedSeams = fixtureLockSeams(parent);
            const malformedPrepared = LOCK.prepareLockDirectory(malformedSeams);
            const malformedPath = path.join(malformedPrepared.dir, `${LOCK.rootKey(malformedRoot)}.lock`);
            fs.writeFileSync(malformedPath, '{not-json\n', 'utf8');
            const malformedResult = await LOCK.withProjectLock({
                canonicalRoot: malformedRoot,
                seams: malformedSeams,
                recheck: () => false,
                run: async () => { runs += 1; return { outcome: 'must-not-run' }; }
            });
            assert.equal(malformedResult.outcome, LOCK_OUTCOMES.OWNERSHIP_UNVERIFIABLE);
            assert.equal(fs.existsSync(malformedPath), true);

            const liveRoot = path.join(root, 'live-descendant-root');
            let clock = 0;
            const liveSeams = fixtureLockSeams(parent, {
                now: () => clock,
                sleep: async ms => { clock += ms; },
                overrides: {
                    processAlive: () => false,
                    treeAlive: () => true
                }
            });
            const liveTree = {
                root: { pid: 6001, start: 'owner-start' },
                members: [{ pid: 6001, ppid: 1, start: 'owner-start' }, { pid: 6002, ppid: 6001, start: 'child-start' }]
            };
            const live = writeFixtureLockRecord(liveRoot, parent, liveSeams, { pid: 6001, processStart: 'owner-start', tree: liveTree, group: { kind: 'pgid', id: 6001 }, launching: false });
            runs = 0;
            const liveResult = await LOCK.withProjectLock({
                canonicalRoot: fs.realpathSync(liveRoot),
                seams: liveSeams,
                recheck: () => false,
                run: async () => { runs += 1; return { outcome: 'must-not-run' }; }
            });
            assert.equal(liveResult.outcome, LOCK_OUTCOMES.IN_PROGRESS);
            assert.equal(runs, 0);
            assert.equal(fs.existsSync(live.lockPath), true, 'a surviving descendant retains the lock');

            const racedRoot = path.join(root, 'raced-root');
            fs.mkdirSync(racedRoot, { recursive: true });
            const racedBase = fixtureLockSeams(parent, { processAlive: false });
            const raced = writeFixtureLockRecord(fs.realpathSync(racedRoot), parent, racedBase);
            const raw = fs.readFileSync(raced.lockPath, 'utf8');
            // JSON accepts trailing whitespace, so this models a valid owner
            // record observed just before another process restores the exact
            // bytes. The reclaim guard must compare bytes, not parsed objects.
            assert.equal(LOCK.tryReclaim(racedBase, raced.lockPath, LOCK.rootKey(fs.realpathSync(racedRoot)), `${raw}\n`), false);
            assert.equal(fs.existsSync(raced.lockPath), true, 'a token/bytes race never removes the observed owner record');
        })
    },
    {
        name: '[startup-lock] cleanup proof is separate, bounded, and blocks a waiter while the tree is unproven',
        fn: async () => withAsyncFixture(async root => {
            const parent = path.join(root, 'fixture-temp');
            fs.mkdirSync(parent, { recursive: true });
            let clock = 0;
            let terminations = 0;
            const tree = {
                root: { pid: 7001, start: 'manager-start' },
                members: [{ pid: 7001, ppid: 1, start: 'manager-start' }, { pid: 7002, ppid: 7001, start: 'descendant-start' }]
            };
            const seams = fixtureLockSeams(parent, {
                pid: 7001,
                now: () => clock,
                sleep: async ms => { clock += ms; },
                overrides: {
                    processAlive: () => false,
                    captureTree: () => ({ ok: true, tree }),
                    treeAlive: () => true,
                    terminateTree: () => { terminations += 1; }
                }
            });
            const first = await LOCK.withProjectLock({
                canonicalRoot: root,
                seams,
                recheck: () => false,
                run: async ({ publishGroup }) => {
                    publishGroup({ kind: 'pgid', id: 7001 });
                    return { outcome: 'fake-timeout' };
                }
            });
            assert.equal(first.outcome, LOCK_OUTCOMES.RETAINED_CLEANUP_UNPROVEN);
            assert.equal(first.lockRetained, true);
            assert.equal(terminations, 1);
            assert.equal(LOCK.WAIT_CEILING_MS, 5000);
            assert.equal(LOCK.POLL_INTERVAL_MS, 100);
            assert.equal(LOCK.CLEANUP_PROOF_MS, 30000);
            assert.equal(fs.existsSync(first.lockPath), true);

            let waiterRuns = 0;
            const waiter = await LOCK.withProjectLock({
                canonicalRoot: root,
                seams,
                recheck: () => false,
                run: async () => { waiterRuns += 1; return { outcome: 'must-not-run' }; }
            });
            assert.equal(waiter.outcome, LOCK_OUTCOMES.IN_PROGRESS);
            assert.equal(waiterRuns, 0, 'a waiter cannot launch while cleanup proof is unavailable');
            assert.equal(fs.existsSync(first.lockPath), true);
        })
    },
    {
        name: '[startup-lock] native platform row proves real private temp state, identity census, and child/grandchild cleanup',
        fn: async () => withAsyncFixture(async root => {
            assert.ok(LOCK.SUPPORTED_PLATFORMS.includes(process.platform), `unsupported native runner: ${process.platform}`);
            const native = LOCK.createLockSeams();
            const rawParent = native.tempParent();
            const parentProbe = native.probeParentProtection(rawParent, process.platform);
            if (process.platform !== 'win32') {
                assert.equal(parentProbe.ok, true, `native temp parent is not safely verifiable: ${rawParent}`);
            } else {
                assert.equal(native.probePathSafety(rawParent, process.platform).ok, true, `native temp parent is not safely usable: ${rawParent}`);
            }
            assert.equal(native.probePlatformSupport(process.platform), true, `native process census unavailable on ${process.platform}`);

            const nativeParent = fs.mkdtempSync(path.join(rawParent, 'ck-startup-native-'));
            let seams = LOCK.createLockSeams({ tempParent: () => nativeParent });
            let prepared = LOCK.prepareLockDirectory(seams);
            if (process.platform === 'win32' && !prepared.ok) {
                assert.equal(prepared.code, LOCK_OUTCOMES.PRIVACY_UNPROVABLE, 'Windows must fail closed when the native child ACL is unprovable');
                // The production probe remains native above. Controlled privacy seams here
                // isolate the unrelated native process-tree cleanup proof below.
                seams = LOCK.createLockSeams({
                    tempParent: () => nativeParent,
                    probeParentProtection: () => ({ ok: true }),
                    probeChildPrivacy: () => ({ ok: true })
                });
                prepared = LOCK.prepareLockDirectory(seams);
            }
            assert.equal(prepared.ok, true, `native private lock child unavailable: ${prepared.code || 'unknown'}`);
            assert.equal(seams.probeChildPrivacy(prepared.dir, process.platform).ok, true);
            if (process.platform !== 'win32') {
                const childStat = fs.statSync(prepared.dir);
                assert.equal(childStat.uid, process.getuid());
                assert.equal(childStat.mode & 0o777, 0o700);
            }

            const parentTarget = path.join(root, 'redirect-target');
            const parentLink = path.join(root, 'redirect-parent');
            fs.mkdirSync(parentTarget, { recursive: true });
            createNativeDirectoryLink(parentTarget, parentLink);
            try {
                const redirected = LOCK.prepareLockDirectory(LOCK.createLockSeams({ tempParent: () => parentLink }));
                assert.equal(redirected.ok, false, 'symlink/reparse temp parents are rejected');
            } finally {
                fs.rmSync(parentLink, { recursive: true, force: true });
            }

            const reparseSeams = LOCK.createLockSeams({
                tempParent: () => nativeParent,
                userKey: () => 'reparse-user',
                hostKey: () => 'reparse-host'
            });
            const reparseChild = path.join(nativeParent, LOCK.lockChildName(reparseSeams));
            const reparseTarget = path.join(root, 'reparse-child-target');
            fs.mkdirSync(reparseTarget, { recursive: true });
            createNativeDirectoryLink(reparseTarget, reparseChild);
            try {
                const childResult = LOCK.prepareLockDirectory(reparseSeams);
                assert.equal(childResult.ok, false, 'symlink/reparse private children are rejected');
            } finally {
                fs.rmSync(reparseChild, { recursive: true, force: true });
            }

            const actualStart = native.processStartIdentity(process.pid, process.platform);
            assert.ok(actualStart);
            assert.equal(
                native.treeAlive({ members: [{ pid: process.pid, ppid: 0, start: `${actualStart}-reused` }] }, process.platform),
                null,
                'PID reuse with a different process-start identity is unprovable'
            );

            const marker = path.join(nativeParent, 'grandchild.pid');
            const childCode = [
                "const fs = require('node:fs');",
                "const { spawn } = require('node:child_process');",
                "const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true });",
                "fs.writeFileSync(process.env.CK_GRANDCHILD_MARKER, String(grandchild.pid));",
                "setInterval(() => {}, 1000);"
            ].join('\n');
            let child = null;
            let grandchildPid = null;
            const lockPath = path.join(prepared.dir, `${LOCK.rootKey(fs.realpathSync(root))}.lock`);
            try {
                child = spawn(process.execPath, ['-e', childCode], {
                    env: { ...process.env, CK_GRANDCHILD_MARKER: marker },
                    stdio: 'ignore',
                    detached: process.platform !== 'win32',
                    windowsHide: true
                });
                const result = await LOCK.withProjectLock({
                    canonicalRoot: fs.realpathSync(root),
                    seams,
                    recheck: () => false,
                    run: async ({ publishGroup }) => {
                        await waitForFile(marker);
                        grandchildPid = Number(fs.readFileSync(marker, 'utf8'));
                        assert.equal(native.processAlive(child.pid), true);
                        assert.equal(native.processAlive(grandchildPid), true);
                        publishGroup({ kind: process.platform === 'win32' ? 'pid' : 'pgid', id: child.pid });
                        if (process.platform !== 'win32') {
                            assert.equal(fs.statSync(lockPath).mode & 0o777, 0o600);
                        }
                        return { outcome: 'native-tree-complete' };
                    }
                });
                assert.equal(result.outcome, 'native-tree-complete');
                assert.equal(native.processAlive(child.pid), false, 'manager child must be absent before lock release');
                assert.equal(native.processAlive(grandchildPid), false, 'grandchild must be absent before lock release');
                assert.equal(fs.existsSync(result.lockPath), false);
                assert.equal(path.resolve(result.lockPath).startsWith(path.resolve(root) + path.sep), false);
            } finally {
                if (child && typeof child.pid === 'number') native.terminateTree({ kind: process.platform === 'win32' ? 'pid' : 'pgid', id: child.pid });
                fs.rmSync(nativeParent, { recursive: true, force: true });
            }
        })
    },
    {
        name: '[startup-process] CI native platform matrix is pinned and fail-closed in the required aggregate',
        skip: UPSTREAM_CI_SKIP,
        fn: () => {
            const workflow = fs.readFileSync(UPSTREAM_CI_WORKFLOW, 'utf8');
            const jobStart = workflow.indexOf('  startup-install-platform-security:');
            const aggregateStart = workflow.indexOf('\n  static-and-unit:', jobStart);
            assert.ok(jobStart >= 0, 'native startup-install CI job is registered');
            assert.ok(aggregateStart > jobStart, 'native job appears before the aggregate');
            const job = workflow.slice(jobStart, aggregateStart);
            assert.match(job, /needs:\s*gate/);
            assert.match(job, /fail-fast:\s*false/);
            assert.match(job, /windows-latest, ubuntu-latest, macos-latest/);
            assert.match(job, /node-version:\s*['"]?24['"]?/);
            assert.match(job, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
            assert.match(job, /actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020/);
            assert.match(job, /needs\.gate\.outputs\.sha\s*==\s*''/);
            assert.match(job, /needs\.gate\.result\s*!=\s*'success'/);
            assert.match(job, /ref:\s*\$\{\{ needs\.gate\.outputs\.sha \}\}/);
            assert.match(job, /node \.claude\/hooks\/tests\/run-all-tests\.cjs --filter=startup-install --verbose/);
            assert.doesNotMatch(job, /skip_heavy|continue-on-error/);

            const aggregate = workflow.slice(aggregateStart, workflow.indexOf('\n  integration-test-shards:', aggregateStart));
            assert.match(aggregate, /needs:\s*\[gate, repo-checks, unit-tests, startup-install-platform-security\]/);
            assert.match(aggregate, /needs\.startup-install-platform-security\.result/);
            assert.match(aggregate, /startup-install-platform-security: success/);
        }
    },
    {
        name: '[startup-process] real startup runner reaches only a process-isolated fake manager and preserves the request boundary',
        fn: () => withTempFixture(root => {
            writeManifest(root, { dependencies: { dep: '1.0.0' } });
            const marker = path.join(root, 'fake-manager-plan.json');
            const worker = path.join(root, 'worker.cjs');
            const source = path.join(REPO_ROOT, '.claude', 'hooks', 'lib', 'startup-install.cjs');
            writeText(worker, `
const fs = require('node:fs');
const startup = require(${JSON.stringify(source)});
const root = ${JSON.stringify(root)};
const marker = ${JSON.stringify(marker)};
const env = { PATH: '', NPM_TOKEN: 'should-not-cross' };
const seams = {
  exists: file => fs.existsSync(file),
  readFile: file => fs.readFileSync(file, 'utf8'),
  realpath: file => fs.realpathSync(file),
  platform: () => 'linux',
  env: () => env,
  resolveExecutable: () => ({ ok: true, execPath: '/trusted/bin/npm', viaCorepack: false }),
  readManagerVersion: () => ({ ok: true, version: '10.0.0' }),
  spawnManager: async plan => { fs.writeFileSync(marker, JSON.stringify(plan)); return { outcome: startup.OUTCOMES.INSTALLED, exitCode: 0 }; },
  lock: { withProjectLock: async ({ run }) => { const inner = await run({ publishGroup: () => {} }); return { outcome: inner.outcome }; } }
};
startup.runStartupInstall({ projectRoot: root, source: 'startup', configStatus: { state: 'missing', config: {} }, seams })
  .then(result => process.stdout.write(JSON.stringify(result)))
  .catch(error => { process.stderr.write(String(error)); process.exitCode = 1; });
`);
            const result = invokeNode(worker, [], { cwd: root });
            assert.equal(result.status, 0, result.stderr);
            const outcome = JSON.parse(result.stdout);
            assert.equal(outcome.outcome, OUTCOMES.INSTALLED);
            assert.equal(outcome.manager, 'npm');
            assert.deepEqual(outcome.request.argv, ['install', '--ignore-scripts']);
            const plan = JSON.parse(fs.readFileSync(marker, 'utf8'));
            assert.equal(plan.cwd, root);
            assert.deepEqual(plan.args, ['install', '--ignore-scripts']);
            assert.equal(plan.env.NPM_TOKEN, undefined);
        })
    }
];

module.exports = {
    name: 'startup-install',
    tests
};
