#!/usr/bin/env node
'use strict';

/**
 * ACE Curator Pruner - Playbook Quality Control
 *
 * Promotes qualified candidates to active playbook, enforces max limit,
 * deduplicates similar deltas, and prunes stale patterns.
 *
 * Configuration (from user decisions):
 * - Max deltas: 50
 * - Prune age: 90 days
 * - Min success rate: 20%
 * - Confidence threshold: 80%
 * - Human weight: 3x
 * - Deduplication threshold: 85% similarity
 *
 * Hook: PreCompact (chained after reflector-analysis.cjs)
 * Input: .claude/memory/delta-candidates.json
 * Output: .claude/memory/deltas.json
 *
 * @module ace-curator-pruner
 */

const fs = require('fs');
const path = require('path');
const {
  HUMAN_WEIGHT,
  SIMILARITY_THRESHOLD,
  MAX_DELTAS,
  MEMORY_DIR,
  ARCHIVE_DIR,
  ensureDirs,
  withLock,
  stringSimilarity,
  areSimilarDeltas,
  recalculateConfidence,
  mergeDeltas,
  loadDeltas,
  saveDeltas,
  loadCandidates,
  saveCandidates,
  archiveDeltas,
  findDuplicate
} = require('./lib/ace-playbook-state.cjs');
const { MAX_STDIN_BYTES } = require('./lib/ace-constants.cjs');

// Configuration
const CONFIDENCE_THRESHOLD = 0.80;
const PRUNE_AGE_DAYS = 90;
const MIN_SUCCESS_RATE = 0.20;

/**
 * Read stdin synchronously with size limit
 * @returns {string} stdin content (empty if exceeds MAX_STDIN_BYTES)
 */
function readStdinSync() {
  try {
    const content = fs.readFileSync(0, 'utf-8');
    if (content.length > MAX_STDIN_BYTES) {
      return '';
    }
    return content.trim();
  } catch (e) {
    return '';
  }
}

/**
 * Calculate confidence from delta counts
 * @param {Object} delta - Delta with counts
 * @returns {number} Confidence score
 */
function calculateConfidence(delta) {
  return recalculateConfidence(delta);
}

/**
 * Check if delta is stale (too old or low success rate)
 * @param {Object} delta - Delta to check
 * @param {Date} pruneDate - Cutoff date for age-based pruning
 * @returns {boolean} True if stale
 */
function isStale(delta, pruneDate) {
  // Check age
  const created = new Date(delta.created);
  if (created < pruneDate) {
    return true;
  }

  // Check success rate (only if enough events)
  const totalEvents = (delta.helpful_count || 0) + (delta.not_helpful_count || 0);
  if (totalEvents >= 10) {
    const successRate = delta.helpful_count / totalEvents;
    if (successRate < MIN_SUCCESS_RATE) {
      return true;
    }
  }

  return false;
}

/**
 * Promote qualified candidates to active playbook
 * @param {Object[]} candidates - Candidate deltas
 * @param {Object[]} deltas - Active deltas
 * @returns {{promoted: Object[], remaining: Object[], merged: number}}
 */
function promoteQualifiedCandidates(candidates, deltas) {
  const promotable = candidates.filter(c => calculateConfidence(c) >= CONFIDENCE_THRESHOLD);
  const remaining = candidates.filter(c => calculateConfidence(c) < CONFIDENCE_THRESHOLD);

  let promoted = [];
  let mergedCount = 0;

  for (const candidate of promotable) {
    // Check for duplicate in active deltas
    const duplicate = findDuplicate(candidate, deltas);

    if (duplicate) {
      // Merge into existing delta
      const merged = mergeDeltas(duplicate, candidate);
      const idx = deltas.findIndex(d => d.delta_id === duplicate.delta_id);
      if (idx !== -1) {
        deltas[idx] = merged;
        mergedCount++;
      }
    } else {
      // Add as new delta
      promoted.push(candidate);
    }
  }

  return { promoted, remaining, merged: mergedCount };
}

/**
 * Prune stale deltas
 * @param {Object[]} deltas - Active deltas
 * @param {Date} pruneDate - Cutoff date
 * @returns {{active: Object[], pruned: Object[]}}
 */
function pruneStaleDeltas(deltas, pruneDate) {
  const active = [];
  const pruned = [];

  for (const delta of deltas) {
    if (isStale(delta, pruneDate)) {
      pruned.push(delta);
    } else {
      active.push(delta);
    }
  }

  return { active, pruned };
}

/**
 * Enforce max delta limit
 * @param {Object[]} deltas - Active deltas
 * @returns {{kept: Object[], overflow: Object[]}}
 */
function enforceMaxLimit(deltas) {
  if (deltas.length <= MAX_DELTAS) {
    return { kept: deltas, overflow: [] };
  }

  // Sort by confidence descending, keep top N
  const sorted = [...deltas].sort((a, b) => calculateConfidence(b) - calculateConfidence(a));
  const kept = sorted.slice(0, MAX_DELTAS);
  const overflow = sorted.slice(MAX_DELTAS);

  return { kept, overflow };
}

/**
 * Log curator action
 * @param {string} message - Log message
 */
function logAction(message) {
  ensureDirs();
  const logFile = path.join(MEMORY_DIR, 'ace-curator.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} | ${message}\n`);
}

/**
 * Main execution
 */
function main() {
  try {
    const stdin = readStdinSync();
    if (!stdin) {
      process.exit(0);
    }

    const payload = JSON.parse(stdin);

    // Only process PreCompact events
    if (!['manual', 'auto'].includes(payload.compact_type)) {
      process.exit(0);
    }

    ensureDirs();

    // Use lock to prevent race condition during read-modify-write on multiple files
    withLock(() => {
      // Load current state
      const candidates = loadCandidates();
      let deltas = loadDeltas();

      const initialCandidateCount = candidates.length;
      const initialDeltaCount = deltas.length;

      // Step 1: Promote qualified candidates
      const { promoted, remaining, merged } = promoteQualifiedCandidates(candidates, deltas);

      // Add newly promoted deltas
      deltas = [...deltas, ...promoted];

      // Update candidates file (remove promoted)
      saveCandidates(remaining);

      // Step 2: Prune stale deltas
      const now = new Date();
      const pruneDate = new Date(now.getTime() - (PRUNE_AGE_DAYS * 24 * 60 * 60 * 1000));
      const { active: afterPrune, pruned: stalePruned } = pruneStaleDeltas(deltas, pruneDate);

      if (stalePruned.length > 0) {
        archiveDeltas(stalePruned);
        logAction(`pruned | ${stalePruned.length} stale deltas archived`);
      }

      // Step 3: Enforce max limit
      const { kept: finalDeltas, overflow } = enforceMaxLimit(afterPrune);

      if (overflow.length > 0) {
        archiveDeltas(overflow);
        logAction(`overflow | ${overflow.length} deltas archived (max ${MAX_DELTAS})`);
      }

      // Save final active playbook
      saveDeltas(finalDeltas);

      // Log summary
      const actions = [];
      if (promoted.length > 0) actions.push(`+${promoted.length} promoted`);
      if (merged > 0) actions.push(`${merged} merged`);
      if (stalePruned.length > 0) actions.push(`-${stalePruned.length} pruned`);
      if (overflow.length > 0) actions.push(`-${overflow.length} overflow`);

      if (actions.length > 0) {
        logAction(`curator | ${actions.join(', ')} | active: ${finalDeltas.length}/${MAX_DELTAS}`);
        console.log(`\n<!-- ACE Curator: ${actions.join(', ')}. Active playbook: ${finalDeltas.length}/${MAX_DELTAS} -->`);
      }
    });

    process.exit(0);
  } catch (err) {
    // Non-blocking - log error and exit cleanly
    try {
      ensureDirs();
      logAction(`error | ${err.message}`);
    } catch (e) {
      // Ignore logging errors
    }
    process.exit(0);
  }
}

main();
