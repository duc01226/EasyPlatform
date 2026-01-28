#!/usr/bin/env node
/**
 * project-boundary.cjs - Block file operations outside project root
 *
 * Blocks ALL file operations (read + write) targeting paths outside
 * CLAUDE_PROJECT_DIR, including Glob, Grep, Read, Edit, Write, MCP filesystem.
 *
 * Exit Codes: 0 = allowed, 2 = blocked
 */

const fs = require('fs');
const path = require('path');
const { extractFromToolInput } = require('./scout-block/path-extractor.cjs');

const BOUNDARY_TOOLS = [
  'Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'Bash',
  'Glob', 'Grep', 'Read'
];

/**
 * Get normalized project root (lowercase, forward slashes)
 */
function getProjectRoot() {
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  return path.resolve(root).toLowerCase().replace(/\\/g, '/');
}

/**
 * Normalize path for comparison (absolute, lowercase, forward slashes)
 * Resolves symlinks to prevent bypass attacks
 */
function normalizePath(inputPath) {
  if (!inputPath) return '';

  let normalized = inputPath;

  // Decode URI components (%2e = '.', %2f = '/')
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Invalid encoding, use as-is
  }

  normalized = normalized.replace(/\\/g, '/');

  // Convert MSYS2/Git Bash paths (/d/...) to Windows paths (D:/...)
  const msysMatch = normalized.match(/^\/([a-zA-Z])\//);
  if (msysMatch) {
    normalized = msysMatch[1].toUpperCase() + ':/' + normalized.slice(3);
  }

  // Resolve to absolute
  const baseDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  normalized = path.isAbsolute(normalized)
    ? path.resolve(normalized)
    : path.resolve(baseDir, normalized);

  // Resolve symlinks to prevent boundary bypass (security hardening)
  try {
    // Only resolve if path exists - prevents errors on non-existent paths
    if (fs.existsSync(normalized)) {
      normalized = fs.realpathSync(normalized);
    }
  } catch {
    // If symlink resolution fails, use the unresolved path
    // This handles edge cases like broken symlinks or permission errors
  }

  return normalized.toLowerCase().replace(/\\/g, '/');
}

/**
 * Check if path is within project boundary
 */
function isWithinProject(testPath, projectRoot) {
  const normalized = normalizePath(testPath);
  if (!normalized) return true; // Empty path, allow

  return normalized === projectRoot || normalized.startsWith(projectRoot + '/');
}

/**
 * Format block message
 */
function formatBlockMessage(blockedPath, projectRoot, toolName) {
  return `
\x1b[31mPROJECT BOUNDARY BLOCK\x1b[0m

  \x1b[33mTool:\x1b[0m ${toolName}
  \x1b[33mPath:\x1b[0m ${blockedPath}
  \x1b[33mBoundary:\x1b[0m ${projectRoot}

  File operations outside the project root are blocked.
  \x1b[34mTo fix:\x1b[0m Use a path within the project directory.
`;
}

// Main execution
try {
  const hookInput = fs.readFileSync(0, 'utf-8');

  if (!hookInput || hookInput.trim().length === 0) {
    console.error('WARN: Empty input, allowing operation');
    process.exit(0);
  }

  let data;
  try {
    data = JSON.parse(hookInput);
  } catch {
    console.error('WARN: JSON parse failed, allowing operation');
    process.exit(0);
  }

  if (!data.tool_input || typeof data.tool_input !== 'object') {
    console.error('WARN: Invalid JSON structure, allowing operation');
    process.exit(0);
  }

  const toolInput = data.tool_input;
  const toolName = data.tool_name || 'unknown';

  // Skip tools not in boundary-check list
  if (!BOUNDARY_TOOLS.includes(toolName) && !toolName.startsWith('mcp__filesystem__')) {
    process.exit(0);
  }

  const projectRoot = getProjectRoot();
  const extractedPaths = extractFromToolInput(toolInput);

  if (extractedPaths.length === 0) {
    process.exit(0);
  }

  // Check each path
  for (const testPath of extractedPaths) {
    if (!isWithinProject(testPath, projectRoot)) {
      console.error(formatBlockMessage(testPath, projectRoot, toolName));
      process.exit(2);
    }
  }

  process.exit(0);

} catch (error) {
  console.error('WARN: Hook error, allowing operation -', error.message);
  process.exit(0);
}

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = {
    getProjectRoot,
    normalizePath,
    isWithinProject,
    formatBlockMessage
  };
}
