#!/usr/bin/env node
/**
 * Artifact Path Resolver Hook
 *
 * Auto-resolves output paths for team commands.
 * Ensures consistent naming and folder placement.
 *
 * @trigger PreToolUse (Write)
 * @resolves Output paths for /idea, /refine, /story, /test-spec, /design-spec
 *
 * Input: JSON via stdin with tool_name, tool_input
 * Output: Context string via stdout with resolved path info
 * Exit: 0 (non-blocking)
 *
 * Note: This hook provides path suggestions in context. It does NOT modify
 * the actual tool_input. The AI should use the suggested path.
 */

const fs = require('fs');
const path = require('path');
const { normalizePath } = require('./lib/ck-path-utils.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Command to artifact folder mappings
const COMMAND_PATH_MAPPINGS = {
  'idea': 'team-artifacts/ideas/',
  'refine': 'team-artifacts/pbis/',
  'story': 'team-artifacts/pbis/stories/',
  'test-spec': 'team-artifacts/test-specs/',
  'design-spec': 'team-artifacts/design-specs/',
  'quality-gate': 'team-artifacts/qc-reports/',
  'status': 'plans/reports/'
};

// Type mapping for file naming
const TYPE_MAPPING = {
  'idea': 'idea',
  'refine': 'pbi',
  'story': 'story',
  'test-spec': 'testspec',
  'design-spec': 'designspec',
  'quality-gate': 'gate',
  'status': 'status'
};

// Role mapping for file naming
const ROLE_MAPPING = {
  'idea': 'po',
  'refine': 'ba',
  'story': 'ba',
  'test-spec': 'qa',
  'design-spec': 'ux',
  'quality-gate': 'qc',
  'status': 'pm'
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract slug from title or path
 */
function extractSlug(input) {
  return input
    .toLowerCase()
    .replace(/\.md$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'unnamed';
}

/**
 * Detect current command from file path or content patterns
 */
function detectCommand(filePath, content) {
  const normalizedPath = (normalizePath(filePath) || '').toLowerCase();

  // Check path patterns
  for (const [command, pathPrefix] of Object.entries(COMMAND_PATH_MAPPINGS)) {
    if (normalizedPath.includes(pathPrefix.toLowerCase())) {
      return command;
    }
  }

  return null;
}

/**
 * Generate resolved path info
 */
function generatePathInfo(command, filePath) {
  const basePath = COMMAND_PATH_MAPPINGS[command];
  if (!basePath) return null;

  const date = new Date();
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');

  const role = ROLE_MAPPING[command];
  const type = TYPE_MAPPING[command];
  const slug = extractSlug(path.basename(filePath));

  // Construct filename
  const filename = role
    ? `${dateStr}-${role}-${type}-${slug}.md`
    : `${dateStr}-${type}-${slug}.md`;

  const fullPath = `${basePath}${filename}`;

  return {
    command,
    basePath,
    filename,
    fullPath,
    pattern: '{YYMMDD}-{role}-{type}-{slug}.md'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);
    const toolName = payload.tool_name || '';
    const toolInput = payload.tool_input || {};

    // Only process Write operations
    if (toolName !== 'Write') {
      process.exit(0);
    }

    // Extract file path from tool input
    const filePath = toolInput.file_path || '';
    if (!filePath) process.exit(0);

    // Detect command from path
    const command = detectCommand(filePath, toolInput.content || '');
    if (!command) process.exit(0);

    // Generate path info
    const pathInfo = generatePathInfo(command, filePath);
    if (!pathInfo) process.exit(0);

    // Output context with path suggestion
    const output = [
      '',
      '## Artifact Path (auto-resolved)',
      '',
      `**Command:** /${pathInfo.command}`,
      `**Suggested Path:** ${pathInfo.fullPath}`,
      `**Pattern:** ${pathInfo.pattern}`,
      ''
    ].join('\n');

    console.log(output);
    process.exit(0);
  } catch (error) {
    // Non-blocking - exit silently on error
    process.exit(0);
  }
}

main();
