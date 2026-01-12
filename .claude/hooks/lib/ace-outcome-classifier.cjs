#!/usr/bin/env node
'use strict';

/**
 * ACE Outcome Classifier - Pattern detection for ACE events
 *
 * Classifies execution outcomes and error types without storing
 * sensitive content. Part of ACE Generator role.
 *
 * Privacy: Metadata only - no stdout/stderr content stored
 *
 * @module ace-outcome-classifier
 */

const { SAFE_EXTENSIONS } = require('./ace-constants.cjs');

// Error pattern matchers - match error types without storing content
const ERROR_PATTERNS = {
  validation: /validation|required|invalid|missing|constraint/i,
  type: /type\s*error|undefined|null|cannot read|is not a function/i,
  syntax: /syntax|parse|unexpected|unterminated/i,
  timeout: /timeout|exceeded|slow|timed out/i,
  permission: /permission|access|denied|unauthorized|forbidden/i,
  notFound: /not\s*found|missing|does\s*not\s*exist|404|no such/i,
  network: /network|connection|ECONNREFUSED|ENOTFOUND|socket/i,
  memory: /memory|heap|out of memory|allocation/i
};

// Severity levels for different error types (0-5 scale)
const SEVERITY_MAP = {
  validation: 2,
  type: 3,
  syntax: 4,
  timeout: 2,
  permission: 5,
  notFound: 3,
  network: 3,
  memory: 5,
  unknown: 3
};

// Human feedback keywords for negative signal detection
const NEGATIVE_FEEDBACK_KEYWORDS = [
  'redo', 'try again', 'wrong', 'no', 'incorrect',
  'not right', 'failed', 'broken', 'fix this'
];

/**
 * Classify error type from error message
 * @param {string} errorMsg - Error message to classify
 * @returns {string|null} Error type or null if no error
 */
function classifyError(errorMsg) {
  if (!errorMsg || typeof errorMsg !== 'string') return null;

  for (const [type, pattern] of Object.entries(ERROR_PATTERNS)) {
    if (pattern.test(errorMsg)) return type;
  }
  return 'unknown';
}

/**
 * Calculate severity score for an outcome
 * @param {string} outcome - 'success', 'failure', or 'partial'
 * @param {string|null} errorType - Classified error type
 * @returns {number} Severity score (0-5)
 */
function calculateSeverity(outcome, errorType) {
  if (outcome === 'success') return 0;
  if (outcome === 'partial') return 1;
  return SEVERITY_MAP[errorType] || SEVERITY_MAP.unknown;
}

/**
 * Classify execution outcome from hook payload
 * @param {Object} payload - PostToolUse hook payload
 * @returns {'success'|'failure'|'partial'} Outcome classification
 */
function classifyOutcome(payload) {
  // Explicit failure indicators
  if (payload.exit_code > 0) return 'failure';
  if (payload.error) return 'failure';

  // Check tool response for failure signals
  const response = payload.tool_response || '';
  if (typeof response === 'string') {
    if (response.includes('Error:') || response.includes('FAILED')) {
      return 'failure';
    }
    if (response.includes('Warning:') || response.includes('PARTIAL')) {
      return 'partial';
    }
  }

  return 'success';
}

/**
 * Detect negative human feedback in user message
 * @param {string} userMessage - User's message text
 * @returns {boolean} True if negative feedback detected
 */
function detectNegativeFeedback(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') return false;

  const normalized = userMessage.toLowerCase();
  return NEGATIVE_FEEDBACK_KEYWORDS.some(keyword =>
    normalized.includes(keyword.toLowerCase())
  );
}

/**
 * Extract file pattern from tool input (privacy-safe)
 * Returns only extension pattern if in whitelist, not full path
 * @param {Object} toolInput - Tool input object
 * @returns {string|null} File pattern or null
 */
function extractFilePattern(toolInput) {
  if (!toolInput) return null;

  // Check common path properties
  const pathProps = ['file_path', 'path', 'file', 'target'];
  for (const prop of pathProps) {
    const value = toolInput[prop];
    if (value && typeof value === 'string') {
      // Extract extension only - no full path for privacy
      const extMatch = value.match(/\.[a-zA-Z0-9]+$/);
      if (extMatch) {
        const ext = extMatch[0].toLowerCase();
        // Only allow whitelisted extensions (prevent path traversal/injection)
        if (SAFE_EXTENSIONS.includes(ext)) {
          return `**/*${ext}`;
        }
      }
    }
  }

  return null;
}

/**
 * Generate event ID
 * @returns {string} Unique event ID
 */
function generateEventId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `evt_${timestamp}_${random}`;
}

module.exports = {
  classifyError,
  calculateSeverity,
  classifyOutcome,
  detectNegativeFeedback,
  extractFilePattern,
  generateEventId,
  ERROR_PATTERNS,
  SEVERITY_MAP,
  NEGATIVE_FEEDBACK_KEYWORDS
};
