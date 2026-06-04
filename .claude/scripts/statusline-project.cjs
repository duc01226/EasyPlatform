#!/usr/bin/env node
'use strict';

// Project root folder name for the Claude Code statusline.
//
// Invoked by ccstatusline as a `custom-command` widget. Receives the standard
// statusLine JSON payload on stdin and emits ONLY the basename of the project
// root (e.g. `easy-claude`) — not the full path.
//
// Source precedence: workspace.project_dir > workspace.current_dir > cwd.
// project_dir is the session's original root, so the name stays stable when you
// cd into a subdirectory — unlike the built-in current-working-dir widget, which
// tracks the moving cwd and shows a `cwd: .../path` form.
//
// Cross-platform: splits on both `/` and `\` so a Windows path yields the same
// basename regardless of which OS node runs on (the framework is portable).
//
// Output: the folder name on success, empty string when unavailable.
// Never throws — statusline producers must always exit 0 cleanly.

const fs = require('fs');

function readStdin() {
    try { return fs.readFileSync(0, 'utf-8'); } catch { return ''; }
}

function parseJsonSafe(s) {
    try { return JSON.parse(s); } catch { return null; }
}

// Last non-empty path segment, splitting on either separator. Trailing
// separators collapse away; non-string / empty input yields ''.
function basenameOf(p) {
    if (typeof p !== 'string' || !p) return '';
    const parts = p.split(/[\\/]+/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : '';
}

function projectFolderName(payload) {
    const ws = (payload && payload.workspace) || {};
    const candidates = [ws.project_dir, ws.current_dir, payload && payload.cwd];
    for (const c of candidates) {
        const name = basenameOf(c);
        if (name) return name;
    }
    return '';
}

function main() {
    const payload = parseJsonSafe(readStdin()) || {};
    const name = projectFolderName(payload);
    if (name) process.stdout.write(name);
}

if (require.main === module) {
    try { main(); } catch { /* never throw */ }
}

module.exports = { basenameOf, projectFolderName };
