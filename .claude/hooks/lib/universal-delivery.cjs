'use strict';

/**
 * Universal bundle delivery: the framework rules every task follows (the `universal` group of
 * `.claude/skills/shared/protocol-groups.json`), delivered by hooks and carried by no file.
 *
 * The group's `bins` entry is the authored delivery layout: each bin is the ordered tags of ONE
 * message of at most `binChars` characters, and each bin is delivered by its own hook process
 * (`protocol-inject-universal-<n>.cjs` calls `runHook(<n>)`) with its own dedup record, so a bin that
 * went missing is delivered again independently of the others.
 *
 * When a bin is delivered:
 *   - UserPromptSubmit: on the session's first prompt, and again only after about
 *     `UNIVERSAL_REINJECT_TOKENS` tokens of conversation growth since the bin's last delivery or after
 *     a compaction (the session ledger `convention-ledger.cjs` owns that rule, the same ledger the
 *     protocol hooks use: store `<project>/tmp/protocol-delivery`, one record per bin and scope).
 *     A host that exposes no transcript keeps a delivery until a compaction is reported.
 *   - SessionStart `compact` and `clear`: right after a host-reported compaction or clear, so a long
 *     run whose compaction no prompt follows (an autonomous loop) still has the bundle, and a cleared
 *     conversation whose session id the host kept does not rely on a record that still says delivered.
 *     The bin's own record is replaced by this delivery, so the next prompt finds it present and stays
 *     silent (one delivery per compaction or clear). `startup` and `resume` carry nothing: the session's
 *     first prompt delivers.
 *   - SubagentStart: every agent type, once per spawn (a spawn is its own ledger scope).
 * Any other event ends with no output before a project module is loaded.
 *
 * Never silent: a session without an id, or an unwritable ledger, delivers without a record (a
 * duplicate is accepted over a miss). An incomplete bin names its missing files, carries readable
 * rules and retries without a record; other bins keep their own dedup. A bundle that cannot be rendered at all (unreadable layout or index, a
 * missing protocols folder) is reported by bin 1 alone as one line naming the reason and the folder to
 * read, with no record, so the next event retries. The hook never blocks (exit 0) and never throws.
 *
 * Load cost: the top level requires only Node built-ins, and stdin is read here with node:fs, so an
 * event that cannot carry a bin ends before any other project module loads. Project modules are
 * required inside the functions that need them, after the event is known to be deliverable.
 */

const fs = require('node:fs');
const path = require('node:path');

// ── constants ───────────────────────────────────────────────────────────────

/** Name of the delivery group in `protocol-groups.json` and the published index. */
const UNIVERSAL_GROUP = 'universal';
/**
 * Long tasks need periodic attention refresh even before compaction. Keep the full
 * rules available; 150k reduces repeated context while retaining that refresh.
 * Compaction/clear still replays immediately, independently of this distance.
 */
const UNIVERSAL_REINJECT_TOKENS = 150000;
/** The largest message the primary host shows in full is 10,000 characters; a bin never exceeds this. */
const MAX_BIN = 9500;
const GROUPS_REL = '.claude/skills/shared/protocol-groups.json';
const PROTOCOLS_DIR_REL = '.claude/skills/shared/protocols/';
const EVENTS = Object.freeze(['UserPromptSubmit', 'SubagentStart']);
/**
 * The SessionStart sources that carry a bin: the host's report that it compacted the conversation or
 * cleared it. Either way the conversation no longer holds the bundle.
 */
const SESSION_START_EVENT = 'SessionStart';
const CONDENSED_SOURCES = Object.freeze(['compact', 'clear']);
/** The largest hook event read from stdin; a larger one is not a prompt or an agent start. */
const MAX_INPUT_BYTES = 1024 * 1024;
const INPUT_DEADLINE_MS = 2000;
const EAGAIN_WAIT_MS = 5;

// ── rendering (shared with the projection build) ────────────────────────────

/** The marker line that opens bin `number` of `total`. */
function binHeader(number, total) {
    return `<!-- CK:UNIVERSAL-PROTOCOLS ${number}/${total} -->`;
}

/**
 * The message of one bin: its marker line, then the protocol bodies in order, blank-line separated.
 * The one owner of the format: the projection build measures this string against the bin size.
 * @param {number} number  1-based bin number
 * @param {number} total   number of bins
 * @param {string[]} bodies protocol bodies, trailing newlines already removed
 */
function renderBin(number, total, bodies) {
    return [binHeader(number, total), ...bodies].join('\n\n');
}

// ── small helpers ───────────────────────────────────────────────────────────

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonBlank(value) {
    return typeof value === 'string' && value.trim() !== '';
}

function defaultRead(file) {
    try {
        return fs.readFileSync(file, 'utf8');
    } catch {
        return null;
    }
}

function sleepSync(ms) {
    try {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    } catch {
        /* no blocking wait available: the deadline still bounds the loop */
    }
}

/**
 * The hook event from stdin, or null when it is empty, oversized, not a JSON object, or not ready
 * before the deadline.
 */
function readHookInput(fd = 0) {
    try {
        const chunks = [];
        let total = 0;
        const buffer = Buffer.allocUnsafe(64 * 1024);
        const deadline = Date.now() + INPUT_DEADLINE_MS;
        while (true) {
            let bytesRead;
            try {
                bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
            } catch (err) {
                if (err && err.code === 'EAGAIN' && Date.now() < deadline) {
                    sleepSync(EAGAIN_WAIT_MS);
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
        return isPlainObject(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * True for the events that carry a bin: a user prompt, a sub-agent start, or a session start reporting a
 * compaction or a clear. Pure; opens no file.
 */
function isDeliverableEvent(input) {
    if (!isPlainObject(input)) return false;
    if (input.hook_event_name === SESSION_START_EVENT) return CONDENSED_SOURCES.includes(input.source);
    return EVENTS.includes(input.hook_event_name);
}

// ── bins from the published projection ──────────────────────────────────────

/**
 * The bins of the bundle as deliverable messages.
 * @param {string} root absolute project root
 * @param {(file: string) => string|null} read file reader (null when unreadable)
 * @returns {{number: number, total: number, tags: string[], text: string}[]} in bin order; a bin
 *   whose protocols are unreadable carries its missing-file list; an unreadable layout yields []
 */
function loadBins(root, read, options = {}) {
    return loadBundle(root, read, options).bins;
}

/**
 * The bins of the bundle and, when the bundle cannot be rendered at all, the short reason.
 * @param {{homeDir?: string, config?: object}} [options] delivery-profile inputs (context-delivery
 *   `resolveProfile`): a caller that must not read the person's own settings supplies them
 * @returns {{bins: object[], problem: string|null}} `problem` is set when the layout or the published
 *   index is unreadable or malformed, or when no bin has a readable protocol. Partly readable
 *   bundles keep every bin, with `missing` naming protocols that could not be rendered.
 */
function loadBundle(root, read, options = {}) {
    const delivery = require('./protocol-delivery.cjs');
    const groupsText = read(path.resolve(root, ...GROUPS_REL.split('/')));
    if (typeof groupsText !== 'string') return { bins: [], problem: 'protocol-groups.json is unreadable' };
    let layout;
    try {
        const group = JSON.parse(groupsText)?.groups?.[UNIVERSAL_GROUP];
        layout = isPlainObject(group) && Array.isArray(group.bins) ? group.bins : null;
    } catch {
        layout = null;
    }
    if (!layout) return { bins: [], problem: 'protocol-groups.json has no universal bins layout' };
    const index = delivery.loadIndex({ root, read: file => {
        const text = read(file);
        return typeof text === 'string' ? text.replace(/\r\n/g, '\n') : null;
    } });
    if (!index) return { bins: [], problem: 'protocols/index.json is unreadable or malformed' };
    const context = require('./context-delivery.cjs');
    const concise = context.resolveProfile(root, options).profile === 'concise';
    const core = concise ? context.readConciseProtocol(root, context.CORE_TAG, read) : null;
    if (core) return { bins: [{ number: 1, total: 1, tags: [context.CORE_TAG], missing: [], text: renderBin(1, 1, [core]) }], problem: null };
    const bins = [];
    let readableCount = 0;
    layout.forEach((tags, i) => {
        if (!Array.isArray(tags)) return;
        const used = [];
        const bodies = [];
        const missing = [];
        for (const tag of tags) {
            const row = typeof tag === 'string' ? index.rows.get(tag) : null;
            if (!row || row.group !== UNIVERSAL_GROUP || row.parts.length !== 1) {
                missing.push(typeof tag === 'string' ? tag : 'invalid-entry');
                continue;
            }
            const raw = read(row.parts[0].abs);
            if (typeof raw !== 'string' || !raw.trim()) {
                missing.push(tag);
                continue;
            }
            used.push(tag);
            bodies.push(raw.replace(/\r\n/g, '\n').replace(/\n+$/, ''));
            readableCount += 1;
        }
        bins.push({ number: i + 1, total: layout.length, tags: used, missing, text: renderBin(i + 1, layout.length, bodies) });
    });
    // A damaged concise projection recovers full compatible rules and remains retryable.
    if (concise && bins.length) bins[0].missing.push(context.CORE_TAG);
    return readableCount ? { bins, problem: null } : { bins: [], problem: 'no universal protocol file is readable' };
}

/**
 * The one line bin 1 delivers when the bundle cannot be rendered. It names the reason and where the
 * rules live, so the model and the person see the loss instead of working without the universal rules.
 */
function unavailableNotice(reason) {
    return `universal protocols unavailable (${reason}): read the files under ${PROTOCOLS_DIR_REL}`;
}

/** Keep diagnostics visible within the same host limit, even for damaged oversized source text. */
function incompleteContext(bin) {
    const names = bin.missing.map(tag => `${tag}.md`).join(', ');
    const listed = names.length <= 700 ? names : `${names.slice(0, 700)}…`;
    const notice = `universal protocols incomplete (bin ${bin.number}; missing ${listed}): read the files under ${PROTOCOLS_DIR_REL}; retry next event`;
    const full = `${bin.text}\n\n${notice}`;
    if (full.length <= MAX_BIN) return full;
    // A damaged file may grow beyond its authored bin. Never hide the diagnostic in a host preview;
    // retain explicit read paths instead of cutting a readable rule in the middle.
    let text = `${binHeader(bin.number, bin.total)}\n\n${notice}\n\nRead remaining rules:`;
    for (const tag of bin.tags) {
        const line = `\n- ${PROTOCOLS_DIR_REL}${tag}.md`;
        if (text.length + line.length > MAX_BIN) break;
        text += line;
    }
    return text;
}

// ── ledger ──────────────────────────────────────────────────────────────────

let ledgerSettings = null;
/** Re-arm settings: byte distance from the token constant, no age re-arm, compaction marks of both hosts. */
function getLedgerSettings() {
    if (!ledgerSettings) {
        const { BYTES_PER_TOKEN } = require('./file-conventions.cjs');
        ledgerSettings = Object.freeze({
            reinjectAfterBytes: UNIVERSAL_REINJECT_TOKENS * BYTES_PER_TOKEN,
            reinjectAfterMinutes: null,
            blindReinjectAfterMinutes: null,
            compactionMarkers: Object.freeze([require('./convention-ledger.cjs').CODEX_COMPACTION_MARKER])
        });
    }
    return ledgerSettings;
}

/** The ledger input of this event: a sub-agent start is always its own scope (`agentStartInput`). */
function scopedInput(input) {
    return require('./convention-ledger.cjs').agentStartInput(input);
}

/**
 * A successful, current delivery is the only reason another carrier may omit principles.
 * `options` are the delivery-profile inputs `loadBundle` takes.
 */
function conciseCoreIsPresent(root, input, read = defaultRead, now = Date.now(), options = {}) {
    try {
        if (!nonBlank(input?.session_id) || (input.hook_event_name === 'SubagentStart' && !nonBlank(input.agent_id))) return false;
        const bundle = loadBundle(root, read, options);
        const bin = bundle.bins[0];
        if (!bin || bin.tags[0] !== 'concise-agent-core' || bin.missing.length) return false;
        const ledger = require('./convention-ledger.cjs');
        const store = path.join(root, ...require('./protocol-delivery.cjs').STORE_SEGMENTS);
        const scope = ledger.scopeFor(input);
        const settings = getLedgerSettings();
        const record = ledger.readRecord(store, input.session_id, scope, 'universal-bin-1');
        const hash = require('node:crypto').createHash('sha256').update(bin.text, 'utf8').digest('hex');
        return ledger.isPresent(record, hash, {
            now, transcriptSize: ledger.transcriptSize(ledger.transcriptPathFor(input)),
            lastCompactionAt: ledger.lastCompactionAt(store, input.session_id, scope, input, settings, now)
        }, settings);
    } catch { return false; }
}

// The independent principles hook can recover an unsuccessful universal delivery,
// including a PostToolUse event, through the same successful-write ledger.
function ensureConciseCore(input, deps = {}) { return deliverBin(1, input, deps); }

/**
 * Remove the main conversation's delivery record of `group`. Never throws: an unusable store has no
 * record to remove, and delivery then runs fail-open without one.
 */
function forgetRecord(ledger, store, input, group) {
    ledger.forgetRecord(store, input, group);
}

function defaultWrite(text, done) {
    let settled = false;
    const finish = ok => {
        if (settled) return;
        settled = true;
        done(ok);
    };
    // Failed writes report through the callback and then the stream's error event.
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

// ── hook entry ──────────────────────────────────────────────────────────────

/**
 * Deliver bin `number` for one event. Resolves to the payload written, or '' when nothing was
 * delivered.
 * @param {number} number 1-based bin number
 * @param {object} input hook stdin JSON (untrusted)
 * @param {object} deps test seams: projectRoot, readFile, now, write, and the delivery-profile inputs
 *   homeDir and config (omitted, the person's own settings decide the profile)
 */
function deliverBin(number, input, deps) {
    return new Promise(resolve => {
        const write = typeof deps.write === 'function' ? deps.write : defaultWrite;
        const envelope = text => JSON.stringify({ hookSpecificOutput: { hookEventName: input.hook_event_name, additionalContext: text } });
        // Bin 1 alone reports a bundle that cannot be rendered, once per event and with no record, so the
        // next event retries and the other bins never repeat the line.
        const unavailable = reason => {
            if (number !== 1) return resolve('');
            const payload = envelope(unavailableNotice(reason));
            try {
                write(payload, ok => resolve(ok === false ? '' : payload));
            } catch {
                resolve('');
            }
        };
        try {
            const delivery = require('./protocol-delivery.cjs');
            const root = delivery.resolveRoot(input, deps);
            if (!root) return resolve('');
            const reader = typeof deps.readFile === 'function' ? deps.readFile : defaultRead;
            const bundle = loadBundle(root, reader, require('./context-delivery.cjs').profileOptions(deps));
            if (bundle.problem) return unavailable(bundle.problem);
            const bin = bundle.bins.find(candidate => candidate.number === number);
            if (!bin) return resolve('');
            if (bin.missing.length) {
                // Forget any previous complete record: repairing identical bytes must still deliver.
                // Partial rules are never proof of a completed delivery and retry on the next event.
                if (nonBlank(input.session_id)) {
                    const ledger = require('./convention-ledger.cjs');
                    const store = path.join(root, ...delivery.STORE_SEGMENTS);
                    forgetRecord(ledger, store, scopedInput(input), `universal-bin-${number}`);
                }
                const partial = envelope(incompleteContext(bin));
                return write(partial, ok => resolve(ok === false ? '' : partial));
            }
            const payload = envelope(bin.text);
            const now = typeof deps.now === 'number' ? deps.now : Date.now();
            if (!nonBlank(input.session_id)) {
                // No session to remember in: deliver, record nothing.
                return write(payload, ok => resolve(ok === false ? '' : payload));
            }
            const crypto = require('node:crypto');
            const ledger = require('./convention-ledger.cjs');
            const store = path.join(root, ...delivery.STORE_SEGMENTS);
            const group = `universal-bin-${number}`;
            // A compaction or clear report drops this bin from the conversation: forget its record so the
            // ledger delivers it now (a host that keeps the session id across /clear leaves a record that
            // still says delivered). The delivery stamps a new record, so the following prompt stays silent.
            // Ordering: the primary host writes its compact_boundary line AFTER its SessionStart(compact)
            // hooks have run, so at delivery time the transcript holds no boundary for this compaction and the
            // line that follows is stamped later than the record. A `compact` delivery therefore records that
            // one boundary is expected (`expectBoundary`): the ledger attributes the first boundary within its
            // attribution window to this same compaction, so the next prompt stays silent. A boundary already
            // written before the hook (another host order) is covered by the delivery stamp itself. `clear`
            // writes no boundary line and expects none.
            const isSessionStart = input.hook_event_name === SESSION_START_EVENT;
            if (isSessionStart) forgetRecord(ledger, store, input, group);
            ledger.deliverOnce({
                root: store,
                input: scopedInput(input),
                group,
                hash: crypto.createHash('sha256').update(bin.text, 'utf8').digest('hex'),
                payload,
                settings: getLedgerSettings(),
                now,
                write,
                failOpen: true,
                expectBoundary: isSessionStart && input.source === 'compact'
            }).then(resolve, () => resolve(''));
        } catch {
            unavailable('the delivery code failed to run');
        }
    });
}

/**
 * Hook entry for one bin. Always leaves exit code 0 (delivery never blocks).
 * @param {number} number 1-based bin number (a literal in each entry file, never an argument)
 * @param {object} [deps] test seams: `input` (skips stdin), `write(text, done)`, `now`, `projectRoot`, `readFile`,
 *   `homeDir` and `config` (the delivery-profile inputs)
 * @returns {Promise<string>} the payload written, or '' when nothing was delivered
 */
function runHook(number, deps = {}) {
    process.exitCode = 0;
    const options = isPlainObject(deps) ? deps : {};
    return new Promise(resolve => {
        let settled = false;
        const finish = value => {
            if (settled) return;
            settled = true;
            process.exitCode = 0;
            resolve(value);
        };
        try {
            const input = options.input !== undefined ? options.input : readHookInput();
            if (!isDeliverableEvent(input)) return finish('');
            const rootDir = require('./protocol-delivery.cjs').resolveRoot(input, options);
            if (!rootDir || !require('./framework-runtime.cjs').isHookEnabled(`protocol-inject-universal-${number}.cjs`, { rootDir })) return finish('');
            deliverBin(number, input, options).then(finish, () => finish(''));
        } catch {
            finish('');
        }
    });
}

module.exports = {
    UNIVERSAL_GROUP,
    UNIVERSAL_REINJECT_TOKENS,
    MAX_BIN,
    binHeader,
    renderBin,
    isDeliverableEvent,
    readHookInput,
    loadBins,
    loadBundle,
    conciseCoreIsPresent,
    ensureConciseCore,
    unavailableNotice,
    getLedgerSettings,
    runHook
};
