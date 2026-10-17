'use strict';

/**
 * Shared helpers for advisory prompt-router hooks (UserPromptSubmit).
 *
 * - `readUserPrompt(prompt)` — ONE host-block pass: `null` when the prompt is a host-generated
 *   envelope (task notifications, system reminders, command echoes are not user input), else the
 *   user-authored text with host blocks and code removed. The tag list is owned by
 *   `prompt-ledger-store.cjs` (HOST_TAGS); this module reuses its exported predicates.
 * - `stripCode(text)` — drop fenced and inline code so quoted commands never read as intent.
 * - `isRouterEnabled(section, envVar, deps)` — per-router opt-out: `.claude/.ck.json`
 *   `<section>.enabled: false` (overlaid by `.claude/.ck.local.json`) or `<envVar>=0`.
 * - `loadRouterSettings(projectDir, section)` — the whole merged `<section>` object, for a hook
 *   that reads more than the switch (`core-principles-inject.cjs` reads `reinjectAfterTokens`).
 * - `isHostEnvelope(prompt)` / `userPromptText(prompt)` — the two halves of `readUserPrompt`.
 * - `routedPrompt(input, deps)` / `routerOutput(input, text)` — the prompt a router classifies and the
 *   output form for its event, so a router that also runs at sub-agent start or after a compaction reads
 *   the session's latest recorded user prompt there (neither event carries one) and answers with a
 *   context envelope.
 * - `isHookEntryPoint(mod)` — re-exported from `hook-runner.cjs`, its owner.
 */

const fs = require('fs');
const path = require('path');
const { stripHostBlocks, isSyntheticPrompt } = require('./prompt-ledger-store.cjs');
const { isHookEntryPoint } = require('./hook-runner.cjs');

/** Replace code spans and backtick/tilde fenced blocks; preserve prose outside code. */
function stripCode(text) {
    const lines = String(text === undefined || text === null ? '' : text).split(/(\r\n|\r|\n)/);
    const prose = [];
    let fence = null;
    for (let i = 0; i < lines.length; i += 2) {
        const line = lines[i];
        const ending = lines[i + 1] || '';
        const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
        if (fence) {
            if (marker && marker[1][0] === fence.character && marker[1].length >= fence.length && /^[ \t]*$/.test(marker[2])) fence = null;
            prose.push(' ', ending);
        } else if (marker && (marker[1][0] === '~' || !marker[2].includes('`'))) {
            fence = { character: marker[1][0], length: marker[1].length };
            prose.push(' ', ending);
        } else {
            prose.push(line, ending);
        }
    }
    // Inline spans cannot cross a paragraph boundary. Retain that boundary verbatim.
    return prose.join('').split(/((?:\r\n|\r(?!\n)|(?<!\r)\n)[ \t]*(?:\r\n|\r(?!\n)|(?<!\r)\n))/)
        .map((paragraph, i) => i % 2 ? paragraph : stripInlineCode(paragraph)).join('');
}

function stripInlineCode(text) {
    const runs = Array.from(text.matchAll(/`+/g));
    const next = new Array(runs.length).fill(-1);
    const lastByLength = new Map();
    // Index matching run lengths once; repeated unmatched delimiters never rescan the suffix.
    for (let i = runs.length - 1; i >= 0; i -= 1) {
        const length = runs[i][0].length;
        next[i] = lastByLength.get(length) ?? -1;
        lastByLength.set(length, i);
    }
    const prose = [];
    let cursor = 0;
    for (let i = 0; i < runs.length; i += 1) {
        let backslashes = 0;
        for (let j = runs[i].index - 1; j >= 0 && text[j] === '\\'; j -= 1) backslashes += 1;
        if (backslashes % 2 || next[i] === -1) continue;
        const closing = next[i];
        prose.push(text.slice(cursor, runs[i].index), ' ');
        cursor = runs[closing].index + runs[closing][0].length;
        i = closing;
    }
    prose.push(text.slice(cursor));
    return prose.join('');
}

const LEADING_TAG = /^\s*<([A-Za-z][\w-]*)\b/;

/** True when `text` opens with a host wrapper tag. Tests only the tag, so it costs no host-block scan. */
function opensWithHostTag(text) {
    const lead = LEADING_TAG.exec(text);
    return Boolean(lead) && isSyntheticPrompt(`<${lead[1]}>`);
}

/**
 * Host blocks removed, or `null` when the prompt is, or starts with, a host-generated envelope:
 * the raw prompt's first tag is a host tag, nothing is left once host blocks are removed, or the
 * remainder opens with a host tag (a truncated/unclosed block). Scans the host-block regex once.
 */
function stripHostEnvelope(prompt) {
    if (typeof prompt !== 'string' || opensWithHostTag(prompt)) return null;
    const stripped = stripHostBlocks(prompt);
    return stripped === '' || opensWithHostTag(stripped) ? null : stripped;
}

/** `null` for a host envelope, else the user-authored prompt text (host blocks and code removed). */
function readUserPrompt(prompt) {
    const stripped = stripHostEnvelope(prompt);
    return stripped === null ? null : stripCode(stripped);
}

/** True when the prompt is, or starts with, a host-generated envelope. */
function isHostEnvelope(prompt) {
    return typeof prompt === 'string' && stripHostEnvelope(prompt) === null;
}

/** User-authored prompt text: host blocks and code removed. */
function userPromptText(prompt) {
    return stripCode(stripHostBlocks(prompt));
}

/**
 * The prompt a router classifies for this event, or `null` to stay silent. A prompt event carries its
 * own text. A sub-agent start and the host's compaction report carry none, so the router reads the
 * latest user prompt the session's prompt ledger recorded: the request driving the turn that delegated
 * or was compacted (host-generated payloads are never recorded). No session id, no ledger or an
 * unreadable one → `null`. Any other event → `null`.
 * deps (tests): env, projectDir.
 */
function routedPrompt(input, deps = {}) {
    const event = input && input.hook_event_name;
    if (!event || event === 'UserPromptSubmit') return input ? input.prompt : null;
    if (event !== 'SubagentStart' && !require('./convention-ledger.cjs').isCompactionStart(input)) return null;
    try {
        const sessionId = input.session_id;
        if (typeof sessionId !== 'string' || !sessionId.trim()) return null;
        const env = deps.env || process.env;
        const projectDir = deps.projectDir || require('./project-root.cjs').resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env }).rootDir;
        const store = require('./prompt-ledger-store.cjs');
        const { ledger } = store.readLedgerStatus(store.sessionDir(store.storeRoot(env, projectDir), sessionId));
        const latest = ledger && ledger.entries[ledger.entries.length - 1];
        return latest && typeof latest.text === 'string' ? latest.text : null;
    } catch {
        return null; // advisory: an unreadable ledger leaves the agent to the universal rules
    }
}

/** A router's text in its event's form: plain text for a prompt, the context envelope for any other event. */
function routerOutput(input, text) {
    const event = input && input.hook_event_name;
    if (!text || !event || event === 'UserPromptSubmit') return text;
    return JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: text.trimEnd() } });
}

const OFF_VALUES = new Set(['0', 'off', 'false', 'no', 'disabled']);

function readJsonObject(file) {
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
        return null; // absent or unreadable config never disables a router
    }
}

/** `<section>` from `.claude/.ck.json` overlaid by `.claude/.ck.local.json` (local wins per key). */
function loadRouterSettings(projectDir, section) {
    const merged = {};
    for (const name of ['.ck.json', '.ck.local.json']) {
        const config = readJsonObject(path.join(projectDir, '.claude', name));
        const value = config && config[section];
        if (value && typeof value === 'object' && !Array.isArray(value)) Object.assign(merged, value);
    }
    return merged;
}

const isOff = value => typeof value === 'string' && OFF_VALUES.has(value.trim().toLowerCase());

/** Effective runtime skill selection for a hook, with the same explicit fixture/root seams as routers. */
function resolveHookSkillAutoTrigger(deps = {}) {
    const env = deps.env || process.env;
    const projectDir = deps.projectDir || require('./project-root.cjs').resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env }).rootDir;
    return require('../../scripts/lib/workflow-routing-config.cjs').resolveSkillAutoTrigger({ rootDir: projectDir, env, homeDir: deps.homeDir });
}

/**
 * False when the router is switched off: `.ck.json` `<section>.enabled: false` (or a hand-typed
 * "false"/"0"/"no"/"off") or `<envVar>` set to one of those values. On by default.
 * deps (tests): env, projectDir, rawSettings.
 */
function isRouterEnabled(section, envVar, deps = {}) {
    const env = deps.env || process.env;
    if (isOff(env[envVar])) return false;
    let settings = deps.rawSettings;
    if (settings === undefined) {
        let projectDir = deps.projectDir;
        if (!projectDir) {
            const { resolveProjectRoot } = require('./project-root.cjs');
            projectDir = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env }).rootDir;
        }
        settings = loadRouterSettings(projectDir, section);
    }
    const enabled = settings && typeof settings === 'object' ? settings.enabled : undefined;
    return enabled !== false && !isOff(enabled);
}

module.exports = {
    isHookEntryPoint,
    stripCode,
    readUserPrompt,
    isHostEnvelope,
    userPromptText,
    routedPrompt,
    routerOutput,
    loadRouterSettings,
    resolveHookSkillAutoTrigger,
    isRouterEnabled
};
