#!/usr/bin/env node
/**
 * init-prompt-gate.cjs - UserPromptSubmit blocking hook
 *
 * Blocks ALL user prompts (exit 2) until docs/project-config.json is populated
 * with real project values. This is the only hook that can truly enforce
 * initialization — text injection (exit 0) is advisory and easily ignored.
 *
 * Allowlist: Prompts containing init commands (/project-config, /scan-*, skip init)
 * are always allowed through so the user can fix the init state.
 *
 * Dismiss: User can type "skip init" to create a 1-day dismiss flag.
 * After 1 day the gate re-activates.
 *
 * Exit Codes:
 *   0 - Prompt allowed (config populated, or prompt is an init command, or dismissed)
 *   2 - Prompt blocked (config unpopulated, not an init command, not dismissed)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { isConfigPopulated: _isConfigPopulated } = require('./lib/project-config-loader.cjs');
const { hasProjectContent } = require('./lib/session-init-helpers.cjs');

const {
    INIT_DISMISSED_PATH: DISMISS_FLAG,
    SCAN_STALE_DISMISSED_PATH: SCAN_DISMISS_FLAG,
    GRAPH_DISMISSED_PATH: GRAPH_DISMISS_FLAG,
    SCAN_STALE_PATH: SCAN_STALE_FLAG,
    ensureProjectTmpDir
} = require('./lib/ck-paths.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CONFIG_PATH = path.join(PROJECT_DIR, 'docs', 'project-config.json');
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const SCAN_DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

// Graph gate constants
const GRAPH_DB_PATH = path.join(PROJECT_DIR, '.code-graph', 'graph.db');
const GRAPH_DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT ALLOWLIST — patterns that bypass the gate (case-insensitive)
// These are the commands that FIX the init state, so they must pass through.
// ═══════════════════════════════════════════════════════════════════════════

const ALLOWLIST_PATTERNS = [
    /\/project-config/i, // The skill that populates config
    /\/scan[-\w]*/i, // All /scan-* skills that populate reference docs
    /\/graph-build/i, // The skill that builds the knowledge graph
    /\/init/i, // Any init-related command
    /skip\s*init/i, // User wants to dismiss the gate
    /skip\s*setup/i, // Alternative dismiss phrase
    /skip\s*graph/i // User wants to dismiss the graph gate
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if project-config.json exists and is populated with real values.
 * Delegates to shared isConfigPopulated() from project-config-loader.cjs.
 * @returns {boolean}
 */
function isConfigPopulated() {
    if (!fs.existsSync(CONFIG_PATH)) return false;
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        return _isConfigPopulated(config);
    } catch {
        return false;
    }
}

/**
 * Check if the dismiss flag exists and is still valid (< DISMISS_TTL_MS old).
 * @returns {boolean}
 */
function isDismissed() {
    try {
        if (!fs.existsSync(DISMISS_FLAG)) return false;
        const stat = fs.statSync(DISMISS_FLAG);
        const ageMs = Date.now() - stat.mtimeMs;
        return ageMs < DISMISS_TTL_MS;
    } catch {
        return false;
    }
}

/**
 * Write the dismiss flag file with current timestamp.
 */
function writeDismissFlag() {
    try {
        ensureProjectTmpDir();
        fs.writeFileSync(DISMISS_FLAG, new Date().toISOString() + '\n', 'utf-8');
    } catch {
        /* non-critical */
    }
}

/**
 * Check if the user's prompt matches any allowlisted pattern.
 * @param {string} prompt
 * @returns {boolean}
 */
function isAllowlistedPrompt(prompt) {
    return ALLOWLIST_PATTERNS.some(pattern => pattern.test(prompt));
}

/**
 * Check if the user's prompt is a dismiss request.
 * @param {string} prompt
 * @returns {boolean}
 */
function isDismissRequest(prompt) {
    return /skip\s*(init|setup)/i.test(prompt);
}

// ═══════════════════════════════════════════════════════════════════════════
// STALENESS GATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if the scan-stale dismiss flag exists and is still valid.
 * @returns {boolean}
 */
function isScanDismissed() {
    try {
        if (!fs.existsSync(SCAN_DISMISS_FLAG)) return false;
        const stat = fs.statSync(SCAN_DISMISS_FLAG);
        return Date.now() - stat.mtimeMs < SCAN_DISMISS_TTL_MS;
    } catch {
        return false;
    }
}

/**
 * Write the scan-stale dismiss flag.
 */
function writeScanDismissFlag() {
    try {
        ensureProjectTmpDir();
        fs.writeFileSync(SCAN_DISMISS_FLAG, new Date().toISOString() + '\n', 'utf-8');
    } catch {
        /* non-critical */
    }
}

/**
 * Check if the user's prompt is a scan dismiss request.
 * @param {string} prompt
 * @returns {boolean}
 */
function isScanDismissRequest(prompt) {
    return /skip\s*scan/i.test(prompt);
}

/**
 * Check if reference docs are flagged as stale.
 * @returns {{ isStale: boolean, docs: Array }}
 */
function checkScanStaleFlag() {
    try {
        if (!fs.existsSync(SCAN_STALE_FLAG)) return { isStale: false, docs: [] };
        const data = JSON.parse(fs.readFileSync(SCAN_STALE_FLAG, 'utf-8'));
        return { isStale: true, docs: data.docs || [] };
    } catch {
        return { isStale: false, docs: [] };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// STALENESS GATE — extracted to reduce cognitive complexity of main()
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check staleness gate when config is populated.
 * @param {string} userPrompt - The user's prompt text
 * @returns {void} Calls process.exit() if gate triggers; returns if no stale docs
 */
function handleStalenessGate(userPrompt) {
    const staleState = checkScanStaleFlag();
    if (!staleState.isStale) return; // No stale docs → pass through

    // Stale docs exist — check escape hatches
    if (isScanDismissed()) return;

    if (isScanDismissRequest(userPrompt)) {
        writeScanDismissFlag();
        console.log('Reference doc scan skipped. Gate dismissed for 24 hours.');
        process.exit(0);
    }

    if (isAllowlistedPrompt(userPrompt)) return;

    // BLOCK — stale docs, no escape hatch
    const docList = staleState.docs.map(d => `  - ${d.filename} (${d.ageDays}d old) -> /${d.scanSkill}`).join('\n');
    console.error(
        [
            '',
            'BLOCKED: Reference docs are stale.',
            '',
            "The following reference docs haven't been scanned recently:",
            docList,
            '',
            'Stale docs degrade code generation accuracy.',
            '',
            'To fix, type one of:',
            '  /scan-all             — Refresh all reference docs (recommended)',
            '  /scan-<name>          — Refresh a specific doc',
            '  skip scan             — Dismiss this gate for 24 hours',
            ''
        ].join('\n')
    );
    process.exit(2);
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH GATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if the graph dismiss flag exists and is still valid.
 * @returns {boolean}
 */
function isGraphDismissed() {
    try {
        if (!fs.existsSync(GRAPH_DISMISS_FLAG)) return false;
        const stat = fs.statSync(GRAPH_DISMISS_FLAG);
        return Date.now() - stat.mtimeMs < GRAPH_DISMISS_TTL_MS;
    } catch {
        return false;
    }
}

/**
 * Write the graph dismiss flag.
 */
function writeGraphDismissFlag() {
    try {
        ensureProjectTmpDir();
        fs.writeFileSync(GRAPH_DISMISS_FLAG, new Date().toISOString() + '\n', 'utf-8');
    } catch {
        /* non-critical */
    }
}

/**
 * Check if the user's prompt is a graph dismiss request.
 * @param {string} prompt
 * @returns {boolean}
 */
function isGraphDismissRequest(prompt) {
    return /skip\s*graph/i.test(prompt);
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH GATE — blocks when graph.db doesn't exist
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check graph gate after config + staleness gates pass.
 * Blocks when graph.db doesn't exist. If Python is not available,
 * tells user to install Python first.
 * @param {string} userPrompt - The user's prompt text
 * @returns {void} Calls process.exit() if gate triggers; returns if graph exists
 */
function handleGraphGate(userPrompt) {
    // Only block on graph when project config is properly initialized
    if (!isConfigPopulated()) return;

    // Graph already built → pass through
    if (fs.existsSync(GRAPH_DB_PATH)) return;

    // Graph missing — check escape hatches
    if (isGraphDismissed()) return;

    if (isGraphDismissRequest(userPrompt)) {
        writeGraphDismissFlag();
        console.log('Graph build skipped. Gate dismissed for 24 hours.');
        process.exit(0);
    }

    if (isAllowlistedPrompt(userPrompt)) return;

    // Detect Python availability to provide targeted instructions
    let hasPython = false;
    try {
        const { isGraphAvailable } = require('./lib/graph-utils.cjs');
        const status = isGraphAvailable();
        hasPython = status.python && status.deps;
    } catch {
        /* graph-utils not available — assume no Python */
    }

    const instructions = hasPython
        ? ['  /graph-build          — Build the knowledge graph (recommended)', '  skip graph            — Dismiss this gate for 24 hours']
        : [
              'Python 3.10+ with tree-sitter is required. Install first:',
              '  pip install tree-sitter tree-sitter-language-pack networkx',
              '',
              'Then run:',
              '  /graph-build          — Build the knowledge graph',
              '  skip graph            — Dismiss this gate for 24 hours'
          ];

    // BLOCK — graph not built
    console.error(
        [
            '',
            'BLOCKED: Knowledge graph not built.',
            '',
            'The code knowledge graph (.code-graph/graph.db) does not exist.',
            'Graph enables: frontend↔backend tracing, blast radius analysis,',
            'cross-service flow detection, and structural code intelligence.',
            '',
            'To fix, type one of:',
            ...instructions,
            ''
        ].join('\n')
    );
    process.exit(2);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        // Parse stdin — UserPromptSubmit provides { prompt: "..." }
        let userPrompt = '';
        try {
            const payload = JSON.parse(stdin);
            userPrompt = payload.prompt || '';
        } catch {
            // Fail-open if we can't parse
            process.exit(0);
        }

        if (!userPrompt.trim()) process.exit(0);

        // Guard: empty project (no content directories) → skip gate entirely
        if (!hasProjectContent()) process.exit(0);

        // Fast path: config already populated → check staleness gate + graph gate
        if (isConfigPopulated()) {
            handleStalenessGate(userPrompt);
            handleGraphGate(userPrompt);
            process.exit(0);
        }

        // Config NOT populated — check escape hatches

        // 1. Dismiss flag still valid → allow
        if (isDismissed()) process.exit(0);

        // 2. Dismiss request → write flag, allow
        if (isDismissRequest(userPrompt)) {
            writeDismissFlag();
            console.log('Project init skipped. Gate dismissed for 24 hours.');
            process.exit(0);
        }

        // 3. Allowlisted init command → allow (so user can fix the state)
        if (isAllowlistedPrompt(userPrompt)) process.exit(0);

        // 4. BLOCK — config unpopulated, no escape hatch matched
        console.error(
            [
                '',
                'BLOCKED: Project configuration not initialized.',
                '',
                '`docs/project-config.json` is missing or still contains default skeleton values.',
                'Many hooks depend on this file to provide project-aware context.',
                '',
                'To fix, type one of:',
                '  /project-config     — Auto-scan project and populate config (recommended)',
                '  skip init           — Dismiss this gate for 24 hours',
                ''
            ].join('\n')
        );
        process.exit(2);
    } catch {
        // Fail-open on unexpected errors — never trap the user
        process.exit(0);
    }
}

// Export for testing
module.exports = {
    isConfigPopulated,
    isDismissed,
    writeDismissFlag,
    isAllowlistedPrompt,
    isDismissRequest,
    ALLOWLIST_PATTERNS,
    DISMISS_TTL_MS,
    // Staleness gate
    isScanDismissed,
    writeScanDismissFlag,
    isScanDismissRequest,
    checkScanStaleFlag,
    SCAN_DISMISS_TTL_MS,
    // Graph gate
    isGraphDismissed,
    writeGraphDismissFlag,
    isGraphDismissRequest,
    GRAPH_DISMISS_TTL_MS
};

if (require.main === module) {
    main();
}
