#!/usr/bin/env node
'use strict';

/**
 * ACE Hook Verification Script
 *
 * Verifies that all required ACE hook files exist and are properly registered.
 * Run on session start to detect missing or misconfigured hooks.
 *
 * Usage: node verify-hooks.cjs [--quiet]
 *
 * @module verify-hooks
 */

const fs = require('fs');
const path = require('path');

const HOOKS_DIR = __dirname;
const SETTINGS_FILE = path.join(__dirname, '..', 'settings.json');

// Required ACE hook files
const REQUIRED_HOOKS = [
  'ace-event-emitter.cjs',
  'ace-feedback-tracker.cjs',
  'ace-reflector-analysis.cjs',
  'ace-curator-pruner.cjs',
  'ace-session-inject.cjs'
];

// Required library files
const REQUIRED_LIBS = [
  'lib/ace-cli-helpers.cjs',
  'lib/ace-constants.cjs',
  'lib/ace-lesson-schema.cjs',
  'lib/ace-outcome-classifier.cjs',
  'lib/ace-playbook-state.cjs',
  'lib/ace-sync-copilot.cjs'
];

/**
 * Check if a file exists
 * @param {string} filePath - Path to check
 * @returns {boolean} True if file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Verify hook registration in settings.json
 * @returns {{registered: string[], missing: string[]}} Registration status
 */
function verifyRegistration() {
  const registered = [];
  const missing = [];

  if (!fileExists(SETTINGS_FILE)) {
    return { registered: [], missing: REQUIRED_HOOKS };
  }

  try {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    const hooks = settings.hooks || {};

    // Check each hook event type for ACE hooks
    const allRegisteredCommands = [];
    for (const [eventType, eventHooks] of Object.entries(hooks)) {
      if (Array.isArray(eventHooks)) {
        for (const hookGroup of eventHooks) {
          // Handle nested structure: { matcher: "...", hooks: [...] }
          if (hookGroup.hooks && Array.isArray(hookGroup.hooks)) {
            for (const hook of hookGroup.hooks) {
              if (hook.command) {
                allRegisteredCommands.push(hook.command);
              }
            }
          }
          // Handle flat structure: { command: "..." }
          if (hookGroup.command) {
            allRegisteredCommands.push(hookGroup.command);
          }
        }
      }
    }

    // Check which ACE hooks are registered
    for (const hookFile of REQUIRED_HOOKS) {
      const hookPath = path.join(HOOKS_DIR, hookFile);
      const isRegistered = allRegisteredCommands.some(cmd =>
        cmd.includes(hookFile) || cmd.includes(hookFile.replace('.cjs', ''))
      );

      if (isRegistered) {
        registered.push(hookFile);
      } else {
        missing.push(hookFile);
      }
    }
  } catch (e) {
    return { registered: [], missing: REQUIRED_HOOKS };
  }

  return { registered, missing };
}

/**
 * Run verification
 * @param {boolean} quiet - Suppress output
 * @returns {{success: boolean, issues: string[]}} Verification result
 */
function verify(quiet = false) {
  const issues = [];

  // Check hook files exist
  const missingHooks = REQUIRED_HOOKS.filter(h => !fileExists(path.join(HOOKS_DIR, h)));
  if (missingHooks.length > 0) {
    issues.push(`Missing hook files: ${missingHooks.join(', ')}`);
  }

  // Check library files exist
  const missingLibs = REQUIRED_LIBS.filter(l => !fileExists(path.join(HOOKS_DIR, l)));
  if (missingLibs.length > 0) {
    issues.push(`Missing library files: ${missingLibs.join(', ')}`);
  }

  // Check registration
  const { missing: unregistered } = verifyRegistration();
  if (unregistered.length > 0) {
    issues.push(`Unregistered hooks: ${unregistered.join(', ')}`);
  }

  const success = issues.length === 0;

  if (!quiet) {
    if (success) {
      console.log('[ACE] All hooks verified successfully');
    } else {
      console.error('[ACE] Hook verification failed:');
      issues.forEach(issue => console.error(`  - ${issue}`));
    }
  }

  return { success, issues };
}

// Run if executed directly
if (require.main === module) {
  const quiet = process.argv.includes('--quiet') || process.argv.includes('-q');
  const { success } = verify(quiet);
  process.exit(success ? 0 : 1);
}

module.exports = { verify, REQUIRED_HOOKS, REQUIRED_LIBS };
