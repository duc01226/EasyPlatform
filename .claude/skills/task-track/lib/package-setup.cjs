'use strict';

// Installs this skill's own declared runtime packages when an explicit command finds them missing.
// Hooks never call this: they stay inside their time budget and let the parser owner refuse instead.
// Locating, launching and serialising the installer belong to the startup installer and its lock; they
// are reused here so one package folder never has two installs and a stuck install is stopped as a tree.
const fs = require('node:fs');
const path = require('node:path');
const installer = require('../../../hooks/lib/startup-install.cjs');
const installLock = require('../../../hooks/lib/startup-install-lock.cjs');

const PACKAGE_DIR = path.resolve(__dirname, '..');
// Runtime packages only, at the lockfile's exact versions and integrity hashes, with package scripts off.
const INSTALL_ARGS = Object.freeze(['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund']);
// The automatic run also bounds npm's own network wait, so an unreachable registry is reported in about
// half a minute instead of at the installer's hard process limit.
const AUTOMATIC_ARGS = Object.freeze([...INSTALL_ARGS, '--fetch-retries=0', '--fetch-timeout=30000']);
// Shared with the framework's other automatic dependency attempts.
const OPT_OUT_ENV = 'CK_AUTO_INSTALL_DEPENDENCIES';
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?$/;
// A second command waits this long for the first one's install; each lock attempt itself waits a few seconds.
const PEER_WAIT_MS = 60000;
const RESOLVE_REASONS = Object.freeze({
    [installer.OUTCOMES.SKIP_MANAGER_NOT_FOUND]: 'npm was not found on PATH',
    [installer.OUTCOMES.SKIP_MANAGER_UNTRUSTED_PATH]: 'the npm found on PATH lives inside the project, which automatic setup does not trust',
    [installer.OUTCOMES.SKIP_COREPACK_SHIM]: 'the npm found on PATH is a Corepack shim, which automatic setup does not use'
});

function readJson(file) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { return null; }
}

/** The installed version of `name`, or null when the package is absent or only partly written. */
function installedVersion(packageDir, name) {
    const directory = path.join(packageDir, 'node_modules', name);
    const manifest = readJson(path.join(directory, 'package.json'));
    if (typeof manifest?.version !== 'string') return null;
    // A manifest alone is not a usable package: an interrupted extraction can leave one behind.
    if (typeof manifest.main === 'string' && !fs.existsSync(path.join(directory, manifest.main))) return null;
    return manifest.version;
}

/** Declared runtime packages that are absent, incomplete or not at their pinned version. */
function missingPackages(packageDir = PACKAGE_DIR) {
    const declared = readJson(path.join(packageDir, 'package.json'))?.dependencies || {};
    return Object.entries(declared).filter(([name, wanted]) => {
        const installed = installedVersion(packageDir, name);
        return installed === null || (EXACT_VERSION.test(wanted) && installed !== wanted);
    }).map(([name]) => name);
}

/**
 * Make the declared runtime packages present, installing them once when they are missing.
 * @returns {Promise<{status: 'present'} | {status: 'installed', packages: string[]}
 *   | {status: 'unavailable', packages: string[], reason: string, remedy: string}>}
 */
async function ensurePackages(options = {}) {
    const { env = process.env, platform = process.platform } = options;
    const packageDir = fs.realpathSync(options.packageDir || PACKAGE_DIR);
    const seams = { resolveExecutable: installer.DEFAULT_SEAMS.resolveExecutable, spawnManager: installer.DEFAULT_SEAMS.spawnManager,
        withProjectLock: installLock.withProjectLock, now: Date.now, ...options.seams };
    const projectRoot = path.resolve(packageDir, '../../..');
    const directory = path.relative(projectRoot, packageDir).split(path.sep).join('/');
    const restore = file => `Restore ${directory}/${file} from the framework copy`;
    const manual = `Run "npm ${INSTALL_ARGS.join(' ')}" inside ${directory}`;

    const declared = readJson(path.join(packageDir, 'package.json'))?.dependencies;
    if (!declared || typeof declared !== 'object') return { status: 'unavailable', packages: [], reason: 'the skill package manifest is unreadable', remedy: restore('package.json') };
    const needed = missingPackages(packageDir);
    if (!needed.length) return { status: 'present' };
    const unavailable = (reason, remedy = manual) => ({ status: 'unavailable', packages: needed, reason, remedy });
    if (/^(?:0|off|false)$/i.test(env[OPT_OUT_ENV] || '')) return unavailable(`automatic installation is turned off by ${OPT_OUT_ENV}`);
    if (!fs.existsSync(path.join(packageDir, 'package-lock.json'))) return unavailable('the package lockfile is missing', restore('package-lock.json'));

    // PATH entries inside the project are skipped, so a project-local shim never runs as the installer.
    const executable = seams.resolveExecutable({ managerId: 'npm', projectRoot, env, platform });
    if (!executable.ok) return unavailable(RESOLVE_REASONS[executable.code] || 'npm is not usable for automatic setup');
    const built = installer.buildLaunchPlan({ managerId: 'npm', execPath: executable.execPath, args: [...AUTOMATIC_ARGS], cwd: packageDir,
        env: installer.buildChildEnv(env, false, platform), platform });
    if (built.skip) return unavailable('npm cannot be started safely from its installed path');

    const run = async ({ publishGroup }) => {
        const inner = (await seams.spawnManager(built.plan, { publishGroup })) || { outcome: installer.OUTCOMES.INSTALL_FAILED };
        // A manager that ended by itself without success may leave part of a package behind. Clear it while
        // this command still holds the folder, so the next command installs again instead of trusting it.
        if (inner.outcome === installer.OUTCOMES.INSTALL_FAILED) {
            for (const name of needed) fs.rmSync(path.join(packageDir, 'node_modules', name), { recursive: true, force: true });
        }
        return inner;
    };
    const until = seams.now() + PEER_WAIT_MS;
    for (;;) {
        let held;
        // The lock rechecks after acquiring, so a command that waited for another one's install does not repeat it.
        try { held = await seams.withProjectLock({ canonicalRoot: packageDir, recheck: () => !missingPackages(packageDir).length, run }); }
        catch { held = { outcome: installLock.LOCK_OUTCOMES.UNAVAILABLE }; }
        switch (held.outcome) {
        case installer.OUTCOMES.INSTALLED:
            return missingPackages(packageDir).length ? unavailable('npm finished but the declared package is still not installed') : { status: 'installed', packages: needed };
        case installLock.LOCK_OUTCOMES.REPAIRED_BY_PEER:
            return { status: 'present' };
        case installLock.LOCK_OUTCOMES.IN_PROGRESS:
            if (seams.now() < until) continue;
            return unavailable('another setup of this folder is still running', 'Retry when it has finished');
        case installer.OUTCOMES.INSTALL_TIMEOUT:
            return unavailable(`npm did not finish within ${Math.round(installer.MANAGER_DEADLINE_MS / 1000)} seconds and was stopped`);
        case installer.OUTCOMES.INSTALL_FAILED:
            return unavailable(typeof held.inner?.exitCode === 'number' ? `npm ended with exit code ${held.inner.exitCode}` : 'npm could not be started');
        case installLock.LOCK_OUTCOMES.RETAINED_CLEANUP_UNPROVEN:
            return unavailable('the installer could not be confirmed stopped, so its guard is kept', `Make sure no npm process is still running, then ${manual.replace(/^Run/, 'run')}`);
        default:
            // The lock refuses rather than guess when it cannot prove a private, single-owner guard on this machine.
            return unavailable(`automatic setup cannot guard this folder safely here (${held.outcome})`);
        }
    }
}

module.exports = { INSTALL_ARGS, AUTOMATIC_ARGS, OPT_OUT_ENV, PEER_WAIT_MS, missingPackages, ensurePackages };
