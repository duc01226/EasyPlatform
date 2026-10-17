'use strict';

// One runtime owner for every shipped hook. Personal preferences never change
// generated files, native host permissions, or explicitly invoked skills.
const path = require('node:path');
const fs = require('node:fs');
const routing = require('../../scripts/lib/workflow-routing-config.cjs');

const MODES = Object.freeze(['on', 'quiet', 'off']);
// Quiet suppresses context-producing automation before it reads transcripts or
// updates delivery ledgers. These operational hooks retain their own diagnostics.
const QUIET_HOOKS = new Set([
    'review-commit-gate.cjs',
    'doc-sync-gate.cjs',
    'post-edit-prettier.cjs',
    'notifications/notify.cjs'
]);

function normalizeMode(value) {
    if (typeof value !== 'string') return undefined;
    const mode = value.trim().replace(/^(["'])(.*)\1$/, '$2').toLowerCase();
    return MODES.includes(mode) ? mode : undefined;
}

function readConfig(file) {
    try {
        return JSON.parse(routing.decodeConfigText(fs.readFileSync(file)));
    } catch {
        return null;
    }
}

function resolveFrameworkMode(options = {}) {
    const rootDir = options.rootDir || process.cwd();
    const env = options.env || process.env;
    const configPath = routing.resolveProjectConfigPath(rootDir);
    const userPath = routing.resolveUserConfigPath(options.homeDir);
    const localPath = routing.resolveLocalOverridePath(rootDir);
    const layers = [{ source: 'default', mode: 'on' }];
    const configReader = options.readConfig || readConfig;
    const add = (source, file) => layers.push({ source, file, mode: normalizeMode(file && configReader(file)?.frameworkRuntime?.mode) });
    add('project-config', configPath);
    if (options.scope !== 'team') {
        add('user-config', userPath);
        add('local-override', localPath);
        layers.push({ source: 'environment', mode: normalizeMode(env.CK_FRAMEWORK_MODE) });
    }
    const winner = layers.filter(layer => layer.mode !== undefined).at(-1);
    return { mode: winner.mode, source: winner.source, configPath, userPath, localPath, layers };
}

function isHookEnabled(hook, options = {}) {
    const { mode } = resolveFrameworkMode(options);
    const name = hook.replace(/\\/g, '/').replace(/^.*\.claude\/hooks\//, '');
    return mode === 'on' || (mode === 'quiet' && QUIET_HOOKS.has(name));
}

// Guard only actual entrypoints: importing a hook for tests or explicit tooling
// still exposes its API. Covers direct Node and the Codex node -e launcher.
function skipHook(mod) {
    if (!require('./hook-runner.cjs').isHookEntryPoint(mod)) return false;
    const { rootDir } = require('./project-root.cjs').resolveProjectRoot({ scriptPath: mod.filename });
    return !isHookEnabled(path.relative(path.join(rootDir, '.claude', 'hooks'), mod.filename), { rootDir });
}

module.exports = { MODES, QUIET_HOOKS, normalizeMode, resolveFrameworkMode, isHookEnabled, skipHook };
