#!/usr/bin/env node
/**
 * Dev Rules Reminder - Path Resolution
 *
 * Path resolution utilities for workflows, scripts, and venv.
 * Part of dev-rules-reminder.cjs modularization.
 *
 * @module dr-paths
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Resolve workflow file path (local or global)
 * @param {string} filename - Workflow file name
 * @returns {string|null} Resolved path or null
 */
function resolveWorkflowPath(filename) {
  const localPath = path.join(process.cwd(), '.claude', 'workflows', filename);
  const globalPath = path.join(os.homedir(), '.claude', 'workflows', filename);
  if (fs.existsSync(localPath)) return `.claude/workflows/${filename}`;
  if (fs.existsSync(globalPath)) return `~/.claude/workflows/${filename}`;
  return null;
}

/**
 * Resolve script file path (local or global)
 * @param {string} filename - Script file name
 * @returns {string|null} Resolved path or null
 */
function resolveScriptPath(filename) {
  const localPath = path.join(process.cwd(), '.claude', 'scripts', filename);
  const globalPath = path.join(os.homedir(), '.claude', 'scripts', filename);
  if (fs.existsSync(localPath)) return `.claude/scripts/${filename}`;
  if (fs.existsSync(globalPath)) return `~/.claude/scripts/${filename}`;
  return null;
}

/**
 * Resolve Python venv path for skills
 * @returns {string|null} Resolved venv Python path or null
 */
function resolveSkillsVenv() {
  const isWindows = process.platform === 'win32';
  const venvBin = isWindows ? 'Scripts' : 'bin';
  const pythonExe = isWindows ? 'python.exe' : 'python3';

  const localVenv = path.join(process.cwd(), '.claude', 'skills', '.venv', venvBin, pythonExe);
  const globalVenv = path.join(os.homedir(), '.claude', 'skills', '.venv', venvBin, pythonExe);

  if (fs.existsSync(localVenv)) {
    return isWindows
      ? '.claude\\skills\\.venv\\Scripts\\python.exe'
      : '.claude/skills/.venv/bin/python3';
  }
  if (fs.existsSync(globalVenv)) {
    return isWindows
      ? '~\\.claude\\skills\\.venv\\Scripts\\python.exe'
      : '~/.claude/skills/.venv/bin/python3';
  }
  return null;
}

module.exports = {
  resolveWorkflowPath,
  resolveScriptPath,
  resolveSkillsVenv
};
