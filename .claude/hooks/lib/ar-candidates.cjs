#!/usr/bin/env node
/**
 * ACE Reflector - Candidate Management
 *
 * Delta candidate creation, loading, and saving.
 * Part of ace-reflector-analysis.cjs modularization.
 *
 * @module ar-candidates
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
  ACE_CONFIG,
  generateDeltaId,
  calculateConfidence,
  createDelta
} = require('./ace-lesson-schema.cjs');
const { MAX_COUNT, MAX_SOURCE_EVENTS } = require('./ace-constants.cjs');
const {
  withLock,
  atomicWriteJSON,
  ensureDirs,
  MEMORY_DIR
} = require('./ace-playbook-state.cjs');
const {
  generateProblem,
  generateSolution,
  generateCondition
} = require('./ar-generation.cjs');

// Paths
const CANDIDATES_FILE = path.join(MEMORY_DIR, 'delta-candidates.json');

/**
 * Convert pattern to delta candidate
 * @param {Object} pattern - Pattern group
 * @returns {Object} Delta candidate
 */
function patternToCandidate(pattern) {
  const confidence = calculateConfidence(
    pattern.success_count,
    pattern.failure_count,
    0 // Human feedback added by Curator
  );

  return createDelta({
    delta_id: generateDeltaId(),
    problem: generateProblem(pattern),
    solution: generateSolution(pattern),
    condition: generateCondition(pattern),
    helpful_count: pattern.success_count,
    not_helpful_count: pattern.failure_count,
    human_feedback_count: 0,
    confidence: confidence,
    created: new Date().toISOString(),
    source_events: pattern.events.slice(0, ACE_CONFIG.MAX_SOURCE_EVENTS || 10)
  });
}

/**
 * Load existing candidates
 * @returns {Object[]} Array of existing candidates
 */
function loadCandidates() {
  if (!fs.existsSync(CANDIDATES_FILE)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(CANDIDATES_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

/**
 * Save candidates with deduplication
 * Uses file locking to prevent race conditions and bounds checking to prevent overflow
 * @param {Object[]} newCandidates - New candidates to add
 */
function saveCandidates(newCandidates) {
  ensureDirs();

  // Use lock to prevent race condition during read-modify-write
  withLock(() => {
    const existing = loadCandidates();

    // Merge, avoiding duplicates by problem+condition
    const merged = [...existing];
    for (const candidate of newCandidates) {
      const exists = merged.find(m =>
        m.problem === candidate.problem && m.condition === candidate.condition
      );

      if (!exists) {
        merged.push(candidate);
      } else {
        // Update existing with new counts (with bounds checking)
        exists.helpful_count = Math.min(
          (exists.helpful_count || 0) + (candidate.helpful_count || 0),
          MAX_COUNT
        );
        exists.not_helpful_count = Math.min(
          (exists.not_helpful_count || 0) + (candidate.not_helpful_count || 0),
          MAX_COUNT
        );
        exists.confidence = calculateConfidence(
          exists.helpful_count,
          exists.not_helpful_count,
          exists.human_feedback_count || 0
        );
        // Merge source events with deduplication and limit
        exists.source_events = [...new Set([
          ...(exists.source_events || []).slice(0, 5),
          ...(candidate.source_events || []).slice(0, 5)
        ])].slice(0, MAX_SOURCE_EVENTS);
      }
    }

    // Use atomic write to prevent corruption on crash
    atomicWriteJSON(CANDIDATES_FILE, merged);
  });
}

/**
 * Log analysis event
 * @param {string} message - Log message
 */
function logAnalysis(message) {
  const logFile = path.join(MEMORY_DIR, 'ace-reflector.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} | ${message}\n`);
}

module.exports = {
  CANDIDATES_FILE,
  patternToCandidate,
  loadCandidates,
  saveCandidates,
  logAnalysis
};
