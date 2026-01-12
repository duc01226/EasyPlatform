#!/usr/bin/env node
'use strict';

/**
 * Pattern Extractor - NLP extraction from raw corrections to structured patterns
 *
 * Part of Agentic Context Engineering (ACE) implementation.
 * Transforms detected correction candidates into storable pattern format.
 *
 * Pattern schema:
 *   id, category, type, trigger, content, metadata, tags
 *
 * @module pattern-extractor
 */

const fs = require('fs');
const path = require('path');

const {
  INITIAL_CONFIDENCE_IMPLICIT,
  INITIAL_CONFIDENCE_EXPLICIT,
  PATTERN_CATEGORIES,
  CATEGORY_PATH_PATTERNS
} = require('./pattern-constants.cjs');

// H6: Limit input length for regex operations to prevent ReDoS
const MAX_CONTENT_LENGTH = 100000; // 100KB

const {
  loadIndex,
  saveIndex,
  loadPattern,
  savePattern,
  loadAllPatterns,
  generateSlug,
  isDuplicate,
  updateConfidence,
  updateIndex
} = require('./pattern-storage.cjs');

/**
 * Extract wrong/right pair from correction content
 *
 * Supports patterns:
 *   - "No, use X instead of Y"
 *   - "Don't do X, do Y"
 *   - "X should be Y"
 *   - "[wrong] X [right] Y" (explicit)
 *   - Code block comparison (two blocks)
 *
 * @param {string} content - Raw correction content
 * @returns {{ wrong: string, right: string, rationale: string }}
 */
function extractWrongRightPair(content) {
  if (!content || typeof content !== 'string') {
    return { wrong: '', right: '', rationale: '' };
  }

  // H6: Limit input length before regex operations
  const safeContent = content.length > MAX_CONTENT_LENGTH
    ? content.slice(0, MAX_CONTENT_LENGTH)
    : content;

  // Pattern 1: Explicit [wrong]...[right] format
  const bracketMatch = safeContent.match(/\[wrong\]\s*(.+?)\s*\[right\]\s*(.+)/is);
  if (bracketMatch) {
    return {
      wrong: bracketMatch[1].trim(),
      right: bracketMatch[2].trim(),
      rationale: ''
    };
  }

  // Pattern 2: "No, use X instead of Y"
  const insteadMatch = safeContent.match(/(?:no,?\s*)?use\s+(.+?)\s+instead\s+of\s+(.+)/i);
  if (insteadMatch) {
    return {
      wrong: insteadMatch[2].trim(),
      right: insteadMatch[1].trim(),
      rationale: ''
    };
  }

  // Pattern 3: "Don't do X, do Y" / "Never X, instead Y"
  const dontMatch = safeContent.match(/(?:don'?t|never)\s+(.+?),?\s+(?:instead\s+)?(?:do|use)\s+(.+)/i);
  if (dontMatch) {
    return {
      wrong: dontMatch[1].trim(),
      right: dontMatch[2].trim(),
      rationale: ''
    };
  }

  // Pattern 4: "X should be Y" / "X should use Y"
  const shouldMatch = safeContent.match(/(.+?)\s+should\s+(?:be|use)\s+(.+)/i);
  if (shouldMatch) {
    return {
      wrong: `Not ${shouldMatch[2].trim()}`,
      right: shouldMatch[2].trim(),
      rationale: ''
    };
  }

  // Pattern 5: "prefer X over Y" / "prefer X to Y"
  const preferMatch = safeContent.match(/prefer\s+(.+?)\s+(?:over|to)\s+(.+)/i);
  if (preferMatch) {
    return {
      wrong: preferMatch[2].trim(),
      right: preferMatch[1].trim(),
      rationale: ''
    };
  }

  // Pattern 6: Code block comparison (two blocks)
  const codeBlocks = safeContent.match(/```[\s\S]*?```/g);
  if (codeBlocks && codeBlocks.length >= 2) {
    return {
      wrong: codeBlocks[0].replace(/```\w*\n?|\n?```/g, '').trim(),
      right: codeBlocks[1].replace(/```\w*\n?|\n?```/g, '').trim(),
      rationale: ''
    };
  }

  // Pattern 7: "always use X" / "always do X"
  const alwaysMatch = safeContent.match(/always\s+(?:use|do)\s+(.+)/i);
  if (alwaysMatch) {
    return {
      wrong: '',
      right: alwaysMatch[1].trim(),
      rationale: safeContent
    };
  }

  // Fallback: Store full content as rationale (no clear wrong/right)
  return {
    wrong: '',
    right: '',
    rationale: safeContent.trim()
  };
}

/**
 * Infer file patterns from context file path
 * Generalizes specific paths to glob patterns
 *
 * @param {string | null} filePath - Specific file path
 * @returns {string[]} Glob patterns
 */
function inferFilePatterns(filePath) {
  if (!filePath) return [];

  const patterns = [];
  const ext = path.extname(filePath);
  const basename = path.basename(filePath);

  // Match by file suffix (e.g., *CommandHandler.cs)
  if (basename.includes('Handler')) {
    patterns.push(`*Handler${ext}`);
  }
  if (basename.includes('Repository')) {
    patterns.push(`*Repository${ext}`);
  }
  if (basename.includes('Entity')) {
    patterns.push(`*Entity${ext}`);
  }
  if (basename.includes('Service')) {
    patterns.push(`*Service${ext}`);
  }
  if (basename.includes('Component')) {
    patterns.push(`*Component${ext}`);
  }
  if (basename.includes('.store')) {
    patterns.push(`*.store${ext}`);
  }
  if (basename.includes('.service')) {
    patterns.push(`*.service${ext}`);
  }

  // Default: match by extension in same directory pattern
  if (patterns.length === 0) {
    patterns.push(`*${ext}`);
  }

  return patterns;
}

/**
 * Summarize content for trigger context
 * @param {string} content - Full content
 * @returns {string} Short context string
 */
function summarizeContext(content) {
  if (!content) return '';

  // Extract first meaningful sentence or clause
  const firstSentence = content.split(/[.!?\n]/)[0].trim();

  // Limit to 50 chars
  if (firstSentence.length <= 50) {
    return firstSentence;
  }

  return firstSentence.slice(0, 47) + '...';
}

/**
 * Infer pattern type from triggers
 * @param {Array<{ category: string, keyword: string }>} triggers - Detection triggers
 * @returns {string} Pattern type
 */
function inferPatternType(triggers) {
  if (!triggers || triggers.length === 0) return 'best-practice';

  const categories = triggers.map(t => t.category);

  if (categories.includes('negation') || categories.includes('quality')) {
    return 'anti-pattern';
  }
  if (categories.includes('redirection')) {
    return 'best-practice';
  }
  if (categories.includes('explicit')) {
    return 'preference';
  }

  return 'convention';
}

/**
 * Generate tags from keywords and category
 * @param {string[]} keywords - Extracted keywords
 * @param {string} category - Pattern category
 * @returns {string[]} Tags
 */
function generateTags(keywords, category) {
  const tags = new Set();

  // Add category as tag
  if (category) {
    tags.add(category);
  }

  // Add top keywords as tags (max 5)
  for (const kw of (keywords || []).slice(0, 5)) {
    if (kw.length >= 3) {
      tags.add(kw);
    }
  }

  return [...tags];
}

/**
 * Calculate initial confidence based on candidate type
 * @param {object} candidate - Pattern candidate
 * @returns {number} Initial confidence (0-1)
 */
function calculateInitialConfidence(candidate) {
  if (candidate.type === 'explicit') {
    return INITIAL_CONFIDENCE_EXPLICIT;
  }

  // Scale implicit confidence by detection confidence
  return Math.max(
    INITIAL_CONFIDENCE_IMPLICIT,
    candidate.confidence * 0.5
  );
}

/**
 * Check if pattern conflicts with docs/claude/*.md
 * Validated decision: Block patterns conflicting with documentation
 *
 * @param {object} pattern - Pattern to check
 * @returns {{ hasConflict: boolean, conflictFile: string | null }}
 */
function checkDocsConflict(pattern) {
  const docsDir = path.join(process.cwd(), 'docs', 'claude');

  if (!fs.existsSync(docsDir)) {
    return { hasConflict: false, conflictFile: null };
  }

  try {
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));

    // Keywords to search for in docs
    const searchTerms = [
      ...(pattern.trigger?.keywords || []),
      pattern.content?.wrong,
      pattern.content?.right
    ].filter(Boolean).map(s => s.toLowerCase());

    for (const file of files) {
      const filePath = path.join(docsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8').toLowerCase();

      // Check if any search terms appear in the doc
      for (const term of searchTerms) {
        if (term.length >= 4 && content.includes(term)) {
          // Potential conflict - doc already covers this topic
          // Check if the pattern contradicts the doc guidance
          if (pattern.content?.wrong && content.includes(pattern.content.wrong.toLowerCase())) {
            // Doc mentions what pattern says is "wrong" - could be conflict
            return { hasConflict: true, conflictFile: file };
          }
        }
      }
    }

    return { hasConflict: false, conflictFile: null };
  } catch (e) {
    // Non-blocking - assume no conflict on error
    return { hasConflict: false, conflictFile: null };
  }
}

/**
 * Extract structured pattern from candidate
 *
 * @param {object} candidate - Pattern candidate from detector
 * @returns {object} Structured pattern object
 */
function extractPattern(candidate) {
  const { wrong, right, rationale } = extractWrongRightPair(candidate.content);
  const category = candidate.context?.category || 'general';
  const keywords = candidate.keywords || [];
  const filePatterns = inferFilePatterns(candidate.context?.last_file);

  return {
    id: candidate.id,
    category,
    type: inferPatternType(candidate.triggers),
    trigger: {
      keywords,
      file_patterns: filePatterns,
      context: summarizeContext(candidate.content)
    },
    content: {
      wrong,
      right,
      rationale
    },
    metadata: {
      source: candidate.type === 'explicit' ? 'explicit-teaching' : 'user-correction',
      confidence: calculateInitialConfidence(candidate),
      first_seen: new Date().toISOString().split('T')[0],
      last_confirmed: new Date().toISOString().split('T')[0],
      occurrences: 1,
      confirmations: 0,
      conflicts: 0,
      related_files: candidate.context?.last_file ? [candidate.context.last_file] : []
    },
    tags: generateTags(keywords, category)
  };
}

/**
 * Append pattern candidate to storage
 * Handles deduplication and conflict checking
 *
 * @param {object} candidate - Pattern candidate
 * @returns {{ action: string, id: string, message?: string }}
 */
function appendPatternCandidate(candidate) {
  const pattern = extractPattern(candidate);

  // Check for docs conflict (validated decision: block conflicts)
  const { hasConflict, conflictFile } = checkDocsConflict(pattern);
  if (hasConflict) {
    return {
      action: 'blocked',
      id: pattern.id,
      message: `Pattern conflicts with docs/claude/${conflictFile} - not saved`
    };
  }

  const index = loadIndex();
  const existingPatterns = loadAllPatterns();

  // Check for duplicates
  const { isDuplicate: isDup, existingId } = isDuplicate(pattern, existingPatterns);

  if (isDup && existingId) {
    // Boost existing pattern confidence
    const existing = loadPattern(index.patterns[existingId]?.file);
    if (existing) {
      updateConfidence(existing, 'confirm');
      existing.metadata.occurrences = (existing.metadata.occurrences || 1) + 1;
      savePattern(existing, index.patterns[existingId].file);
      updateIndex(index, existingId, index.patterns[existingId].file, existing);

      return {
        action: 'updated',
        id: existingId,
        message: `Boosted existing pattern confidence`
      };
    }
  }

  // Save new pattern
  const slug = generateSlug(pattern);
  const filePath = `${pattern.category}/${slug}.yaml`;
  savePattern(pattern, filePath);
  updateIndex(index, pattern.id, filePath, pattern);

  return {
    action: 'created',
    id: pattern.id,
    message: `Pattern saved to ${filePath}`
  };
}

module.exports = {
  // Main extraction
  extractPattern,
  appendPatternCandidate,

  // Extraction helpers
  extractWrongRightPair,
  inferFilePatterns,
  summarizeContext,
  inferPatternType,
  generateTags,
  calculateInitialConfidence,

  // Conflict checking
  checkDocsConflict
};
