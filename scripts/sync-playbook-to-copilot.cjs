#!/usr/bin/env node
'use strict';

/**
 * ACE Playbook Sync: Claude → Copilot
 *
 * Manual sync script to export ACE learned patterns to Copilot instructions.
 *
 * Usage:
 *   node scripts/sync-playbook-to-copilot.cjs [options]
 *
 * Options:
 *   --dry-run     Preview sync without writing
 *   --validate    Only validate sync status
 *   --status      Show sync status
 *   --remove      Remove ACE section from Copilot
 *   -v, --verbose Verbose output
 *   -h, --help    Show help
 *
 * @module sync-playbook-to-copilot
 */

const path = require('path');

// Resolve paths
const libPath = path.join(__dirname, '..', '.claude', 'hooks', 'lib', 'ace-sync-copilot.cjs');
const { syncToCopilot, validateSync, removeSyncSection, getSyncStatus } = require(libPath);

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const validateOnly = args.includes('--validate');
const statusOnly = args.includes('--status');
const removeSection = args.includes('--remove');
const verbose = args.includes('--verbose') || args.includes('-v');
const help = args.includes('--help') || args.includes('-h');

/**
 * Print usage information
 */
function printHelp() {
  console.log(`
ACE Playbook Sync: Claude → Copilot

Syncs learned patterns from Claude Code to GitHub Copilot instructions.

Usage:
  node scripts/sync-playbook-to-copilot.cjs [options]

Options:
  --dry-run     Preview sync without writing to file
  --validate    Only validate current sync status
  --status      Show detailed sync status
  --remove      Remove ACE section from Copilot instructions
  -v, --verbose Show detailed output
  -h, --help    Show this help message

Examples:
  node scripts/sync-playbook-to-copilot.cjs           # Sync deltas
  node scripts/sync-playbook-to-copilot.cjs --dry-run # Preview changes
  node scripts/sync-playbook-to-copilot.cjs --status  # Check sync status
`);
}

/**
 * Print sync status
 */
function printStatus() {
  const status = getSyncStatus();

  console.log('=== ACE Sync Status ===\n');
  console.log(`Claude deltas:  ${status.claudeDeltaCount}`);
  console.log(`Copilot deltas: ${status.copilotDeltaCount}`);
  console.log(`Copilot file:   ${status.copilotExists ? 'exists' : 'missing'}`);
  console.log(`Last synced:    ${status.lastSyncDate || 'never'}`);
  console.log(`In sync:        ${status.inSync ? 'yes' : 'NO'}`);

  if (!status.inSync) {
    console.log('\nRun without options to sync.');
  }
}

/**
 * Main execution
 */
async function main() {
  if (help) {
    printHelp();
    process.exit(0);
  }

  console.log('=== ACE Playbook Sync: Claude → Copilot ===\n');

  // Status only
  if (statusOnly) {
    printStatus();
    process.exit(0);
  }

  // Validate only
  if (validateOnly) {
    const result = validateSync();
    if (result.valid) {
      console.log(`✓ Validation passed: ${result.message}`);
      process.exit(0);
    } else {
      console.log(`✗ Validation failed: ${result.error}`);
      process.exit(1);
    }
  }

  // Remove section
  if (removeSection) {
    const result = removeSyncSection({ dryRun, verbose });
    if (result.success) {
      if (dryRun) {
        console.log('✓ Dry run - would remove ACE section.');
      } else {
        console.log('✓ ACE section removed from Copilot instructions.');
      }
      process.exit(0);
    } else {
      console.log(`✗ Remove failed: ${result.error}`);
      process.exit(1);
    }
  }

  // Sync
  const result = syncToCopilot({ dryRun, verbose: true });

  if (result.success) {
    if (result.message) {
      console.log(`ℹ ${result.message}`);
    } else if (dryRun) {
      console.log(`\n✓ Dry run complete. Would sync ${result.deltasCount} deltas.`);
    } else {
      console.log(`\n✓ Synced ${result.deltasCount} deltas to Copilot.`);
    }

    // Validate after sync (unless dry run)
    if (!dryRun && result.deltasCount > 0) {
      const validation = validateSync();
      if (!validation.valid) {
        console.log(`\n⚠ Post-sync validation warning: ${validation.error}`);
      } else {
        console.log(`✓ Post-sync validation passed.`);
      }
    }
  } else {
    console.log(`\n✗ Sync failed: ${result.error}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Sync error:', err.message);
  process.exit(1);
});
