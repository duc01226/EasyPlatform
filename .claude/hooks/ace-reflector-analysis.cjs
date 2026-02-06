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
 * Sub-modules:
 *   - ar-events.cjs     - Event reading and pattern extraction
 *   - ar-generation.cjs - Content generation (problem, solution, condition)
 *   - ar-candidates.cjs - Candidate management (convert, load, save)
 *
 * @module ace-reflector-analysis
 */

const { ACE_CONFIG } = require('./lib/ace-lesson-schema.cjs');
const { ensureDirs } = require('./lib/ace-playbook-state.cjs');

// ACE reflector sub-modules
const {
  readStdinSync,
  readEventsSinceLastAnalysis,
  extractPatterns,
  updateMarker
} = require('./lib/ar-events.cjs');
const { patternToCandidate, saveCandidates, logAnalysis } = require('./lib/ar-candidates.cjs');

// Configuration
const MIN_EVENTS_FOR_ANALYSIS = 5;


/**
 * Secondary grouping by principle field alongside skill:error_type grouping.
 * Only groups patterns/events that have a principle field set.
 * @param {Object[]} events - Raw event objects
 * @returns {Set<string>} Set of unique principle strings
 */
function groupByPrinciple(events) {
  const principles = new Set();
  for (const event of events) {
    const principle = event.principle || event.reason_principle;
    if (principle) principles.add(principle);
  }
  return principles;
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

    // Secondary grouping by principle (if events have principle data)
    const principles = groupByPrinciple(events);
    const principleCount = principles.size;

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
      const logPrinciple = principleCount > 0 ? ` | ${principleCount} principles` : '';
      logAnalysis(`generated | ${qualifiedCandidates.length} candidates from ${events.length} events${logPrinciple}`);

      // Output for hook response
      const principleNote = principleCount > 0 ? ` (${principleCount} principle groups)` : '';
      console.log(`\n<!-- ACE Reflector: Generated ${qualifiedCandidates.length} delta candidate(s) from ${events.length} events${principleNote} -->`);
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
