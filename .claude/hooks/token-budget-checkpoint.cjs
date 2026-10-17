#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * Token checkpoint — an advisory note at task/plan step boundaries each time the session's
 * non-cached tokens cross the next multiple of `hooks.tokenBudget.checkpointTokens`
 * (docs/project-config.json; default on, 500,000). It never blocks.
 *
 * Trigger: PostToolUse `TodoWrite|TaskCreate|TaskUpdate|update_plan` (the prompt-ledger matcher),
 * main conversation only. A helper agent's event is skipped, so the note reaches the conversation
 * that can report to the user; helper-agent usage still counts, because every read covers the
 * main transcript plus all sub-agent transcripts (session-usage.cjs).
 *
 * Metric: input + cache writes + output. Cache reads never count: they grow with the context size
 * on every response, so counting them measures context length, not work done.
 *
 * Per-session marker `<project>/tmp/token-budget/<session>/usage-state.json` (atomic temp +
 * rename, under a short lock) holds the last threshold noted (each fires once), the incremental
 * read state (a transcript that did not grow costs one stat and zero bytes) and the completed-step
 * count: +1 when a TaskUpdate sets `status: completed`; for TodoWrite/update_plan, the number of
 * items whose `status` is `completed`. Only those `status` fields are read from tool input.
 *
 * Retention: at most once a day per project (`tmp/token-budget/_prune.json`), session marker dirs
 * idle longer than the convention ledger's retention age (7 days) are removed — only dirs holding
 * nothing but this hook's own file names, never the current session's, at most 50 per sweep.
 *
 * Note content: fixed text plus exactly three numbers (non-cached total, threshold crossed,
 * completed steps); no task subjects, tool input, paths or message text.
 *
 * Fail-open: disabled, a malformed tokenBudget section, no session or transcript, an unreadable
 * transcript (hosts whose transcript the reader cannot parse count zero), a busy lock, or any
 * error → no output, exit 0.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HOOK_NAME = 'token-budget-checkpoint';
const CHECKPOINT_TOOLS = new Set(['TodoWrite', 'TaskCreate', 'TaskUpdate', 'update_plan']);
const DEFAULT_CHECKPOINT_TOKENS = 500000;
const STATE_VERSION = 1;
const STATE_FILE = 'usage-state.json';
const LOCK_FILE = 'usage-state.lock';
// Parallel task calls fire parallel hook processes; wait briefly for a peer's short claim.
const LOCK_ATTEMPTS = 20;
const LOCK_WAIT_MS = 25;
const COMPLETED = 'completed';
const MAX_OUTPUT_CHARS = 600;
// Retention: a sweep at most once per day (`_prune.json` in the store root) removes session marker
// dirs idle for longer than the convention ledger's retention age, at most PRUNE_LIMIT per sweep.
const PRUNE_MARKER = '_prune.json';
const PRUNE_LIMIT = 50;
// The only names this hook writes into a session dir: the marker, its lock and the marker's temp file.
const OWN_SESSION_FILE = /^usage-state\.(?:json|lock|json\.\d+\.[0-9a-f]+\.tmp)$/;

function nonBlank(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * `{ enabled, checkpointTokens }` from `hooks.tokenBudget`. An omitted section or field takes
 * its default; a malformed one fails config validation and keeps the checkpoint off until it
 * is fixed, rather than guessing a value (as `codeGraphMode` treats a bad section).
 */
function resolveBudget(config, range) {
    const off = { enabled: false, checkpointTokens: DEFAULT_CHECKPOINT_TOKENS };
    const hooks = isPlainObject(config) ? config.hooks : undefined;
    if (hooks !== undefined && !isPlainObject(hooks)) return off;
    const section = hooks ? hooks.tokenBudget : undefined;
    if (section === undefined) return { enabled: true, checkpointTokens: DEFAULT_CHECKPOINT_TOKENS };
    if (!isPlainObject(section)) return off;
    if (section.enabled !== undefined && typeof section.enabled !== 'boolean') return off;
    const value = section.checkpointTokens === undefined ? DEFAULT_CHECKPOINT_TOKENS : section.checkpointTokens;
    const [min, max] = range;
    if (!Number.isInteger(value) || value < min || value > max) return off;
    return { enabled: section.enabled !== false, checkpointTokens: value };
}

/** Completed-step count after this event; reads only `status` fields. */
function nextStepCount(previous, toolName, toolInput) {
    const input = isPlainObject(toolInput) ? toolInput : {};
    if (toolName === 'TaskUpdate') return input.status === COMPLETED ? previous + 1 : previous;
    const items = toolName === 'TodoWrite' ? input.todos : toolName === 'update_plan' ? input.plan : undefined;
    if (!Array.isArray(items)) return previous;
    return items.filter(item => isPlainObject(item) && item.status === COMPLETED).length;
}

function formatCount(value) {
    return String(Math.max(0, Math.floor(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** The note: fixed text around exactly three numbers. */
function buildNote(total, threshold, steps) {
    return [
        `Token checkpoint: this session has used ${formatCount(total)} non-cached tokens (input + cache writes + output),`,
        `passing the ${formatCount(threshold)} checkpoint. Completed steps so far: ${formatCount(steps)}.`,
        'At this step boundary, give the user a short progress report and ask whether to continue,',
        'unless they already told you to keep going without stopping. This note is advisory and blocks nothing.'
    ].join(' ');
}

function formatPayload(text) {
    return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: text } });
}

function nonNegativeInt(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

/** Stored marker (normalized) plus its raw text, so an unchanged marker is not rewritten. */
function readState(file) {
    let raw = null;
    let parsed = null;
    try {
        raw = fs.readFileSync(file, 'utf8');
        parsed = JSON.parse(raw);
    } catch {
        parsed = null;
    }
    const valid = isPlainObject(parsed) && parsed.version === STATE_VERSION;
    return {
        raw: valid ? raw : null,
        lastThreshold: valid ? nonNegativeInt(parsed.lastThreshold) : 0,
        completedSteps: valid ? nonNegativeInt(parsed.completedSteps) : 0,
        usage: valid && isPlainObject(parsed.usage) ? parsed.usage : null
    };
}

/** Atomic write (temp + rename); a failed write leaves no temp file. */
function writeJsonAtomic(file, text) {
    let temp = null;
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
        fs.writeFileSync(temp, text);
        fs.renameSync(temp, file);
        return true;
    } catch {
        if (temp) {
            try {
                fs.unlinkSync(temp);
            } catch {
                /* never created, or already gone */
            }
        }
        return false;
    }
}

function sleepSync(ms) {
    try {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    } catch {
        /* no wait available: the next attempt runs at once */
    }
}

function acquire(ledger, lock) {
    for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
        const token = ledger.acquireLock(lock, Date.now());
        if (token) return token;
        sleepSync(LOCK_WAIT_MS);
    }
    return null;
}

/**
 * Newest mtime of a session marker dir this hook owns, or null when it is not provably ours: a real
 * directory holding at least one entry, every entry a regular file with one of this hook's own names.
 * A dir with anything else in it is never aged, so it is never deleted.
 */
function markerDirAge(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    if (entries.length === 0) return null;
    let newest = fs.lstatSync(dir).mtimeMs;
    for (const entry of entries) {
        if (!entry.isFile() || !OWN_SESSION_FILE.test(entry.name)) return null;
        newest = Math.max(newest, fs.lstatSync(path.join(dir, entry.name)).mtimeMs);
    }
    return newest;
}

/**
 * Remove session marker dirs idle longer than `maxAgeMs`, never `keepDir` (the current session),
 * at most once per `intervalMs` per store and PRUNE_LIMIT dirs per sweep. Fail-open: any error
 * skips that dir or the whole sweep. Returns the number of removed dirs.
 */
function pruneStaleMarkers(root, keepDir, now, { maxAgeMs, intervalMs }) {
    let removed = 0;
    try {
        const stamp = path.join(root, PRUNE_MARKER);
        let at = null;
        try {
            at = JSON.parse(fs.readFileSync(stamp, 'utf8')).at;
        } catch {
            at = null;
        }
        if (typeof at === 'number' && now >= at && now - at < intervalMs) return 0;
        if (!writeJsonAtomic(stamp, JSON.stringify({ at: now }))) return 0;
        const keep = path.resolve(keepDir);
        for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
            if (removed >= PRUNE_LIMIT) break;
            if (!entry.isDirectory()) continue;
            const dir = path.join(root, entry.name);
            if (path.resolve(dir) === keep) continue;
            try {
                const newest = markerDirAge(dir);
                if (newest !== null && now - newest > maxAgeMs) {
                    fs.rmSync(dir, { recursive: true, force: true });
                    removed += 1;
                }
            } catch {
                /* skip this dir */
            }
        }
    } catch {
        /* no store yet, or unreadable: nothing to prune */
    }
    return removed;
}

function isFile(file) {
    try {
        return fs.statSync(file).isFile();
    } catch {
        return false;
    }
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
    // A failed pipe reports through both the callback and the stream's error event.
    // Keep the listener on callback failure until that event arrives; removing it early throws.
    const onError = () => finish(false);
    process.stdout.once('error', onError);
    try {
        process.stdout.write(text, error => {
            if (!error) process.stdout.removeListener('error', onError);
            finish(!error);
        });
    } catch {
        process.stdout.removeListener('error', onError);
        finish(false);
    }
}

function loadBudget(deps) {
    const { TOKEN_BUDGET_CHECKPOINT_RANGE } = require('./lib/project-config-schema.cjs');
    const config = deps.config !== undefined ? deps.config : require('./lib/project-config-loader.cjs').loadProjectConfig();
    return resolveBudget(config, TOKEN_BUDGET_CHECKPOINT_RANGE);
}

/**
 * Evaluate one hook event; resolves to the stdout text written ('' when silent).
 * deps (optional, tests): env, config, projectDir, write, usage (reader lib), fs (reader IO seam),
 * now (retention clock).
 */
function run(input, deps = {}) {
    return new Promise(resolve => {
        const finish = value => resolve(value);
        try {
            if (!isPlainObject(input)) return finish('');
            if (input.hook_event_name && input.hook_event_name !== 'PostToolUse') return finish('');
            if (!CHECKPOINT_TOOLS.has(input.tool_name)) return finish('');
            if (nonBlank(input.agent_id)) return finish('');
            if (!nonBlank(input.session_id) || !nonBlank(input.transcript_path)) return finish('');

            const budget = loadBudget(deps);
            if (!budget.enabled) return finish('');
            if (!isFile(input.transcript_path)) return finish('');

            const env = deps.env || process.env;
            const ledger = require('./lib/convention-ledger.cjs');
            const usageLib = deps.usage || require('./lib/session-usage.cjs');
            const projectDir = deps.projectDir || defaultProjectDir(input, env);
            const storeRoot = path.join(projectDir, 'tmp', 'token-budget');
            const dir = ledger.sessionDir(storeRoot, input.session_id);
            const file = path.join(dir, STATE_FILE);
            const lock = path.join(dir, LOCK_FILE);
            pruneStaleMarkers(storeRoot, dir, deps.now ? deps.now() : Date.now(), {
                maxAgeMs: ledger.PRUNE_AGE_MS,
                intervalMs: ledger.PRUNE_INTERVAL_MS
            });

            const token = acquire(ledger, lock);
            if (!token) return finish('');
            const release = () => ledger.releaseLock(lock, token);
            try {
                const stored = readState(file);
                const completedSteps = nextStepCount(stored.completedSteps, input.tool_name, input.tool_input);
                const readOpts = { sessionId: input.session_id };
                if (deps.fs) readOpts.fs = deps.fs;
                const { total, state: usage } = usageLib.readUsageIncremental(input.transcript_path, stored.usage, readOpts);
                const crossed = Math.floor(total / budget.checkpointTokens) * budget.checkpointTokens;
                const next = { version: STATE_VERSION, lastThreshold: stored.lastThreshold, completedSteps, usage };
                const persist = () => {
                    const text = JSON.stringify(next);
                    if (text !== stored.raw) writeJsonAtomic(file, text);
                };

                if (crossed < budget.checkpointTokens || crossed <= stored.lastThreshold) {
                    persist();
                    release();
                    return finish('');
                }

                const payload = formatPayload(buildNote(total, crossed, completedSteps));
                if (payload.length > MAX_OUTPUT_CHARS) {
                    persist();
                    release();
                    return finish('');
                }
                const write = deps.write || defaultWrite;
                write(payload, ok => {
                    try {
                        // Record the threshold only once the note was handed to the host.
                        if (ok !== false) next.lastThreshold = crossed;
                        persist();
                    } catch {
                        /* fail open */
                    } finally {
                        release();
                    }
                    finish(ok === false ? '' : payload);
                });
            } catch {
                release();
                finish('');
            }
        } catch {
            finish('');
        }
    });
}

module.exports = {
    HOOK_NAME,
    CHECKPOINT_TOOLS,
    DEFAULT_CHECKPOINT_TOKENS,
    STATE_FILE,
    MAX_OUTPUT_CHARS,
    resolveBudget,
    nextStepCount,
    buildNote,
    run
};

// Entry-point check covers the Codex `node -e … require(hook)` launcher too (require.main is undefined there).
if (require('./lib/hook-runner.cjs').isHookEntryPoint(module)) {
    process.exitCode = 0;
    let input = null;
    try {
        const { parseStdinSync } = require('./lib/stdin-parser.cjs');
        input = parseStdinSync({ defaultValue: null, throwOnError: true, context: HOOK_NAME });
    } catch {
        input = null;
    }
    if (input) run(input).then(() => { process.exitCode = 0; }, () => { process.exitCode = 0; });
}
