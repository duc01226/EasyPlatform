#!/usr/bin/env node
/**
 * ACE Reflector - Content Generation
 *
 * Problem, solution, and condition generation from patterns.
 * Part of ace-reflector-analysis.cjs modularization.
 *
 * @module ar-generation
 */

'use strict';

/**
 * Error type to problem description mapping
 */
const ERROR_MESSAGES = {
  validation: 'encounters validation errors requiring input verification',
  type: 'encounters type errors from undefined or null values',
  syntax: 'encounters syntax errors in generated code',
  notFound: 'fails when expected files or resources are missing',
  permission: 'blocked by permission or authorization issues',
  timeout: 'exceeds execution time limits',
  network: 'fails due to network or connection issues',
  memory: 'runs into memory limitations',
  unknown: 'encounters unclassified errors requiring investigation'
};

/**
 * Error type to solution recommendation mapping
 */
const SOLUTIONS = {
  validation: 'Verify all required inputs are provided and properly formatted before skill execution',
  type: 'Add null checks and type guards before accessing properties on potentially undefined values',
  syntax: 'Review generated code syntax, check for unclosed brackets or malformed expressions',
  notFound: 'Confirm target files and resources exist before operations; use glob patterns to verify',
  permission: 'Check file permissions and authorization context; ensure required access is available',
  timeout: 'Break large operations into smaller batches; consider async processing for heavy workloads',
  network: 'Verify network connectivity and endpoint availability; implement retry logic for transient failures',
  memory: 'Reduce batch sizes and use streaming for large data sets; monitor memory usage patterns'
};

/**
 * Generate problem description from pattern
 * @param {Object} pattern - Pattern group
 * @returns {string} Problem description
 */
function generateProblem(pattern) {
  const skill = pattern.skill;
  const errorType = pattern.error_type;

  if (ERROR_MESSAGES[errorType]) {
    return `${skill} skill ${ERROR_MESSAGES[errorType]}`;
  }

  if (pattern.success_count > pattern.failure_count) {
    return `${skill} skill execution pattern showing reliable success`;
  }

  return `${skill} skill execution shows mixed results`;
}

/**
 * Generate solution recommendation from pattern
 * @param {Object} pattern - Pattern group
 * @returns {string} Solution recommendation
 */
function generateSolution(pattern) {
  const errorType = pattern.error_type;

  if (SOLUTIONS[errorType]) {
    return SOLUTIONS[errorType];
  }

  if (pattern.success_count > pattern.failure_count) {
    const rate = Math.round((pattern.success_count / (pattern.success_count + pattern.failure_count)) * 100);
    return `Continue using this skill pattern (${rate}% success rate observed)`;
  }

  return 'Review skill parameters and preconditions; check recent changes that may affect execution';
}

/**
 * Generate condition for when delta applies
 * @param {Object} pattern - Pattern group
 * @returns {string} Condition string
 */
function generateCondition(pattern) {
  const skill = pattern.skill;
  const filePatterns = Array.from(pattern.file_patterns);

  // If specific file patterns detected, include them
  if (filePatterns.length === 1) {
    return `When using /${skill} skill on ${filePatterns[0]} files`;
  }

  return `When using /${skill} skill`;
}

module.exports = {
  ERROR_MESSAGES,
  SOLUTIONS,
  generateProblem,
  generateSolution,
  generateCondition
};
