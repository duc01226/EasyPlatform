#!/usr/bin/env node
'use strict';

/**
 * ACE Lesson Schema - Delta Format Definition and Utilities
 *
 * Provides schema validation and formatting for ACE deltas.
 * Part of Reflector role implementation.
 *
 * @module ace-lesson-schema
 */

const crypto = require('crypto');
const {
  CONFIDENCE_THRESHOLD,
  HUMAN_WEIGHT,
  MAX_DELTAS,
  MAX_SOURCE_EVENTS,
  MAX_COUNT
} = require('./ace-constants.cjs');

// Schema-specific constants (not shared - specific to validation)
const SCHEMA_CONFIG = {
  MIN_PROBLEM_LENGTH: 10,
  MAX_PROBLEM_LENGTH: 200,
  MIN_SOLUTION_LENGTH: 10,
  MAX_SOLUTION_LENGTH: 500,
  MIN_CONDITION_LENGTH: 5,
  MAX_CONDITION_LENGTH: 100
};

// Re-export shared constants for backward compatibility
const ACE_CONFIG = {
  CONFIDENCE_THRESHOLD,
  HUMAN_WEIGHT,
  MAX_DELTAS,
  MAX_SOURCE_EVENTS,
  ...SCHEMA_CONFIG
};

/**
 * Delta schema definition
 */
const SCHEMA = {
  type: 'object',
  required: ['delta_id', 'problem', 'solution', 'condition', 'confidence'],
  properties: {
    // Supports both UUID format (ace_uuid) and legacy format (ace_timestamp_random)
    delta_id: { type: 'string', pattern: '^ace_[a-f0-9-]+$' },
    problem: { type: 'string', minLength: ACE_CONFIG.MIN_PROBLEM_LENGTH, maxLength: ACE_CONFIG.MAX_PROBLEM_LENGTH },
    solution: { type: 'string', minLength: ACE_CONFIG.MIN_SOLUTION_LENGTH, maxLength: ACE_CONFIG.MAX_SOLUTION_LENGTH },
    condition: { type: 'string', minLength: ACE_CONFIG.MIN_CONDITION_LENGTH, maxLength: ACE_CONFIG.MAX_CONDITION_LENGTH },
    helpful_count: { type: 'integer', minimum: 0 },
    not_helpful_count: { type: 'integer', minimum: 0 },
    human_feedback_count: { type: 'integer', minimum: 0 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    created: { type: 'string', format: 'date-time' },
    last_helpful: { type: 'string', format: 'date-time' },
    source_events: { type: 'array', items: { type: 'string' }, maxItems: ACE_CONFIG.MAX_SOURCE_EVENTS }
  }
};

/**
 * Validate a delta object against schema
 * @param {Object} delta - Delta object to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateDelta(delta) {
  const errors = [];

  // Required field checks
  if (!delta) {
    return { valid: false, errors: ['Delta is null or undefined'] };
  }

  // delta_id format (supports UUID and legacy timestamp formats)
  if (!delta.delta_id?.match(/^ace_[a-f0-9-]+$/)) {
    errors.push('Invalid delta_id format (expected: ace_{uuid} or ace_{timestamp}_{random})');
  }

  // problem validation
  if (!delta.problem || typeof delta.problem !== 'string') {
    errors.push('Problem is required and must be a string');
  } else if (delta.problem.length < ACE_CONFIG.MIN_PROBLEM_LENGTH) {
    errors.push(`Problem must be at least ${ACE_CONFIG.MIN_PROBLEM_LENGTH} characters`);
  } else if (delta.problem.length > ACE_CONFIG.MAX_PROBLEM_LENGTH) {
    errors.push(`Problem must be at most ${ACE_CONFIG.MAX_PROBLEM_LENGTH} characters`);
  }

  // solution validation
  if (!delta.solution || typeof delta.solution !== 'string') {
    errors.push('Solution is required and must be a string');
  } else if (delta.solution.length < ACE_CONFIG.MIN_SOLUTION_LENGTH) {
    errors.push(`Solution must be at least ${ACE_CONFIG.MIN_SOLUTION_LENGTH} characters`);
  } else if (delta.solution.length > ACE_CONFIG.MAX_SOLUTION_LENGTH) {
    errors.push(`Solution must be at most ${ACE_CONFIG.MAX_SOLUTION_LENGTH} characters`);
  }

  // condition validation
  if (!delta.condition || typeof delta.condition !== 'string') {
    errors.push('Condition is required and must be a string');
  } else if (delta.condition.length < ACE_CONFIG.MIN_CONDITION_LENGTH) {
    errors.push(`Condition must be at least ${ACE_CONFIG.MIN_CONDITION_LENGTH} characters`);
  }

  // confidence validation
  if (typeof delta.confidence !== 'number' || delta.confidence < 0 || delta.confidence > 1) {
    errors.push('Confidence must be a number between 0 and 1');
  }

  // counts validation (optional but must be valid if present)
  if (delta.helpful_count !== undefined && (!Number.isInteger(delta.helpful_count) || delta.helpful_count < 0)) {
    errors.push('helpful_count must be a non-negative integer');
  }
  if (delta.not_helpful_count !== undefined && (!Number.isInteger(delta.not_helpful_count) || delta.not_helpful_count < 0)) {
    errors.push('not_helpful_count must be a non-negative integer');
  }
  if (delta.human_feedback_count !== undefined && (!Number.isInteger(delta.human_feedback_count) || delta.human_feedback_count < 0)) {
    errors.push('human_feedback_count must be a non-negative integer');
  }

  // source_events validation
  if (delta.source_events !== undefined) {
    if (!Array.isArray(delta.source_events)) {
      errors.push('source_events must be an array');
    } else if (delta.source_events.length > ACE_CONFIG.MAX_SOURCE_EVENTS) {
      errors.push(`source_events must have at most ${ACE_CONFIG.MAX_SOURCE_EVENTS} items`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Format delta for context injection (high-density format)
 * @param {Object} delta - Delta object
 * @returns {string} Formatted delta string
 */
function formatDeltaForInjection(delta) {
  const conf = Math.round(delta.confidence * 100);
  return `- **${delta.condition}**: ${delta.problem} → ${delta.solution} (${conf}% confidence)`;
}

/**
 * Format delta for Copilot instructions (markdown format)
 * @param {Object} delta - Delta object
 * @returns {string} Formatted delta string
 */
function formatDeltaForCopilot(delta) {
  const conf = Math.round(delta.confidence * 100);
  return `- **${delta.condition}**: ${delta.problem} → ${delta.solution} [${conf}%]`;
}

/**
 * Generate delta ID using cryptographically secure random bytes
 * @returns {string} Unique delta ID
 */
function generateDeltaId() {
  // Use crypto.randomUUID if available (Node 14.17+), else fallback to randomBytes
  if (crypto.randomUUID) {
    return `ace_${crypto.randomUUID()}`;
  }
  return `ace_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Calculate confidence from counts with human weight
 * @param {number} helpfulCount - Automated helpful count
 * @param {number} notHelpfulCount - Automated not helpful count
 * @param {number} humanFeedbackCount - Human feedback count (weighted 3x)
 * @returns {number} Confidence score (0-1)
 */
function calculateConfidence(helpfulCount, notHelpfulCount, humanFeedbackCount = 0) {
  const humanWeight = ACE_CONFIG.HUMAN_WEIGHT;
  const totalPositive = helpfulCount + (humanFeedbackCount * humanWeight);
  const totalNegative = notHelpfulCount;
  const total = totalPositive + totalNegative;

  return total > 0 ? totalPositive / total : 0;
}

/**
 * Check if delta meets promotion threshold
 * @param {Object} delta - Delta object
 * @returns {boolean} True if confidence >= 80%
 */
function meetsPromotionThreshold(delta) {
  return delta.confidence >= ACE_CONFIG.CONFIDENCE_THRESHOLD;
}

/**
 * Increment count with bounds checking
 * @param {number} current - Current count
 * @param {number} increment - Amount to add
 * @returns {number} Bounded result
 */
function boundedCount(value) {
  return Math.min(Math.max(value || 0, 0), MAX_COUNT);
}

/**
 * Create a new delta object with defaults and validation
 * @param {Object} partial - Partial delta data
 * @param {Object} options - Options { skipValidation: boolean }
 * @returns {Object} Complete delta object
 * @throws {Error} If validation fails and skipValidation is false
 */
function createDelta(partial, options = {}) {
  const delta = {
    delta_id: partial.delta_id || generateDeltaId(),
    problem: partial.problem || '',
    solution: partial.solution || '',
    condition: partial.condition || '',
    helpful_count: boundedCount(partial.helpful_count),
    not_helpful_count: boundedCount(partial.not_helpful_count),
    human_feedback_count: boundedCount(partial.human_feedback_count),
    confidence: partial.confidence || 0,
    created: partial.created || new Date().toISOString(),
    last_helpful: partial.last_helpful || null,
    source_events: (partial.source_events || []).slice(0, MAX_SOURCE_EVENTS)
  };

  // Validate unless explicitly skipped
  if (!options.skipValidation) {
    const validation = validateDelta(delta);
    if (!validation.valid) {
      throw new Error(`Invalid delta: ${validation.errors.join(', ')}`);
    }
  }

  return delta;
}

module.exports = {
  ACE_CONFIG,
  SCHEMA_CONFIG,
  SCHEMA,
  validateDelta,
  formatDeltaForInjection,
  formatDeltaForCopilot,
  generateDeltaId,
  calculateConfidence,
  meetsPromotionThreshold,
  boundedCount,
  createDelta
};
