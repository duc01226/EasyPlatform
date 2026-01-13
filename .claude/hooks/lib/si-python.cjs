#!/usr/bin/env node
/**
 * Session Init - Python Detection
 *
 * Python binary detection with fast filesystem checks.
 * Part of session-init.cjs modularization.
 *
 * @module si-python
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSafe } = require('./si-exec.cjs');

/**
 * Validate that a path is a file (not directory) and doesn't contain shell metacharacters
 * @param {string} p - Path to validate
 * @returns {boolean} True if valid Python path
 */
function isValidPythonPath(p) {
  if (!p || typeof p !== 'string') return false;
  // Reject paths with shell metacharacters that could indicate injection attempts
  if (/[;&|`$(){}[\]<>!#*?]/.test(p)) return false;
  try {
    const stat = fs.statSync(p);
    return stat.isFile();
  } catch (e) {
    return false;
  }
}

/**
 * Build platform-specific Python paths for fast filesystem check
 * Avoids slow shell initialization (pyenv, conda) by checking paths directly
 * @returns {string[]} Array of potential Python paths
 */
function getPythonPaths() {
  const paths = [];

  // User override takes priority
  if (process.env.PYTHON_PATH) {
    paths.push(process.env.PYTHON_PATH);
  }

  if (process.platform === 'win32') {
    // Windows paths
    const localAppData = process.env.LOCALAPPDATA;
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    // Microsoft Store Python (most common on modern Windows)
    if (localAppData) {
      paths.push(path.join(localAppData, 'Microsoft', 'WindowsApps', 'python.exe'));
      paths.push(path.join(localAppData, 'Microsoft', 'WindowsApps', 'python3.exe'));
      // User-installed Python (common versions)
      for (const ver of ['313', '312', '311', '310', '39']) {
        paths.push(path.join(localAppData, 'Programs', 'Python', `Python${ver}`, 'python.exe'));
      }
    }

    // System-wide Python installations
    for (const ver of ['313', '312', '311', '310', '39']) {
      paths.push(path.join(programFiles, `Python${ver}`, 'python.exe'));
      paths.push(path.join(programFilesX86, `Python${ver}`, 'python.exe'));
    }

    // Legacy paths
    paths.push('C:\\Python313\\python.exe');
    paths.push('C:\\Python312\\python.exe');
    paths.push('C:\\Python311\\python.exe');
    paths.push('C:\\Python310\\python.exe');
    paths.push('C:\\Python39\\python.exe');
  } else {
    // Unix-like paths (Linux, macOS)
    paths.push('/usr/bin/python3');
    paths.push('/usr/local/bin/python3');
    paths.push('/opt/homebrew/bin/python3');      // macOS ARM (Homebrew)
    paths.push('/opt/homebrew/bin/python');       // macOS ARM fallback
    paths.push('/usr/bin/python');
    paths.push('/usr/local/bin/python');
  }

  return paths;
}

/**
 * Find Python binary using fast filesystem check
 * Returns first existing valid file path, avoiding slow shell spawns
 * @returns {string|null} Path to Python binary or null
 */
function findPythonBinary() {
  const paths = getPythonPaths();
  for (const p of paths) {
    if (isValidPythonPath(p)) return p;
  }
  return null;
}

/**
 * Get Python version with optimized detection
 * Layer 0: Fast path pre-check (instant fs lookup)
 * Layer 1: Timeout protection (2s max per command)
 * Layer 2: Graceful degradation (returns null on failure)
 * @returns {string|null} Python version string or null
 */
function getPythonVersion() {
  // Layer 0: Fast path pre-check - instant filesystem lookup
  const pythonPath = findPythonBinary();
  if (pythonPath) {
    // Use execFileSafe to prevent command injection and handle paths with spaces
    // Direct binary execution bypasses shell initialization (pyenv, conda)
    const result = execFileSafe(pythonPath, ['--version']);
    if (result) return result;
  }

  // Fallback: Try shell resolution with strict timeout
  // This catches non-standard installations but caps at 2s
  // Note: Shell fallback still needed for pyenv/asdf where binary isn't in standard paths
  const commands = ['python3', 'python'];
  for (const cmd of commands) {
    const result = execFileSafe(cmd, ['--version']);
    if (result) return result;
  }

  return null;
}

module.exports = {
  isValidPythonPath,
  getPythonPaths,
  findPythonBinary,
  getPythonVersion
};
