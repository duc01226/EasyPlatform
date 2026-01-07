#!/usr/bin/env node
/**
 * Workflow State Management Library
 *
 * Provides persistent state tracking for multi-step workflows to prevent
 * context loss during long-running tasks.
 *
 * Features:
 * - JSON-based state persistence
 * - TTL-based expiration (default 24h)
 * - Step completion tracking
 * - Graceful error handling
 */

const fs = require('fs');
const path = require('path');

// State file location
const STATE_FILE = path.join(process.cwd(), '.claude', '.workflow-state.json');
const DEFAULT_TTL_HOURS = 24;

/**
 * Load current workflow state
 * @returns {Object|null} Current state or null if none/expired
 */
function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return null;
    }

    const content = fs.readFileSync(STATE_FILE, 'utf-8');
    const state = JSON.parse(content);

    // Check TTL expiration
    const ttlHours = state.ttlHours || DEFAULT_TTL_HOURS;
    const startTime = new Date(state.startTime);
    const now = new Date();
    const hoursElapsed = (now - startTime) / (1000 * 60 * 60);

    if (hoursElapsed > ttlHours) {
      // Expired, clean up
      clearState();
      return null;
    }

    return state;
  } catch (e) {
    // Corrupted state, clean up
    clearState();
    return null;
  }
}

/**
 * Save workflow state
 * @param {Object} state - State object to save
 */
function saveState(state) {
  try {
    // Ensure directory exists
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error(`<!-- Workflow state save error: ${e.message} -->`);
  }
}

/**
 * Clear workflow state
 */
function clearState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
    }
  } catch (e) {
    // Ignore cleanup errors
  }
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
    ttlHours: DEFAULT_TTL_HOURS,
    lastUpdated: new Date().toISOString()
  };

  saveState(state);
  return state;
}

/**
 * Advance to next step in workflow
 * @param {string} completedStep - Step that was completed
 * @returns {Object|null} Updated state or null if workflow complete
 */
function advanceStep(completedStep) {
  const state = loadState();
  if (!state) return null;

  // Mark current step as completed
  if (!state.completedSteps.includes(completedStep)) {
    state.completedSteps.push(completedStep);
  }

  // Find next uncompleted step
  const nextIndex = state.sequence.findIndex(
    (step, idx) => idx > state.currentStep && !state.completedSteps.includes(step)
  );

  if (nextIndex === -1) {
    // All steps completed, clear state
    clearState();
    return null;
  }

  state.currentStep = nextIndex;
  state.lastUpdated = new Date().toISOString();
  saveState(state);

  return state;
}

/**
 * Mark current step as in progress (detected skill invocation)
 * @param {string} stepId - Step ID being executed
 */
function markStepInProgress(stepId) {
  const state = loadState();
  if (!state) return;

  const stepIndex = state.sequence.indexOf(stepId);
  if (stepIndex !== -1 && stepIndex >= state.currentStep) {
    state.currentStep = stepIndex;
    state.lastUpdated = new Date().toISOString();
    state.inProgressStep = stepId;
    saveState(state);
  }
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
    workflowId: state.workflowId
  };
}

/**
 * Build workflow continuation reminder
 * @returns {string|null} Reminder text or null if no active workflow
 */
function buildContinuationReminder() {
  const info = getCurrentStepInfo();
  if (!info) return null;

  const state = loadState();
  const remainingDisplay = info.remainingSteps.map(step => {
    const cmd = state.commandMapping?.[step];
    return cmd?.claude || `/${step}`;
  }).join(' → ');

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

module.exports = {
  loadState,
  saveState,
  clearState,
  createState,
  advanceStep,
  markStepInProgress,
  markStepComplete,
  getCurrentStepInfo,
  buildContinuationReminder,
  detectWorkflowControl,
  STATE_FILE
};
