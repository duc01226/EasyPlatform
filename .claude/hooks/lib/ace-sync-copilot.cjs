#!/usr/bin/env node
'use strict';

/**
 * ACE Sync Copilot - Export ACE deltas to Copilot instructions
 *
 * Direction: Claude → Copilot only (user decision)
 * Target: .github/copilot-instructions.md
 *
 * @module ace-sync-copilot
 */

const fs = require('fs');
const path = require('path');
const { getTopDeltas, MAX_DELTAS } = require('./ace-playbook-state.cjs');

// Paths
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const COPILOT_FILE = path.join(PROJECT_ROOT, '.github', 'copilot-instructions.md');

// Section markers
const ACE_SECTION_START = '<!-- ACE-LEARNED-PATTERNS-START -->';
const ACE_SECTION_END = '<!-- ACE-LEARNED-PATTERNS-END -->';

/**
 * Escape special regex characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format a single delta for Copilot instructions
 * @param {Object} delta - Delta object
 * @returns {string} Formatted line
 */
function formatDelta(delta) {
  const conf = Math.round(delta.confidence * 100);
  return `- **${delta.condition}**: ${delta.problem} → ${delta.solution} [${conf}%]`;
}

/**
 * Format deltas for Copilot instructions
 * @param {Object[]} deltas - Array of deltas
 * @returns {string} Formatted markdown section
 */
function formatForCopilot(deltas) {
  const lines = [
    ACE_SECTION_START,
    '',
    '## ACE Learned Patterns',
    '',
    '> These patterns were learned from Claude Code execution outcomes.',
    '> Do not edit manually - managed by ACE sync.',
    ''
  ];

  // Group by confidence tier
  const highConfidence = deltas.filter(d => d.confidence >= 0.90);
  const mediumConfidence = deltas.filter(d => d.confidence >= 0.80 && d.confidence < 0.90);

  if (highConfidence.length > 0) {
    lines.push('### High Confidence (90%+)');
    lines.push('');
    for (const delta of highConfidence) {
      lines.push(formatDelta(delta));
    }
    lines.push('');
  }

  if (mediumConfidence.length > 0) {
    lines.push('### Medium Confidence (80-90%)');
    lines.push('');
    for (const delta of mediumConfidence) {
      lines.push(formatDelta(delta));
    }
    lines.push('');
  }

  // If no deltas in either tier (shouldn't happen with 80% threshold)
  if (highConfidence.length === 0 && mediumConfidence.length === 0 && deltas.length > 0) {
    lines.push('### Patterns');
    lines.push('');
    for (const delta of deltas) {
      lines.push(formatDelta(delta));
    }
    lines.push('');
  }

  lines.push(`*Last synced: ${new Date().toISOString().split('T')[0]}*`);
  lines.push('');
  lines.push(ACE_SECTION_END);

  return lines.join('\n');
}

/**
 * Sync deltas to Copilot instructions
 * @param {Object} options - Sync options
 * @param {boolean} options.dryRun - If true, don't write to file
 * @param {boolean} options.verbose - If true, output detailed logs
 * @returns {Object} Sync result
 */
function syncToCopilot(options = {}) {
  const { dryRun = false, verbose = false } = options;

  // Load active deltas
  const deltas = getTopDeltas(MAX_DELTAS);
  if (deltas.length === 0) {
    if (verbose) console.log('[sync] No deltas to sync');
    return { success: true, deltasCount: 0, message: 'No deltas to sync' };
  }

  // Format for Copilot
  const aceSection = formatForCopilot(deltas);

  // Check if Copilot file exists
  if (!fs.existsSync(COPILOT_FILE)) {
    return { success: false, error: `Copilot instructions file not found: ${COPILOT_FILE}` };
  }

  let content = fs.readFileSync(COPILOT_FILE, 'utf8');

  // Find and replace ACE section, or append if not exists
  const hasSection = content.includes(ACE_SECTION_START);

  if (hasSection) {
    // Replace existing section
    const regex = new RegExp(
      `${escapeRegex(ACE_SECTION_START)}[\\s\\S]*?${escapeRegex(ACE_SECTION_END)}`,
      'g'
    );
    content = content.replace(regex, aceSection);
  } else {
    // Append section at end
    content = content.trimEnd() + '\n\n' + aceSection + '\n';
  }

  if (dryRun) {
    if (verbose) {
      console.log('[sync] Dry run - would write:');
      console.log('---');
      console.log(aceSection);
      console.log('---');
    }
    return { success: true, deltasCount: deltas.length, dryRun: true, section: aceSection };
  }

  // Write updated content
  fs.writeFileSync(COPILOT_FILE, content);

  if (verbose) {
    console.log(`[sync] Synced ${deltas.length} deltas to Copilot`);
  }

  return { success: true, deltasCount: deltas.length };
}

/**
 * Remove ACE section from Copilot instructions
 * @param {Object} options - Options
 * @returns {Object} Result
 */
function removeSyncSection(options = {}) {
  const { dryRun = false, verbose = false } = options;

  if (!fs.existsSync(COPILOT_FILE)) {
    return { success: false, error: 'Copilot instructions file not found' };
  }

  let content = fs.readFileSync(COPILOT_FILE, 'utf8');

  if (!content.includes(ACE_SECTION_START)) {
    return { success: true, message: 'No ACE section to remove' };
  }

  const regex = new RegExp(
    `\\n*${escapeRegex(ACE_SECTION_START)}[\\s\\S]*?${escapeRegex(ACE_SECTION_END)}\\n*`,
    'g'
  );
  content = content.replace(regex, '\n');

  if (dryRun) {
    if (verbose) console.log('[sync] Dry run - would remove ACE section');
    return { success: true, dryRun: true };
  }

  fs.writeFileSync(COPILOT_FILE, content);

  if (verbose) {
    console.log('[sync] Removed ACE section from Copilot instructions');
  }

  return { success: true };
}

/**
 * Validate sync integrity
 * @returns {Object} Validation result
 */
function validateSync() {
  const deltas = getTopDeltas(MAX_DELTAS);

  if (!fs.existsSync(COPILOT_FILE)) {
    return { valid: false, error: 'Copilot file not found' };
  }

  const content = fs.readFileSync(COPILOT_FILE, 'utf8');

  // No deltas, no section - OK
  if (deltas.length === 0 && !content.includes(ACE_SECTION_START)) {
    return { valid: true, message: 'No deltas, no section - OK' };
  }

  // Deltas exist but no section - needs sync
  if (deltas.length > 0 && !content.includes(ACE_SECTION_START)) {
    return { valid: false, error: `${deltas.length} deltas exist but ACE section missing - run sync` };
  }

  // No deltas but section exists - orphaned section
  if (deltas.length === 0 && content.includes(ACE_SECTION_START)) {
    return { valid: false, error: 'No deltas but ACE section exists - remove or sync' };
  }

  // Check delta count matches
  const sectionMatch = content.match(/- \*\*[^*]+\*\*:.*\[\d+%\]/g);
  const copilotDeltaCount = sectionMatch ? sectionMatch.length : 0;

  if (copilotDeltaCount !== deltas.length) {
    return {
      valid: false,
      error: `Delta count mismatch: Claude=${deltas.length}, Copilot=${copilotDeltaCount}`
    };
  }

  return { valid: true, message: `Sync valid: ${deltas.length} deltas` };
}

/**
 * Get sync status
 * @returns {Object} Status information
 */
function getSyncStatus() {
  const deltas = getTopDeltas(MAX_DELTAS);
  const copilotExists = fs.existsSync(COPILOT_FILE);

  let copilotDeltaCount = 0;
  let lastSyncDate = null;

  if (copilotExists) {
    const content = fs.readFileSync(COPILOT_FILE, 'utf8');
    const sectionMatch = content.match(/- \*\*[^*]+\*\*:.*\[\d+%\]/g);
    copilotDeltaCount = sectionMatch ? sectionMatch.length : 0;

    const dateMatch = content.match(/\*Last synced: (\d{4}-\d{2}-\d{2})\*/);
    if (dateMatch) {
      lastSyncDate = dateMatch[1];
    }
  }

  return {
    claudeDeltaCount: deltas.length,
    copilotDeltaCount,
    copilotExists,
    lastSyncDate,
    inSync: deltas.length === copilotDeltaCount
  };
}

module.exports = {
  syncToCopilot,
  removeSyncSection,
  validateSync,
  formatForCopilot,
  getSyncStatus,
  ACE_SECTION_START,
  ACE_SECTION_END
};
