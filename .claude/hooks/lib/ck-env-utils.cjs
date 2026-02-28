/**
 * Environment Utilities
 *
 * Shell escaping and environment file writing utilities.
 *
 * @module ck-env-utils
 */

'use strict';

const fs = require('fs');

/**
 * Escape shell special characters for env file values
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeShellValue(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$');
}

/**
 * Write environment variable to CLAUDE_ENV_FILE (with escaping)
 * @param {string} envFile - Path to env file
 * @param {string} key - Environment variable name
 * @param {*} value - Value to write
 */
function writeEnv(envFile, key, value) {
  if (envFile && value !== null && value !== undefined) {
    const escaped = escapeShellValue(String(value));
    fs.appendFileSync(envFile, `export ${key}="${escaped}"\n`);
  }
}

module.exports = {
  escapeShellValue,
  writeEnv
};
