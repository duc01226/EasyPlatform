#!/usr/bin/env node
'use strict';

/**
 * List Patterns Script
 * Lists all active learned patterns with filtering options
 *
 * Usage:
 *   node list-patterns.cjs [category] [--low|--high]
 *
 * Examples:
 *   node list-patterns.cjs              # List all
 *   node list-patterns.cjs backend      # List backend only
 *   node list-patterns.cjs --low        # List low confidence (< 50%)
 *   node list-patterns.cjs --high       # List high confidence (> 70%)
 */

const path = require('path');

// Load pattern storage utilities
const { loadAllPatterns, loadIndex } = require('../../../hooks/lib/pattern-storage.cjs');
const { PATTERN_CATEGORIES } = require('../../../hooks/lib/pattern-constants.cjs');

/**
 * Format confidence as percentage with color indicator
 * @param {number} confidence - Confidence value (0-1)
 * @returns {string} Formatted string
 */
function formatConfidence(confidence) {
  const pct = (confidence * 100).toFixed(0);
  if (confidence >= 0.7) return `${pct}% ●`;  // High
  if (confidence >= 0.5) return `${pct}% ◐`;  // Medium
  if (confidence >= 0.3) return `${pct}% ○`;  // Low
  return `${pct}% ◌`;  // Very low
}

/**
 * Truncate string to max length
 * @param {string} str - Input string
 * @param {number} max - Max length
 * @returns {string} Truncated string
 */
function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

/**
 * Main list function
 */
function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let categoryFilter = null;
  let confidenceFilter = null;

  for (const arg of args) {
    if (arg === '--low') {
      confidenceFilter = 'low';
    } else if (arg === '--high') {
      confidenceFilter = 'high';
    } else if (PATTERN_CATEGORIES.includes(arg)) {
      categoryFilter = arg;
    }
  }

  // Load patterns
  const patterns = loadAllPatterns();

  if (patterns.length === 0) {
    console.log('\n📭 No learned patterns found.\n');
    console.log('Use /learn to teach Claude new patterns:');
    console.log('  /learn always use PlatformValidationResult instead of throwing exceptions\n');
    return;
  }

  // Filter patterns
  let filtered = patterns;

  if (categoryFilter) {
    filtered = filtered.filter(p => p.category === categoryFilter);
  }

  if (confidenceFilter === 'low') {
    filtered = filtered.filter(p => (p.metadata?.confidence || 0.5) < 0.5);
  } else if (confidenceFilter === 'high') {
    filtered = filtered.filter(p => (p.metadata?.confidence || 0.5) >= 0.7);
  }

  // Sort by confidence descending
  filtered.sort((a, b) =>
    (b.metadata?.confidence || 0.5) - (a.metadata?.confidence || 0.5)
  );

  // Display header
  console.log('\n📚 Learned Patterns\n');

  if (categoryFilter) {
    console.log(`Category: ${categoryFilter}`);
  }
  if (confidenceFilter) {
    console.log(`Filter: ${confidenceFilter} confidence`);
  }

  console.log(`Total: ${filtered.length} pattern(s)\n`);

  if (filtered.length === 0) {
    console.log('No patterns match the filter criteria.\n');
    return;
  }

  // Display table header
  console.log('┌────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ ID           │ Category  │ Type         │ Context                  │ Conf    │');
  console.log('├────────────────────────────────────────────────────────────────────────────────┤');

  // Display patterns
  for (const p of filtered) {
    const id = truncate(p.id || 'unknown', 12).padEnd(12);
    const category = truncate(p.category || 'general', 9).padEnd(9);
    const type = truncate(p.type || 'pattern', 12).padEnd(12);
    const context = truncate(p.trigger?.context || p.content?.right || '', 24).padEnd(24);
    const conf = formatConfidence(p.metadata?.confidence || 0.5).padEnd(7);

    console.log(`│ ${id} │ ${category} │ ${type} │ ${context} │ ${conf} │`);
  }

  console.log('└────────────────────────────────────────────────────────────────────────────────┘');

  // Summary by category
  console.log('\n📊 By Category:');
  const byCategory = {};
  for (const p of patterns) {
    const cat = p.category || 'general';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(byCategory)) {
    console.log(`  ${cat}: ${count}`);
  }

  console.log('\n💡 Commands:');
  console.log('  /learned-patterns view <id>      View pattern details');
  console.log('  /learned-patterns archive <id>   Archive a pattern');
  console.log('  /learned-patterns boost <id>     Increase confidence\n');
}

main();
