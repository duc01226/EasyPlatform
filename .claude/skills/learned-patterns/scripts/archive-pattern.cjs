#!/usr/bin/env node
'use strict';

/**
 * Archive Pattern Script
 * Archive a pattern (soft delete)
 *
 * Usage:
 *   node archive-pattern.cjs <pattern-id> [reason]
 */

const {
  loadIndex,
  findPatternEntry,
  archivePattern
} = require('../../../hooks/lib/pattern-storage.cjs');

/**
 * Main archive function
 */
function main() {
  const patternId = process.argv[2];
  const reason = process.argv.slice(3).join(' ') || 'user_requested';

  if (!patternId) {
    console.log('\n❌ Usage: node archive-pattern.cjs <pattern-id> [reason]\n');
    console.log('Use /learned-patterns list to see available patterns.\n');
    process.exit(1);
  }

  const index = loadIndex();
  const entry = findPatternEntry(index, patternId);

  if (!entry) {
    console.log(`\n❌ Pattern not found: ${patternId}\n`);
    console.log('Use /learned-patterns list to see available patterns.\n');
    process.exit(1);
  }

  // Confirm action
  console.log('\n⚠️  Archive Pattern');
  console.log('─'.repeat(40));
  console.log(`  Pattern ID: ${entry.id}`);
  console.log(`  File:       ${entry.file}`);
  console.log(`  Reason:     ${reason}`);
  console.log();

  // Perform archive
  const result = archivePattern(entry.id, reason);

  if (result.success) {
    console.log(`✅ ${result.message}\n`);
    console.log('Pattern moved to archive/ directory.');
    console.log('It will no longer be injected into sessions.\n');
  } else {
    console.log(`❌ ${result.message}\n`);
    process.exit(1);
  }
}

main();
