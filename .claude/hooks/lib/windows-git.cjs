#!/usr/bin/env node
'use strict';

/**
 * Windows-native Git/Git Bash capability resolver.
 *
 * This module is intentionally project-neutral and built only on Node built-ins.
 * It probes first, returns fixed outcomes, and never changes the parent process
 * environment. Optional repair is a detached child worker which re-probes and
 * owns the existing private OS-temp lock while running the fixed WinGet command.
 */

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const lockModule = require('./startup-install-lock.cjs');

const WIN32 = 'win32';
const WINGET_PACKAGE_ID = 'Git.Git';
const REPAIR_RESOURCE_KEY = 'ck-windows-git-capability-resource';
const PROBE_DEADLINE_MS = 5000;
const REPAIR_DEADLINE_MS = 120000;
const ANSI_SEQUENCE = /\u001B(?:\[[0-?]*[ -/]*[@-~|\][^\u0007\u001B]*(?:\u0007|\u001B\\)?|[@-Z\\-_])/g;
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;

const OUTCOMES = Object.freeze({
    READY: 'ready',
    SKIP_NOT_WINDOWS: 'skip-not-windows',
    SKIP_NOT_STARTUP: 'skip-not-startup',
    SKIP_DISABLED: 'skip-windows-git-disabled',
    SKIP_CONFIG_INVALID: 'skip-windows-git-config-invalid',
    REPAIR_NEEDED: 'repair-needed',
    REPAIR_STARTED: 'repair-started',
    REPAIR_IN_PROGRESS: 'repair-in-progress',
    SKIP_WINGET_UNAVAILABLE: 'skip-winget-unavailable',
    SKIP_REPAIR_UNAVAILABLE: 'skip-windows-git-repair-unavailable',
    REPAIR_WORKER_NOOP: 'noop-windows-git-worker',
    REPAIR_WORKER_FAILED: 'windows-git-worker-failed'
});

const REPAIR_ARGS = Object.freeze([
    'install',
    '--id',
    WINGET_PACKAGE_ID,
    '--exact',
    '--source',
    'winget',
    '--silent',
    '--disable-interactivity',
    '--accept-source-agreements',
    '--accept-package-agreements'
]);
const REPAIR_KINDS = Object.freeze(['missing', 'broken', 'incomplete']);

function sanitizeToken(value, maxLength = 240) {
    return String(value || '')
        .replace(ANSI_SEQUENCE, '')
        .replace(CONTROL_CHARS, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function isWindows(platform) {
    return platform === WIN32;
}

function isAbsoluteWindowsPath(value) {
    return typeof value === 'string' && /^[A-Za-z]:\\/.test(value) && !/[\r\n\u0000]/.test(value);
}

function normalizeWindowsPath(value) {
    return path.win32.normalize(value);
}

function pathInside(root, candidate) {
    const relative = path.win32.relative(root, candidate);
    return relative === '' || (!relative.startsWith('..') && !path.win32.isAbsolute(relative));
}

function dedupePaths(values) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        if (!isAbsoluteWindowsPath(value)) continue;
        const normalized = normalizeWindowsPath(value);
        const key = normalized.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(normalized);
    }
    return result;
}

function systemRoot(env) {
    const candidate = env && typeof env.SystemRoot === 'string' ? env.SystemRoot.trim() : '';
    return isAbsoluteWindowsPath(candidate) ? normalizeWindowsPath(candidate) : 'C:\\Windows';
}

function absoluteSystemBinary(env, ...parts) {
    return path.win32.join(systemRoot(env), 'System32', ...parts);
}

function defaultEnv() {
    return Object.assign({}, process.env);
}

function defaultLstat(target) {
    return fs.lstatSync(target);
}

function defaultRealpath(target) {
    return fs.realpathSync(target);
}

function defaultReaddir(target) {
    return fs.readdirSync(target, { withFileTypes: true });
}

function canonicalDirectory(seams, candidate) {
    if (!isAbsoluteWindowsPath(candidate)) return null;
    let info;
    try {
        info = seams.lstat(candidate);
        if (!info.isDirectory() || info.isSymbolicLink()) return null;
        const resolved = seams.realpath(candidate);
        if (!isAbsoluteWindowsPath(resolved)) return null;
        return normalizeWindowsPath(resolved);
    } catch {
        return null;
    }
}

function canonicalFile(seams, candidate) {
    if (!isAbsoluteWindowsPath(candidate)) return null;
    try {
        const info = seams.lstat(candidate);
        if (!info.isFile() || info.isSymbolicLink()) return null;
        const resolved = seams.realpath(candidate);
        if (!isAbsoluteWindowsPath(resolved)) return null;
        return normalizeWindowsPath(resolved);
    } catch {
        return null;
    }
}

function candidateGitRoots(env) {
    const roots = [];
    const add = value => {
        if (!isAbsoluteWindowsPath(value)) return;
        let normalized = normalizeWindowsPath(value);
        const base = path.win32.basename(normalized).toLowerCase();
        if (base === 'cmd' || base === 'bin') normalized = path.win32.dirname(normalized);
        if (path.win32.basename(normalized).toLowerCase() === 'git') roots.push(normalized);
    };

    add(env && env.ProgramFiles ? path.win32.join(env.ProgramFiles, 'Git') : '');
    add(env && env['ProgramFiles(x86)'] ? path.win32.join(env['ProgramFiles(x86)'], 'Git') : '');
    add(env && env.LOCALAPPDATA ? path.win32.join(env.LOCALAPPDATA, 'Programs', 'Git') : '');

    const pathValue = env && (env.Path || env.PATH || env.path);
    if (typeof pathValue === 'string') {
        for (const entry of pathValue.split(';')) add(entry.trim());
    }
    return dedupePaths(roots);
}

function filesForGitRoot(root) {
    return {
        git: [path.win32.join(root, 'cmd', 'git.exe'), path.win32.join(root, 'bin', 'git.exe')],
        gitBash: [path.win32.join(root, 'git-bash.exe')],
        bash: [path.win32.join(root, 'usr', 'bin', 'bash.exe'), path.win32.join(root, 'bin', 'bash.exe')]
    };
}

function defaultReadGitVersion({ execPath, root, env }) {
    try {
        const result = spawnSync(execPath, ['--version'], {
            cwd: root,
            env,
            encoding: 'utf8',
            shell: false,
            windowsHide: true,
            timeout: PROBE_DEADLINE_MS
        });
        if (!result || result.status !== 0) return null;
        const match = /^git version (\d+\.\d+\.\d+(?:[.-][A-Za-z0-9.]+)*)/i.exec(String(result.stdout || '').trim());
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

function defaultProbeBash({ execPath, root, env }) {
    try {
        const result = spawnSync(execPath, ['--noprofile', '--norc', '-c', 'exit 0'], {
            cwd: root,
            env,
            encoding: 'utf8',
            shell: false,
            windowsHide: true,
            timeout: PROBE_DEADLINE_MS
        });
        return Boolean(result && result.status === 0);
    } catch {
        return false;
    }
}

function makeCapability({ root, gitExe, gitBashExe, bashExe, version }) {
    const gitBin = path.win32.dirname(gitExe);
    const bashBin = path.win32.dirname(bashExe);
    const pathPrefix = dedupePaths([gitBin, bashBin, path.win32.join(root, 'bin')]);
    return {
        root,
        gitExe,
        gitBashExe,
        bashExe,
        gitBashPath: bashBin,
        version: sanitizeToken(version, 64),
        pathPrefix
    };
}

function defaultResolveGit({ seams, env }) {
    let sawGit = false;
    let sawBash = false;
    let sawInvalidVersion = false;

    for (const rootCandidate of candidateGitRoots(env)) {
        const root = canonicalDirectory(seams, rootCandidate);
        if (!root) continue;
        const files = filesForGitRoot(root);
        const gitExe = files.git.map(candidate => canonicalFile(seams, candidate)).find(Boolean);
        const gitBashExe = files.gitBash.map(candidate => canonicalFile(seams, candidate)).find(Boolean);
        const bashExe = files.bash.map(candidate => canonicalFile(seams, candidate)).find(Boolean);
        sawGit = sawGit || Boolean(gitExe);
        sawBash = sawBash || Boolean(gitBashExe && bashExe);
        if (!gitExe || !gitBashExe || !bashExe) continue;
        if (![gitExe, gitBashExe, bashExe].every(candidate => pathInside(root, candidate))) continue;

        const version = seams.readGitVersion({ execPath: gitExe, root, env });
        if (!version) {
            sawInvalidVersion = true;
            continue;
        }
        if (!seams.probeBash({ execPath: bashExe, root, env })) {
            sawInvalidVersion = true;
            continue;
        }
        return { state: 'ready', capability: makeCapability({ root, gitExe, gitBashExe, bashExe, version }) };
    }

    return {
        state: sawInvalidVersion ? 'broken' : sawGit || sawBash ? 'incomplete' : 'missing',
        reason: sawInvalidVersion ? 'probe-failed' : sawGit || sawBash ? 'native-components-incomplete' : 'not-found'
    };
}

function validateCapability(capability) {
    if (!capability || typeof capability !== 'object') return null;
    const fields = ['root', 'gitExe', 'gitBashExe', 'bashExe', 'gitBashPath'];
    if (!fields.every(field => isAbsoluteWindowsPath(capability[field]))) return null;
    if (!Array.isArray(capability.pathPrefix) || capability.pathPrefix.length === 0 || !capability.pathPrefix.every(isAbsoluteWindowsPath)) return null;
    const root = normalizeWindowsPath(capability.root);
    const gitExe = normalizeWindowsPath(capability.gitExe);
    const gitBashExe = normalizeWindowsPath(capability.gitBashExe);
    const bashExe = normalizeWindowsPath(capability.bashExe);
    const gitBashPath = normalizeWindowsPath(capability.gitBashPath);
    if (
        ![gitExe, gitBashExe, bashExe, gitBashPath].every(candidate => pathInside(root, candidate)) ||
        !capability.pathPrefix.every(candidate => pathInside(root, normalizeWindowsPath(candidate))) ||
        path.win32.dirname(bashExe).toLowerCase() !== gitBashPath.toLowerCase()
    ) return null;
    const pathPrefix = dedupePaths(capability.pathPrefix);
    if (pathPrefix.length === 0) return null;
    return {
        root,
        gitExe,
        gitBashExe,
        bashExe,
        gitBashPath,
        version: sanitizeToken(capability.version, 64),
        pathPrefix
    };
}

function defaultTrustedWingetCandidates(env, seams) {
    const candidates = [];
    if (env && isAbsoluteWindowsPath(env.LOCALAPPDATA)) {
        candidates.push(path.win32.join(env.LOCALAPPDATA, 'Microsoft', 'WindowsApps', 'winget.exe'));
    }
    if (env && isAbsoluteWindowsPath(env.ProgramFiles)) {
        const windowsApps = path.win32.join(env.ProgramFiles, 'WindowsApps');
        candidates.push(path.win32.join(windowsApps, 'winget.exe'));
        try {
            for (const entry of seams.readdir(windowsApps)) {
                if (entry.isDirectory() && /^Microsoft\.DesktopAppInstaller_/i.test(entry.name)) {
                    candidates.push(path.win32.join(windowsApps, entry.name, 'winget.exe'));
                }
            }
        } catch {
            // Missing/inaccessible App Installer is a fixed unavailable outcome.
        }
    }
    return dedupePaths(candidates);
}

function trustedWingetFile(seams, candidate, env) {
    if (!isAbsoluteWindowsPath(candidate)) return null;
    const normalized = normalizeWindowsPath(candidate);
    const lower = normalized.toLowerCase();
    const localRoot = isAbsoluteWindowsPath(env.LOCALAPPDATA)
        ? path.win32.join(env.LOCALAPPDATA, 'Microsoft', 'WindowsApps').toLowerCase()
        : '';
    const programRoot = isAbsoluteWindowsPath(env.ProgramFiles)
        ? path.win32.join(env.ProgramFiles, 'WindowsApps').toLowerCase()
        : '';
    if (!lower.startsWith(localRoot + '\\') && !lower.startsWith(programRoot + '\\')) return null;
    try {
        const info = seams.lstat(normalized);
        // The user WindowsApps App Execution Alias is a trusted, system-managed
        // reparse entry and may not have a readable realpath from Node. Accept
        // that fixed alias path only inside the trusted WindowsApps roots.
        if (!info.isFile() && !info.isSymbolicLink()) return null;
        if (info.isSymbolicLink()) return normalized;
        const resolved = seams.realpath(normalized);
        return isAbsoluteWindowsPath(resolved) ? normalizeWindowsPath(resolved) : null;
    } catch {
        return null;
    }
}

function defaultResolveWinget({ seams, env }) {
    for (const candidate of defaultTrustedWingetCandidates(env, seams)) {
        const executable = trustedWingetFile(seams, candidate, env);
        if (!executable) continue;
        const lower = executable.toLowerCase();
        const localRoot = isAbsoluteWindowsPath(env.LOCALAPPDATA)
            ? path.win32.join(env.LOCALAPPDATA, 'Microsoft', 'WindowsApps').toLowerCase()
            : '';
        const programRoot = isAbsoluteWindowsPath(env.ProgramFiles)
            ? path.win32.join(env.ProgramFiles, 'WindowsApps').toLowerCase()
            : '';
        if (!lower.startsWith(localRoot + '\\') && !lower.startsWith(programRoot + '\\')) continue;
        try {
            const result = spawnSync(executable, ['--info'], {
                env,
                encoding: 'utf8',
                shell: false,
                windowsHide: true,
                timeout: PROBE_DEADLINE_MS
            });
            if (result && result.status === 0) return executable;
        } catch {
            // Try the next trusted candidate; never expose command output.
        }
    }
    return null;
}

function buildRepairPlan(wingetPath, broken) {
    if (!isAbsoluteWindowsPath(wingetPath)) return null;
    const args = [...REPAIR_ARGS];
    if (broken) args.push('--force');
    return { command: normalizeWindowsPath(wingetPath), args };
}

function defaultSpawnRepairWorker({ kind }) {
    if (!REPAIR_KINDS.includes(kind) || !isAbsoluteWindowsPath(process.execPath)) return { ok: false };
    try {
        const child = spawn(process.execPath, [__filename, '--repair-worker', kind], {
            detached: true,
            stdio: 'ignore',
            shell: false,
            windowsHide: true
        });
        if (!child || typeof child.pid !== 'number') return { ok: false };
        child.unref();
        return { ok: true, pid: child.pid };
    } catch {
        return { ok: false };
    }
}

function defaultRunRepair(plan, { publishGroup, env }) {
    return new Promise(resolve => {
        let child;
        try {
            child = spawn(plan.command, plan.args, {
                env,
                stdio: 'ignore',
                shell: false,
                detached: false,
                windowsHide: true
            });
        } catch {
            resolve({ outcome: OUTCOMES.REPAIR_WORKER_FAILED });
            return;
        }
        if (!child || typeof child.pid !== 'number') {
            resolve({ outcome: OUTCOMES.REPAIR_WORKER_FAILED });
            return;
        }
        publishGroup({ kind: 'pid', id: child.pid });
        let settled = false;
        const finish = outcome => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({ outcome });
        };
        const timer = setTimeout(() => finish(OUTCOMES.REPAIR_WORKER_FAILED), REPAIR_DEADLINE_MS);
        if (typeof timer.unref === 'function') timer.unref();
        child.on('error', () => finish(OUTCOMES.REPAIR_WORKER_FAILED));
        child.on('close', code => finish(code === 0 ? OUTCOMES.REPAIR_WORKER_NOOP : OUTCOMES.REPAIR_WORKER_FAILED));
    });
}

function resolveWindowsGit(options = {}) {
    const seams = createSeams(options.seams);
    const platform = seams.platform();
    if (!isWindows(platform)) return { outcome: OUTCOMES.SKIP_NOT_WINDOWS, capability: null };
    try {
        const result = seams.resolveGit({ seams, env: seams.env() });
        const capability = result && result.state === 'ready' ? validateCapability(result.capability) : null;
        if (capability) return { outcome: OUTCOMES.READY, capability };
        return { outcome: OUTCOMES.REPAIR_NEEDED, capability: null, kind: result && result.state === 'broken' ? 'broken' : result && result.state === 'incomplete' ? 'incomplete' : 'missing', reason: sanitizeToken(result && result.reason, 64) };
    } catch {
        return { outcome: OUTCOMES.REPAIR_NEEDED, capability: null, kind: 'broken', reason: 'probe-failed' };
    }
}

function resolvePolicy(configStatus) {
    if (configStatus && configStatus.state === 'invalid') {
        return { valid: false, enabled: false, autoRepair: false };
    }
    const config = (configStatus && configStatus.config) || {};
    const section = config.hooks && config.hooks.windowsGit;
    if (section === undefined) return { valid: true, enabled: true, autoRepair: true };
    if (!section || typeof section !== 'object' || Array.isArray(section)) return { valid: false, enabled: false, autoRepair: false };
    if (section.enabled !== undefined && typeof section.enabled !== 'boolean') return { valid: false, enabled: false, autoRepair: false };
    if (section.autoRepair !== undefined && typeof section.autoRepair !== 'boolean') return { valid: false, enabled: false, autoRepair: false };
    return { valid: true, enabled: section.enabled !== false, autoRepair: section.autoRepair !== false };
}

function ensureWindowsGit(options = {}) {
    const seams = createSeams(options.seams);
    const platform = seams.platform();
    if (!isWindows(platform)) return { outcome: OUTCOMES.SKIP_NOT_WINDOWS, capability: null };

    // Probe first even when policy disables integration or repair. The policy
    // controls side effects, not whether the machine capability can be
    // observed; this keeps disabled/invalid configurations fail-closed without
    // turning them into a silent probe bypass.
    const current = resolveWindowsGit({ seams });
    const policy = resolvePolicy(options.configStatus);
    if (!policy.valid) return { outcome: OUTCOMES.SKIP_CONFIG_INVALID, capability: null };
    if (!policy.enabled) return { outcome: OUTCOMES.SKIP_DISABLED, capability: null };

    if (current.outcome === OUTCOMES.READY) return current;
    if (options.source !== 'startup') return { outcome: OUTCOMES.SKIP_NOT_STARTUP, capability: null, kind: current.kind };
    if (!policy.autoRepair) return current;

    let wingetPath;
    try {
        wingetPath = seams.resolveWinget({ seams, env: seams.env() });
    } catch {
        wingetPath = null;
    }
    if (!wingetPath) return { outcome: OUTCOMES.SKIP_WINGET_UNAVAILABLE, capability: null, kind: current.kind };

    let worker;
    try {
        worker = seams.spawnRepairWorker({ kind: current.kind, wingetPath });
    } catch {
        worker = null;
    }
    if (!worker || worker.ok !== true) return { outcome: OUTCOMES.SKIP_REPAIR_UNAVAILABLE, capability: null, kind: current.kind };
    return { outcome: OUTCOMES.REPAIR_STARTED, capability: null, kind: current.kind };
}

function withGitEnvironment(env, capability) {
    const safe = validateCapability(capability);
    const result = Object.assign({}, env || {});
    if (!safe) return result;

    const pathKey = Object.keys(result).find(key => key.toLowerCase() === 'path') || 'PATH';
    const existing = typeof result[pathKey] === 'string' ? result[pathKey] : '';
    const entries = [];
    const seen = new Set();
    for (const entry of [...safe.pathPrefix, ...existing.split(';')]) {
        const value = String(entry || '').trim();
        if (!value) continue;
        const key = isAbsoluteWindowsPath(value) ? normalizeWindowsPath(value).toLowerCase() : value.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push(value);
    }
    result[pathKey] = entries.join(';');
    result.CK_GIT_EXE = safe.gitExe;
    result.CK_GIT_BASH_EXE = safe.gitBashExe;
    result.CK_GIT_BASH_PATH = safe.gitBashPath;
    return result;
}

function shellEscape(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
}

function defaultPublishEnvironment({ envFile, capability }) {
    const safe = validateCapability(capability);
    if (!safe || typeof envFile !== 'string' || !envFile.trim()) return { ok: false };
    const prefix = safe.pathPrefix.map(shellEscape).join(':');
    const lines = [
        `export CK_GIT_EXE="${shellEscape(safe.gitExe)}"\n`,
        `export CK_GIT_BASH_EXE="${shellEscape(safe.gitBashExe)}"\n`,
        `export CK_GIT_BASH_PATH="${shellEscape(safe.gitBashPath)}"\n`,
        `export PATH="${prefix}:$PATH"\n`
    ];
    try {
        fs.appendFileSync(envFile, lines.join(''), { encoding: 'utf8' });
        return { ok: true };
    } catch {
        return { ok: false };
    }
}

function createSeams(overrides) {
    return Object.assign({}, DEFAULT_SEAMS, overrides || {});
}

const DEFAULT_SEAMS = Object.freeze({
    platform: () => process.platform,
    env: defaultEnv,
    lstat: defaultLstat,
    realpath: defaultRealpath,
    readdir: defaultReaddir,
    resolveGit: defaultResolveGit,
    readGitVersion: defaultReadGitVersion,
    probeBash: defaultProbeBash,
    resolveWinget: defaultResolveWinget,
    spawnRepairWorker: defaultSpawnRepairWorker,
    runRepair: defaultRunRepair,
    publishEnvironment: defaultPublishEnvironment,
    lock: lockModule
});

async function runRepairWorker(options = {}) {
    const seams = createSeams(options.seams);
    if (!isWindows(seams.platform())) return { outcome: OUTCOMES.SKIP_NOT_WINDOWS };
    if (!REPAIR_KINDS.includes(options.kind)) return { outcome: OUTCOMES.REPAIR_WORKER_FAILED };
    let initial;
    try {
        initial = resolveWindowsGit({ seams });
    } catch {
        return { outcome: OUTCOMES.REPAIR_WORKER_FAILED };
    }
    if (initial.outcome === OUTCOMES.READY) return { outcome: OUTCOMES.REPAIR_WORKER_NOOP };
    const env = seams.env();
    let wingetPath;
    try {
        wingetPath = seams.resolveWinget({ seams, env });
    } catch {
        wingetPath = null;
    }
    if (!wingetPath) return { outcome: OUTCOMES.SKIP_WINGET_UNAVAILABLE };
    const plan = buildRepairPlan(wingetPath, initial.kind === 'broken');
    if (!plan) return { outcome: OUTCOMES.SKIP_REPAIR_UNAVAILABLE };

    try {
        const held = await seams.lock.withProjectLock({
            canonicalRoot: REPAIR_RESOURCE_KEY,
            seams: options.lockSeams,
            recheck: () => resolveWindowsGit({ seams }).outcome === OUTCOMES.READY,
            run: ({ publishGroup }) => seams.runRepair(plan, { publishGroup, env })
        });
        return held && held.outcome ? held : { outcome: OUTCOMES.REPAIR_WORKER_FAILED };
    } catch {
        return { outcome: OUTCOMES.REPAIR_WORKER_FAILED };
    }
}

function formatDiagnostic(result) {
    if (!result || !result.outcome) return null;
    switch (result.outcome) {
        case OUTCOMES.REPAIR_STARTED:
            return '[windows-git] native Git/Git Bash missing or invalid; a bounded background repair was started.';
        case OUTCOMES.SKIP_WINGET_UNAVAILABLE:
            return '[windows-git] native Git/Git Bash is unavailable and WinGet could not be validated; no repair was started.';
        case OUTCOMES.SKIP_REPAIR_UNAVAILABLE:
            return '[windows-git] native Git/Git Bash repair could not be started; no host environment was changed.';
        case OUTCOMES.SKIP_CONFIG_INVALID:
            return '[windows-git] project config is invalid; Git repair was skipped (integrity verification still ran).';
        default:
            return null;
    }
}

if (require.main === module && process.argv[2] === '--repair-worker') {
    const kind = process.argv[3];
    runRepairWorker({ kind }).catch(() => {
        // Detached repair is advisory; never emit installer/module output.
    });
}

module.exports = {
    OUTCOMES,
    WINGET_PACKAGE_ID,
    REPAIR_RESOURCE_KEY,
    PROBE_DEADLINE_MS,
    REPAIR_DEADLINE_MS,
    REPAIR_ARGS,
    DEFAULT_SEAMS,
    createSeams,
    candidateGitRoots,
    filesForGitRoot,
    buildRepairPlan,
    resolvePolicy,
    resolveWindowsGit,
    ensureWindowsGit,
    withGitEnvironment,
    defaultPublishEnvironment,
    runRepairWorker,
    formatDiagnostic
};
