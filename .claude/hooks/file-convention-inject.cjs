#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * File Convention Inject — per-file convention reminder (accelerator, never a gate).
 *
 * Trigger:
 *   PostToolUse  Read|Edit|Write|MultiEdit|NotebookEdit (Claude) · apply_patch (Codex mirror)
 *     → additionalContext digest of the convention classes (docs/project-config.json
 *       contextGroups[]) the touched file belongs to, only for classes not already present
 *       in the current working context (spec BR-PFCI-05..07, 15..17). A class may declare its own
 *       window (`reinjectAfterTokens`) and transcript evidence (`evidenceDocs`/`evidenceSkills`)
 *       that counts as present — the front-end `ui-ux-gate` class uses both.
 *     Read vs edit (BR-PFCI-19/20): a Read delivers only classes whose `on` is read|both, in the
 *       conditional wording; any other trigger tool delivers only edit|both classes, in the mandatory
 *       wording. The record keeps the wording, so a read-form delivery never suppresses the first
 *       change after it (BR-PFCI-05 read-form presence).
 *   SessionStart compact|clear → records the condensation; prints nothing. BOTH hosts since
 *     2026-09-17: Codex supports SessionStart with the same matcher vocabulary, and this hook
 *     is on the narrow mirror allowlist (sync-hooks.mjs codexSessionStartMirrors) because
 *     without it the ledger never learns the transcript was condensed and falls back to the
 *     blind age path, which fails CLOSED. Previously read "Claude only".
 *
 * Opt-in: conventionInjection.enabled === true with at least one deliverable class, decided
 * once in run() for EVERY event before any handler runs, so no path reaches the delivery store
 * unless the project opted in. With NO project config file, the built-in fallback applies:
 * delivery on, the UI/UX gate and AI-feature gate classes (file-conventions builtinFallbackConfig). An existing
 * config without the switch, or a malformed one, stays silent. On ANY failure, exit 0 with empty
 * stdout (BR-PFCI-01, BR-PFCI-10). Non-automatic carriers: the CLAUDE.md
 * "Automatic Skill Activation" table + `node .claude/hooks/lib/file-conventions.cjs --lookup <path>` (shell read).
 *
 * Exit: always 0.
 */

const fs = require('fs');

const HOOK_NAME = 'file-convention-inject';
const MAX_INPUT_BYTES = 1024 * 1024;
const TRIGGER_TOOLS = new Set(['Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'apply_patch']);
const CONDENSATION_SOURCES = new Set(['compact', 'clear']);
// Delivery-record wording (BR-PFCI-05/20): conditional = delivered on a read, mandatory = on a change.
const WORDING_CONDITIONAL = 'conditional';
const WORDING_MANDATORY = 'mandatory';
// A non-blocking stdin that is not yet readable reports EAGAIN: wait briefly between attempts
// and give up (silently, fail-open) once the deadline passes instead of spinning a CPU core.
const EAGAIN_WAIT_MS = 5;
const INPUT_DEADLINE_MS = 2000;

function sleepSync(ms) {
    try {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    } catch {
        /* no blocking wait available: the deadline still bounds the loop */
    }
}

/**
 * Opt-in decision trace explaining why a reminder was or was not delivered. Same switch
 * (CK_DEBUG=1 / true) and `[context] message` stderr line as lib/debug-log.cjs `debug`, but
 * gated on the evaluated environment (deps.env) rather than process.env. Never touches
 * stdout; never throws.
 */
function note(deps, reason) {
    try {
        const env = (deps && deps.env) || process.env;
        if (env.CK_DEBUG !== '1' && env.CK_DEBUG !== 'true') return;
        process.stderr.write(`[${HOOK_NAME}] ${reason}\n`);
    } catch {
        /* diagnostics are best-effort */
    }
}

/**
 * Read stdin up to the cap; null when oversized, empty, unreadable or not ready in time.
 * io (tests): { read(fd, buffer), now(), sleep(ms) }.
 */
function readInput(fd = 0, io = {}) {
    const read = typeof io.read === 'function' ? io.read : (target, buffer) => fs.readSync(target, buffer, 0, buffer.length, null);
    const now = typeof io.now === 'function' ? io.now : Date.now;
    const sleep = typeof io.sleep === 'function' ? io.sleep : sleepSync;
    try {
        const chunks = [];
        let total = 0;
        const buffer = Buffer.allocUnsafe(64 * 1024);
        const deadline = now() + INPUT_DEADLINE_MS;
        while (true) {
            let bytesRead;
            try {
                bytesRead = read(fd, buffer);
            } catch (err) {
                if (err && err.code === 'EAGAIN') {
                    if (now() >= deadline) return null;
                    sleep(EAGAIN_WAIT_MS);
                    continue;
                }
                if (err && err.code === 'EOF') break;
                return null;
            }
            if (bytesRead === 0) break;
            total += bytesRead;
            if (total > MAX_INPUT_BYTES) return null;
            chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
        }
        const raw = Buffer.concat(chunks, total).toString('utf8').replace(/^\uFEFF/, '');
        if (!raw.trim()) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function eventNameOf(input) {
    if (typeof input.hook_event_name === 'string') return input.hook_event_name;
    if (typeof input.event === 'string') return input.event;
    if (typeof input.tool_name === 'string') return 'PostToolUse';
    return '';
}

function defaultProjectDir(input, env) {
    const { resolveProjectRoot } = require('./lib/project-root.cjs');
    const cwd = typeof input.cwd === 'string' && input.cwd.trim() ? input.cwd : process.cwd();
    return resolveProjectRoot({ cwd, scriptPath: __filename, env }).rootDir;
}

/** The project config, or the built-in gate fallback (UI/UX and AI-feature) when no config file exists (BR-PFCI-01). */
function defaultConfig() {
    const { getProjectConfigStatus } = require('./lib/project-config-loader.cjs');
    const { effectiveConfig } = require('./lib/file-conventions.cjs');
    return effectiveConfig(getProjectConfigStatus());
}

/** Hands the payload to stdout; `done(false)` when the write fails, so nothing is recorded (BR-PFCI-17). */
function defaultWrite(text, done) {
    let settled = false;
    const finish = ok => {
        if (settled) return;
        settled = true;
        done(ok);
    };
    // A failed pipe reports through both the callback and the stream's error event.
    // Keep the listener on callback failure until that event arrives; removing it early throws.
    const onError = () => finish(false);
    process.stdout.once('error', onError);
    try {
        process.stdout.write(text, err => {
            if (!err) process.stdout.removeListener('error', onError);
            finish(!err);
        });
    } catch {
        process.stdout.removeListener('error', onError);
        finish(false);
    }
}

/**
 * SessionStart: a host-reported condensation or clear. The report does not identify the
 * condensed context, so it re-arms the main conversation and helpers without a measurable
 * history (convention-ledger lastCompactionAt, BR-PFCI-06). Also runs the retention sweep.
 * Reached only through run(), past the opt-in gate — both statements below write to the store.
 */
function handleSessionStart(input, deps) {
    if (!CONDENSATION_SOURCES.has(input.source)) return;
    const ledger = require('./lib/convention-ledger.cjs');
    const root = ledger.storeRoot(deps.env);
    ledger.recordSessionCompaction(root, input.session_id, deps.now);
    ledger.pruneStale(root, deps.now);
    note(deps, `session condensation recorded (${input.source})`);
}

/**
 * PostToolUse planning: returns null (nothing to deliver) or
 * { text, commit(delivered:boolean) } where commit writes records and releases locks.
 * Reached only through run(), past the opt-in gate: `deps.config` is that gate's configuration.
 */
function planDelivery(input, deps) {
    if (!TRIGGER_TOOLS.has(input.tool_name)) return null;
    const conventions = require('./lib/file-conventions.cjs');
    const config = deps.config;
    const settings = conventions.resolveSettings(config);
    // The operation (BR-PFCI-19): a Read is a read; every other trigger tool creates, changes or moves.
    const trigger = input.tool_name === 'Read' ? conventions.TRIGGER_READ : conventions.TRIGGER_EDIT;
    // The project-wide exclusion of reads wins over every class trigger (BR-PFCI-14).
    if (trigger === conventions.TRIGGER_READ && settings.onRead === false) {
        note(deps, 'skip: reads excluded (onRead false)');
        return null;
    }

    const projectDir = deps.projectDir || defaultProjectDir(input, deps.env);
    const targets = conventions.extractTargets(input, projectDir, { isDirectory: deps.isDirectory });
    if (!targets.length) {
        note(deps, 'skip: no relevant target (outside project, folder, removal or failed tool)');
        return null;
    }
    // Classes with content signals read the touched file (bounded, fail-open); every other class matches by path alone.
    const contentCtx = { readContent: conventions.createContentReader(projectDir) };
    const matched = conventions.matchGroups(config, targets, settings, trigger, contentCtx);
    if (!matched.length) {
        note(deps, `skip: no class matches ${targets.length} target(s) on ${trigger}`);
        return null;
    }

    const ledger = require('./lib/convention-ledger.cjs');
    const root = ledger.storeRoot(deps.env);
    // Retention sweep (at most once per day per store). Placed after matching so paths that can
    // deliver nothing never write to the store (BR-PFCI-01); every writing path passes here.
    ledger.maybePrune(root, deps.now);
    const sessionId = input.session_id;
    const scope = ledger.scopeFor(input);
    const now = deps.now;
    const ctx = {
        lastCompactionAt: ledger.lastCompactionAt(root, sessionId, scope, input, settings, now),
        transcriptSize: ledger.transcriptSize(ledger.transcriptPathFor(input)),
        now
    };
    // Each class ages against its own window (`reinjectAfterTokens`), else the global distance.
    // Read-form presence (BR-PFCI-05): a delivery made on a read carried the conditional wording and
    // no protocol, so it counts as present only for later reads; the first change after it delivers
    // the class once more in the mandatory wording. A record without a wording predates the field or
    // is transcript evidence of the protocol itself: both count as mandatory.
    const isRecorded = (entry, hash, at = ctx) => {
        const record = ledger.readRecord(root, sessionId, scope, entry.name);
        if (record && record.wording === WORDING_CONDITIONAL && trigger !== conventions.TRIGGER_READ) return false;
        return ledger.isPresent(record, hash, at, conventions.classSettings(entry, settings));
    };
    const present = (entry, hash) => {
        if (isRecorded(entry, hash)) return true;
        const perClass = conventions.classSettings(entry, settings);
        const credit = ledger.staticCredit(scope, conventions.conventionTag(entry), hash, ctx, projectDir);
        if (credit && ledger.isPresent(credit, hash, ctx, perClass)) return true;
        return evidencePresent(entry, hash, perClass);
    };
    // The class's protocol already reached this context another way (its evidence docs read, or an
    // evidence skill loaded, inside the class window and after the last condensation): record that
    // as an 'evidence' delivery so later triggers skip on the record alone, and deliver nothing.
    const evidencePresent = (entry, hash, perClass) => {
        if (!entry.evidenceDocs.length && !entry.evidenceSkills.length) return false;
        const found = ledger.scanEvidence(ledger.transcriptPathFor(input), { docs: entry.evidenceDocs, skills: entry.evidenceSkills }, {
            projectDir,
            cwd: input.cwd,
            windowBytes: perClass.reinjectAfterBytes,
            lastCompactionAt: ctx.lastCompactionAt,
            compactionMarkers: settings.compactionMarkers
        });
        if (!found) return false;
        const record = { hash, deliveredAt: found.at, transcriptBytes: found.transcriptBytes, form: 'evidence' };
        if (!ledger.isPresent(record, hash, ctx, perClass)) return false;
        ledger.writeRecordAtomic(root, sessionId, scope, entry.name, record);
        note(deps, `skip ${entry.name}: protocol already loaded in ${scope} (transcript evidence)`);
        return true;
    };

    const claimed = [];
    for (const entry of matched) {
        const hash = conventions.groupHash(entry);
        if (present(entry, hash)) {
            note(deps, `skip ${entry.name}: already present in ${scope}`);
            continue;
        }
        const lock = ledger.lockFile(root, sessionId, scope, entry.name);
        const token = ledger.acquireLock(lock, now);
        if (!token) {
            note(deps, `skip ${entry.name}: claim unavailable (peer delivering or store unwritable: ${root})`);
            continue;
        }
        if (typeof deps.afterLock === 'function') deps.afterLock(entry);
        // Post-lock re-check (BR-PFCI-17): a peer may have completed between the check and the claim.
        if (isRecorded(entry, hash, ledger.recheckContext(ctx))) {
            ledger.releaseLock(lock, token);
            note(deps, `skip ${entry.name}: delivered by a peer`);
            continue;
        }
        claimed.push({ entry, lock, token, hash });
    }
    if (!claimed.length) return null;
    const releaseAll = () => claimed.forEach(item => ledger.releaseLock(item.lock, item.token));

    const entries = claimed.map(item => item.entry);
    let digest;
    try {
        digest = conventions.buildDigest(entries, targets, settings, { projectDir, fileExists: deps.fileExists, trigger });
    } catch (err) {
        releaseAll(); // never strand claimed locks on a render failure (peers would skip the class)
        throw err;
    }
    const { text, forms } = digest;
    if (!text) {
        releaseAll();
        note(deps, `skip: size budget ${settings.maxChars} leaves no class`);
        return null;
    }
    return {
        text,
        forms,
        commit(delivered) {
            try {
                if (!delivered) return;
                for (const { entry, hash } of claimed) {
                    const form = forms[entry.name];
                    if (form !== 'full' && form !== 'references') continue;
                    ledger.writeRecordAtomic(root, sessionId, scope, entry.name, {
                        hash,
                        deliveredAt: now,
                        transcriptBytes: ctx.transcriptSize,
                        form,
                        // Which wording was delivered decides whether a later change must re-deliver (BR-PFCI-05).
                        wording: trigger === conventions.TRIGGER_READ ? WORDING_CONDITIONAL : WORDING_MANDATORY
                    });
                }
            } finally {
                releaseAll();
            }
        }
    };
}

/**
 * Evaluate one hook event. Resolves to the stdout text written ('' when silent).
 * deps (all optional, for tests): env, now, config, projectDir, isDirectory, fileExists, write, afterLock.
 */
function run(input, deps = {}) {
    const resolved = {
        ...deps,
        env: deps.env || process.env,
        now: typeof deps.now === 'number' ? deps.now : Date.now(),
        write: deps.write || defaultWrite
    };
    return new Promise(resolve => {
        try {
            if (!input || typeof input !== 'object' || Array.isArray(input)) return resolve('');
            const eventName = eventNameOf(input);
            if (eventName !== 'SessionStart' && eventName !== 'PostToolUse') return resolve('');
            // BR-PFCI-01 opt-in gate, both halves of it: the switch is explicitly on AND at
            // least one class is deliverable. The invariant belongs to the HOOK, not to the
            // delivery path, so it is decided once here, above every handler — SessionStart
            // writes a condensation record and runs the retention sweep on its own path, so a
            // gate living inside planDelivery would leave a project that never opted in with
            // files written and directories deleted in its delivery store.
            const conventions = require('./lib/file-conventions.cjs');
            const config = resolved.config !== undefined ? resolved.config : defaultConfig();
            if (!conventions.isEnabled(config)) {
                note(resolved, 'skip: disabled (conventionInjection.enabled is not true)');
                return resolve('');
            }
            if (conventions.injectableEntries(config).length === 0) {
                note(resolved, 'skip: disabled (no deliverable class configured)');
                return resolve('');
            }
            resolved.config = config;
            if (eventName === 'SessionStart') {
                handleSessionStart(input, resolved);
                return resolve('');
            }
            const plan = planDelivery(input, resolved);
            if (!plan) return resolve('');
            const payload = JSON.stringify({
                hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: plan.text }
            });
            resolved.write(payload, delivered => {
                try {
                    plan.commit(delivered !== false);
                } catch {
                    /* fail-open */
                }
                note(resolved, delivered === false
                    ? 'write failed: nothing recorded'
                    : `delivered: ${Object.keys(plan.forms).map(name => `${name}=${plan.forms[name]}`).join(', ')}`);
                resolve(delivered === false ? '' : payload);
            });
        } catch (err) {
            note(resolved, `internal error (fail-open): ${err && err.message ? err.message : err}`);
            resolve('');
        }
    });
}

// planDelivery is deliberately NOT exported: it runs past the opt-in gate, so an external
// caller would be a second, ungated entry point into the delivery store.
module.exports = { run, readInput, HOOK_NAME, TRIGGER_TOOLS };

// Entry-point check covers the Codex `node -e … require(hook)` launcher too (require.main is undefined there).
if (require('./lib/hook-runner.cjs').isHookEntryPoint(module)) {
    process.exitCode = 0;
    const input = readInput();
    if (input) {
        run(input).then(() => { process.exitCode = 0; }, () => { process.exitCode = 0; });
    }
}
