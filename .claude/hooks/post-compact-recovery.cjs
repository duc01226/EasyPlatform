#!/usr/bin/env node
'use strict';

/**
 * SessionStart Hook: Automatic Recovery After Compaction
 *
 * This hook detects when a session is resumed after context compaction
 * and automatically injects recovery context to restore workflow state.
 *
 * Detection Logic:
 * 1. Check if session has active workflow state in temp file
 * 2. Look for recent checkpoint files (within last 24 hours)
 * 3. If workflow was in progress, inject recovery instructions
 *
 * Triggered by: SessionStart event (when resuming after compact)
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');
const { loadConfig, readSessionState, getReportsPath, resolvePlanPath } = require('./lib/ck-config-utils.cjs');
const { loadState: loadWorkflowState, getCurrentStepInfo, getRecoveryContext } = require('./lib/workflow-state.cjs');
const { getSwapEntries } = require('./lib/swap-engine.cjs');
const { getMarkerPath, SESSION_ID_DEFAULT } = require('./lib/ck-paths.cjs');

/**
 * Find most recent checkpoint file (within time limit)
 * @param {string} reportsPath - Path to reports directory
 * @param {number} maxAgeMinutes - Maximum age in minutes (default: 1440 = 24h)
 * @returns {string|null} Path to most recent checkpoint or null
 */
function findRecentCheckpoint(reportsPath, maxAgeMinutes = 1440) {
    try {
        const fullPath = path.resolve(process.cwd(), reportsPath);
        if (!fs.existsSync(fullPath)) return null;

        const entries = fs.readdirSync(fullPath, { withFileTypes: true });
        const checkpoints = entries
            .filter(e => e.isFile() && e.name.startsWith('memory-checkpoint-') && e.name.endsWith('.md'))
            .map(e => ({
                name: e.name,
                path: path.join(fullPath, e.name),
                mtime: fs.statSync(path.join(fullPath, e.name)).mtime
            }))
            .filter(f => {
                const ageMinutes = (Date.now() - f.mtime.getTime()) / 60000;
                return ageMinutes <= maxAgeMinutes;
            })
            .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

        return checkpoints.length > 0 ? checkpoints[0].path : null;
    } catch (e) {
        return null;
    }
}

/**
 * Find partial subagent progress files written under tmp/ck-agent-*.progress.md.
 * Returns only files whose content contains [partial] AND whose mtime is within maxAgeMinutes.
 * When sessionId is provided, files with a "Session: <id>" first-line header are filtered to
 * match only the current session. Files without a Session header are included for all sessions
 * (backward-compatible with agents that did not write the header).
 * @param {number} maxAgeMinutes - Maximum age in minutes (default: 120 = 2h)
 * @param {string|null} sessionId - Current session ID for isolation (optional)
 * @returns {Array<{name:string, path:string, mtime:Date}>} Sorted newest-first
 */
function findPartialProgressFiles(maxAgeMinutes = 120, sessionId = null) {
    try {
        const tmpPath = path.resolve(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpPath)) return [];

        const entries = fs.readdirSync(tmpPath, { withFileTypes: true });
        return entries
            .filter(e => e.isFile() && e.name.startsWith('ck-agent-') && e.name.endsWith('.progress.md'))
            .map(e => {
                const filePath = path.join(tmpPath, e.name);
                // TOCTOU: file may be deleted between readdirSync and statSync — per-file try/catch
                try {
                    const stat = fs.statSync(filePath);
                    return { name: e.name, path: filePath, mtime: stat.mtime };
                } catch (e) {
                    return null;
                }
            })
            .filter(f => {
                if (!f) return false;
                const ageMinutes = (Date.now() - f.mtime.getTime()) / 60000;
                if (ageMinutes > maxAgeMinutes) return false;
                try {
                    const content = fs.readFileSync(f.path, 'utf8');
                    if (!content.includes('[partial]')) return false;
                    // Session filtering: if sessionId provided, check Session: header
                    if (sessionId) {
                        const firstLine = content.split('\n')[0].trim();
                        if (firstLine.startsWith('Session:')) {
                            const fileSession = firstLine.slice('Session:'.length).trim();
                            return fileSession === sessionId;
                        }
                        // No Session header — backward-compatible, include for all sessions
                    }
                    return true;
                } catch (e) {
                    return false;
                }
            })
            .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    } catch (e) {
        return [];
    }
}

/**
 * Build a markdown recovery block listing each [partial] progress file.
 * Extracts up to 3 lines per [partial] section as an excerpt.
 * @param {Array<{name:string, path:string}>} files
 * @returns {string}
 */
function buildPartialRecoveryBlock(files) {
    const lines = ['', '## Partial Subagent Work Found', ''];
    lines.push('> The following subagent progress files contain unfinished `[partial]` work.');
    lines.push('> Review these files and decide whether to re-spawn the subagent to complete the task.');
    lines.push('');

    for (const file of files) {
        lines.push(`### \`${file.name}\``);
        lines.push('');
        try {
            const contentLines = fs.readFileSync(file.path, 'utf8').split('\n');
            const excerpts = [];
            for (let i = 0; i < contentLines.length; i++) {
                if (contentLines[i].includes('[partial]')) {
                    excerpts.push(...contentLines.slice(i, Math.min(i + 3, contentLines.length)));
                }
                if (excerpts.length >= 6) break;
            }
            if (excerpts.length > 0) {
                lines.push('```');
                lines.push(...excerpts.map(l => l.trimEnd()));
                lines.push('```');
            }
        } catch (e) {
            lines.push('_(could not read file)_');
        }
        lines.push('');
    }

    lines.push(`> **Action:** Read the progress file(s) above with the Read tool for full context.`);
    lines.push('');
    return lines.join('\n');
}

/**
 * Delete done-only progress files older than maxAgeHours (best-effort, silent fail).
 * Never deletes files containing [partial] — only fully-done files.
 * When sessionId is provided, skips files belonging to OTHER sessions (Session: header mismatch)
 * to prevent cross-session cleanup of live progress files.
 * Files without a Session header are cleaned up unconditionally (backward-compatible).
 * @param {number} maxAgeHours - Minimum age before deletion (default: 24h)
 * @param {string|null} sessionId - Current session ID for isolation (optional)
 */
function cleanupDoneProgressFiles(maxAgeHours = 24, sessionId = null) {
    try {
        const tmpPath = path.resolve(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpPath)) return;

        for (const entry of fs.readdirSync(tmpPath, { withFileTypes: true })) {
            if (!entry.isFile() || !entry.name.startsWith('ck-agent-') || !entry.name.endsWith('.progress.md')) continue;
            const filePath = path.join(tmpPath, entry.name);
            try {
                const stat = fs.statSync(filePath);
                const ageHours = (Date.now() - stat.mtime.getTime()) / 3600000;
                if (ageHours <= maxAgeHours) continue;
                const content = fs.readFileSync(filePath, 'utf8');
                if (content.includes('[partial]')) continue;
                // Session safety: skip files that belong to a different session
                if (sessionId) {
                    const firstLine = content.split('\n')[0].trim();
                    if (firstLine.startsWith('Session:')) {
                        const fileSession = firstLine.slice('Session:'.length).trim();
                        if (fileSession !== sessionId) continue;
                    }
                }
                fs.unlinkSync(filePath);
            } catch (e) { /* silent fail per file */ }
        }
    } catch (e) { /* silent fail */ }
}

/**
 * Extract recovery metadata from checkpoint file
 * @param {string} checkpointPath - Path to checkpoint file
 * @returns {Object|null} Recovery metadata or null
 */
function extractRecoveryMetadata(checkpointPath) {
    try {
        const content = fs.readFileSync(checkpointPath, 'utf8');

        // Look for JSON metadata block
        const jsonMatch = content.match(/## Recovery Metadata \(JSON\)\s*```json\s*([\s\S]*?)```/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[1].trim());
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Build recovery injection content
 * @param {Object} workflowState - Workflow state
 * @param {Object} stepInfo - Current step info
 * @param {Object} sessionState - Session state
 * @param {string} checkpointPath - Path to checkpoint file
 * @param {string} sessionId - Session ID for swap entries
 */
function buildRecoveryInjection(workflowState, stepInfo, sessionState, checkpointPath, sessionId) {
    const lines = ['', '## ⚠️ WORKFLOW RECOVERY CONTEXT', '', '> **Context was compacted.** Workflow state has been automatically restored.', ''];

    // Active Plan
    if (sessionState?.activePlan) {
        lines.push(`### Active Plan`);
        lines.push('');
        lines.push(`**Path:** \`${sessionState.activePlan}\``);
        lines.push('');
        lines.push('> **⚠️ MUST ATTENTION READ** this plan to understand full task context.');
        lines.push('');
    }

    // Workflow State
    if (workflowState.workflowType && stepInfo) {
        lines.push('### Workflow Status');
        lines.push('');
        lines.push(`- **Type:** ${workflowState.workflowType}`);
        lines.push(`- **Progress:** Step ${stepInfo.currentStepIndex + 1} of ${stepInfo.totalSteps}`);
        lines.push(`- **Current:** \`${stepInfo.currentStep || 'none'}\``);
        lines.push('');

        if (stepInfo.completedSteps.length > 0) {
            lines.push(`**Completed:** ${stepInfo.completedSteps.join(', ')}`);
        }
        if (stepInfo.remainingSteps.length > 0) {
            lines.push(`**Remaining:** ${stepInfo.remainingSteps.join(' → ')}`);
        }
        lines.push('');
    }

    // Pending Todos
    if (workflowState.todos && workflowState.todos.length > 0) {
        const inProgressTodos = workflowState.todos.filter(t => t.status === 'in_progress');
        const pendingTodos = workflowState.todos.filter(t => t.status === 'pending');

        if (inProgressTodos.length > 0 || pendingTodos.length > 0) {
            lines.push('### Todo Items to Restore');
            lines.push('');
            lines.push('**⚠️ CRITICAL:** Call `TaskList` FIRST to check for existing tasks.');
            lines.push('If tasks already exist, **resume them** — do NOT create duplicates.');
            lines.push('Only use `TaskCreate` if TaskList returns empty.');
            lines.push('');
            lines.push('Expected tasks from before compaction:');
            lines.push('');
            [...inProgressTodos, ...pendingTodos].forEach(t => {
                const marker = t.status === 'in_progress' ? '[~]' : '[ ]';
                lines.push(`- ${marker} ${t.content}`);
            });
            lines.push('');
        }
    }

    // Externalized Content (Swap Files)
    if (sessionId) {
        try {
            const swapEntries = getSwapEntries(sessionId);
            if (swapEntries.length > 0) {
                lines.push('### Externalized Content (Recoverable)');
                lines.push('');
                lines.push('The following large tool outputs were externalized during this session:');
                lines.push('');
                lines.push('| ID | Tool | Summary | Retrieve |');
                lines.push('|----|------|---------|----------|');
                swapEntries.slice(0, 10).forEach(entry => {
                    const shortSummary = entry.summary.slice(0, 40) + (entry.summary.length > 40 ? '...' : '');
                    lines.push(`| \`${entry.id}\` | ${entry.tool} | ${shortSummary} | \`Read: ${entry.retrievePath}\` |`);
                });
                if (swapEntries.length > 10) {
                    lines.push(`| ... | ${swapEntries.length - 10} more entries | | |`);
                }
                lines.push('');
                lines.push('> **⚠️ MUST ATTENTION READ** — Use Read tool with the retrieve path to get exact content when needed.');
                lines.push('');
            }
        } catch (e) {
            // Silent fail - swap entries optional
        }
    }

    // Checkpoint Reference
    if (checkpointPath) {
        lines.push('### Full Checkpoint');
        lines.push('');
        lines.push(`**File:** \`${path.relative(process.cwd(), checkpointPath)}\``);
        lines.push('');
        lines.push('> **⚠️ MUST ATTENTION READ** this file for complete recovery context if needed.');
        lines.push('');
    }

    // Action Instructions
    lines.push('### ⚡ REQUIRED ACTIONS');
    lines.push('');
    lines.push('1. **FIRST:** Call `TaskList` to check existing tasks — resume them, do NOT create duplicates');
    if (stepInfo && stepInfo.currentStep) {
        lines.push(`2. **THEN:** Continue workflow from step \`${stepInfo.currentStep}\``);
    } else {
        lines.push('2. **THEN:** Continue from where the task left off');
    }
    if (sessionState?.activePlan) {
        lines.push(`3. **⚠️ IMPORTANT — MUST ATTENTION READ:** \`${sessionState.activePlan}/plan.md\` for full context`);
    }
    lines.push(`${sessionState?.activePlan ? '4' : '3'}. **⚠️ Re-read files** with Read tool before using Edit — compaction clears file read state.`);
    lines.push('');

    return lines.join('\n');
}

/**
 * Main execution
 */
async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) {
            process.exit(0);
        }

        const payload = JSON.parse(stdin);
        const sessionId = payload.session_id || process.env.CK_SESSION_ID || SESSION_ID_DEFAULT;

        // RECOVERY INVARIANT: Full todo/step recovery requires workflow state persisted by
        // write-compact-marker.cjs at compact time. If workflow state is absent (fresh install,
        // hook ordering gap, or session started without workflow), recovery falls back to
        // checkpoint-only mode. This is expected behavior — the invariant is: if you need
        // full recovery, a compact event MUST have fired with write-compact-marker active.
        const workflowState = loadWorkflowState(sessionId);

        // Check if there's an active workflow to recover
        if (!workflowState.workflowType && (!workflowState.todos || workflowState.todos.length === 0)) {
            // No workflow state - check for recent checkpoint anyway
            const config = loadConfig({ includeProject: false, includeAssertions: false });
            const resolved = resolvePlanPath(sessionId, config);
            const reportsPath = getReportsPath(resolved.path, resolved.resolvedBy, config.plan, config.paths);

            const checkpointPath = findRecentCheckpoint(reportsPath);
            if (!checkpointPath) {
                // Phase 03: scan for partial subagent progress files (session-scoped)
                // ONLY surface after a compact event — check for compact marker
                const markerExists = fs.existsSync(getMarkerPath(sessionId));
                if (markerExists) {
                    const partialFiles = findPartialProgressFiles(120, sessionId);
                    if (partialFiles.length > 0) {
                        console.log(buildPartialRecoveryBlock(partialFiles));
                    }
                    // Delete marker so second resume after same compact doesn't re-surface
                    try { fs.unlinkSync(getMarkerPath(sessionId)); } catch (e) {}
                    try { cleanupDoneProgressFiles(24, sessionId); } catch (e) {} // best-effort cleanup
                }
                process.exit(0);
            }

            // Found checkpoint but no workflow state - extract metadata
            const metadata = extractRecoveryMetadata(checkpointPath);
            if (!metadata || !metadata.pendingTodos || metadata.pendingTodos.length === 0) {
                process.exit(0);
            }

            // Inject minimal recovery context from checkpoint
            console.log('');
            console.log('## 📋 Recovery Checkpoint Found');
            console.log('');
            console.log(`A recent checkpoint was found: \`${path.relative(process.cwd(), checkpointPath)}\``);
            console.log('');
            console.log('**⚠️ MUST ATTENTION READ** this file if you need to recover context from a previous session.');
            console.log('');
            process.exit(0);
        }

        // Active workflow exists - inject full recovery context
        const sessionState = readSessionState(sessionId);
        const stepInfo = getCurrentStepInfo(sessionId);

        // Find checkpoint for reference
        const config = loadConfig({ includeProject: false, includeAssertions: false });
        const resolved = resolvePlanPath(sessionId, config);
        const reportsPath = getReportsPath(resolved.path, resolved.resolvedBy, config.plan, config.paths);
        const checkpointPath = findRecentCheckpoint(reportsPath);

        // Build and output recovery injection
        const recoveryContent = buildRecoveryInjection(workflowState, stepInfo, sessionState, checkpointPath, sessionId);
        console.log(recoveryContent);

        process.exit(0);
    } catch (error) {
        // Silent fail - don't block session start
        if (process.env.CK_DEBUG) {
            console.error(`[post-compact-recovery] Error: ${error.message}`);
        }
        process.exit(0);
    }
}

main();
