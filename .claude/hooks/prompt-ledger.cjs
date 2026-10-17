#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * Prompt Ledger — session record of every user prompt + presence-gated goal re-anchoring
 * (accelerator, never a gate). Spec: docs/specs/ContextDelivery/README.SessionPromptLedger.md.
 *
 * Triggers:
 *   UserPromptSubmit (Claude + Codex)  → host-generated payloads (task notifications, system
 *     reminders, command echoes) are skipped; otherwise redact, bound and append the prompt to
 *     tmp/prompt-ledger/<session>/ledger.{json,md}. P1 → one-line pin notice. Later prompts →
 *     plaintext digest only when the last reminder is no longer present (condensed / far back).
 *   SessionStart compact → record the condensation and deliver the digest. resume → digest
 *     only when not present. clear → archive the ledger so the next prompt becomes the new
 *     original request. BOTH hosts since 2026-09-17: Codex supports SessionStart with the
 *     same startup|resume|clear|compact matchers, and this hook is on the narrow mirror
 *     allowlist (sync-hooks.mjs codexSessionStartMirrors) because a static carrier cannot
 *     hold per-session prompts. It previously read "Codex skips SessionStart", which was
 *     true of the mirror, never of the host.
 *   PostToolUse TodoWrite|TaskCreate|TaskUpdate|update_plan (main conversation only)
 *     → digest only when not present (long single-request runs re-anchor at checkpoints).
 *
 * On by default; off with `.claude/.ck.json` promptLedger.enabled:false or CK_PROMPT_LEDGER=0.
 * Missing session id, disabled, or ANY failure → no record, no output, exit 0 (BR-SPL-08/09/10).
 * Rule source: SYNC:session-goal-ledger (workflow skills and the universal `task-planning-rules` protocol).
 */

const path = require('path');

const HOOK_NAME = 'prompt-ledger';
const CHECKPOINT_TOOLS = new Set(['TodoWrite', 'TaskCreate', 'TaskUpdate', 'update_plan']);

function note(deps, reason) {
    try {
        const env = (deps && deps.env) || process.env;
        if (env.CK_DEBUG !== '1' && env.CK_DEBUG !== 'true') return;
        process.stderr.write(`[${HOOK_NAME}] ${reason}\n`);
    } catch {
        /* diagnostics are best-effort */
    }
}

function nonBlank(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function eventNameOf(input) {
    if (typeof input.hook_event_name === 'string') return input.hook_event_name;
    if (typeof input.prompt === 'string') return 'UserPromptSubmit';
    if (typeof input.tool_name === 'string') return 'PostToolUse';
    if (typeof input.source === 'string') return 'SessionStart';
    return '';
}

function defaultProjectDir(input, env) {
    const { resolveProjectRoot } = require('./lib/project-root.cjs');
    const cwd = nonBlank(input.cwd) ? input.cwd : process.cwd();
    return resolveProjectRoot({ cwd, scriptPath: __filename, env }).rootDir;
}

function defaultWrite(text, done) {
    let settled = false;
    const finish = ok => {
        if (settled) return;
        settled = true;
        done(ok);
    };
    const onError = () => finish(false);
    process.stdout.once('error', onError);
    try {
        process.stdout.write(text, err => {
            // A failed write emits an error after its callback; consume that event too.
            if (!err) process.stdout.removeListener('error', onError);
            finish(!err);
        });
    } catch {
        process.stdout.removeListener('error', onError);
        finish(false);
    }
}

/** Plaintext for UserPromptSubmit (both hosts); JSON additionalContext for SessionStart/PostToolUse. */
function formatPayload(eventName, text) {
    if (eventName === 'UserPromptSubmit') return `${text}\n`;
    return JSON.stringify({ hookSpecificOutput: { hookEventName: eventName, additionalContext: text } });
}

/**
 * Evaluate one hook event. Resolves to the stdout text written ('' when silent).
 * deps (optional, tests): env, now, projectDir, rawSettings, write, store.
 */
function run(input, deps = {}) {
    const ctx = {
        ...deps,
        env: deps.env || process.env,
        now: typeof deps.now === 'number' ? deps.now : Date.now(),
        write: deps.write || defaultWrite
    };
    return new Promise(resolve => {
        const finish = value => resolve(value);
        try {
            if (!input || typeof input !== 'object' || Array.isArray(input)) return finish('');
            const store = deps.store || require('./lib/prompt-ledger-store.cjs');
            const projectDir = deps.projectDir || defaultProjectDir(input, ctx.env);
            const settings = store.resolveSettings(
                deps.rawSettings !== undefined ? deps.rawSettings : store.loadRawSettings(projectDir),
                ctx.env
            );
            if (!settings.enabled) {
                note(ctx, 'skip: disabled');
                return finish('');
            }
            if (!nonBlank(input.session_id)) {
                note(ctx, 'skip: no session id (records never fall back to a shared file)');
                return finish('');
            }
            const eventName = eventNameOf(input);
            const root = store.storeRoot(ctx.env, projectDir);
            const sessionId = input.session_id;
            const dir = store.sessionDir(root, sessionId);
            const ledgerMd = store.relativeDisplay(path.join(dir, 'ledger.md'), projectDir);

            const presentNow = () => store.isPresent(
                store.readDelivery(dir),
                {
                    lastCompactionAt: store.lastCompactionAt(root, sessionId, input, settings, ctx.now),
                    transcriptSize: store.transcriptSize(input.transcript_path),
                    now: ctx.now
                },
                settings
            );
            const deliver = (message, why) => {
                if (!message || !message.text) return finish('');
                const payload = formatPayload(eventName, message.text);
                ctx.write(payload, ok => {
                    try {
                        if (ok !== false) {
                            store.writeDelivery(dir, {
                                hash: message.tag,
                                deliveredAt: ctx.now,
                                transcriptBytes: store.transcriptSize(input.transcript_path)
                            });
                        }
                    } catch {
                        /* fail-open */
                    }
                    note(ctx, ok === false ? 'write failed: delivery not recorded' : `delivered (${why})`);
                    finish(ok === false ? '' : payload);
                });
            };

            if (eventName === 'UserPromptSubmit') {
                const existing = store.readLedger(dir);
                // A conversation already long when the record is created means the record starts
                // mid-session: its first entry is only the first prompt SEEN (BR-SPL-02).
                const historyBytes = store.transcriptSize(input.transcript_path);
                const midSession = typeof historyBytes === 'number' && historyBytes >= store.MID_SESSION_BYTES;
                const appended = store.appendPrompt(existing, input.prompt, { now: ctx.now, settings, sessionId, midSession });
                if (!appended) return finish('');
                if (!existing) store.pruneStale(root, ctx.now, { keep: dir });
                if (!store.writeLedger(dir, appended.ledger)) {
                    note(ctx, `skip: ledger not writable (${root})`);
                    return finish('');
                }
                if (appended.ledger.entries.length === 1 && appended.entry.seq === 1) {
                    return deliver(store.buildPinNotice(appended.ledger, ledgerMd), 'original goal pinned');
                }
                if (presentNow()) {
                    note(ctx, `recorded P${appended.entry.seq}; reminder still present`);
                    return finish('');
                }
                return deliver(store.buildDigest(appended.ledger, ledgerMd), `re-anchor at P${appended.entry.seq}`);
            }

            if (eventName === 'SessionStart') {
                if (input.source === 'clear') {
                    store.rotateLedger(dir, ctx.now);
                    return finish('');
                }
                if (input.source !== 'compact' && input.source !== 'resume') return finish('');
                const ledger = store.readLedger(dir);
                if (!ledger) return finish('');
                if (input.source === 'compact') store.recordCompaction(dir, ctx.now);
                else if (presentNow()) return finish('');
                return deliver(store.buildDigest(ledger, ledgerMd), `session ${input.source}`);
            }

            if (eventName === 'PostToolUse') {
                if (!CHECKPOINT_TOOLS.has(input.tool_name)) return finish('');
                if (nonBlank(input.agent_id)) {
                    note(ctx, 'skip: helper agent (goal travels in its brief)');
                    return finish('');
                }
                const ledger = store.readLedger(dir);
                if (!ledger || presentNow()) return finish('');
                return deliver(store.buildDigest(ledger, ledgerMd), `checkpoint ${input.tool_name}`);
            }
            return finish('');
        } catch (err) {
            note(ctx, `internal error (fail-open): ${err && err.message ? err.message : err}`);
            finish('');
        }
    });
}

module.exports = { run, HOOK_NAME, CHECKPOINT_TOOLS, formatPayload };

// Entry-point check covers the Codex `node -e … require(hook)` launcher too (require.main is undefined there).
if (require('./lib/hook-runner.cjs').isHookEntryPoint(module)) {
    process.exitCode = 0;
    let input = null;
    try {
        const { parseStdinSync } = require('./lib/stdin-parser.cjs');
        // throwOnError keeps malformed stdin silent: the shared parser's default path logs the
        // diagnostic to stderr, and this hook must print nothing at all on failure (BR-SPL-10).
        input = parseStdinSync({ defaultValue: null, throwOnError: true, context: HOOK_NAME });
    } catch {
        input = null;
    }
    if (input) {
        run(input).then(() => { process.exitCode = 0; }, () => { process.exitCode = 0; });
    }
}
