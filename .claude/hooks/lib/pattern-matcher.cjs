#!/usr/bin/env node
'use strict';

/**
 * Pattern Matcher - Relevance scoring for pattern injection
 *
 * Part of Agentic Context Engineering (ACE) implementation.
 * Matches patterns to current context for selective injection.
 *
 * Scoring algorithm:
 *   - File path match: 0.4 weight
 *   - Category match: 0.2 weight
 *   - Keyword match: 0.2 weight
 *   - Tag match: 0.1 weight
 *   - Confidence: 0.1 weight
 *
 * @module pattern-matcher
 */

const path = require('path');

const {
  MAX_PATTERN_INJECTION,
  PATTERN_TOKEN_BUDGET,
  MIN_RELEVANCE_SCORE,
  CONFIDENCE_INJECTION_THRESHOLD,
  CHARS_PER_TOKEN,
  CATEGORY_PATH_PATTERNS
} = require('./pattern-constants.cjs');

const { loadAllPatterns, loadIndex } = require('./pattern-storage.cjs');

/**
 * Simple minimatch-like glob pattern matching
 * Supports: *, **, ?
 *
 * @param {string} filePath - File path to test
 * @param {string} pattern - Glob pattern
 * @param {{ matchBase?: boolean }} options - Match options
 * @returns {boolean}
 */
function minimatch(filePath, pattern, options = {}) {
  if (!filePath || !pattern) return false;

  let testPath = filePath;
  let testPattern = pattern;

  // matchBase: match basename only
  if (options.matchBase && !pattern.includes('/') && !pattern.includes('\\')) {
    testPath = path.basename(filePath);
  }

  // Normalize paths
  testPath = testPath.replace(/\\/g, '/');
  testPattern = testPattern.replace(/\\/g, '/');

  // Convert glob to regex
  const regexStr = testPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
    .replace(/\*\*/g, '{{GLOBSTAR}}')       // Temp placeholder for **
    .replace(/\*/g, '[^/]*')                // * matches anything except /
    .replace(/\?/g, '.')                    // ? matches single char
    .replace(/{{GLOBSTAR}}/g, '.*');        // ** matches anything including /

  const regex = new RegExp(`^${regexStr}$`, 'i');
  return regex.test(testPath);
}

/**
 * Infer category from file path
 * @param {string | null} filePath - File path
 * @returns {string} Category
 */
function inferCategoryFromPath(filePath) {
  if (!filePath) return 'general';

  for (const [category, patterns] of Object.entries(CATEGORY_PATH_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(filePath))) {
      return category;
    }
  }

  return 'general';
}

/**
 * Extract tags/keywords from context
 * @param {object} context - Context object
 * @returns {string[]} Tags
 */
function extractTagsFromContext(context) {
  const tags = [];

  if (context.filePath) {
    // Extract from file path
    const parts = context.filePath.toLowerCase().split(/[\/\\]/);
    for (const part of parts) {
      if (part.length >= 3 && !part.includes('.')) {
        tags.push(part);
      }
    }

    // Extract from filename
    const basename = path.basename(context.filePath, path.extname(context.filePath));
    const words = basename.split(/(?=[A-Z])|[-_.]/).filter(w => w.length >= 3);
    tags.push(...words.map(w => w.toLowerCase()));
  }

  if (context.prompt) {
    // Extract meaningful words from prompt
    const words = context.prompt.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    tags.push(...words.slice(0, 10));
  }

  return [...new Set(tags)];
}

/**
 * Calculate relevance score for a pattern in given context
 *
 * @param {object} pattern - Pattern object
 * @param {object} context - Current context
 * @param {string} [context.filePath] - File being edited
 * @param {string} [context.prompt] - Current prompt/description
 * @param {string} [context.projectType] - Project type
 * @param {string} [context.branch] - Git branch
 * @returns {number} Relevance score (0-1)
 */
function calculateRelevanceScore(pattern, context) {
  let score = 0;

  // 1. File path match (0.4 weight)
  if (context.filePath && pattern.trigger?.file_patterns?.length > 0) {
    const pathMatch = pattern.trigger.file_patterns.some(fp =>
      minimatch(context.filePath, fp, { matchBase: true })
    );
    if (pathMatch) score += 0.4;
  }

  // 2. Category match (0.2 weight)
  const inferredCategory = inferCategoryFromPath(context.filePath);
  if (pattern.category === inferredCategory) {
    score += 0.2;
  }

  // 3. Keyword match from context (0.2 weight)
  const contextText = (context.prompt || context.description || '').toLowerCase();
  if (contextText && pattern.trigger?.keywords?.length > 0) {
    const keywordMatch = pattern.trigger.keywords.some(kw =>
      contextText.includes(kw.toLowerCase())
    );
    if (keywordMatch) score += 0.2;
  }

  // 4. Tag match (0.1 weight)
  const contextTags = extractTagsFromContext(context);
  if (pattern.tags?.length > 0 && contextTags.length > 0) {
    const tagOverlap = pattern.tags.filter(t =>
      contextTags.includes(t.toLowerCase())
    ).length;
    score += Math.min(0.1, tagOverlap * 0.03);
  }

  // 5. Confidence multiplier (0.1 weight)
  const confidence = pattern.metadata?.confidence || 0.5;
  score += confidence * 0.1;

  return score;
}

/**
 * Find relevant patterns for current context
 *
 * @param {object} context - Current context
 * @param {number} [maxPatterns] - Maximum patterns to return
 * @returns {object[]} Sorted array of relevant patterns
 */
function findRelevantPatterns(context, maxPatterns = MAX_PATTERN_INJECTION) {
  const allPatterns = loadAllPatterns();

  // Score each pattern
  const scored = allPatterns.map(pattern => ({
    pattern,
    score: calculateRelevanceScore(pattern, context)
  }));

  // Filter by thresholds
  // Note: Default confidence 0.5 exceeds CONFIDENCE_INJECTION_THRESHOLD (0.4)
  // This is intentional - new patterns should be injectable until proven unreliable
  const relevant = scored.filter(s =>
    s.score >= MIN_RELEVANCE_SCORE &&
    (s.pattern.metadata?.confidence || 0.5) >= CONFIDENCE_INJECTION_THRESHOLD
  );

  // Sort by score descending
  relevant.sort((a, b) => b.score - a.score);

  // Limit to max patterns
  return relevant.slice(0, maxPatterns).map(s => s.pattern);
}

/**
 * Format patterns for injection into context
 *
 * @param {object[]} patterns - Patterns to format
 * @returns {string | null} Formatted injection string or null if empty
 */
function formatPatternInjection(patterns) {
  if (!patterns || patterns.length === 0) return null;

  const lines = [
    '## Learned Patterns (auto-injected)',
    ''
  ];

  let tokenCount = 0;
  const tokenBudget = PATTERN_TOKEN_BUDGET;

  for (const p of patterns) {
    const patternLines = [];

    // Header
    const context = p.trigger?.context || p.id;
    patternLines.push(`### ${p.type}: ${context}`);

    // Content
    if (p.content?.wrong) {
      patternLines.push(`- AVOID: ${p.content.wrong}`);
    }
    if (p.content?.right) {
      patternLines.push(`- USE: ${p.content.right}`);
    }
    if (p.content?.rationale && !p.content?.wrong && !p.content?.right) {
      patternLines.push(`- ${p.content.rationale}`);
    }

    // Confidence
    const confidence = ((p.metadata?.confidence || 0.5) * 100).toFixed(0);
    patternLines.push(`- Confidence: ${confidence}%`);
    patternLines.push('');

    // Check token budget
    const patternText = patternLines.join('\n');
    const patternTokens = Math.ceil(patternText.length / CHARS_PER_TOKEN);

    if (tokenCount + patternTokens > tokenBudget) {
      break;
    }

    lines.push(...patternLines);
    tokenCount += patternTokens;
  }

  if (lines.length <= 2) return null; // Only header, no patterns added

  return lines.join('\n');
}

/**
 * Get IDs of selected patterns for tracking
 * @param {object[]} patterns - Selected patterns
 * @returns {string[]} Pattern IDs
 */
function getSelectedPatternIds(patterns) {
  return patterns.map(p => p.id).filter(Boolean);
}

module.exports = {
  // Main matching
  findRelevantPatterns,
  calculateRelevanceScore,

  // Formatting
  formatPatternInjection,
  getSelectedPatternIds,

  // Helpers
  minimatch,
  inferCategoryFromPath,
  extractTagsFromContext
};
