#!/usr/bin/env node
'use strict';
/**
 * Startup dependency installation — request builder and lock-protected runner.
 *
 * WHAT THIS IS
 *   The behaviour half of the single registered SessionStart owner
 *   (`.claude/hooks/verify-install.cjs`). That hook proves the `.claude` copy is
 *   complete FIRST and only then requires this module, because a partial copy is
 *   exactly the state in which this file may be missing.
 *
 * WHAT IT WILL AND WILL NOT DO
 *   It runs ONE package-manager install, with a fixed argv chosen from the
 *   support matrix below, only when every one of these holds: the source is
 *   `startup`, installation is enabled, a root manifest declares dependencies,
 *   at least one of them is provably missing, every manager signal agrees, the
 *   executable is a preinstalled binary resolved OUTSIDE the adopter root, its
 *   version matches a supported row, no project-loaded manager extension is
 *   configured, a fixed lifecycle-suppression argument exists (or the project
 *   explicitly opted in), the platform launch is provably safe, and the
 *   per-project lock is held.
 *
 *   It NEVER: builds a command from configuration or manifest text, runs an
 *   arbitrary manager argument, downloads or bootstraps a manager through
 *   Corepack, executes a project PnP loader, or echoes raw manifest/config/
 *   manager output or an unescaped path.
 *
 * PORTABILITY
 *   Nothing here names a specific project. Project facts arrive as the resolved
 *   root plus the optional `hooks.startupInstall` config section.
 *
 * ── INJECTION SEAMS ────────────────────────────────────────────────────────────
 * `createSeams(overrides)` returns the seam object every exported function takes
 * as `options.seams`. Tests override any subset; process-level effects are
 * reachable only through these. Seam contract:
 *
 *   now()                                 -> epoch ms (clock)
 *   exists(p)                             -> boolean
 *   readFile(p)                           -> utf8 text, throws ENOENT
 *   realpath(p)                           -> canonical path, throws
 *   platform()                            -> 'win32' | posix name
 *   env()                                 -> the inherited environment object
 *   resolveExecutable({managerId, projectRoot, env, platform})
 *                                         -> { ok:true, execPath, viaCorepack }
 *                                          | { ok:false, code }
 *   readManagerVersion({managerId, execPath, viaCorepack, env, platform})
 *                                         -> { ok:true, version } | { ok:false, code }
 *   spawnManager(plan, { publishGroup })  -> Promise<{ outcome, exitCode?, timedOut? }>
 *                                            publishGroup({kind,id}) must be called
 *                                            as soon as the tree handle exists
 *   lock                                  -> the startup-install-lock module API
 * ───────────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const lockModule = require('./startup-install-lock.cjs');

// ── Fixed contract constants ──────────────────────────────────────────────────
const MANAGER_DEADLINE_MS = 120000; // D-06: exactly 120 s for the manager itself
const SUPPORTED_MANAGERS = Object.freeze(['npm', 'pnpm', 'yarn', 'bun']);
const SUPPORTED_PLATFORMS = Object.freeze(['win32', 'linux', 'darwin']);
const MANAGER_METADATA_GRAMMAR = /^(npm|pnpm|yarn|bun)(?:@\d+\.\d+\.\d+)?$/;
const STARTUP_INSTALL_TRUST_ENV = 'CK_STARTUP_INSTALL_TRUST';

// These variables can carry registry credentials directly or point a manager at
// a credential-bearing user config. Without the host trust grant they must not
// cross into an automatic install child. The suffix rule also covers npm's
// registry-key-shaped names such as NPM_CONFIG_//REGISTRY/:_AUTHTOKEN.
const REGISTRY_CREDENTIAL_ENV = /^(?:NPM_TOKEN|NODE_AUTH_TOKEN|YARN_NPM_AUTH_TOKEN|BUN_AUTH_TOKEN|NPM_CONFIG_USERCONFIG|NPM_CONFIG_GLOBALCONFIG|NPM_CONFIG_.*(?:AUTH|TOKEN|PASSWORD|PASSWD|SECRET|CREDENTIAL|API[_-]?KEY)|YARN_NPM_.*(?:AUTH|TOKEN|PASSWORD|PASSWD|SECRET|CREDENTIAL)|BUN_.*(?:AUTH|TOKEN|PASSWORD|PASSWD|SECRET|CREDENTIAL)|.*(?:TOKEN|PASSWORD|PASSWD|SECRET|CREDENTIAL|API[_-]?KEY|AUTHTOKEN))$/i;

/**
 * Fixed outcome vocabulary. Every diagnostic is built from one of these codes
 * plus, at most, an allowlisted manager id and a `\d+.\d+.\d+` version — never
 * from a path, a config value, a manifest value, or manager output.
 */
const OUTCOMES = Object.freeze({
    INSTALLED: 'ok-installed',
    // lifecycle / configuration gates
    SKIP_NOT_STARTUP: 'skip-not-startup',
    SKIP_INTEGRITY_INCOMPLETE: 'skip-integrity-incomplete',
    SKIP_DISABLED: 'skip-disabled',
    SKIP_CONFIG_INVALID: 'skip-config-invalid',
    SKIP_CONFIG_UNAVAILABLE: 'skip-config-unavailable',
    // manifest / completeness
    NOOP_NO_MANIFEST: 'noop-no-manifest',
    SKIP_MANIFEST_UNREADABLE: 'skip-manifest-unreadable',
    NOOP_NO_DEPENDENCIES: 'noop-no-dependencies',
    NOOP_DEPENDENCIES_PRESENT: 'noop-dependencies-present',
    // manager selection
    SKIP_MANAGER_CONFLICT: 'skip-manager-conflict',
    SKIP_MANAGER_METADATA_INVALID: 'skip-manager-metadata-invalid',
    SKIP_LOCKFILE_AMBIGUOUS: 'skip-lockfile-ambiguous',
    SKIP_LOCKFILE_UNSUPPORTED: 'skip-lockfile-unsupported',
    // executable trust
    SKIP_MANAGER_NOT_FOUND: 'skip-manager-not-found',
    SKIP_MANAGER_UNTRUSTED_PATH: 'skip-manager-untrusted-path',
    SKIP_MANAGER_VERSION_UNREADABLE: 'skip-manager-version-unreadable',
    SKIP_MANAGER_VERSION_UNSUPPORTED: 'skip-manager-version-unsupported',
    SKIP_MANAGER_VERSION_PIN_MISMATCH: 'skip-manager-version-pin-mismatch',
    SKIP_UNSUPPORTED_PLATFORM: 'skip-unsupported-platform',
    SKIP_COREPACK_SHIM: 'skip-corepack-shim',
    SKIP_COREPACK_CACHE_MISS: 'skip-corepack-cache-miss',
    // policy gates
    SKIP_PROJECT_EXTENSION: 'skip-project-extension',
    SKIP_LIFECYCLE_SUPPRESSION_UNAVAILABLE: 'skip-lifecycle-suppression-unavailable',
    SKIP_UNSAFE_LAUNCH: 'skip-unsafe-launch',
    // Yarn PnP static boundary
    SKIP_PNP_INCONCLUSIVE: 'skip-pnp-inconclusive',
    SKIP_PNP_UNSUPPORTED: 'skip-pnp-unsupported',
    // execution results
    INSTALL_FAILED: 'install-failed',
    INSTALL_TIMEOUT: 'install-timeout',
    // lock outcomes are re-exported so callers match against one vocabulary
    SKIP_LOCK_IN_PROGRESS: lockModule.LOCK_OUTCOMES.IN_PROGRESS,
    SKIP_LOCK_OWNERSHIP_UNVERIFIABLE: lockModule.LOCK_OUTCOMES.OWNERSHIP_UNVERIFIABLE,
    SKIP_LOCK_UNSAFE_TEMP_PARENT: lockModule.LOCK_OUTCOMES.UNSAFE_TEMP_PARENT,
    SKIP_LOCK_UNSAFE_CHILD: lockModule.LOCK_OUTCOMES.UNSAFE_LOCK_CHILD,
    SKIP_LOCK_PRIVACY_UNPROVABLE: lockModule.LOCK_OUTCOMES.PRIVACY_UNPROVABLE,
    SKIP_LOCK_UNAVAILABLE: lockModule.LOCK_OUTCOMES.UNAVAILABLE,
    NOOP_REPAIRED_BY_PEER: lockModule.LOCK_OUTCOMES.REPAIRED_BY_PEER,
    LOCK_RETAINED_CLEANUP_UNPROVEN: lockModule.LOCK_OUTCOMES.RETAINED_CLEANUP_UNPROVEN
});

/** Outcomes the user is told about. Everything else is a silent, correct no-op. */
const REPORTED_OUTCOMES = Object.freeze(
    new Set([
        OUTCOMES.INSTALLED,
        OUTCOMES.INSTALL_FAILED,
        OUTCOMES.INSTALL_TIMEOUT,
        OUTCOMES.SKIP_LOCK_IN_PROGRESS,
        OUTCOMES.LOCK_RETAINED_CLEANUP_UNPROVEN,
        OUTCOMES.SKIP_LOCK_OWNERSHIP_UNVERIFIABLE,
        OUTCOMES.SKIP_CONFIG_INVALID,
        OUTCOMES.SKIP_CONFIG_UNAVAILABLE,
        OUTCOMES.SKIP_MANAGER_CONFLICT,
        OUTCOMES.SKIP_MANAGER_METADATA_INVALID,
        OUTCOMES.SKIP_LOCKFILE_AMBIGUOUS,
        OUTCOMES.SKIP_LOCKFILE_UNSUPPORTED,
        OUTCOMES.SKIP_MANAGER_VERSION_UNSUPPORTED,
        OUTCOMES.SKIP_MANAGER_VERSION_PIN_MISMATCH,
        OUTCOMES.SKIP_UNSUPPORTED_PLATFORM,
        OUTCOMES.SKIP_COREPACK_SHIM,
        OUTCOMES.SKIP_COREPACK_CACHE_MISS,
        OUTCOMES.SKIP_PROJECT_EXTENSION,
        OUTCOMES.SKIP_UNSAFE_LAUNCH,
        OUTCOMES.SKIP_MANAGER_UNTRUSTED_PATH
    ])
);

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════════

// CSI/OSC/other escape sequences, then every remaining C0/C1 control incl. CR/LF.
const ANSI_SEQUENCE = /\u001B(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007\u001B]*(?:\u0007|\u001B\\)?|[@-Z\\-_])/g;
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;

/**
 * Reduce any value to a single-line, control-free, bounded token. Used ONLY for
 * values that have already been matched against a fixed allowlist; it is the
 * last line of defence, never the first.
 */
function sanitizeToken(value, maxLength = 80) {
    if (value === undefined || value === null) return '';
    return String(value)
        .replace(ANSI_SEQUENCE, '')
        .replace(CONTROL_CHARS, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

/** Manager ids only ever leave this module through the fixed allowlist. */
function safeManagerId(value) {
    return SUPPORTED_MANAGERS.includes(value) ? value : 'package-manager';
}

/** Versions only ever leave this module as a bare dotted triple. */
function safeVersion(value) {
    const match = /^(\d{1,4}\.\d{1,4}\.\d{1,8})/.exec(sanitizeToken(value, 32));
    return match ? match[1] : '';
}

/**
 * One-line, fixed-vocabulary diagnostic, or null when the outcome is a silent
 * no-op. No path, no config value, no manager output ever reaches this string.
 */
function formatDiagnostic(result) {
    if (!result || !REPORTED_OUTCOMES.has(result.outcome)) return null;
    const manager = safeManagerId(result.manager);
    const version = safeVersion(result.version);
    const who = version ? `${manager} ${version}` : manager;
    switch (result.outcome) {
        case OUTCOMES.INSTALLED:
            return `[startup-install] ${who}: dependencies installed.`;
        case OUTCOMES.INSTALL_FAILED:
            return `[startup-install] ${who}: install failed (exit ${Number(result.exitCode) || 'unknown'}). Run the install manually to see its output.`;
        case OUTCOMES.INSTALL_TIMEOUT:
            return `[startup-install] ${who}: install exceeded ${MANAGER_DEADLINE_MS / 1000}s and was stopped.`;
        case OUTCOMES.SKIP_LOCK_IN_PROGRESS:
            return '[startup-install] install already in progress for this project — skipped; a later session may retry.';
        case OUTCOMES.SKIP_LOCK_OWNERSHIP_UNVERIFIABLE:
            return '[startup-install] install lock ownership cannot be verified — skipped; the lock is retained.';
        case OUTCOMES.LOCK_RETAINED_CLEANUP_UNPROVEN:
            return '[startup-install] a previous install process could not be confirmed stopped; the lock is retained and no new install will start until it is.';
        case OUTCOMES.SKIP_CONFIG_INVALID:
            return '[startup-install] project config is invalid — installation skipped (integrity checks still ran).';
        case OUTCOMES.SKIP_CONFIG_UNAVAILABLE:
            return '[startup-install] project config could not be loaded — installation skipped (integrity checks still ran).';
        default:
            return `[startup-install] skipped: ${sanitizeToken(result.outcome, 48)}.`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATH HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function isInside(root, candidate) {
    const rel = path.relative(root, candidate);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function canonical(seams, target) {
    try {
        return seams.realpath(target);
    } catch {
        return path.resolve(target);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPORT MATRIX — the only commands this hook may ever run
// ═══════════════════════════════════════════════════════════════════════════════
//
// Each row owns: the version predicate, which lockfiles it recognizes, how it
// classifies the lockfile state, and the EXACT argv for locked/lockless under
// both lifecycle settings. `suppression` is the fixed argument that suppresses
// lifecycle scripts; a row whose suppression is null cannot be run with the
// default policy at all and skips. Nothing outside this table is executable.

/** Lockfile basename -> owning manager. Drives both selection and conflict. */
const LOCKFILE_OWNERS = Object.freeze({
    'package-lock.json': 'npm',
    'npm-shrinkwrap.json': 'npm',
    'pnpm-lock.yaml': 'pnpm',
    'yarn.lock': 'yarn',
    'bun.lock': 'bun',
    'bun.lockb': 'bun'
});

function npmLockState(present) {
    const hasLock = present.has('package-lock.json');
    const hasShrinkwrap = present.has('npm-shrinkwrap.json');
    if (hasLock && hasShrinkwrap) return { skip: OUTCOMES.SKIP_LOCKFILE_AMBIGUOUS };
    if (hasLock || hasShrinkwrap) return { mode: 'locked' };
    return { mode: 'lockless' };
}

function npm12LockState(present) {
    const hasLock = present.has('package-lock.json');
    const hasShrinkwrap = present.has('npm-shrinkwrap.json');
    if (hasLock && hasShrinkwrap) return { skip: OUTCOMES.SKIP_LOCKFILE_AMBIGUOUS };
    if (hasLock) return { mode: 'locked' };
    // Shrinkwrap-only is a PRESENT but UNSUPPORTED lockfile on npm 12. It must
    // never be reinterpreted as lockless — that would silently rewrite the
    // dependency graph the project pinned.
    if (hasShrinkwrap) return { skip: OUTCOMES.SKIP_LOCKFILE_UNSUPPORTED };
    return { mode: 'lockless' };
}

function singleLockState(name) {
    return (present) => (present.has(name) ? { mode: 'locked' } : { mode: 'lockless' });
}

function bunLockState(present) {
    if (present.has('bun.lock')) return { mode: 'locked' };
    // Bun 1.2 reads the TEXT lockfile; the legacy binary one is unsupported here.
    if (present.has('bun.lockb')) return { skip: OUTCOMES.SKIP_LOCKFILE_UNSUPPORTED };
    return { mode: 'lockless' };
}

const MATRIX = Object.freeze([
    {
        id: 'npm@10-11',
        manager: 'npm',
        matches: (v) => /^1[01]\./.test(v),
        lockState: npmLockState,
        locked: ['ci'],
        lockless: ['install'],
        suppression: ['--ignore-scripts'],
        trailing: [],
        // `npm ci` DELETES root node_modules before rebuilding it.
        replacesNodeModules: true
    },
    {
        id: 'npm@12',
        manager: 'npm',
        matches: (v) => /^12\./.test(v),
        lockState: npm12LockState,
        locked: ['ci'],
        lockless: ['install'],
        suppression: ['--ignore-scripts'],
        trailing: [],
        replacesNodeModules: true
    },
    {
        id: 'pnpm@9.15.0',
        manager: 'pnpm',
        matches: (v) => v === '9.15.0',
        lockState: singleLockState('pnpm-lock.yaml'),
        locked: ['install', '--frozen-lockfile'],
        lockless: ['install'],
        suppression: ['--ignore-scripts'],
        // 9.15 predates pmOnFail; passing it would be an unknown option.
        trailing: []
    },
    {
        id: 'pnpm@12',
        manager: 'pnpm',
        matches: (v) => /^12\./.test(v),
        lockState: singleLockState('pnpm-lock.yaml'),
        locked: ['install', '--frozen-lockfile'],
        lockless: ['install'],
        suppression: ['--ignore-scripts'],
        // v11+ otherwise DOWNLOADS a project-pinned CLI; error instead.
        trailing: ['--pm-on-fail=error']
    },
    {
        id: 'yarn@1',
        manager: 'yarn',
        matches: (v) => /^1\./.test(v),
        lockState: singleLockState('yarn.lock'),
        locked: ['install', '--frozen-lockfile'],
        lockless: ['install'],
        suppression: ['--ignore-scripts'],
        trailing: ['--non-interactive']
    },
    {
        id: 'yarn@2.4',
        manager: 'yarn',
        // Berry 2.0-2.3 has no fixed build-suppression flag and is unsupported.
        matches: (v) => /^2\.4\./.test(v),
        lockState: singleLockState('yarn.lock'),
        locked: ['install', '--immutable'],
        lockless: ['install'],
        suppression: ['--skip-builds'],
        trailing: []
    },
    {
        id: 'yarn@3-4',
        manager: 'yarn',
        matches: (v) => /^[34]\./.test(v),
        lockState: singleLockState('yarn.lock'),
        locked: ['install', '--immutable'],
        lockless: ['install'],
        // `enableScripts:false` does NOT suppress workspace postinstall; the
        // versioned mode flag is the only fixed safe equivalent.
        suppression: ['--mode=skip-build'],
        trailing: []
    },
    {
        id: 'bun@1.2',
        manager: 'bun',
        matches: (v) => /^1\.2\./.test(v),
        lockState: bunLockState,
        locked: ['install', '--frozen-lockfile'],
        lockless: ['install'],
        // Opt-in removes only THIS flag; Bun's own trustedDependencies policy
        // continues to govern dependency scripts either way.
        suppression: ['--ignore-scripts'],
        trailing: []
    }
]);

function findMatrixRow(managerId, version) {
    return MATRIX.find((row) => row.manager === managerId && row.matches(version)) || null;
}

/**
 * Resolve the exact argv for a row. Returns `{ argv, mode }` or `{ skip }`.
 * Order is base -> suppression -> trailing, matching the documented matrix.
 */
function buildArgv(row, presentLockfiles, allowLifecycleScripts) {
    const state = row.lockState(presentLockfiles);
    if (state.skip) return { skip: state.skip };
    if (!allowLifecycleScripts && row.suppression === null) {
        return { skip: OUTCOMES.SKIP_LIFECYCLE_SUPPRESSION_UNAVAILABLE };
    }
    const base = state.mode === 'locked' ? row.locked : row.lockless;
    const suppression = allowLifecycleScripts ? [] : row.suppression || [];
    return { argv: [...base, ...suppression, ...row.trailing], mode: state.mode };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Portable defaults: enabled, auto manager selection, lifecycle scripts
 * suppressed. An ABSENT config uses those defaults; an INVALID config skips
 * installation with one diagnostic — the two states stay distinguishable.
 */
function resolveSettings(configStatus) {
    if (configStatus && configStatus.state === 'invalid') {
        return { skip: OUTCOMES.SKIP_CONFIG_INVALID };
    }
    const config = (configStatus && configStatus.config) || {};
    const section = (config.hooks && config.hooks.startupInstall) || {};
    return {
        settings: {
            enabled: section.enabled === false ? false : true,
            packageManager: typeof section.packageManager === 'string' ? section.packageManager : 'auto',
            // Only an explicit boolean true opts in.
            allowLifecycleScripts: section.allowLifecycleScripts === true
        }
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANAGER SIGNALS
// ═══════════════════════════════════════════════════════════════════════════════

/** `project.packageManagers`: absent/empty = no signal; exactly one valid entry. */
function parsePackageManagersMetadata(value) {
    if (value === undefined || value === null) return { signal: null };
    if (!Array.isArray(value)) return { skip: OUTCOMES.SKIP_MANAGER_METADATA_INVALID };
    if (value.length === 0) return { signal: null };
    if (value.length > 1) return { skip: OUTCOMES.SKIP_MANAGER_METADATA_INVALID };
    const entry = value[0];
    if (typeof entry !== 'string' || !MANAGER_METADATA_GRAMMAR.test(entry)) {
        return { skip: OUTCOMES.SKIP_MANAGER_METADATA_INVALID };
    }
    const [manager, version] = entry.split('@');
    return { signal: { source: 'project.packageManagers', manager, version: version || null } };
}

/** Root manifest `packageManager` (the Corepack field) as a signal. */
function parseManifestPackageManager(value) {
    if (value === undefined || value === null) return { signal: null };
    if (typeof value !== 'string') return { skip: OUTCOMES.SKIP_MANAGER_METADATA_INVALID };
    const pinned = /^(npm|pnpm|yarn|bun)@(\d+\.\d+\.\d+)(?:[+-][\w.+-]*)?$/.exec(value.trim());
    if (pinned) return { signal: { source: 'manifest.packageManager', manager: pinned[1], version: pinned[2] } };
    const bare = /^(npm|pnpm|yarn|bun)$/.exec(value.trim());
    if (bare) return { signal: { source: 'manifest.packageManager', manager: bare[1], version: null } };
    return { skip: OUTCOMES.SKIP_MANAGER_METADATA_INVALID };
}

/** Which recognized lockfiles exist at the root. */
function presentLockfiles(projectRoot, seams) {
    const present = new Set();
    for (const name of Object.keys(LOCKFILE_OWNERS)) {
        if (seams.exists(path.join(projectRoot, name))) present.add(name);
    }
    return present;
}

/**
 * Every available signal must resolve to ONE manager. The `hooks.startupInstall`
 * setting participates as a signal and is never a precedence override, so an
 * explicit choice that contradicts the lockfile or manifest fails closed rather
 * than quietly winning. A missing lockfile alone is not a conflict.
 */
function resolveManager({ settings, manifest, config, present, pnpDetected }) {
    const signals = [];

    if (settings.packageManager && settings.packageManager !== 'auto') {
        signals.push({ source: 'hooks.startupInstall.packageManager', manager: settings.packageManager, version: null });
    }

    const manifestSignal = parseManifestPackageManager(manifest && manifest.packageManager);
    if (manifestSignal.skip) return { skip: manifestSignal.skip };
    if (manifestSignal.signal) signals.push(manifestSignal.signal);

    const metadataSignal = parsePackageManagersMetadata(config && config.project && config.project.packageManagers);
    if (metadataSignal.skip) return { skip: metadataSignal.skip };
    if (metadataSignal.signal) signals.push(metadataSignal.signal);

    for (const name of present) {
        signals.push({ source: `lockfile:${name}`, manager: LOCKFILE_OWNERS[name], version: null });
    }

    if (pnpDetected) signals.push({ source: 'yarn-pnp', manager: 'yarn', version: null });

    const managers = new Set(signals.map((s) => s.manager));
    if (managers.size > 1) return { skip: OUTCOMES.SKIP_MANAGER_CONFLICT };

    const versions = new Set(signals.filter((s) => s.version).map((s) => s.version));
    if (versions.size > 1) return { skip: OUTCOMES.SKIP_MANAGER_CONFLICT };

    if (managers.size === 0) {
        // No signal at all: retain the historical npm fallback.
        return { manager: 'npm', pinnedVersion: null, signals };
    }
    return { manager: [...managers][0], pinnedVersion: [...versions][0] || null, signals };
}

// ═══════════════════════════════════════════════════════════════════════════════
// P6 — PROJECT-LOADED MANAGER EXTENSIONS (skipped regardless of lifecycle opt-in)
// ═══════════════════════════════════════════════════════════════════════════════

const PNPM_HOOK_FILES = ['.pnpmfile.cjs', '.pnpmfile.js', 'pnpmfile.cjs', 'pnpmfile.js'];

/**
 * A project-loaded extension executes project-authored code inside the manager,
 * which the lifecycle opt-in does NOT authorize. Any such configuration skips.
 * `YARN_PLUGINS` is additionally stripped from every child environment.
 */
function detectProjectExtensions({ projectRoot, managerId, env, seams }) {
    if (managerId === 'pnpm') {
        for (const name of PNPM_HOOK_FILES) {
            if (seams.exists(path.join(projectRoot, name))) return { blocked: true, reason: 'pnpmfile' };
        }
    }
    if (managerId === 'yarn') {
        if (typeof env.YARN_PLUGINS === 'string' && env.YARN_PLUGINS.trim() !== '') {
            return { blocked: true, reason: 'yarn-plugins-env' };
        }
        const classicRc = path.join(projectRoot, '.yarnrc');
        if (seams.exists(classicRc)) {
            let text = '';
            try {
                text = seams.readFile(classicRc);
            } catch {
                return { blocked: true, reason: 'yarnrc-unreadable' };
            }
            // A `yarn-path` forwards to a PROJECT-LOCAL binary; that is exactly the
            // untrusted executable the external-resolution rule exists to avoid.
            if (/^\s*yarn-path(\s|=|")/m.test(text)) return { blocked: true, reason: 'yarn-path' };
        }
        const berryRc = path.join(projectRoot, '.yarnrc.yml');
        if (seams.exists(berryRc)) {
            let text = '';
            try {
                text = seams.readFile(berryRc);
            } catch {
                return { blocked: true, reason: 'yarnrc-unreadable' };
            }
            if (/^\s*yarnPath\s*:/m.test(text)) return { blocked: true, reason: 'yarn-path' };
            if (/^\s*plugins\s*:/m.test(text)) return { blocked: true, reason: 'yarn-plugins' };
        }
    }
    return { blocked: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETENESS — node_modules and the Yarn PnP static boundary
// ═══════════════════════════════════════════════════════════════════════════════

/** Root `dependencies` + `devDependencies` names, in declaration order. */
function collectDependencyNames(manifest) {
    const names = [];
    for (const field of ['dependencies', 'devDependencies']) {
        const block = manifest && manifest[field];
        if (!block || typeof block !== 'object' || Array.isArray(block)) continue;
        for (const name of Object.keys(block)) {
            if (typeof name === 'string' && name !== '' && !names.includes(name)) names.push(name);
        }
    }
    return names;
}

/** `@scope/name` maps to `node_modules/@scope/name` by splitting on `/`. */
function missingFromNodeModules({ projectRoot, names, seams }) {
    const nodeModules = path.join(projectRoot, 'node_modules');
    return names.filter((name) => !seams.exists(path.join(nodeModules, ...name.split('/'))));
}

const PNP_LOADERS = ['.pnp.cjs', '.pnp.js'];

function detectPnp(projectRoot, seams) {
    return PNP_LOADERS.some((name) => seams.exists(path.join(projectRoot, name)));
}

/**
 * STATIC-ONLY PnP inspection. The project loader is never required, executed, or
 * even read as code: only the sidecar data map is parsed as JSON.
 *
 * Returns `{ missing: string[] }` when presence/absence is PROVEN, or
 * `{ skip }` for every inconclusive, malformed, unsupported, or escaping state.
 */
function inspectPnp({ projectRoot, names, seams }) {
    const dataPath = path.join(projectRoot, '.pnp.data.json');
    if (!seams.exists(dataPath)) {
        // The map is inlined in the loader; reading it would require executing
        // project code, so presence cannot be proven statically.
        return { skip: OUTCOMES.SKIP_PNP_INCONCLUSIVE };
    }
    let data;
    try {
        data = JSON.parse(seams.readFile(dataPath));
    } catch {
        return { skip: OUTCOMES.SKIP_PNP_UNSUPPORTED };
    }
    if (!data || typeof data !== 'object' || !Array.isArray(data.packageRegistryData)) {
        return { skip: OUTCOMES.SKIP_PNP_UNSUPPORTED };
    }

    const locations = new Map();
    for (const entry of data.packageRegistryData) {
        if (!Array.isArray(entry) || entry.length < 2) return { skip: OUTCOMES.SKIP_PNP_UNSUPPORTED };
        const [ident, references] = entry;
        if (ident === null) continue; // the workspace root entry
        if (typeof ident !== 'string' || !Array.isArray(references)) {
            return { skip: OUTCOMES.SKIP_PNP_UNSUPPORTED };
        }
        for (const reference of references) {
            if (!Array.isArray(reference) || reference.length < 2) continue;
            const info = reference[1];
            if (info && typeof info.packageLocation === 'string' && !locations.has(ident)) {
                locations.set(ident, info.packageLocation);
            }
        }
    }

    const missing = [];
    for (const name of names) {
        const location = locations.get(name);
        if (location === undefined) {
            // Absent from a structurally valid map: PROVEN missing.
            missing.push(name);
            continue;
        }
        const resolved = path.resolve(projectRoot, location);
        if (!isInside(projectRoot, resolved)) return { skip: OUTCOMES.SKIP_PNP_UNSUPPORTED };
        // A zip-backed locator is present iff its cache archive is present.
        const archiveMatch = /^(.*\.zip)(?:[\\/].*)?$/.exec(resolved);
        const probe = archiveMatch ? archiveMatch[1] : resolved;
        if (!seams.exists(probe)) missing.push(name);
    }
    return { missing };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTABLE TRUST AND PLATFORM LAUNCH
// ═══════════════════════════════════════════════════════════════════════════════

const WINDOWS_EXECUTABLE_EXTENSIONS = ['.cmd', '.exe', '.bat'];
// A path safe to embed in a quoted cmd.exe command: drive-absolute, no quote and
// no metacharacter that could terminate or extend the command.
const SAFE_WINDOWS_PATH = /^[A-Za-z]:\\[^"&|<>^%!\r\n\t]*$/;
// Every argument this module can emit comes from the matrix; assert the shape.
const SAFE_ARGUMENT = /^[A-Za-z0-9._=-]+$/;

/**
 * Resolve a PREINSTALLED manager binary from PATH. PATH entries inside the
 * adopter root are skipped outright, and the canonical result must also land
 * outside it — a project-local `.bin` shim or a symlink back into the project is
 * never trusted.
 */
function defaultResolveExecutable({ managerId, projectRoot, env, platform }) {
    const isWindows = platform === 'win32';
    const extensions = isWindows ? WINDOWS_EXECUTABLE_EXTENSIONS : [''];
    const separator = isWindows ? ';' : ':';
    const rawPath = env.PATH || env.Path || env.path || '';
    const rootReal = canonicalSync(projectRoot);

    for (const rawDir of String(rawPath).split(separator)) {
        const trimmed = rawDir.trim().replace(/^"|"$/g, '');
        if (!trimmed) continue;
        let dir;
        try {
            dir = fs.realpathSync(path.resolve(trimmed));
        } catch {
            continue;
        }
        if (isInside(rootReal, dir)) continue; // project-local shim directory
        for (const extension of extensions) {
            const candidate = path.join(dir, managerId + extension);
            let resolved;
            try {
                resolved = fs.realpathSync(candidate);
                if (!fs.statSync(resolved).isFile()) continue;
            } catch {
                continue;
            }
            if (isInside(rootReal, resolved)) return { ok: false, code: OUTCOMES.SKIP_MANAGER_UNTRUSTED_PATH };
            if (isCorepackShim(resolved)) return { ok: false, code: OUTCOMES.SKIP_COREPACK_SHIM };
            return { ok: true, execPath: resolved, viaCorepack: false };
        }
    }
    return { ok: false, code: OUTCOMES.SKIP_MANAGER_NOT_FOUND };
}

function canonicalSync(target) {
    try {
        return fs.realpathSync(target);
    } catch {
        return path.resolve(target);
    }
}

function hasStartupInstallTrust(env) {
    return Boolean(env && env[STARTUP_INSTALL_TRUST_ENV] === '1');
}

function isCorepackShim(execPath) {
    if (/corepack/i.test(execPath)) return true;
    if (!/\.(?:cmd|bat|ps1)$/i.test(execPath)) return false;
    try {
        const source = fs.readFileSync(execPath, 'utf8').slice(0, 32 * 1024);
        return /(?:^|[^\w])corepack(?:\.js|\b)/i.test(source);
    } catch {
        return false;
    }
}

/**
 * Build the fixed launch plan. POSIX spawns the binary directly with
 * `shell: false`. Windows `.cmd`/`.bat` shims cannot be executed directly, so
 * they go through a FIXED `cmd.exe /d /s /c` template with verbatim arguments.
 *
 * The template embeds the CANONICAL, validated executable path rather than a
 * bare manager token: `cmd.exe` searches the CURRENT DIRECTORY before PATH, so a
 * bare token would hand a project-local `npm.cmd` the exact win the external
 * resolution rule exists to prevent. The project root is still passed ONLY as
 * `cwd`, never interpolated.
 *
 * Returns `{ plan }` or `{ skip }`.
 */
function buildLaunchPlan({ managerId, execPath, args, cwd, env, platform }) {
    if (!SUPPORTED_MANAGERS.includes(managerId)) return { skip: OUTCOMES.SKIP_UNSAFE_LAUNCH };
    if (!Array.isArray(args) || !args.every((a) => SAFE_ARGUMENT.test(a))) {
        return { skip: OUTCOMES.SKIP_UNSAFE_LAUNCH };
    }
    if (platform !== 'win32') {
        return {
            plan: {
                managerId,
                command: execPath,
                args,
                cwd,
                env,
                // Own process group so the WHOLE tree can be proven stopped.
                detached: true,
                windowsVerbatimArguments: false
            }
        };
    }
    const extension = path.extname(execPath).toLowerCase();
    if (extension === '.exe') {
        return {
            plan: { managerId, command: execPath, args, cwd, env, detached: false, windowsVerbatimArguments: false }
        };
    }
    if (extension !== '.cmd' && extension !== '.bat') return { skip: OUTCOMES.SKIP_UNSAFE_LAUNCH };
    if (!SAFE_WINDOWS_PATH.test(execPath)) return { skip: OUTCOMES.SKIP_UNSAFE_LAUNCH };
    const comspec = path.join(env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe');
    // Outer quotes let cmd.exe keep the inner quoted path intact under /s.
    const commandLine = `""${execPath}" ${args.join(' ')}"`;
    return {
        plan: {
            managerId,
            command: comspec,
            args: ['/d', '/s', '/c', commandLine],
            cwd,
            env,
            detached: false,
            windowsVerbatimArguments: true
        }
    };
}

/**
 * Child environment: remove project-loaded Yarn extensions and ambient
 * registry credentials unless the host explicitly grants startup-install
 * trust. Corepack is rejected before this function is normally reached; the
 * network guard remains defensive for seam-driven callers.
 */
function credentialFreeConfigPaths(platform) {
    if (platform === 'win32') {
        // Distinct device spellings avoid npm treating the user and global
        // config as the same file. Neither path can resolve to a host .npmrc.
        return { user: 'NUL', global: 'NUL:' };
    }
    // The user path is the empty device. The global path is intentionally
    // nonexistent below that device, so npm cannot fall back to its normal
    // user/global search locations and no project file is created.
    return { user: '/dev/null', global: '/dev/null/.ck-startup-install-global.npmrc' };
}

function applyGitCapability(childEnv, platform, gitCapability) {
    if (platform !== 'win32' || !gitCapability) return childEnv;
    try {
        return require('./windows-git.cjs').withGitEnvironment(childEnv, gitCapability);
    } catch {
        // The verifier has already applied the integrity boundary. A seam or
        // partial-copy failure must not turn startup dependency installation
        // into a raw module error or a parent-environment mutation.
        return childEnv;
    }
}

function buildChildEnv(env, viaCorepack, platform = process.platform, gitCapability) {
    const childEnv = Object.assign({}, env);
    delete childEnv.YARN_PLUGINS;
    if (!hasStartupInstallTrust(env)) {
        for (const name of Object.keys(childEnv)) {
            if (REGISTRY_CREDENTIAL_ENV.test(name)) delete childEnv[name];
        }
        const configPaths = credentialFreeConfigPaths(platform);
        childEnv.NPM_CONFIG_USERCONFIG = configPaths.user;
        childEnv.NPM_CONFIG_GLOBALCONFIG = configPaths.global;
    }
    if (viaCorepack) childEnv.COREPACK_ENABLE_NETWORK = '0';
    return applyGitCapability(childEnv, platform, gitCapability);
}

/** Read `--version` from the TRUSTED binary through the same launch boundary. */
function defaultReadManagerVersion({ managerId, execPath, viaCorepack, env, platform }) {
    const built = buildLaunchPlan({
        managerId,
        execPath,
        args: ['--version'],
        cwd: undefined,
        env: buildChildEnv(env, viaCorepack, platform),
        platform
    });
    if (built.skip) return { ok: false, code: built.skip };
    const plan = built.plan;
    let result;
    try {
        result = spawnSync(plan.command, plan.args, {
            env: plan.env,
            encoding: 'utf8',
            timeout: 20000,
            windowsHide: true,
            windowsVerbatimArguments: plan.windowsVerbatimArguments,
            shell: false
        });
    } catch {
        return { ok: false, code: OUTCOMES.SKIP_MANAGER_VERSION_UNREADABLE };
    }
    if (!result || result.status !== 0) {
        // Corepack with the network disabled fails exactly here on a cache miss.
        return { ok: false, code: viaCorepack ? OUTCOMES.SKIP_COREPACK_CACHE_MISS : OUTCOMES.SKIP_MANAGER_VERSION_UNREADABLE };
    }
    const match = /(\d+\.\d+\.\d+)/.exec(String(result.stdout || ''));
    if (!match) return { ok: false, code: OUTCOMES.SKIP_MANAGER_VERSION_UNREADABLE };
    return { ok: true, version: match[1] };
}

/**
 * Run the manager under the fixed 120 s deadline. stdout/stderr are consumed and
 * DISCARDED: the exit status is the only signal that leaves this function, so no
 * manager output can reach a log.
 */
function defaultSpawnManager(plan, { publishGroup }) {
    return new Promise((resolve) => {
        let child;
        try {
            child = spawn(plan.command, plan.args, {
                cwd: plan.cwd,
                env: plan.env,
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: false,
                detached: plan.detached,
                windowsHide: true,
                windowsVerbatimArguments: plan.windowsVerbatimArguments
            });
        } catch {
            resolve({ outcome: OUTCOMES.INSTALL_FAILED, exitCode: null });
            return;
        }
        if (!child || typeof child.pid !== 'number') {
            resolve({ outcome: OUTCOMES.INSTALL_FAILED, exitCode: null });
            return;
        }
        publishGroup({ kind: plan.detached ? 'pgid' : 'pid', id: child.pid });
        if (child.stdout) child.stdout.resume();
        if (child.stderr) child.stderr.resume();

        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(value);
        };
        const timer = setTimeout(() => {
            // Termination and its 30 s proof belong to the lock module, which owns
            // the tree handle; this only reports that the deadline was reached.
            finish({ outcome: OUTCOMES.INSTALL_TIMEOUT, exitCode: null, timedOut: true });
        }, MANAGER_DEADLINE_MS);
        if (typeof timer.unref === 'function') timer.unref();

        child.on('error', () => finish({ outcome: OUTCOMES.INSTALL_FAILED, exitCode: null }));
        child.on('close', (code) =>
            finish({
                outcome: code === 0 ? OUTCOMES.INSTALLED : OUTCOMES.INSTALL_FAILED,
                exitCode: typeof code === 'number' ? code : null
            })
        );
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEAMS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_SEAMS = Object.freeze({
    now: () => Date.now(),
    exists: (p) => fs.existsSync(p),
    readFile: (p) => fs.readFileSync(p, 'utf8'),
    realpath: (p) => fs.realpathSync(p),
    platform: () => process.platform,
    env: () => process.env,
    resolveExecutable: defaultResolveExecutable,
    readManagerVersion: defaultReadManagerVersion,
    spawnManager: defaultSpawnManager,
    lock: lockModule
});

function createSeams(overrides) {
    return Object.assign({}, DEFAULT_SEAMS, overrides || {});
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Decide, without launching anything, whether an install is warranted and what
 * exactly it would run.
 *
 * @param {object} options
 * @param {string} options.projectRoot     resolved adopter root
 * @param {string} options.source          SessionStart source; must be
 *                                         explicitly `startup`
 * @param {object} [options.configStatus]  getProjectConfigStatus() result, or
 *                                         omitted for portable defaults
 * @param {object} [options.gitCapability] validated Windows Git capability for
 *                                         the manager child environment
 * @param {object} [options.seams]
 * @returns {{ outcome: string, manager?: string, version?: string, request?: object }}
 */
function buildInstallRequest(options) {
    const seams = createSeams(options.seams);
    const projectRoot = options.projectRoot;
    const env = seams.env();
    const platform = seams.platform();

    if (options.source !== 'startup') {
        return { outcome: OUTCOMES.SKIP_NOT_STARTUP };
    }
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
        return { outcome: OUTCOMES.SKIP_UNSUPPORTED_PLATFORM };
    }

    const resolved = resolveSettings(options.configStatus);
    if (resolved.skip) return { outcome: resolved.skip };
    const settings = resolved.settings;
    if (!settings.enabled) return { outcome: OUTCOMES.SKIP_DISABLED };

    // A project with no root manifest is a clean no-op — distinct from an absent
    // project config, which merely means "use the portable defaults".
    const manifestPath = path.join(projectRoot, 'package.json');
    if (!seams.exists(manifestPath)) return { outcome: OUTCOMES.NOOP_NO_MANIFEST };
    let manifest;
    try {
        manifest = JSON.parse(seams.readFile(manifestPath));
    } catch {
        return { outcome: OUTCOMES.SKIP_MANIFEST_UNREADABLE };
    }
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
        return { outcome: OUTCOMES.SKIP_MANIFEST_UNREADABLE };
    }

    const names = collectDependencyNames(manifest);
    if (names.length === 0) return { outcome: OUTCOMES.NOOP_NO_DEPENDENCIES };

    const pnpDetected = detectPnp(projectRoot, seams);
    const completeness = pnpDetected
        ? inspectPnp({ projectRoot, names, seams })
        : { missing: missingFromNodeModules({ projectRoot, names, seams }) };
    if (completeness.skip) return { outcome: completeness.skip };
    if (completeness.missing.length === 0) return { outcome: OUTCOMES.NOOP_DEPENDENCIES_PRESENT };

    const present = presentLockfiles(projectRoot, seams);
    const selection = resolveManager({
        settings,
        manifest,
        config: (options.configStatus && options.configStatus.config) || {},
        present,
        pnpDetected
    });
    if (selection.skip) return { outcome: selection.skip };
    const managerId = selection.manager;

    // A lockfile owned by ANOTHER manager is already a conflict above; this only
    // narrows the set handed to the row's lock-state classifier.
    const ownLockfiles = new Set([...present].filter((name) => LOCKFILE_OWNERS[name] === managerId));

    const extensions = detectProjectExtensions({ projectRoot, managerId, env, seams });
    if (extensions.blocked) return { outcome: OUTCOMES.SKIP_PROJECT_EXTENSION, manager: managerId };

    const executable = seams.resolveExecutable({
        managerId,
        projectRoot,
        env,
        platform
    });
    if (!executable || !executable.ok) {
        return { outcome: (executable && executable.code) || OUTCOMES.SKIP_MANAGER_NOT_FOUND, manager: managerId };
    }
    if (executable.viaCorepack === true || executable.corepack === true) {
        return { outcome: OUTCOMES.SKIP_COREPACK_SHIM, manager: managerId };
    }

    const versionRead = seams.readManagerVersion({
        managerId,
        execPath: executable.execPath,
        viaCorepack: executable.viaCorepack === true,
        env,
        platform
    });
    if (!versionRead || !versionRead.ok) {
        return {
            outcome: (versionRead && versionRead.code) || OUTCOMES.SKIP_MANAGER_VERSION_UNREADABLE,
            manager: managerId
        };
    }
    const version = versionRead.version;

    // An exact project pin must equal the TRUSTED executable's version; the hook
    // never downloads the pinned one.
    if (selection.pinnedVersion && selection.pinnedVersion !== version) {
        return { outcome: OUTCOMES.SKIP_MANAGER_VERSION_PIN_MISMATCH, manager: managerId, version };
    }

    const row = findMatrixRow(managerId, version);
    if (!row) return { outcome: OUTCOMES.SKIP_MANAGER_VERSION_UNSUPPORTED, manager: managerId, version };

    const allowLifecycleScripts = settings.allowLifecycleScripts === true && hasStartupInstallTrust(env);
    const built = buildArgv(row, ownLockfiles, allowLifecycleScripts);
    if (built.skip) return { outcome: built.skip, manager: managerId, version };

    const launch = buildLaunchPlan({
        managerId,
        execPath: executable.execPath,
        args: built.argv,
        cwd: projectRoot,
        env: buildChildEnv(env, executable.viaCorepack === true, platform, options.gitCapability),
        platform
    });
    if (launch.skip) return { outcome: launch.skip, manager: managerId, version };

    return {
        outcome: 'eligible',
        manager: managerId,
        version,
        request: {
            managerId,
            version,
            rowId: row.id,
            mode: built.mode,
            argv: built.argv,
            // `npm ci` REPLACES root node_modules rather than patching it; callers
            // surface that consequence rather than hiding it behind "installed".
            replacesNodeModules: row.replacesNodeModules === true && built.mode === 'locked',
            allowLifecycleScripts,
            missingCount: completeness.missing.length,
            plan: launch.plan
        }
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build the request and, when eligible, run it while holding the per-project
 * lock. Never throws; every failure resolves to an outcome code.
 *
 * @returns {Promise<{ outcome: string, manager?: string, version?: string,
 *                     exitCode?: number|null, request?: object, lockRetained?: boolean }>}
 */
async function runStartupInstall(options) {
    const seams = createSeams(options.seams);
    const projectRoot = options.projectRoot;

    let request;
    try {
        request = buildInstallRequest(Object.assign({}, options, { seams }));
    } catch {
        return { outcome: OUTCOMES.SKIP_MANIFEST_UNREADABLE };
    }
    if (request.outcome !== 'eligible') return request;

    const canonicalRoot = canonical(seams, projectRoot);
    const plan = request.request.plan;

    // Re-run the SAME completeness check after acquiring: a peer session may have
    // repaired the tree while we waited on the lock.
    const recheck = () => {
        try {
            const probe = buildInstallRequest(Object.assign({}, options, { seams }));
            return probe.outcome === OUTCOMES.NOOP_DEPENDENCIES_PRESENT;
        } catch {
            return false;
        }
    };

    let inner = null;
    let held;
    try {
        held = await seams.lock.withProjectLock({
            canonicalRoot,
            seams: options.lockSeams,
            recheck,
            run: async ({ publishGroup }) => {
                inner = await seams.spawnManager(plan, { publishGroup });
                return inner || { outcome: OUTCOMES.INSTALL_FAILED };
            }
        });
    } catch {
        return { outcome: OUTCOMES.SKIP_LOCK_UNAVAILABLE, manager: request.manager, version: request.version };
    }

    return {
        outcome: held.outcome,
        manager: request.manager,
        version: request.version,
        exitCode: inner ? inner.exitCode : null,
        request: request.request,
        lockRetained: held.lockRetained === true
    };
}

module.exports = {
    OUTCOMES,
    REPORTED_OUTCOMES,
    MANAGER_DEADLINE_MS,
    SUPPORTED_MANAGERS,
    SUPPORTED_PLATFORMS,
    STARTUP_INSTALL_TRUST_ENV,
    LOCKFILE_OWNERS,
    MATRIX,
    DEFAULT_SEAMS,
    createSeams,
    sanitizeToken,
    safeManagerId,
    safeVersion,
    hasStartupInstallTrust,
    isCorepackShim,
    credentialFreeConfigPaths,
    formatDiagnostic,
    resolveSettings,
    parsePackageManagersMetadata,
    parseManifestPackageManager,
    presentLockfiles,
    resolveManager,
    detectProjectExtensions,
    collectDependencyNames,
    missingFromNodeModules,
    detectPnp,
    inspectPnp,
    findMatrixRow,
    buildArgv,
    buildChildEnv,
    buildLaunchPlan,
    buildInstallRequest,
    runStartupInstall
};
