#!/usr/bin/env node
/**
 * Figma Context Extractor - PreToolUse Hook
 *
 * Detects Figma URLs in PBI/design-spec files being read and
 * prepares context extraction instructions for the planning workflow.
 *
 * Triggers: Read tool on team-artifacts/**\/*.md or plans/**\/*.md
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// FIGMA URL PARSING (inlined from figma-utils.cjs — sole consumer)
// ═══════════════════════════════════════════════════════════════════════════

const FIGMA_URL_REGEX = /https?:\/\/(?:www\.)?figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)(?:\/[^?\s]*)?(?:\?[^&\s]*node-id=([0-9]+-[0-9]+))?/gi;

/**
 * Extract all Figma URLs from text
 * @param {string} content - Text content to scan
 * @returns {Array<{ url: string, fileKey: string, nodeId: string|null, apiNodeId: string|null }>}
 */
function extractFigmaUrls(content) {
  const urls = [];
  const seen = new Set();
  let match;
  const regex = new RegExp(FIGMA_URL_REGEX.source, 'gi');
  while ((match = regex.exec(content)) !== null) {
    const url = match[0];
    const fileKey = match[1];
    const nodeId = match[2] || null;
    const key = `${fileKey}:${nodeId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push({
      url,
      fileKey,
      nodeId,
      apiNodeId: nodeId ? nodeId.replace('-', ':') : null
    });
  }
  return urls;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const TARGET_PATHS = [
  /team-artifacts[\\/](pbis|design-specs)[\\/]/i,
  /plans[\\/][^\\/]+[\\/]/i
];

const SKIP_PATHS = [
  /templates[\\/]/i,
  /\.template\.md$/i
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LOGIC
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  try {
    const input = JSON.parse(fs.readFileSync(process.stdin.fd, 'utf-8'));
    const { tool_name, tool_input } = input;

    // Only process Read tool
    if (tool_name !== 'Read') {
      process.exit(0);
    }

    const filePath = tool_input?.file_path;
    if (!filePath) {
      process.exit(0);
    }

    // Check if target path
    const isTarget = TARGET_PATHS.some(p => p.test(filePath));
    const isSkip = SKIP_PATHS.some(p => p.test(filePath));

    if (!isTarget || isSkip) {
      process.exit(0);
    }

    // Check if file exists and is readable
    if (!fs.existsSync(filePath)) {
      process.exit(0);
    }

    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract Figma URLs
    const figmaUrls = extractFigmaUrls(content);

    if (figmaUrls.length === 0) {
      process.exit(0);
    }

    // Generate extraction context
    const output = generateExtractionContext(figmaUrls, filePath);

    // Output as user message
    console.log(JSON.stringify({
      user: output
    }));

  } catch (error) {
    // Non-blocking - fail silently
    console.error(`[figma-context] Error: ${error.message}`);
    process.exit(0);
  }
}

function generateExtractionContext(urls, sourcePath) {
  const lines = [
    '## Figma Design Context Available',
    '',
    `Detected ${urls.length} Figma reference(s) in \`${path.basename(sourcePath)}\`:`,
    ''
  ];

  urls.forEach((url, i) => {
    lines.push(`### Design ${i + 1}`);
    lines.push(`- **File Key:** \`${url.fileKey}\``);
    if (url.nodeId) {
      lines.push(`- **Node ID:** \`${url.nodeId}\` (API: \`${url.apiNodeId}\`)`);
    }
    lines.push(`- **URL:** ${url.url}`);
    lines.push('');
  });

  lines.push('**To Extract Design Context:**');
  lines.push('Use Figma MCP tools if available:');
  lines.push('```');

  urls.forEach(url => {
    if (url.apiNodeId) {
      lines.push(`mcp__figma__get_file_nodes file_key="${url.fileKey}" node_ids="${url.apiNodeId}"`);
    } else {
      lines.push(`mcp__figma__get_file file_key="${url.fileKey}"`);
    }
  });

  lines.push('```');
  lines.push('');
  lines.push('**Token Budget:** Extract specific nodes only (target: <5K tokens per design)');

  return lines.join('\n');
}

main();
