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

// Cache Python binary path and tree-sitter availability for the session
let _pythonBin = undefined; // undefined = not checked, null = not found, string = path
let _hasTreeSitter = undefined; // undefined = not checked, true/false = result

/**
 * Find a working Python 3.10+ binary.
 * Tries py (Windows Launcher) → python3 → python.
 * Result is cached for the process lifetime.
 * @returns {string|null} Python binary name or null
 */
function findPython() {
    if (_pythonBin !== undefined) return _pythonBin;

    const candidates = process.platform === 'win32' ? ['py', 'python3', 'python'] : ['python3', 'python'];

    for (const bin of candidates) {
        try {
            const version = execFileSync(bin, ['--version'], {
                encoding: 'utf-8',
                timeout: 5000,
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();
            // Verify Python 3.10+
            const match = version.match(/Python (\d+)\.(\d+)/);
            if (match && (parseInt(match[1]) > 3 || (parseInt(match[1]) === 3 && parseInt(match[2]) >= 10))) {
                debug(TAG, `Found ${bin}: ${version}`);
                _pythonBin = bin;
                return bin;
            }
        } catch {
            /* candidate not found, try next */
        }
    }

    debug(TAG, 'No Python 3.10+ found');
    _pythonBin = null;
    return null;
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
    invokeGraph
};
