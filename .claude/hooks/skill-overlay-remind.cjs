#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * Skill overlay reminder — when a skill activates, name the project overlay files that apply to it.
 *
 * A project may layer additive rules onto a framework skill through the skill-protocol registry
 * (`skill-protocols-reference.md` under the project-reference root, both resolved from the project
 * config `referenceDocs` / `docsRoots`). The universal protocol `project-protocol-overlay` is the rule
 * source: the model resolves the overlays and reads the matching bodies. This hook only reminds it, at
 * the moment a skill starts, which files match:
 *
 *   Before executing skill <name>: read these project overlay files: <paths>.
 *   Overlays are ADDITIVE ONLY: they never waive the workflow route rules, git discipline, a review
 *   gate or a user-confirmation gate.
 *
 * Resolution (`lib/skill-protocol-overlay.cjs`): the most specific tier of the registry's `Target`
 * column wins outright (exact name, then glob, then `*`); body files are derived as
 * `<protocols-dir>/<Name>.md` from a bare-slug Name, never from the row's Body link; an escaping or
 * malformed row is skipped unread.
 *
 * Fires on the events that mark a skill activation, registered exactly like the protocol entries:
 * PostToolUse `Skill`, PostToolUse `Read` of a `SKILL.md` (handler condition `Read(**\/SKILL.md)`),
 * and UserPromptExpansion (a typed slash command). The Codex mirror maps them to its prompt and shell
 * reads (`.claude/scripts/codex/sync-hooks.mjs`).
 *
 * Silent (no output, exit 0) when the registry is absent or empty, no row matches the skill, or any
 * read or parse fails: a project with no overlays pays one early exit.
 *
 * Dedup: one record per skill name and scope in the protocol-delivery ledger store, so the reminder
 * for a skill repeats only after about `OVERLAY_REINJECT_TOKENS` tokens of conversation growth since
 * its last delivery (or a compaction, or a changed overlay set). A host that exposes no transcript
 * keeps a reminder until a compaction is reported.
 */

const path = require('node:path');

const HOOK_NAME = 'skill-overlay-remind';
/** Refresh overlay discovery during long tasks; 150k limits repetition without removing the reminder. */
const OVERLAY_REINJECT_TOKENS = 150000;
/** Ledger record group of one skill's reminder. */
const GROUP_PREFIX = 'skill-overlay-';
/** The most skills one event can remind about (a second-host prompt may name several). */
const MAX_SKILLS = 8;

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonBlank(value) {
    return typeof value === 'string' && value.trim() !== '';
}

let ledgerSettings = null;
function getLedgerSettings() {
    if (!ledgerSettings) {
        const { BYTES_PER_TOKEN } = require('./lib/file-conventions.cjs');
        ledgerSettings = Object.freeze({
            reinjectAfterBytes: OVERLAY_REINJECT_TOKENS * BYTES_PER_TOKEN,
            reinjectAfterMinutes: null,
            blindReinjectAfterMinutes: null,
            compactionMarkers: Object.freeze([require('./lib/convention-ledger.cjs').CODEX_COMPACTION_MARKER])
        });
    }
    return ledgerSettings;
}

/**
 * The project config the registry location is resolved from: `{}` when the project has none, the
 * config when it is valid, `null` (no overlay read at all) when it is declared but unusable.
 */
function loadConfig(deps) {
    if (deps.config !== undefined) return deps.config;
    const status = require('./lib/project-config-loader.cjs').getProjectConfigStatus();
    if (status.state === 'missing') return {};
    return status.valid ? status.config : null;
}

function defaultWrite(text, done) {
    // emit owns the once-only acknowledgment when the callback and error event both report failure.
    const onError = () => done(false);
    process.stdout.once('error', onError);
    try {
        process.stdout.write(text, error => {
            // A failed write also emits an error after the callback; keep its listener until then.
            if (!error) process.stdout.removeListener('error', onError);
            done(!error);
        });
    } catch {
        process.stdout.removeListener('error', onError);
        done(false);
    }
}

/**
 * Resolve to the payload written, or '' when the hook stays silent.
 * deps (tests): projectRoot, readFile, config, now, write.
 */
function run(input, deps = {}) {
    return new Promise(resolve => {
        const finish = value => resolve(value);
        try {
            const delivery = require('./lib/protocol-delivery.cjs');
            if (!delivery.isRelevantEvent(input)) return finish('');
            const root = delivery.resolveRoot(input, deps);
            if (!root) return finish('');
            const read = typeof deps.readFile === 'function' ? deps.readFile : delivery.defaultRead;
            const resolved = delivery.resolveEvent(input, {
                root,
                read: file => {
                    const text = read(file);
                    return typeof text === 'string' ? text.replace(/\r\n/g, '\n') : null;
                },
                host: delivery.detectHost(input)
            });
            const names = resolved.names.slice(0, MAX_SKILLS);
            if (!names.length) return finish('');

            const overlay = require('./lib/skill-protocol-overlay.cjs');
            const config = loadConfig(deps);
            const reminders = names
                .map(name => ({ name, ...overlay.resolveOverlayReminder(name, root, config) }))
                .filter(item => item.text);
            if (!reminders.length) return finish('');

            const now = typeof deps.now === 'number' ? deps.now : Date.now();
            const write = typeof deps.write === 'function' ? deps.write : defaultWrite;
            const emit = (texts, acknowledge = () => {}) => {
                const payload = JSON.stringify({
                    hookSpecificOutput: { hookEventName: input.hook_event_name, additionalContext: texts.join('\n\n') }
                });
                let completed = false;
                const complete = ok => {
                    if (completed) return;
                    completed = true;
                    acknowledge(ok !== false);
                    finish(ok === false ? '' : payload);
                };
                try {
                    write(payload, complete);
                } catch {
                    complete(false);
                }
            };
            if (!nonBlank(input.session_id)) return emit(reminders.map(item => item.text)); // no session: deliver, record nothing

            // One ledger record per skill; the reminders of this event go out as ONE message.
            const crypto = require('node:crypto');
            const ledger = require('./lib/convention-ledger.cjs');
            const store = path.join(root, ...delivery.STORE_SEGMENTS);
            const collected = [];
            // deliverOnce claims/checks synchronously, but records only when its writer acknowledges.
            // Keep those acknowledgments pending until the combined output actually succeeds.
            const deliveries = reminders.map(item => ledger.deliverOnce({
                root: store,
                input,
                group: `${GROUP_PREFIX}${item.name}`,
                // Every matched path defines the set, including paths omitted from the short text.
                hash: crypto.createHash('sha256').update(JSON.stringify([item.text, item.files]), 'utf8').digest('hex'),
                payload: item.text,
                settings: getLedgerSettings(),
                now,
                failOpen: true,
                write: (text, done) => {
                    collected.push({ text, done });
                }
            }));
            if (collected.length) {
                emit(collected.map(item => item.text), ok => {
                    for (const item of collected) item.done(ok);
                });
            }
            Promise.all(deliveries).then(() => {
                if (!collected.length) finish('');
            }, () => finish(''));
        } catch {
            finish('');
        }
    });
}

module.exports = {
    HOOK_NAME,
    OVERLAY_REINJECT_TOKENS,
    GROUP_PREFIX,
    MAX_SKILLS,
    getLedgerSettings,
    run
};

// Entry-point check covers the Codex `node -e … require(hook)` launcher too (require.main is undefined there).
if (require('./lib/hook-runner.cjs').isHookEntryPoint(module)) {
    process.exitCode = 0;
    let input = null;
    try {
        input = require('./lib/protocol-delivery.cjs').readHookInput();
    } catch {
        input = null;
    }
    if (input) run(input).then(() => { process.exitCode = 0; }, () => { process.exitCode = 0; });
}
