#!/usr/bin/env node
'use strict';

/**
 * Pattern Statistics Script
 * Display statistics about the learned patterns library
 *
 * Usage:
 *   node pattern-stats.cjs
 */

const fs = require('fs');
const path = require('path');

const { loadAllPatterns, loadIndex, getPatternsDir } = require('../../../hooks/lib/pattern-storage.cjs');
const { PATTERN_CATEGORIES } = require('../../../hooks/lib/pattern-constants.cjs');

/**
 * Calculate average
 * @param {number[]} values - Array of numbers
 * @returns {number} Average
 */
function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Count files in directory recursively
 * @param {string} dir - Directory path
 * @returns {number} File count
 */
function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;

  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.yaml')) {
      count++;
    } else if (entry.isDirectory() && entry.name !== 'archive') {
      count += countFiles(path.join(dir, entry.name));
    }
  }

  return count;
}

/**
 * Count archived patterns
 * @returns {number} Archived count
 */
function countArchived() {
  const archiveDir = path.join(getPatternsDir(), 'archive');
  return countFiles(archiveDir);
}

/**
 * Main stats function
 */
function main() {
  const patterns = loadAllPatterns();
  const index = loadIndex();

  console.log('\n' + '═'.repeat(60));
  console.log('📊 Learned Patterns Statistics');
  console.log('═'.repeat(60) + '\n');

  // Overview
  console.log('📌 Overview');
  console.log('─'.repeat(40));
  console.log(`  Total active patterns:  ${patterns.length}`);
  console.log(`  Archived patterns:      ${countArchived()}`);
  console.log(`  Index version:          ${index.version || 1}`);
  console.log(`  Last updated:           ${index.last_updated || 'N/A'}`);
  console.log();

  if (patterns.length === 0) {
    console.log('No patterns to analyze. Use /learn to teach patterns.\n');
    return;
  }

  // By category
  console.log('📂 By Category');
  console.log('─'.repeat(40));

  const byCategory = {};
  for (const cat of PATTERN_CATEGORIES) {
    byCategory[cat] = { count: 0, confidences: [] };
  }

  for (const p of patterns) {
    const cat = p.category || 'general';
    if (!byCategory[cat]) {
      byCategory[cat] = { count: 0, confidences: [] };
    }
    byCategory[cat].count++;
    byCategory[cat].confidences.push(p.metadata?.confidence || 0.5);
  }

  for (const [cat, data] of Object.entries(byCategory)) {
    if (data.count > 0) {
      const avgConf = (average(data.confidences) * 100).toFixed(0);
      console.log(`  ${cat.padEnd(12)} ${String(data.count).padStart(3)} patterns (avg ${avgConf}% conf)`);
    }
  }
  console.log();

  // By type
  console.log('📋 By Type');
  console.log('─'.repeat(40));

  const byType = {};
  for (const p of patterns) {
    const type = p.type || 'pattern';
    byType[type] = (byType[type] || 0) + 1;
  }

  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(15)} ${count}`);
  }
  console.log();

  // Confidence distribution
  console.log('📈 Confidence Distribution');
  console.log('─'.repeat(40));

  const confBuckets = {
    high: 0,    // >= 70%
    medium: 0,  // 50-69%
    low: 0,     // 30-49%
    veryLow: 0  // < 30%
  };

  const allConfidences = [];

  for (const p of patterns) {
    const conf = p.metadata?.confidence || 0.5;
    allConfidences.push(conf);

    if (conf >= 0.7) confBuckets.high++;
    else if (conf >= 0.5) confBuckets.medium++;
    else if (conf >= 0.3) confBuckets.low++;
    else confBuckets.veryLow++;
  }

  console.log(`  High (≥70%):     ${confBuckets.high} patterns`);
  console.log(`  Medium (50-69%): ${confBuckets.medium} patterns`);
  console.log(`  Low (30-49%):    ${confBuckets.low} patterns`);
  console.log(`  Very Low (<30%): ${confBuckets.veryLow} patterns`);
  console.log();

  const avgConfidence = (average(allConfidences) * 100).toFixed(0);
  console.log(`  Average confidence: ${avgConfidence}%`);
  console.log();

  // Source distribution
  console.log('🔍 By Source');
  console.log('─'.repeat(40));

  const bySource = {};
  for (const p of patterns) {
    const source = p.metadata?.source || 'unknown';
    bySource[source] = (bySource[source] || 0) + 1;
  }

  for (const [source, count] of Object.entries(bySource)) {
    console.log(`  ${source.padEnd(20)} ${count}`);
  }
  console.log();

  // Feedback metrics
  console.log('👍 Feedback Metrics');
  console.log('─'.repeat(40));

  let totalConfirmations = 0;
  let totalConflicts = 0;
  let totalOccurrences = 0;

  for (const p of patterns) {
    totalConfirmations += p.metadata?.confirmations || 0;
    totalConflicts += p.metadata?.conflicts || 0;
    totalOccurrences += p.metadata?.occurrences || 1;
  }

  console.log(`  Total occurrences:   ${totalOccurrences}`);
  console.log(`  Total confirmations: ${totalConfirmations}`);
  console.log(`  Total conflicts:     ${totalConflicts}`);

  if (totalConfirmations + totalConflicts > 0) {
    const confirmRate = ((totalConfirmations / (totalConfirmations + totalConflicts)) * 100).toFixed(0);
    console.log(`  Confirmation rate:   ${confirmRate}%`);
  }
  console.log();

  // Action items
  if (confBuckets.veryLow > 0 || confBuckets.low > 0) {
    console.log('⚠️  Action Items');
    console.log('─'.repeat(40));

    if (confBuckets.veryLow > 0) {
      console.log(`  ${confBuckets.veryLow} pattern(s) with very low confidence - review for archival`);
    }

    if (confBuckets.low > 0) {
      console.log(`  ${confBuckets.low} pattern(s) with low confidence - consider boosting or archiving`);
    }

    console.log('\n  Run: /learned-patterns list --low\n');
  }
}

main();
