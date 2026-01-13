#!/usr/bin/env node
/**
 * ACE Reflector - Event Reading & Pattern Extraction
 *
 * Event stream reading and pattern extraction from events.
 * Part of ace-reflector-analysis.cjs modularization.
 *
 * @module ar-events
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { MAX_STDIN_BYTES } = require('./ace-constants.cjs');
const { MEMORY_DIR } = require('./ace-playbook-state.cjs');

// Paths
const EVENTS_FILE = path.join(MEMORY_DIR, 'events-stream.jsonl');
const MARKER_FILE = path.join(MEMORY_DIR, '.ace-last-analysis');

// Configuration
const MIN_EVENTS_FOR_PATTERN = 3;

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
 * Update analysis marker timestamp
 */
function updateMarker() {
  const { ensureDirs } = require('./ace-playbook-state.cjs');
  ensureDirs();
  fs.writeFileSync(MARKER_FILE, new Date().toISOString());
}

module.exports = {
  EVENTS_FILE,
  MARKER_FILE,
  MIN_EVENTS_FOR_PATTERN,
  readStdinSync,
  readEventsSinceLastAnalysis,
  extractPatterns,
  updateMarker
};
