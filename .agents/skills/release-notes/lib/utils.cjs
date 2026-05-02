#!/usr/bin/env node
/**
 * Shared utilities for release-notes skill
 * Provides security-critical functions used across multiple scripts
 */

const fs = require('fs');
const path = require('path');

/**
 * Validate output path is within allowed directory
 * Prevents path traversal attacks and symlink bypass
 * @param {string} filepath - The output file path to validate
 * @param {string} allowedDir - The allowed base directory (defaults to cwd)
 * @returns {string} The resolved safe path
 */
function validateOutputPath(filepath, allowedDir = process.cwd()) {
  const resolved = path.resolve(filepath);
  const allowed = path.resolve(allowedDir);

  // Resolve symlinks for security (defense in depth)
  let realResolved, realAllowed;
  try {
    realAllowed = fs.realpathSync(allowed);
    // For new files, check parent directory exists
    const parentDir = path.dirname(resolved);
    if (fs.existsSync(parentDir)) {
      realResolved = path.join(fs.realpathSync(parentDir), path.basename(resolved));
    } else {
      // Parent doesn't exist yet, use resolved path
      realResolved = resolved;
    }
  } catch (err) {
    console.error(`Error: Cannot resolve path: ${err.message}`);
    process.exit(1);
  }

  // Validate path is within allowed directory
  if (!realResolved.startsWith(realAllowed + path.sep) && realResolved !== realAllowed) {
    console.error(`Error: Output path must be within project directory`);
    console.error(`  Allowed: ${realAllowed}`);
    console.error(`  Attempted: ${realResolved}`);
    process.exit(1);
  }
  return realResolved;
}

/**
 * Validate stdin/input has content
 * @param {string} content - The input content to validate
 * @param {string} scriptName - Name of the calling script (for error messages)
 * @returns {string} The validated content
 */
function validateInputNotEmpty(content, scriptName = 'script') {
  if (!content || !content.trim()) {
    console.error(`Error: No input provided to ${scriptName}`);
    console.error('Pipe content via stdin or provide input file');
    process.exit(1);
  }
  return content;
}

/**
 * Escape markdown special characters in text
 * Prevents formatting issues from commit messages containing markdown syntax
 * @param {string} text - The text to escape
 * @returns {string} The escaped text
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/([*_`[\]()#])/g, '\\$1');
}

/**
 * Bounds-check a numeric value
 * @param {number} value - The value to check
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {number} defaultValue - Default if value is NaN
 * @returns {number} The bounded value
 */
function boundsCheck(value, min, max, defaultValue) {
  if (isNaN(value)) return defaultValue;
  return Math.max(min, Math.min(max, value));
}

module.exports = {
  validateOutputPath,
  validateInputNotEmpty,
  escapeMarkdown,
  boundsCheck,
};
