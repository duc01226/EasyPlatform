/**
 * Temp File Cleanup Utility
 *
 * Cleans up tmpclaude-xxxx-cwd temp files created by Task tool during subagent execution.
 * These files contain CWD paths and should be cleaned up after use.
 *
 * @module temp-file-cleanup
 */

const fs = require('fs');
const path = require('path');

/** Pattern matching tmpclaude temp files */
const TEMP_FILE_PATTERN = /^tmpclaude-[a-f0-9]+-cwd$/;

/**
 * Clean up tmpclaude temp files from a directory (non-recursive)
 * @param {string} dir - Directory to clean
 * @returns {number} Number of files cleaned
 */
function cleanupDir(dir) {
  let cleaned = 0;
  try {
    if (!fs.existsSync(dir)) return 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && TEMP_FILE_PATTERN.test(entry.name)) {
        try {
          fs.unlinkSync(path.join(dir, entry.name));
          cleaned++;
        } catch (e) {
          // Ignore - file may be locked or already deleted
        }
      }
    }
  } catch (e) {
    // Ignore - directory may not exist or be readable
  }
  return cleaned;
}

/**
 * Recursively clean up tmpclaude temp files from a directory
 * @param {string} dir - Root directory to clean recursively
 * @param {number} [maxDepth=5] - Maximum recursion depth
 * @returns {number} Number of files cleaned
 */
function cleanupDirRecursive(dir, maxDepth = 5) {
  if (maxDepth <= 0) return 0;

  let cleaned = 0;
  try {
    if (!fs.existsSync(dir)) return 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isFile() && TEMP_FILE_PATTERN.test(entry.name)) {
        try {
          fs.unlinkSync(fullPath);
          cleaned++;
        } catch (e) {
          // Ignore - file may be locked
        }
      } else if (entry.isDirectory() && !entry.name.startsWith('.git')) {
        // Recurse into subdirectories (skip .git for performance)
        cleaned += cleanupDirRecursive(fullPath, maxDepth - 1);
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return cleaned;
}

/**
 * Clean up all tmpclaude temp files from project
 * Scans: project root + .claude/ directory recursively
 * @param {string} [projectRoot] - Project root (defaults to process.cwd())
 * @returns {number} Number of files cleaned
 */
function cleanupAll(projectRoot) {
  const root = projectRoot || process.cwd();
  let cleaned = 0;

  // Clean project root (non-recursive - only top level)
  cleaned += cleanupDir(root);

  // Clean .claude/ directory recursively
  const claudeDir = path.join(root, '.claude');
  cleaned += cleanupDirRecursive(claudeDir, 5);

  return cleaned;
}

/**
 * Find all tmpclaude temp files (for testing/reporting)
 * @param {string} [projectRoot] - Project root
 * @returns {string[]} Array of file paths
 */
function findTempFiles(projectRoot) {
  const root = projectRoot || process.cwd();
  const files = [];

  function scan(dir, depth = 5) {
    if (depth <= 0) return;
    try {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile() && TEMP_FILE_PATTERN.test(entry.name)) {
          files.push(fullPath);
        } else if (entry.isDirectory() && !entry.name.startsWith('.git')) {
          scan(fullPath, depth - 1);
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  scan(root, 1); // Root level only
  scan(path.join(root, '.claude'), 5); // .claude/ recursive

  return files;
}

module.exports = {
  TEMP_FILE_PATTERN,
  cleanupDir,
  cleanupDirRecursive,
  cleanupAll,
  findTempFiles
};
