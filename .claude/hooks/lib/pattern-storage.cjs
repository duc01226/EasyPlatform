#!/usr/bin/env node
'use strict';

/**
 * Pattern Storage - YAML read/write and index management for learned patterns
 *
 * Part of Agentic Context Engineering (ACE) implementation.
 * Manages pattern persistence in .claude/learned-patterns/ directory.
 *
 * Storage structure:
 *   .claude/learned-patterns/
 *     index.yaml              # Pattern ID → file path lookup
 *     backend/                # Category directories
 *     frontend/
 *     workflow/
 *     general/
 *     archive/                # Archived patterns
 *
 * @module pattern-storage
 */

const fs = require('fs');
const path = require('path');

const {
  PATTERNS_BASE_DIR,
  PATTERNS_INDEX_FILE,
  PATTERNS_ARCHIVE_DIR,
  PATTERN_CATEGORIES,
  DEDUP_SIMILARITY_THRESHOLD,
  CONFIDENCE_BOOST_CONFIRM,
  CONFIDENCE_PENALTY_CONFLICT,
  MAX_CONFIDENCE,
  MIN_CONFIDENCE
} = require('./pattern-constants.cjs');

// Security: Block prototype pollution keys
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// Reliability: Limit recursion depth to prevent stack overflow
const MAX_YAML_DEPTH = 20;

// Security: YAML special chars requiring quoting
const YAML_SPECIAL_CHARS = /[:#{}\[\]!&*|>'"\-?@\n\t\\]/;

// Simple YAML parser/serializer (no external dependency)
// Handles our specific pattern schema format

/**
 * Parse simple YAML string to object
 * Handles basic key: value pairs, arrays, and nested objects
 * @param {string} yamlStr - YAML string
 * @returns {object} Parsed object
 */
function parseYaml(yamlStr) {
  const lines = yamlStr.split('\n');
  const lineData = [];

  // Pre-process lines: extract indent level and content
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.search(/\S/);
    lineData.push({ indent, content: trimmed, raw: line });
  }

  return parseYamlBlock(lineData, 0, 0, lineData.length);
}

/**
 * Parse a block of YAML lines into an object
 * @param {Array} lineData - Preprocessed line data
 * @param {number} baseIndent - Base indentation level for this block
 * @param {number} startIdx - Start index in lineData
 * @param {number} endIdx - End index in lineData
 * @param {number} depth - Current recursion depth (default 0)
 * @returns {object} Parsed object
 */
function parseYamlBlock(lineData, baseIndent, startIdx, endIdx, depth = 0) {
  // H2: Prevent stack overflow with depth limit
  if (depth > MAX_YAML_DEPTH) {
    throw new Error(`YAML nesting exceeds max depth (${MAX_YAML_DEPTH})`);
  }

  const result = {};
  let i = startIdx;

  while (i < endIdx) {
    const { indent, content } = lineData[i];

    // Skip if indent is less than expected (should not happen in well-formed YAML)
    if (indent < baseIndent) break;

    // Array item at this level
    if (content.startsWith('- ')) {
      // This shouldn't happen at object level, but handle gracefully
      i++;
      continue;
    }

    // Key: value pair
    const colonIdx = content.indexOf(':');
    if (colonIdx > 0) {
      const key = content.slice(0, colonIdx).trim();

      // C3: Skip prototype pollution keys
      if (BLOCKED_KEYS.has(key)) {
        i++;
        continue;
      }

      const value = content.slice(colonIdx + 1).trim();

      if (value === '[]') {
        // Empty array
        result[key] = [];
        i++;
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array
        result[key] = parseInlineArray(value);
        i++;
      } else if (value !== '') {
        // Simple value
        result[key] = parseValue(value);
        i++;
      } else {
        // Empty value - could be nested object or array
        i++;

        // Find the extent of the nested block
        const nestedIndent = i < endIdx ? lineData[i].indent : baseIndent;
        if (nestedIndent <= indent) {
          // No nested content, set as empty object
          result[key] = {};
          continue;
        }

        // Find end of nested block
        let nestedEnd = i;
        while (nestedEnd < endIdx && lineData[nestedEnd].indent >= nestedIndent) {
          nestedEnd++;
        }

        // Check if it's an array (first child starts with '- ')
        if (i < endIdx && lineData[i].content.startsWith('- ')) {
          result[key] = parseYamlArray(lineData, nestedIndent, i, nestedEnd, depth + 1);
        } else {
          result[key] = parseYamlBlock(lineData, nestedIndent, i, nestedEnd, depth + 1);
        }

        i = nestedEnd;
      }
    } else {
      i++;
    }
  }

  return result;
}

/**
 * Parse YAML array from lines
 * @param {Array} lineData - Preprocessed line data
 * @param {number} baseIndent - Base indentation level
 * @param {number} startIdx - Start index
 * @param {number} endIdx - End index
 * @param {number} depth - Current recursion depth (default 0)
 * @returns {Array} Parsed array
 */
function parseYamlArray(lineData, baseIndent, startIdx, endIdx, depth = 0) {
  // H2: Prevent stack overflow with depth limit
  if (depth > MAX_YAML_DEPTH) {
    throw new Error(`YAML nesting exceeds max depth (${MAX_YAML_DEPTH})`);
  }

  const result = [];
  let i = startIdx;

  while (i < endIdx) {
    const { indent, content } = lineData[i];

    if (indent < baseIndent) break;

    if (content.startsWith('- ')) {
      const itemContent = content.slice(2).trim();

      // Check if this is an inline key:value or just a value
      const colonIdx = itemContent.indexOf(':');
      if (colonIdx > 0) {
        // This is an object item (- key: value), check for more properties
        const itemIndent = indent + 2; // Account for "- " prefix
        let itemEnd = i + 1;

        // Find extent of this object item (lines at deeper indent)
        while (itemEnd < endIdx && lineData[itemEnd].indent > indent) {
          itemEnd++;
        }

        if (itemEnd > i + 1) {
          // Multi-line object - parse as nested object
          // Create synthetic lineData for the object including the first line
          const objLines = [{ indent: itemIndent, content: itemContent, raw: '' }];
          for (let j = i + 1; j < itemEnd; j++) {
            objLines.push(lineData[j]);
          }
          result.push(parseYamlBlock(objLines, itemIndent, 0, objLines.length));
          i = itemEnd;
        } else {
          // Single-line object (- key: value)
          const key = itemContent.slice(0, colonIdx).trim();
          const value = itemContent.slice(colonIdx + 1).trim();
          result.push({ [key]: parseValue(value) });
          i++;
        }
      } else {
        // Simple value
        result.push(parseValue(itemContent));
        i++;
      }
    } else {
      i++;
    }
  }

  return result;
}

/**
 * Parse inline array like [a, b, c]
 * @param {string} str - Array string
 * @returns {Array} Parsed array
 */
function parseInlineArray(str) {
  const inner = str.slice(1, -1).trim();
  if (!inner) return [];

  // Handle quoted strings properly
  const items = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];

    if (!inQuote && (char === '"' || char === "'")) {
      inQuote = true;
      quoteChar = char;
      current += char;
    } else if (inQuote && char === quoteChar) {
      inQuote = false;
      current += char;
    } else if (!inQuote && char === ',') {
      items.push(parseValue(current.trim()));
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    items.push(parseValue(current.trim()));
  }

  return items;
}

/**
 * Parse a YAML value
 * @param {string} value - Value string
 * @returns {*} Parsed value
 */
function parseValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Serialize object to YAML string
 * @param {object} obj - Object to serialize
 * @param {number} indent - Current indentation level
 * @returns {string} YAML string
 */
function toYaml(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  const lines = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      lines.push(`${spaces}${key}: null`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${spaces}${key}: []`);
      } else if (typeof value[0] === 'object') {
        // Array of objects - proper YAML list format
        lines.push(`${spaces}${key}:`);
        for (const item of value) {
          const itemYaml = toYaml(item, 0).split('\n').filter(l => l.trim());
          if (itemYaml.length > 0) {
            // First line gets the dash, subsequent lines get extra indent
            lines.push(`${spaces}  - ${itemYaml[0].trim()}`);
            for (let i = 1; i < itemYaml.length; i++) {
              lines.push(`${spaces}    ${itemYaml[i].trim()}`);
            }
          }
        }
      } else {
        // Array of primitives - inline format
        lines.push(`${spaces}${key}: [${value.map(v => JSON.stringify(v)).join(', ')}]`);
      }
    } else if (typeof value === 'object') {
      lines.push(`${spaces}${key}:`);
      lines.push(toYaml(value, indent + 1));
    } else if (typeof value === 'string') {
      // H5: Quote strings with special characters or leading/trailing whitespace
      if (YAML_SPECIAL_CHARS.test(value) || value.trim() !== value) {
        const escaped = value
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\t/g, '\\t');
        lines.push(`${spaces}${key}: "${escaped}"`);
      } else {
        lines.push(`${spaces}${key}: ${value}`);
      }
    } else {
      lines.push(`${spaces}${key}: ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get absolute path to patterns directory
 * @returns {string} Absolute path
 */
function getPatternsDir() {
  return path.join(process.cwd(), PATTERNS_BASE_DIR);
}

/**
 * Ensure patterns directory structure exists
 */
function ensurePatternsDir() {
  const baseDir = getPatternsDir();

  // Create base directory
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  // Create category directories
  for (const category of PATTERN_CATEGORIES) {
    const categoryDir = path.join(baseDir, category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }
  }

  // Create archive directory
  const archiveDir = path.join(baseDir, PATTERNS_ARCHIVE_DIR);
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  // Create .gitkeep if index doesn't exist
  const gitkeepPath = path.join(baseDir, '.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '');
  }
}

/**
 * Load index file
 * @returns {object} Index object
 */
function loadIndex() {
  const indexPath = path.join(getPatternsDir(), PATTERNS_INDEX_FILE);

  if (!fs.existsSync(indexPath)) {
    return {
      version: 1,
      last_updated: new Date().toISOString(),
      patterns: {}
    };
  }

  try {
    const content = fs.readFileSync(indexPath, 'utf-8');
    return parseYaml(content);
  } catch (e) {
    // Always warn on stderr for troubleshooting (non-blocking)
    console.error(`[Pattern] WARN: Index parse failed, using empty: ${e.message}`);
    return {
      version: 1,
      last_updated: new Date().toISOString(),
      patterns: {}
    };
  }
}

/**
 * Save index file
 * @param {object} index - Index object
 */
function saveIndex(index) {
  ensurePatternsDir();
  const indexPath = path.join(getPatternsDir(), PATTERNS_INDEX_FILE);

  index.last_updated = new Date().toISOString();

  const content = toYaml(index);
  fs.writeFileSync(indexPath, content);
}

/**
 * Load a pattern by file path
 * @param {string} filePath - Relative path within patterns directory
 * @returns {object | null} Pattern object or null
 */
function loadPattern(filePath) {
  const patternsDir = getPatternsDir();
  const fullPath = path.resolve(patternsDir, filePath);

  // H3: Validate path stays within patterns directory (prevent path traversal)
  const resolvedBase = path.resolve(patternsDir);
  if (!fullPath.startsWith(resolvedBase + path.sep) && fullPath !== resolvedBase) {
    console.error(`[Pattern] WARN: Path traversal blocked: ${filePath}`);
    return null;
  }

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    return parseYaml(content);
  } catch (e) {
    return null;
  }
}

/**
 * Save a pattern to file
 * @param {object} pattern - Pattern object
 * @param {string} filePath - Relative path within patterns directory
 */
function savePattern(pattern, filePath) {
  ensurePatternsDir();
  const fullPath = path.join(getPatternsDir(), filePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = toYaml(pattern);
  fs.writeFileSync(fullPath, content);
}

/**
 * Load all patterns from storage
 * @returns {object[]} Array of pattern objects
 */
function loadAllPatterns() {
  const index = loadIndex();
  const patterns = [];

  for (const [id, entry] of Object.entries(index.patterns || {})) {
    // H1: Defensive check for null/undefined entries
    if (!entry?.file) {
      console.error(`[Pattern] WARN: Invalid index entry for ${id}`);
      continue;
    }
    const pattern = loadPattern(entry.file);
    if (pattern) {
      patterns.push({ ...pattern, id });
    }
  }

  return patterns;
}

/**
 * Generate slug from pattern content
 * @param {object} pattern - Pattern object
 * @returns {string} URL-safe slug
 */
function generateSlug(pattern) {
  const source = pattern.trigger?.context ||
                 pattern.content?.right ||
                 pattern.content?.rationale ||
                 pattern.id ||
                 'unnamed-pattern';

  const slug = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  // M7: Fallback for empty slug (e.g., all special chars)
  return slug || `pattern-${Date.now()}`;
}

/**
 * Calculate Jaccard similarity between two sets
 * @param {Set} set1 - First set
 * @param {Set} set2 - Second set
 * @returns {number} Similarity score (0-1)
 */
function jaccardSimilarity(set1, set2) {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Check if pattern is duplicate of existing patterns
 * @param {object} newPattern - New pattern to check
 * @param {object[]} existingPatterns - Existing patterns
 * @returns {{ isDuplicate: boolean, existingId: string | null }}
 */
function isDuplicate(newPattern, existingPatterns) {
  const newKeywords = new Set(newPattern.trigger?.keywords || newPattern.keywords || []);

  for (const existing of existingPatterns) {
    const existingKeywords = new Set(existing.trigger?.keywords || existing.keywords || []);
    const similarity = jaccardSimilarity(newKeywords, existingKeywords);

    if (similarity > DEDUP_SIMILARITY_THRESHOLD) {
      return { isDuplicate: true, existingId: existing.id };
    }
  }

  return { isDuplicate: false, existingId: null };
}

/**
 * Update pattern confidence
 * @param {object} pattern - Pattern object
 * @param {'confirm' | 'conflict'} event - Event type
 * @returns {object} Updated pattern
 */
function updateConfidence(pattern, event) {
  if (!pattern.metadata) {
    pattern.metadata = { confidence: 0.5, confirmations: 0, conflicts: 0 };
  }

  if (event === 'confirm') {
    pattern.metadata.confidence = Math.min(
      MAX_CONFIDENCE,
      pattern.metadata.confidence + CONFIDENCE_BOOST_CONFIRM
    );
    pattern.metadata.confirmations = (pattern.metadata.confirmations || 0) + 1;
  } else if (event === 'conflict') {
    pattern.metadata.confidence = Math.max(
      MIN_CONFIDENCE,
      pattern.metadata.confidence - CONFIDENCE_PENALTY_CONFLICT
    );
    pattern.metadata.conflicts = (pattern.metadata.conflicts || 0) + 1;
  }

  pattern.metadata.last_confirmed = new Date().toISOString().split('T')[0];

  return pattern;
}

/**
 * Update index with pattern entry
 * @param {object} index - Index object
 * @param {string} patternId - Pattern ID
 * @param {string} filePath - File path
 * @param {object} pattern - Pattern object
 */
function updateIndex(index, patternId, filePath, pattern) {
  index.patterns = index.patterns || {};
  index.patterns[patternId] = {
    file: filePath,
    category: pattern.category || 'general',
    confidence: pattern.metadata?.confidence || 0.5,
    tags: pattern.tags || []
  };
  saveIndex(index);
}

/**
 * Find pattern entry by ID or partial ID
 * @param {object} index - Index object
 * @param {string} patternId - Full or partial pattern ID
 * @returns {{ id: string, file: string } | null}
 */
function findPatternEntry(index, patternId) {
  // Exact match
  if (index.patterns?.[patternId]) {
    return { id: patternId, ...index.patterns[patternId] };
  }

  // Partial match (prefix)
  for (const [id, entry] of Object.entries(index.patterns || {})) {
    if (id.startsWith(patternId) || patternId.startsWith(id)) {
      return { id, ...entry };
    }
  }

  return null;
}

/**
 * Archive a pattern (soft delete)
 * Uses atomic verify-then-delete to prevent data loss
 * @param {string} patternId - Pattern ID
 * @param {string} reason - Archive reason
 * @returns {{ success: boolean, message: string }}
 */
function archivePattern(patternId, reason = 'user_requested') {
  const index = loadIndex();
  const entry = findPatternEntry(index, patternId);

  if (!entry) {
    return { success: false, message: `Pattern not found: ${patternId}` };
  }

  const pattern = loadPattern(entry.file);
  if (!pattern) {
    return { success: false, message: `Pattern file not found: ${entry.file}` };
  }

  // Add archive metadata
  pattern.metadata = pattern.metadata || {};
  pattern.metadata.archived = true;
  pattern.metadata.archived_date = new Date().toISOString();
  pattern.metadata.archived_reason = reason;

  // Save to archive folder
  const archivePath = path.join(PATTERNS_ARCHIVE_DIR, entry.file);
  savePattern(pattern, archivePath);

  // VERIFY archive was written successfully before deleting original
  const archivedPattern = loadPattern(archivePath);
  if (!archivedPattern) {
    return { success: false, message: `Archive write verification failed for: ${entry.id}` };
  }

  // C1: Delete original file BEFORE updating index
  // Safer failure mode: orphan index entry > data loss
  const originalPath = path.join(getPatternsDir(), entry.file);
  if (fs.existsSync(originalPath)) {
    fs.unlinkSync(originalPath);
  }

  // Update index LAST
  delete index.patterns[entry.id];
  saveIndex(index);

  return { success: true, message: `Pattern archived: ${entry.id}` };
}

/**
 * Load patterns by IDs
 * @param {string[]} patternIds - Array of pattern IDs
 * @returns {object[]} Array of pattern objects
 */
function loadPatternsByIds(patternIds) {
  const index = loadIndex();
  const patterns = [];

  for (const id of patternIds) {
    const entry = index.patterns?.[id];
    if (entry) {
      const pattern = loadPattern(entry.file);
      if (pattern) {
        patterns.push({ ...pattern, id });
      }
    }
  }

  return patterns;
}

module.exports = {
  // Directory management
  getPatternsDir,
  ensurePatternsDir,

  // Index operations
  loadIndex,
  saveIndex,
  updateIndex,
  findPatternEntry,

  // Pattern operations
  loadPattern,
  savePattern,
  loadAllPatterns,
  loadPatternsByIds,

  // Utilities
  generateSlug,
  isDuplicate,
  jaccardSimilarity,
  updateConfidence,
  archivePattern,

  // YAML helpers (for reuse)
  parseYaml,
  toYaml
};
