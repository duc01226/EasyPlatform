/**
 * Session usage reader — token usage of one Claude session, main transcript plus every
 * sub-agent transcript, each model response counted once (BR-GWF-10).
 *
 * Transcript facts (observed Claude layout; other hosts are unmeasured, not guessed):
 *   - main transcript:  <dir>/<session-id>.jsonl
 *   - sub-agents:       <dir>/<session-id>/subagents/agent-<id>.jsonl
 *   - one response is written as several JSONL lines that repeat `message.usage` under the
 *     same `message.id` + `requestId` key; the repeats are streamed values, so the last
 *     line wins. Lines without usage (tool results) may sit between the repeats.
 *
 * `total` = input + cache_creation + output (non-cached tokens). `cache_read` is reported in
 * `totals` and never enters `total`.
 *
 * Two entry points share one chunked line reader (never one whole-file string):
 *   readUsage(transcriptPath, opts)              full read → { main, subagents[], total,
 *                                                skippedLongLines, unreadable[] }
 *   readUsageIncremental(transcriptPath, state)  per-file resumable read → { total, state }
 *
 * Bounded memory: reads are at most `chunkBytes` (default SCAN_CAP_BYTES, 8 MB); a carried
 * partial line may grow up to `maxLineBytes` (default 16 MB). A longer line is skipped
 * without storing its bytes, counted in `skippedLongLines`, and its usage is not counted.
 *
 * Returned data is limited to token counts, the skip count, `main`/`agent-<id>` names, tool
 * names and skill names (SEC-09). No message text or tool input is returned.
 * Every function is fail-soft: IO and parse errors never throw.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { SCAN_CAP_BYTES, transcriptPathFor } = require('./convention-ledger.cjs');

const MAX_LINE_BYTES = 16 * 1024 * 1024;
const STATE_VERSION = 1;
const MAIN_NAME = 'main';
const NEWLINE = 0x0a;
const USAGE_MARK = '"usage"';
const USAGE_FIELDS = Object.freeze({
    input: 'input_tokens',
    cache_creation: 'cache_creation_input_tokens',
    cache_read: 'cache_read_input_tokens',
    output: 'output_tokens'
});
const SKILL_NAME = /^[a-z0-9][a-z0-9-]*$/;
const TOOL_NAME = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const SUBAGENT_FILE = /^agent-(.+)\.jsonl$/;
const OTHER = 'other';

function zeroTotals() {
    return { input: 0, cache_creation: 0, cache_read: 0, output: 0 };
}

/** Non-cached total of one totals object: cache reads are excluded (R2-03). */
function nonCachedTotal(totals) {
    return totals.input + totals.cache_creation + totals.output;
}

function count(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function usageOf(raw) {
    const usage = zeroTotals();
    for (const [field, key] of Object.entries(USAGE_FIELDS)) usage[field] = count(raw[key]);
    return usage;
}

function addTotals(target, usage, sign = 1) {
    for (const field of Object.keys(USAGE_FIELDS)) target[field] += sign * usage[field];
}

function freshFileState() {
    return {
        size: 0,
        offset: 0,
        totals: zeroTotals(),
        lastKey: null,
        lastUsage: null,
        skippingLongLine: false,
        skippedLongLines: 0
    };
}

function validTotals(value) {
    if (!value || typeof value !== 'object') return null;
    const totals = zeroTotals();
    for (const field of Object.keys(totals)) {
        if (typeof value[field] !== 'number' || !Number.isFinite(value[field])) return null;
        totals[field] = value[field];
    }
    return totals;
}

/** Copy of a stored per-file state; anything malformed starts that file from scratch. */
function restoreFileState(stored) {
    if (!stored || typeof stored !== 'object') return freshFileState();
    const totals = validTotals(stored.totals);
    const offset = stored.offset;
    const size = stored.size;
    if (!totals || !Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(size) || size < offset) {
        return freshFileState();
    }
    const lastUsage = stored.lastUsage === null ? null : validTotals(stored.lastUsage);
    const hasKey = typeof stored.lastKey === 'string' && lastUsage !== null;
    return {
        size,
        offset,
        totals,
        lastKey: hasKey ? stored.lastKey : null,
        lastUsage: hasKey ? lastUsage : null,
        skippingLongLine: stored.skippingLongLine === true,
        skippedLongLines: Number.isSafeInteger(stored.skippedLongLines) && stored.skippedLongLines > 0
            ? stored.skippedLongLines
            : 0
    };
}

function statSize(io, file) {
    try {
        const stat = io.statSync(file);
        return stat.isFile() ? stat.size : null;
    } catch {
        return null;
    }
}

function bump(map, name) {
    map[name] = (map[name] || 0) + 1;
}

/** Tool and skill call counts of one assistant line (full read only). */
function collectCalls(message, collector) {
    if (!Array.isArray(message.content)) return;
    for (const block of message.content) {
        if (!block || block.type !== 'tool_use' || typeof block.name !== 'string') continue;
        if (typeof block.id === 'string') {
            if (collector.seenToolIds.has(block.id)) continue;
            collector.seenToolIds.add(block.id);
        }
        bump(collector.tools, TOOL_NAME.test(block.name) ? block.name : OTHER);
        if (block.name === 'Skill') {
            const skill = block.input && typeof block.input.skill === 'string' ? block.input.skill : '';
            bump(collector.skills, SKILL_NAME.test(skill) ? skill : OTHER);
        }
    }
}

/**
 * One complete line. Only `message.usage`, `message.id`, `requestId`, tool names and the
 * Skill `skill` field are read. Dedupe: a usage line whose key equals the previous usage
 * key replaces that key's usage (last line wins); lines without usage leave the key alone.
 */
function handleLine(lineBuf, fileState, collector) {
    if (!lineBuf.includes(USAGE_MARK)) return;
    let record;
    try {
        record = JSON.parse(lineBuf.toString('utf8'));
    } catch {
        return;
    }
    const message = record && typeof record === 'object' ? record.message : null;
    if (!message || typeof message !== 'object' || !message.usage || typeof message.usage !== 'object') return;
    const usage = usageOf(message.usage);
    const hasKey = typeof message.id === 'string' && typeof record.requestId === 'string';
    const key = hasKey ? `${message.id}|${record.requestId}` : null;
    if (key !== null && key === fileState.lastKey && fileState.lastUsage) {
        addTotals(fileState.totals, fileState.lastUsage, -1);
    }
    addTotals(fileState.totals, usage);
    fileState.lastKey = key;
    fileState.lastUsage = key === null ? null : usage;
    if (collector) collectCalls(message, collector);
}

/**
 * Reads `[offset, size)` of one file into `fileState` (mutated). Reads are at most
 * `chunkBytes`; only complete lines are parsed; a partial line is carried within the call
 * and re-read next call. Every pass moves `pos` forward or ends the call.
 */
function scanFile(io, file, fileState, size, opts, collector) {
    if (size < fileState.offset) Object.assign(fileState, freshFileState());
    fileState.size = size;
    if (size <= fileState.offset) return;

    const chunkBytes = opts.chunkBytes;
    const maxLineBytes = opts.maxLineBytes;
    const probe = opts.probe;
    let fd;
    try {
        fd = io.openSync(file, 'r');
    } catch {
        return;
    }
    try {
        const buffer = Buffer.alloc(Math.min(chunkBytes, size - fileState.offset));
        let pos = fileState.offset;
        let committed = fileState.offset;
        let carry = null;
        let skipping = fileState.skippingLongLine;
        while (pos < size) {
            let read;
            try {
                read = io.readSync(fd, buffer, 0, Math.min(buffer.length, size - pos), pos);
            } catch {
                break;
            }
            if (!(read > 0)) break;
            const chunkStart = pos;
            pos += read;
            const view = read === buffer.length ? buffer : buffer.subarray(0, read);
            let start = 0;
            if (skipping) {
                const end = view.indexOf(NEWLINE);
                if (end < 0) {
                    committed = pos;
                    continue;
                }
                skipping = false;
                fileState.skippedLongLines += 1;
                start = end + 1;
                committed = chunkStart + start;
            }
            let end = view.indexOf(NEWLINE, start);
            while (end >= 0) {
                const carried = carry ? carry.length : 0;
                if (carried + (end - start) > maxLineBytes) {
                    fileState.skippedLongLines += 1;
                } else {
                    handleLine(carry ? Buffer.concat([carry, view.subarray(start, end)]) : view.subarray(start, end), fileState, collector);
                }
                carry = null;
                start = end + 1;
                committed = chunkStart + start;
                end = view.indexOf(NEWLINE, start);
            }
            if (start < read) {
                const carried = carry ? carry.length : 0;
                if (carried + (read - start) > maxLineBytes) {
                    carry = null;
                    skipping = true;
                    committed = pos;
                } else {
                    carry = carry ? Buffer.concat([carry, view.subarray(start)]) : Buffer.from(view.subarray(start));
                    if (probe) probe.maxCarryBytes = Math.max(probe.maxCarryBytes || 0, carry.length);
                }
            }
        }
        fileState.offset = committed;
        fileState.skippingLongLine = skipping;
    } finally {
        try {
            io.closeSync(fd);
        } catch {
            /* fail-soft */
        }
    }
}

function sessionIdOf(transcriptPath, opts) {
    if (typeof opts.sessionId === 'string' && opts.sessionId.trim()) return opts.sessionId;
    return path.basename(transcriptPath, '.jsonl');
}

/**
 * Sub-agent transcripts of the session, as `[{ name: 'agent-<id>', file }]`, sorted by
 * name. Only `agent-<id>.jsonl` names that `transcriptPathFor` accepts (safe id segments).
 */
function discoverSubagents(io, transcriptPath, opts) {
    const sessionId = sessionIdOf(transcriptPath, opts);
    const dir = path.join(path.dirname(transcriptPath), sessionId, 'subagents');
    let names;
    try {
        names = io.readdirSync(dir);
    } catch {
        return [];
    }
    const found = [];
    for (const entry of names) {
        const name = typeof entry === 'string' ? entry : entry && entry.name;
        const match = typeof name === 'string' ? SUBAGENT_FILE.exec(name) : null;
        if (!match) continue;
        const file = transcriptPathFor({ transcript_path: transcriptPath, session_id: sessionId, agent_id: match[1] });
        if (file) found.push({ name: `agent-${match[1]}`, file });
    }
    return found.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

function resolveOpts(opts) {
    const options = opts && typeof opts === 'object' ? opts : {};
    const positive = value => (Number.isSafeInteger(value) && value > 0 ? value : null);
    return {
        io: options.fs || fs,
        chunkBytes: positive(options.chunkBytes) || SCAN_CAP_BYTES,
        maxLineBytes: positive(options.maxLineBytes) || MAX_LINE_BYTES,
        probe: options.probe && typeof options.probe === 'object' ? options.probe : null,
        sessionId: options.sessionId
    };
}

/**
 * Full read for reports (P46 CLI contract). Each file entry: `{ name, totals, tools, skills }`.
 * `unreadable` lists files that could not be stat'ed (a missing main transcript reads as zero).
 */
function readUsage(transcriptPath, opts) {
    const options = resolveOpts(opts);
    const unreadable = [];
    const readOne = (name, file) => {
        const collector = { tools: {}, skills: {}, seenToolIds: new Set() };
        const fileState = freshFileState();
        const size = typeof file === 'string' && file ? statSize(options.io, file) : null;
        if (size === null) unreadable.push(name);
        else scanFile(options.io, file, fileState, size, options, collector);
        return {
            entry: { name, totals: fileState.totals, tools: collector.tools, skills: collector.skills },
            skipped: fileState.skippedLongLines
        };
    };
    const main = readOne(MAIN_NAME, transcriptPath);
    const subs = typeof transcriptPath === 'string' && transcriptPath
        ? discoverSubagents(options.io, transcriptPath, options).map(({ name, file }) => readOne(name, file))
        : [];
    let total = nonCachedTotal(main.entry.totals);
    let skippedLongLines = main.skipped;
    for (const sub of subs) {
        total += nonCachedTotal(sub.entry.totals);
        skippedLongLines += sub.skipped;
    }
    return { main: main.entry, subagents: subs.map(sub => sub.entry), total, skippedLongLines, unreadable };
}

/**
 * Incremental read for the per-task-event hook (P18). `state` is the value returned by the
 * previous call (or null). Files that did not grow cost one stat and zero bytes read; a file
 * that shrank below its offset restarts from 0 with zero totals; a file that disappeared keeps
 * its stored totals (the tokens were spent). Returns a new state; the input is not mutated.
 */
function readUsageIncremental(transcriptPath, state, opts) {
    const options = resolveOpts(opts);
    const storedFiles = state && typeof state === 'object' && state.version === STATE_VERSION
        && state.files && typeof state.files === 'object' ? state.files : {};
    const files = {};
    for (const [name, stored] of Object.entries(storedFiles)) {
        if (name === MAIN_NAME || SUBAGENT_FILE.test(`${name}.jsonl`)) files[name] = restoreFileState(stored);
    }
    const targets = typeof transcriptPath === 'string' && transcriptPath
        ? [{ name: MAIN_NAME, file: transcriptPath }, ...discoverSubagents(options.io, transcriptPath, options)]
        : [];
    for (const { name, file } of targets) {
        const size = statSize(options.io, file);
        if (size === null) continue;
        const fileState = files[name] || freshFileState();
        files[name] = fileState;
        if (size === fileState.size && name in storedFiles) continue;
        scanFile(options.io, file, fileState, size, options, null);
    }
    let total = 0;
    for (const fileState of Object.values(files)) total += nonCachedTotal(fileState.totals);
    return { total, state: { version: STATE_VERSION, files } };
}

module.exports = {
    MAX_LINE_BYTES,
    STATE_VERSION,
    USAGE_FIELDS,
    nonCachedTotal,
    discoverSubagents,
    readUsage,
    readUsageIncremental
};
