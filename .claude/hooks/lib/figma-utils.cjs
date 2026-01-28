#!/usr/bin/env node
/**
 * Figma URL Parsing and Context Utilities
 *
 * Parses Figma URLs to extract file_key and node_id,
 * and provides utilities for summarizing node data.
 */

const FIGMA_URL_REGEX = /https?:\/\/(?:www\.)?figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)(?:\/[^?\s]*)?(?:\?[^&\s]*node-id=([0-9]+-[0-9]+))?/gi;

/**
 * Parse Figma URL into components
 * @param {string} url - Figma URL
 * @returns {{ fileKey: string, nodeId: string|null, apiNodeId: string|null } | null}
 */
function parseFigmaUrl(url) {
  const regex = new RegExp(FIGMA_URL_REGEX.source, 'i');
  const match = url.match(regex);
  if (!match) return null;

  const fileKey = match[1];
  const nodeId = match[2] || null;
  const apiNodeId = nodeId ? nodeId.replace('-', ':') : null;

  return { fileKey, nodeId, apiNodeId };
}

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

    // Deduplicate by fileKey+nodeId
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

/**
 * Convert node ID between URL and API formats
 */
const toApiNodeId = (urlNodeId) => urlNodeId?.replace('-', ':') || null;
const toUrlNodeId = (apiNodeId) => apiNodeId?.replace(':', '-') || null;

/**
 * Summarize Figma node data for injection
 * @param {object} nodeData - Raw node data from MCP
 * @param {number} maxTokens - Approximate token limit
 * @returns {string} - Markdown summary
 */
function summarizeFigmaNode(nodeData, maxTokens = 2000) {
  if (!nodeData) return 'No node data available';

  const lines = [];

  // Basic info
  if (nodeData.name) lines.push(`**Name:** ${nodeData.name}`);
  if (nodeData.type) lines.push(`**Type:** ${nodeData.type}`);

  // Dimensions
  if (nodeData.absoluteBoundingBox) {
    const { width, height } = nodeData.absoluteBoundingBox;
    lines.push(`**Dimensions:** ${Math.round(width)}x${Math.round(height)}px`);
  }

  // Layout
  if (nodeData.layoutMode) {
    lines.push(`**Layout:** ${nodeData.layoutMode}`);
    if (nodeData.itemSpacing) lines.push(`**Spacing:** ${nodeData.itemSpacing}px`);
    if (nodeData.paddingLeft !== undefined) {
      lines.push(`**Padding:** ${nodeData.paddingTop || 0}/${nodeData.paddingRight || 0}/${nodeData.paddingBottom || 0}/${nodeData.paddingLeft || 0}px`);
    }
  }

  // Colors (extract from fills)
  if (nodeData.fills && nodeData.fills.length > 0) {
    const solidFills = nodeData.fills.filter(f => f.type === 'SOLID');
    if (solidFills.length > 0) {
      const colors = solidFills.map(f => {
        const { r, g, b, a } = f.color;
        return `rgba(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)}, ${a?.toFixed(2) || 1})`;
      });
      lines.push(`**Fill Colors:** ${colors.join(', ')}`);
    }
  }

  // Typography (if text node)
  if (nodeData.type === 'TEXT' && nodeData.style) {
    const { fontFamily, fontSize, fontWeight, lineHeightPx } = nodeData.style;
    lines.push(`**Font:** ${fontFamily} ${fontWeight} ${fontSize}px`);
    if (lineHeightPx) lines.push(`**Line Height:** ${lineHeightPx}px`);
  }

  // Children count
  if (nodeData.children) {
    lines.push(`**Children:** ${nodeData.children.length} elements`);

    // List first few children names
    const childNames = nodeData.children.slice(0, 5).map(c => c.name);
    if (childNames.length > 0) {
      lines.push(`**Child Elements:** ${childNames.join(', ')}${nodeData.children.length > 5 ? '...' : ''}`);
    }
  }

  // Truncate if too long (rough estimate: 4 chars per token)
  let result = lines.join('\n');
  const estimatedTokens = result.length / 4;

  if (estimatedTokens > maxTokens) {
    const charLimit = maxTokens * 4;
    result = result.slice(0, charLimit) + '\n\n*[Truncated for token budget]*';
  }

  return result;
}

module.exports = {
  FIGMA_URL_REGEX,
  parseFigmaUrl,
  extractFigmaUrls,
  toApiNodeId,
  toUrlNodeId,
  summarizeFigmaNode
};
