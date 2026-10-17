'use strict';

// Native skill discovery happens before hooks. Keep personal overrides outside
// tracked projections, with a small recovery ledger containing only skill policy.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { resolveFrameworkMode } = require('../../hooks/lib/framework-runtime.cjs');
const { decodeConfigText } = require('./workflow-routing-config.cjs');
const { spliceTopLevelMember } = require('../sync-skill-profile.cjs');

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
function runtimeConfig(file) {
    try { return json(read(file), file); } catch { return null; }
}
function read(file) {
    try { return decodeConfigText(fs.readFileSync(file)); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function json(text, file) {
    const value = JSON.parse(text ?? '{}');
    if (!plain(value)) throw new Error(`Expected a JSON object: ${file}`);
    return value;
}
function assertSettingsPath(file) {
    if (fs.lstatSync(file, { throwIfNoEntry: false })?.isSymbolicLink()) {
        throw new Error(`Refusing settings symlink: ${file}`);
    }
}
function atomic(file, text) {
    assertSettingsPath(file);
    if (text === null) { fs.rmSync(file, { force: true }); return; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${randomUUID()}.tmp`;
    try {
        fs.writeFileSync(temp, text, { flag: 'wx', mode: fs.existsSync(file) ? fs.statSync(file).mode & 0o777 : 0o600 });
        fs.renameSync(temp, file);
    } finally { fs.rmSync(temp, { force: true }); }
}
function registryPath(homeDir = os.homedir()) {
    return path.join(homeDir, '.claude', 'framework-runtime-projects.json');
}
function loadRegistry(file) {
    const value = json(read(file), file);
    if (!Object.keys(value).length) return { version: 1, projects: {} };
    if (value.version !== 1 || !plain(value.projects)) throw new Error(`Invalid native skill recovery registry: ${file}`);
    for (const [root, entry] of Object.entries(value.projects)) {
        if (!path.isAbsolute(root) || !plain(entry) || (entry.disabled !== undefined && !plain(entry.disabled))) {
            throw new Error(`Invalid registered checkout: ${root}`);
        }
    }
    return value;
}
function catalog(root) {
    const dir = path.join(root, '.claude', 'skills');
    if (!fs.existsSync(dir)) return [];
    const skills = [];
    const visit = current => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
            const target = path.join(current, entry.name);
            if (entry.isDirectory() && !['node_modules', '.git', '.venv', '__pycache__'].includes(entry.name)) visit(target);
            else if (entry.isFile() && entry.name === 'SKILL.md') {
                const text = read(target);
                const header = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] || '';
                const name = /^name:\s*['"]?([a-z0-9][a-z0-9-]*)['"]?\s*$/m.exec(header)?.[1];
                if (!name) throw new Error(`Cannot resolve native skill name: ${target}`);
                skills.push({ name, relative: path.relative(dir, target) });
            }
        }
    };
    visit(dir);
    return skills;
}

// Do not reinterpret arbitrary user TOML. The owned block is ordinary native
// array-of-table syntax. A pre-existing skills.config needs explicit reconciliation;
// refusing before writes is safer than duplicating or shadowing the user's policy.
function assertCodexAppendable(text) {
    const outside = text.replace(/\n?# CK:FRAMEWORK-SKILLS:[a-f0-9]+:START\n[\s\S]*?# CK:FRAMEWORK-SKILLS:[a-f0-9]+:END\n/g, '');
    let inSkills = false;
    for (const line of outside.split(/\r?\n/)) {
        const clean = line.replace(/['"]/g, '').trim();
        if (clean.startsWith('#')) continue;
        if (/^\[/.test(clean)) {
            inSkills = /^\[\s*skills\s*\]/.test(clean);
            if (/^\[\[?\s*skills\s*\.\s*config(?:\s*[.\]]|\s*$)/.test(clean)) {
                throw new Error('Codex already has user-owned skills.config entries; reconcile them before applying framework off. No native settings were changed.');
            }
        }
        if (/^skills\s*(?:\.\s*config\b|=)/.test(clean) || (inSkills && /^config\s*=/.test(clean))) {
            throw new Error('Codex has an inline skills configuration; reconcile it before applying framework off. No native settings were changed.');
        }
    }
}

function planNativeSkills({ rootDir, scope = 'checkout', homeDir = os.homedir(), env = process.env, preference } = {}) {
    const root = fs.realpathSync(rootDir);
    const file = registryPath(homeDir);
    assertSettingsPath(file);
    const initial = loadRegistry(file);
    const registry = structuredClone(initial);
    registry.projects[root] ||= {};
    const roots = scope === 'user' ? Object.keys(registry.projects).sort() : [root];
    const changes = new Map();
    const get = target => changes.has(target) ? changes.get(target).after : read(target);
    const set = (target, after) => {
        if (!changes.has(target)) changes.set(target, { file: target, before: read(target), after });
        else changes.get(target).after = after;
    };
    const results = [];
    // Interim owns both old and newly disabled keys before any native writes.
    const interim = structuredClone(registry);
    for (const checkout of roots) {
        if (!fs.existsSync(checkout)) { results.push({ root: checkout, status: 'missing-checkout', restartRequired: false }); continue; }
        if (fs.realpathSync(checkout) !== checkout) throw new Error(`Registered checkout identity changed: ${checkout}`);
        const effective = resolveFrameworkMode({ rootDir: checkout, homeDir, env,
            readConfig: target => target === preference?.file ? preference.value : runtimeConfig(target) });
        const entry = registry.projects[checkout];
        const saved = entry.disabled;
        const entries = catalog(checkout);
        const names = [...new Set(entries.map(entry => entry.name))];
        const claudePath = path.join(checkout, '.claude', 'settings.local.json');
        const currentText = get(claudePath);
        const current = json(currentText, claudePath);
        if (current.skillOverrides !== undefined && !plain(current.skillOverrides)) throw new Error(`skillOverrides must be an object: ${claudePath}`);
        const overrides = { ...current.skillOverrides };
        if (effective.mode === 'off') {
            if (names.length && spawnSync('git', ['check-ignore', '-q', '--', claudePath], { cwd: checkout, windowsHide: true }).status !== 0) {
                throw new Error(`Claude checkout settings must be git-ignored before applying off: ${claudePath}`);
            }
            assertCodexAppendable(read(path.join(checkout, '.codex/config.toml')) || '');
            const state = saved || { claudeBefore: {}, claudeFileExisted: currentText !== null,
                claudeMemberExisted: own(current, 'skillOverrides'), codexPath: path.resolve(env.CODEX_HOME || path.join(homeDir, '.codex'), 'config.toml'), codexBlock: '' };
            if (!plain(state.claudeBefore) || typeof state.codexPath !== 'string' || !path.isAbsolute(state.codexPath) || typeof state.codexBlock !== 'string') {
                throw new Error(`Invalid recovery state for ${checkout}`);
            }
            if (saved && state.codexPath !== path.resolve(env.CODEX_HOME || path.join(homeDir, '.codex'), 'config.toml')) {
                throw new Error(`Codex home changed while disabled; restore on/quiet using the recorded home before applying off in the new home: ${state.codexPath}`);
            }
            for (const name of names) {
                if (own(overrides, name) && !['on', 'off', 'name-only', 'user-invocable-only'].includes(overrides[name])) {
                    throw new Error(`Invalid Claude override for ${name}: ${claudePath}`);
                }
                if (!own(state.claudeBefore, name)) state.claudeBefore[name] = own(overrides, name) ? overrides[name] : null;
                else if (overrides[name] !== 'off' && overrides[name] !== state.claudeBefore[name] && !(overrides[name] === undefined && state.claudeBefore[name] === null)) {
                    throw new Error(`Claude skill ${name} changed while off; reconcile its local override before retrying.`);
                }
                overrides[name] = 'off';
            }
            if (names.length) set(claudePath, spliceTopLevelMember(currentText ?? '{}\n', 'skillOverrides', overrides));
            let codexText = get(state.codexPath) ?? '';
            if (state.codexBlock && codexText.includes(state.codexBlock)) codexText = codexText.replace(state.codexBlock, '');
            else if (state.codexBlock && codexText.includes(`CK:FRAMEWORK-SKILLS:${state.id}:`)) throw new Error(`Codex framework block changed: ${state.codexPath}`);
            const skills = entries.map(entry => path.join(checkout, '.agents', 'skills', entry.relative)).filter(target => fs.existsSync(target)).map(target => fs.realpathSync(target));
            if (entries.length && skills.length !== entries.length) throw new Error(`Codex mirrors are missing in ${checkout}; run sync-codex before applying off.`);
            if (skills.length) {
                assertCodexAppendable(codexText);
                state.id ||= createHash('sha256').update(checkout).digest('hex').slice(0,16);
                state.codexFileExisted ??= get(state.codexPath) !== null;
                const prefix = `# CK:FRAMEWORK-SKILLS:${state.id}`;
                state.codexBlock = `${codexText && !codexText.endsWith('\n') ? '\n' : ''}${prefix}:START\n` +
                    skills.map(target => `[[skills.config]]\npath = ${JSON.stringify(target.replace(/\\/g, '/'))}\nenabled = false\n`).join('') + `${prefix}:END\n`;
                set(state.codexPath, codexText + state.codexBlock);
            }
            if (names.length || saved) entry.disabled = state;
            interim.projects[checkout] = structuredClone(entry);
        } else if (saved) {
            if (!plain(saved.claudeBefore) || typeof saved.codexBlock !== 'string' || typeof saved.codexPath !== 'string') throw new Error(`Invalid recovery state for ${checkout}`);
            for (const [name, previous] of Object.entries(saved.claudeBefore)) {
                if (overrides[name] === 'off') {
                    if (previous === null) delete overrides[name]; else overrides[name] = previous;
                } else if (!(overrides[name] === previous || (previous === null && overrides[name] === undefined))) {
                    throw new Error(`Claude skill ${name} changed while off; preserved it. Reconcile before restoring.`);
                }
            }
            const value = Object.keys(overrides).length || saved.claudeMemberExisted ? overrides : undefined;
            let restored = spliceTopLevelMember(currentText ?? '{}\n', 'skillOverrides', value);
            if (!saved.claudeFileExisted && Object.keys(json(restored, claudePath)).length === 0) restored = null;
            set(claudePath, restored);
            const codexText = get(saved.codexPath);
            if (saved.codexBlock && codexText?.includes(saved.codexBlock)) {
                const restoredCodex = codexText.replace(saved.codexBlock, '');
                set(saved.codexPath, !saved.codexFileExisted && restoredCodex === '' ? null : restoredCodex);
            } else if (saved.codexBlock && codexText?.includes(`CK:FRAMEWORK-SKILLS:${saved.id}:`)) {
                throw new Error(`Codex framework block changed; preserved it: ${saved.codexPath}`);
            }
            delete entry.disabled;
        }
        results.push({ root: checkout, mode: effective.mode, source: effective.source, skills: names.length,
            nativeSkills: effective.mode === 'off' ? 'disabled' : 'profile-restored', restartRequired: !!(names.length || saved) });
    }
    const writes = [...changes.values()].filter(change => change.before !== change.after);
    for (const change of writes) {
        assertSettingsPath(change.file);
    }
    return { registryPath: file, registryBefore: read(file), interim, registry, changes: writes, results };
}

function applyNativeSkills(plan) {
    // An interrupted write is recoverable by `apply`: the interim ledger keeps
    // the original skill policy, and each restore accepts already-restored keys.
    for (const change of plan.changes) {
        if (read(change.file) !== change.before) throw new Error(`Settings changed during planning: ${change.file}`);
        assertSettingsPath(change.file);
    }
    if (read(plan.registryPath) !== plan.registryBefore) throw new Error('Native registry changed during planning; retry.');
    atomic(plan.registryPath, `${JSON.stringify(plan.interim, null, 2)}\n`);
    for (const change of plan.changes) atomic(change.file, change.after);
    atomic(plan.registryPath, `${JSON.stringify(plan.registry, null, 2)}\n`);
    return plan.results;
}

function nativeStatus(rootDir, homeDir = os.homedir()) {
    const root = fs.realpathSync(rootDir);
    const entry = loadRegistry(registryPath(homeDir)).projects[root];
    const state = entry?.disabled;
    const settings = json(read(path.join(root, '.claude/settings.local.json')), 'Claude local settings');
    const disabled = !!state && catalog(root).every(({name}) => own(state.claudeBefore, name) && settings.skillOverrides?.[name] === 'off') &&
        (!state.codexBlock || (read(state.codexPath) || '').includes(state.codexBlock));
    const mode = resolveFrameworkMode({ rootDir: root, homeDir }).mode;
    return { registered: !!entry, skillsDisabled: disabled, recoveryPending: !!state && !disabled,
        needsApply: mode === 'off' ? catalog(root).length > 0 && !disabled : !!state,
        registryPath: registryPath(homeDir), hosts: ['claude', 'codex'], restartRequired: true };
}

function withNativeLock(action, homeDir = os.homedir()) {
    const file = `${registryPath(homeDir)}.lock`;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let fd;
    try { fd = fs.openSync(file, 'wx', 0o600); }
    catch (error) {
        if (error.code !== 'EEXIST') throw error;
        throw new Error(`Another framework-mode operation may be active. If its process has ended, remove this stale lock and retry: ${file}`);
    }
    try { fs.writeFileSync(fd, String(process.pid)); return action(); }
    finally { fs.closeSync(fd); fs.unlinkSync(file); }
}

module.exports = { planNativeSkills, applyNativeSkills, nativeStatus, registryPath, atomic, assertSettingsPath, assertCodexAppendable, withNativeLock };
