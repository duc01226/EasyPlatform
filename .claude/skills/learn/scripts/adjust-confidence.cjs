#!/usr/bin/env node
'use strict';

/**
 * Adjust Confidence Script
 * Boost or penalize pattern confidence
 *
 * Usage:
 *   node adjust-confidence.cjs <pattern-id> boost
 *   node adjust-confidence.cjs <pattern-id> penalize
 */

const {
  loadIndex,
  saveIndex,
  findPatternEntry,
  loadPattern,
  savePattern,
  updateConfidence
} = require('../../../hooks/lib/pattern-storage.cjs');

/**
 * Main adjust function
 */
function main() {
  const patternId = process.argv[2];
  const action = process.argv[3];

  if (!patternId || !action || !['boost', 'penalize'].includes(action)) {
    console.log('\n❌ Usage: node adjust-confidence.cjs <pattern-id> <boost|penalize>\n');
    console.log('Examples:');
    console.log('  node adjust-confidence.cjs pat_abc123 boost      # +20% confidence');
    console.log('  node adjust-confidence.cjs pat_abc123 penalize   # -10% confidence\n');
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

  const oldConfidence = pattern.metadata?.confidence || 0.5;

  // Apply adjustment
  const event = action === 'boost' ? 'confirm' : 'conflict';
  updateConfidence(pattern, event);

  const newConfidence = pattern.metadata.confidence;

  // Save updated pattern
  savePattern(pattern, entry.file);

  // Update index
  index.patterns[entry.id].confidence = newConfidence;
  saveIndex(index);

  // Display result
  const actionEmoji = action === 'boost' ? '📈' : '📉';
  const actionVerb = action === 'boost' ? 'Boosted' : 'Penalized';
  const change = ((newConfidence - oldConfidence) * 100).toFixed(0);
  const changeSign = change >= 0 ? '+' : '';

  console.log(`\n${actionEmoji} Confidence ${actionVerb}`);
  console.log('─'.repeat(40));
  console.log(`  Pattern:    ${entry.id}`);
  console.log(`  Before:     ${(oldConfidence * 100).toFixed(0)}%`);
  console.log(`  After:      ${(newConfidence * 100).toFixed(0)}%`);
  console.log(`  Change:     ${changeSign}${change}%`);
  console.log();

  // Warnings
  if (newConfidence < 0.3) {
    console.log('⚠️  Warning: Low confidence. Pattern may be auto-archived soon.\n');
  }

  if (newConfidence >= 0.9) {
    console.log('✨ High confidence pattern. Will be prioritized for injection.\n');
  }
}

main();
