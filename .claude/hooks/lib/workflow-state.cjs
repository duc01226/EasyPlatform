#!/usr/bin/env node
'use strict';

/**
 * Workflow State Management - Persistent workflow tracking across context compaction
 *
 * Provides functions to load, save, and manage workflow state in a session-specific
 * temp file that survives context compaction events.
 *
 * Storage: /tmp/ck/workflow-{sessionId}.json
 *
 * @module workflow-state
 */

const fs = require('fs');
const path = require('path');
const { CK_TMP_DIR, ensureDir } = require('./ck-paths.cjs');

// Workflow state directory
const WORKFLOW_DIR = path.join(CK_TMP_DIR, 'workflow');

/**
 * Get workflow state file path for a session
 * @param {string} sessionId - Session identifier
 * @returns {string} Path to workflow state file
 */
function getWorkflowPath(sessionId) {
  return path.join(WORKFLOW_DIR, `${sessionId}.json`);
}

/**
 * Default workflow state schema
 * @returns {Object} Default empty workflow state
 */
function getDefaultState() {
  return {
    workflowType: null,       // See workflows.json for all workflow types
    workflowSteps: [],        // Array of step names in order
    currentStepIndex: -1,     // Index of current step (-1 = not started)
    completedSteps: [],       // Array of completed step names
    activePlan: null,         // Path to active plan file
    todos: [],                // Snapshot of TaskCreate items
    startedAt: null,          // ISO timestamp when workflow started
    lastUpdatedAt: null,      // ISO timestamp of last update
    metadata: {}              // Additional workflow-specific data
  };
}

/**
 * Load workflow state from temp file
 * @param {string} sessionId - Session identifier
 * @returns {Object} Workflow state or default empty state
 */
function loadState(sessionId) {
  if (!sessionId) return getDefaultState();

  const statePath = getWorkflowPath(sessionId);
  try {
    if (!fs.existsSync(statePath)) return getDefaultState();
    const data = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return { ...getDefaultState(), ...data };
  } catch (e) {
    return getDefaultState();
  }
}

/**
 * Save workflow state atomically to temp file
 * Uses write-to-temp-then-rename pattern to prevent corruption
 *
 * @param {string} sessionId - Session identifier
 * @param {Object} state - Workflow state to save
 * @returns {boolean} Success status
 */
function saveState(sessionId, state) {
  if (!sessionId) return false;

  ensureDir(WORKFLOW_DIR);
  const statePath = getWorkflowPath(sessionId);
  const tmpFile = statePath + '.' + Math.random().toString(36).slice(2);

  try {
    const stateToSave = {
      ...state,
      lastUpdatedAt: new Date().toISOString()
    };
    fs.writeFileSync(tmpFile, JSON.stringify(stateToSave, null, 2));
    fs.renameSync(tmpFile, statePath);
    return true;
  } catch (e) {
    try { fs.unlinkSync(tmpFile); } catch (_) { /* ignore */ }
    return false;
  }
}

/**
 * Initialize a new workflow
 * @param {string} sessionId - Session identifier
 * @param {Object} options - Workflow initialization options
 * @param {string} options.workflowType - Type of workflow
 * @param {string[]} options.workflowSteps - Ordered list of step names
 * @param {string} [options.activePlan] - Path to active plan
 * @param {Object} [options.metadata] - Additional metadata
 * @returns {Object} Initialized workflow state
 */
function initWorkflow(sessionId, options) {
  const state = {
    ...getDefaultState(),
    workflowType: options.workflowType,
    workflowSteps: options.workflowSteps || [],
    currentStepIndex: 0,
    activePlan: options.activePlan || null,
    startedAt: new Date().toISOString(),
    metadata: options.metadata || {}
  };

  saveState(sessionId, state);
  return state;
}

/**
 * Mark a workflow step as complete and advance to next
 * @param {string} sessionId - Session identifier
 * @param {string} stepName - Name of completed step
 * @returns {Object} Updated workflow state
 */
function markStepComplete(sessionId, stepName) {
  const state = loadState(sessionId);

  if (!state.completedSteps.includes(stepName)) {
    state.completedSteps.push(stepName);
  }

  // Advance to next step if current step matches
  const currentStep = state.workflowSteps[state.currentStepIndex];
  if (currentStep === stepName && state.currentStepIndex < state.workflowSteps.length) {
    state.currentStepIndex++;
  }

  saveState(sessionId, state);
  return state;
}

/**
 * Get current step information
 * @param {string} sessionId - Session identifier
 * @returns {Object} Current step info
 */
function getCurrentStepInfo(sessionId) {
  const state = loadState(sessionId);

  return {
    workflowType: state.workflowType,
    currentStep: state.workflowSteps[state.currentStepIndex] || null,
    currentStepIndex: state.currentStepIndex,
    totalSteps: state.workflowSteps.length,
    completedSteps: state.completedSteps,
    remainingSteps: state.workflowSteps.slice(state.currentStepIndex + 1),
    activePlan: state.activePlan,
    isComplete: state.currentStepIndex >= state.workflowSteps.length - 1 &&
                state.completedSteps.includes(state.workflowSteps[state.workflowSteps.length - 1])
  };
}

/**
 * Update todos snapshot in workflow state
 * @param {string} sessionId - Session identifier
 * @param {Array} todos - TaskCreate items to snapshot
 * @returns {boolean} Success status
 */
function updateTodos(sessionId, todos) {
  const state = loadState(sessionId);
  state.todos = todos || [];
  return saveState(sessionId, state);
}

/**
 * Clear workflow state for a session
 * @param {string} sessionId - Session identifier
 * @returns {boolean} Success status
 */
function clearState(sessionId) {
  if (!sessionId) return false;

  const statePath = getWorkflowPath(sessionId);
  try {
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if workflow is active for a session
 * @param {string} sessionId - Session identifier
 * @returns {boolean} True if workflow is active
 */
function hasActiveWorkflow(sessionId) {
  const state = loadState(sessionId);
  return state.workflowType !== null && state.workflowSteps.length > 0;
}

/**
 * Generate recovery context string for injection after compaction
 * @param {string} sessionId - Session identifier
 * @returns {string|null} Recovery context or null if no active workflow
 */
function getRecoveryContext(sessionId) {
  const state = loadState(sessionId);

  if (!state.workflowType) return null;

  const info = getCurrentStepInfo(sessionId);
  const lines = [
    `## Workflow Recovery Context`,
    ``,
    `**Active Workflow:** ${state.workflowType}`,
    `**Current Step:** ${info.currentStep || 'None'} (${info.currentStepIndex + 1}/${info.totalSteps})`,
  ];

  if (state.activePlan) {
    lines.push(`**Active Plan:** ${state.activePlan}`);
  }

  if (info.completedSteps.length > 0) {
    lines.push(`**Completed:** ${info.completedSteps.join(', ')}`);
  }

  if (info.remainingSteps.length > 0) {
    lines.push(`**Remaining:** ${info.remainingSteps.join(' → ')}`);
  }

  if (state.todos.length > 0) {
    lines.push(``, `**Pending Todos:**`);
    state.todos
      .filter(t => t.status !== 'completed')
      .forEach(t => lines.push(`- [ ] ${t.content}`));
  }

  lines.push(``, `**Action Required:** Continue from "${info.currentStep}" step.`);

  return lines.join('\n');
}

module.exports = {
  WORKFLOW_DIR,
  getWorkflowPath,
  getDefaultState,
  loadState,
  saveState,
  initWorkflow,
  markStepComplete,
  getCurrentStepInfo,
  updateTodos,
  clearState,
  hasActiveWorkflow,
  getRecoveryContext
};
