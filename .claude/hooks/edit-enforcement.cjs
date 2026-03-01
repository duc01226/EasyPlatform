#!/usr/bin/env node
'use strict';

/**
 * Edit Enforcement - Unified PreToolUse Hook for Edit|Write|MultiEdit|NotebookEdit
 *
 * Replaces 3 former hooks (edit-complexity-tracker, plan-artifact-enforcer,
 * todo-enforcement Edit branch) with a single process per edit operation.
 *
 * Logic flow:
 *   1. recordEdit() — track file for statistics
 *   2. Quick mode bypass (CK_QUICK_MODE or quick: prefix)
 *   3. hasTodos? → allow (user is tracking)
 *   4. isExemptFile? → check plan warnings → allow
 *   5. projectHasCode? — if no code dirs yet (docs/planning-only) → allow
 *   6. Non-exempt, no tasks, has code → BLOCK (exit 1)
 *
 * Exit Codes:
 *   0 - Allow (non-blocking)
 *   1 - Block with message (no tasks + non-exempt file)
 *
 * @module edit-enforcement
 */

const fs = require('fs');
const path = require('path');
const { recordEdit, getEditState, setEditState, getPlanWarningShown, setPlanWarningShown } = require('./lib/edit-state.cjs');
const { hasTodos, recordBypass } = require('./lib/todo-state.cjs');
const { readSessionState } = require('./lib/ck-session-state.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const FILE_MOD_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const PLAN_WARNING_THRESHOLD = 4;
const PLAN_WARNING_THRESHOLD_SECOND = 8;

// Files exempt from task-tracking enforcement
const EXEMPT_PATTERNS = [/\.claude[/\\]hooks[/\\]/, /plans[/\\]/, /\.json$/, /\.md$/];

// Folders excluded from "has code" detection — project is docs/planning-only if
// ONLY these folders exist at the CWD root level
const DOCS_ONLY_FOLDERS = new Set(['docs', 'plans', 'team-artifacts']);

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function isExemptFile(filePath) {
    if (!filePath) return true;
    return EXEMPT_PATTERNS.some(p => p.test(filePath));
}

/**
 * Check if CWD contains actual code folders (not just docs/plans/config).
 * Excludes: docs, plans, team-artifacts, dot-prefixed folders (e.g. .claude, .github).
 * Cached once per session in edit state to avoid repeated fs scans.
 * @param {string} sessionId - Session identifier
 * @returns {boolean} True if project has code directories beyond docs/planning
 */
function projectHasCode(sessionId) {
    // Check cache first — only scan once per session
    const state = getEditState(sessionId);
    if (state.projectCodeChecked) return state.projectHasCode;

    let hasCode = false;
    try {
        const cwd = process.cwd();
        const entries = fs.readdirSync(cwd, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const name = entry.name;
            // Skip dot-prefixed folders and known docs-only folders
            if (name.startsWith('.') || DOCS_ONLY_FOLDERS.has(name)) continue;
            // Found a non-excluded directory → project has code
            hasCode = true;
            break;
        }
    } catch (e) {
        // If we can't read CWD, assume code exists (don't block unexpectedly)
        hasCode = true;
    }

    // Cache result in edit state
    state.projectCodeChecked = true;
    state.projectHasCode = hasCode;
    setEditState(sessionId, state);

    return hasCode;
}

function extractAllFilePaths(toolInput) {
    if (!toolInput) return [];
    if (toolInput.file_path) return [toolInput.file_path];
    if (toolInput.notebook_path) return [toolInput.notebook_path];
    if (toolInput.edits && Array.isArray(toolInput.edits)) {
        return [...new Set(toolInput.edits.map(e => e?.file_path).filter(Boolean))];
    }
    return [];
}

function getTodayPrefix() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
}

function hasActivePlan(sessionId) {
    const sessionState = readSessionState(sessionId);
    if (sessionState && sessionState.activePlan) return true;
    const plansDir = path.resolve(process.cwd(), 'plans');
    try {
        if (!fs.existsSync(plansDir)) return false;
        const entries = fs.readdirSync(plansDir);
        return entries.some(e => e.startsWith(getTodayPrefix()));
    } catch (e) {
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

function editBlockMessage(toolName, filePath) {
    return `## Task Tracking Enforcement

**Blocked:** \`${toolName}\` on \`${filePath}\`

File modifications require task tracking. Call \`TaskCreate\` to break your work into tasks BEFORE making file changes.

### Bypass

Prefix your message with \`quick:\` to bypass enforcement.`;
}

function planWarningMessage(uniqueFiles, isSecond) {
    if (isSecond) {
        return `\n## Large Edit Session — No Plan Detected (Reminder)\n\n**${uniqueFiles} files modified** without an active plan.\nMulti-file changes benefit from a plan. Run \`/plan <task description>\` or ignore if intentional.\n`;
    }
    return `\n## Plan Reminder\n\n**${uniqueFiles} files modified** without a plan.\nConsider: \`/plan <task description>\`\n`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        const toolName = payload.tool_name || '';

        if (!FILE_MOD_TOOLS.has(toolName)) process.exit(0);

        const sessionId = process.env.CLAUDE_SESSION_ID || process.env.CK_SESSION_ID || 'unknown';

        // Quick mode bypass
        if (process.env.CK_QUICK_MODE === 'true') {
            recordBypass(sessionId, { skill: toolName, reason: 'quick_mode' });
            process.exit(0);
        }

        // 1. Record edit (always — for statistics and plan threshold tracking)
        const filePaths = extractAllFilePaths(payload.tool_input);
        const pathsToRecord = filePaths.length > 0 ? filePaths : [null];
        for (const fp of pathsToRecord) {
            recordEdit(sessionId, fp, toolName);
        }

        // 2. If tasks exist, user is tracking → allow (skip plan warnings)
        if (hasTodos(sessionId)) {
            process.exit(0);
        }

        // 3. Get the primary file path for exempt check (MultiEdit uses edits[0])
        const primaryPath = payload.tool_input?.file_path || payload.tool_input?.notebook_path || payload.tool_input?.edits?.[0]?.file_path || '';

        // 4. Exempt files are allowed, but still check plan warnings
        if (isExemptFile(primaryPath)) {
            checkPlanWarnings(sessionId);
            process.exit(0);
        }

        // 5. Docs/planning-only project (no code dirs yet) → allow without blocking
        if (!projectHasCode(sessionId)) {
            process.exit(0);
        }

        // 6. Non-exempt file + no tasks + project has code → BLOCK
        console.log(editBlockMessage(toolName, primaryPath));
        process.exit(1);
    } catch (error) {
        // SPoF mitigation: log to stderr so failures are detectable, but don't block
        console.error(`[edit-enforcement] Uncaught error — allowing operation: ${error.message}`);
        process.exit(0);
    }
}

/**
 * Check plan warning thresholds (4 and 8 unique files)
 * Non-blocking: always exits 0, just emits warning messages
 */
function checkPlanWarnings(sessionId) {
    const state = getEditState(sessionId);
    const uniqueFiles = (state.filesModified || []).length;

    // 8-file threshold (second warning)
    if (uniqueFiles >= PLAN_WARNING_THRESHOLD_SECOND && !getPlanWarningShown(sessionId, 8)) {
        if (!hasActivePlan(sessionId)) {
            console.log(planWarningMessage(uniqueFiles, true));
            setPlanWarningShown(sessionId, 8);
        }
        return;
    }

    // 4-file threshold (first warning)
    if (uniqueFiles >= PLAN_WARNING_THRESHOLD && !getPlanWarningShown(sessionId, 4)) {
        if (!hasActivePlan(sessionId)) {
            console.log(planWarningMessage(uniqueFiles, false));
            setPlanWarningShown(sessionId, 4);
        }
    }
}

main();
