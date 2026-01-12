#!/usr/bin/env node
'use strict';

/**
 * ACE Playbook State Manager - Delta Operations
 *
 * Provides state management for the ACE playbook including:
 * - Similarity calculations for deduplication
 * - Delta merging logic
 * - Confidence recalculation
 * - Top delta retrieval
 * - File locking for concurrent access
 * - Atomic writes for data safety
 *
 * @module ace-playbook-state
 */

const fs = require('fs');
const path = require('path');
const {
  HUMAN_WEIGHT,
  SIMILARITY_THRESHOLD,
  MAX_DELTAS,
  MAX_COUNT,
  MAX_SOURCE_EVENTS,
  LOCK_TIMEOUT_MS,
  LOCK_RETRY_DELAY_MS
} = require('./ace-constants.cjs');

// Paths
const MEMORY_DIR = path.join(__dirname, '..', '..', 'memory');
const DELTAS_FILE = path.join(MEMORY_DIR, 'deltas.json');
const CANDIDATES_FILE = path.join(MEMORY_DIR, 'delta-candidates.json');
const ARCHIVE_DIR = path.join(MEMORY_DIR, 'archive');
const LOCK_FILE = path.join(MEMORY_DIR, 'deltas.lock');

// ============================================================================
// File Locking (prevents race conditions)
// ============================================================================

/**
 * Synchronous sleep helper
 * @param {number} ms - Milliseconds to sleep
 */
function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* busy wait */ }
}

/**
 * Check if a process is still alive
 * @param {number} pid - Process ID
 * @returns {boolean} True if process exists
 */
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Acquire file lock with timeout and stale lock detection
 * @returns {boolean} True if lock acquired
 */
function acquireLock() {
  ensureDirs();
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      // O_EXCL fails if file exists - atomic lock creation
      fs.writeFileSync(LOCK_FILE, process.pid.toString(), { flag: 'wx' });
      return true;
    } catch (err) {
      if (err.code === 'EEXIST') {
        // Check if lock is stale (owning process dead)
        try {
          const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
          if (!isProcessAlive(pid)) {
            fs.unlinkSync(LOCK_FILE);
            continue; // Retry immediately
          }
        } catch { /* ignore read errors */ }
        sleepSync(LOCK_RETRY_DELAY_MS);
      } else {
        throw err;
      }
    }
  }
  return false;
}

/**
 * Release file lock
 */
function releaseLock() {
  try {
    fs.unlinkSync(LOCK_FILE);
  } catch { /* ignore if already released */ }
}

/**
 * Execute function with file lock
 * @param {Function} fn - Function to execute under lock
 * @returns {*} Result of function
 * @throws {Error} If lock acquisition fails after timeout
 */
function withLock(fn) {
  if (!acquireLock()) {
    const error = new Error('[ACE] Lock timeout - unable to acquire delta lock');
    console.error(error.message);
    throw error;
  }
  try {
    return fn();
  } finally {
    releaseLock();
  }
}

// ============================================================================
// Atomic File I/O
// ============================================================================

/**
 * Atomic JSON write - writes to temp file then renames
 * @param {string} filePath - Target file path
 * @param {*} data - Data to write
 */
function atomicWriteJSON(filePath, data) {
  const tmpPath = filePath + '.tmp';
  const bakPath = filePath + '.bak';
  const content = JSON.stringify(data, null, 2);

  // Write to temp file first
  fs.writeFileSync(tmpPath, content, 'utf8');

  // Backup original if exists (Windows safety)
  try {
    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, bakPath);
    }
  } catch { /* no original file */ }

  // Atomic rename
  fs.renameSync(tmpPath, filePath);

  // Clean up backup
  try {
    fs.unlinkSync(bakPath);
  } catch { /* no backup or cleanup failed */ }
}

/**
 * Ensure required directories exist
 */
function ensureDirs() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
}

// ============================================================================
// Similarity & Confidence Calculations
// ============================================================================

/**
 * Calculate string similarity using Jaccard token overlap
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
function stringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  // Tokenize by whitespace and common separators
  const tokenize = s => new Set(s.split(/[\s,.:;!?()[\]{}]+/).filter(Boolean));
  const tokens1 = tokenize(s1);
  const tokens2 = tokenize(s2);

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  // Calculate Jaccard similarity: |intersection| / |union|
  const intersection = [...tokens1].filter(t => tokens2.has(t)).length;
  const union = new Set([...tokens1, ...tokens2]).size;

  return union > 0 ? intersection / union : 0;
}

/**
 * Check if two deltas are similar enough to merge
 * Now includes solution comparison to prevent merging different solutions
 * @param {Object} delta1 - First delta
 * @param {Object} delta2 - Second delta
 * @returns {boolean} True if similar enough to merge
 */
function areSimilarDeltas(delta1, delta2) {
  const problemSim = stringSimilarity(delta1.problem, delta2.problem);
  const conditionSim = stringSimilarity(delta1.condition, delta2.condition);
  const solutionSim = stringSimilarity(delta1.solution, delta2.solution);

  // Problem + condition must match AND solution must be similar
  // Different solutions for same problem = keep as separate deltas
  const contextMatches = problemSim >= SIMILARITY_THRESHOLD &&
                         conditionSim >= SIMILARITY_THRESHOLD;
  const solutionMatches = solutionSim >= SIMILARITY_THRESHOLD;

  return contextMatches && solutionMatches;
}

/**
 * Recalculate confidence from counts with human weight
 * @param {Object} delta - Delta object with counts
 * @returns {number} Confidence score (0-1)
 */
function recalculateConfidence(delta) {
  const automatedHelpful = Math.min(delta.helpful_count || 0, MAX_COUNT);
  const automatedNotHelpful = Math.min(delta.not_helpful_count || 0, MAX_COUNT);
  const humanHelpful = Math.min(delta.human_feedback_count || 0, MAX_COUNT) * HUMAN_WEIGHT;

  const totalPositive = automatedHelpful + humanHelpful;
  const totalNegative = automatedNotHelpful;
  const total = totalPositive + totalNegative;

  return total > 0 ? totalPositive / total : 0;
}

/**
 * Increment count with bounds checking
 * @param {number} current - Current count
 * @param {number} increment - Amount to add
 * @returns {number} Bounded result
 */
function incrementCount(current, increment = 1) {
  return Math.min((current || 0) + increment, MAX_COUNT);
}

/**
 * Merge two similar deltas
 * @param {Object} existing - Existing delta
 * @param {Object} incoming - Incoming delta to merge
 * @returns {Object} Merged delta
 */
function mergeDeltas(existing, incoming) {
  const merged = {
    ...existing,
    helpful_count: incrementCount(existing.helpful_count, incoming.helpful_count || 0),
    not_helpful_count: incrementCount(existing.not_helpful_count, incoming.not_helpful_count || 0),
    human_feedback_count: incrementCount(existing.human_feedback_count, incoming.human_feedback_count || 0),
    last_helpful: new Date().toISOString(),
    source_events: [
      ...(existing.source_events || []).slice(0, MAX_SOURCE_EVENTS / 2),
      ...(incoming.source_events || []).slice(0, MAX_SOURCE_EVENTS / 2)
    ].slice(0, MAX_SOURCE_EVENTS)
  };

  merged.confidence = recalculateConfidence(merged);
  return merged;
}

// ============================================================================
// Delta CRUD Operations (with locking)
// ============================================================================

/**
 * Validate delta object structure
 * @param {Object} delta - Delta to validate
 * @returns {boolean} True if valid
 */
function isValidDelta(delta) {
  return delta &&
    typeof delta === 'object' &&
    typeof delta.delta_id === 'string' &&
    typeof delta.problem === 'string' &&
    typeof delta.solution === 'string';
}

/**
 * Load deltas from file (internal, no lock)
 * @returns {Object[]} Array of deltas
 */
function loadDeltasInternal() {
  ensureDirs();
  if (!fs.existsSync(DELTAS_FILE)) {
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(DELTAS_FILE, 'utf8'));
    // Schema validation: must be array of valid delta objects
    if (!Array.isArray(data)) {
      return [];
    }
    return data.filter(isValidDelta);
  } catch (e) {
    return [];
  }
}

/**
 * Load deltas from file
 * @returns {Object[]} Array of deltas
 */
function loadDeltas() {
  return loadDeltasInternal();
}

/**
 * Save deltas to file with atomic write
 * @param {Object[]} deltas - Array of deltas
 */
function saveDeltas(deltas) {
  ensureDirs();
  atomicWriteJSON(DELTAS_FILE, deltas);
}

/**
 * Load delta candidates
 * @returns {Object[]} Array of candidates
 */
function loadCandidates() {
  ensureDirs();
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
 * Save delta candidates with atomic write
 * @param {Object[]} candidates - Array of candidates
 */
function saveCandidates(candidates) {
  ensureDirs();
  atomicWriteJSON(CANDIDATES_FILE, candidates);
}

/**
 * Get top deltas sorted by confidence
 * @param {number} maxCount - Maximum number of deltas to return
 * @returns {Object[]} Top deltas
 */
function getTopDeltas(maxCount = MAX_DELTAS) {
  const deltas = loadDeltas();

  return deltas
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxCount);
}

/**
 * Record human feedback for a delta (with locking)
 * @param {string} deltaId - Delta ID
 * @param {boolean} isPositive - True if positive feedback
 * @returns {Object|null} Updated delta or null if not found/lock failed
 */
function recordHumanFeedback(deltaId, isPositive) {
  return withLock(() => {
    const deltas = loadDeltasInternal();
    const delta = deltas.find(d => d.delta_id === deltaId);

    if (!delta) return null;

    if (isPositive) {
      delta.human_feedback_count = incrementCount(delta.human_feedback_count);
      delta.last_helpful = new Date().toISOString();
    } else {
      delta.not_helpful_count = incrementCount(delta.not_helpful_count);
    }

    delta.confidence = recalculateConfidence(delta);
    saveDeltas(deltas);

    return delta;
  });
}

/**
 * Update delta feedback counts (with locking)
 * @param {string} deltaId - Delta ID
 * @param {boolean} wasSuccessful - Whether the outcome was successful
 * @param {boolean} isHuman - Whether this is human feedback
 * @returns {Object|null} Updated delta or null
 */
function updateDeltaFeedback(deltaId, wasSuccessful, isHuman = false) {
  return withLock(() => {
    const deltas = loadDeltasInternal();
    const delta = deltas.find(d => d.delta_id === deltaId);

    if (!delta) return null;

    if (isHuman && wasSuccessful) {
      delta.human_feedback_count = incrementCount(delta.human_feedback_count);
      delta.last_helpful = new Date().toISOString();
    } else if (wasSuccessful) {
      delta.helpful_count = incrementCount(delta.helpful_count);
      delta.last_helpful = new Date().toISOString();
    } else {
      delta.not_helpful_count = incrementCount(delta.not_helpful_count);
    }

    delta.confidence = recalculateConfidence(delta);
    saveDeltas(deltas);

    return delta;
  });
}

/**
 * Archive deltas to dated file
 * @param {Object[]} deltasToArchive - Deltas to archive
 */
function archiveDeltas(deltasToArchive) {
  if (deltasToArchive.length === 0) return;

  ensureDirs();

  const dateStr = new Date().toISOString().split('T')[0];
  const archiveFile = path.join(ARCHIVE_DIR, `archive_${dateStr}.json`);

  let existing = [];
  if (fs.existsSync(archiveFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(archiveFile, 'utf8'));
    } catch (e) {
      existing = [];
    }
  }

  existing.push(...deltasToArchive);
  atomicWriteJSON(archiveFile, existing);
}

/**
 * Find duplicate delta in list
 * @param {Object} delta - Delta to check
 * @param {Object[]} deltaList - List to search
 * @returns {Object|null} Duplicate delta or null
 */
function findDuplicate(delta, deltaList) {
  return deltaList.find(d => areSimilarDeltas(d, delta)) || null;
}

/**
 * Get playbook statistics
 * @returns {Object} Statistics object
 */
function getPlaybookStats() {
  const deltas = loadDeltas();
  const candidates = loadCandidates();

  if (deltas.length === 0) {
    return {
      active_count: 0,
      candidate_count: candidates.length,
      avg_confidence: 0,
      total_helpful: 0,
      total_not_helpful: 0,
      human_feedback: 0
    };
  }

  return {
    active_count: deltas.length,
    candidate_count: candidates.length,
    avg_confidence: deltas.reduce((s, d) => s + d.confidence, 0) / deltas.length,
    total_helpful: deltas.reduce((s, d) => s + (d.helpful_count || 0), 0),
    total_not_helpful: deltas.reduce((s, d) => s + (d.not_helpful_count || 0), 0),
    human_feedback: deltas.reduce((s, d) => s + (d.human_feedback_count || 0), 0)
  };
}

module.exports = {
  // Configuration (re-exported from constants)
  HUMAN_WEIGHT,
  SIMILARITY_THRESHOLD,
  MAX_DELTAS,
  MAX_COUNT,

  // Paths
  MEMORY_DIR,
  DELTAS_FILE,
  CANDIDATES_FILE,
  ARCHIVE_DIR,

  // Locking
  acquireLock,
  releaseLock,
  withLock,

  // I/O utilities
  atomicWriteJSON,

  // Core functions
  ensureDirs,
  stringSimilarity,
  areSimilarDeltas,
  recalculateConfidence,
  incrementCount,
  mergeDeltas,

  // CRUD operations
  loadDeltas,
  saveDeltas,
  loadCandidates,
  saveCandidates,
  getTopDeltas,
  recordHumanFeedback,
  updateDeltaFeedback,
  archiveDeltas,
  findDuplicate,
  getPlaybookStats
};
