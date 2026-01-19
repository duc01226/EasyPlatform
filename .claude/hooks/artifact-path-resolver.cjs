#!/usr/bin/env node
'use strict';

/**
 * Artifact Path Resolver Hook
 *
 * Auto-resolves output paths for team commands.
 * Ensures consistent naming and folder placement.
 *
 * @hook PreToolUse
 * @tools Write
 * @pattern stdin/stdout (non-blocking)
 */

const fs = require('fs');
const path = require('path');

// Module codes for role identification
const MODULE_CODES = {
  PRODUCT_OWNER: 'po',
  BUSINESS_ANALYST: 'ba',
  QA_ENGINEER: 'qa',
  QC_SPECIALIST: 'qc',
  UX_DESIGNER: 'ux',
  PROJECT_MANAGER: 'pm'
};

// Auto-generate role pattern for regex from MODULE_CODES
const ROLE_PATTERN = Object.values(MODULE_CODES).join('|');

/**
 * Main entry point - stdin/stdout pattern
 */
async function main() {
  try {
    // Read JSON payload from stdin
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
    const filePath = toolInput.file_path || toolInput.path || '';
    if (!filePath) process.exit(0);

    // Detect if this is a team artifact path that needs resolution
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Check if path is in team-artifacts and may need standardization
    if (normalizedPath.includes('team-artifacts/')) {
      const suggestion = suggestStandardPath(normalizedPath);
      if (suggestion) {
        console.log(suggestion);
      }
    }

    process.exit(0);
  } catch (error) {
    // Non-blocking - always exit 0 even on error
    process.exit(0);
  }
}

/**
 * Suggest standardized path if current path doesn't follow convention
 */
function suggestStandardPath(currentPath) {
  const date = new Date();
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');

  // Extract filename from path
  const filename = path.basename(currentPath);

  // Check if filename already follows convention: {YYMMDD}-{role}-{type}-{slug}.md
  // Uses ROLE_PATTERN constant for maintainability
  const conventionRegex = new RegExp(`^\\d{6}-(${ROLE_PATTERN})-\\w+-[\\w-]+\\.md$`);
  if (conventionRegex.test(filename)) {
    return null; // Already follows convention
  }

  // Determine artifact type from path (uses MODULE_CODES for consistency)
  let artifactType = null;
  let role = null;

  if (currentPath.includes('team-artifacts/ideas')) {
    artifactType = 'idea';
    role = MODULE_CODES.PRODUCT_OWNER;
  } else if (currentPath.includes('team-artifacts/pbis/stories')) {
    artifactType = 'story';
    role = MODULE_CODES.BUSINESS_ANALYST;
  } else if (currentPath.includes('team-artifacts/pbis')) {
    artifactType = 'pbi';
    role = MODULE_CODES.BUSINESS_ANALYST;
  } else if (currentPath.includes('team-artifacts/test-specs')) {
    artifactType = 'testspec';
    role = MODULE_CODES.QA_ENGINEER;
  } else if (currentPath.includes('team-artifacts/design-specs')) {
    artifactType = 'designspec';
    role = MODULE_CODES.UX_DESIGNER;
  } else if (currentPath.includes('team-artifacts/qc-reports')) {
    artifactType = 'gate';
    role = MODULE_CODES.QC_SPECIALIST;
  }

  if (!artifactType || !role) {
    return null;
  }

  // Extract slug from current filename
  const slug = extractSlug(filename);
  const suggestedFilename = `${dateStr}-${role}-${artifactType}-${slug}.md`;
  const suggestedPath = path.dirname(currentPath) + '/' + suggestedFilename;

  return [
    `## Artifact Path Suggestion`,
    `- **Current:** ${filename}`,
    `- **Suggested:** ${suggestedFilename}`,
    `- **Convention:** {YYMMDD}-{role}-{type}-{slug}.md`,
    ``,
    `Consider using the standardized naming convention for consistency.`
  ].join('\n');
}

/**
 * Extract slug from filename
 */
function extractSlug(filename) {
  return filename
    .toLowerCase()
    .replace(/\.md$/, '')
    .replace(/^\d{6}-\w+-\w+-/, '') // Remove existing convention prefix if any
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'unnamed';
}

main();
