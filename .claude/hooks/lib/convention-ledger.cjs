/**
 * Convention Ledger — per-session, per-working-context delivery memory for the
 * file-convention-inject hook (spec BR-PFCI-05/06/07/15/16/17).
 *
 * Layout (all ids sanitized):
 *   <root>/<session>/_owner.json              { owner }                  ownership marker (see markSessionOwned)
 *   <root>/<session>/_session.json            { compactedAt }            host-reported condensation
 *   <root>/<session>/_<name>.json             a caller's own session state (writeSessionState)
 *   <root>/<session>/<scope>/_scan.json       { offset, lastBoundaryAt } incremental transcript scan
 *   <root>/<session>/<scope>/<group>.json     { hash, deliveredAt, transcriptBytes, form }
 *   <root>/<session>/<scope>/<group>.lock     short-lived delivery claim (wx) { pid, at, token }
 *   <root>/_prune.json                        { at }                     last retention sweep
 * root = $CK_CONVENTIONS_DIR || <os tmp>/ck/conventions
 * Group file ids never start with `_` (reserved for the ledger's own state files).
 *
 * Records are written only after the digest was handed to the host (BR-PFCI-17).
 * Every function is fail-safe: IO errors never throw to the hook.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CK_TMP_DIR } = require('./ck-paths.cjs');
const { DEFAULTS, CONTENT_LIMITS, toRepoRelative } = require('./file-conventions.cjs');
const { isPrivacySensitive } = require('./sensitive-path-policy.cjs');

const MAIN_SCOPE = 'main';
const ID_MAX = 80;
const LOCK_STALE_MS = 10 * 1000;
/** How long after a compact-report delivery the host's own boundary line still belongs to that compaction (observed skew: under 10 s). */
const BOUNDARY_ATTRIBUTION_MS = 120 * 1000;
const SCAN_CAP_BYTES = 8 * 1024 * 1024;
const PRUNE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PRUNE_LIMIT = 50;
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SCOPE_DIR_NAME = /^(?:main|agent-[A-Za-z0-9._-]+)$/;
const SCOPE_FILE_NAME = /\.(?:json|lock|tmp)$/;
const SESSION_FILE_NAME = /^(?:_[A-Za-z0-9._-]+\.json|.+\.tmp)$/;
const OWNER_FILE = '_owner.json';
const OWNER_TAG = 'ck-convention-ledger';
const BUILTIN_BOUNDARY = '"subtype":"compact_boundary"';
/**
 * The second host (Codex) writes a compaction into its conversation record as a TOP-LEVEL
 * `{"timestamp":…,"ordinal":…,"type":"compacted","payload":{…}}` line, never the primary host's
 * `compact_boundary` subtype. Anchored at the line start with no brace or bracket before the key, so
 * only a record's own top-level `type` matches: the same words inside a nested payload, or inside a
 * string (where the quotes are escaped), never do. A false match costs one extra delivery. Ledger
 * users that re-arm on compaction pass it in their `compactionMarkers` setting.
 */
const CODEX_COMPACTION_MARKER = '^\\{[^{}\\[\\]]*"type"\\s*:\\s*"compacted"';
const FILESYSTEM_SAFE_ID = /^[A-Za-z0-9._-]+$/;
// Forms that put a class in the working context. A class left out of the digest ('omitted')
// was never delivered, so it can neither be recorded nor count as present (BR-PFCI-08).
// 'evidence' = the class's protocol reached the context another way (a transcript read of its
// evidence docs or a load of an evidence skill, see scanEvidence); it ages exactly like a delivery.
const RECORDED_FORMS = new Set(['full', 'references', 'evidence']);
const PRESENT_FORMS = new Set(['full', 'references', 'static', 'evidence']);

function storeRoot(env = process.env) {
    return env && typeof env.CK_CONVENTIONS_DIR === 'string' && env.CK_CONVENTIONS_DIR.trim()
        ? env.CK_CONVENTIONS_DIR
        : path.join(CK_TMP_DIR, 'conventions');
}

/**
 * Filesystem-safe id. When sanitizing changes the raw id, an 8-hex digest of the
 * raw id is appended so ids differing only in unsafe characters stay distinct.
 */
function sanitizeId(raw) {
    const text = raw === undefined || raw === null ? '' : String(raw);
    let clean = text.replace(/[^A-Za-z0-9._-]/g, '_');
    if (clean === '' || /^\.+$/.test(clean)) clean = '_';
    if (clean === text && clean.length <= ID_MAX) return clean;
    const digest = crypto.createHash('sha256').update(text).digest('hex').slice(0, 8);
    return `${clean.slice(0, ID_MAX - 9)}-${digest}`;
}

function nonBlank(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

/** Working context: helper agent when the host identifies one, else the main conversation. */
function scopeFor(input) {
    return input && nonBlank(input.agent_id) ? `agent-${sanitizeId(input.agent_id)}` : MAIN_SCOPE;
}

/**
 * The ledger input of an event. A sub-agent start is always its own scope: a host that reports no
 * agent id would otherwise share the main conversation's record and the agent would get nothing.
 */
function agentStartInput(input) {
    if (!input || input.hook_event_name !== 'SubagentStart' || nonBlank(input.agent_id)) return input;
    return { ...input, agent_id: `start-${crypto.randomBytes(6).toString('hex')}` };
}

/** True for the host's report that it just compacted the conversation (session start, source `compact`). */
function isCompactionStart(input) {
    return Boolean(input) && input.hook_event_name === 'SessionStart' && input.source === 'compact';
}

function sessionDir(root, sessionId) {
    return path.join(root, sanitizeId(nonBlank(sessionId) ? sessionId : 'unknown-session'));
}

function scopeDir(root, sessionId, scope) {
    return path.join(sessionDir(root, sessionId), scope);
}

function readJson(file) {
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/** Atomic write (temp + rename). Returns false on any IO failure; a failed write leaves no temp file. */
function writeJsonAtomic(file, value) {
    let temp = null;
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
        fs.writeFileSync(temp, JSON.stringify(value));
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

/**
 * Stamp the session directory with the ledger's own ownership marker, which `pruneStale`
 * requires before it deletes anything. Shape alone cannot prove ownership — a foreign
 * `<dir>/main/<name>.json` tree is shape-identical to a session — and the store root is
 * overridable, so the marker is the only positive proof. Written once (`wx`); a marker that
 * cannot be written costs a session that is never pruned, never someone else's files.
 * @returns {boolean} true when the marker is in place (freshly written or already there)
 */
function markSessionOwned(root, sessionId) {
    const dir = sessionDir(root, sessionId);
    try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, OWNER_FILE), JSON.stringify({ owner: OWNER_TAG }), { flag: 'wx' });
        return true;
    } catch (err) {
        return Boolean(err) && err.code === 'EEXIST';
    }
}

/** Atomic write of session-scoped state, stamping the ownership marker retention requires. */
function writeSessionJsonAtomic(root, sessionId, file, value) {
    markSessionOwned(root, sessionId);
    return writeJsonAtomic(file, value);
}

/** A session-scoped state file `<session>/_<name>.json`; the `_` keeps it apart from group records. */
function sessionStateFile(root, sessionId, name) {
    return path.join(sessionDir(root, sessionId), `_${sanitizeId(name)}.json`);
}

/** Read a session's own state object (`_<name>.json`), or null when absent or unreadable. */
function readSessionState(root, sessionId, name) {
    return readJson(sessionStateFile(root, sessionId, name));
}

/** Write a session's own state object atomically, stamping the ownership marker retention requires. */
function writeSessionState(root, sessionId, name, value) {
    return writeSessionJsonAtomic(root, sessionId, sessionStateFile(root, sessionId, name), value);
}

/** Group file id: sanitized name, never starting with `_` (reserved for `_scan`/`_session` state). */
function groupFileId(groupName) {
    const id = sanitizeId(groupName);
    if (!id.startsWith('_')) return id;
    const digest = crypto.createHash('sha256').update(String(groupName)).digest('hex').slice(0, 8);
    return `g${id.slice(0, ID_MAX - 10)}-${digest}`;
}

function recordFile(root, sessionId, scope, groupName) {
    return path.join(scopeDir(root, sessionId, scope), `${groupFileId(groupName)}.json`);
}

function lockFile(root, sessionId, scope, groupName) {
    return path.join(scopeDir(root, sessionId, scope), `${groupFileId(groupName)}.lock`);
}

function readRecord(root, sessionId, scope, groupName) {
    return readJson(recordFile(root, sessionId, scope, groupName));
}

function writeRecordAtomic(root, sessionId, scope, groupName, record) {
    if (!record || !RECORDED_FORMS.has(record.form)) return false;
    return writeSessionJsonAtomic(root, sessionId, recordFile(root, sessionId, scope, groupName), record);
}

function tryCreateLock(file, now) {
    const token = crypto.randomBytes(8).toString('hex');
    const fd = fs.openSync(file, 'wx');
    try {
        fs.writeSync(fd, JSON.stringify({ pid: process.pid, at: now, token }));
    } finally {
        fs.closeSync(fd);
    }
    return token;
}

/**
 * Claim a group's delivery. Returns the claim token (truthy) or false.
 * A lock whose file mtime is at least LOCK_STALE_MS old is stale: unlink it and retry once.
 * Fresh peer lock ⇒ false. Any IO failure (e.g. unwritable store) ⇒ false (caller skips delivery).
 */
function acquireLock(file, now = Date.now(), staleMs = LOCK_STALE_MS) {
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
    } catch {
        return false;
    }
    try {
        return tryCreateLock(file, now);
    } catch (err) {
        if (!err || err.code !== 'EEXIST') return false;
    }
    try {
        // A peer could replace the stale lock between this stat and the unlink; the hook's
        // post-lock presence re-check bounds that residual race (plan P5, H1).
        if (now - fs.statSync(file).mtimeMs < staleMs) return false;
        fs.unlinkSync(file);
    } catch (err) {
        if (!err || err.code !== 'ENOENT') return false;
    }
    try {
        return tryCreateLock(file, now);
    } catch {
        return false;
    }
}

/**
 * Release a claim. With a token, only the claim that still carries it is removed: after a
 * stale takeover the original holder must not delete the new holder's live lock.
 */
function releaseLock(file, token) {
    try {
        if (token !== undefined) {
            const current = readJson(file);
            if (!current || current.token !== token) return;
        }
        fs.unlinkSync(file);
    } catch {
        /* already gone */
    }
}

/** A lock file that exists and is younger than the stale limit: a live peer is delivering. */
function peerHoldsLock(file, now = Date.now(), staleMs = LOCK_STALE_MS) {
    try {
        const stat = fs.statSync(file);
        return stat.isFile() && now - stat.mtimeMs < staleMs;
    } catch {
        return false;
    }
}

function transcriptSize(file) {
    if (!nonBlank(file)) return null;
    try {
        const stat = fs.statSync(file);
        return stat.isFile() ? stat.size : null;
    } catch {
        return null;
    }
}

/**
 * Transcript for the working context: main ⇒ `transcript_path`; helper agent ⇒
 * `<dir>/<session_id>/subagents/agent-<agent_id>.jsonl` (observed Claude layout) when the
 * agent and session ids are filesystem-safe path segments (not `.`/`..`); otherwise none
 * (age re-arm applies).
 */
function isSafeSegment(value) {
    const text = String(value || '');
    return FILESYSTEM_SAFE_ID.test(text) && !/^\.+$/.test(text);
}

function transcriptPathFor(input) {
    if (!input || !nonBlank(input.transcript_path)) return null;
    if (!nonBlank(input.agent_id)) return input.transcript_path;
    if (!isSafeSegment(input.agent_id) || !isSafeSegment(input.session_id)) return null;
    return path.join(path.dirname(input.transcript_path), input.session_id, 'subagents', `agent-${input.agent_id}.jsonl`);
}

/**
 * A condensation seen without its own time is placed just before `now`, so a delivery made
 * in the same trigger (deliveredAt = now) counts as after it (no duplicate reminder).
 */
function inferredBoundary(now) {
    return now - 1;
}

function boundaryTime(line, now) {
    try {
        const parsed = JSON.parse(line);
        const ts = parsed && typeof parsed.timestamp === 'string' ? Date.parse(parsed.timestamp) : NaN;
        return Number.isFinite(ts) ? ts : inferredBoundary(now);
    } catch {
        return inferredBoundary(now);
    }
}

function compileMarkers(markers) {
    return (Array.isArray(markers) ? markers : []).map(source => {
        try {
            return new RegExp(source);
        } catch {
            return null;
        }
    }).filter(Boolean);
}

/**
 * Incremental transcript scan for condensation marks (BR-PFCI-06).
 * First scan of a large transcript (size ≥ reinjectAfterBytes) starts at EOF — any
 * earlier delivery is void by distance anyway. More than the scan cap appended ⇒
 * assume condensation. A shrunk transcript is rescanned from the start.
 *
 * `opts.owned` says the caller owns `root`, so a scan-state write also stamps the ownership
 * marker retention needs. It defaults to false because this scanner is BORROWED: the prompt
 * ledger runs it against its own store (lib/prompt-ledger-store.cjs), and stamping this
 * ledger's marker there would both mis-claim a foreign store and make that store's own
 * retention treat every session as unrecognized.
 * @returns {number|null} latest boundary time (ms) seen for this scope, or null
 */
function scanCompaction(root, sessionId, scope, transcriptFile, settings = {}, now = Date.now(), opts = {}) {
    const stateFile = path.join(scopeDir(root, sessionId, scope), '_scan.json');
    const state = readJson(stateFile);
    const size = transcriptSize(transcriptFile);
    const known = state && typeof state.lastBoundaryAt === 'number' ? state.lastBoundaryAt : null;
    if (size === null) return known;
    const capBytes = opts.scanCapBytes || SCAN_CAP_BYTES;
    const reinjectAfterBytes = settings.reinjectAfterBytes || DEFAULTS.reinjectAfterBytes;
    const storedOffset = state && Number.isInteger(state.offset) && state.offset >= 0 ? state.offset : null;
    let offset = storedOffset;
    let lastBoundaryAt = known;
    // Unchanged state is not rewritten (a no-growth trigger costs one stat and one read).
    const saveState = (nextOffset, nextBoundary) => {
        if (nextOffset !== storedOffset || nextBoundary !== known) {
            if (opts.owned) markSessionOwned(root, sessionId);
            writeJsonAtomic(stateFile, { offset: nextOffset, lastBoundaryAt: nextBoundary });
        }
    };

    if (offset === null && size >= reinjectAfterBytes) {
        saveState(size, lastBoundaryAt);
        return lastBoundaryAt;
    }
    if (offset === null || size < offset) offset = 0;
    if (size - offset > capBytes) {
        lastBoundaryAt = Math.max(lastBoundaryAt === null ? -Infinity : lastBoundaryAt, inferredBoundary(now));
        saveState(size, lastBoundaryAt);
        return lastBoundaryAt;
    }
    if (size > offset) {
        let chunk = '';
        try {
            const fd = fs.openSync(transcriptFile, 'r');
            try {
                const buffer = Buffer.alloc(size - offset);
                const read = fs.readSync(fd, buffer, 0, buffer.length, offset);
                chunk = buffer.slice(0, read).toString('utf8');
            } finally {
                fs.closeSync(fd);
            }
        } catch {
            return lastBoundaryAt;
        }
        const lastNewline = chunk.lastIndexOf('\n');
        if (lastNewline >= 0) {
            const complete = chunk.slice(0, lastNewline + 1);
            const markers = compileMarkers(settings.compactionMarkers);
            for (const line of complete.split('\n')) {
                if (!line) continue;
                if (line.includes(BUILTIN_BOUNDARY) || markers.some(re => re.test(line))) {
                    const at = boundaryTime(line, now);
                    lastBoundaryAt = lastBoundaryAt === null ? at : Math.max(lastBoundaryAt, at);
                }
            }
            offset += Buffer.byteLength(complete, 'utf8');
        }
    }
    saveState(offset, lastBoundaryAt);
    return lastBoundaryAt;
}

function readSessionCompaction(root, sessionId) {
    const state = readJson(path.join(sessionDir(root, sessionId), '_session.json'));
    return state && typeof state.compactedAt === 'number' ? state.compactedAt : null;
}

/** Host-reported condensation / clear for the session (the report does not say which context). Prints nothing. */
function recordSessionCompaction(root, sessionId, now = Date.now()) {
    return writeSessionJsonAtomic(root, sessionId, path.join(sessionDir(root, sessionId), '_session.json'), { compactedAt: now });
}

/**
 * Latest condensation affecting a scope (BR-PFCI-06): max(host report, the scope's own
 * history mark). The host report does not identify the condensed context, so it applies to
 * the main conversation and to any helper whose own history cannot be measured; a helper
 * with a measurable history records its own condensation marks and is not re-armed by a
 * sibling's. `-Infinity` when none was ever seen (so a session-start credit at time 0 counts).
 */
function lastCompactionAt(root, sessionId, scope, input, settings, now = Date.now(), opts = {}) {
    const history = transcriptPathFor(input);
    const measurable = transcriptSize(history) !== null;
    const session = scope === MAIN_SCOPE || !measurable ? readSessionCompaction(root, sessionId) : null;
    // This entry point is this ledger's own: `root` is the convention store, so a scan-state
    // write claims the session. Without it a context covered by static credit alone would
    // write scan state and never a record, leaving an unmarked directory retention can never
    // reclaim (BR-PFCI-18).
    const scanned = scanCompaction(root, sessionId, scope, history, settings, now, { ...opts, owned: true });
    const candidates = [session, scanned].filter(v => typeof v === 'number');
    return candidates.length ? Math.max(...candidates) : -Infinity;
}

/**
 * BR-PFCI-05 presence: delivered form ∧ current version ∧ delivered strictly after the last
 * condensation ∧ distance below limit (0 ≤ growth < reinjectAfterBytes; unknown size ⇒ age).
 * A history shorter than at delivery was replaced or rewritten, so the delivery is treated as
 * absent (an extra reminder, never a missed one).
 *
 * Which age limit applies (BR-PFCI-15): a context whose size is unknown but whose condensations
 * ARE observed (a host report, or marks in its own history) keeps the normal
 * `reinjectAfterMinutes` — age is only a distance proxy there. A context that is BLIND —
 * size unknown AND no condensation ever observed, so `lastCompactionAt` is -Infinity and the
 * test above cannot fail — uses the much shorter `blindReinjectAfterMinutes`, because an
 * unseen condensation would otherwise suppress the reminder for the whole window.
 *
 * ctx = { lastCompactionAt, transcriptSize (number|null), now }
 */
function isPresent(record, hash, ctx, settings) {
    if (!record || !PRESENT_FORMS.has(record.form)) return false;
    if (record.hash !== hash || typeof record.deliveredAt !== 'number') return false;
    if (!(record.deliveredAt > ctx.lastCompactionAt)) return false;
    if (typeof ctx.transcriptSize === 'number') {
        // A record written while the history did not exist yet carries no size: everything in the
        // file now is growth since that delivery, so the baseline is 0. Falling through to the age
        // path instead would keep a no-age setting present for ever, and the byte re-arm would never fire.
        const baseline = typeof record.transcriptBytes === 'number' ? record.transcriptBytes : 0;
        const growth = ctx.transcriptSize - baseline;
        return growth >= 0 && growth < settings.reinjectAfterBytes;
    }
    const blind = !Number.isFinite(ctx.lastCompactionAt);
    const minutes = blind ? settings.blindReinjectAfterMinutes : settings.reinjectAfterMinutes;
    // Some advisory injections deliberately disable age-only re-arming. When a host cannot
    // expose context size, elapsed wall time is not evidence that the context crossed a token
    // boundary. Keep the delivery present until content, session, or compaction evidence changes.
    if (minutes === null) return true;
    // A record stamped in the future (clock moved backwards, or a store carried over from
    // another machine) is treated as absent, exactly as the byte path treats negative growth:
    // an unmeasurable distance costs one extra reminder, never a missed one.
    const elapsed = ctx.now - record.deliveredAt;
    return elapsed >= 0 && elapsed < minutes * 60 * 1000;
}

/**
 * A delivery made by a SessionStart `compact` hook is recorded BEFORE the host writes its own
 * compaction boundary into the transcript (observed host order: the hook stamps earlier than the
 * boundary line). Read plainly, that boundary is "newer than the delivery" and the next prompt would
 * deliver the same content a second time. Such a record carries `expectBoundary: true`; the first
 * boundary seen up to BOUNDARY_ATTRIBUTION_MS after its `deliveredAt` is the SAME compaction, so the
 * record is moved just past that boundary and the expectation is dropped. A boundary beyond the
 * window, or a later one after the record was moved, is a real compaction and re-arms as usual; with no
 * boundary at all nothing changes.
 *
 * Trade-off (accepted, not material): a genuine second compaction inside the window and before the next
 * prompt reads as the same one, so that second compaction is not re-delivered until the next boundary
 * or the byte re-arm.
 * @returns {object|null} the record to judge: `record` itself, or the adopted copy
 */
function adoptExpectedBoundary(record, hash, ctx) {
    if (!record || record.expectBoundary !== true || record.hash !== hash || typeof record.deliveredAt !== 'number') return record;
    const boundary = ctx.lastCompactionAt;
    // Equal millisecond stamps still identify the boundary this delivery expected.
    // Presence is strictly after a boundary, so equality also needs attribution.
    if (!Number.isFinite(boundary) || boundary < record.deliveredAt) return record;
    if (boundary - record.deliveredAt > BOUNDARY_ATTRIBUTION_MS) return record;
    const { expectBoundary, ...rest } = record;
    return { ...rest, deliveredAt: boundary + 1 };
}

/**
 * The context for the post-lock re-check (BR-PFCI-17). A peer that delivered between this
 * process's check and its claim stamped `deliveredAt` from its own clock reading, which is
 * taken after ours when it started later — so the plain `isPresent` future-stamp guard would
 * read the peer's fresh record as absent and deliver the same class twice. A live peer can only
 * have claimed and written inside the lock window, so the re-check reads the clock up to
 * LOCK_STALE_MS ahead. The cost stays on the safe side everywhere else: a record within that
 * window of expiring reads expired (one extra reminder).
 */
function recheckContext(ctx) {
    return { ...ctx, now: ctx.now + LOCK_STALE_MS };
}

function normalizedDocPath(value) {
    const slashed = String(value).replace(/\\/g, '/').replace(/^\.\//, '');
    return process.platform === 'win32' ? slashed.toLowerCase() : slashed;
}

/** Last `:`-separated segment, so a namespaced skill (`plugin:ui-design`) matches its bare name. */
function bareSkill(value) {
    const text = String(value).trim().replace(/^[/$]/, '');
    return text.slice(text.lastIndexOf(':') + 1);
}

/** Raw complete text only; unknown tool-specific decorations never prove a full load. */
function resultText(item) {
    if (item.is_error !== undefined && item.is_error !== false) return null;
    if (typeof item.content === 'string') return item.content;
    if (!Array.isArray(item.content) || !item.content.length) return null;
    if (!item.content.every(block => block && block.type === 'text' && typeof block.text === 'string')) return null;
    return item.content.map(block => block.text).join('');
}

/**
 * Complete current owned text, not the content matcher’s bounded prefix. One scan owns the
 * cache/8 MiB budget; each file retains the content reader's 2 MiB bound. Resolve before opening,
 * then check the opened regular file's identity and stability; no foreign transcript path is read.
 */
function createEvidenceReader(projectDir) {
    const cache = new Map();
    let remaining = SCAN_CAP_BYTES;
    return rel => {
        if (isPrivacySensitive(rel)) return null;
        if (cache.has(rel)) return cache.get(rel);
        let fd = null;
        let text = null;
        try {
            const absolute = path.resolve(projectDir, rel);
            const physicalRoot = fs.realpathSync(projectDir);
            const physical = fs.realpathSync(absolute);
            const physicalRelative = toRepoRelative(physical, physicalRoot, physicalRoot);
            if (physicalRelative === null || isPrivacySensitive(physicalRelative)) return null;
            const before = fs.statSync(physical);
            if (!before.isFile() || before.size === 0 || before.size > CONTENT_LIMITS.maxFileBytes || before.size > remaining) return null;
            // O_NONBLOCK also prevents a raced-in special file from stalling this advisory scanner.
            fd = fs.openSync(physical, fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0) | (fs.constants.O_NOFOLLOW || 0));
            const opened = fs.fstatSync(fd);
            if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino || opened.size !== before.size) return null;
            remaining -= opened.size;
            const buffer = Buffer.alloc(opened.size);
            let offset = 0;
            while (offset < buffer.length) {
                const read = fs.readSync(fd, buffer, offset, buffer.length - offset, offset);
                if (!read) return null;
                offset += read;
            }
            const after = fs.fstatSync(fd);
            const current = fs.statSync(physical);
            if (current.dev !== after.dev || current.ino !== after.ino || current.size !== after.size || current.mtimeMs !== after.mtimeMs || current.ctimeMs !== after.ctimeMs) return null;
            if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs || fs.realpathSync(absolute) !== physical) return null;
            const decoded = buffer.toString('utf8');
            if (!buffer.includes(0) && Buffer.from(decoded, 'utf8').equals(buffer)) text = decoded;
        } catch {
            // Missing, changed, non-text, over-budget or unreadable content means an extra reminder.
        } finally {
            if (fd !== null) {
                try { fs.closeSync(fd); } catch { /* fail-open */ }
            }
            cache.set(rel, text);
        }
        return text;
    };
}

/**
 * BR-PFCI-26: only a completed successful full owned body proves presence. Recognized API
 * tool_use.id / tool_result.tool_use_id pairs carry raw strings or all-text-block content.
 * Unknown host decorations, launch acknowledgments and slash requests give no credit.
 * Both halves must remain after compaction and inside the bounded transcript window.
 * All required documents or any full listed local skill suffices. Credit ages from the result,
 * oldest required document first. This does not claim a model obeys the loaded content.
 * @param {string|null} transcriptFile
 * @param {{docs?: string[], skills?: string[]}} evidence
 * @param {{projectDir: string, cwd?: string, windowBytes: number, lastCompactionAt?: number, compactionMarkers?: string[], capBytes?: number}} opts
 * @returns {{at: number, transcriptBytes: number}|null}
 */
function scanEvidence(transcriptFile, evidence, opts = {}) {
    if (!opts || typeof opts !== 'object' || !nonBlank(opts.projectDir)) return null;
    const docs = (evidence && Array.isArray(evidence.docs) ? evidence.docs : []).filter(nonBlank).map(normalizedDocPath);
    const skills = new Set((evidence && Array.isArray(evidence.skills) ? evidence.skills : []).filter(nonBlank).map(bareSkill));
    if (!docs.length && !skills.size) return null;
    const docPaths = new Map(docs.map(doc => [doc, toRepoRelative(doc, opts.projectDir, opts.projectDir)]));
    const skillPaths = new Map([...skills].filter(name => /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(name))
        .map(name => [name, `.claude/skills/${name}/SKILL.md`]));
    const readBody = createEvidenceReader(opts.projectDir);
    const size = transcriptSize(transcriptFile);
    const windowBytes = Number.isInteger(opts.windowBytes) && opts.windowBytes > 0 ? opts.windowBytes : 0;
    const cap = opts.capBytes === undefined ? SCAN_CAP_BYTES : opts.capBytes;
    if (!size || !windowBytes || !Number.isInteger(cap) || cap <= 0) return null;
    const length = Math.min(size, windowBytes, cap, SCAN_CAP_BYTES);
    const start = size - length;
    let text;
    try {
        const fd = fs.openSync(transcriptFile, 'r');
        try {
            const buffer = Buffer.alloc(length);
            const read = fs.readSync(fd, buffer, 0, length, start);
            text = buffer.subarray(0, read).toString('utf8');
        } finally {
            fs.closeSync(fd);
        }
    } catch {
        return null;
    }
    const lastCompaction = typeof opts.lastCompactionAt === 'number' ? opts.lastCompactionAt : -Infinity;
    const markers = compileMarkers(opts.compactionMarkers);
    let offset = start;
    if (start > 0) {
        const firstNewline = text.indexOf('\n');
        if (firstNewline < 0) return null;
        offset += Buffer.byteLength(text.slice(0, firstNewline + 1), 'utf8');
        text = text.slice(firstNewline + 1);
    }
    let docReads = new Map();
    let skillHit = null;
    const pending = new Map();
    const seen = new Set();
    const completed = new Set();
    const invalidate = id => {
        pending.delete(id);
        for (const [doc, hit] of docReads) if (hit.id === id) docReads.delete(doc);
        if (skillHit && skillHit.id === id) skillHit = null;
    };
    for (const line of text.split('\n')) {
        const lineStart = offset;
        offset += Buffer.byteLength(line, 'utf8') + 1;
        if (!line) continue;
        if (line.includes(BUILTIN_BOUNDARY) || markers.some(re => re.test(line))) {
            docReads = new Map();
            skillHit = null;
            pending.clear();
            continue;
        }
        if (!line.includes('"tool_use"') && !line.includes('"tool_result"')) continue;
        let parsed;
        try { parsed = JSON.parse(line); } catch { continue; }
        const ts = parsed && typeof parsed.timestamp === 'string' ? Date.parse(parsed.timestamp) : NaN;
        const at = Number.isFinite(ts) ? ts : (Number.isFinite(lastCompaction) ? null : 0);
        if (at === null || !(at > lastCompaction)) continue;
        const content = parsed && parsed.message && Array.isArray(parsed.message.content) ? parsed.message.content : [];
        for (const item of content) {
            if (!item || typeof item !== 'object') continue;
            if (item.type === 'tool_use' && nonBlank(item.id)) {
                if (seen.has(item.id)) { invalidate(item.id); continue; }
                seen.add(item.id);
                const input = item.input && typeof item.input === 'object' && !Array.isArray(item.input) ? item.input : {};
                let rel = null;
                if (item.name === 'Read' && nonBlank(input.file_path) && (input.offset === undefined || input.offset === 1) && input.limit === undefined) {
                    rel = toRepoRelative(input.file_path.replace(/\\/g, '/'), opts.projectDir, nonBlank(parsed.cwd) ? parsed.cwd : opts.cwd);
                } else if (item.name === 'Skill' && nonBlank(input.skill)) {
                    rel = skillPaths.get(bareSkill(input.skill)) || null;
                }
                if (rel && ([...docPaths.values()].includes(rel) || [...skillPaths.values()].includes(rel))) pending.set(item.id, { rel, at });
            } else if (item.type === 'tool_result' && nonBlank(item.tool_use_id)) {
                const id = item.tool_use_id;
                if (completed.has(id)) { invalidate(id); continue; }
                completed.add(id);
                const use = pending.get(id);
                pending.delete(id);
                if (!use || at < use.at) continue;
                const returned = resultText(item);
                if (returned === null || returned !== readBody(use.rel)) continue;
                const hit = { at, transcriptBytes: lineStart, id };
                for (const [doc, rel] of docPaths) if (use.rel === rel) docReads.set(doc, hit);
                if ([...skillPaths.values()].includes(use.rel)) skillHit = hit;
            }
        }
    }
    const candidates = [];
    if (skillHit) candidates.push(skillHit);
    if (docs.length && docs.every(doc => docReads.has(doc))) candidates.push(docs.map(doc => docReads.get(doc)).reduce((a, b) => a.transcriptBytes <= b.transcriptBytes ? a : b));
    if (!candidates.length) return null;
    const { at, transcriptBytes } = candidates.reduce((a, b) => a.transcriptBytes >= b.transcriptBytes ? a : b);
    return { at, transcriptBytes };
}

const carrierCache = new Map();

/** Texts of the root static carriers that exist (each file separately; missing ones skipped). */
function carrierTexts(projectDir) {
    if (carrierCache.has(projectDir)) return carrierCache.get(projectDir);
    const texts = [];
    for (const name of ['CLAUDE.md', 'AGENTS.md']) {
        try {
            texts.push(fs.readFileSync(path.join(projectDir, name), 'utf8'));
        } catch {
            /* optional carrier */
        }
    }
    carrierCache.set(projectDir, texts);
    return texts;
}

/**
 * BR-PFCI-16 static credit (main scope only, measurable transcript only): when EVERY existing
 * root static carrier contains the group's current tag, return a synthetic record delivered at
 * session start; isPresent() then ends the credit at the first condensation or byte re-arm.
 * Requiring every carrier keeps a stale carrier (the one the host actually loaded may be
 * either) from being covered by a fresh sibling — the cost is an extra reminder, never a miss.
 */
function staticCredit(scope, tag, hash, ctx, projectDir) {
    if (scope !== MAIN_SCOPE || typeof ctx.transcriptSize !== 'number' || !projectDir) return null;
    const texts = carrierTexts(projectDir);
    return texts.length > 0 && texts.every(text => text.includes(tag))
        ? { hash, deliveredAt: 0, transcriptBytes: 0, form: 'static' }
        : null;
}

/** True only for the ledger's own marker: the reserved name AND the owner tag inside it. */
function isOwnerMarker(file) {
    const marker = readJson(file);
    return Boolean(marker) && marker.owner === OWNER_TAG;
}

/**
 * Newest modification time of a session directory the ledger owns, or null when it is not
 * ours. Ownership is decided by TWO independent tests, both required:
 *   1. the `_owner.json` marker (markSessionOwned) is present and carries the owner tag;
 *   2. the directory is exactly ledger-shaped — at least one entry, and every entry is
 *      a session state file (`_<name>.json`: `_owner.json`, `_session.json`, `_route-mode.json` …), a `*.tmp` file, or a scope directory
 *      (`main` / `agent-<safe id>`) holding only `*.json` / `*.lock` / `*.tmp` files.
 * Either test failing yields null, and `pruneStale` never deletes a directory it cannot age.
 * Shape alone proves nothing: `<dir>/main/<name>.json` is an ordinary cache layout, and the
 * store root is overridable to any path, so a shape-only rule would recursively delete a
 * stranger's tree. Directories written before the marker existed therefore read as not-ours
 * and are simply never pruned — one is adopted as soon as that session writes again. An
 * unpruned directory costs a few KB in a temp store; a wrong deletion costs data.
 */
function ledgerSessionAge(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    if (entries.length === 0) return null;
    let newest = fs.lstatSync(dir).mtimeMs;
    let owned = false;
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isFile() && SESSION_FILE_NAME.test(entry.name)) {
            owned = owned || (entry.name === OWNER_FILE && isOwnerMarker(full));
            newest = Math.max(newest, fs.lstatSync(full).mtimeMs);
            continue;
        }
        if (!entry.isDirectory() || !SCOPE_DIR_NAME.test(entry.name)) return null;
        newest = Math.max(newest, fs.lstatSync(full).mtimeMs);
        for (const item of fs.readdirSync(full, { withFileTypes: true })) {
            if (!item.isFile() || !SCOPE_FILE_NAME.test(item.name)) return null;
            newest = Math.max(newest, fs.lstatSync(path.join(full, item.name)).mtimeMs);
        }
    }
    return owned ? newest : null;
}

/** Remove session directories the ledger owns (marker + shape) whose newest entry is older than 7 days (bounded per run). */
function pruneStale(root, now = Date.now(), maxAgeMs = PRUNE_AGE_MS, limit = PRUNE_LIMIT) {
    let removed = 0;
    try {
        for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
            if (removed >= limit) break;
            if (!entry.isDirectory()) continue;
            const dir = path.join(root, entry.name);
            try {
                const newest = ledgerSessionAge(dir);
                if (newest !== null && now - newest > maxAgeMs) {
                    fs.rmSync(dir, { recursive: true, force: true });
                    removed++;
                }
            } catch {
                /* skip entry */
            }
        }
    } catch {
        /* no store yet */
    }
    return removed;
}

/**
 * Retention sweep at most once per interval per store (any host, any event), so sessions that
 * never condense are still cleaned. Returns the number of removed session directories.
 */
function maybePrune(root, now = Date.now(), intervalMs = PRUNE_INTERVAL_MS) {
    const marker = path.join(root, '_prune.json');
    const last = readJson(marker);
    if (last && typeof last.at === 'number' && now - last.at < intervalMs && now >= last.at) return 0;
    if (!writeJsonAtomic(marker, { at: now })) return 0;
    return pruneStale(root, now);
}

/**
 * One advisory delivery per session scope and record group — the shared owner of the
 * check → lock → re-check → write → record → release sequence used by the injection hooks.
 * Skips while the stored record is still present for `hash` (same content, no compaction since,
 * transcript growth under `settings.reinjectAfterBytes`); otherwise claims the group lock,
 * re-checks under it (BR-PFCI-17), writes `payload` through `write(text, done)`, and records the
 * delivery only when the write reported success. Resolves to the payload written, or '' when
 * nothing was delivered. By default any error delivers nothing and releases the lock. With
 * `failOpen`, a lock that cannot be created (an unusable store) delivers without a record and only a
 * live peer claim skips: a duplicate is accepted over silence (protocol and overlay delivery).
 * With `expectBoundary`, the caller says this delivery answers a host-reported compaction whose own
 * transcript boundary line may be written after it; the record then absorbs that one boundary
 * (see adoptExpectedBoundary).
 * `onPresent`, when supplied, reports only a verified current record, never a peer lock or error.
 */
function deliverOnce({ root, input, group, hash, payload, settings, now = Date.now(), write, failOpen = false, expectBoundary = false, onPresent }) {
    return new Promise(resolve => {
        let lock = null;
        let token = null;
        const release = () => {
            if (token) {
                releaseLock(lock, token);
                token = null;
            }
        };
        try {
            const sessionId = input.session_id;
            const scope = scopeFor(input);
            const history = transcriptPathFor(input);
            // The latest condensation this process observed. A delivery made after observing it is after it
            // by construction, so it is stamped no earlier than that mark: concurrent hook processes read
            // their own clocks, and an undated mark placed just before the first scanner's clock would
            // otherwise read as newer than a peer's delivery made in the same trigger (a duplicate).
            let observedCondensation = -Infinity;
            const context = () => {
                const condensedAt = lastCompactionAt(root, sessionId, scope, input, settings, now);
                if (Number.isFinite(condensedAt)) observedCondensation = Math.max(observedCondensation, condensedAt);
                return { lastCompactionAt: condensedAt, transcriptSize: transcriptSize(history), now };
            };
            // The stored record as judged now: a record that expected the host's compaction boundary and
            // finds it inside the attribution window is moved past it once and persisted, so the
            // expectation is spent (see adoptExpectedBoundary).
            const storedRecord = ctx => {
                const stored = readRecord(root, sessionId, scope, group);
                const adopted = adoptExpectedBoundary(stored, hash, ctx);
                if (adopted !== stored) writeRecordAtomic(root, sessionId, scope, group, adopted);
                return adopted;
            };
            maybePrune(root, now);
            const first = context();
            if (isPresent(storedRecord(first), hash, first, settings)) {
                onPresent?.();
                return resolve('');
            }
            lock = lockFile(root, sessionId, scope, group);
            token = acquireLock(lock, now);
            if (!token && (!failOpen || peerHoldsLock(lock, now))) return resolve('');
            if (token) {
                const again = recheckContext(context());
                if (isPresent(storedRecord(again), hash, again, settings)) {
                    release();
                    onPresent?.();
                    return resolve('');
                }
            }
            write(payload, ok => {
                try {
                    if (ok !== false) {
                        writeRecordAtomic(root, sessionId, scope, group, {
                            hash,
                            deliveredAt: Math.max(now, observedCondensation + 1),
                            transcriptBytes: transcriptSize(history),
                            form: 'full',
                            ...(expectBoundary ? { expectBoundary: true } : {})
                        });
                    }
                } catch {
                    /* fail open: delivered but unrecorded costs one extra reminder */
                } finally {
                    release();
                }
                resolve(ok === false ? '' : payload);
            });
        } catch {
            release();
            resolve('');
        }
    });
}

/** Remove a scope's record so the next delivery runs; nothing to forget or an unusable store changes nothing. */
function forgetRecord(root, input, group) {
    try {
        fs.rmSync(recordFile(root, input.session_id, scopeFor(input), group), { force: true });
    } catch {
        /* nothing to forget, or the store is unusable: delivery still runs */
    }
}

/**
 * `deliverOnce` that also answers the host's compaction report (`isCompactionStart`): the compaction
 * dropped the earlier delivery from the conversation, so the record is forgotten and the delivery runs
 * now, and the record absorbs the boundary line the host writes after its session-start hooks
 * (`expectBoundary`), so the prompt that follows stays silent. Any other event is plain `deliverOnce`.
 */
function deliverWithCompaction(options) {
    if (!isCompactionStart(options && options.input)) return deliverOnce(options);
    forgetRecord(options.root, options.input, options.group);
    return deliverOnce({ ...options, expectBoundary: true });
}

module.exports = {
    MAIN_SCOPE,
    CODEX_COMPACTION_MARKER,
    LOCK_STALE_MS,
    BOUNDARY_ATTRIBUTION_MS,
    SCAN_CAP_BYTES,
    PRUNE_AGE_MS,
    PRUNE_INTERVAL_MS,
    storeRoot,
    sanitizeId,
    scopeFor,
    agentStartInput,
    isCompactionStart,
    sessionDir,
    scopeDir,
    recordFile,
    lockFile,
    readRecord,
    readSessionState,
    writeSessionState,
    markSessionOwned,
    writeRecordAtomic,
    acquireLock,
    releaseLock,
    peerHoldsLock,
    transcriptSize,
    transcriptPathFor,
    scanCompaction,
    readSessionCompaction,
    recordSessionCompaction,
    lastCompactionAt,
    isPresent,
    recheckContext,
    staticCredit,
    scanEvidence,
    pruneStale,
    maybePrune,
    deliverOnce,
    forgetRecord,
    deliverWithCompaction,
    _resetCarrierCache: () => carrierCache.clear()
};
