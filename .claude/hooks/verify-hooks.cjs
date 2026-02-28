#!/usr/bin/env node
'use strict';

/**
 * Verify Hooks - Hook Integrity Verification Script
 *
 * Checks that all hooks registered in settings.json:
 * 1. Actually exist as files
 * 2. Are executable (proper shebang)
 * 3. Have valid syntax (can be required)
 * 4. Have required dependencies available
 *
 * Can be run:
 * - Manually: node .claude/hooks/verify-hooks.cjs
 * - On SessionStart for health check (optional)
 *
 * Exit Codes:
 *   0 - All hooks valid
 *   1 - Issues found (with report)
 *
 * @module verify-hooks
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Project paths
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CLAUDE_DIR = path.join(PROJECT_DIR, '.claude');
const HOOKS_DIR = path.join(CLAUDE_DIR, 'hooks');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');

/**
 * Load settings.json
 * @returns {Object|null} Settings or null
 */
function loadSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch (e) {
    return null;
  }
}

/**
 * Extract hook file path from command
 * @param {string} command - Hook command
 * @returns {string|null} File path or null
 */
function extractHookPath(command) {
  if (!command) return null;

  // Pattern: node "path" or node path
  const match = command.match(/node\s+(?:"([^"]+)"|([^\s]+))/i);
  if (!match) return null;

  let hookPath = match[1] || match[2];

  // Replace environment variables
  hookPath = hookPath.replace(/%CLAUDE_PROJECT_DIR%/gi, PROJECT_DIR);
  hookPath = hookPath.replace(/\$CLAUDE_PROJECT_DIR/gi, PROJECT_DIR);

  // Normalize path
  return path.normalize(hookPath);
}

/**
 * Check if file exists
 * @param {string} filePath - File path
 * @returns {boolean} Exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (e) {
    return false;
  }
}

/**
 * Check if file has valid shebang
 * @param {string} filePath - File path
 * @returns {boolean} Has shebang
 */
function hasShebang(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.startsWith('#!/');
  } catch (e) {
    return false;
  }
}

/**
 * Check if module has valid JavaScript syntax (without executing)
 * Uses vm.compileFunction for syntax-only validation - no side effects
 * @param {string} filePath - File path
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
function canRequire(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf-8');
    // Use vm.compileFunction to check syntax without executing
    // This parses the code but doesn't run it, avoiding side effects
    vm.compileFunction(code, [], { filename: filePath });
    return { valid: true };
  } catch (e) {
    // Extract meaningful syntax error message with location info
    // Keep first 2 lines to preserve error type + line/column position
    const lines = e.message.split('\n').slice(0, 2);
    const errorMsg = lines.join(' ').substring(0, 200); // Cap at 200 chars
    return { valid: false, error: errorMsg };
  }
}

/**
 * Verify all hooks in settings
 * @param {Object} settings - Settings object
 * @returns {Object} Verification results
 */
function verifyHooks(settings) {
  const results = {
    total: 0,
    valid: 0,
    issues: []
  };

  if (!settings.hooks) {
    results.issues.push({ type: 'warning', message: 'No hooks configured in settings.json' });
    return results;
  }

  // Iterate through all hook types
  for (const [hookType, hookGroups] of Object.entries(settings.hooks)) {
    if (!Array.isArray(hookGroups)) continue;

    for (const hookGroup of hookGroups) {
      if (!hookGroup.hooks || !Array.isArray(hookGroup.hooks)) continue;

      for (const hook of hookGroup.hooks) {
        results.total++;

        if (hook.type !== 'command') {
          results.valid++;
          continue;
        }

        const hookPath = extractHookPath(hook.command);
        if (!hookPath) {
          results.issues.push({
            type: 'error',
            hookType,
            command: hook.command,
            message: 'Could not extract hook path from command'
          });
          continue;
        }

        // Check file exists
        if (!fileExists(hookPath)) {
          results.issues.push({
            type: 'error',
            hookType,
            file: hookPath,
            message: 'Hook file does not exist'
          });
          continue;
        }

        // Check shebang (warning only)
        if (!hasShebang(hookPath)) {
          results.issues.push({
            type: 'warning',
            hookType,
            file: path.basename(hookPath),
            message: 'Missing shebang (#!/usr/bin/env node)'
          });
        }

        // Check syntax (for .cjs files)
        if (hookPath.endsWith('.cjs') || hookPath.endsWith('.js')) {
          const requireResult = canRequire(hookPath);
          if (!requireResult.valid) {
            results.issues.push({
              type: 'error',
              hookType,
              file: path.basename(hookPath),
              message: `Syntax error: ${requireResult.error}`
            });
            continue;
          }
        }

        results.valid++;
      }
    }
  }

  return results;
}

/**
 * Check lessons system hooks exist
 * @returns {Object} Lessons system status
 */
function checkLessonsSystem() {
  const lessonsHooks = [
    { name: 'lessons-injector.cjs', purpose: 'Inject lessons into context' }
  ];

  const status = {
    total: lessonsHooks.length,
    found: 0,
    missing: []
  };

  for (const hook of lessonsHooks) {
    const hookPath = path.join(HOOKS_DIR, hook.name);
    if (fileExists(hookPath)) {
      status.found++;
    } else {
      status.missing.push(hook);
    }
  }

  return status;
}

/**
 * Check library dependencies
 * @returns {Object} Library status
 */
function checkLibraries() {
  const libs = [
    'ck-paths.cjs',
    'ck-config-utils.cjs',
    'todo-state.cjs',
    'swap-engine.cjs',
    'edit-state.cjs',
    'debug-log.cjs'
  ];

  const libDir = path.join(HOOKS_DIR, 'lib');
  const status = {
    total: libs.length,
    found: 0,
    missing: []
  };

  for (const lib of libs) {
    const libPath = path.join(libDir, lib);
    if (fileExists(libPath)) {
      status.found++;
    } else {
      status.missing.push(lib);
    }
  }

  return status;
}

/**
 * Generate verification report
 * @param {Object} results - Verification results
 * @param {Object} lessonsStatus - Lessons system status
 * @param {Object} libStatus - Libraries status
 * @returns {string} Formatted report
 */
function generateReport(results, lessonsStatus, libStatus) {
  const lines = [];

  lines.push('## Hook Verification Report');
  lines.push('');

  // Summary
  const hasErrors = results.issues.some(i => i.type === 'error');
  const status = hasErrors ? 'ISSUES FOUND' : 'ALL VALID';
  lines.push(`**Status:** ${status}`);
  lines.push(`**Hooks Checked:** ${results.total} (${results.valid} valid)`);
  lines.push(`**Lessons System:** ${lessonsStatus.found}/${lessonsStatus.total}`);
  lines.push(`**Libraries:** ${libStatus.found}/${libStatus.total}`);
  lines.push('');

  // Issues
  if (results.issues.length > 0) {
    lines.push('### Issues');
    lines.push('');

    const errors = results.issues.filter(i => i.type === 'error');
    const warnings = results.issues.filter(i => i.type === 'warning');

    if (errors.length > 0) {
      lines.push('**Errors:**');
      for (const issue of errors) {
        lines.push(`- [${issue.hookType}] ${issue.file || issue.command}: ${issue.message}`);
      }
      lines.push('');
    }

    if (warnings.length > 0) {
      lines.push('**Warnings:**');
      for (const issue of warnings) {
        lines.push(`- [${issue.hookType}] ${issue.file}: ${issue.message}`);
      }
      lines.push('');
    }
  }

  // Missing lessons hooks
  if (lessonsStatus.missing.length > 0) {
    lines.push('### Missing Lessons Hooks');
    lines.push('');
    for (const hook of lessonsStatus.missing) {
      lines.push(`- ${hook.name}: ${hook.purpose}`);
    }
    lines.push('');
  }

  // Missing libraries
  if (libStatus.missing.length > 0) {
    lines.push('### Missing Libraries');
    lines.push('');
    for (const lib of libStatus.missing) {
      lines.push(`- lib/${lib}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    // Load settings
    const settings = loadSettings();
    if (!settings) {
      console.log('## Hook Verification');
      console.log('');
      console.log('**Error:** Could not load settings.json');
      process.exit(1);
    }

    // Run verification
    const results = verifyHooks(settings);
    const lessonsStatus = checkLessonsSystem();
    const libStatus = checkLibraries();

    // Generate report
    const report = generateReport(results, lessonsStatus, libStatus);
    console.log(report);

    // Exit with appropriate code
    const hasErrors = results.issues.some(i => i.type === 'error');
    process.exit(hasErrors ? 1 : 0);

  } catch (error) {
    console.log('## Hook Verification Error');
    console.log('');
    console.log(`**Error:** ${error.message}`);
    process.exit(1);
  }
}

main();
