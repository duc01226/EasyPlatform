/**
 * Temp file cleanup utilities
 * Cleans up tmpclaude-xxxx-cwd files created by Task tool
 */
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Clean up leftover temp files from subagent sessions
 * These files (tmpclaude-xxxx-cwd) are created by Task tool but not always cleaned up
 * Scans hooks directory, .claude directory, and project root
 * @param {string} [projectDir] - Project directory (defaults to process.cwd())
 * @returns {number} Number of files cleaned
 */
function cleanupTempFiles(projectDir) {
  const baseDir = projectDir || process.cwd();
  const tmpFilePattern = /^tmpclaude-[a-f0-9]+-cwd$/;
  let cleaned = 0;

  function cleanDir(dir, skipDotDirs = true) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile() && tmpFilePattern.test(entry.name)) {
          try {
            fs.unlinkSync(fullPath);
            cleaned++;
          } catch (e) { /* ignore individual file errors */ }
        } else if (entry.isDirectory()) {
          // Skip .git but allow other dot directories when skipDotDirs=false
          if (entry.name === '.git' || entry.name === 'node_modules') continue;
          if (skipDotDirs && entry.name.startsWith('.')) continue;
          cleanDir(fullPath, skipDotDirs);
        }
      }
    } catch (e) { /* ignore directory read errors */ }
  }

  // Clean from hooks directory (where temp files are created)
  const hooksDir = path.join(baseDir, '.claude', 'hooks');
  if (fs.existsSync(hooksDir)) {
    cleanDir(hooksDir);
  }

  // Clean from .claude directory (including skills subdirs) - allow dot traversal
  const claudeDir = path.join(baseDir, '.claude');
  if (fs.existsSync(claudeDir)) {
    cleanDir(claudeDir, false);
  }

  // Also clean from project root (legacy behavior)
  cleanDir(baseDir);

  return cleaned;
}

module.exports = { cleanupTempFiles };
