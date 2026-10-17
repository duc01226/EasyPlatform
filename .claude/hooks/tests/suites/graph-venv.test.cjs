/**
 * Graph venv — one per-user graph tooling venv per requirements hash (plan P37, BR-ADS-17/18).
 *
 * Guarded business rules:
 * - BR-ADS-17: checkouts with the same graph requirements share one venv under the per-user
 *   cache; different requirements get different venvs; a project venv marked ready for the
 *   current requirements keeps winning (no forced migration), and an unmarked one that still
 *   imports is adopted in place. Finding the venv reads files only and starts no process.
 * - BR-ADS-18: the shared install is guarded by a lock. A dead same-host holder or a lock older
 *   than fifteen minutes is broken, but only when its bytes are unchanged since it was judged;
 *   a live holder makes another session wait at most five seconds, then back off with a message
 *   naming it; a holder only ever removes a lock that carries its own token.
 *
 * Portable: every case builds its fixture projects and cache roots in a temp dir. Resolution
 * cases pass env and platform in-process, so the three OS rules run on every host. Cases that
 * need `ensurePythonDeps()` or a spawn counter run a fresh node child with `child_process`
 * stubbed before graph-utils loads, and with HOME, USERPROFILE, LOCALAPPDATA, XDG_CACHE_HOME,
 * TMPDIR, TEMP and TMP all pointed into the fixture, so the developer's real cache is never read
 * or written. Lock cases inject the clock, sleep, liveness and host seams.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { assertEqual, assertTrue, assertFalse, assertContains } = require('../lib/assertions.cjs');
const { childEnv } = require('../lib/hook-runner.cjs');
const { createTempDir, cleanupTempDir } = require('../lib/test-utils.cjs');

const GRAPH_UTILS = path.resolve(__dirname, '..', '..', 'lib', 'graph-utils.cjs');
const graph = require(GRAPH_UTILS);

const MINUTE = 60 * 1000;
const SHARED = path.join('easy-claude', 'graph-venv');
const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
const venvPython = (dir, platform = process.platform) =>
    platform === 'win32' ? path.join(dir, 'Scripts', 'python.exe') : path.join(dir, 'bin', 'python');

/** A fixture project with a `.claude` dir and the graph requirements file. */
function makeProject(base, name, requirements = 'tree-sitter>=0.21.0\nnetworkx>=3.0\n') {
    const dir = path.join(base, name);
    const reqDir = path.join(dir, '.claude', 'scripts', 'code_graph');
    fs.mkdirSync(reqDir, { recursive: true });
    fs.writeFileSync(path.join(reqDir, 'requirements.txt'), requirements);
    return dir;
}

const projectVenv = project => path.join(project, 'tmp', 'claude-temp', '.venv');

/** Give a project venv a Python binary (for the host platform) and optionally a marker. */
function makeProjectVenv(project, marker) {
    const python = venvPython(projectVenv(project));
    fs.mkdirSync(path.dirname(python), { recursive: true });
    fs.writeFileSync(python, '');
    if (marker !== undefined) fs.writeFileSync(path.join(projectVenv(project), 'deps-ok'), marker);
}

function withTemp(fn) {
    const base = fs.realpathSync.native(createTempDir('ck-graph-venv-'));
    try {
        return fn(base);
    } finally {
        cleanupTempDir(base);
    }
}

/** Every file under a dir, relative, sorted ([] when the dir is absent). */
function listFiles(dir) {
    const out = [];
    const walk = current => {
        let entries;
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) walk(full);
            else out.push(path.relative(dir, full));
        }
    };
    walk(dir);
    return out.sort();
}

/**
 * Run code in a fresh node child: `child_process.execFileSync` is replaced by `stubSource`
 * (a function expression receiving `(bin, argv, calls)`) BEFORE graph-utils is required, and
 * every home and cache variable points into the fixture.
 */
function runChild(base, project, stubSource, body) {
    const home = path.join(base, 'home');
    const cache = path.join(base, 'cache');
    const tmp = path.join(base, 'tmp');
    for (const dir of [home, cache, tmp]) fs.mkdirSync(dir, { recursive: true });
    const overrides = {
        CLAUDE_PROJECT_DIR: project,
        HOME: home, USERPROFILE: home, LOCALAPPDATA: cache, XDG_CACHE_HOME: cache,
        TMPDIR: tmp, TEMP: tmp, TMP: tmp,
        CLAUDE_HOOK_DEBUG: undefined
    };
    for (const key of Object.keys(process.env)) {
        if (/^CK_/i.test(key)) overrides[key] = undefined; // incl. the CK_GRAPH_SPAWN_STUB seam
    }
    const code = `
        const Module = require('node:module'), fs = require('node:fs'), path = require('node:path');
        const calls = [], original = Module._load, stub = ${stubSource};
        Module._load = function (name, ...args) {
            if (name === 'child_process') return { execFileSync: (bin, argv) => { calls.push([bin, argv]); return stub(bin, argv, calls); } };
            return original.call(this, name, ...args);
        };
        const graph = require(${JSON.stringify(GRAPH_UTILS)});
        const out = (${body})(graph, calls);
        console.log('CHILD_RESULT:' + JSON.stringify(out));
    `;
    const child = spawnSync(process.execPath, ['-e', code], { cwd: project, env: childEnv(overrides), encoding: 'utf8', timeout: 30000, windowsHide: true });
    assertEqual(child.status, 0, `child must exit 0; stderr: ${child.stderr}`);
    const match = (child.stdout || '').match(/CHILD_RESULT:(.*)/);
    assertTrue(Boolean(match), `child printed no result; stdout: ${child.stdout}`);
    const sharedCache = process.platform === 'darwin' ? path.join(home, 'Library', 'Caches') : cache;
    return { ...JSON.parse(match[1]), home, cache: sharedCache, tmp };
}

/** An injected clock whose sleep advances it; records every sleep. */
function fakeClock(start = 1_000_000_000_000) {
    const clock = { t: start, sleeps: [] };
    clock.now = () => clock.t;
    clock.sleep = ms => {
        clock.sleeps.push(ms);
        clock.t += ms;
    };
    return clock;
}

const lockOf = dir => `${dir}.lock`;
const writeLock = (dir, record) => {
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    fs.writeFileSync(lockOf(dir), typeof record === 'string' ? record : JSON.stringify(record));
};
const noWait = () => {
    throw new Error('this case must not wait');
};

const tests = [
    {
        name: '[graph-venv] TC-ADS-028 projects with identical requirements share one venv under the cache root',
        fn() {
            withTemp(base => {
                // Given two projects with identical requirements and no project venv
                const a = makeProject(base, 'a');
                const b = makeProject(base, 'b');
                const cache = path.join(base, 'cache');
                const env = { XDG_CACHE_HOME: cache, HOME: path.join(base, 'home') };
                // When their venv is resolved
                const dirA = graph.venvDir({ env, platform: 'linux', projectDir: a });
                const dirB = graph.venvDir({ env, platform: 'linux', projectDir: b });
                // Then both resolve to the same hash-keyed dir under the injected cache root
                assertEqual(dirA, dirB, 'identical requirements share one venv');
                const key = sha256('tree-sitter>=0.21.0\nnetworkx>=3.0\n').slice(0, 12);
                assertEqual(dirA, path.join(cache, SHARED, key), 'shared venv is <cache>/easy-claude/graph-venv/<hash12>');
                assertEqual(graph.getVenvPython({ env, platform: 'linux', projectDir: a }), path.join(dirA, 'bin', 'python'), 'the interpreter follows venvDir');
            });
        }
    },
    {
        name: '[graph-venv] TC-ADS-029 different requirements, even whitespace-only, resolve to different venvs',
        fn() {
            withTemp(base => {
                // Given projects with v1, v2 and a whitespace-only variant of v1
                const env = { XDG_CACHE_HOME: path.join(base, 'cache') };
                const v1 = makeProject(base, 'v1', 'networkx>=3.0\n');
                const v2 = makeProject(base, 'v2', 'networkx>=3.2\n');
                const v1ws = makeProject(base, 'v1ws', 'networkx>=3.0 \n');
                // When resolved
                const [d1, d2, d3] = [v1, v2, v1ws].map(projectDir => graph.venvDir({ env, platform: 'linux', projectDir }));
                // Then every fingerprint gets its own dir
                assertTrue(d1 !== d2, 'different pins must not share a venv');
                assertTrue(d1 !== d3, 'a whitespace-only change is still a different fingerprint');
            });
        }
    },
    {
        name: '[graph-venv] TC-ADS-030 a project venv marked for the current requirements is used first',
        fn() {
            withTemp(base => {
                const env = { XDG_CACHE_HOME: path.join(base, 'cache') };
                const project = makeProject(base, 'p');
                const current = graph.requirementsHash(project);
                const resolve = () => graph.venvDir({ env, platform: 'linux', projectDir: project });
                // Given a project venv whose deps-ok marker holds the current requirements hash
                makeProjectVenv(project, `${current}\n`);
                // When resolved / Then the project venv is used
                assertEqual(resolve(), projectVenv(project), 'a current marker selects the project venv');
                assertEqual(current, sha256(fs.readFileSync(path.join(project, '.claude', 'scripts', 'code_graph', 'requirements.txt'))), 'the marker hash is sha256 of the requirements bytes');
                // Counter: an old hash, then an unreadable marker, both fall through to the shared venv
                fs.writeFileSync(path.join(projectVenv(project), 'deps-ok'), sha256('old pins'));
                assertTrue(resolve().startsWith(path.join(base, 'cache', SHARED)), 'an old-hash marker does not select the project venv');
                fs.rmSync(path.join(projectVenv(project), 'deps-ok'));
                fs.mkdirSync(path.join(projectVenv(project), 'deps-ok'));
                assertTrue(resolve().startsWith(path.join(base, 'cache', SHARED)), 'an unreadable marker counts as no marker');
            });
        }
    },
    {
        name: '[graph-venv] TC-ADS-031 the cache root follows each OS rule and stays inside the injected folder',
        fn() {
            withTemp(base => {
                // Given each platform with its cache settings set, unset or relative
                const project = makeProject(base, 'p');
                const key = graph.requirementsHash(project).slice(0, 12);
                const L = path.join(base, 'localappdata');
                const U = path.join(base, 'userprofile');
                const H = path.join(base, 'home');
                const X = path.join(base, 'xdg');
                const shared = root => path.join(root, SHARED, key);
                const cases = [
                    ['win32', { LOCALAPPDATA: L, USERPROFILE: U, HOME: H }, shared(L)],
                    ['win32', { USERPROFILE: U, HOME: H }, shared(path.join(U, 'AppData', 'Local'))],
                    ['win32', { HOME: H }, shared(path.join(H, 'AppData', 'Local'))],
                    ['win32', { LOCALAPPDATA: 'relative-local', USERPROFILE: U }, shared(path.join(U, 'AppData', 'Local'))],
                    ['darwin', { HOME: H, XDG_CACHE_HOME: X }, shared(path.join(H, 'Library', 'Caches'))],
                    ['linux', { HOME: H, XDG_CACHE_HOME: X }, shared(X)],
                    ['linux', { HOME: H }, shared(path.join(H, '.cache'))],
                    ['linux', { HOME: H, XDG_CACHE_HOME: 'relative-xdg' }, shared(path.join(H, '.cache'))],
                    // Home unset: the documented fallback is the project venv
                    ['win32', {}, projectVenv(project)],
                    ['darwin', {}, projectVenv(project)],
                    ['linux', { XDG_CACHE_HOME: '' }, projectVenv(project)]
                ];
                for (const [platform, env, expected] of cases) {
                    // When the venv is resolved
                    const actual = graph.venvDir({ env, platform, projectDir: project });
                    // Then it follows the OS rule and never leaves the injected temp folder
                    assertEqual(actual, expected, `${platform} ${JSON.stringify(env)}`);
                    assertTrue(actual.startsWith(base + path.sep), `${platform}: ${actual} is outside the injected folder`);
                    assertEqual(graph.getVenvPython({ env, platform, projectDir: project }), venvPython(expected, platform), `${platform}: interpreter layout`);
                }
            });
        }
    },
    {
        name: '[graph-venv] TC-ADS-044 resolving the venv and its interpreter starts no process',
        fn() {
            withTemp(base => {
                // Given a counting stub on execFileSync installed before graph-utils loads,
                // a project with a current marker, one without, and one with an unreadable marker
                const marked = makeProject(base, 'marked');
                const unmarked = makeProject(base, 'unmarked');
                const unreadable = makeProject(base, 'unreadable');
                makeProjectVenv(marked, sha256(fs.readFileSync(path.join(marked, '.claude', 'scripts', 'code_graph', 'requirements.txt'))));
                fs.mkdirSync(path.join(projectVenv(unreadable), 'deps-ok'), { recursive: true });
                // When venvDir() and getVenvPython() resolve every case, then a control call runs
                const out = runChild(base, marked, "() => ''", `(graph, calls) => {
                    const resolved = [];
                    for (const projectDir of ${JSON.stringify([marked, unmarked, unreadable])}) {
                        resolved.push(graph.venvDir({ projectDir }), graph.getVenvPython({ projectDir }));
                    }
                    resolved.push(graph.venvDir(), graph.getVenvPython());
                    const spawnsWhileResolving = calls.length;
                    graph.findPython(); // control: a real probe reaches the stub
                    return { resolved, spawnsWhileResolving, controlSpawns: calls.length };
                }`);
                // Then the stub recorded zero starts while resolving, and the control proves it is wired
                assertEqual(out.spawnsWhileResolving, 0, 'resolving the venv must start no process');
                assertTrue(out.controlSpawns > 0, 'control: findPython must reach the counting stub');
                assertEqual(out.resolved[0], projectVenv(marked), 'project case resolved to the project venv');
                assertTrue(out.resolved[2].startsWith(path.join(out.cache, SHARED)), 'shared case resolved under the injected cache');
                assertTrue(out.resolved[4].startsWith(path.join(out.cache, SHARED)), 'unreadable marker resolved to the shared venv');
            });
        }
    },
    {
        name: '[graph-venv] TC-ADS-049 an unmarked project venv whose import check passes is adopted in place',
        fn() {
            withTemp(base => {
                // Given a project venv with a Python binary and no deps-ok marker, and an import check that passes
                const project = makeProject(base, 'p');
                makeProjectVenv(project);
                // When ensurePythonDeps() runs
                const out = runChild(base, project, "() => ''", `(graph, calls) => {
                    const result = graph.ensurePythonDeps();
                    return { result, calls, after: graph.venvDir() };
                }`);
                // Then the marker is written into the project venv with the current hash
                assertTrue(out.result.ok, `adoption must succeed: ${out.result.message}`);
                assertEqual(fs.readFileSync(path.join(projectVenv(project), 'deps-ok'), 'utf8'), graph.requirementsHash(project), 'marker holds the current requirements hash');
                // And only the import check ran, against the project venv
                assertEqual(out.calls.length, 1, `only the import check runs: ${JSON.stringify(out.calls)}`);
                assertEqual(out.calls[0][0], venvPython(projectVenv(project)), 'the import check targets the project venv');
                assertEqual(out.calls[0][1][0], '-c', 'the call is the import check');
                // And nothing is created under the shared cache root, and the next resolution returns the project venv
                assertEqual(JSON.stringify(listFiles(out.cache)), '[]', 'no shared install happens');
                assertEqual(out.after, projectVenv(project), 'venvDir() now returns the project venv');
            });
        }
    },
    {
        name: '[graph-venv] TC-ADS-049 edge: a failing project import check takes the locked shared install and marks it last',
        fn() {
            withTemp(base => {
                // Given a project venv marked for the current requirements whose import check fails, and a system Python
                // (a venv marked for OTHER requirements is never import-checked: see the mismatched-marker case)
                const project = makeProject(base, 'p');
                makeProjectVenv(project, graph.requirementsHash(project));
                const projectPy = venvPython(projectVenv(project));
                const stub = `(bin, argv) => {
                    if (argv.includes('--version') && argv.length === 1) return 'Python 3.12.1';
                    if (argv[0] === '-c' && bin === ${JSON.stringify(projectPy)}) throw new Error('import failed');
                    const venvAt = argv.indexOf('venv');
                    if (venvAt !== -1) {
                        const dir = argv[venvAt + 1];
                        const py = process.platform === 'win32' ? path.join(dir, 'Scripts', 'python.exe') : path.join(dir, 'bin', 'python');
                        fs.mkdirSync(path.dirname(py), { recursive: true });
                        fs.writeFileSync(py, '');
                    }
                    return '';
                }`;
                // When ensurePythonDeps() runs
                const out = runChild(base, project, stub, `(graph, calls) => {
                    const result = graph.ensurePythonDeps();
                    return { result, calls, after: graph.venvDir() };
                }`);
                // Then the shared venv is created, installed, verified and marked; the lock is released
                assertTrue(out.result.ok, `shared install must succeed: ${out.result.message}`);
                const shared = path.join(out.cache, SHARED, graph.requirementsHash(project).slice(0, 12));
                assertEqual(out.after, shared, 'venvDir() now returns the shared venv');
                assertTrue(out.calls.some(([, argv]) => argv.includes('venv') && argv.includes(shared)), 'the venv is created at the shared dir');
                assertTrue(out.calls.some(([, argv]) => argv.includes('install')), 'the requirements are installed');
                const last = out.calls[out.calls.length - 1];
                assertEqual(last[1][0], '-c', 'the post-install import check runs last');
                assertEqual(fs.readFileSync(path.join(shared, 'deps-ok'), 'utf8'), graph.requirementsHash(project), 'the shared marker holds the hash');
                assertFalse(fs.existsSync(`${shared}.lock`), 'the install lock is released');
                // And the failing project venv lost its marker, so it no longer competes
                assertFalse(fs.existsSync(path.join(projectVenv(project), 'deps-ok')), 'a failed import check drops the project marker');
            });
        }
    },
    {
        name: '[graph-venv] TC-ADS-049 edge: a project venv marked for other requirements is never adopted, even when it imports',
        fn() {
            withTemp(base => {
                // Given a project venv whose marker holds an OLD requirements hash, and an import check that passes everywhere
                const project = makeProject(base, 'p');
                const oldHash = sha256('old pins');
                makeProjectVenv(project, oldHash);
                const projectPy = venvPython(projectVenv(project));
                const stub = `(bin, argv) => {
                    if (argv.includes('--version') && argv.length === 1) return 'Python 3.12.1';
                    const venvAt = argv.indexOf('venv');
                    if (venvAt !== -1) {
                        const dir = argv[venvAt + 1];
                        const py = process.platform === 'win32' ? path.join(dir, 'Scripts', 'python.exe') : path.join(dir, 'bin', 'python');
                        fs.mkdirSync(path.dirname(py), { recursive: true });
                        fs.writeFileSync(py, '');
                    }
                    return '';
                }`;
                // When ensurePythonDeps() runs
                const out = runChild(base, project, stub, `(graph, calls) => {
                    const result = graph.ensurePythonDeps();
                    return { result, calls, after: graph.venvDir(), current: graph.requirementsHash() };
                }`);
                // Then the stale project venv is not import-checked and its old marker is left as it was
                assertTrue(out.result.ok, `shared install must succeed: ${out.result.message}`);
                assertFalse(out.calls.some(([bin]) => bin === projectPy), `the old-marked project venv is never run: ${JSON.stringify(out.calls)}`);
                assertEqual(fs.readFileSync(path.join(projectVenv(project), 'deps-ok'), 'utf8'), oldHash, 'the old marker is not re-marked with the new hash');
                // And the requirements are installed into the shared venv, which now wins
                assertTrue(out.calls.some(([, argv]) => argv.includes('install')), 'the current requirements are installed');
                assertTrue(out.after !== projectVenv(project), 'venvDir() does not return the old-marked project venv');
                assertEqual(fs.readFileSync(path.join(out.after, 'deps-ok'), 'utf8'), out.current, 'the shared venv carries the current hash');
            });
        }
    },
    {
        name: '[graph-venv] TC-ADS-052 edge: a shared-venv marker is cleared only under the install lock, never by a waiter',
        fn() {
            withTemp(base => {
                // Given a marked shared venv whose first import check fails (a concurrent install was mid-way) and later passes
                const project = makeProject(base, 'p');
                const stub = `(bin, argv, calls) => {
                    if (argv.includes('--version') && argv.length === 1) return 'Python 3.12.1';
                    if (argv[0] === '-c' && calls.filter(([, a]) => a[0] === '-c').length === 1) throw new Error('import failed mid-install');
                    return '';
                }`;
                // When ensurePythonDeps() runs
                const out = runChild(base, project, stub, `(graph, calls) => {
                    const shared = graph.venvDir();
                    const py = process.platform === 'win32' ? path.join(shared, 'Scripts', 'python.exe') : path.join(shared, 'bin', 'python');
                    fs.mkdirSync(path.dirname(py), { recursive: true });
                    fs.writeFileSync(py, '');
                    fs.writeFileSync(path.join(shared, 'deps-ok'), graph.requirementsHash());
                    const result = graph.ensurePythonDeps();
                    return { result, calls, shared, hash: graph.requirementsHash(), marker: fs.readFileSync(path.join(shared, 'deps-ok'), 'utf8'), lockLeft: fs.existsSync(shared + '.lock') };
                }`);
                // Then the marker survives the failed pre-lock check, the re-check under the lock passes, and nothing is reinstalled
                assertTrue(out.result.ok, `the venv is ready: ${out.result.message}`);
                assertEqual(out.marker, out.hash, 'the fresh marker is never deleted outside the lock');
                assertEqual(out.calls.filter(([, argv]) => argv[0] === '-c').length, 2, 'one check before the lock, one under it');
                assertFalse(out.calls.some(([, argv]) => argv.includes('install') || argv.includes('venv')), `no redundant install: ${JSON.stringify(out.calls)}`);
                assertFalse(out.lockLeft, 'the install lock is released');
            });
        }
    },
    {
        name: '[graph-venv] TC-ADS-051 a lock left by a dead same-host session is broken and the install runs once',
        fn() {
            withTemp(base => {
                const dir = path.join(base, 'cache', SHARED, 'abc123def456');
                // Given a lock on this host whose pid is dead, and a stubbed install
                writeLock(dir, { pid: 999999, host: 'host-a', at: Date.now(), token: 'dead-token' });
                const asked = [];
                const seams = { hostname: () => 'host-a', processAlive: pid => (asked.push(pid), false), sleep: noWait };
                let installs = 0;
                let lockDuringInstall = null;
                // When the locked install runs
                const result = graph.withVenvLock(dir, () => {
                    installs++;
                    lockDuringInstall = JSON.parse(fs.readFileSync(lockOf(dir), 'utf8'));
                    return { ok: true, message: 'installed' };
                }, seams);
                // Then the stale lock is broken, the install runs once under our own lock, and no lock remains
                assertTrue(result.ok, `install must proceed: ${result.message}`);
                assertEqual(installs, 1, 'install runs exactly once');
                assertEqual(asked.join(','), '999999', 'liveness is asked for the recorded pid');
                assertEqual(lockDuringInstall.pid, process.pid, 'the install holds a fresh lock');
                assertTrue(lockDuringInstall.token !== 'dead-token' && lockDuringInstall.host === 'host-a', 'the lock record is new');
                assertFalse(fs.existsSync(lockOf(dir)), 'no lock remains afterwards');

                // Edge: the same dead pid recorded by ANOTHER host is not provably dead here — only age applies
                writeLock(dir, { pid: 999999, host: 'host-b', at: Date.now(), token: 'foreign' });
                const before = fs.readFileSync(lockOf(dir), 'utf8');
                const clock = fakeClock(Date.now());
                let foreignInstalls = 0;
                const foreign = graph.withVenvLock(dir, () => (foreignInstalls++, { ok: true }), { ...seams, now: clock.now, sleep: clock.sleep });
                assertFalse(foreign.ok, 'a fresh foreign-host lock is held');
                assertEqual(foreignInstalls, 0, 'no install under a foreign fresh lock');
                assertEqual(fs.readFileSync(lockOf(dir), 'utf8'), before, 'the foreign lock is untouched');
            });
        }
    },
    {
        name: '[graph-venv] TC-ADS-052 a live lock makes a second session wait at most 5 s, then back off naming the holder',
        fn() {
            withTemp(base => {
                const dir = path.join(base, 'cache', SHARED, 'abc123def456');
                // Given a lock younger than 15 minutes held by a live pid, and an injected clock and sleep
                const clock = fakeClock();
                writeLock(dir, { pid: 4242, host: 'host-a', at: clock.now() - 2 * MINUTE, token: 'live' });
                const before = fs.readFileSync(lockOf(dir), 'utf8');
                const seams = { hostname: () => 'host-a', processAlive: () => true, now: clock.now, sleep: clock.sleep };
                let installs = 0;
                // When another session starts the install
                const result = graph.withVenvLock(dir, () => (installs++, { ok: true }), seams);
                // Then it waited at most 5 s in 100 ms polls, failed naming the holder, installed nothing, and left the lock alone
                const waited = clock.sleeps.reduce((sum, ms) => sum + ms, 0);
                assertFalse(result.ok, 'a live holder must not be overridden');
                assertTrue(waited <= 5000 && waited >= 4900, `waited ${waited} ms`);
                assertTrue(clock.sleeps.every(ms => ms > 0 && ms <= 100), `polls are at most 100 ms: ${clock.sleeps}`);
                assertContains(result.message, 'another session (pid 4242)', 'message names the holder pid');
                assertContains(result.message, dir, 'message names the venv dir');
                assertContains(result.message, 'checked again next session', 'message says what happens next');
                assertEqual(installs, 0, 'no install runs');
                assertEqual(fs.readFileSync(lockOf(dir), 'utf8'), before, "the holder's lock is unchanged");

                // Edge: the holder finishes during the wait → the waiter proceeds
                const clock2 = fakeClock();
                writeLock(dir, { pid: 4242, host: 'host-a', at: clock2.now(), token: 'live' });
                const finishing = {
                    ...seams,
                    now: clock2.now,
                    sleep: ms => {
                        clock2.sleep(ms);
                        if (clock2.sleeps.length === 3) fs.rmSync(lockOf(dir));
                    }
                };
                const late = graph.withVenvLock(dir, () => (installs++, { ok: true, message: 'installed' }), finishing);
                assertTrue(late.ok, 'the waiter proceeds once the holder releases');
                assertEqual(installs, 1, 'the waiter installs once');
                assertEqual(clock2.sleeps.length, 3, 'it stopped waiting as soon as the lock was free');
            });
        }
    },
    {
        name: '[graph-venv] TC-ADS-053 old locks are broken, a fresh unreadable lock is held, and a broken holder never removes the new lock',
        fn() {
            withTemp(base => {
                const dir = path.join(base, 'cache', SHARED, 'abc123def456');
                const live = { hostname: () => 'host-a', processAlive: () => true, sleep: noWait };
                const install = counter => () => (counter.n++, { ok: true, message: 'installed' });

                // Given a lock older than 15 minutes whose pid is alive
                const old = { n: 0 };
                writeLock(dir, { pid: 4242, host: 'host-a', at: Date.now() - 16 * MINUTE, token: 'old' });
                // When the install starts / Then it is broken and the install proceeds
                assertTrue(graph.withVenvLock(dir, install(old), live).ok, 'an old live lock is broken');
                assertEqual(old.n, 1, 'install ran after breaking the old lock');

                // Given an unparseable lock whose mtime is older than 15 minutes
                const garbled = { n: 0 };
                writeLock(dir, 'not json {');
                const past = new Date(Date.now() - 16 * MINUTE);
                fs.utimesSync(lockOf(dir), past, past);
                assertTrue(graph.withVenvLock(dir, install(garbled), live).ok, 'an old unparseable lock is broken by mtime');
                assertEqual(garbled.n, 1, 'install ran after breaking the unparseable lock');

                // Given a fresh unparseable lock → held: bounded wait, ok false, lock left alone
                const fresh = { n: 0 };
                writeLock(dir, 'not json {');
                const clock = fakeClock(Date.now());
                const held = graph.withVenvLock(dir, install(fresh), { ...live, now: clock.now, sleep: clock.sleep });
                assertFalse(held.ok, 'a fresh unparseable lock is held');
                assertContains(held.message, 'pid unknown', 'an unparseable holder is reported as unknown');
                assertEqual(fresh.n, 0, 'no install under a fresh unparseable lock');
                assertEqual(fs.readFileSync(lockOf(dir), 'utf8'), 'not json {', 'the fresh unparseable lock is kept');
                fs.rmSync(lockOf(dir));

                // Boundary: a lock exactly 15 minutes old with a live holder is still held (frozen clock: the wait stays bounded)
                const T = Date.now();
                writeLock(dir, { pid: 4242, host: 'host-a', at: T - 15 * MINUTE, token: 'edge' });
                const sleeps = [];
                const boundary = graph.withVenvLock(dir, install(fresh), { ...live, now: () => T, sleep: ms => sleeps.push(ms) });
                assertFalse(boundary.ok, 'exactly 15 minutes is not yet stale');
                assertTrue(sleeps.length > 0 && sleeps.length <= 60, `the wait is bounded even with a frozen clock: ${sleeps.length} polls`);
                fs.rmSync(lockOf(dir));

                // Race: the stale lock is replaced by another contender between the check and the removal
                const raced = { n: 0 };
                writeLock(dir, { pid: 999999, host: 'host-a', at: Date.now(), token: 'dead' });
                const newcomer = JSON.stringify({ pid: 5151, host: 'host-a', at: Date.now(), token: 'newcomer' });
                const raceClock = fakeClock(Date.now());
                const race = graph.withVenvLock(dir, install(raced), {
                    hostname: () => 'host-a',
                    now: raceClock.now,
                    sleep: raceClock.sleep,
                    processAlive: pid => {
                        if (pid !== 999999) return true;
                        fs.writeFileSync(lockOf(dir), newcomer); // contender re-created it after our read
                        return false;
                    }
                });
                assertFalse(race.ok, 'losing the re-create race means the lock is held');
                assertEqual(raced.n, 0, 'no install while the newcomer holds the lock');
                assertEqual(fs.readFileSync(lockOf(dir), 'utf8'), newcomer, "the newcomer's lock is never removed");
                assertEqual(JSON.stringify(fs.readdirSync(path.dirname(dir)).filter(name => name.endsWith('.stale'))), '[]', 'breaking a lock leaves no tombstone behind');
                fs.rmSync(lockOf(dir));

                // Given a holder whose lock was broken and re-created by another contender
                const first = graph.acquireVenvLock(dir, live);
                assertTrue(first.ok, 'first holder acquires');
                fs.rmSync(lockOf(dir));
                const second = JSON.stringify({ pid: 6262, host: 'host-a', at: Date.now(), token: 'second' });
                fs.writeFileSync(lockOf(dir), second);
                // When the first holder releases / Then the new holder's lock (different token) stays
                first.release();
                assertEqual(fs.readFileSync(lockOf(dir), 'utf8'), second, "a broken holder never deletes the new holder's lock");
                fs.rmSync(lockOf(dir));
                // Control: releasing one's own lock removes it
                const own = graph.acquireVenvLock(dir, live);
                own.release();
                assertFalse(fs.existsSync(lockOf(dir)), 'a holder removes its own lock');
            });
        }
    }
];

module.exports = {
    name: 'graph-venv',
    tests
};
