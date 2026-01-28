#!/usr/bin/env node
/**
 * Workflow State Management Library (Per-Session)
 *
 * Provides persistent state tracking for multi-step workflows using
 * per-session files to prevent cross-session state leaks.
 *
 * Features:
 * - Per-session file isolation (CLAUDE_SESSION_ID)
 * - Atomic writes (write-to-temp-then-rename)
 * - Step completion tracking
 * - Recovery context for post-compaction injection
 * - Graceful error handling
 *
 * Fixes:
 * - Stale state from previous sessions blocking new workflows
 * - Race conditions from shared global state file
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { WORKFLOW_DIR, ensureDir, sanitizeSessionId } = require('./ck-paths.cjs');

// Legacy path (for migration cleanup)
const LEGACY_STATE_FILE = path.join(process.cwd(), '.claude', '.workflow-state.json');

// --- Internal helpers ---

/**
 * Get current session ID from environment
 * @returns {string} Session ID or 'default'
 */
function getSessionId() {
  return process.env.CLAUDE_SESSION_ID || 'default';
}

/**
 * Get workflow state file path for current session
 * @param {string} [sessionId] - Override session ID
 * @returns {string} Full path to workflow state file
 */
function getStatePath(sessionId) {
  const sid = sanitizeSessionId(sessionId || getSessionId());
  return path.join(WORKFLOW_DIR, `${sid}.json`);
}

/**
 * Read state from per-session file
 * @param {string} [sessionId] - Override session ID
 * @returns {Object|null} State object or null
 */
function readStateFile(sessionId) {
  try {
    const filePath = getStatePath(sessionId);
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Write state atomically (write-to-temp-then-rename)
 * @param {Object} state - State to write
 * @param {string} [sessionId] - Override session ID
 * @returns {boolean} Success
 */
function writeStateFile(state, sessionId) {
  let tmpFile = null;
  try {
    ensureDir(WORKFLOW_DIR);
    const filePath = getStatePath(sessionId);
    tmpFile = filePath + '.' + Math.random().toString(36).slice(2);
    fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2));
    fs.renameSync(tmpFile, filePath);
    return true;
  } catch (e) {
    // Clean up temp file on failure
    try {
      if (tmpFile) fs.unlinkSync(tmpFile);
    } catch (_) {}
    return false;
  }
}

/**
 * Delete state file
 * @param {string} [sessionId] - Override session ID
 */
function deleteStateFile(sessionId) {
  try {
    const filePath = getStatePath(sessionId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Silent fail
  }
}

// --- Public API (signatures unchanged for callers) ---

/**
 * Validate state has v2.0 structure (sequence, currentStep).
 * Detects stale v1.x state files that use workflowSteps/currentStepIndex.
 * @param {Object} state - State object to validate
 * @returns {boolean} True if valid v2.0 state
 */
function isValidState(state) {
  return state
    && Array.isArray(state.sequence)
    && typeof state.currentStep === 'number';
}

/**
 * Load current workflow state
 * @returns {Object|null} Current state or null if none exists
 */
function loadState() {
  const state = readStateFile();
  if (state && !isValidState(state)) {
    // Stale v1.x state — clear and return null
    deleteStateFile();
    return null;
  }
  return state;
}

/**
 * Save workflow state
 * @param {Object} state - State object to save
 */
function saveState(state) {
  writeStateFile(state);
}

/**
 * Clear workflow state
 * @param {string} [sessionId] - Optional session ID (used by session-end.cjs)
 */
function clearState(sessionId) {
  deleteStateFile(sessionId);
}

/**
 * Create new workflow state
 * @param {Object} params - Workflow parameters
 * @returns {Object} Created state
 */
function createState({ workflowId, workflowName, sequence, originalPrompt, commandMapping }) {
  const state = {
    workflowId,
    workflowName,
    sequence,
    commandMapping: commandMapping || {},
    currentStep: 0,
    completedSteps: [],
    startTime: new Date().toISOString(),
    originalPrompt: originalPrompt || '',
    lastUpdated: new Date().toISOString(),
    sessionId: getSessionId()
  };

  saveState(state);
  return state;
}

/**
 * Mark a step as completed
 * @param {string} stepId - Step ID to mark complete
 * @returns {Object|null} Updated state
 */
function markStepComplete(stepId) {
  const state = loadState();
  if (!state) return null;

  if (!state.completedSteps.includes(stepId)) {
    state.completedSteps.push(stepId);
  }

  // Auto-advance to next step
  const currentIdx = state.sequence.indexOf(stepId);
  if (currentIdx !== -1 && currentIdx >= state.currentStep) {
    state.currentStep = currentIdx + 1;
  }

  delete state.inProgressStep;
  state.lastUpdated = new Date().toISOString();

  // Check if workflow complete
  if (state.currentStep >= state.sequence.length) {
    clearState();
    return null;
  }

  saveState(state);
  return state;
}

/**
 * Get current step info
 * @returns {Object|null} Current step details
 */
function getCurrentStepInfo() {
  const state = loadState();
  if (!state) return null;

  const currentStepId = state.sequence[state.currentStep];
  const cmd = state.commandMapping?.[currentStepId];

  return {
    stepId: currentStepId,
    stepNumber: state.currentStep + 1,
    totalSteps: state.sequence.length,
    claudeCommand: cmd?.claude || `/${currentStepId}`,
    remainingSteps: state.sequence.slice(state.currentStep),
    completedSteps: state.completedSteps,
    workflowName: state.workflowName,
    workflowId: state.workflowId,
    commandMapping: state.commandMapping || {}
  };
}

/**
 * Build workflow continuation reminder
 * @returns {string|null} Reminder text or null if no active workflow
 */
function buildContinuationReminder() {
  const info = getCurrentStepInfo();
  if (!info) return null;

  const remainingDisplay = info.remainingSteps.map(step => {
    const cmd = info.commandMapping?.[step];
    return cmd?.claude || `/${step}`;
  }).join(' \u2192 ');

  const lines = [
    '',
    '## Active Workflow',
    '',
    `**Workflow:** ${info.workflowName}`,
    `**Progress:** Step ${info.stepNumber}/${info.totalSteps}`,
    `**Current Step:** \`${info.claudeCommand}\``,
    `**Remaining:** ${remainingDisplay}`,
    '',
    '### Instructions (MUST FOLLOW)',
    '',
    `1. **CONTINUE** the workflow by executing: \`${info.claudeCommand}\``,
    '2. After completing this step, proceed to the next step in sequence',
    '3. Do NOT skip steps unless explicitly instructed by the user',
    ''
  ];

  return lines.join('\n');
}

/**
 * Get recovery context for post-compaction injection
 * @returns {string|null} Recovery context markdown or null
 */
function getRecoveryContext() {
  const state = loadState();
  if (!state || !state.workflowId) return null;

  const info = getCurrentStepInfo();
  if (!info) return null;

  const completed = state.completedSteps.map(s => {
    const cmd = state.commandMapping?.[s];
    return `  - [x] ${cmd?.claude || `/${s}`}`;
  }).join('\n');

  const remaining = info.remainingSteps.map(s => {
    const cmd = state.commandMapping?.[s];
    return `  - [ ] ${cmd?.claude || `/${s}`}`;
  }).join('\n');

  return [
    '## Workflow Recovery',
    '',
    `**${state.workflowName}** (step ${info.stepNumber}/${info.totalSteps})`,
    `Original prompt: "${state.originalPrompt}"`,
    '',
    '### Progress',
    completed || '  (none)',
    '',
    '### Remaining',
    remaining,
    '',
    `**Next:** Execute \`${info.claudeCommand}\``,
    ''
  ].join('\n');
}

/**
 * Check if user prompt indicates workflow completion/skip
 * @param {string} prompt - User prompt
 * @returns {string|null} Action: 'complete', 'skip', 'abort', or null
 */
function detectWorkflowControl(prompt) {
  const lowerPrompt = prompt.toLowerCase().trim();

  // Abort patterns
  if (/^(stop|abort|cancel|quit)\s*(workflow|the workflow)?$/.test(lowerPrompt)) {
    return 'abort';
  }

  // Skip current step patterns
  if (/^skip(\s+this)?(\s+step)?$/.test(lowerPrompt)) {
    return 'skip';
  }

  // Complete current step patterns
  if (/^(done|complete|finished|next)(\s+step)?$/.test(lowerPrompt)) {
    return 'complete';
  }

  return null;
}

/**
 * Clean up legacy global state file if it exists
 * Call once during migration to remove old .claude/.workflow-state.json
 */
function cleanupLegacyStateFile() {
  try {
    if (fs.existsSync(LEGACY_STATE_FILE)) {
      fs.unlinkSync(LEGACY_STATE_FILE);
    }
  } catch {
    // Silent fail
  }
}

module.exports = {
  loadState,
  saveState,
  clearState,
  createState,
  markStepComplete,
  getCurrentStepInfo,
  buildContinuationReminder,
  getRecoveryContext,
  detectWorkflowControl,
  cleanupLegacyStateFile,
  // For testing
  getStatePath,
  LEGACY_STATE_FILE
};
