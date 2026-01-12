#!/usr/bin/env node
'use strict';

/**
 * ACE Sync Validation - Validate Claude ↔ Copilot configuration parity
 *
 * Used by pre-commit hook and CI/CD pipelines.
 *
 * Usage:
 *   node scripts/sync-validate.cjs
 *
 * Exit codes:
 *   0 - Validation passed
 *   1 - Validation failed
 *
 * @module sync-validate
 */

const fs = require('fs');
const path = require('path');

// Paths
const PROJECT_ROOT = path.join(__dirname, '..');
const CLAUDE_DELTAS = path.join(PROJECT_ROOT, '.claude', 'memory', 'deltas.json');
const COPILOT_FILE = path.join(PROJECT_ROOT, '.github', 'copilot-instructions.md');

// Section markers
const ACE_SECTION_START = '<!-- ACE-LEARNED-PATTERNS-START -->';

/**
 * Main validation function
 */
function main() {
  const errors = [];
  const warnings = [];

  console.log('=== ACE Sync Validation ===\n');

  // Check if Claude deltas file exists
  if (!fs.existsSync(CLAUDE_DELTAS)) {
    console.log('ℹ No Claude deltas file - skipping validation');
    process.exit(0);
  }

  // Check if Copilot file exists
  if (!fs.existsSync(COPILOT_FILE)) {
    errors.push('Copilot instructions file missing: .github/copilot-instructions.md');
  }

  // Load deltas
  let deltas;
  try {
    deltas = JSON.parse(fs.readFileSync(CLAUDE_DELTAS, 'utf8'));
  } catch (e) {
    errors.push(`Failed to parse deltas.json: ${e.message}`);
    deltas = [];
  }

  // No deltas - nothing to validate
  if (deltas.length === 0) {
    console.log('ℹ No deltas to validate');
    process.exit(0);
  }

  console.log(`Claude deltas: ${deltas.length}`);

  // Load Copilot content
  if (errors.length === 0) {
    const copilotContent = fs.readFileSync(COPILOT_FILE, 'utf8');

    // Check Copilot has ACE section
    if (!copilotContent.includes(ACE_SECTION_START)) {
      errors.push(`${deltas.length} deltas exist but Copilot missing ACE section`);
    } else {
      // Count deltas in Copilot
      const deltaMatches = copilotContent.match(/- \*\*[^*]+\*\*:.*\[\d+%\]/g);
      const copilotCount = deltaMatches ? deltaMatches.length : 0;

      console.log(`Copilot deltas: ${copilotCount}`);

      if (copilotCount !== deltas.length) {
        errors.push(`Delta count mismatch: Claude=${deltas.length}, Copilot=${copilotCount}`);
      }

      // Check last sync date isn't too old (warning only)
      const dateMatch = copilotContent.match(/\*Last synced: (\d{4}-\d{2}-\d{2})\*/);
      if (dateMatch) {
        const lastSync = new Date(dateMatch[1]);
        const daysSinceSync = Math.floor((Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`Last synced: ${dateMatch[1]} (${daysSinceSync} days ago)`);

        if (daysSinceSync > 7) {
          warnings.push(`Last sync was ${daysSinceSync} days ago - consider re-syncing`);
        }
      }
    }
  }

  // Report results
  console.log('');

  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.forEach(w => console.log(`  ⚠ ${w}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.log('Validation FAILED:');
    errors.forEach(e => console.log(`  ✗ ${e}`));
    console.log('\nRun: node scripts/sync-playbook-to-copilot.cjs');
    process.exit(1);
  }

  console.log(`✓ Sync validation passed: ${deltas.length} deltas in sync`);
  process.exit(0);
}

main();
