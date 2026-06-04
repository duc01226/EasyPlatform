#!/usr/bin/env node
/**
 * init-prompt-gate.cjs - UserPromptSubmit project-context router
 *
 * Detects missing/stale portable project context and injects the next setup
 * route while allowing the prompt through. The model should run /project-init,
 * /scan-all, or /graph-build before ordinary project-specific work.
 *
 * Allowlist: Prompts containing init commands (/project-config, /scan, /scan-*, skip init)
 * are always allowed through so the user can fix the init state.
 *
 * Dismiss: User can type "skip init" to create a 1-day init dismiss flag,
 * or "skip scan" to create a 7-day reference-doc scan dismiss flag.
 *
 * Exit Codes:
 *   0 - Prompt allowed. Missing context is surfaced as guidance, not a stop.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { isConfigPopulated: _isConfigPopulated, getConfiguredProjectConfigPath } = require('./lib/project-config-loader.cjs');
const { hasProjectContent } = require('./lib/session-init-helpers.cjs');
const {
    getAgentFileIssues,
    isAgentFilesDismissed,
    writeAgentFilesDismissFlag,
    isAgentFilesDismissRequest,
    buildOfferMessage
} = require('./lib/agent-files-state.cjs');

const {
    INIT_DISMISSED_PATH: DISMISS_FLAG,
    SCAN_STALE_DISMISSED_PATH: SCAN_DISMISS_FLAG,
    GRAPH_DISMISSED_PATH: GRAPH_DISMISS_FLAG,
    SCAN_STALE_PATH: SCAN_STALE_FLAG,
    ensureProjectTmpDir
} = require('./lib/ck-paths.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
// Honor the configured portability.projectConfigPath (fail-open to docs/project-config.json).
// Must match where session-init creates the config, else a custom-path project blocks every prompt.
const CONFIG_PATH = getConfiguredProjectConfigPath();
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const SCAN_DISMISS_TTL_DAYS = 7;
const SCAN_DISMISS_TTL_MS = SCAN_DISMISS_TTL_DAYS * 24 * 60 * 60 * 1000;

// Graph gate constants
const GRAPH_DB_PATH = path.join(PROJECT_DIR, '.code-graph', 'graph.db');
const GRAPH_DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

/**
 * Emit UserPromptSubmit guidance.
 * Claude and Codex both accept plaintext stdout as prompt context for this event.
 * Prefix JSON-looking text so Codex does not route it through its JSON parser.
 * @param {string} message
 */
function emitPromptContext(message) {
    const text = String(message || '');
    if (!text) return;
    const trimmedStart = text.trimStart();
    if (trimmedStart.startsWith('{') || trimmedStart.startsWith('[')) {
        console.log(`Hook context:\n${trimmedStart}`);
        return;
    }
    console.log(text);
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT ALLOWLIST — patterns that bypass the gate (case-insensitive)
// These are the commands that FIX the init state, so they must pass through.
// ═══════════════════════════════════════════════════════════════════════════

const ALLOWLIST_PATTERNS = [
    /\/project-init/i, // Unified project bootstrap/re-evaluation route
    /\/init-project/i, // Alias phrase for the unified bootstrap route
    /\/project-config/i, // The skill that populates config
    /\/scan[-\w]*/i, // The /scan host (incl. /scan --target=<key>) + /scan-* orchestrators that populate reference docs
    /\/graph-build/i, // The skill that builds the knowledge graph
    /\/claude-md-init/i, // Generates CLAUDE.md (fixes missing-agent-file state)
    /\/sync-codex/i, // Generates AGENTS.md mirror (fixes missing-agent-file state)
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
        const content = fs.readFileSync(SCAN_DISMISS_FLAG, 'utf-8').trim();
        if (content) {
            try {
                const data = JSON.parse(content);
                const dismissedAt = Date.parse(data.dismissedAt || '');
                if (!Number.isNaN(dismissedAt)) {
                    return Date.now() - dismissedAt < SCAN_DISMISS_TTL_MS;
                }
            } catch {
                const dismissedAt = Date.parse(content);
                if (!Number.isNaN(dismissedAt)) {
                    return Date.now() - dismissedAt < SCAN_DISMISS_TTL_MS;
                }
            }
        }
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
        const dismissedAt = new Date();
        const expiresAt = new Date(dismissedAt.getTime() + SCAN_DISMISS_TTL_MS);
        fs.writeFileSync(
            SCAN_DISMISS_FLAG,
            JSON.stringify({
                dismissedAt: dismissedAt.toISOString(),
                expiresAt: expiresAt.toISOString(),
                ttlDays: SCAN_DISMISS_TTL_DAYS
            }, null, 2) + '\n',
            'utf-8'
        );
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
 * @returns {void} Emits guidance when stale docs exist; returns otherwise
 */
function handleStalenessGate(userPrompt) {
    const staleState = checkScanStaleFlag();
    if (!staleState.isStale) return; // No stale docs → pass through

    // Stale docs exist — check escape hatches
    if (isScanDismissed()) return;

    if (isScanDismissRequest(userPrompt)) {
        writeScanDismissFlag();
        emitPromptContext('Reference doc scan skipped. Gate dismissed for 7 days.');
        process.exit(0);
    }

    if (isAllowlistedPrompt(userPrompt)) return;

    // WARN — stale docs, no escape hatch. Allow the model to auto-route.
    const docList = staleState.docs.map(d => `  - ${d.filename} (${d.ageDays}d old) -> /${d.scanSkill}`).join('\n');
    emitPromptContext(
        [
            '',
            '[project-context] Reference docs are stale.',
            '',
            "The following reference docs haven't been scanned recently:",
            docList,
            '',
            'Auto-route before ordinary project-specific work:',
            '  /scan-all             — Refresh all reference docs',
            '  /scan-<name>          — Refresh a specific doc when scope is narrow',
            '',
            'Continue after the relevant scan completes.',
            ''
        ].join('\n')
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT-FILES ROUTER — guides when CLAUDE.md / AGENTS.md are missing
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check the agent-files gate after config is populated.
 *
 * Runs only in the config-populated branch by design: /claude-md-init reads
 * docs/project-config.json to generate CLAUDE.md, so offering it before config
 * is populated would produce a meaningless file. Empty/uninitialized projects
 * are already short-circuited by the hasProjectContent() guard in main().
 *
 * Missing CLAUDE.md → /claude-md-init (AI-runnable).
 * Missing AGENTS.md → /sync-codex (AI-runnable mirror generator with script fallback).
 *
 * @param {string} userPrompt - The user's prompt text
 * @returns {void} Emits guidance when files need attention; returns otherwise
 */
function handleAgentFilesGate(userPrompt) {
    const issues = getAgentFileIssues();
    if (issues.length === 0) return; // Both root agent files present + complete → pass through

    if (isAgentFilesDismissed()) return;

    if (isAgentFilesDismissRequest(userPrompt)) {
        writeAgentFilesDismissFlag();
        emitPromptContext('Agent-file init skipped. Gate dismissed for 24 hours.');
        process.exit(0);
    }

    if (isAllowlistedPrompt(userPrompt)) return;

    // WARN — root agent file(s) missing or incomplete. Allow the model to auto-route.
    emitPromptContext(buildOfferMessage(issues));
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
// GRAPH ROUTER — guides when graph.db doesn't exist
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check graph gate after config + staleness gates pass.
 * Guides when graph.db doesn't exist. If Python is not available,
 * tells the model which setup route or prerequisite remains.
 * @param {string} userPrompt - The user's prompt text
 * @returns {void} Emits guidance when graph is missing; returns otherwise
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
        emitPromptContext('Graph build skipped. Gate dismissed for 24 hours.');
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
        ? ['  /graph-build          — Build the knowledge graph before structural investigation']
        : [
              'Python 3.10+ with tree-sitter is required. Install first:',
              '  pip install tree-sitter tree-sitter-language-pack networkx',
              '',
              'Then run:',
              '  /graph-build          — Build the knowledge graph'
          ];

    // WARN — graph not built. Allow the model to continue or auto-route.
    emitPromptContext(
        [
            '',
            '[project-context] Knowledge graph not built.',
            '',
            'The code knowledge graph (.code-graph/graph.db) does not exist.',
            'Graph enables: frontend↔backend tracing, blast radius analysis,',
            'cross-service flow detection, and structural code intelligence.',
            '',
            'Auto-route before graph-dependent investigation:',
            ...instructions,
            ''
        ].join('\n')
    );
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

        // Fast path: config already populated → check agent-files, staleness, graph gates.
        // Agent-files first: CLAUDE.md/AGENTS.md are the most foundational artifacts and
        // /claude-md-init depends on the (now-populated) config.
        if (isConfigPopulated()) {
            handleAgentFilesGate(userPrompt);
            handleStalenessGate(userPrompt);
            handleGraphGate(userPrompt);
            process.exit(0);
        }

        // Config NOT populated — inject setup guidance and allow the model to auto-route

        // 1. Dismiss flag still valid → allow
        if (isDismissed()) process.exit(0);

        // 2. Dismiss request → write flag, allow
        if (isDismissRequest(userPrompt)) {
            writeDismissFlag();
            emitPromptContext('Project init skipped. Gate dismissed for 24 hours.');
            process.exit(0);
        }

        // 3. Allowlisted init command → allow (so user can fix the state)
        if (isAllowlistedPrompt(userPrompt)) process.exit(0);

        // 4. WARN — config unpopulated, no escape hatch matched
        emitPromptContext(
            [
                '',
                '[project-context] Project configuration not initialized.',
                '',
                '`docs/project-config.json` is missing or still contains default skeleton values.',
                'Project-aware context depends on this file.',
                '',
                'Auto-route before ordinary project-specific work:',
                '  /project-init       — Initialize/re-evaluate config, docs, CLAUDE.md, AGENTS.md',
                '  /project-config     — Populate config only when that is the only missing artifact',
                ''
            ].join('\n')
        );
        process.exit(0);
    } catch {
        // Fail-open on unexpected errors — never trap the user
        process.exit(0);
    }
}

// Export for testing
module.exports = {
    emitPromptContext,
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
    SCAN_DISMISS_TTL_DAYS,
    SCAN_DISMISS_TTL_MS,
    // Graph gate
    isGraphDismissed,
    writeGraphDismissFlag,
    isGraphDismissRequest,
    GRAPH_DISMISS_TTL_MS,
    // Agent-files gate
    handleAgentFilesGate
};

if (require.main === module) {
    main();
}
