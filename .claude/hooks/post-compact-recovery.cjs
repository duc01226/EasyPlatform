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
const {
  loadConfig,
  readSessionState,
  getReportsPath,
  resolvePlanPath
} = require('./lib/ck-config-utils.cjs');
const {
  loadState: loadWorkflowState,
  getCurrentStepInfo,
  getRecoveryContext
} = require('./lib/workflow-state.cjs');
const { getSwapEntries } = require('./lib/swap-engine.cjs');

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
  const lines = [
    '',
    '## ⚠️ WORKFLOW RECOVERY CONTEXT',
    '',
    '> **Context was compacted.** Workflow state has been automatically restored.',
    ''
  ];

  // Active Plan
  if (sessionState?.activePlan) {
    lines.push(`### Active Plan`);
    lines.push('');
    lines.push(`**Path:** \`${sessionState.activePlan}\``);
    lines.push('');
    lines.push('> **⚠️ MUST READ** this plan to understand full task context.');
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
      lines.push('**IMPORTANT:** Call TaskCreate to restore these items:');
      lines.push('');
      lines.push('```json');
      const todosToRestore = [...inProgressTodos, ...pendingTodos].map(t => ({
        content: t.content,
        status: t.status,
        activeForm: t.activeForm || `Working on ${t.content}`
      }));
      lines.push(JSON.stringify(todosToRestore, null, 2));
      lines.push('```');
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
        lines.push('> **⚠️ MUST READ** — Use Read tool with the retrieve path to get exact content when needed.');
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
    lines.push('> **⚠️ MUST READ** this file for complete recovery context if needed.');
    lines.push('');
  }

  // Action Instructions
  lines.push('### ⚡ REQUIRED ACTIONS');
  lines.push('');
  lines.push('1. **FIRST:** Call TaskCreate to restore todo items above');
  if (stepInfo && stepInfo.currentStep) {
    lines.push(`2. **THEN:** Continue workflow from step \`${stepInfo.currentStep}\``);
  } else {
    lines.push('2. **THEN:** Continue from where the task left off');
  }
  if (sessionState?.activePlan) {
    lines.push(`3. **⚠️ IMPORTANT — MUST READ:** \`${sessionState.activePlan}/plan.md\` for full context`);
  }
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
    const sessionId = payload.session_id || process.env.CK_SESSION_ID;

    if (!sessionId) {
      process.exit(0);
    }

    // Load workflow state from temp file
    const workflowState = loadWorkflowState(sessionId);

    // Check if there's an active workflow to recover
    if (!workflowState.workflowType && (!workflowState.todos || workflowState.todos.length === 0)) {
      // No workflow state - check for recent checkpoint anyway
      const config = loadConfig({ includeProject: false, includeAssertions: false });
      const resolved = resolvePlanPath(sessionId, config);
      const reportsPath = getReportsPath(resolved.path, resolved.resolvedBy, config.plan, config.paths);

      const checkpointPath = findRecentCheckpoint(reportsPath);
      if (!checkpointPath) {
        // No workflow and no recent checkpoint - nothing to recover
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
      console.log('**⚠️ MUST READ** this file if you need to recover context from a previous session.');
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
