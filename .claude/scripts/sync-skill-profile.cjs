#!/usr/bin/env node
'use strict';

/**
 * Skill profile → Claude `skillOverrides`.
 *
 *   node .claude/scripts/sync-skill-profile.cjs           # write
 *   node .claude/scripts/sync-skill-profile.cjs --check   # read-only; non-zero when stale or refused
 *
 * Source: the project config's `skillProfile` section (the file `.claude/.ck.json`
 * `portability.projectConfigPath` points at; default docs/project-config.json) plus the presets and
 * the curated called-skill list in `.claude/config/skill-profiles.json`.
 *
 * `resolveProfile(root, config)` owns the host-independent rules and is shared with the Codex and
 * OpenCode generators: preset + lists → `overrides` (skill → nameOnly | commandOnly | off), the
 * `called` set (workflow steps in every mode, agent `skills:` entries and the curated calledByOthers
 * and entrySkills lists), the
 * `refusals` and the `warnings`. A called skill in commandOnly or off is refused on every host unless
 * `skillProfile.allowHidingCalledSkills` is true; with the opt-in it is written and still named in a
 * warning line. nameOnly stays callable, so it is allowed for any skill.
 *
 * Writer (team `.claude/settings.json`; personal choices belong in `.claude/settings.local.json`):
 *   - A missing or invalid settings file stops the run before anything is written; a parse failure
 *     is never turned into `{}`.
 *   - Only the top-level `skillOverrides` member changes. Its text span is located with a
 *     string-aware scan and replaced (or inserted before the final `}`); every other byte is kept,
 *     because a full re-serialize would reflow the one-line arrays of the rest of the file.
 *   - The new text is re-parsed; every other top-level key must be deep-equal to the original or
 *     nothing is written. The write is a temp file in `.claude/` renamed over the target.
 *   - Crash-consistent pair: the ledger holding the union of the owned keys before and after is
 *     written first, then the settings, then the final ledger, so an interruption never leaves a
 *     generator key unrecorded (which would make it the user's forever).
 *   - Ownership: only keys recorded in `.claude/skill-profile.generated.json`, each with the value
 *     written, belong to this generator — the same rules as the OpenCode permission ledger. A key
 *     that existed before the generator wrote it is the user's and is never adopted. An owned key the
 *     user changed is kept and reported with one `conflict:` line. A deleted owned key is restored.
 *     The ledger records the project config's `project.name`; a ledger from another project is
 *     ignored with one warning line.
 *   - No profile and no owned keys → nothing is read or written.
 *
 * Runs from `/project-config` guidance and the close phase; never from a hook.
 * PORTABILITY CONTRACT: `node:` built-ins + `.cjs` modules inside `.claude/scripts/lib`.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { isInvokedAsScript, resolveMutationProjectRoot } = require('./lib/project-root.cjs');
const { resolveAllWorkflowManifests } = require('./lib/workflow-manifest.cjs');
const { resolveProjectConfigPath } = require('./lib/workflow-routing-config.cjs');

const PRESETS_RELATIVE = path.join('.claude', 'config', 'skill-profiles.json');
const SETTINGS_RELATIVE = path.join('.claude', 'settings.json');
const LEDGER_RELATIVE = path.join('.claude', 'skill-profile.generated.json');
const SKILLS_RELATIVE = path.join('.claude', 'skills');
const AGENTS_RELATIVE = path.join('.claude', 'agents');
const WORKFLOWS_RELATIVE = path.join('.claude', 'workflows.json');

/** The settings member this generator owns. */
const MEMBER = 'skillOverrides';
/** Profile lists, least to most restrictive. */
const PROFILE_LISTS = Object.freeze(['nameOnly', 'commandOnly', 'off']);
/** Lists that make a Skill-tool call fail, so they must never land on a called skill by accident. */
const HIDING_LISTS = new Set(['commandOnly', 'off']);
const PRESET_NAMES = Object.freeze(['full', 'standard', 'minimal']);
/** Claude `skillOverrides` value per profile list. */
const CLAUDE_VALUES = Object.freeze({ nameOnly: 'name-only', commandOnly: 'user-invocable-only', off: 'off' });
const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const CALLED_LIST_LABEL = 'the calledByOthers list';
/** Entry skills (workflow runner, setup skills) are started by routing gates and hooks, so they are protected too. */
const ENTRY_LIST_LABEL = 'the entrySkills list';
const LEDGER_DESCRIPTION =
    'Keys this generator owns in .claude/settings.json skillOverrides, with the value it wrote (node .claude/scripts/sync-skill-profile.cjs). Bound to the project named in "project": a ledger from another project is ignored.';
const PREFIX = 'skill-profile:';

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const toPosix = value => value.split(path.sep).join('/');

function readTextIfExists(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

function parseJson(text, role, filePath) {
    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(`${role} is not valid JSON (${filePath}): ${error.message}`);
    }
}

// ─── Inputs ────────────────────────────────────────────────────────────────

/** The YAML frontmatter block of a markdown file as raw lines; [] when there is none. */
function frontmatterLines(text) {
    const lines = String(text).replace(/^﻿/, '').split(/\r?\n/);
    if (lines[0].trim() !== '---') return [];
    const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    return end === -1 ? [] : lines.slice(1, end);
}

/** A frontmatter key's value: the inline text plus any `- item` lines under it. */
function frontmatterValue(lines, key) {
    const index = lines.findIndex(line => new RegExp(`^${key}\\s*:`).test(line));
    if (index === -1) return null;
    const parts = [lines[index].replace(new RegExp(`^${key}\\s*:`), '')];
    for (let next = index + 1; next < lines.length && /^\s+-\s/.test(lines[next]); next += 1) parts.push(lines[next]);
    return parts.join(' ');
}

/** Split a frontmatter list value (`a, b`, `[a, b]`, or `- a - b`) into names. */
function parseNameList(value) {
    if (typeof value !== 'string') return [];
    return value
        .replace(/^\s*\[|\]\s*$/g, '')
        .split(/[,\s]+/)
        .map(item => item.replace(/^["']|["']$/g, '').trim())
        .filter(item => item && item !== '-');
}

/** Skill folders with a SKILL.md: name → { manual } (manual = frontmatter disable-model-invocation: true). */
function readSkillCatalog(root) {
    const dir = path.join(root, SKILLS_RELATIVE);
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
        if (error.code === 'ENOENT') return new Map();
        throw error;
    }
    const skills = new Map();
    for (const entry of entries.filter(item => item.isDirectory()).sort((a, b) => byCodeUnit(a.name, b.name))) {
        const text = readTextIfExists(path.join(dir, entry.name, 'SKILL.md'));
        if (text === null || !SKILL_NAME_PATTERN.test(entry.name)) continue;
        const flag = frontmatterValue(frontmatterLines(text), 'disable-model-invocation');
        skills.set(entry.name, { manual: typeof flag === 'string' && flag.trim().replace(/^["']|["']$/g, '') === 'true' });
    }
    return skills;
}

/** Each agent's `skills:` frontmatter list. */
function readAgentSkillLists(root) {
    const dir = path.join(root, AGENTS_RELATIVE);
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
    const lists = [];
    for (const entry of entries.filter(item => item.isFile() && /\.md$/i.test(item.name)).sort((a, b) => byCodeUnit(a.name, b.name))) {
        const skills = parseNameList(frontmatterValue(frontmatterLines(fs.readFileSync(path.join(dir, entry.name), 'utf8')), 'skills'));
        if (skills.length > 0) lists.push({ agent: entry.name.replace(/\.md$/i, ''), skills });
    }
    return lists;
}

/** Raw step names of every mode of one workflow (fallback when the manifest resolver rejects it). */
function rawWorkflowStepSkills(workflow) {
    const sequences = [];
    if (Array.isArray(workflow?.sequence)) sequences.push(workflow.sequence);
    if (isPlainObject(workflow?.variants)) {
        for (const variant of Object.values(workflow.variants)) if (Array.isArray(variant?.sequence)) sequences.push(variant.sequence);
    }
    const names = new Set();
    for (const step of sequences.flat()) {
        const name = typeof step === 'string' ? step.trim().split(/\s+/, 1)[0] : step?.skill;
        if (typeof name === 'string' && name) names.add(name);
    }
    return names;
}

/**
 * Called set: skill → sorted caller labels, from every workflow step (all modes), every agent
 * `skills:` entry, the curated calledByOthers list and the entrySkills list. The two curated lists
 * stay separate on purpose: calledByOthers is also the `standard` preset's nameOnly selector, while
 * entrySkills (the workflow runner and the setup skills routing gates and hooks start) must be
 * protected without being made name-only. A workflows file that exists but is not valid JSON throws:
 * without it the protected set would be incomplete.
 */
function computeCalledSkills(root, curated, entry, warnings) {
    const called = new Map();
    const add = (name, caller) => {
        if (!called.has(name)) called.set(name, new Set());
        called.get(name).add(caller);
    };
    const workflowsPath = path.join(root, WORKFLOWS_RELATIVE);
    const text = readTextIfExists(workflowsPath);
    const document = text === null ? null : parseJson(text, 'workflows catalog', workflowsPath);
    if (document !== null && !isPlainObject(document.workflows)) throw new Error(`workflows catalog has no "workflows" map: ${workflowsPath}`);
    for (const workflowId of Object.keys(document?.workflows || {}).sort(byCodeUnit)) {
        let names;
        try {
            names = new Set(resolveAllWorkflowManifests(document, workflowId, { rootDir: root }).flatMap(manifest => manifest.occurrences.map(step => step.skill)));
        } catch (error) {
            names = rawWorkflowStepSkills(document.workflows[workflowId]);
            warnings.push(`workflow ${workflowId} did not resolve (${error.message}); protected its raw step names instead`);
        }
        for (const name of names) add(name, `workflow ${workflowId}`);
    }
    for (const { agent, skills } of readAgentSkillLists(root)) for (const name of skills) add(name, `agent ${agent}`);
    for (const name of curated) add(name, CALLED_LIST_LABEL);
    for (const name of entry) add(name, ENTRY_LIST_LABEL);
    return new Map([...called].sort(([a], [b]) => byCodeUnit(a, b)).map(([name, callers]) => [name, [...callers].sort(byCodeUnit)]));
}

/** Parse `.claude/config/skill-profiles.json`; null when it is absent. */
function readPresets(root, presetsPath) {
    const filePath = presetsPath || path.join(root, PRESETS_RELATIVE);
    const text = readTextIfExists(filePath);
    if (text === null) return null;
    const data = parseJson(text, 'skill presets', filePath);
    const names = value => (Array.isArray(value?.skills) && value.skills.every(item => typeof item === 'string') ? value.skills : null);
    const calledByOthers = names(data?.calledByOthers);
    const entrySkills = names(data?.entrySkills);
    if (!calledByOthers || !entrySkills || !isPlainObject(data?.presets)) {
        throw new Error(`skill presets must hold calledByOthers.skills, entrySkills.skills and a presets map: ${filePath}`);
    }
    return { calledByOthers, entrySkills, presets: data.presets, filePath };
}

// ─── Resolver (host-independent) ───────────────────────────────────────────

function formatRefusal({ skill, list, callers }) {
    return `${PREFIX} refusing to hide ${skill} (${list}): started by ${callers.join(', ')}; set skillProfile.allowHidingCalledSkills: true to allow`;
}

/** The skills one preset makes nameOnly. */
function presetNameOnly(preset, presets, catalog) {
    const spec = presets.presets[preset];
    if (!isPlainObject(spec)) throw new Error(`skill preset "${preset}" is not defined in ${presets.filePath}`);
    const value = spec.nameOnly === undefined ? [] : spec.nameOnly;
    if (Array.isArray(value)) return value;
    if (value === 'calledByOthers') return presets.calledByOthers;
    if (value === 'allExceptEntry') {
        const keep = new Set(presets.entrySkills);
        return [...catalog].filter(([name, info]) => !keep.has(name) && !info.manual).map(([name]) => name);
    }
    throw new Error(`skill preset "${preset}" has an unknown nameOnly selector ${JSON.stringify(value)} in ${presets.filePath}`);
}

/**
 * Resolve a project's skill profile. Throws on a malformed profile or presets file (never guesses).
 * @param {string} root project root (the directory holding `.claude/`)
 * @param {object|null} config parsed project config
 * @param {{presetsPath?: string}} [options]
 * @returns {{declared: boolean, overrides: Record<string, string>, called: Map<string, string[]>, refusals: Array<{skill: string, list: string, callers: string[], message: string}>, warnings: string[]}}
 *   `overrides` maps a skill to nameOnly | commandOnly | off (host-neutral; refused entries left out).
 */
function resolveProfile(root, config, options = {}) {
    const warnings = [];
    const profile = config?.skillProfile;
    const declared = profile !== undefined && profile !== null;
    if (declared && !isPlainObject(profile)) throw new Error('skillProfile must be an object');
    const presets = readPresets(root, options.presetsPath);
    if (declared && presets === null) throw new Error(`skill presets file is missing: ${toPosix(PRESETS_RELATIVE)}`);
    const called = computeCalledSkills(root, presets ? presets.calledByOthers : [], presets ? presets.entrySkills : [], warnings);
    if (!declared) return { declared, overrides: {}, called, refusals: [], warnings };

    if (profile.preset !== undefined && !PRESET_NAMES.includes(profile.preset)) {
        throw new Error(`skillProfile.preset must be one of ${PRESET_NAMES.join('|')}, got ${JSON.stringify(profile.preset)}`);
    }
    if (profile.allowHidingCalledSkills !== undefined && typeof profile.allowHidingCalledSkills !== 'boolean') {
        throw new Error('skillProfile.allowHidingCalledSkills must be a boolean');
    }
    const catalog = readSkillCatalog(root);
    const listed = new Map();
    for (const list of PROFILE_LISTS) {
        const names = profile[list] === undefined ? [] : profile[list];
        if (!Array.isArray(names) || !names.every(name => typeof name === 'string' && SKILL_NAME_PATTERN.test(name))) {
            throw new Error(`skillProfile.${list} must be an array of skill folder names`);
        }
        for (const name of names) {
            if (listed.has(name) && listed.get(name) !== list) throw new Error(`skill ${name} is in both skillProfile.${listed.get(name)} and skillProfile.${list}; keep it in one list`);
            listed.set(name, list);
        }
    }

    const chosen = new Map();
    // Preset names the project does not ship are skipped silently: the preset is framework data.
    for (const name of presetNameOnly(profile.preset || 'full', presets, catalog)) if (catalog.has(name)) chosen.set(name, 'nameOnly');
    for (const [name, list] of listed) {
        if (!catalog.has(name)) {
            warnings.push(`unknown skill ${name} in skillProfile.${list} (no ${toPosix(path.join(SKILLS_RELATIVE, name, 'SKILL.md'))}); skipped`);
            continue;
        }
        chosen.set(name, list);
    }

    const overrides = {};
    const refusals = [];
    for (const name of [...chosen.keys()].sort(byCodeUnit)) {
        const list = chosen.get(name);
        if (HIDING_LISTS.has(list) && called.has(name)) {
            const entry = { skill: name, list, callers: called.get(name) };
            if (profile.allowHidingCalledSkills !== true) {
                refusals.push({ ...entry, message: formatRefusal(entry) });
                continue;
            }
            warnings.push(`hiding called skill ${name} (${list}): started by ${entry.callers.join(', ')} (allowHidingCalledSkills is true)`);
        }
        overrides[name] = list;
    }
    return { declared, overrides, called, refusals, warnings };
}

/** Claude `skillOverrides` values for a resolved profile. */
function claudeOverrides(overrides) {
    return new Map(Object.keys(overrides).sort(byCodeUnit).map(name => [name, CLAUDE_VALUES[overrides[name]]]));
}

// ─── Ownership merge (same rules as the OpenCode permission ledger) ────────

/**
 * Merge desired entries into the current `skillOverrides` map. Pure.
 * @param {Record<string, string>|undefined} current
 * @param {Record<string, string>} ownedBefore
 * @param {Map<string, string>} desired
 * @returns {{value: Record<string, string>, owned: Record<string, string>, conflicts: string[], changed: boolean}}
 */
function mergeOverrides(current, ownedBefore, desired) {
    const value = { ...(current || {}) };
    const owned = { ...ownedBefore };
    const conflicts = [];
    let changed = false;
    const conflict = (name, now, want) => conflicts.push(`conflict: ${MEMBER}.${name} is ${JSON.stringify(now)}, generator wants ${want === null ? 'no entry' : JSON.stringify(want)}; kept the user value`);
    for (const name of [...new Set([...desired.keys(), ...Object.keys(ownedBefore)])].sort(byCodeUnit)) {
        const want = desired.has(name) ? desired.get(name) : null;
        const present = own(value, name);
        const now = present ? value[name] : undefined;
        if (!own(owned, name)) {
            // Never adopted: a pre-existing key is the user's, even when it already equals the wanted value.
            if (present) {
                if (want !== null && !isDeepStrictEqual(now, want)) conflict(name, now, want);
                continue;
            }
            if (want !== null) {
                value[name] = want;
                owned[name] = want;
                changed = true;
            }
            continue;
        }
        if (present && !isDeepStrictEqual(now, owned[name])) {
            // The user edited an owned key. Keep it; resume ownership only when it already equals the wanted value.
            if (want !== null && isDeepStrictEqual(now, want)) {
                owned[name] = want;
                continue;
            }
            conflict(name, now, want);
            if (want === null) delete owned[name];
            continue;
        }
        if (want === null) {
            if (present) {
                delete value[name];
                changed = true;
            }
            delete owned[name];
            continue;
        }
        if (!present || !isDeepStrictEqual(now, want)) {
            value[name] = want;
            changed = true;
        }
        owned[name] = want;
    }
    return { value, owned, conflicts, changed };
}

// ─── Text splice ───────────────────────────────────────────────────────────

function skipWhitespace(text, index) {
    while (index < text.length && /\s/.test(text[index])) index += 1;
    return index;
}

function skipString(text, index) {
    for (let i = index + 1; i < text.length; i += 1) {
        if (text[i] === '\\') i += 1;
        else if (text[i] === '"') return i + 1;
    }
    throw new Error('unterminated string');
}

/** Index just past the JSON value starting at `index`; string-aware for nested brackets. */
function skipValue(text, index) {
    const first = text[index];
    if (first === '"') return skipString(text, index);
    if (first === '{' || first === '[') {
        let depth = 0;
        for (let i = index; i < text.length; i += 1) {
            const char = text[i];
            if (char === '"') i = skipString(text, i) - 1;
            else if (char === '{' || char === '[') depth += 1;
            else if (char === '}' || char === ']') {
                depth -= 1;
                if (depth === 0) return i + 1;
            }
        }
        throw new Error('unterminated container');
    }
    let i = index;
    while (i < text.length && !/[\s,}\]]/.test(text[i])) i += 1;
    return i;
}

/** Top-level members of a JSON object text: [{ key, keyStart, valueStart, valueEnd }] plus the brace indices. */
function scanTopLevelMembers(text) {
    let i = skipWhitespace(text, text.charCodeAt(0) === 0xfeff ? 1 : 0);
    if (text[i] !== '{') throw new Error('top level is not an object');
    const open = i;
    const members = [];
    i = skipWhitespace(text, i + 1);
    if (text[i] !== '}') {
        for (;;) {
            if (text[i] !== '"') throw new Error(`expected a member name at offset ${i}`);
            const keyStart = i;
            i = skipString(text, i);
            const key = JSON.parse(text.slice(keyStart, i));
            i = skipWhitespace(text, i);
            if (text[i] !== ':') throw new Error(`expected ":" at offset ${i}`);
            const valueStart = skipWhitespace(text, i + 1);
            const valueEnd = skipValue(text, valueStart);
            members.push({ key, keyStart, valueStart, valueEnd });
            i = skipWhitespace(text, valueEnd);
            if (text[i] === ',') {
                i = skipWhitespace(text, i + 1);
                continue;
            }
            if (text[i] === '}') break;
            throw new Error(`expected "," or "}" at offset ${i}`);
        }
    }
    const close = i;
    if (skipWhitespace(text, close + 1) !== text.length) throw new Error('text after the top-level object');
    return { open, close, members };
}

/** Indentation of the line that holds `index`. */
function lineIndent(text, index) {
    const lineStart = text.lastIndexOf('\n', index - 1) + 1;
    return /^[ \t]*/.exec(text.slice(lineStart, index))[0];
}

/** `value` as JSON with a 2-space unit, continuation lines indented by `indent`. */
function renderMemberValue(value, indent, eol) {
    return JSON.stringify(value, null, 2).split('\n').join(`${eol}${indent}`);
}

/**
 * Replace, insert or remove the top-level `key` member of a JSON object text, leaving every byte
 * outside that member unchanged. `value === undefined` removes the member.
 */
function spliceTopLevelMember(text, key, value) {
    const { open, close, members } = scanTopLevelMembers(text);
    const matches = members.filter(member => member.key === key);
    if (matches.length > 1) throw new Error(`"${key}" appears ${matches.length} times at the top level`);
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const target = matches[0];
    if (target) {
        if (value !== undefined) {
            const rendered = renderMemberValue(value, lineIndent(text, target.keyStart), eol);
            return text.slice(0, target.valueStart) + rendered + text.slice(target.valueEnd);
        }
        const index = members.indexOf(target);
        if (index > 0) return text.slice(0, members[index - 1].valueEnd) + text.slice(target.valueEnd);
        if (members.length > 1) return text.slice(0, target.keyStart) + text.slice(members[1].keyStart);
        return text.slice(0, open + 1) + text.slice(close);
    }
    if (value === undefined) return text;
    if (members.length === 0) {
        return `${text.slice(0, open + 1)}${eol}  ${JSON.stringify(key)}: ${renderMemberValue(value, '  ', eol)}${eol}${text.slice(close)}`;
    }
    const last = members[members.length - 1];
    const indent = lineIndent(text, members[0].keyStart) || '  ';
    return `${text.slice(0, last.valueEnd)},${eol}${indent}${JSON.stringify(key)}: ${renderMemberValue(value, indent, eol)}${text.slice(last.valueEnd)}`;
}

/** Throw unless `next` differs from `before` only in `key` (which must equal `expected`, or be absent when undefined). */
function assertOnlyMemberChanged(before, next, key, expected) {
    const outside = object => Object.keys(object).filter(name => name !== key).sort(byCodeUnit);
    if (!isDeepStrictEqual(outside(before), outside(next))) throw new Error('self-check failed: the top-level key set changed');
    for (const name of outside(before)) {
        if (!isDeepStrictEqual(before[name], next[name])) throw new Error(`self-check failed: top-level key "${name}" changed`);
    }
    if (expected === undefined ? own(next, key) : !isDeepStrictEqual(next[key], expected)) {
        throw new Error(`self-check failed: "${key}" does not hold the intended value`);
    }
}

/** Temp file beside the target, renamed over it. A failed write leaves no temp file. */
function writeTextAtomic(file, text) {
    let temp = null;
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
        fs.writeFileSync(temp, text, 'utf8');
        fs.renameSync(temp, file);
    } catch (error) {
        if (temp) {
            try {
                fs.unlinkSync(temp);
            } catch {
                /* never created, or already gone */
            }
        }
        throw new Error(`could not write ${file}: ${error.message}`);
    }
}

// ─── Ledger ────────────────────────────────────────────────────────────────

/**
 * The owned map to record BEFORE the target file is written: every key owned before or after this
 * sync, with the value from before when both hold it. Writing it first, then the target, then the
 * final ledger means an interruption at any point leaves every generator key recorded with a value
 * the next run reconciles without a conflict line: a key not yet written is restored, a key already
 * removed is dropped, and a key already changed equals the wanted value. Shared with the OpenCode
 * permission writer.
 * @param {Record<string, string>} before
 * @param {Record<string, string>} after
 * @returns {Record<string, string>}
 */
function ownedUnion(before, after) {
    return { ...after, ...before };
}

function readLedger(text, ledgerPath, project) {
    if (text === null) return { owned: {}, ignored: null };
    const document = parseJson(text, 'skill profile ledger', ledgerPath);
    if (isPlainObject(document) && (!own(document, 'project') || document.project !== project)) {
        const recorded = own(document, 'project') ? JSON.stringify(document.project) : 'none recorded';
        return {
            owned: {},
            ignored: `warning: ignored ${toPosix(LEDGER_RELATIVE)}: it belongs to another project (ledger project: ${recorded}; this project: ${JSON.stringify(project)}); every existing ${MEMBER} entry is treated as the user's`
        };
    }
    const owned = document?.[MEMBER];
    if (!isPlainObject(owned) || !Object.values(owned).every(value => typeof value === 'string')) {
        throw new Error(`skill profile ledger must hold a "${MEMBER}" map of string values: ${ledgerPath}`);
    }
    return { owned: { ...owned }, ignored: null };
}

function renderLedger(owned, project) {
    const sorted = Object.fromEntries(Object.keys(owned).sort(byCodeUnit).map(name => [name, owned[name]]));
    return `${JSON.stringify({ description: LEDGER_DESCRIPTION, project, [MEMBER]: sorted }, null, 2)}\n`;
}

// ─── Plan / write / check ──────────────────────────────────────────────────

/**
 * Compute one sync without writing. Throws on any unreadable or invalid input.
 * @returns {object} plan: refusals, warnings, conflicts, settings/ledger text and change flags
 */
function planSkillProfile({ rootDir, presetsPath } = {}) {
    const root = rootDir;
    const configPath = resolveProjectConfigPath(root);
    const configText = readTextIfExists(configPath);
    const config = configText === null ? null : parseJson(configText, 'project config', configPath);
    const project = typeof config?.project?.name === 'string' && config.project.name.trim() ? config.project.name : null;
    const resolved = resolveProfile(root, config, { presetsPath });
    const plan = { root, resolved, refusals: resolved.refusals, warnings: [...resolved.warnings], conflicts: [], settingsChanged: false, ledgerChanged: false, settingsPath: path.join(root, SETTINGS_RELATIVE), ledgerPath: path.join(root, LEDGER_RELATIVE) };
    if (plan.refusals.length > 0) return plan;

    const ledgerCurrent = readTextIfExists(plan.ledgerPath);
    const ledger = readLedger(ledgerCurrent, plan.ledgerPath, project);
    if (ledger.ignored) plan.warnings.unshift(ledger.ignored);
    const desired = claudeOverrides(resolved.overrides);
    plan.desired = desired;
    if (desired.size === 0 && Object.keys(ledger.owned).length === 0) return plan;

    const settingsText = readTextIfExists(plan.settingsPath);
    if (settingsText === null) throw new Error(`settings file is missing: ${plan.settingsPath}`);
    const settings = parseJson(settingsText, 'settings', plan.settingsPath);
    if (!isPlainObject(settings)) throw new Error(`settings is not a JSON object: ${plan.settingsPath}`);
    const current = settings[MEMBER];
    if (current !== undefined && !isPlainObject(current)) {
        throw new Error(`${MEMBER} in ${plan.settingsPath} is ${JSON.stringify(current)}, not a map; fix it by hand, then re-run`);
    }
    const merge = mergeOverrides(current, ledger.owned, desired);
    plan.conflicts = merge.conflicts;
    if (merge.changed) {
        // A map emptied by removing the generator's own keys goes away with them, so a profile that is
        // removed again leaves no empty member behind. An untouched user `{}` never reaches this branch.
        const nextValue = Object.keys(merge.value).length === 0 ? undefined : merge.value;
        const nextText = spliceTopLevelMember(settingsText, MEMBER, nextValue);
        assertOnlyMemberChanged(settings, parseJson(nextText, 'rewritten settings', plan.settingsPath), MEMBER, nextValue);
        plan.settingsText = nextText;
        plan.settingsChanged = nextText !== settingsText;
    }
    const ledgerWanted = ledgerCurrent === null && Object.keys(merge.owned).length === 0 ? null : renderLedger(merge.owned, project);
    plan.ledgerCurrent = ledgerCurrent;
    plan.ledgerText = ledgerWanted;
    plan.ledgerChanged = ledgerWanted !== null && ledgerWanted !== ledgerCurrent;
    plan.ledgerInterimText = plan.settingsChanged ? renderLedger(ownedUnion(ledger.owned, merge.owned), project) : null;
    return plan;
}

/**
 * Write the planned settings member and ledger, crash-consistent: the ledger holding the union of the
 * owned keys before and after goes first, then the settings, then the final ledger (see ownedUnion).
 * Nothing is written when there are refusals.
 */
function syncSkillProfile(options = {}) {
    const plan = planSkillProfile(options);
    if (plan.refusals.length > 0) return plan;
    writePairCrashConsistent(plan, {
        targetChanged: plan.settingsChanged,
        writeTarget: () => writeTextAtomic(plan.settingsPath, plan.settingsText),
        writeLedger: text => writeTextAtomic(plan.ledgerPath, text)
    });
    return plan;
}

/**
 * The write order both profile generators share: interim ledger (union) → target → final ledger.
 * Each step is skipped when the bytes on disk already match.
 * @param {{ledgerCurrent: string|null, ledgerInterimText: string|null, ledgerText: string|null}} plan
 * @param {{targetChanged: boolean, writeTarget: Function, writeLedger: Function}} io
 */
function writePairCrashConsistent(plan, { targetChanged, writeTarget, writeLedger }) {
    let ledgerOnDisk = plan.ledgerCurrent ?? null;
    if (targetChanged) {
        if (typeof plan.ledgerInterimText === 'string' && plan.ledgerInterimText !== ledgerOnDisk) {
            writeLedger(plan.ledgerInterimText);
            ledgerOnDisk = plan.ledgerInterimText;
        }
        writeTarget();
    }
    if (typeof plan.ledgerText === 'string' && plan.ledgerText !== ledgerOnDisk) writeLedger(plan.ledgerText);
}

function main(argv = process.argv.slice(2)) {
    const check = argv.includes('--check');
    try {
        const { rootDir } = resolveMutationProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env });
        const plan = check ? planSkillProfile({ rootDir }) : syncSkillProfile({ rootDir });
        for (const line of plan.warnings) console.log(`${PREFIX} ${line}`);
        for (const line of plan.conflicts) console.log(`${PREFIX} ${line}`);
        if (plan.refusals.length > 0) {
            for (const refusal of plan.refusals) console.error(refusal.message);
            console.error(`${PREFIX} nothing was written`);
            return 1;
        }
        const relative = file => toPosix(path.relative(rootDir, file));
        if (check) {
            const stale = [plan.settingsChanged && `${relative(plan.settingsPath)} ${MEMBER} is stale`, plan.ledgerChanged && `${relative(plan.ledgerPath)} is stale`].filter(Boolean);
            for (const reason of stale) console.error(`${PREFIX} ${reason}`);
            if (stale.length > 0) {
                console.error(`${PREFIX} run: node .claude/scripts/sync-skill-profile.cjs`);
                return 1;
            }
            console.log(`${PREFIX} ${MEMBER} is current`);
            return 0;
        }
        const count = plan.desired ? plan.desired.size : 0;
        const verb = plan.settingsChanged || plan.ledgerChanged ? 'updated' : 'already current:';
        console.log(`${PREFIX} ${verb} ${MEMBER} (${count} profile entr${count === 1 ? 'y' : 'ies'})`);
        return 0;
    } catch (error) {
        console.error(`${PREFIX} ${error.message}; nothing was written`);
        return 1;
    }
}

module.exports = {
    CLAUDE_VALUES,
    LEDGER_RELATIVE,
    PRESETS_RELATIVE,
    PROFILE_LISTS,
    SETTINGS_RELATIVE,
    assertOnlyMemberChanged,
    claudeOverrides,
    formatRefusal,
    mergeOverrides,
    ownedUnion,
    planSkillProfile,
    resolveProfile,
    scanTopLevelMembers,
    spliceTopLevelMember,
    syncSkillProfile,
    writePairCrashConsistent,
    writeTextAtomic
};

if (isInvokedAsScript(process.argv[1], __filename)) {
    process.exitCode = main();
}
