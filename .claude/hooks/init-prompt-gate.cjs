#!/usr/bin/env node
/**
 * init-prompt-gate.cjs - UserPromptSubmit project-context router
 *
 * Handles the advisory reference-doc, graph and agent-file setup gates, and
 * reports on the state of the project config.
 *
 * PORTABILITY CONTRACT: the project config is OPTIONAL. A project that has none
 * is a supported, first-class state — the framework runs on the loader's neutral
 * defaults plus repository evidence, so an absent config emits a once-a-day
 * notice and the prompt proceeds. A config that EXISTS but does not validate is
 * different thing: warn that those facts remain unverified, derive needed facts
 * from independent repository evidence, and continue the request. Explicit
 * project-config repair commands suppress the redundant warning.
 *
 * Optional setup gates may route to their setup skills or accept a dismissal.
 *
 * Exit Codes:
 *   0 - Prompt allowed, or blocked through the UserPromptSubmit JSON decision.
 */
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { resolveProjectRoot } = require('./lib/project-root.cjs');
const { isHookEntryPoint } = require('./lib/hook-runner.cjs');
const {
    isConfigPopulated: _isConfigPopulated,
    getProjectConfigStatus,
    getConfiguredProjectConfigPath
} = require('./lib/project-config-loader.cjs');
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
    MARKERS_DIR,
    SESSION_ID_DEFAULT,
    ensureDir,
    ensureProjectTmpDir
} = require('./lib/ck-paths.cjs');

const rootResolution = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env });
const PROJECT_DIR = rootResolution.rootDir;
// Honor the configured portability.projectConfigPath (fail-open to docs/project-config.json).
// Must match where session-init creates the config, else a custom-path project is told its
// config is absent while it sits validated at the configured path.
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
// OPTIONAL SETUP ALLOWLIST — applies only after an existing project config
// validates. Missing config is optional; invalid config warns unless explicit repair is requested.
// ═══════════════════════════════════════════════════════════════════════════

const ALLOWLIST_PATTERNS = [
    /\/project-init/i, // Unified project bootstrap/re-evaluation route
    /\/init-project/i, // Alias phrase for the unified bootstrap route
    /\/project-config/i, // The skill that populates config
    /\/scan[-\w]*/i, // The /scan host (incl. /scan --target=<key>) + /scan-* orchestrators that populate reference docs
    /\/graph-code/i, // The skill that builds and queries the knowledge graph
    /\/ai-context-refresh/i, // Generates root AI context (fixes missing-agent-file state)
    /\/sync-codex/i, // Generates AGENTS.md mirror (fixes missing-agent-file state)
    /\/init/i, // Any init-related command
    /skip\s*init/i, // User wants to dismiss the gate
    /skip\s*setup/i, // Alternative dismiss phrase
    /skip\s*graph/i // User wants to dismiss the graph gate
];

// An explicit top-level project-init/project-config skill invocation skips the
// invalid-config warning (it is the repair itself). Mentioning one inside an
// unrelated prompt does not. Both Claude slash commands and Codex skill
// invocations are accepted.
const CONFIG_REPAIR_PATTERNS = [
    /^\s*(?:\/|\$)project-init(?=\s|$)/i,
    /^\s*(?:\/|\$)init-project(?=\s|$)/i,
    /^\s*(?:\/|\$)project-config(?=\s|$)/i
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if the optional project config exists and is schema-valid.
 * Delegates to the shared config validator from project-config-loader.cjs.
 * @returns {boolean}
 */
function isConfigPopulated() {
    return _isConfigPopulated();
}

/** @param {string} prompt */
function isConfigRepairPrompt(prompt) {
    return CONFIG_REPAIR_PATTERNS.some(pattern => pattern.test(prompt || ''));
}

/**
 * The configured config path, relative to the project root, for display.
 * @returns {string}
 */
function configDisplayPath() {
    return path.relative(PROJECT_DIR, CONFIG_PATH).replace(/\\/g, '/') || path.basename(CONFIG_PATH);
}

/**
 * An ABSENT project config is a supported adopter state, never a block. Emit a
 * once-a-day notice telling the model to fall back to repository evidence, and
 * let the prompt through. Suppressed by the shared dismiss flag so a config-less
 * project is not lectured on every prompt.
 * @returns {void}
 */
function noticeMissingConfig() {
    if (isDismissed()) return;
    emitPromptContext(
        `No project config at \`${configDisplayPath()}\` — a supported state, not an error. ` +
        'The framework is running on its portable defaults: resolve project facts (paths, run ' +
        'commands, conventions, architecture) from repository evidence — manifests, lockfiles, ' +
        'scripts, directory layout — and state the assumption when one is material. Optional: ' +
        'run /project-init or /project-config to record those facts once instead of re-deriving ' +
        'them each session. This notice repeats at most once a day.'
    );
    writeDismissFlag();
}

/**
 * Tell the model that a config that EXISTS does not validate, or that its state could not be determined, and let the
 * prompt through. Blocking would also lock the user out of the session in the states where they need it most (a
 * conflicted config in the middle of a rebase), so the model is told to treat the config's facts as unverified.
 * @param {{state: string, errors?: string[]}} status
 */
function warnInvalidConfig(status) {
    const displayPath = configDisplayPath();
    // `missing` never reaches here: main() routes an absent config to noticeMissingConfig().
    const issue = status.state === 'unavailable'
        ? `Unable to verify the project config at \`${displayPath}\`: ${(status.errors || []).slice(0, 3).join('; ')}`
        : `Project config at \`${displayPath}\` is invalid: ${(status.errors || []).slice(0, 3).join('; ')}`;
    emitPromptContext(`${issue} Do not rely on the sections of that config as project facts: derive them from repository evidence and say so when it matters. Work the user asked for proceeds. Offer /project-init to repair it or /project-config to rewrite it once, never as a precondition. The minimum valid config is a non-empty project.name; capability sections may be omitted, but any declared section must satisfy its schema.`);
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
    if (rootResolution.error) return;
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
    if (rootResolution.error) return;
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
 * Check staleness gate after an existing config validates.
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
            '  /scan --target=<key>  — Refresh a specific doc when scope is narrow',
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
 * Check the agent-files gate after an existing config validates.
 *
 * Runs only in the schema-valid-config branch by design: /ai-context-refresh reads
 * the project config to generate CLAUDE.md, so offering it before config
 * validates would produce a meaningless file. Empty/uninitialized projects
 * are already short-circuited by the hasProjectContent() guard in main().
 *
 * Missing CLAUDE.md → /ai-context-refresh (AI-runnable).
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
    if (rootResolution.error) return;
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
 * Marker recording that the graph-not-built note was shown in this session.
 * Lives in the session-scoped OS temp markers dir, keyed by project and session,
 * so a new session (or another project in the same session id) may show it again.
 * @param {string} [sessionId] - Host session id; absent → the shared fallback id
 * @returns {string}
 */
function getGraphNoteMarkerPath(sessionId) {
    const sessionKey = String(sessionId || SESSION_ID_DEFAULT).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 128);
    return path.join(MARKERS_DIR, `${graphNoteMarkerPrefix()}${sessionKey}`);
}

/** File-name prefix shared by every graph-note marker of THIS project. */
function graphNoteMarkerPrefix() {
    const projectKey = crypto.createHash('sha256').update(PROJECT_DIR).digest('hex').slice(0, 12);
    return `graph-note-${projectKey}-`;
}

/**
 * Delete this project's graph-note markers older than GRAPH_DISMISS_TTL_MS.
 * One marker is written per session and nothing else removes them, so they would
 * otherwise pile up in OS temp. Other projects' markers are never touched.
 */
function pruneStaleGraphNoteMarkers() {
    const prefix = graphNoteMarkerPrefix();
    let names;
    try {
        names = fs.readdirSync(MARKERS_DIR);
    } catch {
        return;
    }
    const now = Date.now();
    for (const name of names) {
        if (!name.startsWith(prefix)) continue;
        const file = path.join(MARKERS_DIR, name);
        try {
            if (now - fs.statSync(file).mtimeMs >= GRAPH_DISMISS_TTL_MS) fs.unlinkSync(file);
        } catch {
            /* non-critical — a marker that cannot be removed stays until the OS cleans temp */
        }
    }
}

/**
 * Was the graph-not-built note already shown in this session?
 * Without a host session id every session shares one fallback marker, so that
 * marker expires after GRAPH_DISMISS_TTL_MS instead of silencing the note forever.
 * @param {string} [sessionId]
 * @returns {boolean}
 */
function isGraphNoteShown(sessionId) {
    try {
        const stat = fs.statSync(getGraphNoteMarkerPath(sessionId));
        return sessionId ? true : Date.now() - stat.mtimeMs < GRAPH_DISMISS_TTL_MS;
    } catch {
        return false;
    }
}

/**
 * Record that the graph-not-built note was shown in this session, first pruning
 * this project's markers that are past their 24 h lifetime.
 * @param {string} [sessionId]
 */
function markGraphNoteShown(sessionId) {
    try {
        ensureDir(MARKERS_DIR);
        pruneStaleGraphNoteMarkers();
        fs.writeFileSync(getGraphNoteMarkerPath(sessionId), new Date().toISOString() + '\n', 'utf-8');
    } catch {
        /* non-critical — worst case the note shows once more */
    }
}

/**
 * Check graph gate after config + staleness gates pass.
 *
 * The code graph is opt-in (`hooks.codeGraph.enabled` in docs/project-config.json):
 * the graph-not-built note appears only in mode 'on' without a built graph, at most
 * once per session, and never while dismissed. Mode 'auto' without a graph is
 * dormant (silent); mode 'off' emits nothing at all. If Python is not available,
 * the note tells the model which setup route or prerequisite remains.
 * @param {string} userPrompt - The user's prompt text
 * @param {{ config?: object, sessionId?: string }} [context] - Validated project config and host session id
 * @returns {void} Emits guidance when the graph is on but missing; returns otherwise
 */
function handleGraphGate(userPrompt, { config, sessionId } = {}) {
    // Only guide graph setup after an existing project config validates.
    if (!isConfigPopulated()) return;

    let graphUtils;
    try {
        graphUtils = require('./lib/graph-utils.cjs');
    } catch {
        return; // graph tooling not shipped — nothing to guide
    }
    const mode = graphUtils.codeGraphMode({ config, projectDir: PROJECT_DIR });

    // Mode off → no graph output of any kind.
    if (mode === 'off') return;

    // Graph already built → pass through
    if (fs.existsSync(GRAPH_DB_PATH)) return;

    // Graph missing — check escape hatches
    if (isGraphDismissed()) return;

    if (isGraphDismissRequest(userPrompt)) {
        writeGraphDismissFlag();
        emitPromptContext('Graph build skipped. Gate dismissed for 24 hours.');
        process.exit(0);
    }

    // Mode auto without a graph is dormant: the project never chose the graph.
    if (mode !== 'active') return;

    if (isAllowlistedPrompt(userPrompt)) return;

    // Once per session: the reminder is useful once, noise afterwards.
    if (isGraphNoteShown(sessionId)) return;

    // Detect Python availability to provide targeted instructions
    let hasPython = false;
    try {
        const status = graphUtils.isGraphAvailable();
        hasPython = status.python && status.deps;
    } catch {
        /* toolchain probe failed — assume no Python */
    }

    const instructions = hasPython
        ? ['  /graph-code --mode=build — Build the code graph (optional)']
        : [
              'Python 3.10+ required; `/graph-code --mode=build` installs the rest.',
              '  /graph-code --mode=build — Build the code graph (optional)'
          ];

    // Advisory only — the graph is an optional hint source; nothing depends on it.
    emitPromptContext(
        [
            '',
            '[project-context] Knowledge graph not built (optional — nothing requires it).',
            '',
            'Optional: the code graph (.code-graph/graph.db) can add callers, dependents and',
            'impacted tests when grep alone may not reveal a high-risk blast radius.',
            'It is a hint, not proof, and can be stale or incomplete. Skip it for low-risk work.',
            ...instructions,
            ''
        ].join('\n')
    );
    markGraphNoteShown(sessionId);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
    // An unresolvable project root is a host/environment problem, not a project one.
    // Every other hook skips in that state (see session-init); blocking every prompt
    // here would brick a session over a relative CLAUDE_PROJECT_DIR. Report and allow.
    if (rootResolution.error) {
        emitPromptContext(
            `[init-prompt-gate] Skipped: project root resolution failed (${rootResolution.error}). ` +
            'Project config and setup gates were not evaluated this turn.'
        );
        process.exit(0);
    }
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        // Parse stdin — UserPromptSubmit provides { prompt: "..." }
        let userPrompt = '';
        let sessionId = '';
        try {
            const payload = JSON.parse(stdin);
            userPrompt = payload.prompt || '';
            sessionId = typeof payload.session_id === 'string' ? payload.session_id : '';
        } catch {
            // Fail-open if we can't parse
            process.exit(0);
        }

        if (!userPrompt.trim()) process.exit(0);

        // Project config is OPTIONAL. Absent → notice and continue on portable
        // defaults. Present-but-invalid, or unreadable → warn and continue: the
        // model is told not to trust that config's facts, but the prompt is never
        // blocked, so a conflicted config mid-rebase cannot lock the user out.
        let configStatus;
        try {
            configStatus = getProjectConfigStatus({ refresh: true });
        } catch (error) {
            warnInvalidConfig({ state: 'unavailable', errors: [error.message] });
            process.exit(0);
        }
        if (!configStatus.valid) {
            if (isConfigRepairPrompt(userPrompt)) process.exit(0);
            if (configStatus.state !== 'missing') {
                warnInvalidConfig(configStatus);
                process.exit(0);
            }
            noticeMissingConfig();
            // Portable defaults need no generated project context. Every setup
            // gate below depends on the author's validated project facts.
            process.exit(0);
        }

        // The remaining setup gates apply to content-bearing projects only.
        if (!hasProjectContent()) process.exit(0);

        // Schema-valid config → check agent-files, staleness and optional graph gates.
        // Agent-files first: CLAUDE.md/AGENTS.md are the most foundational artifacts and
        // /ai-context-refresh depends on the (now-populated) config.
        handleAgentFilesGate(userPrompt);
        handleStalenessGate(userPrompt);
        handleGraphGate(userPrompt, { config: configStatus.config, sessionId });
        process.exit(0);
    } catch {
        // Optional setup guidance remains fail-open. Required-config verification
        // has its own fail-closed error boundary above.
        process.exit(0);
    }
}

// Export for testing
module.exports = {
    emitPromptContext,
    isConfigPopulated,
    isConfigRepairPrompt,
    warnInvalidConfig,
    noticeMissingConfig,
    configDisplayPath,
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
    handleGraphGate,
    getGraphNoteMarkerPath,
    isGraphNoteShown,
    // Agent-files gate
    handleAgentFilesGate
};

// Entry-point check covers the Codex `node -e … require(hook)` launcher too (require.main is undefined there).
if (isHookEntryPoint(module)) {
    main();
}
