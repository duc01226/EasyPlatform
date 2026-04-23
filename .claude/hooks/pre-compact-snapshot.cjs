#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { getSnapshotPath, SESSION_ID_DEFAULT } = require('./lib/ck-paths.cjs');

function extractReadableLines(rawLines) {
    const readable = [];
    for (const line of rawLines) {
        if (!line.trim()) continue;
        try {
            const obj = JSON.parse(line);
            const msg = obj.message;
            if (!msg || !msg.role || !msg.content) continue;
            const role = msg.role === 'user' ? 'Human' : 'Assistant';
            const parts = [];

            if (typeof msg.content === 'string') {
                const t = msg.content.trim();
                if (t) parts.push(t.slice(0, 300));
            } else if (Array.isArray(msg.content)) {
                for (const b of msg.content) {
                    if (b.type === 'text' && b.text?.trim()) {
                        parts.push(b.text.trim().slice(0, 300));
                    } else if (b.type === 'tool_use') {
                        const inputSummary = JSON.stringify(b.input || {}).slice(0, 150);
                        parts.push(`[tool:${b.name}] ${inputSummary}`);
                    } else if (b.type === 'tool_result') {
                        const resultText = Array.isArray(b.content)
                            ? b.content.filter(c => c.type === 'text' && c.text).map(c => c.text).join(' ').slice(0, 200)
                            : String(b.content || '').slice(0, 200);
                        if (resultText.trim()) parts.push(`[result] ${resultText.trim()}`);
                    }
                }
            }

            const text = parts.join(' | ').trim();
            if (text) readable.push(`[${role}]: ${text}`);
        } catch { /* skip non-message or unparseable lines */ }
    }
    return readable;
}

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        const transcriptPath = payload.transcript_path;
        const sessionId = payload.session_id || SESSION_ID_DEFAULT;

        if (!transcriptPath || !fs.existsSync(transcriptPath)) process.exit(0);

        const allLines = fs.readFileSync(transcriptPath, 'utf-8').split('\n');
        const lines = extractReadableLines(allLines).slice(-200);

        if (lines.length === 0) process.exit(0);

        const snapshot = {
            sessionId,
            capturedAt: Date.now(),
            lineCount: lines.length,
            lines
        };
        fs.writeFileSync(getSnapshotPath(sessionId), JSON.stringify(snapshot));

    } catch { /* silent fail */ }
    process.exit(0);
}

main();
