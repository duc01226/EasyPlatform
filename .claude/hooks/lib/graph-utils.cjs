'use strict';
/**
 * Code Review Graph utilities for CJS hooks.
 *
 * Provides Python detection, graph availability checking, and graph CLI invocation.
 * All functions fail gracefully — return false/null when graph is unavailable.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { debug, debugError } = require('./debug-log.cjs');

const TAG = 'graph-utils';
const DEBOUNCE_MS = 3000;
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const VENV_DIR = path.join(PROJECT_DIR, 'tmp', '.claude', '.venv');
const REQUIREMENTS_FILE = path.join(PROJECT_DIR, '.claude', 'scripts', 'code_graph', 'requirements.txt');
const DEPS_IMPORT_CHECK = 'import tree_sitter; import tree_sitter_language_pack; import networkx';

// Cache Python binary path and tree-sitter availability for the session
let _pythonBin = undefined; // undefined = not checked, null = not found, string = path
let _hasTreeSitter = undefined; // undefined = not checked, true/false = result
let _depsInstalled = false; // tracks whether ensurePythonDeps ran successfully this session

/**
 * Get the venv Python binary path (platform-aware).
 * @returns {string} Absolute path to venv python binary
 */
function getVenvPython() {
    return process.platform === 'win32' ? path.join(VENV_DIR, 'Scripts', 'python.exe') : path.join(VENV_DIR, 'bin', 'python');
}

/**
 * Get the venv pip binary path (platform-aware).
 * @returns {string} Absolute path to venv pip binary
 */
function getVenvPip() {
    return process.platform === 'win32' ? path.join(VENV_DIR, 'Scripts', 'pip.exe') : path.join(VENV_DIR, 'bin', 'pip');
}

/**
 * Check if the venv exists and has a valid Python binary.
 * @returns {boolean}
 */
function isVenvValid() {
    return fs.existsSync(getVenvPython());
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
            const version = execFileSync(bin, ['--version'], {
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
    if (_pythonBin !== undefined) return _pythonBin;

    // 1. Prefer venv Python if it exists
    if (isVenvValid()) {
        const venvPy = getVenvPython();
        try {
            const version = execFileSync(venvPy, ['--version'], {
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
 * Ensure Python dependencies are installed in a project-local venv.
 * Creates venv and installs requirements if needed.
 * Works on both Windows and macOS/Linux.
 *
 * @returns {{ ok: boolean, message: string }} Result with status and user-facing message
 */
function ensurePythonDeps() {
    // Already confirmed this session
    if (_depsInstalled) return { ok: true, message: 'Dependencies already verified this session.' };

    // 1. Check if venv exists with working deps
    if (isVenvValid()) {
        const venvPy = getVenvPython();
        try {
            execFileSync(venvPy, ['-c', DEPS_IMPORT_CHECK], {
                encoding: 'utf-8',
                timeout: 10000,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            _depsInstalled = true;
            // Reset cache so findPython picks up the venv
            _pythonBin = undefined;
            _hasTreeSitter = undefined;
            return { ok: true, message: 'Venv and dependencies ready.' };
        } catch {
            debug(TAG, 'Venv exists but deps incomplete — will install');
        }
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

    // 3. Create venv if it doesn't exist
    if (!isVenvValid()) {
        // Ensure parent directory exists (tmp/.claude/)
        const venvParent = path.dirname(VENV_DIR);
        if (!fs.existsSync(venvParent)) {
            fs.mkdirSync(venvParent, { recursive: true });
        }
        debug(TAG, `Creating venv at ${VENV_DIR} using ${sysPython}`);
        try {
            // Use -m venv (works on both Windows and macOS/Linux)
            const venvArgs = process.platform === 'win32' && sysPython === 'py' ? ['-3', '-m', 'venv', VENV_DIR] : ['-m', 'venv', VENV_DIR];
            execFileSync(sysPython, venvArgs, {
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
                    `Fallback: run manually:\n  ${sysPython} -m venv ${VENV_DIR}\n  ${getVenvPip()} install -r ${REQUIREMENTS_FILE}`
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

    const venvPip = getVenvPip();
    debug(TAG, `Installing dependencies from ${REQUIREMENTS_FILE}`);
    try {
        execFileSync(venvPip, ['install', '-r', REQUIREMENTS_FILE, '--quiet'], {
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
                `Fallback: run manually:\n  ${venvPip} install -r ${REQUIREMENTS_FILE}`
        };
    }

    // 5. Verify installation
    const venvPy = getVenvPython();
    try {
        execFileSync(venvPy, ['-c', DEPS_IMPORT_CHECK], {
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
                venvPip +
                ' install tree-sitter tree-sitter-language-pack networkx'
        };
    }

    // 6. Success — reset caches
    _depsInstalled = true;
    _pythonBin = undefined;
    _hasTreeSitter = undefined;
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
        execFileSync(python, ['-c', 'import tree_sitter'], {
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
 * @returns {string} Absolute path to .code-graph/graph.db
 */
function getGraphDbPath() {
    return path.join(PROJECT_DIR, '.code-graph', 'graph.db');
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
    const lockDir = path.join(PROJECT_DIR, '.code-graph', '.update-lock');
    try {
        fs.rmdirSync(lockDir);
    } catch {
        /* already removed */
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
        const stdout = execFileSync(python, fullArgs, {
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
    checkTreeSitter,
    getGraphDbPath,
    getScriptPath,
    wasRecentlyUpdated,
    acquireUpdateLock,
    releaseUpdateLock,
    isGraphAvailable,
    invokeGraph,
    ensurePythonDeps
};
