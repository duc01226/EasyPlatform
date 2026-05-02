#!/usr/bin/env node
'use strict';

// Session-average tokens-per-second estimate for the Claude Code statusline.
//
// Invoked by ccstatusline as a `custom-command` widget. Receives the standard
// statusLine JSON payload on stdin (transcript_path, session_id, ...).
//
// Estimate basis: per-turn elapsed time = assistant.timestamp - preceding
// message timestamp (user/tool_result/system event, or prior assistant turn
// if none intervened). This includes network + thinking + tool time, not just
// decode — so the figure is a TREND indicator, not literal decode rate.
// Documented here so future readers don't mistake it for ground truth.
//
// Performance: reads only the tail of the transcript JSONL (TAIL_BYTES) so
// statusline tick latency stays bounded as transcripts grow into multi-MB.
// Discards the partial first line (likely truncated).
//
// Output: `avg {N} tok/s` on success, empty string when insufficient data.
// Never throws — statusline producers must always exit 0 cleanly.

const fs = require('fs');

const TAIL_BYTES = 256 * 1024;
const MAX_TURN_GAP_MS = 10 * 60 * 1000;

function readStdin() {
    try { return fs.readFileSync(0, 'utf-8'); } catch { return ''; }
}

function parseJsonSafe(s) {
    try { return JSON.parse(s); } catch { return null; }
}

function readTranscriptTail(transcriptPath) {
    if (!transcriptPath) return [];
    let fd;
    try {
        const stat = fs.statSync(transcriptPath);
        fd = fs.openSync(transcriptPath, 'r');
        const len = Math.min(stat.size, TAIL_BYTES);
        const start = stat.size - len;
        const buf = Buffer.alloc(len);
        fs.readSync(fd, buf, 0, len, start);
        const text = buf.toString('utf-8');
        const lines = text.split('\n');
        if (start > 0) lines.shift();
        const events = [];
        for (const line of lines) {
            if (!line) continue;
            const obj = parseJsonSafe(line);
            if (obj) events.push(obj);
        }
        return events;
    } catch {
        return [];
    } finally {
        if (fd != null) { try { fs.closeSync(fd); } catch {} }
    }
}

function tsMs(ev) {
    const t = ev && (ev.timestamp ?? ev.ts ?? (ev.message && ev.message.timestamp));
    if (!t) return null;
    const ms = typeof t === 'number' ? t : Date.parse(t);
    return Number.isFinite(ms) ? ms : null;
}

function isAssistant(ev) {
    if (!ev) return false;
    if (ev.type === 'assistant') return true;
    return !!(ev.message && ev.message.role === 'assistant');
}

function isNonAssistant(ev) {
    if (!ev) return false;
    const t = ev.type;
    if (t === 'user' || t === 'tool_result' || t === 'system') return true;
    return !!(ev.message && ev.message.role && ev.message.role !== 'assistant');
}

function outTokensOf(ev) {
    const u = ev && ev.message && ev.message.usage;
    if (!u) return 0;
    const n = Number(u.output_tokens || 0);
    return Number.isFinite(n) ? n : 0;
}

function computeAvgTps(events) {
    let totalOut = 0;
    let totalMs = 0;
    let lastNonAssistantTs = null;
    for (const ev of events) {
        if (isNonAssistant(ev)) {
            const t = tsMs(ev);
            if (t != null) lastNonAssistantTs = t;
            continue;
        }
        if (!isAssistant(ev)) continue;
        const out = outTokensOf(ev);
        const t = tsMs(ev);
        if (out <= 0 || t == null) continue;
        if (lastNonAssistantTs != null && t > lastNonAssistantTs) {
            const dMs = t - lastNonAssistantTs;
            if (dMs > 0 && dMs < MAX_TURN_GAP_MS) {
                totalOut += out;
                totalMs += dMs;
            }
        }
        lastNonAssistantTs = t;
    }
    return totalMs > 0 ? (totalOut / totalMs) * 1000 : null;
}

function fmt(n) {
    if (n == null || !Number.isFinite(n)) return null;
    if (n >= 100) return n.toFixed(0);
    if (n >= 10) return n.toFixed(1);
    return n.toFixed(2);
}

function main() {
    const payload = parseJsonSafe(readStdin()) || {};
    const transcriptPath = payload.transcript_path || payload.transcriptPath || null;
    const events = readTranscriptTail(transcriptPath);
    if (!events.length) return;
    const avg = fmt(computeAvgTps(events));
    if (avg == null) return;
    process.stdout.write(`avg ${avg} tok/s`);
}

if (require.main === module) {
    try { main(); } catch { /* never throw */ }
}

module.exports = { computeAvgTps, fmt, MAX_TURN_GAP_MS };
