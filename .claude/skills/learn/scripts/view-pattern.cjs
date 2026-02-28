#!/usr/bin/env node
'use strict';

/**
 * View Pattern Script
 * Display detailed information about a specific pattern
 *
 * Usage:
 *   node view-pattern.cjs <pattern-id>
 */

const path = require('path');

const {
  loadIndex,
  loadPattern,
  findPatternEntry
} = require('../../../hooks/lib/pattern-storage.cjs');

/**
 * Format date for display
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Main view function
 */
function main() {
  const patternId = process.argv[2];

  if (!patternId) {
    console.log('\n❌ Usage: node view-pattern.cjs <pattern-id>\n');
    console.log('Use /learn list to see available patterns.\n');
    process.exit(1);
  }

  const index = loadIndex();
  const entry = findPatternEntry(index, patternId);

  if (!entry) {
    console.log(`\n❌ Pattern not found: ${patternId}\n`);
    console.log('Use /learn list to see available patterns.\n');
    process.exit(1);
  }

  const pattern = loadPattern(entry.file);

  if (!pattern) {
    console.log(`\n❌ Pattern file not found: ${entry.file}\n`);
    process.exit(1);
  }

  // Display pattern details
  console.log('\n' + '═'.repeat(80));
  console.log(`📋 Pattern: ${entry.id}`);
  console.log('═'.repeat(80) + '\n');

  // Basic info
  console.log('📌 Basic Information');
  console.log('─'.repeat(40));
  console.log(`  Category:    ${pattern.category || 'general'}`);
  console.log(`  Type:        ${pattern.type || 'pattern'}`);
  console.log(`  Source:      ${pattern.metadata?.source || 'unknown'}`);
  console.log(`  File:        ${entry.file}`);
  console.log();

  // Content
  console.log('📝 Content');
  console.log('─'.repeat(40));

  if (pattern.content?.wrong) {
    console.log('  ❌ AVOID:');
    console.log(`     ${pattern.content.wrong}`);
  }

  if (pattern.content?.right) {
    console.log('  ✅ USE:');
    console.log(`     ${pattern.content.right}`);
  }

  if (pattern.content?.rationale && typeof pattern.content.rationale === 'string' && pattern.content.rationale.trim()) {
    console.log('  💡 Rationale:');
    console.log(`     ${pattern.content.rationale}`);
  }
  console.log();

  // Trigger info
  console.log('🎯 Trigger');
  console.log('─'.repeat(40));

  if (pattern.trigger?.context) {
    console.log(`  Context:     ${pattern.trigger.context}`);
  }

  if (pattern.trigger?.keywords?.length > 0) {
    console.log(`  Keywords:    ${pattern.trigger.keywords.join(', ')}`);
  }

  if (pattern.trigger?.file_patterns?.length > 0) {
    console.log(`  Files:       ${pattern.trigger.file_patterns.join(', ')}`);
  }
  console.log();

  // Metadata
  console.log('📊 Metrics');
  console.log('─'.repeat(40));

  const confidence = pattern.metadata?.confidence || 0.5;
  const confPct = (confidence * 100).toFixed(0);
  let confLevel = 'Medium';
  if (confidence >= 0.7) confLevel = 'High';
  else if (confidence < 0.5) confLevel = 'Low';
  else if (confidence < 0.3) confLevel = 'Very Low';

  console.log(`  Confidence:  ${confPct}% (${confLevel})`);
  console.log(`  First seen:  ${formatDate(pattern.metadata?.first_seen)}`);
  console.log(`  Last used:   ${formatDate(pattern.metadata?.last_confirmed)}`);
  console.log(`  Occurrences: ${pattern.metadata?.occurrences || 1}`);
  console.log(`  Confirms:    ${pattern.metadata?.confirmations || 0}`);
  console.log(`  Conflicts:   ${pattern.metadata?.conflicts || 0}`);
  console.log();

  // Tags
  if (pattern.tags?.length > 0) {
    console.log('🏷️  Tags');
    console.log('─'.repeat(40));
    console.log(`  ${pattern.tags.join(', ')}`);
    console.log();
  }

  // Related files
  if (pattern.metadata?.related_files?.length > 0) {
    console.log('📁 Related Files');
    console.log('─'.repeat(40));
    for (const file of pattern.metadata.related_files.slice(0, 5)) {
      console.log(`  ${file}`);
    }
    if (pattern.metadata.related_files.length > 5) {
      console.log(`  ... and ${pattern.metadata.related_files.length - 5} more`);
    }
    console.log();
  }

  // Actions
  console.log('⚡ Actions');
  console.log('─'.repeat(40));
  console.log(`  /learn boost ${entry.id}      Increase confidence`);
  console.log(`  /learn penalize ${entry.id}   Decrease confidence`);
  console.log(`  /learn archive ${entry.id}    Archive pattern`);
  console.log();
}

main();
