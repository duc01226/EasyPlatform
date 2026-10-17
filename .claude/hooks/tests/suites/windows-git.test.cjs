'use strict';

/**
 * Windows Git/Git Bash capability and repair-boundary regression suite.
 *
 * The seam rows never invoke Git, WinGet, an installer, a shell, or a network
 * request. The native row is deliberately conditional: only a real Windows
 * host can earn the native capability claim; POSIX runs report the row as
 * skipped rather than converting an injected probe into platform evidence.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const windowsGit = require('../../lib/windows-git.cjs');

const SOURCE = path.join(__dirname, '..', '..', 'lib', 'windows-git.cjs');

function withTempDir(fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-windows-git-'));
    try {
        return fn(root);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

function capability(root = 'C:\\Program Files\\Git') {
    return {
        root,
        gitExe: `${root}\\cmd\\git.exe`,
        gitBashExe: `${root}\\git-bash.exe`,
        bashExe: `${root}\\usr\\bin\\bash.exe`,
        gitBashPath: `${root}\\usr\\bin`,
        version: '2.55.0.windows.3',
        pathPrefix: [`${root}\\cmd`, `${root}\\usr\\bin`, `${root}\\bin`]
    };
}

function info(kind) {
    return {
        isDirectory: () => kind === 'directory',
        isFile: () => kind === 'file' || kind === 'symlink',
        isSymbolicLink: () => kind === 'symlink'
    };
}

function fakeGitFs({ omit = [], symlinks = [] } = {}) {
    const root = 'C:\\Program Files\\Git';
    const files = [
        root,
        `${root}\\cmd\\git.exe`,
        `${root}\\git-bash.exe`,
        `${root}\\usr\\bin\\bash.exe`
    ];
    const omitSet = new Set(omit.map(value => value.toLowerCase()));
    const symlinkSet = new Set(symlinks.map(value => value.toLowerCase()));
    const env = {
        ProgramFiles: 'C:\\Program Files',
        LOCALAPPDATA: 'C:\\Users\\fixture\\AppData\\Local',
        Path: [
            'C:\\Windows\\System32',
            `${root}\\cmd`,
            'C:\\Users\\fixture\\AppData\\Local\\Microsoft\\WindowsApps'
        ].join(';')
    };
    const seams = {
        lstat: target => {
            const normalized = String(target).toLowerCase();
            if (omitSet.has(normalized)) throw new Error('missing fixture path');
            if (normalized === root.toLowerCase()) return info('directory');
            if (files.some(file => file.toLowerCase() === normalized)) {
                return info(symlinkSet.has(normalized) ? 'symlink' : 'file');
            }
            throw new Error('unlisted fixture path');
        },
        realpath: target => target,
        readGitVersion: () => '2.55.0.windows.3',
        probeBash: () => true
    };
    return { root, env, seams };
}

function repairSeams({ state = 'missing', reason = 'not-found', winget = 'C:\\Users\\fixture\\WindowsApps\\winget.exe', spawnResult = { ok: true, pid: 42 } } = {}) {
    const calls = [];
    const seams = {
        platform: () => 'win32',
        env: () => ({ SystemRoot: 'C:\\Windows' }),
        resolveGit: () => ({ state, reason }),
        resolveWinget: () => {
            calls.push('resolve-winget');
            return winget;
        },
        spawnRepairWorker: input => {
            calls.push({ kind: input.kind, wingetPath: input.wingetPath });
            return spawnResult;
        }
    };
    return { seams, calls };
}

const tests = [
    {
        name: '[windows-git-platform] non-Windows and non-startup events never resolve or launch repair',
        fn: () => {
            const nonWindows = repairSeams();
            nonWindows.seams.platform = () => 'linux';
            nonWindows.seams.resolveGit = () => { throw new Error('must not probe non-Windows'); };
            const posix = windowsGit.ensureWindowsGit({
                source: 'startup',
                seams: nonWindows.seams,
                configStatus: { state: 'missing', config: {} }
            });
            assert.equal(posix.outcome, windowsGit.OUTCOMES.SKIP_NOT_WINDOWS);
            assert.deepEqual(nonWindows.calls, []);

            for (const source of ['resume', 'clear', 'compact', null]) {
                const fixture = repairSeams();
                const result = windowsGit.ensureWindowsGit({
                    source,
                    seams: fixture.seams,
                    configStatus: { state: 'missing', config: {} }
                });
                assert.equal(result.outcome, windowsGit.OUTCOMES.SKIP_NOT_STARTUP, source || 'absent source');
                assert.deepEqual(fixture.calls, [], `${source || 'absent'} must not resolve WinGet or launch a worker`);
            }
        }
    },
    {
        name: '[windows-git-identity] the resolver accepts only a complete native Git root and rejects bare WSL/System32/AppAlias bash',
        fn: () => {
            const complete = fakeGitFs();
            const ready = windowsGit.DEFAULT_SEAMS.resolveGit({ seams: complete.seams, env: complete.env });
            assert.equal(ready.state, 'ready');
            assert.equal(ready.capability.root, complete.root);
            assert.match(ready.capability.bashExe, /\\Git\\usr\\bin\\bash\.exe$/i);

            const noNativeBash = fakeGitFs({
                omit: [
                    `${complete.root}\\usr\\bin\\bash.exe`,
                    `${complete.root}\\bin\\bash.exe`
                ]
            });
            const rejected = windowsGit.DEFAULT_SEAMS.resolveGit({
                seams: noNativeBash.seams,
                env: {
                    ...noNativeBash.env,
                    Path: `C:\\Windows\\System32;C:\\Users\\fixture\\AppData\\Local\\Microsoft\\WindowsApps;${complete.root}\\cmd`
                }
            });
            assert.notEqual(rejected.state, 'ready');
            assert.match(rejected.state, /missing|incomplete|broken/);

            const symlinkBash = fakeGitFs({ symlinks: [`${complete.root}\\usr\\bin\\bash.exe`] });
            const symlinkResult = windowsGit.DEFAULT_SEAMS.resolveGit({ seams: symlinkBash.seams, env: symlinkBash.env });
            assert.notEqual(symlinkResult.state, 'ready', 'a reparse/symlink bash must not establish native Git Bash provenance');
        }
    },
    {
        name: '[windows-git-native] the current Windows host resolves Git for Windows and Git Bash without WSL aliases',
        skip: process.platform !== 'win32',
        fn: () => {
            const result = windowsGit.resolveWindowsGit();
            assert.equal(result.outcome, windowsGit.OUTCOMES.READY, windowsGit.formatDiagnostic(result) || 'native Git capability was not ready');
            const current = result.capability;
            assert.match(current.gitExe, /\\Git\\(?:cmd|bin)\\git\.exe$/i);
            assert.match(current.gitBashExe, /\\Git\\git-bash\.exe$/i);
            assert.match(current.bashExe, /\\Git\\(?:usr\\bin|bin)\\bash\.exe$/i);
            assert.doesNotMatch(current.bashExe, /\\(?:System32|WindowsApps)\\/i);

            const childEnv = windowsGit.withGitEnvironment({ PATH: 'C:\\Windows\\System32' }, current);
            assert.equal(childEnv.CK_GIT_EXE, current.gitExe);
            assert.equal(childEnv.CK_GIT_BASH_EXE, current.gitBashExe);
            assert.equal(childEnv.CK_GIT_BASH_PATH, current.gitBashPath);
        }
    },
    {
        name: '[windows-git-repair] startup repair is non-blocking and uses the fixed WinGet policy matrix',
        fn: () => {
            const missing = repairSeams();
            const started = windowsGit.ensureWindowsGit({
                source: 'startup',
                seams: missing.seams,
                configStatus: { state: 'missing', config: {} }
            });
            assert.equal(started.outcome, windowsGit.OUTCOMES.REPAIR_STARTED);
            assert.deepEqual(missing.calls, [
                'resolve-winget',
                { kind: 'missing', wingetPath: 'C:\\Users\\fixture\\WindowsApps\\winget.exe' }
            ]);

            const noWinget = repairSeams({ winget: null });
            const unavailable = windowsGit.ensureWindowsGit({
                source: 'startup',
                seams: noWinget.seams,
                configStatus: { state: 'missing', config: {} }
            });
            assert.equal(unavailable.outcome, windowsGit.OUTCOMES.SKIP_WINGET_UNAVAILABLE);
            assert.deepEqual(noWinget.calls, ['resolve-winget']);

            const failedSpawn = repairSeams({ spawnResult: { ok: false } });
            const failed = windowsGit.ensureWindowsGit({
                source: 'startup',
                seams: failedSpawn.seams,
                configStatus: { state: 'missing', config: {} }
            });
            assert.equal(failed.outcome, windowsGit.OUTCOMES.SKIP_REPAIR_UNAVAILABLE);

            const broken = repairSeams({ state: 'broken', reason: 'probe-failed' });
            const brokenResult = windowsGit.ensureWindowsGit({
                source: 'startup',
                seams: broken.seams,
                configStatus: { state: 'missing', config: {} }
            });
            assert.equal(brokenResult.outcome, windowsGit.OUTCOMES.REPAIR_STARTED);
            assert.deepEqual(broken.calls, [
                'resolve-winget',
                { kind: 'broken', wingetPath: 'C:\\Users\\fixture\\WindowsApps\\winget.exe' }
            ]);

            const incomplete = repairSeams({ state: 'incomplete', reason: 'native-components-incomplete' });
            const incompleteResult = windowsGit.ensureWindowsGit({
                source: 'startup',
                seams: incomplete.seams,
                configStatus: { state: 'missing', config: {} }
            });
            assert.equal(incompleteResult.outcome, windowsGit.OUTCOMES.REPAIR_STARTED);
            assert.deepEqual(incomplete.calls, [
                'resolve-winget',
                { kind: 'incomplete', wingetPath: 'C:\\Users\\fixture\\WindowsApps\\winget.exe' }
            ]);
        }
    },
    {
        name: '[windows-git-policy] invalid/disabled/read-only policies never turn a probe into a repair side effect',
        fn: () => {
            const invalid = repairSeams();
            const invalidResult = windowsGit.ensureWindowsGit({
                source: 'startup',
                seams: invalid.seams,
                configStatus: { state: 'invalid', config: {} }
            });
            assert.equal(invalidResult.outcome, windowsGit.OUTCOMES.SKIP_CONFIG_INVALID);
            assert.deepEqual(invalid.calls, []);

            const disabled = repairSeams();
            const disabledResult = windowsGit.ensureWindowsGit({
                source: 'startup',
                seams: disabled.seams,
                configStatus: { state: 'loaded', config: { hooks: { windowsGit: { enabled: false, autoRepair: false } } } }
            });
            assert.equal(disabledResult.outcome, windowsGit.OUTCOMES.SKIP_DISABLED);
            assert.deepEqual(disabled.calls, []);

            const readOnly = repairSeams();
            const readOnlyResult = windowsGit.ensureWindowsGit({
                source: 'startup',
                seams: readOnly.seams,
                configStatus: { state: 'loaded', config: { hooks: { windowsGit: { enabled: true, autoRepair: false } } } }
            });
            assert.equal(readOnlyResult.outcome, windowsGit.OUTCOMES.REPAIR_NEEDED);
            assert.deepEqual(readOnly.calls, []);
            assert.deepEqual(windowsGit.resolvePolicy({ state: 'loaded', config: {} }), { valid: true, enabled: true, autoRepair: true });
            assert.deepEqual(windowsGit.resolvePolicy({ state: 'loaded', config: { hooks: { windowsGit: { enabled: 'true' } } } }), { valid: false, enabled: false, autoRepair: false });
        }
    },
    {
        name: '[windows-git-argv] repair plans accept only absolute trusted paths and fixed Git.Git arguments',
        fn: () => {
            assert.equal(windowsGit.buildRepairPlan('winget.exe', false), null);
            assert.equal(windowsGit.buildRepairPlan('C:\\temp\\winget\r\n.exe', false), null);

            const missing = windowsGit.buildRepairPlan('C:\\Users\\fixture\\WindowsApps\\winget.exe', false);
            assert.deepEqual(missing, {
                command: 'C:\\Users\\fixture\\WindowsApps\\winget.exe',
                args: windowsGit.REPAIR_ARGS
            });
            assert.deepEqual(missing.args, [
                'install', '--id', 'Git.Git', '--exact', '--source', 'winget', '--silent',
                '--disable-interactivity', '--accept-source-agreements', '--accept-package-agreements'
            ]);

            const broken = windowsGit.buildRepairPlan('C:\\Users\\fixture\\WindowsApps\\winget.exe', true);
            assert.deepEqual(broken.args, [...windowsGit.REPAIR_ARGS, '--force']);
        }
    },
    {
        name: '[windows-git-worker] repair worker acquires the existing project lock and never awaits the detached caller',
        fn: async () => {
            const events = [];
            const lock = {
                withProjectLock: async input => {
                    events.push({ lock: input.canonicalRoot });
                    assert.equal(await input.recheck(), false);
                    return input.run({
                        publishGroup: group => events.push({ group })
                    });
                }
            };
            const result = await windowsGit.runRepairWorker({
                kind: 'missing',
                seams: {
                    platform: () => 'win32',
                    env: () => ({ PATH: 'C:\\Windows\\System32' }),
                    resolveGit: () => ({ state: 'missing', reason: 'not-found' }),
                    resolveWinget: () => 'C:\\Users\\fixture\\WindowsApps\\winget.exe',
                    lock,
                    runRepair: async (plan, input) => {
                        events.push({ plan, env: input.env });
                        input.publishGroup({ kind: 'pid', id: 987 });
                        return { outcome: windowsGit.OUTCOMES.REPAIR_WORKER_NOOP };
                    }
                }
            });
            assert.equal(result.outcome, windowsGit.OUTCOMES.REPAIR_WORKER_NOOP);
            assert.deepEqual(events[0], { lock: windowsGit.REPAIR_RESOURCE_KEY });
            assert.equal(events[1].plan.command, 'C:\\Users\\fixture\\WindowsApps\\winget.exe');
            assert.deepEqual(events[1].plan.args, windowsGit.REPAIR_ARGS);
            assert.deepEqual(events[2], { group: { kind: 'pid', id: 987 } });

            const brokenPlans = [];
            const brokenResult = await windowsGit.runRepairWorker({
                kind: 'broken',
                seams: {
                    platform: () => 'win32',
                    env: () => ({ PATH: 'C:\\Windows\\System32' }),
                    resolveGit: () => ({ state: 'broken', reason: 'probe-failed' }),
                    resolveWinget: () => 'C:\\Users\\fixture\\WindowsApps\\winget.exe',
                    lock: {
                        withProjectLock: async input => input.run({ publishGroup: () => {} })
                    },
                    runRepair: async plan => {
                        brokenPlans.push(plan);
                        return { outcome: windowsGit.OUTCOMES.REPAIR_WORKER_NOOP };
                    }
                }
            });
            assert.equal(brokenResult.outcome, windowsGit.OUTCOMES.REPAIR_WORKER_NOOP);
            assert.deepEqual(brokenPlans[0].args, [...windowsGit.REPAIR_ARGS, '--force']);
        }
    },
    {
        name: '[windows-git-detached] background worker launch is detached, hidden, shell-free, ignored, and unrefed',
        fn: () => {
            const source = fs.readFileSync(SOURCE, 'utf8');
            assert.match(source, /spawn\(process\.execPath, \[__filename, '--repair-worker', kind\]/);
            assert.match(source, /detached:\s*true/);
            assert.match(source, /stdio:\s*'ignore'/);
            assert.match(source, /shell:\s*false/);
            assert.match(source, /windowsHide:\s*true/);
            assert.match(source, /child\.unref\(\)/);
        }
    },
    {
        name: '[windows-git-publication] child environment gets one validated Git prefix without mutating the parent',
        fn: () => {
            const input = { Path: 'C:\\Program Files\\Git\\cmd;C:\\Windows\\System32', OTHER: 'keep' };
            const before = { ...input };
            const result = windowsGit.withGitEnvironment(input, capability());
            assert.deepEqual(input, before, 'parent environment object must not be mutated');
            const entries = result.Path.split(';').map(entry => entry.toLowerCase());
            for (const prefix of capability().pathPrefix) {
                assert.equal(entries.filter(entry => entry === prefix.toLowerCase()).length, 1, prefix);
            }
            assert.equal(result.CK_GIT_EXE, capability().gitExe);
            assert.equal(result.CK_GIT_BASH_EXE, capability().gitBashExe);
            assert.equal(result.CK_GIT_BASH_PATH, capability().gitBashPath);
            assert.equal(result.OTHER, 'keep');
        }
    },
    {
        name: '[windows-git-publication] shell env publication and diagnostics reject hostile capability data',
        fn: () => withTempDir(root => {
            const envFile = path.join(root, 'env.sh');
            const published = windowsGit.defaultPublishEnvironment({ envFile, capability: capability() });
            assert.equal(published.ok, true);
            const text = fs.readFileSync(envFile, 'utf8');
            assert.equal(text.split('\n').filter(Boolean).length, 4);
            assert.match(text, /export CK_GIT_EXE=/);
            assert.match(text, /export CK_GIT_BASH_EXE=/);
            assert.match(text, /export CK_GIT_BASH_PATH=/);
            assert.match(text, /export PATH=/);

            const hostile = { ...capability(), gitExe: 'C:\\Git\\bad\r\nFORGED' };
            assert.equal(windowsGit.withGitEnvironment({ PATH: 'safe' }, hostile).CK_GIT_EXE, undefined);
            assert.equal(windowsGit.defaultPublishEnvironment({ envFile: path.join(root, 'bad.sh'), capability: hostile }).ok, false);
            for (const result of [
                { outcome: windowsGit.OUTCOMES.REPAIR_STARTED },
                { outcome: windowsGit.OUTCOMES.SKIP_WINGET_UNAVAILABLE },
                { outcome: windowsGit.OUTCOMES.SKIP_REPAIR_UNAVAILABLE },
                { outcome: windowsGit.OUTCOMES.SKIP_CONFIG_INVALID }
            ]) {
                const message = windowsGit.formatDiagnostic(result);
                assert.ok(message && !/[\r\n\u001b]|FORGED/.test(message));
            }
        })
    }
];

module.exports = {
    name: 'windows-git',
    tests
};
