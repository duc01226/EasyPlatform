'use strict';
/**
 * Code Review Graph utilities for CJS hooks.
 *
 * Provides Python detection, graph availability checking, and graph CLI invocation.
 * All functions fail gracefully — return false/null when graph is unavailable.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { debug, debugError } = require('./debug-log.cjs');
const { resolveProjectRoot } = require('./project-root.cjs');

const TAG = 'graph-utils';
const DEBOUNCE_MS = 3000;
const rootResolution = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env });
const PROJECT_DIR = rootResolution.rootDir;
const REQUIREMENTS_FILE = path.join(PROJECT_DIR, '.claude', 'scripts', 'code_graph', 'requirements.txt');
const DEPS_IMPORT_CHECK = 'import tree_sitter; import tree_sitter_language_pack; import networkx';

/** Marker a venv carries once its import check passed; its content is the requirements hash. */
const DEPS_OK_MARKER = 'deps-ok';
/** Per-user cache sub-path of the shared venvs, one dir per requirements hash. */
const SHARED_VENV_SUBDIR = path.join('easy-claude', 'graph-venv');
/** Hex chars of the requirements hash that name a shared venv dir. */
const VENV_KEY_LENGTH = 12;

// Install lock rules (plan P37). A lock older than VENV_LOCK_STALE_MS is broken whatever its
// pid says: about 3x the worst-case install, the sum of the execFileSync timeouts in
// ensurePythonDeps (venv 60 s + pip check 15 s + ensurepip 120 s + pip install 120 s +
// import check 10 s ≈ 5.4 min). A held lock is polled every 100 ms for at most 5 s, the same
// contract as startup-install-lock.cjs, so session start stays short.
const VENV_LOCK_STALE_MS = 15 * 60 * 1000;
const VENV_LOCK_WAIT_MS = 5000;
const VENV_LOCK_POLL_MS = 100;
/** Extra loop turns for a lock that vanished or was broken between two checks. */
const VENV_LOCK_EXTRA_ATTEMPTS = 10;

/** `hooks.codeGraph.enabled` values (docs/project-config.json); omitted means 'auto'. */
const CODE_GRAPH_SETTINGS = Object.freeze(['auto', 'on', 'off']);

/**
 * Test seam: when this env var names a file, every process this module would start is
 * appended to that file as one JSON line `{ bin, args }` and is NOT started; the call then
 * fails as if the binary were missing. It lets a test prove a hook starts no graph process
 * without a real Python. Unset in normal use.
 */
const SPAWN_STUB_ENV = 'CK_GRAPH_SPAWN_STUB';

/**
 * Start a child process for the graph toolchain (Python, pip, git).
 * Every process this module starts goes through here, so the spawn seam covers them all.
 * @param {string} bin - Executable
 * @param {string[]} args - Literal argv
 * @param {object} options - execFileSync options
 * @returns {string} stdout
 */
function runGraphProcess(bin, args, options) {
    const stubLog = process.env[SPAWN_STUB_ENV];
    if (stubLog) {
        try {
            fs.appendFileSync(stubLog, JSON.stringify({ bin, args }) + '\n', 'utf-8');
        } catch {
            /* the seam still refuses to start the process */
        }
        const error = new Error(`${SPAWN_STUB_ENV}: process start stubbed`);
        error.code = 'ENOENT';
        throw error;
    }
    return execFileSync(bin, args, options);
}

// Cache Python binary path and tree-sitter availability for the session
let _pythonBin = undefined; // undefined = not checked, null = not found, string = path
let _hasTreeSitter = undefined; // undefined = not checked, true/false = result
let _depsInstalled = false; // tracks whether ensurePythonDeps ran successfully this session

/**
 * sha256 of the project's graph requirements file (raw bytes, so any edit changes it).
 * An unreadable file hashes as empty content: the key stays stable, and the install step
 * reports the missing file itself.
 * @param {string} [projectDir] - Project root (defaults to the resolved project root)
 * @returns {string} 64-char hex hash
 */
function requirementsHash(projectDir = PROJECT_DIR) {
    let content = '';
    try {
        content = fs.readFileSync(path.join(projectDir, '.claude', 'scripts', 'code_graph', 'requirements.txt'));
    } catch {
        /* unreadable → empty content */
    }
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * The project-local venv, the only location before shared venvs existed.
 * @param {string} [projectDir] - Project root (defaults to the resolved project root)
 * @returns {string} Absolute venv dir
 */
function projectVenvDir(projectDir = PROJECT_DIR) {
    return path.join(projectDir, 'tmp', 'claude-temp', '.venv');
}

/**
 * The per-user cache root for this OS. Reads only the injected env, never the live process
 * env, so tests fully control it.
 *   win32  → %LOCALAPPDATA%, else <USERPROFILE|HOME>\AppData\Local
 *   darwin → $HOME/Library/Caches
 *   other  → $XDG_CACHE_HOME, else $HOME/.cache
 * A relative value is ignored (it would resolve against the cwd).
 * @param {{ env?: object, platform?: string }} [options]
 * @returns {string|null} Absolute cache root, or null when no home is known
 */
function userCacheRoot({ env = process.env, platform = process.platform } = {}) {
    const absolute = value => {
        const text = typeof value === 'string' ? value.trim() : '';
        return text && path.isAbsolute(text) ? text : null;
    };
    if (platform === 'win32') {
        const local = absolute(env.LOCALAPPDATA);
        if (local) return local;
        const home = absolute(env.USERPROFILE) || absolute(env.HOME);
        return home ? path.join(home, 'AppData', 'Local') : null;
    }
    const home = absolute(env.HOME);
    if (platform === 'darwin') return home ? path.join(home, 'Library', 'Caches') : null;
    const xdg = absolute(env.XDG_CACHE_HOME);
    if (xdg) return xdg;
    return home ? path.join(home, '.cache') : null;
}

/**
 * The shared venv for this project's requirements: `<cache root>/easy-claude/graph-venv/<hash12>`.
 * Checkouts with the same pins share it; different pins get different dirs. With no known
 * home, the project venv is the documented fallback.
 * @param {{ env?: object, platform?: string, projectDir?: string }} [options]
 * @returns {string} Absolute venv dir
 */
function sharedVenvDir({ env = process.env, platform = process.platform, projectDir = PROJECT_DIR } = {}) {
    const root = userCacheRoot({ env, platform });
    if (!root) return projectVenvDir(projectDir);
    return path.join(root, SHARED_VENV_SUBDIR, requirementsHash(projectDir).slice(0, VENV_KEY_LENGTH));
}

/**
 * Whether a venv's `deps-ok` marker holds this hash. Unreadable counts as no marker.
 * @param {string} dir - Venv dir
 * @param {string} hash - Current requirements hash
 * @returns {boolean}
 */
function hasCurrentMarker(dir, hash) {
    return readDepsMarker(dir) === hash;
}

/**
 * A venv's `deps-ok` marker content (trimmed); null when absent or unreadable.
 * @param {string} dir - Venv dir
 * @returns {string|null}
 */
function readDepsMarker(dir) {
    try {
        return fs.readFileSync(path.join(dir, DEPS_OK_MARKER), 'utf-8').trim() || null;
    } catch {
        return null;
    }
}

/**
 * The venv the graph tools use. Reads files only and never starts a process or throws:
 * the project venv when its `deps-ok` marker holds the current requirements hash (so an
 * existing install keeps working), else the hash-keyed shared venv. `ensurePythonDeps`
 * owns the marker; a marker over a venv that broke later is handled by `markDepsUnavailable`.
 * @param {{ env?: object, platform?: string, projectDir?: string }} [options]
 * @returns {string} Absolute venv dir
 */
function venvDir({ env = process.env, platform = process.platform, projectDir = PROJECT_DIR } = {}) {
    try {
        const project = projectVenvDir(projectDir);
        if (hasCurrentMarker(project, requirementsHash(projectDir))) return project;
        return sharedVenvDir({ env, platform, projectDir });
    } catch {
        return projectVenvDir(projectDir);
    }
}

/**
 * The Python binary inside a venv dir (platform-aware).
 * @param {string} dir - Venv dir
 * @param {string} [platform]
 * @returns {string}
 */
function venvPythonIn(dir, platform = process.platform) {
    return platform === 'win32' ? path.join(dir, 'Scripts', 'python.exe') : path.join(dir, 'bin', 'python');
}

/**
 * Get the venv Python binary path (platform-aware); follows `venvDir()`.
 * @param {{ env?: object, platform?: string, projectDir?: string }} [options]
 * @returns {string} Absolute path to venv python binary
 */
function getVenvPython(options = {}) {
    return venvPythonIn(venvDir(options), options.platform || process.platform);
}

/**
 * Check if the venv exists and has a valid Python binary.
 * @returns {boolean}
 */
function isVenvValid() {
    return fs.existsSync(getVenvPython());
}

/** Synchronous sleep: ensurePythonDeps is synchronous (execFileSync), so the lock wait is too. */
function sleepSync(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, ms));
}

/**
 * Liveness of a pid on this host: ESRCH = dead, EPERM = alive (owned elsewhere),
 * anything else = unknown (null), as in startup-install-lock.cjs.
 * @param {number} pid
 * @returns {boolean|null}
 */
function defaultProcessAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        if (error && error.code === 'ESRCH') return false;
        if (error && error.code === 'EPERM') return true;
        return null;
    }
}

const DEFAULT_LOCK_SEAMS = Object.freeze({
    now: () => Date.now(),
    sleep: sleepSync,
    processAlive: defaultProcessAlive,
    hostname: () => os.hostname()
});

/** Parse a lock record; null when it is not a JSON object with a positive integer pid. */
function parseVenvLock(raw) {
    try {
        const record = JSON.parse(raw);
        if (!record || typeof record !== 'object' || !Number.isInteger(record.pid) || record.pid <= 0) return null;
        return record;
    } catch {
        return null;
    }
}

/**
 * A lock is stale when this host's pid is provably dead, or when it is older than
 * VENV_LOCK_STALE_MS whatever the pid says (a reused pid, another host). An unparseable
 * lock is judged by its file mtime alone.
 */
function isVenvLockStale(record, mtimeMs, seams) {
    const at = record && Number.isFinite(record.at) ? record.at : mtimeMs;
    if (seams.now() - at > VENV_LOCK_STALE_MS) return true;
    return Boolean(record) && record.host === seams.hostname() && seams.processAlive(record.pid) === false;
}

/**
 * Take the install lock `<dir>.lock` beside a shared venv dir.
 *
 * Exclusive create (`wx`) of `{ pid, host, at, token }`. A stale lock is removed only when
 * its bytes are unchanged since it was judged (`breakStaleVenvLock`), then created again; losing that race means
 * another contender holds it. A held lock is polled every 100 ms for at most 5 s. Never
 * throws and never loops without a bound.
 * @param {string} dir - Venv dir the lock guards
 * @param {{ now?: Function, sleep?: Function, processAlive?: Function, hostname?: Function }} [seams]
 * @returns {{ ok: true, lockPath: string, token: string, release: Function } | { ok: false, message: string }}
 */
function acquireVenvLock(dir, seams = {}) {
    const s = { ...DEFAULT_LOCK_SEAMS, ...seams };
    const lockPath = `${dir}.lock`;
    const ioFailure = err => ({ ok: false, message: `[code-graph] cannot lock the shared graph venv at ${dir}: ${err && err.message}` });
    try {
        fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    } catch (err) {
        return ioFailure(err);
    }
    const started = s.now();
    const maxAttempts = Math.ceil(VENV_LOCK_WAIT_MS / VENV_LOCK_POLL_MS) + VENV_LOCK_EXTRA_ATTEMPTS;
    let holderPid = 'unknown';
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const token = crypto.randomBytes(8).toString('hex');
        try {
            const fd = fs.openSync(lockPath, 'wx');
            try {
                fs.writeSync(fd, JSON.stringify({ pid: process.pid, host: s.hostname(), at: s.now(), token }));
            } finally {
                fs.closeSync(fd);
            }
            return { ok: true, lockPath, token, release: () => releaseVenvLock(lockPath, token) };
        } catch (err) {
            if (!err || err.code !== 'EEXIST') return ioFailure(err);
        }

        let raw;
        let mtimeMs;
        try {
            raw = fs.readFileSync(lockPath, 'utf-8');
            mtimeMs = fs.statSync(lockPath).mtimeMs;
        } catch (err) {
            if (err && err.code === 'ENOENT') continue; // released between create and read
            return ioFailure(err);
        }
        const record = parseVenvLock(raw);
        holderPid = record ? record.pid : 'unknown';
        if (isVenvLockStale(record, mtimeMs, s)) {
            breakStaleVenvLock(lockPath, raw);
            continue;
        }

        const waited = s.now() - started;
        if (waited >= VENV_LOCK_WAIT_MS) break;
        s.sleep(Math.min(VENV_LOCK_POLL_MS, VENV_LOCK_WAIT_MS - waited));
    }
    return {
        ok: false,
        message: `[code-graph] another session (pid ${holderPid}) is installing the shared graph venv at ${dir}; graph tools stay off for this session and are checked again next session.`
    };
}

/**
 * Break a lock judged stale, but only the exact bytes that were judged. The lock is moved to a
 * unique tombstone first (one atomic rename), so two contenders can never both delete it: the
 * one that moved it reads the tombstone, and when it holds other bytes (a contender re-created
 * the lock after the judgement) those bytes are put back with an exclusive create. Best effort,
 * never throws: whatever happens, the next exclusive create decides who holds the lock.
 * @param {string} lockPath
 * @param {string} raw - Lock bytes read when it was judged stale
 */
function breakStaleVenvLock(lockPath, raw) {
    const tombstone = `${lockPath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.stale`;
    try {
        fs.renameSync(lockPath, tombstone);
    } catch {
        return; /* gone already: the next create decides */
    }
    try {
        const moved = fs.readFileSync(tombstone, 'utf-8');
        if (moved !== raw) fs.writeFileSync(lockPath, moved, { flag: 'wx' });
    } catch {
        /* a newer lock already exists, or the tombstone is unreadable: the next create decides */
    }
    try {
        fs.unlinkSync(tombstone);
    } catch {
        /* already gone */
    }
}

/**
 * Remove the lock only while it still carries this holder's token, so a holder whose lock
 * was broken as stale never deletes the new holder's lock.
 * @param {string} lockPath
 * @param {string} token
 */
function releaseVenvLock(lockPath, token) {
    try {
        const current = parseVenvLock(fs.readFileSync(lockPath, 'utf-8'));
        if (!current || current.token !== token) return;
        fs.unlinkSync(lockPath);
    } catch {
        /* already gone */
    }
}

/**
 * Run `install` while holding the venv lock; release it in a `finally`.
 * @param {string} dir - Venv dir the lock guards
 * @param {Function} install - Returns `{ ok, message }`
 * @param {object} [seams] - See acquireVenvLock
 * @returns {{ ok: boolean, message: string }}
 */
function withVenvLock(dir, install, seams) {
    const lock = acquireVenvLock(dir, seams);
    if (!lock.ok) return lock;
    try {
        return install();
    } finally {
        lock.release();
    }
}

/** Write a venv's `deps-ok` marker; best effort (a failed write costs one re-check). */
function writeDepsMarker(dir, hash) {
    try {
        fs.writeFileSync(path.join(dir, DEPS_OK_MARKER), hash, 'utf-8');
    } catch (err) {
        debugError(TAG, err);
    }
}

/** Drop a venv's marker so `venvDir()` stops choosing a venv whose import check failed. */
function clearDepsMarker(dir) {
    try {
        fs.unlinkSync(path.join(dir, DEPS_OK_MARKER));
    } catch {
        /* absent is the normal case */
    }
}

/** Whether a venv Python imports every graph dependency (340-547 ms: session init only). */
function importCheckPasses(python) {
    try {
        runGraphProcess(python, ['-c', DEPS_IMPORT_CHECK], {
            encoding: 'utf-8',
            timeout: 10000,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if a Python version string indicates 3.10+.
 * @param {string} versionOutput - Output of `python --version` (e.g. "Python 3.12.1")
 * @returns {boolean}
 */
function isPython310Plus(versionOutput) {
    const match = versionOutput.match(/Python (\d+)\.(\d+)/);
    if (!match) return false;
    const [, major, minor] = match.map(Number);
    return major > 3 || (major === 3 && minor >= 10);
}

/**
 * Search system PATH for a Python 3.10+ binary.
 * Tries py (Windows Launcher) → python3 → python.
 * @returns {string|null} Binary name or null
 */
function findSystemPython() {
    const candidates = process.platform === 'win32' ? ['py', 'python3', 'python'] : ['python3', 'python'];
    for (const bin of candidates) {
        try {
            const version = runGraphProcess(bin, ['--version'], {
                encoding: 'utf-8',
                timeout: 5000,
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();
            if (isPython310Plus(version)) return bin;
        } catch {
            /* candidate not found, try next */
        }
    }
    return null;
}

/**
 * Find a working Python 3.10+ binary.
 * Priority: venv Python → system Python (py/python3/python).
 * Result is cached for the process lifetime.
 * @returns {string|null} Python binary path/name or null
 */
function findPython() {
    if (rootResolution.error) return null;
    if (_pythonBin !== undefined) return _pythonBin;

    // 1. Prefer venv Python if it exists
    if (isVenvValid()) {
        const venvPy = getVenvPython();
        try {
            const version = runGraphProcess(venvPy, ['--version'], {
                encoding: 'utf-8',
                timeout: 5000,
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();
            if (isPython310Plus(version)) {
                debug(TAG, `Found venv Python: ${version}`);
                _pythonBin = venvPy;
                return venvPy;
            }
        } catch {
            debug(TAG, 'Venv Python exists but failed version check');
        }
    }

    // 2. Fall back to system Python
    const sysPython = findSystemPython();
    if (sysPython) {
        debug(TAG, `Found system Python: ${sysPython}`);
        _pythonBin = sysPython;
        return sysPython;
    }

    debug(TAG, 'No Python 3.10+ found');
    _pythonBin = null;
    return null;
}

/**
 * Ensure the graph Python dependencies are installed and mark the venv ready.
 *
 * 1. Reuse a working venv: the project venv first (an unmarked install from before shared venvs
 *    is adopted in place, no forced migration; one marked for other requirements is skipped),
 *    then the shared one. A venv whose import check passes gets the `deps-ok` marker with the
 *    current requirements hash; a failing project venv loses it (the shared venv's marker is
 *    cleared only under its install lock).
 * 2. Otherwise install into the hash-keyed shared venv under the install lock, and write the
 *    marker last, so a crash mid-install leaves no marker and the next session reinstalls.
 * Works on Windows, macOS and Linux.
 *
 * @returns {{ ok: boolean, message: string }} Result with status and user-facing message
 */
function ensurePythonDeps() {
    if (rootResolution.error) return { ok: false, message: `[code-graph] Skipped: ${rootResolution.error}` };
    // Already confirmed this session
    if (_depsInstalled) return { ok: true, message: 'Dependencies already verified this session.' };

    const hash = requirementsHash();
    const projectVenv = projectVenvDir();
    const sharedVenv = sharedVenvDir();

    // 1. Reuse a venv with working deps
    for (const dir of projectVenv === sharedVenv ? [projectVenv] : [projectVenv, sharedVenv]) {
        const python = venvPythonIn(dir);
        if (!fs.existsSync(python)) continue;
        const isShared = dir === sharedVenv;
        // A project venv marked for OTHER requirements is never adopted: the import check proves
        // module names, not versions, so re-marking it would hide a pin change (BR-ADS-17).
        if (!isShared && readDepsMarker(dir) !== null && !hasCurrentMarker(dir, hash)) {
            debug(TAG, `Project venv at ${dir} is marked for other requirements; using the shared venv`);
            continue;
        }
        if (importCheckPasses(python)) {
            if (!hasCurrentMarker(dir, hash)) writeDepsMarker(dir, hash);
            markDepsReady();
            return { ok: true, message: 'Venv and dependencies ready.' };
        }
        // The shared venv's marker is cleared only under its install lock (installSharedVenv), so a
        // session whose check ran before a concurrent install finished never deletes the fresh marker.
        if (!isShared) clearDepsMarker(dir);
        debug(TAG, `Venv at ${dir} exists but deps incomplete`);
    }

    // 2. Find system Python to create venv
    const sysPython = findSystemPython();
    if (!sysPython) {
        return {
            ok: false,
            message:
                '[code-graph] Python 3.10+ not found on system.\n' + 'Install Python 3.10+: https://www.python.org/downloads/\n' + 'Then restart this session.'
        };
    }

    // 3-6. Install into the shared venv while holding its lock
    return withVenvLock(sharedVenv, () => installSharedVenv(sharedVenv, sysPython, hash));
}

/** Record a verified venv for this process: reset the caches so findPython picks it up. */
function markDepsReady() {
    _depsInstalled = true;
    _pythonBin = undefined;
    _hasTreeSitter = undefined;
}

/**
 * Create the venv, install the requirements, verify the imports and write the marker last.
 * Runs only while holding the venv lock.
 * @param {string} dir - Venv dir
 * @param {string} sysPython - System Python 3.10+ binary
 * @param {string} hash - Current requirements hash
 * @returns {{ ok: boolean, message: string }}
 */
function installSharedVenv(dir, sysPython, hash) {
    const venvPy = venvPythonIn(dir);

    // Another session finished this install while we waited for the lock (re-checked under the lock);
    // a marked venv whose imports fail loses its marker here, while the lock is held, and is repaired.
    if (hasCurrentMarker(dir, hash) && fs.existsSync(venvPy)) {
        if (importCheckPasses(venvPy)) {
            markDepsReady();
            return { ok: true, message: 'Venv and dependencies ready.' };
        }
        clearDepsMarker(dir);
    }

    // 3. Create venv if it doesn't exist
    if (!fs.existsSync(venvPy)) {
        const venvParent = path.dirname(dir);
        if (!fs.existsSync(venvParent)) {
            fs.mkdirSync(venvParent, { recursive: true });
        }
        debug(TAG, `Creating venv at ${dir} using ${sysPython}`);
        try {
            // Use -m venv (works on both Windows and macOS/Linux)
            const venvArgs = process.platform === 'win32' && sysPython === 'py' ? ['-3', '-m', 'venv', dir] : ['-m', 'venv', dir];
            runGraphProcess(sysPython, venvArgs, {
                encoding: 'utf-8',
                timeout: 60000,
                cwd: PROJECT_DIR,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            debug(TAG, 'Venv created successfully');
        } catch (err) {
            debugError(TAG, err);
            return {
                ok: false,
                message:
                    '[code-graph] Failed to create Python venv.\n' +
                    `Error: ${err.message}\n` +
                    `Fallback: run manually:\n  ${sysPython} -m venv ${dir}\n  ${venvPy} -m pip install -r ${REQUIREMENTS_FILE}`
            };
        }
    }

    // 4. Install dependencies via pip
    if (!fs.existsSync(REQUIREMENTS_FILE)) {
        return {
            ok: false,
            message: `[code-graph] requirements.txt not found at ${REQUIREMENTS_FILE}`
        };
    }

    // Install through `python -m pip`, never the pip BINARY. A venv created with
    // --without-pip, or one whose Scripts/pip.exe was pruned, still has a working
    // python.exe — so step 3 skips re-creating it, and a pip-binary call then fails
    // ENOENT on every attempt, leaving the venv PERMANENTLY unrepairable by this
    // function. `python -m pip` works whenever the pip module is importable, and
    // `ensurepip` installs that module when it is not.
    debug(TAG, `Installing dependencies from ${REQUIREMENTS_FILE}`);

    try {
        runGraphProcess(venvPy, ['-m', 'pip', '--version'], {
            encoding: 'utf-8',
            timeout: 15000,
            stdio: ['pipe', 'pipe', 'pipe']
        });
    } catch {
        debug(TAG, 'pip module absent in venv - bootstrapping via ensurepip');
        try {
            runGraphProcess(venvPy, ['-m', 'ensurepip', '--upgrade'], {
                encoding: 'utf-8',
                timeout: 120000,
                cwd: PROJECT_DIR,
                stdio: ['pipe', 'pipe', 'pipe']
            });
        } catch (err) {
            debugError(TAG, err);
            return {
                ok: false,
                message:
                    '[code-graph] Venv has no pip module and the ensurepip bootstrap failed.\n' +
                    `Error: ${err.stderr || err.message}\n` +
                    `Fallback: run manually:\n  ${venvPy} -m ensurepip --upgrade\n  ${venvPy} -m pip install -r ${REQUIREMENTS_FILE}`
            };
        }
    }

    try {
        runGraphProcess(venvPy, ['-m', 'pip', 'install', '-r', REQUIREMENTS_FILE, '--quiet'], {
            encoding: 'utf-8',
            timeout: 120000, // 2 min for pip install
            cwd: PROJECT_DIR,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        debug(TAG, 'Dependencies installed successfully');
    } catch (err) {
        debugError(TAG, err);
        return {
            ok: false,
            message:
                '[code-graph] Failed to install Python dependencies.\n' +
                `Error: ${err.stderr || err.message}\n` +
                `Fallback: run manually:\n  ${venvPy} -m pip install -r ${REQUIREMENTS_FILE}`
        };
    }

    // 5. Verify installation
    try {
        runGraphProcess(venvPy, ['-c', DEPS_IMPORT_CHECK], {
            encoding: 'utf-8',
            timeout: 10000,
            stdio: ['pipe', 'pipe', 'pipe']
        });
    } catch (err) {
        return {
            ok: false,
            message:
                '[code-graph] Dependencies installed but import verification failed.\n' +
                `Error: ${err.message}\n` +
                'Try: ' +
                venvPy +
                ' -m pip install tree-sitter tree-sitter-language-pack networkx'
        };
    }

    // 6. Success — the marker is written last, then the caches reset
    writeDepsMarker(dir, hash);
    markDepsReady();
    debug(TAG, 'ensurePythonDeps completed successfully');
    return { ok: true, message: '[code-graph] Python venv created and dependencies installed.' };
}

/**
 * Check if tree-sitter Python package is importable.
 * @returns {boolean}
 */
function checkTreeSitter() {
    if (_hasTreeSitter !== undefined) return _hasTreeSitter;
    const python = findPython();
    if (!python) {
        _hasTreeSitter = false;
        return false;
    }

    try {
        runGraphProcess(python, ['-c', 'import tree_sitter'], {
            encoding: 'utf-8',
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        _hasTreeSitter = true;
    } catch {
        _hasTreeSitter = false;
    }
    return _hasTreeSitter;
}

/**
 * Get the path to the graph database.
 * @param {string} [projectDir] - Project root (defaults to the resolved project root)
 * @returns {string} Absolute path to .code-graph/graph.db
 */
function getGraphDbPath(projectDir = PROJECT_DIR) {
    return path.join(projectDir, '.code-graph', 'graph.db');
}

/**
 * Decide whether the code graph is in use for this project.
 *
 * Reads `hooks.codeGraph.enabled` from the project config (docs/project-config.json):
 *   'on'   → 'active'   (always; a missing graph gets the build note)
 *   'auto' → 'active' when .code-graph/graph.db exists, else 'dormant' (the default)
 *   'off'  → 'off'      (every automatic graph step stays inert, even with a graph)
 * A section or value outside that contract fails config validation; until it is fixed the
 * graph stays inert ('off') rather than guessing, like `windowsGit` treats a bad section.
 *
 * Pure apart from one existence check, and that check runs only for 'auto'.
 * @param {{ config?: object, projectDir?: string }} [options]
 * @returns {'active'|'dormant'|'off'}
 */
function codeGraphMode({ config, projectDir = PROJECT_DIR } = {}) {
    const hooks = config && typeof config === 'object' ? config.hooks : undefined;
    const section = hooks && typeof hooks === 'object' ? hooks.codeGraph : undefined;
    if (section !== undefined && (!section || typeof section !== 'object' || Array.isArray(section))) return 'off';
    const setting = section && section.enabled !== undefined ? section.enabled : 'auto';
    if (!CODE_GRAPH_SETTINGS.includes(setting) || setting === 'off') return 'off';
    if (setting === 'on') return 'active';
    return fs.existsSync(getGraphDbPath(projectDir)) ? 'active' : 'dormant';
}

/**
 * Get the path to the Python scripts directory.
 * @returns {string} Absolute path to .claude/scripts/code_graph
 */
function getScriptPath() {
    return path.join(PROJECT_DIR, '.claude', 'scripts', 'code_graph');
}

/**
 * Check if graph.db was modified recently (within DEBOUNCE_MS)
 * OR if another update process is currently running (lock dir exists).
 * Used to debounce PostToolUse auto-updates.
 * @returns {boolean} True if recently updated or update in progress (should skip)
 */
function wasRecentlyUpdated() {
    if (rootResolution.error) return true;
    // Check lock dir first — another process may be updating right now
    const lockDir = path.join(PROJECT_DIR, '.code-graph', '.update-lock');
    try {
        const lockStat = fs.statSync(lockDir);
        if (Date.now() - lockStat.mtimeMs < 30000) {
            debug(TAG, 'Update lock active, skipping');
            return true;
        }
        // Stale lock (>30s old) — remove it
        fs.rmdirSync(lockDir);
    } catch {
        /* no lock dir — proceed */
    }

    // Check mtime-based debounce
    const dbPath = getGraphDbPath();
    try {
        const stat = fs.statSync(dbPath);
        return Date.now() - stat.mtimeMs < DEBOUNCE_MS;
    } catch {
        return false;
    }
}

/**
 * Acquire an exclusive update lock using atomic mkdir.
 * @returns {boolean} True if lock acquired, false if another process holds it
 */
function acquireUpdateLock() {
    if (rootResolution.error) return false;
    const lockDir = path.join(PROJECT_DIR, '.code-graph', '.update-lock');
    try {
        fs.mkdirSync(lockDir); // Atomic on all OS — fails if exists
        return true;
    } catch {
        // Lock exists — check if stale
        try {
            const stat = fs.statSync(lockDir);
            if (Date.now() - stat.mtimeMs > 30000) {
                fs.rmdirSync(lockDir);
                try {
                    fs.mkdirSync(lockDir);
                    return true;
                } catch {
                    return false;
                }
            }
        } catch {
            /* stat failed — race lost */
        }
        return false;
    }
}

/**
 * Release the update lock.
 */
function releaseUpdateLock() {
    if (rootResolution.error) return;
    const lockDir = path.join(PROJECT_DIR, '.code-graph', '.update-lock');
    try {
        fs.rmdirSync(lockDir);
    } catch {
        /* already removed */
    }
}

/**
 * Get the current git HEAD commit hash.
 * Cheap (~10-20ms) — this is the gate that keeps the per-prompt staleness
 * check from spawning Python on every prompt.
 * @returns {string|null} Commit hash, or null when git is unavailable / not a repo
 */
function getGitHead() {
    try {
        return (
            runGraphProcess('git', ['rev-parse', 'HEAD'], {
                encoding: 'utf-8',
                timeout: 5000,
                cwd: PROJECT_DIR,
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim() || null
        );
    } catch {
        return null;
    }
}

/**
 * Path to the hook-owned "already evaluated this HEAD" marker.
 *
 * Deliberately NOT a mirror of the graph's `last_synced_commit` metadata — it
 * records the last HEAD this hook CONSIDERED, which is a superset (a HEAD
 * skipped as graph-ahead is evaluated but never synced). Losing or corrupting
 * it costs at most one redundant sync, which is idempotent — it can never make
 * the graph wrong, so it is a debounce marker and not a source of truth.
 * @returns {string} Absolute path to the marker file
 */
function getLastSeenHeadPath() {
    return path.join(PROJECT_DIR, '.code-graph', '.last-seen-head');
}

/**
 * Read the last HEAD this hook evaluated.
 * @returns {string|null} Commit hash, or null when never recorded
 */
function readLastSeenHead() {
    try {
        return fs.readFileSync(getLastSeenHeadPath(), 'utf-8').trim() || null;
    } catch {
        return null;
    }
}

/**
 * Record a HEAD as evaluated. Written whatever the sync outcome was —
 * including the graph-ahead no-op — so sitting on an older branch does not
 * re-spawn Python on every prompt.
 * @param {string} head - Commit hash
 */
function writeLastSeenHead(head) {
    if (rootResolution.error) return;
    try {
        fs.writeFileSync(getLastSeenHeadPath(), head, 'utf-8');
    } catch {
        /* best-effort marker — a failed write only costs a redundant re-check */
    }
}

/**
 * Path to the "dependencies were missing when last checked" marker.
 *
 * Sibling of `.last-seen-head` and the same kind of object: a debounce marker,
 * never a source of truth. It exists because `isGraphAvailable()` costs TWO
 * Python spawns (`findPython` + `checkTreeSitter`, each with a 5s cap) and the
 * in-process memos above are worthless to a hook — every prompt and every edit
 * starts a fresh node process, so an unavailable install re-pays that cost
 * forever without ever changing the outcome.
 * @returns {string} Absolute path to the marker file
 */
function getDepsUnavailablePath() {
    return path.join(PROJECT_DIR, '.code-graph', '.deps-unavailable');
}

/**
 * How long a recorded "deps unavailable" verdict suppresses re-probing.
 * Six hours: long enough that a broken install cannot tax a whole working
 * session, short enough that an install repaired OUTSIDE this framework (a
 * manual `pip install`, a rebuilt venv) is picked up the same day without
 * anyone knowing this marker exists. A repair performed THROUGH the framework
 * does not wait for it — `graph-session-init` clears the marker on success.
 */
const DEPS_UNAVAILABLE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Whether a recent check already found the graph dependencies unavailable.
 * @param {number} [ttlMs] - Age beyond which the verdict is re-probed
 * @returns {boolean} true when a fresh negative verdict is on record
 */
function isDepsUnavailableCached(ttlMs = DEPS_UNAVAILABLE_TTL_MS) {
    try {
        const age = Date.now() - fs.statSync(getDepsUnavailablePath()).mtimeMs;
        // A marker written microseconds ago can carry an mtime a few ms in the
        // FUTURE — filesystem timestamp granularity, or a clock the OS has since
        // nudged. Rejecting a negative age would therefore discard the verdict at
        // the exact moment it was recorded, which is the one moment it matters, so
        // a small negative age counts as fresh. A marker more than a full TTL ahead
        // is a broken clock rather than a verdict, and is re-probed.
        return age < ttlMs && age > -ttlMs;
    } catch {
        return false; // no marker, or unreadable -> probe for real
    }
}

/**
 * Record that the graph dependencies were unavailable.
 * @returns {void}
 */
function markDepsUnavailable() {
    if (rootResolution.error) return;
    try {
        fs.mkdirSync(path.dirname(getDepsUnavailablePath()), { recursive: true });
        fs.writeFileSync(getDepsUnavailablePath(), new Date().toISOString(), 'utf-8');
    } catch {
        /* best-effort marker — a failed write only costs a redundant re-probe */
    }
}

/**
 * Drop any recorded "deps unavailable" verdict.
 *
 * Called on every path that OBSERVES the dependencies working, so a repair is
 * honoured immediately instead of waiting out the TTL.
 * @returns {void}
 */
function clearDepsUnavailable() {
    try {
        fs.unlinkSync(getDepsUnavailablePath());
    } catch {
        /* absent is the normal case */
    }
}

/**
 * Check full graph availability: Python + tree-sitter + graph.db exists.
 * @returns {{ available: boolean, python: boolean, deps: boolean, graph: boolean }}
 */
function isGraphAvailable() {
    const python = findPython();
    const hasPython = python !== null;
    const hasDeps = hasPython ? checkTreeSitter() : false;
    const hasGraph = fs.existsSync(getGraphDbPath());

    return {
        available: hasPython && hasDeps && hasGraph,
        python: hasPython,
        deps: hasDeps,
        graph: hasGraph
    };
}

/**
 * Invoke the code_graph CLI and return parsed JSON.
 * @param {string} cmd - CLI command (build, update, status, graph-blast-radius, query, review-context)
 * @param {string[]} args - Additional CLI arguments
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns {object|null} Parsed JSON output or null on error
 */
function invokeGraph(cmd, args = [], timeoutMs = 30000) {
    const python = findPython();
    if (!python) return null;

    const scriptPath = getScriptPath();
    const fullArgs = [scriptPath, cmd, ...args, '--json'];

    try {
        const stdout = runGraphProcess(python, fullArgs, {
            encoding: 'utf-8',
            timeout: timeoutMs,
            cwd: PROJECT_DIR,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return JSON.parse(stdout.trim());
    } catch (err) {
        debugError(TAG, err);
        return null;
    }
}

module.exports = {
    findPython,
    getGitHead,
    getLastSeenHeadPath,
    readLastSeenHead,
    writeLastSeenHead,
    getDepsUnavailablePath,
    isDepsUnavailableCached,
    markDepsUnavailable,
    clearDepsUnavailable,
    checkTreeSitter,
    getGraphDbPath,
    codeGraphMode,
    getScriptPath,
    wasRecentlyUpdated,
    acquireUpdateLock,
    releaseUpdateLock,
    isGraphAvailable,
    invokeGraph,
    ensurePythonDeps,
    venvDir,
    getVenvPython,
    requirementsHash,
    acquireVenvLock,
    withVenvLock
};
