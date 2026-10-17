#!/usr/bin/env node
'use strict';

// Portable on Windows, macOS and Linux: Node APIs and literal Git argv only.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { MODES, resolveFrameworkMode } = require('../hooks/lib/framework-runtime.cjs');
const { decodeConfigText } = require('./lib/workflow-routing-config.cjs');
const { resolveMutationProjectRoot } = require('./lib/project-root.cjs');
const { planNativeSkills, applyNativeSkills, nativeStatus, withNativeLock, assertSettingsPath } = require('./lib/framework-native-skills.cjs');

function run(args) {
    const scopes = args.filter(arg => arg.startsWith('--scope='));
    const scope = scopes[0]?.slice('--scope='.length) || 'checkout';
    const commands = args.filter(arg => !arg.startsWith('--'));
    const command = commands[0] || 'show';
    if (commands.length > 1 || scopes.length > 1 || !['checkout', 'user', 'team'].includes(scope) ||
        !['show', 'apply', 'reset', ...MODES].includes(command) ||
        args.some(arg => arg !== command && arg !== `--scope=${scope}` && arg !== '--json')) {
        throw new Error('Usage: node .claude/scripts/framework-mode.cjs [show|apply|on|quiet|off|reset] [--scope=checkout|user|team] [--json]');
    }
    const { rootDir } = resolveMutationProjectRoot({ scriptPath: __filename });
    const before = resolveFrameworkMode({ rootDir });
    let saved;
    let nativePlan;
    if (command !== 'show' && command !== 'apply') {
        const file = { checkout: before.localPath, user: before.userPath, team: before.configPath }[scope];
        if (!file) throw new Error('Cannot locate the selected settings file.');
        assertSettingsPath(file);
        if (scope === 'checkout') {
            const ignored = spawnSync('git', ['check-ignore', '-q', '--', file], { cwd: rootDir, windowsHide: true });
            if (ignored.status !== 0) throw new Error('Checkout settings must be git-ignored before saving.');
        }
        let config = {};
        try { config = JSON.parse(decodeConfigText(fs.readFileSync(file))); }
        catch (error) { if (error.code !== 'ENOENT') throw new Error(`Cannot read valid settings at ${file}: ${error.message}`); }
        if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error(`Settings must be an object: ${file}`);
        if (config.frameworkRuntime !== undefined && (!config.frameworkRuntime || typeof config.frameworkRuntime !== 'object' || Array.isArray(config.frameworkRuntime))) {
            throw new Error(`frameworkRuntime must be an object: ${file}`);
        }
        const candidate = { ...config, frameworkRuntime: { ...config.frameworkRuntime } };
        if (command === 'reset') delete candidate.frameworkRuntime.mode;
        else candidate.frameworkRuntime.mode = command;
        if (Object.keys(candidate.frameworkRuntime).length === 0) delete candidate.frameworkRuntime;
        const validate = scope === 'team'
            ? require('../hooks/lib/project-config-schema.cjs').validateConfig
            : require('../hooks/lib/ck-config-schema.cjs').validateCkConfig;
        const result = validate(candidate);
        if (!result.valid) throw new Error(result.errors.join('\n'));
        // Preflight every native target before saving the preference. No team
        // profile or tracked projection is rewritten for a personal mode change.
        nativePlan = planNativeSkills({ rootDir, scope, preference: { file, value: candidate } });
        // Validate first; an invalid existing file is never replaced by defaults.
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const temporary = `${file}.${randomUUID()}.tmp`;
        try {
            const mode = fs.existsSync(file) ? fs.statSync(file).mode & 0o777 : scope === 'team' ? 0o644 : 0o600;
            fs.writeFileSync(temporary, `${JSON.stringify(candidate, null, 2)}\n`, { mode, flag: 'wx' });
            fs.renameSync(temporary, file);
        } finally {
            fs.rmSync(temporary, { force: true });
        }
        const reread = JSON.parse(decodeConfigText(fs.readFileSync(file)));
        if (!validate(reread).valid || reread.frameworkRuntime?.mode !== candidate.frameworkRuntime?.mode) throw new Error('Saved settings did not verify.');
        saved = { file, mode: command === 'reset' ? null : command };
    }
    if (command === 'apply') nativePlan = planNativeSkills({ rootDir, scope });
    const nativeApplied = nativePlan ? applyNativeSkills(nativePlan) : undefined;
    const effective = resolveFrameworkMode({ rootDir });
    const nativeSkills = nativeStatus(rootDir);
    const result = { ...effective, ...(saved ? { saved } : {}), nativeSkills, ...(nativeApplied ? { nativeApplied } : {}) };
    process.stdout.write(args.includes('--json') ? `${JSON.stringify(result, null, 2)}\n` :
        `${saved ? `Saved ${saved.mode ?? 'reset'} in ${saved.file}\n` : ''}Framework mode: ${effective.mode} (${effective.source})\n` +
        `Native Claude/Codex skills: ${nativeSkills.skillsDisabled ? 'disabled' : 'normal profile'}${nativeSkills.registered ? '' : ' (run apply to register this checkout)'}\n` +
        `${nativeSkills.needsApply ? 'Native settings need reconciliation: run apply.\n' : ''}` +
        `${nativeApplied ? 'Start fresh Claude/Codex sessions to load native settings. User scope covers registered checkouts; run apply once in each new checkout.\n' : ''}`);
    return result;
}

function main(args = process.argv.slice(2)) {
    const command = args.find(arg => !arg.startsWith('--')) || 'show';
    return command === 'show' ? run(args) : withNativeLock(() => run(args));
}

if (require.main === module) {
    try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
module.exports = { main };
