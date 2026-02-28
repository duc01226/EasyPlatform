#!/usr/bin/env node
/**
 * path-boundary-block.cjs - Block file access outside project root
 *
 * Security hook to enforce project boundary. Unlike privacy-block,
 * NO user override (APPROVED: prefix) - this is security critical.
 *
 * Exit codes:
 *   0 = Allow (path inside project or allowlisted)
 *   2 = Block (path outside project boundary)
 */

const path = require('path');
const fs = require('fs');
const { normalizePathForComparison, buildBoundaryAllowlist } = require('./lib/ck-path-utils.cjs');

/**
 * Get project root from environment or cwd
 * @returns {string} Normalized project root path
 */
function getProjectRoot() {
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  return normalizePathForComparison(root);
}

/**
 * Decode URI-encoded path components
 * @param {string} p - Path that may contain encoded chars
 * @returns {string} Decoded path
 */
function decodePath(p) {
  if (!p) return '';
  try {
    return decodeURIComponent(p);
  } catch {
    return p; // Return as-is if invalid encoding
  }
}

/**
 * Resolve path to absolute, following symlinks if possible
 * @param {string} p - Path to resolve
 * @param {string} projectRoot - Project root for relative path resolution
 * @returns {string} Absolute resolved path
 */
function resolveRealPath(p, projectRoot) {
  if (!p) return '';

  // Decode URI components first
  let decoded = decodePath(p);

  // Handle home directory expansion
  if (decoded.startsWith('~/') || decoded === '~') {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    decoded = decoded.replace(/^~/, home);
  }

  // Resolve to absolute path
  let resolved;
  if (path.isAbsolute(decoded)) {
    resolved = path.resolve(decoded);
  } else {
    // Relative paths resolved against project root
    resolved = path.resolve(projectRoot, decoded);
  }

  // Try to resolve symlinks (fail gracefully if file doesn't exist)
  try {
    resolved = fs.realpathSync(resolved);
  } catch {
    // File may not exist yet (Write operation), use resolved path
  }

  return normalizePathForComparison(resolved);
}

/**
 * Build allowlist using shared utility + .ck.json custom dirs
 * @returns {string[]} Array of normalized allowed paths
 */
function buildAllowlist() {
  return buildBoundaryAllowlist(getConfigArray('pathBoundaryAllowedDirs'));
}

/**
 * Get array value from .ck.json config
 * @param {string} key - Config key
 * @returns {string[]} Array value or empty array
 */
function getConfigArray(key) {
  try {
    const configPath = path.join(process.cwd(), '.claude', '.ck.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return Array.isArray(config[key]) ? config[key] : [];
  } catch {
    return [];
  }
}

/**
 * Check if path-boundary feature is disabled via config
 * @returns {boolean} true if boundary check should be skipped
 */
function isBoundaryCheckDisabled() {
  return getConfigValue('pathBoundary') === false;
}

/**
 * Get value from .ck.json config
 * @param {string} key - Config key
 * @returns {*} Config value or undefined
 */
function getConfigValue(key) {
  try {
    const configPath = path.join(process.cwd(), '.claude', '.ck.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config[key];
  } catch {
    return undefined;
  }
}

/**
 * Check if path is within a directory (equals or is a subdirectory)
 * @param {string} targetPath - Path to check
 * @param {string} dir - Directory to check against
 * @returns {boolean} true if path is within directory
 */
function isWithinDir(targetPath, dir) {
  return targetPath === dir || targetPath.startsWith(dir + '/');
}

/**
 * Check if resolved path is outside project boundary
 * @param {string} resolvedPath - Absolute normalized path
 * @param {string} projectRoot - Normalized project root
 * @param {string[]} allowlist - Allowed directories outside project
 * @returns {boolean} true if path is outside and not allowlisted
 */
function isOutsideProject(resolvedPath, projectRoot, allowlist) {
  if (!resolvedPath) return false; // Empty paths handled by Claude

  // Check if inside project or any allowlisted directory
  const allowedDirs = [projectRoot, ...allowlist];
  return !allowedDirs.some(dir => isWithinDir(resolvedPath, dir));
}

/**
 * Extract all regex matches from text
 * @param {RegExp} regex - Pattern to match
 * @param {string} text - Text to search
 * @param {function} filter - Optional filter for matches
 * @returns {string[]} Matched values
 */
function extractMatches(regex, text, filter = () => true) {
  const results = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1] && filter(match[1])) results.push(match[1]);
  }
  return results;
}

/**
 * Extract file paths from tool input
 * @param {Object} toolInput - Tool input object
 * @param {string} toolName - Name of the tool being used
 * @returns {Array<{value: string, field: string}>} Extracted paths
 */
function extractPaths(toolInput, toolName) {
  if (!toolInput) return [];

  const paths = [];
  const addPath = (value, field) => value && paths.push({ value, field });

  // Direct file path fields
  ['file_path', 'path', 'notebook_path'].forEach(f => addPath(toolInput[f], f));

  // MCP filesystem array paths
  if (toolName?.startsWith('mcp__filesystem__') && Array.isArray(toolInput.paths)) {
    toolInput.paths.forEach(p => addPath(p, 'paths[]'));
  }

  // Bash command parsing
  if (toolInput.command) {
    const cmd = toolInput.command;

    // File operation patterns (cat, head, etc.)
    extractMatches(
      /(?:cat|head|tail|less|more|vim|nano|code|notepad|type)\s+["']?([^\s"'|><&;]+)/gi,
      cmd,
      m => !m.startsWith('-')
    ).forEach(p => addPath(p, 'command'));

    // Redirection targets (> file, >> file) — skip /dev, /proc, /sys
    extractMatches(
      />\s*["']?([^\s"'|><&;]+)/g,
      cmd,
      m => !/^\/(?:dev|proc|sys)(\/|$)/.test(m)
    ).forEach(p => addPath(p, 'command'));

    // Absolute paths (skip /dev, /proc, /sys)
    extractMatches(
      /(?:^|\s)["']?([A-Za-z]:[/\\][^\s"'|><&;]+|\/[^\s"'|><&;]+)/g,
      cmd,
      m => !/^\/(?:dev|proc|sys)\//.test(m)
    ).forEach(p => addPath(p, 'command'));
  }

  return paths;
}

/**
 * Format block message
 * @param {string} blockedPath - Path that was blocked
 * @param {string} projectRoot - Project root for reference
 * @returns {string} Formatted error message
 */
function formatBlockMessage(blockedPath, projectRoot) {
  return `
\x1b[31mBLOCKED:\x1b[0m Path outside project boundary

  \x1b[33mPath:\x1b[0m ${blockedPath}
  \x1b[33mProject Root:\x1b[0m ${projectRoot}

  File access is restricted to the current project directory.
  This is a security measure to prevent unintended access to
  files outside the project.

  \x1b[34mAllowed locations:\x1b[0m
  - Project directory and subdirectories
  - System temp directories
  - Claude config (~/.claude)

  \x1b[90mTo allow additional directories, add them to
  .claude/.ck.json: { "pathBoundaryAllowedDirs": ["D:/path"] }\x1b[0m
`;
}

// Main execution
async function main() {
  // Check if boundary check is disabled
  if (isBoundaryCheckDisabled()) {
    process.exit(0);
  }

  // Read stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  // Parse hook data
  let hookData;
  try {
    hookData = JSON.parse(input);
  } catch {
    process.exit(0); // Invalid JSON, allow (fail-open for parse errors)
  }

  const { tool_input: toolInput, tool_name: toolName } = hookData;

  // Get project root and build allowlist
  const projectRoot = getProjectRoot();
  const allowlist = buildAllowlist();

  // Extract and validate all paths
  const paths = extractPaths(toolInput, toolName);

  for (const { value: rawPath } of paths) {
    const resolvedPath = resolveRealPath(rawPath, projectRoot);

    if (isOutsideProject(resolvedPath, projectRoot, allowlist)) {
      console.error(formatBlockMessage(rawPath, projectRoot));
      process.exit(2); // Block
    }
  }

  process.exit(0); // Allow
}

main().catch(() => process.exit(0));

// Export for testing
module.exports = {
  getProjectRoot,
  normalizePathForComparison,
  decodePath,
  resolveRealPath,
  buildAllowlist,
  isBoundaryCheckDisabled,
  isOutsideProject,
  isWithinDir,
  extractPaths,
  extractMatches,
};
