#!/usr/bin/env node
'use strict';
/**
 * Python Call Guide — PreToolUse Bash Hook
 *
 * Fires when a Bash command invokes python/python3.
 * Injects platform-aware guidance WITHOUT blocking or rewriting.
 *
 * Platform error matrix:
 *   Windows  — `python3` hits MS Store alias → exit 49 ("Python was not found")
 *              `python` works if installed; `py` (Windows Python Launcher) is most reliable
 *   macOS    — `python` removed on Monterey+ (system Python 2 gone)
 *              `python3` is the correct command
 *   Linux    — `python` absent on many distros; use `python3`
 *
 * Dedup: skips if guide was injected within the last DEDUP_LINES.PYTHON_GUIDE transcript lines.
 */

const fs = require('fs');
const { DEDUP_LINES, PYTHON_GUIDE: DEDUP_MARKER } = require('./lib/dedup-constants.cjs');

const DEDUP_WINDOW = DEDUP_LINES.PYTHON_GUIDE;

function wasRecentlyInjected(transcriptPath) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
        const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n');
        return lines.slice(-DEDUP_WINDOW).some(l => l.includes(DEDUP_MARKER));
    } catch {
        return false;
    }
}

function buildGuide() {
    const platform = process.platform;

    const lines = [`${DEDUP_MARKER} **Python invocation detected — platform-specific rules:**`];

    if (platform === 'win32') {
        lines.push(
            `  - **Windows (this machine):** use \`py\` (Python Launcher) or \`python\` — NEVER \`python3\` (MS Store alias, exits 49 with "Python was not found")`,
            `  - macOS: use \`python3\`; Linux: use \`python3\``
        );
    } else if (platform === 'darwin') {
        lines.push(
            `  - **macOS (this machine):** use \`python3\` — \`python\` removed on Monterey+`,
            `  - Windows: use \`py\` or \`python\`, NEVER \`python3\`; Linux: use \`python3\``
        );
    } else {
        lines.push(
            `  - **Linux (this machine):** use \`python3\` — \`python\` absent on many distros`,
            `  - Windows: use \`py\` or \`python\`, NEVER \`python3\`; macOS: use \`python3\``
        );
    }

    lines.push(
        `  - **Discover interpreter:** \`which python3 2>/dev/null || which python 2>/dev/null || which py 2>/dev/null\``,
        `  - **Portable fallback:** \`python3 -c "..." 2>/dev/null || python -c "..." 2>/dev/null || py -c "..."\``,
        `  If the command fails with exit 49 or "command not found", switch to the correct binary above.`
    );

    return lines.join('\n');
}

function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        if (payload.tool_name !== 'Bash') process.exit(0);

        const command = payload.tool_input?.command || '';

        // Only fire for actual python interpreter invocations (not e.g. "pip", ".py" filenames)
        if (!/\bpython3?\b/.test(command)) process.exit(0);

        if (wasRecentlyInjected(payload.transcript_path || '')) process.exit(0);

        console.log(buildGuide());
    } catch {
        // Guidance-only hook — MUST NOT interrupt user's Bash command under any failure.
        // Broad catch is intentional: any uncaught error (JSON parse, fs, etc.) exits 0.
    }
    process.exit(0);
}

main();
