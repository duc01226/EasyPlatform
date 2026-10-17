#!/usr/bin/env node
'use strict';

/**
 * Resolve the consuming project root for portable Claude/Codex tooling.
 *
 * A host may invoke a hook or verifier from a nested worktree directory, while
 * a copied `.claude` bundle may be launched with an absolute script path.  The
 * old callers used `process.cwd()` directly, which made those two valid launch
 * shapes read/write the nested directory instead of the project root.  This
 * helper is deliberately filesystem-oriented and only depends on the local
 * diagnostic utility, so both hosts can use the same root contract without a
 * hook or package manager.
 *
 * Resolution order:
 *   1. An explicit absolute `CLAUDE_PROJECT_DIR` (invalid values are reported
 *      in the return metadata; an explicit directory without `.claude` is
 *      retained so bootstrap/no-op callers can still inspect that project).
 *   2. The nearest ancestor of `cwd` containing `.claude`.
 *   3. The nearest ancestor of the invoking script containing `.claude`.
 *   4. `cwd` as a compatibility fallback; downstream callers still validate
 *      the files they require and report a useful missing-root error.
 */

const fs = require('fs');
const path = require('path');
const { reportHookInternalError } = require('./debug-log.cjs');

function isDirectory(candidate) {
    try {
        return fs.statSync(path.join(candidate, '.claude')).isDirectory();
    } catch (error) {
        if (error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR') {
            reportHookInternalError('project-root', 'project marker probe failed', error);
        }
        return false;
    }
}

function absoluteDirectory(value) {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const trimmed = value.trim();
    if (!path.isAbsolute(trimmed)) return null;
    return path.resolve(trimmed);
}

function nearestProjectRoot(start) {
    const absoluteStart = absoluteDirectory(start);
    if (!absoluteStart) return null;
    let current = absoluteStart;
    while (true) {
        if (isDirectory(current)) return current;
        const parent = path.dirname(current);
        if (parent === current) return null;
        current = parent;
    }
}

/**
 * @param {object} [options]
 * @param {string} [options.cwd=process.cwd()]
 * @param {string} [options.scriptPath] absolute path to the invoked script
 * @param {object} [options.env=process.env]
 * @returns {{rootDir: string, source: string, error?: string}}
 */
function resolveProjectRoot({ cwd = process.cwd(), scriptPath, env = process.env } = {}) {
    const explicit = env && Object.prototype.hasOwnProperty.call(env, 'CLAUDE_PROJECT_DIR')
        ? env.CLAUDE_PROJECT_DIR
        : undefined;

    if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') {
        const explicitRoot = absoluteDirectory(String(explicit));
        if (!explicitRoot) {
            return {
                rootDir: path.resolve(cwd),
                source: 'invalid-env-fallback',
                error: 'CLAUDE_PROJECT_DIR must be an absolute path'
            };
        }
        if (!isDirectory(explicitRoot)) {
            return {
                rootDir: explicitRoot,
                source: 'invalid-env-root',
                error: 'CLAUDE_PROJECT_DIR does not contain a .claude directory'
            };
        }
        return { rootDir: explicitRoot, source: 'env' };
    }

    const fromCwd = nearestProjectRoot(cwd);
    if (fromCwd) return { rootDir: fromCwd, source: 'cwd-ancestor' };

    if (scriptPath) {
        const scriptDir = path.dirname(path.resolve(scriptPath));
        const fromScript = nearestProjectRoot(scriptDir);
        if (fromScript) return { rootDir: fromScript, source: 'script-ancestor' };
    }

    return { rootDir: path.resolve(cwd), source: 'cwd-fallback' };
}

module.exports = {
    isDirectory,
    nearestProjectRoot,
    resolveProjectRoot
};
