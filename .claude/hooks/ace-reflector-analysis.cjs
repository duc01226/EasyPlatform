#!/usr/bin/env node
'use strict';

/**
 * ACE Reflector Analysis - Pattern Extraction Engine
 *
 * Analyzes events-stream.jsonl and extracts delta candidates.
 * Runs on PreCompact event (user decision).
 *
 * Confidence threshold: 80%
 * Human feedback weight: 3x
 * Min events for pattern: 3
 *
 * Hook: PreCompact (manual|auto)
 * Input: .claude/memory/events-stream.jsonl
 * Output: .claude/memory/delta-candidates.json
 *
 * @module ace-reflector-analysis
 */

const fs = require('fs');
const path = require('path');
const {
  ACE_CONFIG,
  generateDeltaId,
  calculateConfidence,
  validateDelta,
  createDelta
} = require('./lib/ace-lesson-schema.cjs');
const {
  MAX_COUNT,
  MAX_SOURCE_EVENTS,
  MAX_STDIN_BYTES
} = require('./lib/ace-constants.cjs');
const {
  withLock,
  atomicWriteJSON,
  ensureDirs,
  MEMORY_DIR
} = require('./lib/ace-playbook-state.cjs');

// Paths
const EVENTS_FILE = path.join(MEMORY_DIR, 'events-stream.jsonl');
const CANDIDATES_FILE = path.join(MEMORY_DIR, 'delta-candidates.json');
const MARKER_FILE = path.join(MEMORY_DIR, '.ace-last-analysis');

// Configuration
const MIN_EVENTS_FOR_PATTERN = 3;
const MIN_EVENTS_FOR_ANALYSIS = 5;

/**
 * Read stdin synchronously with size limit (PreCompact provides JSON payload)
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
 * Read events since last analysis
 * @returns {Object[]} Array of event objects
 */
function readEventsSinceLastAnalysis() {
  if (!fs.existsSync(EVENTS_FILE)) {
    return [];
  }

  // Get last analysis timestamp
  let lastAnalysis = new Date(0);
  if (fs.existsSync(MARKER_FILE)) {
    try {
      const markerContent = fs.readFileSync(MARKER_FILE, 'utf8').trim();
      lastAnalysis = new Date(markerContent);
    } catch (e) {
      // Use epoch if marker unreadable
    }
  }

  // Read and filter events
  try {
    const content = fs.readFileSync(EVENTS_FILE, 'utf8').trim();
    if (!content) return [];

    const lines = content.split('\n').filter(Boolean);
    return lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(e => e && new Date(e.timestamp) > lastAnalysis);
  } catch (e) {
    return [];
  }
}

/**
 * Group events by skill and error_type for pattern extraction
 * @param {Object[]} events - Array of event objects
 * @returns {Object[]} Array of pattern groups
 */
function extractPatterns(events) {
  const groups = {};

  for (const event of events) {
    // Create grouping key
    const key = `${event.skill}:${event.error_type || 'success'}`;

    if (!groups[key]) {
      groups[key] = {
        skill: event.skill,
        error_type: event.error_type,
        success_count: 0,
        failure_count: 0,
        partial_count: 0,
        events: [],
        file_patterns: new Set(),
        contexts: []
      };
    }

    // Track outcomes
    switch (event.outcome) {
      case 'success':
        groups[key].success_count++;
        break;
      case 'failure':
        groups[key].failure_count++;
        break;
      case 'partial':
        groups[key].partial_count++;
        break;
    }

    // Track event references
    groups[key].events.push(event.event_id);

    // Track file patterns for context
    if (event.context?.file_pattern) {
      groups[key].file_patterns.add(event.context.file_pattern);
    }
  }

  // Filter groups with minimum events
  return Object.values(groups).filter(g => g.events.length >= MIN_EVENTS_FOR_PATTERN);
}

/**
 * Generate problem description from pattern
 * @param {Object} pattern - Pattern group
 * @returns {string} Problem description
 */
function generateProblem(pattern) {
  const skill = pattern.skill;
  const errorType = pattern.error_type;

  const errorMessages = {
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

  if (errorMessages[errorType]) {
    return `${skill} skill ${errorMessages[errorType]}`;
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

  const solutions = {
    validation: 'Verify all required inputs are provided and properly formatted before skill execution',
    type: 'Add null checks and type guards before accessing properties on potentially undefined values',
    syntax: 'Review generated code syntax, check for unclosed brackets or malformed expressions',
    notFound: 'Confirm target files and resources exist before operations; use glob patterns to verify',
    permission: 'Check file permissions and authorization context; ensure required access is available',
    timeout: 'Break large operations into smaller batches; consider async processing for heavy workloads',
    network: 'Verify network connectivity and endpoint availability; implement retry logic for transient failures',
    memory: 'Reduce batch sizes and use streaming for large data sets; monitor memory usage patterns'
  };

  if (solutions[errorType]) {
    return solutions[errorType];
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
 * Update analysis marker timestamp
 */
function updateMarker() {
  ensureDirs();
  fs.writeFileSync(MARKER_FILE, new Date().toISOString());
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

    // Only process PreCompact events (manual or auto)
    if (!['manual', 'auto'].includes(payload.compact_type)) {
      process.exit(0);
    }

    // Read events since last analysis
    const events = readEventsSinceLastAnalysis();

    // Need minimum events for meaningful analysis
    if (events.length < MIN_EVENTS_FOR_ANALYSIS) {
      logAnalysis(`skip | ${events.length} events (min ${MIN_EVENTS_FOR_ANALYSIS})`);
      process.exit(0);
    }

    // Extract patterns from events
    const patterns = extractPatterns(events);

    if (patterns.length === 0) {
      logAnalysis(`skip | No patterns found from ${events.length} events`);
      updateMarker();
      process.exit(0);
    }

    // Convert patterns to delta candidates
    const candidates = patterns.map(p => patternToCandidate(p));

    // Filter by confidence threshold
    const qualifiedCandidates = candidates.filter(c =>
      c.confidence >= ACE_CONFIG.CONFIDENCE_THRESHOLD
    );

    if (qualifiedCandidates.length > 0) {
      saveCandidates(qualifiedCandidates);
      logAnalysis(`generated | ${qualifiedCandidates.length} candidates from ${events.length} events`);

      // Output for hook response
      console.log(`\n<!-- ACE Reflector: Generated ${qualifiedCandidates.length} delta candidate(s) from ${events.length} events -->`);
    } else {
      logAnalysis(`skip | ${candidates.length} candidates below ${ACE_CONFIG.CONFIDENCE_THRESHOLD * 100}% threshold`);
    }

    updateMarker();
    process.exit(0);
  } catch (err) {
    // Non-blocking - log error and exit cleanly
    try {
      ensureDirs();
      logAnalysis(`error | ${err.message}`);
    } catch (e) {
      // Ignore logging errors
    }
    process.exit(0);
  }
}

main();
